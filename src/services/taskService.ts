/**
 * ════════════════════════════════════════════════════════════════
 * 📋 Task Service — CRUD + Google Calendar Sync
 * ════════════════════════════════════════════════════════════════
 */

import { supabase, cloudSupabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';

// ─── Types ──────────────────────────────────────────────────────
export type TaskCategory = 'invoice_due' | 'delivery' | 'call' | 'meeting' | 'follow_up' | 'custom';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type CallResult = 'promise_to_pay' | 'no_answer' | 'delayed' | 'partial_payment' | 'refused' | 'other';

export interface CrmTask {
  id: string;
  tenant_id: string;
  company_id?: string;
  title: string;
  description?: string;
  task_type?: string;
  task_category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  contact_id?: string;
  deal_id?: string;
  due_date?: string;
  reminder_at?: string;
  completed_at?: string;
  assigned_to?: string;
  assigned_by?: string;
  outcome?: string;
  outcome_type?: string;
  call_result?: CallResult;
  call_duration?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  google_event_id?: string;
  meet_link?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  recurrence?: Record<string, any>;
  color?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  contact_name?: string;
  assigned_user_name?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  task_category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  contact_id?: string;
  deal_id?: string;
  due_date?: string;
  reminder_at?: string;
  assigned_to?: string;
  tags?: string[];
  related_entity_type?: string;
  related_entity_id?: string;
  color?: string;
  sync_to_calendar?: boolean;
  add_meet_link?: boolean;
}

// ─── Category Config ────────────────────────────────────────────
export const TASK_CATEGORIES: Record<TaskCategory, { label: string; labelAr: string; icon: string; color: string }> = {
  invoice_due:  { label: 'Payment Due',    labelAr: 'استحقاق دفع',    icon: '💰', color: '#ef4444' },
  delivery:     { label: 'Delivery',       labelAr: 'موعد تسليم',     icon: '📦', color: '#f97316' },
  call:         { label: 'Call',           labelAr: 'مكالمة',         icon: '📞', color: '#3b82f6' },
  meeting:      { label: 'Meeting',        labelAr: 'اجتماع',        icon: '🤝', color: '#22c55e' },
  follow_up:    { label: 'Follow Up',      labelAr: 'متابعة',        icon: '🔄', color: '#8b5cf6' },
  custom:       { label: 'Task',           labelAr: 'مهمة',          icon: '✅', color: '#6b7280' },
};

export const CALL_RESULTS: Record<CallResult, { label: string; labelAr: string }> = {
  promise_to_pay:  { label: 'Promise to Pay',  labelAr: 'وعد بالدفع' },
  no_answer:       { label: 'No Answer',        labelAr: 'لا يرد' },
  delayed:         { label: 'Requested Delay',  labelAr: 'طلب تأجيل' },
  partial_payment: { label: 'Partial Payment',  labelAr: 'دفع جزئي' },
  refused:         { label: 'Refused',          labelAr: 'رفض' },
  other:           { label: 'Other',            labelAr: 'أخرى' },
};

// ─── CRUD ───────────────────────────────────────────────────────

export async function getTasks(companyId: string, filters?: {
  status?: TaskStatus;
  category?: TaskCategory;
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}): Promise<CrmTask[]> {
  let query = supabase
    .from('crm_tasks')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('task_category', filters.category);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.from_date) query = query.gte('due_date', filters.from_date);
  if (filters?.to_date) query = query.lte('due_date', filters.to_date);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as CrmTask[];
}

