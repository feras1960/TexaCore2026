/**
 * ═══════════════════════════════════════════════════════════════
 * 🏦 Party Balance Service — Sub-Ledger Balance Calculator
 * ═══════════════════════════════════════════════════════════════
 *
 * حساب أرصدة الموردين والعملاء من قيود اليومية (journal_entry_lines)
 * باستخدام نظام party_type + party_id (Sub-Ledger)
 *
 * هذا هو المصدر الوحيد للحقيقة لأرصدة الأطراف الخارجية.
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ═══ Types ═══
export interface PartyBalance {
    party_id: string;
    // ═══ العملة المحلية (UAH) ═══
    total_debit: number;
    total_credit: number;
    balance: number;  // credit - debit for suppliers, debit - credit for customers
    // ═══ العملة الأجنبية (USD) — محسوبة بسعر الصرف وقت كل حركة ═══
    total_debit_fc: number;
    total_credit_fc: number;
    balance_fc: number;  // same sign convention as balance
    // ═══ إحصائيات ═══
    transaction_count: number;
    last_transaction_date?: string;
}

export interface PartyStatement {
    id: string;
    entry_id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    debit: number;
    credit: number;
    running_balance: number;
    status: string;
}

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

export const partyBalanceService = {

    /**
     * 📊 Get balance for a SINGLE supplier or customer
     * 
     * For suppliers: balance = SUM(credit) - SUM(debit)  → positive = we owe them
     * For customers: balance = SUM(debit) - SUM(credit)  → positive = they owe us
     */
    async getPartyBalance(
        companyId: string,
        partyType: 'supplier' | 'customer',
        partyId: string
    ): Promise<PartyBalance> {
        const { data, error } = await supabase.rpc('get_party_balance', {
            p_company_id: companyId,
            p_party_type: partyType,
            p_party_id: partyId,
        });

        // If no RPC exists, fall back to manual query
        if (error) {
            console.warn('⚠️ get_party_balance RPC not found, using manual query');
            return this._getPartyBalanceManual(companyId, partyType, partyId);
        }

        return data as PartyBalance;
    },

    /**
     * 📊 Get balances for ALL suppliers or customers at once (bulk)
     * ⚡ Uses server-side RPC for maximum speed (single SQL query with GROUP BY)
     * Returns a Map of party_id → balance
     */
    async getAllPartyBalances(
        companyId: string,
        partyType: 'supplier' | 'customer'
    ): Promise<Record<string, PartyBalance>> {
        // ⚡ Try fast RPC first (server-side aggregation)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_party_balances_bulk', {
            p_company_id: companyId,
            p_party_type: partyType,
        });

        if (!rpcError && rpcData) {
            const balanceMap: Record<string, PartyBalance> = {};
            for (const row of rpcData) {
                balanceMap[row.party_id] = {
                    party_id: row.party_id,
                    // العملة المحلية (UAH)
                    total_debit: Number(row.total_debit || 0),
                    total_credit: Number(row.total_credit || 0),
                    balance: Number(row.balance || 0),
                    // العملة الأجنبية (USD) — بسعر صرف كل حركة
                    total_debit_fc: Number(row.total_debit_fc || 0),
                    total_credit_fc: Number(row.total_credit_fc || 0),
                    balance_fc: Number(row.balance_fc || 0),
                    transaction_count: Number(row.transaction_count || 0),
                    last_transaction_date: row.last_transaction_date || undefined,
                };
            }
            return balanceMap;
        }

        // 🔄 Fallback: client-side aggregation (slower)
        console.warn('⚠️ get_party_balances_bulk RPC failed, using client-side fallback:', rpcError?.message);
        return this._getAllPartyBalancesFallback(companyId, partyType);
    },

    /**
     * 🔄 Client-side fallback for getAllPartyBalances
     */
    async _getAllPartyBalancesFallback(
        companyId: string,
        partyType: 'supplier' | 'customer'
    ): Promise<Record<string, PartyBalance>> {
        const { data, error } = await supabase
            .from('journal_entry_lines')
            .select(`
                party_id,
                debit,
                credit,
                debit_fc,
                credit_fc,
                currency,
                exchange_rate,
                entry:journal_entries!inner(id, company_id, status, is_posted)
            `)
            .eq('party_type', partyType)
            .not('party_id', 'is', null)
            .eq('journal_entries.is_posted', true);

        if (error) {
            console.error('❌ Error fetching party balances:', error);
            return {};
        }

        const balanceMap: Record<string, PartyBalance> = {};

        for (const row of (data || [])) {
            const entry = row.entry as any;
            if (!entry || entry.company_id !== companyId || !entry.is_posted) continue;

            const pid = row.party_id;
            if (!pid) continue;

            const existing = balanceMap[pid] || {
                party_id: pid,
                total_debit: 0,
                total_credit: 0,
                balance: 0,
                transaction_count: 0,
            };

            // ═══ Smart FC Recovery — same logic as useLedgerData V3 ═══
            // debit/credit = base currency (UAH), debit_fc/credit_fc = native currency (e.g. USD)
            const debit = Number(row.debit || 0);
            const credit = Number(row.credit || 0);
            const debitFc = row.debit_fc != null ? Number(row.debit_fc) : null;
            const creditFc = row.credit_fc != null ? Number(row.credit_fc) : null;
            const rate = Number(row.exchange_rate || 1);

            // Use FC if valid (>0 or debit/credit is 0). Otherwise recover via base ÷ rate.
            const hasValidDebitFc = debitFc != null && (debitFc > 0 || debit === 0);
            const hasValidCreditFc = creditFc != null && (creditFc > 0 || credit === 0);

            const effectiveDebit = hasValidDebitFc ? debitFc! : (rate > 1 ? debit / rate : debit);
            const effectiveCredit = hasValidCreditFc ? creditFc! : (rate > 1 ? credit / rate : credit);

            existing.total_debit += effectiveDebit;
            existing.total_credit += effectiveCredit;
            existing.transaction_count++;

            if (partyType === 'supplier') {
                existing.balance = Math.round((existing.total_credit - existing.total_debit) * 100) / 100;
            } else {
                existing.balance = Math.round((existing.total_debit - existing.total_credit) * 100) / 100;
            }

            balanceMap[pid] = existing;
        }

        return balanceMap;
    },

    /**
     * 📋 Get full account statement for a party (sorted by date)
     * Use for كشف حساب المورد / كشف حساب العميل
     */
    async getPartyStatement(
        companyId: string,
        partyType: 'supplier' | 'customer',
        partyId: string,
        filters?: {
            fromDate?: string;
            toDate?: string;
        }
    ): Promise<PartyStatement[]> {
        let query = supabase
            .from('journal_entry_lines')
            .select(`
                id,
                debit,
                credit,
                description,
                entry:journal_entries!inner(
                    id, entry_number, entry_date, status, company_id
                )
            `)
            .eq('party_type', partyType)
            .eq('party_id', partyId);

        const { data, error } = await query;

        if (error) {
            console.error('❌ Error fetching party statement:', error);
            return [];
        }

        // Filter & transform
        const lines = (data || [])
            .filter((row: any) => {
                const entry = row.entry;
                if (!entry || entry.company_id !== companyId || entry.status !== 'posted') return false;
                if (filters?.fromDate && entry.entry_date < filters.fromDate) return false;
                if (filters?.toDate && entry.entry_date > filters.toDate) return false;
                return true;
            })
            .map((row: any) => ({
                id: row.id,
                entry_id: row.entry.id,
                entry_number: row.entry.entry_number,
                entry_date: row.entry.entry_date,
                description: row.description || '',
                debit: Number(row.debit || 0),
                credit: Number(row.credit || 0),
                running_balance: 0,  // calculated below
                status: row.entry.status,
            }))
            .sort((a: PartyStatement, b: PartyStatement) =>
                a.entry_date.localeCompare(b.entry_date) || a.entry_number.localeCompare(b.entry_number)
            );

        // Calculate running balance
        let runningBalance = 0;
        for (const line of lines) {
            if (partyType === 'supplier') {
                runningBalance += line.credit - line.debit;
            } else {
                runningBalance += line.debit - line.credit;
            }
            line.running_balance = Math.round(runningBalance * 100) / 100;
        }

        return lines;
    },

    /**
     * 🔧 Manual fallback for single party balance (no RPC needed)
     */
    async _getPartyBalanceManual(
        companyId: string,
        partyType: 'supplier' | 'customer',
        partyId: string
    ): Promise<PartyBalance> {
        const { data, error } = await supabase
            .from('journal_entry_lines')
            .select(`
                debit,
                credit,
                debit_fc,
                credit_fc,
                currency,
                exchange_rate,
                entry:journal_entries!inner(id, company_id, status, is_posted)
            `)
            .eq('party_type', partyType)
            .eq('party_id', partyId)
            .eq('journal_entries.is_posted', true);

        if (error) {
            console.error('❌ Error in manual balance query:', error);
            return {
                party_id: partyId,
                total_debit: 0,
                total_credit: 0,
                balance: 0,
                transaction_count: 0,
            };
        }

        let totalDebit = 0;
        let totalCredit = 0;
        let txCount = 0;

        for (const row of (data || [])) {
            const entry = row.entry as any;
            if (!entry || entry.company_id !== companyId || !entry.is_posted) continue;

            const debit = Number(row.debit || 0);
            const credit = Number(row.credit || 0);
            const debitFc = row.debit_fc != null ? Number(row.debit_fc) : null;
            const creditFc = row.credit_fc != null ? Number(row.credit_fc) : null;
            const rate = Number(row.exchange_rate || 1);

            const hasValidDebitFc = debitFc != null && (debitFc > 0 || debit === 0);
            const hasValidCreditFc = creditFc != null && (creditFc > 0 || credit === 0);

            totalDebit += hasValidDebitFc ? debitFc! : (rate > 1 ? debit / rate : debit);
            totalCredit += hasValidCreditFc ? creditFc! : (rate > 1 ? credit / rate : credit);
            txCount++;
        }

        const balance = partyType === 'supplier'
            ? totalCredit - totalDebit
            : totalDebit - totalCredit;

        return {
            party_id: partyId,
            total_debit: Math.round(totalDebit * 100) / 100,
            total_credit: Math.round(totalCredit * 100) / 100,
            balance: Math.round(balance * 100) / 100,
            transaction_count: txCount,
        };
    },
};

export default partyBalanceService;
