/**
 * Account Ledger Tab
 * تبويب كشف الحساب
 */

import React, { useEffect, useState } from 'react';
import { LedgerTable, type LedgerColumn, type LedgerStats } from '@/components/shared/tables/LedgerTable';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabComponentProps, DocType } from '../../configs/sheet.types';

interface LedgerEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
  type?: string;
  voucher_type?: string;
  journal_id?: string;
}

export function AccountLedgerTab({ data, language, t, onRowClick, onRefresh }: TabComponentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  // Get entries from data or fetch them
  useEffect(() => {
    if (data.ledger_entries || data.entries) {
      setEntries(data.ledger_entries || data.entries || []);
    } else if (data.id) {
      // TODO: Fetch from API if not provided
      // For now, use empty array
      setEntries([]);
    }
  }, [data]);

  // Calculate totals
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const currentBalance = data.current_balance || data.balance || (totalDebit - totalCredit);
  const openingBalance = data.opening_balance || 0;

  // Column configuration
  const columns: LedgerColumn<LedgerEntry>[] = [
    {
      key: 'debit',
      title: 'accounting.entry.debit',
      width: '120px',
      align: 'end',
      type: 'currency',
      showZeroAs: '-',
      sortable: true,
      footer: 'sum',
      render: (value) => value > 0 ? (
        <span className="font-mono text-green-600 dark:text-green-400">
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ) : <span className="text-gray-300">-</span>,
    },
    {
      key: 'credit',
      title: 'accounting.entry.credit',
      width: '120px',
      align: 'end',
      type: 'currency',
      showZeroAs: '-',
      sortable: true,
      footer: 'sum',
      render: (value) => value > 0 ? (
        <span className="font-mono text-red-600 dark:text-red-400">
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ) : <span className="text-gray-300">-</span>,
    },
    {
      key: 'description',
      title: 'common.description',
      sortable: true,
      filterable: true,
    },
    {
      key: 'date',
      title: 'common.date',
      width: '110px',
      type: 'date',
      sortable: true,
    },
    {
      key: 'status',
      title: 'common.status',
      width: '100px',
      type: 'status',
      sortable: true,
    },
    {
      key: 'reference',
      title: 'common.reference',
      width: '120px',
      type: 'reference',
      clickable: true,
      sortable: true,
    },
    {
      key: 'balance',
      title: 'common.balance',
      width: '120px',
      align: 'end',
      render: (value) => (
        <span className={cn(
          "font-mono font-medium",
          value >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400'
        )}>
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ),
    },
  ];

  // Stats configuration
  const stats: LedgerStats = {
    label1: { 
      title: language === 'ar' ? 'إجمالي المدين' : 'Total Debit', 
      value: totalDebit, 
      color: 'blue' 
    },
    label2: { 
      title: language === 'ar' ? 'إجمالي الدائن' : 'Total Credit', 
      value: totalCredit, 
      color: 'red' 
    },
    label3: { 
      title: language === 'ar' ? 'الرصيد' : 'Balance', 
      value: currentBalance, 
      color: currentBalance >= 0 ? 'green' : 'red' 
    },
    label4: { 
      title: language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening', 
      value: openingBalance, 
      color: 'gray' 
    },
  };

  // Handle row click to open journal entry
  const handleRowClick = (row: LedgerEntry) => {
    if (onRowClick && row.journal_id) {
      onRowClick(row, 'journal_entry' as DocType);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setLoading(false);
      if (onRefresh) onRefresh();
    }, 500);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{t('messages.loadingError')}</p>
          <Button variant="outline" className="mt-3" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 me-2" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LedgerTable
      data={entries}
      columns={columns}
      loading={loading}
      showFilters
      showQuickFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="ledger"
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPrint={() => window.print()}
      onExport={(format) => console.log('Export:', format)}
      footerLabel={language === 'ar' ? 'الإجمالي' : 'Total'}
      emptyMessage={language === 'ar' ? 'لا توجد حركات' : 'No entries'}
      emptyIcon={<FileText className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
    />
  );
}

export default AccountLedgerTab;
