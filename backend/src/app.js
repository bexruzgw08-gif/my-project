import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './services/storage.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEED_IMAGE_DIR = path.join(__dirname, 'seed', 'images');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.clientOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  const staticOpts = { maxAge: '7d', fallthrough: true, index: false, dotfiles: 'deny' };
  app.use('/uploads/products', express.static(path.join(UPLOAD_DIR, 'products'), staticOpts));
  app.use('/seed-images', express.static(SEED_IMAGE_DIR, staticOpts));

  app.get('/', (_req, res) => res.json({ success: true, data: { name: 'KerakBo‘lsa API', health: '/api/health' } }));
  app.use('/api', apiLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
