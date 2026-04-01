/**
 * ════════════════════════════════════════════════════════════════
 * 👥 HR Module — تعريف بيانات الموارد البشرية لـ DataEngine
 * ════════════════════════════════════════════════════════════════
 *
 * HR uses hrService (direct supabase calls) in its tabs.
 * This module wraps those service calls as React Query queries
 * so DataEngine can preload them at login.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import type { DataModule } from '../DataEngine';
import { CACHE_TIMES } from '../DataEngine';

export const hrModule: DataModule = {
  code: 'hr',
  label: { ar: 'الموارد البشرية', en: 'HR' },
  queries: [
    // ─── 1. Employees List ───────────────────────────────────
    {
      queryKey: ['hr_employees', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('employees')
          .select(`
            *,
            department:departments!department_id(id, name_ar, name_en),
            position:positions!position_id(id, name_ar, name_en)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 2. Departments List ────────────────────────────────
    {
      queryKey: ['hr_departments', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('departments')
          .select('*')
          .order('display_order');
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 3. Positions List ──────────────────────────────────
    {
      queryKey: ['hr_positions', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('positions')
          .select('*, department:departments!department_id(id, name_ar, name_en)')
          .order('name_ar');
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 4. Dashboard Stats ─────────────────────────────────
    {
      queryKey: ['hr_dashboard_stats', null],
      queryFn: async (_companyId: string) => {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [employeesRes, attendanceRes, pendingLeavesRes, expiringContractsRes, departmentsRes] =
          await Promise.all([
            (supabase as any).from('employees').select('id, employment_status, hire_date, department_id', { count: 'exact' }).eq('is_active', true),
            (supabase as any).from('attendance').select('id, status', { count: 'exact' }).eq('attendance_date', today),
            (supabase as any).from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
            (supabase as any).from('employee_contracts').select('id, employee_id').eq('status', 'active').lte('end_date', thirtyDaysFromNow).not('end_date', 'is', null),
            (supabase as any).from('departments').select('id, name_ar, name_en').eq('is_active', true),
          ]);

        return {
          totalEmployees: employeesRes.count || 0,
          presentToday: attendanceRes.count || 0,
          pendingLeaves: pendingLeavesRes.count || 0,
          expiringContracts: expiringContractsRes.data?.length || 0,
          departments: departmentsRes.data || [],
          employees: employeesRes.data || [],
        };
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 5. Contracts List ──────────────────────────────────
    {
      queryKey: ['hr_contracts', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('employee_contracts')
          .select(`
            *,
            employee:employees!employee_id(full_name_ar, employee_number)
          `)
          .order('start_date', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 6. Leave Requests (all — preload) ──────────────────
    {
      queryKey: ['hr_leave_requests', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('leave_requests')
          .select(`
            *,
            employee:employees!employee_id(full_name_ar, employee_number),
            leave_type:leave_types!leave_type_id(name_ar, name_en, color)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 7. Leave Types ─────────────────────────────────────
    {
      queryKey: ['hr_leave_types', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('leave_types')
          .select('*')
          .eq('is_active', true)
          .order('name_ar');
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 8. Payroll Periods ─────────────────────────────────
    {
      queryKey: ['hr_payroll_periods', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('payroll_periods')
          .select('*')
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 9. HR Settings ─────────────────────────────────────
    {
      queryKey: ['hr_settings', null],
      queryFn: async (_companyId: string) => {
        const { data, error } = await (supabase as any)
          .from('hr_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      staleTime: CACHE_TIMES.STATIC,
      gcTime: CACHE_TIMES.GC,
    },
  ],
};

/**
 * Patch query keys: replace `null` with actual companyId
 */
export function resolveHrQueries(companyId: string): DataModule {
  return {
    ...hrModule,
    queries: hrModule.queries.map(q => ({
      ...q,
      queryKey: q.queryKey.map(k => k === null ? companyId : k),
    })),
  };
}