export async function getTaskById(taskId: string): Promise<CrmTask | null> {
  const { data, error } = await supabase
    .from('crm_tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  if (error) throw error;
  return data as CrmTask;
}

export async function createTask(
  companyId: string,
  tenantId: string,
  input: CreateTaskInput,
  cloudCompanyId?: string
): Promise<CrmTask> {
  const { sync_to_calendar, add_meet_link, ...taskData } = input;

  const { data, error } = await supabase
    .from('crm_tasks')
    .insert({
      ...taskData,
      company_id: companyId,
      tenant_id: tenantId,
      task_category: input.task_category || 'custom',
      priority: input.priority || 'medium',
      status: input.status || 'pending',
      color: input.color || TASK_CATEGORIES[input.task_category || 'custom'].color,
    })
    .select()
    .single();

  if (error) throw error;
  const task = data as CrmTask;

  // Sync to Google Calendar if requested and task has a due date
  if (sync_to_calendar && task.due_date && cloudCompanyId) {
    try {
      const calResult = await syncTaskToCalendar(task, cloudCompanyId, add_meet_link);
      if (calResult?.google_event_id) {
        await supabase
          .from('crm_tasks')
          .update({
            google_event_id: calResult.google_event_id,
            meet_link: calResult.meet_link || null,
          })
          .eq('id', task.id);
        task.google_event_id = calResult.google_event_id;
        task.meet_link = calResult.meet_link;
      }
    } catch (err) {
      console.warn('[TaskService] Calendar sync failed:', err);
    }
  }

  return task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<CrmTask>,
  cloudCompanyId?: string
): Promise<CrmTask> {
  const { data, error } = await supabase
    .from('crm_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  const task = data as CrmTask;

  // Update Calendar event if synced
  if (task.google_event_id && cloudCompanyId) {
    try {
      await syncTaskToCalendar(task, cloudCompanyId);
    } catch (err) {
      console.warn('[TaskService] Calendar update failed:', err);
    }
  }

  return task;
}

export async function completeTask(
  taskId: string,
  outcome?: string,
  callResult?: CallResult,
  callDuration?: number,
  cloudCompanyId?: string
): Promise<CrmTask> {
  return updateTask(taskId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    outcome,
    call_result: callResult,
    call_duration: callDuration,
  }, cloudCompanyId);
}

export async function deleteTask(taskId: string, cloudCompanyId?: string): Promise<void> {
  // Get task first to check for Calendar event
  const task = await getTaskById(taskId);
  
  if (task?.google_event_id && cloudCompanyId) {
    try {
      await cloudSupabase.functions.invoke('google-integration', {
        body: {
          action: 'delete_calendar_event',
          company_id: cloudCompanyId,
          event_id: task.google_event_id,
        },
      });
    } catch (err) {
      console.warn('[TaskService] Calendar delete failed:', err);
    }
  }

  const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ─── Calendar Sync ──────────────────────────────────────────────

export async function syncTaskToCalendar(
  task: CrmTask,
  cloudCompanyId: string,
  addMeetLink?: boolean
): Promise<{ google_event_id?: string; meet_link?: string } | null> {
  const cat = TASK_CATEGORIES[task.task_category] || TASK_CATEGORIES.custom;
  
  const { data, error } = await cloudSupabase.functions.invoke('google-integration', {
    body: {
      action: 'sync_task_to_calendar',
      company_id: cloudCompanyId,
      task_id: task.id,
      title: `${cat.icon} ${task.title}`,
      description: task.description || '',
      start_time: task.due_date,
      end_time: task.due_date, // 1-hour event by default
      color_id: getCategoryCalendarColor(task.task_category),
      add_meet: addMeetLink || task.task_category === 'meeting',
      event_id: task.google_event_id, // null = create, set = update
    },
  });

  if (error) {
    console.warn('[TaskService] Calendar sync error:', error);
    return null;
  }
  return data;
}

export async function getCalendarEvents(
  cloudCompanyId: string,
  timeMin: string,
  timeMax: string
): Promise<any[]> {
  const { data, error } = await cloudSupabase.functions.invoke('google-integration', {
    body: {
      action: 'list_events',
      company_id: cloudCompanyId,
      time_min: timeMin,
      time_max: timeMax,
    },
  });
  if (error) return [];
  return data?.events || [];
}

// ─── Dashboard Helpers ──────────────────────────────────────────

export async function getTasksForDashboard(companyId: string): Promise<{
  today: CrmTask[];
  overdue: CrmTask[];
  upcoming: CrmTask[];
  stats: { total: number; completed: number; overdue: number; pending: number };
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

  const { data: allTasks } = await supabase
    .from('crm_tasks')
    .select('*')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true });

  const tasks = (allTasks || []) as CrmTask[];
  
  const today = tasks.filter(t => t.due_date && t.due_date >= todayStart && t.due_date < todayEnd && t.status !== 'completed');
  const overdue = tasks.filter(t => t.due_date && t.due_date < todayStart && t.status !== 'completed');
  const upcoming = tasks.filter(t => t.due_date && t.due_date >= todayEnd && t.due_date < weekEnd && t.status !== 'completed');
  
  return {
    today,
    overdue,
    upcoming,
    stats: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: overdue.length,
      pending: tasks.filter(t => t.status === 'pending').length,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function getCategoryCalendarColor(category: TaskCategory): string {
  // Google Calendar color IDs (1-11)
  const map: Record<TaskCategory, string> = {
    invoice_due: '11',  // Red
    delivery: '6',      // Orange
    call: '9',          // Blue
    meeting: '10',      // Green
    follow_up: '3',     // Purple
    custom: '8',        // Gray
  };
  return map[category] || '8';
}
