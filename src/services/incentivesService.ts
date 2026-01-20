/**
 * Incentives & Commissions Service
 * Service layer for Employee Incentives and Commissions (نظام الحوافز والعمولات)
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

// Plan types
export type PlanType = 'commission' | 'bonus' | 'tiered' | 'mixed';
export type TargetType = 'sales' | 'collections' | 'new_customers' | 'profit' | 'mixed';
export type CalculationMethod = 'percentage' | 'fixed_per_unit' | 'tiered' | 'slab';
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type CommissionStatus = 'calculated' | 'approved' | 'paid' | 'cancelled';
export type TargetStatus = 'active' | 'achieved' | 'partial' | 'failed' | 'cancelled';

// ═══════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════

export interface IncentivePlan {
  id: string;
  tenant_id: string;
  company_id: string;
  plan_code: string;
  plan_name: string;
  description?: string;
  plan_type: PlanType;
  target_type: TargetType;
  calculation_method: CalculationMethod;
  base_rate: number;
  min_threshold: number;
  max_cap?: number;
  period_type: PeriodType;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  include_returns: boolean;
  include_discounts: boolean;
  min_collection_percent?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed
  tiers?: IncentivePlanTier[];
  assignments_count?: number;
}

export interface IncentivePlanTier {
  id: string;
  tenant_id: string;
  plan_id: string;
  tier_number: number;
  from_amount: number;
  to_amount?: number;
  rate: number;
  rate_type: 'percentage' | 'fixed';
  bonus_amount: number;
  created_at: string;
}

export interface EmployeeAssignment {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_id: string;
  plan_id: string;
  custom_rate?: number;
  custom_cap?: number;
  target_amount?: number;
  target_units?: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  plan_name?: string;
  plan_code?: string;
}

export interface EmployeeCommission {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_id: string;
  assignment_id?: string;
  plan_id?: string;
  period_start: string;
  period_end: string;
  source_type: string;
  source_id?: string;
  source_number?: string;
  base_amount: number;
  rate_applied?: number;
  commission_amount: number;
  tier_number?: number;
  bonus_amount: number;
  adjustment_amount: number;
  adjustment_reason?: string;
  net_amount: number;
  status: CommissionStatus;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  payment_reference?: string;
  journal_entry_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeTarget {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_id: string;
  target_type: string;
  period_type: PeriodType;
  period_year: number;
  period_month?: number;
  period_quarter?: number;
  target_amount?: number;
  target_units?: number;
  target_count?: number;
  achieved_amount: number;
  achieved_units: number;
  achieved_count: number;
  achievement_percentage: number;
  bonus_on_achievement: number;
  bonus_on_exceed: number;
  status: TargetStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  company_id: string;
  plan_code: string;
  plan_name: string;
  description?: string;
  plan_type: PlanType;
  target_type: TargetType;
  calculation_method: CalculationMethod;
  base_rate: number;
  min_threshold?: number;
  max_cap?: number;
  period_type?: PeriodType;
  effective_from: string;
  effective_to?: string;
  include_returns?: boolean;
  include_discounts?: boolean;
  min_collection_percent?: number;
  tiers?: {
    tier_number: number;
    from_amount: number;
    to_amount?: number;
    rate: number;
    rate_type?: 'percentage' | 'fixed';
    bonus_amount?: number;
  }[];
}

export interface CreateAssignmentInput {
  company_id: string;
  employee_id: string;
  plan_id: string;
  custom_rate?: number;
  custom_cap?: number;
  target_amount?: number;
  target_units?: number;
  start_date: string;
  end_date?: string;
}

export interface CreateTargetInput {
  company_id: string;
  employee_id: string;
  target_type: string;
  period_type: PeriodType;
  period_year: number;
  period_month?: number;
  period_quarter?: number;
  target_amount?: number;
  target_units?: number;
  target_count?: number;
  bonus_on_achievement?: number;
  bonus_on_exceed?: number;
}

export interface CommissionReportItem {
  employee_id: string;
  employee_name: string;
  total_sales: number;
  total_commission: number;
  total_bonus: number;
  net_commission: number;
  invoice_count: number;
  avg_commission_rate: number;
  status_summary: {
    calculated: number;
    approved: number;
    paid: number;
    cancelled: number;
  };
}

export interface TargetReportItem {
  employee_id: string;
  target_type: string;
  target_amount: number;
  achieved_amount: number;
  achievement_percentage: number;
  remaining_amount: number;
  bonus_earned: number;
  status: TargetStatus;
}

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

export const incentivesService = {
  // ═══════════════════════════════════════════════════════════════
  // Incentive Plans
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all incentive plans for a company
   */
  async getPlans(
    companyId: string,
    filters?: {
      isActive?: boolean;
      planType?: PlanType;
      search?: string;
    }
  ): Promise<IncentivePlan[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    let query = supabase
      .from('incentive_plans')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('plan_name', { ascending: true });

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.planType) {
      query = query.eq('plan_type', filters.planType);
    }

    if (filters?.search) {
      query = query.or(
        `plan_code.ilike.%${filters.search}%,plan_name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  /**
   * Get plan by ID with tiers
   */
  async getPlanById(id: string): Promise<IncentivePlan | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data: plan, error: planError } = await supabase
      .from('incentive_plans')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (planError) {
      if (planError.code === 'PGRST116') return null;
      throw planError;
    }

    if (!plan) return null;

    // Get tiers if tiered plan
    if (plan.calculation_method === 'tiered' || plan.calculation_method === 'slab') {
      const { data: tiers } = await supabase
        .from('incentive_plan_tiers')
        .select('*')
        .eq('plan_id', id)
        .order('tier_number', { ascending: true });

      plan.tiers = tiers || [];
    }

    return plan;
  },

  /**
   * Create a new incentive plan
   */
  async createPlan(input: CreatePlanInput): Promise<IncentivePlan> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data: plan, error: planError } = await supabase
      .from('incentive_plans')
      .insert({
        tenant_id: tenantId,
        company_id: input.company_id,
        plan_code: input.plan_code,
        plan_name: input.plan_name,
        description: input.description || null,
        plan_type: input.plan_type,
        target_type: input.target_type,
        calculation_method: input.calculation_method,
        base_rate: input.base_rate,
        min_threshold: input.min_threshold || 0,
        max_cap: input.max_cap || null,
        period_type: input.period_type || 'monthly',
        effective_from: input.effective_from,
        effective_to: input.effective_to || null,
        include_returns: input.include_returns || false,
        include_discounts: input.include_discounts ?? true,
        min_collection_percent: input.min_collection_percent || null,
        is_active: true,
      })
      .select()
      .single();

    if (planError) throw planError;

    // Create tiers if provided
    if (input.tiers && input.tiers.length > 0) {
      const tiersData = input.tiers.map((tier) => ({
        tenant_id: tenantId,
        plan_id: plan.id,
        tier_number: tier.tier_number,
        from_amount: tier.from_amount,
        to_amount: tier.to_amount || null,
        rate: tier.rate,
        rate_type: tier.rate_type || 'percentage',
        bonus_amount: tier.bonus_amount || 0,
      }));

      await supabase.from('incentive_plan_tiers').insert(tiersData);
    }

    return plan;
  },

  /**
   * Update plan
   */
  async updatePlan(id: string, updates: Partial<CreatePlanInput>): Promise<IncentivePlan> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase
      .from('incentive_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Update tiers if provided
    if (updates.tiers) {
      await supabase.from('incentive_plan_tiers').delete().eq('plan_id', id);

      if (updates.tiers.length > 0) {
        const tiersData = updates.tiers.map((tier) => ({
          tenant_id: tenantId,
          plan_id: id,
          tier_number: tier.tier_number,
          from_amount: tier.from_amount,
          to_amount: tier.to_amount || null,
          rate: tier.rate,
          rate_type: tier.rate_type || 'percentage',
          bonus_amount: tier.bonus_amount || 0,
        }));

        await supabase.from('incentive_plan_tiers').insert(tiersData);
      }
    }

    return data;
  },

  /**
   * Toggle plan active status
   */
  async togglePlanActive(id: string, isActive: boolean): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { error } = await supabase
      .from('incentive_plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  /**
   * Delete plan
   */
  async deletePlan(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    await supabase.from('incentive_plan_tiers').delete().eq('plan_id', id);

    const { error } = await supabase
      .from('incentive_plans')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  // ═══════════════════════════════════════════════════════════════
  // Employee Assignments
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get assignments for an employee
   */
  async getEmployeeAssignments(
    companyId: string,
    employeeId?: string
  ): Promise<EmployeeAssignment[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    let query = supabase
      .from('employee_incentive_assignments')
      .select(`
        *,
        incentive_plans (
          plan_name,
          plan_code
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('start_date', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((a: any) => ({
      ...a,
      plan_name: a.incentive_plans?.plan_name,
      plan_code: a.incentive_plans?.plan_code,
    }));
  },

  /**
   * Create assignment
   */
  async createAssignment(input: CreateAssignmentInput): Promise<EmployeeAssignment> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase
      .from('employee_incentive_assignments')
      .insert({
        tenant_id: tenantId,
        company_id: input.company_id,
        employee_id: input.employee_id,
        plan_id: input.plan_id,
        custom_rate: input.custom_rate || null,
        custom_cap: input.custom_cap || null,
        target_amount: input.target_amount || null,
        target_units: input.target_units || null,
        start_date: input.start_date,
        end_date: input.end_date || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Update assignment
   */
  async updateAssignment(
    id: string,
    updates: Partial<CreateAssignmentInput>
  ): Promise<EmployeeAssignment> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase
      .from('employee_incentive_assignments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * End assignment
   */
  async endAssignment(id: string, endDate: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { error } = await supabase
      .from('employee_incentive_assignments')
      .update({
        end_date: endDate,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  // ═══════════════════════════════════════════════════════════════
  // Commissions
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get commissions
   */
  async getCommissions(
    companyId: string,
    filters?: {
      employeeId?: string;
      status?: CommissionStatus;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<EmployeeCommission[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    let query = supabase
      .from('employee_commissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('period_start', { ascending: false });

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.fromDate) {
      query = query.gte('period_start', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.lte('period_end', filters.toDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  /**
   * Calculate commission for an invoice
   */
  async calculateCommission(
    invoiceId: string,
    employeeId?: string
  ): Promise<{ commission_amount: number; rate_applied: number }[]> {
    const { data, error } = await supabase.rpc('calculate_sales_commission', {
      p_invoice_id: invoiceId,
      p_employee_id: employeeId || null,
    });

    if (error) throw error;

    return data || [];
  },

  /**
   * Approve commission
   */
  async approveCommission(id: string, userId: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { error } = await supabase
      .from('employee_commissions')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  /**
   * Mark commission as paid
   */
  async markCommissionPaid(id: string, paymentReference?: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { error } = await supabase
      .from('employee_commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: paymentReference || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  /**
   * Add commission adjustment
   */
  async adjustCommission(
    id: string,
    adjustmentAmount: number,
    reason: string
  ): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    // Get current commission
    const { data: current } = await supabase
      .from('employee_commissions')
      .select('commission_amount, bonus_amount, adjustment_amount')
      .eq('id', id)
      .single();

    if (!current) throw new Error('Commission not found');

    const newNetAmount =
      current.commission_amount +
      current.bonus_amount +
      (current.adjustment_amount || 0) +
      adjustmentAmount;

    const { error } = await supabase
      .from('employee_commissions')
      .update({
        adjustment_amount: (current.adjustment_amount || 0) + adjustmentAmount,
        adjustment_reason: reason,
        net_amount: newNetAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  // ═══════════════════════════════════════════════════════════════
  // Targets
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get targets
   */
  async getTargets(
    companyId: string,
    filters?: {
      employeeId?: string;
      periodYear?: number;
      periodMonth?: number;
      status?: TargetStatus;
    }
  ): Promise<EmployeeTarget[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    let query = supabase
      .from('employee_targets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    if (filters?.periodYear) {
      query = query.eq('period_year', filters.periodYear);
    }

    if (filters?.periodMonth) {
      query = query.eq('period_month', filters.periodMonth);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  /**
   * Create target
   */
  async createTarget(input: CreateTargetInput): Promise<EmployeeTarget> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase
      .from('employee_targets')
      .insert({
        tenant_id: tenantId,
        company_id: input.company_id,
        employee_id: input.employee_id,
        target_type: input.target_type,
        period_type: input.period_type,
        period_year: input.period_year,
        period_month: input.period_month || null,
        period_quarter: input.period_quarter || null,
        target_amount: input.target_amount || null,
        target_units: input.target_units || null,
        target_count: input.target_count || null,
        bonus_on_achievement: input.bonus_on_achievement || 0,
        bonus_on_exceed: input.bonus_on_exceed || 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Create monthly targets for all employees
   */
  async createMonthlyTargets(
    companyId: string,
    year: number,
    month: number,
    copyFromPrevious: boolean = true
  ): Promise<number> {
    const { data, error } = await supabase.rpc('create_monthly_targets', {
      p_company_id: companyId,
      p_year: year,
      p_month: month,
      p_copy_from_previous: copyFromPrevious,
    });

    if (error) throw error;

    return data || 0;
  },

  /**
   * Update target
   */
  async updateTarget(id: string, updates: Partial<CreateTargetInput>): Promise<EmployeeTarget> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase
      .from('employee_targets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  // ═══════════════════════════════════════════════════════════════
  // Reports
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get commission report
   */
  async getCommissionReport(
    companyId: string,
    fromDate: string,
    toDate: string,
    employeeId?: string
  ): Promise<CommissionReportItem[]> {
    const { data, error } = await supabase.rpc('get_employee_commission_report', {
      p_company_id: companyId,
      p_from_date: fromDate,
      p_to_date: toDate,
      p_employee_id: employeeId || null,
    });

    if (error) throw error;

    return data || [];
  },

  /**
   * Get target achievement report
   */
  async getTargetReport(
    companyId: string,
    year: number,
    month?: number,
    employeeId?: string
  ): Promise<TargetReportItem[]> {
    const { data, error } = await supabase.rpc('get_target_achievement_report', {
      p_company_id: companyId,
      p_period_year: year,
      p_period_month: month || null,
      p_employee_id: employeeId || null,
    });

    if (error) throw error;

    return data || [];
  },

  /**
   * Get statistics summary
   */
  async getStatistics(companyId: string): Promise<{
    activePlans: number;
    activeAssignments: number;
    pendingCommissions: number;
    totalPaidThisMonth: number;
    activeTargets: number;
    achievedTargets: number;
  }> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    // Active plans
    const { count: activePlans } = await supabase
      .from('incentive_plans')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true);

    // Active assignments
    const { count: activeAssignments } = await supabase
      .from('employee_incentive_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true);

    // Pending commissions
    const { count: pendingCommissions } = await supabase
      .from('employee_commissions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['calculated', 'approved']);

    // Total paid this month
    const { data: paidData } = await supabase
      .from('employee_commissions')
      .select('net_amount')
      .eq('company_id', companyId)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth)
      .lte('paid_at', endOfMonth);

    const totalPaidThisMonth = paidData?.reduce((sum, c) => sum + (c.net_amount || 0), 0) || 0;

    // Targets
    const { data: targets } = await supabase
      .from('employee_targets')
      .select('status')
      .eq('company_id', companyId)
      .eq('period_year', today.getFullYear())
      .eq('period_month', today.getMonth() + 1);

    const activeTargets = targets?.filter((t) => t.status === 'active').length || 0;
    const achievedTargets = targets?.filter((t) => t.status === 'achieved').length || 0;

    return {
      activePlans: activePlans || 0,
      activeAssignments: activeAssignments || 0,
      pendingCommissions: pendingCommissions || 0,
      totalPaidThisMonth,
      activeTargets,
      achievedTargets,
    };
  },
};

export default incentivesService;
