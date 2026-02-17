/**
 * Action Toolbar Component - شريط الأوامر الموحد المحسّن
 * يعرض أزرار الإجراءات مع أسهم التنقل وزر QR وتبديل تعديل/حفظ
 */

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
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SheetMode, ActionConfig } from '../types';
import { NavigationArrows } from './NavigationArrows';
import { QRPopover } from './QRPopover';
import { useTradePermissions } from '@/hooks/useTradePermissions';

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
    tradeMode?: 'sales' | 'purchase';
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
}: EnhancedActionToolbarProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';
    const isViewMode = mode === 'view';

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

    // RBAC permissions
    const { actions: perms } = useTradePermissions({
        tradeMode: tradeMode,
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
        if (isCreateMode) {
            // In create mode, cancel should close the sheet
            onAction('cancel');
        } else {
            onModeChange?.('view');
        }
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

            {/* ✅ Save & Confirm — for draft invoices (step 1 of workflow) */}
            {isViewMode && isPostable && isDraft && !isReceivedDoc && (
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
                                <span>{language === 'ar' ? 'حفظ وتأكيد' : 'Save & Confirm'}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tradeMode === 'purchase'
                                ? (language === 'ar' ? 'تأكيد الفاتورة وإرسال إشعار لأمين المستودع للاستلام' : 'Confirm invoice and notify warehouse keeper for receipt')
                                : (language === 'ar' ? 'تأكيد الفاتورة وإرسال إشعار لأمين المستودع لتجهيز الطلب' : 'Confirm invoice and notify warehouse keeper to prepare order')
                            }</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* ✅ Post Action — for confirmed / partially_received / received stages */}
            {isViewMode && isPostable && canPostFromStage && !isPosted && (
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
                                    ? (language === 'ar' ? 'ترحيل (بالمستلم)' : 'Post (received)')
                                    : (t('accounting.post') || 'ترحيل واعتماد')
                                }</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isReceivedOrPartial
                                ? (language === 'ar' ? 'ترحيل القيد بالكميات المستلمة فعلياً' : 'Post using actual received quantities')
                                : (t('accounting.postAndConfirm') || 'اعتماد المستند وترحيل القيد المالي')
                            }</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* ✅ Confirm & Send (for non-postable trade docs: orders, quotations) */}
            {isViewMode && showConfirmAction && !isPostable && confirmationStatus !== 'confirmed' && (
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
                    <span>{language === 'ar' ? 'مُستلم جزئياً' : 'Partially Received'}</span>
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

            {/* ✅ Save & Post / Save & Confirm — in edit/create mode */}
            {
                (isEditMode || isCreateMode) && isPostable && (() => {
                    // Purchase invoices in draft: show "Save & Confirm" instead of "Save & Post"
                    const isPurchaseInvoiceDraft = tradeMode === 'purchase' && docType === 'trade_invoice' && isDraft;
                    const actionId = isPurchaseInvoiceDraft ? 'save_confirm' : 'save_post';
                    const labelAr = isPurchaseInvoiceDraft ? 'حفظ وتأكيد' : 'حفظ وترحيل';
                    const labelEn = isPurchaseInvoiceDraft ? 'Save & Confirm' : 'Save & Post';
                    const tooltipAr = isPurchaseInvoiceDraft ? 'حفظ الفاتورة وتأكيدها — سيتم إشعار أمين المستودع' : 'حفظ المستند وترحيله فوراً';
                    const tooltipEn = isPurchaseInvoiceDraft ? 'Save and confirm — warehouse keeper will be notified' : 'Save and post document immediately';
                    const IconComp = isPurchaseInvoiceDraft ? ShieldCheck : CheckCircle;
                    const gradientClass = isPurchaseInvoiceDraft
                        ? 'gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold shadow-md shadow-emerald-500/20'
                        : 'gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm';

                    return (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        onClick={() => onAction(actionId)}
                                        disabled={disabled || loading || (!isPurchaseInvoiceDraft && !perms.canPost)}
                                        className={gradientClass}
                                    >
                                        <IconComp className="w-4 h-4" />
                                        <span>{language === 'ar' ? labelAr : labelEn}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{language === 'ar' ? tooltipAr : tooltipEn}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })()
            }

            {/* ✅ Save Button — for NON-postable docs in create/edit mode (containers, quotations, orders) */}
            {(isEditMode || isCreateMode) && !isPostable && (
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
                                    disabled={disabled || loading || ((isReceivedDoc || isPosted) && !canEditReceived)}
                                    className={cn(
                                        "gap-1.5",
                                        (isReceivedDoc || isPosted) && !canEditReceived
                                            ? "text-gray-400 cursor-not-allowed opacity-50"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                                    )}
                                >
                                    {(isReceivedDoc || isPosted) && !canEditReceived ? (
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
                                    {(isReceivedDoc || isPosted) && !canEditReceived
                                        ? (t('messages.docLocked') || 'المستند مقفل لا يمكن تعديله')
                                        : (t('common.edit') || 'تعديل')
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

            {/* Export */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAction('export')}
                            disabled={disabled || loading}
                            className="gap-1.5 text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden lg:inline">{t('common.export') || 'تصدير'}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('common.export') || 'تصدير'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Print */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAction('print')}
                            disabled={disabled || loading}
                            className="gap-1.5 text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden lg:inline">{t('common.print') || 'طباعة'}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('common.print') || 'طباعة'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

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

                    {/* Unpost Action */}
                    {isPostable && isPosted && perms.canUnpost && (
                        <DropdownMenuItem onClick={() => onAction('unpost')} className="gap-2 cursor-pointer text-orange-600">
                            <XCircle className="w-4 h-4" />
                            <span>{t('accounting.unpost') || 'إلغاء الترحيل'}</span>
                        </DropdownMenuItem>
                    )}
                    {/* Unconfirm Action — return confirmed doc to draft */}
                    {isPostable && isConfirmed && !isReceivedOrPartial && tradeMode === 'purchase' && (
                        <DropdownMenuItem onClick={() => onAction('unconfirm')} className="gap-2 cursor-pointer text-amber-600">
                            <XCircle className="w-4 h-4" />
                            <span>{language === 'ar' ? 'إلغاء التأكيد' : 'Unconfirm'}</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {/* Delete Action */}
                    {perms.canDelete && !isReceivedDoc && status !== 'posted' && (
                        <DropdownMenuItem
                            onClick={() => onAction('delete')}
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>{t('common.delete') || 'حذف'}</span>
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
