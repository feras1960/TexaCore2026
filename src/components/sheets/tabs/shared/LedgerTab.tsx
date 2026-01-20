/**
 * LedgerTab - تبويب كشف الحساب المشترك
 * يستخدم LedgerTable الموجود لعرض الحركات المالية
 */

import React, { useState, useMemo } from 'react';
import { LedgerTable, type LedgerColumn, type LedgerStats } from '@/components/shared';
import { type TabComponentProps, type DocType } from '../../configs/sheet.types';

// Ledger Entry Interface
interface LedgerEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status?: string;
  type?: string;
  docType?: DocType;
  docId?: string;
}

export function LedgerTab({ data, docType, language, t, onRowClick, onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';
  const [loading, setLoading] = useState(false);

  // Get ledger entries from data
  const entries: LedgerEntry[] = useMemo(() => {
    // Check common data structures for ledger entries
    if (data.ledger_entries && Array.isArray(data.ledger_entries)) {
      return data.ledger_entries;
    }
    if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions.map((t: any, idx: number) => ({
        id: t.id || `tx-${idx}`,
        date: t.date || t.transaction_date || t.created_at,
        reference: t.reference || t.voucher_no || t.transaction_number || `#${idx + 1}`,
        description: t.description || t.remarks || t.memo || '-',
        debit: t.debit || t.debit_amount || 0,
        credit: t.credit || t.credit_amount || 0,
        balance: t.balance || t.running_balance || 0,
        status: t.status || 'posted',
        type: t.type || t.transaction_type,
        docType: t.doc_type,
        docId: t.doc_id,
      }));
    }
    if (data.entries && Array.isArray(data.entries)) {
      return data.entries;
    }
    // Return empty array if no entries found
    return [];
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => ({
        totalDebit: acc.totalDebit + (entry.debit || 0),
        totalCredit: acc.totalCredit + (entry.credit || 0),
      }),
      { totalDebit: 0, totalCredit: 0 }
    );
  }, [entries]);

  const currentBalance = totals.totalDebit - totals.totalCredit;

  // Define columns
  const columns: LedgerColumn<LedgerEntry>[] = [
    {
      key: 'debit',
      title: isArabic ? 'مدين' : 'Debit',
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
      title: isArabic ? 'دائن' : 'Credit',
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
      title: isArabic ? 'البيان' : 'Description',
      sortable: true,
      filterable: true,
    },
    {
      key: 'date',
      title: isArabic ? 'التاريخ' : 'Date',
      width: '110px',
      type: 'date',
      sortable: true,
    },
    {
      key: 'status',
      title: isArabic ? 'الحالة' : 'Status',
      width: '100px',
      type: 'status',
      sortable: true,
    },
    {
      key: 'reference',
      title: isArabic ? 'المرجع' : 'Reference',
      width: '120px',
      type: 'reference',
      clickable: true,
      sortable: true,
    },
    {
      key: 'balance',
      title: isArabic ? 'الرصيد' : 'Balance',
      width: '120px',
      align: 'end',
      render: (value) => (
        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
          {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      ),
    },
  ];

  // Stats configuration
  const stats: LedgerStats = {
    label1: { 
      title: isArabic ? 'إجمالي المدين' : 'Total Debit', 
      value: totals.totalDebit, 
      color: 'blue' 
    },
    label2: { 
      title: isArabic ? 'إجمالي الدائن' : 'Total Credit', 
      value: totals.totalCredit, 
      color: 'red' 
    },
    label3: { 
      title: isArabic ? 'الرصيد' : 'Balance', 
      value: currentBalance, 
      color: currentBalance >= 0 ? 'green' : 'red' 
    },
    label4: { 
      title: isArabic ? 'عدد الحركات' : 'Transactions', 
      value: entries.length, 
      color: 'gray' 
    },
  };

  // Handle row click
  const handleRowClick = (row: LedgerEntry) => {
    if (row.docType && row.docId && onRowClick) {
      onRowClick(row, row.docType);
    }
  };

  // Handle reference click
  const handleReferenceClick = (row: LedgerEntry) => {
    if (row.docType && row.docId && onRowClick) {
      onRowClick(row, row.docType);
    }
  };

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
      onRowClick={handleRowClick}
      onReferenceClick={handleReferenceClick}
      onRefresh={onRefresh}
      onPrint={() => window.print()}
      onExport={(format) => console.log('Export:', format)}
      footerLabel={isArabic ? 'الإجمالي' : 'Total'}
      emptyMessage={isArabic ? 'لا توجد حركات' : 'No transactions'}
    />
  );
}

export default LedgerTab;
