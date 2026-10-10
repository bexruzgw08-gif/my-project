import mongoose from 'mongoose';

export const LANGUAGES = ['uz', 'ru', 'en'];
export const VERIFICATION_STATUSES = ['not_started', 'pending', 'verified', 'rejected'];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    language: { type: String, enum: LANGUAGES, default: 'uz' },
    languageChosen: { type: Boolean, default: false },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    avatarUrl: { type: String, default: '' },
    // Denormalised copy of the Verification status, used for fast permission checks.
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'not_started' },
    termsAcceptedAt: { type: Date, required: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

/** Fields safe to show to any visitor (e.g. the listing owner card). */
export function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl || '',
    city: user.city || '',
    verified: user.verificationStatus === 'verified',
    memberSince: user.createdAt,
  };
}

export const User = mongoose.model('User', userSchema);
