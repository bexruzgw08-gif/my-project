import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { seedIfEmpty } from './seed/seed.js';

async function main() {
  const { mode } = await connectDB();
  if (mode === 'atlas') {
    console.log('✅ Connected to MongoDB (MONGODB_URI)');
  } else {
    console.warn('⚠️  MONGODB_URI is not set — using a LOCAL DEVELOPMENT database (mongodb-memory-server).');
    console.warn('    Data is stored in backend/.data/mongo on this computer only. Set MONGODB_URI to use MongoDB Atlas.');
  }
  if (env.usingDevJwtSecret) console.warn('⚠️  JWT_SECRET is not set — using an insecure development secret.');
  if (!env.cloudinaryEnabled) console.warn('ℹ️  Cloudinary is not configured — uploaded images are stored locally in backend/uploads.');

  if (env.SEED_ON_EMPTY) {
    const seeded = await seedIfEmpty();
    if (seeded) console.log(`🌱 Seeded demo data: ${seeded.categories} categories, ${seeded.products} demo products`);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 KerakBo‘lsa API listening on http://localhost:${env.PORT} (health: /api/health)`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
