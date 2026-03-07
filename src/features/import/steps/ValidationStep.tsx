/**
 * Validation Step - خطوة عرض نتائج التحقق
 */

import React, { useState } from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';

interface ValidationStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  options: ImportOptions;
  onUpdateOptions: (updates: Partial<ImportOptions>) => void;
  onContinue: () => void;
  isLoading: boolean;
}

export function ValidationStep({
  importJob,
  importRows,
  entityDefinition,
  options,
  onUpdateOptions,
  onContinue,
  isLoading
}: ValidationStepProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  if (!importJob || !entityDefinition) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
        <h3 className="text-lg font-semibold">
          {language === 'ar' ? 'لم يتم التحقق من البيانات بعد' : 'Data not validated yet'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {language === 'ar'
            ? 'يرجى العودة لخطوة مطابقة الأعمدة والضغط على زر "التحقق من البيانات" أولاً'
            : 'Please go back to the Column Mapping step and click "Validate Data" first'}
        </p>
      </div>
    );
  }

  const validRows = importRows.filter(r => r.status === 'valid');
  const invalidRows = importRows.filter(r => r.status === 'invalid');

  const filteredRows = activeTab === 'all'
    ? importRows
    : activeTab === 'valid'
      ? validRows
      : invalidRows;

  const paginatedRows = filteredRows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  // Group errors by type
  const errorsByField: Record<string, number> = {};
  invalidRows.forEach(row => {
    row.validation_errors.forEach(err => {
      errorsByField[err.field] = (errorsByField[err.field] || 0) + 1;
    });
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{importJob.total_rows}</div>
              <div className="text-xs text-muted-foreground">{t('import.totalRows')}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
              <div className="text-xs text-muted-foreground">{t('import.validRows')}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-red-200 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
              <div className="text-xs text-muted-foreground">{t('import.invalidRows')}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {options.skip_invalid_rows ? validRows.length : importJob.total_rows}
              </div>
              <div className="text-xs text-muted-foreground">{t('import.willImport')}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Summary */}
      {Object.keys(errorsByField).length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            {t('import.errorSummary')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(errorsByField).map(([field, count]) => {
              const fieldDef = entityDefinition.fields.find(f => f.name === field);
              return (
                <Badge key={field} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {fieldDef ? (language === 'ar' ? fieldDef.label_ar : fieldDef.label_en) : field}
                  : {count}
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      {/* Options */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">{t('import.importOptions')}</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="skip-invalid" className="flex-1">
              <div>{t('import.skipInvalidRows')}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('import.skipInvalidRowsDescription')}
              </p>
            </Label>
            <Switch
              id="skip-invalid"
              checked={options.skip_invalid_rows}
              onCheckedChange={(checked) => onUpdateOptions({ skip_invalid_rows: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="update-existing" className="flex-1">
              <div>{t('import.updateExisting')}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('import.updateExistingDescription')}
              </p>
            </Label>
            <Switch
              id="update-existing"
              checked={options.update_existing}
              onCheckedChange={(checked) => onUpdateOptions({ update_existing: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="use-ai" className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                {t('import.useAIAnalysis')}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('import.useAIAnalysisDescription')}
              </p>
            </Label>
            <Switch
              id="use-ai"
              checked={options.use_ai_analysis}
              onCheckedChange={(checked) => onUpdateOptions({ use_ai_analysis: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Data Preview */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setCurrentPage(0); }}>
          <div className="border-b p-2">
            <TabsList>
              <TabsTrigger value="all">
                {t('import.all')} ({importRows.length})
              </TabsTrigger>
              <TabsTrigger value="valid">
                {t('import.valid')} ({validRows.length})
              </TabsTrigger>
              <TabsTrigger value="invalid">
                {t('import.invalid')} ({invalidRows.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="m-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>{t('import.status')}</TableHead>
                  <TableHead>{t('import.data')}</TableHead>
                  <TableHead>{t('import.errors')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => (
                  <TableRow key={row.row_number}>
                    <TableCell className="font-mono text-sm">
                      {row.row_number}
                    </TableCell>
                    <TableCell>
                      {row.status === 'valid' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 me-1" />
                          {t('import.valid')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <XCircle className="h-3 w-3 me-1" />
                          {t('import.invalid')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-xs font-mono truncate">
                        {Object.entries(row.mapped_data || {})
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                        {Object.keys(row.mapped_data || {}).length > 3 && '...'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.validation_errors.length > 0 && (
                        <div className="text-xs text-red-600 space-y-1">
                          {row.validation_errors.slice(0, 2).map((err, i) => (
                            <div key={i}>{err.error}</div>
                          ))}
                          {row.validation_errors.length > 2 && (
                            <div className="text-muted-foreground">
                              +{row.validation_errors.length - 2} {t('import.moreErrors')}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

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
          </TabsContent>
        </Tabs>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button onClick={onContinue} size="lg">
          {options.use_ai_analysis ? t('import.continueToAI') : t('import.continueToPreview')}
          <ArrowRight className="h-4 w-4 ms-2" />
        </Button>
      </div>
    </div>
  );
}
