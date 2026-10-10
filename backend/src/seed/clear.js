// Usage: npm run demo:clear -- --yes
// Permanently deletes the demo users/listings (isDemo: true) and their related records
// from the database in MONGODB_URI. Categories and real users' data are kept.
// The demo data can be restored later with `npm run seed`.
import { connectDB, disconnectDB } from '../config/db.js';
import { Category, Product, User } from '../models/index.js';
import { removeDemoData } from './seed.js';

const confirmed = process.argv.includes('--yes');

try {
  const { mode } = await connectDB();
  const [demoUsers, demoProducts] = await Promise.all([User.countDocuments({ isDemo: true }), Product.countDocuments({ isDemo: true })]);
  console.log(`Database: ${mode}. Found ${demoUsers} demo users and ${demoProducts} demo listings.`);

  if (!confirmed) {
    console.log('Nothing deleted. Re-run with --yes to delete them:  npm run demo:clear -- --yes');
  } else {
    const r = await removeDemoData();
    const [users, products, categories] = await Promise.all([User.countDocuments(), Product.countDocuments(), Category.countDocuments()]);
    console.log(
      `✅ Deleted ${r.users} demo users, ${r.products} demo listings, ${r.bookings} bookings, ${r.favorites} favourites, ${r.notifications} notifications.`,
    );
    console.log(`   Remaining: ${users} users, ${products} listings, ${categories} categories.`);
  }
} catch (err) {
  console.error('❌ Failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
