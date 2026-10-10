import { Booking, Category, Favorite, Product } from '../models/index.js';
import { BLOCKING_STATUSES } from '../models/Booking.js';
import { conflict, forbidden, notFound } from '../utils/AppError.js';
import { ok, created } from '../utils/respond.js';
import { escapeRegex } from '../utils/text.js';
import { applyProductInput, assertPublishable, favoriteIdSet, toProductDTO } from '../services/product.service.js';
import { notify } from '../services/notification.service.js';

const CATEGORY_FIELDS = 'slug name icon';
const OWNER_FIELDS = 'fullName avatarUrl city verificationStatus createdAt';

const SORTS = {
  newest: { publishedAt: -1, createdAt: -1 },
  price_asc: { 'prices.daily': 1, _id: 1 },
  price_desc: { 'prices.daily': -1, _id: 1 },
  popular: { views: -1, favoritesCount: -1, _id: 1 },
};

/** Builds the MongoDB filter for the public catalogue from validated query params. */
async function buildCatalogFilter(query) {
  const and = [{ status: 'active' }];

  if (query.category) {
    const cat = await Category.findOne({ slug: query.category }).select('_id').lean();
    if (!cat) return null;
    and.push({ category: cat._id });
  }

  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    const cats = await Category.find({ $or: [{ 'name.uz': rx }, { 'name.ru': rx }, { 'name.en': rx }] }).select('_id').lean();
    and.push({
      $or: [
        { title: rx },
        { description: rx },
        { 'location.city': rx },
        { 'location.region': rx },
        ...(cats.length ? [{ category: { $in: cats.map((c) => c._id) } }] : []),
      ],
    });
  }

  if (query.location) {
    const rx = new RegExp(escapeRegex(query.location), 'i');
    and.push({ $or: [{ 'location.city': rx }, { 'location.region': rx }] });
  }
  if (query.region) and.push({ 'location.region': new RegExp(`^${escapeRegex(query.region)}$`, 'i') });
  if (query.city) and.push({ 'location.city': new RegExp(`^${escapeRegex(query.city)}$`, 'i') });

  if (query.minPrice != null || query.maxPrice != null) {
    const range = {};
    if (query.minPrice != null) range.$gte = query.minPrice;
    if (query.maxPrice != null) range.$lte = query.maxPrice;
    and.push({ 'prices.daily': range });
  }

  if (query.available) {
    const now = new Date();
    and.push({ 'availability.isAvailable': true });
    and.push({ $or: [{ 'availability.availableTo': null }, { 'availability.availableTo': { $gte: now } }] });
    // Exclude items that are currently handed out.
    const busy = await Booking.distinct('product', { status: 'active', startAt: { $lte: now }, endAt: { $gte: now } });
    if (busy.length) and.push({ _id: { $nin: busy } });
  }
  if (query.delivery) and.push({ 'delivery.delivery': true });
  if (query.exclude) and.push({ _id: { $ne: query.exclude } });

  return { $and: and };
}

export async function listProducts(req, res) {
  const query = req.validatedQuery;
  const { page, limit } = query;
  const filter = await buildCatalogFilter(query);
  if (!filter) return ok(res, { items: [], total: 0, page, pages: 0, limit });

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[query.sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', CATEGORY_FIELDS)
      .populate('owner', OWNER_FIELDS),
    Product.countDocuments(filter),
  ]);
  const favs = await favoriteIdSet(req.user, products.map((p) => p._id));
  ok(res, {
    items: products.map((p) => toProductDTO(p, { viewer: req.user, favoriteIds: favs })),
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  });
}

export async function suggestions(req, res) {
  const rx = new RegExp(escapeRegex(req.validatedQuery.q), 'i');
  const [products, categories, cities] = await Promise.all([
    Product.find({ status: 'active', title: rx }).select('title').limit(6).lean(),
    Category.find({ $or: [{ 'name.uz': rx }, { 'name.ru': rx }, { 'name.en': rx }, { slug: rx }] })
      .select('slug name icon')
      .limit(3)
      .lean(),
    Product.distinct('location.city', { status: 'active', 'location.city': rx }),
  ]);
  ok(res, {
    products: products.map((p) => ({ _id: p._id, title: p.title })),
    categories,
    locations: cities.slice(0, 4),
  });
}

export async function locations(_req, res) {
  const rows = await Product.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: { region: '$location.region', city: '$location.city' }, count: { $sum: 1 } } },
    { $sort: { '_id.region': 1, '_id.city': 1 } },
  ]);
  ok(res, { items: rows.map((r) => ({ region: r._id.region, city: r._id.city, count: r.count })) });
}

async function loadOwned(id, user) {
  const product = await Product.findById(id);
  if (!product) throw notFound('Listing not found');
  // Ownership is always checked against the stored owner, never against client input.
  if (String(product.owner) !== String(user._id)) throw forbidden('You can only manage your own listings');
  return product;
}

