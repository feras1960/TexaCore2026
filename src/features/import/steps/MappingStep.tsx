/**
 * Mapping Step - خطوة مطابقة الأعمدة
 */

import React from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ColumnMapping, EntityDefinition, ParsedFile } from '@/services/importService';

interface MappingStepProps {
  columnMappings: ColumnMapping[];
  entityDefinition: EntityDefinition | null;
  parsedFile: ParsedFile | null;
  onUpdateMapping: (fileColumn: string, systemField: string) => void;
  onValidate: () => void;
  isLoading: boolean;
}

export function MappingStep({
  columnMappings,
  entityDefinition,
  parsedFile,
  onUpdateMapping,
  onValidate,
  isLoading
}: MappingStepProps) {
  const { t, language, isRTL } = useLanguage();

  if (!entityDefinition || !parsedFile) {
    return null;
  }

  const requiredFields = entityDefinition.required_fields;
  const mappedSystemFields = columnMappings
    .filter(m => m.is_mapped)
    .map(m => m.system_field);

  const missingRequired = requiredFields.filter(
    f => !mappedSystemFields.includes(f)
  );

  const canProceed = missingRequired.length === 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{parsedFile.total_rows}</div>
          <div className="text-xs text-muted-foreground">{t('import.totalRows')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{parsedFile.headers.length}</div>
          <div className="text-xs text-muted-foreground">{t('import.columns')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {columnMappings.filter(m => m.is_mapped).length}
          </div>
          <div className="text-xs text-muted-foreground">{t('import.mapped')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {columnMappings.filter(m => !m.is_mapped).length}
          </div>
          <div className="text-xs text-muted-foreground">{t('import.notMapped')}</div>
        </Card>
      </div>

      {/* Missing Required Warning */}
      {missingRequired.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{t('import.missingRequiredFields')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingRequired.map(fieldName => {
              const field = entityDefinition.fields.find(f => f.name === fieldName);
              return (
                <span
                  key={fieldName}
                  className="px-2 py-1 bg-destructive/20 text-destructive text-sm rounded"
                >
                  {field ? (language === 'ar' ? field.label_ar : field.label_en) : fieldName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t('import.fileColumn')}</TableHead>
              <TableHead className="w-[40px] text-center"></TableHead>
              <TableHead className="w-[40%]">{t('import.systemField')}</TableHead>
              <TableHead className="w-[60px] text-center">{t('import.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columnMappings.map((mapping) => {
              const isRequired = mapping.system_field &&
                requiredFields.includes(mapping.system_field);

              return (
                <TableRow key={mapping.file_column}>
                  <TableCell className="font-medium">
                    {mapping.file_column}
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('import.sample')}: {
                        parsedFile.rows[0]?.[mapping.file_column]?.toString().slice(0, 30) || '-'
                      }
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                  </TableCell>

                  <TableCell>
                    <Select
                      value={mapping.system_field || 'none'}
                      onValueChange={(value) =>
                        onUpdateMapping(mapping.file_column, value === 'none' ? '' : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('import.selectField')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">-- {t('import.ignore')} --</span>
                        </SelectItem>
                        {entityDefinition.fields.map((field) => {
                          const alreadyMapped = mappedSystemFields.includes(field.name) &&
                            mapping.system_field !== field.name;
                          const isReq = requiredFields.includes(field.name);

                          return (
                            <SelectItem
                              key={field.name}
                              value={field.name}
                              disabled={alreadyMapped}
                            >
                              <span className={alreadyMapped ? 'text-muted-foreground' : ''}>
                                {language === 'ar' ? field.label_ar : field.label_en}
                                {isReq && ' *'}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="text-center">
                    {mapping.is_mapped ? (
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className={`h-5 w-5 inline ${isRequired ? 'text-green-600' : 'text-blue-600'}`} />
                        {(mapping as any).ai_confidence >= 70 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200" title={(mapping as any).ai_reason}>
                            🤖 {(mapping as any).ai_confidence}%
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <XCircle className="h-5 w-5 inline text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={onValidate}
          disabled={!canProceed || isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {t('import.validating')}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 me-2" />
              {t('import.validateData')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
