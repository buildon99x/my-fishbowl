const STORAGE_KEY = 'my-fishbowl:lang';
const DEFAULT_LANG = 'ko';
const SUPPORTED_LANGS = ['ko', 'en'];

let currentLang = DEFAULT_LANG;
let translations = {};

export function getCurrentLang() { return currentLang; }

export function getSupportedLangs() { return [...SUPPORTED_LANGS]; }

export async function loadLocale(lang) {
  // Dynamic import for locale JSON
  try {
    const mod = await import(`../locales/${lang}.json`, { assert: { type: 'json' } });
    return mod.default;
  } catch {
    // fallback: fetch
    const res = await fetch(`/locales/${lang}.json`);
    return res.json();
  }
}

export async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  translations = await loadLocale(lang);
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.setAttribute('lang', lang);
}

export function t(key, vars = {}) {
  const str = translations[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export async function initI18n() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const browserLang = navigator.language?.startsWith('ko') ? 'ko' : 'en';
  const lang = SUPPORTED_LANGS.includes(saved) ? saved : browserLang;
  await setLang(lang);
  return lang;
}
