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
    total_debit: number;
    total_credit: number;
    balance: number;  // credit - debit for suppliers, debit - credit for customers
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
    ): Promise<Map<string, PartyBalance>> {
        // ⚡ Try fast RPC first (server-side aggregation)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_party_balances_bulk', {
            p_company_id: companyId,
            p_party_type: partyType,
        });

        if (!rpcError && rpcData) {
            const balanceMap = new Map<string, PartyBalance>();
            for (const row of rpcData) {
                balanceMap.set(row.party_id, {
                    party_id: row.party_id,
                    total_debit: Number(row.total_debit || 0),
                    total_credit: Number(row.total_credit || 0),
                    balance: Number(row.balance || 0),
                    transaction_count: Number(row.transaction_count || 0),
                    last_transaction_date: row.last_transaction_date || undefined,
                });
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
    ): Promise<Map<string, PartyBalance>> {
        const { data, error } = await supabase
            .from('journal_entry_lines')
            .select(`
                party_id,
                debit,
                credit,
                entry:journal_entries!inner(id, company_id, status, is_posted)
            `)
            .eq('party_type', partyType)
            .not('party_id', 'is', null)
            .eq('journal_entries.is_posted', true);   // ⚠️ فلتر DB مباشر — فقط المرحّلة

        if (error) {
            console.error('❌ Error fetching party balances:', error);
            return new Map();
        }

        const balanceMap = new Map<string, PartyBalance>();

        for (const row of (data || [])) {
            const entry = row.entry as any;
            // Double protection: DB filter + JS filter
            if (!entry || entry.company_id !== companyId || !entry.is_posted) continue;

            const pid = row.party_id;
            if (!pid) continue;

            const existing = balanceMap.get(pid) || {
                party_id: pid,
                total_debit: 0,
                total_credit: 0,
                balance: 0,
                transaction_count: 0,
            };

            existing.total_debit += Number(row.debit || 0);
            existing.total_credit += Number(row.credit || 0);
            existing.transaction_count++;

            if (partyType === 'supplier') {
                existing.balance = existing.total_credit - existing.total_debit;
            } else {
                existing.balance = existing.total_debit - existing.total_credit;
            }

            balanceMap.set(pid, existing);
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
                entry:journal_entries!inner(id, company_id, status, is_posted)
            `)
            .eq('party_type', partyType)
            .eq('party_id', partyId)
            .eq('journal_entries.is_posted', true);  // ⚠️ فلتر DB مباشر — فقط المرحّلة

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
            // Double protection: DB filter + JS filter
            if (!entry || entry.company_id !== companyId || !entry.is_posted) continue;
            totalDebit += Number(row.debit || 0);
            totalCredit += Number(row.credit || 0);
            txCount++;
        }

        const balance = partyType === 'supplier'
            ? totalCredit - totalDebit    // positive = we owe them
            : totalDebit - totalCredit;   // positive = they owe us

        return {
            party_id: partyId,
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: Math.round(balance * 100) / 100,
            transaction_count: txCount,
        };
    },
};

export default partyBalanceService;
