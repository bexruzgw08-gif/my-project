import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.js';
import ru from './locales/ru.js';
import en from './locales/en.js';

export const LANGUAGES = [
  { code: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
];

const STORAGE_KEY = 'kb_lang';

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return 'uz';
}

i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz }, ru: { translation: ru }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});
document.documentElement.lang = i18n.language;

export default i18n;
