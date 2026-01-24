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
import { type SheetConfig } from './sheet.types';

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
      active: { label: 'status.active', variant: 'success' },
      pending: { label: 'status.pending', variant: 'warning' },
      suspended: { label: 'status.suspended', variant: 'error' },
      terminated: { label: 'status.terminated', variant: 'default' },
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
    label: 'fields.currentBalance',
    currency: 'SAR',
    showSign: true,
  },
  
  // Stats Cards
  stats: [
    {
      key: 'tenants_count',
      label: 'stats.tenants',
      icon: Users,
      value: (data) => data.tenants_count || data.tenants?.length || 0,
      color: 'blue',
    },
    {
      key: 'commission_rate',
      label: 'stats.commissionRate',
      icon: TrendingUp,
      value: (data) => data.commission_percent || 0,
      color: 'purple',
      format: (value) => `${value}%`,
    },
    {
      key: 'total_earned',
      label: 'stats.totalEarned',
      icon: DollarSign,
      value: (data) => data.total_earned || 0,
      color: 'green',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'pending_balance',
      label: 'status.pending',
      icon: Wallet,
      value: (data) => data.pending_balance || 0,
      color: 'yellow',
      format: (value) => value.toLocaleString(),
    },
  ],
  
  // Info Fields
  infoFields: [
    { key: 'code', label: 'fields.agentCode', type: 'text' },
    { key: 'email', label: 'fields.email', type: 'email', icon: Mail },
    { key: 'phone', label: 'fields.phone', type: 'phone', icon: Phone },
    { 
      key: 'tier', 
      label: 'fields.tier', 
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
    { key: 'commission_percent', label: 'fields.commissionPercent', type: 'percentage' },
    { key: 'currency', label: 'common.currency', type: 'text' },
    { key: 'created_at', label: 'fields.joined', type: 'date', icon: Calendar },
    { 
      key: 'has_white_label', 
      label: 'fields.whiteLabel', 
      type: 'badge',
      icon: Globe,
      badge: (value) => value ? { label: 'status.enabled', variant: 'success' } : null,
    },
    { key: 'white_label_commission_percent', label: 'fields.wlCommission', type: 'percentage', hidden: (data) => !data.has_white_label },
  ],
  
  // Tabs
  tabs: [
    { id: 'overview', label: 'tabs.overview', icon: Eye, component: OverviewTab },
    { 
      id: 'tenants', 
      label: 'tabs.tenants', 
      icon: Users, 
      component: AgentTenantsTab,
      badge: (data) => data.tenants_count || data.tenants?.length || 0,
    },
    { 
      id: 'commissions', 
      label: 'tabs.commissions', 
      icon: DollarSign, 
      component: AgentCommissionsTab,
      badge: (data) => data.commissions?.length || 0,
    },
    { 
      id: 'withdrawals', 
      label: 'tabs.withdrawals', 
      icon: Wallet, 
      component: AgentWithdrawalsTab,
      badge: (data) => data.withdrawals?.filter((w: any) => w.status === 'pending').length || 0,
    },
    { id: 'ledger', label: 'tabs.ledger', icon: Book, component: LedgerTab },
    { id: 'activity', label: 'tabs.activity', icon: Activity, component: ActivityTab },
  ],
  defaultTab: 'overview',
  
  // Actions
  actions: [
    {
      id: 'edit',
      label: 'actions.edit',
      icon: Edit,
      variant: 'outline',
      onClick: () => {},
    },
    {
      id: 'approve',
      label: 'actions.approve',
      icon: Shield,
      variant: 'success',
      show: (data) => data.status === 'pending',
      onClick: () => {},
    },
    {
      id: 'suspend',
      label: 'actions.suspend',
      icon: PauseCircle,
      variant: 'destructive',
      show: (data) => data.status === 'active',
      confirm: {
        title: 'dialogs.confirmSuspend',
        description: 'dialogs.suspendAgentWarning',
      },
      onClick: () => {},
    },
    {
      id: 'activate',
      label: 'actions.activate',
      icon: CheckCircle,
      variant: 'success',
      show: (data) => data.status === 'suspended',
      onClick: () => {},
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
