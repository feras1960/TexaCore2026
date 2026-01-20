/**
 * Invoice Sheet Configuration
 * إعدادات شيت الفاتورة
 */

import {
  Receipt,
  Calendar,
  User,
  Building2,
  CreditCard,
  DollarSign,
  Printer,
  Download,
  Edit,
  Trash2,
  Eye,
  Book,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';

export const invoiceConfig: SheetConfig = {
  docType: 'invoice',
  
  // Header
  title: (data) => data.invoice_no || data.invoiceNo || data.reference,
  subtitle: (data) => data.party_name || data.partyName || data.customer_name,
  icon: Receipt,
  iconBg: 'bg-gradient-to-br from-green-600 to-green-800',
  
  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
      paid: { label: 'مدفوعة', variant: 'success' },
      partial: { label: 'مدفوعة جزئياً', variant: 'info' },
      unpaid: { label: 'غير مدفوعة', variant: 'error' },
      overdue: { label: 'متأخرة', variant: 'error' },
      draft: { label: 'مسودة', variant: 'warning' },
      submitted: { label: 'مقدمة', variant: 'info' },
      cancelled: { label: 'ملغاة', variant: 'default' },
    };
    const status = statusMap[data.status] || statusMap.draft;
    return {
      label: status.label,
      variant: status.variant,
      icon: status.variant === 'success' ? CheckCircle : 
            status.variant === 'error' ? AlertTriangle : Clock,
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => data.balance || (data.grand_total || data.grandTotal || 0) - (data.paid_amount || data.paidAmount || 0),
    label: 'Balance Due',
    labelAr: 'المبلغ المتبقي',
    currency: data => data.currency || 'SAR',
    showSign: false,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'grand_total',
      label: 'Total',
      labelAr: 'الإجمالي',
      icon: DollarSign,
      value: (data) => data.grand_total || data.grandTotal || 0,
      color: 'blue',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'paid_amount',
      label: 'Paid',
      labelAr: 'المدفوع',
      icon: CheckCircle,
      value: (data) => data.paid_amount || data.paidAmount || 0,
      color: 'green',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'balance',
      label: 'Balance',
      labelAr: 'المتبقي',
      icon: AlertTriangle,
      value: (data) => (data.grand_total || data.grandTotal || 0) - (data.paid_amount || data.paidAmount || 0),
      color: 'red',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'items_count',
      label: 'Items',
      labelAr: 'البنود',
      icon: FileText,
      value: (data) => data.items?.length || 0,
      color: 'gray',
    },
  ],
  
  // Info Fields
  infoFields: [
    { key: 'invoice_no', label: 'Invoice No', labelAr: 'رقم الفاتورة', type: 'text' },
    { 
      key: 'invoice_type', 
      label: 'Type', 
      labelAr: 'النوع', 
      type: 'badge',
      badge: (value) => {
        const types: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
          sales: { label: 'مبيعات', variant: 'success' },
          purchase: { label: 'مشتريات', variant: 'info' },
          credit_note: { label: 'إشعار دائن', variant: 'warning' },
          debit_note: { label: 'إشعار مدين', variant: 'default' },
        };
        return types[value] || { label: value, variant: 'default' };
      },
    },
    { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'date', icon: Calendar },
    { key: 'due_date', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date', icon: Clock },
    { 
      key: 'party_name', 
      label: 'Customer', 
      labelAr: 'العميل', 
      type: 'link',
      icon: Building2,
      link: (value, data) => data.party_id ? { docType: (data.party_type === 'supplier' ? 'supplier' : 'customer') as DocType, id: data.party_id } : null,
    },
    { key: 'party_phone', label: 'Phone', labelAr: 'الهاتف', type: 'phone' },
    { key: 'party_email', label: 'Email', labelAr: 'البريد', type: 'email' },
    { key: 'payment_method', label: 'Payment Method', labelAr: 'طريقة الدفع', type: 'text', icon: CreditCard },
    { key: 'sales_person', label: 'Sales Person', labelAr: 'المسؤول', type: 'text', icon: User },
    { key: 'currency', label: 'Currency', labelAr: 'العملة', type: 'text' },
    { key: 'created_at', label: 'Created', labelAr: 'تاريخ الإنشاء', type: 'date' },
  ],
  
  // Tabs
  tabs: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', icon: Eye, component: OverviewTab },
    { 
      id: 'payments', 
      label: 'Payments', 
      labelAr: 'المدفوعات', 
      icon: CreditCard, 
      component: PaymentsTab,
      badge: (data) => data.payments?.length || 0,
    },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط', icon: Activity, component: ActivityTab },
  ],
  defaultTab: 'overview',
  
  // Quick Actions (shown in header)
  quickActions: [
    {
      id: 'print',
      label: 'Print',
      labelAr: 'طباعة',
      icon: Printer,
      variant: 'ghost',
      onClick: (data) => window.print(),
    },
    {
      id: 'download',
      label: 'Download',
      labelAr: 'تحميل',
      icon: Download,
      variant: 'ghost',
      onClick: (data) => console.log('Download invoice:', data.id),
    },
  ],
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'Edit',
      labelAr: 'تعديل',
      icon: Edit,
      variant: 'outline',
      show: (data) => data.status === 'draft',
      onClick: (data) => console.log('Edit invoice:', data.id),
    },
    {
      id: 'submit',
      label: 'Submit',
      labelAr: 'تقديم',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status === 'draft',
      onClick: (data) => console.log('Submit invoice:', data.id),
    },
    {
      id: 'cancel',
      label: 'Cancel',
      labelAr: 'إلغاء',
      icon: XCircle,
      variant: 'destructive',
      show: (data) => data.status !== 'cancelled' && data.status !== 'paid',
      confirm: {
        title: 'Confirm Cancel',
        titleAr: 'تأكيد الإلغاء',
        description: 'Are you sure you want to cancel this invoice?',
        descriptionAr: 'هل أنت متأكد من إلغاء هذه الفاتورة؟',
      },
      onClick: (data) => console.log('Cancel invoice:', data.id),
    },
    {
      id: 'delete',
      label: 'Delete',
      labelAr: 'حذف',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => data.status === 'draft' || data.status === 'cancelled',
      confirm: {
        title: 'Confirm Delete',
        titleAr: 'تأكيد الحذف',
        description: 'Are you sure you want to delete this invoice? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.',
      },
      onClick: (data) => console.log('Delete invoice:', data.id),
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'payment') {
      return { docType: 'payment', data: row };
    }
    if (rowDocType === 'customer' || rowDocType === 'supplier') {
      return { docType: rowDocType, data: row };
    }
    return null;
  },
};

export default invoiceConfig;
