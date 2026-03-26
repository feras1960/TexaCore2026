/**
 * Result Step - خطوة عرض نتائج الاستيراد
 */

import React from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Plus,
  FileSpreadsheet,
  PartyPopper
} from 'lucide-react';
import type { ImportJob } from '@/services/importService';

interface ResultStepProps {
  importJob: ImportJob | null;
  onClose: () => void;
  onNewImport: () => void;
}

export function ResultStep({
  importJob,
  onClose,
  onNewImport
}: ResultStepProps) {
  const { t, language } = useLanguage();

  if (!importJob) {
    return null;
  }

  const isSuccess = importJob.status === 'completed' && importJob.failed_rows === 0;
  const isPartialSuccess = importJob.status === 'completed' && importJob.failed_rows > 0;
  const isFailed = importJob.status === 'failed';

  const successRate = importJob.total_rows > 0
    ? Math.round((importJob.imported_rows / importJob.total_rows) * 100)
    : 0;

  const downloadErrorReport = () => {
    // TODO: Implement error report download
  };

  return (
    <div className="space-y-6">
      {/* Status Icon */}
      <div className="text-center py-6">
        {isSuccess ? (
          <div className="inline-flex flex-col items-center">
            <div className="p-4 bg-green-100 rounded-full mb-4">
              <PartyPopper className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600">
              {t('import.successTitle')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t('import.successDescription')}
            </p>
          </div>
        ) : isPartialSuccess ? (
          <div className="inline-flex flex-col items-center">
            <div className="p-4 bg-yellow-100 rounded-full mb-4">
              <AlertTriangle className="h-12 w-12 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-600">
              {t('import.partialSuccessTitle')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t('import.partialSuccessDescription')}
            </p>
          </div>
        ) : (
          <div className="inline-flex flex-col items-center">
            <div className="p-4 bg-red-100 rounded-full mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600">
              {t('import.failedTitle')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {importJob.error_message || t('import.failedDescription')}
            </p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <FileSpreadsheet className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <div className="text-2xl font-bold">{importJob.total_rows}</div>
          <div className="text-xs text-muted-foreground">{t('import.totalRows')}</div>
        </Card>
        
        <Card className="p-4 text-center border-green-200 bg-green-50/50">
          <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
          <div className="text-2xl font-bold text-green-600">{importJob.imported_rows}</div>
          <div className="text-xs text-muted-foreground">{t('import.imported')}</div>
        </Card>
        
        <Card className="p-4 text-center border-yellow-200 bg-yellow-50/50">
          <AlertTriangle className="h-6 w-6 mx-auto text-yellow-600 mb-2" />
          <div className="text-2xl font-bold text-yellow-600">{importJob.skipped_rows}</div>
          <div className="text-xs text-muted-foreground">{t('import.skipped')}</div>
        </Card>
        
        <Card className="p-4 text-center border-red-200 bg-red-50/50">
          <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
          <div className="text-2xl font-bold text-red-600">{importJob.failed_rows}</div>
          <div className="text-xs text-muted-foreground">{t('import.failed')}</div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t('import.successRate')}</span>
          <span className="text-sm font-bold">{successRate}%</span>
        </div>
        <Progress 
          value={successRate} 
          className={`h-3 ${
            successRate === 100 
              ? '[&>div]:bg-green-500' 
              : successRate >= 80 
                ? '[&>div]:bg-yellow-500' 
                : '[&>div]:bg-red-500'
          }`}
        />
      </Card>

      {/* Import Details */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">{t('import.importDetails')}</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('import.fileName')}</span>
            <span className="font-medium">{importJob.file_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('import.entityType')}</span>
            <span className="font-medium">{importJob.entity_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('import.startTime')}</span>
            <span className="font-medium">
              {importJob.started_at 
                ? new Date(importJob.started_at).toLocaleString(language === 'ar' ? 'ar-u-nu-latn' : 'en-US')
                : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('import.endTime')}</span>
            <span className="font-medium">
              {importJob.completed_at 
                ? new Date(importJob.completed_at).toLocaleString(language === 'ar' ? 'ar-u-nu-latn' : 'en-US')
                : '-'}
            </span>
          </div>
        </div>
      </Card>

      {/* Error Report Download */}
      {importJob.failed_rows > 0 && (
        <Card className="p-4 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium">{t('import.errorReport')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('import.downloadErrorReport')}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadErrorReport}>
              <Download className="h-4 w-4 me-2" />
              {t('import.download')}
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button variant="outline" onClick={onNewImport} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('import.newImport')}
        </Button>
        <Button onClick={onClose} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          {t('import.done')}
        </Button>
      </div>
    </div>
  );
}
