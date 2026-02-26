/**
 * ═══════════════════════════════════════════════════════════════
 * 🔄 useStageTransition — هوك تحويل المراحل
 * ═══════════════════════════════════════════════════════════════
 * يُدير عملية تحويل مرحلة المعاملة مع:
 * - التأكيد قبل التحويل
 * - إظهار حالة التحميل
 * - إدارة الأخطاء
 * - تحديث الواجهة بعد التحويل
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCompany } from './useCompany';
import purchaseTransactionService from '@/services/purchaseTransactionService';
import salesTransactionService from '@/services/salesTransactionService';
import { documentActivityService } from '@/services/documentActivityService';
import { getStageConfig } from '@/config/stageConfig';
import type {
    TransactionType,
    StageTransitionResult,
    StageAction,
} from '@/types/transactions';

/** Maps target stage to activity event code */
const STAGE_TO_EVENT: Record<string, string> = {
    quotation: 'quotation_sent',
    reservation: 'reservation_created',
    order: 'order_created',
    approved: 'confirmed',
    confirmed: 'confirmed',
    receipt: 'receipt_started',
    partially_received: 'partially_received',
    received: 'receipt_received',
    delivery: 'delivery_started',
    invoice: 'invoice_created',
    posted: 'posted',
    partial_paid: 'payment_received',
    paid: 'fully_paid',
    cancelled: 'cancelled',
    draft: 'reopened',
};

interface UseStageTransitionOptions {
    /** نوع المعاملة */
    type: TransactionType;
    /** معرف المعاملة */
    transactionId: string;
    /** callback بعد نجاح التحول */
    onSuccess?: (result: StageTransitionResult) => void;
    /** callback عند الخطأ */
    onError?: (error: string) => void;
}

interface UseStageTransitionReturn {
    /** تنفيذ التحويل */
    advance: (
        targetStage: string,
        notes?: string,
        cancellationReason?: string
    ) => Promise<StageTransitionResult>;
    /** حالة التحميل */
    isAdvancing: boolean;
    /** آخر خطأ */
    error: string | null;
    /** الأزرار المتاحة لمرحلة معينة */
    getActions: (currentStage: string) => StageAction[];
    /** تنظيف الخطأ */
    clearError: () => void;
}

export function useStageTransition({
    type,
    transactionId,
    onSuccess,
    onError,
}: UseStageTransitionOptions): UseStageTransitionReturn {
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { company } = useCompany();
    const tenantId = company?.tenant_id;

    const service = type === 'purchase'
        ? purchaseTransactionService
        : salesTransactionService;

    const advance = useCallback(
        async (
            targetStage: string,
            notes?: string,
            cancellationReason?: string
        ): Promise<StageTransitionResult> => {
            if (!user?.id) {
                const err = 'المستخدم غير مسجل الدخول';
                setError(err);
                onError?.(err);
                return { success: false, error: err };
            }

            setIsAdvancing(true);
            setError(null);

            try {
                const result = await service.advanceStage({
                    transaction_type: type,
                    transaction_id: transactionId,
                    new_stage: targetStage,
                    user_id: user.id,
                    user_name: (user as any).fullName || (user as any).email || null,
                    notes,
                    cancellation_reason: cancellationReason,
                });

                if (result.success) {
                    // ═══ Auto-log stage transition to activity ═══
                    if (tenantId) {
                        const entityType = type === 'purchase' ? 'purchase_invoice' : 'sales_invoice';
                        const eventCode = STAGE_TO_EVENT[targetStage] || `stage_${targetStage}`;
                        documentActivityService.logEvent(
                            entityType,
                            transactionId,
                            tenantId,
                            eventCode,
                            notes || undefined,
                            {
                                target_stage: targetStage,
                                transaction_type: type,
                                cancellation_reason: cancellationReason || undefined,
                            },
                        ).catch(err => console.warn('[StageTransition] Activity log failed:', err));
                    }
                    onSuccess?.(result);
                } else {
                    const errMsg = result.error || 'فشل التحويل';
                    setError(errMsg);
                    onError?.(errMsg);
                }

                return result;
            } catch (err: any) {
                const errMsg = err.message || 'خطأ غير متوقع';
                setError(errMsg);
                onError?.(errMsg);
                return { success: false, error: errMsg };
            } finally {
                setIsAdvancing(false);
            }
        },
        [user, service, type, transactionId, onSuccess, onError]
    );

    const getActions = useCallback(
        (currentStage: string): StageAction[] => {
            const stageType = type === 'purchase' ? 'purchase' : 'sale';
            const config = getStageConfig(stageType, currentStage);
            return config?.actions || [];
        },
        [type]
    );

    const clearError = useCallback(() => setError(null), []);

    return {
        advance,
        isAdvancing,
        error,
        getActions,
        clearError,
    };
}

export default useStageTransition;
