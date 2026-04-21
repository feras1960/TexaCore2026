/**
 * ═══════════════════════════════════════════════════════════════
 * 📜 Activity Timeline — سجل النشاط المرئي
 * ═══════════════════════════════════════════════════════════════
 * 
 * يعرض دورة حياة المستند كـ Timeline بصري جميل
 * يدعم: الإنشاء، التأكيد، الترحيل، التعديل، الطباعة، الدفع...
 * 
 * الاستخدام:
 *   <ActivityTimeline 
 *     documentType="purchase" 
 *     documentId="uuid" 
 *   />
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Plus, CheckCircle2, FileCheck, Package, Pencil, Printer,
    CreditCard, Truck, XCircle, RotateCcw, Bell, Clock,
    ArrowUpCircle,
    History,
} from 'lucide-react';
import { activityLogService, type ActivityLogEntry, type DocumentTable } from '@/services/activityLogService';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// ═══════════════════════════════════════════════════════════════
// أنواع الأحداث — الأيقونات والألوان
// ═══════════════════════════════════════════════════════════════

const EVENT_CONFIG: Record<string, {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    label_ar: string;
    label_en: string;
}> = {
    created: {
        icon: Plus,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        label_ar: 'أُنشئ',
        label_en: 'Created',
    },
    saved: {
        icon: FileCheck,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label_ar: 'حُفظ',
        label_en: 'Saved',
    },
    confirmed: {
        icon: CheckCircle2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label_ar: 'تأكّد',
        label_en: 'Confirmed',
    },
    posted: {
        icon: ArrowUpCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
        label_ar: 'رُحّل',
        label_en: 'Posted',
    },
    stock_updated: {
        icon: Package,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50 dark:bg-teal-950/30',
        borderColor: 'border-teal-200 dark:border-teal-800',
        label_ar: 'تحديث المخزون',
        label_en: 'Stock Updated',
    },
    edited: {
        icon: Pencil,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        label_ar: 'عُدّل',
        label_en: 'Edited',
    },
    printed: {
        icon: Printer,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-900/30',
        borderColor: 'border-gray-200 dark:border-gray-700',
        label_ar: 'طُبع',
        label_en: 'Printed',
    },
    paid: {
        icon: CreditCard,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        label_ar: 'مدفوع بالكامل',
        label_en: 'Paid in Full',
    },
    partially_paid: {
        icon: CreditCard,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        label_ar: 'دفع جزئي',
        label_en: 'Partially Paid',
    },
    received: {
        icon: Package,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        label_ar: 'مُستلم بالكامل',
        label_en: 'Fully Received',
    },
    partially_received: {
        icon: Package,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50 dark:bg-teal-950/30',
        borderColor: 'border-teal-200 dark:border-teal-800',
        label_ar: 'استلام جزئي',
        label_en: 'Partially Received',
    },
    delivered: {
        icon: Truck,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
        borderColor: 'border-cyan-200 dark:border-cyan-800',
        label_ar: 'تم التسليم للعميل',
        label_en: 'Delivered to Customer',
    },
    cancelled: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        label_ar: 'مُلغى',
        label_en: 'Cancelled',
    },
    unposted: {
        icon: RotateCcw,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        label_ar: 'إلغاء ترحيل',
        label_en: 'Unposted',
    },
    reminder_sent: {
        icon: Bell,
        color: 'text-pink-500',
        bgColor: 'bg-pink-50 dark:bg-pink-950/30',
        borderColor: 'border-pink-200 dark:border-pink-800',
        label_ar: 'تذكير',
        label_en: 'Reminder Sent',
    },
    // ── مراحل دورة حياة الفاتورة الكاملة ──
    quotation: {
        icon: FileCheck,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        label_ar: 'عرض سعر',
        label_en: 'Quotation Issued',
    },
    order: {
        icon: CheckCircle2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label_ar: 'أمر بيع',
        label_en: 'Order Placed',
    },
    reserved: {
        icon: Package,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
        borderColor: 'border-cyan-200 dark:border-cyan-800',
        label_ar: 'حجز بضاعة',
        label_en: 'Stock Reserved',
    },
    approved: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        label_ar: 'تم الاعتماد',
        label_en: 'Approved',
    },
    loading: {
        icon: Package,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        label_ar: 'بدء التجميع والتحميل',
        label_en: 'Loading Started',
    },
    dispatched: {
        icon: Truck,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        label_ar: 'تم الإخراج من المستودع',
        label_en: 'Dispatched from Warehouse',
    },
    in_transit: {
        icon: Truck,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label_ar: 'في الطريق للفرع',
        label_en: 'In Transit to Branch',
    },
    at_branch: {
        icon: CheckCircle2,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50 dark:bg-teal-950/30',
        borderColor: 'border-teal-200 dark:border-teal-800',
        label_ar: 'وصل الفرع',
        label_en: 'Arrived at Branch',
    },
    reopened: {
        icon: RotateCcw,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-900/30',
        borderColor: 'border-gray-200 dark:border-gray-700',
        label_ar: 'إعادة فتح',
        label_en: 'Reopened',
    },
    stage_changed: {
        icon: ArrowUpCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
        label_ar: 'تغيير مرحلة',
        label_en: 'Stage Changed',
    },
};

// الإعداد الافتراضي للأحداث غير المعرّفة
const DEFAULT_EVENT_CONFIG = {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
    label_ar: 'حدث',
    label_en: 'Event',
};


// ═══════════════════════════════════════════════════════════════
// المساعدات
// ═══════════════════════════════════════════════════════════════

function formatDateTime(isoString: string | null | undefined, locale: string): { date: string; time: string } {
    // ✅ Guard: reject empty / null / undefined values
    if (!isoString || typeof isoString !== 'string' || isoString.trim() === '') {
        return { date: locale === 'ar' ? 'تاريخ غير محدد' : 'Unknown date', time: '' };
    }
    try {
        const d = new Date(isoString);
        // Guard against NaN (invalid date string)
        if (isNaN(d.getTime())) {
            return { date: locale === 'ar' ? 'تاريخ غير صالح' : 'Invalid date', time: '' };
        }
        const date = d.toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        const time = d.toLocaleTimeString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return { date, time };
    } catch {
        return { date: isoString, time: '' };
    }
}

function renderChangeDetails(details: Record<string, any> | null | undefined, isAr: boolean): React.ReactNode {
    if (!details) return null;

    // تعديلات محددة
    if (details.changes) {
        const entries = Object.entries(details.changes);
        if (entries.length === 0) return null;

        return (
            <div className="mt-1.5 space-y-0.5">
                {entries.slice(0, 5).map(([field, change]: [string, any]) => (
                    <div key={field} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="font-medium">{field}:</span>
                        <span className="line-through text-red-400">{String(change?.old ?? '—')}</span>
                        <span>→</span>
                        <span className="text-emerald-600 font-medium">{String(change?.new ?? '—')}</span>
                    </div>
                ))}
                {entries.length > 5 && (
                    <div className="text-xs text-muted-foreground/60">
                        +{entries.length - 5} {isAr ? 'تغييرات أخرى' : 'more changes'}
                    </div>
                )}
            </div>
        );
    }

    // تفاصيل عامة (مرحلة جديدة، عدد الطباعات، إلخ)
    const simpleEntries = Object.entries(details).filter(
        ([key]) => !['changes', 'reason'].includes(key)
    );

    if (simpleEntries.length === 0) return null;

    return (
        <div className="mt-1 text-xs text-muted-foreground/80">
            {simpleEntries.slice(0, 3).map(([key, val]) => (
                <span key={key} className="mr-2 rtl:ml-2 rtl:mr-0">
                    {key}: <span className="font-medium">{String(val)}</span>
                </span>
            ))}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ActivityTimelineProps {
    documentType: 'purchase' | 'sale' | 'journal_entry' | 'container';
    documentId: string;
    /** تحميل مسبق — إذا كان السجل متوفراً */
    preloadedLog?: ActivityLogEntry[];
    /** ارتفاع максимalen */
    maxHeight?: string;
    /** عرض مختصر (آخر N أحداث فقط) */
    compact?: boolean;
    compactLimit?: number;
}

