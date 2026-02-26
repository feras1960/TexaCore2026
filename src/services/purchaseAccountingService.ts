
import { supabase } from '@/lib/supabase';
import journalEntriesService, { CreateJournalEntryInput } from './journalEntriesService';
import { directStockUpdateService } from './directStockUpdateService';
import { activityLogService } from './activityLogService';

// ═══════════════════════════════════════════════════════════════
// Purchase Accounting Service — V2 (Smart Posting)
// ═══════════════════════════════════════════════════════════════
// 
// القاعدة الذهبية: الحسابات الافتراضية تُحمّل من company_accounting_settings فقط.
// إذا لم تكن الحسابات المطلوبة معرّفة → يُرفض الترحيل مع رسالة واضحة.
//
// الترحيل الذكي:
// - من "مؤكد" (confirmed) بدون استلام → القيد بقيم الفاتورة
// - من "مستلم جزئياً" (partially_received) → القيد بالكميات المستلمة فعلياً
// - من "مستلم بالكامل" (received) → القيد بالكميات المستلمة فعلياً
//
// نظام التسامح:
// - فرق الكمية ≤ 5% → قبول تلقائي
// - فرق السعر ≤ 2% → قبول تلقائي
// - أي فرق أكبر → تسجيل في receipt_variance_detail
// ═══════════════════════════════════════════════════════════════

// ═══ Types ═══
interface CompanyDefaultAccounts {
    default_cash_account_id: string | null;
    default_bank_account_id: string | null;
    default_receivable_account_id: string | null;
    default_payable_account_id: string | null;
    default_revenue_account_id: string | null;
    default_sales_account_id: string | null;
    default_expense_account_id: string | null;
    default_purchase_account_id: string | null;
    default_cogs_account_id: string | null;
    default_inventory_account_id: string | null;
    default_tax_input_account_id: string | null;
    default_tax_output_account_id: string | null;
}

interface VarianceItem {
    item_id: string;
    material_id?: string | null;
    description?: string;
    invoice_qty: number;
    received_qty: number;
    qty_variance: number;
    qty_variance_pct: number;
    invoice_price: number;
    received_price?: number;
    price_variance?: number;
    price_variance_pct?: number;
    auto_accepted: boolean;
    reason?: string;
}

interface PostingResult {
    journalEntryId: string;
    postingSource: 'invoice' | 'receipt';
    warnings: string[];
    variances: VarianceItem[];
    hasSignificantVariance: boolean;
}

// ═══ Tolerance Constants ═══
const QTY_TOLERANCE_PCT = 5;    // 5% — فرق الكمية المقبول تلقائياً
const PRICE_TOLERANCE_PCT = 2;  // 2% — فرق السعر المقبول تلقائياً

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch the company's default accounts from accounting settings.
 * This is the SINGLE SOURCE OF TRUTH for all posting operations.
 */
async function getCompanyDefaultAccounts(companyId: string): Promise<CompanyDefaultAccounts | null> {
    const { data, error } = await supabase
        .from('company_accounting_settings')
        .select(`
            default_cash_account_id,
            default_bank_account_id,
            default_receivable_account_id,
            default_payable_account_id,
            default_revenue_account_id,
            default_sales_account_id,
            default_expense_account_id,
            default_purchase_account_id,
            default_cogs_account_id,
            default_inventory_account_id,
            default_tax_input_account_id,
            default_tax_output_account_id
        `)
        .eq('company_id', companyId)
        .single();

    if (error || !data) {
        console.error('❌ Failed to fetch company accounting settings:', error);
        return null;
    }
    return data as CompanyDefaultAccounts;
}

/**
 * Calculate percentage variance between two values.
 * Returns 0 if base is 0.
 */
function calcVariancePct(invoiceVal: number, actualVal: number): number {
    if (invoiceVal === 0) return actualVal === 0 ? 0 : 100;
    return Math.abs((actualVal - invoiceVal) / invoiceVal) * 100;
}

