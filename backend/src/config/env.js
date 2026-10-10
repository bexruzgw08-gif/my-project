import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env'), quiet: true });

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me-0123456789';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  // Empty or "memory" => local development database (mongodb-memory-server).
  MONGODB_URI: z.string().trim().optional().default(''),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  DEMO_VERIFICATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SEED_ON_EMPTY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const raw = parsed.data;

if (!raw.JWT_SECRET && raw.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET is required in production.');
  process.exit(1);
}

const useMemoryDb = !raw.MONGODB_URI || raw.MONGODB_URI === 'memory';
if (useMemoryDb && raw.NODE_ENV === 'production') {
  console.error('❌ MONGODB_URI is required in production.');
  process.exit(1);
}

export const env = {
  ...raw,
  JWT_SECRET: raw.JWT_SECRET || DEV_JWT_SECRET,
  usingDevJwtSecret: !raw.JWT_SECRET,
  useMemoryDb,
  clientOrigins: raw.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  cloudinaryEnabled: Boolean(raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET),
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
};
