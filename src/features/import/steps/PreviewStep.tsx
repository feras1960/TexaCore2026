/**
 * Preview Step - خطوة معاينة البيانات قبل الاستيراد
 */

import React, { useState } from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  BookOpen
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';

interface PreviewStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  entityType: string | null;
  options: ImportOptions;
  onExecute: () => void;
  isLoading: boolean;
}

export function PreviewStep({
  importJob,
  importRows,
  entityDefinition,
  entityType,
  options,
  onExecute,
  isLoading
}: PreviewStepProps) {
  const { t, language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 15;

  if (!importJob || !entityDefinition) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
        <h3 className="text-lg font-semibold">
          {language === 'ar' ? 'لا توجد بيانات للمعاينة' : 'No data to preview'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {language === 'ar'
            ? 'يرجى إكمال خطوة التحقق أولاً'
            : 'Please complete the validation step first'}
        </p>
      </div>
    );
  }

  // Get rows to import based on options
  const rowsToImport = options.skip_invalid_rows
    ? importRows.filter(r => r.status === 'valid')
    : importRows;

  const paginatedRows = rowsToImport.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const totalPages = Math.ceil(rowsToImport.length / pageSize);

  // Get display fields (first 5)
  const displayFields = entityDefinition.fields.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">
              {t('import.readyToImport')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('import.reviewAndConfirm')}
            </p>

            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {rowsToImport.length}
                </Badge>
                <span className="text-sm">{t('import.recordsToImport')}</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {language === 'ar'
                    ? entityDefinition.display_name_ar
                    : entityDefinition.display_name_en}
                </Badge>
                <span className="text-sm">{t('import.entityType')}</span>
              </div>

              {options.update_existing && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t('import.updateEnabled')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Data Preview Table */}
      <Card>
        <div className="p-4 border-b">
          <h4 className="font-medium">{t('import.dataPreview')}</h4>
          <p className="text-sm text-muted-foreground">
            {t('import.showing')} {paginatedRows.length} {t('import.of')} {rowsToImport.length}
          </p>
        </div>

        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] sticky top-0 bg-background">#</TableHead>
                {displayFields.map(field => (
                  <TableHead key={field.name} className="sticky top-0 bg-background">
                    {language === 'ar' ? field.label_ar : field.label_en}
                    {field.required && <span className="text-red-500">*</span>}
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 bg-background">{t('import.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => (
                <TableRow key={row.row_number}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {row.row_number}
                  </TableCell>
                  {displayFields.map(field => (
                    <TableCell key={field.name} className="max-w-[200px] truncate">
                      {row.mapped_data?.[field.name]?.toString() || '-'}
                    </TableCell>
                  ))}
                  <TableCell>
                    {row.status === 'valid' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              {t('common.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('import.page')} {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </Card>

      {/* Import Options Summary */}
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

      {/* Opening Balance Journal Preview */}
      {(entityType === 'customers' || entityType === 'suppliers' || entityType === 'products') && (() => {
        const validRows = options.skip_invalid_rows
          ? importRows.filter(r => r.status === 'valid')
          : importRows;

        // حساب الأرصدة الافتتاحية
        type PreviewLine = { name: string; code: string; debit: number; credit: number };
        const journalLines: PreviewLine[] = [];

        if (entityType === 'customers') {
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const bal = Number(d.opening_balance) || 0;
            if (bal === 0) continue;
            journalLines.push({
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
            journalLines.push({
              name: String(d.name_ar || d.name_en || ''),
              code: String(d.code || ''),
              debit: bal < 0 ? Math.abs(bal) : 0,
              credit: bal > 0 ? Math.abs(bal) : 0,
            });
          }
        } else if (entityType === 'products') {
          let totalValue = 0;
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const qty = Number(d.opening_qty) || 0;
            const price = Number(d.cost_price) || 0;
            totalValue += qty * price;
          }
          if (totalValue > 0) {
            journalLines.push({
              name: language === 'ar' ? 'المخزون' : 'Inventory',
              code: '1140',
              debit: totalValue,
              credit: 0,
            });
          }
        }

        if (journalLines.length === 0) return null;

        const totalDebit = journalLines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = journalLines.reduce((s, l) => s + l.credit, 0);

        // إضافة سطر الأرصدة الافتتاحية المقابل
        const obDebit = totalCredit > totalDebit ? totalCredit - totalDebit : 0;
        const obCredit = totalDebit > totalCredit ? totalDebit - totalCredit : 0;

        return (
          <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800 dark:text-amber-300">
                {language === 'ar' ? 'معاينة القيد الافتتاحي' : 'Opening Balance Journal Preview'}
              </h4>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
              {language === 'ar'
                ? 'سيتم إنشاء هذا القيد المحاسبي تلقائياً عند تنفيذ الاستيراد'
                : 'This journal entry will be automatically created upon import execution'}
            </p>

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
                  {journalLines.map((line, i) => (
                    <TableRow key={i} className="bg-white/60 dark:bg-transparent">
                      <TableCell className="font-medium">
                        {line.code} - {line.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* سطر حساب الأرصدة الافتتاحية */}
                  <TableRow className="bg-amber-50 dark:bg-amber-900/20 font-medium">
                    <TableCell>
                      35 - {language === 'ar' ? 'أرصدة افتتاحية' : 'Opening Balance Equity'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {obDebit > 0 ? obDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {obCredit > 0 ? obCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </TableCell>
                  </TableRow>
                  {/* المجاميع */}
                  <TableRow className="bg-amber-100 dark:bg-amber-900/40 font-bold border-t-2 border-amber-300">
                    <TableCell>
                      {language === 'ar' ? 'المجموع' : 'Total'}
                    </TableCell>
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

            <div className="mt-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-400">
                {language === 'ar' ? 'القيد متوازن ✓' : 'Entry is balanced ✓'}
              </span>
            </div>
          </Card>
        );
      })()}

      {/* Execute Button */}
      <div className="flex justify-end">
        <Button
          onClick={onExecute}
          size="lg"
          disabled={isLoading || rowsToImport.length === 0}
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
