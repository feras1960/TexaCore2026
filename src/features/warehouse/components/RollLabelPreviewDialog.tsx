/**
 * ════════════════════════════════════════════════════════════════
 * 🏷️ RollLabelPreviewDialog — ديالوغ معاينة ملصق الرولون المشترك
 * ════════════════════════════════════════════════════════════════
 *
 * مكون مشترك يُستخدم في:
 *  - الاستلام (GoodsReceiptItemsTab)
 *  - التسليم (SalesDeliveryItemsTab) — عند إنشاء JIT rolls
 *  - المناقلات (TransferDeliveryDialog)
 *
 * الميزات:
 *  - معاينة QR Code + بيانات الرولون
 *  - تشيك بوكس للطباعة (مفعّل افتراضياً)
 *  - زر "تأكيد + طباعة" أو "تأكيد بدون طباعة"
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    QrCode, Tag, Printer, CheckCircle2, Loader2,
    Cylinder, Palette, Ruler, Package, Hash
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// ─── Types ──────────────────────────────────────────────────
export interface RollLabelData {
    rollNumber: string;
    materialName: string;
    colorName?: string;
    rollLength: number;
    quality?: string;
    batchId?: string;
    /** Extra info like warehouse name, invoice number */
    extraInfo?: { label: string; value: string }[];
}

interface RollLabelPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rollData: RollLabelData | null;
    /** Called when user confirms — receives shouldPrint flag */
    onConfirm: (shouldPrint: boolean) => void;
    /** Loading state for the confirm button */
    loading?: boolean;
    /** Default state for the print checkbox */
    defaultPrint?: boolean;
    /** Context hint: 'receipt' | 'delivery' | 'transfer' */
    context?: 'receipt' | 'delivery' | 'transfer';
}

// ─── Quality Labels ─────────────────────────────────────────
const QUALITY_LABELS: Record<string, { ar: string; en: string; color: string }> = {
    A: { ar: 'ممتاز (A)', en: 'Excellent (A)', color: 'text-green-600' },
    B: { ar: 'جيد (B)', en: 'Good (B)', color: 'text-blue-600' },
    C: { ar: 'مقبول (C)', en: 'Acceptable (C)', color: 'text-amber-600' },
    damaged: { ar: 'تالف', en: 'Damaged', color: 'text-red-600' },
};

// ════════════════════════════════════════════════════════════════
// 🎯 Main Component
// ════════════════════════════════════════════════════════════════

