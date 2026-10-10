import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err?.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'Resource already exists';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller' : err.message;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_JSON';
    message = 'Malformed JSON body';
  } else if (err?.status && err.status < 500) {
    status = err.status;
    message = err.message;
  }

  if (status >= 500 && !env.isTest) console.error(err);

  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}
