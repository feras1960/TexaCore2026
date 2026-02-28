/**
 * 👥 HR Service — خدمة الموارد البشرية
 * 
 * CRUD operations for: employees, departments, positions,
 * contracts, leaves, attendance, payroll, documents
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface Employee {
    id: string;
    tenant_id: string;
    company_id?: string;
    branch_id?: string;
    user_profile_id?: string;
    employee_number?: string;
    first_name_ar: string;
    last_name_ar?: string;
    first_name_en?: string;
    last_name_en?: string;
    full_name_ar?: string;
    full_name_en?: string;
    national_id?: string;
    passport_number?: string;
    nationality?: string;
    date_of_birth?: string;
    gender?: 'male' | 'female';
    marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
    email?: string;
    phone?: string;
    mobile?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    address?: string;
    city?: string;
    country?: string;
    department_id?: string;
    position_id?: string;
    reporting_to?: string;
    hire_date?: string;
    probation_end_date?: string;
    employment_type?: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
    employment_status?: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
    termination_date?: string;
    termination_reason?: string;
    bank_name?: string;
    bank_account?: string;
    iban?: string;
    tax_id?: string;
    social_insurance_number?: string;
    avatar_url?: string;
    notes?: string;
    custom_fields?: Record<string, unknown>;
    tags?: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    department?: { id: string; name_ar: string; name_en?: string };
    position?: { id: string; name_ar: string; name_en?: string };
    reporting_manager?: { id: string; full_name_ar: string };
}

export interface Department {
    id: string;
    tenant_id: string;
    company_id?: string;
    code?: string;
    name_ar: string;
    name_en?: string;
    name_uk?: string;
    parent_id?: string;
    manager_id?: string;
    description?: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
    employee_count?: number;
    manager?: { id: string; full_name_ar: string };
}

export interface Position {
    id: string;
    tenant_id: string;
    code?: string;
    name_ar: string;
    name_en?: string;
    department_id?: string;
    min_salary?: number;
    max_salary?: number;
    is_active: boolean;
}

export interface EmployeeContract {
    id: string;
    tenant_id: string;
    employee_id: string;
    contract_number?: string;
    contract_type: 'permanent' | 'fixed_term' | 'probation' | 'temporary' | 'freelance';
    start_date: string;
    end_date?: string;
    probation_months: number;
    basic_salary: number;
    currency: string;
    payment_frequency: string;
    working_hours_per_day: number;
    working_days_per_week: number;
    annual_leave_days: number;
    notice_period_days: number;
    status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
    created_at: string;
    employee?: { full_name_ar: string; employee_number?: string };
}

export interface LeaveType {
    id: string;
    tenant_id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    leave_category: string;
    max_days_per_year?: number;
    is_paid: boolean;
    color: string;
    is_active: boolean;
}

export interface LeaveRequest {
    id: string;
    tenant_id: string;
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    is_half_day: boolean;
    reason?: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    employee?: { full_name_ar: string; employee_number?: string };
    leave_type?: { name_ar: string; name_en?: string; color: string };
    approver?: { full_name_ar: string };
}

export interface LeaveBalance {
    id: string;
    employee_id: string;
    leave_type_id: string;
    year: number;
    allocated_days: number;
    used_days: number;
    carried_days: number;
    pending_days: number;
    remaining_days: number;
    leave_type?: { name_ar: string; name_en?: string; color: string; code: string };
}

export interface AttendanceRecord {
    id: string;
    tenant_id: string;
    employee_id: string;
    attendance_date: string;
    check_in?: string;
    check_out?: string;
    worked_hours?: number;
    overtime_hours: number;
    status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend';
    late_minutes: number;
    check_in_method: string;
    notes?: string;
    employee?: { full_name_ar: string; employee_number?: string; department?: { name_ar: string } };
}

export interface PayrollPeriod {
    id: string;
    tenant_id: string;
    period_name: string;
    period_year: number;
    period_month: number;
    start_date: string;
    end_date: string;
    payment_date?: string;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    total_employer_cost: number;
    employee_count: number;
    status: 'draft' | 'processing' | 'calculated' | 'approved' | 'paid' | 'cancelled';
    created_at: string;
}

export interface PayrollEntry {
    id: string;
    payroll_period_id: string;
    employee_id: string;
    basic_salary: number;
    total_earnings: number;
    total_deductions: number;
    total_employer_contributions: number;
    net_salary: number;
    components: Array<{
        component_id: string;
        code: string;
        name: string;
        type: 'earning' | 'deduction' | 'employer_contribution';
        amount: number;
    }>;
    working_days?: number;
    actual_working_days?: number;
    absent_days: number;
    overtime_hours: number;
    overtime_amount: number;
    status: 'draft' | 'calculated' | 'approved' | 'paid';
    employee?: { full_name_ar: string; employee_number?: string };
}

export interface SalaryComponent {
    id: string;
    tenant_id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    component_type: 'earning' | 'deduction' | 'employer_contribution';
    calculation_type: 'fixed' | 'percentage' | 'formula';
    default_amount?: number;
    percentage_of?: string;
    percentage_value?: number;
    is_taxable: boolean;
    is_active: boolean;
    display_order: number;
}

export interface HRSettings {
    id: string;
    tenant_id: string;
    default_working_hours: number;
    default_working_days: number;
    weekend_days: number[];
    grace_period_minutes: number;
    overtime_multiplier: number;
    payroll_day: number;
    default_currency: string;
    employer_social_insurance_pct: number;
    employee_social_insurance_pct: number;
    default_annual_leave_days: number;
    employee_number_prefix: string;
    employee_number_counter: number;
}

// ═══════════════════════════════════════════════════
// Helper: Strip generated/read-only columns before INSERT/UPDATE
// ═══════════════════════════════════════════════════
const EMPLOYEE_GENERATED_COLS = [
    'full_name_ar', 'full_name_en', 'created_at', 'updated_at',
    'department', 'position', 'reporting_manager', // relation objects
];

function stripGeneratedFields(obj: Record<string, any>): Record<string, any> {
    const clean = { ...obj };
    EMPLOYEE_GENERATED_COLS.forEach(key => delete clean[key]);
    return clean;
}

// ═══════════════════════════════════════════════════
// 1. EMPLOYEES
// ═══════════════════════════════════════════════════

export async function getEmployees() {
    const { data, error } = await (supabase as any)
        .from('employees')
        .select(`
            *,
            department:departments!department_id(id, name_ar, name_en),
            position:positions!position_id(id, name_ar, name_en)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Employee[];
}

export async function getEmployee(id: string) {
    const { data, error } = await (supabase as any)
        .from('employees')
        .select(`
            *,
            department:departments!department_id(id, name_ar, name_en),
            position:positions!position_id(id, name_ar, name_en)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Employee;
}

export async function createEmployee(employee: Partial<Employee>) {
    const payload = stripGeneratedFields(employee as any);
    // Auto-inject tenant_id if not provided
    if (!payload.tenant_id) {
        const tenantId = getCurrentTenantId();
        if (tenantId) payload.tenant_id = tenantId;
    }
    const { data, error } = await (supabase as any)
        .from('employees')
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data as Employee;
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
    const payload = stripGeneratedFields(updates as any);
    delete payload.id; // never update the primary key
    const { data, error } = await (supabase as any)
        .from('employees')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Employee;
}

export async function deleteEmployee(id: string) {
    const { error } = await (supabase as any)
        .from('employees')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ═══════════════════════════════════════════════════
// 2. DEPARTMENTS
// ═══════════════════════════════════════════════════

export async function getDepartments() {
    const { data, error } = await (supabase as any)
        .from('departments')
        .select('*')
        .order('display_order');

    if (error) throw error;
    return data as Department[];
}

export async function createDepartment(dept: Partial<Department>) {
    const { data, error } = await (supabase as any)
        .from('departments')
        .insert(dept)
        .select()
        .single();

    if (error) throw error;
    return data as Department;
}

export async function updateDepartment(id: string, updates: Partial<Department>) {
    const { data, error } = await (supabase as any)
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Department;
}

export async function deleteDepartment(id: string) {
    const { error } = await (supabase as any)
        .from('departments')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ═══════════════════════════════════════════════════
// 3. POSITIONS
// ═══════════════════════════════════════════════════

export async function getPositions() {
    const { data, error } = await (supabase as any)
        .from('positions')
        .select('*, department:departments!department_id(id, name_ar, name_en)')
        .order('name_ar');

    if (error) throw error;
    return data as Position[];
}

export async function createPosition(pos: Partial<Position>) {
    const { data, error } = await (supabase as any)
        .from('positions')
        .insert(pos)
        .select()
        .single();

    if (error) throw error;
    return data as Position;
}

export async function updatePosition(id: string, updates: Partial<Position>) {
    const { data, error } = await (supabase as any)
        .from('positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Position;
}

export async function deletePosition(id: string) {
    const { error } = await (supabase as any)
        .from('positions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ═══════════════════════════════════════════════════
// 4. CONTRACTS
// ═══════════════════════════════════════════════════

export async function getContracts(employeeId?: string) {
    let query = (supabase as any)
        .from('employee_contracts')
        .select(`
            *,
            employee:employees!employee_id(full_name_ar, employee_number)
        `)
        .order('start_date', { ascending: false });

    if (employeeId) query = query.eq('employee_id', employeeId);

    const { data, error } = await query;
    if (error) throw error;
    return data as EmployeeContract[];
}

export async function createContract(contract: Partial<EmployeeContract>) {
    const { data, error } = await (supabase as any)
        .from('employee_contracts')
        .insert(contract)
        .select()
        .single();

    if (error) throw error;
    return data as EmployeeContract;
}

export async function updateContract(id: string, updates: Partial<EmployeeContract>) {
    const { data, error } = await (supabase as any)
        .from('employee_contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as EmployeeContract;
}

// ═══════════════════════════════════════════════════
// 5. LEAVE TYPES & REQUESTS
// ═══════════════════════════════════════════════════

export async function getLeaveTypes() {
    const { data, error } = await (supabase as any)
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('name_ar');

    if (error) throw error;
    return data as LeaveType[];
}

export async function getLeaveRequests(filters?: { status?: string; employee_id?: string }) {
    let query = (supabase as any)
        .from('leave_requests')
        .select(`
            *,
            employee:employees!employee_id(full_name_ar, employee_number),
            leave_type:leave_types!leave_type_id(name_ar, name_en, color)
        `)
        .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);

    const { data, error } = await query;
    if (error) throw error;
    return data as LeaveRequest[];
}

export async function createLeaveRequest(request: Partial<LeaveRequest>) {
    const { data, error } = await (supabase as any)
        .from('leave_requests')
        .insert(request)
        .select()
        .single();

    if (error) throw error;
    return data as LeaveRequest;
}

export async function approveLeaveRequest(id: string, approverId: string) {
    const { data, error } = await (supabase as any)
        .from('leave_requests')
        .update({
            status: 'approved',
            approved_by: approverId,
            approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function rejectLeaveRequest(id: string, reason: string) {
    const { data, error } = await (supabase as any)
        .from('leave_requests')
        .update({
            status: 'rejected',
            rejection_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getLeaveBalances(employeeId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const { data, error } = await (supabase as any)
        .from('leave_balances')
        .select(`
            *,
            leave_type:leave_types!leave_type_id(name_ar, name_en, color, code)
        `)
        .eq('employee_id', employeeId)
        .eq('year', currentYear);

    if (error) throw error;
    return data as LeaveBalance[];
}

// ═══════════════════════════════════════════════════
// 6. ATTENDANCE
// ═══════════════════════════════════════════════════

export async function getAttendance(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data, error } = await (supabase as any)
        .from('attendance')
        .select(`
            *,
            employee:employees!employee_id(full_name_ar, employee_number)
        `)
        .eq('attendance_date', targetDate)
        .order('check_in', { ascending: true });

    if (error) throw error;
    return data as AttendanceRecord[];
}

export async function checkIn(employeeId: string, method: string = 'manual', location?: { lat: number; lng: number }) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await (supabase as any)
        .from('attendance')
        .upsert({
            employee_id: employeeId,
            attendance_date: today,
            check_in: new Date().toISOString(),
            status: 'present',
            check_in_method: method,
            check_in_location: location || null,
        }, { onConflict: 'employee_id,attendance_date' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function checkOut(employeeId: string, location?: { lat: number; lng: number }) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await (supabase as any)
        .from('attendance')
        .update({
            check_out: new Date().toISOString(),
            check_out_location: location || null,
        })
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════
// 7. PAYROLL
// ═══════════════════════════════════════════════════

export async function getPayrollPeriods() {
    const { data, error } = await (supabase as any)
        .from('payroll_periods')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

    if (error) throw error;
    return data as PayrollPeriod[];
}

export async function createPayrollPeriod(period: Partial<PayrollPeriod>) {
    const { data, error } = await (supabase as any)
        .from('payroll_periods')
        .insert(period)
        .select()
        .single();

    if (error) throw error;
    return data as PayrollPeriod;
}

export async function getPayrollEntries(periodId: string) {
    const { data, error } = await (supabase as any)
        .from('payroll_entries')
        .select(`
            *,
            employee:employees!employee_id(full_name_ar, employee_number)
        `)
        .eq('payroll_period_id', periodId)
        .order('created_at');

    if (error) throw error;
    return data as PayrollEntry[];
}

export async function updatePayrollPeriodStatus(id: string, status: string) {
    const { data, error } = await (supabase as any)
        .from('payroll_periods')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════
// 8. SALARY COMPONENTS
// ═══════════════════════════════════════════════════

export async function getSalaryComponents() {
    const { data, error } = await (supabase as any)
        .from('salary_components')
        .select('*')
        .order('display_order');

    if (error) throw error;
    return data as SalaryComponent[];
}

export async function createSalaryComponent(comp: Partial<SalaryComponent>) {
    const { data, error } = await (supabase as any)
        .from('salary_components')
        .insert(comp)
        .select()
        .single();

    if (error) throw error;
    return data as SalaryComponent;
}

// ═══════════════════════════════════════════════════
// 9. EMPLOYEE DOCUMENTS
// ═══════════════════════════════════════════════════

export async function getEmployeeDocuments(employeeId: string) {
    const { data, error } = await (supabase as any)
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function createEmployeeDocument(doc: Record<string, unknown>) {
    const { data, error } = await (supabase as any)
        .from('employee_documents')
        .insert(doc)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════
// 10. HR SETTINGS
// ═══════════════════════════════════════════════════

export async function getHRSettings() {
    const { data, error } = await (supabase as any)
        .from('hr_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data as HRSettings | null;
}

export async function saveHRSettings(settings: Partial<HRSettings>) {
    const existing = await getHRSettings();

    if (existing) {
        const { data, error } = await (supabase as any)
            .from('hr_settings')
            .update(settings)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await (supabase as any)
            .from('hr_settings')
            .insert(settings)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

// ═══════════════════════════════════════════════════
// 11. DASHBOARD STATS
// ═══════════════════════════════════════════════════

export async function getHRDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parallel queries
    const [
        employeesRes,
        attendanceRes,
        pendingLeavesRes,
        expiringContractsRes,
        departmentsRes,
    ] = await Promise.all([
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
}
