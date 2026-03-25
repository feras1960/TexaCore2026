/**
 * 📜 EmpContractsTab — عقود الموظف
 */

import { useState, useEffect } from 'react';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { getContracts, type Contract } from '../../../services/hrService';

interface Props { employeeId?: string; isRTL: boolean; }

const STATUS_CONFIG: Record<string, { ar: string; en: string; className: string }> = {
    draft: { ar: 'مسودة', en: 'Draft', className: 'bg-gray-100 text-gray-600' },
    active: { ar: 'ساري', en: 'Active', className: 'bg-emerald-100 text-emerald-700' },
    expired: { ar: 'منتهي', en: 'Expired', className: 'bg-red-100 text-red-700' },
    terminated: { ar: 'ملغى', en: 'Terminated', className: 'bg-orange-100 text-orange-700' },
    renewed: { ar: 'مجدد', en: 'Renewed', className: 'bg-blue-100 text-blue-700' },
};

const CONTRACT_TYPES: Record<string, { ar: string; en: string }> = {
    permanent: { ar: 'دائم', en: 'Permanent' },
    fixed_term: { ar: 'محدد المدة', en: 'Fixed Term' },
    probation: { ar: 'تجربة', en: 'Probation' },
    temporary: { ar: 'مؤقت', en: 'Temporary' },
    freelance: { ar: 'حر', en: 'Freelance' },
};

export default function EmpContractsTab({ employeeId, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState<Contract[]>([]);

    useEffect(() => {
        if (!employeeId) return;
        loadContracts();
    }, [employeeId]);

    async function loadContracts() {
        try {
            setLoading(true);
            const all = await getContracts();
            setContracts(all.filter((c: any) => c.employee_id === employeeId));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const activeContract = contracts.find(c => c.status === 'active');

    const columns: NexaListColumn<Contract>[] = [
        {
            id: 'contract_number',
            header: t('رقم العقد', 'Contract #'),
            width: 'w-28',
            cell: (row) => <span className="font-mono text-sm">{row.contract_number || '—'}</span>,
        },
        {
            id: 'contract_type',
            header: t('النوع', 'Type'),
            width: 'w-28',
            cell: (row) => <span className="text-sm">{CONTRACT_TYPES[row.contract_type]?.[isRTL ? 'ar' : 'en'] || row.contract_type}</span>,
        },
        {
            id: 'dates',
            header: t('الفترة', 'Period'),
            width: 'min-w-[140px]',
            cell: (row) => (
                <div className="text-xs font-mono">
                    <span>{new Date(row.start_date).toLocaleDateString()}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span>{row.end_date ? new Date(row.end_date).toLocaleDateString() : t('مفتوح', 'Open')}</span>
                </div>
            ),
        },
        {
            id: 'basic_salary',
            header: t('الراتب الأساسي', 'Basic Salary'),
            width: 'w-28',
            align: 'end',
            cell: (row) => <span className="font-mono">{row.basic_salary?.toLocaleString()}</span>,
        },
        {
            id: 'status',
            header: t('الحالة', 'Status'),
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const st = STATUS_CONFIG[row.status];
                return <Badge className={st?.className}>{isRTL ? st?.ar : st?.en}</Badge>;
            },
        },
    ];

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Current Contract Highlight */}
            {activeContract && (
                <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700">{t('العقد الحالي', 'Current Contract')}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div><span className="text-xs text-muted-foreground">{t('النوع', 'Type')}</span><p className="font-medium">{CONTRACT_TYPES[activeContract.contract_type]?.[isRTL ? 'ar' : 'en']}</p></div>
                            <div><span className="text-xs text-muted-foreground">{t('من', 'From')}</span><p className="font-mono">{new Date(activeContract.start_date).toLocaleDateString()}</p></div>
                            <div><span className="text-xs text-muted-foreground">{t('إلى', 'To')}</span><p className="font-mono">{activeContract.end_date ? new Date(activeContract.end_date).toLocaleDateString() : t('مفتوح', 'Open')}</p></div>
                            <div><span className="text-xs text-muted-foreground">{t('الراتب', 'Salary')}</span><p className="font-mono font-bold">{activeContract.basic_salary?.toLocaleString()}</p></div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <NexaListTable
                data={contracts}
                columns={columns}
                isLoading={loading}
                isRTL={isRTL}
                direction={isRTL ? 'rtl' : 'ltr'}
                totalCount={contracts.length}
                countLabel={t('عقد', 'contracts')}
                getRowKey={(row) => row.id}
                emptyMessage={t('لا توجد عقود', 'No contracts')}
                getRowAccent={(row) => row.status === 'active' ? 'border-s-emerald-400' : row.status === 'expired' ? 'border-s-red-400' : 'border-s-gray-300'}
            />
        </div>
    );
}
