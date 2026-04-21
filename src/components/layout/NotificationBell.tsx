/**
 * 🔔 NotificationBell — Premium Live Notification Center
 * 
 * Features:
 * - Glassmorphism design with gradient accents
 * - Unread count badge with pulse animation
 * - Grouped notifications (Today / Earlier)
 * - Real-time subscription for new notifications
 * - Mark as read (individual + mark all) with micro-animations
 * - Time-ago display (bilingual: AR/EN)
 * - Toast popup on new incoming notification
 * - Empty state with animated icon
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { notificationService, Notification } from '@/services/notificationService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Bell,
    BellRing,
    Check,
    CheckCheck,
    Package,
    Info,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Clock,
    Trash2,
    Ship,
    ShoppingBag,
    ShoppingCart,
    FileText,
    Sparkles,
    BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// ─── Helpers ─────────────────────────────────────────────────

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle2,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        ring: 'ring-emerald-200 dark:ring-emerald-800/40',
        gradient: 'from-emerald-500/10 to-transparent',
    },
    warning: {
        icon: AlertTriangle,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        ring: 'ring-amber-200 dark:ring-amber-800/40',
        gradient: 'from-amber-500/10 to-transparent',
    },
    error: {
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        ring: 'ring-red-200 dark:ring-red-800/40',
        gradient: 'from-red-500/10 to-transparent',
    },
    info: {
        icon: Info,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        ring: 'ring-blue-200 dark:ring-blue-800/40',
        gradient: 'from-blue-500/10 to-transparent',
    },
} as const;

const SOURCE_CONFIG: Record<string, { icon: React.ElementType; label_ar: string; label_en: string; badgeColor: string }> = {
    container: { icon: Ship, label_ar: 'كونتينر', label_en: 'Container', badgeColor: 'border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400' },
    purchase_invoice: { icon: ShoppingBag, label_ar: 'فاتورة مشتريات', label_en: 'Purchase', badgeColor: 'border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400' },
    sales_invoice: { icon: ShoppingCart, label_ar: 'فاتورة مبيعات', label_en: 'Sale', badgeColor: 'border-green-200 dark:border-green-800/50 text-green-600 dark:text-green-400' },
    recurring_entry: { icon: Clock, label_ar: 'قيد متكرر', label_en: 'Recurring', badgeColor: 'border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400' },
    default: { icon: FileText, label_ar: 'عام', label_en: 'General', badgeColor: 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400' },
};

function getLocalizedText(text: string | null, isRTL: boolean): string {
    if (!text) return '';
    const parts = text.split(' | ');
    if (parts.length >= 2) {
        return isRTL ? parts[0].trim() : parts[1].trim();
    }
    return text;
}

function getTimeAgo(dateStr: string, isRTL: boolean): string {
    try {
        return formatDistanceToNow(new Date(dateStr), {
            addSuffix: true,
            locale: isRTL ? ar : enUS,
        });
    } catch {
        return '';
    }
}

function getDateLabel(dateStr: string, isRTL: boolean): string {
    const date = new Date(dateStr);
    if (isToday(date)) return isRTL ? 'اليوم' : 'Today';
    if (isYesterday(date)) return isRTL ? 'أمس' : 'Yesterday';
    return isRTL ? 'سابقاً' : 'Earlier';
}

// ─── Single Notification Item ─────────────────────────────────

interface NotificationItemProps {
    notif: Notification;
    isRTL: boolean;
    onMarkRead: (id: string, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onClick: (notif: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = React.memo(({
    notif,
    isRTL,
    onMarkRead,
    onDelete,
    onClick,
}) => {
    const config = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
    const Icon = config.icon;
    const sourceConfig = SOURCE_CONFIG[notif.source_type || 'default'] || SOURCE_CONFIG.default;
    const SourceIcon = sourceConfig.icon;
    const sourceRef = notif.metadata?.container_number || notif.metadata?.invoice_number;

    return (
        <div
            onClick={() => onClick(notif)}
            className={cn(
                "relative flex gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200 group",
                "border-b border-gray-50 dark:border-gray-800/50 last:border-0",
                !notif.is_read
                    ? "bg-gradient-to-r " + config.gradient
                    : "hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
            )}
        >
            {/* Unread indicator line */}
            {!notif.is_read && (
                <div className={cn(
                    "absolute top-0 bottom-0 w-[3px] rounded-full",
                    isRTL ? "right-0" : "left-0",
                    config.color.replace('text-', 'bg-')
                )} />
            )}

            {/* Icon with ring */}
            <div className={cn(
                "shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ring-1",
                config.bg,
                config.ring,
                "transition-transform duration-200 group-hover:scale-110"
            )}>
                <Icon className={cn("w-4 h-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-[13px] leading-snug",
                    !notif.is_read
                        ? "font-semibold text-gray-900 dark:text-gray-50"
                        : "font-medium text-gray-600 dark:text-gray-300"
                )}>
                    {getLocalizedText(notif.title, isRTL)}
                </p>

                {notif.body && (
                    <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {getLocalizedText(notif.body, isRTL)}
                    </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {getTimeAgo(notif.created_at, isRTL)}
                    </span>

                    {sourceRef && (
                        <Badge
                            variant="outline"
                            className={cn("text-[9px] py-0 px-1.5 h-[18px] gap-1 font-mono", sourceConfig.badgeColor)}
                        >
                            <SourceIcon className="w-2.5 h-2.5" />
                            {sourceRef}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Hover Actions */}
            <div className={cn(
                "shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100",
                "transition-all duration-200 translate-x-1 group-hover:translate-x-0"
            )}>
                {!notif.is_read && (
                    <button
                        onClick={(e) => onMarkRead(notif.id, e)}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            "bg-transparent hover:bg-violet-100 dark:hover:bg-violet-900/30",
                            "text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
                        )}
                        title={isRTL ? 'تحديد كمقروء' : 'Mark as read'}
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={(e) => onDelete(notif.id, e)}
                    className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        "bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20",
                        "text-gray-400 hover:text-red-500"
                    )}
                    title={isRTL ? 'حذف' : 'Delete'}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
});
NotificationItem.displayName = 'NotificationItem';

