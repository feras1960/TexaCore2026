/**
 * useSheetActions — Custom hook for all sheet action handlers
 * 
 * Extracted from UnifiedAccountingSheet to reduce file size.
 * Contains: handleAccountingSave, handleTradeSave, handleAction, autoSave
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { confirmationService, type WorkflowSettings, type DocType as ConfDocType } from '@/services/confirmationService';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { SheetMode } from '../types';

// ═══ Recalculate totals from items (Single Source of Truth) ═══
// ⚠️ CRITICAL: Never use item.total as fallback for subtotal
//    because item.total = net + tax (includes tax!)
export function recalcItemTotals(items: any[]) {
    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.subtotal || (item.quantity * item.unit_price) || 0), 0);
    const discount_amount = items.reduce((sum: number, item: any) => sum + Number(item.discount_amount || 0), 0);
    const tax_amount = items.reduce((sum: number, item: any) => sum + Number(item.tax_amount || 0), 0);
    const net = subtotal - discount_amount;
    const grand_total = net + tax_amount;
    return { subtotal, discount_amount, tax_amount, tax_total: tax_amount, grand_total, total_amount: grand_total };
}

// ═══ Map docType → ConfDocType ═══
export function resolveConfDocType(docType: string, tradeMode?: string): ConfDocType {
    const isPurchase = tradeMode === 'purchase';
    switch (docType) {
        case 'trade_order': return isPurchase ? 'purchase_order' : 'sales_order';
        case 'trade_invoice': return isPurchase ? 'purchase_invoice' : 'sales_invoice';
        case 'trade_quotation': return 'quotation';
        case 'trade_reservation': return 'reservation';
        default: return isPurchase ? 'purchase_order' : 'sales_order';
    }
}

// ═══ Map docType to auto_post setting key ═══
export function getAutoPostKey(dt: string): string {
    const map: Record<string, string> = {
        trade_invoice: 'auto_post_invoice',
        trade_delivery: 'auto_post_delivery',
        trade_receipt: 'auto_post_receipt',
        trade_return: 'auto_post_return',
    };
    return map[dt] || '';
}

// ═══ Trade type maps (reused in multiple handlers) ═══
const TRADE_TYPE_MAP: Record<string, Record<string, string>> = {
    sales: {
        trade_invoice: 'invoice',
        trade_order: 'order',
        trade_quotation: 'quotation',
        trade_delivery: 'delivery',
        trade_reservation: 'reservation',
    },
    purchase: {
        trade_invoice: 'purchase_invoice',
        trade_order: 'purchase_order',
        trade_quotation: 'purchase_quotation',
        trade_request: 'purchase_request',
        trade_receipt: 'purchase_receipt',
        trade_return: 'purchase_return',
    },
    transfer: {
        trade_invoice: 'stock_transfer',
    },
};

const TRADE_TABLE_MAP: Record<string, Record<string, string>> = {
    sales: {
        trade_invoice: 'sales_transactions',
        trade_order: 'sales_orders',
        trade_quotation: 'quotations',
        trade_delivery: 'sales_deliveries',
        trade_reservation: 'transit_reservations',
        trade_return: 'sales_returns',
    },
    purchase: {
        trade_invoice: 'purchase_transactions',
        trade_order: 'purchase_orders',
        trade_quotation: 'purchase_quotations',
        trade_request: 'purchase_requests',
        trade_receipt: 'purchase_receipts',
        trade_return: 'purchase_returns',
    },
    transfer: {
        trade_invoice: 'stock_transfers',
    },
};

const TRADE_POST_MAP: Record<string, Record<string, string>> = {
    sales: {
        trade_invoice: 'sales_transactions',
        trade_delivery: 'sales_deliveries',
        trade_return: 'sales_returns',
    },
    purchase: {
        trade_invoice: 'purchase_transactions',
        trade_receipt: 'purchase_receipts',
        trade_return: 'purchase_returns',
    },
};

export interface UseSheetActionsParams {
    docType: string;
    tradeMode?: string;
    mode: SheetMode;
    data: any;
    documentId?: string;
    companyId?: string;
    isTradeDocType: boolean;
    isAccountingDocType: boolean;
    isPostableDocType: boolean;
    // Save handlers (from useAccountingSave / useTradeSave)
    handleAccountingSave: (data: any) => Promise<void>;
    handleTradeSave: (data: any) => Promise<any>;
    // State setters
    setData: (fn: any) => void;
    setMode: (mode: SheetMode) => void;
    setLoading: (v: boolean) => void;
    setHasChanges: (v: boolean) => void;
    handleModeChange: (mode: SheetMode) => void;
    // Confirmation state setters
    setConfirmDialogOpen: (v: boolean) => void;
    setConfirmValidation: (v: any) => void;
    setConfirmSettings: (v: any) => void;
    setConfirmNeedsApproval: (v: boolean) => void;
    // External callbacks
    onSave?: (data: any) => Promise<void> | void;
    onDelete?: () => Promise<void> | void;
    onPost?: () => Promise<void> | void;
    onUnpost?: () => Promise<void> | void;
    onDuplicate?: () => void;
    onPrint?: () => void;
    onRefresh?: () => void;
    onClose: () => void;
    // Edit flow
    enableEditFlow?: boolean;
    onEditPermissionDenied?: (message: string, options?: any[]) => void;
    onAdjustmentRequired?: (id: string) => void;
    initialData: any;
    hasChanges: boolean;
}

// ═══ Accounting Save Handler ═══
export function useAccountingSave(
    docType: string,
    companyId: string | undefined,
    documentId: string | undefined,
    mode: SheetMode,
    t: (key: string) => string,
) {
    const isAccountingDocType = ['journal', 'cash', 'receipt', 'payment', 'transfer', 'exchange', 'debit_note', 'credit_note'].includes(docType);

    return useCallback(async (saveData: any) => {
        if (!isAccountingDocType) return;
        if (!saveData) {
            toast.error(t('accounting.errors.saveFailed') || 'فشل الحفظ');
            return;
        }

        const saveCompanyId = saveData.company_id || companyId;
        if (!saveCompanyId) {
            toast.error(t('accounting.errors.noCompany') || 'يجب تحديد الشركة');
            return;
        }

        // Import service dynamically
        const { journalEntriesService } = await import('@/services/journalEntriesService');

        // Build entry lines
        const entryType = docType === 'receipt' ? 'receipt' : docType === 'payment' ? 'payment' : 'journal';
        let finalLines = [...(saveData.lines || [])];

        // For receipt/payment: auto-add header balancing line
        if (['receipt', 'payment'].includes(entryType) && saveData.header_account_id) {
            const lineTotal = finalLines.reduce((sum: number, l: any) =>
                sum + (Number(l.debit) || 0) + (Number(l.credit) || 0), 0);

            if (lineTotal > 0) {
                finalLines.push({
                    account_id: saveData.header_account_id,
                    description: saveData.description || (entryType === 'receipt' ? 'سند قبض' : 'سند صرف'),
                    debit: entryType === 'receipt' ? lineTotal : 0,
                    credit: entryType === 'payment' ? lineTotal : 0,
                    cost_center_id: null,
                });
            }
        }

        // Validation
        if (finalLines.length < 2) {
            toast.error(t('accounting.errors.saveFailed') || 'فشل الحفظ', {
                description: t('accounting.errors.minLinesRequired') || 'يجب إدخال بندين على الأقل',
            });
            return;
        }

        const totalDebit = finalLines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
        const totalCredit = finalLines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            toast.error(t('accounting.errors.notBalanced') || 'القيد غير متوازن!', {
                description: `${t('accounting.debit') || 'مدين'}: ${totalDebit.toFixed(2)} ≠ ${t('accounting.credit') || 'دائن'}: ${totalCredit.toFixed(2)}`,
            });
            return;
        }

        // Build entry data
        const entryInput = {
            company_id: saveCompanyId,
            entry_date: saveData.entry_date || new Date().toISOString().split('T')[0],
            description: saveData.description || '',
            entry_type: entryType,
            lines: finalLines.map((line: any) => ({
                account_id: line.account_id,
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                description: line.description || '',
                cost_center_id: line.cost_center_id || null,
            })),
        };

        // Create or Update
        const entryId = saveData.id || documentId;
        if (mode === 'edit' && entryId) {
            await journalEntriesService.update(entryId, entryInput);
        } else {
            await journalEntriesService.create(entryInput);
        }
    }, [isAccountingDocType, docType, companyId, documentId, mode, t]);
}

// ═══ Trade Save Handler ═══
export function useTradeSave(
    docType: string,
    tradeMode: string | undefined,
    companyId: string | undefined,
    documentId: string | undefined,
    mode: SheetMode,
    language: string,
    setData: (fn: any) => void,
    setMode: (mode: SheetMode) => void,
) {
    const queryClient = useQueryClient();
    const isTradeDocType = ['trade_order', 'trade_invoice', 'trade_quotation', 'trade_reservation', 'trade_delivery', 'trade_request', 'trade_return', 'trade_receipt', 'trade_container'].includes(docType);

    return useCallback(async (saveData: any) => {
        if (!isTradeDocType || !saveData) throw new Error('Invalid save state');

        const saveCompanyId = saveData.company_id || companyId;
        if (!saveCompanyId) {
            throw new Error(language === 'ar' ? 'يجب تحديد الشركة' : 'Company is required');
        }

        // ═══ Container-specific save path ═══
        if (docType === 'trade_container') {
            const { createContainer } = await import('@/services/containersService');

            if (!saveData.container_number) {
                throw new Error(language === 'ar' ? 'رقم الكونتينر مطلوب' : 'Container number is required');
            }

            const { data: { session } } = await supabase.auth.getSession();
            const authUser = session?.user;
            let tenantId = authUser?.user_metadata?.tenant_id || authUser?.app_metadata?.tenant_id;

            if (!tenantId && authUser?.id) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('tenant_id')
                    .eq('id', authUser.id)
                    .single();
                tenantId = profile?.tenant_id;
            }

            if (!tenantId) {
                throw new Error(language === 'ar' ? 'لم يتم العثور على معرف المستأجر' : 'Tenant ID not found');
            }

            const docId = saveData.id || documentId;

            if (mode === 'create' || !docId) {
                const containerPayload: Record<string, any> = {
                    tenant_id: tenantId,
                    company_id: saveCompanyId,
                    container_number: saveData.container_number,
                    container_name: saveData.container_name || null,
                    bill_of_lading: saveData.bill_of_lading || null,
                    origin_country: saveData.origin_country || null,
                    origin_port: saveData.port_of_loading || saveData.origin_port || null,
                    destination_port: saveData.port_of_discharge || saveData.destination_port || null,
                    shipping_company: saveData.shipping_company || saveData.shipping_line || null,
                    vessel_name: saveData.vessel_name || null,
                    supplier_id: saveData.supplier_id || saveData.party_id || null,
                    container_size: saveData.container_size || '40ft',
                    container_type: saveData.container_type || 'dry',
                    status: saveData.status || 'ordered',
                    order_date: saveData.date || new Date().toISOString(),
                    departure_date: saveData.etd || saveData.departure_date || null,
                    expected_arrival_date: saveData.eta || saveData.expected_arrival_date || null,
                    base_currency: saveData.base_currency || saveData.currency || 'USD',
                    notes: saveData.notes || saveData.remarks || null,
                    created_by: authUser?.id,
                };

                const result = await createContainer(containerPayload as any);
                setData((prev: any) => ({ ...prev, ...result, id: result.id }));
                setMode('edit');
            } else {
                const updates: Record<string, any> = {
                    container_number: saveData.container_number,
                    container_name: saveData.container_name || null,
                    bill_of_lading: saveData.bill_of_lading || null,
                    origin_country: saveData.origin_country || null,
                    origin_port: saveData.port_of_loading || saveData.origin_port || null,
                    destination_port: saveData.port_of_discharge || saveData.destination_port || null,
                    shipping_company: saveData.shipping_company || saveData.shipping_line || null,
                    vessel_name: saveData.vessel_name || null,
                    supplier_id: saveData.supplier_id || saveData.party_id || null,
                    container_size: saveData.container_size || '40ft',
                    container_type: saveData.container_type || 'dry',
                    status: saveData.status || 'ordered',
                    departure_date: saveData.etd || saveData.departure_date || null,
                    expected_arrival_date: saveData.eta || saveData.expected_arrival_date || null,
                    notes: saveData.notes || saveData.remarks || null,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase.from('containers').update(updates).eq('id', docId);
                if (error) throw error;
            }

            queryClient.invalidateQueries({ queryKey: ['containers_list'] });
            return;
        }

        // ═══ Standard trade document save path ═══
        const { TradeService } = await import('@/features/trade/services/TradeService');

        const modeKey = tradeMode || 'sales';
        const serviceDocType = TRADE_TYPE_MAP[modeKey]?.[docType] || 'invoice';
        const docId = saveData.id || documentId;

        // Build document payload
        const items = saveData.items || [];

        // Validate: party_id is required for invoices/orders (but NOT for transfers)
        const partyId = saveData.party_id || saveData.customer_id || saveData.supplier_id;
        const isTransferMode = tradeMode === 'transfer';
        if ((docType === 'trade_invoice' || docType === 'trade_order') && !partyId && !isTransferMode) {
            const errorMsg = language === 'ar' ? 'عذراً، يجب تحديد المورد/العميل قبل الحفظ' : 'Supplier/Customer is required';
            toast.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Calculate totals from items (single source of truth)
        const totals = recalcItemTotals(items);

        const docPayload: Record<string, any> = {
            company_id: saveCompanyId,
            party_id: partyId,
            warehouse_id: saveData.warehouse_id,
            date: saveData.date || saveData.invoice_date || saveData.order_date || new Date().toISOString(),
            currency: saveData.currency || '',
            exchange_rate: saveData.exchange_rate || 1,
            notes: saveData.notes,
            ...totals,
            items,
        };

        // Purchase-specific fields
        if (modeKey === 'purchase') {
            docPayload.supplier_invoice_number = saveData.supplier_invoice_number;
            docPayload.supplier_invoice_date = saveData.supplier_invoice_date;
            docPayload.payment_terms = saveData.payment_terms;
            docPayload.due_date = saveData.due_date;
            docPayload.supplier_notes = saveData.supplier_notes;
            if (saveData.receipt_mode) docPayload.receipt_mode = saveData.receipt_mode;
        }

        // Expenses & Attachments
        if (saveData.expenses) {
            docPayload.expenses = saveData.expenses;
            docPayload.expenses_total = saveData.expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        }
        if (saveData.attachments) {
            docPayload.attachments = saveData.attachments;
        }

        // Transfer-specific fields
        if (isTransferMode) {
            docPayload.from_warehouse_id = saveData.from_warehouse_id || saveData.warehouse_id || null;
            docPayload.to_warehouse_id = saveData.to_warehouse_id || null;
            // Note: warehouses are optional for drafts, validated on confirmation
        }

        // Create or Update
        if (mode === 'create' || !docId) {
            const result = await TradeService.createTradeDocument(docPayload, serviceDocType, docPayload.currency);
            setData((prev: any) => ({ ...prev, ...result, id: result.id }));
            setMode('edit');
            return result;
        } else {
            await TradeService.updateTradeDocument(docId, docPayload, serviceDocType);
            return { id: docId };
        }
    }, [isTradeDocType, docType, tradeMode, companyId, documentId, mode, language, queryClient, setData, setMode]);
}

// ═══ Auto-Save Hook Wrapper ═══
export function useTradeAutoSave(
    isTradeDocType: boolean,
    handleTradeSave: (data: any) => Promise<any>,
    data: any,
    currentDocId: string | null,
    currentStage: string,
    mode: SheetMode,
) {
    const autoSaveHandler = useCallback(async (saveData: any) => {
        if (!isTradeDocType || !saveData) return;
        try {
            await handleTradeSave(saveData);
        } catch (err) {
            console.error('❌ [AutoSave] Failed:', err);
            throw err;
        }
    }, [isTradeDocType, handleTradeSave]);

    // Only auto-save drafts — confirmed/posted docs should not be auto-saved
    const isNonDraftStage = currentStage && currentStage !== 'draft' && currentStage !== '';

    return useAutoSave({
        data: isTradeDocType ? data : null,
        id: currentDocId,
        stage: currentStage || 'draft',
        onSave: autoSaveHandler,
        delay: 5000,
        disabled: !isTradeDocType || mode === 'view' || isNonDraftStage,
    });
}

// ═══ Invalidate trade-related queries ═══
function invalidateTradeQueries(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_transactions_list'] });
    // ── PurchaseInvoicesList actual query keys ──
    queryClient.invalidateQueries({ queryKey: ['purchase_transactions_recent'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_transactions_full'] });
    queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
    queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    // Also invalidate warehouse queries so pending receipts update
    queryClient.invalidateQueries({ queryKey: ['warehouse', 'pending-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse', 'stock-movements'] });
}

// ═══ Main Action Handler Hook ═══
export function useSheetActionHandler(params: UseSheetActionsParams) {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const {
        docType, tradeMode, mode, data, documentId, companyId,
        isTradeDocType, isAccountingDocType, isPostableDocType,
        handleAccountingSave, handleTradeSave,
        setData, setMode, setLoading, setHasChanges, handleModeChange,
        setConfirmDialogOpen, setConfirmValidation, setConfirmSettings, setConfirmNeedsApproval,
        onSave, onDelete, onPost, onUnpost, onDuplicate, onPrint, onRefresh, onClose,
        enableEditFlow, onEditPermissionDenied, onAdjustmentRequired,
        initialData, hasChanges,
    } = params;

    // ═══ Ref to always hold latest data — avoids stale closures in useCallback ═══
    const dataRef = useRef(data);
    dataRef.current = data;

    return useCallback(async (actionId: string) => {
        // Always read the freshest data from ref (closure may be stale)
        const data = dataRef.current;
        try {
            switch (actionId) {
                case 'edit':
                    // Guard: Received documents are read-only
                    if (data?.status === 'received') {
                        toast.warning(
                            language === 'ar'
                                ? '🔒 المستند مقفل — تم استلام البضائع. لا يمكن التعديل.'
                                : '🔒 Document is locked — goods have been received. Cannot edit.',
                        );
                        return;
                    }
                    // Check edit permission for journal entries
                    if (enableEditFlow && docType === 'journal' && documentId) {
                        try {
                            const { data: result, error } = await supabase
                                .rpc('can_edit_journal_entry', { p_entry_id: documentId });
                            if (error) {
                                console.error('Edit permission check failed:', error);
                            } else if (!result?.can_edit) {
                                const options = result?.options?.map((opt: any) => ({
                                    id: opt.id, label: opt.label,
                                    recommended: opt.recommended, warning: opt.warning,
                                    requires_permission: opt.requires_permission,
                                }));
                                onEditPermissionDenied?.(result?.message || 'لا يمكن التحرير', options);
                                if (result?.mode === 'linked_closed_year') {
                                    onAdjustmentRequired?.(documentId);
                                }
                                return;
                            } else if (result?.auto_unpost && onUnpost) {
                                toast.info(t('messages.unpostingEntry') || 'جاري إلغاء الترحيل للتعديل...');
                                await onUnpost();
                            }
                        } catch { /* allow edit if check fails */ }
                    }
                    handleModeChange('edit');
                    break;

                case 'save_post':
                case 'save': {
                    // ═══ Account Save (create/edit) ═══
                    if (docType === 'account') {
                        if (!data?.name_ar) {
                            toast.error(language === 'ar' ? 'اسم الحساب بالعربية مطلوب' : 'Arabic name is required');
                            return;
                        }
                        if (!data?.account_type_id) {
                            toast.error(language === 'ar' ? 'نوع الحساب مطلوب' : 'Account type is required');
                            return;
                        }

                        setLoading(true);
                        try {
                            const { accountsService } = await import('@/services/accountsService');
                            if (mode === 'create') {
                                // Create new account
                                await accountsService.create({
                                    company_id: companyId || data.company_id || '',
                                    account_code: data.account_code || data.code || '',
                                    name_ar: data.name_ar,
                                    name_en: data.name_en || undefined,
                                    name_ru: data.name_ru || undefined,
                                    name_uk: data.name_uk || undefined,
                                    name_ro: data.name_ro || undefined,
                                    name_pl: data.name_pl || undefined,
                                    name_tr: data.name_tr || undefined,
                                    name_de: data.name_de || undefined,
                                    name_it: data.name_it || undefined,
                                    account_type_id: data.account_type_id,
                                    parent_id: data.parent_id || undefined,
                                    is_group: data.is_group || false,
                                    level: data.level || 1,
                                    currency: data.currency || undefined,
                                    description: data.description || undefined,
                                });
                            } else {
                                // Update existing account
                                await accountsService.update(data.id, {
                                    account_code: data.account_code || data.code,
                                    name_ar: data.name_ar,
                                    name_en: data.name_en || undefined,
                                    name_ru: data.name_ru || undefined,
                                    name_uk: data.name_uk || undefined,
                                    name_ro: data.name_ro || undefined,
                                    name_pl: data.name_pl || undefined,
                                    name_tr: data.name_tr || undefined,
                                    name_de: data.name_de || undefined,
                                    name_it: data.name_it || undefined,
                                    account_type_id: data.account_type_id,
                                    parent_id: data.parent_id || undefined,
                                    is_group: data.is_group,
                                    currency: data.currency,
                                    description: data.description || undefined,
                                });
                            }
                            toast.success(language === 'ar' ? 'تم حفظ الحساب بنجاح' : 'Account saved successfully');
                            setHasChanges(false);
                            if (onSave) await onSave(data);
                            setMode('view');
                        } catch (err: any) {
                            console.error('[Account Save Error]', err);
                            toast.error(language === 'ar' ? 'فشل حفظ الحساب' : 'Failed to save account', {
                                description: err.message || '',
                            });
                        } finally {
                            setLoading(false);
                        }
                        return;
                    }

                    // ═══ Party Save (customer/supplier) ═══
                    if (docType === 'party') {
                        if (!data?.name_ar) {
                            toast.error(language === 'ar' ? 'اسم الجهة بالعربية مطلوب' : 'Arabic name is required');
                            return;
                        }

                        setLoading(true);
                        try {
                            const partyType = data?._partyType || data?.party_type || data?.type || 'customer';
                            const isCustomer = partyType === 'customer';
                            const tableName = isCustomer ? 'customers' : 'suppliers';

                            // Build update payload — only include fields that exist in the table
                            const updatePayload: Record<string, any> = {
                                name_ar: data.name_ar,
                                name_en: data.name_en || null,
                                name_ru: data.name_ru || null,
                                name_uk: data.name_uk || null,
                                name_ro: data.name_ro || null,
                                name_pl: data.name_pl || null,
                                name_tr: data.name_tr || null,
                                name_de: data.name_de || null,
                                name_it: data.name_it || null,
                                phone: data.phone || null,
                                mobile: data.mobile || null,
                                email: data.email || null,
                                country: data.country || null,
                                city: data.city || null,
                                address: data.address || null,
                                tax_number: data.tax_number || null,
                                currency: data.currency || null,
                                notes: data.notes || null,
                                status: data.status || 'active',
                                updated_at: new Date().toISOString(),
                            };

                            // Customer-specific fields
                            if (isCustomer) {
                                updatePayload.customer_type = data.customer_type || null;
                                updatePayload.company_name = data.company_name || null;
                                updatePayload.credit_limit = data.credit_limit || null;
                                updatePayload.discount_percent = data.discount_percent || null;
                                updatePayload.payment_terms_days = data.payment_terms_days || null;
                                updatePayload.preferred_language = data.preferred_language || null;
                                updatePayload.telegram_username = data.telegram_username || null;
                                updatePayload.sales_agent_id = data.sales_agent_id || null;
                            } else {
                                updatePayload.supplier_type = data.supplier_type || null;
                                updatePayload.company_name = data.company_name || null;
                                updatePayload.payment_terms_days = data.payment_terms_days || null;
                                updatePayload.telegram_username = data.telegram_username || null;
                                updatePayload.sales_agent_id = data.sales_agent_id || null;
                            }

                            // Bank info (if columns exist)
                            if (data.bank_name !== undefined) updatePayload.bank_name = data.bank_name || null;
                            if (data.iban !== undefined) updatePayload.iban = data.iban || null;
                            if (data.bank_account !== undefined) updatePayload.bank_account = data.bank_account || null;

                            const { error } = await supabase
                                .from(tableName)
                                .update(updatePayload)
                                .eq('id', data.id);

                            if (error) throw error;

                            toast.success(language === 'ar' ? 'تم حفظ بيانات الجهة بنجاح' : 'Party saved successfully');
                            setHasChanges(false);
                            if (onSave) await onSave(data);
                            setMode('view');
                        } catch (err: any) {
                            console.error('[Party Save Error]', err);
                            toast.error(language === 'ar' ? 'فشل حفظ بيانات الجهة' : 'Failed to save party', {
                                description: err.message || '',
                            });
                        } finally {
                            setLoading(false);
                        }
                        return;
                    }

                    // Check if entry has meaningful data
                    if (isAccountingDocType) {
                        const entryLines = data?.lines || [];
                        const hasData = entryLines.some((line: any) =>
                            line.account_id && (Number(line.debit) > 0 || Number(line.credit) > 0)
                        );
                        if (!hasData) {
                            toast.warning(language === 'ar' ? 'لا يوجد بيانات للحفظ — أدخل بنوداً أولاً' : 'No data to save — add line items first');
                            return;
                        }
                    }

                    setLoading(true);
                    let savedResult: any = null;

                    if (onSave) {
                        await onSave(data);
                    } else if (isAccountingDocType) {
                        await handleAccountingSave(data);
                    } else if (isTradeDocType) {
                        savedResult = await handleTradeSave(data);
                    }
                    toast.success(t('messages.savedSuccessfully') || 'تم الحفظ بنجاح');
                    setHasChanges(false);

                    // Save & Post Logic
                    let manualPostSuccess = false;
                    if (actionId === 'save_post' && isTradeDocType && isPostableDocType) {
                        try {
                            const docId = savedResult?.id || data?.id || documentId;
                            if (!docId) throw new Error('Document ID not found after save');

                            const { data: { session } } = await supabase.auth.getSession();
                            const user = session?.user;
                            if (user) {
                                const modeKey = tradeMode || 'sales';

                                if (modeKey === 'purchase' && docType === 'trade_invoice') {
                                    const { purchaseAccountingService } = await import('@/services/purchaseAccountingService');
                                    const postResult = await purchaseAccountingService.createPurchaseInvoiceJournalEntry(docId, user.id);
                                    setData((prev: any) => ({
                                        ...prev,
                                        status: 'posted',
                                        stage: 'posted',
                                        is_posted: true,
                                        journal_entry_id: postResult.journalEntryId,
                                        posted_at: new Date().toISOString(),
                                    }));
                                    toast.success(language === 'ar' ? '✅ تم الحفظ والترحيل بنجاح' : '✅ Saved & Posted successfully');
                                    manualPostSuccess = true;
                                } else {
                                    const tableName = TRADE_POST_MAP[modeKey]?.[docType];
                                    if (tableName) {
                                        const isTransaction = tableName.includes('_transactions');
                                        await supabase.from(tableName).update({
                                            ...(isTransaction ? { stage: 'posted' } : { status: 'posted' }),
                                            is_posted: true,
                                            posted_at: new Date().toISOString()
                                        }).eq('id', docId);
                                        setData((prev: any) => ({ ...prev, status: 'posted', stage: 'posted', is_posted: true }));
                                        toast.success(language === 'ar' ? '✅ تم الحفظ والترحيل' : '✅ Saved & Posted');
                                        manualPostSuccess = true;
                                    }
                                }
                                invalidateTradeQueries(queryClient);
                            }
                        } catch (err: any) {
                            console.error('Save & Post failed:', err);
                            toast.error(language === 'ar' ? `فشل الترحيل: ${err.message}` : `Post failed: ${err.message}`);
                        }
                    }

                    // After-save mode transitions
                    if (mode === 'create' && isAccountingDocType) {
                        setData({});
                        setTimeout(() => setData({ type: docType }), 50);
                    } else if (mode === 'create' && isTradeDocType) {
                        handleModeChange('view');
                    } else if (mode === 'create') {
                        onClose();
                    } else {
                        handleModeChange('view');
                    }

                    // Auto-Post Logic (skipped if manual post succeeded)
                    // ⚠️ SALES: Auto-post is DISABLED for sales documents — user must manually post via button
                    // Auto-post only applies to purchase documents when enabled in workflow settings
                    const modeKey2 = tradeMode || 'sales';
                    if (!manualPostSuccess && isTradeDocType && isPostableDocType && companyId && data?.status !== 'posted' && modeKey2 === 'purchase') {
                        try {
                            const { data: settingsJson } = await supabase.rpc('get_workflow_settings', { p_company_id: companyId });
                            const autoPostKey2 = getAutoPostKey(docType);
                            const shouldAutoPost = autoPostKey2 && settingsJson?.[autoPostKey2] === true;

                            if (shouldAutoPost) {
                                const tableName = TRADE_POST_MAP[modeKey2]?.[docType];
                                const docId = data?.id || documentId;
                                if (tableName && docId) {
                                    const isTransaction = tableName.includes('_transactions');
                                    await supabase.from(tableName).update(isTransaction ? { stage: 'posted' } : { status: 'posted' }).eq('id', docId);
                                    setData((prev: any) => ({ ...prev, status: 'posted' }));
                                    invalidateTradeQueries(queryClient);
                                    toast.success(language === 'ar' ? '✅ تم الترحيل تلقائياً' : '✅ Auto-posted successfully');
                                }
                            }
                        } catch (autoPostErr) {
                            console.warn('Auto-post check failed:', autoPostErr);
                        }
                    }
                    break;
                }

                case 'delete': {
                    // ═══ Account Delete Protection ═══
                    if (docType === 'account') {
                        // Check for transactions
                        if (data?.transaction_count > 0 || data?.total_debit > 0 || data?.total_credit > 0) {
                            toast.error(
                                language === 'ar'
                                    ? '🚫 لا يمكن حذف هذا الحساب — عليه حركات محاسبية'
                                    : '🚫 Cannot delete this account — it has transactions',
                                { duration: 5000 }
                            );
                            break;
                        }
                        // Check for system account
                        if (data?.is_system) {
                            toast.error(
                                language === 'ar'
                                    ? '🚫 لا يمكن حذف حساب نظام'
                                    : '🚫 Cannot delete a system account',
                                { duration: 5000 }
                            );
                            break;
                        }

                        const confirmed = window.confirm(
                            language === 'ar'
                                ? `هل أنت متأكد من حذف الحساب "${data?.name_ar || data?.name}"?\n\nسيتم إلغاء تفعيل الحساب (soft delete).`
                                : `Are you sure you want to delete "${data?.name_en || data?.name}"?\n\nThe account will be deactivated (soft delete).`
                        );
                        if (confirmed) {
                            setLoading(true);
                            try {
                                const { accountsService } = await import('@/services/accountsService');
                                await accountsService.delete(data.id);
                                toast.success(language === 'ar' ? 'تم حذف الحساب' : 'Account deleted');
                                if (onSave) await onSave(data);
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account',
                                    { description: err.message || '' }
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                        break;
                    }

                    // ══ Business Rule: Cannot delete executed trade documents ══
                    // - Purchase: received/posted → must use Purchase Return
                    // - Sales:    delivered/invoiced/posted → must use Sales Return
                    const currentStageVal = data?.stage || data?._stage || '';

                    // PURCHASE: block if goods have been received
                    const BLOCKED_PURCHASE_STAGES = ['received', 'posted', 'receiving'];
                    const isPurchaseTrade = tradeMode === 'purchase' &&
                        (docType === 'trade_invoice' || docType === 'trade_receipt');
                    if (isPurchaseTrade && BLOCKED_PURCHASE_STAGES.includes(currentStageVal)) {
                        toast.error(
                            language === 'ar'
                                ? '🚫 لا يمكن حذف فاتورة تم استلام بضاعتها — استخدم مرتجع الشراء لعكس العملية'
                                : '🚫 Cannot delete a received invoice — create a Purchase Return to reverse it',
                            { duration: 6000 }
                        );
                        break;
                    }

                    // SALES: block if goods have been delivered or invoice posted
                    const BLOCKED_SALES_STAGES = ['delivered', 'invoiced', 'posted', 'completed'];
                    const isSalesTrade = tradeMode === 'sales' &&
                        (docType === 'trade_invoice' || docType === 'trade_delivery');
                    if (isSalesTrade && BLOCKED_SALES_STAGES.includes(currentStageVal)) {
                        toast.error(
                            language === 'ar'
                                ? '🚫 لا يمكن حذف فاتورة/تسليم مُنجَز — استخدم مرتجع المبيعات لعكس العملية'
                                : '🚫 Cannot delete a delivered invoice — create a Sales Return to reverse it',
                            { duration: 6000 }
                        );
                        break;
                    }

                    // TRANSFER: block if already confirmed/shipped/received/completed
                    const transferStatus = data?.status || data?.stage || '';
                    const BLOCKED_TRANSFER_STATUSES = ['confirmed', 'loading', 'shipped', 'received', 'completed'];
                    if (tradeMode === 'transfer' && BLOCKED_TRANSFER_STATUSES.includes(transferStatus)) {
                        toast.error(
                            language === 'ar'
                                ? '🚫 لا يمكن حذف مناقلة مؤكدة أو مُرسلة — يمكنك إلغاؤها فقط'
                                : '🚫 Cannot delete a confirmed/shipped transfer — you can only cancel it',
                            { duration: 6000 }
                        );
                        break;
                    }

                    if (onDelete) {
                        const confirmed = window.confirm(t('messages.confirmDelete') || 'هل أنت متأكد من الحذف؟');
                        if (confirmed) {
                            setLoading(true);
                            await onDelete();
                            toast.success(t('messages.deletedSuccessfully') || 'تم الحذف بنجاح');
                            onClose();
                        }
                    } else if (isTradeDocType && (documentId || data?.id)) {
                        const confirmed = window.confirm(
                            language === 'ar'
                                ? 'هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.'
                                : 'Are you sure you want to delete this document? This action cannot be undone.'
                        );
                        if (confirmed) {
                            setLoading(true);
                            const modeKey = tradeMode || 'sales';
                            const tableName = TRADE_TABLE_MAP[modeKey]?.[docType];
                            const docId = documentId || data?.id;
                            if (tableName && docId) {
                                const { error } = await supabase.from(tableName).delete().eq('id', docId);
                                if (error) throw error;
                                invalidateTradeQueries(queryClient);
                                queryClient.invalidateQueries({ queryKey: ['containers_list'] });
                                toast.success(language === 'ar' ? '🗑️ تم حذف المستند بنجاح' : '🗑️ Document deleted successfully');
                                onClose();
                            }
                        }
                    }
                    break;
                }

                case 'save_confirm': {
                    if (!isTradeDocType) break;

                    // ═══ Transfer validation: require both warehouses for confirmation ═══
                    const isTransferConfirm = tradeMode === 'transfer';
                    if (isTransferConfirm) {
                        const fromWh = data?.from_warehouse_id || data?.warehouse_id;
                        const toWh = data?.to_warehouse_id;
                        console.log('[SaveConfirm] Transfer validation:', {
                            from_warehouse_id: data?.from_warehouse_id,
                            warehouse_id: data?.warehouse_id,
                            to_warehouse_id: data?.to_warehouse_id,
                            fromWh, toWh,
                            data_keys: data ? Object.keys(data) : [],
                        });
                        if (!fromWh || !toWh) {
                            toast.error(
                                language === 'ar'
                                    ? 'يجب تحديد المستودع المصدر والهدف قبل التأكيد'
                                    : 'Both source and destination warehouses are required for confirmation'
                            );
                            break;
                        }
                    }

                    setLoading(true);
                    try {
                        // ═══ Step 1: Save first (handles both create & edit) ═══
                        let savedResult: any = null;
                        if (mode === 'create' || !data?.id) {
                            savedResult = await handleTradeSave(data);
                        } else if (hasChanges && data) {
                            savedResult = await handleTradeSave(data);
                        }

                        const docId = savedResult?.id || data?.id || documentId;
                        if (!docId) {
                            toast.error(language === 'ar' ? 'فشل في حفظ المستند — لا يوجد معرّف' : 'Failed to save — no document ID');
                            break;
                        }

                        const modeKey = tradeMode || 'sales';
                        const tableName = TRADE_TABLE_MAP[modeKey]?.[docType] || (tradeMode === 'purchase' ? 'purchase_transactions' : 'sales_transactions');

                        // ═══ Transfer-specific confirmation ═══
                        if (tradeMode === 'transfer') {
                            // stock_transfers uses 'status' (not 'stage') + confirmed_by/confirmed_at
                            const { data: { session } } = await supabase.auth.getSession();
                            const userId = session?.user?.id;
                            const { error } = await supabase
                                .from(tableName)
                                .update({
                                    status: 'confirmed',
                                    confirmed_by: userId,
                                    confirmed_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', docId);
                            if (error) throw error;

                            // ═══ Assign permanent sequential number (ST-2026-XXXXXX) ═══
                            let permanentNumber = '';
                            try {
                                const { TradeService } = await import('@/features/trade/services/TradeService');
                                const saveCompanyId = data?.company_id || companyId;
                                permanentNumber = await TradeService.assignPermanentNumber(docId, 'stock_transfer', saveCompanyId);
                            } catch (numErr) {
                                console.error('[Transfer] Failed to assign permanent number:', numErr);
                            }

                            setData((prev: any) => prev ? {
                                ...prev,
                                id: docId,
                                status: 'confirmed',
                                transfer_number: permanentNumber || prev.transfer_number,
                                confirmed_by: userId,
                                confirmed_at: new Date().toISOString(),
                            } : prev);
                            setHasChanges(false);
                            invalidateTradeQueries(queryClient);

                            toast.success(
                                language === 'ar'
                                    ? `✅ تم حفظ وتأكيد المناقلة بنجاح${permanentNumber ? `\n📋 الرقم: ${permanentNumber}` : ''}\n📦 سيتم إشعار المستودع المصدر لتجهيز البضاعة`
                                    : `✅ Transfer saved & confirmed${permanentNumber ? `\n📋 Number: ${permanentNumber}` : ''}\n📦 Source warehouse will be notified to prepare goods`,
                            );

                            // 📱 Telegram: Send transfer picking notification
                            try {
                                const { telegramNotify } = await import('@/services/telegramNotificationService');
                                const transferCompanyId = data?.company_id || companyId;
                                if (transferCompanyId) {
                                    // Fetch transfer items with material details
                                    const { data: transferItems } = await supabase
                                        .from('stock_transfer_items')
                                        .select('material_id, quantity, material:fabric_materials(name_ar, name_en)')
                                        .eq('transfer_id', docId);

                                    // Fetch warehouse names
                                    const fromWhId = data?.from_warehouse_id || data?.warehouse_id;
                                    const toWhId = data?.to_warehouse_id;
                                    let fromWhName = '', toWhName = '';
                                    if (fromWhId) {
                                        const { data: wh } = await supabase.from('warehouses').select('name_ar').eq('id', fromWhId).maybeSingle();
                                        fromWhName = wh?.name_ar || '';
                                    }
                                    if (toWhId) {
                                        const { data: wh } = await supabase.from('warehouses').select('name_ar').eq('id', toWhId).maybeSingle();
                                        toWhName = wh?.name_ar || '';
                                    }

                                    const mappedItems = (transferItems || []).map((i: any) => ({
                                        materialId: i.material_id || undefined,
                                        name: i.material?.name_ar || i.material?.name_en || '-',
                                        qty: i.quantity || 0,
                                        unit: 'م',
                                        rolls: 1,
                                    }));

                                    telegramNotify.warehouseTransferPicking(transferCompanyId, {
                                        transferNumber: permanentNumber || data?.transfer_number || '',
                                        fromWarehouseId: fromWhId || '',
                                        fromWarehouseName: fromWhName,
                                        toWarehouseName: toWhName,
                                        items: mappedItems,
                                        shippingMethod: data?.shipping_method || undefined,
                                        driverName: data?.driver_name || undefined,
                                        driverPhone: data?.driver_phone || undefined,
                                        vehicleNumber: data?.vehicle_number || undefined,
                                        notes: data?.notes || undefined,
                                    });
                                }
                            } catch (tgErr) {
                                console.warn('[Transfer] Telegram notification failed (non-blocking):', tgErr);
                            }

                            // Close sheet and go back to transfers list
                            onRefresh?.();
                            onClose();
                            break;
                        }

                        // ═══ Standard (Sales/Purchase) confirmation ═══
                        // Step 2: Confirm (update stage)
                        const { error } = await supabase
                            .from(tableName)
                            .update({ stage: 'confirmed', updated_at: new Date().toISOString() })
                            .eq('id', docId);
                        if (error) throw error;

                        // Step 3: Assign permanent sequential number at confirmation
                        const serviceDocType = TRADE_TYPE_MAP[modeKey]?.[docType] || (tradeMode === 'purchase' ? 'purchase_invoice' : 'invoice');
                        const saveCompanyId = data?.company_id || companyId;
                        let permanentNumber = '';
                        try {
                            const { TradeService } = await import('@/features/trade/services/TradeService');
                            permanentNumber = await TradeService.assignPermanentNumber(docId, serviceDocType, saveCompanyId);
                        } catch (numErr) {
                            console.error('Failed to assign permanent number:', numErr);
                        }

                        const numberFieldMap: Record<string, string> = {
                            purchase_invoice: 'invoice_no',
                            invoice: 'invoice_no',
                            purchase_order: 'order_number',
                            order: 'order_number',
                            purchase_quotation: 'quotation_number',
                            quotation: 'quotation_number',
                            purchase_receipt: 'receipt_number',
                            purchase_return: 'return_number',
                            sales_return: 'return_number',
                        };
                        const numberField = numberFieldMap[serviceDocType] || 'invoice_no';

                        setData((prev: any) => prev ? {
                            ...prev,
                            id: docId,
                            stage: 'confirmed',
                            status: 'confirmed',
                            ...(permanentNumber ? { [numberField]: permanentNumber } : {}),
                        } : prev);
                        setHasChanges(false);

                        // Transition to view mode after save+confirm
                        if (mode === 'create') {
                            handleModeChange('view');
                        }

                        invalidateTradeQueries(queryClient);

                        const isSales = modeKey === 'sales';
                        toast.success(
                            language === 'ar'
                                ? `✅ تم حفظ وتأكيد الفاتورة بنجاح${permanentNumber ? ` — الرقم: ${permanentNumber}` : ''}${isSales ? '\n📦 سيتم إشعار أمين المستودع لتجهيز الطلب' : ''}`
                                : `✅ Invoice saved & confirmed${permanentNumber ? ` — Number: ${permanentNumber}` : ''}${isSales ? '\n📦 Warehouse keeper will be notified' : ''}`,
                        );

                        // 📱 Telegram: Send warehouse notification for confirmed sales/purchases
                        try {
                            const { telegramNotify } = await import('@/services/telegramNotificationService');
                            const confirmCompanyId = data?.company_id || companyId;
                            if (confirmCompanyId) {
                                const docNo = permanentNumber || data?.invoice_no || data?.order_number || docId.substring(0, 8);

                                if (isSales) {
                                    // Fetch items with material_id
                                    const { data: sItems } = await supabase
                                        .from('sales_transaction_items')
                                        .select('material_id, description_ar, description, quantity, unit, rolls_count, color_name')
                                        .eq('transaction_id', docId);

                                    let whName = '';
                                    if (data?.warehouse_id) {
                                        const { data: wh } = await supabase.from('warehouses').select('name_ar').eq('id', data.warehouse_id).maybeSingle();
                                        whName = wh?.name_ar || '';
                                    }

                                    telegramNotify.warehousePickingOrder(confirmCompanyId, {
                                        orderNumber: docNo,
                                        customerName: data?.customer_name || data?.party_name || '-',
                                        warehouseId: data?.warehouse_id || undefined,
                                        warehouseName: whName || undefined,
                                        items: (sItems || []).map((i: any) => ({
                                            materialId: i.material_id || undefined,
                                            name: i.description_ar || i.description || '-',
                                            qty: i.quantity || 0,
                                            unit: i.unit || 'م',
                                            rolls: i.rolls_count || undefined,
                                            color: i.color_name || undefined,
                                        })),
                                        totalAmount: data?.total_amount || data?.grand_total || 0,
                                        currency: data?.currency || 'TRY',
                                        shippingMethod: data?.delivery_method || data?.shipping_method || undefined,
                                        shippingAddress: data?.shipping_address || undefined,
                                        driverName: data?.driver_name || undefined,
                                        notes: data?.notes || undefined,
                                    });
                                } else {
                                    // Purchase confirmation → warehouse receiving
                                    const { data: pItems } = await supabase
                                        .from('purchase_transaction_items')
                                        .select('material_id, description_ar, description, quantity, unit, rolls_count, color_name')
                                        .eq('transaction_id', docId);

                                    let whName = '';
                                    if (data?.warehouse_id) {
                                        const { data: wh } = await supabase.from('warehouses').select('name_ar').eq('id', data.warehouse_id).maybeSingle();
                                        whName = wh?.name_ar || '';
                                    }

                                    telegramNotify.warehouseReceivingOrder(confirmCompanyId, {
                                        orderNumber: docNo,
                                        supplierName: data?.supplier_name || data?.party_name || '-',
                                        warehouseId: data?.warehouse_id || undefined,
                                        warehouseName: whName || undefined,
                                        items: (pItems || []).map((i: any) => ({
                                            materialId: i.material_id || undefined,
                                            name: i.description_ar || i.description || '-',
                                            qty: i.quantity || 0,
                                            unit: i.unit || 'م',
                                            rolls: i.rolls_count || undefined,
                                            color: i.color_name || undefined,
                                        })),
                                        totalAmount: data?.total_amount || data?.grand_total || 0,
                                        currency: data?.currency || 'TRY',
                                        notes: data?.notes || undefined,
                                    });
                                }
                            }
                        } catch (tgErr) {
                            console.warn('[SaveConfirm] Telegram notification failed (non-blocking):', tgErr);
                        }

                        onRefresh?.();
                    } catch (err: any) {
                        console.error('SaveConfirm failed:', err);
                        toast.error(language === 'ar' ? 'فشل في حفظ أو تأكيد المستند' : 'Failed to save/confirm document', { description: err?.message });
                    } finally {
                        setLoading(false);
                    }
                    break;
                }

                // ═══ إلغاء التأكيد — إعادة الفاتورة من confirmed إلى draft ═══
                case 'unconfirm': {
                    if (!isTradeDocType) break;
                    const unconfDocId = data?.id || documentId;
                    if (!unconfDocId) break;

                    // Check current stage — only allow unconfirm from 'confirmed'
                    const currentStage = data?.stage;
                    if (currentStage !== 'confirmed') {
                        toast.error(
                            language === 'ar'
                                ? 'لا يمكن إلغاء التأكيد — الحالة الحالية ليست "مؤكد"'
                                : 'Cannot unconfirm — current stage is not "confirmed"',
                        );
                        break;
                    }

                    // Safety: check if any receipt/delivery exists for this invoice
                    if (tradeMode === 'purchase') {
                        const { data: existingReceipts } = await supabase
                            .from('purchase_receipts')
                            .select('id')
                            .eq('invoice_id', unconfDocId)
                            .limit(1);
                        if (existingReceipts && existingReceipts.length > 0) {
                            toast.error(
                                language === 'ar'
                                    ? 'لا يمكن إلغاء التأكيد — يوجد استلام بضاعة مرتبط بهذه الفاتورة'
                                    : 'Cannot unconfirm — a goods receipt is linked to this invoice',
                            );
                            break;
                        }
                    } else {
                        // Sales: check for delivery notes
                        try {
                            const { data: existingDeliveries } = await supabase
                                .from('stock_movements')
                                .select('id')
                                .eq('reference_id', unconfDocId)
                                .eq('movement_type', 'out')
                                .limit(1);
                            if (existingDeliveries && existingDeliveries.length > 0) {
                                toast.error(
                                    language === 'ar'
                                        ? 'لا يمكن إلغاء التأكيد — يوجد إذن تسليم مرتبط بهذه الفاتورة'
                                        : 'Cannot unconfirm — a delivery note is linked to this invoice',
                                );
                                break;
                            }
                        } catch { /* stock_movements may not exist yet — allow unconfirm */ }
                    }

                    const confirmUnconfirm = window.confirm(
                        language === 'ar'
                            ? 'هل تريد إعادة الفاتورة لحالة المسودة؟'
                            : 'Return this invoice to draft?',
                    );

                    if (confirmUnconfirm) {
                        setLoading(true);
                        try {
                            const unconfModeKey = tradeMode || 'sales';
                            const unconfTableName = TRADE_TABLE_MAP[unconfModeKey]?.[docType] || (tradeMode === 'purchase' ? 'purchase_transactions' : 'sales_transactions');
                            // Revert to DRAFT number
                            const draftNumber = `DRAFT-${Date.now().toString().slice(-6)}`;
                            const unconfServiceDocType = TRADE_TYPE_MAP[unconfModeKey]?.[docType] || (tradeMode === 'purchase' ? 'purchase_invoice' : 'invoice');
                            const unconfNumberFieldMap: Record<string, string> = {
                                purchase_invoice: 'invoice_no',
                                invoice: 'invoice_no',
                                purchase_order: 'order_number',
                                order: 'order_number',
                                purchase_quotation: 'quotation_number',
                                quotation: 'quotation_number',
                            };
                            const unconfNumberField = unconfNumberFieldMap[unconfServiceDocType] || 'invoice_no';

                            const { error: unconfError } = await supabase
                                .from(unconfTableName)
                                .update({
                                    stage: 'draft',
                                    [unconfNumberField]: draftNumber,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', unconfDocId);
                            if (unconfError) throw unconfError;

                            setData((prev: any) => prev ? { ...prev, stage: 'draft', [unconfNumberField]: draftNumber } : prev);
                            setHasChanges(false);
                            invalidateTradeQueries(queryClient);
                            toast.success(
                                language === 'ar'
                                    ? '✅ تم إعادة الفاتورة لحالة المسودة'
                                    : '✅ Invoice returned to draft',
                            );
                            onRefresh?.();
                        } catch (err: any) {
                            console.error('Unconfirm failed:', err);
                            toast.error(
                                language === 'ar' ? 'فشل في إلغاء التأكيد' : 'Failed to unconfirm',
                                { description: err?.message },
                            );
                        } finally {
                            setLoading(false);
                        }
                    }
                    break;
                }

                case 'post':
                    if (onPost) {
                        setLoading(true);
                        await onPost();
                        toast.success(t('messages.postedSuccessfully') || 'تم الترحيل بنجاح');
                        if (documentId) onRefresh?.();
                    } else if (isTradeDocType && isPostableDocType && (documentId || data?.id)) {
                        let needConfirmation = true;
                        if (companyId) {
                            try {
                                const { data: settingsJson } = await supabase.rpc('get_workflow_settings', { p_company_id: companyId });
                                needConfirmation = settingsJson?.require_post_confirmation !== false;
                            } catch { /* use default */ }
                        }

                        let shouldPost = true;
                        if (needConfirmation) {
                            shouldPost = window.confirm(
                                language === 'ar'
                                    ? 'هل تريد ترحيل هذا المستند؟ سيتم تثبيته ولن يمكن تعديله بسهولة.'
                                    : 'Post this document? It will be finalized and harder to edit.'
                            );
                        }

                        if (shouldPost) {
                            setLoading(true);
                            // Validate before posting
                            if ((docType === 'trade_invoice' || docType === 'trade_order')) {
                                const partyId = data?.party_id || data?.customer_id || data?.supplier_id;
                                if (!partyId) {
                                    setLoading(false);
                                    toast.error(language === 'ar' ? 'خطأ كارثي: لا يوجد مورد محدد للفاتورة!' : 'Critical Error: Missing Supplier');
                                    return;
                                }
                            }

                            const modeKey = tradeMode || 'sales';
                            const tableName = TRADE_POST_MAP[modeKey]?.[docType];
                            const docId = documentId || data?.id;
                            if (tableName && docId) {
                                // Smart Posting for Purchase Invoices
                                if (modeKey === 'purchase' && docType === 'trade_invoice') {
                                    try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        const user = session?.user;
                                        if (user) {
                                            const currentStage = data?.stage || 'confirmed';
                                            const { purchaseAccountingService } = await import('@/services/purchaseAccountingService');
                                            const result = await purchaseAccountingService.createPurchaseInvoiceJournalEntry(
                                                docId,
                                                user.id,
                                                { fromStage: currentStage }
                                            );

                                            // Update data with journal entry info
                                            setData((prev: any) => ({
                                                ...prev,
                                                journal_entry_id: result.journalEntryId,
                                                stage: 'posted',
                                                status: 'posted',
                                                is_posted: true,
                                                posted_at: new Date().toISOString(),
                                            }));

                                            // Show success with posting source info
                                            const sourceLabel = result.postingSource === 'receipt'
                                                ? (language === 'ar' ? '(بالكميات المستلمة)' : '(from received quantities)')
                                                : (language === 'ar' ? '(بقيم الفاتورة)' : '(from invoice amounts)');

                                            toast.success(
                                                language === 'ar'
                                                    ? `✅ تم الترحيل وإنشاء القيد المحاسبي ${sourceLabel}`
                                                    : `✅ Posted & Journal Entry Created ${sourceLabel}`
                                            );

                                            // Show variance warnings if any
                                            if (result.warnings.length > 0) {
                                                for (const warning of result.warnings) {
                                                    toast.warning(warning, { duration: 8000 });
                                                }
                                            }

                                            // Alert about significant variances
                                            if (result.hasSignificantVariance) {
                                                toast.warning(
                                                    language === 'ar'
                                                        ? `⚠️ فروقات كبيرة: ${result.variances.filter(v => !v.auto_accepted).length} أصناف تحتاج مراجعة`
                                                        : `⚠️ Significant variances: ${result.variances.filter(v => !v.auto_accepted).length} items need review`,
                                                    { duration: 10000 }
                                                );
                                            }
                                        }
                                    } catch (jeError: any) {
                                        console.error('Smart Posting failed:', jeError);
                                        toast.error(
                                            language === 'ar'
                                                ? '❌ فشل الترحيل: ' + jeError.message
                                                : '❌ Posting failed: ' + jeError.message
                                        );
                                        // Don't proceed — posting failed entirely
                                        setLoading(false);
                                        return;
                                    }
                                } else {
                                    // Non-purchase docs: standard posting
                                    const isTransaction = tableName.includes('_transactions');
                                    const { error } = await supabase.from(tableName)
                                        .update(isTransaction ? { stage: 'posted' } : { status: 'posted' })
                                        .eq('id', docId);
                                    if (error) throw error;
                                }
                                // For non-purchase-invoice docs, set posted state and show toast
                                // (purchase invoices already handled above with their own setData + toast)
                                if (!(modeKey === 'purchase' && docType === 'trade_invoice')) {
                                    setData((prev: any) => ({ ...prev, stage: 'posted', status: 'posted', is_posted: true }));
                                    toast.success(language === 'ar' ? '✅ تم ترحيل المستند بنجاح' : '✅ Document posted successfully');
                                }
                                invalidateTradeQueries(queryClient);
                                onRefresh?.();
                            }
                        }
                    }
                    break;

                case 'unpost':
                    if (onUnpost) {
                        setLoading(true);
                        await onUnpost();
                        toast.success(language === 'ar' ? 'تم إلغاء الترحيل' : 'Document unposted');
                        onRefresh?.();
                    } else if (isTradeDocType && isPostableDocType && (documentId || data?.id)) {
                        const confirmUnpost = window.confirm(
                            language === 'ar'
                                ? 'هل تريد إلغاء ترحيل هذا المستند؟ سيعود لحالة المسودة وسيلغى القيد المحاسبي.'
                                : 'Unpost this document? It will return to draft and the journal entry will be cancelled.'
                        );
                        if (confirmUnpost) {
                            setLoading(true);
                            const docId = documentId || data?.id;

                            // Special handling for Purchase Invoices
                            if (tradeMode === 'purchase' && docType === 'trade_invoice') {
                                try {
                                    const { purchaseAccountingService } = await import('@/services/purchaseAccountingService');
                                    await purchaseAccountingService.cancelPurchaseInvoiceJournalEntry(docId);
                                    setData((prev: any) => ({ ...prev, status: 'draft', confirmation_status: 'draft', is_posted: false }));
                                    invalidateTradeQueries(queryClient);
                                    queryClient.invalidateQueries({ queryKey: ['purchase_payment_history'] });
                                    toast.success(language === 'ar' ? '✅ تم إلغاء الترحيل والقيد المحاسبي' : '✅ Unposted and JE cancelled');
                                    onRefresh?.();
                                } catch (err: any) {
                                    console.error('Unpost error:', err);
                                    toast.error(err.message || 'Error unposting');
                                }
                                setLoading(false);
                                break;
                            }

                            // Standard unpost
                            const modeKey = tradeMode || 'sales';
                            const tableName = TRADE_POST_MAP[modeKey]?.[docType];
                            if (tableName && docId) {
                                const isTransaction = tableName.includes('_transactions');
                                const { error } = await supabase.from(tableName)
                                    .update(isTransaction ? { stage: 'draft', is_posted: false, posted_at: null } : { status: 'draft', is_posted: false, posted_at: null })
                                    .eq('id', docId);
                                if (error) throw error;
                                setData((prev: any) => ({ ...prev, status: 'draft', is_posted: false }));
                                invalidateTradeQueries(queryClient);
                                toast.success(language === 'ar' ? '✅ تم إلغاء الترحيل' : '✅ Document unposted');
                                onRefresh?.();
                            }
                        }
                    }
                    break;

                case 'duplicate':
                    if (onDuplicate) {
                        onDuplicate();
                    } else if (isTradeDocType && data) {
                        const duplicatedData = {
                            ...data,
                            id: undefined, document_number: undefined,
                            order_number: undefined, invoice_number: undefined,
                            quotation_number: undefined, delivery_number: undefined,
                            return_number: undefined, reservation_number: undefined,
                            status: 'draft', confirmation_status: undefined,
                            confirmed_at: undefined, confirmed_by: undefined,
                            delivery_note_id: undefined, approval_status: undefined,
                            date: new Date().toISOString(),
                            created_at: undefined, updated_at: undefined,
                            type: data.type || data.subType,
                            subType: data.subType || data.type,
                        };
                        setData(duplicatedData);
                        handleModeChange('create');
                        setHasChanges(true);
                        toast.success(language === 'ar' ? '📋 تم نسخ المستند — عدّل ثم احفظ' : '📋 Document duplicated — edit and save');
                    } else {
                        toast.info(t('messages.featureComingSoon') || 'قريباً');
                    }
                    break;

                // ═══ إغلاق الحاوية — تسكير دورة الحياة ═══
                case 'close_container': {
                    if (docType !== 'trade_container') break;
                    const closeDocId = data?.id || documentId;
                    if (!closeDocId) break;

                    const currentContainerStatus = data?.status || '';
                    // Only allow closing when fully received — NOT in_receiving (partial)
                    const closableStatuses = ['received', 'fully_received', 'completed'];
                    if (!closableStatuses.includes(currentContainerStatus)) {
                        const isPartialReceiving = currentContainerStatus === 'in_receiving';
                        toast.warning(
                            language === 'ar'
                                ? isPartialReceiving
                                    ? '⚠️ لا يمكن إغلاق الحاوية — الاستلام لم يكتمل بعد. يرجى إكمال استلام جميع البنود أولاً'
                                    : '⚠️ لا يمكن إغلاق الحاوية — يجب إتمام الاستلام الفعلي أولاً'
                                : isPartialReceiving
                                    ? '⚠️ Cannot close — receiving is still in progress. Complete all items first'
                                    : '⚠️ Cannot close container — complete physical receiving first',
                        );
                        break;
                    }

                    // Block closing if variance review is still pending
                    if (data?.variance_status === 'pending_review') {
                        toast.warning(
                            language === 'ar'
                                ? '⚠️ لا يمكن إغلاق الحاوية — يوجد فروقات كميات تحتاج مراجعة المحاسب. راجع تبويب "ملخص الاستلام" أولاً'
                                : '⚠️ Cannot close — quantity variances need accountant review. Check "Receipt Summary" tab first',
                        );
                        break;
                    }

                    const confirmed = window.confirm(
                        language === 'ar'
                            ? '🔒 هل تريد إغلاق هذه الحاوية نهائياً؟\n\nبعد الإغلاق:\n• لن يمكن تعديلها\n• ستكون للمرجعية والتقارير فقط\n• سيتم تسكير جميع الأرقام المحاسبية\n\nتأكيد الإغلاق؟'
                            : '🔒 Close this container permanently?\n\nAfter closing:\n• No further edits allowed\n• Reference and reports only\n• All accounting figures will be locked\n\nConfirm?'
                    );

                    if (!confirmed) break;

                    setLoading(true);
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const authUser = session?.user;

                        // ══════════════════════════════════════════
                        // 🛡️ Race Condition Guard (B.5)
                        // منع إغلاق الكونتينر مرتين
                        // ══════════════════════════════════════════
                        const { data: currentState } = await supabase
                            .from('containers')
                            .select('status, closing_journal_entry_id')
                            .eq('id', closeDocId)
                            .single();

                        if (currentState?.status === 'closed' || currentState?.closing_journal_entry_id) {
                            toast.error(
                                language === 'ar'
                                    ? '⚠️ الكونتينر مغلق بالفعل — لا يمكن إغلاقه مرة ثانية'
                                    : '⚠️ Container is already closed — cannot close again'
                            );
                            setLoading(false);
                            break;
                        }

                        // ══════════════════════════════════════════
                        // A. إنشاء القيد المحاسبي: Dr. مخزون / Cr. كونتينر
                        // ══════════════════════════════════════════
                        let closingJournalEntryId: string | null = null;
                        try {
                            // 1. جلب بيانات الكونتينر
                            const { data: containerData } = await supabase
                                .from('containers')
                                .select('container_account_id, company_id, tenant_id, total_cost, container_number')
                                .eq('id', closeDocId)
                                .single();

                            if (containerData?.container_account_id && containerData?.company_id) {
                                // 2. جلب بيانات حساب الكونتينر من CoA (الأعمدة الصحيحة)
                                const { data: coaAccount } = await supabase
                                    .from('chart_of_accounts')
                                    .select('id, account_code, name_ar, name_en, current_balance, opening_balance')
                                    .eq('id', containerData.container_account_id)
                                    .maybeSingle();

                                // 3. جلب حساب المخزون من companies.accounting_settings (المصدر المركزي)
                                const { data: companySettings } = await supabase
                                    .from('companies')
                                    .select('accounting_settings')
                                    .eq('id', containerData.company_id)
                                    .maybeSingle();

                                let inventoryAccountId =
                                    companySettings?.accounting_settings?.default_accounts?.inventory_account_id;

                                // 3b. fallback: ابحث في CoA مباشرة (كود 1141 أو اسم مخزون)
                                if (!inventoryAccountId) {
                                    const { data: invFallback } = await supabase
                                        .from('chart_of_accounts')
                                        .select('id, account_code, name_ar')
                                        .eq('company_id', containerData.company_id)
                                        .or('account_code.like.1141%,name_ar.ilike.%بضاعة جاهزة%,name_ar.ilike.%مخزون%')
                                        .order('account_code')
                                        .limit(1)
                                        .maybeSingle();
                                    inventoryAccountId = invFallback?.id;
                                }

                                // جلب تفاصيل حساب المخزون (للاسم)
                                let inventoryAccountCode = '';
                                let inventoryAccountName = '';
                                if (inventoryAccountId) {
                                    const { data: invAcc } = await supabase
                                        .from('chart_of_accounts')
                                        .select('account_code, name_ar, name_en')
                                        .eq('id', inventoryAccountId)
                                        .maybeSingle();
                                    inventoryAccountCode = invAcc?.account_code || '';
                                    inventoryAccountName = language === 'ar'
                                        ? (invAcc?.name_ar || 'مخزون')
                                        : (invAcc?.name_en || invAcc?.name_ar || 'Inventory');
                                }

                                const containerAccountCode = coaAccount?.account_code || '';
                                const containerAccountName = coaAccount?.name_ar || containerData.container_number;

                                // الرصيد = current_balance أو opening_balance أو total_cost
                                const containerBalance = Math.abs(
                                    coaAccount?.current_balance ?? coaAccount?.opening_balance ?? containerData.total_cost ?? 0
                                );

                                if (inventoryAccountId && containerBalance > 0) {
                                    // 4. رقم القيد
                                    const now = new Date();
                                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                                    const entryNumber = `JE-CLZ-${containerData.container_number}-${now.getFullYear()}${mm}`;

                                    // 5. إنشاء القيد
                                    const { data: newJE, error: jeError } = await supabase
                                        .from('journal_entries')
                                        .insert({
                                            entry_number: entryNumber,
                                            entry_date: now.toISOString().split('T')[0],
                                            entry_type: 'container_close',
                                            status: 'posted',
                                            description: language === 'ar'
                                                ? `إقفال ${containerAccountCode} ${containerAccountName} → ${inventoryAccountCode} ${inventoryAccountName}`
                                                : `Close ${containerAccountCode} ${containerAccountName} → ${inventoryAccountCode} ${inventoryAccountName}`,
                                            notes: `container_id:${closeDocId}`,
                                            reference_id: closeDocId,
                                            reference_type: 'container',
                                            total_debit: containerBalance,
                                            total_credit: containerBalance,
                                            company_id: containerData.company_id,
                                            tenant_id: containerData.tenant_id || null,
                                            created_by: authUser?.id || null,
                                            posted_by: authUser?.id || null,
                                            posted_at: now.toISOString(),
                                        })
                                        .select('id')
                                        .single();

                                    if (!jeError && newJE) {
                                        closingJournalEntryId = newJE.id;

                                        // 6. سطور القيد — تستخدم entry_id (الاسم الصحيح في DB)
                                        await supabase.from('journal_entry_lines').insert([
                                            {
                                                entry_id: newJE.id,
                                                account_id: inventoryAccountId,
                                                debit: containerBalance,
                                                credit: 0,
                                                line_number: 1,
                                                description: `${inventoryAccountCode} ${inventoryAccountName} — ${containerData.container_number}`,
                                            },
                                            {
                                                entry_id: newJE.id,
                                                account_id: containerData.container_account_id,
                                                debit: 0,
                                                credit: containerBalance,
                                                line_number: 2,
                                                description: `${containerAccountCode} ${containerAccountName} — إقفال`,
                                            },
                                        ]);

                                        // 7. تحديث أرصدة الحسابات
                                        // أ) الكونتينر → صفر
                                        await supabase
                                            .from('chart_of_accounts')
                                            .update({ current_balance: 0 })
                                            .eq('id', containerData.container_account_id);

                                        // ب) المخزون → يزيد بقيمة الكونتينر
                                        const { data: invBal } = await supabase
                                            .from('chart_of_accounts')
                                            .select('current_balance')
                                            .eq('id', inventoryAccountId)
                                            .maybeSingle();
                                        await supabase
                                            .from('chart_of_accounts')
                                            .update({ current_balance: (invBal?.current_balance || 0) + containerBalance })
                                            .eq('id', inventoryAccountId);
                                    }
                                }
                            }
                        } catch (jeErr) {
                            console.warn('Container closing JE creation failed (non-fatal):', jeErr);
                            // القيد اختياري — لا نوقف الإغلاق إذا فشل
                        }

                        // ══════════════════════════════════════════
                        // B. تغيير status الكونتينر → closed
                        // ══════════════════════════════════════════
                        let closeError: any = null;
                        const fullUpdate = await supabase
                            .from('containers')
                            .update({
                                status: 'closed',
                                closed_at: new Date().toISOString(),
                                closed_by: authUser?.id || null,
                                closing_journal_entry_id: closingJournalEntryId,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', closeDocId);

                        if (fullUpdate.error) {
                            // Fallback: بدون الأعمدة الاختيارية
                            const fallback = await supabase
                                .from('containers')
                                .update({
                                    status: 'closed',
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', closeDocId);
                            closeError = fallback.error;
                        }

                        if (closeError) throw closeError;

                        // Log to activity
                        try {
                            const { activityLogService } = await import('@/services/activityLogService');
                            await activityLogService.logEvent({
                                table: 'containers',
                                documentId: closeDocId,
                                event: 'posted', // closest available event type
                                userId: authUser?.id || '',
                                userName: authUser?.user_metadata?.full_name || authUser?.email || 'System',
                                details: { action: 'closed', previous_status: currentContainerStatus }
                            });
                        } catch { /* non-fatal */ }

                        setData((prev: any) => ({
                            ...prev,
                            status: 'closed',
                            closed_at: new Date().toISOString(),
                        }));

                        queryClient.invalidateQueries({ queryKey: ['containers_list'] });
                        toast.success(
                            language === 'ar'
                                ? '🔒 تم إغلاق الحاوية بنجاح — أصبحت مرجعاً للتقارير'
                                : '🔒 Container closed successfully — now available for reports only',
                            { duration: 5000 }
                        );
                        onRefresh?.();
                    } catch (err: any) {
                        console.error('Close container failed:', err);
                        toast.error(
                            language === 'ar' ? `فشل إغلاق الحاوية: ${err.message}` : `Failed to close: ${err.message}`
                        );
                    } finally {
                        setLoading(false);
                    }
                    break;
                }



                case 'print':
                    onPrint?.();
                    break;

                case 'refresh':
                    onRefresh?.();
                    break;

                case 'convertToCustomer':
                    if (data?.id) {
                        const confirmed = window.confirm(
                            language === 'ar' ? 'هل تريد تحويل جهة الاتصال إلى عميل؟' : 'Convert this contact to a customer?'
                        );
                        if (confirmed) {
                            try {
                                const { contactsService } = await import('@/services/contactsService');
                                const result = await contactsService.convertToCustomer(data.id);
                                if (result.success) {
                                    toast.success(language === 'ar' ? 'تم التحويل بنجاح' : 'Converted successfully');
                                    onRefresh?.();
                                } else {
                                    toast.error(result.message);
                                }
                            } catch (err: any) {
                                toast.error(err.message);
                            }
                        }
                    }
                    break;

                case 'export':
                    toast.info(t('messages.featureComingSoon') || 'قريباً');
                    break;

                case 'confirm': {
                    if (!companyId) {
                        toast.error(language === 'ar' ? 'حدد الشركة أولاً' : 'Select company first');
                        break;
                    }

                    const confDocType = resolveConfDocType(docType, tradeMode);

                    // Purchase: Direct confirmation
                    if (tradeMode === 'purchase') {
                        setLoading(true);
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const user = session?.user;
                            if (!user) {
                                toast.error(language === 'ar' ? 'لم يتم التعرف على المستخدم' : 'User not found');
                                break;
                            }
                            const purchaseSettings = await confirmationService.getWorkflowSettings(companyId);
                            const result = await confirmationService.confirmDocument(
                                confDocType, documentId || data?.id || '', data,
                                data?.tenant_id || '', companyId, user.id, purchaseSettings
                            );
                            if (result.success) {
                                toast.success(language === 'ar' ? result.message_ar : result.message_en);
                                setData((prev: any) => ({ ...prev, confirmation_status: 'confirmed', status: 'confirmed' }));
                                onRefresh?.();
                            } else {
                                toast.error(language === 'ar' ? result.message_ar : result.message_en);
                            }
                        } catch (err: any) {
                            toast.error(err.message);
                        } finally {
                            setLoading(false);
                        }
                        break;
                    }

                    // Sales: Show confirmation dialog
                    setLoading(true);
                    try {
                        const salesSettings = await confirmationService.getWorkflowSettings(companyId);
                        setConfirmSettings(salesSettings);
                        const needsApproval = confirmationService.isApprovalRequired(confDocType, salesSettings, data);
                        setConfirmNeedsApproval(needsApproval);
                        const validation = await confirmationService.validateForConfirmation(
                            confDocType, documentId || data?.id || '', data, salesSettings
                        );
                        setConfirmValidation(validation);
                        setConfirmDialogOpen(true);
                    } catch (err: any) {
                        toast.error(err.message);
                    } finally {
                        setLoading(false);
                    }
                    break;
                }

                case 'cancel': {
                    if (mode === 'create') {
                        // ═══ Create mode: delete auto-saved draft and close ═══
                        const cancelDocId = data?.id || documentId;
                        if (cancelDocId && isTradeDocType) {
                            try {
                                const cancelModeKey = tradeMode || 'sales';
                                const cancelTableName = TRADE_TABLE_MAP[cancelModeKey]?.[docType];
                                if (cancelTableName) {
                                    await supabase.from(cancelTableName).delete().eq('id', cancelDocId);
                                    console.log(`[Cancel] 🗑️ Deleted draft ${cancelDocId} from ${cancelTableName}`);
                                    invalidateTradeQueries(queryClient);
                                }
                            } catch (delErr) {
                                console.warn('[Cancel] Failed to delete draft:', delErr);
                            }
                        }
                        onClose();
                    } else if (tradeMode === 'transfer') {
                        // ═══ Transfer in edit mode (auto-saved from create): delete draft and close ═══
                        const cancelStage = data?.stage || '';
                        const isDraftTransfer = !cancelStage || cancelStage === 'draft';
                        const cancelDocId = data?.id || documentId;
                        if (isDraftTransfer && cancelDocId) {
                            try {
                                const cancelTableName = TRADE_TABLE_MAP['transfer']?.[docType];
                                if (cancelTableName) {
                                    await supabase.from(cancelTableName).delete().eq('id', cancelDocId);
                                    console.log(`[Cancel] 🗑️ Deleted transfer draft ${cancelDocId}`);
                                    invalidateTradeQueries(queryClient);
                                }
                            } catch (delErr) {
                                console.warn('[Cancel] Failed to delete transfer draft:', delErr);
                            }
                            onClose();
                        } else {
                            // Non-draft transfer in edit mode — revert to view
                            setData(initialData);
                            setHasChanges(false);
                            handleModeChange('view');
                        }
                    } else {
                        // ═══ Sales/Purchase in edit mode — original behavior: revert to view ═══
                        setData(initialData);
                        setHasChanges(false);
                        handleModeChange('view');
                    }
                    break;
                }

                default:
                    console.log('Unknown action:', actionId);
            }
        } catch (error: any) {
            console.error('Action error:', error);
            toast.error(error.message || t('messages.error') || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    }, [
        data, onSave, onDelete, onPost, onUnpost, onDuplicate, onPrint, onRefresh, onClose,
        documentId, handleModeChange, handleAccountingSave, handleTradeSave,
        isAccountingDocType, isTradeDocType,
        isPostableDocType, mode, t, companyId, language, tradeMode, docType, queryClient,
        enableEditFlow, onEditPermissionDenied, onAdjustmentRequired,
        initialData, hasChanges, setData, setMode, setLoading, setHasChanges,
        setConfirmDialogOpen, setConfirmValidation, setConfirmSettings, setConfirmNeedsApproval,
    ]);
}
