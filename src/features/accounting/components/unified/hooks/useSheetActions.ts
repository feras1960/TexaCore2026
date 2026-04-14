/**
 * useSheetActions — Custom hook for all sheet action handlers
 * 
 * Extracted from UnifiedAccountingSheet to reduce file size.
 * Contains: handleAccountingSave, handleTradeSave, handleAction, autoSave
 */

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { invalidateAccountsCache } from '@/components/ui/InlineAccountCell';
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
    handleAccountingSave: (data: any) => Promise<string | undefined>;
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
    const isAccountingDocType = ['journal', 'cash', 'receipt', 'payment', 'transfer', 'exchange', 'debit_note', 'credit_note', 'recurring'].includes(docType);
    const isRecurring = docType === 'recurring';

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

        // ═══ RECURRING ENTRY — حفظ في جداول مستقلة ═══
        if (isRecurring) {
            // Filter empty lines
            const finalLines = (saveData.lines || []).filter((l: any) =>
                l.account_id && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0)
            );

            // Validation: at least 2 lines
            if (finalLines.length < 2) {
                toast.error(t('accounting.errors.saveFailed') || 'فشل الحفظ', {
                    description: t('accounting.errors.minLinesRequired') || 'يجب إدخال بندين على الأقل',
                });
                return;
            }

            // Balance check
            const totalDebit = finalLines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
            const totalCredit = finalLines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.1) {
                toast.error(t('accounting.errors.notBalanced') || 'القيد غير متوازن!', {
                    description: `${t('accounting.debit') || 'مدين'}: ${totalDebit.toFixed(2)} ≠ ${t('accounting.credit') || 'دائن'}: ${totalCredit.toFixed(2)}`,
                });
                return;
            }

            // Get tenant_id
            const { data: companyData } = await supabase
                .from('companies')
                .select('tenant_id')
                .eq('id', saveCompanyId)
                .single();

            const tenantId = companyData?.tenant_id;
            if (!tenantId) {
                toast.error('Could not resolve tenant');
                return;
            }

            const startDate = saveData.start_date || new Date().toISOString().split('T')[0];

            // ═══ Smart next_run_date calculation ═══
            let nextRunDate = saveData.next_run_date || startDate;
            if (!saveData.next_run_date) {
                const freq = saveData.frequency || 'monthly';
                const dayOfMonth = saveData.day_of_month;
                const now = new Date();

                if (freq === 'monthly' && dayOfMonth) {
                    // Set to day_of_month of current or next month
                    const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
                    if (thisMonth > now) {
                        nextRunDate = thisMonth.toISOString().split('T')[0];
                    } else {
                        // Next month
                        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
                        nextRunDate = nextMonth.toISOString().split('T')[0];
                    }
                } else if (freq === 'weekly' && saveData.day_of_week != null) {
                    // Set to next occurrence of day_of_week (0=Sun, 1=Mon, ...)
                    const target = saveData.day_of_week;
                    const current = now.getDay();
                    const daysUntil = (target - current + 7) % 7 || 7;
                    const nextDate = new Date(now);
                    nextDate.setDate(nextDate.getDate() + daysUntil);
                    nextRunDate = nextDate.toISOString().split('T')[0];
                } else if (freq === 'yearly' && saveData.month_of_year && dayOfMonth) {
                    // Set to specific month and day
                    let targetYear = now.getFullYear();
                    const target = new Date(targetYear, saveData.month_of_year - 1, dayOfMonth);
                    if (target <= now) targetYear++;
                    nextRunDate = new Date(targetYear, saveData.month_of_year - 1, dayOfMonth).toISOString().split('T')[0];
                }
            }

            // Build recurring entry record
            const recurringRecord = {
                tenant_id: tenantId,
                company_id: saveCompanyId,
                name_ar: saveData.name_ar || saveData.description || 'قيد متكرر',
                name_en: saveData.name_en || saveData.name_ar || 'Recurring Entry',
                description: saveData.description || '',
                frequency: saveData.frequency || 'monthly',
                interval_value: saveData.interval_value || 1,
                day_of_month: saveData.day_of_month || (saveData.frequency === 'monthly' || !saveData.frequency ? 1 : null),
                day_of_week: saveData.day_of_week || null,
                month_of_year: saveData.month_of_year || null,
                start_date: startDate,
                end_date: saveData.end_date || null,
                next_run_date: nextRunDate,
                max_executions: saveData.max_executions || null,
                amount: totalDebit,
                currency: saveData.currency || 'UAH',
                requires_approval: saveData.requires_approval ?? true,
                auto_post: saveData.auto_post ?? false,
                notify_days_before: saveData.notify_days_before ?? 3,
                status: saveData.status || 'active',
            };

            const entryId = saveData.id || documentId;

            if (mode === 'edit' && entryId) {
                // Update existing
                const { error } = await supabase
                    .from('recurring_entries')
                    .update(recurringRecord)
                    .eq('id', entryId);

                if (error) throw error;

                // Delete old lines and re-insert
                await supabase.from('recurring_entry_lines').delete().eq('recurring_entry_id', entryId);

                const linesToInsert = finalLines.map((line: any, idx: number) => ({
                    tenant_id: tenantId,
                    recurring_entry_id: entryId,
                    line_number: idx + 1,
                    account_id: line.account_id,
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    description: line.description || '',
                    cost_center_id: line.cost_center_id || null,
                }));

                const { error: linesError } = await supabase
                    .from('recurring_entry_lines')
                    .insert(linesToInsert);

                if (linesError) throw linesError;

                return entryId;
            } else {
                // Create new
                const { data: newEntry, error } = await supabase
                    .from('recurring_entries')
                    .insert(recurringRecord)
                    .select('id')
                    .single();

                if (error) throw error;

                const newId = newEntry.id;

                // Insert lines
                const linesToInsert = finalLines.map((line: any, idx: number) => ({
                    tenant_id: tenantId,
                    recurring_entry_id: newId,
                    line_number: idx + 1,
                    account_id: line.account_id,
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    description: line.description || '',
                    cost_center_id: line.cost_center_id || null,
                }));

                const { error: linesError } = await supabase
                    .from('recurring_entry_lines')
                    .insert(linesToInsert);

                if (linesError) throw linesError;

                return newId;
            }
        }

        // ═══ STANDARD JOURNAL ENTRY SAVE (existing logic) ═══

        // Import service dynamically
        const { journalEntriesService } = await import('@/services/journalEntriesService');

        // Build entry lines
        const entryType = docType === 'receipt' ? 'receipt'
            : docType === 'payment' ? 'payment'
            : docType === 'cash' ? 'cash'
            : 'journal';

        // ✅ رشح الأسطر الفارغة أولاً (لا حساب + لا مبلغ)
        let finalLines = (saveData.lines || []).filter((l: any) =>
            l.account_id && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0)
        );

        // ─── Auto-add header balancing line for receipt / payment / cash ───
        const fundAccountId = saveData.fund_account_id || saveData.header_account_id;
        if (['receipt', 'payment', 'cash'].includes(entryType) && fundAccountId) {
            // ✅ استبعد سطر الصندوق إذا كان موجوداً في finalLines
            // (يحدث عند تحميل قيد محفوظ وإرجاع سطر الصندوق معه)
            // نحسب الحصاد من الأسطر غير الصندوق فقط، ثم نضيف سطر الصندوق من جديد
            finalLines = finalLines.filter((l: any) => l.account_id !== fundAccountId);

            const convertedDebit  = finalLines.reduce((s: number, l: any) => s + (Number(l.debit)  || 0) * (Number(l.exchange_rate) || 1), 0);
            const convertedCredit = finalLines.reduce((s: number, l: any) => s + (Number(l.credit) || 0) * (Number(l.exchange_rate) || 1), 0);
            const convertedTotal  = convertedDebit + convertedCredit;

            if (convertedTotal > 0) {
                let fundDebit = 0;
                let fundCredit = 0;

                if (entryType === 'receipt') {
                    // مقبوضات: الصندوق يستلم → مدين
                    fundDebit  = convertedTotal;
                    fundCredit = 0;
                } else if (entryType === 'payment') {
                    // مدفوعات: الصندوق يدفع → دائن
                    fundDebit  = 0;
                    fundCredit = convertedTotal;
                } else {
                    // cash (يومية صندوق): قد تحتوي مدفوعات ومقبوضات معاً
                    // ✅ نحسب الصافي لتفادي وجود مدين ودائن في نفس السطر
                    // chk_debit_or_credit يمنع ذلك
                    const netEffect = convertedDebit - convertedCredit; // موجب = مدفوعات أكثر، سالب = مقبوضات أكثر
                    if (netEffect > 0.001) {
                        // مدفوعات أكثر → الصندوق دائن (يخرج منه مال)
                        fundDebit  = 0;
                        fundCredit = Math.round(netEffect * 100) / 100;
                    } else if (netEffect < -0.001) {
                        // مقبوضات أكثر → الصندوق مدين (يدخل إليه مال)
                        fundDebit  = Math.round(Math.abs(netEffect) * 100) / 100;
                        fundCredit = 0;
                    } else {
                        // متساوٍ تماماً → لا يلزم سطر صندوق
                        fundDebit  = 0;
                        fundCredit = 0;
                    }
                }

                const fundCurrency = saveData.fund_currency || saveData.base_currency || saveData.currency || null;

                if (fundDebit > 0 || fundCredit > 0) {
                    finalLines.push({
                        account_id: fundAccountId,
                        description: saveData.description || (
                            entryType === 'receipt' ? 'سند قبض' :
                            entryType === 'payment' ? 'سند صرف' : 'يومية صندوق'
                        ),
                        debit:  Math.round(fundDebit  * 100) / 100,
                        credit: Math.round(fundCredit * 100) / 100,
                        cost_center_id: null,
                        currency: fundCurrency,
                        exchange_rate: 1,
                        is_fund_line: true,  // ← علامة تمييز السطر التلقائي
                    });
                }
            }
        }


        // Validation: at least 2 lines
        if (finalLines.filter((l: any) => l.account_id).length < 2) {
            toast.error(t('accounting.errors.saveFailed') || 'فشل الحفظ', {
                description: t('accounting.errors.minLinesRequired') || 'يجب إدخال بندين على الأقل (مع حساب الصندوق)',
            });
            return;
        }

        // ✅ التحقق من التوازن بالعملة الأساسية (بعد التحويل بسعر الصرف)
        // لأن الأسطر قد تكون بعملات مختلفة (USD, UAH, ...) وسطر الصندوق بعملته الأساسية
        const convDebit  = finalLines.reduce((sum: number, l: any) => sum + (Number(l.debit)  || 0) * (Number(l.exchange_rate) || 1), 0);
        const convCredit = finalLines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0) * (Number(l.exchange_rate) || 1), 0);

        if (Math.abs(convDebit - convCredit) > 0.1) {
            toast.error(t('accounting.errors.notBalanced') || 'القيد غير متوازن!', {
                description: `${t('accounting.debit') || 'مدين'}: ${convDebit.toFixed(2)} ≠ ${t('accounting.credit') || 'دائن'}: ${convCredit.toFixed(2)}`,
            });
            return;
        }

        // Build entry data
        const entryInput: Record<string, any> = {
            company_id: saveCompanyId,
            entry_date: saveData.entry_date || new Date().toISOString().split('T')[0],
            description: saveData.description || '',
            reference: saveData.reference || saveData.entry_number || undefined,
            entry_number: saveData.entry_number || undefined,
            entry_type: entryType,
            fund_account_id: fundAccountId || undefined,
            total_amount: saveData.total_amount || undefined,
            status: saveData._post ? 'posted' : 'draft',
            lines: finalLines.map((line: any) => ({
                account_id: line.account_id,
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                description: line.description || '',
                cost_center_id: line.cost_center_id || null,
                currency: line.currency || null,
                exchange_rate: Number(line.exchange_rate) || 1,
                link_type: line.link_type || null,
                invoice_id: line.invoice_id || null,
                is_fund_line: line.is_fund_line === true,  // ← يُخفى في تبويب القيد
            })),
        };

        // Create or Update in journal_entries
        const entryId = saveData.id || documentId;
        if (mode === 'edit' && entryId) {
            const result = await journalEntriesService.update(entryId, entryInput as any);
            // أرجع الـ ID حتى يستطيع useSheetActions استخدامه للترحيل
            return result?.id || entryId;
        } else {
            const result = await journalEntriesService.create(entryInput as any);
            // أرجع الـ ID الجديد — حاسم لعملية الترحيل بعد الحفظ
            return result?.id;
        }

    }, [isAccountingDocType, isRecurring, docType, companyId, documentId, mode, t]);
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
                    status: saveData.status || 'draft',
                    order_date: saveData.date || new Date().toISOString(),
                    departure_date: saveData.etd || saveData.departure_date || null,
                    expected_arrival_date: saveData.eta || saveData.expected_arrival_date || null,
                    base_currency: saveData.base_currency || saveData.currency || 'USD',
                    notes: saveData.notes || saveData.remarks || null,
                    created_by: authUser?.id,
                };

                const result = await createContainer(containerPayload as any);
                // Merge result but skip null values to preserve locally-set fields
                // (e.g., delivery_method set to 'store_pickup' locally but null in DB)
                setData((prev: any) => {
                    const filtered: Record<string, any> = { id: result.id };
                    for (const [k, v] of Object.entries(result)) {
                        if (v !== null && v !== undefined) filtered[k] = v;
                    }
                    return { ...prev, ...filtered };
                });
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
                    status: saveData.status,
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

        // Validate: party_id is required for CONFIRMED invoices/orders (drafts can save without it)
        const partyId = saveData.party_id || saveData.customer_id || saveData.supplier_id;
        const isTransferMode = tradeMode === 'transfer';
        const isDraftSave = !saveData._post && !saveData._confirm;
        if ((docType === 'trade_invoice' || docType === 'trade_order') && !partyId && !isTransferMode && !isDraftSave) {
            const errorMsg = language === 'ar' ? 'عذراً، يجب تحديد المورد/العميل قبل التأكيد' : 'Supplier/Customer is required before confirmation';
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

        // Sales-specific fields
        if (modeKey === 'sales') {
            if (saveData.delivery_method) docPayload.delivery_method = saveData.delivery_method;
            if (saveData.shipping_address_id) docPayload.shipping_address_id = saveData.shipping_address_id;
            if (saveData.shipping_address) docPayload.shipping_address = saveData.shipping_address;
            if (saveData.due_date) docPayload.due_date = saveData.due_date;
            if (saveData.salesperson_id) docPayload.salesperson_id = saveData.salesperson_id;
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
            // Merge result but skip null values to preserve locally-set fields
            // (e.g., delivery_method set to 'store_pickup' locally but null in DB)
            setData((prev: any) => {
                const filtered: Record<string, any> = { id: result.id };
                for (const [k, v] of Object.entries(result)) {
                    if (v !== null && v !== undefined) filtered[k] = v;
                }
                return { ...prev, ...filtered };
            });
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
        delay: 1500, // Near-instant save: saves ~1.5s after last change
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
    // ── Party balances — تحديث أرصدة الجهات فوراً ──
    queryClient.invalidateQueries({ queryKey: ['party_balances_supplier'] });
    queryClient.invalidateQueries({ queryKey: ['party_balances_customer'] });
    queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
    // ── Purchase/Sales Stats — تحديث إحصائيات الموردين/العملاء ──
    queryClient.invalidateQueries({ queryKey: ['suppliers_purchase_stats'] });
    queryClient.invalidateQueries({ queryKey: ['customers_sales_stats'] });
    // ♻️ تحديث كاش الحسابات العام (الأرصدة بجانب أسماء الحسابات)
    invalidateAccountsCache();
}


// ═══ Build Export Data from Document ═══
async function buildExportData(data: any, language: string, docType: string): Promise<{
    columns: { key: string; header: string }[];
    rows: Record<string, any>[];
}> {
    const isAr = language === 'ar';

    // ═══ Party / Account Statement — fetch ledger entries ═══
    if (docType === 'party' && data?.id) {
        try {
            // Get the party's accounting account ID
            const accountId = data?.payable_account_id || data?.receivable_account_id;
            if (!accountId) {
                // Try to find from suppliers/customers table
                const partyType = data?._partyType || data?.type;
                const table = partyType === 'supplier' ? 'suppliers' : 'customers';
                const accountField = partyType === 'supplier' ? 'payable_account_id' : 'receivable_account_id';
                const { data: partyRecord } = await supabase
                    .from(table)
                    .select(accountField)
                    .eq('id', data.id)
                    .maybeSingle();
                const resolvedAccountId = partyRecord?.[accountField];
                if (!resolvedAccountId) {
                    return { columns: [], rows: [] };
                }
                // Fetch ledger with resolved account
                return await fetchLedgerExportData(resolvedAccountId, data, isAr, language);
            }
            return await fetchLedgerExportData(accountId, data, isAr, language);
        } catch (e) {
            console.error('Failed to fetch ledger for export:', e);
            return { columns: [], rows: [] };
        }
    }

    // ═══ Journal Entry — export lines with account details ═══
    const lines = data?.lines || [];
    if ((docType === 'journal' || data?.entry_type || data?.entry_number) && lines.length > 0) {
        const columns = [
            { key: 'index', header: '#' },
            { key: 'account', header: isAr ? 'الحساب' : 'Account' },
            { key: 'description', header: isAr ? 'البيان' : 'Description' },
            { key: 'debit', header: isAr ? 'مدين' : 'Debit' },
            { key: 'credit', header: isAr ? 'دائن' : 'Credit' },
            { key: 'currency', header: isAr ? 'العملة' : 'Currency' },
            { key: 'exchange_rate', header: isAr ? 'سعر الصرف' : 'Ex. Rate' },
        ];

        const rows = lines.map((line: any, idx: number) => {
            const accountCode = line.account?.account_code || line.account_code || '';
            const accountName = line.account?.name_ar || line.account?.name_en || line.account_name || '';
            return {
                index: idx + 1,
                account: accountCode && accountName ? `${accountCode} - ${accountName}` : accountName || accountCode || '-',
                description: line.description || '-',
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                currency: line.currency || data.currency || '',
                exchange_rate: Number(line.exchange_rate) || 1,
            };
        });

        // Add totals row
        const totalDebit = rows.reduce((s: number, r: any) => s + (r.debit || 0), 0);
        const totalCredit = rows.reduce((s: number, r: any) => s + (r.credit || 0), 0);
        rows.push({
            index: '',
            account: isAr ? 'الإجمالي' : 'Total',
            description: '',
            debit: totalDebit,
            credit: totalCredit,
            currency: '',
            exchange_rate: '',
        });

        return { columns, rows };
    }

    // ═══ Trade docs with items (invoices, orders, quotations) ═══
    const items = data?.items || [];
    if (items.length > 0) {
        const columns = [
            { key: 'index', header: '#' },
            { key: 'description', header: isAr ? 'البيان' : 'Description' },
            { key: 'quantity', header: isAr ? 'الكمية' : 'Qty' },
            { key: 'unit', header: isAr ? 'الوحدة' : 'Unit' },
            { key: 'unit_price', header: isAr ? 'سعر الوحدة' : 'Unit Price' },
            { key: 'discount', header: isAr ? 'الخصم' : 'Discount' },
            { key: 'total', header: isAr ? 'المجموع' : 'Total' },
        ];

        const rows = items.map((item: any, idx: number) => ({
            index: idx + 1,
            description: item.description_ar || item.description || item.material_name || item.name || '-',
            quantity: item.quantity || 0,
            unit: item.unit || 'م',
            unit_price: item.unit_price || item.price || 0,
            discount: item.discount_amount || item.discount || 0,
            total: item.total || item.line_total || (item.quantity || 0) * (item.unit_price || item.price || 0),
        }));

        const grandTotal = data?.grand_total || data?.total_amount || rows.reduce((s: number, r: any) => s + (r.total || 0), 0);
        rows.push({
            index: '',
            description: isAr ? 'الإجمالي' : 'Grand Total',
            quantity: '', unit: '', unit_price: '', discount: '',
            total: grandTotal,
        });

        return { columns, rows };
    }

    // ═══ Fallback: export document header as key-value pairs ═══
    const headerFields = [
        { key: 'invoice_no', ar: 'رقم الفاتورة', en: 'Invoice No' },
        { key: 'order_number', ar: 'رقم الطلب', en: 'Order No' },
        { key: 'container_number', ar: 'رقم الحاوية', en: 'Container No' },
        { key: 'date', ar: 'التاريخ', en: 'Date' },
        { key: 'party_name', ar: 'الجهة', en: 'Party' },
        { key: 'customer_name', ar: 'العميل', en: 'Customer' },
        { key: 'supplier_name', ar: 'المورد', en: 'Supplier' },
        { key: 'total_amount', ar: 'المبلغ الإجمالي', en: 'Total Amount' },
        { key: 'grand_total', ar: 'المبلغ الإجمالي', en: 'Grand Total' },
        { key: 'currency', ar: 'العملة', en: 'Currency' },
        { key: 'notes', ar: 'الملاحظات', en: 'Notes' },
        { key: 'status', ar: 'الحالة', en: 'Status' },
        { key: 'stage', ar: 'المرحلة', en: 'Stage' },
    ];

    const columns = [
        { key: 'field', header: isAr ? 'الحقل' : 'Field' },
        { key: 'value', header: isAr ? 'القيمة' : 'Value' },
    ];

    const rows = headerFields
        .filter(f => data?.[f.key] !== undefined && data?.[f.key] !== null && data?.[f.key] !== '')
        .map(f => ({
            field: isAr ? f.ar : f.en,
            value: data[f.key],
        }));

    return { columns, rows };
}

// ═══ Translate auto-generated Arabic descriptions ═══
function translateAutoDescription(desc: string, lang: string, partyData?: any): string {
    if (lang === 'ar' || !desc) return desc;

    // Map of Arabic prefixes → multi-language translations
    const translations: [string, Record<string, string>][] = [
        ['فاتورة مشتريات', { en: 'Purchase Invoice', tr: 'Alış Faturası', ru: 'Счёт на закупку', uk: 'Рахунок на закупівлю' }],
        ['فاتورة مبيعات', { en: 'Sales Invoice', tr: 'Satış Faturası', ru: 'Счёт на продажу', uk: 'Рахунок на продаж' }],
        ['سند قبض', { en: 'Receipt Voucher', tr: 'Tahsilat Makbuzu', ru: 'Приходный ордер', uk: 'Прибутковий ордер' }],
        ['سند صرف', { en: 'Payment Voucher', tr: 'Ödeme Makbuzu', ru: 'Расходный ордер', uk: 'Видатковий ордер' }],
        ['قيد يومية', { en: 'Journal Entry', tr: 'Yevmiye Kaydı', ru: 'Журнальная запись', uk: 'Журнальний запис' }],
        ['قيد افتتاحي', { en: 'Opening Entry', tr: 'Açılış Kaydı', ru: 'Вступительная запись', uk: 'Вступний запис' }],
        ['إقفال', { en: 'Closing', tr: 'Kapanış', ru: 'Закрытие', uk: 'Закриття' }],
        ['مرتجع مشتريات', { en: 'Purchase Return', tr: 'Alış İadesi', ru: 'Возврат закупки', uk: 'Повернення закупки' }],
        ['مرتجع مبيعات', { en: 'Sales Return', tr: 'Satış İadesi', ru: 'Возврат продажи', uk: 'Повернення продажу' }],
        ['دفعة', { en: 'Payment', tr: 'Ödeme', ru: 'Платёж', uk: 'Платіж' }],
        ['إيصال استلام', { en: 'Goods Receipt', tr: 'Mal Alımı', ru: 'Приёмка товара', uk: 'Прийом товару' }],
        ['أمر شراء', { en: 'Purchase Order', tr: 'Satınalma Siparişi', ru: 'Заказ на закупку', uk: 'Замовлення на закупівлю' }],
        ['أمر بيع', { en: 'Sales Order', tr: 'Satış Siparişi', ru: 'Заказ на продажу', uk: 'Замовлення на продаж' }],
        ['رصيد افتتاحي', { en: 'Opening Balance', tr: 'Açılış Bakiyesi', ru: 'Начальное сальдо', uk: 'Початковий залишок' }],
        ['كونتينر', { en: 'Container', tr: 'Konteyner', ru: 'Контейнер', uk: 'Контейнер' }],
        ['مصاريف', { en: 'Expenses', tr: 'Giderler', ru: 'Расходы', uk: 'Витрати' }],
    ];

    let result = desc;
    for (const [arTerm, langMap] of translations) {
        if (result.includes(arTerm)) {
            result = result.replace(arTerm, langMap[lang] || langMap.en || arTerm);
        }
    }

    // Translate party name if localized version exists
    if (partyData) {
        const arName = partyData.name_ar || partyData.name || '';
        const localizedName = partyData[`name_${lang}`];
        if (arName && localizedName && arName !== localizedName && result.includes(arName)) {
            result = result.replace(arName, localizedName);
        }
    }

    return result;
}

// ═══ Fetch Ledger Entries for Party Export ═══
async function fetchLedgerExportData(
    accountId: string,
    data: any,
    isAr: boolean,
    language: string
): Promise<{ columns: { key: string; header: string }[]; rows: Record<string, any>[] }> {
    // Multi-language header helper
    const h = (ar: string, en: string, tr: string, ru: string, uk: string) => {
        const map: Record<string, string> = { ar, en, tr, ru, uk };
        return map[language] || en;
    };

    // Query journal entry lines (no cost_center FK join — use ID only)
    const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
            id,
            debit,
            credit,
            description,
            line_number,
            cost_center_id,
            entry:journal_entries!entry_id (
                id,
                entry_number,
                entry_date,
                description,
                reference_type,
                status
            )
        `)
        .eq('account_id', accountId)
        .order('line_number', { ascending: true });

    if (error || !lines || lines.length === 0) {
        return { columns: [], rows: [] };
    }

    // Sort by date
    const sorted = [...lines].sort((a: any, b: any) => {
        const dateA = a.entry?.entry_date || '';
        const dateB = b.entry?.entry_date || '';
        return dateA.localeCompare(dateB);
    });

    // Same column order for ALL languages — sheet direction (RTL/LTR) handles the layout
    // # | Debit | Credit | Description | Date | Balance | Currency | Exchange Rate | Cost Center
    const columns = [
        { key: 'index', header: '#' },
        { key: 'debit', header: h('مدين', 'Debit', 'Borç', 'Дебет', 'Дебет') },
        { key: 'credit', header: h('دائن', 'Credit', 'Alacak', 'Кредит', 'Кредит') },
        { key: 'description', header: h('البيان', 'Description', 'Açıklama', 'Описание', 'Опис') },
        { key: 'date', header: h('التاريخ', 'Date', 'Tarih', 'Дата', 'Дата') },
        { key: 'balance', header: h('الرصيد', 'Balance', 'Bakiye', 'Баланс', 'Баланс') },
        { key: 'currency', header: h('العملة', 'Currency', 'Para Birimi', 'Валюта', 'Валюта') },
        { key: 'exchange_rate', header: h('سعر الصرف', 'Exchange Rate', 'Döviz Kuru', 'Курс', 'Курс') },
        { key: 'cost_center', header: h('مركز التكلفة', 'Cost Center', 'Maliyet Merkezi', 'Центр затрат', 'Центр витрат') },
    ];

    const partyCurrency = data?.currency || 'USD';

    let runningBalance = 0;
    const rows: Record<string, any>[] = sorted.map((line: any, idx: number) => {
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        runningBalance += debit - credit;
        const entry = line.entry || {};
        const cc = line.cost_center_id || '';
        const rawDesc = line.description || entry.description || '';
        return {
            index: idx + 1,
            debit: debit || '',
            credit: credit || '',
            description: translateAutoDescription(rawDesc, language, data),
            date: entry.entry_date || '',
            balance: runningBalance,
            currency: partyCurrency,
            exchange_rate: 1,
            cost_center: cc,
        };
    });

    // Totals row
    const totalDebit = sorted.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
    const totalCredit = sorted.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);
    rows.push({
        index: '',
        debit: totalDebit,
        credit: totalCredit,
        description: h('الإجمالي', 'Total', 'Toplam', 'Итого', 'Всього'),
        date: '',
        balance: runningBalance,
        currency: partyCurrency,
        exchange_rate: '',
        cost_center: '',
    });

    // التفقيط — Amount in words
    const amountInWords = numberToWords(Math.abs(runningBalance), partyCurrency, language);
    const tafqeetLabel = h('التفقيط', 'Amount in Words', 'Yazıyla', 'Сумма прописью', 'Сума прописом');

    rows.push({
        index: '',
        debit: '',
        credit: '',
        description: `${tafqeetLabel}: ${amountInWords}`,
        date: '',
        balance: '',
        currency: '',
        exchange_rate: '',
        cost_center: '',
    });

    return { columns, rows };
}

// ═══ Number to Words — Multi-language ═══
function numberToWords(amount: number, currency: string, lang: string): string {
    const integer = Math.floor(amount);
    const fraction = Math.round((amount - integer) * 100);

    const currencyNames: Record<string, Record<string, { singular: string; plural: string; subunit: string }>> = {
        ar: {
            USD: { singular: 'دولار أمريكي', plural: 'دولار أمريكي', subunit: 'سنت' },
            EUR: { singular: 'يورو', plural: 'يورو', subunit: 'سنت' },
            TRY: { singular: 'ليرة تركية', plural: 'ليرة تركية', subunit: 'قرش' },
            SAR: { singular: 'ريال سعودي', plural: 'ريال سعودي', subunit: 'هللة' },
            AED: { singular: 'درهم إماراتي', plural: 'درهم إماراتي', subunit: 'فلس' },
            EGP: { singular: 'جنيه مصري', plural: 'جنيه مصري', subunit: 'قرش' },
            UAH: { singular: 'هريفنيا أوكرانية', plural: 'هريفنيا أوكرانية', subunit: 'كوبيك' },
            RUB: { singular: 'روبل روسي', plural: 'روبل روسي', subunit: 'كوبيك' },
        },
        en: {
            USD: { singular: 'US Dollar', plural: 'US Dollars', subunit: 'Cent' },
            EUR: { singular: 'Euro', plural: 'Euros', subunit: 'Cent' },
            TRY: { singular: 'Turkish Lira', plural: 'Turkish Lira', subunit: 'Kuruş' },
            SAR: { singular: 'Saudi Riyal', plural: 'Saudi Riyals', subunit: 'Halala' },
            AED: { singular: 'Dirham', plural: 'Dirhams', subunit: 'Fils' },
            EGP: { singular: 'Egyptian Pound', plural: 'Egyptian Pounds', subunit: 'Piastre' },
            UAH: { singular: 'Hryvnia', plural: 'Hryvnias', subunit: 'Kopiyka' },
            RUB: { singular: 'Russian Ruble', plural: 'Russian Rubles', subunit: 'Kopeck' },
        },
        tr: {
            USD: { singular: 'ABD Doları', plural: 'ABD Doları', subunit: 'Sent' },
            EUR: { singular: 'Euro', plural: 'Euro', subunit: 'Sent' },
            TRY: { singular: 'Türk Lirası', plural: 'Türk Lirası', subunit: 'Kuruş' },
            SAR: { singular: 'Suudi Riyali', plural: 'Suudi Riyali', subunit: 'Halala' },
        },
        ru: {
            USD: { singular: 'доллар США', plural: 'долларов США', subunit: 'цент' },
            EUR: { singular: 'евро', plural: 'евро', subunit: 'цент' },
            RUB: { singular: 'рубль', plural: 'рублей', subunit: 'копейка' },
            UAH: { singular: 'гривна', plural: 'гривен', subunit: 'копейка' },
        },
        uk: {
            USD: { singular: 'долар США', plural: 'доларів США', subunit: 'цент' },
            EUR: { singular: 'євро', plural: 'євро', subunit: 'цент' },
            UAH: { singular: 'гривня', plural: 'гривень', subunit: 'копійка' },
            RUB: { singular: 'рубль', plural: 'рублів', subunit: 'копійка' },
        },
    };

    const curInfo = currencyNames[lang]?.[currency] || currencyNames.en?.[currency] || { singular: currency, plural: currency, subunit: '' };
    const curName = integer === 1 ? curInfo.singular : curInfo.plural;

    // Convert integer to words
    const intWords = integerToWordsMultiLang(integer, lang);
    let result = `${intWords} ${curName}`;

    if (fraction > 0) {
        const fracWords = integerToWordsMultiLang(fraction, lang);
        const andWord = { ar: 'و', en: 'and', tr: 've', ru: 'и', uk: 'та' }[lang] || 'and';
        result += ` ${andWord} ${fracWords} ${curInfo.subunit}`;
    }

    // Add "فقط لا غير" suffix for Arabic
    if (lang === 'ar') {
        result += ' فقط لا غير';
    } else if (lang === 'en') {
        result += ' only';
    }

    return result;
}

function integerToWordsMultiLang(n: number, lang: string): string {
    if (n === 0) return lang === 'ar' ? 'صفر' : lang === 'tr' ? 'sıfır' : lang === 'ru' ? 'ноль' : lang === 'uk' ? 'нуль' : 'zero';

    if (lang === 'ar') return integerToWordsArabic(n);
    if (lang === 'en') return integerToWordsEnglish(n);
    if (lang === 'tr') return integerToWordsTurkish(n);
    if (lang === 'ru' || lang === 'uk') return integerToWordsRuUk(n, lang);
    return integerToWordsEnglish(n);
}

function integerToWordsArabic(n: number): string {
    if (n === 0) return 'صفر';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشر', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];

    const parts: string[] = [];
    if (n >= 1000000) { const m = Math.floor(n / 1000000); parts.push(m === 1 ? 'مليون' : m === 2 ? 'مليونان' : `${integerToWordsArabic(m)} مليون`); n %= 1000000; }
    if (n >= 1000) { const k = Math.floor(n / 1000); parts.push(k === 1 ? 'ألف' : k === 2 ? 'ألفان' : `${integerToWordsArabic(k)} آلاف`); n %= 1000; }
    if (n >= 100) { const c = Math.floor(n / 100); const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']; parts.push(hundreds[c]); n %= 100; }
    if (n >= 10 && n < 20) { parts.push(teens[n - 10]); }
    else { if (n % 10 > 0) parts.push(ones[n % 10]); if (n >= 20) parts.push(tens[Math.floor(n / 10)]); }

    return parts.filter(Boolean).join(' و ');
}

function integerToWordsEnglish(n: number): string {
    if (n === 0) return 'zero';
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const parts: string[] = [];
    if (n >= 1000000) { parts.push(`${integerToWordsEnglish(Math.floor(n / 1000000))} million`); n %= 1000000; }
    if (n >= 1000) { parts.push(`${integerToWordsEnglish(Math.floor(n / 1000))} thousand`); n %= 1000; }
    if (n >= 100) { parts.push(`${ones[Math.floor(n / 100)]} hundred`); n %= 100; }
    if (n >= 20) { const t = tens[Math.floor(n / 10)]; const o = ones[n % 10]; parts.push(o ? `${t}-${o}` : t); }
    else if (n > 0) { parts.push(ones[n]); }
    return parts.join(' ');
}

function integerToWordsTurkish(n: number): string {
    if (n === 0) return 'sıfır';
    const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
    const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
    const parts: string[] = [];
    if (n >= 1000000) { parts.push(`${integerToWordsTurkish(Math.floor(n / 1000000))} milyon`); n %= 1000000; }
    if (n >= 1000) { const k = Math.floor(n / 1000); parts.push(k === 1 ? 'bin' : `${integerToWordsTurkish(k)} bin`); n %= 1000; }
    if (n >= 100) { const c = Math.floor(n / 100); parts.push(c === 1 ? 'yüz' : `${ones[c]} yüz`); n %= 100; }
    if (n >= 10) { parts.push(tens[Math.floor(n / 10)]); n %= 10; }
    if (n > 0) parts.push(ones[n]);
    return parts.join(' ');
}

function integerToWordsRuUk(n: number, lang: 'ru' | 'uk'): string {
    if (n === 0) return lang === 'ru' ? 'ноль' : 'нуль';
    const onesRu = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const onesUk = ['', 'один', 'два', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять', 'десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
    const tensRu = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const tensUk = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    const hundredsArr = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];
    const ones = lang === 'ru' ? onesRu : onesUk;
    const tensList = lang === 'ru' ? tensRu : tensUk;
    const tys = lang === 'ru' ? 'тысяча' : 'тисяча';
    const mln = lang === 'ru' ? 'миллион' : 'мільйон';

    const parts: string[] = [];
    if (n >= 1000000) { parts.push(`${integerToWordsRuUk(Math.floor(n / 1000000), lang)} ${mln}`); n %= 1000000; }
    if (n >= 1000) { parts.push(`${integerToWordsRuUk(Math.floor(n / 1000), lang)} ${tys}`); n %= 1000; }
    if (n >= 100) { parts.push(hundredsArr[Math.floor(n / 100)]); n %= 100; }
    if (n >= 20) { parts.push(tensList[Math.floor(n / 10)]); n %= 10; if (n > 0) parts.push(ones[n]); }
    else if (n > 0) { parts.push(ones[n]); }
    return parts.filter(Boolean).join(' ');
}
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
                case 'save_activate':
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

                    // ═══ Fund Save (cash/bank account) ═══
                    if (docType === 'fund') {
                        if (!data?.name_ar) {
                            toast.error(language === 'ar' ? 'اسم الصندوق/البنك بالعربية مطلوب' : 'Arabic name is required');
                            return;
                        }

                        setLoading(true);
                        try {
                            const isBankFund = data?.is_bank_account || data?.fund_type === 'bank';
                            const parentCode = isBankFund ? '112' : '111';

                            // Find the parent account (111 for cash, 112 for bank)
                            let parentId = data?.parent_id;
                            if (!parentId && companyId) {
                                const { data: parentAcct } = await supabase
                                    .from('chart_of_accounts')
                                    .select('id')
                                    .eq('company_id', companyId)
                                    .eq('account_code', parentCode)
                                    .single();
                                if (parentAcct) parentId = parentAcct.id;
                            }

                            const { accountsService } = await import('@/services/accountsService');

                            if (mode === 'create') {
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
                                    account_type_id: data.account_type_id || undefined,
                                    parent_id: parentId || undefined,
                                    is_group: false,
                                    level: parentId ? 3 : 2,
                                    currency: data.currency || undefined,
                                    description: data.description || undefined,
                                    is_cash_account: !isBankFund,
                                    is_bank_account: isBankFund,
                                });
                            } else {
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
                                    parent_id: parentId || data.parent_id || undefined,
                                    currency: data.currency,
                                    description: data.description || undefined,
                                });
                            }
                            toast.success(language === 'ar'
                                ? (isBankFund ? '✅ تم حفظ البنك بنجاح' : '✅ تم حفظ الصندوق بنجاح')
                                : (isBankFund ? '✅ Bank saved successfully' : '✅ Fund saved successfully')
                            );
                            setHasChanges(false);
                            // Invalidate funds and chart of accounts cache
                            queryClient.invalidateQueries({ queryKey: ['accounting', 'funds'] });
                            queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                            if (onSave) await onSave(data);
                            setMode('view');
                        } catch (err: any) {
                            console.error('[Fund Save Error]', err);
                            toast.error(language === 'ar' ? 'فشل حفظ الصندوق/البنك' : 'Failed to save fund/bank', {
                                description: err.message || '',
                            });
                        } finally {
                            setLoading(false);
                        }
                        return;
                    }

                    // ═══ Exchange Agent Save ═══
                    if (docType === 'exchange_agent') {
                        if (!data?.name_ar) {
                            toast.error(language === 'ar' ? 'اسم الوكيل بالعربية مطلوب' : 'Arabic name is required');
                            return;
                        }
                        if (!data?.currency) {
                            toast.error(language === 'ar' ? 'يرجى اختيار العملة' : 'Currency is required');
                            return;
                        }

                        setLoading(true);
                        try {
                            const updatePayload: Record<string, any> = {
                                name_ar: data.name_ar,
                                name_en: data.name_en || null,
                                name_tr: data.name_tr || null,
                                name_ru: data.name_ru || null,
                                name_uk: data.name_uk || null,
                                agent_type: data.agent_type || 'individual',
                                country: data.country || null,
                                city: data.city || null,
                                phone: data.phone || null,
                                email: data.email || null,
                                address: data.address || null,
                                currencies: data.currency ? [data.currency, ...(data.currencies || []).filter((c: string) => c !== data.currency)] : (data.currencies || []),
                                commission_rate: data.commission_rate ?? 0,
                                credit_limit: data.credit_limit ?? 0,
                                status: data.is_active === false ? 'inactive' : 'active',
                                notes: data.notes || null,
                                updated_at: new Date().toISOString(),
                            };

                            if (mode === 'create' || !data.id) {
                                const effCompanyId = companyId || data.company_id;

                                // ═══ Run independent queries in PARALLEL ═══
                                const [tenantResult, countResult, parentResult] = await Promise.all([
                                    // 1. Get tenant_id
                                    (async () => {
                                        if (data.tenant_id) return data.tenant_id;
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (session?.user) {
                                            const { data: profile } = await supabase
                                                .from('user_profiles')
                                                .select('tenant_id')
                                                .eq('id', session.user.id)
                                                .single();
                                            return profile?.tenant_id;
                                        }
                                        return null;
                                    })(),
                                    // 2. Get MAX account code under 134 (to generate next sequential code)
                                    supabase
                                        .from('chart_of_accounts')
                                        .select('account_code')
                                        .eq('company_id', effCompanyId)
                                        .like('account_code', '134-%')
                                        .neq('account_code', '134-SUM')
                                        .order('account_code', { ascending: false })
                                        .limit(1),
                                    // 3. Get parent account 134
                                    supabase
                                        .from('chart_of_accounts')
                                        .select('id, account_type_id')
                                        .eq('company_id', effCompanyId)
                                        .eq('account_code', '134')
                                        .single(),
                                ]);

                                const tenantId = tenantResult;
                                if (!tenantId) throw new Error('Tenant ID not found');

                                // Compute next sequential account code from MAX existing
                                const maxCode = countResult.data?.[0]?.account_code; // e.g. '134-003'
                                const lastSeq = maxCode ? parseInt(maxCode.split('-')[1]) || 0 : 0;
                                const nextNum = (lastSeq + 1).toString().padStart(3, '0');
                                const autoCode = data.code || `AGT-${nextNum}`;

                                // ═══ 1. Create agent FIRST (no orphaned accounts if this fails) ═══
                                const { data: inserted, error } = await supabase
                                    .from('exchange_agents')
                                    .insert({
                                        ...updatePayload,
                                        code: autoCode,
                                        company_id: effCompanyId,
                                        tenant_id: tenantId,
                                    })
                                    .select()
                                    .single();

                                if (error) throw error;

                                // ═══ 2. Create or find accounting sub-account under 134 ═══
                                // NOTE: A DB trigger may have already created this account automatically
                                const parentAccount = parentResult.data;
                                if (parentAccount && inserted) {
                                    const acctCode = `134-${nextNum}`;
                                    
                                    // Check if trigger already created the account
                                    const { data: existingAcct } = await supabase
                                        .from('chart_of_accounts')
                                        .select('id')
                                        .eq('company_id', effCompanyId)
                                        .eq('party_id', inserted.id)
                                        .eq('party_type', 'agent')
                                        .maybeSingle();

                                    if (existingAcct) {
                                        // Trigger already created it — just link
                                        await supabase
                                            .from('exchange_agents')
                                            .update({ payable_account_id: existingAcct.id })
                                            .eq('id', inserted.id);
                                    } else {
                                        // Trigger didn't fire — create manually
                                        const { data: newAcct, error: acctErr } = await supabase
                                            .from('chart_of_accounts')
                                            .insert({
                                                tenant_id: tenantId,
                                                company_id: effCompanyId,
                                                account_code: acctCode,
                                                name_ar: `وكيل: ${data.name_ar}`,
                                                name_en: `Agent: ${data.name_en || data.name_ar}`,
                                                account_type_id: parentAccount.account_type_id,
                                                parent_id: parentAccount.id,
                                                is_detail: true,
                                                is_active: true,
                                                is_party_account: true,
                                                party_id: inserted.id,
                                                party_type: 'agent',
                                                currency: data.currency || 'USD',
                                            })
                                            .select('id')
                                            .single();

                                        // 3. Link account to agent
                                        if (!acctErr && newAcct) {
                                            await supabase
                                                .from('exchange_agents')
                                                .update({ payable_account_id: newAcct.id })
                                                .eq('id', inserted.id);
                                        }
                                    }
                                }

                                setData((prev: any) => ({ ...prev, ...inserted, id: inserted.id, account_code: `134-${nextNum}`, parent_account: '134' }));
                                toast.success(language === 'ar' ? '✅ تم إنشاء الوكيل وحسابه المحاسبي' : '✅ Agent and accounting account created');
                            } else {
                                const { error } = await supabase
                                    .from('exchange_agents')
                                    .update(updatePayload)
                                    .eq('id', data.id);
                                if (error) throw error;
                                toast.success(language === 'ar' ? '✅ تم حفظ بيانات الوكيل' : '✅ Agent saved successfully');
                            }

                            setHasChanges(false);
                            queryClient.invalidateQueries({ queryKey: ['exchange_agents'] });
                            queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                            if (onSave) await onSave(data);
                            setMode('view');
                        } catch (err: any) {
                            console.error('[Exchange Agent Save Error]', err);
                            toast.error(language === 'ar' ? 'فشل حفظ بيانات الوكيل' : 'Failed to save agent', {
                                description: err.message || '',
                            });
                        } finally {
                            setLoading(false);
                        }
                        return;
                    }

                    // ═══ Exchange Partner Save ═══
                    if (docType === 'exchange_partner') {
                        if (!data?.name_ar) {
                            toast.error(language === 'ar' ? 'اسم الشريك بالعربية مطلوب' : 'Arabic name is required');
                            return;
                        }
                        if (!data?.currency) {
                            toast.error(language === 'ar' ? 'يرجى اختيار العملة' : 'Currency is required');
                            return;
                        }

                        setLoading(true);
                        try {
                            const updatePayload: Record<string, any> = {
                                name_ar: data.name_ar,
                                name_en: data.name_en || null,
                                name_tr: data.name_tr || null,
                                name_ru: data.name_ru || null,
                                name_uk: data.name_uk || null,
                                partner_type: data.partner_type || 'correspondent',
                                country: data.country || null,
                                city: data.city || null,
                                phone: data.phone || null,
                                email: data.email || null,
                                address: data.address || null,
                                website: data.website || null,
                                license_number: data.license_number || null,
                                currencies: data.currency ? [data.currency, ...(data.currencies || []).filter((c: string) => c !== data.currency)] : (data.currencies || []),
                                commission_rate: data.commission_rate ?? 0,
                                credit_limit: data.credit_limit ?? 0,
                                countries_served: data.countries_served || data.countries || [],
                                agreement_type: data.agreement_type || 'commission',
                                settlement_period: data.settlement_period || 'weekly',
                                status: data.is_active === false ? 'inactive' : 'active',
                                notes: data.notes || null,
                                updated_at: new Date().toISOString(),
                            };

                            if (mode === 'create' || !data.id) {
                                const effCompanyId = companyId || data.company_id;

                                // ═══ Run independent queries in PARALLEL ═══
                                const [tenantResult, countResult, parentResult] = await Promise.all([
                                    // 1. Get tenant_id
                                    (async () => {
                                        if (data.tenant_id) return data.tenant_id;
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (session?.user) {
                                            const { data: profile } = await supabase
                                                .from('user_profiles')
                                                .select('tenant_id')
                                                .eq('id', session.user.id)
                                                .single();
                                            return profile?.tenant_id;
                                        }
                                        return null;
                                    })(),
                                    // 2. Get MAX account code under 135 (to generate next sequential code)
                                    supabase
                                        .from('chart_of_accounts')
                                        .select('account_code')
                                        .eq('company_id', effCompanyId)
                                        .like('account_code', '135-%')
                                        .neq('account_code', '135-SUM')
                                        .order('account_code', { ascending: false })
                                        .limit(1),
                                    // 3. Get parent account 135
                                    supabase
                                        .from('chart_of_accounts')
                                        .select('id, account_type_id')
                                        .eq('company_id', effCompanyId)
                                        .eq('account_code', '135')
                                        .single(),
                                ]);

                                const tenantId = tenantResult;
                                if (!tenantId) throw new Error('Tenant ID not found');

                                // Compute next sequential account code from MAX existing
                                const maxCode = countResult.data?.[0]?.account_code; // e.g. '135-003'
                                const lastSeq = maxCode ? parseInt(maxCode.split('-')[1]) || 0 : 0;
                                const nextNum = (lastSeq + 1).toString().padStart(3, '0');
                                const autoCode = data.code || `PTR-${nextNum}`;

                                // ═══ 1. Create partner FIRST ═══
                                const { data: inserted, error } = await supabase
                                    .from('exchange_partners')
                                    .insert({
                                        ...updatePayload,
                                        code: autoCode,
                                        company_id: effCompanyId,
                                        tenant_id: tenantId,
                                    })
                                    .select()
                                    .single();

                                if (error) throw error;

                                // ═══ 2. Create or find accounting sub-account under 135 ═══
                                // NOTE: A DB trigger may have already created this account automatically
                                const parentAccount = parentResult.data;
                                if (parentAccount && inserted) {
                                    const acctCode = `135-${nextNum}`;
                                    
                                    // Check if trigger already created the account
                                    const { data: existingAcct } = await supabase
                                        .from('chart_of_accounts')
                                        .select('id')
                                        .eq('company_id', effCompanyId)
                                        .eq('party_id', inserted.id)
                                        .eq('party_type', 'partner')
                                        .maybeSingle();

                                    if (existingAcct) {
                                        // Trigger already created it — just link
                                        await supabase
                                            .from('exchange_partners')
                                            .update({ payable_account_id: existingAcct.id })
                                            .eq('id', inserted.id);
                                    } else {
                                        // Trigger didn't fire — create manually
                                        const { data: newAcct, error: acctErr } = await supabase
                                            .from('chart_of_accounts')
                                            .insert({
                                                tenant_id: tenantId,
                                                company_id: effCompanyId,
                                                account_code: acctCode,
                                                name_ar: `شريك: ${data.name_ar}`,
                                                name_en: `Partner: ${data.name_en || data.name_ar}`,
                                                account_type_id: parentAccount.account_type_id,
                                                parent_id: parentAccount.id,
                                                is_detail: true,
                                                is_active: true,
                                                is_party_account: true,
                                                party_id: inserted.id,
                                                party_type: 'partner',
                                                currency: data.currency || 'USD',
                                            })
                                            .select('id')
                                            .single();

                                        // 3. Link account to partner
                                        if (!acctErr && newAcct) {
                                            await supabase
                                                .from('exchange_partners')
                                                .update({ payable_account_id: newAcct.id })
                                                .eq('id', inserted.id);
                                        }
                                    }
                                }

                                setData((prev: any) => ({ ...prev, ...inserted, id: inserted.id, account_code: `135-${nextNum}`, parent_account: '135' }));
                                toast.success(language === 'ar' ? '✅ تم إنشاء الشريك وحسابه المحاسبي' : '✅ Partner and accounting account created');
                            } else {
                                const { error } = await supabase
                                    .from('exchange_partners')
                                    .update(updatePayload)
                                    .eq('id', data.id);
                                if (error) throw error;
                                toast.success(language === 'ar' ? '✅ تم حفظ بيانات الشريك' : '✅ Partner saved successfully');
                            }

                            setHasChanges(false);
                            queryClient.invalidateQueries({ queryKey: ['exchange_partners'] });
                            queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                            if (onSave) await onSave(data);
                            setMode('view');
                        } catch (err: any) {
                            console.error('[Exchange Partner Save Error]', err);
                            toast.error(language === 'ar' ? 'فشل حفظ بيانات الشريك' : 'Failed to save partner', {
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

                            if (mode === 'create' || !data.id) {
                                const effCompanyId = companyId || data.company_id;
                                const codePrefix = isCustomer ? 'CUS' : 'SUP';

                                // ═══ Run independent queries in PARALLEL ═══
                                const [tenantResult, countResult] = await Promise.all([
                                    // 1. Get tenant_id
                                    (async () => {
                                        if (data.tenant_id) return data.tenant_id;
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (session?.user) {
                                            const { data: profile } = await supabase
                                                .from('user_profiles')
                                                .select('tenant_id')
                                                .eq('id', session.user.id)
                                                .single();
                                            return profile?.tenant_id;
                                        }
                                        return null;
                                    })(),
                                    // 2. Count existing parties
                                    supabase
                                        .from(tableName)
                                        .select('id', { count: 'exact', head: true })
                                        .eq('company_id', effCompanyId),
                                ]);

                                const tenantId = tenantResult;
                                if (!tenantId) throw new Error('Tenant ID not found');

                                const nextNum = ((countResult.count || 0) + 1).toString().padStart(3, '0');
                                const autoCode = data.code || `${codePrefix}-${nextNum}`;

                                // INSERT new party
                                const insertPayload = {
                                    ...updatePayload,
                                    code: autoCode,
                                    company_id: effCompanyId,
                                    tenant_id: tenantId,
                                };
                                // Remove undefined values
                                Object.keys(insertPayload).forEach(k => {
                                    if (insertPayload[k] === undefined) delete insertPayload[k];
                                });

                                const { data: inserted, error } = await supabase
                                    .from(tableName)
                                    .insert(insertPayload)
                                    .select()
                                    .single();

                                if (error) throw error;

                                // Update local state with new ID
                                const savedPartyData = { ...data, ...inserted, id: inserted.id };
                                setData((prev: any) => ({ ...prev, ...inserted, id: inserted.id }));
                                toast.success(language === 'ar' ? 'تم إنشاء الجهة بنجاح' : 'Party created successfully');

                                setHasChanges(false);
                                // Invalidate party queries — refetch trade_customers to ensure dropdown has new party
                                queryClient.invalidateQueries({ queryKey: ['parties_suppliers'] });
                                queryClient.invalidateQueries({ queryKey: ['parties_customers'] });
                                queryClient.invalidateQueries({ queryKey: ['party_balances_supplier'] });
                                queryClient.invalidateQueries({ queryKey: ['party_balances_customer'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                // Force refetch and WAIT — ensures dropdown list includes new party before closing
                                await queryClient.refetchQueries({ queryKey: ['trade_customers'] });
                                if (onSave) {
                                    await onSave(savedPartyData);
                                } else {
                                    setMode('view');
                                }
                            } else {
                                // UPDATE existing party
                                const { error } = await supabase
                                    .from(tableName)
                                    .update(updatePayload)
                                    .eq('id', data.id);

                                if (error) throw error;
                                toast.success(language === 'ar' ? 'تم حفظ بيانات الجهة بنجاح' : 'Party saved successfully');

                                setHasChanges(false);
                                queryClient.invalidateQueries({ queryKey: ['parties_suppliers'] });
                                queryClient.invalidateQueries({ queryKey: ['parties_customers'] });
                                queryClient.invalidateQueries({ queryKey: ['party_balances_supplier'] });
                                queryClient.invalidateQueries({ queryKey: ['party_balances_customer'] });
                                queryClient.invalidateQueries({ queryKey: ['trade_customers'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                if (onSave) {
                                    await onSave(data);
                                } else {
                                    setMode('view');
                                }
                            }
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
                        // ═══ STOP HERE — parent component controls all post-save behavior ═══
                        // (e.g. SalesDeliveryDialog opens a confirmation dialog after onSave)
                        // Don't show toast, don't switch mode, don't close sheet.
                        setLoading(false);
                        return;
                    } else if (isAccountingDocType) {
                        // ─── Recurring: set status based on action ───
                        const savePayload = docType === 'recurring'
                            ? { ...data, status: actionId === 'save_activate' ? 'active' : 'draft', _post: false }
                            : { ...data, _post: false };
                        // ─── Accounting: احفظ دائماً كمسودة أولاً لضمان الحصول على الـ ID ───
                        // (الترحيل يتم لاحقاً عبر RPC منفصل إذا كان save_post)
                        const createdId = await handleAccountingSave(savePayload);
                        console.log('[Register] handleAccountingSave returned ID:', createdId);
                        if (createdId) {
                            savedResult = { id: createdId };
                            setData((prev: any) => ({ ...prev, id: createdId }));
                        } else {
                            // إذا لم يُرجع ID فالحفظ فشل — أوقف العملية
                            console.error('[Register] handleAccountingSave returned no ID — aborting');
                            setLoading(false);
                            return;
                        }
                    } else if (isTradeDocType) {
                        savedResult = await handleTradeSave(data);
                    }
                    // Only show generic save toast for draft saves (not for Register or Recurring which show their own)
                    if ((actionId !== 'save_post' || !isAccountingDocType) && docType !== 'recurring') {
                        toast.success(t('messages.savedSuccessfully') || 'تم الحفظ بنجاح');
                    }
                    setHasChanges(false);

                    // ─── Save & Post Logic ───
                    let manualPostSuccess = false;

                    // Accounting docs: استخدام RPC الرسمي للترحيل — يُحدِّث chart_of_accounts أيضاً
                    // ⚠️ القيود المتكررة لا يتم ترحيلها — هي قوالب فقط، التنفيذ عبر execute_recurring_entry
                    if (actionId === 'save_post' && isAccountingDocType && docType !== 'recurring') {
                        // ✅ نستخدم الـ ID المُرجَع من الحفظ أولاً، ثم ID المستند الحالي
                        const docId = savedResult?.id || data?.id || documentId;
                        if (docId) {
                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                const userId = session?.user?.id || '';

                                // ═══ إلغاء الترحيل أولاً إذا كان القيد مرحّلاً مسبقاً ═══
                                // ضروري عند تعديل قيد مرحّل — RPC يرفض ترحيل مزدوج
                                const wasPosted = initialData?.status === 'posted' || initialData?.is_posted || data?.status === 'posted';
                                if (wasPosted && mode === 'edit') {
                                    console.log('[Register] Entry was posted — unposting first before re-posting...');
                                    const { error: unpostErr } = await supabase.rpc('unpost_journal_entry', {
                                        p_entry_id: docId,
                                        p_user_id: userId,
                                    });
                                    if (unpostErr) {
                                        console.error('[Register] Unpost failed:', unpostErr.message);
                                        toast.error(language === 'ar'
                                            ? `❌ فشل إلغاء الترحيل القديم: ${unpostErr.message}`
                                            : `❌ Failed to unpost old entry: ${unpostErr.message}`);
                                        break;
                                    }
                                    console.log('[Register] ✅ Unpost successful — proceeding to re-post');
                                }

                                // ✅ المسار الصحيح: RPC يُحدِّث journal_entries + chart_of_accounts
                                const { error: rpcErr } = await supabase.rpc('post_journal_entry', {
                                    p_entry_id: docId,
                                    p_user_id: userId,
                                });

                                if (rpcErr) {
                                    // ⚠️ الـ RPC فشل — لا نُكمِل الترحيل لأن أرصدة chart_of_accounts لن تُحدَّث
                                    // المستخدم يجب أن يحاول مجدداً بعد إصلاح سبب الفشل
                                    console.error('[Register] RPC post_journal_entry failed:', rpcErr.message, rpcErr.code);
                                    const errDetail = rpcErr.message || '';
                                    if (errDetail.includes('غير متوازن') || errDetail.includes('unbalanced')) {
                                        toast.error(language === 'ar'
                                            ? `❌ القيد غير متوازن — تحقق من مجموع المدين والدائن`
                                            : `❌ Entry not balanced — check debit/credit totals`);
                                    } else if (errDetail.includes('مرحّل مسبقاً') || errDetail.includes('already posted')) {
                                        toast.warning(language === 'ar' ? 'القيد مرحّل مسبقاً' : 'Entry already posted');
                                    } else {
                                        toast.error(language === 'ar'
                                            ? `❌ فشل الترحيل: ${errDetail}`
                                            : `❌ Post failed: ${errDetail}`);
                                    }
                                    break; // لا تُكمِل — الرصيد لم يُحدَّث
                                }

                                // نجاح ✅
                                // أعِد جلب القيد من DB ليحمل البيانات الكاملة (debit_fc, is_fund_line)
                                // هذا يجعل AccountingEntryViewTab يقرأ بيانات حقيقية بدون ضرب مزدوج
                                try {
                                    const { journalEntriesService } = await import('@/services/journalEntriesService');
                                    const freshEntry = await journalEntriesService.getById(docId);
                                    if (freshEntry) {
                                        // C3: فلتر سطر الصندوق من lines قبل دمجها في state الأب
                                        // تبويب القيد يقرأ data.lines ← يجب ألا يحتوي الصندوق
                                        const cleanLines = (freshEntry.lines || []).filter(
                                            (l: any) => l.is_fund_line !== true
                                        );
                                        setData((prev: any) => ({
                                            ...prev,
                                            ...freshEntry,
                                            lines: cleanLines,
                                            status: 'posted',
                                            is_posted: true,
                                        }));
                                    } else {
                                        setData((prev: any) => ({ ...prev, status: 'posted', is_posted: true }));
                                    }
                                } catch {
                                    setData((prev: any) => ({ ...prev, status: 'posted', is_posted: true }));
                                }
                                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                queryClient.invalidateQueries({ queryKey: ['party_balances_supplier'] });
                                queryClient.invalidateQueries({ queryKey: ['party_balances_customer'] });
                                // ♻️ تحديث كاش الحسابات العام لعرض الأرصدة الصحيحة في الـ Grid
                                invalidateAccountsCache();
                                toast.success(language === 'ar' ? '✅ تم التسجيل والترحيل بنجاح' : '✅ Registered and posted successfully');

                                manualPostSuccess = true;

                            } catch (postEx: any) {
                                console.error('[Register] Exception:', postEx);
                                toast.error(language === 'ar' ? `خطأ في الترحيل: ${postEx.message}` : `Register error: ${postEx.message}`);
                            }
                        } else {
                            toast.error(language === 'ar' ? 'لم يتم العثور على رقم القيد' : 'Document ID not found');
                        }
                    }


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
                    // ═══ RECURRING: يغلق الشيت ويرجع للقائمة ═══
                    if (docType === 'recurring') {
                        toast.success(
                            actionId === 'save_activate'
                                ? (language === 'ar' ? '✅ تم حفظ وتفعيل القيد المتكرر' : '✅ Recurring entry saved & activated')
                                : (language === 'ar' ? '✅ تم حفظ القيد المتكرر كمسودة' : '✅ Recurring entry saved as draft')
                        );
                        onClose();
                    } else if (mode === 'create' && isAccountingDocType && actionId === 'save') {
                        // Draft save in create mode: reset for new entry
                        setData({});
                        setTimeout(() => setData({ type: docType }), 50);
                    } else if (mode === 'create' && isAccountingDocType && actionId === 'save_post') {
                        // Register in create mode: go to view showing posted entry
                        handleModeChange('view');
                    } else if (mode === 'edit' && isAccountingDocType && actionId === 'save_post') {
                        // Register in edit mode: update state FIRST, then switch to view
                        // setData already called above with posted status
                        handleModeChange('view');
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

                    // ═══ Fund Delete Protection ═══
                    if (docType === 'fund') {
                        // Check for transactions via RPC balance
                        if (data?.transaction_count > 0 || data?.total_debit > 0 || data?.total_credit > 0) {
                            toast.error(
                                language === 'ar'
                                    ? '🚫 لا يمكن حذف هذا الصندوق/البنك — عليه حركات محاسبية'
                                    : '🚫 Cannot delete this fund/bank — it has transactions',
                                { duration: 5000 }
                            );
                            break;
                        }

                        const isBankDel = data?.is_bank_account;
                        const fundLabel = isBankDel
                            ? (language === 'ar' ? 'البنك' : 'bank')
                            : (language === 'ar' ? 'الصندوق' : 'fund');

                        const confirmedFund = window.confirm(
                            language === 'ar'
                                ? `هل أنت متأكد من حذف ${fundLabel} "${data?.name_ar || data?.name}"?\n\nسيتم إلغاء تفعيله.`
                                : `Are you sure you want to delete ${fundLabel} "${data?.name_en || data?.name}"?\n\nIt will be deactivated.`
                        );
                        if (confirmedFund) {
                            setLoading(true);
                            try {
                                const { accountsService } = await import('@/services/accountsService');
                                await accountsService.delete(data.id);
                                toast.success(language === 'ar' ? `تم حذف ${fundLabel}` : `${fundLabel} deleted`);
                                queryClient.invalidateQueries({ queryKey: ['accounting', 'funds'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                if (onSave) await onSave(data);
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? `فشل حذف ${fundLabel}` : `Failed to delete ${fundLabel}`,
                                    { description: err.message || '' }
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                        break;
                    }

                    // ═══ Party (Customer/Supplier) Delete Protection ═══
                    if (docType === 'party') {
                        if (!data?.id) break;
                        const delPartyType = data?._partyType || data?.party_type || data?.type || 'customer';
                        const isDelCustomer = delPartyType === 'customer';
                        const delTable = isDelCustomer ? 'customers' : 'suppliers';
                        const linkedAccountId = isDelCustomer
                            ? data?.receivable_account_id
                            : data?.payable_account_id;

                        // Checks are now pre-calculated in ActionToolbar
                        const confirmed = window.confirm(
                            language === 'ar'
                                ? `هل أنت متأكد من حذف "${data?.name_ar || data?.name}"?`
                                : `Are you sure you want to delete "${data?.name_en || data?.name}"?`
                        );
                        if (confirmed) {
                            setLoading(true);
                            try {
                                // 1. Delete child entity first
                                const { error } = await supabase
                                    .from(delTable)
                                    .delete()
                                    .eq('id', data.id);
                                if (error) throw error;
                                
                                // 2. Delete linked chart_of_accounts explicitly to prevent orphans
                                if (linkedAccountId) {
                                    await supabase
                                        .from('chart_of_accounts')
                                        .delete()
                                        .eq('id', linkedAccountId);
                                }
                                
                                toast.success(language === 'ar' ? '🗑️ تم الحذف بنجاح' : '🗑️ Deleted successfully');
                                queryClient.invalidateQueries({ queryKey: ['customers'] });
                                queryClient.invalidateQueries({ queryKey: ['parties_suppliers'] });
                                queryClient.invalidateQueries({ queryKey: ['parties_customers'] });
                                queryClient.invalidateQueries({ queryKey: ['exchange_customers'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                if (onSave) await onSave(data);
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? 'فشل الحذف' : 'Delete failed',
                                    { description: err.message || '' }
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                        break;
                    }

                    // ═══ Exchange Agent Delete ═══
                    if (docType === 'exchange_agent') {
                        if (!data?.id) break;
                        // Pre-calculated checks handled by ActionToolbar
                        const confirmedAgent = window.confirm(
                            language === 'ar'
                                ? `هل أنت متأكد من حذف الوكيل "${data?.name_ar}"?`
                                : `Are you sure you want to delete agent "${data?.name_en || data?.name_ar}"?`
                        );
                        if (confirmedAgent) {
                            setLoading(true);
                            try {
                                // 1. Delete child entity first (agent)
                                const { error } = await supabase
                                    .from('exchange_agents')
                                    .delete()
                                    .eq('id', data.id);
                                if (error) throw error;
                                
                                // 2. Delete parent entity explicitly (chart_of_accounts) to prevent orphans
                                // (If there's an ON DELETE trigger, this might return 0 rows cleanly)
                                if (data.payable_account_id) {
                                    await supabase
                                        .from('chart_of_accounts')
                                        .delete()
                                        .eq('id', data.payable_account_id);
                                }
                                
                                toast.success(language === 'ar' ? '🗑️ تم حذف الوكيل وحسابه' : '🗑️ Agent and account deleted');
                                queryClient.invalidateQueries({ queryKey: ['exchange_agents'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                if (onSave) await onSave(data);
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? 'فشل حذف الوكيل' : 'Failed to delete agent',
                                    { description: err.message || '' }
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                        break;
                    }

                    // ═══ Exchange Partner Delete ═══
                    if (docType === 'exchange_partner') {
                        if (!data?.id) break;
                        // Pre-calculated checks handled by ActionToolbar
                        const confirmedPartner = window.confirm(
                            language === 'ar'
                                ? `هل أنت متأكد من حذف الشريك "${data?.name_ar}"?`
                                : `Are you sure you want to delete partner "${data?.name_en || data?.name_ar}"?`
                        );
                        if (confirmedPartner) {
                            setLoading(true);
                            try {
                                // 1. Delete child entity first (partner)
                                const { error } = await supabase
                                    .from('exchange_partners')
                                    .delete()
                                    .eq('id', data.id);
                                if (error) throw error;
                                
                                // 2. Delete parent entity explicitly (chart_of_accounts) to prevent orphans
                                if (data.payable_account_id) {
                                    await supabase
                                        .from('chart_of_accounts')
                                        .delete()
                                        .eq('id', data.payable_account_id);
                                }
                                
                                toast.success(language === 'ar' ? '🗑️ تم حذف الشريك وحسابه' : '🗑️ Partner and account deleted');
                                queryClient.invalidateQueries({ queryKey: ['exchange_partners'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                if (onSave) await onSave(data);
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? 'فشل حذف الشريك' : 'Failed to delete partner',
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

                    // SALES: block if goods have been delivered, in delivery, confirmed, or invoice posted
                    // ═══ CRITICAL: Even 'confirmed' invoices may have inventory_movements from partial delivery ═══
                    const BLOCKED_SALES_STAGES = ['delivered', 'in_delivery', 'invoiced', 'posted', 'completed', 'partial_delivered'];
                    const isSalesTrade = tradeMode === 'sales' &&
                        (docType === 'trade_invoice' || docType === 'trade_delivery');
                    if (isSalesTrade && BLOCKED_SALES_STAGES.includes(currentStageVal)) {
                        toast.error(
                            language === 'ar'
                                ? '🚫 لا يمكن حذف فاتورة تم تسليمها — افتح إذن التسليم واضغط "إلغاء التسليم" أولاً، ثم يمكنك حذف الفاتورة'
                                : '🚫 Cannot delete a delivered invoice — open the Delivery Note and click "Reverse Delivery" first, then you can delete the invoice',
                            { duration: 8000 }
                        );
                        break;
                    }

                    // ═══ SALES SAFETY NET: Even if stage is 'confirmed'/'draft', check for actual inventory_movements ═══
                    // This catches edge cases where delivery happened but stage wasn't updated
                    if (isSalesTrade && (documentId || data?.id)) {
                        const salesDocId = documentId || data?.id;
                        try {
                            const { count: movementCount } = await supabase
                                .from('inventory_movements')
                                .select('id', { count: 'exact', head: true })
                                .eq('reference_id', salesDocId)
                                .in('movement_type', ['sale', 'issue', 'delivery']);

                            if (movementCount && movementCount > 0) {
                                toast.error(
                                    language === 'ar'
                                        ? `🚫 لا يمكن حذف هذه الفاتورة — يوجد ${movementCount} حركة مخزنية مرتبطة بها (تسليم فعلي). استخدم مرتجع المبيعات بدلاً من ذلك.`
                                        : `🚫 Cannot delete — ${movementCount} inventory movement(s) linked to this invoice (physical delivery). Use Sales Return instead.`,
                                    { duration: 8000 }
                                );
                                break;
                            }

                            // Also check for delivery_notes linked to this invoice
                            const { count: dnCount } = await supabase
                                .from('delivery_notes')
                                .select('id', { count: 'exact', head: true })
                                .eq('sales_order_id', salesDocId);

                            if (dnCount && dnCount > 0) {
                                toast.error(
                                    language === 'ar'
                                        ? `🚫 لا يمكن حذف هذه الفاتورة — يوجد ${dnCount} إذن تسليم مرتبط. استخدم مرتجع المبيعات.`
                                        : `🚫 Cannot delete — ${dnCount} delivery note(s) linked. Use Sales Return instead.`,
                                    { duration: 8000 }
                                );
                                break;
                            }
                        } catch (checkErr) {
                            console.warn('[Delete Safety] Movement check failed:', checkErr);
                            // Don't block on check failure — stage-based guard above handles main cases
                        }
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
                            try {
                                await onDelete();
                                toast.success(t('messages.deletedSuccessfully') || 'تم الحذف بنجاح');
                                onClose();
                            } catch (deleteErr: any) {
                                console.error('[Delete Error]', deleteErr);
                                toast.error(
                                    language === 'ar' ? '🚫 فشل الحذف' : '🚫 Delete failed',
                                    { description: deleteErr.message || '', duration: 6000 }
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                    } else if (docType === 'recurring' && (documentId || data?.id)) {
                        // ─── Recurring: حذف من recurring_entries ───
                        const docId = documentId || data?.id;
                        const confirmed = window.confirm(
                            language === 'ar'
                                ? 'هل أنت متأكد من حذف هذا القيد المتكرر؟\n\nلا يمكن التراجع عن هذا الإجراء.'
                                : 'Are you sure you want to delete this recurring entry?\n\nThis action cannot be undone.'
                        );
                        if (confirmed) {
                            setLoading(true);
                            try {
                                // Delete lines first
                                await supabase.from('recurring_entry_lines').delete().eq('recurring_entry_id', docId);
                                // Delete history
                                await supabase.from('recurring_entry_history').delete().eq('recurring_entry_id', docId);
                                // Delete main record
                                const { error } = await supabase.from('recurring_entries').delete().eq('id', docId);
                                if (error) throw error;
                                toast.success(language === 'ar' ? '🗑️ تم حذف القيد المتكرر' : '🗑️ Recurring entry deleted');
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? `فشل الحذف: ${err.message}` : `Delete failed: ${err.message}`
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                    } else if (isAccountingDocType && (documentId || data?.id)) {
                        // ─── Accounting: حذف القيد من journal_entries ───
                        const docId = documentId || data?.id;
                        const confirmed = window.confirm(
                            language === 'ar'
                                ? 'هل أنت متأكد من حذف هذا القيد؟\n\nلا يمكن التراجع عن هذا الإجراء.'
                                : 'Are you sure you want to delete this journal entry?\n\nThis action cannot be undone.'
                        );
                        if (confirmed) {
                            setLoading(true);
                            try {
                                const { journalEntriesService } = await import('@/services/journalEntriesService');
                                await journalEntriesService.delete(docId);
                                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                                toast.success(language === 'ar' ? '🗑️ تم حذف القيد بنجاح' : '🗑️ Journal entry deleted');
                                onClose();
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? `فشل الحذف: ${err.message}` : `Delete failed: ${err.message}`
                                );
                            } finally {
                                setLoading(false);
                            }
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
                                // ═══ 🔑 Pre-delete: Clean up linked journal entries for sales invoices ═══
                                // The DB trigger trg_cleanup_sales_journal handles this too (belt-and-suspenders)
                                if (tableName === 'sales_transactions') {
                                    try {
                                        // Fetch linked journal entry IDs before deletion
                                        const { data: txn } = await supabase
                                            .from('sales_transactions')
                                            .select('journal_entry_id, cogs_journal_entry_id')
                                            .eq('id', docId)
                                            .single();
                                        
                                        const jeIds = [txn?.journal_entry_id, txn?.cogs_journal_entry_id].filter(Boolean);
                                        
                                        // Also find any entries linked via reference_id
                                        const { data: refEntries } = await supabase
                                            .from('journal_entries')
                                            .select('id')
                                            .eq('reference_id', docId)
                                            .in('reference_type', ['sales_invoice', 'sales_cogs']);
                                        
                                        const refIds = (refEntries || []).map(e => e.id);
                                        const allJeIds = [...new Set([...jeIds, ...refIds])];
                                        
                                        if (allJeIds.length > 0) {
                                            // Delete lines first, then entries
                                            await supabase.from('journal_entry_lines').delete().in('entry_id', allJeIds);
                                            await supabase.from('journal_entries').delete().in('id', allJeIds);
                                            console.log(`🧹 [Delete] Cleaned up ${allJeIds.length} linked journal entries for sales invoice ${docId}`);
                                        }
                                    } catch (cleanupErr: any) {
                                        // Non-fatal: DB trigger will clean up as fallback
                                        console.warn('⚠️ [Delete] Journal cleanup warning (trigger will handle):', cleanupErr.message);
                                    }
                                }
                                
                                const { error } = await supabase.from(tableName).delete().eq('id', docId);
                                if (error) throw error;
                                invalidateTradeQueries(queryClient);
                                queryClient.invalidateQueries({ queryKey: ['containers_list'] });
                                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                toast.success(language === 'ar' ? '🗑️ تم حذف المستند والقيود المرتبطة بنجاح' : '🗑️ Document and linked entries deleted successfully');
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

                        // ── Sales validation: delivery_method required ──
                        const VALID_DELIVERY_METHODS = ['store_pickup', 'direct_pickup', 'direct_delivery', 'carrier'];
                        if (modeKey === 'sales') {
                            // Auto-apply default delivery method if not set
                            // (UI shows store_pickup by default, so this matches user expectation)
                            let deliveryMethod = data?.delivery_method;
                            if (!deliveryMethod) {
                                deliveryMethod = 'store_pickup';
                                // Persist the default to DB and local state
                                setData((prev: any) => prev ? { ...prev, delivery_method: 'store_pickup' } : prev);
                                await supabase.from(tableName)
                                    .update({ delivery_method: 'store_pickup' })
                                    .eq('id', docId);
                            }
                            const isValidMethod = VALID_DELIVERY_METHODS.includes(deliveryMethod);
                            console.log('[SaveConfirm] 🔍 delivery_method check:', { deliveryMethod, isValidMethod, modeKey });

                            if (!isValidMethod) {
                                toast.error(
                                    language === 'ar'
                                        ? '⚠️ يجب تحديد طريقة التوصيل في تبويب "الدفعات والقيد والتوصيل" قبل التأكيد'
                                        : '⚠️ Delivery method must be set in Shipping tab before confirmation',
                                    { duration: 6000 }
                                );
                                // Revert stage back to draft since save already happened
                                await supabase.from(tableName)
                                    .update({ stage: 'draft', updated_at: new Date().toISOString() })
                                    .eq('id', docId);
                                setData((prev: any) => prev ? { ...prev, stage: 'draft' } : prev);
                                setLoading(false);
                                break;
                            }
                            // If direct_delivery, require shipping address
                            if (deliveryMethod === 'direct_delivery' && !data?.shipping_address_id && !data?.shipping_address) {
                                toast.error(
                                    language === 'ar'
                                        ? '⚠️ يجب تحديد عنوان التوصيل للعميل في تبويب الشحن والتوصيل'
                                        : '⚠️ Customer shipping address required for direct delivery',
                                    { duration: 6000 }
                                );
                                await supabase.from(tableName)
                                    .update({ stage: 'draft', updated_at: new Date().toISOString() })
                                    .eq('id', docId);
                                setData((prev: any) => prev ? { ...prev, stage: 'draft' } : prev);
                                setLoading(false);
                                break;
                            }
                        }

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

                                            // ═══ Assign permanent number if still DRAFT ═══
                                            let postPermanentNumber = '';
                                            const currentInvoiceNo = data?.invoice_no || '';
                                            if (!currentInvoiceNo || currentInvoiceNo.startsWith('DRAFT-')) {
                                                try {
                                                    const { TradeService } = await import('@/features/trade/services/TradeService');
                                                    const postCompanyId = data?.company_id || companyId;
                                                    postPermanentNumber = await TradeService.assignPermanentNumber(docId, 'purchase_invoice', postCompanyId);
                                                    console.log(`📝 [Post] Permanent number assigned: ${postPermanentNumber}`);
                                                } catch (numErr) {
                                                    console.error('[Post] Failed to assign permanent number:', numErr);
                                                }
                                            }

                                            // Update data with journal entry info
                                            setData((prev: any) => ({
                                                ...prev,
                                                journal_entry_id: result.journalEntryId,
                                                stage: 'posted',
                                                status: 'posted',
                                                is_posted: true,
                                                posted_at: new Date().toISOString(),
                                                ...(postPermanentNumber ? { invoice_no: postPermanentNumber } : {}),
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
                                // ═══ Assign permanent number for ANY trade doc still having DRAFT- number ═══
                                {
                                    const currentNo = data?.invoice_no || data?.order_number || data?.quotation_number || '';
                                    if (!currentNo || currentNo.startsWith('DRAFT-')) {
                                        try {
                                            const { TradeService } = await import('@/features/trade/services/TradeService');
                                            const TRADE_TYPE_MAP_POST: Record<string, Record<string, string>> = {
                                                sales: { trade_invoice: 'invoice', trade_order: 'order', trade_quotation: 'quotation', trade_return: 'sales_return' },
                                                purchase: { trade_invoice: 'purchase_invoice', trade_order: 'purchase_order', trade_quotation: 'purchase_quotation', trade_receipt: 'purchase_receipt', trade_return: 'purchase_return' },
                                            };
                                            const postServiceDocType = TRADE_TYPE_MAP_POST[modeKey]?.[docType] || (modeKey === 'purchase' ? 'purchase_invoice' : 'invoice');
                                            const postCompanyId = data?.company_id || companyId;
                                            const postPermNum = await TradeService.assignPermanentNumber(docId, postServiceDocType, postCompanyId);
                                            if (postPermNum) {
                                                const numFieldMap: Record<string, string> = {
                                                    purchase_invoice: 'invoice_no', invoice: 'invoice_no',
                                                    purchase_order: 'order_number', order: 'order_number',
                                                    purchase_quotation: 'quotation_number', quotation: 'quotation_number',
                                                    purchase_receipt: 'receipt_number', purchase_return: 'return_number', sales_return: 'return_number',
                                                };
                                                const nfKey = numFieldMap[postServiceDocType] || 'invoice_no';
                                                // Update local state with new number
                                                setData((prev: any) => prev ? { ...prev, [nfKey]: postPermNum } : prev);
                                                console.log(`📝 [Post] Permanent number assigned: ${postPermNum}`);
                                            }
                                        } catch (numErr) {
                                            console.error('[Post] Failed to assign permanent number:', numErr);
                                        }
                                    }
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
                    } else if (isAccountingDocType && (documentId || data?.id)) {
                        // ─── Accounting: إلغاء ترحيل القيد ───
                        const docId = documentId || data?.id;
                        const confirmed = window.confirm(
                            language === 'ar'
                                ? 'هل تريد إلغاء ترحيل هذا القيد؟ سيعود لحالة المسودة.'
                                : 'Unpost this journal entry? It will return to draft status.'
                        );
                        if (confirmed) {
                            setLoading(true);
                            try {
                                const { journalEntriesService } = await import('@/services/journalEntriesService');
                                await journalEntriesService.unpost(docId);
                                setData((prev: any) => ({ ...prev, status: 'draft', is_posted: false }));
                                queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
                                queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                                invalidateAccountsCache();
                                toast.success(language === 'ar' ? '✅ تم إلغاء الترحيل — القيد الآن مسودة' : '✅ Unposted — entry is now a draft');
                            } catch (err: any) {
                                toast.error(
                                    language === 'ar' ? `فشل إلغاء الترحيل: ${err.message}` : `Unpost failed: ${err.message}`
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
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

                case 'export': {
                    // Excel export — build from document items
                    try {
                        const { exportToExcel } = await import('@/lib/export-utils');
                        const { columns: cols, rows } = await buildExportData(data, language, docType);
                        exportToExcel({
                            filename: data?.invoice_no || data?.order_number || data?.container_number || 'export',
                            title: data?.invoice_no || data?.order_number || docType,
                            columns: cols,
                            data: rows,
                            isRTL: language === 'ar',
                        });
                        toast.success(language === 'ar' ? '✅ تم التصدير بنجاح' : '✅ Exported successfully');
                    } catch (err) {
                        console.error('Export error:', err);
                        toast.info(t('messages.featureComingSoon') || 'قريباً');
                    }
                    break;
                }

                case 'google_sheets': {
                    try {
                        const { openInGoogleSheets } = await import('@/lib/export-utils');
                        const { columns: cols, rows } = await buildExportData(data, language, docType);
                        if (cols.length === 0) {
                            toast.warning(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
                            break;
                        }
                        // Build smart title — multi-language
                        const nameByLang = data?.[`name_${language}`] || data?.name || data?.name_ar || data?.name_en || data?.party_name || '';
                        const statementLabel: Record<string, string> = {
                            ar: 'كشف حساب', en: 'Statement', tr: 'Hesap Özeti', ru: 'Выписка', uk: 'Виписка',
                        };
                        const exportTitle = docType === 'party'
                            ? `${statementLabel[language] || 'Statement'} - ${nameByLang}`
                            : (data?.invoice_no || data?.order_number || docType);
                        const exportFilename = docType === 'party'
                            ? nameByLang || 'statement'
                            : (data?.invoice_no || data?.order_number || data?.container_number || 'export');

                        const creatingMsg: Record<string, string> = {
                            ar: '⏳ جاري إنشاء Google Sheet...', en: '⏳ Creating Google Sheet...',
                            tr: '⏳ Google Sheet oluşturuluyor...', ru: '⏳ Создание Google Sheet...',
                            uk: '⏳ Створення Google Sheet...',
                        };
                        toast.info(creatingMsg[language] || creatingMsg.en);
                        const result = await openInGoogleSheets({
                            filename: exportFilename,
                            title: exportTitle,
                            columns: cols,
                            data: rows,
                            isRTL: language === 'ar',
                            language: language,
                            companyId: companyId,
                            supabaseClient: supabase,
                        });
                        if (result?.url) {
                            toast.success(language === 'ar' ? '✅ تم فتح Google Sheet بنجاح' : '✅ Google Sheet opened');
                        } else if (result?.error === 'not_connected') {
                            // fallback handled inside openInGoogleSheets
                        } else if (result?.error) {
                            toast.error(result.error);
                        }
                    } catch (err: any) {
                        console.error('Google Sheets error:', err);
                        toast.error(err.message || 'Google Sheets error');
                    }
                    break;
                }

                case 'export_pdf': {
                    try {
                        const { exportToPDF } = await import('@/lib/export-utils');
                        const { columns: cols, rows } = await buildExportData(data, language, docType);
                        exportToPDF({
                            filename: data?.invoice_no || data?.order_number || 'export',
                            title: data?.invoice_no || data?.order_number || docType,
                            columns: cols,
                            data: rows,
                            isRTL: language === 'ar',
                        });
                        toast.success(language === 'ar' ? '📄 تم فتح PDF' : '📄 PDF opened');
                    } catch {
                        toast.info(t('messages.featureComingSoon') || 'قريباً');
                    }
                    break;
                }

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