const TABLE_TYPE_MAP: Record<string, DocumentTable> = {
    purchase: 'purchase_transactions',
    sale: 'sales_transactions',
    journal_entry: 'journal_entries',
    container: 'containers',
};


// ═══════════════════════════════════════════════════════════════
// المكون
// ═══════════════════════════════════════════════════════════════

export function ActivityTimeline({
    documentType,
    documentId,
    preloadedLog,
    maxHeight = '400px',
    compact = false,
    compactLimit = 5,
}: ActivityTimelineProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [events, setEvents] = useState<ActivityLogEntry[]>(preloadedLog || []);
    const [loading, setLoading] = useState(!preloadedLog);

    useEffect(() => {
        if (preloadedLog) {
            setEvents(preloadedLog);
            return;
        }

        const table = TABLE_TYPE_MAP[documentType];
        if (!table || !documentId) return;

        setLoading(true);
        activityLogService.getLog(table, documentId)
            .then(log => {
                setEvents(log);
            })
            .finally(() => setLoading(false));
    }, [documentType, documentId, preloadedLog]);

    // ─── حالة التحميل ───
    if (loading) {
        return (
            <div className="space-y-3 p-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ─── لا توجد أحداث ───
    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
                <History className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">
                    {isAr ? 'لا توجد أحداث مسجلة بعد' : 'No events recorded yet'}
                </p>
            </div>
        );
    }

    // ─── ترتيب: الأحدث في الأعلى ───
    const sortedEvents = [...events].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );

    const displayEvents = compact ? sortedEvents.slice(0, compactLimit) : sortedEvents;

    return (
        <ScrollArea style={{ maxHeight }} className="px-1">
            <div className="relative">
                {/* الخط العمودي */}
                <div
                    className="absolute top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-muted-foreground/15 to-transparent"
                    style={{ [isAr ? 'right' : 'left']: '15px' }}
                />

                <div className="space-y-1">
                    {displayEvents.map((event, index) => {
                        const config = EVENT_CONFIG[event.event] || DEFAULT_EVENT_CONFIG;
                        const Icon = config.icon;
                        const { date, time } = formatDateTime(event.at, isAr ? 'ar' : 'en');
                        const isLast = index === displayEvents.length - 1;
                        const isFirst = index === 0;

                        return (
                            <div
                                key={`${event.event}-${event.at}-${index}`}
                                className={`
                                    relative flex items-start gap-3 py-2.5 px-2 rounded-lg
                                    transition-all duration-200 hover:bg-muted/50
                                    ${isFirst ? 'opacity-100' : 'opacity-90 hover:opacity-100'}
                                `}
                            >
                                {/* الأيقونة */}
                                <div
                                    className={`
                                        relative z-10 flex items-center justify-center
                                        h-8 w-8 rounded-full shrink-0
                                        border-2 ${config.borderColor} ${config.bgColor}
                                        shadow-sm transition-transform duration-200
                                        ${isFirst ? 'scale-110 ring-2 ring-primary/20' : ''}
                                    `}
                                >
                                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                </div>

                                {/* المحتوى */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] px-1.5 py-0 ${config.color} ${config.borderColor} font-semibold`}
                                        >
                                            {isAr ? config.label_ar : config.label_en}
                                        </Badge>

                                        {event.by_name && (
                                            <span className="text-xs text-muted-foreground">
                                                {isAr ? 'بواسطة' : 'by'}{' '}
                                                <span className="font-medium text-foreground/80">
                                                    {event.by_name}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                    {/* التاريخ والوقت */}
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground/70">
                                        <Clock className="h-3 w-3" />
                                        <span>{date}</span>
                                        <span className="text-muted-foreground/40">•</span>
                                        <span>{time}</span>
                                    </div>

                                    {/* ═══ تفاصيل دورة الحياة المعززة ═══ */}
                                    {event.details && (() => {
                                        const d = event.details!;
                                        const enrichedDetails: React.ReactNode[] = [];

                                        // الفرع
                                        if (d.branch_name || d.branch) {
                                            enrichedDetails.push(
                                                <span key="branch" className="inline-flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400">
                                                    🏪 {d.branch_name || d.branch}
                                                </span>
                                            );
                                        }

                                        // المستودع
                                        if (d.warehouse_name || d.warehouse) {
                                            enrichedDetails.push(
                                                <span key="warehouse" className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                                                    🏭 {d.warehouse_name || d.warehouse}
                                                </span>
                                            );
                                        }

                                        // العميل / المورد
                                        if (d.party_name || d.customer_name || d.supplier_name) {
                                            enrichedDetails.push(
                                                <span key="party" className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                                                    🏢 {d.party_name || d.customer_name || d.supplier_name}
                                                </span>
                                            );
                                        }

                                        // عدد الأصناف
                                        if (d.items_count && d.items_count > 0) {
                                            enrichedDetails.push(
                                                <span key="items" className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                                                    📦 {d.items_count} {isAr ? 'بند' : 'items'}
                                                </span>
                                            );
                                        }

                                        // المبلغ
                                        if (d.amount || d.total_amount) {
                                            const amt = d.amount || d.total_amount;
                                            enrichedDetails.push(
                                                <span key="amount" className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-600 dark:text-gray-400">
                                                    💰 {Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    {d.currency ? ` ${d.currency}` : ''}
                                                </span>
                                            );
                                        }

                                        // تغيير المرحلة
                                        if (d.stage_from && d.stage_to) {
                                            const stageLabels: Record<string, { ar: string; en: string }> = {
                                                draft: { ar: 'مسودة', en: 'Draft' },
                                                quotation: { ar: 'عرض سعر', en: 'Quotation' },
                                                order: { ar: 'أمر', en: 'Order' },
                                                confirmed: { ar: 'مؤكد', en: 'Confirmed' },
                                                approved: { ar: 'معتمد', en: 'Approved' },
                                                loading: { ar: 'تحميل', en: 'Loading' },
                                                dispatched: { ar: 'أُرسل', en: 'Dispatched' },
                                                in_transit: { ar: 'في الطريق', en: 'In Transit' },
                                                at_branch: { ar: 'في الفرع', en: 'At Branch' },
                                                posted: { ar: 'مرحّل', en: 'Posted' },
                                                received: { ar: 'مستلم', en: 'Received' },
                                                in_delivery: { ar: 'قيد التسليم', en: 'In Delivery' },
                                                delivered: { ar: 'مسلّم', en: 'Delivered' },
                                                cancelled: { ar: 'ملغي', en: 'Cancelled' },
                                                paid: { ar: 'مدفوع', en: 'Paid' },
                                            };
                                            const from = stageLabels[d.stage_from] || { ar: d.stage_from, en: d.stage_from };
                                            const to = stageLabels[d.stage_to] || { ar: d.stage_to, en: d.stage_to };
                                            enrichedDetails.push(
                                                <span key="stage" className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                                                    {isAr ? from.ar : from.en}
                                                    <span className="text-muted-foreground/50">→</span>
                                                    {isAr ? to.ar : to.en}
                                                </span>
                                            );
                                        }

                                        // رقم الفاتورة
                                        if (d.invoice_number || d.document_number) {
                                            enrichedDetails.push(
                                                <span key="docnum" className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                                    📄 {d.invoice_number || d.document_number}
                                                </span>
                                            );
                                        }

                                        // ملاحظة مرفقة
                                        if (d.note) {
                                            enrichedDetails.push(
                                                <span key="note" className="block w-full text-[10px] text-muted-foreground/70 italic mt-0.5">
                                                    "{d.note}"
                                                </span>
                                            );
                                        }

                                        if (enrichedDetails.length > 0) {
                                            return (
                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1">
                                                    {enrichedDetails}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* تفاصيل التغييرات */}
                                    {event.details && renderChangeDetails(event.details, isAr)}

                                    {/* السبب */}
                                    {event.details?.reason && (
                                        <div className="mt-1 text-xs italic text-muted-foreground/60">
                                            "{event.details.reason}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* مؤشر المزيد */}
                {compact && sortedEvents.length > compactLimit && (
                    <div className="text-center py-2 text-xs text-muted-foreground/50">
                        +{sortedEvents.length - compactLimit} {isAr ? 'أحداث أخرى' : 'more events'}
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

export default ActivityTimeline;
