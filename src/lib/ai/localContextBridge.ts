/**
 * ═══════════════════════════════════════════════════
 * 🖥️ Local Context Bridge — Self-Hosted AI Support
 * ═══════════════════════════════════════════════════
 * Fetches a snapshot of local company data and sends it
 * to the cloud Edge Function as context_data, bridging
 * the gap between local DB and cloud AI.
 */

import { supabase, isSelfHosted } from '@/lib/supabase';

export { isSelfHosted };

/**
 * Fetches a comprehensive snapshot of local company data
 * to send to the cloud Edge Function as context_data.
 * Returns null if not in self-hosted mode.
 */
export async function fetchLocalContextSnapshot(companyId: string): Promise<Record<string, any> | null> {
    if (!isSelfHosted) return null;
    try {
        console.log('[LocalBridge] 🖥️ Fetching local context snapshot...');

        // ── Parallel fetch — only columns that exist in the local schema ──
        const [materialsRes, rollsRes, customersRes, suppliersRes, salesRes, purchasesRes, journalRes, companyRes, warehousesRes] = await Promise.all([
            supabase.from('fabric_materials').select('id, code, name_ar, name_en, category, unit, current_stock, min_stock, purchase_price, selling_price, status, composition, origin_country').eq('company_id', companyId).limit(200),
            supabase.from('fabric_rolls').select('id, roll_number, current_length, initial_length, status, material_id, warehouse_id').eq('company_id', companyId).in('status', ['available', 'reserved', 'partial']).limit(500),
            supabase.from('customers').select('id, name_ar, name_en, code, phone, city, balance, credit_limit, currency').eq('company_id', companyId).limit(100),
            supabase.from('suppliers').select('id, name_ar, name_en, code, phone, city, balance').eq('company_id', companyId).limit(100),
            supabase.from('sales_transactions').select('id, total_amount, stage, created_at, customer_id, customer_name, invoice_no, paid_amount, currency').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
            supabase.from('purchase_invoices').select('id, total_amount, created_at').eq('company_id', companyId).limit(100),
            supabase.from('journal_entries').select('id, entry_number, entry_date, entry_type, description_ar, total_debit, total_credit, status, is_posted').eq('company_id', companyId).order('entry_date', { ascending: false }).limit(50),
            supabase.from('companies').select('default_currency').eq('id', companyId).single(),
            supabase.from('warehouses').select('id, name_ar, name, name_en, code, warehouse_type').eq('company_id', companyId),
        ]);

        const materials = materialsRes.data || [];
        const rolls = rollsRes.data || [];
        const customers = customersRes.data || [];
        const suppliers = suppliersRes.data || [];
        const sales = salesRes.data || [];
        const purchases = purchasesRes.data || [];
        const journals = journalRes.data || [];
        const company = companyRes.data;
        const warehouses = warehousesRes.data || [];
        const baseCurrency = company?.default_currency || 'UAH';

        const confirmedSales = sales.filter((s: any) => ['confirmed', 'posted', 'paid', 'partial_paid'].includes(s.stage));
        const totalRevenue = confirmedSales.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
        const totalPaid = confirmedSales.reduce((s: number, t: any) => s + (t.paid_amount || 0), 0);
        const totalBalance = totalRevenue - totalPaid;
        const postedJournals = journals.filter((j: any) => j.is_posted);

        const context: Record<string, any> = {
            overview: {
                materials: materials.length,
                rolls: rolls.length,
                customers: customers.length,
                suppliers: suppliers.length,
                base_currency: baseCurrency,
            },
            base_currency: baseCurrency,
            sales: {
                total_transactions: confirmedSales.length,
                total_revenue: totalRevenue,
                total_paid: totalPaid,
                total_outstanding: totalBalance,
                currency: sales[0]?.currency || baseCurrency,
            },
            purchases: {
                total_invoices: purchases.length,
                total_cost: purchases.reduce((s: number, t: any) => s + (t.total_amount || 0), 0),
            },
            accounting: {
                total_entries: journals.length,
                posted_entries: postedJournals.length,
                total_debit: postedJournals.reduce((s: number, j: any) => s + (j.total_debit || 0), 0),
                total_credit: postedJournals.reduce((s: number, j: any) => s + (j.total_credit || 0), 0),
            },
            all_materials: materials.map((m: any) => ({
                code: m.code, name: m.name_ar || m.name_en, category: m.category || '',
                unit: m.unit || 'متر', stock: m.current_stock || 0, min_stock: m.min_stock || 0,
                buy_price: m.purchase_price || 0, sell_price: m.selling_price || 0,
                status: m.status || 'active',
                stock_status: (m.current_stock || 0) <= (m.min_stock || 0) && (m.min_stock || 0) > 0 ? 'LOW' : 'OK',
            })),
            customers_list: customers.map((c: any) => ({
                name: c.name_ar || c.name_en, code: c.code || '', city: c.city || '',
                balance: c.balance || 0, currency: c.currency || baseCurrency, credit_limit: c.credit_limit || 0,
            })),
            suppliers_list: suppliers.map((s: any) => ({
                name: s.name_ar || s.name_en, code: s.code || '', city: s.city || '', balance: s.balance || 0,
            })),
            warehouses: warehouses.map((w: any) => ({ name: w.name_ar || w.name || w.name_en, code: w.code || '' })),
            _source: 'local_snapshot',
        };

        console.log('[LocalBridge] 🖥️ Snapshot ready:', materials.length, 'materials,', customers.length, 'customers,', rolls.length, 'rolls');
        return context;
    } catch (err) {
        console.warn('[LocalBridge] 🖥️ Failed to fetch snapshot:', err);
        return null;
    }
}
