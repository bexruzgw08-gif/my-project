import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env, BACKEND_ROOT } from '../config/env.js';
import { badRequest } from '../utils/AppError.js';

export const UPLOAD_DIR = path.join(BACKEND_ROOT, 'uploads');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const storageMode = () => (env.cloudinaryEnabled ? 'cloudinary' : 'local');

/** Detects the real image type from magic bytes (the client-supplied mimetype is not trusted). */
export function sniffImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'kerakbolsa/products', resource_type: 'image', transformation: [{ width: 1600, crop: 'limit' }] },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id, storage: 'cloudinary' })),
    );
    stream.end(buffer);
  });
}

/**
 * LOCAL DEVELOPMENT FALLBACK: files are written to backend/uploads and served by Express.
 * They are not persistent cloud storage and are lost if the server disk is wiped.
 */
async function saveLocally(buffer, ext) {
  const dir = path.join(UPLOAD_DIR, 'products');
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return { url: `/uploads/products/${name}`, publicId: name, storage: 'local' };
}

export async function storeImages(files) {
  const results = [];
  for (const file of files) {
    const ext = sniffImageType(file.buffer);
    if (!ext) throw badRequest('Only JPG, PNG and WEBP images are allowed');
    results.push(env.cloudinaryEnabled ? await uploadToCloudinary(file.buffer) : await saveLocally(file.buffer, ext));
  }
  return results;
}
