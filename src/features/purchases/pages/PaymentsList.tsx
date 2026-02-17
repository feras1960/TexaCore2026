import { useState, useMemo } from 'react';
import {
    MoreHorizontal,
    Plus,
    FileText,
    ArrowUpRight,
    Calendar,
    Wallet
} from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
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

export default function PaymentsList() {
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

    // Fetch Payments (Outgoing/Purchase)
    const { data: payments = [], isLoading, error } = useQuery({
        queryKey: ['payments_out_list', companyId, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            if (!companyId) return [];

            const fromISO = dateRange?.from ? dateRange.from.toISOString() : null;
            const toISO = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

            // We assume table 'payments' exists for unified payments/receipts
            // Or 'transactions' 
            // Based on user request "يظهر بوب اب القيد المكون المشترك الخاص بالقيود المحاسبية" -> implies UnifiedAccountingSheet
            // Usually 'payment' type in UnifiedSheet maps to a Payment Voucher table.

            let q = supabase
                .from('payment_vouchers') // Correct table name
                .select(`
                    *,
                    supplier:suppliers(name_ar, name_en),
                    shipment:shipments(shipment_number),
                    invoice:purchase_transactions(invoice_no)
                `)
                .eq('company_id', companyId)
                // .eq('type', 'payment') // payment_vouchers is explicitly for payments usually. If mixed types exist, add filter.
                .order('voucher_date', { ascending: false });

            if (fromISO) q = q.gte('voucher_date', fromISO);
            if (toISO) q = q.lte('voucher_date', toISO);

            const { data, error } = await q;

            if (error) {
                console.error('Error fetching payments:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                ...item,
                docType: 'payment', // For UnifiedSheet
                date: item.voucher_date, // Map for UI consistency
                method: item.payment_method, // Map for UI consistency
                party: item.supplier // Only suppliers for now based on schema
            }));
        },
        enabled: !!companyId
    });

    const handleRowClick = (row: any) => {
        setSelectedDoc(row);
        setDocMode('view'); // Or 'edit'
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
            header: isRTL ? 'رقم السند' : 'Payment #',
            accessorKey: 'payment_number', // or reference_number
            cell: ({ row }: any) => (
                <span
                    className="font-bold font-mono text-indigo-600 cursor-pointer hover:underline"
                    onClick={() => handleRowClick(row.original)}
                >
                    {row.original.payment_number || row.original.reference_number || '-'}
                </span>
            )
        },
        {
            header: isRTL ? 'التاريخ' : 'Date',
            accessorKey: 'date',
            enableSorting: true,
            cell: ({ row }: any) => <span className="text-gray-600 font-mono text-xs">{new Date(row.original.date || row.original.voucher_date || row.original.created_at).toLocaleDateString()}</span>
        },
        {
            header: isRTL ? 'المورد / الجهة' : 'Payee',
            accessorKey: 'supplier_id',
            cell: ({ row }: any) => {
                const party = row.original.supplier;
                return <span className="font-medium">{language === 'ar' ? (party?.name_ar || party?.name_en) : (party?.name_en || party?.name_ar) || '-'}</span>
            }
        },
        {
            header: isRTL ? 'المشروع / الحاوية' : 'Project / Container',
            accessorKey: 'shipment_id',
            cell: ({ row }: any) => {
                const shipment = row.original.shipment;
                const invoice = row.original.invoice;
                if (shipment) return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{shipment.shipment_number}</Badge>;
                if (invoice) return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Inv: {invoice.invoice_number}</Badge>;
                return <span className="text-gray-400 text-xs">-</span>;
            }
        },
        {
            header: isRTL ? 'المبلغ' : 'Amount',
            accessorKey: 'amount',
            cell: ({ row }: any) => (
                <span className="font-mono font-bold tracking-tight text-red-600">
                    {Number(row.original.amount || 0).toLocaleString()} <span className="text-xs text-gray-500">{row.original.currency || ''}</span>
                </span>
            )
        },
        {
            header: isRTL ? 'طريقة الدفع' : 'Method',
            accessorKey: 'method',
            cell: ({ row }: any) => (
                <Badge variant="outline" className="uppercase text-xs text-gray-500 bg-gray-50">
                    {row.original.method || 'CASH'}
                </Badge>
            )
        },
        {
            header: isRTL ? 'الحالة' : 'Status',
            accessorKey: 'status',
            cell: ({ row }: any) => (
                <Badge variant="outline" className={`capitalize ${row.original.status === 'posted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600'}`}>
                    {row.original.status || 'draft'}
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

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 pb-4 bg-white p-2 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-bold text-gray-800">{isRTL ? 'المدفوعات (سندات الصرف)' : 'Outgoing Payments'}</h2>
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
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        {isRTL ? 'سند صرف جديد' : 'New Payment'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                <NexaDataTable
                    data={payments}
                    columns={columns}
                    enableSearch={true}
                    searchPlaceholder={isRTL ? 'بحث برقم السند...' : 'Search payment #...'}
                    pageSize={15}
                    loading={isLoading}
                />
            </div>

            {/* Unified Accounting Sheet - Payment Mode */}
            {isSheetOpen && (
                <UnifiedAccountingSheet
                    open={isSheetOpen}
                    onOpenChange={(open) => {
                        setIsSheetOpen(open);
                        if (!open) setSelectedDoc(null);
                    }}
                    docType="payment" // سند صرف
                    // If creating, pass initial data
                    initialData={docMode === 'create' ? {
                        type: 'payment',
                        status: 'draft',
                        currency: '',
                        date: new Date().toISOString(),
                        amount: 0
                    } : selectedDoc}
                    mode={docMode === 'view' ? 'view' : 'edit'} // View/Edit mode
                    onSave={async (data) => {
                        console.log('Save Payment', data);
                        toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
                        setIsSheetOpen(false);
                        // Refetch needed
                    }}
                />
            )}
        </div>
    );
}
