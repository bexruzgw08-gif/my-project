import mongoose from 'mongoose';

export const PRODUCT_STATUSES = ['draft', 'active', 'paused'];
export const CONDITIONS = ['new', 'like_new', 'good', 'fair'];

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    storage: { type: String, enum: ['cloudinary', 'local', 'seed'], default: 'local' },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    condition: { type: String, enum: CONDITIONS, default: 'good' },
    specifications: {
      type: [{ key: { type: String, maxlength: 60 }, value: { type: String, maxlength: 200 }, _id: false }],
      default: [],
    },
    usageInfo: { type: String, trim: true, maxlength: 2000, default: '' },
    accessories: { type: [{ type: String, maxlength: 120 }], default: [] },
    images: { type: [imageSchema], default: [] },
    coverIndex: { type: Number, default: 0, min: 0 },

    // Prices are in Uzbek so'm (UZS). null = not offered. A daily price is required to publish.
    prices: {
      hourly: { type: Number, min: 0, default: null },
      daily: { type: Number, min: 0, default: null },
      weekly: { type: Number, min: 0, default: null },
      deposit: { type: Number, min: 0, default: 0 },
    },

    location: {
      region: { type: String, trim: true, maxlength: 80, default: '' },
      city: { type: String, trim: true, maxlength: 80, default: '' },
      pickupInstructions: { type: String, trim: true, maxlength: 1000, default: '' },
      lat: { type: Number, min: -90, max: 90, default: null },
      lng: { type: Number, min: -180, max: 180, default: null },
    },

    availability: {
      isAvailable: { type: Boolean, default: true },
      availableFrom: { type: Date, default: null },
      availableTo: { type: Date, default: null },
      note: { type: String, trim: true, maxlength: 300, default: '' },
    },

    delivery: {
      pickup: { type: Boolean, default: true },
      delivery: { type: Boolean, default: false },
      deliveryFee: { type: Number, min: 0, default: 0 },
      note: { type: String, trim: true, maxlength: 300, default: '' },
    },

    rentalTerms: { type: String, trim: true, maxlength: 3000, default: '' },
    damagePolicy: { type: String, trim: true, maxlength: 3000, default: '' },

    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
    imageCredits: {
      type: [{ creator: String, license: String, sourceUrl: String, _id: false }],
      default: [],
    },
    views: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },

    // Short-lived mutex used to serialise booking acceptance for this product.
    bookingLockUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, 'prices.daily': 1 });
productSchema.index({ status: 1, 'location.city': 1 });

productSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.bookingLockUntil;
    return ret;
  },
});

export const Product = mongoose.model('Product', productSchema);
