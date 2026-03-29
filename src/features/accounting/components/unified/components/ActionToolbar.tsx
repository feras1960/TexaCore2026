/**
 * Action Toolbar Component - شريط الأوامر الموحد المحسّن
 * يعرض أزرار الإجراءات مع أسهم التنقل وزر QR وتبديل تعديل/حفظ
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Printer,
    Download,
    Edit,
    Save,
    Trash2,
    Copy,
    CheckCircle,
    XCircle,
    RefreshCw,
    MoreHorizontal,
    FileText,
    FileSpreadsheet,
    QrCode,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    FilePlus,
    CreditCard,
    Eye,
    Share2,
    X,
    Send,
    ShieldCheck,
    Lock,
    PackageCheck,
    LockKeyhole,
    ChevronDown,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SheetMode, ActionConfig } from '../types';
import { NavigationArrows } from './NavigationArrows';
import { QRPopover } from './QRPopover';
import { useTradePermissions } from '@/hooks/useTradePermissions';
import { EnhancedPrintDialog } from '@/components/shared/print/EnhancedPrintDialog';
import { usePrintData } from '@/hooks/usePrintData';
import { useCompany } from '@/hooks/useCompany';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { exportToExcel, openInGoogleSheets, type ExportOptions, type ExportColumn, type CompanyInfo } from '@/lib/export-utils';
import { supabase } from '@/lib/supabase';

// Document types that support posting (ترحيل)
// Only documents with accounting/inventory impact should be postable
const POSTABLE_DOC_TYPES = new Set([
    'trade_invoice',   // فاتورة بيع/شراء
    'trade_delivery',  // إذن تسليم
    'trade_receipt',   // استلام بضاعة
    'trade_return',    // مرتجع
    'journal',         // قيد محاسبي
]);

// Icon mapping for actions
const actionIconMap: Record<string, any> = {
    Printer,
    Download,
    Edit,
    Save,
    Trash2,
    Copy,
    CheckCircle,
    XCircle,
    RefreshCw,
    FileText,
    QrCode,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    FilePlus,
    CreditCard,
    Eye,
    Share2,
    Send,
    ShieldCheck,
};

interface EnhancedActionToolbarProps {
    mode: SheetMode;
    status?: string;
    /** Document stage (for transactions: draft, confirmed, posted, etc.) */
    stage?: string;
    onAction: (actionId: string) => void;
    loading?: boolean;
    disabled?: boolean;

    // Navigation props
    onNavigatePrev?: () => void;
    onNavigateNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;

    // QR props
    docType: string;
    docNumber: string;
    docId: string;
    /** Human-readable number for QR display */
    displayNumber?: string;
    amount?: number;
    currency?: string;

    // Mode toggle
    onModeChange?: (mode: SheetMode) => void;
    onCancelEdit?: () => void;
    hasChanges?: boolean;

    /** Whether the confirm button should be shown (for trade documents) */
    showConfirmAction?: boolean;
    /** Confirmation status of the current document */
    confirmationStatus?: string;

    /** Trade mode for RBAC context */
    tradeMode?: 'sales' | 'purchase' | 'transfer';
    /** Display currency filter from LedgerTab */
    displayCurrency?: string;
    /** Whether this is an accounting document (journal/cash/receipt/payment/etc.) */
    isAccountingDocType?: boolean;
    /** Data payload */
    data?: any;
}

