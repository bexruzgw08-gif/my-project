import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.SEED_ON_EMPTY = 'false';

const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seedAll, removeDemoData } = await import('../src/seed/seed.js');
const { Booking, Category, Favorite, Notification, Product, User } = await import('../src/models/index.js');

let app;
before(async () => {
  await connectDB({ ephemeral: true });
  await seedAll();
  app = createApp();
});
after(async () => {
  await disconnectDB();
});

test('removing demo data keeps categories and real users’ data', async () => {
  // A real user who verifies, publishes a listing and requests a demo item.
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ fullName: 'Real Person', email: 'real@test.uz', password: 'Secret123', confirmPassword: 'Secret123', acceptTerms: true })
    .expect(201);
  await agent.post('/api/verification/submit').send({ documentType: 'passport', documentLast4: 'AB12', fullNameOnDocument: 'Real Person', birthYear: 1990, consent: true });
  await agent.post('/api/verification/demo-review').send({ decision: 'approve' }).expect(200);
  const cat = await Category.findOne();
  const mine = await agent
    .post('/api/products')
    .send({
      title: 'My real drill',
      category: String(cat._id),
      description: 'A real listing that must survive the demo cleanup.',
      images: [{ url: '/seed-images/drill-1.jpg' }],
      prices: { daily: 40000 },
      location: { region: 'Toshkent shahri', city: 'Toshkent', lat: 41.3, lng: 69.2 },
      publish: true,
    })
    .expect(201);
  const demoProduct = await Product.findOne({ isDemo: true });
  await agent.post(`/api/favorites/${demoProduct._id}`).expect(200);
  const start = new Date(Date.now() + 2 * 864e5).toISOString();
  const end = new Date(Date.now() + 3 * 864e5).toISOString();
  await agent.post('/api/bookings').send({ productId: String(demoProduct._id), startAt: start, endAt: end, acceptTerms: true }).expect(201);

  const health = await request(app).get('/api/health').expect(200);
  assert.equal(health.body.data.demoAccounts, true);

  const result = await removeDemoData();
  assert.equal(result.users, 4);
  assert.equal(result.products, 24);

  assert.equal(await User.countDocuments({ isDemo: true }), 0);
  assert.equal(await Product.countDocuments({ isDemo: true }), 0);
  assert.equal(await Category.countDocuments(), 6);
  assert.ok(await User.exists({ email: 'real@test.uz' }));
  assert.ok(await Product.exists({ _id: mine.body.data.product._id }));
  // Nothing left pointing at deleted demo records.
  assert.equal(await Booking.countDocuments(), 0);
  assert.equal(await Favorite.countDocuments(), 0);
  assert.equal(await Notification.countDocuments({ type: 'booking_requested' }), 0);

  const after = await request(app).get('/api/health').expect(200);
  assert.equal(after.body.data.demoAccounts, false);
  const list = await request(app).get('/api/products').expect(200);
  assert.equal(list.body.data.total, 1);
});
