/**
 * ════════════════════════════════════════════════════════════════
 * 🖨️ EnhancedPrintDialog — حوار الطباعة المحسّن
 * ════════════════════════════════════════════════════════════════
 * 
 * Connected to real templates from DB + usePrintData hook
 * 
 * Usage:
 *   <EnhancedPrintDialog docType="sales_invoice" docId={id} />
 *   <EnhancedPrintDialog docType="journal_entry" docId={id} docData={entry} />
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { usePrintData } from '@/hooks/usePrintData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Printer, ChevronDown, Eye, Download,
    QrCode, FileText, Stamp as StampIcon, PenTool, Languages,
    Check, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Props ──────────────────────────────────────────────────────

interface EnhancedPrintDialogProps {
    docType: string;
    docId: string;
    docData?: any;          // Pass data directly (skip DB fetch)
    className?: string;
    variant?: 'default' | 'dropdown' | 'button';
    size?: 'sm' | 'default' | 'lg';
    label?: string;
}

// ═══════════════════════════════════════════════════════════════

export function EnhancedPrintDialog({
    docType,
    docId,
    docData,
    className,
    variant = 'dropdown',
    size = 'sm',
    label,
}: EnhancedPrintDialogProps) {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';

    const {
        loading,
        templates,
        defaultTemplate,
        printData,
        print,
        preview,
        changePrintLanguage,
        printLanguage,
        availableLanguages,
        countryCode,
    } = usePrintData({ docType, docId, docData });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [printing, setPrinting] = useState(false);

    const [options, setOptions] = useState({
        includeQR: true,
        includeHeader: true,
        includeFooter: true,
        includeStamp: false,
        includeSignature: false,
        copies: 1,
    });

    // Auto-select default template
    useEffect(() => {
        if (defaultTemplate && !selectedTemplateId) {
            setSelectedTemplateId(defaultTemplate.id);
        }
    }, [defaultTemplate, selectedTemplateId]);

    // ─── Quick Print ──────────────────────────────────────────────
    const quickPrint = useCallback(async (templateId: string) => {
        setPrinting(true);
        try {
            await print(templateId, options);
            toast.success(isAr ? 'جاري الطباعة...' : 'Printing...');
        } catch (err: any) {
            toast.error(err.message || (isAr ? 'خطأ في الطباعة' : 'Print error'));
        } finally {
            setPrinting(false);
        }
    }, [print, options, isAr]);

    // ─── Full Print (from dialog) ─────────────────────────────────
    const handleDialogPrint = useCallback(async () => {
        if (!selectedTemplateId) return;
        setPrinting(true);
        try {
            await print(selectedTemplateId, options);
            setDialogOpen(false);
            toast.success(isAr ? 'جاري الطباعة...' : 'Printing...');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setPrinting(false);
        }
    }, [selectedTemplateId, print, options, isAr]);

    // ─── Preview ──────────────────────────────────────────────────
    const handlePreview = useCallback(async (tplId?: string) => {
        const id = tplId || selectedTemplateId;
        if (!id) return;
        try {
            const html = await preview(id, options);
            setPreviewHtml(html);
            setShowPreview(true);
        } catch (err: any) {
            toast.error(err.message);
        }
    }, [selectedTemplateId, preview, options]);

    // ─── Dropdown Variant ─────────────────────────────────────────
    if (variant === 'dropdown') {
        return (
            <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size={size} className={cn('gap-2', className)} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            <span className="hidden sm:inline">{label || (isAr ? 'طباعة' : 'Print')}</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align={direction === 'rtl' ? 'start' : 'end'}>
                        {templates.length === 0 ? (
                            <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                                {isAr ? 'لا توجد قوالب' : 'No templates'}
                            </DropdownMenuItem>
                        ) : (
                            <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    {isAr ? 'اختر القالب' : 'Select Template'}
                                </DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    {templates.map(tpl => (
                                        <DropdownMenuItem
                                            key={tpl.id}
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => quickPrint(tpl.id)}
                                        >
                                            <span className="flex-1 text-sm">
                                                {isAr ? tpl.name_ar : (tpl.name_en || tpl.name_ar)}
                                            </span>
                                            {tpl.is_default && (
                                                <Badge variant="secondary" className="text-[10px] ms-2">{isAr ? 'افتراضي' : 'Default'}</Badge>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2">
                                    <Eye className="w-4 h-4" />
                                    {isAr ? 'خيارات متقدمة' : 'Advanced Options'}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Advanced Dialog */}
                <PrintOptionsDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    isAr={isAr}
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onSelectTemplate={setSelectedTemplateId}
                    options={options}
                    onOptionsChange={setOptions}
                    printLanguage={printLanguage}
                    availableLanguages={availableLanguages}
                    onChangeLang={changePrintLanguage}
                    onPrint={handleDialogPrint}
                    onPreview={() => handlePreview()}
                    printing={printing}
                    language={language}
                />

                {/* Preview Window */}
                {showPreview && (
                    <PreviewDialog html={previewHtml} isAr={isAr} onClose={() => setShowPreview(false)} />
                )}
            </>
        );
    }

    // ─── Button Variant (just a single button) ────────────────────
    return (
        <Button
            variant="ghost"
            size={size}
            className={cn('gap-2', className)}
            disabled={loading || !defaultTemplate}
            onClick={() => defaultTemplate && quickPrint(defaultTemplate.id)}
        >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {label || (isAr ? 'طباعة' : 'Print')}
        </Button>
    );
}