export function EnhancedActionToolbar({
    mode,
    status,
    stage,
    onAction,
    loading = false,
    disabled = false,

    // Navigation
    onNavigatePrev,
    onNavigateNext,
    hasPrev = false,
    hasNext = false,

    // QR
    docType,
    docNumber,
    docId,
    displayNumber,
    amount,
    currency = '',

    // Mode
    onModeChange,
    onCancelEdit,
    hasChanges = false,
    showConfirmAction = false,
    confirmationStatus,
    tradeMode,
    displayCurrency,
    isAccountingDocType = false,
    data,
}: EnhancedActionToolbarProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';

    // ═══ Deletable check logic ═══
    const [isDeletable, setIsDeletable] = React.useState<boolean>(true);
    const [deleteReason, setDeleteReason] = React.useState<string>('');

    React.useEffect(() => {
        if (!data?.id) return;
        let isMounted = true;
        const checkDelete = async () => {
            try {
                if (docType === 'party' || docType === 'exchange_agent' || docType === 'exchange_partner') {
                    const accId = data.payable_account_id || data.receivable_account_id;
                    if (accId) {
                        const { data: jeData } = await supabase.from('journal_entry_lines').select('id').eq('account_id', accId).limit(1);
                        if (jeData && jeData.length > 0) {
                            if (isMounted) { setIsDeletable(false); setDeleteReason(language === 'ar' ? 'يوجد حركات محاسبية مرتبطة' : 'Has accounting transactions'); }
                            return;
                        }
                    }
                    if (docType !== 'party') {
                        const col = docType === 'exchange_agent' ? 'agent_id' : 'partner_id';
                        const { data: remData } = await supabase.from('remittances').select('id').eq(col, data.id).limit(1);
                        if (remData && remData.length > 0) {
                            if (isMounted) { setIsDeletable(false); setDeleteReason(language === 'ar' ? 'يوجد حوالات مرتبطة' : 'Has related remittances'); }
                            return;
                        }
                    }
                } else if (docType === 'account' || docType === 'fund') {
                    if (data?.transaction_count > 0 || data?.total_debit > 0 || data?.total_credit > 0) {
                        if (isMounted) { setIsDeletable(false); setDeleteReason(language === 'ar' ? 'يوجد حركات محاسبية' : 'Has transactions'); }
                        return;
                    }
                    if (data?.is_system) {
                        if (isMounted) { setIsDeletable(false); setDeleteReason(language === 'ar' ? 'حساب نظام أساسي' : 'System account'); }
                        return;
                    }
                }
                if (isMounted) {
                    setIsDeletable(true);
                    setDeleteReason('');
                }
            } catch (err) {
                // Ignore silent errors for this check
            }
        };
        checkDelete();
        return () => { isMounted = false; };
    }, [data, docType, language]);

    const tl = (tKey: string) => t(tKey);
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';
    const isViewMode = mode === 'view';

    // ═══ Protected Entry Detection — linked to remittance/container/invoice ═══
    const protectedRefTypes = ['container', 'purchase_invoice', 'sales_invoice', 'goods_receipt', 'remittance'];
    const protectedEntryTypes = ['container_expense', 'container_expense_reversal', 'purchase', 'auto', 'provisional', 'remittance'];
    const isProtectedEntry = Boolean(
        (data?.reference_type && protectedRefTypes.includes(data.reference_type)) ||
        (data?.entry_type && protectedEntryTypes.includes(data.entry_type))
    );
    const protectedSourceLabel = (() => {
        if (data?.reference_type === 'remittance' || data?.entry_type === 'remittance') return language === 'ar' ? 'حوالة' : 'Remittance';
        if (data?.reference_type === 'container') return language === 'ar' ? 'كونتينر' : 'Container';
        if (data?.reference_type === 'purchase_invoice') return language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice';
        if (data?.reference_type === 'sales_invoice') return language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice';
        return language === 'ar' ? 'مصدر آخر' : 'Other Source';
    })();

    // Only show post/unpost for postable document types
    const isPostable = POSTABLE_DOC_TYPES.has(docType);

    // ═══ Effective Status — unifies 'status' and 'stage' ═══
    // Transactions use 'stage' (draft, confirmed, posted...)
    // Other docs use 'status'
    const effectiveStatus = stage || status || '';
    const isDraft = effectiveStatus === 'draft' || effectiveStatus === '';
    const isConfirmed = effectiveStatus === 'confirmed' || effectiveStatus === 'approved';
    const isPosted = effectiveStatus === 'posted';
    const isPartiallyReceived = effectiveStatus === 'partially_received';
    const isFullyReceived = effectiveStatus === 'received';
    const isReceivedOrPartial = isPartiallyReceived || isFullyReceived;

    // ═══ Received Document Lock ═══
    // Documents with status 'received' are read-only (goods already received)
    const isReceivedDoc = isFullyReceived;

    // Can post from confirmed / partially_received / received stages
    const canPostFromStage = isConfirmed || isPartiallyReceived || isFullyReceived;

    // Container-specific flags
    const isContainer = docType === 'trade_container';
    const isContainerClosed = effectiveStatus === 'closed';
    const canCloseContainer = isContainer && !isContainerClosed &&
        (effectiveStatus === 'received' || effectiveStatus === 'fully_received' ||
            effectiveStatus === 'completed');

    // RBAC permissions
    const { actions: perms } = useTradePermissions({
        tradeMode: tradeMode as "sales" | "purchase" | undefined,
        docType: docType,
        docStatus: status,
    });

    // Manager override: admin can still edit received docs
    const canEditReceived = perms.canEdit && isReceivedDoc;

    const handleEditSave = () => {
        if (isEditMode || isCreateMode) {
            onAction('save');
        } else {
            onModeChange?.('edit');
        }
    };

    const handleCancel = () => {
        onCancelEdit?.();
        onAction('cancel');
    };

    return (
        <div className="flex items-center gap-2">
            {/* Navigation Arrows - only in view mode */}
            {isViewMode && (onNavigatePrev || onNavigateNext) && (
                <>
                    <NavigationArrows
                        onPrev={onNavigatePrev}
                        onNext={onNavigateNext}
                        hasPrev={hasPrev}
                        hasNext={hasNext}
                    />
                    <Separator orientation="vertical" className="h-8 mx-1" />
                </>
            )}

            {/* Refresh - only in view mode */}
            {isViewMode && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAction('refresh')}
                                disabled={disabled || loading}
                                className="gap-1.5 text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                                <span className="hidden lg:inline">{t('common.refresh') || 'تحديث'}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('common.refresh') || 'تحديث'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* ✅ Save & Confirm — for draft TRADE invoices only (step 1 of workflow) */}
            {isViewMode && isPostable && isDraft && !isReceivedDoc && !isAccountingDocType && (

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                onClick={() => onAction('save_confirm')}
                                disabled={disabled || loading}
                                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-md shadow-emerald-500/20"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                <span>{t('actions.saveAndConfirm')}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tradeMode === 'purchase'
                                ? t('actions.confirmPurchaseTooltip')
                                : t('actions.confirmSalesTooltip')
                            }</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* ✅ Post Action — for confirmed / partially_received / received stages */}
            {/* ⚠️ Hidden for sales invoices — posting is automatic after warehouse delivery */}
            {/* ⚠️ Hidden for transfers — no accounting entry needed for inter-warehouse moves */}
            {isViewMode && isPostable && canPostFromStage && !isPosted && !(tradeMode === 'sales' && docType === 'trade_invoice') && tradeMode !== 'transfer' && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                onClick={() => onAction('post')}
                                disabled={disabled || loading || !perms.canPost}
                                className="gap-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>{isReceivedOrPartial
                                    ? t('actions.postReceived')
                                    : (t('accounting.post') || 'ترحيل واعتماد')
                                }</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isReceivedOrPartial
                                ? t('actions.postReceivedTooltip')
                                : (t('accounting.postAndConfirm') || t('actions.postConfirmTooltip'))
                            }</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}




            {/* ✅ Confirm & Send (for non-postable trade docs: orders, quotations)
                ❌ Hidden when: container is in_receiving / received / fully received
                   — no point confirming after warehouse started receiving */}
            {isViewMode && showConfirmAction && !isPostable && confirmationStatus !== 'confirmed'
                && status !== 'in_receiving' && status !== 'received' && status !== 'closed' && !isFullyReceived && !isReceivedOrPartial
                && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    onClick={() => onAction('confirm')}
                                    disabled={disabled || loading}
                                    className="gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-md shadow-emerald-500/20"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>{t('actions.confirm') || 'تأكيد وإرسال'}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('actions.confirmAndSend') || 'تأكيد المستند وإرساله للمستودع'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

            {/* Already Confirmed Badge (for confirmed docs waiting for post) */}
            {isViewMode && isConfirmed && isPostable && !isReceivedOrPartial && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('status.confirmed') || 'مُؤكد'}</span>
                </div>
            )}

            {/* Partially Received Badge */}
            {isViewMode && isPartiallyReceived && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>{t('actions.partiallyReceived')}</span>
                </div>
            )}

            {/* ═══ Container Close Button — for received containers ═══ */}
            {isViewMode && canCloseContainer && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                onClick={() => onAction('close_container')}
                                disabled={disabled || loading}
                                className="gap-1.5 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 text-white font-semibold shadow-md shadow-slate-500/30"
                            >
                                <LockKeyhole className="w-4 h-4" />
                                <span>{t('actions.closeContainer')}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('actions.closeContainerTooltip')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Container Closed Badge */}
            {isViewMode && isContainerClosed && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    <LockKeyhole className="w-3.5 h-3.5" />
                    <span>{t('actions.closedRefOnly')}</span>
                </div>
            )}

            {/* NOTE: Removed duplicate Post button block — now unified above (line ~270) */}

            {/* Already Posted Badge */}
            {
                isViewMode && isPosted && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t('status.posted') || 'مُرحّل'}</span>
                    </div>
                )
            }

            {/* ═══ Received Document Badge ═══ */}
            {
                isViewMode && isReceivedDoc && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>{t('status.received') || 'مُستلم'}</span>
                        {!canEditReceived && <Lock className="w-3 h-3 opacity-60" />}
                    </div>
                )
            }

            {/* ✅ Save & Confirm — ONLY for CREATE mode on draft invoices (workflow step 1) */}
            {/* ✅ Save & Post — only for non-sales postable docs (purchases) */}
            {/* ✅ Save Only — for EDIT mode on sales invoices (posting tied to warehouse) */}
            {
                // ─── Recurring entries: حفظ وتفعيل (بدون ترحيل محاسبي) ───
                (isEditMode || isCreateMode) && docType === 'recurring' && (
                    <>
                        {/* Save Draft */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onAction('save')}
                                        disabled={disabled || loading}
                                        className="gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{t('actions.saveDraft')}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('actions.saveDraftRecurringTooltip')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Save & Activate */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        onClick={() => onAction('save_activate')}
                                        disabled={disabled || loading}
                                        className="gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold shadow-md shadow-purple-500/20"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>{t('actions.saveAndActivate')}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('actions.saveActivateTooltip')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                )
            }
            {
                // ─── Accounting documents (غير القيود المتكررة): حفظ مسودة + تسجيل ───
                (isEditMode || isCreateMode) && isAccountingDocType && docType !== 'recurring' && (
                    <>
                        {/* Save Draft */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onAction('save')}
                                        disabled={disabled || loading}
                                        className="gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{language === 'ar' ? 'حفظ مسودة' : 'Save Draft'}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('actions.saveDraftTooltip')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Register (Save + Post) */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        onClick={() => onAction('save_post')}
                                        disabled={disabled || loading}
                                        className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-md shadow-emerald-500/20"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span>{t('actions.register')}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('actions.registerTooltip')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                )
            }

            {
                // ─── Non-accounting (trade) postable docs: Save & Confirm / Save & Post ───
                (isEditMode || isCreateMode) && isPostable && !isAccountingDocType && (() => {
                    // ═══ Transfer: always show Save & Confirm for drafts ═══
                    const isTransferDraft = tradeMode === 'transfer' && isDraft;
                    if (isTransferDraft) {
                        return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            onClick={() => onAction('save_confirm')}
                                            disabled={disabled || loading}
                                            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-md shadow-emerald-500/20"
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>{t('actions.saveAndConfirm')}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('actions.saveConfirmTooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    // Sales invoices in EDIT mode: just "Save" — posting is via warehouse
                    const isSalesInvoice = tradeMode === 'sales' && docType === 'trade_invoice';

                    if (isSalesInvoice && isEditMode) {
                        // Edit mode for sales invoices: plain Save only
                        return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            onClick={() => onAction('save')}
                                            disabled={disabled || loading}
                                            className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20"
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>{t('common.save')}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('actions.saveEditTooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    // Create mode for draft invoices: Save & Confirm
                    const isInvoiceDraft = docType === 'trade_invoice' && isDraft;
                    if (isInvoiceDraft && isCreateMode) {
                        return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            onClick={() => onAction('save_confirm')}
                                            disabled={disabled || loading}
                                            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-md shadow-emerald-500/20"
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>{t('actions.saveAndConfirm')}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('actions.saveConfirmTooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    // Non-sales postable docs (purchases): Save & Post
                    if (!isSalesInvoice) {
                        return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            onClick={() => onAction('save_post')}
                                            disabled={disabled || loading || !perms.canPost}
                                            className="gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span>{t('actions.saveAndPost')}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('actions.savePostTooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    // Fallback for any other sales invoice state: plain Save
                    return (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        onClick={() => onAction('save')}
                                        disabled={disabled || loading}
                                        className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{t('common.save')}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('actions.saveTooltip')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })()
            }

            {/* ✅ Save Button — for NON-postable, NON-accounting docs (containers, quotations, orders) */}
            {(isEditMode || isCreateMode) && !isPostable && !isAccountingDocType && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                onClick={() => onAction('save')}
                                disabled={disabled || loading}
                                className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20"
                            >
                                <Save className="w-4 h-4" />
                                <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{language === 'ar' ? 'حفظ المستند' : 'Save document'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {
                isViewMode && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onModeChange?.('edit')}
                                    disabled={disabled || loading || isContainerClosed || isProtectedEntry || ((isReceivedDoc || isPosted) && !canEditReceived && !isAccountingDocType)}
                                    className={cn(
                                        "gap-1.5",
                                        (isContainerClosed || isProtectedEntry || ((isReceivedDoc || isPosted) && !canEditReceived && !isAccountingDocType))
                                            ? "text-gray-400 cursor-not-allowed opacity-50"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                                    )}
                                >
                                    {isContainerClosed ? (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span className="hidden lg:inline">{t('actions.lockedPermanently')}</span>
                                        </>
                                    ) : isProtectedEntry ? (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span className="hidden lg:inline">{language === 'ar' ? `مرتبط بـ ${protectedSourceLabel}` : `Linked to ${protectedSourceLabel}`}</span>
                                        </>
                                    ) : (isReceivedDoc || isPosted) && !canEditReceived && !isAccountingDocType ? (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span className="hidden lg:inline">{t('common.locked') || 'مقفل'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Edit className="w-4 h-4" />
                                            <span className="hidden lg:inline">{t('common.edit') || 'تعديل'}</span>
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {isContainerClosed
                                        ? t('actions.containerLockedTooltip')
                                        : (isReceivedDoc || isPosted) && !canEditReceived && !isAccountingDocType
                                            ? (t('messages.docLocked') || t('common.locked'))
                                            : (t('common.edit'))
                                    }
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }

            {/* Cancel Button (in edit/create mode) */}
            {
                (isEditMode || isCreateMode) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="gap-1.5 text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
                                >
                                    <X className="w-4 h-4" />
                                    <span className="hidden lg:inline">{t('common.cancel') || 'إلغاء'}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('common.cancel') || 'إلغاء'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Unified Print & Export Dropdown */}
            <PrintExportDropdown
                docType={docType}
                docId={docId}
                disabled={disabled || loading}
                onAction={onAction}
                language={language}
                isRTL={isRTL}
                displayCurrency={displayCurrency}
                tradeMode={tradeMode}
            />

            {/* QR Popover */}
            <QRPopover
                docType={docType}
                docNumber={docNumber}
                docId={docId}
                displayNumber={displayNumber}
                amount={amount}
                currency={currency}
            />

            {/* More Actions */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                        disabled={disabled || loading}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                    <DropdownMenuItem onClick={() => onAction('duplicate')} className="gap-2 cursor-pointer" disabled={!perms.canDuplicate}>
                        <Copy className="w-4 h-4" />
                        <span>{t('common.duplicate') || 'تكرار'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAction('share')} className="gap-2 cursor-pointer">
                        <Share2 className="w-4 h-4" />
                        <span>{t('common.share') || 'مشاركة'}</span>
                    </DropdownMenuItem>

                    {/* Unpost Action — للمستندات المحاسبية + المستندات التجارية (بصلاحية canUnpost) */}
                    {/* ⛔ Protected entries (remittance/container/invoice) cannot be unposted from here */}
                    {isPosted && !isProtectedEntry && (isAccountingDocType || (isPostable && perms.canUnpost)) && (
                        <DropdownMenuItem onClick={() => onAction('unpost')} className="gap-2 cursor-pointer text-orange-600">
                            <XCircle className="w-4 h-4" />
                            <span>{t('accounting.unpost') || 'إلغاء الترحيل'}</span>
                        </DropdownMenuItem>
                    )}
                    {/* Protected Entry Warning — show disabled unpost with explanation */}
                    {isPosted && isProtectedEntry && (
                        <DropdownMenuItem disabled className="gap-2 cursor-not-allowed opacity-60">
                            <Lock className="w-4 h-4 text-gray-400" />
                            <div className="flex flex-col">
                                <span className="text-gray-500">{t('accounting.unpost') || 'إلغاء الترحيل'}</span>
                                <span className="text-[10px] leading-tight text-gray-400 font-normal">
                                    {language === 'ar' ? `مرتبط بـ ${protectedSourceLabel} — عدّل من المصدر` : `Linked to ${protectedSourceLabel}`}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    )}
                    {/* Unconfirm Action — return confirmed doc to draft */}
                    {isPostable && isConfirmed && !isReceivedOrPartial && (
                        <DropdownMenuItem onClick={() => onAction('unconfirm')} className="gap-2 cursor-pointer text-amber-600">
                            <XCircle className="w-4 h-4" />
                            <span>{language === 'ar' ? 'إلغاء التأكيد' : 'Unconfirm'}</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {/* Delete Action — hidden when: received, posted, container closed, or non-draft transfer */}
                    {perms.canDelete && !isContainerClosed && !isReceivedDoc && status !== 'posted' && (
                        // TRANSFER: Only allow delete for draft transfers
                        !(tradeMode === 'transfer' && effectiveStatus !== 'draft' && effectiveStatus !== '')
                    ) && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    if (!isDeletable) {
                                        e.preventDefault();
                                        return;
                                    }
                                    onAction('delete');
                                }}
                                disabled={!isDeletable}
                                className={cn(
                                    "gap-2",
                                    isDeletable ? "cursor-pointer text-red-600 focus:text-red-600" : "cursor-not-allowed"
                                )}
                            >
                                <Trash2 className={cn("w-4 h-4", !isDeletable && "text-gray-400")} />
                                <div className="flex flex-col">
                                    <span className={cn(!isDeletable && "text-gray-500")}>{t('common.delete') || 'حذف'}</span>
                                    {!isDeletable && deleteReason && (
                                        <span className="text-[10px] leading-tight text-gray-400 font-normal">{deleteReason}</span>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div >
    );
}

// Legacy ActionToolbar for backward compatibility
interface ActionToolbarProps {
    actions: ActionConfig[];
    mode: SheetMode;
    status?: string;
    onAction: (actionId: string) => void;
    loading?: boolean;
    disabled?: boolean;
    compact?: boolean;
}

export function ActionToolbar({
    actions,
    mode,
    status,
    onAction,
    loading = false,
    disabled = false,
    compact = false,
}: ActionToolbarProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    // Filter actions by mode
    const visibleActions = actions.filter((action) => {
        if (!action.showInModes) return true;
        return action.showInModes.includes(mode);
    });

    // Special handling for post/unpost
    const filteredActions = visibleActions.filter((action) => {
        if (action.id === 'post' && status === 'posted') return false;
        if (action.id === 'unpost' && status !== 'posted') return false;
        return true;
    });

    // Split into primary (first 4) and secondary (rest) actions
    const primaryActions = compact ? filteredActions.slice(0, 3) : filteredActions.slice(0, 5);
    const secondaryActions = compact ? filteredActions.slice(3) : filteredActions.slice(5);

    const renderAction = (action: ActionConfig, isMenuItem = false) => {
        const IconComponent = actionIconMap[action.icon] || FileText;
        const label = t(action.labelKey) || action.id;

        const getVariant = () => {
            if (action.variant === 'destructive') return 'destructive';
            if (action.variant === 'default') return 'default';
            if (action.variant === 'secondary') return 'secondary';
            if (action.variant === 'ghost') return 'ghost';
            return 'outline';
        };

        if (isMenuItem) {
            return (
                <DropdownMenuItem
                    key={action.id}
                    onClick={() => onAction(action.id)}
                    disabled={disabled || loading}
                    className={cn(
                        "gap-2 cursor-pointer",
                        action.variant === 'destructive' && "text-red-600 focus:text-red-600"
                    )}
                >
                    <IconComponent className="w-4 h-4" />
                    <span>{label}</span>
                    {action.shortcut && (
                        <span className="ms-auto text-xs text-gray-400 font-mono">
                            {action.shortcut}
                        </span>
                    )}
                </DropdownMenuItem>
            );
        }

        return (
            <TooltipProvider key={action.id}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={getVariant()}
                            size={compact ? "sm" : "default"}
                            onClick={() => onAction(action.id)}
                            disabled={disabled || loading}
                            className={cn(
                                "gap-2",
                                compact && "h-8 px-3 text-xs"
                            )}
                        >
                            <IconComponent className={cn("w-4 h-4", compact && "w-3.5 h-3.5")} />
                            {!compact && <span className="hidden sm:inline">{label}</span>}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side={isRTL ? "right" : "left"}>
                        <p>{label}</p>
                        {action.shortcut && (
                            <p className="text-xs text-gray-400 font-mono">{action.shortcut}</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Actions */}
            {primaryActions.map((action) => renderAction(action))}

            {/* More Actions Dropdown */}
            {secondaryActions.length > 0 && (
                <>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size={compact ? "sm" : "icon"}
                                disabled={disabled || loading}
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                            {secondaryActions.map((action, index) => (
                                <>
                                    {action.variant === 'destructive' && index > 0 && (
                                        <DropdownMenuSeparator />
                                    )}
                                    {renderAction(action, true)}
                                </>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}
        </div>
    );
}

// Quick Actions Bar - شريط الإجراءات السريعة
interface QuickActionsBarProps {
    onReceipt?: () => void;
    onPayment?: () => void;
    onTransfer?: () => void;
    onExchange?: () => void;
    onJournal?: () => void;
    showReceipt?: boolean;
    showPayment?: boolean;
    showTransfer?: boolean;
    showExchange?: boolean;
    showJournal?: boolean;
}

export function QuickActionsBar({
    onReceipt,
    onPayment,
    onTransfer,
    onExchange,
    onJournal,
    showReceipt = true,
    showPayment = true,
    showTransfer = true,
    showExchange = true,
    showJournal = true,
}: QuickActionsBarProps) {
    const { t } = useLanguage();

    const actions = [
        { id: 'receipt', icon: ArrowDownRight, label: t('accounting.quickReceipt') || 'سند قبض', color: 'bg-green-500 hover:bg-green-600', onClick: onReceipt, show: showReceipt },
        { id: 'payment', icon: ArrowUpRight, label: t('accounting.quickPayment') || 'سند صرف', color: 'bg-red-500 hover:bg-red-600', onClick: onPayment, show: showPayment },
        { id: 'transfer', icon: ArrowRightLeft, label: t('accounting.transfer') || 'تحويل', color: 'bg-orange-500 hover:bg-orange-600', onClick: onTransfer, show: showTransfer },
        { id: 'exchange', icon: RefreshCw, label: t('accounting.exchange') || 'صرافة', color: 'bg-cyan-500 hover:bg-cyan-600', onClick: onExchange, show: showExchange },
        { id: 'journal', icon: FileText, label: t('accounting.journalEntry') || 'قيد', color: 'bg-indigo-500 hover:bg-indigo-600', onClick: onJournal, show: showJournal },
    ].filter(a => a.show);

    return (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {actions.map((action) => {
                const Icon = action.icon;
                return (
                    <TooltipProvider key={action.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    onClick={action.onClick}
                                    className={cn("gap-2 text-white", action.color)}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden md:inline">{action.label}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{action.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
}

export default ActionToolbar;

// ─── Unified Print & Export Dropdown ────────────────────────────
// Combines print templates + export options in a single dropdown
const DOC_TYPE_MAP: Record<string, string> = {
    trade_invoice: 'sales_invoice',
    trade_container: 'container_label',
    trade_delivery: 'delivery_note',
    trade_receipt: 'goods_receipt',
    sales_delivery: 'delivery_note',
    trade_return: 'sales_invoice',
    trade_quotation: 'price_quote',
    trade_order: 'sales_invoice',
    journal: 'journal_entry',
    account: 'account_statement',
    party: 'account_statement',
};

function PrintExportDropdown({
    docType,
    docId,
    disabled,
    onAction,
    language,
    isRTL,
    displayCurrency,
    tradeMode,
}: {
    docType: string;
    docId: string;
    disabled: boolean;
    onAction: (actionId: string) => void;
    language: string;
    isRTL: boolean;
    displayCurrency?: string;
    tradeMode?: 'sales' | 'purchase' | 'transfer';
}) {
    // Smart doc type resolution: trade_invoice maps to sales or purchase based on tradeMode
    const printDocType = docType === 'trade_invoice'
        ? (tradeMode === 'purchase' ? 'purchase_invoice' : 'sales_invoice')
        : (DOC_TYPE_MAP[docType] || docType);
    const isAr = language === 'ar';
    const { t } = useLanguage();

    const { companyId } = useCompany();
    const { getRate } = useViewCurrency();

    // Use print data hook for template access + data
    const {
        loading,
        templates,
        defaultTemplate,
        printData,
        print: printFn,
        preview: previewFn,
    } = usePrintData({ docType: printDocType, docId, displayCurrency, getConvertRate: displayCurrency ? getRate : undefined });

    const [printing, setPrinting] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const quickPrint = React.useCallback(async (templateId: string) => {
        setPrinting(true);
        try {
            await printFn(templateId);
            toast.success(t('actions.printing'));
        } catch (err: any) {
            toast.error(err.message || t('actions.printError'));
        } finally {
            setPrinting(false);
        }
    }, [printFn, isAr]);

    // Build export data from printData (same data used by print templates)
    const buildExportFromPrintData = React.useCallback((): ExportOptions | null => {
        if (!printData) return null;

        const companyInfo: CompanyInfo = {
            name: printData.company?.name || printData.company?.name_ar || '',
            nameEn: printData.company?.name_en || '',
            logo: printData.company?.logo || undefined,
            address: printData.company?.address || printData.company?.address_ar || undefined,
            phone: printData.company?.phone || undefined,
            email: printData.company?.email || undefined,
            taxNumber: printData.company?.tax_id || undefined,
        };

        // ═══ Journal Entry ═══
        if (printData.entry) {
            const entry = printData.entry;
            const columns: ExportColumn[] = [
                { key: 'index', header: '#', width: 5 },
                { key: 'account_code', header: t('export.accountCode'), width: 15 },
                { key: 'account_name', header: t('export.accountName'), width: 25 },
                { key: 'description', header: t('export.description'), width: 30 },
                { key: 'debit', header: t('export.debit'), width: 15, type: 'debit' },
                { key: 'credit', header: t('export.credit'), width: 15, type: 'credit' },
            ];

            const data = (entry.lines || []).map((line: any, idx: number) => ({
                index: idx + 1,
                account_code: line.account_code || '',
                account_name: line.name_ar || line.name_en || line.account_name || '',
                description: line.description || '',
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
            }));

            // Totals row
            data.push({
                index: '',
                account_code: '',
                account_name: t('export.total'),
                description: '',
                debit: entry.total_debit || 0,
                credit: entry.total_credit || 0,
            });

            return {
                filename: entry.number || 'journal-entry',
                title: `${t('export.journalEntry')} - ${entry.number || ''}`,
                subtitle: entry.description || '',
                isRTL,
                columns,
                data,
                companyInfo,
                showTotals: true,
                debitKey: 'debit',
                creditKey: 'credit',
            };
        }

        // ═══ Sales / Purchase Invoice ═══
        if (printData.invoice) {
            const inv = printData.invoice;
            const partyName = printData.customer?.name || printData.supplier?.name || '';
            const columns: ExportColumn[] = [
                { key: 'index', header: '#', width: 5 },
                { key: 'name', header: t('export.item'), width: 25 },
                { key: 'description', header: t('export.description'), width: 25 },
                { key: 'quantity', header: t('export.qty'), width: 10 },
                { key: 'unit', header: t('export.unit'), width: 8 },
                { key: 'unit_price', header: t('export.price'), width: 12, type: 'currency' },
                { key: 'discount', header: t('export.discount'), width: 10 },
                { key: 'tax_amount', header: t('export.tax'), width: 10, type: 'currency' },
                { key: 'line_total', header: t('export.lineTotal'), width: 15, type: 'currency' },
            ];

            const data = (inv.items || []).map((item: any, idx: number) => ({
                index: idx + 1,
                name: item.name_ar || item.name_en || '',
                description: item.description || '',
                quantity: item.quantity || 0,
                unit: item.unit || '',
                unit_price: item.unit_price || 0,
                discount: item.discount || 0,
                tax_amount: item.tax_amount || 0,
                line_total: item.line_total || 0,
            }));

            // Totals row
            data.push({
                index: '', name: '', description: t('export.total'),
                quantity: '', unit: '', unit_price: '', discount: '',
                tax_amount: inv.tax_amount || 0,
                line_total: inv.total || 0,
            });

            return {
                filename: inv.number || 'invoice',
                title: `${t('export.invoice')} ${inv.number || ''}`,
                subtitle: partyName,
                isRTL,
                columns,
                data,
                companyInfo,
                showTotals: true,
            };
        }

        // ═══ Voucher (Receipt / Payment) ═══
        if (printData.voucher) {
            const v = printData.voucher;
            const columns: ExportColumn[] = [
                { key: 'field', header: t('export.field'), width: 20 },
                { key: 'value', header: t('export.value'), width: 35 },
            ];

            const data = [
                { field: t('export.voucherNo'), value: v.number || '' },
                { field: t('export.date'), value: v.date || '' },
                { field: t('export.party'), value: printData.party?.name || '' },
                { field: t('export.amount'), value: v.amount || 0 },
                { field: t('export.currency'), value: v.currency || '' },
                { field: t('export.paymentMethod'), value: v.payment_method || '' },
                { field: t('export.description'), value: v.description || '' },
            ].filter(r => r.value);

            return {
                filename: v.number || 'voucher',
                title: v.number || '',
                isRTL,
                columns,
                data,
                companyInfo,
            };
        }

        // ═══ Account Statement ═══
        if (printData.account) {
            const acc = printData.account;
            const targetCurrency = displayCurrency; // from LedgerTab filter
            // Check if data was already converted by usePrintData
            const alreadyConverted = acc._convertedTo && acc._convertedTo === targetCurrency;
            
            const columns: ExportColumn[] = [
                { key: 'index', header: '#', width: 5 },
                { key: 'debit', header: t('export.debit'), width: 15, type: 'debit' },
                { key: 'credit', header: t('export.credit'), width: 15, type: 'credit' },
                { key: 'balance', header: t('accounting.balance') || 'Balance', width: 15, type: 'currency' },
                { key: 'date', header: t('export.date'), width: 12 },
                { key: 'description', header: t('export.description'), width: 30 },
                { key: 'currency', header: t('export.currency'), width: 10 },
                { key: 'exchange_rate', header: t('accounting.exchangeRate') || 'Exchange Rate', width: 12 },
            ];

            // Use raw entries for conversion, or converted entries if already done
            const rawCurrency = acc._rawCurrency || acc.currency || 'USD';
            const sourceEntries = alreadyConverted ? acc.entries : (acc._rawEntries || acc.entries || []);
            const openingBal = alreadyConverted 
                ? (Number(acc.opening_balance) || 0)
                : (Number(acc._rawOpeningBalance ?? acc.opening_balance) || 0);
            let runningBalance = openingBal;

            // Convert amount from entry currency to target display currency
            const convertAmount = (amount: number, entryCurrency: string): number => {
                if (alreadyConverted) return amount; // Already converted by usePrintData
                if (!targetCurrency || !entryCurrency || entryCurrency === targetCurrency) return amount;
                const rate = getRate(entryCurrency, targetCurrency);
                return rate > 0 ? amount * rate : amount;
            };

            // If converting opening balance and not already done
            if (!alreadyConverted && targetCurrency) {
                runningBalance = convertAmount(runningBalance, rawCurrency);
            }

            const data: any[] = [];

            // Opening balance row
            if (runningBalance !== 0) {
                data.push({
                    index: '',
                    debit: '',
                    credit: '',
                    balance: runningBalance,
                    date: '',
                    description: t('export.openingBalance'),
                    currency: targetCurrency || '',
                    exchange_rate: '',
                });
            }

            sourceEntries.forEach((e: any, idx: number) => {
                const entryCurrency = alreadyConverted ? targetCurrency : (e.currency || rawCurrency);
                const rawDebit = Number(e.debit) || 0;
                const rawCredit = Number(e.credit) || 0;
                const debit = convertAmount(rawDebit, entryCurrency || 'USD');
                const credit = convertAmount(rawCredit, entryCurrency || 'USD');
                runningBalance += debit - credit;
                
                const rate = alreadyConverted 
                    ? (Number(e.exchange_rate) || 1)
                    : (targetCurrency ? getRate(entryCurrency || 'USD', targetCurrency) : (Number(e.exchange_rate) || 1));
                
                data.push({
                    index: idx + 1,
                    debit: debit || '',
                    credit: credit || '',
                    balance: runningBalance,
                    date: e.date || e.entry_date || '',
                    description: e.description || e.memo || '',
                    currency: targetCurrency || entryCurrency || '',
                    exchange_rate: rate !== 1 ? rate : '',
                });
            });

            // Totals row
            const totalDebit = data.reduce((s: number, row: any) => s + (Number(row.debit) || 0), 0);
            const totalCredit = data.reduce((s: number, row: any) => s + (Number(row.credit) || 0), 0);
            data.push({
                index: '',
                debit: totalDebit,
                credit: totalCredit,
                balance: runningBalance,
                date: '',
                description: t('export.total'),
                currency: '',
                exchange_rate: '',
            });

            const accountName = acc.name_ar || acc.name_en || acc.name || acc.account_name || '';
            const currencyLabel = targetCurrency ? ` (${targetCurrency})` : '';

            return {
                filename: `statement-${accountName}`,
                title: `${t('export.accountStatement')} - ${accountName}`,
                subtitle: (acc.code ? `${acc.code} - ${accountName}` : accountName) + currencyLabel,
                isRTL,
                columns,
                data,
                companyInfo,
                showTotals: true,
                debitKey: 'debit',
                creditKey: 'credit',
            };
        }

        // ═══ Fallback: generic key-value ═══
        const columns: ExportColumn[] = [
            { key: 'field', header: t('export.field'), width: 20 },
            { key: 'value', header: t('export.value'), width: 35 },
        ];

        const skipKeys = new Set(['company', 'system', '_printSettings', 'id']);
        const data = Object.entries(printData)
            .filter(([k, v]) => !skipKeys.has(k) && v !== null && v !== undefined && typeof v !== 'object')
            .map(([k, v]) => ({ field: k, value: String(v) }));

        return { filename: 'export', isRTL, columns, data, companyInfo };
    }, [printData, language, isRTL]);

    // ─── Export to Excel ───
    const handleExportExcel = React.useCallback(() => {
        const opts = buildExportFromPrintData();
        if (!opts) {
            toast.error(t('export.noDataToExport'));
            return;
        }
        exportToExcel(opts);
        toast.success(t('export.excelSuccess'));
    }, [buildExportFromPrintData]);

    // ─── Export to Google Sheets ───
    const handleExportGoogleSheets = React.useCallback(async () => {
        const opts = buildExportFromPrintData();
        if (!opts) {
            toast.error(t('export.noDataToExport'));
            return;
        }
        await openInGoogleSheets({
            ...opts,
            companyId: companyId || undefined,
            supabaseClient: supabase,
            language,
        });
    }, [buildExportFromPrintData, companyId, language]);

    // ─── Export to PDF (via print template) ───
    const handleExportPDF = React.useCallback(async () => {
        if (!defaultTemplate) {
            toast.error(t('export.noPrintTemplate'));
            return;
        }
        try {
            const html = await previewFn(defaultTemplate.id);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                win.focus();
                setTimeout(() => win.print(), 500);
            }
            toast.success(t('export.savePdfHint'));
        } catch (err: any) {
            toast.error(err.message || t('export.exportError'));
        }
    }, [defaultTemplate, previewFn]);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                        disabled={disabled || loading}
                    >
                        {(loading || printing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        <span className="hidden sm:inline">{t('export.print')}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align={isRTL ? 'start' : 'end'}>
                    {/* Print Templates Section */}
                    {templates.length > 0 && (
                        <>
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                {t('export.printIcon')}
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
                                            <Badge variant="secondary" className="text-[10px] ms-2">{t('export.default')}</Badge>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </>
                    )}

                    {templates.length === 0 && (
                        <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                            {t('export.noPrintTemplates')}
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Export Section */}
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('export.exportSection')}
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        <span>{t('export.exportExcel')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportGoogleSheets} className="gap-2 cursor-pointer">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" fill="#0F9D58" />
                            <rect x="6" y="7" width="12" height="2" rx="0.5" fill="white" />
                            <rect x="6" y="11" width="12" height="2" rx="0.5" fill="white" />
                            <rect x="6" y="15" width="8" height="2" rx="0.5" fill="white" />
                            <rect x="11" y="7" width="2" height="10" rx="0.5" fill="white" opacity="0.6" />
                        </svg>
                        <span>{t('export.openGoogleSheets')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>{t('export.exportPdf')}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Advanced Options */}
                    <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2">
                        <Eye className="w-4 h-4" />
                        {t('export.advancedOptions')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Advanced Print Dialog */}
            {dialogOpen && (
                <EnhancedPrintDialog
                    docType={printDocType}
                    docId={docId}
                    variant="button"
                    size="sm"
                />
            )}
        </>
    );
}
