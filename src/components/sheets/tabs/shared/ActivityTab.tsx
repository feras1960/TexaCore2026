/**
 * ActivityTab - تبويب النشاط المشترك
 * يعرض سجل الأحداث والنشاطات
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  FileText,
  Receipt,
  Wallet,
  DollarSign,
  User,
  Settings,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Download,
  Loader2,
} from 'lucide-react';
import { type TabComponentProps } from '../../configs/sheet.types';

// Activity Types with Icons and Colors
const ACTIVITY_TYPES: Record<string, { icon: any; color: string; labelAr: string; labelEn: string }> = {
  created: { icon: Plus, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', labelAr: 'إنشاء', labelEn: 'Created' },
  updated: { icon: Edit, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', labelAr: 'تعديل', labelEn: 'Updated' },
  deleted: { icon: Trash2, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', labelAr: 'حذف', labelEn: 'Deleted' },
  invoice: { icon: Receipt, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', labelAr: 'فاتورة', labelEn: 'Invoice' },
  payment: { icon: Wallet, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', labelAr: 'دفعة', labelEn: 'Payment' },
  receipt: { icon: DollarSign, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', labelAr: 'إيصال', labelEn: 'Receipt' },
  status_change: { icon: Settings, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', labelAr: 'تغيير حالة', labelEn: 'Status Change' },
  approved: { icon: CheckCircle, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', labelAr: 'اعتماد', labelEn: 'Approved' },
  default: { icon: Activity, color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400', labelAr: 'نشاط', labelEn: 'Activity' },
};

// Activity Item Interface
interface ActivityItem {
  id: string;
  type: string;
  title?: string;
  description?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  date: string;
  user?: string;
  metadata?: Record<string, any>;
}

// Activity Item Component
interface ActivityItemProps {
  activity: ActivityItem;
  language: string;
  isLast: boolean;
}

function ActivityItemRow({ activity, language, isLast }: ActivityItemProps) {
  const isArabic = language === 'ar';
  const typeConfig = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.default;
  const Icon = typeConfig.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins} minutes ago`;
    }
    if (diffHours < 24) {
      return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
    }
    if (diffDays < 7) {
      return isArabic ? `منذ ${diffDays} يوم` : `${diffDays} days ago`;
    }
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US');
  };

  return (
    <div className={cn(
      'flex gap-3 p-3',
      !isLast && 'border-b border-gray-100 dark:border-gray-800'
    )}>
      {/* Icon */}
      <div className={cn('p-2 rounded-full shrink-0', typeConfig.color)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-medium text-gray-900 dark:text-white">
              {activity.title || (isArabic ? typeConfig.labelAr : typeConfig.labelEn)}
            </span>
            {activity.reference && (
              <span className="text-sm text-gray-500 ms-2 font-mono">
                #{activity.reference}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {formatDate(activity.date)}
          </span>
        </div>

        {activity.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {activity.description}
          </p>
        )}

        {/* Amount if present */}
        {activity.amount !== undefined && (
          <div className={cn(
            'text-sm font-mono font-medium mt-1',
            activity.amount >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {activity.amount >= 0 ? '+' : ''}
            {activity.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            {activity.currency && <span className="text-gray-500 ms-1">{activity.currency}</span>}
          </div>
        )}

        {/* User if present */}
        {activity.user && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{activity.user}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ language }: { language: string }) {
  const isArabic = language === 'ar';
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-gray-500 dark:text-gray-400">
        {isArabic ? 'لا توجد أنشطة حديثة' : 'No recent activity'}
      </p>
    </div>
  );
}

export function ActivityTab({ data, docType, language, t, onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';

  // Get activities from data - adapt based on data structure
  const activities: ActivityItem[] = React.useMemo(() => {
    // Check common activity data structures
    if (data.activities && Array.isArray(data.activities)) {
      return data.activities;
    }
    if (data.activity_log && Array.isArray(data.activity_log)) {
      return data.activity_log;
    }
    if (data.events && Array.isArray(data.events)) {
      return data.events;
    }
    if (data.history && Array.isArray(data.history)) {
      return data.history;
    }
    
    // Generate mock activities if none found
    return [
      {
        id: '1',
        type: 'created',
        title: isArabic ? 'تم الإنشاء' : 'Record Created',
        date: data.created_at || new Date().toISOString(),
        user: data.created_by || 'System',
      },
      ...(data.updated_at && data.updated_at !== data.created_at ? [{
        id: '2',
        type: 'updated',
        title: isArabic ? 'تم التحديث' : 'Record Updated',
        date: data.updated_at,
        user: data.updated_by || 'System',
      }] : []),
    ];
  }, [data, isArabic]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-erp-teal" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'سجل النشاط' : 'Activity Log'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <Clock className="w-4 h-4 me-1" />
                {isArabic ? 'تحديث' : 'Refresh'}
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 me-1" />
              {isArabic ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Activities List */}
        {activities.length === 0 ? (
          <EmptyState language={language} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {activities.map((activity, index) => (
              <ActivityItemRow
                key={activity.id}
                activity={activity}
                language={language}
                isLast={index === activities.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default ActivityTab;
