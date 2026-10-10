import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
const money = z.coerce.number().int('Must be a whole number').min(0).max(1_000_000_000);
const optionalMoney = z.union([money, z.null()]).optional();
const language = z.enum(['uz', 'ru', 'en']);

// ---------- Auth & users ----------
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Name is too short').max(80),
    email: z.string().trim().toLowerCase().email('Invalid email').max(120),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/\d/, 'Password must contain a number'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
    language: language.optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s()-]*$/, 'Invalid phone number'),
    city: z.string().trim().max(80),
    bio: z.string().trim().max(500),
    language,
  })
  .partial()
  .strict();

export const languageSchema = z.object({ language });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/\d/, 'Password must contain a number'),
  })
  .strict();

// ---------- Products ----------
/** Only images from our own storage may be attached to listings. */
export function isAllowedImageUrl(url) {
  if (url.startsWith('/uploads/products/') || url.startsWith('/seed-images/')) return !url.includes('..');
  if (env.cloudinaryEnabled) return url.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`);
  return false;
}

const imageInput = z.object({
  url: z.string().max(500).refine(isAllowedImageUrl, 'Image must be uploaded through KerakBo‘lsa'),
  publicId: z.string().max(300).optional().default(''),
});

const dateOrNull = z.union([z.coerce.date(), z.null()]).optional();

/** Shape of a listing payload. Everything is optional so drafts can be saved partially. */
export const productInputSchema = z
  .object({
    title: z.string().trim().max(120),
    category: z.union([objectId, z.null()]),
    description: z.string().trim().max(4000),
    condition: z.enum(['new', 'like_new', 'good', 'fair']),
    specifications: z
      .array(z.object({ key: z.string().trim().max(60), value: z.string().trim().max(200) }))
      .max(20)
      .transform((arr) => arr.filter((s) => s.key && s.value)),
    usageInfo: z.string().trim().max(2000),
    accessories: z
      .array(z.string().trim().max(120))
      .max(20)
      .transform((arr) => arr.filter(Boolean)),
    images: z.array(imageInput).max(8, 'Up to 8 images'),
    coverIndex: z.coerce.number().int().min(0).max(7),
    prices: z
      .object({ hourly: optionalMoney, daily: optionalMoney, weekly: optionalMoney, deposit: money.optional() })
      .partial(),
    location: z
      .object({
        region: z.string().trim().max(80),
        city: z.string().trim().max(80),
        pickupInstructions: z.string().trim().max(1000),
        lat: z.union([z.coerce.number().min(-90).max(90), z.null()]),
        lng: z.union([z.coerce.number().min(-180).max(180), z.null()]),
      })
      .partial(),
    availability: z
      .object({
        isAvailable: z.boolean(),
        availableFrom: dateOrNull,
        availableTo: dateOrNull,
        note: z.string().trim().max(300),
      })
      .partial(),
    delivery: z
      .object({
        pickup: z.boolean(),
        delivery: z.boolean(),
        deliveryFee: money,
        note: z.string().trim().max(300),
      })
      .partial(),
    rentalTerms: z.string().trim().max(3000),
    damagePolicy: z.string().trim().max(3000),
    publish: z.boolean(),
  })
  .partial()
  .strict();

export const productStatusSchema = z.object({ status: z.enum(['active', 'paused', 'draft']) });

const boolString = z.enum(['true', 'false']).transform((v) => v === 'true');

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  region: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  available: boolString.optional(),
  delivery: boolString.optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional().default('newest'),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(12),
  exclude: objectId.optional(),
});

export const suggestionQuerySchema = z.object({ q: z.string().trim().min(1).max(100) });

// ---------- Bookings ----------
const bookingWindow = {
  productId: objectId,
  startAt: z.coerce.date({ errorMap: () => ({ message: 'Invalid start date' }) }),
  endAt: z.coerce.date({ errorMap: () => ({ message: 'Invalid end date' }) }),
  deliveryMethod: z.enum(['pickup', 'delivery']).default('pickup'),
};

export const bookingQuoteSchema = z.object(bookingWindow);

export const bookingCreateSchema = z
  .object({
    ...bookingWindow,
    deliveryAddress: z.string().trim().max(300).optional().default(''),
    message: z.string().trim().max(1000).optional().default(''),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the rental terms' }) }),
  })
  .strict()
  .refine((d) => d.deliveryMethod !== 'delivery' || d.deliveryAddress.length >= 5, {
    path: ['deliveryAddress'],
    message: 'Delivery address is required',
  });

export const bookingActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'cancel', 'activate', 'complete']),
  note: z.string().trim().max(300).optional(),
});

export const bookingListQuerySchema = z.object({
  role: z.enum(['renter', 'owner']).default('renter'),
  status: z.string().trim().max(80).optional(), // comma-separated list
  scope: z.enum(['upcoming', 'active', 'history']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ---------- Verification ----------
export const verificationSubmitSchema = z
  .object({
    documentType: z.enum(['passport', 'id_card', 'driver_license']),
    documentLast4: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{4}$/, 'Enter exactly the last 4 characters'),
    fullNameOnDocument: z.string().trim().min(2).max(80),
    birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() - 16, 'You must be at least 16'),
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
  })
  .strict();

export const demoReviewSchema = z.object({ decision: z.enum(['approve', 'reject']) });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const idParam = z.object({ id: objectId });
export const productIdParam = z.object({ productId: objectId });
