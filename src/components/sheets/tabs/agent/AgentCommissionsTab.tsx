/**
 * AgentCommissionsTab - تبويب عمولات الوكيل
 * يعرض قائمة العمولات المستحقة والمدفوعة
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { LedgerTable, type LedgerColumn, type LedgerStats } from '@/components/shared';
import { DollarSign } from 'lucide-react';
import { type TabComponentProps, type DocType } from '../../configs/sheet.types';

// Commission Entry Interface
interface CommissionEntry {
  id: string;
  date: string;
  reference: string;
  tenant_name?: string;
  tenant_code?: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  commission_rate?: number;
  base_amount?: number;
  docType?: DocType;
  docId?: string;
}

export function AgentCommissionsTab({ data, docType: _docType, language, t: _t, onRowClick, onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';

  // Get commissions from data
  const commissions: CommissionEntry[] = useMemo(() => {
    if (data.commissions && Array.isArray(data.commissions)) {
      return data.commissions.map((c: any) => ({
        id: c.id,
        date: c.date || c.created_at,
        reference: c.reference || c.commission_number || `COM-${c.id.slice(0, 8)}`,
        tenant_name: c.tenant_name || c.tenant?.name,
        tenant_code: c.tenant_code || c.tenant?.code,
        description: c.description || c.remarks || '-',
        amount: c.amount || c.commission_amount || 0,
        status: c.status || 'pending',
        commission_rate: c.commission_rate || c.rate,
        base_amount: c.base_amount || c.subscription_amount,
        docType: 'payment' as DocType,
        docId: c.id,
      }));
    }
    return [];
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return commissions.reduce(
      (acc, c) => ({
        total: acc.total + c.amount,
        pending: acc.pending + (c.status === 'pending' || c.status === 'approved' ? c.amount : 0),
        paid: acc.paid + (c.status === 'paid' ? c.amount : 0),
      }),
      { total: 0, pending: 0, paid: 0 }
    );
  }, [commissions]);

  // Define columns
  const columns: LedgerColumn<CommissionEntry>[] = [
    {
      key: 'date',
      title: isArabic ? 'التاريخ' : 'Date',
      width: '100px',
      type: 'date',
      sortable: true,
    },
    {
      key: 'reference',
      title: isArabic ? 'المرجع' : 'Reference',
      width: '130px',
      type: 'reference',
      clickable: true,
      sortable: true,
    },
    {
      key: 'tenant_name',
      title: isArabic ? 'المشترك' : 'Tenant',
      render: (value, row) => (
        <div>
          <span className="font-medium">{value || '-'}</span>
          {row.tenant_code && (
            <span className="text-xs text-gray-500 ms-2 font-mono">{row.tenant_code}</span>
          )}
        </div>
      ),
    },
    {
      key: 'base_amount',
      title: isArabic ? 'المبلغ الأساسي' : 'Base Amount',
      width: '120px',
      align: 'end',
      render: (value) => (
        <span className="font-mono text-gray-500">
          {value ? value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    {
      key: 'commission_rate',
      title: isArabic ? 'النسبة' : 'Rate',
      width: '80px',
      align: 'center',
      render: (value) => (
        <span className="font-mono text-xs text-erp-teal">
          {value ? `${value}%` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      title: isArabic ? 'الحالة' : 'Status',
      width: '100px',
      type: 'status',
      sortable: true,
    },
    {
      key: 'amount',
      title: isArabic ? 'العمولة' : 'Commission',
      width: '130px',
      align: 'end',
      sortable: true,
      render: (value, row) => (
        <span className={cn(
          'font-mono font-medium',
          row.status === 'paid' ? 'text-green-600' : 'text-blue-600'
        )}>
          +{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
      footer: 'sum',
    },
  ];

  // Stats configuration
  const stats: LedgerStats = {
    label1: { 
      title: isArabic ? 'عدد العمولات' : 'Count', 
      value: commissions.length 
    },
    label2: { 
      title: isArabic ? 'المعلقة' : 'Pending', 
      value: totals.pending, 
      color: 'blue' 
    },
    label3: { 
      title: isArabic ? 'المدفوعة' : 'Paid', 
      value: totals.paid, 
      color: 'green' 
    },
    label4: { 
      title: isArabic ? 'الإجمالي' : 'Total', 
      value: totals.total, 
      color: 'blue' 
    },
  };

  // Handle row click
  const handleRowClick = (row: CommissionEntry) => {
    if (row.docType && row.docId && onRowClick) {
      onRowClick(row, row.docType);
    }
  };

  return (
    <LedgerTable
      data={commissions}
      columns={columns}
      loading={false}
      showFilters
      showQuickFilters
      showStats
      stats={stats}
      selectable
      showRowNumbers
      showFooterTotals
      variant="payments"
      onRowClick={handleRowClick}
      onRefresh={onRefresh}
      footerLabel={isArabic ? 'الإجمالي' : 'Total'}
      emptyMessage={isArabic ? 'لا توجد عمولات' : 'No commissions'}
      emptyIcon={<DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
    />
  );
}

export default AgentCommissionsTab;
