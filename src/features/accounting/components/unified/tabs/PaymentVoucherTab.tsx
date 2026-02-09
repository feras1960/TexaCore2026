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
import type { SheetMode } from '../types';
import { useViewCurrency } from '../../../hooks/useViewCurrency';
import { FileText, ArrowUpRight } from 'lucide-react';

interface JournalLineRow {
    id: string;
    account_id: string;
    account_name?: string;
    account_code?: string;
    debit: number; // Payment Amount
    credit: number;
    description: string;
    cost_center_id?: string;
    cost_center_name?: string;
    currency?: string;
    exchange_rate?: number;
    link_type?: string;
    invoice_id?: string;
    invoice_number?: string;
}

export interface PaymentVoucherTabProps {
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
    link_type: 'none',
});

export function PaymentVoucherTab({
    data,
    mode,
    onChange,
}: PaymentVoucherTabProps) {
    const { currencyOptions } = useViewCurrency();
    const currencyList = useMemo(() => currencyOptions.map(c => ({ value: c, label: c })), [currencyOptions]);

    const { t, language, direction } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { companyId: hookCompanyId } = useCompany();
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

    const loadedIdRef = useRef<string | null>(null);

    useEffect(() => {
        const incomingId = data?.id || 'new';
        if (loadedIdRef.current !== incomingId) {
            if (data && (mode === 'edit' || mode === 'view')) {
                setEntryDate(data.entry_date ? new Date(data.entry_date) : new Date());
                setReference(data.reference || '');
                setDescription(data.description || '');
                setVoucherNo(data.entry_number || '');
                setFundAccountId(data.fund_account_id || '');

                const loadedLines = data.lines?.map((line: any) => ({
                    id: line.id || crypto.randomUUID(),
                    account_id: line.account_id || '',
                    account_name: line.account?.name_ar || line.account?.name_en || line.account_name || '',
                    account_code: line.account?.code || line.account_code || '',
                    debit: Number(line.debit) || 0, // Payment is Debit (expense/liability reduction)
                    credit: 0,
                    description: line.description || '',
                    cost_center_id: line.cost_center_id || '',
                    cost_center_name: line.cost_center?.name || '',
                    currency: line.currency || 'SAR',
                    exchange_rate: Number(line.exchange_rate) || 1,
                    link_type: line.link_type || 'none',
                    invoice_id: line.invoice_id || '',
                    invoice_number: line.invoice?.invoice_number || '',
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

    const totals = useMemo(() => {
        return lines.reduce((acc, row) => ({
            amount: acc.amount + (Number(row.debit) || 0),
        }), { amount: 0 });
    }, [lines]);

    useEffect(() => {
        if (!isReadOnly) {
            onChange({
                entry_date: format(entryDate, 'yyyy-MM-dd'),
                reference,
                description,
                entry_number: voucherNo,
                entry_type: 'payment',
                fund_account_id: fundAccountId,
                lines: lines.filter(r => r.account_id),
                total_amount: totals.amount,
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

    const columns = useMemo((): ColumnDef<JournalLineRow>[] => {
        return [
            {
                accessorKey: 'debit',
                header: t('accounting.columns.amount'),
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
                accessorKey: 'link_type',
                header: t('accounting.columns.link'),
                size: 80,
                cell: ({ row }) => row.original.link_type !== 'none' ? row.original.link_type : '—'
            },
            {
                accessorKey: 'invoice_id',
                header: t('accounting.columns.invoice'),
                size: 100,
                cell: ({ row }) => row.original.invoice_number || '—'
            },
            {
                accessorKey: 'description',
                header: t('accounting.columns.description'),
                size: 300,
            },
            {
                accessorKey: 'currency',
                header: t('accounting.columns.currency'),
                size: 70,
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.currency || 'SAR'}</span>
            },
            {
                accessorKey: 'exchange_rate',
                header: t('accounting.columns.exchangeRate'),
                size: 80,
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.exchange_rate?.toFixed(4)}</span>
            },
            {
                accessorKey: 'cost_center_id',
                header: t('accounting.columns.costCenter'),
                size: 100,
                cell: ({ row }) => row.original.cost_center_name || '—'
            },
        ];
    }, [language]);

    const editableColumns = useMemo(() => [
        { key: 'debit', type: 'number' as const, min: 0 },
        { key: 'account_id', type: 'account' as const, required: true },
        {
            key: 'link_type', type: 'select' as const, options: [
                { value: 'none', label: t('accounting.linkTypes.none') },
                { value: 'invoice', label: t('accounting.linkTypes.invoice') },
                { value: 'salary', label: t('accounting.linkTypes.salary') },
                { value: 'advance', label: t('accounting.linkTypes.advance') },
                { value: 'expense', label: t('accounting.linkTypes.expense') }
            ]
        },
        { key: 'invoice_id', type: 'text' as const },
        { key: 'description', type: 'text' as const },
        { key: 'cost_center_id', type: 'text' as const },
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
                    <span className="font-bold text-sm text-red-700 capitalize">{t('accounting.payment.title')}</span>
                    <span className="text-[10px] opacity-70">{t('accounting.type')}</span>
                </Card>
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm">
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <FileText className="w-4 h-4" />
                        <span className="font-bold text-sm">{lines.length}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.lines')}</span>
                </Card>
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm col-span-2">
                    <span className="font-bold text-xl text-red-600 font-mono">
                        {totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm text-muted-foreground">SAR</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.totalAmount')}</span>
                </Card>
            </div>

            <div className="grid grid-cols-12 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="col-span-12 md:col-span-6 animate-in fade-in zoom-in-95 duration-200">
                    <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-red-500" />
                        {t('accounting.payment.fund')}
                    </Label>
                    <SmartAccountSelector
                        value={fundAccountId}
                        onChange={(val) => setFundAccountId(val)}
                        type="all"
                        placeholder={t('accounting.placeholders.selectBankFund')}
                        disabled={isReadOnly}
                    />
                </div>
                <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1 block transform translate-y-0.5">
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

            <div className="border rounded-xl shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
                <NexaDataTable
                    key="payment-grid-v1"
                    data={lines}
                    columns={columns}
                    isRTL={isRTL}
                    persistKey="accounting-payment-lines-v5"

                    enableExcelMode={true}
                    enablePagination={false}
                    maxHeight="500px"

                    showTotalsFooter={true}
                    debitKey="debit" // Show debit total
                    showAmountInWords={true}
                    enableSequenceNumber={true}

                    enableEditMode={!isReadOnly}
                    enableInstantEdit={!isReadOnly}
                    editableColumns={editableColumns}
                    onDataChange={handleDataChange}
                    onAddRow={handleAddRow}
                    initialEmptyRows={isCreate ? 5 : 0}
                    cleanEmptyRowsOnSave={true}
                    canDeleteRows={!isReadOnly}
                    enableBalanceShortcut={true}
                />
            </div>
        </div>
    );
}
