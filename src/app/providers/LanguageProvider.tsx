import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import LanguageDetector from 'i18next-browser-languagedetector';
import { 
  SupportedLanguage, 
  DEFAULT_LANGUAGE, 
  getDirection, 
  translations,
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  LanguageConfig
} from '@/i18n/config';

interface LanguageContextType {
  language: SupportedLanguage;
  direction: 'ltr' | 'rtl';
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  currentLanguageConfig: LanguageConfig | undefined;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Supported language codes for validation
const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

/**
 * Detect browser language using i18next-browser-languagedetector
 * Checks: navigator, localStorage, querystring, htmlTag, path, subdomain
 */
function detectBrowserLanguage(): SupportedLanguage {
  const detector = new LanguageDetector();
  detector.init({
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'erp-language',
    caches: ['localStorage'],
  });
  
  // Get detected languages (returns array of language codes)
  const detected = detector.detect();
  const languages = Array.isArray(detected) ? detected : [detected];
  
  // Find first supported language
  for (const lang of languages) {
    if (!lang) continue;
    
    // Check exact match (e.g., 'ar', 'en')
    if (SUPPORTED_CODES.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }
    
    // Check language without region (e.g., 'en-US' -> 'en', 'ar-SA' -> 'ar')
    const baseLang = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_CODES.includes(baseLang as SupportedLanguage)) {
      return baseLang as SupportedLanguage;
    }
  }
  
  return DEFAULT_LANGUAGE;
}

// Get nested value from object by dot notation key
function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const keys = key.split('.');
  let current: unknown = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

// Replace parameters in string {param} -> value
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: SupportedLanguage;
}

export function LanguageProvider({ children, defaultLanguage }: LanguageProviderProps) {
  // Initialize from localStorage, browser detection, or default
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      // First check localStorage
      const stored = localStorage.getItem('erp-language') as SupportedLanguage;
      if (stored && SUPPORTED_CODES.includes(stored)) {
        return stored;
      }
      
      // Then detect from browser
      return detectBrowserLanguage();
    }
    return defaultLanguage || DEFAULT_LANGUAGE;
  });

  const direction = getDirection(language);
  const isRTL = direction === 'rtl';
  
  // Get current language config
  const currentLanguageConfig = useMemo(() => getLanguageConfig(language), [language]);

  // Update document direction and lang attribute
  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    
    // Set data attribute for CSS selectors
    document.documentElement.dataset.lang = language;
    document.documentElement.dataset.dir = direction;
    
    // Save to localStorage
    localStorage.setItem('erp-language', language);
  }, [language, direction]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (SUPPORTED_LANGUAGES.some(l => l.code === lang)) {
      setLanguageState(lang);
    }
  }, []);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language];
    
    // Try to get translation from current language
    let value = getNestedValue(currentTranslations as Record<string, unknown>, key);
    
    // Fallback to English if not found
    if (value === undefined && language !== 'en') {
      value = getNestedValue(translations.en as Record<string, unknown>, key);
    }
    
    // Return key if translation not found
    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    return interpolate(value, params);
  }, [language]);

  const value: LanguageContextType = {
    language,
    direction,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
    currentLanguageConfig,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { LanguageContext };
export type { LanguageContextType };