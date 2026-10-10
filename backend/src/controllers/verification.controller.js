import { Verification } from '../models/index.js';
import { env } from '../config/env.js';
import { AppError, forbidden } from '../utils/AppError.js';
import { ok } from '../utils/respond.js';
import { notify } from '../services/notification.service.js';

/**
 * DEMO identity verification. No real document is checked and no document image is stored.
 * A production version would hand off to a licensed KYC provider (see README).
 */
function dto(v, user) {
  return {
    status: user.verificationStatus,
    method: 'demo',
    isDemo: true,
    demoReviewEnabled: env.DEMO_VERIFICATION,
    documentType: v?.documentType || null,
    documentLast4: v?.documentLast4 || null,
    submittedAt: v?.submittedAt || null,
    reviewedAt: v?.reviewedAt || null,
    rejectionReason: v?.rejectionReason || null,
  };
}

export async function getMine(req, res) {
  const v = await Verification.findOne({ user: req.user._id });
  ok(res, { verification: dto(v, req.user) });
}

export async function submit(req, res) {
  if (req.user.verificationStatus === 'verified') throw new AppError(409, 'You are already verified', 'ALREADY_VERIFIED');
  if (req.user.verificationStatus === 'pending') throw new AppError(409, 'Your verification is already under review', 'ALREADY_PENDING');

  const { documentType, documentLast4, fullNameOnDocument, birthYear } = req.body;
  const v = await Verification.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        status: 'pending',
        method: 'demo',
        documentType,
        documentLast4: documentLast4.toUpperCase(),
        fullNameOnDocument,
        birthYear,
        submittedAt: new Date(),
        reviewedAt: null,
        rejectionReason: null,
      },
    },
    { upsert: true, new: true },
  );
  req.user.verificationStatus = 'pending';
  await req.user.save();
  ok(res, { verification: dto(v, req.user) });
}

/** Simulated reviewer for hackathon demos. Disabled when DEMO_VERIFICATION=false. */
export async function demoReview(req, res) {
  if (!env.DEMO_VERIFICATION) throw forbidden('Demo verification is disabled');
  const v = await Verification.findOne({ user: req.user._id });
  if (!v || req.user.verificationStatus !== 'pending') {
    throw new AppError(409, 'There is no pending verification to review', 'NOT_PENDING');
  }
  const approved = req.body.decision === 'approve';
  v.status = approved ? 'verified' : 'rejected';
  v.reviewedAt = new Date();
  v.rejectionReason = approved ? null : 'Demo rejection: the details could not be confirmed.';
  await v.save();
  req.user.verificationStatus = v.status;
  await req.user.save();
  await notify(req.user._id, approved ? 'verification_verified' : 'verification_rejected', {}, '/verification');
  ok(res, { verification: dto(v, req.user) });
}
