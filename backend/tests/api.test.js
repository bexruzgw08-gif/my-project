import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.SEED_ON_EMPTY = 'false';
process.env.DEMO_VERIFICATION = 'true';

const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seedAll } = await import('../src/seed/seed.js');
const { Product } = await import('../src/models/index.js');

let app;
const DAY = 24 * 3600 * 1000;
const future = (days) => new Date(Date.now() + days * DAY).toISOString();

async function signup(name, email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({
    fullName: name,
    email,
    password: 'Secret123',
    confirmPassword: 'Secret123',
    acceptTerms: true,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { agent, user: res.body.data.user };
}

async function verify(agent) {
  await agent
    .post('/api/verification/submit')
    .send({ documentType: 'passport', documentLast4: 'AB12', fullNameOnDocument: 'Test User', birthYear: 1995, consent: true })
    .expect(200);
  const res = await agent.post('/api/verification/demo-review').send({ decision: 'approve' }).expect(200);
  assert.equal(res.body.data.verification.status, 'verified');
}

before(async () => {
  await connectDB({ ephemeral: true });
  await seedAll();
  app = createApp();
});

after(async () => {
  await disconnectDB();
});

describe('health & catalogue', () => {
  test('GET /api/health responds', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.database.connected, true);
  });

  test('lists 6 categories with product counts', async () => {
    const res = await request(app).get('/api/categories').expect(200);
    assert.equal(res.body.data.items.length, 6);
    assert.ok(res.body.data.items.every((c) => c.productCount > 0));
  });

  test('searches, filters, sorts and paginates on the server', async () => {
    const all = await request(app).get('/api/products?limit=48').expect(200);
    assert.ok(all.body.data.total >= 18);

    const search = await request(app).get('/api/products?q=drel').expect(200);
    assert.ok(search.body.data.items.some((p) => /drel/i.test(p.title)));

    const cat = await request(app).get('/api/products?category=sport-va-sayohat').expect(200);
    assert.ok(cat.body.data.items.length > 0);
    assert.ok(cat.body.data.items.every((p) => p.category.slug === 'sport-va-sayohat'));

    const price = await request(app).get('/api/products?minPrice=50000&maxPrice=100000&sort=price_asc').expect(200);
    const prices = price.body.data.items.map((p) => p.prices.daily);
    assert.ok(prices.every((x) => x >= 50000 && x <= 100000));
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

    const loc = await request(app).get('/api/products?location=Samarqand').expect(200);
    assert.ok(loc.body.data.items.every((p) => p.location.city === 'Samarqand'));

    const page2 = await request(app).get('/api/products?limit=5&page=2').expect(200);
    assert.equal(page2.body.data.items.length, 5);
    assert.equal(page2.body.data.page, 2);

    const none = await request(app).get('/api/products?q=zzzznothing').expect(200);
    assert.equal(none.body.data.total, 0);
  });

  test('public product detail hides exact coordinates', async () => {
    const list = await request(app).get('/api/products?limit=1').expect(200);
    const id = list.body.data.items[0]._id;
    const res = await request(app).get(`/api/products/${id}`).expect(200);
    const { lat } = res.body.data.product.location;
    assert.equal(Math.round(lat * 100) / 100, lat);
    assert.equal(res.body.data.product.owner.email, undefined);
  });

  test('suggestions endpoint returns matches', async () => {
    const res = await request(app).get('/api/products/suggestions?q=chodir').expect(200);
    assert.ok(res.body.data.products.length > 0);
  });
});

describe('auth', () => {
  test('registers, reads session, logs out', async () => {
    const { agent, user } = await signup('Ali Valiyev', 'ali@test.uz');
    assert.equal(user.passwordHash, undefined);
    const me = await agent.get('/api/auth/me').expect(200);
    assert.equal(me.body.data.user.email, 'ali@test.uz');
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });

  test('rejects duplicate email, weak password and wrong login', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'X Y', email: 'ali@test.uz', password: 'Secret123', confirmPassword: 'Secret123', acceptTerms: true })
      .expect(409);
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'X Y', email: 'new@test.uz', password: 'short', confirmPassword: 'short', acceptTerms: true })
      .expect(400);
    await request(app).post('/api/auth/login').send({ email: 'ali@test.uz', password: 'Wrong1234' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'ali@test.uz', password: 'Secret123' }).expect(200);
  });
});

