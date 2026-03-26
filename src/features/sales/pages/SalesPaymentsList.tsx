
import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
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

    // Fetch Payments (Receipts)
    const { data: paymentsRaw = [], isLoading: isLoadingPayments, error: errorPayments, refetch } = useQuery({
        queryKey: ['sales_payments_list', companyId, activeTab, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('payment_vouchers')
                .select('*')
                .eq('company_id', companyId)
                .not('customer_id', 'is', null) // Filter for receipts (from customers)
                .order('voucher_date', { ascending: false });

            // Apply Status Filter
            if (activeTab !== 'all') {
                query = query.eq('status', activeTab);
            }

            // Apply Date Filter
            if (dateRange?.from) {
                query = query.gte('voucher_date', dateRange.from.toISOString());
            }
            if (dateRange?.to) {
                query = query.lte('voucher_date', endOfDay(dateRange.to).toISOString());
            }

            const { data, error } = await query;
            if (error) {
                console.warn('Payments fetch failed', error);
                return []; // Fail gracefully or throw
            }
            return data;
        },
        enabled: !!companyId,
        staleTime: 30_000,
    });

    // Fetch Customers Map
    const { data: customersMap = {} } = useQuery({
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
            customer_name: customersMap[pay.customer_id] || pay.customer_name || 'Unknown',
            amount: Number(pay.amount || 0)
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
            cell: (info: any) => (
                <span className="capitalize text-xs text-gray-500">{t(`method.${info.getValue()}`) || info.getValue()}</span>
            )
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
