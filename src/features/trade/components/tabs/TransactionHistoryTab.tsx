/**
 * ═══════════════════════════════════════════════════════════════
 * 📈 TransactionHistoryTab — سجل النشاط والعمليات
 * ═══════════════════════════════════════════════════════════════
 * Timeline عمودي يعرض كل العمليات على المعاملة:
 * - تاريخ + مستخدم + من → إلى + رقم مُولّد + ملاحظات
 * - بطاقات إحصائية: عمر المعاملة + عدد التحويلات + المستخدمون
 * - ألوان متطابقة مع stageConfig
 * - RTL + Dark mode + Empty state
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Clock,
    ArrowRightLeft,
    Users,
    CalendarDays,
    History,
    User,
    MessageCircle,
    Hash,
    FileText,
    Check,
    Circle,
    FileEdit,
    FileSearch,
    ClipboardList,
    ShieldCheck,
    Package,
    Receipt,
    CreditCard,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PURCHASE_STAGES, SALES_STAGES } from '../../config/stageConfig';
import type { PurchaseStage, SalesStage } from '../../config/stageConfig';
import type { TransactionStageLog } from '../../types';

// ═══ Icon mapping ═══
const ICON_MAP: Record<string, React.ElementType> = {
    FileEdit,
    FileSearch,
    ClipboardList,
    ShieldCheck,
    Package,
    Receipt,
    CreditCard,
    CheckCircle2,
    XCircle,
    Check,
    Circle,
    ArrowRightLeft,
    History,
};

// ═══ Props ═══
interface TransactionHistoryTabProps {
    /** Stage logs from transaction_stage_log */
    logs: TransactionStageLog[];
    /** Transaction type */
    transactionType: 'purchase' | 'sale';
    /** Current stage */
    currentStage: string;
    /** Transaction creation date */
    createdAt?: string;
    /** Loading state */
    isLoading?: boolean;
    /** Additional className */
    className?: string;
}

