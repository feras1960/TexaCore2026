/**
 * 📝 ActivityTab V2 — تبويب سجل النشاط المحسّن
 * 
 * يجمع بين:
 * ① Timeline: عرض كل الأنشطة والملاحظات بترتيب زمني
 * ② Note Input: حقل كتابة الملاحظات في الأسفل
 * ③ Quick Events: أزرار سريعة لتسجيل أحداث (اتصال، إرسال بريد، إلخ)
 * ④ Pinned Notes: إمكانية تثبيت الملاحظات المهمة
 * 
 * البيانات: جدول document_activity
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
    Send,
    StickyNote,
    Pin,
    PinOff,
    Trash2,
    MoreHorizontal,
    Clock,
    RefreshCw,
    ChevronDown,
    Phone,
    Mail,
    MessageCircle,
    Users,
    CheckCircle,
    XCircle,
    Printer,
    FileText,
    ShoppingCart,
    Banknote,
    CreditCard,
    PackageCheck,
    ArrowRightLeft,
    BookCheck,
    Ban,
    Download,
    Copy,
    Paperclip,
    Bell,
    Star,
    Loader2,
    Zap,
    FilePlus,
    CheckCircle2,
    PackageOpen,
    BookX,
    Coins,
    Shield,
    Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
    documentActivityService,
    EVENT_DEFINITIONS,
    QUICK_EVENTS,
    type DocumentActivityEntry,
    type EventCode,
    type ActivityType,
} from '@/services/documentActivityService';

// ═══════════════════════════════════════════════════════════════
// Icon Resolver
// ═══════════════════════════════════════════════════════════════
const ICON_MAP: Record<string, any> = {
    Send, StickyNote, Pin, Phone, Mail, MessageCircle, Users,
    CheckCircle, XCircle, Printer, FileText, ShoppingCart,
    Banknote, CreditCard, PackageCheck, ArrowRightLeft,
    BookCheck, Ban, Download, Copy, Paperclip, Bell, Star,
    Clock, FilePlus, CheckCircle2, PackageOpen, BookX, Coins,
    Trash2, Shield, Zap, RefreshCw, Pencil,
    FileEdit: Pencil, // alias — lucide renamed FileEdit to Pencil
};

function getIconComponent(iconName: string) {
    return ICON_MAP[iconName] || StickyNote;
}

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ActivityTabV2Props {
    /** معرّف المستند */
    documentId?: string;
    /** نوع الكيان */
    entityType?: string;
    /** نوع المستند (trade_invoice, etc.) — يُستخدم إذا لم يُعطى entityType */
    docType?: string;
    /** وضع التجارة (purchase/sales) */
    tradeMode?: string;
    /** وضع العرض */
    mode?: 'view' | 'edit' | 'create';
    /** معرّف المستأجر (اختياري) */
    tenantId?: string;
    /** callback عند تغيير البيانات */
    onChange?: (updates: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function ActivityTabV2({
    documentId,
    entityType: propEntityType,
    docType,
    tradeMode,
    mode = 'view',
    tenantId: propTenantId,
    onChange,
}: ActivityTabV2Props) {
    const { direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const { company, companyId } = useCompany();
    const tenantId = propTenantId || company?.tenant_id || companyId;

    // Resolve entity type
    const entityType = useMemo(() => {
        if (propEntityType) return propEntityType;
        // Map docType to entity type
        const map: Record<string, string> = {
            trade_invoice: tradeMode === 'purchase' ? 'purchase_invoice' : 'sales_invoice',
            trade_order: tradeMode === 'purchase' ? 'purchase_order' : 'sales_order',
            trade_quotation: 'quotation',
            trade_container: 'container',
            trade_delivery: 'delivery',
            trade_receipt: 'receipt',
            trade_return: 'return',
            trade_request: 'purchase_request',
            journal: 'journal_entry',
        };
        return map[docType || ''] || docType || 'document';
    }, [propEntityType, docType, tradeMode]);

    // State
    const [activities, setActivities] = useState<DocumentActivityEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [showQuickEvents, setShowQuickEvents] = useState(false);
    const [filter, setFilter] = useState<'all' | 'notes' | 'events' | 'milestones' | 'lifecycle'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ─── Load activities ───
    const loadActivities = useCallback(async () => {
        if (!documentId) return;
        setLoading(true);
        try {
            const data = await documentActivityService.getActivities(entityType, documentId, {
                limit: 100,
            });
            setActivities(data);
            onChange?.({ activity_count: data.length });
        } catch (err) {
            console.error('Failed to load activities:', err);
        }
        setLoading(false);
    }, [documentId, entityType, onChange]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    // ═══ Auto-refresh when mode changes (e.g. after save: edit→view) ═══
    useEffect(() => {
        if (mode === 'view' && documentId) {
            // Delay slightly to allow logger inserts to complete
            const timer = setTimeout(() => loadActivities(), 800);
            return () => clearTimeout(timer);
        }
    }, [mode, documentId]);

    // ─── Add note ───
    const handleAddNote = async () => {
        if (!noteText.trim() || !documentId || !tenantId) return;

        setSubmitting(true);
        try {
            const result = await documentActivityService.addNote(
                entityType, documentId, tenantId, noteText.trim()
            );
            if (result.success) {
                setNoteText('');
                await loadActivities();
                toast.success(isRTL ? 'تمت إضافة الملاحظة' : 'Note added');
            } else {
                toast.error(result.error || (isRTL ? 'فشل في إضافة الملاحظة' : 'Failed to add note'));
            }
        } catch (err) {
            toast.error(isRTL ? 'خطأ' : 'Error');
        }
        setSubmitting(false);
    };

    // ─── Add quick event ───
    const handleQuickEvent = async (eventCode: EventCode) => {
        if (!documentId || !tenantId) return;

        setSubmitting(true);
        try {
            const result = await documentActivityService.logEvent(
                entityType, documentId, tenantId, eventCode
            );
            if (result.success) {
                await loadActivities();
                setShowQuickEvents(false);
                const def = EVENT_DEFINITIONS[eventCode];
                toast.success(isRTL
                    ? `✅ ${def?.labelAr || eventCode}`
                    : `✅ ${def?.labelEn || eventCode}`
                );
            }
        } catch (err) {
            toast.error(isRTL ? 'خطأ' : 'Error');
        }
        setSubmitting(false);
    };

    // ─── Toggle pin ───
    const handleTogglePin = async (entry: DocumentActivityEntry) => {
        const success = await documentActivityService.togglePin(entry.id, !entry.is_pinned);
        if (success) {
            await loadActivities();
        }
    };

    // ─── Delete ───
    const handleDelete = async (entry: DocumentActivityEntry) => {
        if (!confirm(isRTL ? 'هل تريد حذف هذا السجل؟' : 'Delete this entry?')) return;
        const success = await documentActivityService.deleteActivity(entry.id);
        if (success) {
            await loadActivities();
            toast.success(isRTL ? 'تم الحذف' : 'Deleted');
        }
    };

    // ─── Format time ───
    const formatTime = (timestamp: string): string => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return isRTL ? 'الآن' : 'just now';
        if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
        if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
        if (diffDays < 7) return isRTL ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

        return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
            month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined,
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatFullDate = (timestamp: string): string => {
        return new Date(timestamp).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    // ─── Filter activities ───
    const filteredActivities = useMemo(() => {
        // Pinned always first
        let sorted = [...activities];
        sorted.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        if (filter === 'notes') return sorted.filter(a => a.activity_type === 'note');
        if (filter === 'events') return sorted.filter(a => a.activity_type === 'event' || a.activity_type === 'system');
        if (filter === 'milestones') return sorted.filter(a => a.activity_type === 'milestone');
        return sorted;
    }, [activities, filter]);

    // ─── Counts ───
    const counts = useMemo(() => ({
        all: activities.length,
        notes: activities.filter(a => a.activity_type === 'note').length,
        events: activities.filter(a => a.activity_type === 'event' || a.activity_type === 'system').length,
        milestones: activities.filter(a => a.activity_type === 'milestone').length,
    }), [activities]);

    // ─── No document ───
    if (!documentId || mode === 'create') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <StickyNote className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">
                    {isRTL ? 'احفظ المستند أولاً لتسجيل النشاط' : 'Save the document first to track activity'}
                </p>
            </div>
        );
    }

    // ─── Map docType to ActivityTimeline documentType ───
    // Only trade documents, journals, and containers have activity_log JSONB column
    // ⚠️ Transfers use stock_transfers table — no activity_log JSONB, so exclude them
    const isTransferMode = tradeMode === 'transfer';
    const LIFECYCLE_DOC_TYPES = ['trade_invoice', 'trade_order', 'trade_delivery', 'trade_receipt', 'trade_return', 'trade_request', 'trade_container', 'journal'];
    const hasLifecycleLog = !isTransferMode && LIFECYCLE_DOC_TYPES.includes(docType || '');

    const lifecycleDocType = useMemo(() => {
        if (!hasLifecycleLog) return null;
        if (docType === 'journal') return 'journal_entry' as const;
        if (docType === 'trade_container') return 'container' as const;
        if (tradeMode === 'purchase') return 'purchase' as const;
        return 'sale' as const;
    }, [docType, tradeMode, hasLifecycleLog]);

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full">
                {/* ═══ Header: Filter Chips + Refresh ═══ */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-1">
                        {([
                            { key: 'all', labelAr: 'الكل', labelEn: 'All' },
                            { key: 'lifecycle', labelAr: 'دورة الحياة', labelEn: 'Lifecycle' },
                            { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes' },
                            { key: 'events', labelAr: 'أحداث', labelEn: 'Events' },
                            { key: 'milestones', labelAr: 'محطات', labelEn: 'Milestones' },
                        ] as const).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                                    filter === f.key
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
                                )}
                            >
                                {isRTL ? f.labelAr : f.labelEn}
                                {f.key !== 'lifecycle' && (counts as any)[f.key] > 0 && (
                                    <span className={cn(
                                        "ms-1 text-[9px]",
                                        filter === f.key ? "opacity-80" : "text-gray-400"
                                    )}>
                                        {(counts as any)[f.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={loadActivities}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-gray-400", loading && "animate-spin")} />
                    </Button>
                </div>

                {/* ═══ Lifecycle Timeline (from activity_log JSONB) ═══ */}
                {filter === 'lifecycle' && hasLifecycleLog && lifecycleDocType && (
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="px-1 py-3">
                            <ActivityTimeline
                                documentType={lifecycleDocType}
                                documentId={documentId!}
                                maxHeight="calc(100vh - 300px)"
                            />
                        </div>
                    </ScrollArea>
                )}
                {filter === 'lifecycle' && !hasLifecycleLog && (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Clock className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-xs">{isRTL ? 'دورة الحياة غير متاحة لهذا النوع' : 'Lifecycle not available for this type'}</p>
                        <p className="text-[10px] mt-1 text-gray-300">
                            {isRTL ? 'استخدم قسم الملاحظات والأحداث' : 'Use Notes & Events section'}
                        </p>
                    </div>
                )}

                {/* ═══ Manual Timeline (from document_activity table) ═══ */}
                {filter !== 'lifecycle' && (
                    <>
                        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
                            <div className="px-3 py-3">
                                {/* Compact lifecycle preview when showing 'all' */}
                                {filter === 'all' && documentId && hasLifecycleLog && lifecycleDocType && (
                                    <div className="mb-4 pb-3 border-b border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                                {isRTL ? 'دورة حياة المستند' : 'Document Lifecycle'}
                                            </span>
                                        </div>
                                        <ActivityTimeline
                                            documentType={lifecycleDocType}
                                            documentId={documentId}
                                            compact
                                            compactLimit={4}
                                            maxHeight="180px"
                                        />
                                    </div>
                                )}
                                {loading && activities.length === 0 ? (
                                    <div className="flex items-center justify-center h-40">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                                    </div>
                                ) : filteredActivities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                        <Clock className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-xs">{isRTL ? 'لا يوجد نشاط بعد' : 'No activity yet'}</p>
                                        <p className="text-[10px] mt-1 text-gray-300">
                                            {isRTL ? 'اكتب ملاحظة أو سجل حدثاً' : 'Write a note or log an event'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Timeline vertical line */}
                                        <div className={cn(
                                            "absolute top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800",
                                            isRTL ? "right-[18px]" : "left-[18px]"
                                        )} />

                                        <div className="space-y-3">
                                            {filteredActivities.map((entry) => {
                                                const eventDef = entry.event_code ? EVENT_DEFINITIONS[entry.event_code] : null;
                                                const IconComp = eventDef ? getIconComponent(eventDef.icon) : StickyNote;
                                                const isNote = entry.activity_type === 'note';
                                                const isMilestone = entry.activity_type === 'milestone';
                                                // Fallback label for unknown/unregistered event codes
                                                const fallbackLabel = entry.event_code
                                                    ? (isRTL ? entry.event_code.replace(/_/g, ' ') : entry.event_code.replace(/_/g, ' '))
                                                    : (isRTL ? 'حدث' : 'Event');

                                                return (
                                                    <div key={entry.id} className="relative flex gap-2.5 group">
                                                        {/* Icon circle */}
                                                        <div className={cn(
                                                            "shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 transition-shadow",
                                                            isMilestone ? "border-emerald-300 dark:border-emerald-700 shadow-sm shadow-emerald-100" : "border-white dark:border-gray-900",
                                                            eventDef?.bgColor || (isNote ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800'),
                                                            eventDef?.color || (isNote ? 'text-yellow-600' : 'text-gray-500'),
                                                        )}>
                                                            <IconComp className="w-3.5 h-3.5" />
                                                        </div>

                                                        {/* Content card */}
                                                        <div className={cn(
                                                            "flex-1 rounded-lg border p-2.5 transition-all min-w-0",
                                                            entry.is_pinned
                                                                ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                                                                : isMilestone
                                                                    ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                                                                    : "bg-white border-gray-100 dark:bg-gray-800/50 dark:border-gray-700",
                                                        )}>
                                                            {/* Top row: user + time + actions */}
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Avatar className="w-4 h-4">
                                                                        <AvatarFallback className="text-[8px] bg-erp-primary/10 text-erp-primary">
                                                                            {(entry.user_name || 'U').charAt(0)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                                        {entry.user_name}
                                                                    </span>
                                                                    {entry.is_pinned && (
                                                                        <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-[10px] text-gray-400 cursor-default">
                                                                                {formatTime(entry.created_at)}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-[10px]">
                                                                            {formatFullDate(entry.created_at)}
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    {/* Actions menu */}
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <button className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                                                                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent
                                                                            className="w-32 p-1"
                                                                            align={isRTL ? 'start' : 'end'}
                                                                            side="bottom"
                                                                        >
                                                                            <button
                                                                                onClick={() => handleTogglePin(entry)}
                                                                                className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                                            >
                                                                                {entry.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                                                {entry.is_pinned
                                                                                    ? (isRTL ? 'إلغاء التثبيت' : 'Unpin')
                                                                                    : (isRTL ? 'تثبيت' : 'Pin')
                                                                                }
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDelete(entry)}
                                                                                className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                                {isRTL ? 'حذف' : 'Delete'}
                                                                            </button>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            </div>

                                                            {/* Event label (for non-note entries) */}
                                                            {!isNote && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[10px] px-1.5 py-0 mb-1 inline-flex",
                                                                        eventDef ? eventDef.color : 'text-gray-500',
                                                                    )}
                                                                >
                                                                    {eventDef
                                                                        ? (isRTL ? eventDef.labelAr : eventDef.labelEn)
                                                                        : fallbackLabel
                                                                    }
                                                                </Badge>
                                                            )}

                                                            {/* Content text */}
                                                            {entry.content && (
                                                                <p className={cn(
                                                                    "text-xs leading-relaxed whitespace-pre-wrap break-words",
                                                                    isNote ? "text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-400",
                                                                )}>
                                                                    {entry.content}
                                                                </p>
                                                            )}

                                                            {/* ═══ Enriched Metadata Details ═══ */}
                                                            {!isNote && entry.metadata && (() => {
                                                                const m = entry.metadata;
                                                                const details: React.ReactNode[] = [];

                                                                // Stage transition
                                                                if (m.stage_from && m.stage_to) {
                                                                    const stageLabels: Record<string, { ar: string; en: string }> = {
                                                                        draft: { ar: 'مسودة', en: 'Draft' },
                                                                        confirmed: { ar: 'مؤكد', en: 'Confirmed' },
                                                                        posted: { ar: 'مرحّل', en: 'Posted' },
                                                                        received: { ar: 'مستلم', en: 'Received' },
                                                                        in_delivery: { ar: 'قيد التسليم', en: 'In Delivery' },
                                                                        cancelled: { ar: 'ملغي', en: 'Cancelled' },
                                                                    };
                                                                    const from = stageLabels[m.stage_from] || { ar: m.stage_from, en: m.stage_from };
                                                                    const to = stageLabels[m.stage_to] || { ar: m.stage_to, en: m.stage_to };
                                                                    details.push(
                                                                        <span key="stage" className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                                                                            {isRTL ? from.ar : from.en}
                                                                            <span className="text-gray-400">→</span>
                                                                            {isRTL ? to.ar : to.en}
                                                                        </span>
                                                                    );
                                                                }

                                                                // User who performed action
                                                                if (m.created_by_name || m.confirmed_by_name || m.posted_by_name) {
                                                                    const name = m.created_by_name || m.confirmed_by_name || m.posted_by_name;
                                                                    details.push(
                                                                        <span key="user" className="text-[10px] text-gray-500">
                                                                            👤 {name}
                                                                        </span>
                                                                    );
                                                                }

                                                                // Items count
                                                                if (m.items_count && m.items_count > 0) {
                                                                    details.push(
                                                                        <span key="items" className="text-[10px] text-gray-500">
                                                                            📦 {m.items_count} {isRTL ? 'بند' : 'items'}
                                                                        </span>
                                                                    );
                                                                }

                                                                // Total amount
                                                                if (m.total_amount && m.total_amount > 0) {
                                                                    details.push(
                                                                        <span key="amount" className="text-[10px] font-mono text-gray-600 dark:text-gray-400">
                                                                            💰 {Number(m.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                            {m.currency ? ` ${m.currency}` : ''}
                                                                        </span>
                                                                    );
                                                                }

                                                                // Change details (for edits)
                                                                if (m.items_added || m.items_removed || m.items_modified) {
                                                                    const changeParts: string[] = [];
                                                                    if (m.items_added > 0) changeParts.push(isRTL ? `+${m.items_added} بند` : `+${m.items_added} added`);
                                                                    if (m.items_removed > 0) changeParts.push(isRTL ? `-${m.items_removed} بند` : `-${m.items_removed} removed`);
                                                                    if (m.items_modified > 0) changeParts.push(isRTL ? `✏️ ${m.items_modified} معدل` : `✏️ ${m.items_modified} modified`);
                                                                    if (changeParts.length > 0) {
                                                                        details.push(
                                                                            <span key="changes" className="text-[10px] text-amber-600 dark:text-amber-400">
                                                                                {changeParts.join(' • ')}
                                                                            </span>
                                                                        );
                                                                    }
                                                                }

                                                                // Changes summary
                                                                if (m.changes_summary_ar || m.changes_summary_en) {
                                                                    const summary = isRTL ? m.changes_summary_ar : m.changes_summary_en;
                                                                    if (summary && !entry.content) {
                                                                        details.push(
                                                                            <span key="summary" className="text-[10px] text-gray-500 italic">
                                                                                {summary}
                                                                            </span>
                                                                        );
                                                                    }
                                                                }

                                                                // Invoice number
                                                                if (m.invoice_number) {
                                                                    details.push(
                                                                        <span key="inv" className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                                                            📄 {m.invoice_number}
                                                                        </span>
                                                                    );
                                                                }

                                                                // Party name
                                                                if (m.party_name) {
                                                                    details.push(
                                                                        <span key="party" className="text-[10px] text-gray-500">
                                                                            🏢 {m.party_name}
                                                                        </span>
                                                                    );
                                                                }

                                                                // Attachment details
                                                                if (m.file_name) {
                                                                    details.push(
                                                                        <span key="file" className="text-[10px] text-blue-600 dark:text-blue-400">
                                                                            📎 {m.file_name}
                                                                            {m.file_type ? ` (${m.file_type})` : ''}
                                                                            {m.file_size ? ` — ${(m.file_size / 1024).toFixed(0)}KB` : ''}
                                                                        </span>
                                                                    );
                                                                }

                                                                if (details.length === 0) return null;

                                                                return (
                                                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1">
                                                                        {details}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* ═══ Bottom: Note Input + Quick Events ═══ */}
                        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5">
                            {/* Quick Events Row */}
                            {showQuickEvents && (
                                <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 mb-1.5 font-medium">
                                        {isRTL ? '⚡ أحداث سريعة' : '⚡ Quick Events'}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {QUICK_EVENTS.map((code) => {
                                            const def = EVENT_DEFINITIONS[code];
                                            if (!def) return null;
                                            const Ic = getIconComponent(def.icon);
                                            return (
                                                <button
                                                    key={code}
                                                    onClick={() => handleQuickEvent(code)}
                                                    disabled={submitting}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium",
                                                        "hover:shadow-sm transition-all",
                                                        "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
                                                        def.color,
                                                    )}
                                                >
                                                    <Ic className="w-3 h-3" />
                                                    {isRTL ? def.labelAr : def.labelEn}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="flex gap-2">
                                {/* Quick events toggle */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-9 w-9 p-0 shrink-0",
                                                showQuickEvents && "bg-erp-primary/10 text-erp-primary"
                                            )}
                                            onClick={() => setShowQuickEvents(!showQuickEvents)}
                                        >
                                            <Zap className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px]">
                                        {isRTL ? 'أحداث سريعة' : 'Quick Events'}
                                    </TooltipContent>
                                </Tooltip>

                                {/* Textarea */}
                                <div className="flex-1 relative">
                                    <Textarea
                                        ref={textareaRef}
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder={isRTL ? 'اكتب ملاحظة...' : 'Write a note...'}
                                        className={cn(
                                            "min-h-[36px] max-h-[120px] resize-none text-xs py-2 pe-10",
                                            "border-gray-200 dark:border-gray-700",
                                            "focus:border-erp-primary focus:ring-1 focus:ring-erp-primary/30",
                                        )}
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddNote();
                                            }
                                            // Shift+Enter = سطر جديد (السلوك الافتراضي)
                                        }}
                                    />
                                    {/* Send button inside textarea */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "absolute h-7 w-7 p-0",
                                            isRTL ? "left-1.5 bottom-1" : "right-1.5 bottom-1",
                                            noteText.trim()
                                                ? "text-erp-primary hover:bg-erp-primary/10"
                                                : "text-gray-300 cursor-default",
                                        )}
                                        disabled={!noteText.trim() || submitting}
                                        onClick={handleAddNote}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className={cn("w-4 h-4", isRTL && "rotate-180")} />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Hint */}
                            <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1 text-center">
                                {isRTL ? 'Enter للإرسال • Shift+Enter لسطر جديد' : 'Enter to send • Shift+Enter for new line'}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}

export default ActivityTabV2;
