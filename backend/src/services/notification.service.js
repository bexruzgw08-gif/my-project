import { Notification } from '../models/index.js';

export async function notify(userId, type, data = {}, link = '') {
  try {
    return await Notification.create({ user: userId, type, data, link });
  } catch (err) {
    // A failed notification must never break the main operation.
    console.error('Failed to create notification', err.message);
    return null;
  }
}
