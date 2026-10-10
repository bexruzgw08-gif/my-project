import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { conflict, unauthorized } from '../utils/AppError.js';
import { ok, created } from '../utils/respond.js';
import { notify } from '../services/notification.service.js';

const SALT_ROUNDS = 12;
// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', SALT_ROUNDS);

export async function register(req, res) {
  const { fullName, email, password, language } = req.body;
  if (await User.exists({ email })) throw conflict('An account with this email already exists', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    fullName,
    email,
    passwordHash,
    language: language || 'uz',
    termsAcceptedAt: new Date(),
  });
  await notify(user._id, 'welcome', {}, '/dashboard');

  setAuthCookie(res, signToken(user._id));
  created(res, { user });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) throw unauthorized('Invalid email or password');

  setAuthCookie(res, signToken(user._id));
  ok(res, { user: user.toJSON() });
}

export async function logout(_req, res) {
  clearAuthCookie(res);
  ok(res, { loggedOut: true });
}

export async function me(req, res) {
  ok(res, { user: req.user });
}
