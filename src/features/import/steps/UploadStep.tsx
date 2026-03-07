/**
 * Upload Step - خطوة رفع الملف
 */

import React, { useCallback } from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import type { EntityDefinition } from '@/services/importService';

interface UploadStepProps {
  entityDefinition: EntityDefinition | null;
  onUpload: (file: File) => void;
  onDownloadTemplate: (language: 'ar' | 'en') => void;
  isLoading: boolean;
  error: string | null;
}

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadStep({
  entityDefinition,
  onUpload,
  onDownloadTemplate,
  isLoading,
  error
}: UploadStepProps) {
  const { t, language, isRTL } = useLanguage();
  const [dragActive, setDragActive] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) &&
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls') &&
      !file.name.endsWith('.csv')) {
      return t('import.invalidFileType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('import.fileTooLarge');
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      onUpload(file);
    }
  }, [onUpload, t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      onUpload(file);
    }
  }, [onUpload, t]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{t('import.downloadTemplate')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('import.downloadTemplateDescription')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadTemplate('ar')}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 me-2" />
              {language === 'ar' ? 'تحميل القالب' :
                language === 'tr' ? 'Şablonu İndir' :
                  language === 'ru' ? 'Скачать шаблон' :
                    language === 'uk' ? 'Завантажити шаблон' :
                      'Download Template'}
            </Button>
          </div>
        </div>
      </Card>

      {/* File Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('import.parsing')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-muted rounded-full">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{t('import.dropFileHere')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('import.orClickToSelect')}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('import.supportedFormats')}: Excel (.xlsx, .xls), CSV
            </p>
            <p className="text-xs text-muted-foreground">
              {t('import.maxSize')}: 10MB
            </p>
          </div>
        )}
      </div>

      {/* Errors */}
      {(fileError || error) && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{fileError || error}</span>
        </div>
      )}

      {/* Entity Info */}
      {entityDefinition && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">{t('import.requiredFields')}</h4>
          <div className="flex flex-wrap gap-2">
            {entityDefinition.fields
              .filter(f => f.required)
              .map(field => (
                <span
                  key={field.name}
                  className="px-2 py-1 bg-primary/10 text-primary text-sm rounded"
                >
                  {language === 'ar' ? field.label_ar : field.label_en}
                </span>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
