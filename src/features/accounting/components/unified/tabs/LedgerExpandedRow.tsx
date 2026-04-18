/**
 * LedgerExpandedRow — السطر المنفتح في كشف الحساب
 * 
 * يُعرض عند الضغط على أي سطر في كشف الحساب
 * يجلب تفاصيل القيد (كل البنود) ويعرضها في جدول داخلي
 * مع تظليل الحساب الحالي وأزرار فتح القيد
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn, formatNumber } from '@/lib/utils';
import { Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { queryClient } from '@/app/providers';
import type { ExtendedLedgerEntry, EntryDetailLine } from '../hooks/useLedgerData';

// ═══ Entry Type Icons ═══
const ENTRY_TYPE_ICONS: Record<string, { icon: string; label_ar: string; label_en: string }> = {
    journal: { icon: '📋', label_ar: 'قيد يومية', label_en: 'Journal Entry' },
    cash: { icon: '🏦', label_ar: 'يومية صندوق', label_en: 'Cash Journal' },
    invoice: { icon: '🧾', label_ar: 'فاتورة', label_en: 'Invoice' },
    payment: { icon: '💸', label_ar: 'سند صرف', label_en: 'Payment' },
    receipt: { icon: '💰', label_ar: 'سند قبض', label_en: 'Receipt' },
    transfer: { icon: '🔄', label_ar: 'تحويل', label_en: 'Transfer' },
};

interface LedgerExpandedRowProps {
    entry: ExtendedLedgerEntry;
    currency: string;
    fetchEntryDetails: (journalEntryId: string) => Promise<EntryDetailLine[]>;
    onOpenEntry?: (entry: ExtendedLedgerEntry) => void;
}

export function LedgerExpandedRow({
    entry,
    currency,
    fetchEntryDetails,
    onOpenEntry,
}: LedgerExpandedRowProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const preloadedLines = queryClient.getQueryData<EntryDetailLine[]>(['entry_details', String(entry.entryId)]);

    const { data: lines = preloadedLines || [], isLoading: queryIsLoading, error: queryError } = useCachedQuery<EntryDetailLine[]>({
        queryKey: ['entry_details', String(entry.entryId)],
        queryFn: () => fetchEntryDetails(entry.entryId),
        initialData: preloadedLines,
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
    });

    const loading = !preloadedLines && queryIsLoading;
    const error = queryError ? 'Error loading entry details' : null;

    // Entry type info
    const typeInfo = ENTRY_TYPE_ICONS[entry.type] || ENTRY_TYPE_ICONS.journal;

    // Totals
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <div className="px-3 py-3 space-y-2" dir={direction}>
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg">{typeInfo.icon}</span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                {isRTL ? typeInfo.label_ar : typeInfo.label_en}
                            </span>
                            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                                {entry.entryNumber}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {entry.date} • {entry.description}
                        </div>
                    </div>
                </div>

                {/* Open Entry Button */}
                {onOpenEntry && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenEntry(entry);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {isRTL ? `فتح ال${typeInfo.label_ar.replace('قيد يومية', 'قيد').replace('سند صرف', 'سند').replace('سند قبض', 'سند')}` : `Open ${typeInfo.label_en.replace('Journal Entry', 'Entry')}`}
                    </button>
                )}
            </div>

            {/* ═══ Detail Lines Table ═══ */}
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    <span className="text-xs text-gray-400 ms-2">
                        {isRTL ? 'جاري تحميل التفاصيل...' : 'Loading details...'}
                    </span>
                </div>
            ) : error ? (
                <div className="text-center py-4 text-xs text-red-400">{error}</div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" dir={direction}>
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-2 text-start text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        {isRTL ? 'الحساب' : 'Account'}
                                    </th>
                                    <th className="px-4 py-2 text-end text-[11px] font-bold text-gray-500 uppercase tracking-wider w-28">
                                        {isRTL ? 'مدين' : 'Debit'}
                                    </th>
                                    <th className="px-4 py-2 text-end text-[11px] font-bold text-gray-500 uppercase tracking-wider w-28">
                                        {isRTL ? 'دائن' : 'Credit'}
                                    </th>
                                    <th className="px-4 py-2 text-start text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        {isRTL ? 'البيان' : 'Description'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {lines.map((line) => (
                                    <tr
                                        key={line.id}
                                        className={cn(
                                            'transition-colors',
                                            line.isCurrentAccount
                                                ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-s-2 border-s-indigo-500'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        )}
                                    >
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                    {line.accountCode}
                                                </span>
                                                <span className={cn(
                                                    "text-sm",
                                                    line.isCurrentAccount
                                                        ? 'font-bold text-indigo-700 dark:text-indigo-300'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                )}>
                                                    {isRTL ? line.accountNameAr : line.accountNameEn || line.accountNameAr}
                                                </span>
                                                {line.isCurrentAccount && (
                                                    <span className="text-[10px] text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full">
                                                        {isRTL ? '← الحساب الحالي' : '← Current'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-end font-mono text-sm">
                                            {line.debit > 0 ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                    {formatNumber(line.debit)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-end font-mono text-sm">
                                            {line.credit > 0 ? (
                                                <span className="text-red-500 dark:text-red-400 font-medium">
                                                    {formatNumber(line.credit)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-gray-500 max-w-[200px] truncate">
                                            {line.description || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* ═══ Totals Footer ═══ */}
                            <tfoot>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 font-bold">
                                    <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                                        {isRTL ? 'المجموع' : 'Total'}
                                    </td>
                                    <td className="px-4 py-2.5 text-end font-mono text-sm text-emerald-700 dark:text-emerald-400">
                                        {formatNumber(totalDebit)}
                                    </td>
                                    <td className="px-4 py-2.5 text-end font-mono text-sm text-red-600 dark:text-red-400">
                                        {formatNumber(totalCredit)}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isBalanced ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                {isRTL ? 'متوازن' : 'Balanced'}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-amber-500">
                                                {isRTL ? 'غير متوازن' : 'Unbalanced'}: {formatNumber(Math.abs(totalDebit - totalCredit))}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LedgerExpandedRow;
