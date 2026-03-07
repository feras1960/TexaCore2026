/**
 * 💳 Payment Schedule & Installments Service
 * خدمة خطط الدفع والأقساط + سندات القبض
 * 
 * Supports:
 * - Creating installment plans (equal/custom/deposit)
 * - Tracking individual installment payments
 * - Treasury account integration (cash/bank)
 * - Payment receipt creation
 * - Telegram reminders
 * - Payment confirmation for document workflow
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';
import { telegramNotify } from './telegramNotificationService';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export type PlanType = 'installment' | 'custom' | 'deposit' | 'milestone';
export type InstallmentPeriod = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
export type ScheduleStatus = 'active' | 'completed' | 'cancelled' | 'overdue';
export type InstallmentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'pos';

export interface PaymentSchedule {
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id?: string;

    // Document links
    quotation_id?: string;
    sales_order_id?: string;
    sales_invoice_id?: string;
    purchase_order_id?: string;
    purchase_invoice_id?: string;

    // Party
    customer_id?: string;
    supplier_id?: string;

    // Plan config
    plan_type: PlanType;
    total_amount: number;
    currency: string;
    installment_count: number;
    installment_period: InstallmentPeriod;

    // Deposit
    deposit_amount: number;
    deposit_paid: boolean;
    deposit_paid_date?: string;
    deposit_voucher_id?: string;

    // Payment requirement
    payment_required_for_confirmation: boolean;

    // Status
    status: ScheduleStatus;
    paid_amount: number;
    remaining_amount: number;

    // Telegram
    telegram_reminder_enabled: boolean;
    telegram_reminder_days_before: number;
    telegram_chat_id?: string;

    notes?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;

    // Joined
    items?: PaymentScheduleItem[];
    customer_name?: string;
    supplier_name?: string;
}

export interface PaymentScheduleItem {
    id: string;
    schedule_id: string;
    tenant_id: string;
    installment_number: number;
    amount: number;
    currency: string;
    due_date: string;
    status: InstallmentStatus;
    paid_amount: number;
    paid_date?: string;
    payment_method?: PaymentMethod;
    treasury_account_id?: string;
    cash_register_id?: string;
    payment_voucher_id?: string;
    receipt_number?: string;
    reminder_sent: boolean;
    reminder_sent_at?: string;
    confirmed: boolean;
    confirmed_by?: string;
    confirmed_at?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateScheduleInput {
    company_id: string;
    branch_id?: string;

    // Source document
    quotation_id?: string;
    sales_order_id?: string;
    sales_invoice_id?: string;
    purchase_order_id?: string;
    purchase_invoice_id?: string;

    customer_id?: string;
    supplier_id?: string;

    plan_type: PlanType;
    total_amount: number;
    currency: string;
    installment_count: number;
    installment_period: InstallmentPeriod;
    start_date: string; // First due date

    deposit_amount?: number;
    payment_required_for_confirmation?: boolean;

    telegram_reminder_enabled?: boolean;
    telegram_reminder_days_before?: number;
    telegram_chat_id?: string;

    // For custom plans: { amount, due_date }[]
    custom_installments?: Array<{ amount: number; due_date: string }>;

    notes?: string;
}

export interface RecordPaymentInput {
    schedule_item_id: string;
    amount: number;
    payment_method: PaymentMethod;
    treasury_account_id?: string;
    cash_register_id?: string;
    reference_number?: string;
    notes?: string;
    create_receipt?: boolean; // Whether to also create a payment_receipt record
}

export interface TreasuryAccount {
    id: string;
    account_code: string;
    name_ar: string;
    name_en?: string;
    is_cash_account: boolean;
    is_bank_account: boolean;
    bank_name?: string;
    current_balance: number;
    currency?: string;
}

export interface JournalPreviewLine {
    account_name: string;
    account_code: string;
    debit: number;
    credit: number;
    description: string;
}

// ═══════════════════════════════════════════
// Helper: Calculate installment dates
// ═══════════════════════════════════════════

function calculateInstallmentDates(
    startDate: string,
    count: number,
    period: InstallmentPeriod
): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);

    for (let i = 0; i < count; i++) {
        const date = new Date(start);
        switch (period) {
            case 'weekly':
                date.setDate(date.getDate() + i * 7);
                break;
            case 'biweekly':
                date.setDate(date.getDate() + i * 14);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + i);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + i * 3);
                break;
            default:
                date.setMonth(date.getMonth() + i);
        }
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// ═══════════════════════════════════════════
// Service
// ═══════════════════════════════════════════

export const paymentScheduleService = {

    // ─── Get Schedule for a Document ───────────────
    async getByDocument(params: {
        quotation_id?: string;
        sales_order_id?: string;
        sales_invoice_id?: string;
        purchase_order_id?: string;
        purchase_invoice_id?: string;
        company_id: string;
    }): Promise<PaymentSchedule | null> {
        let query = supabase
            .from('payment_schedule')
            .select('*, payment_schedule_items(*)')
            .eq('company_id', params.company_id);

        if (params.quotation_id) query = query.eq('quotation_id', params.quotation_id);
        else if (params.sales_order_id) query = query.eq('sales_order_id', params.sales_order_id);
        else if (params.sales_invoice_id) query = query.eq('sales_invoice_id', params.sales_invoice_id);
        else if (params.purchase_order_id) query = query.eq('purchase_order_id', params.purchase_order_id);
        else if (params.purchase_invoice_id) query = query.eq('purchase_invoice_id', params.purchase_invoice_id);
        else return null;

        const { data, error } = await query.maybeSingle();
        if (error) {
            console.warn('Error fetching payment schedule:', error);
            return null;
        }
        if (!data) return null;

        return {
            ...data,
            items: (data.payment_schedule_items || []).sort(
                (a: any, b: any) => a.installment_number - b.installment_number
            ),
        } as PaymentSchedule;
    },

    // ─── Get Schedule by ID ───────────────
    async getById(id: string): Promise<PaymentSchedule | null> {
        const { data, error } = await supabase
            .from('payment_schedule')
            .select('*, payment_schedule_items(*)')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) return null;

        return {
            ...data,
            items: (data.payment_schedule_items || []).sort(
                (a: any, b: any) => a.installment_number - b.installment_number
            ),
        } as PaymentSchedule;
    },

    // ─── Create Schedule ───────────────
    async createSchedule(input: CreateScheduleInput): Promise<PaymentSchedule> {
        const tenantId = await getCurrentTenantIdAsync();
        if (!tenantId) throw new Error('No tenant ID');

        // 1. Create the schedule record
        const { data: schedule, error: scheduleError } = await supabase
            .from('payment_schedule')
            .insert({
                tenant_id: tenantId,
                company_id: input.company_id,
                branch_id: input.branch_id,
                quotation_id: input.quotation_id,
                sales_order_id: input.sales_order_id,
                sales_invoice_id: input.sales_invoice_id,
                purchase_order_id: input.purchase_order_id,
                purchase_invoice_id: input.purchase_invoice_id,
                customer_id: input.customer_id,
                supplier_id: input.supplier_id,
                plan_type: input.plan_type,
                total_amount: input.total_amount,
                currency: input.currency,
                installment_count: input.installment_count,
                installment_period: input.installment_period,
                deposit_amount: input.deposit_amount || 0,
                payment_required_for_confirmation: input.payment_required_for_confirmation || false,
                telegram_reminder_enabled: input.telegram_reminder_enabled || false,
                telegram_reminder_days_before: input.telegram_reminder_days_before || 3,
                telegram_chat_id: input.telegram_chat_id,
                status: 'active',
                paid_amount: 0,
                notes: input.notes,
            })
            .select()
            .single();

        if (scheduleError || !schedule) {
            throw new Error(`Failed to create schedule: ${scheduleError?.message}`);
        }

        // 2. Generate installment items
        let items: Array<{ amount: number; due_date: string }> = [];

        if (input.plan_type === 'custom' && input.custom_installments?.length) {
            items = input.custom_installments;
        } else {
            // Calculate equal installments
            const remainingAfterDeposit = input.total_amount - (input.deposit_amount || 0);
            const installmentAmount = Math.round((remainingAfterDeposit / input.installment_count) * 100) / 100;
            const dates = calculateInstallmentDates(
                input.start_date,
                input.installment_count,
                input.installment_period
            );

            for (let i = 0; i < input.installment_count; i++) {
                // Last installment gets the rounding difference
                const isLast = i === input.installment_count - 1;
                const amount = isLast
                    ? remainingAfterDeposit - installmentAmount * (input.installment_count - 1)
                    : installmentAmount;
                items.push({ amount, due_date: dates[i] });
            }
        }

        // 3. Insert installment items
        const itemsToInsert = items.map((item, idx) => ({
            schedule_id: schedule.id,
            tenant_id: tenantId,
            installment_number: idx + 1,
            amount: item.amount,
            currency: input.currency,
            due_date: item.due_date,
            status: 'pending' as const,
            paid_amount: 0,
        }));

        const { error: itemsError } = await supabase
            .from('payment_schedule_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Error creating installment items:', itemsError);
        }

        return this.getById(schedule.id) as Promise<PaymentSchedule>;
    },

    // ─── Record a Payment on an Installment ───────────────
    async recordPayment(input: RecordPaymentInput): Promise<PaymentScheduleItem> {
        const tenantId = await getCurrentTenantIdAsync();

        // 1. Get the current installment
        const { data: item, error: fetchError } = await supabase
            .from('payment_schedule_items')
            .select('*, payment_schedule!schedule_id(*)')
            .eq('id', input.schedule_item_id)
            .single();

        if (fetchError || !item) {
            throw new Error('Installment not found');
        }

        const newPaidAmount = (item.paid_amount || 0) + input.amount;
        const newStatus: InstallmentStatus = newPaidAmount >= item.amount ? 'paid' : 'partial';

        // 2. Update the installment
        const { data: updated, error: updateError } = await supabase
            .from('payment_schedule_items')
            .update({
                paid_amount: newPaidAmount,
                paid_date: new Date().toISOString().split('T')[0],
                payment_method: input.payment_method,
                treasury_account_id: input.treasury_account_id,
                cash_register_id: input.cash_register_id,
                receipt_number: input.reference_number,
                status: newStatus,
                confirmed: true,
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', input.schedule_item_id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to record payment: ${updateError.message}`);
        }

        // 3. Optionally create a payment receipt
        if (input.create_receipt) {
            const schedule = item.payment_schedule;
            try {
                await supabase.from('payment_receipts').insert({
                    tenant_id: tenantId,
                    company_id: schedule.company_id,
                    receipt_number: `RCV-${Date.now()}`,
                    receipt_date: new Date().toISOString().split('T')[0],
                    customer_id: schedule.customer_id,
                    amount: input.amount,
                    currency: schedule.currency,
                    payment_method: input.payment_method,
                    status: 'confirmed',
                    notes: input.notes || `دفعة رقم ${item.installment_number}`,
                    schedule_item_id: input.schedule_item_id,
                    treasury_account_id: input.treasury_account_id,
                    sales_order_id: schedule.sales_order_id,
                    sales_invoice_id: schedule.sales_invoice_id,
                    quotation_id: schedule.quotation_id,
                });
            } catch (err) {
                console.warn('Could not create receipt record:', err);
            }
        }

        // 4. 📱 Telegram: إشعار استلام دفعة
        try {
            const schedule = item.payment_schedule;
            if (schedule?.company_id) {
                const partyName = schedule.customer_id
                    ? (schedule.customer_name || 'عميل')
                    : (schedule.supplier_name || 'مورد');

                telegramNotify.paymentReceived(schedule.company_id, {
                    amount: input.amount,
                    currency: schedule.currency || 'TRY',
                    customerName: partyName,
                    paymentMethod: input.payment_method,
                    referenceNumber: input.reference_number || undefined,
                });
            }
        } catch (tgErr) {
            console.warn('[Payment] Telegram notification failed (non-blocking):', tgErr);
        }

        return updated as PaymentScheduleItem;
    },

    // ─── Delete Schedule ───────────────
    async deleteSchedule(scheduleId: string): Promise<void> {
        const { error } = await supabase
            .from('payment_schedule')
            .delete()
            .eq('id', scheduleId);
        if (error) throw error;
    },

    // ─── Get Treasury Accounts (Cash + Bank) ───────────────
    async getTreasuryAccounts(companyId: string): Promise<TreasuryAccount[]> {
        const { data, error } = await supabase
            .from('chart_of_accounts')
            .select('id, account_code, name_ar, name_en, is_cash_account, is_bank_account, bank_name, current_balance, currency')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .or('is_cash_account.eq.true,is_bank_account.eq.true')
            .order('account_code');

        if (error) {
            console.warn('Error fetching treasury accounts:', error);
            return [];
        }
        return (data || []) as TreasuryAccount[];
    },

    // ─── Get Payment History for a Document ───────────────
    async getPaymentHistory(params: {
        quotation_id?: string;
        sales_order_id?: string;
        sales_invoice_id?: string;
        company_id: string;
    }): Promise<any[]> {
        let query = supabase
            .from('payment_receipts')
            .select('*')
            .eq('company_id', params.company_id)
            .order('receipt_date', { ascending: false });

        if (params.sales_invoice_id) {
            query = query.or(`sales_invoice_id.eq.${params.sales_invoice_id}`);
        } else if (params.sales_order_id) {
            query = query.or(`sales_order_id.eq.${params.sales_order_id}`);
        } else if (params.quotation_id) {
            query = query.or(`quotation_id.eq.${params.quotation_id}`);
        }

        const { data, error } = await query;
        if (error) {
            console.warn('Error fetching payment history:', error);
            return [];
        }
        return data || [];
    },

    generateJournalPreview(params: {
        totalAmount: number;
        paidAmount: number;
        taxAmount?: number;
        costAmount?: number;
        currency: string;
        customerName?: string;
        isRTL: boolean;
        accountCodes?: {
            receivableCode?: string;
            receivableName?: string;
            salesCode?: string;
            salesName?: string;
            cashCode?: string;
            cashName?: string;
            taxOutputCode?: string;
            taxOutputName?: string;
            cogsCode?: string;
            cogsName?: string;
            inventoryCode?: string;
            inventoryName?: string;
        };
        partySubAccount?: {
            code: string;
            nameAr: string;
            nameEn?: string;
        } | null;
    }): JournalPreviewLine[] {
        const { totalAmount, paidAmount, taxAmount = 0, costAmount = 0, currency, customerName, isRTL, accountCodes, partySubAccount } = params;
        const lines: JournalPreviewLine[] = [];

        const arCode = partySubAccount?.code || accountCodes?.receivableCode || '—';
        const arName = partySubAccount
            ? (isRTL ? partySubAccount.nameAr : (partySubAccount.nameEn || partySubAccount.nameAr))
            : (accountCodes?.receivableName || (isRTL ? 'ذمم مدينة — عملاء' : 'Accounts Receivable'));
        const salesCode = accountCodes?.salesCode || '—';
        const salesName = accountCodes?.salesName || (isRTL ? 'إيرادات المبيعات' : 'Sales Revenue');
        const cashCode = accountCodes?.cashCode || '—';
        const cashName = accountCodes?.cashName || (isRTL ? 'الصندوق / البنك' : 'Cash / Bank');
        const taxCode = accountCodes?.taxOutputCode || '—';
        const taxName = accountCodes?.taxOutputName || (isRTL ? 'ضريبة القيمة المضافة - مخرجات' : 'Output VAT');
        const netAmount = totalAmount - taxAmount;

        if (totalAmount > 0) {
            lines.push({
                account_name: arName,
                account_code: arCode,
                debit: totalAmount,
                credit: 0,
                description: isRTL
                    ? `فاتورة بيع ${customerName || ''}`
                    : `Sales Invoice ${customerName || ''}`,
            });
            lines.push({
                account_name: salesName,
                account_code: salesCode,
                debit: 0,
                credit: taxAmount > 0 ? netAmount : totalAmount,
                description: isRTL
                    ? `إيرادات مبيعات ${customerName || ''}`
                    : `Sales revenue ${customerName || ''}`,
            });
            if (taxAmount > 0) {
                lines.push({
                    account_name: taxName,
                    account_code: taxCode,
                    debit: 0,
                    credit: taxAmount,
                    description: isRTL
                        ? `ضريبة مبيعات ${customerName || ''}`
                        : `Sales tax ${customerName || ''}`,
                });
            }
            if (costAmount > 0 && accountCodes?.cogsCode && accountCodes?.inventoryCode) {
                lines.push({
                    account_name: accountCodes.cogsName || (isRTL ? 'تكلفة البضاعة المباعة' : 'COGS'),
                    account_code: accountCodes.cogsCode,
                    debit: costAmount,
                    credit: 0,
                    description: isRTL ? 'تكلفة مبيعات' : 'Cost of goods sold',
                });
                lines.push({
                    account_name: accountCodes.inventoryName || (isRTL ? 'المخزون' : 'Inventory'),
                    account_code: accountCodes.inventoryCode,
                    debit: 0,
                    credit: costAmount,
                    description: isRTL ? 'إخراج مخزون' : 'Inventory reduction',
                });
            }
        }

        if (paidAmount > 0) {
            lines.push({
                account_name: cashName,
                account_code: cashCode,
                debit: paidAmount,
                credit: 0,
                description: isRTL
                    ? `استلام دفعة من ${customerName || 'العميل'}`
                    : `Payment received from ${customerName || 'customer'}`,
            });
            lines.push({
                account_name: arName,
                account_code: arCode,
                debit: 0,
                credit: paidAmount,
                description: isRTL
                    ? `تسوية ذمة ${customerName || ''}`
                    : `Settlement ${customerName || ''}`,
            });
        }

        return lines;
    },

    // ─── Check if payment is required for confirmation ───────────────
    async isPaymentRequiredAndPaid(params: {
        quotation_id?: string;
        sales_order_id?: string;
        sales_invoice_id?: string;
        company_id: string;
    }): Promise<{ required: boolean; paid: boolean; schedule?: PaymentSchedule }> {
        const schedule = await this.getByDocument(params);

        if (!schedule) {
            return { required: false, paid: true };
        }

        if (!schedule.payment_required_for_confirmation) {
            return { required: false, paid: true, schedule };
        }

        // Check: deposit paid? or first installment paid?
        const hasPaidSomething = schedule.paid_amount > 0 || schedule.deposit_paid;
        return {
            required: true,
            paid: hasPaidSomething,
            schedule,
        };
    },
};

export default paymentScheduleService;
