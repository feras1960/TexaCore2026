/**
 * Chart Template Selector Dialog
 * Allows users to select and apply a chart of accounts template
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderTree, Check, Sparkles, Database, FileText } from 'lucide-react';
import { chartTemplatesService, type ChartTemplate } from '@/services/chartTemplatesService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChartTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onApplied: () => void;
}

export function ChartTemplateSelector({
  isOpen,
  onClose,
  companyId,
  onApplied,
}: ChartTemplateSelectorProps) {
  const { t, language } = useLanguage();
  const [templates, setTemplates] = useState<ChartTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await chartTemplatesService.getAll();
      // Filter out demo templates to keep only the 3 main options
      const filteredData = data.filter(t => !t.include_demo_data);
      setTemplates(filteredData);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error(error.message || t('accounting.templates.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (template: ChartTemplate) => {
    if (!companyId) {
      toast.error(t('accounting.templates.noCompany'));
      return;
    }

    setApplying(template.template_code);
    try {
      // Show info toast that process may take a moment
      toast.info(t('accounting.templates.applyingMessage'), {
        duration: 3000,
      });

      await chartTemplatesService.applyTemplate(companyId, template.template_code);

      toast.success(t('accounting.templates.appliedSuccess', { name: template.template_name_ar }), {
        description: t('accounting.templates.refreshingAccounts'),
        duration: 4000,
      });

      // Call onApplied callback to trigger refresh
      onApplied();

      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      console.error('Error applying template:', error);

      // Extract error message
      let errorMessage = error.message || t('accounting.templates.applyError');

      // Handle specific error cases
      if (errorMessage.includes('شجرة حسابات مسبقة')) {
        errorMessage = t('accounting.templates.existingChartError');
      } else if (errorMessage.includes('غير موجود')) {
        errorMessage = t('accounting.templates.templateNotFound');
      }

      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setApplying(null);
    }
  };

  const getTemplateIcon = (chartType: string) => {
    switch (chartType) {
      case 'extended':
        return Database;
      default:
        return FolderTree;
    }
  };

  const getTemplateDescription = (template: ChartTemplate) => {
    if (language === 'ar') {
      return template.description_ar || template.template_name_ar;
    }
    return template.description_en || template.template_name_en || template.template_name_ar;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-erp-teal" />
            {t('accounting.templates.selectTemplate')}
          </DialogTitle>
          <DialogDescription>
            {t('accounting.templates.selectDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('accounting.templates.noTemplates')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  try {
                    await chartTemplatesService.setupTemplatesForTenant();
                    toast.success(t('accounting.templates.setupSuccess'));
                    loadTemplates();
                  } catch (error: any) {
                    toast.error(error.message || t('accounting.templates.setupError'));
                  }
                }}
              >
                {t('accounting.templates.setupTemplates')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {templates.map((template) => {
                const Icon = getTemplateIcon(template.chart_type);
                const isApplying = applying === template.template_code;

                return (
                  <div
                    key={template.id}
                    className={cn(
                      'border rounded-lg p-4 transition-all',
                      'hover:border-erp-teal hover:shadow-md',
                      isApplying && 'border-erp-teal bg-erp-teal/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-erp-teal/10 rounded-lg">
                          <Icon className="w-5 h-5 text-erp-teal" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {language === 'ar' ? template.template_name_ar : (template.template_name_en || template.template_name_ar)}
                            </h3>
                            {template.include_demo_data && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <Sparkles className="w-3 h-3 me-1" />
                                {t('accounting.templates.withDemoData')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {getTemplateDescription(template)}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {t(`accounting.templates.types.${template.chart_type}`)}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {template.template_code}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleApplyTemplate(template)}
                        disabled={!!applying}
                        variant="teal"
                        size="sm"
                        className="shrink-0"
                      >
                        {isApplying ? (
                          <>
                            <span className="animate-spin me-2">⏳</span>
                            {t('common.applying')}
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 me-2" />
                            {t('accounting.templates.apply')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
