/**
 * ════════════════════════════════════════════════════════════════
 * 🌍 CountryCombobox — بحث ذكي عن الدول مع مطابقة فورية
 * ════════════════════════════════════════════════════════════════
 * 
 * نفس أسلوب CustomerCombobox:
 *   - اكتب للبحث → تظهر الدول المطابقة
 *   - اختر من القائمة → يُملأ الحقل
 *   - يدعم البحث بالعربي والإنجليزي ورمز ISO
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, Search, Check } from 'lucide-react';
import { COUNTRIES, type Country } from '../data/countries';

interface CountryComboboxProps {
  value: string;
  onChange: (countryName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function CountryCombobox({
  value, onChange, placeholder, disabled = false, className,
}: CountryComboboxProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [inputText, setInputText] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Sync input text with external value
  useEffect(() => {
    setInputText(value || '');
  }, [value]);

  // ─── Filtered Results ───────────────────────────────────────
  const filtered = useMemo(() => {
    if (!inputText.trim()) return COUNTRIES.slice(0, 15);
    const q = inputText.toLowerCase().trim();
    return COUNTRIES
      .filter(c =>
        c.name_ar.includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone_code.includes(q)
      )
      .slice(0, 10);
  }, [inputText]);

  // ─── Click Outside to Close ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Select Country ───────────────────────────────────────
  const handleSelect = useCallback((c: Country) => {
    const name = isAr ? c.name_ar : c.name_en;
    setInputText(name);
    setIsOpen(false);
    onChange(name);
  }, [onChange, isAr]);

  // ─── Input Change ──────────────────────────────────────────
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    setIsOpen(true);
    // Don't fire onChange until user selects from list
  }, []);

  // ─── On Blur: if typed text matches a country, select it ──
  const handleBlur = useCallback(() => {
    // Small delay to allow click selection
    setTimeout(() => {
      if (!isOpen) return;
      const q = inputText.toLowerCase().trim();
      const match = COUNTRIES.find(c =>
        c.name_ar === q || c.name_en.toLowerCase() === q || c.code.toLowerCase() === q
      );
      if (match) {
        const name = isAr ? match.name_ar : match.name_en;
        setInputText(name);
        onChange(name);
      }
      setIsOpen(false);
    }, 200);
  }, [inputText, isAr, onChange, isOpen]);

  // ─── Keyboard Navigation ────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex]);
        } else if (filtered.length === 1) {
          handleSelect(filtered[0]);
        }
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex]);
        } else if (filtered.length === 1) {
          handleSelect(filtered[0]);
        }
        setIsOpen(false);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightedIndex, filtered, handleSelect]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [inputText]);

  // Check if current value matches a country
  const isMatched = useMemo(() => {
    const q = (value || '').toLowerCase().trim();
    return COUNTRIES.some(c =>
      c.name_ar === q || c.name_en.toLowerCase() === q || c.name_ar === value || c.name_en === value
    );
  }, [value]);

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute top-1/2 -translate-y-1/2 start-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          className={cn(
            "h-9 text-sm ps-7 pe-7 transition-all",
            isOpen && "ring-2 ring-teal-300",
            isMatched && "bg-green-50/50 dark:bg-green-950/20 border-green-300 dark:border-green-700",
            className
          )}
          placeholder={placeholder || (isAr ? 'ابحث عن دولة...' : 'Search country...')}
          value={inputText}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {isMatched && (
          <Check className="absolute top-1/2 -translate-y-1/2 end-2 w-3.5 h-3.5 text-green-500" />
        )}
      </div>

      {/* ─── Dropdown ─────────────────────────────────── */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="max-h-52 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((c, idx) => {
                const displayName = isAr ? c.name_ar : c.name_en;
                const isSelected = value === c.name_ar || value === c.name_en;
                return (
                  <button
                    key={c.code}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-start transition-colors",
                      isSelected && "bg-green-50 dark:bg-green-950/30",
                      idx === highlightedIndex && !isSelected && "bg-blue-50 dark:bg-blue-900/30",
                      !isSelected && idx !== highlightedIndex && "hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <span className="text-sm font-mono text-gray-400 w-7 text-center shrink-0">{c.code}</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white flex-1">{displayName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{c.phone_code}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-xs text-gray-400">
                {isAr ? `لا توجد نتائج لـ "${inputText}"` : `No results for "${inputText}"`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
