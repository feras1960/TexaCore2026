// Supported Languages Configuration
// ================================
// 9 Languages: English, Arabic, Russian, Ukrainian, Romanian, Polish, Turkish, German, Italian
// All languages use isolated translations - no foreign words appear in any language file
// Numbers are always displayed in English format (1, 2, 3) across all languages

export type SupportedLanguage = 'en' | 'ar' | 'ru' | 'uk' | 'ro' | 'pl' | 'tr' | 'de' | 'it';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;           // English name
  nativeName: string;     // Native name for display
  direction: 'ltr' | 'rtl';
  locale: string;         // For Intl formatting (always use English numerals)
  shortCode: string;      // Short display code (EN, ع, RU, etc.)
  flag: string;           // Flag emoji
  shortcut: string;       // Keyboard shortcut (Alt+1, Alt+2, etc.)
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'EN',
    flag: '🇬🇧',
    shortcut: 'Alt+1'
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    locale: 'en-US',
    shortCode: 'ع',
    flag: '🇸🇦',
    shortcut: 'Alt+2'
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'RU',
    flag: '🇷🇺',
    shortcut: 'Alt+3'
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'UK',
    flag: '🇺🇦',
    shortcut: 'Alt+4'
  },
  {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'RO',
    flag: '🇷🇴',
    shortcut: 'Alt+5'
  },
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'PL',
    flag: '🇵🇱',
    shortcut: 'Alt+6'
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'TR',
    flag: '🇹🇷',
    shortcut: 'Alt+7'
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'DE',
    flag: '🇩🇪',
    shortcut: 'Alt+8'
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    locale: 'en-US',
    shortCode: 'IT',
    flag: '🇮🇹',
    shortcut: 'Alt+9'
  },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

export function isRTL(language: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(language);
}

export function getLanguageConfig(code: SupportedLanguage): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

export function getDirection(language: SupportedLanguage): 'ltr' | 'rtl' {
  return isRTL(language) ? 'rtl' : 'ltr';
}

// Get language by shortcut key (1-9)
export function getLanguageByShortcut(key: string): SupportedLanguage | undefined {
  const index = parseInt(key) - 1;
  if (index >= 0 && index < SUPPORTED_LANGUAGES.length) {
    return SUPPORTED_LANGUAGES[index].code;
  }
  return undefined;
}

// Import all locale files
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import ruTranslations from './locales/ru.json';
import ukTranslations from './locales/uk.json';
import roTranslations from './locales/ro.json';
import plTranslations from './locales/pl.json';
import trTranslations from './locales/tr.json';
import deTranslations from './locales/de.json';
import itTranslations from './locales/it.json';

// Force HMR reload
export const translations: Record<SupportedLanguage, Record<string, unknown>> = {
  en: enTranslations,
  ar: arTranslations,
  ru: ruTranslations,
  uk: ukTranslations,
  ro: roTranslations,
  pl: plTranslations,
  tr: trTranslations,
  de: deTranslations,
  it: itTranslations,
};
