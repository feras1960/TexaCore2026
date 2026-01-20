/**
 * Print Dialog Component
 * مكون حوار الطباعة
 * 
 * Dropdown menu for selecting and printing document templates
 * Based on Reem Online's print functionality
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, 
  FileText, 
  Download,
  ChevronDown,
  Eye,
  Check,
  FileCheck,
  Receipt,
  FileSignature,
  QrCode,
  Stamp,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Template categories
export type TemplateCategory = 'contract' | 'invoice' | 'receipt' | 'report' | 'other';

// Print template interface
export interface PrintTemplate {
  id: string;
  name_ar: string;
  name_en: string | null;
  category: TemplateCategory;
  doc_type: string;
  is_default?: boolean;
}

// Document to print
export interface PrintDocument {
  id: string;
  number: string;
  type: string;
  date?: string;
  amount?: number;
  selected?: boolean;
}

// Print options
export interface PrintOptions {
  includeQR: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  includeStamp: boolean;
  includeSignature: boolean;
  copies: number;
}

interface PrintDialogProps {
  docType: string;
  docId: string;
  docNumber?: string;
  templates?: PrintTemplate[];
  relatedDocuments?: PrintDocument[];
  onPrint?: (templateId: string, options: PrintOptions, selectedDocs: string[]) => void;
  onPreview?: (templateId: string) => void;
  onExportPDF?: (templateId: string) => void;
  className?: string;
}

// Category icons
const CATEGORY_ICONS: Record<TemplateCategory, React.ComponentType<any>> = {
  contract: FileSignature,
  invoice: Receipt,
  receipt: FileCheck,
  report: FileText,
  other: FileText,
};

// Default templates (mock data - should come from database)
const DEFAULT_TEMPLATES: PrintTemplate[] = [
  { id: '1', name_ar: 'فاتورة مبيعات', name_en: 'Sales Invoice', category: 'invoice', doc_type: 'invoice', is_default: true },
  { id: '2', name_ar: 'فاتورة مبيعات (بدون ضريبة)', name_en: 'Sales Invoice (No VAT)', category: 'invoice', doc_type: 'invoice' },
  { id: '3', name_ar: 'إشعار دائن', name_en: 'Credit Note', category: 'invoice', doc_type: 'invoice' },
  { id: '4', name_ar: 'سند قبض', name_en: 'Receipt Voucher', category: 'receipt', doc_type: 'payment' },
  { id: '5', name_ar: 'سند صرف', name_en: 'Payment Voucher', category: 'receipt', doc_type: 'payment' },
  { id: '6', name_ar: 'عقد بيع', name_en: 'Sales Contract', category: 'contract', doc_type: 'contract' },
  { id: '7', name_ar: 'عقد إيجار', name_en: 'Rental Contract', category: 'contract', doc_type: 'contract' },
  { id: '8', name_ar: 'كشف حساب', name_en: 'Account Statement', category: 'report', doc_type: 'account' },
];

export function PrintDialog({
  docType,
  docId,
  docNumber,
  templates = DEFAULT_TEMPLATES,
  relatedDocuments = [],
  onPrint,
  onPreview,
  onExportPDF,
  className,
}: PrintDialogProps) {
  const { t, language, direction } = useLanguage();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set([docId]));
  const [options, setOptions] = useState<PrintOptions>({
    includeQR: true,
    includeHeader: true,
    includeFooter: true,
    includeStamp: false,
    includeSignature: false,
    copies: 1,
  });

  // Filter templates by doc type
  const filteredTemplates = templates.filter(t => 
    t.doc_type === docType || t.doc_type === 'all'
  );

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<TemplateCategory, PrintTemplate[]>);

  const handleQuickPrint = (template: PrintTemplate) => {
    if (onPrint) {
      onPrint(template.id, options, [docId]);
    } else {
      // Default print behavior
      toast.success(t('printSystem.printing'));
      window.print();
    }
  };

  const handleOpenDialog = (template: PrintTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handlePrintSelected = () => {
    if (!selectedTemplate) return;
    
    if (onPrint) {
      onPrint(selectedTemplate.id, options, Array.from(selectedDocs));
    }
    setDialogOpen(false);
    toast.success(t('printSystem.printing'));
  };

  const handleExport = () => {
    if (!selectedTemplate) return;
    
    if (onExportPDF) {
      onExportPDF(selectedTemplate.id);
    }
    toast.success(t('printSystem.exporting'));
  };

  const toggleDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const getCategoryLabel = (category: TemplateCategory): string => {
    return t(`printSystem.categories.${category}`);
  };

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("gap-2", className)}>
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">
              {t('printSystem.print')}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          className="w-64" 
          align={direction === 'rtl' ? 'start' : 'end'}
        >
          {Object.entries(groupedTemplates).map(([category, categoryTemplates], index) => (
            <React.Fragment key={category}>
              {index > 0 && <DropdownMenuSeparator />}
              
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                {React.createElement(CATEGORY_ICONS[category as TemplateCategory] || FileText, {
                  className: "w-3 h-3"
                })}
                {getCategoryLabel(category as TemplateCategory)}
              </DropdownMenuLabel>

              <DropdownMenuGroup>
                {categoryTemplates.map(template => (
                  <DropdownMenuItem 
                    key={template.id}
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleQuickPrint(template)}
                  >
                    <span className="flex-1">
                      {language === 'ar' ? template.name_ar : (template.name_en || template.name_ar)}
                    </span>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-[10px] ms-2">
                        {t('common.default')}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </React.Fragment>
          ))}

          <DropdownMenuSeparator />

          {/* More options */}
          <DropdownMenuItem 
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {t('printSystem.advancedOptions')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Advanced Print Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              {t('printSystem.printOptions')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left: Template Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">
                {t('printSystem.selectTemplate')}
              </Label>
              
              <ScrollArea className="h-[250px] border rounded-lg p-2">
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category} className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      {React.createElement(CATEGORY_ICONS[category as TemplateCategory] || FileText, {
                        className: "w-3 h-3"
                      })}
                      {getCategoryLabel(category as TemplateCategory)}
                    </div>
                    
                    {categoryTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-sm text-start transition-colors",
                          selectedTemplate?.id === template.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        {selectedTemplate?.id === template.id && (
                          <Check className="w-4 h-4" />
                        )}
                        <span className="flex-1">
                          {language === 'ar' ? template.name_ar : (template.name_en || template.name_ar)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* Right: Options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">
                {t('printSystem.printSettings')}
              </Label>

              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    {t('printSystem.options.includeQR')}
                  </Label>
                  <Checkbox
                    checked={options.includeQR}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeQR: !!checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {t('printSystem.options.includeHeader')}
                  </Label>
                  <Checkbox
                    checked={options.includeHeader}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeHeader: !!checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Stamp className="w-4 h-4 text-muted-foreground" />
                    {t('printSystem.options.includeStamp')}
                  </Label>
                  <Checkbox
                    checked={options.includeStamp}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeStamp: !!checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <FileSignature className="w-4 h-4 text-muted-foreground" />
                    {t('printSystem.options.includeSignature')}
                  </Label>
                  <Checkbox
                    checked={options.includeSignature}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeSignature: !!checked })
                    }
                  />
                </div>
              </div>

              {/* Related Documents */}
              {relatedDocuments.length > 0 && (
                <>
                  <Label className="text-base font-medium">
                    {t('printSystem.relatedDocuments')}
                  </Label>
                  
                  <ScrollArea className="h-[120px] border rounded-lg p-2">
                    {relatedDocuments.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded-md"
                      >
                        <Checkbox
                          checked={selectedDocs.has(doc.id)}
                          onCheckedChange={() => toggleDoc(doc.id)}
                        />
                        <span className="flex-1 text-sm">{doc.number}</span>
                        {doc.amount && (
                          <span className="text-sm text-muted-foreground">
                            {doc.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </ScrollArea>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 me-2" />
              {t('printSystem.exportPdf')}
            </Button>
            <Button onClick={handlePrintSelected} disabled={!selectedTemplate}>
              <Printer className="w-4 h-4 me-2" />
              {t('printSystem.print')}
              {selectedDocs.size > 1 && ` (${selectedDocs.size})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PrintDialog;
