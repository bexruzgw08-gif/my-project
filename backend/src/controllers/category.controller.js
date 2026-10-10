import { Category, Product } from '../models/index.js';
import { ok } from '../utils/respond.js';

export async function listCategories(_req, res) {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ order: 1 }).lean(),
    Product.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  ok(res, {
    items: categories.map(({ __v, ...c }) => ({ ...c, productCount: countMap.get(String(c._id)) || 0 })),
  });
}
