// Usage: npm run seed  — (re)creates categories and the clearly-labelled demo users/products.
// Non-demo (real) users and listings are never touched.
import { connectDB, disconnectDB } from '../config/db.js';
import { seedAll } from './seed.js';
import { DEMO_PASSWORD, demoUsers } from './data.js';

try {
  const { mode } = await connectDB();
  console.log(`Connected (${mode}). Seeding…`);
  const result = await seedAll();
  console.log(`✅ Seeded ${result.categories} categories, ${result.users} demo users, ${result.products} demo products.`);
  console.log(`   Demo login: ${demoUsers[0].email} / ${DEMO_PASSWORD}`);
} catch (err) {
  console.error('❌ Seeding failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