// ═══ Component ═══
export const TransactionHistoryTab: React.FC<TransactionHistoryTabProps> = ({
    logs,
    transactionType,
    currentStage,
    createdAt,
    isLoading = false,
    className,
}) => {
    const { isRTL, t } = useLanguage();

    const stageDefinitions = transactionType === 'purchase' ? PURCHASE_STAGES : SALES_STAGES;

    // ─── Stats ──────────────────────────────
    const stats = useMemo(() => {
        const uniqueUsers = new Set(
            logs.filter(l => l.performed_by_name).map(l => l.performed_by_name)
        );

        const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

        let ageText = '';
        if (createdAt) {
            try {
                ageText = formatDistanceToNow(new Date(createdAt), {
                    locale: isRTL ? ar : undefined,
                    addSuffix: false,
                });
            } catch {
                ageText = '-';
            }
        }

        return {
            age: ageText || '-',
            transitionsCount: logs.length,
            uniqueUsersCount: uniqueUsers.size,
            lastUpdate: lastLog?.performed_at
                ? formatTimestamp(lastLog.performed_at, isRTL)
                : '-',
        };
    }, [logs, createdAt, isRTL]);

    // ─── Loading ────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    // ─── Empty State ────────────────────────
    if (logs.length === 0 && !createdAt) {
        return (
            <div className={cn("text-center py-12", className)}>
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isRTL ? 'لا يوجد سجل نشاط بعد' : 'No activity log yet'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {isRTL
                        ? 'سيظهر هنا سجل كل العمليات على هذه المعاملة'
                        : 'All operations on this transaction will appear here'}
                </p>
            </div>
        );
    }

    // ─── Get stage info ─────────────────────
    const getStageInfo = (stageKey: string) => {
        const def = stageDefinitions[stageKey as PurchaseStage & SalesStage];
        if (!def) return { label: stageKey, color: 'bg-gray-500', icon: Circle };
        const IconComp = ICON_MAP[def.icon] || Circle;
        return {
            label: t(def.labelKey) || stageKey,
            color: def.color,
            icon: IconComp,
        };
    };

    return (
        <div className={cn("space-y-5", className)} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ─── Stat Cards ─────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={Clock}
                    label={isRTL ? 'عمر المعاملة' : 'Transaction Age'}
                    value={stats.age}
                    color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                    isRTL={isRTL}
                />
                <StatCard
                    icon={ArrowRightLeft}
                    label={isRTL ? 'عدد التحويلات' : 'Transitions'}
                    value={String(stats.transitionsCount)}
                    color="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30"
                    isRTL={isRTL}
                />
                <StatCard
                    icon={Users}
                    label={isRTL ? 'المستخدمون' : 'Users'}
                    value={String(stats.uniqueUsersCount)}
                    color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                    isRTL={isRTL}
                />
                <StatCard
                    icon={CalendarDays}
                    label={isRTL ? 'آخر تحديث' : 'Last Update'}
                    value={stats.lastUpdate}
                    color="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                    isRTL={isRTL}
                />
            </div>

            {/* ─── Timeline ──────────────────────── */}
            <div className="relative">
                {/* Vertical connector line */}
                <div
                    className={cn(
                        "absolute top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700",
                        isRTL ? 'right-4' : 'left-4',
                    )}
                />

                <div className="space-y-0">
                    {/* Creation event (always first) */}
                    {createdAt && (
                        <TimelineItem
                            icon={FileEdit}
                            iconBg="bg-gray-400"
                            title={isRTL ? 'إنشاء المعاملة' : 'Transaction Created'}
                            subtitle={isRTL ? 'تم إنشاء مسودة جديدة' : 'New draft created'}
                            timestamp={createdAt}
                            isRTL={isRTL}
                            isFirst={true}
                        />
                    )}

                    {/* Stage transition logs */}
                    {logs.map((log, index) => {
                        const toInfo = getStageInfo(log.to_stage);
                        const fromInfo = getStageInfo(log.from_stage);
                        const isLast = index === logs.length - 1 && log.to_stage === currentStage;

                        return (
                            <TimelineItem
                                key={log.id}
                                icon={toInfo.icon}
                                iconBg={toInfo.color}
                                title={
                                    isRTL
                                        ? `تحويل إلى ${toInfo.label}`
                                        : `Moved to ${toInfo.label}`
                                }
                                subtitle={
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                            <span className="opacity-60">{fromInfo.label}</span>
                                            <span className="mx-0.5">→</span>
                                            <span className="font-semibold">{toInfo.label}</span>
                                        </Badge>
                                        {log.generated_number && (
                                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] h-5 font-mono gap-1">
                                                <Hash className="w-2.5 h-2.5" />
                                                {log.generated_number}
                                            </Badge>
                                        )}
                                    </div>
                                }
                                timestamp={log.performed_at}
                                performedBy={log.performed_by_name}
                                notes={log.notes}
                                isRTL={isRTL}
                                isCurrent={isLast}
                            />
                        );
                    })}

                    {/* Current stage indicator */}
                    {currentStage && (
                        <TimelineItem
                            icon={getStageInfo(currentStage).icon}
                            iconBg={getStageInfo(currentStage).color}
                            title={
                                isRTL
                                    ? `المرحلة الحالية: ${getStageInfo(currentStage).label}`
                                    : `Current: ${getStageInfo(currentStage).label}`
                            }
                            isRTL={isRTL}
                            isCurrent={true}
                            isLast={true}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

// ─── Stat Card ──────────────────────────────────────────
interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
    isRTL: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, isRTL }) => (
    <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className={cn("min-w-0", isRTL ? "text-right" : "text-left")}>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{label}</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{value}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

// ─── Timeline Item ──────────────────────────────────────
interface TimelineItemProps {
    icon: React.ElementType;
    iconBg: string;
    title: string;
    subtitle?: React.ReactNode;
    timestamp?: string;
    performedBy?: string | null;
    notes?: string | null;
    isRTL: boolean;
    isFirst?: boolean;
    isCurrent?: boolean;
    isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
    icon: Icon,
    iconBg,
    title,
    subtitle,
    timestamp,
    performedBy,
    notes,
    isRTL,
    isFirst = false,
    isCurrent = false,
    isLast = false,
}) => {
    return (
        <div
            className={cn(
                "relative flex gap-4 pb-5",
                isRTL && "flex-row-reverse",
                isFirst && "pt-0",
                isLast && "pb-0",
            )}
        >
            {/* Icon dot */}
            <div className="relative z-10 shrink-0">
                <div
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm transition-all",
                        iconBg,
                        isCurrent && "ring-2 ring-offset-2 ring-current/30 scale-110",
                    )}
                >
                    <Icon className="w-3.5 h-3.5" />
                </div>
                {/* Pulse for current */}
                {isCurrent && (
                    <span className={cn(
                        "absolute inset-0 rounded-full animate-ping opacity-20",
                        iconBg,
                    )} />
                )}
            </div>

            {/* Content */}
            <div
                className={cn(
                    "flex-1 min-w-0 pb-1",
                    isRTL ? "text-right" : "text-left",
                )}
            >
                {/* Title */}
                <p className={cn(
                    "text-sm font-semibold text-gray-800 dark:text-gray-100",
                    isCurrent && "text-indigo-700 dark:text-indigo-300",
                )}>
                    {title}
                </p>

                {/* Subtitle / Badges */}
                {subtitle && (
                    <div className="mt-1">{subtitle}</div>
                )}

                {/* Meta: user + time */}
                {(performedBy || timestamp) && (
                    <div className={cn(
                        "flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500",
                        isRTL && "flex-row-reverse"
                    )}>
                        {performedBy && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {performedBy}
                            </span>
                        )}
                        {timestamp && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(timestamp, isRTL)}
                            </span>
                        )}
                    </div>
                )}

                {/* Notes */}
                {notes && (
                    <div className={cn(
                        "mt-2 px-3 py-2 rounded-lg text-xs italic bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700",
                        "text-gray-500 dark:text-gray-400",
                        isRTL ? "border-r-2 border-r-indigo-300" : "border-l-2 border-l-indigo-300",
                    )}>
                        <MessageCircle className="w-3 h-3 inline mr-1 opacity-50" />
                        {notes}
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══ Helpers ═══
function formatTimestamp(ts: string, isRTL: boolean): string {
    try {
        const date = new Date(ts);
        return format(date, 'dd/MM/yyyy HH:mm', {
            locale: isRTL ? ar : undefined,
        });
    } catch {
        return ts;
    }
}

export default TransactionHistoryTab;
