/**
 * Exchange Customer Sheet Configuration
 * إعدادات شيت زبون الصرافة
 * 
 * يعيد استخدام OverviewTab + LedgerTab + ActivityTab الموجودين
 * الفرق عن customer.config: حقول مختلفة + أيقونة + stats مخصصة
 */

import {
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Globe,
  Coins,
  Hash,
  Wallet,
  Eye,
  FileText,
  Activity,
  Paperclip,
  Edit,
  Trash2,
  Printer,
  Download,
  Send,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Reuse existing shared tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { DocumentsTab } from '../tabs/shared/DocumentsTab';

// Wrapper to adapt DocumentsTab to TabComponentProps
const DocumentsTabWrapper = (props: any) => DocumentsTab({ 
  ...props, 
  entityType: 'customer',
  entityId: props.data?.id,
  tenantId: props.data?.tenant_id,
  onRowClick: undefined,
});

export const exchangeCustomerConfig: SheetConfig = {
  docType: 'exchange_customer',

  // Header
  title: (data) => data.name_ar || data.name_en || data.name || 'Customer',
  subtitle: (data) => data.code || data.customer_code || '',
  icon: Users,
  iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',

  // Status Badge
  badge: (data) => {
    const isActive = data.status === 'active' || data.is_active !== false;
    return {
      label: isActive ? 'common.status.active' : 'common.status.inactive',
      variant: isActive ? 'success' : 'default',
    };
  },

  // Balance Display
  balance: {
    value: (data) => data.balance || data.current_balance || 0,
    label: 'fields.balance',
    labelAr: 'الرصيد',
    currency: undefined,
    showSign: true,
  },

  // Stats Cards
  stats: [
    {
      key: 'operations_count',
      label: 'exchange.stats.operations',
      labelAr: 'عمليات الصرف',
      icon: Coins,
      value: (data) => data.operations_count || 0,
      color: 'blue',
    },
    {
      key: 'remittances_count',
      label: 'exchange.stats.remittances',
      labelAr: 'الحوالات',
      icon: Send,
      value: (data) => data.remittances_count || 0,
      color: 'green',
    },
    {
      key: 'balance',
      label: 'fields.balance',
      labelAr: 'الرصيد',
      icon: Wallet,
      value: (data) => data.balance || data.current_balance || 0,
      color: 'purple',
    },
    {
      key: 'credit_limit',
      label: 'fields.creditLimit',
      labelAr: 'حد الائتمان',
      icon: CreditCard,
      value: (data) => data.credit_limit || 0,
      color: 'yellow',
      format: (value) => value > 0 ? value.toLocaleString() : '—',
    },
  ],

  // Info Fields for Overview
  infoFields: [
    { key: 'code', label: 'fields.customerCode', labelAr: 'الرمز', type: 'text', icon: Hash },
    { key: 'phone', label: 'fields.phone', labelAr: 'الهاتف', type: 'phone', icon: Phone },
    { key: 'email', label: 'fields.email', labelAr: 'البريد', type: 'email', icon: Mail },
    { key: 'id_type', label: 'exchange.fields.idType', labelAr: 'نوع الهوية', type: 'text', icon: CreditCard },
    { key: 'id_number', label: 'exchange.fields.idNumber', labelAr: 'رقم الهوية', type: 'text' },
    { key: 'nationality', label: 'exchange.fields.nationality', labelAr: 'الجنسية', type: 'text', icon: Globe },
    { key: 'default_currency', label: 'exchange.fields.defaultCurrency', labelAr: 'العملة الافتراضية', type: 'text', icon: Coins },
    { key: 'city', label: 'fields.city', labelAr: 'المدينة', type: 'text' },
    { key: 'country', label: 'fields.country', labelAr: 'البلد', type: 'text', icon: Globe },
    { key: 'address', label: 'fields.address', labelAr: 'العنوان', type: 'text', icon: MapPin, colSpan: 2 },
    { key: 'credit_limit', label: 'fields.creditLimit', labelAr: 'حد الائتمان', type: 'currency', icon: CreditCard },
    { key: 'created_at', label: 'fields.createdAt', labelAr: 'تاريخ التسجيل', type: 'date', icon: Calendar },
    { key: 'notes', label: 'fields.notes', labelAr: 'ملاحظات', type: 'text', colSpan: 2 },
  ],

  // Tabs — 4 tabs (all existing shared components)
  tabs: [
    {
      id: 'overview',
      label: 'tabs.overview',
      labelAr: 'نظرة عامة',
      icon: Eye,
      component: OverviewTab,
    },
    {
      id: 'ledger',
      label: 'tabs.accountStatement',
      labelAr: 'كشف الحساب',
      icon: FileText,
      component: LedgerTab,
    },
    {
      id: 'documents',
      label: 'tabs.documents',
      labelAr: 'المرفقات والوثائق',
      icon: Paperclip,
      component: DocumentsTabWrapper as any,
    },
    {
      id: 'activity',
      label: 'tabs.activity',
      labelAr: 'السجل',
      icon: Activity,
      component: ActivityTab,
    },
  ],
  defaultTab: 'overview',

  // Actions
  actions: [
    {
      id: 'edit',
      label: 'actions.edit',
      labelAr: 'تعديل',
      icon: Edit,
      variant: 'outline',
    },
    {
      id: 'print',
      label: 'actions.printStatement',
      labelAr: 'طباعة كشف',
      icon: Printer,
      variant: 'outline',
      onClick: () => window.print(),
    },
    {
      id: 'export',
      label: 'actions.export',
      labelAr: 'تصدير',
      icon: Download,
      variant: 'outline',
    },
    {
      id: 'delete',
      label: 'actions.delete',
      labelAr: 'حذف',
      icon: Trash2,
      variant: 'destructive',
      show: (data) => !data.has_transactions,
      confirm: {
        title: 'dialogs.deleteCustomer',
        titleAr: 'حذف الزبون',
        description: 'dialogs.deleteCustomerWarning',
        descriptionAr: 'هل أنت متأكد من حذف هذا الزبون؟',
        confirmLabel: 'actions.delete',
        confirmLabelAr: 'حذف',
      },
    },
  ],

  // Quick Actions
  quickActions: [
    {
      id: 'print',
      label: 'actions.print',
      labelAr: 'طباعة',
      icon: Printer,
      variant: 'ghost',
      onClick: () => window.print(),
    },
  ],

  // Sheet Settings
  width: 'lg',

  // Nested Sheet Handler — click on ledger row → open journal entry
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'journal_entry' || row.journal_entry_id) {
      return {
        docType: 'journal_entry' as DocType,
        data: { id: row.journal_entry_id || row.id, ...row },
      };
    }
    if (rowDocType === 'invoice' || row.invoice_id) {
      return {
        docType: 'invoice' as DocType,
        data: { id: row.invoice_id || row.id, ...row },
      };
    }
    return null;
  },
};

export default exchangeCustomerConfig;
