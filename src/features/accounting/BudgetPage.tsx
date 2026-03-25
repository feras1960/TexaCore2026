import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    PieChart, Plus, Calculator, AlertTriangle, CheckCircle2,
    Loader2, Search, Calendar, TrendingUp, TrendingDown,
    Edit, DollarSign, BarChart3, FileText, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

// Shared Components
import { AccountingPageHeader } from './components/shared/AccountingPageHeader';
import { AccountingStatsCard } from './components/shared/AccountingStatsCard';
import { StatusBadge } from './components/shared/StatusBadge';
import { DataTable, Column } from './components/shared/DataTable';

// Types
interface Budget {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    description?: string;
    budget_type: 'revenue' | 'expense' | 'capital' | 'cash_flow' | 'comprehensive';
    start_date: string;
    end_date: string;
    total_budgeted: number;
    total_actual: number;
    total_variance: number;
    variance_percent?: number;
    status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'closed' | 'cancelled';
    currency: string;
    created_at: string;
}

interface BudgetLine {
    id: string;
    budget_id: string;
    account_id: string;
    account_name?: string;
    account_code?: string;
    period: string;
    budgeted_amount: number;
    actual_amount: number;
    committed_amount: number;
    available_amount: number;
    variance: number;
    variance_percent?: number;
}

interface BudgetAlert {
    id: string;
    budget_id: string;
    alert_type: string;
    severity: 'info' | 'warning' | 'danger' | 'critical';
    message_ar: string;
    message_en: string;
    current_percent: number;
    is_active: boolean;
    triggered_at: string;
}

