/**
 * Agent Sheet Configuration
 * إعدادات شيت الوكيل
 */

import {
  UserCog,
  Mail,
  Phone,
  Calendar,
  Globe,
  DollarSign,
  Users,
  Edit,
  PauseCircle,
  CheckCircle,
  Shield,
  Eye,
  Book,
  Activity,
  Wallet,
  TrendingUp,
  Crown,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
import { LedgerTab } from '../tabs/shared/LedgerTab';
import { AgentCommissionsTab } from '../tabs/agent/AgentCommissionsTab';
import { AgentTenantsTab } from '../tabs/agent/AgentTenantsTab';
import { AgentWithdrawalsTab } from '../tabs/agent/AgentWithdrawalsTab';

export const agentConfig: SheetConfig = {
  docType: 'agent',
  
  // Header
  title: (data) => data.name,
  subtitle: (data) => data.email || data.code,
  icon: UserCog,
  iconBg: 'bg-gradient-to-br from-purple-600 to-purple-800',
  
  // Status Badge
  badge: (data) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
      active: { label: 'نشط', variant: 'success' },
      pending: { label: 'معلق', variant: 'warning' },
      suspended: { label: 'موقوف', variant: 'error' },
      terminated: { label: 'منتهي', variant: 'default' },
    };
    const status = statusMap[data.status] || statusMap.pending;
    return {
      label: status.label,
      variant: status.variant,
    };
  },
  
  // Balance Display
  balance: {
    value: (data) => data.current_balance || 0,
    label: 'Current Balance',
    labelAr: 'الرصيد الحالي',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'tenants_count',
      label: 'Tenants',
      labelAr: 'المشتركين',
      icon: Users,
      value: (data) => data.tenants_count || data.tenants?.length || 0,
      color: 'blue',
    },
    {
      key: 'commission_rate',
      label: 'Commission Rate',
      labelAr: 'نسبة العمولة',
      icon: TrendingUp,
      value: (data) => data.commission_percent || 0,
      color: 'purple',
      format: (value) => `${value}%`,
    },
    {
      key: 'total_earned',
      label: 'Total Earned',
      labelAr: 'إجمالي الأرباح',
      icon: DollarSign,
      value: (data) => data.total_earned || 0,
      color: 'green',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'pending_balance',
      label: 'Pending',
      labelAr: 'قيد الانتظار',
      icon: Wallet,
      value: (data) => data.pending_balance || 0,
      color: 'yellow',
      format: (value) => value.toLocaleString(),
    },
  ],
  
  // Info Fields
  infoFields: [
    { key: 'code', label: 'Agent Code', labelAr: 'كود الوكيل', type: 'text' },
    { key: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', icon: Mail },
    { key: 'phone', label: 'Phone', labelAr: 'الهاتف', type: 'phone', icon: Phone },
    { 
      key: 'tier', 
      label: 'Tier', 
      labelAr: 'المستوى', 
      type: 'badge',
      icon: Crown,
      badge: (value) => {
        const tierColors: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
          bronze: 'default',
          silver: 'default',
          gold: 'warning',
          platinum: 'info',
          diamond: 'success',
        };
        return {
          label: value?.charAt(0).toUpperCase() + value?.slice(1) || 'Bronze',
          variant: tierColors[value?.toLowerCase()] || 'default',
        };
      },
    },
    { key: 'commission_percent', label: 'Commission %', labelAr: 'نسبة العمولة', type: 'percentage' },
    { key: 'currency', label: 'Currency', labelAr: 'العملة', type: 'text' },
    { key: 'created_at', label: 'Joined', labelAr: 'تاريخ الانضمام', type: 'date', icon: Calendar },
    { 
      key: 'has_white_label', 
      label: 'White Label', 
      labelAr: 'العلامة البيضاء', 
      type: 'badge',
      icon: Globe,
      badge: (value) => value ? { label: 'Enabled', variant: 'success' } : null,
    },
    { key: 'white_label_commission_percent', label: 'WL Commission', labelAr: 'عمولة العلامة البيضاء', type: 'percentage', hidden: (data) => !data.has_white_label },
  ],
  
  // Tabs
  tabs: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', icon: Eye, component: OverviewTab },
    { 
      id: 'tenants', 
      label: 'Tenants', 
      labelAr: 'المشتركين', 
      icon: Users, 
      component: AgentTenantsTab,
      badge: (data) => data.tenants_count || data.tenants?.length || 0,
    },
    { 
      id: 'commissions', 
      label: 'Commissions', 
      labelAr: 'العمولات', 
      icon: DollarSign, 
      component: AgentCommissionsTab,
      badge: (data) => data.commissions?.length || 0,
    },
    { 
      id: 'withdrawals', 
      label: 'Withdrawals', 
      labelAr: 'السحوبات', 
      icon: Wallet, 
      component: AgentWithdrawalsTab,
      badge: (data) => data.withdrawals?.filter((w: any) => w.status === 'pending').length || 0,
    },
    { id: 'ledger', label: 'Ledger', labelAr: 'كشف الحساب', icon: Book, component: LedgerTab },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط', icon: Activity, component: ActivityTab },
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
      onClick: (data) => console.log('Edit agent:', data.id),
    },
    {
      id: 'approve',
      label: 'Approve',
      labelAr: 'اعتماد',
      icon: Shield,
      variant: 'success',
      show: (data) => data.status === 'pending',
      onClick: (data) => console.log('Approve agent:', data.id),
    },
    {
      id: 'suspend',
      label: 'Suspend',
      labelAr: 'تعليق',
      icon: PauseCircle,
      variant: 'destructive',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'Confirm Suspend',
        titleAr: 'تأكيد التعليق',
        description: 'Are you sure you want to suspend this agent?',
        descriptionAr: 'هل أنت متأكد من تعليق هذا الوكيل؟',
      },
      onClick: (data) => console.log('Suspend agent:', data.id),
    },
    {
      id: 'activate',
      label: 'Activate',
      labelAr: 'تفعيل',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status === 'suspended',
      onClick: (data) => console.log('Activate agent:', data.id),
    },
  ],
  
  // Sheet Settings
  width: 'lg',
  
  // Nested Sheet Handler
  onRowClick: (row, rowDocType) => {
    if (rowDocType === 'tenant') {
      return { docType: 'tenant', data: row };
    }
    if (rowDocType === 'payment') {
      return { docType: 'payment', data: row };
    }
    return null;
  },
};

export default agentConfig;
