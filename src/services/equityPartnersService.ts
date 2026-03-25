/**
 * Equity Partners Service
 * خدمة إدارة شركاء حقوق الملكية
 * - CRUD للشركاء
 * - التحقق من توازن النسب (100%)
 * - حركات الشركاء
 * - توزيع الأرباح
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface EquityPartner {
    id: string;
    tenant_id: string;
    company_id: string;
    partner_number: string;
    name_ar: string;
    name_en?: string;
    phone?: string;
    email?: string;
    national_id?: string;
    address?: string;
    share_percentage: number;
    capital_amount: number;
    join_date: string;
    has_salary: boolean;
    monthly_salary: number;
    salary_currency: string;
    job_title?: string;
    capital_account_id?: string;
    current_account_id?: string;
    salary_account_id?: string;
    status: 'active' | 'inactive' | 'withdrawn';
    notes?: string;
    custom_fields?: Record<string, any>;
    created_by?: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    capital_balance?: number;
    current_balance?: number;
}

export interface CreatePartnerInput {
    company_id: string;
    partner_number: string;
    name_ar: string;
    name_en?: string;
    phone?: string;
    email?: string;
    national_id?: string;
    address?: string;
    share_percentage: number;
    capital_amount: number;
    join_date?: string;
    has_salary?: boolean;
    monthly_salary?: number;
    salary_currency?: string;
    job_title?: string;
    notes?: string;
}

export interface PartnerTransaction {
    id: string;
    tenant_id: string;
    company_id: string;
    partner_id: string;
    transaction_type: 'capital_deposit' | 'capital_withdrawal' | 'withdrawal' | 'deposit' | 'profit_distribution' | 'salary';
    amount: number;
    currency: string;
    description?: string;
    journal_entry_id?: string;
    transaction_date: string;
    created_by?: string;
    created_at: string;
}

export interface ProfitDistribution {
    id: string;
    tenant_id: string;
    company_id: string;
    period_start: string;
    period_end: string;
    total_profit: number;
    journal_entry_id?: string;
    status: 'draft' | 'confirmed' | 'posted' | 'cancelled';
    created_by?: string;
    created_at: string;
    lines?: ProfitDistributionLine[];
}

export interface ProfitDistributionLine {
    id: string;
    distribution_id: string;
    partner_id: string;
    share_percentage: number;
    profit_amount: number;
    partner?: EquityPartner;
}

// ═══════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════

export const equityPartnersService = {

    // ─────────────────────────────────────────────
    // CRUD الشركاء
    // ─────────────────────────────────────────────

    /** جلب كل الشركاء لشركة معينة */
    async getAll(companyId: string): Promise<EquityPartner[]> {
        const { data, error } = await supabase
            .from('equity_partners')
            .select('*')
            .eq('company_id', companyId)
            .order('partner_number');

        if (error) throw error;
        return data || [];
    },

    /** جلب الشركاء مع أرصدة الحسابات */
    async getAllWithBalances(companyId: string): Promise<EquityPartner[]> {
        const { data, error } = await supabase
            .from('equity_partners')
            .select(`
        *,
        capital_account:chart_of_accounts!capital_account_id(current_balance),
        current_account:chart_of_accounts!current_account_id(current_balance)
      `)
            .eq('company_id', companyId)
            .order('partner_number');

        if (error) throw error;

        return (data || []).map((p: any) => ({
            ...p,
            capital_balance: p.capital_account?.current_balance || 0,
            current_balance: p.current_account?.current_balance || 0,
        }));
    },

    /** جلب شريك بالمعرف */
    async getById(id: string): Promise<EquityPartner | null> {
        const { data, error } = await supabase
            .from('equity_partners')
            .select(`
        *,
        capital_account:chart_of_accounts!capital_account_id(current_balance),
        current_account:chart_of_accounts!current_account_id(current_balance)
      `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return {
            ...data,
            capital_balance: (data as any).capital_account?.current_balance || 0,
            current_balance: (data as any).current_account?.current_balance || 0,
        };
    },

    /** إنشاء شريك جديد */
    async create(input: CreatePartnerInput): Promise<EquityPartner> {
        // التحقق من النسب قبل الإضافة
        const validation = await this.validateSharePercentage(
            input.company_id,
            input.share_percentage
        );
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        const { data, error } = await supabase
            .from('equity_partners')
            .insert(input)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /** تحديث بيانات شريك */
    async update(id: string, updates: Partial<CreatePartnerInput>): Promise<EquityPartner> {
        // إذا تم تغيير النسبة — تحقق من التوازن
        if (updates.share_percentage !== undefined) {
            const partner = await this.getById(id);
            if (!partner) throw new Error('الشريك غير موجود');

            const validation = await this.validateSharePercentage(
                partner.company_id,
                updates.share_percentage,
                id
            );
            if (!validation.valid) {
                throw new Error(validation.message);
            }
        }

        const { data, error } = await supabase
            .from('equity_partners')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /** حذف شريك */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('equity_partners')
            .update({ status: 'withdrawn' })
            .eq('id', id);

        if (error) throw error;
    },

    // ─────────────────────────────────────────────
    // التحقق من النسب
    // ─────────────────────────────────────────────

    /** التحقق من أن مجموع النسب لا يتجاوز 100% */
    async validateSharePercentage(
        companyId: string,
        newPercentage: number,
        excludePartnerId?: string
    ): Promise<{ valid: boolean; message: string; totalUsed: number }> {
        const { data, error } = await supabase
            .from('equity_partners')
            .select('id, share_percentage')
            .eq('company_id', companyId)
            .in('status', ['active']);

        if (error) throw error;

        const totalUsed = (data || [])
            .filter(p => p.id !== excludePartnerId)
            .reduce((sum, p) => sum + Number(p.share_percentage), 0);

        const totalAfter = totalUsed + newPercentage;

        if (totalAfter > 100) {
            return {
                valid: false,
                message: `المجموع سيصبح ${totalAfter}% — المتبقي ${(100 - totalUsed).toFixed(2)}% فقط`,
                totalUsed,
            };
        }

        return {
            valid: true,
            message: totalAfter === 100 ? 'النسب متوازنة ✅' : `المجموع ${totalAfter}% — متبقي ${(100 - totalAfter).toFixed(2)}%`,
            totalUsed,
        };
    },

    /** الحصول على ملخص النسب */
    async getShareSummary(companyId: string): Promise<{
        totalPercentage: number;
        remaining: number;
        isBalanced: boolean;
        partnerCount: number;
    }> {
        const { data, error } = await supabase
            .from('equity_partners')
            .select('share_percentage')
            .eq('company_id', companyId)
            .eq('status', 'active');

        if (error) throw error;

        const totalPercentage = (data || []).reduce((sum, p) => sum + Number(p.share_percentage), 0);

        return {
            totalPercentage,
            remaining: 100 - totalPercentage,
            isBalanced: Math.abs(totalPercentage - 100) < 0.01,
            partnerCount: (data || []).length,
        };
    },

    // ─────────────────────────────────────────────
    // حركات الشركاء
    // ─────────────────────────────────────────────

    /** جلب حركات شريك معين */
    async getTransactions(partnerId: string): Promise<PartnerTransaction[]> {
        const { data, error } = await supabase
            .from('equity_partner_transactions')
            .select('*')
            .eq('partner_id', partnerId)
            .order('transaction_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /** إنشاء حركة للشريك */
    async createTransaction(input: {
        company_id: string;
        partner_id: string;
        transaction_type: PartnerTransaction['transaction_type'];
        amount: number;
        currency?: string;
        description?: string;
        journal_entry_id?: string;
        transaction_date?: string;
    }): Promise<PartnerTransaction> {
        const { data, error } = await supabase
            .from('equity_partner_transactions')
            .insert(input)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ─────────────────────────────────────────────
    // توزيع الأرباح
    // ─────────────────────────────────────────────

    /** جلب توزيعات أرباح شركة */
    async getProfitDistributions(companyId: string): Promise<ProfitDistribution[]> {
        const { data, error } = await supabase
            .from('equity_profit_distributions')
            .select(`
        *,
        lines:equity_profit_distribution_lines(
          *,
          partner:equity_partners(name_ar, name_en, partner_number)
        )
      `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /** إنشاء توزيع أرباح (مسودة) */
    async createProfitDistribution(input: {
        company_id: string;
        period_start: string;
        period_end: string;
        total_profit: number;
    }): Promise<ProfitDistribution> {
        // 1. إنشاء رأس التوزيع
        const { data: dist, error: distError } = await supabase
            .from('equity_profit_distributions')
            .insert({
                ...input,
                status: 'draft',
            })
            .select()
            .single();

        if (distError) throw distError;

        // 2. جلب الشركاء النشطين
        const partners = await this.getAll(input.company_id);
        const activePartners = partners.filter(p => p.status === 'active');

        // 3. إنشاء سطور التوزيع
        const lines = activePartners.map(p => ({
            distribution_id: dist.id,
            company_id: input.company_id,
            partner_id: p.id,
            share_percentage: p.share_percentage,
            profit_amount: (input.total_profit * p.share_percentage) / 100,
        }));

        if (lines.length > 0) {
            const { error: linesError } = await supabase
                .from('equity_profit_distribution_lines')
                .insert(lines);

            if (linesError) throw linesError;
        }

        return dist;
    },

    // ─────────────────────────────────────────────
    // إحصائيات الشركاء
    // ─────────────────────────────────────────────

    /** الإحصائيات الإجمالية */
    async getStats(companyId: string): Promise<{
        totalPartners: number;
        totalCapital: number;
        totalCurrentBalance: number;
        totalSalaries: number;
        isBalanced: boolean;
        totalPercentage: number;
    }> {
        const partners = await this.getAllWithBalances(companyId);
        const active = partners.filter(p => p.status === 'active');

        return {
            totalPartners: active.length,
            totalCapital: active.reduce((sum, p) => sum + Number(p.capital_amount), 0),
            totalCurrentBalance: active.reduce((sum, p) => sum + Number(p.current_balance || 0), 0),
            totalSalaries: active.filter(p => p.has_salary).reduce((sum, p) => sum + Number(p.monthly_salary), 0),
            isBalanced: Math.abs(active.reduce((sum, p) => sum + Number(p.share_percentage), 0) - 100) < 0.01,
            totalPercentage: active.reduce((sum, p) => sum + Number(p.share_percentage), 0),
        };
    },
};

export default equityPartnersService;
