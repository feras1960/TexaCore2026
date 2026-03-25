/**
 * Recurring Entries Service
 * Service layer for Recurring Journal Entries (القيود المتكررة)
 * Handles: salaries, rent, loans, depreciation, subscriptions, etc.
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

// Frequency types for recurring entries
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Category types
export type RecurringCategory = 'salaries' | 'rent' | 'loan' | 'depreciation' | 'subscription' | 'insurance' | 'other';

// Execution status
export type ExecutionStatus = 'pending' | 'success' | 'failed' | 'skipped' | 'cancelled';

export interface RecurringEntryTemplate {
  id: string;
  tenant_id: string;
  company_id: string;
  template_code: string;
  template_name: string;
  description?: string;
  frequency: RecurringFrequency;
  day_of_week?: number;
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  next_execution_date?: string;
  last_execution_date?: string;
  execution_count: number;
  max_executions?: number;
  total_amount: number;
  currency: string;
  is_active: boolean;
  auto_post: boolean;
  notify_on_creation: boolean;
  category?: RecurringCategory;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  lines?: RecurringEntryLine[];
}

export interface RecurringEntryLine {
  id: string;
  tenant_id: string;
  template_id: string;
  line_number: number;
  account_id: string;
  debit: number;
  credit: number;
  is_percentage: boolean;
  percentage?: number;
  description?: string;
  cost_center_id?: string;
  created_at: string;
  // Joined fields
  account_name?: string;
  account_code?: string;
}

export interface RecurringEntryExecution {
  id: string;
  tenant_id: string;
  template_id: string;
  journal_entry_id?: string;
  execution_date: string;
  scheduled_date: string;
  status: ExecutionStatus;
  error_message?: string;
  executed_by?: string;
  executed_at?: string;
  created_at: string;
  // Joined fields
  template_name?: string;
  entry_number?: string;
}

export interface CreateRecurringTemplateInput {
  company_id: string;
  template_code: string;
  template_name: string;
  description?: string;
  frequency: RecurringFrequency;
  day_of_week?: number;
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  max_executions?: number;
  total_amount: number;
  currency?: string;
  auto_post?: boolean;
  notify_on_creation?: boolean;
  category?: RecurringCategory;
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    is_percentage?: boolean;
    percentage?: number;
    description?: string;
    cost_center_id?: string;
  }[];
}

export interface CreateSimpleTemplateInput {
  company_id: string;
  template_code: string;
  template_name: string;
  description?: string;
  frequency: RecurringFrequency;
  day_of_month?: number;
  start_date: string;
  total_amount: number;
  debit_account_id: string;
  credit_account_id: string;
  category?: RecurringCategory;
  auto_post?: boolean;
}

export const recurringEntriesService = {
  // ═══════════════════════════════════════════════════════════════
  // Templates CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all recurring templates for a company
   */
  async getTemplates(
    companyId: string,
    filters?: {
      isActive?: boolean;
      category?: RecurringCategory;
      search?: string;
    }
  ): Promise<RecurringEntryTemplate[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    let query = supabase
      .from('recurring_entry_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('template_name', { ascending: true });

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(
        `template_code.ilike.%${filters.search}%,template_name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recurring templates:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get template by ID with lines
   */
  async getTemplateById(id: string): Promise<RecurringEntryTemplate | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('recurring_entry_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (templateError) {
      if (templateError.code === 'PGRST116') return null;
      throw templateError;
    }

    if (!template) return null;

    // Get lines with account info
    const { data: lines, error: linesError } = await supabase
      .from('recurring_entry_lines')
      .select(`
        *,
        chart_of_accounts!account_id (
          account_code,
          name_ar,
          name_en
        )
      `)
      .eq('template_id', id)
      .eq('tenant_id', tenantId)
      .order('line_number', { ascending: true });

    if (linesError) throw linesError;

    // Map lines with account names
    const mappedLines = (lines || []).map((line: any) => ({
      ...line,
      account_code: line.chart_of_accounts?.account_code,
      account_name: line.chart_of_accounts?.name_ar || line.chart_of_accounts?.name_en,
    }));

    return {
      ...template,
      lines: mappedLines,
    };
  },

  /**
   * Create a new recurring template with lines
   */
  async createTemplate(input: CreateRecurringTemplateInput): Promise<RecurringEntryTemplate> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    // Validate lines balance
    const totalDebit = input.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('القيد غير متوازن! يجب أن يكون إجمالي المدين يساوي إجمالي الدائن');
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('recurring_entry_templates')
      .insert({
        tenant_id: tenantId,
        company_id: input.company_id,
        template_code: input.template_code,
        template_name: input.template_name,
        description: input.description || null,
        frequency: input.frequency,
        day_of_week: input.day_of_week || null,
        day_of_month: input.day_of_month || null,
        month_of_year: input.month_of_year || null,
        start_date: input.start_date,
        end_date: input.end_date || null,
        next_execution_date: input.start_date,
        max_executions: input.max_executions || null,
        total_amount: input.total_amount,
        currency: input.currency || '',
        auto_post: input.auto_post || false,
        notify_on_creation: input.notify_on_creation ?? true,
        category: input.category || 'other',
        is_active: true,
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Create lines
    const linesData = input.lines.map((line, index) => ({
      tenant_id: tenantId,
      template_id: template.id,
      line_number: index + 1,
      account_id: line.account_id,
      debit: line.debit || 0,
      credit: line.credit || 0,
      is_percentage: line.is_percentage || false,
      percentage: line.percentage || null,
      description: line.description || null,
      cost_center_id: line.cost_center_id || null,
    }));

    const { error: linesError } = await supabase
      .from('recurring_entry_lines')
      .insert(linesData);

    if (linesError) {
      // Rollback template if lines fail
      await supabase.from('recurring_entry_templates').delete().eq('id', template.id);
      throw linesError;
    }

    return template;
  },

  /**
   * Create a simple template (debit/credit only) using database function
   */
  async createSimpleTemplate(input: CreateSimpleTemplateInput): Promise<string> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase.rpc('create_recurring_template', {
      p_tenant_id: tenantId,
      p_company_id: input.company_id,
      p_template_code: input.template_code,
      p_template_name: input.template_name,
      p_frequency: input.frequency,
      p_start_date: input.start_date,
      p_total_amount: input.total_amount,
      p_debit_account_id: input.debit_account_id,
      p_credit_account_id: input.credit_account_id,
      p_day_of_month: input.day_of_month || null,
      p_category: input.category || 'other',
      p_description: input.description || null,
      p_auto_post: input.auto_post || false,
    });

    if (error) throw error;

    return data;
  },

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    updates: Partial<CreateRecurringTemplateInput>
  ): Promise<RecurringEntryTemplate> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.template_name) updateData.template_name = updates.template_name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.frequency) updateData.frequency = updates.frequency;
    if (updates.day_of_week !== undefined) updateData.day_of_week = updates.day_of_week;
    if (updates.day_of_month !== undefined) updateData.day_of_month = updates.day_of_month;
    if (updates.month_of_year !== undefined) updateData.month_of_year = updates.month_of_year;
    if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
    if (updates.max_executions !== undefined) updateData.max_executions = updates.max_executions;
    if (updates.total_amount !== undefined) updateData.total_amount = updates.total_amount;
    if (updates.currency) updateData.currency = updates.currency;
    if (updates.auto_post !== undefined) updateData.auto_post = updates.auto_post;
    if (updates.notify_on_creation !== undefined) updateData.notify_on_creation = updates.notify_on_creation;
    if (updates.category) updateData.category = updates.category;

    const { data, error } = await supabase
      .from('recurring_entry_templates')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Update lines if provided
    if (updates.lines) {
      // Validate balance
      const totalDebit = updates.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = updates.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('القيد غير متوازن!');
      }

      // Delete old lines
      await supabase
        .from('recurring_entry_lines')
        .delete()
        .eq('template_id', id)
        .eq('tenant_id', tenantId);

      // Insert new lines
      const linesData = updates.lines.map((line, index) => ({
        tenant_id: tenantId,
        template_id: id,
        line_number: index + 1,
        account_id: line.account_id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        is_percentage: line.is_percentage || false,
        percentage: line.percentage || null,
        description: line.description || null,
        cost_center_id: line.cost_center_id || null,
      }));

      await supabase.from('recurring_entry_lines').insert(linesData);
    }

    return data;
  },

  /**
   * Toggle template active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { error } = await supabase
      .from('recurring_entry_templates')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    // Delete lines first
    await supabase
      .from('recurring_entry_lines')
      .delete()
      .eq('template_id', id)
      .eq('tenant_id', tenantId);

    // Delete template
    const { error } = await supabase
      .from('recurring_entry_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  // ═══════════════════════════════════════════════════════════════
  // Execution Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get pending templates (due for execution)
   */
  async getPendingTemplates(
    companyId: string,
    asOfDate?: string
  ): Promise<RecurringEntryTemplate[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const targetDate = asOfDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('recurring_entry_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .lte('next_execution_date', targetDate)
      .order('next_execution_date', { ascending: true });

    if (error) throw error;

    return data || [];
  },

  /**
   * Generate recurring entries using database function
   */
  async generateEntries(
    companyId?: string,
    asOfDate?: string,
    userId?: string
  ): Promise<number> {
    const { data, error } = await supabase.rpc('generate_recurring_entries', {
      p_company_id: companyId || null,
      p_as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      p_user_id: userId || null,
    });

    if (error) throw error;

    return data || 0;
  },

  /**
   * Get execution history for a template
   */
  async getExecutions(
    templateId: string,
    filters?: {
      status?: ExecutionStatus;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    }
  ): Promise<RecurringEntryExecution[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    let query = supabase
      .from('recurring_entry_executions')
      .select(`
        *,
        journal_entries (
          entry_number
        )
      `)
      .eq('template_id', templateId)
      .eq('tenant_id', tenantId)
      .order('execution_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.fromDate) {
      query = query.gte('execution_date', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.lte('execution_date', filters.toDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((exec: any) => ({
      ...exec,
      entry_number: exec.journal_entries?.entry_number,
    }));
  },

  /**
   * Get all recent executions for a company
   */
  async getRecentExecutions(
    companyId: string,
    limit: number = 20
  ): Promise<RecurringEntryExecution[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    const { data, error } = await supabase
      .from('recurring_entry_executions')
      .select(`
        *,
        recurring_entry_templates!template_id (
          template_name,
          company_id
        ),
        journal_entries (
          entry_number
        )
      `)
      .eq('tenant_id', tenantId)
      .order('execution_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Filter by company
    return (data || [])
      .filter((exec: any) => exec.recurring_entry_templates?.company_id === companyId)
      .map((exec: any) => ({
        ...exec,
        template_name: exec.recurring_entry_templates?.template_name,
        entry_number: exec.journal_entries?.entry_number,
      }));
  },

  // ═══════════════════════════════════════════════════════════════
  // Statistics & Reports
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get templates statistics
   */
  async getStatistics(companyId: string): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    pendingExecutions: number;
    totalExecutions: number;
    byCategory: { category: string; count: number }[];
  }> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) throw new Error('No tenant ID available');

    // Get all templates
    const { data: templates } = await supabase
      .from('recurring_entry_templates')
      .select('id, is_active, category, next_execution_date')
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId);

    const today = new Date().toISOString().split('T')[0];

    const totalTemplates = templates?.length || 0;
    const activeTemplates = templates?.filter(t => t.is_active).length || 0;
    const pendingExecutions = templates?.filter(
      t => t.is_active && t.next_execution_date && t.next_execution_date <= today
    ).length || 0;

    // Get total executions
    const { count: totalExecutions } = await supabase
      .from('recurring_entry_executions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('template_id', templates?.map(t => t.id) || []);

    // Count by category
    const categoryCount: Record<string, number> = {};
    templates?.forEach(t => {
      const cat = t.category || 'other';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const byCategory = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      totalTemplates,
      activeTemplates,
      pendingExecutions,
      totalExecutions: totalExecutions || 0,
      byCategory,
    };
  },
};

export default recurringEntriesService;
