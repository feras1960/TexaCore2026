/**
 * Upload Step - خطوة رفع الملف
 */

import React, { useCallback } from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Download, FileSpreadsheet, AlertCircle, Loader2, Link2, Sheet } from 'lucide-react';
import type { EntityDefinition } from '@/services/importService';

interface UploadStepProps {
  entityDefinition: EntityDefinition | null;
  onUpload: (file: File) => void;
  onUploadGoogleSheet?: (url: string) => void;
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
  onUploadGoogleSheet,
  onDownloadTemplate,
  isLoading,
  error
}: UploadStepProps) {
  const { t, language, isRTL } = useLanguage();
  const [dragActive, setDragActive] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [uploadMode, setUploadMode] = React.useState<'file' | 'google'>('file');
  const [googleUrl, setGoogleUrl] = React.useState('');
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

  const isValidGoogleUrl = (url: string): boolean => {
    return /docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/.test(url);
  };

  const handleGoogleSheetSubmit = () => {
    if (!isValidGoogleUrl(googleUrl)) {
      setFileError(language === 'ar' ? 'رابط Google Sheet غير صالح' : 'Invalid Google Sheet URL');
      return;
    }
    setFileError(null);
    onUploadGoogleSheet?.(googleUrl);
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

      {/* Upload Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${uploadMode === 'file'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          onClick={() => { setUploadMode('file'); setFileError(null); }}
        >
          <Upload className="h-4 w-4" />
          {language === 'ar' ? 'ملف Excel/CSV' :
            language === 'tr' ? 'Excel/CSV Dosyası' :
              language === 'ru' ? 'Файл Excel/CSV' :
                language === 'uk' ? 'Файл Excel/CSV' :
                  'Excel/CSV File'}
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${uploadMode === 'google'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          onClick={() => { setUploadMode('google'); setFileError(null); }}
        >
          <Sheet className="h-4 w-4" />
          Google Sheets
        </button>
      </div>

      {uploadMode === 'file' ? (
        /* File Upload Area */
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
      ) : (
        /* Google Sheets Area */
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-full">
              <Sheet className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h4 className="font-medium">
                {language === 'ar' ? 'استيراد من جداول غوغل' :
                  language === 'tr' ? "Google Sheets'ten İçe Aktar" :
                    language === 'ru' ? 'Импорт из Google Sheets' :
                      language === 'uk' ? 'Імпорт з Google Sheets' :
                        'Import from Google Sheets'}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'ألصق رابط Google Sheet المشارك' :
                  language === 'tr' ? 'Paylaşılan Google Sheet bağlantısını yapıştırın' :
                    language === 'ru' ? 'Вставьте ссылку на общий Google Sheet' :
                      language === 'uk' ? 'Вставте посилання на спільний Google Sheet' :
                        'Paste the shared Google Sheet link'}
              </p>
            </div>

            <div className="w-full max-w-xl flex gap-2">
              <div className="relative flex-1">
                <Link2 className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  value={googleUrl}
                  onChange={(e) => { setGoogleUrl(e.target.value); setFileError(null); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className={`${isRTL ? 'pr-10' : 'pl-10'} font-mono text-sm`}
                  dir="ltr"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && googleUrl) handleGoogleSheetSubmit();
                  }}
                />
              </div>
              <Button
                onClick={handleGoogleSheetSubmit}
                disabled={!googleUrl || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 me-2" />
                    {language === 'ar' ? 'جلب البيانات' :
                      language === 'tr' ? 'Verileri Al' :
                        language === 'ru' ? 'Получить данные' :
                          language === 'uk' ? 'Отримати дані' :
                            'Fetch Data'}
                  </>
                )}
              </Button>
            </div>

            <div className="w-full max-w-xl">
              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' ? '💡 يجب أن يكون الشيت مشاركاً كـ "أي شخص لديه الرابط يمكنه العرض"' :
                  language === 'tr' ? '💡 Tablo "Bağlantıya sahip herkes görüntüleyebilir" olarak paylaşılmalıdır' :
                    language === 'ru' ? '💡 Таблица должна быть доступна "Всем, у кого есть ссылка"' :
                      language === 'uk' ? '💡 Таблиця має бути доступна "Усім, хто має посилання"' :
                        '💡 Sheet must be shared as "Anyone with the link can view"'}
              </p>
            </div>
          </div>
        </Card>
      )}

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

