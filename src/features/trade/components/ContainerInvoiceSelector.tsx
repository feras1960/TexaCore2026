import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from '@/app/providers/LanguageProvider';
import SectionLoader from '@/components/common/SectionLoader';
import { FileText } from 'lucide-react';

interface ContainerInvoiceSelectorProps {
    supplierId: string;
    selectedInvoiceIds: string[];
    onSelectionChange: (ids: string[]) => void;
    readOnly?: boolean;
}

export function ContainerInvoiceSelector({
    supplierId,
    selectedInvoiceIds = [],
    onSelectionChange,
    readOnly = false
}: ContainerInvoiceSelectorProps) {
    const { companyId } = useCompany();
    const { isRTL, t } = useLanguage();

    // Fetch Available Invoices for Selected Supplier
    const { data: availableInvoices = [], isLoading } = useQuery({
        queryKey: ['available_invoices_for_container', supplierId, companyId],
        queryFn: async () => {
            if (!supplierId) return [];

            // Fetch posted invoices not yet assigned to a container
            const { data } = await supabase
                .from('purchase_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('supplier_id', supplierId)
                .eq('stage', 'posted')
                .is('container_id', null) // Not yet assigned to a container (unified)
                .order('doc_date', { ascending: false });
            return data || [];
        },
        enabled: !!supplierId && !readOnly
    });

    // If readOnly (view mode), we should fetch the ALREADY LINKED invoices
    const { data: linkedInvoices = [] } = useQuery({
        queryKey: ['linked_invoices_for_container', selectedInvoiceIds],
        queryFn: async () => {
            if (selectedInvoiceIds.length === 0) return [];
            const { data } = await supabase
                .from('purchase_transactions')
                .select('*')
                .in('id', selectedInvoiceIds); // Fetch specific IDs
            return data || [];
        },
        enabled: readOnly && selectedInvoiceIds.length > 0
    });

    const displayInvoices = readOnly ? linkedInvoices : availableInvoices;

    const toggleInvoice = (id: string) => {
        if (readOnly) return;
        const newSelection = selectedInvoiceIds.includes(id)
            ? selectedInvoiceIds.filter(i => i !== id)
            : [...selectedInvoiceIds, id];
        onSelectionChange(newSelection);
    };

    if (!supplierId && !readOnly) {
        return (
            <div className="text-center p-8 text-gray-500 text-sm italic bg-gray-50 rounded border border-dashed">
                {t('messages.selectSupplierFirst') || (isRTL ? 'يرجى اختيار مورد أولاً لعرض الفواتير المتاحة' : 'Please select a supplier to view available invoices')}
            </div>
        );
    }

    if (isLoading) return <SectionLoader className="h-40" />;

    if (displayInvoices.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500 text-sm bg-gray-50 rounded border border-dashed">
                {readOnly
                    ? (t('messages.noLinkedInvoices') || (isRTL ? 'لا توجد فواتير مرتبطة' : 'No linked invoices'))
                    : (t('messages.noPostedInvoices') || (isRTL ? 'لا توجد فواتير مرحلة متاحة لهذا المورد' : 'No posted invoices available for this supplier'))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                {t('purchases.container_details.contents') || (isRTL ? 'محتويات الكونتينر (الفواتير)' : 'Container Contents (Purchase Invoices)')}
            </h3>

            <div className="border rounded-md divide-y max-h-96 overflow-y-auto bg-white shadow-sm">
                {displayInvoices.map((inv: any) => (
                    <div
                        key={inv.id}
                        className={`flex items-center p-4 hover:bg-gray-50 transition-colors cursor-pointer ${selectedInvoiceIds.includes(inv.id) ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => toggleInvoice(inv.id)}
                    >
                        {!readOnly && (
                            <Checkbox
                                checked={selectedInvoiceIds.includes(inv.id)}
                                onCheckedChange={() => toggleInvoice(inv.id)}
                                className="mt-1"
                            />
                        )}
                        <div className={`flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm ${!readOnly ? 'mx-3' : ''}`}>
                            <span className="font-mono font-medium text-indigo-600 flex items-center gap-2">
                                {readOnly && <FileText className="w-3 h-3 text-gray-400" />}
                                {inv.invoice_no}
                            </span>
                            <span className="text-gray-500">{new Date(inv.doc_date).toLocaleDateString()}</span>
                            <div className="flex justify-end gap-2">
                                <span className="font-bold">{Number(inv.total_amount).toLocaleString()}</span>
                                <span className="text-xs text-gray-500 self-center">{inv.currency}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {!readOnly && selectedInvoiceIds.length > 0 && (
                <div className="flex justify-between items-center bg-indigo-50 text-indigo-700 px-4 py-2 rounded-md text-sm font-medium border border-indigo-100">
                    <span>
                        {t('messages.invoicesSelected', { count: selectedInvoiceIds.length }) || (isRTL ? `تم اختيار ${selectedInvoiceIds.length} فواتير` : `${selectedInvoiceIds.length} invoices selected`)}
                    </span>
                </div>
            )}
        </div>
    );
}