export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id).populate('category', CATEGORY_FIELDS).populate('owner', OWNER_FIELDS);
  if (!product) throw notFound('Listing not found');
  const isOwner = req.user && String(product.owner._id) === String(req.user._id);
  if (product.status !== 'active' && !isOwner) throw notFound('Listing not found');

  if (!isOwner) await Product.updateOne({ _id: product._id }, { $inc: { views: 1 } });
  const favs = await favoriteIdSet(req.user, [product._id]);
  const ownerListings = await Product.countDocuments({ owner: product.owner._id, status: 'active' });
  const dto = toProductDTO(product, { viewer: req.user, favoriteIds: favs });
  dto.owner = { ...dto.owner, activeListings: ownerListings };
  ok(res, { product: dto });
}

export async function similarProducts(req, res) {
  const product = await Product.findById(req.params.id).select('category status').lean();
  if (!product) throw notFound('Listing not found');
  const items = await Product.find({ status: 'active', category: product.category, _id: { $ne: product._id } })
    .sort({ views: -1, createdAt: -1 })
    .limit(8)
    .populate('category', CATEGORY_FIELDS)
    .populate('owner', OWNER_FIELDS);
  const favs = await favoriteIdSet(req.user, items.map((p) => p._id));
  ok(res, { items: items.map((p) => toProductDTO(p, { viewer: req.user, favoriteIds: favs })) });
}

/** Confirmed date ranges, so the booking form can show unavailable periods (no renter data). */
export async function bookedRanges(req, res) {
  const ranges = await Booking.find({ product: req.params.id, status: { $in: BLOCKING_STATUSES }, endAt: { $gte: new Date() } })
    .select('startAt endAt -_id')
    .sort({ startAt: 1 })
    .lean();
  ok(res, { items: ranges });
}

export async function createProduct(req, res) {
  const { publish, ...input } = req.body;
  const product = new Product({ owner: req.user._id, status: 'draft' });
  applyProductInput(product, input);

  if (publish) {
    if (req.user.verificationStatus !== 'verified') throw verificationRequired();
    await assertPublishable(product);
    product.status = 'active';
    product.publishedAt = new Date();
  }
  await product.save();
  if (publish) await notifyPublished(req.user, product);
  await product.populate('category', CATEGORY_FIELDS);
  created(res, { product: toProductDTO(product, { viewer: req.user }) });
}

export async function updateProduct(req, res) {
  const product = await loadOwned(req.params.id, req.user);
  const { publish, ...input } = req.body;
  applyProductInput(product, input);

  const wasPublished = product.status === 'active';
  if (publish && !wasPublished) {
    if (req.user.verificationStatus !== 'verified') throw verificationRequired();
    product.status = 'active';
    product.publishedAt = product.publishedAt || new Date();
  }
  // An active listing must always stay complete.
  if (product.status === 'active') await assertPublishable(product);
  await product.save();
  if (publish && !wasPublished) await notifyPublished(req.user, product);
  await product.populate('category', CATEGORY_FIELDS);
  ok(res, { product: toProductDTO(product, { viewer: req.user }) });
}

export async function setProductStatus(req, res) {
  const product = await loadOwned(req.params.id, req.user);
  const { status } = req.body;
  if (status === 'active') {
    if (req.user.verificationStatus !== 'verified') throw verificationRequired();
    await assertPublishable(product);
    product.publishedAt = product.publishedAt || new Date();
  }
  product.status = status;
  await product.save();
  await product.populate('category', CATEGORY_FIELDS);
  ok(res, { product: toProductDTO(product, { viewer: req.user }) });
}

export async function deleteProduct(req, res) {
  const product = await loadOwned(req.params.id, req.user);
  const open = await Booking.exists({ product: product._id, status: { $in: ['accepted', 'active'] } });
  if (open) throw conflict('This listing has confirmed or active rentals and cannot be deleted. Pause it instead.', 'HAS_BOOKINGS');

  // Pending requests are cancelled so renters are not left waiting.
  const pending = await Booking.find({ product: product._id, status: 'pending' });
  for (const b of pending) {
    b.status = 'cancelled';
    b.statusHistory.push({ status: 'cancelled', by: req.user._id, note: 'Listing deleted' });
    await b.save();
    await notify(b.renter, 'booking_cancelled', {
      bookingId: b._id,
      productTitle: product.title,
      actorName: req.user.fullName,
    }, '/dashboard/requests');
  }
  await product.deleteOne();
  await Favorite.deleteMany({ product: product._id });
  ok(res, { deleted: true });
}

function verificationRequired() {
  const err = forbidden('Identity verification is required to publish listings');
  err.code = 'VERIFICATION_REQUIRED';
  return err;
}

async function notifyPublished(user, product) {
  await notify(user._id, 'listing_published', { productId: product._id, productTitle: product.title }, `/products/${product._id}`);
}