/**
 * Check if receipt data exists for this invoice
 * and aggregate received quantities per item.
 */
async function getReceiptSummary(invoiceId: string): Promise<{
    hasReceipts: boolean;
    receiptItems: Map<string, { totalReceived: number; totalAccepted: number }>;
}> {
    // Find all receipts linked to this invoice
    const { data: receipts, error } = await supabase
        .from('purchase_receipts')
        .select('id')
        .eq('invoice_id', invoiceId);

    if (error || !receipts || receipts.length === 0) {
        return { hasReceipts: false, receiptItems: new Map() };
    }

    const receiptIds = receipts.map(r => r.id);

    // Get all receipt items across all receipts for this invoice
    const { data: items, error: itemsError } = await supabase
        .from('purchase_receipt_items')
        .select('material_id, product_id, quantity_received, quantity_accepted')
        .in('receipt_id', receiptIds);

    if (itemsError || !items) {
        return { hasReceipts: true, receiptItems: new Map() };
    }

    // Aggregate by material_id or product_id
    const receiptItems = new Map<string, { totalReceived: number; totalAccepted: number }>();

    for (const item of items) {
        const key = item.material_id || item.product_id || 'unknown';
        const existing = receiptItems.get(key) || { totalReceived: 0, totalAccepted: 0 };
        existing.totalReceived += Number(item.quantity_received || 0);
        existing.totalAccepted += Number(item.quantity_accepted || item.quantity_received || 0);
        receiptItems.set(key, existing);
    }

    return { hasReceipts: true, receiptItems };
}


// ═══════════════════════════════════════════════════════════════
// Main Service
// ═══════════════════════════════════════════════════════════════

