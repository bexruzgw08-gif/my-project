import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const base = { standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.isTest };
const message = (msg) => ({ success: false, error: { code: 'RATE_LIMITED', message: msg } });

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 600 : 5000,
  message: message('Too many requests, please try again later'),
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 30 : 300,
  message: message('Too many authentication attempts, please try again in 15 minutes'),
});

export const writeLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: env.isProd ? 60 : 600,
  message: message('Too many changes in a short time, please slow down'),
});
