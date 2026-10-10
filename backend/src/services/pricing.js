import { badRequest } from '../utils/AppError.js';

export const HOUR_MS = 60 * 60 * 1000;
export const MAX_RENTAL_DAYS = 90;

const isPrice = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Day-based lines, using weekly price where it is cheaper. */
function dayLines(days, { daily, weekly }) {
  if (days <= 0) return [];
  const lines = [];
  if (isPrice(weekly)) {
    let weeks = Math.floor(days / 7);
    let rest = days % 7;
    // If the leftover days cost more than one more week, rent one more week instead.
    if (rest > 0 && rest * daily > weekly) {
      weeks += 1;
      rest = 0;
    }
    if (weeks > 0) lines.push({ unit: 'week', quantity: weeks, unitPrice: weekly, amount: weeks * weekly });
    if (rest > 0) lines.push({ unit: 'day', quantity: rest, unitPrice: daily, amount: rest * daily });
  } else {
    lines.push({ unit: 'day', quantity: days, unitPrice: daily, amount: days * daily });
  }
  return lines;
}

const sum = (lines) => lines.reduce((s, l) => s + l.amount, 0);

/**
 * Calculates the rental cost from the product's own prices — the only trusted source.
 * Picks the cheapest valid combination of weekly / daily / hourly rates.
 * Never invents a price: the listing must have a daily price, hourly/weekly are optional.
 */
export function calculateRentalCost(prices, startAt, endAt) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw badRequest('Invalid rental dates');
  if (end <= start) throw badRequest('End time must be after start time');

  const hours = Math.ceil((end - start) / HOUR_MS);
  if (hours > MAX_RENTAL_DAYS * 24) throw badRequest(`Maximum rental period is ${MAX_RENTAL_DAYS} days`);

  const daily = prices?.daily;
  if (!isPrice(daily)) throw badRequest('This listing has no daily price and cannot be rented');
  const p = { daily, weekly: isPrice(prices.weekly) ? prices.weekly : null, hourly: isPrice(prices.hourly) ? prices.hourly : null };

  // Candidate A: round up to whole days.
  const candidates = [dayLines(Math.ceil(hours / 24), p)];

  // Candidate B: whole days + remaining hours at the hourly rate.
  if (p.hourly) {
    const fullDays = Math.floor(hours / 24);
    const remHours = hours % 24;
    const lines = dayLines(fullDays, p);
    if (remHours > 0) lines.push({ unit: 'hour', quantity: remHours, unitPrice: p.hourly, amount: remHours * p.hourly });
    candidates.push(lines);
  }

  const best = candidates.reduce((a, b) => (sum(b) < sum(a) ? b : a));
  return { hours, lines: best, rentalCost: sum(best) };
}

/** Full quote: rental cost, delivery fee, service fee and refundable deposit shown separately. */
export function buildQuote(product, { startAt, endAt, deliveryMethod = 'pickup' }) {
  const { hours, lines, rentalCost } = calculateRentalCost(product.prices, startAt, endAt);
  const deliveryFee = deliveryMethod === 'delivery' ? Math.max(0, product.delivery?.deliveryFee || 0) : 0;
  const serviceFee = 0; // The MVP charges no platform fee.
  const deposit = Math.max(0, product.prices?.deposit || 0);
  const total = rentalCost + deliveryFee + serviceFee;
  return {
    currency: 'UZS',
    hours,
    lines,
    rentalCost,
    deliveryFee,
    serviceFee,
    total,
    deposit,
    dueAtPickup: total + deposit,
  };
}
