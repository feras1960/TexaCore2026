/**
 * Activity Tab - تبويب سجل النشاط
 * يعرض سجل التعديلات والأحداث على المستند
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Clock,
    User,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    FileText,
    Plus,
    RefreshCw,
    Eye,
    Printer,
    Mail,
    Lock,
    Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '../utils/formatters';

// Activity event types
type ActivityEventType =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'posted'
    | 'unposted'
    | 'viewed'
    | 'printed'
    | 'emailed'
    | 'locked'
    | 'unlocked';

interface ActivityEvent {
    id: string;
    type: ActivityEventType;
    timestamp: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    details?: string;
    changes?: Array<{
        field: string;
        oldValue?: string;
        newValue?: string;
    }>;
}

interface ActivityTabProps {
    events?: ActivityEvent[];
    loading?: boolean;
    useArabicNumerals?: boolean;
}

// Icon and color mapping for event types
const eventConfig: Record<ActivityEventType, { icon: any; color: string; labelKey: string }> = {
    created: { icon: Plus, color: 'text-green-500 bg-green-100', labelKey: 'activity.created' },
    updated: { icon: Edit, color: 'text-blue-500 bg-blue-100', labelKey: 'activity.updated' },
    deleted: { icon: Trash2, color: 'text-red-500 bg-red-100', labelKey: 'activity.deleted' },
    posted: { icon: CheckCircle, color: 'text-green-500 bg-green-100', labelKey: 'activity.posted' },
    unposted: { icon: XCircle, color: 'text-orange-500 bg-orange-100', labelKey: 'activity.unposted' },
    viewed: { icon: Eye, color: 'text-gray-500 bg-gray-100', labelKey: 'activity.viewed' },
    printed: { icon: Printer, color: 'text-gray-500 bg-gray-100', labelKey: 'activity.printed' },
    emailed: { icon: Mail, color: 'text-blue-500 bg-blue-100', labelKey: 'activity.emailed' },
    locked: { icon: Lock, color: 'text-orange-500 bg-orange-100', labelKey: 'activity.locked' },
    unlocked: { icon: Unlock, color: 'text-green-500 bg-green-100', labelKey: 'activity.unlocked' },
};

export function ActivityTab({
    events = [],
    loading = false,
    useArabicNumerals = false,
}: ActivityTabProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    // Get label for event type
    const getEventLabel = (type: ActivityEventType): string => {
        const labels: Record<ActivityEventType, string> = {
            created: t('activity.created') || 'تم الإنشاء',
            updated: t('activity.updated') || 'تم التحديث',
            deleted: t('activity.deleted') || 'تم الحذف',
            posted: t('activity.posted') || 'تم الترحيل',
            unposted: t('activity.unposted') || 'تم إلغاء الترحيل',
            viewed: t('activity.viewed') || 'تم العرض',
            printed: t('activity.printed') || 'تم الطباعة',
            emailed: t('activity.emailed') || 'تم الإرسال',
            locked: t('activity.locked') || 'تم القفل',
            unlocked: t('activity.unlocked') || 'تم فتح القفل',
        };
        return labels[type] || type;
    };

    // Format relative time
    const getRelativeTime = (timestamp: string): string => {
        const now = new Date();
        const eventDate = new Date(timestamp);
        const diffMs = now.getTime() - eventDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('time.justNow') || 'الآن';
        if (diffMins < 60) return `${t('time.ago') || 'منذ'} ${diffMins} ${t('time.minutes') || 'دقيقة'}`;
        if (diffHours < 24) return `${t('time.ago') || 'منذ'} ${diffHours} ${t('time.hours') || 'ساعة'}`;
        if (diffDays < 7) return `${t('time.ago') || 'منذ'} ${diffDays} ${t('time.days') || 'يوم'}`;

        return formatDate(timestamp, useArabicNumerals, 'medium');
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    // Empty state
    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">{t('activity.noActivity') || 'لا يوجد نشاط مسجل'}</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[400px]">
            <div className="relative">
                {/* Timeline Line */}
                <div className={cn(
                    "absolute top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700",
                    isRTL ? "right-5" : "left-5"
                )} />

                {/* Events */}
                <div className="space-y-6 pb-4">
                    {events.map((event, index) => {
                        const config = eventConfig[event.type] || eventConfig.updated;
                        const IconComponent = config.icon;

                        return (
                            <div
                                key={event.id || index}
                                className="relative flex gap-4"
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10",
                                    config.color
                                )}>
                                    <IconComponent className="w-4 h-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={event.user.avatar} />
                                                <AvatarFallback className="text-[10px] bg-erp-primary/10 text-erp-primary">
                                                    {event.user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {event.user.name}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {getRelativeTime(event.timestamp)}
                                        </span>
                                    </div>

                                    {/* Event Type */}
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-medium">{getEventLabel(event.type)}</span>
                                        {event.details && <span className="text-gray-500"> - {event.details}</span>}
                                    </p>

                                    {/* Changes (if any) */}
                                    {event.changes && event.changes.length > 0 && (
                                        <div className="mt-3 space-y-1.5 bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                                            {event.changes.map((change, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <span className="text-gray-500 min-w-[80px]">{change.field}:</span>
                                                    {change.oldValue && (
                                                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded line-through">
                                                            {change.oldValue}
                                                        </span>
                                                    )}
                                                    <span className="text-gray-400">→</span>
                                                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                        {change.newValue}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ScrollArea>
    );
}

// Generate mock activity events for testing
export function generateMockActivityEvents(documentId: string): ActivityEvent[] {
    const users = [
        { id: 'user-1', name: 'أحمد محمد' },
        { id: 'user-2', name: 'سارة علي' },
        { id: 'user-3', name: 'محمد خالد' },
    ];

    const events: ActivityEvent[] = [];
    const now = new Date();

    // Create event
    events.push({
        id: 'evt-1',
        type: 'created',
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: users[0],
        details: 'إنشاء القيد المحاسبي',
    });

    // Update events
    events.push({
        id: 'evt-2',
        type: 'updated',
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        user: users[1],
        details: 'تحديث البيانات',
        changes: [
            { field: 'المبلغ', oldValue: '5,000', newValue: '5,500' },
            { field: 'الوصف', oldValue: 'فاتورة مشتريات', newValue: 'فاتورة مشتريات - معدلة' },
        ],
    });

    // Posted event
    events.push({
        id: 'evt-3',
        type: 'posted',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: users[2],
        details: 'ترحيل القيد إلى دفتر الأستاذ',
    });

    // Printed event
    events.push({
        id: 'evt-4',
        type: 'printed',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        user: users[0],
    });

    // Viewed event
    events.push({
        id: 'evt-5',
        type: 'viewed',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        user: users[1],
    });

    return events.reverse(); // Most recent first
}

export default ActivityTab;
