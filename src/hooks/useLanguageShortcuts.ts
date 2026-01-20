/**
 * useLanguageShortcuts Hook
 * ==========================
 * Keyboard shortcuts for quick language switching
 * 
 * Shortcuts:
 * - Alt + 1: English
 * - Alt + 2: Arabic (العربية)
 * - Alt + 3: Russian (Русский)
 * - Alt + 4: Ukrainian (Українська)
 * - Alt + 5: Romanian (Română)
 * - Alt + 6: Polish (Polski)
 * - Alt + 7: Turkish (Türkçe)
 * - Alt + 8: German (Deutsch)
 * - Alt + 9: Italian (Italiano)
 * - Alt + L: Open language menu
 */

import { useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getLanguageByShortcut, SUPPORTED_LANGUAGES } from '@/i18n/config';

interface UseLanguageShortcutsOptions {
  /** ID of the language menu trigger element for Alt+L */
  menuTriggerId?: string;
  /** Callback when language is changed via shortcut */
  onLanguageChange?: (lang: string) => void;
  /** Enable/disable the shortcuts */
  enabled?: boolean;
}

export function useLanguageShortcuts(options: UseLanguageShortcutsOptions = {}) {
  const { 
    menuTriggerId = 'language-menu-trigger',
    onLanguageChange,
    enabled = true 
  } = options;
  
  const { setLanguage, language: currentLanguage } = useLanguage();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Alt + 1-9 for quick language switching
    if (e.altKey && e.key >= '1' && e.key <= '9') {
      const langCode = getLanguageByShortcut(e.key);
      if (langCode && langCode !== currentLanguage) {
        e.preventDefault();
        setLanguage(langCode);
        onLanguageChange?.(langCode);
      }
    }
    
    // Alt + L to open language menu
    if (e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      const menuTrigger = document.getElementById(menuTriggerId);
      if (menuTrigger) {
        menuTrigger.click();
      }
    }
  }, [enabled, currentLanguage, setLanguage, onLanguageChange, menuTriggerId]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  // Return helper info for displaying shortcuts in UI
  return {
    shortcuts: SUPPORTED_LANGUAGES.map(lang => ({
      code: lang.code,
      shortcut: lang.shortcut,
      name: lang.nativeName,
      flag: lang.flag,
    })),
    currentLanguage,
  };
}

export default useLanguageShortcuts;
