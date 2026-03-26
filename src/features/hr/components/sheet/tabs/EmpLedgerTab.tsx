/**
 * ════════════════════════════════════════════════════════════════
 * 📊 EmpLedgerTab — كشف حساب الموظف  
 * مستوحى من LedgerTab في شيت الجهات (الموردين/العملاء)
 * 
 * فلاتر:
 *   🔵 الكل | 💰 الرواتب | ⭐ الحوافز والعمولات | 🔴 الخصومات | 💵 الدفعات  
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
    Filter, Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Props {
    data: any;
    isRTL: boolean;
}

interface LedgerEntry {
    id: string;
    date: string;
    type: 'salary' | 'bonus' | 'commission' | 'deduction' | 'advance' | 'payment';
    description: string;
    debit: number;
    credit: number;
    balance: number;
    reference?: string;
    status?: string;
}

type FilterType = 'all' | 'salary' | 'bonus' | 'deduction' | 'payment';

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

const TYPE_CONFIG: Record<string, { labelAr: string; labelEn: string; className: string; icon: React.ElementType }> = {
    salary: { labelAr: 'راتب', labelEn: 'Salary', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: DollarSign },
    bonus: { labelAr: 'حافز', labelEn: 'Bonus', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: TrendingUp },
    commission: { labelAr: 'عمولة', labelEn: 'Commission', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: TrendingUp },
    deduction: { labelAr: 'خصم', labelEn: 'Deduction', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: TrendingDown },
    advance: { labelAr: 'سلفة', labelEn: 'Advance', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: ArrowUpRight },
    payment: { labelAr: 'دفعة', labelEn: 'Payment', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: ArrowDownRight },
};

const FILTER_CONFIG: { id: FilterType; labelAr: string; labelEn: string; icon: React.ElementType; color: string }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', icon: Filter, color: '' },
    { id: 'salary', labelAr: 'الرواتب', labelEn: 'Salaries', icon: DollarSign, color: 'text-emerald-600' },
    { id: 'bonus', labelAr: 'الحوافز والعمولات', labelEn: 'Bonuses', icon: TrendingUp, color: 'text-blue-600' },
    { id: 'deduction', labelAr: 'الخصومات والسلف', labelEn: 'Deductions', icon: TrendingDown, color: 'text-red-600' },
    { id: 'payment', labelAr: 'الدفعات', labelEn: 'Payments', icon: ArrowDownRight, color: 'text-indigo-600' },
];

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function EmpLedgerTab({ data, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [loading, setLoading] = useState(true);
    const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');

    // ═══ Load Ledger ═══
    useEffect(() => {
        if (!data?.id) return;
        loadLedger();
    }, [data?.id]);

    async function loadLedger() {
        try {
            setLoading(true);

            // Fetch payroll entries for this employee
            const { data: payrollData, error } = await supabase
                .from('payroll_entries')
                .select(`
                    id, basic_salary, total_earnings, total_deductions, net_salary,
                    overtime_amount, bonus_amount, status, created_at,
                    payroll_periods!inner(period_name, period_year, period_month, start_date, payment_date)
                `)
                .eq('employee_id', data.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Convert to ledger entries with running balance
            let balance = 0;
            const entries: LedgerEntry[] = [];

            (payrollData || []).forEach((pe: any) => {
                const period = pe.payroll_periods;
                const dateStr = period?.payment_date || period?.start_date || pe.created_at;

                // 1. Net salary
                if (pe.net_salary > 0) {
                    balance += pe.net_salary;
                    entries.push({
                        id: `sal-${pe.id}`,
                        date: dateStr,
                        type: 'salary',
                        description: `${t('راتب', 'Salary')} ${period?.period_name || ''}`,
                        debit: 0,
                        credit: pe.net_salary,
                        balance,
                        reference: period?.period_name,
                        status: pe.status,
                    });
                }

                // 2. Bonuses
                if (pe.bonus_amount > 0) {
                    balance += pe.bonus_amount;
                    entries.push({
                        id: `bonus-${pe.id}`,
                        date: dateStr,
                        type: 'bonus',
                        description: `${t('حافز', 'Bonus')} — ${period?.period_name || ''}`,
                        debit: 0,
                        credit: pe.bonus_amount,
                        balance,
                        reference: period?.period_name,
                    });
                }

                // 3. Overtime
                if (pe.overtime_amount > 0) {
                    balance += pe.overtime_amount;
                    entries.push({
                        id: `ot-${pe.id}`,
                        date: dateStr,
                        type: 'commission',
                        description: `${t('ساعات إضافية', 'Overtime')} — ${period?.period_name || ''}`,
                        debit: 0,
                        credit: pe.overtime_amount,
                        balance,
                    });
                }

                // 4. Deductions
                if (pe.total_deductions > 0) {
                    balance -= pe.total_deductions;
                    entries.push({
                        id: `ded-${pe.id}`,
                        date: dateStr,
                        type: 'deduction',
                        description: `${t('خصومات', 'Deductions')} — ${period?.period_name || ''}`,
                        debit: pe.total_deductions,
                        credit: 0,
                        balance,
                        reference: period?.period_name,
                    });
                }
            });

            setAllEntries(entries);
        } catch (err) {
            console.error('Error loading employee ledger:', err);
        } finally {
            setLoading(false);
        }
    }

    // ═══ Filtered entries ═══
    const filteredEntries = useMemo(() => {
        if (filter === 'all') return allEntries;
        const typeMap: Record<FilterType, string[]> = {
            all: [],
            salary: ['salary'],
            bonus: ['bonus', 'commission'],
            deduction: ['deduction', 'advance'],
            payment: ['payment'],
        };
        return allEntries.filter(e => typeMap[filter]?.includes(e.type));
    }, [allEntries, filter]);

    // ═══ Stats ═══
    const totalCredit = allEntries.reduce((s, e) => s + e.credit, 0);
    const totalDebit = allEntries.reduce((s, e) => s + e.debit, 0);
    const currentBalance = allEntries.length > 0 ? allEntries[allEntries.length - 1].balance : 0;

    // ═══ Columns ═══
    const columns: NexaListColumn<LedgerEntry>[] = [
        {
            id: 'date',
            header: t('التاريخ', 'Date'),
            width: 'w-24',
            cell: (row) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {new Date(row.date).toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </span>
            ),
        },
        {
            id: 'type',
            header: t('النوع', 'Type'),
            width: 'w-24',
            align: 'center',
            cell: (row) => {
                const cfg = TYPE_CONFIG[row.type];
                return <Badge className={`text-[10px] px-1.5 py-0 ${cfg?.className}`}>{isRTL ? cfg?.labelAr : cfg?.labelEn}</Badge>;
            },
        },
        {
            id: 'description',
            header: t('البيان', 'Description'),
            width: 'min-w-[180px]',
            cell: (row) => (
                <div>
                    <span className="text-sm">{row.description}</span>
                    {row.status && row.status !== 'paid' && (
                        <Badge variant="outline" className="text-[9px] ms-1.5">{row.status}</Badge>
                    )}
                </div>
            ),
        },
        {
            id: 'debit',
            header: t('مدين (خصم)', 'Debit'),
            width: 'w-24',
            align: 'end',
            cell: (row) => row.debit > 0
                ? <span className="font-mono text-sm text-red-600 font-medium">{row.debit.toLocaleString()}</span>
                : <span className="text-muted-foreground/30">—</span>,
        },
        {
            id: 'credit',
            header: t('دائن (مستحق)', 'Credit'),
            width: 'w-24',
            align: 'end',
            cell: (row) => row.credit > 0
                ? <span className="font-mono text-sm text-emerald-600 font-medium">{row.credit.toLocaleString()}</span>
                : <span className="text-muted-foreground/30">—</span>,
        },
        {
            id: 'balance',
            header: t('الرصيد', 'Balance'),
            width: 'w-28',
            align: 'end',
            cell: (row) => (
                <span className={`font-mono text-sm font-bold ${row.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {row.balance.toLocaleString()}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ═══ Stats Cards ═══ */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <ArrowDownRight className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('إجمالي المستحقات', 'Total Credits')}</p>
                            <p className="text-lg font-bold font-mono text-emerald-600">{totalCredit.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <ArrowUpRight className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('إجمالي الخصومات', 'Total Debits')}</p>
                            <p className="text-lg font-bold font-mono text-red-600">{totalDebit.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('الرصيد الحالي', 'Balance')}</p>
                            <p className={`text-lg font-bold font-mono ${currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {currentBalance.toLocaleString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Filter Bar ═══ */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-lg border">
                {FILTER_CONFIG.map(f => {
                    const Icon = f.icon;
                    const isActive = filter === f.id;
                    return (
                        <Button
                            key={f.id}
                            variant={isActive ? 'default' : 'ghost'}
                            size="sm"
                            className={`h-8 text-xs gap-1.5 flex-1 ${isActive ? '' : f.color}`}
                            onClick={() => setFilter(f.id)}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {isRTL ? f.labelAr : f.labelEn}
                            {isActive && <Badge variant="secondary" className="text-[10px] px-1 py-0 ms-1">{filteredEntries.length}</Badge>}
                        </Button>
                    );
                })}
            </div>

            {/* ═══ Ledger Table ═══ */}
            <NexaListTable
                data={filteredEntries}
                columns={columns}
                isLoading={loading}
                isRTL={isRTL}
                direction={isRTL ? 'rtl' : 'ltr'}
                totalCount={filteredEntries.length}
                countLabel={t('حركة', 'entries')}
                getRowKey={(row) => row.id}
                emptyMessage={t('لا توجد حركات مالية', 'No financial transactions')}
                getRowAccent={(row) =>
                    row.type === 'salary' ? 'border-s-emerald-400' :
                        row.type === 'bonus' || row.type === 'commission' ? 'border-s-blue-400' :
                            row.type === 'deduction' ? 'border-s-red-400' :
                                'border-s-gray-300'
                }
                footerRightContent={
                    <span className="font-mono font-semibold text-sm">
                        {t('الرصيد: ', 'Balance: ')}
                        <span className={currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {currentBalance.toLocaleString()}
                        </span>
                    </span>
                }
            />
        </div>
    );
}
