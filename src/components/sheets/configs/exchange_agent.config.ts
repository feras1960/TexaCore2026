/**
 * Exchange Agent Sheet Configuration
 * إعدادات شيت وكيل الصرافة
 * 
 * يعيد استخدام OverviewTab + LedgerTab + ActivityTab الموجودين
 * مصدر البيانات: exchange_agents (ليس agents الـ SaaS)
 */

import {
  Building,
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
  PauseCircle,
  CheckCircle,
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
  entityType: 'agent',
  entityId: props.data?.id,
  tenantId: props.data?.tenant_id,
  onRowClick: undefined,
});

export const exchangeAgentConfig: SheetConfig = {
  docType: 'exchange_agent',

  // Header
  title: (data) => data.name_ar || data.name_en || data.name || 'Agent',
  subtitle: (data) => {
    const code = data.code || '';
    const type = data.agent_type === 'company' ? 'شركة' : 'فرد';
    return `${code} • ${type}`;
  },
  icon: Building,
  iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-600',

  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
      active: { label: 'common.status.active', variant: 'success' },
      inactive: { label: 'common.status.inactive', variant: 'default' },
      suspended: { label: 'status.suspended', variant: 'error' },
    };
    const status = statusMap[data.status] || statusMap.active;
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
      key: 'executed_remittances',
      label: 'exchange.stats.executedRemittances',
      labelAr: 'حوالات منفذة',
      icon: Send,
      value: (data) => data.remittances_count || 0,
      color: 'blue',
    },
    {
      key: 'commission_rate',
      label: 'exchange.fields.commissionRate',
      labelAr: 'نسبة العمولة',
      icon: TrendingUp,
      value: (data) => data.commission_rate || 0,
      color: 'purple',
      format: (value) => `${value}%`,
    },
    {
      key: 'credit_limit',
      label: 'exchange.fields.creditLimit',
      labelAr: 'حد الائتمان',
      icon: CreditCard,
      value: (data) => data.credit_limit || 0,
      color: 'yellow',
      format: (value) => value > 0 ? value.toLocaleString() : '—',
    },
    {
      key: 'balance',
      label: 'fields.balance',
      labelAr: 'الرصيد',
      icon: Wallet,
      value: (data) => data.balance || data.current_balance || 0,
      color: 'green',
    },
  ],

  // Info Fields for Overview
  infoFields: [
    { key: 'code', label: 'fields.customerCode', labelAr: 'الرمز', type: 'text', icon: Hash },
    { key: 'agent_type', label: 'exchange.fields.agentType', labelAr: 'نوع الوكيل', type: 'text', icon: Building },
    { key: 'phone', label: 'fields.phone', labelAr: 'الهاتف', type: 'phone', icon: Phone },
    { key: 'email', label: 'fields.email', labelAr: 'البريد', type: 'email', icon: Mail },
    { key: 'country', label: 'fields.country', labelAr: 'البلد', type: 'text', icon: Globe },
    { key: 'city', label: 'fields.city', labelAr: 'المدينة', type: 'text' },
    {
      key: 'currencies',
      label: 'exchange.fields.supportedCurrencies',
      labelAr: 'العملات المتاحة',
      type: 'text',
      icon: Coins,
      format: (value) => Array.isArray(value) ? value.join(', ') : value || '—',
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
    { key: 'address', label: 'fields.address', labelAr: 'العنوان', type: 'text', icon: MapPin, colSpan: 2 },
    {
      key: 'last_reconciliation_date',
      label: 'exchange.fields.lastReconciliation',
      labelAr: 'آخر مطابقة',
      type: 'date',
      icon: Calendar,
    },
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
      show: (data) => data.status === 'active',
      confirm: {
        title: 'dialogs.confirmSuspend',
        titleAr: 'تعليق الوكيل',
        description: 'dialogs.suspendAgentWarning',
        descriptionAr: 'هل أنت متأكد من تعليق هذا الوكيل؟',
      },
    },
    {
      id: 'activate',
      label: 'actions.activate',
      labelAr: 'تفعيل',
      icon: CheckCircle,
      variant: 'default',
      show: (data) => data.status !== 'active',
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
        title: 'dialogs.deleteAgent',
        titleAr: 'حذف الوكيل',
        description: 'dialogs.deleteAgentWarning',
        descriptionAr: 'هل أنت متأكد من حذف هذا الوكيل؟ لا يمكن التراجع.',
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

export default exchangeAgentConfig;
