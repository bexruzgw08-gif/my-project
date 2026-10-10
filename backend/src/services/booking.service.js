import { Booking, Product, User } from '../models/index.js';
import { BLOCKING_STATUSES } from '../models/Booking.js';
import { AppError, badRequest, conflict, forbidden, notFound } from '../utils/AppError.js';
import { buildQuote, MAX_RENTAL_DAYS } from './pricing.js';
import { notify } from './notification.service.js';

const LOCK_TTL_MS = 10_000;
const LOCK_WAIT_MS = 5_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per-product mutex stored on the product document. Acquisition is a single atomic
 * findOneAndUpdate, so only one request at a time can confirm bookings for a product.
 * Works on any MongoDB deployment (no replica-set transactions needed); the TTL
 * prevents a crashed request from holding the lock forever.
 */
export async function withProductLock(productId, fn) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    const now = new Date();
    const acquired = await Product.findOneAndUpdate(
      { _id: productId, $or: [{ bookingLockUntil: null }, { bookingLockUntil: { $lt: now } }] },
      { $set: { bookingLockUntil: new Date(now.getTime() + LOCK_TTL_MS) } },
      { projection: { _id: 1 } },
    );
    if (acquired) break;
    if (!(await Product.exists({ _id: productId }))) throw notFound('Product not found');
    if (Date.now() > deadline) throw conflict('The listing is busy, please try again', 'LOCK_TIMEOUT');
    await sleep(25 + Math.random() * 50);
  }
  try {
    return await fn();
  } finally {
    await Product.updateOne({ _id: productId }, { $set: { bookingLockUntil: null } });
  }
}

export function findOverlapping(productId, startAt, endAt, statuses = BLOCKING_STATUSES, excludeId = null) {
  const filter = { product: productId, status: { $in: statuses }, startAt: { $lt: endAt }, endAt: { $gt: startAt } };
  if (excludeId) filter._id = { $ne: excludeId };
  return Booking.findOne(filter).select('_id startAt endAt status').lean();
}

/** Validates dates and product rules shared by quotes and booking creation. */
export function validateWindow(product, { startAt, endAt, deliveryMethod }) {
  const now = Date.now();
  if (startAt.getTime() < now - 5 * 60 * 1000) throw badRequest('Start time cannot be in the past');
  if (endAt <= startAt) throw badRequest('End time must be after start time');
  if (endAt - startAt > MAX_RENTAL_DAYS * 24 * 3600 * 1000) throw badRequest(`Maximum rental period is ${MAX_RENTAL_DAYS} days`);

  const { isAvailable, availableFrom, availableTo } = product.availability || {};
  if (!isAvailable) throw new AppError(409, 'This item is currently not available', 'NOT_AVAILABLE');
  if (availableFrom && startAt < new Date(availableFrom)) throw badRequest('The item is not available from this date');
  if (availableTo && endAt > new Date(availableTo)) throw badRequest('The item is not available until this date');

  if (deliveryMethod === 'delivery' && !product.delivery?.delivery) throw badRequest('Delivery is not offered for this item');
  if (deliveryMethod === 'pickup' && product.delivery?.pickup === false) throw badRequest('Pickup is not offered for this item');
}

export async function quoteBooking(input) {
  const product = await Product.findOne({ _id: input.productId, status: 'active' });
  if (!product) throw notFound('Listing not found or not active');
  validateWindow(product, input);
  const quote = buildQuote(product, input);
  const overlap = await findOverlapping(product._id, input.startAt, input.endAt);
  return { ...quote, available: !overlap };
}

export async function createBooking(renter, input) {
  const product = await Product.findOne({ _id: input.productId, status: 'active' });
  if (!product) throw notFound('Listing not found or not active');
  if (String(product.owner) === String(renter._id)) throw forbidden('You cannot rent your own item');

  validateWindow(product, input);
  const pricing = buildQuote(product, input);

  if (await findOverlapping(product._id, input.startAt, input.endAt)) {
    throw conflict('The item is already booked for these dates', 'DATES_UNAVAILABLE');
  }
  const duplicate = await findOverlapping(product._id, input.startAt, input.endAt, ['pending'])
    .where('renter')
    .equals(renter._id);
  if (duplicate) throw conflict('You already have a pending request for these dates', 'DUPLICATE_REQUEST');

  const cover = product.images[product.coverIndex] || product.images[0];
  const booking = await Booking.create({
    product: product._id,
    owner: product.owner,
    renter: renter._id,
    startAt: input.startAt,
    endAt: input.endAt,
    deliveryMethod: input.deliveryMethod,
    deliveryAddress: input.deliveryMethod === 'delivery' ? input.deliveryAddress : '',
    message: input.message,
    pricing: {
      currency: pricing.currency,
      lines: pricing.lines,
      rentalCost: pricing.rentalCost,
      deliveryFee: pricing.deliveryFee,
      serviceFee: pricing.serviceFee,
      total: pricing.total,
      deposit: pricing.deposit,
      dueAtPickup: pricing.dueAtPickup,
    },
    terms: { acceptedAt: new Date(), rentalTerms: product.rentalTerms, damagePolicy: product.damagePolicy },
    productSnapshot: { title: product.title, image: cover?.url || '', city: product.location?.city || '' },
    status: 'pending',
    statusHistory: [{ status: 'pending', by: renter._id }],
  });

  await notify(
    product.owner,
    'booking_requested',
    { bookingId: booking._id, productId: product._id, productTitle: product.title, actorName: renter.fullName },
    '/dashboard/incoming',
  );
  return booking;
}

