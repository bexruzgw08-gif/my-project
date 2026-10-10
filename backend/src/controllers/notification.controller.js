import { Notification } from '../models/index.js';
import { notFound } from '../utils/AppError.js';
import { ok } from '../utils/respond.js';

export async function list(req, res) {
  const { page, limit } = req.validatedQuery;
  const filter = { user: req.user._id };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: null }),
  ]);
  ok(res, { items, total, unread, page, pages: Math.ceil(total / limit) });
}

export async function unreadCount(req, res) {
  ok(res, { unread: await Notification.countDocuments({ user: req.user._id, readAt: null }) });
}

export async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!n) throw notFound('Notification not found');
  ok(res, { notification: n });
}

export async function markAllRead(req, res) {
  const r = await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  ok(res, { updated: r.modifiedCount });
}
