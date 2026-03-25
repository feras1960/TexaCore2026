import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { LedgerTable, LedgerColumn } from '@/components/shared/tables/LedgerTable';
import { UniversalDetailSheet } from '@/components/sheets/universal/UniversalDetailSheet';
import { companiesService, Company } from '@/services/companiesService';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Companies() {
    const { t, language } = useLanguage();
    const isRtl = language === 'ar';

    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const data = await companiesService.getAllWithTenant();
            console.log('Companies Data:', data);
            setCompanies(data);

            // Update selected company if it exists (for refresh)
            if (selectedCompany) {
                const updated = data.find((c: any) => c.id === selectedCompany.id);
                if (updated) setSelectedCompany(updated);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleRowClick = (company: Company) => {
        setSelectedCompany(company);
        setIsSheetOpen(true);
    };

    const columns = [
        {
            key: language === 'ar' ? 'name' : 'name_en',
            title: 'common.name',
            type: 'text',
            width: '250px',
            sortable: true,
            filterable: true,
            render: (value: any, row: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">{row.name || row.name_en || '-'}</p>
                        <p className="text-xs text-muted-foreground">{row.code}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'tenant_name', // Virtual key for sorting/filtering
            title: 'saas.tenant', // New key
            type: 'text',
            width: '200px',
            sortable: true,
            filterable: true,
            render: (_value: any, row: any) => (
                <div>
                    {row.tenant ? (
                        <>
                            <p className="text-sm font-medium">{row.tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{row.tenant.code}</p>
                        </>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </div>
            )
        },
        {
            key: 'created_at',
            title: 'common.createdAt', // Key correction
            type: 'date',
            width: '120px',
            sortable: true,
            render: (value: any) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(value).toLocaleDateString(language)}
                </span>
            )
        },
        {
            key: 'status',
            title: 'common.status._',
            type: 'status',
            width: '120px',
            sortable: true,
            render: (_value: any, row: any) => {
                // Use tenant status as proxy
                const status = row.tenant?.status || 'active';
                const isSuspended = status === 'suspended';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isSuspended
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                        {t(`status.${status}`)}
                    </span>
                );
            }
        }
    ] as LedgerColumn<any>[];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    {/* Header if needed, often handled by parent SaaSPage */}
                </div>
            </div>

            <LedgerTable
                data={companies}
                columns={columns}
                loading={loading}
                onRowClick={handleRowClick}
                className="cursor-pointer"
            />

            <UniversalDetailSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                docType="company"
                data={selectedCompany}
                onRefresh={loadCompanies}
            />
        </div>
    );
}
