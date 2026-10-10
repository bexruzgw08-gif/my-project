import i18n from '../i18n/index.js';

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' };
const locale = () => LOCALES[i18n.language] || 'uz-UZ';

/** 50000 → "50 000 so‘m" */
export function money(value, { withCurrency = true } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Math.round(Number(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return withCurrency ? `${n} ${i18n.t('common.currency')}` : n;
}

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(locale(), opts).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

export function formatDateTime(value) {
  return formatDate(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatRange(start, end) {
  return `${formatDateTime(start)} — ${formatDateTime(end)}`;
}

/** Date → value for <input type="datetime-local"> in local time. */
export function toLocalInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(date) {
  if (!date) return '';
  return toLocalInput(date).slice(0, 10);
}

/** Default rental window: tomorrow 10:00 → day after 10:00. */
export function defaultWindow() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

export function catName(category) {
  if (!category?.name) return '';
  return category.name[i18n.language] || category.name.uz;
}

export function initials(name = '') {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
