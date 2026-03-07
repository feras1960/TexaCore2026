/**
 * Import Wizard - معالج الاستيراد
 * ================================
 * واجهة المستخدم الرئيسية لاستيراد البيانات
 */

import React from 'react';
import { useLanguage } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useImportWizard, WizardStep } from './hooks/useImportWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';

// Step Components
import { SelectEntityStep } from './steps/SelectEntityStep';
import { UploadStep } from './steps/UploadStep';
import { MappingStep } from './steps/MappingStep';
import { ValidationStep } from './steps/ValidationStep';
import { AIAnalysisStep } from './steps/AIAnalysisStep';
import { PreviewStep } from './steps/PreviewStep';
import { ResultStep } from './steps/ResultStep';

interface ImportWizardProps {
  onClose?: () => void;
  onComplete?: () => void;
  defaultEntityType?: string;
}

const STEPS: { id: WizardStep; label_ar: string; label_en: string; icon: React.ReactNode }[] = [
  { id: 'select-entity', label_ar: 'اختيار النوع', label_en: 'Select Type', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: 'upload', label_ar: 'رفع الملف', label_en: 'Upload File', icon: <Upload className="h-4 w-4" /> },
  { id: 'mapping', label_ar: 'مطابقة الأعمدة', label_en: 'Map Columns', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: 'validation', label_ar: 'التحقق', label_en: 'Validate', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'preview', label_ar: 'المعاينة', label_en: 'Preview', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: 'result', label_ar: 'النتائج', label_en: 'Results', icon: <CheckCircle className="h-4 w-4" /> },
];

export function ImportWizard({ onClose, onComplete, defaultEntityType }: ImportWizardProps) {
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const tenantId = user?.user_metadata?.tenant_id || '';

  const {
    state,
    entityDefinitions,
    nextStep,
    prevStep,
    goToStep,
    resetWizard,
    selectEntityType,
    downloadTemplate,
    uploadFile,
    updateColumnMapping,
    validateData,
    executeImport,
    updateOptions
  } = useImportWizard(tenantId, companyId || '', defaultEntityType);

  const currentStepIndex = STEPS.findIndex(s => s.id === state.currentStep);
  const isFirstStep = state.currentStep === 'select-entity';
  const isLastStep = state.currentStep === 'result';
  const isImporting = state.currentStep === 'importing';

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    resetWizard();
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
    resetWizard();
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'select-entity':
        return (
          <SelectEntityStep
            entityDefinitions={entityDefinitions}
            selectedType={state.entityType}
            onSelect={selectEntityType}
            isLoading={state.isLoading}
          />
        );

      case 'upload':
        return (
          <UploadStep
            entityDefinition={state.entityDefinition}
            onUpload={uploadFile}
            onDownloadTemplate={downloadTemplate}
            isLoading={state.isLoading}
            error={state.error}
          />
        );

      case 'mapping':
        return (
          <MappingStep
            columnMappings={state.columnMappings}
            entityDefinition={state.entityDefinition}
            parsedFile={state.parsedFile}
            onUpdateMapping={updateColumnMapping}
            onValidate={validateData}
            isLoading={state.isLoading}
          />
        );

      case 'validation':
        return (
          <ValidationStep
            importJob={state.importJob}
            importRows={state.importRows}
            entityDefinition={state.entityDefinition}
            options={state.options}
            onUpdateOptions={updateOptions}
            onContinue={nextStep}
            isLoading={state.isLoading}
          />
        );

      case 'ai-analysis':
        return (
          <AIAnalysisStep
            importJob={state.importJob}
            importRows={state.importRows}
            entityDefinition={state.entityDefinition}
            onContinue={nextStep}
            onApplySuggestions={(_rowNumbers) => {
              // TODO: Implement AI suggestions application
            }}
            isLoading={state.isLoading}
          />
        );

      case 'preview':
        return (
          <PreviewStep
            importJob={state.importJob}
            importRows={state.importRows}
            entityDefinition={state.entityDefinition}
            entityType={state.entityType}
            options={state.options}
            onExecute={executeImport}
            isLoading={state.isLoading}
          />
        );

      case 'importing':
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('import.importingData')}
            </h3>
            <Progress value={state.progress} className="w-64 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {state.progress}%
            </p>
          </div>
        );

      case 'result':
        return (
          <ResultStep
            importJob={state.importJob}
            onClose={handleComplete}
            onNewImport={resetWizard}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('import.title')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {STEPS.filter(s => s.id !== 'importing').map((step, index) => {
              const stepIndex = STEPS.findIndex(s => s.id === step.id);
              const isCurrent = state.currentStep === step.id;
              const isPast = currentStepIndex > stepIndex;
              // Don't allow jumping to validation/preview/result without importJob data
              const requiresImportJob = ['validation', 'preview', 'result'].includes(step.id);
              const hasRequiredData = !requiresImportJob || !!state.importJob;
              const isAccessible = (isPast || isCurrent) && hasRequiredData;

              return (
                <React.Fragment key={step.id}>
                  {index > 0 && (
                    <div
                      className={`h-0.5 w-8 ${isPast ? 'bg-primary' : 'bg-muted'}`}
                    />
                  )}
                  <button
                    onClick={() => isAccessible && goToStep(step.id)}
                    disabled={!isAccessible}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap
                      transition-colors
                      ${isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isPast
                          ? 'bg-primary/20 text-primary hover:bg-primary/30'
                          : 'bg-muted text-muted-foreground'}
                    `}
                  >
                    {step.icon}
                    <span className="hidden sm:inline">
                      {language === 'ar' ? step.label_ar : step.label_en}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto py-6">
          {state.error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {renderStepContent()}
        </CardContent>

        {/* Footer */}
        {!isImporting && !isLastStep && (
          <div className="border-t p-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isFirstStep || state.isLoading}
            >
              {isRTL ? <ArrowRight className="h-4 w-4 me-2" /> : <ArrowLeft className="h-4 w-4 me-2" />}
              {t('common.back')}
            </Button>

            <div className="text-sm text-muted-foreground">
              {t('import.step')} {currentStepIndex + 1} {t('import.of')} {STEPS.length - 1}
            </div>

            {state.currentStep !== 'select-entity' &&
              state.currentStep !== 'mapping' &&
              state.currentStep !== 'validation' &&
              state.currentStep !== 'preview' && (
                <Button onClick={nextStep} disabled={state.isLoading}>
                  {t('common.next')}
                  {isRTL ? <ArrowLeft className="h-4 w-4 ms-2" /> : <ArrowRight className="h-4 w-4 ms-2" />}
                </Button>
              )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default ImportWizard;
