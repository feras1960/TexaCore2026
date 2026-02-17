/**
 * StatusDropdown — قائمة تغيير الحالة الديناميكية
 * يعرض الحالة الحالية كـ Badge قابل للنقر + قائمة منزلقة بالتحولات المتاحة
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    ChevronDown,
    ArrowRight,
    ArrowLeft,
    MessageSquare,
    ShieldCheck,
    Loader2,
    Clock,
    CircleCheck,
    XCircle,
    FileText,
    CheckCircle2,
    Package,
    BookOpen,
    Coins,
    AlertTriangle,
    Ban,
    Send,
    Lock,
    Receipt,
    Truck,
    Play,
    Circle
} from 'lucide-react';
import { statusService, STATUS_COLORS, type CustomStatus, type StatusTransition, type StatusColor } from '@/services/statusService';

// ═══ Icon mapping ═══
const ICON_MAP: Record<string, React.ComponentType<any>> = {
    FileText, Clock, CheckCircle: CheckCircle2, CheckCircle2, ShieldCheck,
    Package, BookOpen, Coins, CircleCheck, AlertTriangle, XCircle, Ban,
    Send, Lock, Receipt, Truck, Play, Loader2, Circle,
};

interface StatusDropdownProps {
    /** Document type: 'purchase_invoice' | 'sales_invoice' | 'purchase_order' | 'sales_order' */
    docType: string;
    /** Document ID (UUID) */
    docId: string;
    /** Current status code (e.g., 'draft', 'posted') */
    currentStatusCode: string;
    /** Tenant ID for isolation */
    tenantId?: string;
    /** Callback after status change */
    onStatusChange?: (newStatusCode: string) => void;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Disable interactions */
    disabled?: boolean;
    /** Additional CSS class */
    className?: string;
}