// ═══════════════════════════════════════════════════════════════
// Advanced Print Options Dialog
// ═══════════════════════════════════════════════════════════════

interface PrintOptionsDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    isAr: boolean;
    templates: any[];
    selectedTemplateId: string | null;
    onSelectTemplate: (id: string) => void;
    options: any;
    onOptionsChange: (opts: any) => void;
    printLanguage: string;
    availableLanguages: { code: string; name: string }[];
    onChangeLang: (lang: string) => void;
    onPrint: () => void;
    onPreview: () => void;
    printing: boolean;
    language: string;
}

function PrintOptionsDialog({
    open, onOpenChange, isAr, templates,
    selectedTemplateId, onSelectTemplate,
    options, onOptionsChange,
    printLanguage, availableLanguages, onChangeLang,
    onPrint, onPreview, printing, language,
}: PrintOptionsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-tajawal">
                        <Printer className="w-5 h-5 text-primary" />
                        {isAr ? 'خيارات الطباعة' : 'Print Options'}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Templates */}
                    <div className="space-y-3">
                        <Label className="font-medium">{isAr ? 'القالب' : 'Template'}</Label>
                        <ScrollArea className="h-[220px] border rounded-lg p-2">
                            {templates.map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => onSelectTemplate(tpl.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2 p-2.5 rounded-md text-sm text-start transition-all mb-1',
                                        selectedTemplateId === tpl.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                    )}
                                >
                                    {selectedTemplateId === tpl.id && <Check className="w-4 h-4 shrink-0" />}
                                    <span className="flex-1">{language === 'ar' ? tpl.name_ar : (tpl.name_en || tpl.name_ar)}</span>
                                    {tpl.is_default && <Badge variant="secondary" className="text-[10px]">{isAr ? '✓' : '✓'}</Badge>}
                                </button>
                            ))}
                        </ScrollArea>
                    </div>

                    {/* Options */}
                    <div className="space-y-4">
                        <Label className="font-medium">{isAr ? 'الإعدادات' : 'Settings'}</Label>
                        <div className="space-y-3 border rounded-lg p-3">
                            {[
                                { key: 'includeQR', label_ar: 'رمز QR', label_en: 'QR Code', icon: QrCode },
                                { key: 'includeHeader', label_ar: 'الترويسة', label_en: 'Header', icon: FileText },
                                { key: 'includeFooter', label_ar: 'التذييل', label_en: 'Footer', icon: FileText },
                                { key: 'includeStamp', label_ar: 'الختم', label_en: 'Stamp', icon: StampIcon },
                                { key: 'includeSignature', label_ar: 'التوقيع', label_en: 'Signature', icon: PenTool },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <item.icon className="w-4 h-4 text-muted-foreground" />
                                        {isAr ? item.label_ar : item.label_en}
                                    </div>
                                    <Switch
                                        checked={options[item.key]}
                                        onCheckedChange={v => onOptionsChange({ ...options, [item.key]: v })}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Language Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-sm flex items-center gap-1.5"><Languages className="w-3.5 h-3.5" /> {isAr ? 'لغة الطباعة' : 'Print Language'}</Label>
                            <Select value={printLanguage} onValueChange={onChangeLang}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {availableLanguages.map(l => (
                                        <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end border-t pt-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">{isAr ? 'إلغاء' : 'Cancel'}</Button>
                    <Button variant="outline" onClick={onPreview} size="sm" className="gap-1.5" disabled={!selectedTemplateId}>
                        <Eye className="w-4 h-4" />{isAr ? 'معاينة' : 'Preview'}
                    </Button>
                    <Button onClick={onPrint} size="sm" disabled={!selectedTemplateId || printing} className="gap-1.5">
                        {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {isAr ? 'طباعة' : 'Print'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════════════════════════════
// Preview Dialog
// ═══════════════════════════════════════════════════════════════

function PreviewDialog({ html, isAr, onClose }: { html: string; isAr: boolean; onClose: () => void }) {
    const printFromPreview = () => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
                <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
                    <h3 className="font-semibold font-tajawal">{isAr ? '👁 معاينة الطباعة' : '👁 Print Preview'}</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={printFromPreview} className="gap-1.5">
                            <Printer className="w-4 h-4" />{isAr ? 'طباعة' : 'Print'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex justify-center p-4">
                    <div className="bg-white shadow-lg rounded-sm" style={{ width: '210mm', minHeight: '297mm' }}>
                        <iframe srcDoc={html} className="w-full" style={{ minHeight: '297mm', border: 'none' }} title="preview" />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default EnhancedPrintDialog;
