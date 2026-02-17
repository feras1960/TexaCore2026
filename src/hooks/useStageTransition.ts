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
import purchaseTransactionService from '@/services/purchaseTransactionService';
import salesTransactionService from '@/services/salesTransactionService';
import { getStageConfig } from '@/config/stageConfig';
import type {
    TransactionType,
    StageTransitionResult,
    StageAction,
} from '@/types/transactions';


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
