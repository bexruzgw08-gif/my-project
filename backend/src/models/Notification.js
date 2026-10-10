import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'welcome',
  'booking_requested',
  'booking_accepted',
  'booking_rejected',
  'booking_cancelled',
  'booking_active',
  'booking_completed',
  'verification_verified',
  'verification_rejected',
  'listing_published',
];

/** Notifications store a type + data; the frontend renders the localised text. */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    data: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productTitle: String,
      actorName: String,
    },
    link: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model('Notification', notificationSchema);
