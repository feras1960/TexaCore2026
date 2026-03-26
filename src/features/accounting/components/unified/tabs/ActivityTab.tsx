/**
 * Activity Tab - تبويب سجل النشاط
 * يعرض سجل التعديلات والأحداث على المستند من جدول audit_logs
 * 
 * ✅ بيانات فعلية من قاعدة البيانات (audit_logs)
 * ✅ عرض التغييرات بالتفصيل (old → new)
 * ✅ Timeline تفاعلي
 */

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Clock,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Plus,
    RefreshCw,
    Eye,
    Printer,
    Lock,
    Unlock,
    AlertTriangle,
    FileText,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Activity event types (mapped from audit_logs.action)
type ActivityEventType =
    | 'create'
    | 'update'
    | 'delete'
    | 'confirm'
    | 'unconfirm'
    | 'post'
    | 'unpost'
    | 'view'
    | 'print'
    | 'lock'
    | 'unlock';

interface AuditLogEntry {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name: string | null;
    old_values: any;
    new_values: any;
    changes: any;
    user_id: string;
    severity: string;
    created_at: string;
    metadata: any;
    // Joined user info
    user_name?: string;
}

interface ActivityTabProps {
    /** Document ID to show activity for */
    documentId?: string;
    /** Entity type (table name) for filtering */
    entityType?: string;
    /** Fallback: events passed directly (for backward compatibility) */
    events?: any[];
    loading?: boolean;
    useArabicNumerals?: boolean;
}

