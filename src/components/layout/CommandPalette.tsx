/**
 * ════════════════════════════════════════════════════════════════
 * 🔍 CommandPalette — البحث الشامل والوصول السريع
 * ════════════════════════════════════════════════════════════════
 *
 * يُفتح بـ Cmd+K / Ctrl+K أو بالضغط على أيقونة البحث.
 * يبحث فورياً في جميع بيانات النظام من الكاش المحلي.
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ArrowRight, CornerDownLeft,
  ArrowUp, ArrowDown, Command, Hash, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCommandPalette, type SearchResult, type ResultCategory } from '@/hooks/useCommandPalette';
import { useGlobalSheet } from '@/contexts/GlobalSheetContext';

// ─── Category Labels ────────────────────────────────────────────

const CATEGORY_LABELS: Record<ResultCategory, { ar: string; en: string }> = {
  navigation: { ar: '📍 التنقل السريع', en: '📍 Navigation' },
  action:     { ar: '⚡ إجراءات سريعة', en: '⚡ Quick Actions' },
  customer:   { ar: '👤 الزبائن', en: '👤 Customers' },
  supplier:   { ar: '🏭 الموردين', en: '🏭 Suppliers' },
  material:   { ar: '📦 المواد', en: '📦 Materials' },
  account:    { ar: '📒 الحسابات', en: '📒 Accounts' },
  warehouse:  { ar: '🏪 المستودعات', en: '🏪 Warehouses' },
  invoice:    { ar: '📄 الفواتير', en: '📄 Invoices' },
  journal:    { ar: '📝 القيود', en: '📝 Journal Entries' },
  fund:       { ar: '💰 الصناديق', en: '💰 Funds' },
};

// ─── Component ──────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const { search } = useCommandPalette();
  const { openEntity } = useGlobalSheet();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Compute results
  const results = useMemo(() => search(query), [search, query]);

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<ResultCategory, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return map;
  }, [results]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const [, items] of grouped) {
      flat.push(...items);
    }
    return flat;
  }, [grouped]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Delay to let animation complete
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  // Select item — opens sheet directly for data entities, or navigates for pages
  const selectItem = useCallback((item: SearchResult) => {
    onClose();

    // If the item has an entity type (customer, supplier, material, etc.) — open sheet directly
    if (item.entityType && item.entityId) {
      openEntity(item.entityType, item.entityId);
      return;
    }

    // Otherwise, navigate or run action
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  }, [navigate, onClose, openEntity]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[activeIndex]) {
          selectItem(flatResults[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatResults, activeIndex, selectItem, onClose]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else {
          // This triggers the parent's open handler
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
      if (e.key === '/' && !open && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[12vh] mx-auto z-[201] w-[95vw] max-w-2xl"
            dir={direction}
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/20">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAr ? 'ابحث عن أي شيء... (مواد، عملاء، فواتير، إعدادات، باركود...)' : 'Search anything... (materials, customers, invoices, settings, barcode...)'}
                  className="flex-1 bg-transparent text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none font-tajawal"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
                <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 text-[11px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto overscroll-contain py-2"
              >
                {flatResults.length === 0 ? (
                  <div className="py-12 text-center">
                    <Search className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                      {isAr ? 'لا توجد نتائج' : 'No results found'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-tajawal">
                      {isAr ? 'جرّب كلمة مختلفة أو باركود أو كود المنتج' : 'Try a different keyword, barcode, or product code'}
                    </p>
                  </div>
                ) : (
                  Array.from(grouped.entries()).map(([category, items]) => (
                    <div key={category} className="mb-1">
                      {/* Category Header */}
                      <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-tajawal">
                        {isAr ? CATEGORY_LABELS[category].ar : CATEGORY_LABELS[category].en}
                      </div>

                      {/* Items */}
                      {items.map(item => {
                        flatIndex++;
                        const idx = flatIndex;
                        const isActive = idx === activeIndex;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            data-index={idx}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors duration-75 cursor-pointer",
                              isActive
                                ? "bg-erp-navy/5 dark:bg-white/5"
                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            )}
                          >
                            {/* Icon */}
                            <div className={cn(
                              "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                              isActive
                                ? "bg-erp-navy text-white dark:bg-erp-teal"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                            )}>
                              <Icon className="h-4.5 w-4.5" />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate font-tajawal">
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                  {item.subtitle}
                                </div>
                              )}
                            </div>

                            {/* Badge */}
                            {item.badge && (
                              <span className={cn(
                                "flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full",
                                item.badgeColor || "bg-gray-100 text-gray-600"
                              )}>
                                {item.badge}
                              </span>
                            )}

                            {/* Enter indicator */}
                            {isActive && (
                              <CornerDownLeft className="flex-shrink-0 h-3.5 w-3.5 text-gray-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer — keyboard hints */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <ArrowUp className="h-3 w-3" />
                    </kbd>
                    <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <ArrowDown className="h-3 w-3" />
                    </kbd>
                    <span className="ms-1">{isAr ? 'تنقل' : 'Navigate'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[10px] font-mono">
                      ↵
                    </kbd>
                    <span className="ms-1">{isAr ? 'فتح' : 'Open'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[10px] font-mono">
                      esc
                    </kbd>
                    <span className="ms-1">{isAr ? 'إغلاق' : 'Close'}</span>
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 font-tajawal">
                  {flatResults.length > 0 && (
                    <span>{flatResults.length} {isAr ? 'نتيجة' : 'results'}</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
