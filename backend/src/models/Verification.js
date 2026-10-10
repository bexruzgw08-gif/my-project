import mongoose from 'mongoose';
import { VERIFICATION_STATUSES } from './User.js';

/**
 * PRIVATE identity-verification record (simulated/demo in this MVP).
 * No document images are stored — only the document type and the last 4 characters
 * of the document number. This model is never exposed through public endpoints.
 */
const verificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: VERIFICATION_STATUSES, default: 'not_started' },
    method: { type: String, enum: ['demo'], default: 'demo' },
    documentType: { type: String, enum: ['passport', 'id_card', 'driver_license'] },
    documentLast4: { type: String, maxlength: 4 },
    fullNameOnDocument: { type: String, trim: true, maxlength: 80 },
    birthYear: { type: Number, min: 1900, max: 2100 },
    submittedAt: Date,
    reviewedAt: Date,
    rejectionReason: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

export const Verification = mongoose.model('Verification', verificationSchema);
