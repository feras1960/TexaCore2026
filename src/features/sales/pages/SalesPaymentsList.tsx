
import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Calendar, DollarSign } from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay } from 'date-fns';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';

export default function SalesPaymentsList() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const { currencyCode: companyCurrency } = useCompanyCurrency(language as 'ar' | 'en');

    // State
    const [activeTab, setActiveTab] = useState('all');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('view');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // Fetch Receipts from journal_entries (entry_type = 'receipt')
    const { data: paymentsRaw = [], isLoading: isLoadingPayments, error: errorPayments, refetch } = useCachedQuery({
        queryKey: ['sales_payments_list', companyId, activeTab, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('journal_entries')
                .select('id, entry_number, entry_date, status, total_debit, currency, notes, description, description_ar, reference_type, reference_id')
                .eq('company_id', companyId)
                .eq('entry_type', 'receipt')
                .order('entry_date', { ascending: false });

            if (activeTab !== 'all') {
                query = query.eq('status', activeTab);
            }
            if (dateRange?.from) {
                query = query.gte('entry_date', dateRange.from.toISOString().split('T')[0]);
            }
            if (dateRange?.to) {
                query = query.lte('entry_date', endOfDay(dateRange.to).toISOString().split('T')[0]);
            }

            const { data: entries, error } = await query;
            if (error) {
                console.error('[SalesPaymentsList] Fetch failed:', error);
                return [];
            }
            if (!entries?.length) return [];

            // Step 2: fetch entry lines — get customer account + ACTUAL amount (credit_fc = original currency amount)
            const entryIds = entries.map((e: any) => e.id);
            const { data: lines } = await supabase
                .from('journal_entry_lines')
                .select('entry_id, account_id, credit, credit_fc, currency, exchange_rate, is_fund_line')
                .in('entry_id', entryIds)
                .gt('credit', 0);

            // Step 3: find customer accounts from chart_of_accounts by party_type
            const customerLines = (lines || []).filter((l: any) => !l.is_fund_line);
            const accountIds = [...new Set(customerLines.map((l: any) => l.account_id).filter(Boolean))];
            let accountPartyMap: Record<string, string> = {};
            if (accountIds.length > 0) {
                const { data: accounts } = await supabase
                    .from('chart_of_accounts')
                    .select('id, party_id, party_type')
                    .in('id', accountIds)
                    .eq('party_type', 'customer');
                (accounts || []).forEach((a: any) => { if (a.party_id) accountPartyMap[a.id] = a.party_id; });
            }

            // Build entry_id → { customer_id, amount, currency } map
            const entryCustomerMap: Record<string, string> = {};
            const entryAmountMap: Record<string, { amount: number; currency: string }> = {};
            customerLines.forEach((l: any) => {
                const customerId = accountPartyMap[l.account_id];
                if (customerId && !entryCustomerMap[l.entry_id]) {
                    entryCustomerMap[l.entry_id] = customerId;
                }
                if (!entryAmountMap[l.entry_id]) {
                    // Use credit_fc (original currency amount) if exchange rate > 1, else use credit (local)
                    const rate = Number(l.exchange_rate) || 1;
                    const isFC = rate > 1 && Number(l.credit_fc) > 0;
                    entryAmountMap[l.entry_id] = {
                        amount: isFC ? Number(l.credit_fc) : Number(l.credit),
                        currency: l.currency || '',
                    };
                }
            });

            return entries.map((e: any) => ({
                ...e,
                _customer_id: entryCustomerMap[e.id] || null,
                _amount: entryAmountMap[e.id]?.amount ?? Number(e.total_debit),
                _currency: entryAmountMap[e.id]?.currency || e.currency || '',
            }));
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // Fetch Customers Map (for matching reference_id → customer name)
    const { data: customersMap = {} } = useCachedQuery({
        queryKey: ['customers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('customers')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId);

            if (error) {
                console.warn('Customers fetch failed', error);
                return {};
            }

            return (data || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = isRTL ? (curr.name_ar || curr.name_en) : (curr.name_en || curr.name_ar);
                return acc;
            }, {});
        },
        enabled: !!companyId,
        staleTime: 60000
    });

    const payments = useMemo(() => {
        return paymentsRaw.map((pay: any) => ({
            ...pay,
            voucher_number: pay.entry_number,
            voucher_date: pay.entry_date,
            // Use the original currency amount (credit_fc), not the local-currency equivalent
            amount: pay._amount ?? Number(pay.total_debit || 0),
            currency: pay._currency || pay.currency || '',
            payment_method: pay.reference_type || null,
            customer_id: pay._customer_id || pay.reference_id || null,
            customer_name: customersMap[pay._customer_id] || customersMap[pay.reference_id] || pay.description_ar || pay.description || pay.notes || '—',
        }));
    }, [paymentsRaw, customersMap]);

    // Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'voucher_number',
            header: t('table.receiptNumber') || 'Receipt #',
            cell: (info: any) => <span className="font-mono font-bold text-indigo-600">{info.getValue()}</span>
        },
        {
            accessorKey: 'voucher_date',
            header: t('table.date') || 'Date',
            cell: (info: any) => <span className="text-gray-600 font-mono text-xs">{new Date(info.getValue()).toLocaleDateString(language === 'ar' ? 'ar-u-nu-latn' : 'en-US')}</span>
        },
        {
            accessorKey: 'customer_name',
            header: t('table.customer') || 'Customer',
            cell: (info: any) => <span className="font-medium">{info.getValue() || '-'}</span>
        },
        {
            accessorKey: 'amount',
            header: t('table.amount') || 'Amount',
            cell: (info: any) => {
                const curr = info.row.original.currency || companyCurrency || 'USD';
                const amount = Number(info.getValue() || 0);
                return (
                    <span className="font-mono font-bold text-green-600">
                        {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-muted-foreground ml-1">{curr}</span>
                    </span>
                );
            }
        },
        {
            accessorKey: 'currency',
            header: language === 'ar' ? 'العملة' : 'Currency',
            size: 70,
            cell: (info: any) => {
                const curr = info.getValue() || companyCurrency;
                const isDifferent = curr && companyCurrency && curr !== companyCurrency;
                return (
                    <span className={`font-mono text-xs font-medium ${isDifferent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {curr}
                    </span>
                );
            }
        },
        {
            accessorKey: 'payment_method',
            header: t('table.method') || 'Method',
            cell: (info: any) => {
                const val = info.getValue();
                if (!val) {
                    return <span className="text-xs text-gray-400">{isRTL ? 'سند قبض' : 'Receipt'}</span>;
                }
                const translated = t(`method.${val}`);
                return <span className="capitalize text-xs text-gray-500">{translated && translated !== `method.${val}` ? translated : val}</span>;
            }
        },
        {
            accessorKey: 'status',
            header: t('table.status') || 'Status',
            cell: (info: any) => {
                const status = info.getValue();
                let color = 'bg-gray-100 text-gray-600';
                if (status === 'posted') color = 'bg-blue-100 text-blue-700';
                if (status === 'draft') color = 'bg-yellow-100 text-yellow-700';
                if (status === 'cancelled') color = 'bg-red-100 text-red-700';

                return (
                    <Badge variant="secondary" className={`${color} px-2 py-0.5 capitalize`}>
                        {t(`status.${status}`) || status}
                    </Badge>
                );
            }
        }
    ], [t, language, isRTL, companyCurrency]);

    // Handlers
    const handleRowClick = (row: any) => {
        setSelectedPayment(row);
        setSheetMode('view');
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedPayment(null);
        setSheetMode('create');
        setIsSheetOpen(true);
    };

    if (errorPayments) {
        return <div className="p-4 text-red-500">Error loading payments: {(errorPayments as Error).message}</div>
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-erp-navy dark:text-white">
                        <CreditCard className="w-8 h-8 text-indigo-600" />
                        {t('sales.payments')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('sales.paymentsSubtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <Plus className="w-4 h-4 me-2" />
                        {t('actions.addReceipt') || 'Add Receipt'}
                    </Button>
                </div>
            </div>

            {/* Filters Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto" dir={direction}>
                    <TabsList className="bg-muted/50 p-1 rounded-lg inline-flex w-full sm:w-max">
                        <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 font-tajawal">
                            <CreditCard className="w-4 h-4 me-1.5" />
                            {t('status.all') || 'All'}
                        </TabsTrigger>
                        <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-yellow-600 font-tajawal">{t('status.draft') || 'Draft'}</TabsTrigger>
                        <TabsTrigger value="posted" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-blue-600 font-tajawal">{t('status.posted') || 'Posted'}</TabsTrigger>
                        <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] px-4 h-9 text-red-600 font-tajawal">{t('status.cancelled') || 'Cancelled'}</TabsTrigger>
                    </TabsList>
                </Tabs>

                <DateRangePicker
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full sm:w-[260px] bg-white"
                    align={isRTL ? "end" : "start"}
                />
            </div>

            {/* Data Table */}
            <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                <NexaDataTable
                    data={payments}
                    columns={columns}
                    onRowClick={handleRowClick}
                    enableSearch
                    searchPlaceholder={isRTL ? "بحث برقم السند..." : "Search receipt #..."}
                />
            </div>

            {isSheetOpen && (
                <UnifiedAccountingSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedPayment(null);
                    }}
                    docType="receipt" // Use 'receipt' for Money Receipts
                    mode={sheetMode}
                    data={sheetMode === 'create' ? {
                        status: 'draft',
                        date: new Date().toISOString(),
                        type: 'receipt'
                    } : selectedPayment}
                />
            )}
        </div>
    );
}
