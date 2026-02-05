import React, { useCallback, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calculator, Info } from "lucide-react";
import { useLanguage } from '@/app/providers/LanguageProvider';
import { currencies, costCenters } from '../data/accountingData';
import { SmartAccountSelector } from './shared/SmartAccountSelector';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

export interface JournalEntryGridRef {
    getAllRows: () => any[];
    stopEditing: () => void;
}

interface JournalEntryGridProps {
    rowData: any[];
    onDataChange: (newData: any[]) => void;
    readOnly?: boolean;
    voucherType?: string;
    onAddRows?: () => void;
    companyId?: string;
}

const JournalEntryGrid = forwardRef<JournalEntryGridRef, JournalEntryGridProps>(({ rowData, onDataChange, readOnly = false, voucherType = 'journal', onAddRows, companyId }, ref) => {
    const { t, direction } = useLanguage();

    // Local state to manage rows to ensure we can edit them freely
    // We sync from props if they change externally (e.g. initial load)
    const [rows, setRows] = useState<any[]>(rowData);

    useEffect(() => {
        setRows(rowData);
    }, [rowData]);

    const updateRow = (index: number, field: string, value: any) => {
        if (readOnly) return;
        const newRows = [...rows];
        const row = { ...newRows[index], [field]: value };

        // Auto balance logic
        if (voucherType === 'journal' || voucherType === 'cash') {
            if (field === 'debit' && Number(value) > 0) {
                row.credit = 0;
            } else if (field === 'credit' && Number(value) > 0) {
                row.debit = 0;
            }
        }

        // If account is selected, populate name/code
        if (field === 'accountId' && value && typeof value === 'object') {
            // Value here is the Account object from selector
            row.accountId = value.id;
            row.accountName = value.name_ar; // store both or localized?
            row.accountCode = value.code;
            // We just store ID mostly, but helper fields are good
        }

        newRows[index] = row;
        setRows(newRows);
        onDataChange(newRows);
    };

    const handleDeleteRow = (index: number) => {
        if (readOnly) return;
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
        onDataChange(newRows);
    };

    useImperativeHandle(ref, () => ({
        getAllRows: () => rows,
        stopEditing: () => { /* No-op for react state */ }
    }));

    // Totals
    const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
    const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px] text-center">#</TableHead>

                            {/* Dynamic Headers based on Voucher Type */}
                            {(voucherType === 'journal' || voucherType === 'cash') ? (
                                <>
                                    <TableHead className="w-[120px] text-end text-green-700">{voucherType === 'cash' ? 'مقبوضات' : t('accounting.debit')}</TableHead>
                                    <TableHead className="w-[120px] text-end text-red-700">{voucherType === 'cash' ? 'مدفوعات' : t('accounting.credit')}</TableHead>
                                </>
                            ) : (
                                <TableHead className="w-[140px] text-end text-blue-700">{t('accounting.amount')}</TableHead>
                            )}

                            <TableHead className="min-w-[200px]">{t('accounting.account.name')}</TableHead>
                            <TableHead className="min-w-[150px]">{t('accounting.description')}</TableHead>
                            <TableHead className="w-[130px]">{t('accounting.costCenter')}</TableHead>
                            <TableHead className="w-[90px]">{t('accounting.currency')}</TableHead>
                            <TableHead className="w-[90px]">{t('accounting.exchangeRate')}</TableHead>
                            {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={row.id || index} className="group">
                                <TableCell className="text-center font-mono text-muted-foreground text-xs py-1">
                                    {index + 1}
                                </TableCell>

                                {/* Amounts */}
                                {(voucherType === 'journal' || voucherType === 'cash') ? (
                                    <>
                                        <TableCell className="p-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={row.debit || ''}
                                                onChange={(e) => updateRow(index, 'debit', e.target.value)}
                                                className="h-8 text-end font-mono text-green-700 font-bold bg-green-50/10 focus:bg-white border-transparent hover:border-input focus:border-input"
                                                readOnly={readOnly}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={row.credit || ''}
                                                onChange={(e) => updateRow(index, 'credit', e.target.value)}
                                                className="h-8 text-end font-mono text-red-700 font-bold bg-red-50/10 focus:bg-white border-transparent hover:border-input focus:border-input"
                                                readOnly={readOnly}
                                            />
                                        </TableCell>
                                    </>
                                ) : (
                                    <TableCell className="p-1">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.amount || ''} // Using 'amount' generic prop for other vouchers
                                            onChange={(e) => updateRow(index, 'amount', e.target.value)}
                                            className="h-8 text-end font-mono text-blue-700 font-bold bg-blue-50/10 focus:bg-white border-transparent hover:border-input focus:border-input"
                                            readOnly={readOnly}
                                        />
                                    </TableCell>
                                )}

                                {/* Account Selector */}
                                <TableCell className="p-1">
                                    {readOnly ? (
                                        <div className="text-sm px-2">
                                            <p className="font-medium">{row.accountName}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{row.accountCode}</p>
                                        </div>
                                    ) : (
                                        <SmartAccountSelector
                                            value={row.accountId}
                                            onChange={(id, acc) => updateRow(index, 'accountId', acc)}
                                            companyId={companyId}
                                            className="h-8 border-transparent hover:border-input bg-transparent"
                                        />
                                    )}
                                </TableCell>

                                {/* Description */}
                                <TableCell className="p-1">
                                    <Input
                                        value={row.description || ''}
                                        onChange={(e) => updateRow(index, 'description', e.target.value)}
                                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                                        readOnly={readOnly}
                                    />
                                </TableCell>

                                {/* Cost Center */}
                                <TableCell className="p-1">
                                    {readOnly ? (
                                        <span className="text-xs px-2">{costCenters.find(c => c.id === row.costCenter)?.name}</span>
                                    ) : (
                                        <Select
                                            value={row.costCenter}
                                            onValueChange={(val) => updateRow(index, 'costCenter', val)}
                                        >
                                            <SelectTrigger className="h-8 border-transparent hover:border-input bg-transparent">
                                                <SelectValue placeholder="" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {costCenters.map(cc => (
                                                    <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </TableCell>

                                {/* Currency */}
                                <TableCell className="p-1">
                                    {readOnly ? (
                                        <span className="text-xs text-center block">{row.currency}</span>
                                    ) : (
                                        <Select
                                            value={row.currency || 'SAR'}
                                            onValueChange={(val) => updateRow(index, 'currency', val)}
                                        >
                                            <SelectTrigger className="h-8 border-transparent hover:border-input bg-transparent px-1 min-w-[60px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {currencies.map(c => (
                                                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </TableCell>

                                {/* Rate */}
                                <TableCell className="p-1">
                                    <Input
                                        type="number"
                                        value={row.exchangeRate || 1}
                                        onChange={(e) => updateRow(index, 'exchangeRate', e.target.value)}
                                        className="h-8 text-center border-transparent hover:border-input focus:border-input bg-transparent font-mono text-xs"
                                        readOnly={readOnly}
                                    />
                                </TableCell>

                                {/* Actions */}
                                {!readOnly && (
                                    <TableCell className="p-1 text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteRow(index)}
                                            tabIndex={-1}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>

                    {(voucherType === 'journal' || voucherType === 'cash') && (
                        <TableFooter>
                            <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
                                <TableCell className="text-center">{t('accounting.total')}</TableCell>
                                <TableCell className="text-end font-mono text-green-700">{totalDebit.toFixed(2)}</TableCell>
                                <TableCell className="text-end font-mono text-red-700">{totalCredit.toFixed(2)}</TableCell>
                                <TableCell colSpan={6} className="text-sm font-normal text-muted-foreground">
                                    {!isBalanced && (
                                        <span className="flex items-center gap-2 text-red-600 animate-pulse">
                                            <Info className="h-4 w-4" />
                                            {t('accounting.unbalanced_entry')} ({Math.abs(totalDebit - totalCredit).toFixed(2)})
                                        </span>
                                    )}
                                    {isBalanced && totalDebit > 0 && (
                                        <span className="flex items-center gap-2 text-green-600">
                                            <Calculator className="h-4 w-4" />
                                            {t('accounting.balanced_entry')}
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </div>

            {!readOnly && onAddRows && (
                <Button
                    variant="outline"
                    className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                    onClick={onAddRows}
                >
                    <Plus className="h-4 w-4 me-2" />
                    {t('accounting.add_line')}
                </Button>
            )}
        </div>
    );
});

JournalEntryGrid.displayName = 'JournalEntryGrid';
export default JournalEntryGrid;
