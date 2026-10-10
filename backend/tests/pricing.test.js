import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { calculateRentalCost, buildQuote } = await import('../src/services/pricing.js');

const H = 3600 * 1000;
const start = new Date('2030-01-01T10:00:00Z');
const at = (hours) => new Date(start.getTime() + hours * H);

test('charges whole days when no hourly price exists', () => {
  const r = calculateRentalCost({ daily: 50000 }, start, at(26));
  assert.equal(r.rentalCost, 100000);
  assert.deepEqual(r.lines, [{ unit: 'day', quantity: 2, unitPrice: 50000, amount: 100000 }]);
});

test('uses hourly price for short rentals', () => {
  const r = calculateRentalCost({ hourly: 15000, daily: 50000 }, start, at(3));
  assert.equal(r.rentalCost, 45000);
});

test('caps hourly cost at the daily price', () => {
  const r = calculateRentalCost({ hourly: 15000, daily: 50000 }, start, at(10));
  assert.equal(r.rentalCost, 50000);
});

test('combines days and remaining hours when cheaper', () => {
  const r = calculateRentalCost({ hourly: 10000, daily: 50000 }, start, at(26));
  assert.equal(r.rentalCost, 70000); // 1 day + 2 hours
});

test('applies weekly price when cheaper', () => {
  const r = calculateRentalCost({ daily: 50000, weekly: 250000 }, start, at(24 * 9));
  assert.equal(r.rentalCost, 350000); // 1 week + 2 days
  const six = calculateRentalCost({ daily: 50000, weekly: 250000 }, start, at(24 * 6));
  assert.equal(six.rentalCost, 250000); // 6 days would cost 300 000, a week is cheaper
});

test('rejects invalid periods and missing daily price', () => {
  assert.throws(() => calculateRentalCost({ daily: 50000 }, start, start), /after start/);
  assert.throws(() => calculateRentalCost({ daily: 50000 }, start, at(24 * 91)), /Maximum/);
  assert.throws(() => calculateRentalCost({ hourly: 1000 }, start, at(2)), /no daily price/);
});

test('quote separates rental cost, delivery fee and deposit', () => {
  const product = { prices: { daily: 50000, deposit: 300000 }, delivery: { deliveryFee: 30000 } };
  const q = buildQuote(product, { startAt: start, endAt: at(48), deliveryMethod: 'delivery' });
  assert.equal(q.rentalCost, 100000);
  assert.equal(q.deliveryFee, 30000);
  assert.equal(q.total, 130000);
  assert.equal(q.deposit, 300000);
  assert.equal(q.dueAtPickup, 430000);
  const pickup = buildQuote(product, { startAt: start, endAt: at(48), deliveryMethod: 'pickup' });
  assert.equal(pickup.deliveryFee, 0);
});
