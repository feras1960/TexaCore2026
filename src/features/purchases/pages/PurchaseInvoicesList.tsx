import { useState, useMemo } from 'react';
import {
    ShoppingCart,
    MoreHorizontal,
    Flag,
    CheckCircle,
    Plus,
    FileText,
    Truck,
    RotateCcw,
    ChevronDown,
    Filter
} from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PurchaseInvoiceDoc {
    id: string;
    invoice_number: string;
    invoice_date: string;
    supplier_id?: string;
    supplier_name?: string;
    total_amount: number;
    status: string;
    currency: string;
    created_at: string;
}

export default function PurchaseInvoicesList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    // State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [docMode, setDocMode] = useState<'view' | 'create' | 'edit'>('view');

    // Date Filter State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    // Fetch Suppliers Map
    const { data: suppliersMap = {} } = useQuery({
        queryKey: ['suppliers_map', companyId],
        queryFn: async () => {
            if (!companyId) return {};
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name_ar, name_en')
                .eq('company_id', companyId);

            if (error) return {};

            return (data || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = language === 'ar' ? (curr.name_ar || curr.name_en) : (curr.name_en || curr.name_ar);
                return acc;
            }, {});
        },
        enabled: !!companyId,
        staleTime: 60000
    });

    // Fetch Invoices
    const { data: invoices = [], isLoading, error } = useQuery({
        queryKey: ['purchase_invoices_dedicated', companyId, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            const fromISO = dateRange?.from ? dateRange.from.toISOString() : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

            let q = supabase
                .from('purchase_invoices')
                .select('*')
                .eq('company_id', companyId)
                .order('invoice_date', { ascending: false });

            if (fromISO) q = q.gte('invoice_date', fromISO);
            if (toISO) q = q.lte('invoice_date', toISO);

            const { data, error } = await q;

            if (error) {
                console.error('Error fetching invoices:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                ...item,
                type: 'invoice' // Ensure type is set for UnifiedSheet
            }));
        },
        enabled: !!companyId
    });

    // Enrich Data
    const enrichedInvoices = useMemo(() => {
        return invoices.map(doc => ({
            ...doc,
            supplier_name: doc.supplier_id ? (suppliersMap[doc.supplier_id] || 'Unknown Supplier') : '-'
        }));
    }, [invoices, suppliersMap]);

    const handleRowClick = (row: any) => {
        setSelectedDoc(row);
        setDocMode('view'); // Or 'edit' based on status
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedDoc(null);
        setDocMode('create');
        setIsSheetOpen(true);
    };

    // Columns Configuration
    const columns = [
        {
            header: isRTL ? 'رقم الفاتورة' : 'Invoice #',
            accessorKey: 'invoice_number',
            cell: ({ row }: any) => (
                <span
                    className="font-bold font-mono text-indigo-600 cursor-pointer hover:underline"
                    onClick={() => handleRowClick(row.original)}
                >
                    {row.original.invoice_number || '-'}
                </span>
            )
        },
        {
            header: isRTL ? 'التاريخ' : 'Date',
            accessorKey: 'invoice_date',
            enableSorting: true,
            cell: ({ row }: any) => <span className="text-gray-600 font-mono text-xs">{new Date(row.original.invoice_date || row.original.created_at).toLocaleDateString()}</span>
        },
        {
            header: isRTL ? 'المورد' : 'Supplier',
            accessorKey: 'supplier_id',
            cell: ({ row }: any) => <span className="font-medium">{row.original.supplier_name}</span>
        },
        {
            header: isRTL ? 'الإجمالي' : 'Total',
            accessorKey: 'total_amount',
            cell: ({ row }: any) => (
                <span className="font-mono font-bold tracking-tight">
                    {Number(row.original.total_amount || 0).toLocaleString()} <span className="text-xs text-gray-500">{row.original.currency || 'SAR'}</span>
                </span>
            )
        },
        {
            header: isRTL ? 'الحالة' : 'Status',
            accessorKey: 'status',
            cell: ({ row }: any) => (
                <Badge variant="outline" className={`capitalize ${row.original.status === 'posted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600'}`}>
                    {row.original.status}
                </Badge>
            )
        },
        {
            id: 'actions',
            cell: ({ row }: any) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRowClick(row.original)}>
                            <FileText className="mr-2 h-4 w-4" />
                            {isRTL ? 'عرض التفاصيل' : 'View Details'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ];

    if (error) return <div className="p-4 text-red-500">Error: {(error as Error).message}</div>;

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 pb-4 bg-white p-2 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-800">{isRTL ? 'فواتير المشتريات' : 'Purchase Invoices'}</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    {/* Date Picker */}
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-full sm:w-[240px]"
                        align={isRTL ? "end" : "start"}
                    />

                    {/* Create Button */}
                    <Button
                        onClick={handleCreate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        {isRTL ? 'فاتورة شراء جديدة' : 'New Purchase Invoice'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                <NexaDataTable
                    data={enrichedInvoices}
                    columns={columns}
                    enableSearch={true}
                    searchPlaceholder={isRTL ? 'بحث برقم الفاتورة...' : 'Search invoice #...'}
                    pageSize={15}
                />
            </div>

            {/* Unified Trade Sheet */}
            {isSheetOpen && (
                <UnifiedTradeSheet
                    open={isSheetOpen}
                    onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (!open) setSelectedDoc(null);
                    }}
                    mode="purchase"
                    type="invoice"
                    initialData={docMode === 'create' ? { type: 'invoice', status: 'draft', currency: 'SAR', date: new Date().toISOString() } : selectedDoc}
                />
            )}
        </div>
    );
}
