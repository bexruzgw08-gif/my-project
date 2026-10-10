import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireAuth, optionalAuth, requireVerified } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, writeLimiter } from '../middleware/rateLimit.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as users from '../controllers/user.controller.js';
import * as categories from '../controllers/category.controller.js';
import * as products from '../controllers/product.controller.js';
import * as bookings from '../controllers/booking.controller.js';
import * as favorites from '../controllers/favorite.controller.js';
import * as notifications from '../controllers/notification.controller.js';
import * as verification from '../controllers/verification.controller.js';
import * as uploads from '../controllers/upload.controller.js';
import { dbMode } from '../config/db.js';
import { storageMode, MAX_IMAGE_BYTES } from '../services/storage.service.js';

const router = Router();
const id = validate(S.idParam, 'params');
const productId = validate(S.productIdParam, 'params');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

// ---- Health ----
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: { mode: dbMode, connected: mongoose.connection.readyState === 1 },
      imageStorage: storageMode(),
      time: new Date().toISOString(),
    },
  });
});

// ---- Auth ----
router.post('/auth/register', authLimiter, validate(S.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(S.loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);

// ---- Users ----
router.patch('/users/me', requireAuth, validate(S.updateProfileSchema), users.updateMe);
router.patch('/users/me/language', requireAuth, validate(S.languageSchema), users.setLanguage);
router.patch('/users/me/password', requireAuth, authLimiter, validate(S.changePasswordSchema), users.changePassword);
router.get('/users/me/products', requireAuth, users.myProducts);
router.get('/users/me/dashboard', requireAuth, users.dashboard);
router.get('/users/:id', optionalAuth, id, users.publicProfile);

// ---- Categories ----
router.get('/categories', categories.listCategories);

// ---- Products ----
router.get('/products', optionalAuth, validate(S.productQuerySchema, 'query'), products.listProducts);
router.get('/products/suggestions', validate(S.suggestionQuerySchema, 'query'), products.suggestions);
router.get('/products/locations', products.locations);
router.get('/products/:id', optionalAuth, id, products.getProduct);
router.get('/products/:id/similar', optionalAuth, id, products.similarProducts);
router.get('/products/:id/booked', id, products.bookedRanges);
router.post('/products', requireAuth, writeLimiter, validate(S.productInputSchema), products.createProduct);
router.patch('/products/:id', requireAuth, writeLimiter, id, validate(S.productInputSchema), products.updateProduct);
router.patch('/products/:id/status', requireAuth, id, validate(S.productStatusSchema), products.setProductStatus);
router.delete('/products/:id', requireAuth, id, products.deleteProduct);

// ---- Uploads ----
router.post('/uploads/images', requireAuth, writeLimiter, upload.array('images', 8), uploads.uploadImages);

// ---- Favorites ----
router.get('/favorites', requireAuth, favorites.listFavorites);
router.get('/favorites/ids', requireAuth, favorites.favoriteIds);
router.post('/favorites/:productId', requireAuth, productId, favorites.addFavorite);
router.delete('/favorites/:productId', requireAuth, productId, favorites.removeFavorite);

// ---- Bookings ----
router.post('/bookings/quote', validate(S.bookingQuoteSchema), bookings.quote);
router.post('/bookings', requireAuth, requireVerified, writeLimiter, validate(S.bookingCreateSchema), bookings.create);
router.get('/bookings', requireAuth, validate(S.bookingListQuerySchema, 'query'), bookings.list);
router.get('/bookings/:id', requireAuth, id, bookings.getOne);
router.patch('/bookings/:id/status', requireAuth, id, validate(S.bookingActionSchema), bookings.changeStatus);

// ---- Notifications ----
router.get('/notifications', requireAuth, validate(S.paginationSchema, 'query'), notifications.list);
router.get('/notifications/unread-count', requireAuth, notifications.unreadCount);
router.patch('/notifications/read-all', requireAuth, notifications.markAllRead);
router.patch('/notifications/:id/read', requireAuth, id, notifications.markRead);

// ---- Verification (demo) ----
router.get('/verification/me', requireAuth, verification.getMine);
router.post('/verification/submit', requireAuth, validate(S.verificationSubmitSchema), verification.submit);
router.post('/verification/demo-review', requireAuth, validate(S.demoReviewSchema), verification.demoReview);

export default router;