// ─── Main Component ──────────────────────────────────────────

export function NotificationBell() {
    const { isRTL, t } = useLanguage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewPulse, setHasNewPulse] = useState(false);

    // ─── Fetch notifications ───
    const { data: notifications = [], isLoading } = useCachedQuery({
        queryKey: ['notifications', user?.id],
        queryFn: () => notificationService.getAll({ limit: 30 }),
        enabled: !!user?.id,
        refetchInterval: 30000,
        staleTime: 10000,
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // ─── Group notifications by date ───
    const grouped = useMemo(() => {
        const groups: { label: string; items: Notification[] }[] = [];
        const map = new Map<string, Notification[]>();

        for (const notif of notifications) {
            const label = getDateLabel(notif.created_at, isRTL);
            if (!map.has(label)) map.set(label, []);
            map.get(label)!.push(notif);
        }

        for (const [label, items] of map) {
            groups.push({ label, items });
        }

        return groups;
    }, [notifications, isRTL]);

    // ─── Real-time subscription ───
    useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = notificationService.subscribeToNew(
            user.id,
            (newNotif) => {
                queryClient.invalidateQueries({ queryKey: ['notifications'] });

                setHasNewPulse(true);
                setTimeout(() => setHasNewPulse(false), 4000);

                const title = getLocalizedText(newNotif.title, isRTL);
                const body = getLocalizedText(newNotif.body, isRTL);

                toast(title, {
                    description: body,
                    duration: 6000,
                    icon: newNotif.type === 'success' ? '✅' :
                        newNotif.type === 'warning' ? '⚠️' :
                            newNotif.type === 'error' ? '❌' : '🔔',
                });
            }
        );

        return unsubscribe;
    }, [user?.id, isRTL, queryClient]);

    // ─── Actions ───
    const handleMarkAsRead = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await notificationService.markAsRead([id]);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, [queryClient]);

    const handleMarkAllRead = useCallback(async () => {
        await notificationService.markAllAsRead();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast.success(isRTL ? 'تم تحديد جميع الإشعارات كمقروءة' : 'All notifications marked as read');
    }, [queryClient, isRTL]);

    const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await notificationService.delete(id);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, [queryClient]);

    const handleNotificationClick = useCallback((notif: Notification) => {
        if (!notif.is_read) {
            notificationService.markAsRead([notif.id]);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        setIsOpen(false);
    }, [queryClient]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-10 w-10 relative transition-all duration-300",
                                isOpen && "bg-violet-50 dark:bg-violet-950/30",
                                hasNewPulse && "animate-[wiggle_0.5s_ease-in-out_3]"
                            )}
                            id="notification-bell"
                        >
                            {hasNewPulse ? (
                                <BellRing className="h-5 w-5 text-violet-500" />
                            ) : (
                                <Bell className={cn(
                                    "h-5 w-5 transition-colors duration-200",
                                    unreadCount > 0 ? "text-violet-500" : "text-gray-500"
                                )} />
                            )}

                            {/* Unread badge */}
                            {unreadCount > 0 && (
                                <span className={cn(
                                    "absolute -top-0.5 -end-0.5 min-w-[20px] h-5 flex items-center justify-center",
                                    "text-[10px] font-bold rounded-full px-1",
                                    "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
                                    "shadow-[0_2px_8px_rgba(139,92,246,0.4)]",
                                    "transition-transform duration-300",
                                    hasNewPulse && "scale-125 animate-pulse"
                                )}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}

                            {/* Pulse ring effect for new notifications */}
                            {hasNewPulse && (
                                <span className="absolute inset-0 rounded-lg border-2 border-violet-400 animate-ping opacity-30" />
                            )}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    {t('header.notifications')}
                    {unreadCount > 0 && (
                        <Badge className="ms-1.5 bg-violet-500 text-white text-[9px] px-1 py-0">
                            {unreadCount}
                        </Badge>
                    )}
                </TooltipContent>
            </Tooltip>

            <PopoverContent
                align={isRTL ? "start" : "end"}
                className={cn(
                    "w-[400px] p-0 overflow-hidden",
                    "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
                    "border border-gray-200/60 dark:border-gray-700/60",
                    "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]",
                    "rounded-xl"
                )}
                sideOffset={8}
            >
                {/* ── Header with gradient ── */}
                <div className={cn(
                    "relative px-5 py-4",
                    "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
                    "text-white"
                )}>
                    {/* Decorative sparkle */}
                    <Sparkles className="absolute top-3 end-4 w-5 h-5 text-white/20" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold tracking-tight">
                                    {isRTL ? 'مركز الإشعارات' : 'Notification Center'}
                                </h3>
                                <p className="text-[11px] text-white/60 mt-0.5">
                                    {unreadCount > 0
                                        ? (isRTL ? `${unreadCount} إشعار جديد` : `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`)
                                        : (isRTL ? 'لا إشعارات جديدة' : 'All caught up!')
                                    }
                                </p>
                            </div>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium",
                                    "bg-white/15 hover:bg-white/25 backdrop-blur-sm",
                                    "transition-colors duration-200"
                                )}
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                {isRTL ? 'قراءة الكل' : 'Read all'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Notification List ── */}
                <ScrollArea className="max-h-[420px]" dir={isRTL ? 'rtl' : 'ltr'}>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-0 rounded-full border-2 border-violet-200 dark:border-violet-800" />
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
                            </div>
                            <span className="mt-3 text-xs text-gray-400">
                                {isRTL ? 'جاري التحميل...' : 'Loading...'}
                            </span>
                        </div>
                    ) : notifications.length === 0 ? (
                        /* ── Empty State ── */
                        <div className="flex flex-col items-center justify-center py-16 px-6">
                            <div className="relative mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 flex items-center justify-center">
                                    <BellOff className="w-7 h-7 text-violet-300 dark:text-violet-600" />
                                </div>
                                {/* Decorative dots */}
                                <span className="absolute -top-1 -end-1 w-3 h-3 bg-violet-200 dark:bg-violet-800 rounded-full opacity-50" />
                                <span className="absolute -bottom-2 -start-2 w-2 h-2 bg-purple-200 dark:bg-purple-800 rounded-full opacity-40" />
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {isRTL ? 'لا توجد إشعارات بعد' : 'No notifications yet'}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-center max-w-[220px]">
                                {isRTL
                                    ? 'ستظهر الإشعارات هنا تلقائياً عند تغيير حالة الكونتينرات أو الفواتير'
                                    : 'Notifications will appear here when container or invoice statuses change'}
                            </span>
                        </div>
                    ) : (
                        /* ── Grouped Notifications ── */
                        <div>
                            {grouped.map((group) => (
                                <div key={group.label}>
                                    {/* Date group label */}
                                    <div className={cn(
                                        "sticky top-0 z-10 px-4 py-2",
                                        "bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm",
                                        "border-b border-gray-100 dark:border-gray-700/50"
                                    )}>
                                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                            {group.label}
                                        </span>
                                    </div>

                                    {group.items.map((notif) => (
                                        <NotificationItem
                                            key={notif.id}
                                            notif={notif}
                                            isRTL={isRTL}
                                            onMarkRead={handleMarkAsRead}
                                            onDelete={handleDelete}
                                            onClick={handleNotificationClick}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* ── Footer ── */}
                {notifications.length > 0 && (
                    <div className={cn(
                        "px-4 py-2.5 text-center",
                        "bg-gray-50/80 dark:bg-gray-800/50",
                        "border-t border-gray-100 dark:border-gray-800"
                    )}>
                        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                            <Package className="w-3 h-3" />
                            <span>
                                {isRTL
                                    ? `${notifications.length} إشعار — ${unreadCount} غير مقروء`
                                    : `${notifications.length} total — ${unreadCount} unread`}
                            </span>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
