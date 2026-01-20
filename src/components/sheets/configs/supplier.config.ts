/**
 * Supplier Sheet Configuration
 * إعدادات شيت المورد
 */

import {
  Truck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  Wallet,
  Activity,
  Edit,
  Trash2,
  Printer,
  Download,
  Eye,
  Building2,
  CreditCard,
  FileText,
  Package,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { PaymentsTab } from '../tabs/shared/PaymentsTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

export const supplierConfig: SheetConfig = {
  docType: 'supplier',
  
  // Header
  title: (data) => data.name || data.nameAr || 'Supplier',
  subtitle: (data) => data.code,
  icon: Truck,
  iconBg: 'bg-gradient-to-br from-orange-600 to-orange-800',
  
  // Status Badge
  badge: (data) => {
    const status = data.status || (data.is_active !== false ? 'active' : 'inactive');
    return {
      label: status === 'active' ? 'نشط' : 'غير نشط',
      variant: status === 'active' ? 'success' : 'default',
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => data.balance || data.current_balance || 0,
    label: 'Payables',
    labelAr: 'المستحقات عليك',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'total_invoices',
      label: 'Total Bills',
      labelAr: 'إجمالي الفواتير',
      icon: Receipt,
      value: (data) => data.total_invoices || data.bills_count || 0,
      color: 'blue',
    },
    {
      key: 'total_purchases',
      label: 'Total Purchases',
      labelAr: 'إجمالي المشتريات',
      icon: Package,
      value: (data) => data.total_purchases || 0,
      color: 'green',
    },
    {
      key: 'balance',
      label: 'Balance',
      labelAr: 'الرصيد',
      icon: Wallet,
      value: (data) => Math.abs(data.balance || data.current_balance || 0),
      color: 'red',
    },
    {
      key: 'orders_count',
      label: 'Purchase Orders',
      labelAr: 'أوامر الشراء',
      icon: FileText,
      value: (data) => data.orders_count || data.purchase_orders_count || 0,
      color: 'yellow',
    },
  ],
  
  // Info Fields for Overview
  infoFields: [
    {
      key: 'code',
      label: 'Supplier Code',
      labelAr: 'رمز المورد',
      type: 'text',
      icon: Truck,
    },
    {
      key: 'email',
      label: 'Email',
      labelAr: 'البريد الإلكتروني',
      type: 'email',
      icon: Mail,
    },
    {
      key: 'phone',
      label: 'Phone',
      labelAr: 'الهاتف',
      type: 'phone',
      icon: Phone,
    },
    {
      key: 'address',
      label: 'Address',
      labelAr: 'العنوان',
      type: 'text',
      icon: MapPin,
    },
    {
      key: 'city',
      label: 'City',
      labelAr: 'المدينة',
      type: 'text',
    },
    {
      key: 'country',
      label: 'Country',
      labelAr: 'الدولة',
      type: 'text',
    },
    {
      key: 'tax_number',
      label: 'Tax Number',
      labelAr: 'الرقم الضريبي',
      type: 'text',
    },
    {
      key: 'payment_terms',
      label: 'Payment Terms',
      labelAr: 'شروط الدفع',
      type: 'text',
    },
    {
      key: 'created_at',
      label: 'Created At',
      labelAr: 'تاريخ الإنشاء',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'notes',
      label: 'Notes',
      labelAr: 'ملاحظات',
      type: 'text',
      colSpan: 2,
    },
  ],
  
  // Tabs Configuration
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      labelAr: 'نظرة عامة',
      icon: Eye,
      component: OverviewTab,
    },
    {
      id: 'ledger',
      label: 'Account Statement',
      labelAr: 'كشف الحساب',
      icon: FileText,
      component: LedgerTab,
    },
    {
      id: 'bills',
      label: 'Bills',
      labelAr: 'الفواتير',
      icon: Receipt,
      component: PaymentsTab, // Reuse for now
      badge: (data) => data.bills?.length || data.bills_count || null,
    },
    {
      id: 'payments',
      label: 'Payments',
      labelAr: 'المدفوعات',
      icon: Wallet,
      component: PaymentsTab,
      badge: (data) => data.payments?.length || null,
    },
    {
      id: 'activity',
      label: 'Activity',
      labelAr: 'النشاط',
      icon: Activity,
      component: ActivityTab,
    },
  ],
  defaultTab: 'overview',
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'Edit',
      labelAr: 'تعديل',
      icon: Edit,
      variant: 'outline',
    },
    {
      id: 'create_bill',
      label: 'Create Bill',
      labelAr: 'إنشاء فاتورة',
      icon: Receipt,
      variant: 'default',
    },
    {
      id: 'create_payment',
      label: 'Record Payment',
      labelAr: 'تسجيل دفعة',
      icon: Wallet,
      variant: 'outline',
    },
    {
      id: 'print',
      label: 'Print Statement',
      labelAr: 'طباعة كشف',
      icon: Printer,
      variant: 'outline',
      onClick: () => window.print(),
    },
    {
      id: 'export',
      label: 'Export',
      labelAr: 'تصدير',
      icon: Download,
      variant: 'outline',
    },
    {
      id: 'delete',
      label: 'Delete',
      labelAr: 'حذف',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => !data.has_transactions,
      confirm: {
        title: 'Delete Supplier',
        titleAr: 'حذف المورد',
        description: 'Are you sure you want to delete this supplier? This action cannot be undone.',
        descriptionAr: 'هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'Delete',
        confirmLabelAr: 'حذف',
      },
    },
  ],
  
  // Quick Actions (in header)
  quickActions: [
    {
      id: 'print',
      label: 'Print',
      labelAr: 'طباعة',
      icon: Printer,
      variant: 'ghost',
      onClick: () => window.print(),
    },
  ],
  
  // Sheet Settings
  width: 'xl',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'invoice' || row.invoice_id || row.bill_id) {
      return {
        docType: 'invoice' as DocType,
        data: { id: row.invoice_id || row.bill_id || row.id, ...row },
      };
    }
    if (rowDocType === 'payment' || row.payment_id) {
      return {
        docType: 'payment' as DocType,
        data: { id: row.payment_id || row.id, ...row },
      };
    }
    return null;
  },
};
