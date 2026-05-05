/**
 * Exchange Partner Sheet Configuration
 * إعدادات شيت شريك الصرافة
 * 
 * يعيد استخدام OverviewTab + LedgerTab + ActivityTab الموجودين
 * مصدر البيانات: exchange_partners
 * الفرق عن الوكيل: نوع اتفاقية + بلدان متعددة + أداء + ترخيص
 */

import {
  Handshake,
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
  TrendingUp,
  Shield,
  Clock,
  PauseCircle,
  CheckCircle,
  Link,
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
  entityType: 'partner',
  entityId: props.data?.id,
  tenantId: props.data?.tenant_id,
  onRowClick: undefined,
});

export const exchangePartnerConfig: SheetConfig = {
  docType: 'exchange_partner',

  // Header
  title: (data) => data.name_ar || data.name_en || data.name || 'Partner',
  subtitle: (data) => {
    const code = data.code || '';
    const typeLabels: Record<string, string> = {
      correspondent: 'مراسل',
      exchange_house: 'صرافة',
      bank: 'بنك',
      fintech: 'تقنية مالية',
      agent_network: 'شبكة وكلاء',
    };
    const type = typeLabels[data.partner_type] || data.partner_type || '';
    return `${code} • ${type}`;
  },
  icon: Handshake,
  iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',

  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'common.status.active', variant: 'success' },
      inactive: { label: 'common.status.inactive', variant: 'default' },
      suspended: { label: 'status.suspended', variant: 'error' },
    };
    const status = statusMap[data?.status] || statusMap.active;
    return { label: status.label, variant: status.variant };
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
      key: 'volume',
      label: 'exchange.stats.partnerVolume',
      labelAr: 'حجم المعاملات',
      icon: Send,
      value: (data) => data.total_volume || data.remittances_count || 0,
      color: 'blue',
    },
    {
      key: 'success_rate',
      label: 'exchange.fields.successRate',
      labelAr: 'نسبة النجاح',
      icon: TrendingUp,
      value: (data) => data.success_rate || 100,
      color: 'green',
      format: (value) => `${value}%`,
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
      key: 'avg_processing',
      label: 'exchange.fields.avgProcessingTime',
      labelAr: 'متوسط المعالجة',
      icon: Clock,
      value: (data) => data.avg_processing_hours || 0,
      color: 'yellow',
      format: (value) => value > 0 ? `${value}h` : '—',
    },
  ],

  // Info Fields for Overview
  infoFields: [
    { key: 'code', label: 'fields.customerCode', labelAr: 'الرمز', type: 'text', icon: Hash },
    { key: 'partner_type', label: 'exchange.fields.partnerType', labelAr: 'نوع الشريك', type: 'text', icon: Handshake },
    { key: 'license_number', label: 'exchange.fields.licenseNumber', labelAr: 'رقم الترخيص', type: 'text', icon: Shield },
    { key: 'phone', label: 'fields.phone', labelAr: 'الهاتف', type: 'phone', icon: Phone },
    { key: 'email', label: 'fields.email', labelAr: 'البريد', type: 'email', icon: Mail },
    { key: 'website', label: 'exchange.fields.website', labelAr: 'الموقع', type: 'link', icon: Link },
    {
      key: 'countries',
      label: 'exchange.fields.coverageCountries',
      labelAr: 'البلدان المغطاة',
      type: 'text',
      icon: Globe,
      format: (value) => Array.isArray(value) ? value.join(', ') : value || '—',
      colSpan: 2,
    },
    {
      key: 'currencies',
      label: 'exchange.fields.supportedCurrencies',
      labelAr: 'العملات',
      type: 'text',
      icon: Coins,
      format: (value) => Array.isArray(value) ? value.join(', ') : value || '—',
      colSpan: 2,
    },
    {
      key: 'agreement_type',
      label: 'exchange.fields.agreementType',
      labelAr: 'نوع الاتفاقية',
      type: 'text',
    },
    {
      key: 'commission_rate',
      label: 'exchange.fields.commissionRate',
      labelAr: 'نسبة العمولة',
      type: 'percentage',
      icon: TrendingUp,
    },
    {
      key: 'credit_limit',
      label: 'exchange.fields.creditLimit',
      labelAr: 'حد الائتمان',
      type: 'currency',
      icon: CreditCard,
    },
    {
      key: 'settlement_period',
      label: 'exchange.fields.settlementPeriod',
      labelAr: 'فترة التسوية',
      type: 'text',
      icon: Clock,
    },
    { key: 'contract_start', label: 'exchange.fields.contractStart', labelAr: 'بداية العقد', type: 'date', icon: Calendar },
    { key: 'contract_end', label: 'exchange.fields.contractEnd', labelAr: 'نهاية العقد', type: 'date', icon: Calendar },
    {
      key: 'success_rate',
      label: 'exchange.fields.successRate',
      labelAr: 'نسبة النجاح',
      type: 'percentage',
      icon: TrendingUp,
    },
    {
      key: 'last_reconciliation_date',
      label: 'exchange.fields.lastReconciliation',
      labelAr: 'آخر مطابقة',
      type: 'date',
    },
    { key: 'address', label: 'fields.address', labelAr: 'العنوان', type: 'text', icon: MapPin, colSpan: 2 },
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
      id: 'suspend',
      label: 'actions.suspend',
      labelAr: 'تعليق',
      icon: PauseCircle,
      variant: 'destructive',
      show: (data) => data?.status === 'active',
      confirm: {
        title: 'dialogs.confirmSuspend',
        titleAr: 'تعليق الشريك',
        description: 'dialogs.suspendPartnerWarning',
        descriptionAr: 'هل أنت متأكد من تعليق هذا الشريك؟',
      },
    },
    {
      id: 'activate',
      label: 'actions.activate',
      labelAr: 'تفعيل',
      icon: CheckCircle,
      variant: 'default',
      show: (data) => data?.status !== 'active',
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
        title: 'dialogs.deletePartner',
        titleAr: 'حذف الشريك',
        description: 'dialogs.deletePartnerWarning',
        descriptionAr: 'هل أنت متأكد من حذف هذا الشريك؟ لا يمكن التراجع.',
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

  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'journal_entry' || row.journal_entry_id) {
      return {
        docType: 'journal_entry' as DocType,
        data: { id: row.journal_entry_id || row.id, ...row },
      };
    }
    return null;
  },
};

export default exchangePartnerConfig;
