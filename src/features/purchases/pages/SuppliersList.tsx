import { useState, useEffect } from 'react';
import {
    Users,
    Phone,
    Mail,
    CreditCard,
    Edit,
    Trash2,
    Eye,
    Plus
} from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { UniversalDetailSheet } from '@/components/sheets';
import { toast } from 'sonner';

// Define Party Type
interface Supplier {
    id: string;
    name: string;
    name_ar?: string;
    name_en?: string;
    phone: string;
    email: string;
    tax_number: string;
    balance: number; // Changed from current_balance to match 'suppliers' table
    type: 'supplier';
    currency: string;
    status: string;
    contact_person?: string;
    address?: string;
}

export default function SuppliersList() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Fetch Suppliers
    const { data: suppliers = [], isLoading, error, refetch } = useQuery({
        queryKey: ['suppliers_list', companyId],
        queryFn: async () => {
            if (!companyId) return [];

            // FETCH FROM 'suppliers' INSTEAD OF 'parties'
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map data to handle name localization if needed
            return data.map((item: any) => ({
                ...item,
                name: language === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name),
                type: 'supplier'
            })) as Supplier[];
        },
        enabled: !!companyId
    });

    const handleRowClick = (row: Supplier) => {
        setSelectedSupplier(row);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        toast.info(isRTL ? 'سيتم ربط نموذج إضافة المورد قريباً' : 'Add Supplier form coming soon...');
    };

    // Columns Configuration
    const columns = [
        {
            header: isRTL ? 'كود المورد' : 'Code',
            accessorKey: 'supplier_code', // Assuming 'supplier_code' or similar exists, or fallback to id
            cell: ({ row }: any) => <span className="font-mono text-xs">{row.original.supplier_code || row.original.code || '-'}</span>
        },
        {
            header: isRTL ? 'اسم المورد' : 'Supplier Name',
            accessorKey: 'name',
            enableSorting: true,
            cell: ({ row }: any) => (
                <span
                    className="font-semibold text-erp-navy cursor-pointer hover:underline"
                    onClick={() => handleRowClick(row.original)}
                >
                    {row.original.name || '-'}
                </span>
            )
        },
        {
            header: isRTL ? 'رقم الهاتف' : 'Phone',
            accessorKey: 'phone',
            cell: ({ row }: any) => <span dir="ltr">{row.original.phone || '-'}</span>
        },
        {
            header: isRTL ? 'الرصيد' : 'Balance',
            accessorKey: 'balance',
            enableSorting: true,
            cell: ({ row }: any) => {
                const balance = Number(row.original.balance || 0);
                const color = balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-500';
                return <span className={`font-bold ${color}`}>{balance.toFixed(2)}</span>;
            }
        },
        {
            header: isRTL ? 'الحالة' : 'Status',
            accessorKey: 'status',
            cell: ({ row }: any) => (
                <span className={`px-2 py-1 rounded text-xs ${row.original.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {row.original.status}
                </span>
            )
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }: any) => (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleRowClick(row.original)}>
                        <Eye className="w-4 h-4 text-gray-500" />
                    </Button>
                </div>
            )
        }
    ];

    if (error) return <div className="p-8 text-center text-red-500">Error loading suppliers: {(error as Error).message}</div>;

    // Manual loading state since NexaDataTable props support varies
    if (isLoading && !suppliers.length) {
        return <div className="p-8 text-center text-gray-500">{isRTL ? 'جاري تحميل الموردين...' : 'Loading suppliers...'}</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center px-1">
                <div />
                <Button onClick={handleCreate} className="bg-erp-primary hover:bg-erp-primary/90 gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة مورد' : 'Add Supplier'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                <NexaDataTable
                    data={suppliers}
                    columns={columns}
                    filterPlaceholder={isRTL ? 'بحث عن مورد...' : 'Search supplier...'}
                    pageSize={15}
                />
            </div>

            {/* Universal Detail Sheet */}
            {isSheetOpen && selectedSupplier && (
                <UniversalDetailSheet
                    isOpen={isSheetOpen}
                    onClose={() => {
                        setIsSheetOpen(false);
                        setSelectedSupplier(null);
                    }}
                    docType="supplier"
                    data={selectedSupplier}
                />
            )}
        </div>
    );
}
