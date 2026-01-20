/**
 * Payments Management Page
 * إدارة المدفوعات والفواتير
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { paymentsService, type Payment, type Invoice } from '@/services/saas/paymentsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  Search,
  Plus,
  Eye,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  Banknote,
} from 'lucide-react';
import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';
import { cn } from '@/lib/utils';

export default function Payments() {
  const { t, language, direction } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('payments');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  // Calculate stats
  const stats = {
    totalRevenue: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    completedCount: payments.filter(p => p.status === 'completed').length,
    pendingCount: payments.filter(p => p.status === 'pending').length,
    failedCount: payments.filter(p => p.status === 'failed').length,
    overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
  };

  // Filter payments/invoices
  const filteredPayments = payments.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.tenant_name?.toLowerCase().includes(query) ||
      p.invoice_number.toLowerCase().includes(query) ||
      p.reference?.toLowerCase().includes(query)
    );
  });

  const filteredInvoices = invoices.filter(i => {
    const query = searchQuery.toLowerCase();
    return (
      i.tenant_name?.toLowerCase().includes(query) ||
      i.invoice_number.toLowerCase().includes(query)
    );
  });

  // Get status badge
  const getPaymentStatusBadge = (status: Payment['status']) => {
    const statusConfig: Record<Payment['status'], { label: string; className: string; icon: any }> = {
      completed: {
        label: language === 'ar' ? 'مكتمل' : 'Completed',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
      },
      pending: {
        label: language === 'ar' ? 'معلق' : 'Pending',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
      },
      failed: {
        label: language === 'ar' ? 'فاشل' : 'Failed',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
      },
      refunded: {
        label: language === 'ar' ? 'مسترد' : 'Refunded',
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        icon: RefreshCw,
      },
      cancelled: {
        label: language === 'ar' ? 'ملغي' : 'Cancelled',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: XCircle,
      },
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={cn('text-xs font-medium flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status: Invoice['status']) => {
    const statusConfig: Record<Invoice['status'], { label: string; className: string }> = {
      draft: {
        label: language === 'ar' ? 'مسودة' : 'Draft',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      },
      sent: {
        label: language === 'ar' ? 'مرسلة' : 'Sent',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      },
      paid: {
        label: language === 'ar' ? 'مدفوعة' : 'Paid',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      },
      overdue: {
        label: language === 'ar' ? 'متأخرة' : 'Overdue',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
      cancelled: {
        label: language === 'ar' ? 'ملغية' : 'Cancelled',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      },
    };
    const config = statusConfig[status];
    return (
      <Badge className={cn('text-xs font-medium', config.className)}>
        {config.label}
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'SAR') => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: Payment['payment_method']) => {
    const methods: Record<Payment['payment_method'], string> = {
      bank_transfer: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
      credit_card: language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card',
      cash: language === 'ar' ? 'نقداً' : 'Cash',
      online: language === 'ar' ? 'دفع إلكتروني' : 'Online',
      other: language === 'ar' ? 'أخرى' : 'Other',
    };
    return methods[method];
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                </p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {language === 'ar' ? 'مبالغ معلقة' : 'Pending Amount'}
                </p>
                <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'مكتملة' : 'Completed'}
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.completedCount}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'معلقة' : 'Pending'}
                </p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.pendingCount}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'فاشلة' : 'Failed'}
                </p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {stats.failedCount}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {language === 'ar' ? 'فواتير متأخرة' : 'Overdue'}
                </p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">
                  {stats.overdueInvoices}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              {language === 'ar' ? 'المدفوعات' : 'Payments'}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              {language === 'ar' ? 'الفواتير' : 'Invoices'}
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الدفعة' : 'Payment #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المشترك' : 'Subscriber'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Method'}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الدفع' : 'Date'}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-mono text-sm">{payment.invoice_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {payment.tenant_name}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-gray-400" />
                            {getPaymentMethodLabel(payment.payment_method)}
                          </div>
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {payment.payment_date
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedPayment(payment);
                                setIsDetailsOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('common.details')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                {language === 'ar' ? 'تحميل الإيصال' : 'Download Receipt'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المشترك' : 'Subscriber'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الباقة' : 'Plan'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {invoice.tenant_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.plan_name}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </TableCell>
                        <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedInvoice(invoice);
                                setIsDetailsOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('common.details')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                              </DropdownMenuItem>
                              {invoice.status !== 'paid' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-green-600">
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Details Sheet */}
      {selectedPayment && (
        <UnifiedSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedPayment(null);
          }}
          size="md"
          icon={CreditCard}
          title={selectedPayment.invoice_number}
          subtitle={selectedPayment.tenant_name}
        >
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('common.status')}</p>
                <div className="mt-1">{getPaymentStatusBadge(selectedPayment.status)}</div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</span>
                <span className="font-medium">{getPaymentMethodLabel(selectedPayment.payment_method)}</span>
              </div>
              {selectedPayment.payment_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</span>
                  <span className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</span>
                </div>
              )}
              {selectedPayment.reference && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'المرجع' : 'Reference'}</span>
                  <span className="font-mono text-sm">{selectedPayment.reference}</span>
                </div>
              )}
              {selectedPayment.description && (
                <div>
                  <p className="text-gray-500 mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</p>
                  <p className="text-sm">{selectedPayment.description}</p>
                </div>
              )}
            </div>
          </div>
        </UnifiedSheet>
      )}

      {/* Invoice Details Sheet */}
      {selectedInvoice && (
        <UnifiedSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedInvoice(null);
          }}
          size="md"
          icon={FileText}
          title={selectedInvoice.invoice_number}
          subtitle={selectedInvoice.tenant_name}
        >
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                <p className="text-2xl font-bold text-erp-navy dark:text-white">
                  {formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('common.status')}</p>
                <div className="mt-1">{getInvoiceStatusBadge(selectedInvoice.status)}</div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ar' ? 'المبلغ' : 'Amount'}</span>
                <span className="font-medium">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ar' ? 'الضريبة' : 'Tax'}</span>
                <span className="font-medium">{formatCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</span>
                <span className="font-medium">{new Date(selectedInvoice.issue_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</span>
                <span className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
              </div>
              {selectedInvoice.plan_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'الباقة' : 'Plan'}</span>
                  <Badge variant="outline">{selectedInvoice.plan_name}</Badge>
                </div>
              )}
            </div>
          </div>
        </UnifiedSheet>
      )}
    </div>
  );
}
