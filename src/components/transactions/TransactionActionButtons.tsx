/**
 * ═══════════════════════════════════════════════════════════════
 * 🎯 TransactionActionButtons — أزرار ديناميكية لكل مرحلة
 * ═══════════════════════════════════════════════════════════════
 * يعرض الأزرار المتاحة للمرحلة الحالية مع:
 * - مودال تأكيد قبل التحويل
 * - حقل ملاحظات عند الحاجة
 * - حقل سبب عند الإلغاء
 * - حالة تحميل أثناء التحويل
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getAvailableActions, isEditableStage, isLockedStage } from '@/config/stageConfig';
import type { StageAction, TransactionType } from '@/types/transactions';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { Loader2, Lock, Save, Printer } from 'lucide-react';

interface TransactionActionButtonsProps {
    type: TransactionType;
    currentStage: string;
    /** دالة تحويل المرحلة */
    onAdvance: (targetStage: string, notes?: string, reason?: string) => Promise<any>;
    /** حالة التحميل */
    isAdvancing?: boolean;
    /** دالة الحفظ (للمسودات) */
    onSave?: () => Promise<any>;
    /** حالة حفظ */
    isSaving?: boolean;
    /** دالة الطباعة */
    onPrint?: () => void;
    /** تخطيط أفقي أو عمودي */
    layout?: 'horizontal' | 'vertical';
    className?: string;
}

export const TransactionActionButtons: React.FC<TransactionActionButtonsProps> = ({
    type,
    currentStage,
    onAdvance,
    isAdvancing = false,
    onSave,
    isSaving = false,
    onPrint,
    layout = 'horizontal',
    className,
}) => {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';

    // ─── حالة مودال التأكيد ───
    const [confirmAction, setConfirmAction] = useState<StageAction | null>(null);
    const [notes, setNotes] = useState('');
    const [reason, setReason] = useState('');

    const actions = getAvailableActions(
        type === 'purchase' ? 'purchase' : 'sale',
        currentStage
    );

    const editable = isEditableStage(currentStage);
    const locked = isLockedStage(currentStage);

    // ─── معالجة الضغط على الزر ───
    const handleClick = (action: StageAction) => {
        if (action.requires_confirmation || action.requires_notes || action.requires_reason) {
            setConfirmAction(action);
            setNotes('');
            setReason('');
        } else {
            // تنفيذ مباشر بدون تأكيد
            onAdvance(action.target_stage);
        }
    };

    // ─── تنفيذ التحويل بعد التأكيد ───
    const handleConfirm = async () => {
        if (!confirmAction) return;

        await onAdvance(
            confirmAction.target_stage,
            confirmAction.requires_notes ? notes : undefined,
            confirmAction.requires_reason ? reason : undefined,
        );

        setConfirmAction(null);
        setNotes('');
        setReason('');
    };

    // ─── Map variant ───
    const mapVariant = (variant: string) => {
        switch (variant) {
            case 'success': return 'teal' as const;
            case 'default': return 'default' as const;
            case 'destructive': return 'destructive' as const;
            case 'outline': return 'outline' as const;
            case 'secondary': return 'secondary' as const;
            default: return 'default' as const;
        }
    };

    return (
        <>
            <div
                className={cn(
                    'flex gap-2 flex-wrap',
                    layout === 'vertical' ? 'flex-col' : 'flex-row items-center',
                    className,
                )}
                dir={direction}
            >
                {/* 🔒 مؤشر القفل */}
                {locked && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="font-medium">
                            {isAr ? 'مرحّلة — لا يمكن التعديل' : 'Posted — Read Only'}
                        </span>
                    </div>
                )}

                {/* 💾 زر الحفظ (للمسودات فقط) */}
                {editable && onSave && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSave}
                        disabled={isSaving || isAdvancing}
                        className="gap-1.5"
                    >
                        {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        {isAr ? 'حفظ' : 'Save'}
                    </Button>
                )}

                {/* 🖨️ زر الطباعة */}
                {onPrint && !editable && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPrint}
                        disabled={isAdvancing}
                        className="gap-1.5"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        {isAr ? 'طباعة' : 'Print'}
                    </Button>
                )}

                {/* ─── أزرار المراحل ─── */}
                {actions.map((action) => (
                    <Button
                        key={action.target_stage}
                        variant={mapVariant(action.variant)}
                        size="sm"
                        onClick={() => handleClick(action)}
                        disabled={isAdvancing}
                        className={cn(
                            'gap-1.5 transition-all duration-200',
                            action.variant === 'destructive' && 'hover:bg-red-600',
                            action.variant === 'success' && 'hover:shadow-lg hover:shadow-teal-500/20',
                        )}
                    >
                        {isAdvancing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <span>{action.icon}</span>
                        )}
                        {isAr ? action.label_ar : action.label_en}
                    </Button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* 🔔 مودال التأكيد                                   */}
            {/* ═══════════════════════════════════════════════════ */}
            <AlertDialog
                open={!!confirmAction}
                onOpenChange={(open) => {
                    if (!open) setConfirmAction(null);
                }}
            >
                <AlertDialogContent dir={direction} className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className={cn(isAr && 'text-right')}>
                            {confirmAction && (
                                <span className="flex items-center gap-2">
                                    <span className="text-lg">{confirmAction.icon}</span>
                                    {isAr ? confirmAction.label_ar : confirmAction.label_en}
                                </span>
                            )}
                        </AlertDialogTitle>
                        <AlertDialogDescription className={cn(isAr && 'text-right')}>
                            {isAr
                                ? 'هل أنت متأكد من تنفيذ هذا الإجراء؟ لن يمكن التراجع عنه.'
                                : 'Are you sure you want to perform this action? This cannot be undone.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* ─── حقل الملاحظات ─── */}
                    {confirmAction?.requires_notes && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {isAr ? 'ملاحظات' : 'Notes'}
                            </label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={isAr ? 'أضف ملاحظة (اختياري)...' : 'Add a note (optional)...'}
                                className="min-h-[80px] resize-none"
                                dir={direction}
                            />
                        </div>
                    )}

                    {/* ─── حقل السبب (للإلغاء) ─── */}
                    {confirmAction?.requires_reason && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-red-600 dark:text-red-400">
                                {isAr ? 'سبب الإلغاء *' : 'Reason for Cancellation *'}
                            </label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={isAr ? 'يجب إدخال سبب الإلغاء...' : 'Enter cancellation reason...'}
                                className="min-h-[80px] resize-none border-red-200 dark:border-red-800 focus-visible:ring-red-500"
                                dir={direction}
                                required
                            />
                        </div>
                    )}

                    <AlertDialogFooter className={cn('gap-2', isAr && 'flex-row-reverse')}>
                        <AlertDialogCancel className="gap-1.5">
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={
                                isAdvancing ||
                                (confirmAction?.requires_reason && !reason.trim())
                            }
                            className={cn(
                                'gap-1.5',
                                confirmAction?.variant === 'destructive'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : confirmAction?.variant === 'success'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : '',
                            )}
                        >
                            {isAdvancing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span>{confirmAction?.icon}</span>
                            )}
                            {confirmAction && (isAr ? confirmAction.label_ar : confirmAction.label_en)}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default TransactionActionButtons;
