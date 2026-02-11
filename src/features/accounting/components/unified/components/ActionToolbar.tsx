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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SheetMode, ActionConfig } from '../types';
import { NavigationArrows } from './NavigationArrows';
import { QRPopover } from './QRPopover';

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
}

export function EnhancedActionToolbar({
    mode,
    status,
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
    amount,
    currency = '',

    // Mode
    onModeChange,
    onCancelEdit,
    hasChanges = false,
    showConfirmAction = false,
    confirmationStatus,
}: EnhancedActionToolbarProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';
    const isViewMode = mode === 'view';

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

            {/* ✅ Confirm & Send — only for trade documents in view mode */}
            {isViewMode && showConfirmAction && confirmationStatus !== 'confirmed' && (
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

            {/* Already Confirmed Badge */}
            {isViewMode && showConfirmAction && confirmationStatus === 'confirmed' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{t('status.confirmed') || 'مُؤكد'}</span>
                </div>
            )}

            {/* Edit / Save Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={(isEditMode || isCreateMode) ? "default" : "ghost"}
                            size="sm"
                            onClick={handleEditSave}
                            disabled={disabled || loading}
                            className={cn(
                                "gap-1.5",
                                (isEditMode || isCreateMode)
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800"
                            )}
                        >
                            {(isEditMode || isCreateMode) ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{t('common.save') || 'حفظ'}</span>
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
                        <p>{(isEditMode || isCreateMode) ? (t('common.save') || 'حفظ') : (t('common.edit') || 'تعديل')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Cancel Button (in edit/create mode) */}
            {(isEditMode || isCreateMode) && (
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
            )}

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
                    <DropdownMenuItem onClick={() => onAction('duplicate')} className="gap-2 cursor-pointer">
                        <Copy className="w-4 h-4" />
                        <span>{t('common.duplicate') || 'تكرار'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAction('share')} className="gap-2 cursor-pointer">
                        <Share2 className="w-4 h-4" />
                        <span>{t('common.share') || 'مشاركة'}</span>
                    </DropdownMenuItem>
                    {status !== 'posted' && (
                        <DropdownMenuItem onClick={() => onAction('post')} className="gap-2 cursor-pointer">
                            <CheckCircle className="w-4 h-4" />
                            <span>{t('accounting.post') || 'ترحيل'}</span>
                        </DropdownMenuItem>
                    )}
                    {status === 'posted' && (
                        <DropdownMenuItem onClick={() => onAction('unpost')} className="gap-2 cursor-pointer text-orange-600">
                            <XCircle className="w-4 h-4" />
                            <span>{t('accounting.unpost') || 'إلغاء الترحيل'}</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onAction('delete')}
                        className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>{t('common.delete') || 'حذف'}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
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
