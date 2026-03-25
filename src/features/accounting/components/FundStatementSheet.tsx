import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Account } from '@/services/accountsService';
import { accountLedgerService } from '@/services/accountLedgerService';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { supabase } from '@/lib/supabase';
import { format, startOfMonth } from 'date-fns';
import { Loader2, Printer } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { DataTable, Column } from './shared/DataTable';
import { Badge } from "@/components/ui/badge";

interface FundStatementSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    fund: Account;
}

export function FundStatementSheet({ isOpen, onOpenChange, fund }: FundStatementSheetProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';

    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });
    const [realTimeBalance, setRealTimeBalance] = useState<number | null>(null);

    // Fetch Transactions
    useEffect(() => {
        if (!isOpen || !fund.id || !dateRange?.from) return;

        const fetchTransactions = async () => {
            setIsLoading(true);
            try {
                // 0. Fetch Real-time Balance Stats (For Header)
                const stats = await accountLedgerService.getStats(fund.id, fund.company_id);
                setRealTimeBalance(stats.currentBalance);

                // 1. Calculate Previous Balance
                let previousBalance = Number(stats.openingBalance || 0);

                if (dateRange.from) {
                    const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
                    const { data: prevData, error: prevError } = await supabase
                        .from('journal_entry_lines')
                        .select('debit, credit, journal_entries!inner(entry_date)')
                        .eq('account_id', fund.id)
                        .eq('journal_entries.is_posted', true)
                        .lt('journal_entries.entry_date', startDateStr);

                    if (prevError) throw prevError;

                    if (prevData) {
                        prevData.forEach((row: any) => {
                            previousBalance += (Number(row.debit || 0) - Number(row.credit || 0));
                        });
                    }
                }

                // 2. Fetch Transactions within range
                let query = supabase
                    .from('journal_entry_lines')
                    .select(`
                        id,
                        debit,
                        credit,
                        description,
                        created_at,
                        journal_entries!inner (
                            id,
                            entry_number,
                            entry_date,
                            description,
                            description,
                            status,
                            entry_type,
                            is_posted
                        )
                    `)
                    .eq('account_id', fund.id)
                    .eq('journal_entries.is_posted', true)
                    .order('journal_entries(entry_date)', { ascending: true });

                if (dateRange.from) {
                    query = query.gte('journal_entries.entry_date', format(dateRange.from, 'yyyy-MM-dd'));
                }
                if (dateRange.to) {
                    query = query.lte('journal_entries.entry_date', format(dateRange.to, 'yyyy-MM-dd'));
                }

                const { data: currentData, error: currentError } = await query;
                if (currentError) throw currentError;

                // 3. Process Data & Calculate Running Balance
                let runningBalance = previousBalance;

                // Create "Previous Balance" row
                const previousBalanceRow = {
                    id: 'prev-bal',
                    date: null,
                    description: t('accounting.previous_balance') || 'Previous Balance',
                    ref: '',
                    type: '',
                    debit: 0,
                    credit: 0,
                    runningBalance: previousBalance,
                    isBalanceRow: true
                };

                const processedRows = (currentData || []).map((row: any) => {
                    const debit = Number(row.debit || 0);
                    const credit = Number(row.credit || 0);
                    const balChange = debit - credit;
                    runningBalance += balChange;

                    return {
                        id: row.id,
                        date: row.journal_entries?.entry_date,
                        ref: row.journal_entries?.entry_number,
                        description: row.description || row.journal_entries?.description,
                        type: row.journal_entries?.entry_type,
                        debit,
                        credit,
                        runningBalance,
                        isBalanceRow: false
                    };
                });

                setTransactions([previousBalanceRow, ...processedRows]);

            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [isOpen, fund.id, dateRange]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const columns: Column<any>[] = useMemo(() => [
        {
            header: t('common.date'),
            cell: (row) => row.date ? format(new Date(row.date), 'yyyy/MM/dd') : ''
        },
        {
            header: t('common.description'),
            cell: (row) => (
                <span className={row.isBalanceRow ? 'font-bold text-red-600' : ''}>
                    {row.description}
                </span>
            )
        },
        {
            header: t('accounting.reference'),
            accessorKey: 'ref',
            className: 'font-mono text-xs'
        },
        {
            header: t('accounting.debit'),
            cell: (row) => row.debit ? formatCurrency(row.debit) : '-',
            className: 'font-mono text-end'
        },
        {
            header: t('accounting.credit'),
            cell: (row) => row.credit ? formatCurrency(row.credit) : '-',
            className: 'font-mono text-end'
        },
        {
            header: t('accounting.balance'),
            cell: (row) => (
                <span className={`font-bold font-mono ${row.isBalanceRow ? 'text-red-700' : ''}`}>
                    {formatCurrency(row.runningBalance)}
                </span>
            ),
            className: 'bg-green-50/50 dark:bg-green-900/10 text-end'
        }
    ], [t]);

    const currentBalance = realTimeBalance !== null ? realTimeBalance : (fund.current_balance || 0);
    const lastRowBalance = transactions.length > 0 ? transactions[transactions.length - 1].runningBalance : 0;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side={isRTL ? "left" : "right"} className="w-full sm:max-w-4xl flex flex-col h-full p-0">

                {/* Header */}
                <div className="p-6 border-b bg-muted/30">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                                {language === 'ar' ? fund.name_ar : fund.name_en}
                            </SheetTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="font-mono">{fund.code}</Badge>
                                <span className="text-sm text-muted-foreground">{fund.currency}</span>
                            </div>
                        </div>
                        <div className="text-end">
                            <p className="text-sm text-muted-foreground">{t('accounting.current_balance')}</p>
                            <p className={`text-2xl font-bold font-mono ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(currentBalance)} <span className="text-sm text-muted-foreground">{fund.currency}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <DateRangePicker
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full sm:w-auto"
                        />
                        <Button variant="outline" size="icon">
                            <Printer className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-card p-4">
                    <DataTable
                        data={transactions}
                        columns={columns}
                        loading={isLoading}
                        searchKey="description"
                        searchPlaceholder={t('common.search')}
                        rowClassName={(row) => row.isBalanceRow ? 'bg-red-50 dark:bg-red-900/10' : ''}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30">
                    <div className="flex justify-end items-center gap-2 text-sm font-medium">
                        <span>{t('accounting.closing_balance')}:</span>
                        <span className={`text-lg font-bold font-mono ${lastRowBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(lastRowBalance)}
                        </span>
                        <span className="text-muted-foreground">{fund.currency}</span>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}
