/**
 * ═══════════════════════════════════════════════════════════════
 * ⚡ TransactionActions — أزرار العمليات الديناميكية حسب المرحلة
 * ═══════════════════════════════════════════════════════════════
 * - يعرض أزرار التحويل المتاحة حسب المرحلة والصلاحيات
 * - حوار تأكيد للعمليات الحرجة
 * - ملاحظات مطلوبة للإلغاء/الإرجاع
 * - حالة Loading أثناء التنفيذ
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowRight,
    ArrowLeft,
    ChevronDown,
    Loader2,
    Check,
    XCircle,
    Package,
    Receipt,
    CreditCard,
    ShieldCheck,
    FileSearch,
    ClipboardList,
    FileEdit,
    CheckCircle2,
    ArrowLeftRight,
    Copy,
    Trash2,
    Pencil,
} from 'lucide-react';
import type { StageAdvanceResult } from '../../types';
import { cn } from '@/lib/utils';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
    ArrowRight,
    ArrowLeft,
    Check,
    XCircle,
    Package,
    Receipt,
    CreditCard,
    ShieldCheck,
    FileSearch,
    ClipboardList,
    FileEdit,
    CheckCircle2,
    ArrowLeftRight,
    Copy,
    Trash2,
    Pencil,
};

interface StageAction {
    key: string;
    targetStage: string;
    labelKey: string;
    labelAr: string;
    labelEn: string;
    icon: string;
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
    requiresConfirmation: boolean;
    requiresNotes: boolean;
    isAllowed: boolean;
    disabledReason?: string;
}

interface TransactionActionsProps {
    /** Available actions from useStageTransition */
    actions: StageAction[];
    /** Execute stage advancement */
    onAdvance: (targetStage: string, notes?: string) => Promise<StageAdvanceResult>;
    /** Is advancing in progress? */
    isAdvancing: boolean;
    /** Is editing? */
    isEditing?: boolean;
    /** On save */
    onSave?: () => Promise<void>;
    /** On edit toggle */
    onEdit?: () => void;
    /** On duplicate */
    onDuplicate?: () => void;
    /** On delete */
    onDelete?: () => void;
    /** Can delete? */
    canDelete?: boolean;
    /** Is saving? */
    isSaving?: boolean;
    /** Additional class */
    className?: string;
    /** Compact mode (icon-only buttons) */
    compact?: boolean;
}

