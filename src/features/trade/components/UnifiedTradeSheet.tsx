import React from 'react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { UnifiedDocType } from '@/features/accounting/components/unified/types';

interface UnifiedTradeSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'purchase' | 'sales';
    type?: 'request' | 'quotation' | 'order' | 'invoice' | 'receipt' | 'return' | 'delivery' | 'reservation' | 'container';
    initialData?: any;
    onSave?: (data: any) => Promise<void>;
}

export const UnifiedTradeSheet: React.FC<UnifiedTradeSheetProps> = ({
    open,
    onOpenChange,
    mode,
    type = 'order',
    initialData,
    onSave
}) => {

    // Map Trade props to Unified Accounting Sheet props
    let docType: UnifiedDocType = 'trade_order';
    switch (type) {
        case 'invoice': docType = 'trade_invoice'; break;
        case 'quotation': docType = 'trade_quotation'; break;
        case 'request': docType = 'trade_request'; break;
        case 'receipt': docType = 'trade_receipt'; break;
        case 'return': docType = 'trade_return'; break;
        case 'delivery': docType = 'trade_delivery'; break;
        case 'reservation': docType = 'trade_reservation'; break;
        case 'container': docType = 'trade_container'; break;
        default: docType = 'trade_order';
    }

    // Enhance initial data with trade-specific context
    const enhancedData = {
        ...initialData,
        type: mode, // purchase or sales
        subType: type,
        // Make sure status exists
        status: initialData?.status || 'draft',
    };

    return (
        <UnifiedAccountingSheet
            isOpen={open}
            onClose={() => onOpenChange(false)}
            docType={docType}
            mode={initialData ? 'edit' : 'create'}
            data={enhancedData}
            onSave={onSave}
        // Allow specific trade tabs
        // defaultTab="trade" (this is handled by config)
        />
    );
};
