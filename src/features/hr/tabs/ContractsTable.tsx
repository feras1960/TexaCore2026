/**
 * 📋 Contracts Table — جدول العقود باستخدام NexaListTable
 */

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaListTable, NexaListColumn, NexaListFilter } from '@/components/ui/nexa-list-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilePlus, AlertTriangle } from 'lucide-react';
import { getContracts, type EmployeeContract } from '../services/hrService';
import { toast } from 'sonner';

export default function ContractsTable() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const [contracts, setContracts] = useState<EmployeeContract[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => { loadContracts(); }, []);

    async function loadContracts() {
        try {
            // ⚡ No setLoading(true) — render table immediately
            const data = await getContracts();
            setContracts(data);
        } catch (err) {
            console.error(err);
            toast.error(isRTL ? 'فشل تحميل العقود' : 'Failed to load contracts');
        } finally {
            setLoading(false);
        }
    }

    const statusConfig: Record<string, { label: string; className: string }> = {
        active: { label: isRTL ? 'ساري' : 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        draft: { label: isRTL ? 'مسودة' : 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
        expired: { label: isRTL ? 'منتهي' : 'Expired', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        terminated: { label: isRTL ? 'ملغى' : 'Terminated', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        renewed: { label: isRTL ? 'مجدد' : 'Renewed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    };

    const typeConfig: Record<string, string> = {
        permanent: isRTL ? 'دائم' : 'Permanent',
        temporary: isRTL ? 'مؤقت' : 'Temporary',
        part_time: isRTL ? 'جزئي' : 'Part Time',
        probation: isRTL ? 'تجربة' : 'Probation',
    };

    // Check if contract expires within 30 days
    const isExpiringSoon = (endDate?: string) => {
        if (!endDate) return false;
        const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 && daysLeft <= 30;
    };

    // --- Filter ---
    const filteredData = useMemo(() => {
        return contracts.filter(c => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                c.contract_number?.toLowerCase().includes(s) ||
                c.employee?.full_name_ar?.toLowerCase().includes(s) ||
                c.employee?.employee_number?.toLowerCase().includes(s)
            );
        });
    }, [contracts, search, statusFilter]);

    // --- Filters ---
    const filters: NexaListFilter[] = [
        {
            id: 'status',
            label: isRTL ? 'الحالة' : 'Status',
            type: 'select',
            value: statusFilter,
            onChange: (v) => setStatusFilter(v),
            options: [
                { value: 'all', label: isRTL ? 'الكل' : 'All' },
                { value: 'active', label: isRTL ? 'ساري' : 'Active' },
                { value: 'draft', label: isRTL ? 'مسودة' : 'Draft' },
                { value: 'expired', label: isRTL ? 'منتهي' : 'Expired' },
                { value: 'terminated', label: isRTL ? 'ملغى' : 'Terminated' },
            ],
        },
    ];

    const columns: NexaListColumn<EmployeeContract>[] = [
        {
            id: 'contract_number',
            header: isRTL ? 'رقم العقد' : 'Contract #',
            width: 'w-28',
            cell: (row) => (
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {row.contract_number || '—'}
                </span>
            ),
        },
        {
            id: 'employee',
            header: isRTL ? 'الموظف' : 'Employee',
            width: 'min-w-[180px]',
            cell: (row) => (
                <div>
                    <p className="font-medium text-sm">{row.employee?.full_name_ar || '—'}</p>
                    <p className="text-xs text-muted-foreground">{row.employee?.employee_number}</p>
                </div>
            ),
        },
        {
            id: 'type',
            header: isRTL ? 'نوع العقد' : 'Type',
            width: 'w-24',
            cell: (row) => (
                <span className="text-sm">{typeConfig[row.contract_type || 'permanent']}</span>
            ),
        },
        {
            id: 'salary',
            header: isRTL ? 'الراتب' : 'Salary',
            width: 'w-28',
            align: 'end',
            cell: (row) => (
                <span className="font-mono text-sm font-semibold">
                    {row.basic_salary ? Number(row.basic_salary).toLocaleString() : '—'}
                </span>
            ),
        },
        {
            id: 'start_date',
            header: isRTL ? 'من' : 'From',
            width: 'w-28',
            sortable: true,
            sortKey: 'start_date',
            cell: (row) => (
                <span className="text-sm">{row.start_date ? new Date(row.start_date).toLocaleDateString() : '—'}</span>
            ),
        },
        {
            id: 'end_date',
            header: isRTL ? 'إلى' : 'To',
            width: 'w-28',
            cell: (row) => (
                <div className="flex items-center gap-1">
                    <span className="text-sm">{row.end_date ? new Date(row.end_date).toLocaleDateString() : '—'}</span>
                    {isExpiringSoon(row.end_date) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                </div>
            ),
        },
        {
            id: 'status',
            header: isRTL ? 'الحالة' : 'Status',
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = statusConfig[row.status || 'draft'];
                return <Badge className={st?.className}>{st?.label}</Badge>;
            },
        },
    ];

    const getRowAccent = (row: EmployeeContract) => {
        if (isExpiringSoon(row.end_date)) return 'border-s-amber-400';
        switch (row.status) {
            case 'active': return 'border-s-emerald-400';
            case 'expired': return 'border-s-red-400';
            case 'terminated': return 'border-s-orange-400';
            default: return 'border-s-gray-300';
        }
    };

    return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                        {isRTL ? 'إدارة العقود' : 'Contract Management'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isRTL ? `${contracts.length} عقد` : `${contracts.length} contracts`}
                    </p>
                </div>
                <Button className="bg-erp-primary hover:bg-erp-primary/90">
                    <FilePlus className="h-4 w-4 me-2" />
                    {isRTL ? 'عقد جديد' : 'New Contract'}
                </Button>
            </div>

            <NexaListTable
                data={filteredData}
                columns={columns}
                searchTerm={search}
                onSearchChange={setSearch}
                searchPlaceholder={isRTL ? 'بحث عن عقد...' : 'Search contracts...'}
                isLoading={loading}
                isRTL={isRTL}
                direction={isRTL ? 'rtl' : 'ltr'}
                totalCount={contracts.length}
                countLabel={isRTL ? 'عقد' : 'contracts'}
                getRowKey={(row) => row.id}
                getRowAccent={getRowAccent}
                filters={filters}
                hasActiveFilters={statusFilter !== 'all'}
                onClearFilters={() => setStatusFilter('all')}
                emptyMessage={isRTL ? 'لا توجد عقود' : 'No contracts found'}
            />
        </div>
    );
}
