import axios from 'axios';
import i18n from '../i18n/index.js';

// Same-origin requests (Vite proxies /api to the backend), so the httpOnly cookie just works.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
});

/** Unwraps `{ success, data }` responses. */
export const unwrap = (promise) => promise.then((res) => res.data.data);

export function errorCode(err) {
  return err?.response?.data?.error?.code;
}

export function fieldErrors(err) {
  const details = err?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}

/** Human, translated message for an API error. */
export function errorMessage(err) {
  if (!err?.response) return i18n.t('common.networkError');
  const code = errorCode(err);
  if (code === 'UNAUTHORIZED' && !err.config?.url?.includes('/auth/login')) return i18n.t('auth.loginRequired');
  if (code && i18n.exists(`errors.${code}`)) return i18n.t(`errors.${code}`);
  return err.response.data?.error?.message || i18n.t('common.errorGeneric');
}
