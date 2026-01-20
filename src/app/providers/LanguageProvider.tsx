import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
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
  // Initialize from localStorage or default
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('erp-language') as SupportedLanguage;
      if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
        return stored;
      }
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