/**
 * Payments Management Page
 * إدارة المدفوعات والفواتير
 * 
 * Updated to use LedgerTable for consistent UI
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { paymentsService, type Payment, type Invoice } from '@/services/saas/paymentsService';
import { LedgerTable, type LedgerColumn } from '@/components/shared/tables/LedgerTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UniversalDetailSheet } from '@/components/sheets';
import { PaymentFormDialog } from './components/PaymentFormDialog';
import { Clock, CheckCircle2, XCircle, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Payments() {
  const { t, language, direction } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments');
  const [selectedPaymentRows, setSelectedPaymentRows] = useState<string[]>([]);
  const [selectedInvoiceRows, setSelectedInvoiceRows] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, invoicesData] = await Promise.all([
        paymentsService.getAll(),
        paymentsService.getAllInvoices(),
      ]);
      setPayments(paymentsData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error('Error loading payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Payment method renderer
  const renderPaymentMethod = (value: string) => {
    const methods: Record<string, string> = {
      bank_transfer: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
      credit_card: language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card',
      cash: language === 'ar' ? 'نقداً' : 'Cash',
      online: language === 'ar' ? 'دفع إلكتروني' : 'Online',
      other: language === 'ar' ? 'أخرى' : 'Other',
    };
    return (
      <Badge variant="outline" className="text-xs">
        {methods[value] || value}
      </Badge>
    );
  };

  // Payments columns
  const paymentsColumns: LedgerColumn<Payment>[] = [
    {
      key: 'invoice_number',
      title: 'saas.paymentsGrid.invoiceNumber',
      type: 'reference',
      width: '140px',
      sortable: true,
      filterable: true,
      clickable: true,
    },
    {
      key: 'tenant_name',
      title: 'saas.paymentsGrid.tenant',
      type: 'text',
      width: '200px',
      sortable: true,
      filterable: true,
    },
    {
      key: 'payment_method',
      title: 'saas.paymentsGrid.method',
      type: 'text',
      width: '150px',
      sortable: true,
      filterable: true,
      render: (value) => renderPaymentMethod(value as string),
    },
    {
      key: 'amount',
      title: 'common.amount',
      type: 'currency',
      width: '150px',
      sortable: true,
      colorize: true,
      align: 'end',
      footer: 'sum',
    },
    {
      key: 'status',
      title: 'common.status._',
      type: 'status',
      width: '130px',
      sortable: true,
      filterable: true,
      statusConfig: {
        completed: {
          label: 'common.completed',
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        },
        pending: {
          label: 'saas.status.pending',
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        },
        failed: {
          label: 'common.failed',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
        refunded: {
          label: 'common.refunded',
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        },
        cancelled: {
          label: 'saas.status.cancelled',
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        },
      },
    },
    {
      key: 'payment_date',
      title: 'saas.paymentsGrid.date',
      type: 'date',
      width: '120px',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'reference',
      title: 'saas.paymentsGrid.reference',
      type: 'text',
      width: '140px',
      filterable: true,
      render: (value) => value || '-',
    },
  ];

  // Invoices columns
  const invoicesColumns: LedgerColumn<Invoice>[] = [
    {
      key: 'invoice_number',
      title: 'saas.invoicesGrid.number',
      type: 'reference',
      width: '140px',
      sortable: true,
      filterable: true,
      clickable: true,
    },
    {
      key: 'tenant_name',
      title: 'saas.invoicesGrid.tenant',
      type: 'text',
      width: '200px',
      sortable: true,
      filterable: true,
    },
    {
      key: 'plan_name',
      title: 'saas.invoicesGrid.plan',
      type: 'text',
      width: '140px',
      sortable: true,
      filterable: true,
    },
    {
      key: 'amount',
      title: 'saas.invoicesGrid.amount',
      type: 'currency',
      width: '130px',
      sortable: true,
      align: 'end',
      footer: 'sum',
    },
    {
      key: 'tax_amount',
      title: 'saas.invoicesGrid.tax',
      type: 'currency',
      width: '110px',
      align: 'end',
      footer: 'sum',
    },
    {
      key: 'total_amount',
      title: 'saas.invoicesGrid.total',
      type: 'currency',
      width: '140px',
      sortable: true,
      align: 'end',
      footer: 'sum',
      render: (value, row) => (
        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
          {value.toLocaleString()} {row.currency}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'common.status._',
      type: 'status',
      width: '120px',
      sortable: true,
      filterable: true,
      statusConfig: {
        draft: {
          label: 'common.draft',
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        },
        sent: {
          label: 'common.sent',
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        paid: {
          label: 'common.paid',
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        },
        overdue: {
          label: 'common.overdue',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
        cancelled: {
          label: 'saas.status.cancelled',
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        },
      },
    },
    {
      key: 'issue_date',
      title: 'saas.invoicesGrid.issueDate',
      type: 'date',
      width: '120px',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'due_date',
      title: 'saas.invoicesGrid.dueDate',
      type: 'date',
      width: '120px',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  // Payments stats
  const paymentsStats = {
    label1: {
      title: 'common.completed',
      value: payments.filter(p => p.status === 'completed').length,
      color: 'green' as const,
    },
    label2: {
      title: 'common.total',
      value: payments.length,
      color: 'blue' as const,
    },
    label3: {
      title: 'saas.status.pending',
      value: payments.filter(p => p.status === 'pending').length,
      color: 'gray' as const,
    },
    label4: {
      title: 'common.totalRevenue',
      value: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)
        .toLocaleString(),
      color: 'green' as const,
    },
  };

  // Invoices stats
  const invoicesStats = {
    label1: {
      title: 'common.paid',
      value: invoices.filter(i => i.status === 'paid').length,
      color: 'green' as const,
    },
    label2: {
      title: 'common.total',
      value: invoices.length,
      color: 'blue' as const,
    },
    label3: {
      title: 'common.overdue',
      value: invoices.filter(i => i.status === 'overdue').length,
      color: 'red' as const,
    },
    label4: {
      title: 'common.totalAmount',
      value: invoices.reduce((sum, i) => sum + i.total_amount, 0).toLocaleString(),
      color: 'blue' as const,
    },
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.payments')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar' ? 'إدارة المدفوعات والفواتير' : 'Manage payments and invoices'}
          </p>
        </div>
        {activeTab === 'payments' && (
          <Button
            onClick={() => setIsPaymentFormOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'إضافة دفعة' : 'Add Payment'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="payments">
            {language === 'ar' ? 'المدفوعات' : 'Payments'} ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            {language === 'ar' ? 'الفواتير' : 'Invoices'} ({invoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <div className="h-[calc(100vh-350px)]">
            <LedgerTable
              data={payments}
              columns={paymentsColumns}
              loading={loading}
              showFilters={false}
              showStats={true}
              stats={paymentsStats}
              selectable={true}
              selectedRows={selectedPaymentRows}
              onSelectionChange={setSelectedPaymentRows}
              rowKey="id"
              onRowClick={(row) => {
                setSelectedPayment(row);
                setIsPaymentDetailsOpen(true);
              }}
              onRefresh={loadData}
              variant="payments"
              stickyHeader={true}
              showRowNumbers={true}
              showFooterTotals={true}
              footerLabel="common.total"
              emptyMessage="table.noData"
            />
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          <div className="h-[calc(100vh-350px)]">
            <LedgerTable
              data={invoices}
              columns={invoicesColumns}
              loading={loading}
              showFilters={false}
              showStats={true}
              stats={invoicesStats}
              selectable={true}
              selectedRows={selectedInvoiceRows}
              onSelectionChange={setSelectedInvoiceRows}
              rowKey="id"
              onRowClick={(row) => {
                setSelectedInvoice(row);
                setIsInvoiceDetailsOpen(true);
              }}
              onRefresh={loadData}
              variant="invoices"
              stickyHeader={true}
              showRowNumbers={true}
              showFooterTotals={true}
              footerLabel="common.total"
              emptyMessage="table.noData"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Details Sheet */}
      <UniversalDetailSheet
        isOpen={isPaymentDetailsOpen}
        onClose={() => {
          setIsPaymentDetailsOpen(false);
          setSelectedPayment(null);
        }}
        docType="payment"
        data={selectedPayment}
        onRefresh={loadData}
      />

      {/* Invoice Details Sheet */}
      <UniversalDetailSheet
        isOpen={isInvoiceDetailsOpen}
        onClose={() => {
          setIsInvoiceDetailsOpen(false);
          setSelectedInvoice(null);
        }}
        docType="invoice"
        data={selectedInvoice}
        onRefresh={loadData}
      />

      {/* Payment Form Dialog */}
      <PaymentFormDialog
        open={isPaymentFormOpen}
        onOpenChange={setIsPaymentFormOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
