/**
 * 🔔 useDocumentActivityLogger — Hook لتسجيل أحداث المستند تلقائياً
 * 
 * يُستخدم في UnifiedAccountingSheet لتسجيل الأحداث المهمة
 * مثل: الإنشاء، الحفظ، التأكيد، الترحيل، إضافة بنود، إرفاق ملفات، الطباعة، إلخ
 * 
 * V2: سجل شامل لدورة حياة الفاتورة
 * - من أنشأ ومتى
 * - كل حفظ وتعديل مع تفاصيل ما تغير
 * - إضافة/حذف بنود
 * - تغيير الحالات
 * - المرفقات
 */

import { useCallback, useRef, useEffect } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { documentActivityService, type EventCode } from '@/services/documentActivityService';
import { supabase } from '@/lib/supabase';

interface UseDocumentActivityLoggerParams {
    documentId?: string;
    docType: string;
    tradeMode?: string;
    data?: any;
    mode?: 'view' | 'edit' | 'create';
    /** Original action handler from useSheetActionHandler */
    handleAction: (actionId: string) => Promise<void>;
}

/**
 * Maps action IDs from useSheetActions to event codes in document_activity
 */
const ACTION_TO_EVENT: Record<string, EventCode> = {
    'save': 'note',       // We'll detect create vs edit and set proper event
    'save_post': 'posted',
    'save_confirm': 'confirmed',
    'confirm': 'confirmed',
    'unconfirm': 'unconfirmed',
    'post': 'posted',
    'unpost': 'unposted',
    'delete': 'cancelled',
    'duplicate': 'duplicated',
    'print': 'printed',
    'export': 'exported',
};

/**
 * Resolves entity type for document_activity table
 */
function resolveActivityEntityType(docType: string, tradeMode?: string): string {
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
    return map[docType] || docType || 'document';
}

/**
 * Gets the current user's display name
 */
async function getCurrentUserName(): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user?.id) return 'System';
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
        return profile?.full_name || user.email || 'User';
    } catch {
        return 'User';
    }
}

/**
 * Detect what changed between previous and current data
 */
function detectChanges(prevData: any, currentData: any): {
    fieldChanges: string[];
    itemsAdded: number;
    itemsRemoved: number;
    itemsChanged: number;
    summary: string;
    summaryAr: string;
} {
    const fieldChanges: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let itemsChanged = 0;

    if (!prevData || !currentData) {
        return { fieldChanges: [], itemsAdded: 0, itemsRemoved: 0, itemsChanged: 0, summary: 'Document updated', summaryAr: 'تم تحديث المستند' };
    }

    // Track header field changes
    const trackedFields: Record<string, { en: string; ar: string }> = {
        party_id: { en: 'Customer/Supplier', ar: 'العميل/المورد' },
        customer_id: { en: 'Customer', ar: 'العميل' },
        supplier_id: { en: 'Supplier', ar: 'المورد' },
        warehouse_id: { en: 'Warehouse', ar: 'المستودع' },
        date: { en: 'Date', ar: 'التاريخ' },
        currency: { en: 'Currency', ar: 'العملة' },
        exchange_rate: { en: 'Exchange Rate', ar: 'سعر الصرف' },
        notes: { en: 'Notes', ar: 'الملاحظات' },
        payment_terms: { en: 'Payment Terms', ar: 'شروط الدفع' },
        due_date: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
        discount_amount: { en: 'Discount', ar: 'الخصم' },
        shipping_method: { en: 'Shipping Method', ar: 'طريقة الشحن' },
        shipping_address: { en: 'Shipping Address', ar: 'عنوان الشحن' },
        delivery_date: { en: 'Delivery Date', ar: 'تاريخ التسليم' },
    };

    for (const [field, label] of Object.entries(trackedFields)) {
        const prev = prevData[field];
        const curr = currentData[field];
        if (prev !== curr && (prev || curr)) {
            fieldChanges.push(field);
        }
    }

    // Track item changes
    const prevItems = prevData.items || [];
    const currItems = currentData.items || [];

    const prevCount = prevItems.length;
    const currCount = currItems.length;

    if (currCount > prevCount) {
        itemsAdded = currCount - prevCount;
    } else if (prevCount > currCount) {
        itemsRemoved = prevCount - currCount;
    }

    // Compare existing items for quantity/price changes
    const minCount = Math.min(prevCount, currCount);
    for (let i = 0; i < minCount; i++) {
        const prev = prevItems[i];
        const curr = currItems[i];
        if (prev && curr) {
            if (prev.quantity !== curr.quantity || prev.unit_price !== curr.unit_price || prev.discount_amount !== curr.discount_amount) {
                itemsChanged++;
            }
        }
    }

    // Build summary
    const parts: string[] = [];
    const partsAr: string[] = [];

    if (fieldChanges.length > 0) {
        const labels = fieldChanges.map(f => trackedFields[f]?.en || f).join(', ');
        const labelsAr = fieldChanges.map(f => trackedFields[f]?.ar || f).join('، ');
        parts.push(`Updated: ${labels}`);
        partsAr.push(`تعديل: ${labelsAr}`);
    }
    if (itemsAdded > 0) {
        parts.push(`${itemsAdded} item(s) added`);
        partsAr.push(`إضافة ${itemsAdded} بند`);
    }
    if (itemsRemoved > 0) {
        parts.push(`${itemsRemoved} item(s) removed`);
        partsAr.push(`حذف ${itemsRemoved} بند`);
    }
    if (itemsChanged > 0) {
        parts.push(`${itemsChanged} item(s) modified`);
        partsAr.push(`تعديل ${itemsChanged} بند`);
    }

    return {
        fieldChanges,
        itemsAdded,
        itemsRemoved,
        itemsChanged,
        summary: parts.length > 0 ? parts.join(' • ') : 'Document saved',
        summaryAr: partsAr.length > 0 ? partsAr.join(' • ') : 'تم حفظ المستند',
    };
}

