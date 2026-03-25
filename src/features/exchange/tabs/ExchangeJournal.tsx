/**
 * ════════════════════════════════════════════════════════════════
 * 📒 Exchange Journal — يومية الصرافة
 * ════════════════════════════════════════════════════════════════
 *
 * اختصار مباشر لصفحة القيود المحاسبية مع فلتر العملات + فلتر النشاط
 * فلتر العملات يظهر في شريط أعلى اليومية بنفس النمط
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import JournalEntries from '@/features/accounting/JournalEntries';
import { useExchangeFilters } from '../hooks/useExchangeFilters';

export default function ExchangeJournal() {
  // Exchange filters with activity filter (All / Exchange / Trade)
  const { currencyFilterNode } = useExchangeFilters({
    storageKey: 'exchange_journal',
    showActivityFilter: true,
  });

  return (
    <div className="space-y-0">
      {/* Filter Bar — شريط رفيع فوق اليومية */}
      <div className="flex items-center justify-end gap-3 px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-t-xl border-b-0">
        {currencyFilterNode}
      </div>

      {/* JournalEntries — full component */}
      <JournalEntries />
    </div>
  );
}