describe('listings, ownership and verification', () => {
  let owner;
  let other;
  let productId;
  let categoryId;

  before(async () => {
    owner = await signup('Owner One', 'owner@test.uz');
    other = await signup('Other Two', 'other@test.uz');
    const cats = await request(app).get('/api/categories');
    categoryId = cats.body.data.items[0]._id;
  });

  test('saves a draft without verification', async () => {
    const res = await owner.agent.post('/api/products').send({ title: 'Test drel' }).expect(201);
    productId = res.body.data.product._id;
    assert.equal(res.body.data.product.status, 'draft');
  });

  test('cannot publish before verification', async () => {
    const res = await owner.agent.patch(`/api/products/${productId}`).send({ publish: true }).expect(403);
    assert.equal(res.body.error.code, 'VERIFICATION_REQUIRED');
  });

  test('cannot publish an incomplete listing', async () => {
    await verify(owner.agent);
    const res = await owner.agent.patch(`/api/products/${productId}`).send({ publish: true }).expect(400);
    assert.ok(res.body.error.details.some((d) => d.field === 'images'));
  });

  test('rejects images not uploaded through the platform', async () => {
    await owner.agent
      .patch(`/api/products/${productId}`)
      .send({ images: [{ url: 'https://evil.example.com/x.jpg' }] })
      .expect(400);
  });

  test('publishes a complete listing', async () => {
    const res = await owner.agent
      .patch(`/api/products/${productId}`)
      .send({
        category: categoryId,
        description: 'A reliable cordless drill for home repairs and furniture.',
        images: [{ url: '/seed-images/drill-0.jpg' }],
        prices: { daily: 50000, hourly: 10000, deposit: 100000 },
        location: { region: 'Toshkent shahri', city: 'Toshkent', lat: 41.31, lng: 69.28 },
        publish: true,
      })
      .expect(200);
    assert.equal(res.body.data.product.status, 'active');
  });

  test('another user cannot edit, pause or delete the listing', async () => {
    await other.agent.patch(`/api/products/${productId}`).send({ title: 'Hacked' }).expect(403);
    await other.agent.patch(`/api/products/${productId}/status`).send({ status: 'paused' }).expect(403);
    await other.agent.delete(`/api/products/${productId}`).expect(403);
    // Owner id in the payload is ignored (strict schema).
    await other.agent.post('/api/products').send({ title: 'x', owner: owner.user._id }).expect(400);
    const p = await Product.findById(productId);
    assert.equal(p.title, 'Test drel');
  });

  test('owner can pause and reactivate', async () => {
    await owner.agent.patch(`/api/products/${productId}/status`).send({ status: 'paused' }).expect(200);
    await request(app).get(`/api/products/${productId}`).expect(404);
    await owner.agent.patch(`/api/products/${productId}/status`).send({ status: 'active' }).expect(200);
  });

  test('favorites persist', async () => {
    await other.agent.post(`/api/favorites/${productId}`).expect(200);
    await other.agent.post(`/api/favorites/${productId}`).expect(200); // idempotent
    const favs = await other.agent.get('/api/favorites').expect(200);
    assert.equal(favs.body.data.items.length, 1);
    const p = await Product.findById(productId);
    assert.equal(p.favoritesCount, 1);
    await other.agent.delete(`/api/favorites/${productId}`).expect(200);
    const after = await other.agent.get('/api/favorites/ids').expect(200);
    assert.equal(after.body.data.ids.length, 0);
  });

  describe('bookings', () => {
    let renterB;
    let bookingA;
    let bookingB;

    before(async () => {
      renterB = await signup('Renter Three', 'renter3@test.uz');
    });

    test('unauthenticated and unverified users cannot request', async () => {
      const body = { productId, startAt: future(2), endAt: future(4), acceptTerms: true };
      await request(app).post('/api/bookings').send(body).expect(401);
      const res = await other.agent.post('/api/bookings').send(body).expect(403);
      assert.equal(res.body.error.code, 'VERIFICATION_REQUIRED');
    });

    test('owner cannot rent own item; terms must be accepted', async () => {
      await verify(other.agent);
      await verify(renterB.agent);
      await owner.agent.post('/api/bookings').send({ productId, startAt: future(2), endAt: future(4), acceptTerms: true }).expect(403);
      await other.agent.post('/api/bookings').send({ productId, startAt: future(2), endAt: future(4), acceptTerms: false }).expect(400);
    });

    test('server computes the price and ignores client totals', async () => {
      await other.agent
        .post('/api/bookings')
        .send({ productId, startAt: future(2), endAt: future(4), acceptTerms: true, pricing: { total: 1 } })
        .expect(400); // unknown fields are rejected
      const res = await other.agent
        .post('/api/bookings')
        .send({ productId, startAt: future(2), endAt: future(4), acceptTerms: true })
        .expect(201);
      bookingA = res.body.data.booking;
      assert.equal(bookingA.pricing.rentalCost, 100000);
      assert.equal(bookingA.pricing.deposit, 100000);
      assert.equal(bookingA.status, 'pending');
      assert.equal(bookingA.counterpart.phone, undefined, 'owner contact hidden while pending');
    });

    test('owner is notified', async () => {
      const res = await owner.agent.get('/api/notifications').expect(200);
      assert.ok(res.body.data.items.some((n) => n.type === 'booking_requested'));
    });

    test('renter cannot accept their own request; invalid transitions are refused', async () => {
      await other.agent.patch(`/api/bookings/${bookingA._id}/status`).send({ action: 'accept' }).expect(403);
      await owner.agent.patch(`/api/bookings/${bookingA._id}/status`).send({ action: 'complete' }).expect(409);
      await renterB.agent.patch(`/api/bookings/${bookingA._id}/status`).send({ action: 'cancel' }).expect(404);
    });

    test('concurrent accepts of overlapping requests confirm only one', async () => {
      const res = await renterB.agent
        .post('/api/bookings')
        .send({ productId, startAt: future(3), endAt: future(5), acceptTerms: true })
        .expect(201);
      bookingB = res.body.data.booking;

      const [r1, r2] = await Promise.all([
        owner.agent.patch(`/api/bookings/${bookingA._id}/status`).send({ action: 'accept' }),
        owner.agent.patch(`/api/bookings/${bookingB._id}/status`).send({ action: 'accept' }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      assert.deepEqual(statuses, [200, 409], `got ${r1.status} ${r2.status}`);

      const list = await owner.agent.get('/api/bookings?role=owner').expect(200);
      const accepted = list.body.data.items.filter((b) => b.status === 'accepted');
      assert.equal(accepted.length, 1);
    });

    test('overlapping requests are refused once dates are confirmed', async () => {
      const res = await renterB.agent
        .post('/api/bookings')
        .send({ productId, startAt: future(3), endAt: future(3.5), acceptTerms: true })
        .expect(409);
      assert.equal(res.body.error.code, 'DATES_UNAVAILABLE');
    });

    test('contact details appear after acceptance; lifecycle completes', async () => {
      const list = await owner.agent.get('/api/bookings?role=owner&status=accepted').expect(200);
      const b = list.body.data.items[0];
      assert.ok(b.counterpart.email);
      await owner.agent.patch(`/api/bookings/${b._id}/status`).send({ action: 'activate' }).expect(200);
      const done = await owner.agent.patch(`/api/bookings/${b._id}/status`).send({ action: 'complete' }).expect(200);
      assert.equal(done.body.data.booking.status, 'completed');
      await owner.agent.patch(`/api/bookings/${b._id}/status`).send({ action: 'cancel' }).expect(409);
    });

    test('dashboard counts come from real data', async () => {
      const res = await owner.agent.get('/api/users/me/dashboard').expect(200);
      assert.equal(res.body.data.counts.activeListings, 1);
      assert.equal(res.body.data.counts.completed, 1);
    });
  });
});

describe('verification privacy', () => {
  test('verification details are never exposed publicly', async () => {
    const { agent, user } = await signup('Private Person', 'private@test.uz');
    await agent
      .post('/api/verification/submit')
      .send({ documentType: 'passport', documentLast4: 'ZZ99', fullNameOnDocument: 'Private Person', birthYear: 1990, consent: true })
      .expect(200);
    const pub = await request(app).get(`/api/users/${user._id}`).expect(200);
    const text = JSON.stringify(pub.body);
    assert.ok(!text.includes('ZZ99'));
    assert.ok(!text.includes('documentType'));
    assert.ok(!text.includes('email'));
  });
});
