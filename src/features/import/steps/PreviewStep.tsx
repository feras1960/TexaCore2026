/**
 * Preview Step - خطوة معاينة البيانات قبل الاستيراد
 * مع إمكانية تعديل العملة والكمية والوحدة والمبلغ
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks';
import { useCompanyCurrencies, currencyMetadata } from '@/hooks/useCompanyCurrencies';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CheckCircle,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  BookOpen,
  Coins,
  Pencil
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';

interface PreviewStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  entityType: string | null;
  options: ImportOptions;
  onExecute: () => void;
  onUpdateRows?: (rows: ImportRow[]) => void;
  isLoading: boolean;
}

export function PreviewStep({
  importJob,
  importRows,
  entityDefinition,
  entityType,
  options,
  onExecute,
  onUpdateRows,
  isLoading
}: PreviewStepProps) {
  const { t, language } = useLanguage();
  const { supportedCurrencies, baseCurrency } = useCompanyCurrencies();
  const [currentPage, setCurrentPage] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [editMode, setEditMode] = useState(false);
  const pageSize = 15;

  // Is this an entity that needs currency?
  const needsCurrency = entityType === 'customers' || entityType === 'suppliers' || entityType === 'products';

  if (!importJob || !entityDefinition) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
        <h3 className="text-lg font-semibold">
          {language === 'ar' ? 'لا توجد بيانات للمعاينة' : 'No data to preview'}
        </h3>
      </div>
    );
  }

  // Check if ALL rows have currency
  const hasCurrencyInData = useMemo(() => {
    const validRows = importRows.filter(r => r.status === 'valid');
    return validRows.length > 0 && validRows.every(r => r.mapped_data?.currency);
  }, [importRows]);

  const currencyResolved = !needsCurrency || hasCurrencyInData || !!defaultCurrency;

  const rowsToImport = options.skip_invalid_rows
    ? importRows.filter(r => r.status === 'valid')
    : importRows;

  const paginatedRows = rowsToImport.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const totalPages = Math.ceil(rowsToImport.length / pageSize);
  const displayFields = entityDefinition.fields.slice(0, 5);

  // Currency display helper
  const getCurrencyLabel = (code: string) => {
    const meta = currencyMetadata[code];
    if (meta) return `${code} - ${language === 'ar' ? meta.nameAr : meta.name}`;
    return code;
  };

  // Apply default currency to all rows
  const handleCurrencyChange = (currency: string) => {
    setDefaultCurrency(currency);
    if (onUpdateRows) {
      const updatedRows = importRows.map(row => ({
        ...row,
        mapped_data: {
          ...row.mapped_data,
          currency: row.mapped_data?.currency || currency,
        }
      }));
      onUpdateRows(updatedRows);
    }
  };

  // Update single row field
  const updateRowField = useCallback((rowIndex: number, field: string, value: unknown) => {
    if (!onUpdateRows) return;
    const updated = importRows.map((row, i) => {
      if (i !== rowIndex) return row;
      return {
        ...row,
        mapped_data: { ...row.mapped_data, [field]: value }
      };
    });
    onUpdateRows(updated);
  }, [importRows, onUpdateRows]);

  // Editable fields per entity type
  const editableFields = useMemo(() => {
    if (entityType === 'customers' || entityType === 'suppliers') {
      return ['currency', 'opening_balance'];
    }
    if (entityType === 'products') {
      return ['currency', 'unit', 'opening_qty', 'cost_price', 'sale_price'];
    }
    return [];
  }, [entityType]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t('import.readyToImport')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('import.reviewAndConfirm')}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {rowsToImport.length}
                </Badge>
                <span className="text-sm">{t('import.recordsToImport')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {language === 'ar' ? entityDefinition.display_name_ar : entityDefinition.display_name_en}
                </Badge>
                <span className="text-sm">{t('import.entityType')}</span>
              </div>
            </div>
          </div>

          {/* Edit Mode Toggle */}
          {needsCurrency && editableFields.length > 0 && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              {editMode
                ? (language === 'ar' ? 'إنهاء التعديل' : 'Done Editing')
                : (language === 'ar' ? 'تعديل البيانات' : 'Edit Data')}
            </Button>
          )}
        </div>
      </Card>

      {/* Default Currency Selector */}
      {needsCurrency && !hasCurrencyInData && (
        <Card className={`p-4 border-2 ${defaultCurrency ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-red-300 bg-red-50/50 dark:bg-red-950/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${defaultCurrency ? 'bg-green-100' : 'bg-red-100'}`}>
              <Coins className={`h-5 w-5 ${defaultCurrency ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${defaultCurrency ? 'text-green-800' : 'text-red-800'}`}>
                {language === 'ar' ? 'العملة (إجباري) ⚠️' : 'Currency (Required) ⚠️'}
              </h4>
              <p className={`text-xs mt-0.5 ${defaultCurrency ? 'text-green-600' : 'text-red-600'}`}>
                {language === 'ar'
                  ? 'لم يتم تحديد العملة في البيانات. يجب اختيار العملة قبل الاستيراد'
                  : 'Currency not found in data. Must select currency before importing'}
              </p>
            </div>
            <Select value={defaultCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className={`w-[240px] bg-white dark:bg-background ${!defaultCurrency ? 'border-red-400 ring-1 ring-red-300' : 'border-green-400'}`}>
                <SelectValue placeholder={language === 'ar' ? '⚠️ اختر العملة...' : '⚠️ Select currency...'} />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.length > 0
                  ? supportedCurrencies.map(code => (
                    <SelectItem key={code} value={code}>
                      {getCurrencyLabel(code)}
                    </SelectItem>
                  ))
                  : <SelectItem value={baseCurrency || 'USD'}>{getCurrencyLabel(baseCurrency || 'USD')}</SelectItem>
                }
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {/* Data Preview Table with Edit Mode */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h4 className="font-medium">{t('import.dataPreview')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('import.showing')} {paginatedRows.length} {t('import.of')} {rowsToImport.length}
              {editMode && (
                <span className="ms-2 text-amber-600 font-medium">
                  — {language === 'ar' ? 'وضع التعديل' : 'Edit Mode'}
                </span>
              )}
            </p>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] sticky top-0 bg-background">#</TableHead>
                <TableHead className="sticky top-0 bg-background">
                  {language === 'ar' ? 'الكود' : 'Code'}
                </TableHead>
                <TableHead className="sticky top-0 bg-background">
                  {language === 'ar' ? 'الاسم' : 'Name'}
                </TableHead>
                {entityType === 'products' && editMode && (
                  <>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'الوحدة' : 'Unit'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'الكمية' : 'Qty'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'سعر التكلفة' : 'Cost'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'سعر البيع' : 'Sale'}
                    </TableHead>
                  </>
                )}
                {(entityType === 'customers' || entityType === 'suppliers') && editMode && (
                  <TableHead className="sticky top-0 bg-background">
                    {language === 'ar' ? 'الرصيد الافتتاحي' : 'Balance'}
                  </TableHead>
                )}
                {editMode && (
                  <TableHead className="sticky top-0 bg-background w-[130px]">
                    {language === 'ar' ? 'العملة' : 'Currency'}
                  </TableHead>
                )}
                {!editMode && displayFields.slice(2).map(field => (
                  <TableHead key={field.name} className="sticky top-0 bg-background">
                    {language === 'ar' ? field.label_ar : field.label_en}
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 bg-background w-[40px]">✓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => {
                const globalIdx = importRows.indexOf(row);
                const d = row.mapped_data || {};
                return (
                  <TableRow key={row.row_number}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.row_number}</TableCell>
                    <TableCell className="font-mono text-sm">{String(d.code || '-')}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{String(d.name_ar || d.name_en || '-')}</TableCell>

                    {entityType === 'products' && editMode && (
                      <>
                        <TableCell>
                          <Select
                            value={String(d.unit || 'unit')}
                            onValueChange={(v) => updateRowField(globalIdx, 'unit', v)}
                          >
                            <SelectTrigger className="h-8 w-[90px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="meter">{language === 'ar' ? 'متر' : 'Meter'}</SelectItem>
                              <SelectItem value="kg">{language === 'ar' ? 'كغ' : 'Kg'}</SelectItem>
                              <SelectItem value="unit">{language === 'ar' ? 'قطعة' : 'Unit'}</SelectItem>
                              <SelectItem value="roll">{language === 'ar' ? 'رولون' : 'Roll'}</SelectItem>
                              <SelectItem value="box">{language === 'ar' ? 'صندوق' : 'Box'}</SelectItem>
                              <SelectItem value="pack">{language === 'ar' ? 'حزمة' : 'Pack'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(d.opening_qty ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'opening_qty', e.target.value)}
                            className="h-8 w-[80px] text-xs text-center"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(d.cost_price ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'cost_price', e.target.value)}
                            className="h-8 w-[90px] text-xs text-center"
                            min={0}
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(d.sale_price ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'sale_price', e.target.value)}
                            className="h-8 w-[90px] text-xs text-center"
                            min={0}
                            step="0.01"
                          />
                        </TableCell>
                      </>
                    )}

                    {(entityType === 'customers' || entityType === 'suppliers') && editMode && (
                      <TableCell>
                        <Input
                          type="number"
                          value={String(d.opening_balance ?? '')}
                          onChange={(e) => updateRowField(globalIdx, 'opening_balance', e.target.value)}
                          className="h-8 w-[110px] text-xs text-center"
                          step="0.01"
                        />
                      </TableCell>
                    )}

                    {editMode && (
                      <TableCell>
                        <Select
                          value={String(d.currency || defaultCurrency || baseCurrency || '')}
                          onValueChange={(v) => updateRowField(globalIdx, 'currency', v)}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedCurrencies.length > 0
                              ? supportedCurrencies.map(code => (
                                <SelectItem key={code} value={code}>{code}</SelectItem>
                              ))
                              : <SelectItem value={baseCurrency || 'USD'}>{baseCurrency || 'USD'}</SelectItem>
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}

                    {!editMode && displayFields.slice(2).map(field => (
                      <TableCell key={field.name} className="max-w-[150px] truncate text-sm">
                        {d[field.name]?.toString() || '-'}
                      </TableCell>
                    ))}

                    <TableCell>
                      {row.status === 'valid'
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('import.page')} {currentPage + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
              {t('common.next')}
            </Button>
          </div>
        )}
      </Card>

      {/* Import Options */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">{t('import.importSettings')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${options.skip_invalid_rows ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>{t('import.skipInvalidRows')}: {options.skip_invalid_rows ? t('common.yes') : t('common.no')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${options.update_existing ? 'bg-yellow-500' : 'bg-gray-300'}`} />
            <span>{t('import.updateExisting')}: {options.update_existing ? t('common.yes') : t('common.no')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${options.use_ai_analysis ? 'bg-purple-500' : 'bg-gray-300'}`} />
            <span>{t('import.aiAnalysis')}: {options.use_ai_analysis ? t('common.yes') : t('common.no')}</span>
          </div>
        </div>
      </Card>

      {/* Opening Balance Journal Preview — قيد منفصل لكل عملة */}
      {needsCurrency && (() => {
        const validRows = options.skip_invalid_rows
          ? importRows.filter(r => r.status === 'valid')
          : importRows;

        type PreviewLine = { name: string; code: string; debit: number; credit: number };
        const linesByCurrency: Map<string, PreviewLine[]> = new Map();

        const addLine = (currency: string, line: PreviewLine) => {
          if (!linesByCurrency.has(currency)) linesByCurrency.set(currency, []);
          linesByCurrency.get(currency)!.push(line);
        };

        if (entityType === 'customers') {
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const bal = Number(d.opening_balance) || 0;
            if (bal === 0) continue;
            const cur = String(d.currency || defaultCurrency || 'USD');
            addLine(cur, {
              name: String(d.name_ar || d.name_en || ''),
              code: String(d.code || ''),
              debit: bal > 0 ? Math.abs(bal) : 0,
              credit: bal < 0 ? Math.abs(bal) : 0,
            });
          }
        } else if (entityType === 'suppliers') {
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const bal = Number(d.opening_balance) || 0;
            if (bal === 0) continue;
            const cur = String(d.currency || defaultCurrency || 'USD');
            addLine(cur, {
              name: String(d.name_ar || d.name_en || ''),
              code: String(d.code || ''),
              debit: bal < 0 ? Math.abs(bal) : 0,
              credit: bal > 0 ? Math.abs(bal) : 0,
            });
          }
        } else if (entityType === 'products') {
          const valuesByCur: Map<string, number> = new Map();
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const qty = Number(d.opening_qty) || 0;
            const price = Number(d.cost_price) || 0;
            const cur = String(d.currency || defaultCurrency || 'USD');
            const value = qty * price;
            if (value > 0) {
              valuesByCur.set(cur, (valuesByCur.get(cur) || 0) + value);
            }
          }
          for (const [cur, totalValue] of valuesByCur) {
            addLine(cur, {
              name: language === 'ar' ? 'المخزون' : 'Inventory',
              code: '1140',
              debit: totalValue,
              credit: 0,
            });
          }
        }

        if (linesByCurrency.size === 0) return null;

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800 dark:text-amber-300">
                {language === 'ar'
                  ? `معاينة القيود الافتتاحية (${linesByCurrency.size} ${linesByCurrency.size === 1 ? 'قيد' : 'قيود'})`
                  : `Opening Balance Preview (${linesByCurrency.size} ${linesByCurrency.size === 1 ? 'entry' : 'entries'})`}
              </h4>
            </div>

            {Array.from(linesByCurrency).map(([currency, lines]) => {
              const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
              const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
              const obDebit = totalCredit > totalDebit ? totalCredit - totalDebit : 0;
              const obCredit = totalDebit > totalCredit ? totalDebit - totalCredit : 0;

              return (
                <Card key={currency} className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-600 text-white text-xs">{currency}</Badge>
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      {language === 'ar'
                        ? `قيد أرصدة افتتاحية - ${currency}`
                        : `Opening Balance - ${currency}`}
                    </span>
                  </div>

                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-100/70 dark:bg-amber-900/30">
                          <TableHead className="text-amber-900 dark:text-amber-200">
                            {language === 'ar' ? 'الحساب' : 'Account'}
                          </TableHead>
                          <TableHead className="text-right text-amber-900 dark:text-amber-200">
                            {language === 'ar' ? 'مدين' : 'Debit'}
                          </TableHead>
                          <TableHead className="text-right text-amber-900 dark:text-amber-200">
                            {language === 'ar' ? 'دائن' : 'Credit'}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, i) => (
                          <TableRow key={i} className="bg-white/60 dark:bg-transparent">
                            <TableCell className="font-medium">{line.code} - {line.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-amber-50 dark:bg-amber-900/20 font-medium">
                          <TableCell>35 - {language === 'ar' ? 'أرصدة افتتاحية' : 'Opening Balance'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {obDebit > 0 ? obDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {obCredit > 0 ? obCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-amber-100 dark:bg-amber-900/40 font-bold border-t-2 border-amber-300">
                          <TableCell>{language === 'ar' ? 'المجموع' : 'Total'} ({currency})</TableCell>
                          <TableCell className="text-right font-mono">
                            {(totalDebit + obDebit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(totalCredit + obCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-700 dark:text-green-400">
                      {language === 'ar' ? 'متوازن ✓' : 'Balanced ✓'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Execute Button */}
      <div className="flex justify-end gap-3 items-center">
        {!currencyResolved && (
          <span className="text-sm text-red-600 font-medium">
            {language === 'ar' ? '⚠️ يجب اختيار العملة أولاً' : '⚠️ Currency required'}
          </span>
        )}
        <Button
          onClick={onExecute}
          size="lg"
          disabled={isLoading || rowsToImport.length === 0 || !currencyResolved}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('import.importing')}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t('import.startImport')} ({rowsToImport.length} {t('import.records')})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
