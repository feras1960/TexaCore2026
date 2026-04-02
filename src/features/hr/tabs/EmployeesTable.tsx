/**
 * 👤 Employees Table — جدول الموظفين باستخدام NexaListTable
 * مع EmployeeSheet للعرض/التعديل/الإنشاء
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getEmployees, deleteEmployee, type Employee } from '../services/hrService';
import { toast } from 'sonner';
import EmployeeSheet, { type SheetMode } from '../components/sheet/EmployeeSheet';

export default function EmployeesTable() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // ═══ Sheet State ═══
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<SheetMode>('view');
    const [sheetEmployeeId, setSheetEmployeeId] = useState<string | null>(null);

    const openSheet = (mode: SheetMode, empId?: string) => {
        setSheetMode(mode);
        setSheetEmployeeId(empId || null);
        setSheetOpen(true);
    };
    const closeSheet = () => setSheetOpen(false);

    useEffect(() => { loadEmployees(); }, []);

    async function loadEmployees() {
        try {
            // ⚡ No setLoading(true) — render table immediately
            const data = await getEmployees();
            setEmployees(data);
        } catch (err) {
            console.error(err);
            toast.error(isRTL ? 'فشل تحميل الموظفين' : 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا الموظف؟' : 'Delete this employee?')) return;
        try {
            await deleteEmployee(id);
            setEmployees(prev => prev.filter(e => e.id !== id));
            toast.success(isRTL ? 'تم حذف الموظف' : 'Employee deleted');
        } catch {
            toast.error(isRTL ? 'فشل الحذف' : 'Delete failed');
        }
    }

    const statusConfig: Record<string, { label: string; className: string }> = {
        active: { label: isRTL ? 'نشط' : 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        on_leave: { label: isRTL ? 'في إجازة' : 'On Leave', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        suspended: { label: isRTL ? 'معلق' : 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        terminated: { label: isRTL ? 'منتهي' : 'Terminated', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
        resigned: { label: isRTL ? 'مستقيل' : 'Resigned', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    };

    const typeConfig: Record<string, string> = {
        full_time: isRTL ? 'دوام كامل' : 'Full Time',
        part_time: isRTL ? 'دوام جزئي' : 'Part Time',
        contract: isRTL ? 'عقد' : 'Contract',
        temporary: isRTL ? 'مؤقت' : 'Temporary',
        intern: isRTL ? 'متدرب' : 'Intern',
    };

    // --- Filter data by search ---
    const filteredData = employees.filter(emp => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            emp.full_name_ar?.toLowerCase().includes(s) ||
            emp.full_name_en?.toLowerCase().includes(s) ||
            emp.employee_number?.toLowerCase().includes(s) ||
            emp.phone?.includes(s) ||
            emp.mobile?.includes(s)
        );
    });

    // --- Column definitions for NexaListTable ---
    const columns: NexaListColumn<Employee>[] = [
        {
            id: 'employee_number',
            header: isRTL ? 'الرقم' : 'ID',
            width: 'w-20',
            cell: (row) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.employee_number || '—'}
                </span>
            ),
        },
        {
            id: 'name',
            header: isRTL ? 'الاسم' : 'Name',
            width: 'min-w-[200px]',
            sortable: true,
            sortKey: 'full_name_ar',
            cell: (row) => {
                const initials = (row.first_name_ar?.[0] || '') + (row.last_name_ar?.[0] || '');
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-erp-navy/10 text-erp-navy text-xs font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-sm">{row.full_name_ar || `${row.first_name_ar} ${row.last_name_ar || ''}`}</p>
                            {row.full_name_en && (
                                <p className="text-xs text-muted-foreground">{row.full_name_en}</p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'department',
            header: isRTL ? 'القسم' : 'Department',
            width: 'min-w-[140px]',
            cell: (row) => {
                const dept = row.department;
                return (
                    <span className="text-sm">
                        {dept ? (isRTL ? dept.name_ar : (dept.name_en || dept.name_ar)) : '—'}
                    </span>
                );
            },
        },
        {
            id: 'position',
            header: isRTL ? 'المسمى الوظيفي' : 'Position',
            width: 'min-w-[140px]',
            cell: (row) => {
                const pos = row.position;
                return (
                    <span className="text-sm">
                        {pos ? (isRTL ? pos.name_ar : (pos.name_en || pos.name_ar)) : '—'}
                    </span>
                );
            },
        },
        {
            id: 'employment_type',
            header: isRTL ? 'نوع التوظيف' : 'Type',
            width: 'w-28',
            cell: (row) => (
                <span className="text-sm">{typeConfig[row.employment_type || 'full_time']}</span>
            ),
        },
        {
            id: 'phone',
            header: isRTL ? 'الهاتف' : 'Phone',
            width: 'w-32',
            cell: (row) => (
                <span className="font-mono text-sm" dir="ltr">{row.phone || row.mobile || '—'}</span>
            ),
        },
        {
            id: 'hire_date',
            header: isRTL ? 'تاريخ التعيين' : 'Hire Date',
            width: 'w-28',
            sortable: true,
            sortKey: 'hire_date',
            cell: (row) => (
                <span className="text-sm">
                    {row.hire_date ? new Date(row.hire_date).toLocaleDateString() : '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = statusConfig[row.employment_status || 'active'];
                return <Badge className={st?.className}>{st?.label}</Badge>;
            },
        },
    ];

    // --- Row accent color based on status ---
    const getRowAccent = (row: Employee) => {
        switch (row.employment_status) {
            case 'active': return 'border-s-emerald-400';
            case 'on_leave': return 'border-s-amber-400';
            case 'suspended': return 'border-s-red-400';
            case 'terminated': return 'border-s-gray-400';
            case 'resigned': return 'border-s-orange-400';
            default: return 'border-s-indigo-400';
        }
    };

    return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                        {isRTL ? 'إدارة الموظفين' : 'Employee Management'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isRTL ? `${employees.length} موظف` : `${employees.length} employees`}
                    </p>
                </div>
                <Button className="bg-erp-primary hover:bg-erp-primary/90 text-white shadow-sm" onClick={() => openSheet('create')}>
                    <UserPlus className="h-4 w-4 me-2" />
                    {isRTL ? 'إضافة موظف' : 'Add Employee'}
                </Button>
            </div>

            {/* NexaListTable */}
            <NexaListTable
                data={filteredData}
                columns={columns}
                searchTerm={search}
                onSearchChange={setSearch}
                searchPlaceholder={isRTL ? 'بحث عن موظف...' : 'Search employees...'}
                isLoading={loading}
                isRTL={isRTL}
                direction={isRTL ? 'rtl' : 'ltr'}
                totalCount={employees.length}
                countLabel={isRTL ? 'موظف' : 'employees'}
                getRowKey={(row) => row.id}
                getRowAccent={getRowAccent}
                onRowClick={(row) => openSheet('view', row.id)}
                emptyMessage={isRTL ? 'لا يوجد موظفين' : 'No employees found'}
                renderActions={(row) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openSheet('view', row.id)}>
                                <Eye className="h-4 w-4 me-2" />
                                {isRTL ? 'عرض' : 'View'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSheet('edit', row.id)}>
                                <Pencil className="h-4 w-4 me-2" />
                                {isRTL ? 'تعديل' : 'Edit'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(row.id)}>
                                <Trash2 className="h-4 w-4 me-2" />
                                {isRTL ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            />

            {/* ═══ Employee Sheet ═══ */}
            <EmployeeSheet
                isOpen={sheetOpen}
                onClose={closeSheet}
                mode={sheetMode}
                employeeId={sheetEmployeeId}
                onSaved={() => loadEmployees()}
                onRefresh={() => loadEmployees()}
            />
        </div>
    );
}