// Icon and color mapping for event types
const eventConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
    create: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40' },
    update: { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
    delete: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/40' },
    confirm: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
    unconfirm: { icon: XCircle, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
    post: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40' },
    unpost: { icon: XCircle, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
    view: { icon: Eye, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    print: { icon: Printer, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    lock: { icon: Lock, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
    unlock: { icon: Unlock, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40' },
};

// Fields to exclude from change display (internal/system fields)
const EXCLUDED_FIELDS = new Set([
    'updated_at', 'created_at', 'tenant_id', 'company_id',
    'id', 'version', '_source',
]);

// Human-readable field names
const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
    status: { ar: 'الحالة', en: 'Status' },
    total_amount: { ar: 'المبلغ الإجمالي', en: 'Total Amount' },
    grand_total: { ar: 'الإجمالي الكبير', en: 'Grand Total' },
    notes: { ar: 'الملاحظات', en: 'Notes' },
    customer_id: { ar: 'العميل', en: 'Customer' },
    supplier_id: { ar: 'المورد', en: 'Supplier' },
    currency: { ar: 'العملة', en: 'Currency' },
    date: { ar: 'التاريخ', en: 'Date' },
    due_date: { ar: 'تاريخ الاستحقاق', en: 'Due Date' },
    discount_percent: { ar: 'نسبة الخصم', en: 'Discount %' },
    warehouse_id: { ar: 'المستودع', en: 'Warehouse' },
    confirmation_status: { ar: 'حالة التأكيد', en: 'Confirmation' },
    payment_terms_days: { ar: 'أيام الدفع', en: 'Payment Days' },
    order_number: { ar: 'رقم الأمر', en: 'Order #' },
    invoice_number: { ar: 'رقم الفاتورة', en: 'Invoice #' },
};

export function ActivityTab({
    documentId,
    entityType,
    events: propEvents,
    loading: propLoading = false,
    useArabicNumerals = false,
}: ActivityTabProps) {
    const { direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const { companyId } = useCompany();

    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // ─── Fetch audit logs from database ───
    const fetchAuditLogs = useCallback(async () => {
        if (!documentId && !entityType) return;

        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            // Filter by document ID
            if (documentId) {
                query = query.eq('entity_id', documentId);
            }

            // Filter by entity type (table name)
            if (entityType) {
                query = query.eq('entity_type', entityType);
            }

            const { data, error } = await query;

            if (error) {
                console.warn('Failed to fetch audit logs:', error.message);
                setAuditLogs([]);
                return;
            }

            // Try to get user names
            const userIds = [...new Set((data || []).map((log: any) => log.user_id).filter(Boolean))];
            let userMap: Record<string, string> = {};

            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name')
                    .in('id', userIds);

                if (profiles) {
                    profiles.forEach((p: any) => {
                        userMap[p.id] = p.full_name || p.id;
                    });
                }
            }

            const logs: AuditLogEntry[] = (data || []).map((log: any) => ({
                ...log,
                user_name: userMap[log.user_id] || (isRTL ? 'مستخدم' : 'User'),
            }));

            setAuditLogs(logs);
        } catch (err) {
            console.error('Audit log fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [documentId, entityType, isRTL]);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    // ─── Toggle expand/collapse for changes ───
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ─── Get action label ───
    const getActionLabel = (action: string): string => {
        const labels: Record<string, { ar: string; en: string }> = {
            create: { ar: 'تم الإنشاء', en: 'Created' },
            update: { ar: 'تم التعديل', en: 'Updated' },
            delete: { ar: 'تم الحذف', en: 'Deleted' },
            confirm: { ar: 'تم التأكيد', en: 'Confirmed' },
            unconfirm: { ar: 'إلغاء تأكيد', en: 'Unconfirmed' },
            post: { ar: 'تم الترحيل', en: 'Posted' },
            unpost: { ar: 'إلغاء الترحيل', en: 'Unposted' },
            view: { ar: 'تم العرض', en: 'Viewed' },
            print: { ar: 'تم الطباعة', en: 'Printed' },
            lock: { ar: 'تم القفل', en: 'Locked' },
            unlock: { ar: 'تم فتح القفل', en: 'Unlocked' },
        };
        return labels[action] ? (isRTL ? labels[action].ar : labels[action].en) : action;
    };

    // ─── Format relative time ───
    const getRelativeTime = (timestamp: string): string => {
        const now = new Date();
        const eventDate = new Date(timestamp);
        const diffMs = now.getTime() - eventDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return isRTL ? 'الآن' : 'just now';
        if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
        if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
        if (diffDays < 7) return isRTL ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

        return eventDate.toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    // ─── Extract meaningful changes from old/new values ───
    const getChanges = (log: AuditLogEntry): Array<{ field: string; oldValue: string; newValue: string }> => {
        // If changes field is populated, use it
        if (log.changes && typeof log.changes === 'object') {
            const changesObj = log.changes;
            return Object.entries(changesObj)
                .filter(([key]) => !EXCLUDED_FIELDS.has(key))
                .map(([key, value]) => {
                    const oldV = log.old_values?.[key];
                    return {
                        field: FIELD_LABELS[key] ? (isRTL ? FIELD_LABELS[key].ar : FIELD_LABELS[key].en) : key,
                        oldValue: typeof oldV === 'object' ? JSON.stringify(oldV) : String(oldV ?? '-'),
                        newValue: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-'),
                    };
                })
                .slice(0, 10); // Limit to 10 changes
        }

        // Fallback: diff old_values vs new_values
        if (log.old_values && log.new_values) {
            const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
            for (const key of Object.keys(log.new_values)) {
                if (EXCLUDED_FIELDS.has(key)) continue;
                const oldV = log.old_values[key];
                const newV = log.new_values[key];
                if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
                    changes.push({
                        field: FIELD_LABELS[key] ? (isRTL ? FIELD_LABELS[key].ar : FIELD_LABELS[key].en) : key,
                        oldValue: typeof oldV === 'object' ? JSON.stringify(oldV) : String(oldV ?? '-'),
                        newValue: typeof newV === 'object' ? JSON.stringify(newV) : String(newV ?? '-'),
                    });
                }
            }
            return changes.slice(0, 10);
        }

        return [];
    };

    // ─── Determine severity badge ───
    const getSeverityBadge = (severity: string) => {
        if (severity === 'warning') return <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-600 border-amber-200">⚠️</Badge>;
        if (severity === 'error' || severity === 'critical') return <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-50 text-red-600 border-red-200">❌</Badge>;
        return null;
    };

    // ─── Use prop events if no documentId (backward compatibility) ───
    const isDbMode = !!(documentId || entityType);
    const displayLoading = isDbMode ? loading : propLoading;
    const displayLogs = isDbMode ? auditLogs : [];

    // Loading state
    if (displayLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    // Empty state
    if (displayLogs.length === 0 && (!propEvents || propEvents.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">{isRTL ? 'لا يوجد نشاط مسجل' : 'No activity recorded'}</p>
                {isDbMode && (
                    <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs" onClick={fetchAuditLogs}>
                        <RefreshCw className="w-3 h-3" />
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <ScrollArea className="h-[400px]">
            <div className="relative px-2">
                {/* Refresh button */}
                {isDbMode && (
                    <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px] text-gray-400" onClick={fetchAuditLogs}>
                            <RefreshCw className="w-3 h-3" />
                            {isRTL ? 'تحديث' : 'Refresh'}
                        </Button>
                    </div>
                )}

                {/* Timeline Line */}
                <div className={cn(
                    "absolute top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700",
                    isRTL ? "right-6" : "left-6"
                )} />

                {/* Events */}
                <div className="space-y-4 pb-4">
                    {displayLogs.map((log) => {
                        const config = eventConfig[log.action] || eventConfig.update;
                        const IconComponent = config?.icon || FileText;
                        const changes = getChanges(log);
                        const isExpanded = expandedIds.has(log.id);

                        return (
                            <div
                                key={log.id}
                                className="relative flex gap-3"
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10",
                                    config?.bgColor || 'bg-gray-100',
                                    config?.color || 'text-gray-500'
                                )}>
                                    <IconComponent className="w-4 h-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-5 h-5">
                                                <AvatarFallback className="text-[9px] bg-erp-primary/10 text-erp-primary">
                                                    {(log.user_name || 'U').charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                                                {log.user_name}
                                            </span>
                                            {getSeverityBadge(log.severity)}
                                        </div>
                                        <span className="text-[10px] text-gray-400">
                                            {getRelativeTime(log.created_at)}
                                        </span>
                                    </div>

                                    {/* Event Type */}
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] px-1.5 py-0",
                                            config?.color || ''
                                        )}>
                                            {getActionLabel(log.action)}
                                        </Badge>
                                        {log.entity_name && (
                                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">
                                                {log.entity_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Changes Toggle */}
                                    {changes.length > 0 && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => toggleExpand(log.id)}
                                                className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                {isRTL
                                                    ? `${changes.length} تغيير`
                                                    : `${changes.length} change${changes.length > 1 ? 's' : ''}`
                                                }
                                            </button>

                                            {isExpanded && (
                                                <div className="mt-1.5 space-y-1 bg-gray-50 dark:bg-gray-900 rounded-md p-2">
                                                    {changes.map((change, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                                            <span className="text-gray-500 min-w-[70px] font-medium">{change.field}:</span>
                                                            {change.oldValue && change.oldValue !== '-' && (
                                                                <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1 py-0.5 rounded line-through max-w-[100px] truncate">
                                                                    {change.oldValue}
                                                                </span>
                                                            )}
                                                            <span className="text-gray-400">→</span>
                                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 py-0.5 rounded max-w-[100px] truncate">
                                                                {change.newValue}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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

// Keep backward compatibility export
export function generateMockActivityEvents(documentId: string): any[] {
    // Deprecated — now fetches from database
    return [];
}

export default ActivityTab;
