import bcrypt from 'bcrypt';
import { Booking, Favorite, Notification, Product, User, publicUser } from '../models/index.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { ok } from '../utils/respond.js';
import { toProductDTO, publishProblems } from '../services/product.service.js';

export async function updateMe(req, res) {
  Object.assign(req.user, req.body);
  if (req.body.language) req.user.languageChosen = true;
  await req.user.save();
  ok(res, { user: req.user });
}

export async function setLanguage(req, res) {
  req.user.language = req.body.language;
  req.user.languageChosen = true;
  await req.user.save();
  ok(res, { user: req.user });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    throw badRequest('Current password is incorrect', [{ field: 'currentPassword', message: 'Incorrect password' }]);
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  ok(res, { changed: true });
}

export async function myProducts(req, res) {
  const products = await Product.find({ owner: req.user._id })
    .sort({ updatedAt: -1 })
    .populate('category', 'slug name icon');
  const items = await Promise.all(
    products.map(async (p) => ({
      ...toProductDTO(p, { viewer: req.user }),
      missingFields: p.status === 'draft' ? await publishProblems(p) : [],
    })),
  );
  ok(res, { items });
}

/** Real counts for the personal dashboard. */
export async function dashboard(req, res) {
  const uid = req.user._id;
  const now = new Date();
  const [listings, activeListings, drafts, incomingPending, myPending, upcoming, active, completed, favorites, unread] =
    await Promise.all([
      Product.countDocuments({ owner: uid }),
      Product.countDocuments({ owner: uid, status: 'active' }),
      Product.countDocuments({ owner: uid, status: 'draft' }),
      Booking.countDocuments({ owner: uid, status: 'pending' }),
      Booking.countDocuments({ renter: uid, status: 'pending' }),
      Booking.countDocuments({ $or: [{ renter: uid }, { owner: uid }], status: 'accepted', endAt: { $gte: now } }),
      Booking.countDocuments({ $or: [{ renter: uid }, { owner: uid }], status: 'active' }),
      Booking.countDocuments({ $or: [{ renter: uid }, { owner: uid }], status: 'completed' }),
      Favorite.countDocuments({ user: uid }),
      Notification.countDocuments({ user: uid, readAt: null }),
    ]);
  ok(res, {
    counts: { listings, activeListings, drafts, incomingPending, myPending, upcoming, active, completed, favorites, unread },
    verificationStatus: req.user.verificationStatus,
  });
}

export async function publicProfile(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const products = await Product.find({ owner: user._id, status: 'active' })
    .sort({ publishedAt: -1 })
    .limit(24)
    .populate('category', 'slug name icon');
  ok(res, { user: publicUser(user), products: products.map((p) => toProductDTO(p, { viewer: req.user })) });
}
