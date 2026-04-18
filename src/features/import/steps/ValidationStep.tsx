/**
 * Validation Step - خطوة عرض نتائج التحقق
 * مع دعم كشف المستودعات المفقودة وحلها (Task 3)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Warehouse,
  PlusCircle,
  Link2,
  Building2,
  Loader2,
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';
import type { WarehouseInfo, WarehouseResolution, BranchInfo } from '../hooks/useImportWizard';

interface ValidationStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  options: ImportOptions;
  onUpdateOptions: (updates: Partial<ImportOptions>) => void;
  onContinue: () => void;
  isLoading: boolean;
  // Warehouse conflict resolution (Task 3)
  missingWarehouses?: string[];
  warehouseResolutions?: Record<string, WarehouseResolution>;
  warehouseList?: WarehouseInfo[];
  branchList?: BranchInfo[];
  onUpdateWarehouseResolution?: (name: string, resolution: Partial<WarehouseResolution>) => void;
  onResolveWarehouses?: () => void;
}

export function ValidationStep({
  importJob,
  importRows,
  entityDefinition,
  options,
  onUpdateOptions,
  onContinue,
  isLoading,
  missingWarehouses = [],
  warehouseResolutions = {},
  warehouseList = [],
  branchList = [],
  onUpdateWarehouseResolution,
  onResolveWarehouses,
}: ValidationStepProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when validation step loads (especially to show warehouse warning)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [importJob?.id, missingWarehouses.length]);

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

  // ═══ Warehouse Conflict UI helpers ═══
  const hasMissingWarehouses = missingWarehouses.length > 0;
  const allResolved = hasMissingWarehouses && missingWarehouses.every(name => {
    const res = warehouseResolutions[name];
    if (!res) return false;
    if (res.action === 'map') return !!res.target;
    return true; // 'create' is always resolvable
  });

  const warehouseTypeOptions = [
    { value: 'regular', label: language === 'ar' ? 'عادي' : 'Regular' },
    { value: 'offline_market', label: language === 'ar' ? 'سوق خارجي' : 'Offline Market' },
    { value: 'van', label: language === 'ar' ? 'سيارة توزيع' : 'Van' },
  ];

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ══════════════════════════════════════════════
          TASK 3: Missing Warehouses Warning Card
         ══════════════════════════════════════════════ */}
      {hasMissingWarehouses && (
        <Card className="border-2 border-orange-300 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-700/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-orange-200 dark:border-orange-800/40">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
              <Warehouse className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                {language === 'ar'
                  ? `⚠️ مستودعات غير موجودة في النظام (${missingWarehouses.length})`
                  : `⚠️ Warehouses not found in system (${missingWarehouses.length})`}
              </h4>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                {language === 'ar'
                  ? 'يرجى إنشاء المستودعات أو ربطها بمستودعات موجودة قبل المتابعة'
                  : 'Please create or map each warehouse before continuing'}
              </p>
            </div>
            {/* Resolve All Button */}
            {allResolved && (
              <Button
                size="sm"
                onClick={onResolveWarehouses}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <PlusCircle className="h-4 w-4" />
                }
                {language === 'ar' ? 'تطبيق الحل' : 'Apply Resolution'}
              </Button>
            )}
          </div>

          {/* Per-warehouse resolution rows */}
          <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
            {missingWarehouses.map(warehouseName => {
              const res = warehouseResolutions[warehouseName] || { action: 'create', warehouse_type: 'main' };
              const isCreate = res.action === 'create';

              return (
                <div key={warehouseName} className="p-4 space-y-3">
                  {/* Warehouse name + action toggle */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Warehouse className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="font-medium text-sm text-orange-800 dark:text-orange-200">
                        {warehouseName}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
                        {language === 'ar' ? 'غير موجود' : 'not found'}
                      </Badge>
                    </div>

                    {/* Action toggle: Create / Map */}
                    <div className="flex items-center gap-1 ms-auto">
                      <button
                        onClick={() => onUpdateWarehouseResolution?.(warehouseName, { action: 'create' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isCreate
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 hover:bg-orange-50'
                        }`}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        {language === 'ar' ? 'إنشاء جديد' : 'Create New'}
                      </button>
                      <button
                        onClick={() => onUpdateWarehouseResolution?.(warehouseName, { action: 'map' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          !isCreate
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {language === 'ar' ? 'ربط بموجود' : 'Map to Existing'}
                      </button>
                    </div>
                  </div>

                  {/* ─── CREATE MODE: name + branch + type fields ─── */}
                  {isCreate && (
                    <div className="ms-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Display name override */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'اسم المستودع' : 'Warehouse Name'}
                        </label>
                        <Input
                          value={res.name_ar || warehouseName}
                          onChange={e => onUpdateWarehouseResolution?.(warehouseName, { name_ar: e.target.value })}
                          className="h-8 text-sm"
                          placeholder={warehouseName}
                        />
                      </div>

                      {/* Branch selection */}
                      {branchList.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {language === 'ar' ? 'الفرع التابع له' : 'Branch'}
                          </label>
                          <Select
                            value={res.branch_id || '__none__'}
                            onValueChange={v => onUpdateWarehouseResolution?.(warehouseName, { branch_id: v === '__none__' ? undefined : v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder={language === 'ar' ? 'اختر فرعاً...' : 'Select branch...'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">{language === 'ar' ? '— بدون فرع —' : '— No branch —'}</SelectItem>
                              {branchList.map(b => (
                                <SelectItem key={b.id} value={b.id}>
                                  {language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Warehouse type */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'نوع المستودع' : 'Warehouse Type'}
                        </label>
                        <Select
                          value={res.warehouse_type || 'main'}
                          onValueChange={v => onUpdateWarehouseResolution?.(warehouseName, { warehouse_type: v })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseTypeOptions.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* ─── MAP MODE: pick existing warehouse ─── */}
                  {!isCreate && (
                    <div className="ms-6">
                      <label className="text-xs text-muted-foreground block mb-1">
                        {language === 'ar' ? 'اربط بمستودع موجود:' : 'Map to existing warehouse:'}
                      </label>
                      {warehouseList.length > 0 ? (
                        <Select
                          value={res.target || ''}
                          onValueChange={v => onUpdateWarehouseResolution?.(warehouseName, { target: v })}
                        >
                          <SelectTrigger className="h-8 text-sm max-w-xs">
                            <SelectValue placeholder={language === 'ar' ? 'اختر مستودعاً...' : 'Select warehouse...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseList.map(w => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.code} — {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-red-500">
                          {language === 'ar' ? 'لا توجد مستودعات في النظام. استخدم خيار الإنشاء.' : 'No warehouses in system. Use create option.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create All shortcut */}
          {missingWarehouses.length > 1 && (
            <div className="px-4 py-3 bg-orange-100/50 dark:bg-orange-900/20 flex items-center justify-between gap-3 border-t border-orange-200 dark:border-orange-800/40">
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {language === 'ar'
                  ? `إنشاء جميع ${missingWarehouses.length} مستودعات تلقائياً بالإعدادات الافتراضية`
                  : `Auto-create all ${missingWarehouses.length} warehouses with default settings`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-400 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-600"
                onClick={() => {
                  missingWarehouses.forEach(name => {
                    onUpdateWarehouseResolution?.(name, { action: 'create', name_ar: name, warehouse_type: 'main' });
                  });
                }}
              >
                <PlusCircle className="h-3.5 w-3.5 me-1.5" />
                {language === 'ar' ? 'إنشاء الكل' : 'Create All'}
              </Button>
            </div>
          )}
        </Card>
      )}

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

      {/* Continue Button — blocked when missing warehouses unresolved */}
      <div className="flex justify-end">
        {hasMissingWarehouses && !allResolved ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {language === 'ar'
                ? 'يرجى حل جميع المستودعات المفقودة أعلاه أولاً'
                : 'Please resolve all missing warehouses above first'}
            </p>
            <Button size="lg" disabled>
              {options.use_ai_analysis ? t('import.continueToAI') : t('import.continueToPreview')}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Button>
          </div>
        ) : hasMissingWarehouses && allResolved ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {language === 'ar' ? 'اضغط "تطبيق الحل" أولاً' : 'Click "Apply Resolution" first'}
            </p>
            <Button size="lg" disabled>
              {options.use_ai_analysis ? t('import.continueToAI') : t('import.continueToPreview')}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Button>
          </div>
        ) : (
          <Button onClick={onContinue} size="lg">
            {options.use_ai_analysis ? t('import.continueToAI') : t('import.continueToPreview')}
            <ArrowRight className="h-4 w-4 ms-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
