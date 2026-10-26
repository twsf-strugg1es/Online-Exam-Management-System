import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setI18n } from '../utils';

/*
 * Translations without a library. English text is the key: t('Sign in') shows "Sign in" until a
 * locale file has an entry for it, so nothing is ever blank. Locale files map English to the
 * translation; plural entries hold one form per Intl.PluralRules category.
 *
 *   t('Hello, {{name}}', { name })
 *   tn(count, '{{count}} question', '{{count}} questions')
 *
 * "en-XA" is a pseudo-language for finding strings that skipped t(): everything translated
 * renders as [Ŝîĝñ îñ], so plain English on screen is a miss.
 */

const CATALOGS = {
  en: { label: 'English', dir: 'ltr', messages: {} },
  bn: { label: 'বাংলা', dir: 'ltr', messages: {} }, // filled by task 4.13
  'en-XA': { label: 'Pseudo (test)', dir: 'ltr', messages: null, hidden: true },
};

const STORAGE_KEY = 'language';
const ACCENTS = { a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'î', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ', n: 'ñ', o: 'ö', p: 'þ', r: 'ŕ', s: 'š', t: 'ţ', u: 'û', w: 'ŵ', y: 'ý', z: 'ž', A: 'Å', C: 'Ç', E: 'É', I: 'Î', O: 'Ö', S: 'Ŝ', U: 'Û' };

const pseudo = (text) => `[${text.replace(/\{\{\w+\}\}|[A-Za-z]/g, (m) => (m.length > 1 ? m : ACCENTS[m] || m))}]`;
const interpolate = (text, vars) => (vars ? text.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] ?? m)) : text);

export function initialLanguage() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl && CATALOGS[fromUrl]) {
      localStorage.setItem(STORAGE_KEY, fromUrl); // ?lang=bn sticks for the rest of the visit
      return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CATALOGS[saved]) return saved;
  } catch {
    // storage blocked: fall through to the browser language
  }
  const browser = (navigator.language || 'en').split('-')[0];
  return CATALOGS[browser] && !CATALOGS[browser].hidden ? browser : 'en';
}

export function makeTranslator(language) {
  const catalog = CATALOGS[language] || CATALOGS.en;
  const plural = new Intl.PluralRules(language === 'en-XA' ? 'en' : language);
  const lookup = (key) => (catalog.messages ? catalog.messages[key] : undefined);

  const t = (key, vars) => {
    const entry = lookup(key);
    const text = typeof entry === 'string' ? entry : key;
    return interpolate(catalog.messages === null ? pseudo(text) : text, vars);
  };
  // Plurals: the English one/other forms are in the code; a translation lists its own categories
  const tn = (count, one, other, vars) => {
    const entry = lookup(other);
    const category = plural.select(count);
    let text = count === 1 || category === 'one' ? one : other;
    if (entry && typeof entry === 'object') text = entry[category] ?? entry.other ?? text;
    return interpolate(catalog.messages === null ? pseudo(text) : text, { count, ...vars });
  };
  return { t, tn };
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage);

  useEffect(() => {
    const catalog = CATALOGS[language] || CATALOGS.en;
    document.documentElement.lang = language === 'en-XA' ? 'en' : language;
    document.documentElement.dir = catalog.dir;
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (!CATALOGS[next]) return;
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // the choice just won't survive a reload
    }
  }, []);

  const value = useMemo(() => {
    const { t, tn } = makeTranslator(language);
    const locale = language === 'en-XA' ? 'en' : language;
    setI18n({ t, locale }); // plain helpers (errorMessage, date formatting) follow the language too
    return { language, locale, setLanguage, t, tn };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Outside a provider (some tests, early errors) fall back to English
const FALLBACK = { language: 'en', locale: 'en', setLanguage: () => {}, ...makeTranslator('en') };

export function useI18n() {
  return useContext(I18nContext) || FALLBACK;
}

export const LANGUAGES = Object.entries(CATALOGS)
  .filter(([, c]) => !c.hidden)
  .map(([code, c]) => ({ code, label: c.label }));