export function useDocumentActivityLogger({
    documentId,
    docType,
    tradeMode,
    data,
    mode,
    handleAction: originalHandleAction,
}: UseDocumentActivityLoggerParams) {
    const { company, companyId } = useCompany();
    const tenantId = company?.tenant_id || companyId;
    const lastLogRef = useRef<string>(''); // Prevent duplicate logging
    const prevDataRef = useRef<any>(null); // Track previous data for change detection
    const hasLoggedCreation = useRef(false); // Prevent duplicate creation logs

    // ═══ Track data changes for edit detection ═══
    useEffect(() => {
        if (mode === 'edit' && data && !prevDataRef.current) {
            // Snapshot data when entering edit mode
            prevDataRef.current = JSON.parse(JSON.stringify(data));
        }
        if (mode === 'view') {
            // Reset when leaving edit mode
            prevDataRef.current = null;
        }
    }, [mode, data?.id]);

    // ═══ Auto-log document creation ═══
    useEffect(() => {
        if (mode !== 'create' && data?.id && documentId && !hasLoggedCreation.current) {
            // Document just got an ID after creation — log creation event
            // This runs when mode transitions from 'create' to 'edit'/'view' after first save
            hasLoggedCreation.current = true;
        }
    }, [mode, data?.id, documentId]);

    const handleActionWithLogging = useCallback(async (actionId: string) => {
        const prevSnapshot = prevDataRef.current ? { ...prevDataRef.current } : null;

        // Execute the original action first
        await originalHandleAction(actionId);

        // After successful execution, log the event
        const docId = data?.id || documentId;
        if (!docId || !tenantId) return;

        const entityType = resolveActivityEntityType(docType, tradeMode);

        // Prevent duplicate logging for the same action within 2 seconds
        const logKey = `${actionId}_${docId}_${Math.floor(Date.now() / 2000)}`;
        if (lastLogRef.current === logKey) return;
        lastLogRef.current = logKey;

        // ─── Enhanced logging based on action type ───
        try {
            switch (actionId) {
                case 'save': {
                    // Detect if this is a create or edit save
                    const isFirstSave = !prevSnapshot?.id;

                    if (isFirstSave) {
                        // ═══ Document Created ═══
                        const userName = await getCurrentUserName();
                        const itemCount = data?.items?.length || 0;
                        const totalAmount = data?.grand_total || data?.total_amount || 0;
                        const currency = data?.currency || '';

                        documentActivityService.logEvent(
                            entityType, docId, tenantId,
                            'created',
                            undefined,
                            {
                                action: 'created',
                                created_by_name: userName,
                                items_count: itemCount,
                                total_amount: totalAmount,
                                currency,
                                party_name: data?.customer_name || data?.party_name || data?.supplier_name || '',
                                doc_type: docType,
                                trade_mode: tradeMode,
                            },
                        );
                    } else {
                        // ═══ Document Edited ═══
                        const changes = detectChanges(prevSnapshot, data);
                        const hasRealChanges = changes.fieldChanges.length > 0 ||
                            changes.itemsAdded > 0 || changes.itemsRemoved > 0 || changes.itemsChanged > 0;

                        if (hasRealChanges) {
                            // Log edit event with 'edited' code (shows ✏️ تم التعديل)
                            documentActivityService.logEvent(
                                entityType, docId, tenantId,
                                'edited',
                                changes.summaryAr,
                                {
                                    action: 'edited',
                                    changes_summary_en: changes.summary,
                                    changes_summary_ar: changes.summaryAr,
                                    fields_changed: changes.fieldChanges,
                                    items_added: changes.itemsAdded,
                                    items_removed: changes.itemsRemoved,
                                    items_modified: changes.itemsChanged,
                                    total_amount: data?.grand_total || data?.total_amount || 0,
                                    doc_type: docType,
                                    trade_mode: tradeMode,
                                },
                            );

                            // Also log separate items_updated event when items changed
                            if (changes.itemsAdded > 0 || changes.itemsRemoved > 0 || changes.itemsChanged > 0) {
                                const itemParts: string[] = [];
                                if (changes.itemsAdded > 0) itemParts.push(`+${changes.itemsAdded} بند`);
                                if (changes.itemsRemoved > 0) itemParts.push(`-${changes.itemsRemoved} بند`);
                                if (changes.itemsChanged > 0) itemParts.push(`تعديل ${changes.itemsChanged} بند`);

                                documentActivityService.logEvent(
                                    entityType, docId, tenantId,
                                    'items_updated',
                                    itemParts.join(' • '),
                                    {
                                        action: 'items_updated',
                                        items_added: changes.itemsAdded,
                                        items_removed: changes.itemsRemoved,
                                        items_modified: changes.itemsChanged,
                                        total_amount: data?.grand_total || data?.total_amount || 0,
                                        currency: data?.currency || '',
                                        doc_type: docType,
                                        trade_mode: tradeMode,
                                    },
                                );
                            }
                        }
                    }

                    // Reset snapshot after save
                    prevDataRef.current = null;
                    break;
                }

                case 'save_confirm': {
                    // ═══ Save & Confirm ═══
                    const userName = await getCurrentUserName();
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'confirmed',
                        undefined,
                        {
                            action: 'save_confirm',
                            confirmed_by_name: userName,
                            invoice_number: data?.invoice_no || data?.invoice_number || '',
                            total_amount: data?.grand_total || data?.total_amount || 0,
                            currency: data?.currency || '',
                            items_count: data?.items?.length || 0,
                            stage_from: 'draft',
                            stage_to: 'confirmed',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'confirm': {
                    // ═══ Confirm (without save) ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'confirmed',
                        undefined,
                        {
                            action: 'confirm',
                            stage_from: data?.stage || 'draft',
                            stage_to: 'confirmed',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'unconfirm': {
                    // ═══ Unconfirm ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'unconfirmed',
                        undefined,
                        {
                            action: 'unconfirm',
                            stage_from: 'confirmed',
                            stage_to: 'draft',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'save_post':
                case 'post': {
                    // ═══ Posted ═══
                    const userName = await getCurrentUserName();
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'posted',
                        undefined,
                        {
                            action: actionId,
                            posted_by_name: userName,
                            journal_entry_id: data?.journal_entry_id || '',
                            total_amount: data?.grand_total || data?.total_amount || 0,
                            currency: data?.currency || '',
                            stage_from: data?.stage || 'confirmed',
                            stage_to: 'posted',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'unpost': {
                    // ═══ Unposted ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'unposted',
                        undefined,
                        {
                            action: 'unpost',
                            stage_from: 'posted',
                            stage_to: 'confirmed',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'delete': {
                    // ═══ Deleted / Cancelled ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'cancelled',
                        undefined,
                        {
                            action: 'deleted',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'duplicate': {
                    // ═══ Duplicated ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'duplicated',
                        undefined,
                        {
                            action: 'duplicated',
                            source_doc_id: docId,
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'print': {
                    // ═══ Printed ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'printed',
                        undefined,
                        {
                            action: 'printed',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                case 'export': {
                    // ═══ Exported ═══
                    documentActivityService.logEvent(
                        entityType, docId, tenantId,
                        'exported',
                        undefined,
                        {
                            action: 'exported',
                            doc_type: docType,
                            trade_mode: tradeMode,
                        },
                    );
                    break;
                }

                default: {
                    // Unknown action — still log it for audit trail
                    const eventCode = ACTION_TO_EVENT[actionId];
                    if (eventCode) {
                        documentActivityService.logEvent(
                            entityType, docId, tenantId,
                            eventCode,
                            undefined,
                            { action_id: actionId, doc_type: docType, trade_mode: tradeMode },
                        );
                    }
                    break;
                }
            }
        } catch (err) {
            console.warn('[ActivityLogger] Failed to log event:', err);
        }

    }, [originalHandleAction, documentId, docType, tradeMode, data, tenantId, mode]);

    return handleActionWithLogging;
}

export default useDocumentActivityLogger;
