import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { Booking, Category, Favorite, Notification, Product, User, Verification } from '../models/index.js';
import { categories, demoUsers, demoProducts, defaultTerms, DEMO_PASSWORD } from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadCredits() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'images', 'credits.json'), 'utf8'));
  } catch {
    return {};
  }
}

async function upsertCategories() {
  const map = {};
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate({ slug: c.slug }, { $set: c }, { upsert: true, new: true });
    map[c.slug] = doc._id;
  }
  return map;
}

/**
 * Removes seeded demo users/products and everything that references them
 * (bookings, favourites, notifications, verifications). Categories and real data are kept.
 */
export async function removeDemoData() {
  const users = await User.find({ isDemo: true }).select('_id').lean();
  const userIds = users.map((u) => u._id);
  const products = await Product.find({ isDemo: true }).select('_id').lean();
  const productIds = products.map((p) => p._id);
  const bookings = await Booking.find({
    $or: [{ product: { $in: productIds } }, { renter: { $in: userIds } }, { owner: { $in: userIds } }],
  })
    .select('_id')
    .lean();
  const bookingIds = bookings.map((b) => b._id);

  const [b, f, n] = await Promise.all([
    Booking.deleteMany({ _id: { $in: bookingIds } }),
    Favorite.deleteMany({ $or: [{ product: { $in: productIds } }, { user: { $in: userIds } }] }),
    // Includes real users' notifications that point at demo listings or bookings.
    Notification.deleteMany({
      $or: [{ user: { $in: userIds } }, { 'data.productId': { $in: productIds } }, { 'data.bookingId': { $in: bookingIds } }],
    }),
    Verification.deleteMany({ user: { $in: userIds } }),
  ]);
  const p = await Product.deleteMany({ _id: { $in: productIds } });
  const u = await User.deleteMany({ _id: { $in: userIds } });
  return { users: u.deletedCount, products: p.deletedCount, bookings: b.deletedCount, favorites: f.deletedCount, notifications: n.deletedCount };
}

export async function seedAll() {
  const categoryIds = await upsertCategories();
  await removeDemoData();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = {};
  for (const u of demoUsers) {
    const doc = await User.create({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      city: u.city,
      passwordHash,
      language: 'uz',
      languageChosen: true,
      verificationStatus: 'verified',
      termsAcceptedAt: new Date(),
      isDemo: true,
    });
    await Verification.create({
      user: doc._id,
      status: 'verified',
      method: 'demo',
      documentType: 'id_card',
      documentLast4: '0000',
      fullNameOnDocument: u.fullName,
      submittedAt: new Date(),
      reviewedAt: new Date(),
    });
    users[u.key] = doc;
  }

  const credits = loadCredits();
  const now = Date.now();
  const docs = demoProducts.map((p, i) => {
    const imgs = credits[p.images] || [];
    return {
      ...defaultTerms,
      ...p,
      owner: users[p.owner]._id,
      category: categoryIds[p.category],
      images: imgs.map((c) => ({ url: `/seed-images/${c.file}`, publicId: c.file, storage: 'seed' })),
      imageCredits: imgs.map(({ creator, license, sourceUrl }) => ({ creator, license, sourceUrl })),
      coverIndex: 0,
      prices: { hourly: null, weekly: null, deposit: 0, ...p.prices },
      delivery: { pickup: true, delivery: false, deliveryFee: 0, note: '', ...p.delivery },
      availability: { isAvailable: true, availableFrom: null, availableTo: null, note: '' },
      status: 'active',
      isDemo: true,
      // Stagger publish dates so "newest" sorting is meaningful.
      publishedAt: new Date(now - i * 3 * 3600 * 1000),
    };
  });
  await Product.insertMany(docs);

  return { categories: categories.length, users: demoUsers.length, products: docs.length };
}

export async function seedIfEmpty() {
  if ((await Category.estimatedDocumentCount()) > 0) return null;
  return seedAll();
}
