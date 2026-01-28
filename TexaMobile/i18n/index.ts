/**
 * i18n Configuration
 * Support for 10 languages: ar, en, de, tr, ru, uk, it, pl, ro, fr
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import ar from './locales/ar.json';
import en from './locales/en.json';
import de from './locales/de.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import fr from './locales/fr.json';

// Storage keys
const LANGUAGE_STORAGE_KEY = '@texa_language';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'ru', name: 'Русский', nativeName: 'Русский', dir: 'ltr' },
  { code: 'uk', name: 'Українська', nativeName: 'Українська', dir: 'ltr' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'pl', name: 'Polski', nativeName: 'Polski', dir: 'ltr' },
  { code: 'ro', name: 'Română', nativeName: 'Română', dir: 'ltr' },
  { code: 'fr', name: 'Français', nativeName: 'Français', dir: 'ltr' },
];

// Resources
const resources = {
  ar: { translation: ar },
  en: { translation: en },
  de: { translation: de },
  tr: { translation: tr },
  ru: { translation: ru },
  uk: { translation: uk },
  it: { translation: it },
  pl: { translation: pl },
  ro: { translation: ro },
  fr: { translation: fr },
};

// Save language to storage
const saveLanguage = async (languageCode: string) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    } else {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    }
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Get saved language from storage
const getSavedLanguage = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } else {
      return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error getting saved language:', error);
    return null;
  }
};

// Get initial language (saved > device > fallback to ar)
const getInitialLanguage = async (): Promise<string> => {
  // First, try to get saved language
  const savedLanguage = await getSavedLanguage();
  if (savedLanguage) {
    const supportedCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
    if (supportedCodes.includes(savedLanguage)) {
      console.log('✅ Using saved language:', savedLanguage);
      return savedLanguage;
    }
  }

  // If no saved language, try device language
  const locales = Localization.getLocales();
  const deviceLanguage = locales && locales[0] ? locales[0].languageCode : 'ar';
  const supportedCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
  const language = supportedCodes.includes(deviceLanguage) ? deviceLanguage : 'ar';
  
  console.log('✅ Using device/fallback language:', language);
  return language;
};

// Initialize RTL
const initializeRTL = (languageCode: string) => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
  const isRTL = language?.dir === 'rtl';
  
  console.log(`🔄 Initializing RTL: ${languageCode} (${isRTL ? 'RTL' : 'LTR'})`);
  
  // Force RTL for Arabic on Web
  if (Platform.OS === 'web') {
    if (isRTL) {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', languageCode);
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', languageCode);
    }
  }
  
  // Force RTL on Native
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL);
};

// Initialize i18n with saved language
(async () => {
  const initialLanguage = await getInitialLanguage();
  
  // Initialize RTL before i18n
  initializeRTL(initialLanguage);
  
  // Initialize i18n
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'ar',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  
  console.log('✅ i18n initialized with language:', initialLanguage);
})();

// Handle RTL when language changes
export const setI18nLanguage = async (languageCode: string) => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
  
  if (language) {
    console.log('🔄 Changing language to:', languageCode);
    
    // Save language to storage
    await saveLanguage(languageCode);
    
    // Change i18n language
    await i18n.changeLanguage(languageCode);
    
    // Update RTL
    const isRTL = language.dir === 'rtl';
    
    // Update for Web
    if (Platform.OS === 'web') {
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', languageCode);
      
      // Force reload to apply RTL changes
      if (typeof window !== 'undefined') {
        console.log('🔄 Reloading page to apply RTL...');
        window.location.reload();
      }
    } else {
      // Update for Native
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
      
      // Note: Native requires app restart for RTL changes
      console.log('⚠️ Native app requires restart for RTL changes');
    }
  }
};

// Get current RTL status
export const isRTL = () => {
  const currentLang = i18n.language;
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang);
  return language?.dir === 'rtl';
};

export default i18n;
