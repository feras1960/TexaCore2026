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
  Loader2
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';

interface PreviewStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  options: ImportOptions;
  onExecute: () => void;
  isLoading: boolean;
}

export function PreviewStep({
  importJob,
  importRows,
  entityDefinition,
  options,
  onExecute,
  isLoading
}: PreviewStepProps) {
  const { t, language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 15;

  if (!importJob || !entityDefinition) {
    return null;
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
