import mongoose from 'mongoose';

export const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled', 'active', 'completed'];
/** Statuses that occupy the product's calendar and therefore must never overlap. */
export const BLOCKING_STATUSES = ['accepted', 'active'];

const lineSchema = new mongoose.Schema(
  { unit: String, quantity: Number, unitPrice: Number, amount: Number },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    deliveryMethod: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    deliveryAddress: { type: String, trim: true, maxlength: 300, default: '' },
    message: { type: String, trim: true, maxlength: 1000, default: '' },

    // Always computed on the server from the product's prices — never taken from the client.
    pricing: {
      currency: { type: String, default: 'UZS' },
      lines: { type: [lineSchema], default: [] },
      rentalCost: { type: Number, required: true },
      deliveryFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      total: { type: Number, required: true },
      deposit: { type: Number, default: 0 },
      dueAtPickup: { type: Number, required: true },
    },

    terms: {
      acceptedAt: { type: Date, required: true },
      rentalTerms: { type: String, default: '' },
      damagePolicy: { type: String, default: '' },
    },

    productSnapshot: {
      title: String,
      image: String,
      city: String,
    },

    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: BOOKING_STATUSES },
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          note: { type: String, maxlength: 300 },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

bookingSchema.index({ product: 1, status: 1, startAt: 1, endAt: 1 });
bookingSchema.index({ renter: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });

bookingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Booking = mongoose.model('Booking', bookingSchema);
