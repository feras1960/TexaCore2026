/**
 * ════════════════════════════════════════════════════════════════
 * 🔍 CustomerCombobox — بحث ذكي عن الزبائن مع إنشاء سريع
 * ════════════════════════════════════════════════════════════════
 * 
 * 3 مسارات:
 *   1. كتابة اسم → تطابق → اختياره (auto-fill)
 *   2. كتابة اسم → لا تطابق → يبقى كزبون طيار (Walk-in)
 *   3. كتابة اسم → ضغط "➕ إضافة" → فتح شيت إنشاء زبون جديد
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { customerPhoneService, type CustomerPhone } from '../services/customerPhoneService';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search, User, UserCheck, UserPlus, Phone, MapPin,
  DollarSign, X, ChevronDown,
} from 'lucide-react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';

// ─── Types ────────────────────────────────────────────────────
export interface CustomerOption {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  name_tr?: string;
  phone?: string;
  mobile?: string;
  country?: string;
  city?: string;
  currency?: string;
  status: string;
  customer_type?: string;
}

export interface CustomerComboboxValue {
  customer_id: string | null;  // null = walk-in
  name: string;
  phone?: string;
  country?: string;
  phones?: CustomerPhone[];   // all saved phone numbers
}

interface CustomerComboboxProps {
  value: CustomerComboboxValue;
  onChange: (val: CustomerComboboxValue) => void;
  label: string;
  placeholder?: string;
  variant?: 'sender' | 'receiver';
  disabled?: boolean;
}

// ─── Helper ───────────────────────────────────────────────────
function getLocalizedName(c: CustomerOption, lang: string): string {
  const map: Record<string, string | undefined> = {
    ar: c.name_ar, en: c.name_en, tr: c.name_tr,
  };
  return map[lang] || c.name_en || c.name_ar || '';
}

// ═══════════════════════════════════════════════════════════════
export default function CustomerCombobox({
  value, onChange, label, placeholder, variant = 'sender', disabled = false,
}: CustomerComboboxProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [inputText, setInputText] = useState(value.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  // ─── Prevent ESC from closing parent sheet when sub-sheet is open ──
  useEffect(() => {
    if (!showAddSheet) {
      document.body.removeAttribute('data-sub-sheet-open');
      return;
    }
    // Signal to parent sheet: "don't close me"
    document.body.setAttribute('data-sub-sheet-open', 'true');

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setShowAddSheet(false);
      }
    };
    // Capture phase = intercept BEFORE Radix handles it
    document.addEventListener('keydown', handleEsc, true);
    return () => {
      document.removeEventListener('keydown', handleEsc, true);
      document.body.removeAttribute('data-sub-sheet-open');
    };
  }, [showAddSheet]);

  // Sync input text with external value
  useEffect(() => {
    setInputText(value.name || '');
  }, [value.name]);

  // ─── Fetch All Customers ────────────────────────────────────
  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ['exchange_customers_combobox', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, code, name_ar, name_en, name_tr, phone, mobile, country, city, currency, status, customer_type')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name_ar', { ascending: true });
      if (error) throw error;
      return (data || []) as CustomerOption[];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Filtered Results ───────────────────────────────────────
  const filtered = useMemo(() => {
    if (!inputText.trim()) return customers.slice(0, 20); // Show all when empty
    const q = inputText.toLowerCase().trim();
    return customers
      .filter(c =>
        (c.name_ar || '').toLowerCase().includes(q) ||
        (c.name_en || '').toLowerCase().includes(q) ||
        (c.name_tr || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.code || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, inputText]);

  // ─── Has exact match? ──────────────────────────────────────
  const hasExactMatch = useMemo(() => {
    if (!inputText.trim()) return false;
    const q = inputText.toLowerCase().trim();
    return customers.some(c =>
      getLocalizedName(c, language).toLowerCase() === q
    );
  }, [customers, inputText, language]);

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

  // ─── Select Customer ───────────────────────────────────────
  const handleSelect = useCallback(async (c: CustomerOption) => {
    const name = getLocalizedName(c, language);
    setInputText(name);
    setIsOpen(false);
    // Fetch saved phones for this customer
    let phones: CustomerPhone[] = [];
    try {
      phones = await customerPhoneService.getPhones(c.id);
    } catch (e) {
      console.warn('[CustomerCombobox] Failed to load phones:', e);
    }
    const lastPhone = phones.length > 0 ? phones[0] : null;
    onChange({
      customer_id: c.id,
      name,
      phone: lastPhone?.phone_number || c.phone || c.mobile || '',
      country: lastPhone?.country || c.country || '',
      phones,
    });
  }, [onChange, language]);

  // ─── Walk-in (just typed name, not selected) ────────────────
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    setIsOpen(true);
    // Clear customer_id when typing freely (walk-in mode)
    onChange({
      customer_id: null,
      name: text,
      phone: value.phone || '',
      country: value.country || '',
    });
  }, [onChange, value.phone, value.country]);

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
          // Auto-select if only 1 result
          handleSelect(filtered[0]);
        }
        break;
      case 'Tab':
        // Select highlighted and move to next field
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
        setHighlightedIndex(-1);
        break;
    }
  }, [isOpen, highlightedIndex, filtered, handleSelect]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [inputText]);

  // ─── Clear Selection ───────────────────────────────────────
  const handleClear = useCallback(() => {
    setInputText('');
    onChange({ customer_id: null, name: '', phone: '', country: '' });
    inputRef.current?.focus();
  }, [onChange]);

  // ─── New Customer Created ──────────────────────────────────
  const handleNewCustomerSaved = useCallback(async () => {
    // Refresh customer list
    await queryClient.invalidateQueries({ queryKey: ['exchange_customers_combobox'] });
    await queryClient.invalidateQueries({ queryKey: ['exchange_customers'] });
    await queryClient.invalidateQueries({ queryKey: ['parties_customers'] });
    setShowAddSheet(false);
    setCreateKey(k => k + 1);
    // Keep dropdown open so user can select the new customer
    setIsOpen(true);
    inputRef.current?.focus();
  }, [queryClient]);

  // ─── Colors by variant ─────────────────────────────────────
  const colors = variant === 'sender'
    ? { border: 'border-blue-200/50 dark:border-blue-800/50', bg: 'bg-blue-50/30 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', ring: 'ring-blue-300' }
    : { border: 'border-teal-200/50 dark:border-teal-800/50', bg: 'bg-teal-50/30 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400', ring: 'ring-teal-300' };

  // ═══════════════════════════════════════════════════════════
  return (
    <>
      <div className="relative">
        {/* ─── Input Field ──────────────────────────────── */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            className={cn(
              "h-9 text-xs ps-8 pe-16 transition-all",
              isOpen && `ring-2 ${colors.ring}`,
              value.customer_id && "bg-green-50/50 dark:bg-green-950/20 border-green-300 dark:border-green-700"
            )}
            placeholder={placeholder || (isAr ? 'ابحث عن زبون أو اكتب اسم جديد...' : 'Search customer or type new name...')}
            value={inputText}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {/* Status badges */}
          <div className="absolute top-1/2 -translate-y-1/2 end-2 flex items-center gap-1">
            {value.customer_id ? (
              <Badge className="text-[8px] bg-green-100 text-green-700 border-green-200 py-0 px-1.5 h-4">
                <UserCheck className="w-2.5 h-2.5 me-0.5" /> {isAr ? 'مسجّل' : 'Linked'}
              </Badge>
            ) : inputText.trim() ? (
              <Badge variant="outline" className="text-[8px] text-gray-400 py-0 px-1.5 h-4">
                {isAr ? 'طيّار' : 'Walk-in'}
              </Badge>
            ) : null}
            {inputText && (
              <button onClick={handleClear} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* ─── Dropdown ─────────────────────────────────── */}
        {isOpen && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          >
            {/* Results */}
            <div className="max-h-72 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map(c => {
                  const name = getLocalizedName(c, language);
                  const isSelected = value.customer_id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      onMouseEnter={() => setHighlightedIndex(filtered.indexOf(c))}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-start transition-colors",
                        isSelected && "bg-green-50 dark:bg-green-950/30",
                        filtered.indexOf(c) === highlightedIndex && !isSelected && "bg-blue-50 dark:bg-blue-900/30",
                        !isSelected && filtered.indexOf(c) !== highlightedIndex && "hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0",
                        variant === 'sender' ? "bg-blue-500" : "bg-teal-500"
                      )}>
                        {name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{name}</span>
                          {c.currency && (
                            <span className="text-[9px] font-mono px-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{c.currency}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          {c.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> {c.phone}</span>}
                          {c.country && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {c.country}</span>}
                          {!c.phone && !c.country && <span className="font-mono">{c.code}</span>}
                        </div>
                      </div>
                      {isSelected && <UserCheck className="w-4 h-4 text-green-600 shrink-0" />}
                    </button>
                  );
                })
              ) : inputText.trim() ? (
                <div className="px-3 py-3 text-center text-xs text-gray-400">
                  {isAr ? `لا توجد نتائج لـ "${inputText}"` : `No results for "${inputText}"`}
                </div>
              ) : null}
            </div>

            {/* ─── Add New Customer Button ──────────────── */}
            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowAddSheet(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-start hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-blue-600">
                  {isAr ? '➕ إضافة زبون جديد' : '➕ Add New Customer'}
                  {inputText.trim() && (
                    <span className="text-gray-400 font-normal ms-1">"{inputText}"</span>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add New Customer Sheet ──────────────────────────────── */}
      <UnifiedAccountingSheet
        key={`combobox-create-${createKey}`}
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        docType="party"
        mode="create"
        data={{
          _partyType: 'customer' as const,
          customer_type: 'exchange',
          _exchangeContext: true,
          is_active: true,
          // Pre-fill name if user typed something
          ...(inputText.trim() ? { name_ar: inputText, name_en: inputText } : {}),
        }}
        companyId={companyId || undefined}
        onSave={handleNewCustomerSaved}
        onRefresh={() => {}}
        enableEditFlow
      />
    </>
  );
}
