import React from 'react';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ColumnDef } from '@tanstack/react-table';

// Placeholder columns definition
const columns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'company', header: 'Company' },
    { accessorKey: 'status', header: 'Status' },
];

export default function ContactsTable() {
    const { t } = useLanguage();

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-erp-navy dark:text-gray-100">
                    {t('crm.contacts') || 'Contacts'}
                </h2>
                <p className="text-gray-500">Manage your customers and leads</p>
            </div>

            <NexaDataTable
                columns={columns}
                data={[]} // To be connected to Supabase
                searchPlaceholder="Search contacts..."
            />
        </div>
    );
}
