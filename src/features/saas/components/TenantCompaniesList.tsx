import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { companiesService } from '@/services/companiesService';
import { LedgerTable, LedgerColumn } from '@/components/shared/tables/LedgerTable';
import { Building2 } from 'lucide-react';
import { useNestedSheetContext } from '@/components/sheets/context/NestedSheetContext';
import { Button } from '@/components/ui/button';

interface TenantCompaniesListProps {
    data: any; // Tenant data
}

export function TenantCompaniesList({ data: tenant }: TenantCompaniesListProps) {
    const { t, language } = useLanguage();
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { openNestedSheet } = useNestedSheetContext();

    useEffect(() => {
        const loadCompanies = async () => {
            if (!tenant?.id) return;

            setLoading(true);
            try {
                const data = await companiesService.getByTenantId(tenant.id);
                setCompanies(data);
            } catch (error) {
                console.error('Error loading companies:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCompanies();
    }, [tenant?.id]);

    const handleRowClick = (company: any) => {
        openNestedSheet({
            docType: 'company',
            data: company,
        });
    };

    const columns = [
        {
            key: language === 'ar' ? 'name' : 'name_en',
            title: 'common.name',
            type: 'text',
            width: '250px',
            sortable: true,
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
            key: 'created_at',
            title: 'common.createdAt',
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
            width: '100px',
            sortable: true,
            render: (_value: any) => {
                // Companies usually inherit/mirror tenant status or have their own. 
                // Assuming active for now or using tenant status if missing
                const status = tenant.status || 'active';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}>
                        {t(`status.${status}`)}
                    </span>
                );
            }
        }
    ] as LedgerColumn<any>[];

    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{t('saas.companies')}</h3>
                {/* Potentially add 'Create Company' button here if needed */}
            </div>

            <LedgerTable
                data={companies}
                columns={columns}
                loading={loading}
                onRowClick={handleRowClick}
                className="cursor-pointer"
                emptyMessage={t('saas.noCompanies')}
            />
        </div>
    );
}
