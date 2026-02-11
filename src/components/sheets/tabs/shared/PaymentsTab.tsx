/**
 * PaymentsTab - تبويب المدفوعات المشترك
 * يعرض قائمة المدفوعات والإيصالات
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { LedgerTable, type LedgerColumn, type LedgerStats } from '@/components/shared';
import { Wallet } from 'lucide-react';
import { type TabComponentProps, type DocType } from '../../configs/sheet.types';

// Payment Entry Interface
interface PaymentEntry {
  id: string;
  date: string;
  reference: string;
  type: 'payment' | 'receipt';
  description: string;
  amount: number;
  method?: string;
  status: string;
  docType?: DocType;
  docId?: string;
}

export function PaymentsTab({ data, docType: _docType, language, t, onRowClick, onRefresh }: TabComponentProps) {
  const _isArabic = language === 'ar';

  // Get payments from data
  const payments: PaymentEntry[] = useMemo(() => {
    // Check common data structures
    if (data.payments && Array.isArray(data.payments)) {
      return data.payments.map((p: any) => ({
        id: p.id,
        date: p.date || p.payment_date || p.created_at,
        reference: p.reference || p.payment_number || p.voucher_no,
        type: p.type || p.payment_type || 'payment',
        description: p.description || p.remarks || '-',
        amount: p.amount || p.payment_amount || 0,
        method: p.method || p.payment_method,
        status: p.status || 'posted',
        docType: 'payment' as DocType,
        docId: p.id,
      }));
    }
    if (data.receipts && Array.isArray(data.receipts)) {
      return data.receipts.map((r: any) => ({
        id: r.id,
        date: r.date || r.receipt_date || r.created_at,
        reference: r.reference || r.receipt_number,
        type: 'receipt' as const,
        description: r.description || r.remarks || '-',
        amount: r.amount || r.receipt_amount || 0,
        method: r.method || r.payment_method,
        status: r.status || 'posted',
        docType: 'receipt' as DocType,
        docId: r.id,
      }));
    }
    return [];
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return payments.reduce(
      (acc, p) => ({
        totalReceipts: acc.totalReceipts + (p.type === 'receipt' ? p.amount : 0),
        totalPayments: acc.totalPayments + (p.type === 'payment' ? p.amount : 0),
      }),
      { totalReceipts: 0, totalPayments: 0 }
    );
  }, [payments]);

  const netAmount = totals.totalReceipts - totals.totalPayments;

  // Define columns
  const columns: LedgerColumn<PaymentEntry>[] = [
    {
      key: 'date',
      title: t('common.date'),
      width: '100px',
      type: 'date',
      sortable: true,
    },
    {
      key: 'reference',
      title: t('common.reference'),
      width: '120px',
      type: 'reference',
      clickable: true,
      sortable: true,
    },
    {
      key: 'type',
      title: t('common.type'),
      width: '100px',
      render: (value) => (
        <span className={cn(
          'px-2 py-1 rounded-md text-xs font-medium',
          value === 'receipt'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {value === 'receipt' ? t('common.receipt') : t('common.payment')}
        </span>
      ),
    },
    {
      key: 'description',
      title: t('common.description'),
      sortable: true,
    },
    {
      key: 'method',
      title: t('common.method'),
      width: '100px',
      render: (value) => (
        <span className="text-xs text-gray-500">{value || '-'}</span>
      ),
    },
    {
      key: 'status',
      title: t('common.status._'),
      width: '100px',
      type: 'status',
    },
    {
      key: 'amount',
      title: t('common.amount'),
      width: '130px',
      align: 'end',
      sortable: true,
      render: (value, row) => (
        <span className={cn(
          'font-mono font-medium',
          row.type === 'receipt' ? 'text-green-600' : 'text-red-600'
        )}>
          {row.type === 'receipt' ? '+' : '-'}{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
      footer: 'sum',
    },
  ];

  // Stats configuration
  const stats: LedgerStats = {
    label1: {
      title: t('accounting.payments.count'),
      value: payments.length
    },
    label2: {
      title: t('accounting.payments.net'),
      value: netAmount,
      color: netAmount >= 0 ? 'green' : 'red'
    },
    label3: {
      title: t('accounting.payments.totalPayments'),
      value: totals.totalPayments,
      color: 'red'
    },
    label4: {
      title: t('accounting.payments.totalReceipts'),
      value: totals.totalReceipts,
      color: 'green'
    },
  };

  // Handle row click
  const handleRowClick = (row: PaymentEntry) => {
    if (row.docType && row.docId && onRowClick) {
      onRowClick(row, row.docType);
    }
  };

  return (
    <LedgerTable
      data={payments}
      columns={columns}
      loading={false}
      showFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="payments"
      onRowClick={handleRowClick}
      onRefresh={onRefresh}
      footerLabel={t('common.total')}
      emptyMessage={t('common.noData')}
      emptyIcon={<Wallet className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
    />
  );
}

export default PaymentsTab;
