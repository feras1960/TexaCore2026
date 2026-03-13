/**
 * ════════════════════════════════════════════════════════════════
 * 📋 AccountingEntryTab - مكون القيد المحاسبي الموحد
 * 
 * Dispatcher component that renders the correct entry form
 * based on docType. Uses Specialized Tabs for better performance.
 * 
 * Update 2026: Split monolithic JournalFormTab into specialized tabs.
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import type { SheetMode, UnifiedDocType } from '../types';

// Importing Specialized Tabs
import { JournalVoucherTab } from './JournalVoucherTab';
import { CashJournalTab } from './CashJournalTab';
import { ReceiptVoucherTab } from './ReceiptVoucherTab';
import { PaymentVoucherTab } from './PaymentVoucherTab';

import { FundTransferTab } from './FundTransferTab';
import { CurrencyExchangeTab } from './CurrencyExchangeTab';

export interface AccountingEntryTabProps {
    data: any;
    mode: SheetMode;
    docType: UnifiedDocType;
    onChange: (updates: any) => void;
    onSaveComplete?: () => void;
    companyId?: string;
}

/**
 * Dispatcher: Routes to the correct form based on docType
 */
export function AccountingEntryTab({
    data,
    mode,
    docType,
    onChange,
    onSaveComplete,
    companyId,
}: AccountingEntryTabProps) {
    // Route to the correct specialized form
    switch (docType) {
        // 1. Journal Entry
        case 'journal':
            return (
                <JournalVoucherTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                    docType={docType}
                />
            );

        // 2. Cash Journal
        case 'cash':
            return (
                <CashJournalTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                />
            );

        // 3. Receipt Voucher
        case 'receipt':
            return (
                <ReceiptVoucherTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                />
            );

        // 4. Payment Voucher
        case 'payment':
            return (
                <PaymentVoucherTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                />
            );

        // 5. Fund Transfer
        case 'transfer':
            return (
                <FundTransferTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                />
            );

        // 6. Currency Exchange
        case 'exchange':
            return (
                <CurrencyExchangeTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                />
            );

        // 7. Debit Note (Uses Journal Form)
        case 'debit_note':
            return (
                <JournalVoucherTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                    docType={docType}
                />
            );

        // 8. Credit Note (Uses Journal Form)
        case 'credit_note':
            return (
                <JournalVoucherTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                    docType={docType}
                />
            );

        // 9. Recurring Entry (Uses Journal Form — same debit/credit lines)
        case 'recurring':
            return (
                <JournalVoucherTab
                    data={data}
                    mode={mode}
                    onChange={onChange}
                    onSaveComplete={onSaveComplete}
                    companyId={companyId}
                    docType={docType}
                />
            );

        default:
            return (
                <div className="p-8 text-center text-muted-foreground">
                    Unknown Document Type: {docType}
                </div>
            );
    }
}

export default AccountingEntryTab;
