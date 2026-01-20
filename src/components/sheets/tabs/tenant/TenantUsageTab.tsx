/**
 * TenantUsageTab - تبويب استخدام المشترك
 * يعرض إحصائيات الاستخدام والحصص
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  HardDrive,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  Database,
  Zap,
} from 'lucide-react';
import { type TabComponentProps } from '../../configs/sheet.types';

// Usage Metric Interface
interface UsageMetric {
  id: string;
  label: string;
  labelAr: string;
  icon: any;
  used: number;
  limit: number;
  unit: string;
  unitAr: string;
  color?: 'green' | 'blue' | 'purple' | 'orange';
}

// Usage Card Component
function UsageCard({ metric, language }: { metric: UsageMetric; language: string }) {
  const isArabic = language === 'ar';
  const Icon = metric.icon;
  const percentage = metric.limit > 0 ? (metric.used / metric.limit) * 100 : 0;
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const colorClasses: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
  };

  const bgClasses: Record<string, string> = {
    green: 'bg-green-100 dark:bg-green-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded-lg',
            metric.color ? bgClasses[metric.color] : 'bg-gray-100 dark:bg-gray-900/30'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              metric.color ? colorClasses[metric.color] : 'text-gray-600 dark:text-gray-400'
            )} />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {isArabic ? metric.labelAr : metric.label}
          </span>
        </div>
        {(isWarning || isCritical) && (
          <Badge className={cn(
            'text-xs',
            isCritical 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          )}>
            <AlertTriangle className="w-3 h-3 me-1" />
            {isCritical 
              ? (isArabic ? 'حرج' : 'Critical')
              : (isArabic ? 'تحذير' : 'Warning')
            }
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Progress 
          value={percentage} 
          className={cn(
            'h-2',
            isCritical && '[&>div]:bg-red-500',
            isWarning && !isCritical && '[&>div]:bg-yellow-500'
          )}
        />
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {metric.used.toLocaleString()} / {metric.limit.toLocaleString()} 
            <span className="ms-1">{isArabic ? metric.unitAr : metric.unit}</span>
          </span>
          <span className={cn(
            'font-mono font-medium',
            isCritical && 'text-red-600',
            isWarning && !isCritical && 'text-yellow-600',
            !isWarning && 'text-gray-600'
          )}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function TenantUsageTab({ data, docType, language, t, onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';

  // Get usage metrics from data
  const metrics: UsageMetric[] = useMemo(() => {
    // If data has usage object
    if (data.usage) {
      return [
        {
          id: 'users',
          label: 'Users',
          labelAr: 'المستخدمين',
          icon: Users,
          used: data.usage.users_count || 0,
          limit: data.usage.users_limit || 10,
          unit: 'users',
          unitAr: 'مستخدم',
          color: 'blue' as const,
        },
        {
          id: 'storage',
          label: 'Storage',
          labelAr: 'التخزين',
          icon: HardDrive,
          used: data.usage.storage_used || 0,
          limit: data.usage.storage_limit || 5,
          unit: 'GB',
          unitAr: 'جيجابايت',
          color: 'purple' as const,
        },
        {
          id: 'documents',
          label: 'Documents',
          labelAr: 'المستندات',
          icon: FileText,
          used: data.usage.documents_count || 0,
          limit: data.usage.documents_limit || 1000,
          unit: 'docs',
          unitAr: 'مستند',
          color: 'green' as const,
        },
        {
          id: 'api_calls',
          label: 'API Calls',
          labelAr: 'طلبات API',
          icon: Zap,
          used: data.usage.api_calls || 0,
          limit: data.usage.api_limit || 10000,
          unit: 'calls/month',
          unitAr: 'طلب/شهر',
          color: 'orange' as const,
        },
      ];
    }

    // Default metrics
    return [
      {
        id: 'users',
        label: 'Users',
        labelAr: 'المستخدمين',
        icon: Users,
        used: data.users_count || 0,
        limit: data.max_users || 10,
        unit: 'users',
        unitAr: 'مستخدم',
        color: 'blue' as const,
      },
      {
        id: 'storage',
        label: 'Storage',
        labelAr: 'التخزين',
        icon: HardDrive,
        used: data.storage_used_gb || 0,
        limit: data.storage_limit_gb || 5,
        unit: 'GB',
        unitAr: 'جيجابايت',
        color: 'purple' as const,
      },
      {
        id: 'documents',
        label: 'Documents',
        labelAr: 'المستندات',
        icon: FileText,
        used: data.documents_count || 0,
        limit: data.documents_limit || 1000,
        unit: 'docs',
        unitAr: 'مستند',
        color: 'green' as const,
      },
      {
        id: 'api_calls',
        label: 'API Calls',
        labelAr: 'طلبات API',
        icon: Zap,
        used: data.api_calls_this_month || 0,
        limit: data.api_calls_limit || 10000,
        unit: 'calls/month',
        unitAr: 'طلب/شهر',
        color: 'orange' as const,
      },
    ];
  }, [data]);

  // Activity stats
  const activityStats = useMemo(() => ({
    lastActive: data.last_activity || data.updated_at || new Date().toISOString(),
    loginCount: data.login_count || 0,
    actionsToday: data.actions_today || 0,
  }), [data]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-erp-teal" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isArabic ? 'الاستخدام والحصص' : 'Usage & Quotas'}
          </h3>
        </div>

        {/* Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <UsageCard key={metric.id} metric={metric} language={language} />
          ))}
        </div>

        {/* Activity Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-erp-teal" />
            {isArabic ? 'ملخص النشاط' : 'Activity Summary'}
          </h4>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">
                {isArabic ? 'آخر نشاط' : 'Last Active'}
              </div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {new Date(activityStats.lastActive).toLocaleDateString(
                  isArabic ? 'ar-SA' : 'en-US'
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                {isArabic ? 'عمليات الدخول' : 'Login Count'}
              </div>
              <div className="font-medium font-mono text-gray-900 dark:text-white text-sm">
                {activityStats.loginCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">
                {isArabic ? 'إجراءات اليوم' : 'Actions Today'}
              </div>
              <div className="font-medium font-mono text-gray-900 dark:text-white text-sm">
                {activityStats.actionsToday}
              </div>
            </div>
          </div>
        </div>

        {/* Database Stats */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-erp-teal" />
            {isArabic ? 'إحصائيات قاعدة البيانات' : 'Database Stats'}
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">{isArabic ? 'الجداول' : 'Tables'}</div>
              <div className="font-mono font-medium">{data.db_tables_count || 45}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{isArabic ? 'السجلات' : 'Records'}</div>
              <div className="font-mono font-medium">{(data.db_records_count || 12500).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{isArabic ? 'الحجم' : 'Size'}</div>
              <div className="font-mono font-medium">{data.db_size_mb || 256} MB</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{isArabic ? 'النسخ الاحتياطية' : 'Backups'}</div>
              <div className="font-mono font-medium">{data.backups_count || 7}</div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default TenantUsageTab;
