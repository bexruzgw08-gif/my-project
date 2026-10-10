import { Booking } from '../models/index.js';
import { notFound } from '../utils/AppError.js';
import { ok, created } from '../utils/respond.js';
import { bookingDTO, createBooking, quoteBooking, transitionBooking } from '../services/booking.service.js';

export async function quote(req, res) {
  ok(res, { quote: await quoteBooking(req.body) });
}

export async function create(req, res) {
  const booking = await createBooking(req.user, req.body);
  created(res, { booking: await bookingDTO(booking, req.user) });
}

export async function list(req, res) {
  const { role, status, scope, page, limit } = req.validatedQuery;
  const filter = role === 'owner' ? { owner: req.user._id } : { renter: req.user._id };
  const now = new Date();

  if (scope === 'upcoming') Object.assign(filter, { status: 'accepted', endAt: { $gte: now } });
  else if (scope === 'active') filter.status = 'active';
  else if (scope === 'history') filter.status = { $in: ['completed', 'cancelled', 'rejected'] };
  else if (status) filter.status = { $in: status.split(',').map((s) => s.trim()) };

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort(scope === 'upcoming' ? { startAt: 1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);
  ok(res, { items: await Promise.all(items.map((b) => bookingDTO(b, req.user))), total, page, pages: Math.ceil(total / limit) });
}

export async function getOne(req, res) {
  const booking = await Booking.findById(req.params.id);
  const uid = String(req.user._id);
  if (!booking || (String(booking.owner) !== uid && String(booking.renter) !== uid)) throw notFound('Booking not found');
  ok(res, { booking: await bookingDTO(booking, req.user) });
}

export async function changeStatus(req, res) {
  const booking = await transitionBooking(req.params.id, req.user, req.body.action, req.body.note);
  ok(res, { booking: await bookingDTO(booking, req.user) });
}