export const TransactionActions: React.FC<TransactionActionsProps> = ({
    actions,
    onAdvance,
    isAdvancing,
    isEditing = false,
    onSave,
    onEdit,
    onDuplicate,
    onDelete,
    canDelete = false,
    isSaving = false,
    className,
    compact = false,
}) => {
    const { isRTL, t } = useLanguage();
    const [confirmAction, setConfirmAction] = useState<StageAction | null>(null);
    const [actionNotes, setActionNotes] = useState('');

    // Split actions: primary (first 2) and secondary (rest)
    const primaryActions = actions.filter(a => a.isAllowed).slice(0, 2);
    const secondaryActions = actions.filter(a => a.isAllowed).slice(2);
    const disabledActions = actions.filter(a => !a.isAllowed);

    const handleActionClick = useCallback((action: StageAction) => {
        if (action.requiresConfirmation || action.requiresNotes) {
            setConfirmAction(action);
            setActionNotes('');
        } else {
            onAdvance(action.targetStage);
        }
    }, [onAdvance]);

    const handleConfirm = useCallback(async () => {
        if (!confirmAction) return;
        await onAdvance(confirmAction.targetStage, actionNotes || undefined);
        setConfirmAction(null);
        setActionNotes('');
    }, [confirmAction, actionNotes, onAdvance]);

    const getIcon = (iconName: string) => {
        return ICON_MAP[iconName] || ArrowRight;
    };

    if (actions.length === 0 && !onSave && !onEdit) return null;

    return (
        <>
            <div
                className={cn(
                    'flex items-center gap-2 flex-wrap',
                    isRTL ? 'flex-row-reverse' : 'flex-row',
                    className
                )}
            >
                {/* Save button (when editing) */}
                {isEditing && onSave && (
                    <Button
                        onClick={onSave}
                        disabled={isSaving}
                        size={compact ? 'icon' : 'sm'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        {!compact && (isRTL ? 'حفظ' : 'Save')}
                    </Button>
                )}

                {/* Edit button (when not editing) */}
                {!isEditing && onEdit && (
                    <Button
                        onClick={onEdit}
                        variant="outline"
                        size={compact ? 'icon' : 'sm'}
                        className="gap-1.5"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        {!compact && (isRTL ? 'تعديل' : 'Edit')}
                    </Button>
                )}

                {/* Primary stage actions */}
                {primaryActions.map((action) => {
                    const Icon = getIcon(action.icon);
                    return (
                        <Button
                            key={action.key}
                            onClick={() => handleActionClick(action)}
                            disabled={isAdvancing || isEditing}
                            variant={action.variant}
                            size={compact ? 'icon' : 'sm'}
                            className={cn(
                                'gap-1.5 transition-all',
                                action.variant === 'default' && 'bg-indigo-600 hover:bg-indigo-700 text-white',
                                action.variant === 'destructive' && 'bg-red-600 hover:bg-red-700',
                            )}
                        >
                            {isAdvancing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Icon className="w-4 h-4" />
                            )}
                            {!compact && (isRTL ? action.labelAr : action.labelEn)}
                        </Button>
                    );
                })}

                {/* Secondary actions dropdown */}
                {(secondaryActions.length > 0 || onDuplicate || canDelete) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size={compact ? 'icon' : 'sm'}
                                className="gap-1"
                                disabled={isAdvancing || isEditing}
                            >
                                <ChevronDown className="w-4 h-4" />
                                {!compact && (isRTL ? 'المزيد' : 'More')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-56">
                            {/* Secondary stage actions */}
                            {secondaryActions.map((action) => {
                                const Icon = getIcon(action.icon);
                                return (
                                    <DropdownMenuItem
                                        key={action.key}
                                        onClick={() => handleActionClick(action)}
                                        className={cn(
                                            'gap-2 cursor-pointer',
                                            action.variant === 'destructive' && 'text-red-600',
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{isRTL ? action.labelAr : action.labelEn}</span>
                                    </DropdownMenuItem>
                                );
                            })}

                            {/* Utility actions */}
                            {(onDuplicate || canDelete) && secondaryActions.length > 0 && (
                                <DropdownMenuSeparator />
                            )}

                            {onDuplicate && (
                                <DropdownMenuItem
                                    onClick={onDuplicate}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span>{isRTL ? 'نسخ كمسودة جديدة' : 'Duplicate as Draft'}</span>
                                </DropdownMenuItem>
                            )}

                            {canDelete && onDelete && (
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="gap-2 cursor-pointer text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>{isRTL ? 'حذف' : 'Delete'}</span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Stage badge indicator */}
                {isAdvancing && (
                    <Badge variant="outline" className="gap-1.5 text-xs animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isRTL ? 'جاري التحويل...' : 'Advancing...'}
                    </Badge>
                )}
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isRTL ? 'تأكيد العملية' : 'Confirm Action'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.variant === 'destructive'
                                ? (isRTL
                                    ? `هل أنت متأكد من إلغاء هذه المعاملة؟ لا يمكن التراجع عن هذا.`
                                    : `Are you sure you want to cancel this transaction? This cannot be undone.`)
                                : (isRTL
                                    ? `هل تريد تحويل المعاملة إلى: ${confirmAction?.labelAr}؟`
                                    : `Do you want to advance to: ${confirmAction?.labelEn}?`)
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Notes input (required for cancel/return) */}
                    {confirmAction?.requiresNotes && (
                        <div className="py-2">
                            <Textarea
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                                placeholder={isRTL ? 'اكتب سبب الإلغاء...' : 'Enter reason...'}
                                className="min-h-[80px]"
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                        </div>
                    )}

                    <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : 'flex-row'}>
                        <AlertDialogCancel>
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={confirmAction?.requiresNotes && !actionNotes.trim()}
                            className={cn(
                                confirmAction?.variant === 'destructive'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            )}
                        >
                            {isRTL ? 'تأكيد' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default TransactionActions;
