import { badRequest } from '../utils/AppError.js';
import { ok } from '../utils/respond.js';
import { storeImages, storageMode } from '../services/storage.service.js';

export async function uploadImages(req, res) {
  if (!req.files?.length) throw badRequest('No images were uploaded');
  const images = await storeImages(req.files);
  ok(res, { images, storage: storageMode() }, 201);
}