/**
 * Allowed status transitions. `actor` is who may perform the action.
 * Every transition is applied with a conditional update on the current status,
 * so two concurrent requests cannot both move a booking out of the same state.
 */
export const TRANSITIONS = {
  accept: { from: ['pending'], to: 'accepted', actors: ['owner'] },
  reject: { from: ['pending'], to: 'rejected', actors: ['owner'] },
  cancel: { from: ['pending', 'accepted'], to: 'cancelled', actors: ['renter', 'owner'] },
  activate: { from: ['accepted'], to: 'active', actors: ['owner'] },
  complete: { from: ['active'], to: 'completed', actors: ['owner'] },
};

const NOTIFY_TYPE = {
  accepted: 'booking_accepted',
  rejected: 'booking_rejected',
  cancelled: 'booking_cancelled',
  active: 'booking_active',
  completed: 'booking_completed',
};

async function applyTransition(booking, rule, user, note) {
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: { $in: rule.from } },
    { $set: { status: rule.to }, $push: { statusHistory: { status: rule.to, by: user._id, note } } },
    { new: true },
  );
  if (!updated) throw conflict('The booking status has changed, please refresh', 'STATUS_CHANGED');
  return updated;
}

export async function transitionBooking(bookingId, user, action, note) {
  const rule = TRANSITIONS[action];
  if (!rule) throw badRequest('Unknown action');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  const isOwner = String(booking.owner) === String(user._id);
  const isRenter = String(booking.renter) === String(user._id);
  if (!isOwner && !isRenter) throw notFound('Booking not found');

  const role = isOwner ? 'owner' : 'renter';
  if (!rule.actors.includes(role)) throw forbidden(`Only the ${rule.actors.join(' or ')} can ${action} this booking`);
  if (!rule.from.includes(booking.status)) {
    throw new AppError(409, `Cannot ${action} a booking that is ${booking.status}`, 'INVALID_TRANSITION');
  }

  let updated;
  if (action === 'accept') {
    if (booking.endAt < new Date()) throw badRequest('This request has expired');
    updated = await withProductLock(booking.product, async () => {
      const overlap = await findOverlapping(booking.product, booking.startAt, booking.endAt, BLOCKING_STATUSES, booking._id);
      if (overlap) throw conflict('Another booking is already confirmed for these dates', 'DATES_UNAVAILABLE');
      const accepted = await applyTransition(booking, rule, user, note);
      // Automatically decline other pending requests that now conflict.
      const clashing = await Booking.find({
        product: booking.product,
        status: 'pending',
        _id: { $ne: booking._id },
        startAt: { $lt: booking.endAt },
        endAt: { $gt: booking.startAt },
      });
      for (const other of clashing) {
        const rejected = await Booking.findOneAndUpdate(
          { _id: other._id, status: 'pending' },
          { $set: { status: 'rejected' }, $push: { statusHistory: { status: 'rejected', by: user._id, note: 'Dates already booked' } } },
          { new: true },
        );
        if (rejected) {
          await notify(rejected.renter, 'booking_rejected', {
            bookingId: rejected._id,
            productId: rejected.product,
            productTitle: rejected.productSnapshot?.title,
            actorName: user.fullName,
          }, '/dashboard/requests');
        }
      }
      return accepted;
    });
  } else {
    updated = await applyTransition(booking, rule, user, note);
  }

  const recipient = isOwner ? booking.renter : booking.owner;
  await notify(
    recipient,
    NOTIFY_TYPE[rule.to],
    { bookingId: booking._id, productId: booking.product, productTitle: booking.productSnapshot?.title, actorName: user.fullName },
    isOwner ? '/dashboard/requests' : '/dashboard/incoming',
  );
  return updated;
}

/** Contact details are revealed only once the owner has accepted the request. */
export const CONTACT_VISIBLE_STATUSES = ['accepted', 'active', 'completed'];

export async function bookingDTO(booking, viewer) {
  const b = booking.toJSON ? booking.toJSON() : booking;
  const viewerIsOwner = String(b.owner?._id ?? b.owner) === String(viewer._id);
  const counterpartId = viewerIsOwner ? b.renter?._id ?? b.renter : b.owner?._id ?? b.owner;
  const counterpart = await User.findById(counterpartId).select('fullName avatarUrl city phone email verificationStatus createdAt').lean();
  const showContact = CONTACT_VISIBLE_STATUSES.includes(b.status);
  return {
    ...b,
    viewerRole: viewerIsOwner ? 'owner' : 'renter',
    counterpart: counterpart && {
      _id: counterpart._id,
      fullName: counterpart.fullName,
      avatarUrl: counterpart.avatarUrl,
      city: counterpart.city,
      verified: counterpart.verificationStatus === 'verified',
      ...(showContact ? { phone: counterpart.phone || '', email: counterpart.email } : {}),
    },
    contactVisible: showContact,
    allowedActions: Object.entries(TRANSITIONS)
      .filter(([, r]) => r.from.includes(b.status) && r.actors.includes(viewerIsOwner ? 'owner' : 'renter'))
      .map(([name]) => name),
  };
}
