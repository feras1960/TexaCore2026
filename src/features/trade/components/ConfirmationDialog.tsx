/**
 * ═══════════════════════════════════════════════════════════════
 * ✅ ConfirmationDialog — Smart Document Confirmation Dialog
 * ═══════════════════════════════════════════════════════════════
 *
 * A premium dialog with:
 * - Document summary (customer, items, total)
 * - Pre-confirmation validation checklist
 * - Animated, glassmorphism design
 * - Bilingual (AR/EN) support
 *
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Package,
    User,
    DollarSign,
    FileText,
    Loader2,
    Send,
    ShieldCheck,
    Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    confirmationService,
    type DocType,
    type ValidationResult,
    type WorkflowSettings,
} from '@/services/confirmationService';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    onRequestApproval?: () => Promise<void>;
    docType: DocType;
    docData: any;
    validation: ValidationResult | null;
    settings: WorkflowSettings | null;
    loading?: boolean;
    needsApproval?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onRequestApproval,
    docType,
    docData,
    validation,
    settings,
    loading = false,
    needsApproval = false,
}) => {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const [confirming, setConfirming] = useState(false);

    // Animation state
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const docTypeLabels: Record<DocType, { ar: string; en: string; icon: React.ReactNode }> = {
        quotation: { ar: 'عرض السعر', en: 'Quotation', icon: <FileText className="w-5 h-5" /> },
        sales_order: { ar: 'أمر البيع', en: 'Sales Order', icon: <Package className="w-5 h-5" /> },
        sales_invoice: { ar: 'الفاتورة', en: 'Invoice', icon: <DollarSign className="w-5 h-5" /> },
        reservation: { ar: 'الحجز', en: 'Reservation', icon: <Package className="w-5 h-5" /> },
    };

    const docLabel = docTypeLabels[docType];
    const docNumber = docData?.order_number || docData?.invoice_number || docData?.doc_number || '';
    const customerName = docData?.customer_name || (isRTL ? 'غير محدد' : 'Not specified');
    const itemCount = docData?.items?.length || 0;
    const totalAmount = docData?.total_amount || docData?.grand_total || 0;
    const currency = docData?.currency || 'USD';

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await onConfirm();
        } finally {
            setConfirming(false);
        }
    };

    const handleRequestApproval = async () => {
        setConfirming(true);
        try {
            if (onRequestApproval) await onRequestApproval();
        } finally {
            setConfirming(false);
        }
    };

    const isBlocked = validation && !validation.isValid;
    const hasApprovalBlocker = validation?.blockers?.includes('needs_approval');

    // What happens after confirmation
    const afterConfirmItems = useMemo(() => {
        const items = [
            { icon: <ShieldCheck className="w-4 h-4 text-green-400" />, ar: 'تغيير الحالة إلى "مؤكد"', en: 'Status changes to "Confirmed"' },
        ];

        if (settings?.auto_create_delivery_on_confirm && (docType === 'sales_order' || docType === 'sales_invoice')) {
            items.push({
                icon: <Truck className="w-4 h-4 text-blue-400" />,
                ar: 'إنشاء إذن تسليم للمستودع',
                en: 'Delivery note created for warehouse',
            });
        }

        if (settings?.notify_warehouse_on_confirm) {
            items.push({
                icon: <Send className="w-4 h-4 text-purple-400" />,
                ar: 'إشعار أمين المستودع',
                en: 'Warehouse keeper notified',
            });
        }

        items.push({
            icon: <FileText className="w-4 h-4 text-amber-400" />,
            ar: 'قفل المستند من التعديل',
            en: 'Document locked from editing',
        });

        return items;
    }, [settings, docType]);

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Dialog */}
            <div
                className={`relative w-full max-w-lg mx-4 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
                onClick={e => e.stopPropagation()}
            >
                {/* Header — Gradient bar */}
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500" />

                {/* Title */}
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400">
                            {docLabel.icon}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {isRTL ? `تأكيد ${docLabel.ar}` : `Confirm ${docLabel.en}`}
                            </h2>
                            {docNumber && (
                                <p className="text-sm text-slate-400">#{docNumber}</p>
                            )}
                        </div>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Document Summary */}
                <div className="px-5 py-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {isRTL ? 'ملخص المستند' : 'Document Summary'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryCard
                            icon={<User className="w-4 h-4 text-blue-400" />}
                            label={isRTL ? 'العميل' : 'Customer'}
                            value={customerName}
                        />
                        <SummaryCard
                            icon={<Package className="w-4 h-4 text-amber-400" />}
                            label={isRTL ? 'الأصناف' : 'Items'}
                            value={`${itemCount} ${isRTL ? 'صنف' : 'items'}`}
                        />
                        <SummaryCard
                            icon={<DollarSign className="w-4 h-4 text-green-400" />}
                            label={isRTL ? 'الإجمالي' : 'Total'}
                            value={`${totalAmount.toLocaleString()} ${currency}`}
                            className="col-span-2"
                            highlight
                        />
                    </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Validation Checks */}
                {validation && (
                    <div className="px-5 py-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {isRTL ? 'التحققات' : 'Validation Checks'}
                        </p>
                        <div className="space-y-1.5">
                            {validation.checks.map((check) => (
                                <div
                                    key={check.id}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${check.passed
                                        ? 'bg-emerald-500/10 text-emerald-300'
                                        : check.required
                                            ? 'bg-red-500/10 text-red-300'
                                            : 'bg-amber-500/10 text-amber-300'
                                        }`}
                                >
                                    {check.passed ? (
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                    ) : check.required ? (
                                        <XCircle className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <span className="flex-1">
                                        {isRTL ? check.label_ar : check.label_en}
                                    </span>
                                    {check.details && (
                                        <span className="text-xs opacity-70">{check.details}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Separator className="bg-white/5" />

                {/* After Confirmation Info */}
                <div className="px-5 py-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {isRTL ? '📦 عند التأكيد سيتم' : '📦 On confirmation'}
                    </p>
                    <div className="space-y-1">
                        {afterConfirmItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-300 py-1">
                                {item.icon}
                                <span>{isRTL ? item.ar : item.en}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 pt-3 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                        disabled={confirming}
                    >
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>

                    {/* If needs approval and not yet approved — show "Request Approval" */}
                    {needsApproval && hasApprovalBlocker ? (
                        <Button
                            onClick={handleRequestApproval}
                            disabled={confirming || loading}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/25"
                        >
                            {confirming ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-2" />
                            ) : (
                                <Send className="w-4 h-4 mx-1" />
                            )}
                            {isRTL ? 'طلب موافقة المدير' : 'Request Approval'}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleConfirm}
                            disabled={confirming || loading || (isBlocked && !hasApprovalBlocker)}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                        >
                            {confirming ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-2" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mx-1" />
                            )}
                            {isRTL ? 'تأكيد وإرسال' : 'Confirm & Send'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══ Sub-component: Summary Card ═══
const SummaryCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    className?: string;
    highlight?: boolean;
}> = ({ icon, label, value, className = '', highlight = false }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${highlight ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'} ${className}`}>
        {icon}
        <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase">{label}</p>
            <p className={`text-sm font-medium truncate ${highlight ? 'text-emerald-300' : 'text-slate-200'}`}>
                {value}
            </p>
        </div>
    </div>
);

export default ConfirmationDialog;
