
import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Phone, Mail, MapPin } from 'lucide-react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { toast } from 'sonner';

export default function CustomersList() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    // State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('view');

    // Fetch Customers
    const { data: customers = [], isLoading, error } = useQuery({
        queryKey: ['customers_list', companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customers')
                .select(`
                        *,
                        account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)
                    `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(c => ({
                ...c,
                name: isRTL ? (c.name_ar || c.name_en) : (c.name_en || c.name_ar),
                balance: Number(c.balance || 0)
            }));
        },
        enabled: !!companyId
    });

    const translate = (key: string, defaultVal: string) => t(key) || defaultVal;

    // Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'code',
            header: t('table.code') || 'Code',
            cell: (info: any) => <span className="font-mono text-xs font-bold text-gray-600">{info.getValue() || '-'}</span>
        },
        {
            accessorKey: 'name',
            header: t('table.name') || 'Name',
            cell: (info: any) => (
                <div className="flex flex-col">
                    <span className="font-medium text-erp-navy dark:text-white">{info.getValue()}</span>
                    {info.row.original.email && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {info.row.original.email}
                        </span>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'phone',
            header: t('table.phone') || 'Phone',
            cell: (info: any) => info.getValue() ? (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone className="w-3 h-3" />
                    <span dir="ltr">{info.getValue()}</span>
                </div>
            ) : '-'
        },
        {
            accessorKey: 'balance',
            header: t('table.balance') || 'Balance',
            cell: (info: any) => {
                const val = info.getValue();
                const isPositive = val >= 0;
                return (
                    <span className={`font-mono font-bold ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {val.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                );
            }
        },
        {
            accessorKey: 'status',
            header: t('table.status') || 'Status',
            cell: (info: any) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.getValue() === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {info.getValue() === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                </span>
            )
        }
    ], [translate, isRTL]);

    // Handlers
    const handleRowClick = (row: any) => {
        setSelectedCustomer(row);
        setSheetMode('view');
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedCustomer(null);
        setSheetMode('create');
        setIsSheetOpen(true);
    };

    if (error) {
        return <div className="p-4 text-red-500">Error loading customers: {(error as Error).message}</div>
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-erp-navy dark:text-white">
                        <Users className="w-8 h-8 text-indigo-600" />
                        {t('sales.customers')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('sales.customersSubtitle')}
                    </p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                    <Plus className="w-4 h-4 me-2" />
                    {t('actions.addCustomer')}
                </Button>
            </div>

            <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm overflow-hidden">
                <NexaDataTable
                    data={customers}
                    columns={columns}
                    onRowClick={handleRowClick}
                    enableSearch
                    searchPlaceholder={isRTL ? "بحث عن عميل..." : "Search customers..."}
                />
            </div>

            {isSheetOpen && (
                <UnifiedAccountingSheet
                    documentId={selectedCustomer?.id || 'new'}
                    docType="party"
                    mode={sheetMode}
                    data={selectedCustomer ? { ...selectedCustomer, type: 'customer' } : { type: 'customer', status: 'active' }}
                    isOpen={isSheetOpen}
                    onClose={() => setIsSheetOpen(false)}
                />
            )}
        </div>
    );
}
