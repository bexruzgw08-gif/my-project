import { Category, Favorite, publicUser } from '../models/index.js';
import { badRequest } from '../utils/AppError.js';

const round2 = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);

/**
 * Shapes a product for API responses. Non-owners only receive an APPROXIMATE location
 * (coordinates rounded to ~1 km) to protect the owner's exact address.
 */
export function toProductDTO(product, { viewer = null, favoriteIds = null } = {}) {
  const p = typeof product.toJSON === 'function' ? product.toJSON() : { ...product };
  const ownerId = String(p.owner?._id ?? p.owner);
  const isOwner = viewer && String(viewer._id) === ownerId;

  if (p.owner && typeof p.owner === 'object' && p.owner.fullName) p.owner = publicUser(p.owner);
  if (!isOwner && p.location) {
    p.location = { ...p.location, lat: round2(p.location.lat), lng: round2(p.location.lng), approximate: true };
  }
  const cover = p.images?.[p.coverIndex] || p.images?.[0];
  p.coverImage = cover?.url || '';
  p.isOwner = Boolean(isOwner);
  if (favoriteIds) p.isFavorite = favoriteIds.has(String(p._id));
  delete p.bookingLockUntil;
  return p;
}

export async function favoriteIdSet(user, productIds) {
  if (!user || productIds.length === 0) return new Set();
  const favs = await Favorite.find({ user: user._id, product: { $in: productIds } }).select('product').lean();
  return new Set(favs.map((f) => String(f.product)));
}

/** Returns a list of missing/invalid fields that prevent publishing (empty = publishable). */
export async function publishProblems(product) {
  const problems = [];
  if (!product.title || product.title.length < 3) problems.push('title');
  if (!product.category || !(await Category.exists({ _id: product.category }))) problems.push('category');
  if (!product.description || product.description.length < 20) problems.push('description');
  if (!product.images?.length) problems.push('images');
  if (!(product.prices?.daily > 0)) problems.push('prices.daily');
  if (!product.location?.region) problems.push('location.region');
  if (!product.location?.city) problems.push('location.city');
  if (product.location?.lat == null || product.location?.lng == null) problems.push('location.coordinates');
  if (!product.delivery?.pickup && !product.delivery?.delivery) problems.push('delivery');
  const { availableFrom, availableTo } = product.availability || {};
  if (availableFrom && availableTo && new Date(availableTo) < new Date(availableFrom)) problems.push('availability.dates');
  return problems;
}

export async function assertPublishable(product) {
  const problems = await publishProblems(product);
  if (problems.length) {
    throw badRequest(
      'The listing is incomplete and cannot be published',
      problems.map((field) => ({ field, message: 'Required to publish' })),
    );
  }
}

/** Applies a validated (partial) input object onto a product document. */
export function applyProductInput(product, input) {
  const simple = ['title', 'category', 'description', 'condition', 'specifications', 'usageInfo', 'accessories', 'images', 'rentalTerms', 'damagePolicy'];
  for (const key of simple) if (input[key] !== undefined) product[key] = input[key];
  for (const group of ['prices', 'location', 'availability', 'delivery']) {
    if (input[group]) for (const [k, v] of Object.entries(input[group])) if (v !== undefined) product[group][k] = v;
  }
  if (product.images) {
    product.images = product.images.map((img) => ({
      ...img,
      storage: img.storage || (img.url.startsWith('https://') ? 'cloudinary' : img.url.startsWith('/seed-images/') ? 'seed' : 'local'),
    }));
  }
  if (input.coverIndex !== undefined) product.coverIndex = input.coverIndex;
  if (product.coverIndex >= (product.images?.length || 0)) product.coverIndex = 0;
}
