/**
 * ════════════════════════════════════════════════════════════════
 * 💸 FundTransferTab - مكون التحويل بين الصناديق
 * 
 * Simple form for fund-to-fund transfers.
 * Creates a journal entry with two lines: debit from source, credit to target.
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SmartAccountSelector } from '../../shared/SmartAccountSelector';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { SheetMode } from '../types';
import {
    ArrowRightLeft,
    Calendar as CalendarIcon,
    Wallet,
    ArrowDown,
    CheckCircle2,
} from 'lucide-react';

export interface FundTransferTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    onSaveComplete?: () => void;
    companyId?: string;
}

export function FundTransferTab({
    data,
    mode,
    onChange,
    onSaveComplete,
    companyId: propCompanyId,
}: FundTransferTabProps) {
    const { t, language, direction } = useLanguage();
    const { companyId: hookCompanyId } = useCompany();
    const isRTL = direction === 'rtl' || language === 'ar';
    const isReadOnly = mode === 'view';
    const isCreate = mode === 'create';
    const effectiveCompanyId = propCompanyId || hookCompanyId;

    // ─── Form State ───
    const [transferDate, setTransferDate] = useState<Date>(new Date());
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');

    // ─── Load existing data ───
    useEffect(() => {
        if (data && !isCreate) {
            setTransferDate(data.entry_date ? new Date(data.entry_date) : new Date());
            setFromAccountId(data.from_account_id || data.lines?.[0]?.account_id || '');
            setToAccountId(data.to_account_id || data.lines?.[1]?.account_id || '');
            setAmount(Number(data.amount) || Number(data.total_debit) || 0);
            setDescription(data.description || '');
            setReference(data.reference || '');
        }
    }, [data, isCreate]);

    // ─── Sync to parent ───
    useEffect(() => {
        if (!isReadOnly) {
            onChange({
                entry_date: format(transferDate, 'yyyy-MM-dd'),
                entry_type: 'transfer',
                from_account_id: fromAccountId,
                to_account_id: toAccountId,
                amount,
                description,
                reference,
                total_debit: amount,
                total_credit: amount,
                lines: [
                    { account_id: fromAccountId, debit: 0, credit: amount, description: description || t('accounting.fundTransfer.title') },
                    { account_id: toAccountId, debit: amount, credit: 0, description: description || t('accounting.fundTransfer.title') },
                ],
            });
        }
    }, [transferDate, fromAccountId, toAccountId, amount, description, reference, isReadOnly]);

    const isValid = fromAccountId && toAccountId && amount > 0 && fromAccountId !== toAccountId;

    return (
        <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <ArrowRightLeft className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {t('accounting.fundTransfer.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {isRTL ? 'نقل الأموال من صندوق/بنك إلى آخر' : 'Move funds between cash/bank accounts'}
                    </p>
                </div>
            </div>

            {/* Transfer Form */}
            <Card className="p-6 space-y-6">
                {/* Date & Reference */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                            {t('accounting.fundTransfer.date')}
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild disabled={isReadOnly}>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal h-9"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {format(transferDate, "PPP", { locale: language === 'ar' ? ar : undefined })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={transferDate}
                                    onSelect={(d) => d && setTransferDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                            {t('accounting.fundTransfer.reference')}
                        </Label>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder={t('accounting.placeholders.transferRef')}
                            readOnly={isReadOnly}
                            className="h-9"
                        />
                    </div>
                </div>

                {/* FROM Account */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-red-500" />
                        {t('accounting.fundTransfer.fromFund')}
                    </Label>
                    {!isReadOnly ? (
                        <SmartAccountSelector
                            value={fromAccountId}
                            onChange={setFromAccountId}
                            placeholder={t('accounting.placeholders.selectFund')}
                            className="border-red-200 focus:ring-red-200"
                        />
                    ) : (
                        <div className="h-9 border rounded-md px-3 flex items-center bg-gray-50 text-sm font-medium">
                            {fromAccountId || '—'}
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 flex items-center justify-center shadow-sm">
                        <ArrowDown className="w-5 h-5 text-orange-600" />
                    </div>
                </div>

                {/* TO Account */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-green-500" />
                        {t('accounting.fundTransfer.toFund')}
                    </Label>
                    {!isReadOnly ? (
                        <SmartAccountSelector
                            value={toAccountId}
                            onChange={setToAccountId}
                            placeholder={t('accounting.placeholders.selectFund')}
                            className="border-green-200 focus:ring-green-200"
                        />
                    ) : (
                        <div className="h-9 border rounded-md px-3 flex items-center bg-gray-50 text-sm font-medium">
                            {toAccountId || '—'}
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        {t('accounting.fundTransfer.amount')}
                    </Label>
                    <Input
                        type="number"
                        min={0}
                        value={amount || ''}
                        onChange={(e) => setAmount(Number(e.target.value) || 0)}
                        readOnly={isReadOnly}
                        className="text-center text-xl font-bold font-mono h-14 bg-blue-50/30 border-blue-200"
                        placeholder="0.00"
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        {t('accounting.fundTransfer.description')}
                    </Label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        readOnly={isReadOnly}
                        placeholder={t('accounting.placeholders.descriptionDots')}
                        rows={2}
                        className="resize-none"
                    />
                </div>
            </Card>

            {/* Validation */}
            {fromAccountId === toAccountId && fromAccountId && (
                <div className="text-xs text-red-500 text-center">
                    {isRTL ? '⚠️ لا يمكن التحويل لنفس الصندوق' : '⚠️ Cannot transfer to the same fund'}
                </div>
            )}

            {isValid && (
                <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isRTL
                        ? `سيتم تحويل ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} من الصندوق المصدر إلى الهدف`
                        : `Will transfer ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} from source to target`
                    }
                </div>
            )}
        </div>
    );
}

export default FundTransferTab;
