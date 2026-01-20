/**
 * Status Service
 * خدمة إدارة الحالات المخصصة
 */

import { supabase } from '@/lib/supabase';

// Types
export interface StatusGroup {
  id: string;
  tenant_id: string | null;
  doc_type: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomStatus {
  id: string;
  tenant_id: string | null;
  group_id: string;
  doc_type: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  is_initial: boolean;
  is_final: boolean;
  time_norm_hours: number | null;
  can_view_roles: string[];
  can_set_roles: string[];
  auto_actions: any[];
  created_at: string;
  updated_at: string;
  // Joined data
  group?: StatusGroup;
}

export interface StatusHistory {
  id: string;
  tenant_id: string;
  doc_type: string;
  doc_id: string;
  from_status_id: string | null;
  to_status_id: string;
  changed_by: string;
  comment: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined data
  from_status?: CustomStatus;
  to_status?: CustomStatus;
  user?: { full_name: string; avatar_url: string };
}

export interface StatusTransition {
  id: string;
  tenant_id: string;
  doc_type: string;
  from_status_id: string;
  to_status_id: string;
  allowed_roles: string[];
  requires_comment: boolean;
  requires_approval: boolean;
  approval_roles: string[];
  created_at: string;
}

// Status colors mapping
export const STATUS_COLORS = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', dark: 'dark:bg-gray-800 dark:text-gray-300' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', dark: 'dark:bg-blue-900/30 dark:text-blue-400' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dark: 'dark:bg-green-900/30 dark:text-green-400' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dark: 'dark:bg-red-900/30 dark:text-red-400' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dark: 'dark:bg-yellow-900/30 dark:text-yellow-400' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dark: 'dark:bg-orange-900/30 dark:text-orange-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', dark: 'dark:bg-purple-900/30 dark:text-purple-400' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', dark: 'dark:bg-pink-900/30 dark:text-pink-400' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', dark: 'dark:bg-indigo-900/30 dark:text-indigo-400' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', dark: 'dark:bg-teal-900/30 dark:text-teal-400' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300', dark: 'dark:bg-cyan-900/30 dark:text-cyan-400' },
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;

// Service class
class StatusService {
  // ==================== STATUS GROUPS ====================

  async getStatusGroups(docType: string, tenantId?: string): Promise<StatusGroup[]> {
    let query = supabase
      .from('status_groups')
      .select('*')
      .eq('doc_type', docType)
      .order('sort_order');

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createStatusGroup(group: Partial<StatusGroup>): Promise<StatusGroup> {
    const { data, error } = await supabase
      .from('status_groups')
      .insert(group)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStatusGroup(id: string, updates: Partial<StatusGroup>): Promise<StatusGroup> {
    const { data, error } = await supabase
      .from('status_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStatusGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('status_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== CUSTOM STATUSES ====================

  async getStatuses(docType: string, tenantId?: string): Promise<CustomStatus[]> {
    let query = supabase
      .from('custom_statuses')
      .select(`
        *,
        group:status_groups(*)
      `)
      .eq('doc_type', docType)
      .order('sort_order');

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getStatusById(id: string): Promise<CustomStatus | null> {
    const { data, error } = await supabase
      .from('custom_statuses')
      .select(`
        *,
        group:status_groups(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getStatusByCode(docType: string, code: string, tenantId?: string): Promise<CustomStatus | null> {
    let query = supabase
      .from('custom_statuses')
      .select(`
        *,
        group:status_groups(*)
      `)
      .eq('doc_type', docType)
      .eq('code', code);

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createStatus(status: Partial<CustomStatus>): Promise<CustomStatus> {
    const { data, error } = await supabase
      .from('custom_statuses')
      .insert(status)
      .select(`
        *,
        group:status_groups(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, updates: Partial<CustomStatus>): Promise<CustomStatus> {
    const { data, error } = await supabase
      .from('custom_statuses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        group:status_groups(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStatus(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_statuses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async reorderStatuses(docType: string, statusIds: string[]): Promise<void> {
    const updates = statusIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('custom_statuses')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);

      if (error) throw error;
    }
  }

  // ==================== STATUS HISTORY ====================

  async getStatusHistory(docType: string, docId: string): Promise<StatusHistory[]> {
    const { data, error } = await supabase
      .from('status_history')
      .select(`
        *,
        from_status:custom_statuses!status_history_from_status_id_fkey(*),
        to_status:custom_statuses!status_history_to_status_id_fkey(*)
      `)
      .eq('doc_type', docType)
      .eq('doc_id', docId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async changeStatus(
    tenantId: string,
    docType: string,
    docId: string,
    newStatusId: string,
    comment?: string,
    metadata?: Record<string, any>
  ): Promise<StatusHistory> {
    // Get current status from history
    const { data: lastHistory } = await supabase
      .from('status_history')
      .select('to_status_id')
      .eq('doc_type', docType)
      .eq('doc_id', docId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const fromStatusId = lastHistory?.to_status_id || null;

    const { data, error } = await supabase
      .from('status_history')
      .insert({
        tenant_id: tenantId,
        doc_type: docType,
        doc_id: docId,
        from_status_id: fromStatusId,
        to_status_id: newStatusId,
        comment,
        metadata: metadata || {},
      })
      .select(`
        *,
        from_status:custom_statuses!status_history_from_status_id_fkey(*),
        to_status:custom_statuses!status_history_to_status_id_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== STATUS TRANSITIONS ====================

  async getTransitions(docType: string, tenantId?: string): Promise<StatusTransition[]> {
    let query = supabase
      .from('status_transitions')
      .select('*')
      .eq('doc_type', docType);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getAllowedTransitions(
    docType: string,
    fromStatusId: string,
    userRole: string,
    tenantId?: string
  ): Promise<StatusTransition[]> {
    let query = supabase
      .from('status_transitions')
      .select('*')
      .eq('doc_type', docType)
      .eq('from_status_id', fromStatusId)
      .contains('allowed_roles', [userRole]);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createTransition(transition: Partial<StatusTransition>): Promise<StatusTransition> {
    const { data, error } = await supabase
      .from('status_transitions')
      .insert(transition)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTransition(id: string): Promise<void> {
    const { error } = await supabase
      .from('status_transitions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== HELPERS ====================

  getStatusColorClasses(color: StatusColor | string): string {
    const colorConfig = STATUS_COLORS[color as StatusColor] || STATUS_COLORS.gray;
    return `${colorConfig.bg} ${colorConfig.text} ${colorConfig.dark}`;
  }

  getStatusBorderClass(color: StatusColor | string): string {
    const colorConfig = STATUS_COLORS[color as StatusColor] || STATUS_COLORS.gray;
    return colorConfig.border;
  }

  // Group statuses by their group
  groupStatusesByGroup(statuses: CustomStatus[]): Map<string, { group: StatusGroup; statuses: CustomStatus[] }> {
    const grouped = new Map<string, { group: StatusGroup; statuses: CustomStatus[] }>();

    for (const status of statuses) {
      if (status.group) {
        const key = status.group.id;
        if (!grouped.has(key)) {
          grouped.set(key, { group: status.group, statuses: [] });
        }
        grouped.get(key)!.statuses.push(status);
      }
    }

    return grouped;
  }
}

export const statusService = new StatusService();
export default statusService;
