/**
 * AgentTenantsTab - تبويب المشتركين التابعين للوكيل
 * يعرض قائمة المشتركين المرتبطين بالوكيل
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Users,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertCircle,
  Calendar,
  Package,
  Mail,
  Phone,
} from 'lucide-react';
import { type TabComponentProps } from '../../configs/sheet.types';

// Tenant Interface
interface Tenant {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  plan_name?: string;
  created_at: string;
  subscription_end?: string;
  monthly_value?: number;
  currency?: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; labelAr: string; labelEn: string }> = {
  active: { icon: CheckCircle, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', labelAr: 'نشط', labelEn: 'Active' },
  inactive: { icon: XCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', labelAr: 'غير نشط', labelEn: 'Inactive' },
  suspended: { icon: PauseCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', labelAr: 'موقوف', labelEn: 'Suspended' },
  expired: { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', labelAr: 'منتهي', labelEn: 'Expired' },
};

// Tenant Card Component
function TenantCard({
  tenant,
  language,
  onClick
}: {
  tenant: Tenant;
  language: string;
  onClick?: () => void;
}) {
  const isArabic = language === 'ar';
  const statusConfig = STATUS_CONFIG[tenant.status] || STATUS_CONFIG.inactive;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-erp-teal/50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {tenant.name}
            </h4>
            <p className="text-xs text-gray-500 font-mono">{tenant.code}</p>
          </div>
        </div>
        <Badge className={cn('text-xs', statusConfig.color)}>
          <StatusIcon className="w-3 h-3 me-1" />
          {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
        </Badge>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-3">
        {tenant.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="w-3 h-3" />
            <span>{tenant.email}</span>
          </div>
        )}
        {tenant.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="w-3 h-3" />
            <span className="font-mono">{tenant.phone}</span>
          </div>
        )}
      </div>

      {/* Plan & Dates */}
      <div className="flex items-center justify-between text-xs border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="flex items-center gap-1 text-gray-500">
          <Package className="w-3 h-3" />
          <span>{tenant.plan_name || (isArabic ? 'أساسي' : 'Basic')}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{new Date(tenant.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</span>
        </div>
      </div>

      {/* Monthly Value */}
      {tenant.monthly_value !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {isArabic ? 'القيمة الشهرية' : 'Monthly Value'}
          </span>
          <span className="font-mono font-medium text-green-600 dark:text-green-400">
            {tenant.monthly_value.toLocaleString()} {tenant.currency || '-'}
          </span>
        </div>
      )}
    </div>
  );
}

export function AgentTenantsTab({ data, docType: _docType, language, t: _t, onRowClick, onRefresh: _onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';
  const [searchQuery, setSearchQuery] = React.useState('');

  // Get tenants from data
  const tenants: Tenant[] = useMemo(() => {
    if (data.tenants && Array.isArray(data.tenants)) {
      return data.tenants;
    }
    if (data.referred_tenants && Array.isArray(data.referred_tenants)) {
      return data.referred_tenants;
    }
    return [];
  }, [data]);

  // Filter tenants
  const filteredTenants = useMemo(() => {
    if (!searchQuery) return tenants;
    const query = searchQuery.toLowerCase();
    return tenants.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.code.toLowerCase().includes(query) ||
      t.email?.toLowerCase().includes(query)
    );
  }, [tenants, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    inactive: tenants.filter(t => t.status !== 'active').length,
    totalValue: tenants.reduce((sum, t) => sum + (t.monthly_value || 0), 0),
  }), [tenants]);

  // Handle tenant click
  const handleTenantClick = (tenant: Tenant) => {
    if (onRowClick) {
      onRowClick(tenant, 'tenant');
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-erp-teal" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'المشتركون' : 'Tenants'}
            </h3>
            <Badge variant="secondary">{tenants.length}</Badge>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 me-1" />
            {isArabic ? 'إضافة مشترك' : 'Add Tenant'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {isArabic ? 'الإجمالي' : 'Total'}
            </div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {stats.total}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400">
              {isArabic ? 'نشط' : 'Active'}
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {stats.active}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {isArabic ? 'غير نشط' : 'Inactive'}
            </div>
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
              {stats.inactive}
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-xs text-purple-600 dark:text-purple-400">
              {isArabic ? 'القيمة الشهرية' : 'Monthly Value'}
            </div>
            <div className="text-xl font-bold font-mono text-purple-700 dark:text-purple-300">
              {stats.totalValue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={isArabic ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              language={language}
              onClick={() => handleTenantClick(tenant)}
            />
          ))}
        </div>

        {filteredTenants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            {searchQuery
              ? (isArabic ? 'لا توجد نتائج' : 'No results found')
              : (isArabic ? 'لا يوجد مشتركون' : 'No tenants')
            }
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default AgentTenantsTab;