export function StatusDropdown({
    docType,
    docId,
    currentStatusCode,
    tenantId,
    onStatusChange,
    size = 'md',
    disabled = false,
    className,
}: StatusDropdownProps) {
    const { language, direction } = useLanguage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isRTL = direction === 'rtl';

    const [isOpen, setIsOpen] = useState(false);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [comment, setComment] = useState('');
    const [pendingTransition, setPendingTransition] = useState<{
        transition: StatusTransition;
        targetStatus: CustomStatus;
    } | null>(null);

    // ═══ Fetch all statuses for this doc type ═══
    const { data: allStatuses = [] } = useQuery({
        queryKey: ['dynamic_statuses', docType],
        queryFn: () => statusService.getStatuses(docType, tenantId),
        staleTime: 5 * 60 * 1000, // 5 minutes cache
    });

    // ═══ Current status object ═══
    const currentStatus = allStatuses.find(s => s.code === currentStatusCode);

    // ═══ Fetch allowed transitions from current status ═══
    const { data: allowedTransitions = [], isLoading: loadingTransitions } = useQuery({
        queryKey: ['status_transitions', docType, currentStatus?.id, user?.role],
        queryFn: async () => {
            if (!currentStatus?.id) return [];
            // Get all transitions from current status
            const { data, error } = await supabase
                .from('status_transitions')
                .select('*')
                .eq('doc_type', docType)
                .eq('from_status_id', currentStatus.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!currentStatus?.id && isOpen,
    });

    // ═══ Build transition targets ═══
    const transitionTargets = allowedTransitions.map(t => {
        const targetStatus = allStatuses.find(s => s.id === t.to_status_id);
        return { transition: t, targetStatus };
    }).filter(t => t.targetStatus != null) as Array<{ transition: StatusTransition; targetStatus: CustomStatus }>;

    // ═══ Mutation: Change status ═══
    const changeStatusMutation = useMutation({
        mutationFn: async ({ statusId, statusCode, commentText }: { statusId: string; statusCode: string; commentText?: string }) => {
            // 1. Record in status_history
            if (tenantId) {
                await statusService.changeStatus(tenantId, docType, docId, statusId, commentText);
            }

            // 2. Update the actual document status
            const isTransaction = docType === 'purchase_invoice' || docType === 'sales_invoice';
            const tableName = docType === 'purchase_invoice' ? 'purchase_transactions'
                : docType === 'sales_invoice' ? 'sales_transactions'
                    : docType === 'purchase_order' ? 'purchase_orders'
                        : docType === 'sales_order' ? 'sales_orders'
                            : null;

            if (tableName) {
                const updateField = isTransaction ? 'stage' : 'status';
                const { error } = await supabase
                    .from(tableName)
                    .update({ [updateField]: statusCode })
                    .eq('id', docId);
                if (error) throw error;
            }

            return statusCode;
        },
        onSuccess: (newStatusCode) => {
            toast.success(
                isRTL ? '✅ تم تغيير الحالة بنجاح' : '✅ Status changed successfully'
            );
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['purchase_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
            queryClient.invalidateQueries({ queryKey: ['sales_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
            queryClient.invalidateQueries({ queryKey: ['status_transitions'] });

            onStatusChange?.(newStatusCode);
            setIsOpen(false);
            setShowCommentBox(false);
            setComment('');
            setPendingTransition(null);
        },
        onError: (error: any) => {
            toast.error(isRTL ? `❌ خطأ: ${error.message}` : `❌ Error: ${error.message}`);
        },
    });

    // ═══ Handle transition click ═══
    const handleTransitionClick = useCallback((transition: StatusTransition, targetStatus: CustomStatus) => {
        if (transition.requires_comment || transition.requires_approval) {
            setPendingTransition({ transition, targetStatus });
            setShowCommentBox(true);
        } else {
            changeStatusMutation.mutate({
                statusId: targetStatus.id,
                statusCode: targetStatus.code,
            });
        }
    }, [changeStatusMutation]);

    // ═══ Confirm with comment ═══
    const handleConfirmWithComment = useCallback(() => {
        if (!pendingTransition) return;
        changeStatusMutation.mutate({
            statusId: pendingTransition.targetStatus.id,
            statusCode: pendingTransition.targetStatus.code,
            commentText: comment || undefined,
        });
    }, [pendingTransition, comment, changeStatusMutation]);

    // ═══ Get icon component ═══
    const getIcon = (iconName: string | null) => {
        if (!iconName) return Circle;
        return ICON_MAP[iconName] || Circle;
    };

    // ═══ Size config ═══
    const sizeConfig = {
        sm: { badge: 'text-xs px-2 py-0.5 gap-1', icon: 'w-3 h-3', chevron: 'w-3 h-3' },
        md: { badge: 'text-sm px-2.5 py-1 gap-1.5', icon: 'w-4 h-4', chevron: 'w-3.5 h-3.5' },
        lg: { badge: 'text-base px-3 py-1.5 gap-2', icon: 'w-5 h-5', chevron: 'w-4 h-4' },
    };

    // ═══ Current status color ═══
    const statusColor = (currentStatus?.color || 'gray') as StatusColor;
    const colorConfig = STATUS_COLORS[statusColor] || STATUS_COLORS.gray;
    const Icon = getIcon(currentStatus?.icon || null);
    const label = currentStatus
        ? (language === 'ar' ? currentStatus.name_ar : (currentStatus.name_en || currentStatus.name_ar))
        : currentStatusCode;

    const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                <button
                    className={cn(
                        'inline-flex items-center rounded-full border-0 font-medium transition-all',
                        'hover:ring-2 hover:ring-offset-1 hover:ring-opacity-50',
                        colorConfig.bg, colorConfig.text, colorConfig.dark,
                        `hover:ring-${statusColor}-300`,
                        sizeConfig[size].badge,
                        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                        className
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Icon className={sizeConfig[size].icon} />
                    <span>{label}</span>
                    {!disabled && <ChevronDown className={cn(sizeConfig[size].chevron, 'opacity-60')} />}
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="w-72 p-0 shadow-xl border-0 rounded-xl overflow-hidden"
                align={isRTL ? 'end' : 'start'}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    'px-4 py-3 border-b',
                    colorConfig.bg, colorConfig.text
                )}>
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-semibold text-sm">
                            {isRTL ? 'الحالة الحالية:' : 'Current Status:'}
                        </span>
                        <span className="font-bold text-sm">{label}</span>
                    </div>
                </div>

                {/* Transitions List */}
                {!showCommentBox ? (
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {loadingTransitions ? (
                            <div className="flex items-center justify-center py-4 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
                            </div>
                        ) : transitionTargets.length === 0 ? (
                            <div className="px-4 py-3 text-center text-gray-400 text-sm">
                                {currentStatus?.is_final
                                    ? (isRTL ? '🔒 هذه الحالة نهائية' : '🔒 This is a final status')
                                    : (isRTL ? 'لا توجد تحولات متاحة' : 'No transitions available')}
                            </div>
                        ) : (
                            transitionTargets.map(({ transition, targetStatus }) => {
                                const TargetIcon = getIcon(targetStatus.icon);
                                const targetColor = (targetStatus.color || 'gray') as StatusColor;
                                const targetColorConfig = STATUS_COLORS[targetColor] || STATUS_COLORS.gray;
                                const targetLabel = language === 'ar'
                                    ? targetStatus.name_ar
                                    : (targetStatus.name_en || targetStatus.name_ar);

                                return (
                                    <button
                                        key={transition.id}
                                        onClick={() => handleTransitionClick(transition, targetStatus)}
                                        disabled={changeStatusMutation.isPending}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-2.5 text-sm',
                                            'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                                            'disabled:opacity-50'
                                        )}
                                    >
                                        <ArrowIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <div className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                                            targetColorConfig.bg, targetColorConfig.text, targetColorConfig.dark
                                        )}>
                                            <TargetIcon className="w-3.5 h-3.5" />
                                            {targetLabel}
                                        </div>
                                        {/* Indicators */}
                                        <div className="flex items-center gap-1 mr-auto">
                                            {transition.requires_comment && (
                                                <MessageSquare className="w-3 h-3 text-amber-500" title={isRTL ? 'يتطلب تعليق' : 'Requires comment'} />
                                            )}
                                            {transition.requires_approval && (
                                                <ShieldCheck className="w-3 h-3 text-blue-500" title={isRTL ? 'يتطلب موافقة' : 'Requires approval'} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* Comment Box */
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <MessageSquare className="w-4 h-4" />
                            {pendingTransition?.transition.requires_comment
                                ? (isRTL ? 'أضف ملاحظة (مطلوب)' : 'Add a note (required)')
                                : (isRTL ? 'أضف ملاحظة (اختياري)' : 'Add a note (optional)')}
                        </div>
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={isRTL ? 'سبب تغيير الحالة...' : 'Reason for status change...'}
                            className="min-h-[80px] text-sm"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleConfirmWithComment}
                                disabled={
                                    changeStatusMutation.isPending ||
                                    (pendingTransition?.transition.requires_comment && !comment.trim())
                                }
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {changeStatusMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    isRTL ? 'تأكيد' : 'Confirm'
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setShowCommentBox(false);
                                    setPendingTransition(null);
                                    setComment('');
                                }}
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </Button>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

export default StatusDropdown;
