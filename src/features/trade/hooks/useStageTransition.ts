/**
 * useStageTransition — Hook لتحويل المراحل في دورة المشتريات/المبيعات
 * 
 * ✅ يُحدّث stage في DB
 * ✅ يُسجّل في transaction_stage_log
 * ✅ يولّد رقم المرحلة (PQ-, PO-, PI-)
 * ✅ يُبطل الكاش عند النجاح
 * ✅ يدعم المشتريات والمبيعات
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/app/providers/LanguageProvider';

// Stage label maps for UI
const PURCHASE_STAGE_LABELS: Record<string, { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    quotation: { ar: 'عرض سعر', en: 'Quotation' },
    order: { ar: 'أمر شراء', en: 'Purchase Order' },
    approved: { ar: 'معتمد', en: 'Approved' },
    receipt: { ar: 'استلام', en: 'Receipt' },
    invoice: { ar: 'فاتورة', en: 'Invoice' },
    posted: { ar: 'مُرحّل', en: 'Posted' },
    partial_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
    paid: { ar: 'مدفوع', en: 'Paid' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

const SALES_STAGE_LABELS: Record<string, { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    quotation: { ar: 'عرض سعر', en: 'Quotation' },
    reservation: { ar: 'حجز', en: 'Reservation' },
    order: { ar: 'أمر بيع', en: 'Sales Order' },
    delivery: { ar: 'تسليم', en: 'Delivery' },
    invoice: { ar: 'فاتورة', en: 'Invoice' },
    posted: { ar: 'مُرحّل', en: 'Posted' },
    partial_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
    paid: { ar: 'مدفوع', en: 'Paid' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

// Stage number prefixes (for document numbering)
const STAGE_PREFIXES: Record<string, string> = {
    quotation: 'PQ',
    order: 'PO',
    approved: 'PA',
    receipt: 'PR',
    invoice: 'PI',
    posted: 'PP',
};

// Determine the DB table based on original_table from data, or trade mode fallback
function getTableName(tradeMode: 'purchase' | 'sales', docData?: any): string {
    // Use original_table if provided (from PurchaseCycleList enrichment)
    if (docData?.original_table) {
        return docData.original_table;
    }
    // Fallback based on document type
    if (docData?.type) {
        const typeMap: Record<string, string> = {
            order: tradeMode === 'purchase' ? 'purchase_orders' : 'sales_orders',
            quotation: tradeMode === 'purchase' ? 'purchase_quotations' : 'quotations',
            request: 'purchase_requests',
            invoice: tradeMode === 'purchase' ? 'purchase_transactions' : 'sales_transactions',
            receipt: 'purchase_receipts',
            return: tradeMode === 'purchase' ? 'purchase_returns' : 'sales_returns',
        };
        if (typeMap[docData.type]) return typeMap[docData.type];
    }
    // Ultimate fallback
    return tradeMode === 'purchase' ? 'purchase_transactions' : 'sales_transactions';
}

interface UseStageTransitionOptions {
    tradeMode: 'purchase' | 'sales';
    documentId: string | null | undefined;
    currentData?: any;
    onSuccess?: (newStage: string) => void;
}

export function useStageTransition({
    tradeMode,
    documentId,
    currentData,
    onSuccess,
}: UseStageTransitionOptions) {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const queryClient = useQueryClient();
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const stageLabels = tradeMode === 'purchase' ? PURCHASE_STAGE_LABELS : SALES_STAGE_LABELS;

    /**
     * Advance to a new stage
     */
    const advanceStage = useCallback(async (targetStage: string, notes?: string) => {
        if (!documentId) {
            toast.error(isAr ? 'لا يوجد مستند محفوظ — احفظ أولاً' : 'No saved document — save first');
            return;
        }

        const currentStage = currentData?.stage || currentData?.status || 'draft';
        if (currentStage === targetStage) {
            toast.info(isAr ? 'المستند في هذه المرحلة بالفعل' : 'Document is already at this stage');
            return;
        }

        setIsTransitioning(true);
        try {
            const tableName = getTableName(tradeMode, currentData);

            // 1. Get current user
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) throw new Error('Not authenticated');

            // 2. Generate stage number (e.g., PQ-2026-001)
            const prefix = STAGE_PREFIXES[targetStage];
            let generatedNumber: string | null = null;
            if (prefix && currentData?.tenant_id) {
                const year = new Date().getFullYear();
                // Count existing documents at this stage for this tenant
                const { count } = await supabase
                    .from(tableName)
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', currentData.tenant_id)
                    .eq('stage', targetStage);

                const seq = (count || 0) + 1;
                generatedNumber = `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
            }

            // 3. Build update payload
            // Legacy tables (purchase_orders, purchase_quotations, etc.) use 'status'
            // New unified table (purchase_transactions) uses 'stage'
            const usesStageField = tableName === 'purchase_transactions' || tableName === 'sales_transactions';
            const stageFieldName = usesStageField ? 'stage' : 'status';

            const updatePayload: Record<string, any> = {
                [stageFieldName]: targetStage,
                updated_at: new Date().toISOString(),
            };

            // Set stage-specific timestamps
            const stageTimestampMap: Record<string, string> = {
                quotation: 'quoted_at',
                order: 'ordered_at',
                approved: 'approved_at',
                receipt: 'received_at',
                invoice: 'invoiced_at',
                posted: 'posted_at',
                cancelled: 'cancelled_at',
            };
            const tsField = stageTimestampMap[targetStage];
            if (tsField) {
                updatePayload[tsField] = new Date().toISOString();
            }

            // Set approval fields
            if (targetStage === 'approved') {
                updatePayload.approved_by = user.id;
            }

            // Set generated number
            if (generatedNumber) {
                updatePayload.stage_number = generatedNumber;
            }

            // Handle cancellation 
            if (targetStage === 'cancelled') {
                updatePayload.status = 'cancelled';
            }

            // Handle reopen
            if (targetStage === 'draft' && currentStage === 'cancelled') {
                updatePayload.status = 'draft';
                updatePayload.cancelled_at = null;
            }

            // 4. Update the document
            const { error: updateError } = await supabase
                .from(tableName)
                .update(updatePayload)
                .eq('id', documentId);

            if (updateError) {
                console.error('[StageTransition] ❌ Update error:', updateError);
                throw new Error(updateError.message);
            }

            // 5. Log the transition in transaction_stage_log
            const { error: logError } = await supabase
                .from('transaction_stage_log')
                .insert({
                    tenant_id: currentData?.tenant_id,
                    transaction_type: tradeMode === 'purchase' ? 'purchase' : 'sale',
                    transaction_id: documentId,
                    from_stage: currentStage,
                    to_stage: targetStage,
                    generated_number: generatedNumber,
                    notes: notes || null,
                    performed_by: user.id,
                    performed_by_name: user.user_metadata?.full_name || user.email || null,
                    performed_at: new Date().toISOString(),
                });

            if (logError) {
                console.warn('[StageTransition] ⚠️ Log insert failed (non-critical):', logError.message);
                // Non-critical — don't throw
            }

            // 6. Success!
            const fromLabel = stageLabels[currentStage] || { ar: currentStage, en: currentStage };
            const toLabel = stageLabels[targetStage] || { ar: targetStage, en: targetStage };

            toast.success(
                isAr
                    ? `✅ تم التحويل من "${fromLabel.ar}" إلى "${toLabel.ar}"${generatedNumber ? ` — رقم: ${generatedNumber}` : ''}`
                    : `✅ Moved from "${fromLabel.en}" to "${toLabel.en}"${generatedNumber ? ` — #${generatedNumber}` : ''}`
            );

            // 7. Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
            queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_transactions_list'] });
            queryClient.invalidateQueries({ queryKey: ['stage_logs'] });

            // 8. Callback
            onSuccess?.(targetStage);

        } catch (err: any) {
            console.error('[StageTransition] ❌ Error:', err);
            toast.error(
                isAr
                    ? `❌ فشل تحويل المرحلة: ${err.message}`
                    : `❌ Stage transition failed: ${err.message}`
            );
        } finally {
            setIsTransitioning(false);
        }
    }, [documentId, currentData, tradeMode, isAr, stageLabels, queryClient, onSuccess]);

    return {
        advanceStage,
        isTransitioning,
    };
}
