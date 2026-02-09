import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { SmartAccountSelector } from '../../shared/SmartAccountSelector';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { SheetMode } from '../types';
import { useViewCurrency } from '../../../hooks/useViewCurrency';
import { FileText, ArrowRightLeft } from 'lucide-react';

interface JournalLineRow {
    id: string;
    account_id: string;
    account_name?: string;
    account_code?: string;
    debit: number;  // Payments (Paid TO this account)
    credit: number; // Receipts (Received FROM this account)
    description: string;
    cost_center_id?: string;
    currency?: string;
    exchange_rate?: number;
}

export interface CashJournalTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    onSaveComplete?: () => void;
    companyId?: string;
}

const createEmptyRow = (): JournalLineRow => ({
    id: crypto.randomUUID(),
    account_id: '',
    debit: 0,
    credit: 0,
    description: '',
    currency: 'SAR',
    exchange_rate: 1,
});

export function CashJournalTab({
    data,
    mode,
    onChange,
}: CashJournalTabProps) {
    const { currencyOptions } = useViewCurrency();
    const currencyList = useMemo(() => currencyOptions.map(c => ({ value: c, label: c })), [currencyOptions]);

    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl' || language === 'ar';
    const isReadOnly = mode === 'view';
    const isCreate = mode === 'create';

    // Internal State
    const [entryDate, setEntryDate] = useState<Date>(new Date());
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    const [voucherNo, setVoucherNo] = useState('');
    const [fundAccountId, setFundAccountId] = useState('');

    const [lines, setLines] = useState<JournalLineRow[]>([]);

    // Load tracking
    const loadedIdRef = useRef<string | null>(null);

    // Load Data - Optimized
    useEffect(() => {
        const incomingId = data?.id || 'new';
        if (loadedIdRef.current !== incomingId) {
            if (data && (mode === 'edit' || mode === 'view')) {
                setEntryDate(data.entry_date ? new Date(data.entry_date) : new Date());
                setReference(data.reference || '');
                setDescription(data.description || '');
                setVoucherNo(data.entry_number || '');
                setFundAccountId(data.fund_account_id || ''); // Start with saved fund

                const loadedLines = data.lines?.map((line: any) => ({
                    id: line.id || crypto.randomUUID(),
                    account_id: line.account_id || '',
                    account_name: line.account?.name_ar || line.account?.name_en || line.account_name || '',
                    account_code: line.account?.code || line.account_code || '',
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    description: line.description || '',
                    cost_center_id: line.cost_center_id || '',
                    currency: line.currency || 'SAR',
                    exchange_rate: Number(line.exchange_rate) || 1,
                })) || [];

                setLines(loadedLines);
            } else if (isCreate) {
                setEntryDate(new Date());
                setReference('');
                setDescription('');
                setVoucherNo('');
                setFundAccountId('');
                setLines([]);
            }
            loadedIdRef.current = incomingId;
        }
    }, [data?.id, mode, isCreate]);

    // Computed Totals
    const totals = useMemo(() => {
        return lines.reduce((acc, row) => ({
            receipts: acc.receipts + (Number(row.credit) || 0), // Credit = Receipt
            payments: acc.payments + (Number(row.debit) || 0),  // Debit = Payment
        }), { receipts: 0, payments: 0 });
    }, [lines]);

    // Sync to Parent
    useEffect(() => {
        if (!isReadOnly) {
            onChange({
                entry_date: format(entryDate, 'yyyy-MM-dd'),
                reference,
                description,
                entry_number: voucherNo,
                entry_type: 'cash',  // Important
                fund_account_id: fundAccountId,
                lines: lines.filter(r => r.account_id),
                total_receipts: totals.receipts,
                total_payments: totals.payments,
            });
        }
    }, [lines, entryDate, reference, description, voucherNo, fundAccountId, isReadOnly]);

    const handleDataChange = useCallback((updatedData: JournalLineRow[]) => {
        setLines(updatedData);
    }, []);

    const handleAddRow = useCallback(() => {
        const newRow = createEmptyRow();
        setLines(prev => [...prev, newRow]);
        return newRow;
    }, []);

    // Columns Definition
    const columns = useMemo((): ColumnDef<JournalLineRow>[] => {
        return [
            {
                accessorKey: 'credit', // Receipts
                header: t('accounting.columns.receipts'),
                size: 105,
                enableHiding: false,
                cell: ({ row }) => {
                    const val = Number(row.original.credit) || 0;
                    return val > 0 ? <span className="font-mono text-sm text-green-700 font-medium">{val.toLocaleString()}</span> : <span className="text-muted-foreground text-xs">—</span>;
                }
            },
            {
                accessorKey: 'debit', // Payments
                header: t('accounting.columns.payments'),
                size: 105,
                enableHiding: false,
                cell: ({ row }) => {
                    const val = Number(row.original.debit) || 0;
                    return val > 0 ? <span className="font-mono text-sm text-red-600 font-medium">{val.toLocaleString()}</span> : <span className="text-muted-foreground text-xs">—</span>;
                }
            },
            {
                accessorKey: 'account_id',
                header: t('accounting.columns.account'),
                size: 200,
                cell: ({ row }) => {
                    const { account_name, account_code } = row.original;
                    if (!account_name) return <span className="text-muted-foreground text-xs">—</span>;
                    return (
                        <div className="flex items-center gap-1.5">
                            {account_code && <span className="font-mono text-xs text-muted-foreground">{account_code}</span>}
                            <span className="text-sm truncate">{account_name}</span>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'description',
                header: t('accounting.columns.description'),
                size: 300,
            },
            {
                accessorKey: 'currency',
                header: t('accounting.columns.currency'),
                size: 60,
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.currency || 'SAR'}</span>
            },
            {
                accessorKey: 'exchange_rate',
                header: t('accounting.columns.exchangeRate'),
                size: 70,
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.exchange_rate?.toFixed(4)}</span>
            }
        ];
    }, [language]);

    // Edit Config
    const editableColumns = useMemo(() => [
        { key: 'credit', type: 'number' as const, min: 0 }, // Receipt
        { key: 'debit', type: 'number' as const, min: 0 },  // Payment
        { key: 'account_id', type: 'account' as const, required: true },
        { key: 'description', type: 'text' as const },
        {
            key: 'currency', type: 'select' as const, options: currencyList
        },
        { key: 'exchange_rate', type: 'number' as const, min: 0 }
    ], [language, currencyList]);

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm bg-gray-50">
                    <span className="font-bold text-sm text-blue-600 capitalize">{t('accounting.cashJournal')}</span>
                    <span className="text-[10px] opacity-70">{t('accounting.type')}</span>
                </Card>
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm">
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <FileText className="w-4 h-4" />
                        <span className="font-bold text-sm">{lines.length}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.lines')}</span>
                </Card>
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm">
                    <span className="font-bold text-sm text-green-600 font-mono">
                        {totals.receipts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.totalReceipts')}</span>
                </Card>
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm">
                    <span className="font-bold text-sm text-red-600 font-mono">
                        {totals.payments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.totalPayments')}</span>
                </Card>
            </div>

            {/* Header Fields */}
            <div className="grid grid-cols-12 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">

                {/* Fund Selector */}
                <div className="col-span-12 md:col-span-6 animate-in fade-in zoom-in-95 duration-200">
                    <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-blue-500" />
                        {t('accounting.cashFund')}
                    </Label>
                    <SmartAccountSelector
                        value={fundAccountId}
                        onChange={(val, acc) => {
                            setFundAccountId(val);
                        }}
                        type="all" // Allow selecting any account to be the fund? Usually strict to cash/bank
                        placeholder={t('accounting.placeholders.selectFund')}
                        disabled={isReadOnly}
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('accounting.entry.date')}
                    </Label>
                    <Input
                        type="date"
                        value={entryDate ? format(entryDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setEntryDate(new Date(e.target.value))}
                        readOnly={isReadOnly}
                    />
                </div>
                <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('accounting.entry.reference')}
                    </Label>
                    <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder={t('accounting.placeholders.invoiceCheck')}
                        readOnly={isReadOnly}
                    />
                </div>
            </div>

            {/* NexaDataTable */}
            <div className="border rounded-xl shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
                <NexaDataTable
                    key="cash-journal-grid-v1"
                    data={lines}
                    columns={columns}
                    isRTL={isRTL}
                    persistKey="accounting-cash-lines-v5"

                    enableExcelMode={true}
                    enablePagination={false}
                    maxHeight="500px"

                    showTotalsFooter={true}
                    // Note: NexaDataTable logic for custom debit/credit columns might need adjustment if keys are different
                    // But here we use standard debit/credit keys, just labeled differently
                    debitKey="debit"
                    creditKey="credit"
                    showAmountInWords={true}
                    enableSequenceNumber={true}

                    enableEditMode={!isReadOnly}
                    enableInstantEdit={!isReadOnly}
                    editableColumns={editableColumns}
                    onDataChange={handleDataChange}
                    onAddRow={handleAddRow}
                    initialEmptyRows={isCreate ? 8 : 0}
                    cleanEmptyRowsOnSave={true}
                    canDeleteRows={!isReadOnly}
                    enableBalanceShortcut={true}
                />
            </div>
        </div>
    );
}