export function RollLabelPreviewDialog({
    open,
    onOpenChange,
    rollData,
    onConfirm,
    loading = false,
    defaultPrint = true,
    context = 'receipt',
}: RollLabelPreviewDialogProps) {
    const { language, isRTL } = useLanguage();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ─── Persist print preference per context in localStorage ───
    const storageKey = `roll_label_print_${context}`;
    const getStoredPref = (): boolean => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored !== null) return stored === 'true';
        } catch { /* ignore */ }
        return defaultPrint; // fallback to default if no stored preference
    };

    const [shouldPrint, setShouldPrint] = useState(getStoredPref);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    // Save preference to localStorage whenever it changes
    const handlePrintChange = (checked: boolean) => {
        setShouldPrint(checked);
        try {
            localStorage.setItem(storageKey, String(checked));
        } catch { /* ignore */ }
    };

    // Restore stored preference when dialog opens + auto-focus
    useEffect(() => {
        if (open) {
            setShouldPrint(getStoredPref());
            const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [open]);

    if (!rollData) return null;

    const qualityInfo = rollData.quality ? QUALITY_LABELS[rollData.quality] : null;

    // Context-specific hints
    const contextHints: Record<string, { ar: string; en: string }> = {
        receipt: {
            ar: 'تأكد من البيانات ثم اضغط تأكيد لإضافة الرولون',
            en: 'Verify the data then press confirm to add the roll',
        },
        delivery: {
            ar: 'تم إنشاء الرولون من المخزون السائب — راجع البيانات',
            en: 'Roll created from loose stock — review the data',
        },
        transfer: {
            ar: 'تأكد من بيانات الرولون قبل إضافته للمناقلة',
            en: 'Verify roll data before adding to transfer',
        },
    };

    const hint = contextHints[context] || contextHints.receipt;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-emerald-500" />
                        {tl('معاينة ملصق الرولون', 'Roll Label Preview')}
                        {context === 'delivery' && (
                            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">
                                JIT
                            </Badge>
                        )}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {tl(hint.ar, hint.en)}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* ─── Label Preview Card ─── */}
                <div className="my-4 p-4 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/30">
                    <div className="text-center space-y-3">
                        {/* QR Code — real, generated from roll number */}
                        <div className="w-24 h-24 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg mx-auto flex items-center justify-center p-1.5">
                            <QRCodeSVG
                                value={rollData.rollNumber}
                                size={80}
                                level="M"
                                includeMargin={false}
                            />
                        </div>

                        {/* Roll Number */}
                        <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
                            {rollData.rollNumber}
                        </div>

                        {/* Data Grid */}
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm px-4">
                            {/* Material */}
                            <div className="flex items-center gap-1.5 text-end text-muted-foreground justify-end">
                                <Package className="h-3.5 w-3.5" />
                                {tl('المادة:', 'Material:')}
                            </div>
                            <div className="text-start font-medium">{rollData.materialName}</div>

                            {/* Color */}
                            {rollData.colorName && (
                                <>
                                    <div className="flex items-center gap-1.5 text-end text-muted-foreground justify-end">
                                        <Palette className="h-3.5 w-3.5" />
                                        {tl('اللون:', 'Color:')}
                                    </div>
                                    <div className="text-start font-medium">
                                        <Badge variant="outline" className="text-xs gap-1">
                                            <span className="w-2 h-2 rounded-full bg-current" />
                                            {rollData.colorName}
                                        </Badge>
                                    </div>
                                </>
                            )}

                            {/* Length */}
                            <div className="flex items-center gap-1.5 text-end text-muted-foreground justify-end">
                                <Ruler className="h-3.5 w-3.5" />
                                {tl('الطول:', 'Length:')}
                            </div>
                            <div className="text-start font-medium font-mono text-emerald-700 dark:text-emerald-400">
                                {rollData.rollLength.toFixed(1)} {tl('متر', 'm')}
                            </div>

                            {/* Quality */}
                            {qualityInfo && (
                                <>
                                    <div className="flex items-center gap-1.5 text-end text-muted-foreground justify-end">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {tl('الجودة:', 'Quality:')}
                                    </div>
                                    <div className={`text-start font-medium ${qualityInfo.color}`}>
                                        {language === 'ar' ? qualityInfo.ar : qualityInfo.en}
                                    </div>
                                </>
                            )}

                            {/* Batch */}
                            {rollData.batchId && (
                                <>
                                    <div className="flex items-center gap-1.5 text-end text-muted-foreground justify-end">
                                        <Hash className="h-3.5 w-3.5" />
                                        {tl('الدفعة:', 'Batch:')}
                                    </div>
                                    <div className="text-start font-medium font-mono text-xs">
                                        {rollData.batchId}
                                    </div>
                                </>
                            )}

                            {/* Extra Info */}
                            {rollData.extraInfo?.map((info, idx) => (
                                <React.Fragment key={idx}>
                                    <div className="text-end text-muted-foreground">{info.label}</div>
                                    <div className="text-start font-medium text-xs">{info.value}</div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Print Checkbox ─── */}
                <div className="flex items-center gap-3 px-1 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border">
                    <Checkbox
                        id="should-print"
                        checked={shouldPrint}
                        onCheckedChange={(checked) => handlePrintChange(checked === true)}
                    />
                    <label
                        htmlFor="should-print"
                        className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none flex-1"
                    >
                        <Printer className="h-4 w-4 text-blue-500" />
                        {tl('طباعة الملصق بعد التأكيد', 'Print label after confirmation')}
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                        {shouldPrint
                            ? tl('🖨️ سيُطبع', '🖨️ Will print')
                            : tl('⏭️ بدون طباعة', '⏭️ No print')
                        }
                    </span>
                </div>

                {/* ─── Footer ─── */}
                <AlertDialogFooter>
                    <AlertDialogCancel>
                        {tl('إلغاء', 'Cancel')}
                    </AlertDialogCancel>
                    <Button
                        ref={confirmBtnRef}
                        className={`gap-1.5 text-white ${shouldPrint
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                            }`}
                        onClick={() => onConfirm(shouldPrint)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(shouldPrint); } }}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : shouldPrint ? (
                            <Printer className="h-4 w-4" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        {shouldPrint
                            ? tl('تأكيد + طباعة', 'Confirm + Print')
                            : tl('تأكيد بدون طباعة', 'Confirm')
                        }
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default RollLabelPreviewDialog;
