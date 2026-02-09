import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { TradeHeader } from '@/features/trade/components/forms/TradeHeader';
import { TradeItemsGrid } from '@/features/trade/components/grids/TradeItemsGrid';
import { TradeDocument } from '@/features/trade/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package } from 'lucide-react';

import { ContainerInvoiceSelector } from '@/features/trade/components/ContainerInvoiceSelector';

interface TradeMainTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

export const TradeMainTab: React.FC<TradeMainTabProps> = ({
    data,
    mode,
    onChange
}) => {
    const { isRTL, t } = useLanguage();

    // Convert data to TradeDocument format if needed
    const tradeData: Partial<TradeDocument> = {
        ...data,
        items: data.items || [],
        party_id: data.party_id || data.supplier_id || data.customer_id,
        // Map other fields as necessary
    };

    const handleHeaderChange = (field: keyof TradeDocument, value: any) => {
        onChange({ [field]: value });
    };

    const handleItemsChange = (items: any[]) => {
        onChange({ items });
    };

    // Determine specific trade mode from doc type
    const tradeMode = data.type?.includes('purchase') || data.docType === 'trade_order' ? 'purchase' : 'sales';
    const isContainer = data.docType === 'trade_container' || data.subType === 'container';

    // Handle container invoice selection
    const handleInvoiceSelection = (ids: string[]) => {
        // Store selected invoice IDs in data
        onChange({
            invoice_ids: ids,
            // Also update items for compatibility if needed, though we might not need to
            items: ids.map(id => ({ id, type: 'invoice_link' }))
        });
    };

    return (
        <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
            {/* 1. Header Portion */}
            <TradeHeader
                data={tradeData}
                mode={tradeMode}
                type={data.subType || 'order'}
                onChange={handleHeaderChange}
                partyList={[
                    { id: 'p1', name: 'Al-Amal Textiles' },
                    { id: 'p2', name: 'Golden Threads' }
                ]}
                warehouseList={[
                    { id: 'wh1', name: 'Main Warehouse' }
                ]}
            />

            {/* 2. Items Grid or Invoice Selector */}
            <div className="mt-4">
                {isContainer ? (
                    <ContainerInvoiceSelector
                        supplierId={tradeData.party_id || ''}
                        selectedInvoiceIds={data.invoice_ids || tradeData.items?.map((i: any) => i.id) || []}
                        onSelectionChange={handleInvoiceSelection}
                        readOnly={mode === 'view'}
                    />
                ) : (
                    <TradeItemsGrid
                        items={tradeData.items || []}
                        onItemsChange={handleItemsChange}
                        mode={tradeMode}
                        readOnly={mode === 'view'}
                    />
                )}
            </div>

            {/* Totals Section */}
            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm bg-white p-4 rounded-lg border shadow-sm space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                        <span className="font-mono font-bold">
                            {(tradeData.items?.reduce((s, i) => s + (i.unit_price * i.quantity), 0) || 0).toFixed(2)}
                        </span>
                    </div>
                    {/* Placeholder for Taxes / Discounts if needed */}

                    <div className="pt-3 border-t flex justify-between items-center">
                        <span className="font-bold text-lg">{t('trade.total') || 'Total'}</span>
                        <span className="font-mono text-2xl font-bold text-erp-Navy">
                            {(tradeData.items?.reduce((s, i) => s + (i.total || 0), 0) || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
