import { Favorite, Product } from '../models/index.js';
import { notFound } from '../utils/AppError.js';
import { ok } from '../utils/respond.js';
import { toProductDTO } from '../services/product.service.js';

export async function listFavorites(req, res) {
  const favs = await Favorite.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'product',
      populate: [
        { path: 'category', select: 'slug name icon' },
        { path: 'owner', select: 'fullName avatarUrl city verificationStatus createdAt' },
      ],
    });
  const items = favs
    .filter((f) => f.product && (f.product.status === 'active' || String(f.product.owner._id) === String(req.user._id)))
    .map((f) => ({ ...toProductDTO(f.product, { viewer: req.user }), isFavorite: true, favoritedAt: f.createdAt }));
  ok(res, { items });
}

export async function favoriteIds(req, res) {
  const favs = await Favorite.find({ user: req.user._id }).select('product').lean();
  ok(res, { ids: favs.map((f) => String(f.product)) });
}

export async function addFavorite(req, res) {
  const product = await Product.findOne({ _id: req.params.productId, status: 'active' }).select('_id');
  if (!product) throw notFound('Listing not found');
  const result = await Favorite.updateOne(
    { user: req.user._id, product: product._id },
    { $setOnInsert: { user: req.user._id, product: product._id } },
    { upsert: true },
  );
  if (result.upsertedCount) await Product.updateOne({ _id: product._id }, { $inc: { favoritesCount: 1 } });
  ok(res, { productId: product._id, isFavorite: true });
}

export async function removeFavorite(req, res) {
  const removed = await Favorite.findOneAndDelete({ user: req.user._id, product: req.params.productId });
  if (removed) await Product.updateOne({ _id: req.params.productId, favoritesCount: { $gt: 0 } }, { $inc: { favoritesCount: -1 } });
  ok(res, { productId: req.params.productId, isFavorite: false });
}
