import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { unauthorized, forbidden } from '../utils/AppError.js';

export const AUTH_COOKIE = 'kb_token';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/' });
}

function readToken(req) {
  if (req.cookies?.[AUTH_COOKIE]) return req.cookies[AUTH_COOKIE];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function resolveUser(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
}

/** Requires a valid session; attaches req.user. */
export async function requireAuth(req, _res, next) {
  const user = await resolveUser(req);
  if (!user) return next(unauthorized());
  req.user = user;
  next();
}

/** Attaches req.user when a valid session exists, but never fails. */
export async function optionalAuth(req, _res, next) {
  req.user = await resolveUser(req);
  next();
}

/** Must run after requireAuth. Enforces completed identity verification. */
export function requireVerified(req, _res, next) {
  if (req.user?.verificationStatus !== 'verified') {
    const err = forbidden('Identity verification is required for this action');
    err.code = 'VERIFICATION_REQUIRED';
    return next(err);
  }
  next();
}