export const purchaseAccountingService = {
    /**
     * Create a Journal Entry for a Purchase Invoice — Smart Posting V2.
     * 
     * Determines posting source based on the current stage:
     * - confirmed → uses invoice amounts (no receipt yet)
     * - partially_received / received → uses actual received quantities
     * 
     * Returns a PostingResult with warnings about any variances.
     */
    async createPurchaseInvoiceJournalEntry(
        invoiceId: string,
        userId: string,
        options?: { fromStage?: string }
    ): Promise<PostingResult> {
        console.log('🔄 [Smart Posting V2] Creating JE for:', invoiceId, 'fromStage:', options?.fromStage);

        const warnings: string[] = [];
        const variances: VarianceItem[] = [];

        // ═══════════════════════════════════════════════
        // 1. Fetch Invoice Data
        // ═══════════════════════════════════════════════
        const { data: invoice, error: invoiceError } = await supabase
            .from('purchase_transactions')
            .select(`
                *,
                items:purchase_transaction_items(*)
            `)
            .eq('id', invoiceId)
            .single();

        if (invoiceError || !invoice) {
            throw new Error('فشل في جلب بيانات الفاتورة: ' + (invoiceError?.message || 'الفاتورة غير موجودة'));
        }

        if (invoice.journal_entry_id) {
            console.warn('⚠️ الفاتورة لديها قيد محاسبي مسبقاً:', invoice.journal_entry_id);
            return {
                journalEntryId: invoice.journal_entry_id,
                postingSource: 'invoice',
                warnings: ['القيد المحاسبي موجود مسبقاً'],
                variances: [],
                hasSignificantVariance: false,
            };
        }

        const companyId = invoice.company_id;
        const currentStage = options?.fromStage || invoice.stage;

        // ═══════════════════════════════════════════════
        // 2. Determine Posting Source (Invoice vs Receipt)
        // ═══════════════════════════════════════════════
        let postingSource: 'invoice' | 'receipt' = 'invoice';
        const { hasReceipts, receiptItems } = await getReceiptSummary(invoiceId);

        if (currentStage === 'partially_received' || currentStage === 'received') {
            if (hasReceipts && receiptItems.size > 0) {
                postingSource = 'receipt';
                console.log('📦 Posting from RECEIPT data (received quantities)');
            } else {
                // Stage says received but no receipt data found — fall back to invoice
                warnings.push('المرحلة تشير للاستلام لكن لا توجد بيانات استلام — سيتم الترحيل بقيم الفاتورة');
                console.warn('⚠️ Stage is received but no receipt data found — using invoice amounts');
            }
        } else if (currentStage === 'confirmed') {
            console.log('📄 Posting from INVOICE data (no receipt required)');
            if (hasReceipts) {
                // Unusual: confirmed but has receipts?
                warnings.push('يوجد استلام مرتبط بالفاتورة لكن يتم الترحيل بقيم الفاتورة (المرحلة: مؤكد)');
            }
        }

        // ═══════════════════════════════════════════════
        // 3. Load Company Default Accounts
        // ═══════════════════════════════════════════════
        const defaults = await getCompanyDefaultAccounts(companyId);

        if (!defaults) {
            throw new Error(
                '❌ لم يتم العثور على إعدادات المحاسبة للشركة.\n' +
                'يرجى الذهاب إلى: الإعدادات → المحاسبة → الحسابات الافتراضية وتعيين الحسابات المطلوبة.\n\n' +
                '❌ Company accounting settings not found.\n' +
                'Go to: Settings → Accounting → Default Accounts and configure the required accounts.'
            );
        }

        // ═══════════════════════════════════════════════
        // 4. Validate Required Accounts
        // ═══════════════════════════════════════════════
        const missingAccounts: string[] = [];

        // 🔑 CONTAINER FIX: If invoice is linked to a container,
        // debit the CONTAINER ACCOUNT (Goods in Transit) — not Purchases/COGS.
        // This ensures the container account accumulates the full landed cost
        // (FOB + expenses) until goods are received and the account is closed.
        let debitAccountId: string | null = null;
        let isContainerInvoice = false;

        if (invoice.container_id) {
            // Fetch container's dedicated account
            const { data: containerDoc } = await supabase
                .from('containers')
                .select('container_account_id, container_number')
                .eq('id', invoice.container_id)
                .single();

            if (containerDoc?.container_account_id) {
                debitAccountId = containerDoc.container_account_id;
                isContainerInvoice = true;
                console.log('📦 [Container Invoice] Using container account as debit:',
                    containerDoc.container_number, '→', debitAccountId);
            } else {
                console.warn('⚠️ Invoice linked to container but no container_account_id found — falling back to purchases account');
                warnings.push('الفاتورة مرتبطة بكونتينر لكن لا يوجد حساب بضاعة بالطريق — تم الترحيل على حساب المشتريات');
            }
        }

        // Fallback: Inventory account (1141 بضاعة جاهزة)
        // ⚠️ Purchase invoices ALWAYS go to Inventory — NOT COGS!
        // COGS (511) is only used when goods are SOLD, not purchased.
        if (!debitAccountId) {
            debitAccountId = defaults.default_inventory_account_id;
        }
        // Secondary fallback: purchases account (if inventory not configured)
        if (!debitAccountId) {
            debitAccountId = defaults.default_purchase_account_id;
        }

        if (!debitAccountId) {
            missingAccounts.push('حساب المخزون / بضاعة جاهزة (Inventory Account 1141)');
        }

        let creditAccountId: string | null = null;
        if (invoice.supplier_id) {
            const { data: supplier } = await supabase
                .from('suppliers')
                .select('id, name_ar, name_en, payable_account_id')
                .eq('id', invoice.supplier_id)
                .single();
            creditAccountId = supplier?.payable_account_id || null;
        }
        if (!creditAccountId) {
            creditAccountId = defaults.default_payable_account_id;
        }
        if (!creditAccountId) {
            missingAccounts.push('حساب الذمم الدائنة / الموردين (Accounts Payable)');
        }

        let taxAccountId: string | null = null;
        if (invoice.tax_amount > 0) {
            taxAccountId = defaults.default_tax_input_account_id;
            if (!taxAccountId) {
                missingAccounts.push('حساب ضريبة المدخلات (VAT Input Account)');
            }
        }

        if (missingAccounts.length > 0) {
            const missingList = missingAccounts.map((a, i) => `  ${i + 1}. ${a}`).join('\n');
            throw new Error(
                `❌ لا يمكن ترحيل الفاتورة — الحسابات التالية غير معرّفة في إعدادات المحاسبة:\n${missingList}\n\n` +
                `يرجى الذهاب إلى: الإعدادات → المحاسبة → الحسابات الافتراضية\n\n` +
                `❌ Cannot post invoice — The following accounts are not configured:\n${missingList}\n\n` +
                `Go to: Settings → Accounting → Default Accounts`
            );
        }

        // ═══════════════════════════════════════════════
        // 5. Fetch Supplier Name
        // ═══════════════════════════════════════════════
        let supplierName = 'Supplier';
        if (invoice.supplier_id) {
            const { data: supplier } = await supabase
                .from('suppliers')
                .select('name_ar, name_en')
                .eq('id', invoice.supplier_id)
                .single();
            supplierName = supplier?.name_ar || supplier?.name_en || 'Supplier';
        }

        // ═══════════════════════════════════════════════
        // 6. Calculate Amounts & Variance Analysis
        // ═══════════════════════════════════════════════
        let effectiveSubtotal = 0;
        let effectiveTax = 0;
        let effectiveTotal = 0;
        let hasSignificantVariance = false;

        const invoiceItems = invoice.items || [];

        if (postingSource === 'receipt' && receiptItems.size > 0) {
            // ── Receipt-Based Posting: use actual received quantities ──
            console.log('📊 Calculating amounts from receipt data...');

            for (const item of invoiceItems) {
                const itemKey = item.material_id || item.product_id;
                const receiptData = itemKey ? receiptItems.get(itemKey) : null;

                const invoiceQty = Number(item.quantity || 0);
                const unitPrice = Number(item.unit_price || 0);
                const taxRate = Number(item.tax_rate || 0);

                if (receiptData) {
                    const receivedQty = receiptData.totalAccepted || receiptData.totalReceived;
                    const qtyVariancePct = calcVariancePct(invoiceQty, receivedQty);

                    // Check tolerance
                    const qtyAutoAccepted = qtyVariancePct <= QTY_TOLERANCE_PCT;

                    if (!qtyAutoAccepted) {
                        hasSignificantVariance = true;
                    }

                    // Record variance
                    const varianceItem: VarianceItem = {
                        item_id: item.id,
                        material_id: item.material_id,
                        description: item.description || item.description_ar || '',
                        invoice_qty: invoiceQty,
                        received_qty: receivedQty,
                        qty_variance: receivedQty - invoiceQty,
                        qty_variance_pct: Math.round(qtyVariancePct * 100) / 100,
                        invoice_price: unitPrice,
                        auto_accepted: qtyAutoAccepted,
                        reason: qtyAutoAccepted
                            ? `فرق ${qtyVariancePct.toFixed(1)}% ضمن حد التسامح (${QTY_TOLERANCE_PCT}%)`
                            : `فرق ${qtyVariancePct.toFixed(1)}% يتجاوز حد التسامح (${QTY_TOLERANCE_PCT}%)`,
                    };

                    if (Math.abs(varianceItem.qty_variance) > 0.001) {
                        variances.push(varianceItem);
                    }

                    // USE RECEIVED QTY for accounting
                    const lineSubtotal = receivedQty * unitPrice;
                    const lineTax = lineSubtotal * (taxRate / 100);
                    effectiveSubtotal += lineSubtotal;
                    effectiveTax += lineTax;
                } else {
                    // No receipt data for this item — use invoice amount
                    const lineSubtotal = Number(item.subtotal || invoiceQty * unitPrice);
                    const lineTax = Number(item.tax_amount || 0);
                    effectiveSubtotal += lineSubtotal;
                    effectiveTax += lineTax;

                    warnings.push(`لا يوجد بيانات استلام للصنف: ${item.description || item.item_code || 'غير معروف'} — استخدام قيم الفاتورة`);
                }
            }

            effectiveTotal = effectiveSubtotal + effectiveTax;

            // Add warnings for significant variances
            if (hasSignificantVariance) {
                const significantItems = variances.filter(v => !v.auto_accepted);
                warnings.push(
                    `⚠️ يوجد ${significantItems.length} أصناف بفروقات تتجاوز حد التسامح (${QTY_TOLERANCE_PCT}%) — يُنصح بمراجعتها`
                );
            }

            if (variances.length > 0) {
                console.log(`📊 Variance Analysis: ${variances.length} items with differences, ${variances.filter(v => !v.auto_accepted).length} significant`);
            }

        } else {
            // ── Invoice-Based Posting: use invoice amounts directly ──
            effectiveSubtotal = Number(invoice.subtotal || 0);
            effectiveTax = Number(invoice.tax_amount || 0);
            effectiveTotal = Number(invoice.total_amount || 0);
        }

        // ═══════════════════════════════════════════════
        // 7. Construct Journal Entry Lines
        // ═══════════════════════════════════════════════
        const invoiceRef = invoice.invoice_no || invoice.invoice_number || '-';
        const lines = [];

        // Line 1: Debit — Container Account (Goods in Transit) OR Purchases/COGS
        if (effectiveSubtotal > 0) {
            const memo = invoice.notes || invoice.description || '';
            const lineDesc = isContainerInvoice
                ? `بضاعة كونتينر #${invoiceRef} - ${supplierName} (بضاعة بالطريق)`
                : postingSource === 'receipt'
                    ? `فاتورة مشتريات #${invoiceRef} - ${supplierName} (بالمستلم فعلياً)`
                    : `فاتورة مشتريات #${invoiceRef} - ${supplierName}`;

            lines.push({
                account_id: debitAccountId!,
                debit: Math.round(effectiveSubtotal * 100) / 100,
                credit: 0,
                description: memo ? `${lineDesc} - ${memo}` : lineDesc,
                cost_center_id: null,
                // NOTE: party_id NOT set on debit line — only on credit (payable) line
                // to avoid double-counting in sub-ledger reports
            });
        }

        // Line 2: Debit — VAT Input (Tax amount)
        if (effectiveTax > 0 && taxAccountId) {
            lines.push({
                account_id: taxAccountId,
                debit: Math.round(effectiveTax * 100) / 100,
                credit: 0,
                description: `ضريبة فاتورة مشتريات #${invoiceRef}`,
                cost_center_id: null
            });
        }

        // Line 3: Credit — Supplier/Payable (Grand Total)
        // 🔑 CRITICAL: party_type + party_id enable Sub-Ledger tracking per supplier
        if (effectiveTotal > 0) {
            const memo = invoice.notes || invoice.description || '';
            const lineDesc = postingSource === 'receipt'
                ? `فاتورة مشتريات #${invoiceRef} - ${supplierName} (بالمستلم فعلياً)`
                : `فاتورة مشتريات #${invoiceRef} - ${supplierName}`;

            lines.push({
                account_id: creditAccountId!,
                debit: 0,
                credit: Math.round(effectiveTotal * 100) / 100,
                description: memo ? `${lineDesc} - ${memo}` : lineDesc,
                cost_center_id: null,
                party_type: invoice.supplier_id ? 'supplier' : null,
                party_id: invoice.supplier_id || null,
            });
        }

        // Validate: Entry must have at least 2 lines
        if (lines.length < 2) {
            throw new Error('خطأ: القيد المحاسبي يجب أن يحتوي على سطرين على الأقل.');
        }

        // ═══════════════════════════════════════════════
        // 8. Create Journal Entry
        // ═══════════════════════════════════════════════
        const entryInput: CreateJournalEntryInput = {
            company_id: companyId,
            branch_id: invoice.branch_id,
            entry_date: invoice.doc_date || invoice.invoice_date,
            entry_type: 'purchase_invoice',
            description: postingSource === 'receipt'
                ? `فاتورة مشتريات #${invoiceRef} - ${supplierName} (ترحيل بالمستلم)`
                : `فاتورة مشتريات #${invoiceRef} - ${supplierName}`,
            lines: lines
        };

        const journalEntry = await journalEntriesService.create(entryInput);
        console.log('✅ Journal Entry Created:', journalEntry.id, 'Source:', postingSource);

        // ═══════════════════════════════════════════════
        // 9. Link JE to Invoice & Update Status
        // ═══════════════════════════════════════════════
        const updatePayload: Record<string, any> = {
            journal_entry_id: journalEntry.id,
            is_posted: true,
            posted_at: new Date().toISOString(),
            stage: 'posted',
        };

        // Store variance data if exists
        if (variances.length > 0) {
            updatePayload.receipt_variance_detail = {
                posting_source: postingSource,
                posting_date: new Date().toISOString(),
                tolerance: { qty_pct: QTY_TOLERANCE_PCT, price_pct: PRICE_TOLERANCE_PCT },
                invoice_total: Number(invoice.total_amount || 0),
                effective_total: effectiveTotal,
                total_variance: effectiveTotal - Number(invoice.total_amount || 0),
                items: variances,
            };
        }

        const { error: linkError } = await supabase
            .from('purchase_transactions')
            .update(updatePayload)
            .eq('id', invoiceId);

        if (linkError) {
            console.error('❌ Failed to link JE to Invoice:', linkError);
            throw linkError;
        }

        // ═══════════════════════════════════════════════
        // 10. Post the Journal Entry (Commit to Ledger)
        // ═══════════════════════════════════════════════
        try {
            await journalEntriesService.post(journalEntry.id, userId);
            console.log('✅ Journal Entry Posted Successfully');
        } catch (postError) {
            console.error('⚠️ Failed to post Journal Entry:', postError);
            warnings.push('تم إنشاء القيد لكن فشل ترحيله للدفتر — يرجى الترحيل يدوياً');
        }

        // ═══════════════════════════════════════════════
        // 11. Direct Stock Update (if auto_update_stock enabled)
        // ═══════════════════════════════════════════════
        if (invoice.auto_update_stock && invoice.items?.length > 0) {
            const stockWarehouseId = invoice.stock_warehouse_id || invoice.warehouse_id;

            if (!stockWarehouseId) {
                warnings.push('تحديث المخزون المباشر مفعّل لكن لا يوجد مستودع محدد — تم تخطي التحديث');
            } else {
                const stockItems = invoice.items
                    .filter((item: any) => (item.material_id || item.product_id) && Number(item.quantity) > 0)
                    .map((item: any) => ({
                        material_id: item.material_id || item.product_id,
                        quantity: Number(item.quantity),
                        unit_price: Number(item.unit_price || 0),
                        description: item.description || item.description_ar || '',
                    }));

                const stockResult = await directStockUpdateService.executeDirectStockUpdate({
                    type: 'purchase',
                    transaction_id: invoiceId,
                    transaction_number: invoice.invoice_no || invoice.draft_no || '',
                    tenant_id: invoice.tenant_id,
                    company_id: companyId,
                    warehouse_id: stockWarehouseId,
                    doc_date: invoice.doc_date || new Date().toISOString().split('T')[0],
                    items: stockItems,
                    user_id: userId,
                });

                if (!stockResult.success) {
                    warnings.push('فشل في تحديث المخزون المباشر — يرجى التحديث يدوياً');
                }
                warnings.push(...stockResult.warnings);
            }
        }

        return {
            journalEntryId: journalEntry.id,
            postingSource,
            warnings,
            variances,
            hasSignificantVariance,
        };

        // 📜 Activity Log: تسجيل الترحيل
        // Note: يتم التسجيل في purchaseTransactionService.advanceStage()
    },

    /**
     * Cancel/Void the Journal Entry associated with a Purchase Invoice
     * and reset the invoice status.
     * Now handles returning to the correct pre-posting stage.
     */
    async cancelPurchaseInvoiceJournalEntry(invoiceId: string) {
        console.log('🔄 Cancelling Journal Entry for Purchase Invoice:', invoiceId);

        // 1. Get Invoice to find JE ID and determine return stage
        const { data: invoice, error: fetchError } = await supabase
            .from('purchase_transactions')
            .select('id, journal_entry_id, stage, receipt_variance_detail, stock_movement_id, auto_update_stock')
            .eq('id', invoiceId)
            .single();

        if (fetchError || !invoice) {
            throw new Error('Invoice not found');
        }

        if (!invoice.journal_entry_id) {
            console.log('ℹ️ No journal entry to cancel.');
            await supabase.from('purchase_transactions').update({
                stage: 'draft',
                is_posted: false
            }).eq('id', invoiceId);
            return;
        }

        const jeId = invoice.journal_entry_id;

        // 2. Check JE Status and handle accordingly
        const { data: je } = await supabase
            .from('journal_entries')
            .select('id, status, is_posted, description')
            .eq('id', jeId)
            .single();

        if (je) {
            if (je.status === 'draft') {
                await journalEntriesService.delete(je.id);
                console.log('🗑️ Draft Journal Entry deleted.');
            } else {
                const { error: cancelError } = await supabase
                    .from('journal_entries')
                    .update({
                        status: 'cancelled',
                        is_posted: false,
                        posted_at: null,
                        description: `[ملغية] ${je.description || ''}`
                    })
                    .eq('id', jeId);

                if (cancelError) {
                    console.error('Failed to cancel JE:', cancelError);
                    throw cancelError;
                }
                console.log('🚫 Journal Entry marked as cancelled.');
            }
        }

        // 3. Determine correct return stage
        // If there were receipts (variance_detail exists with receipt source), return to received/partially_received
        // Otherwise return to confirmed (if it was confirmed before) or draft
        let returnStage = 'draft';
        const varianceDetail = invoice.receipt_variance_detail as any;
        if (varianceDetail?.posting_source === 'receipt') {
            // Check if receipts still exist
            const { data: receipts } = await supabase
                .from('purchase_receipts')
                .select('id')
                .eq('invoice_id', invoiceId)
                .limit(1);

            if (receipts && receipts.length > 0) {
                returnStage = 'received'; // or partially_received — simplified
            } else {
                returnStage = 'confirmed';
            }
        } else {
            returnStage = 'confirmed';
        }

        // 3.5 Reverse Direct Stock Update (if any)
        if (invoice.stock_movement_id) {
            console.log('📦 Reversing direct stock update...');
            const reverseResult = await directStockUpdateService.reverseDirectStockUpdate(invoiceId, 'purchase');
            if (!reverseResult.success) {
                console.error('⚠️ Stock reversal failed:', reverseResult.error);
            }
        }

        // 4. Update Invoice: Remove Link and Reset Stage
        const { error: updateError } = await supabase
            .from('purchase_transactions')
            .update({
                journal_entry_id: null,
                is_posted: false,
                posted_at: null,
                stage: returnStage,
                receipt_variance_detail: null,
                stock_movement_id: null,
            })
            .eq('id', invoiceId);

        if (updateError) {
            throw updateError;
        }

        console.log(`✅ Invoice unposted — returning to stage: ${returnStage}`);
    }
};

export default purchaseAccountingService;