export default function BudgetPage() {
    const { t, language, direction } = useLanguage();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Load data
    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // ⚡ Parallel fetch: budgets + alerts
                const [budgetsRes, alertsRes] = await Promise.all([
                    supabase.from('budgets').select('*').order('created_at', { ascending: false }),
                    supabase.from('budget_alerts').select('*').eq('is_active', true).order('triggered_at', { ascending: false }).limit(10),
                ]);
                setBudgets(budgetsRes.data || []);
                if (alertsRes.data) setAlerts(alertsRes.data);
            } catch (error) {
                console.warn('Budget table not available:', error);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    const loadBudgetLines = async (budgetId: string) => {
        try {
            const { data } = await supabase
                .from('budget_lines')
                .select(`
          *,
          chart_of_accounts (
            account_code,
            name_ar,
            name_en
          )
        `)
                .eq('budget_id', budgetId)
                .order('period');

            if (data) {
                setBudgetLines(data.map(line => ({
                    ...line,
                    account_name: language === 'ar' ? line.chart_of_accounts?.name_ar : line.chart_of_accounts?.name_en,
                    account_code: line.chart_of_accounts?.account_code,
                })));
            }
        } catch (error) {
            console.error('Error loading budget lines:', error);
        }
    };

    // Filter budgets
    const filteredBudgets = useMemo(() => {
        return budgets.filter(budget => {
            const matchesSearch =
                budget.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                budget.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                budget.code?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;
            const matchesType = typeFilter === 'all' || budget.budget_type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [budgets, searchQuery, statusFilter, typeFilter]);

    // Stats
    const stats = useMemo(() => {
        const activeBudgets = budgets.filter(b => b.status === 'active');
        const totalBudgeted = activeBudgets.reduce((sum, b) => sum + (b.total_budgeted || 0), 0);
        const totalActual = activeBudgets.reduce((sum, b) => sum + (b.total_actual || 0), 0);
        const totalVariance = totalActual - totalBudgeted;
        const variancePercent = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

        return { totalBudgeted, totalActual, totalVariance, variancePercent, activeCount: activeBudgets.length };
    }, [budgets]);

    const getBudgetTypeLabel = (type: string) => {
        return t(`budgetPage.types.${type}`) || type;
    };

    const formatCurrency = (amount: number, currency = '') => {
        const validCurrency = currency && currency.length === 3 ? currency : 'USD';
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: validCurrency,
                minimumFractionDigits: 2,
            }).format(amount);
        } catch {
            return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${validCurrency}`;
        }
    };

    const handleViewDetails = (budget: Budget) => {
        setSelectedBudget(budget);
        loadBudgetLines(budget.id);
        setIsDetailsOpen(true);
    };

    const lineColumns: Column<BudgetLine>[] = useMemo(() => [
        {
            header: t('common.account'),
            cell: (row) => (
                <div>
                    <p className="font-medium text-sm">{row.account_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{row.account_code}</p>
                </div>
            )
        },
        {
            header: t('budgetPage.columns.period'),
            accessorKey: 'period',
            className: 'text-xs text-muted-foreground'
        },
        {
            header: t('budgetPage.columns.budgeted'),
            cell: (row) => <span className="font-mono text-xs">{formatCurrency(row.budgeted_amount)}</span>,
            className: 'text-end'
        },
        {
            header: t('budgetPage.columns.actual'),
            cell: (row) => <span className="font-mono text-xs text-green-600 font-bold">{formatCurrency(row.actual_amount)}</span>,
            className: 'text-end'
        },
        {
            header: t('budgetPage.columns.available'),
            cell: (row) => <span className={`font-mono text-xs font-bold ${row.available_amount < 0 ? 'text-red-600' : ''}`}>{formatCurrency(row.available_amount)}</span>,
            className: 'text-end'
        },
        {
            header: t('budgetPage.columns.usage'),
            cell: (row) => {
                const lineUsage = row.budgeted_amount > 0 ? (row.actual_amount / row.budgeted_amount) * 100 : 0;
                return (
                    <div className="w-[80px]">
                        <Progress value={Math.min(lineUsage, 100)} className={`h-1.5 ${lineUsage > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-erp-teal'}`} />
                        <span className={`text-[10px] ${lineUsage > 100 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>{lineUsage.toFixed(0)}%</span>
                    </div>
                )
            }
        }
    ], [t]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-erp-teal" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>

            <AccountingPageHeader
                title={t('budgetPage.title')}
                description={t('budgetPage.description')}
            >
                <Button onClick={() => setIsFormOpen(true)} className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
                    <Plus className="w-4 h-4" />
                    {t('budgetPage.newBudget')}
                </Button>
            </AccountingPageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AccountingStatsCard
                    title={t('budgetPage.stats.totalBudgeted')}
                    value={formatCurrency(stats.totalBudgeted)}
                    icon={PieChart}
                    variant="blue"
                />
                <AccountingStatsCard
                    title={t('budgetPage.stats.totalActual')}
                    value={formatCurrency(stats.totalActual)}
                    icon={DollarSign}
                    variant="green"
                />
                <AccountingStatsCard
                    title={t('budgetPage.stats.variance')}
                    value={formatCurrency(Math.abs(stats.totalVariance))}
                    icon={stats.totalVariance >= 0 ? TrendingUp : TrendingDown}
                    variant={stats.totalVariance >= 0 ? 'red' : 'green'}
                    description={t('budgetPage.stats.varianceDesc')}
                />
                <AccountingStatsCard
                    title={t('budgetPage.stats.activeCount')}
                    value={stats.activeCount}
                    icon={BarChart3}
                    variant="purple"
                />
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200">
                    <Bell className="h-4 w-4" />
                    <AlertTitle>{t('budgetPage.alerts.title')}</AlertTitle>
                    <AlertDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {alerts.slice(0, 3).map(alert => (
                                <StatusBadge key={alert.id} status={alert.severity} customLabel={language === 'ar' ? alert.message_ar : alert.message_en} variant="destructive" />
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border">
                <div className="flex-1 relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder={t('common.status._')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('common.all')}</SelectItem>
                        <SelectItem value="draft">{t('common.status.draft')}</SelectItem>
                        <SelectItem value="active">{t('common.status.active')}</SelectItem>
                        <SelectItem value="closed">{t('common.status.closed')}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder={t('budgetPage.filters.type')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('common.all')}</SelectItem>
                        <SelectItem value="expense">{t('budgetPage.types.expense')}</SelectItem>
                        <SelectItem value="revenue">{t('budgetPage.types.revenue')}</SelectItem>
                        <SelectItem value="capital">{t('budgetPage.types.capital')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Budgets Grid */}
            {filteredBudgets.length === 0 ? (
                <Card className="py-12 border-dashed">
                    <CardContent className="text-center">
                        <Calculator className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">
                            {t('budgetPage.noBudgets')}
                        </h3>
                        <Button onClick={() => setIsFormOpen(true)} className="mt-4 gap-2">
                            <Plus className="w-4 h-4" />
                            {t('budgetPage.newBudget')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBudgets.map((budget, index) => {
                        const usagePercent = budget.total_budgeted > 0
                            ? Math.min((budget.total_actual / budget.total_budgeted) * 100, 120)
                            : 0;
                        const isOverBudget = usagePercent > 100;

                        return (
                            <motion.div
                                key={budget.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col"
                                    onClick={() => handleViewDetails(budget)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <CardTitle className="text-lg group-hover:text-erp-teal transition-colors line-clamp-1">
                                                    {language === 'ar' ? budget.name_ar : budget.name_en}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs">{budget.start_date} → {budget.end_date}</span>
                                                </CardDescription>
                                            </div>
                                            <StatusBadge status={budget.status} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{getBudgetTypeLabel(budget.budget_type)}</span>
                                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{budget.currency}</span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('budgetPage.stats.totalBudgeted')}</span>
                                                <span className="font-semibold">{formatCurrency(budget.total_budgeted, budget.currency)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('budgetPage.stats.totalActual')}</span>
                                                <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(budget.total_actual, budget.currency)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{t('budgetPage.columns.usage')}</span>
                                                <span className={isOverBudget ? 'text-red-600 font-bold' : ''}>
                                                    {usagePercent.toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={Math.min(usagePercent, 100)}
                                                className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-erp-teal'}`}
                                            />
                                        </div>

                                        {isOverBudget && (
                                            <div className="flex items-center gap-2 text-red-600 text-xs">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>{t('budgetPage.alerts.overBudget')}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Budget Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side={direction === 'rtl' ? 'left' : 'right'}>
                    {selectedBudget && (
                        <div className="flex flex-col h-full">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="flex items-center gap-3 text-xl">
                                    <Calculator className="w-6 h-6 text-erp-teal" />
                                    {language === 'ar' ? selectedBudget.name_ar : selectedBudget.name_en}
                                </SheetTitle>
                                <SheetDescription>
                                    {selectedBudget.start_date} → {selectedBudget.end_date}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6 flex-1 overflow-auto px-1">
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <p className="text-xs text-blue-600">{t('budgetPage.stats.totalBudgeted')}</p>
                                        <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedBudget.total_budgeted)}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                                        <p className="text-xs text-green-600">{t('budgetPage.stats.totalActual')}</p>
                                        <p className="text-lg font-bold text-green-700">{formatCurrency(selectedBudget.total_actual)}</p>
                                    </div>
                                    <div className={`text-center p-3 rounded-lg border ${selectedBudget.total_variance >= 0
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                                        }`}>
                                        <p className={`text-xs ${selectedBudget.total_variance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {t('budgetPage.stats.variance')}
                                        </p>
                                        <p className={`text-lg font-bold ${selectedBudget.total_variance >= 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {formatCurrency(Math.abs(selectedBudget.total_variance))}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Budget Lines DataTable */}
                                <div>
                                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        {t('budgetPage.lines')}
                                    </h4>

                                    <DataTable
                                        data={budgetLines}
                                        columns={lineColumns}
                                        emptyMessage={t('budgetPage.noLines')}
                                    />
                                </div>
                            </div>

                            <SheetFooter className="mt-6 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                                    {t('common.close')}
                                </Button>
                                <Button className="gap-2 bg-erp-teal">
                                    <Edit className="w-4 h-4" />
                                    {t('common.edit')}
                                </Button>
                            </SheetFooter>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* New Budget Form Sheet */}
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side={direction === 'rtl' ? 'left' : 'right'}>
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-3">
                            <Plus className="w-6 h-6 text-erp-teal" />
                            {t('budgetPage.newBudget')}
                        </SheetTitle>
                        <SheetDescription>
                            {t('budgetPage.newBudgetDesc')}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>{t('common.nameAr')}</Label>
                            <Input placeholder={t('budgetPage.placeholders.nameAr')} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('common.nameEn')}</Label>
                            <Input placeholder={t('budgetPage.placeholders.nameEn')} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('budgetPage.filters.type')}</Label>
                            <Select defaultValue="expense">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">{t('budgetPage.types.expense')}</SelectItem>
                                    <SelectItem value="revenue">{t('budgetPage.types.revenue')}</SelectItem>
                                    <SelectItem value="capital">{t('budgetPage.types.capital')}</SelectItem>
                                    <SelectItem value="comprehensive">{t('budgetPage.types.comprehensive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('budgetPage.startDate')}</Label>
                                <Input type="date" defaultValue="2026-01-01" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('budgetPage.endDate')}</Label>
                                <Input type="date" defaultValue="2026-12-31" />
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button className="gap-2 bg-erp-teal">
                            <CheckCircle2 className="w-4 h-4" />
                            {t('common.create')}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
