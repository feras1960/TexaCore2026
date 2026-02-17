/**
 * UnifiedAccountingSheet - الشيت المحاسبي الموحد
 * 
 * مكون واحد يستبدل جميع الشيتات المحاسبية:
 * - AccountDetailsSheet
 * - FundTransactionSheet  
 * - TransactionDetailsSheet
 * - NewJournalEntrySheet
 * - AddPartySheet
 * - وغيرها...
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Sheet, SheetContent, SheetHeader as UiSheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Anchor, Ship, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import components
import { SheetHeader } from './components/SheetHeader';
import { EnhancedActionToolbar, ActionToolbar } from './components/ActionToolbar';
import { SheetTabs, TabContentWrapper } from './components/SheetTabs';
import { MainDocumentTabs } from './components/MainDocumentTabs';

// Confirmation Workflow
import { ConfirmationDialog } from '@/features/trade/components/ConfirmationDialog';
import { confirmationService, type ValidationResult, type WorkflowSettings } from '@/services/confirmationService';
import { supabase } from '@/lib/supabase';
// Extracted hooks & lazy-loaded tabs
import {
    recalcItemTotals,
    resolveConfDocType,
    useAccountingSave,
    useTradeSave,
    useTradeAutoSave,
    useSheetActionHandler,
} from './hooks/useSheetActions';
import { useTabContentRenderer } from './hooks/TabContentRenderer';

// Import configs
import { getDocumentConfig } from './configs/documentConfigs';
import { StatusDropdown } from '@/components/shared/status';

// Import types
import type {
    UnifiedAccountingSheetProps,
    UnifiedDocType,
    SheetMode,
    DocumentConfig,
    LedgerEntry,
    OpenDocument,
    NavigationProps,
    EditOption,
    StageActionConfig,
} from './types';

/**
 * الشيت المحاسبي الموحد
 */
// Extended props interface
interface ExtendedSheetProps extends UnifiedAccountingSheetProps, NavigationProps {
    // Multi-document tabs
    openDocuments?: OpenDocument[];
    activeDocumentId?: string;
    onOpenDocument?: (doc: OpenDocument) => void;
    onCloseDocument?: (id: string) => void;
    onActiveDocumentChange?: (id: string) => void;
    // Stage Awareness (NEW)
    currentStage?: string;
    onStageAdvance?: (targetStage: string, notes?: string) => Promise<void>;
}

export function UnifiedAccountingSheet({
    isOpen,
    onClose,
    docType,
    mode: initialMode = 'view',
    data: initialData,
    options,
    documentId,
    companyId,
    tradeMode,
    defaultTab,
    allowedTabs,
    hiddenTabs,
    onSave,
    onDelete,
    onPost,
    onUnpost,
    onDuplicate,
    onPrint,
    onRefresh,
    onNavigate,
    onModeChange,
    // Edit Flow props
    enableEditFlow = false,
    onEditPermissionDenied,
    onAdjustmentRequired,
    customHeader,
    customFooter,
    headerExtra,
    hideActions = false,
    hideTabs = false,
    // Navigation props
    onNavigatePrev,
    onNavigateNext,
    hasPrev = false,
    hasNext = false,
    // Multi-document props
    openDocuments: externalOpenDocs,
    activeDocumentId,
    onOpenDocument,
    onCloseDocument,
    onActiveDocumentChange,
    // Stage Awareness
    currentStage,
    onStageAdvance,
}: ExtendedSheetProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();

    // ═══ Company ID — fallback to useCompany() if not provided as prop ═══
    const { companyId: hookCompanyId } = useCompany();
    const resolvedCompanyId = companyId || hookCompanyId;

    // Get document config
    const config = useMemo(() => getDocumentConfig(docType, tradeMode), [docType, tradeMode]);

    // State
    const [mode, setMode] = useState<SheetMode>(initialMode);
    const [data, setData] = useState<any>(initialData);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab || config.defaultTab);
    const [hasChanges, setHasChanges] = useState(false);

    // ═══ Confirmation Workflow State ═══
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmValidation, setConfirmValidation] = useState<ValidationResult | null>(null);
    const [confirmSettings, setConfirmSettings] = useState<WorkflowSettings | null>(null);
    const [confirmNeedsApproval, setConfirmNeedsApproval] = useState(false);

    // Is this a trade document type?
    const isTradeDocType = useMemo(() =>
        ['trade_order', 'trade_invoice', 'trade_quotation', 'trade_reservation', 'trade_delivery', 'trade_request', 'trade_return', 'trade_receipt', 'trade_container'].includes(docType),
        [docType]
    );

    // Document types that support posting (ترحيل)
    const POSTABLE_DOC_TYPES = useMemo(() => new Set([
        'trade_invoice',  // فاتورة بيع/شراء
        'trade_delivery', // إذن تسليم
        'trade_receipt',  // استلام بضاعة
        'trade_return',   // مرتجع
    ]), []);

    const isPostableDocType = useMemo(() => POSTABLE_DOC_TYPES.has(docType), [POSTABLE_DOC_TYPES, docType]);

    // ═══ Helpers imported from useSheetActions (recalcItemTotals, resolveConfDocType) ═══

    // Multi-document state
    const [openDocs, setOpenDocs] = useState<OpenDocument[]>(() => {
        // Initialize with primary document
        if (initialData) {
            return [{
                id: initialData.id || documentId || 'primary',
                type: docType,
                title: initialData.name || initialData.entry_number || t(config.titleKey) || 'Document',
                titleAr: initialData.nameAr || initialData.name_ar || initialData.name,
                code: initialData.code || initialData.entry_number,
                data: initialData,
                isClosable: false,
            }];
        }
        return [];
    });
    const [activeDocId, setActiveDocId] = useState<string>(activeDocumentId || openDocs[0]?.id || 'primary');

    // Get user preferences (would normally come from settings context)
    const useArabicNumerals = false; // سيتم ربطها بإعدادات المستخدم

    // Refs
    const contentRef = useRef<HTMLDivElement>(null);

    // Update data when props change — MERGE to preserve fetched items
    useEffect(() => {
        if (initialData) {
            setData((prev: any) => {
                // If prev has items from DB fetch, keep them
                const mergedItems = prev?.items?.length > 0 ? prev.items : initialData.items;
                return { ...initialData, ...(mergedItems ? { items: mergedItems } : {}) };
            });
        }
    }, [initialData]);

    // ═══ Auto-fetch items for existing trade documents ═══
    useEffect(() => {
        if (!isTradeDocType) return;
        // Containers fetch their own items via ShipmentItemsTab → container_items
        if (docType === 'trade_container') return;
        const docId = initialData?.id || documentId;
        if (!docId) return;
        // Skip if items are already loaded
        if (initialData?.items && initialData.items.length > 0) return;
        // Only fetch for view/edit mode (not create)
        if (initialMode === 'create') return;

        const fetchItems = async () => {
            try {
                const { TradeService } = await import('@/features/trade/services/TradeService');

                // Determine the service doc type from docType + tradeMode
                const tradeTypeMap: Record<string, Record<string, string>> = {
                    sales: {
                        trade_invoice: 'invoice',
                        trade_order: 'order',
                        trade_quotation: 'quotation',
                        trade_delivery: 'delivery',
                        trade_reservation: 'reservation',
                    },
                    purchase: {
                        trade_invoice: 'purchase_invoice',
                        trade_order: 'purchase_order',
                        trade_quotation: 'purchase_quotation',
                        trade_request: 'purchase_request',
                        trade_receipt: 'purchase_receipt',
                        trade_return: 'purchase_return',
                    },
                };
                const modeKey = tradeMode || 'sales';
                const serviceDocType = tradeTypeMap[modeKey]?.[docType] || 'invoice';

                const result = await TradeService.getTradeDocumentWithItems(docId, serviceDocType);
                console.log('[Fetch] getTradeDocumentWithItems result:', { header: !!result.header, itemsCount: result.items?.length });

                // Map DB items to the format expected by the UI
                // ✅ Items carry per-item tax_rate and tax_amount from DB
                const mappedItems = (result.items || []).map((dbItem: any) => ({
                    item_id: dbItem.product_id || dbItem.material_id || dbItem.id,
                    material_id: dbItem.material_id,
                    item_name: dbItem.description || dbItem.material_name_ar || '',
                    item_code: dbItem.item_code || dbItem.product_code || '',
                    quantity: Number(dbItem.quantity || dbItem.quantity_received) || 0,
                    unit_price: Number(dbItem.unit_price) || 0,
                    subtotal: Number(dbItem.subtotal) || Number(dbItem.quantity || 0) * Number(dbItem.unit_price || 0) || 0,
                    total: Number(dbItem.total) || Number(dbItem.subtotal) || 0,
                    unit: dbItem.unit || '',
                    notes: dbItem.notes || '',
                    tax_amount: Number(dbItem.tax_amount) || 0,
                    tax_rate: Number(dbItem.tax_rate) || 0,
                    discount_amount: Number(dbItem.discount_amount) || 0,
                    // Preserve color/roll data for fabric items
                    color_id: dbItem.color_id,
                    color_name: dbItem.color_name,
                    roll_id: dbItem.roll_id,
                    roll_code: dbItem.roll_code,
                }));

                // Merge header + items into data
                setData((prev: any) => ({
                    ...prev,
                    // Merge header data from DB (warehouse_id, currency, expenses, etc.)
                    warehouse_id: result.header?.warehouse_id || prev?.warehouse_id,
                    currency: result.header?.currency || prev?.currency,
                    exchange_rate: result.header?.exchange_rate || prev?.exchange_rate,
                    expenses: result.header?.expenses || prev?.expenses,
                    attachments: result.header?.attachments || prev?.attachments,
                    notes: result.header?.notes || prev?.notes,
                    subtotal: result.header?.subtotal || prev?.subtotal,
                    total_amount: result.header?.total_amount || prev?.total_amount,
                    grand_total: result.header?.total_amount || prev?.grand_total,
                    tax_amount: result.header?.tax_amount || prev?.tax_amount,
                    supplier_invoice_number: result.header?.supplier_invoice_number || prev?.supplier_invoice_number,
                    supplier_invoice_date: result.header?.supplier_invoice_date || prev?.supplier_invoice_date,
                    // Set items
                    items: mappedItems,
                }));
            } catch (err) {
                console.warn('[UnifiedAccountingSheet] Failed to fetch trade items:', err);
            }
        };

        fetchItems();
    }, [initialData?.id, documentId, isTradeDocType, docType, tradeMode, initialMode]);

    // Update mode when props change
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // Reset tab when docType changes
    useEffect(() => {
        setActiveTab(defaultTab || config.defaultTab);
    }, [docType, defaultTab, config.defaultTab]);

    // Set hasChanges to true in create mode to enable Save button
    useEffect(() => {
        if (mode === 'create') {
            setHasChanges(true);
        }
    }, [mode]);

    // Handle mode change
    const handleModeChange = useCallback((newMode: SheetMode) => {
        setMode(newMode);
        // Enable save button when entering edit mode
        if (newMode === 'edit') {
            setHasChanges(true);
        }
        onModeChange?.(newMode);
    }, [onModeChange]);

    // ═══ Document Type Flags ═══
    const isAccountingDocType = useMemo(() => ['journal', 'cash', 'receipt', 'payment', 'transfer', 'exchange', 'debit_note', 'credit_note'].includes(docType), [docType]);

    // ═══ Save Handlers (extracted to useSheetActions) ═══
    const handleAccountingSave = useAccountingSave(docType, resolvedCompanyId, documentId, mode, t);
    const handleTradeSave = useTradeSave(docType, tradeMode, resolvedCompanyId, documentId, mode, language, setData, setMode);

    // ═══ Auto-Save for Trade Drafts ═══
    const currentDocId = data?.id || documentId || null;
    const currentStageValue = currentStage || data?.stage || data?.status || '';
    const { isSaving: isAutoSaving, lastSavedAt: autoSavedAt, hasUnsavedChanges: autoUnsaved } = useTradeAutoSave(
        isTradeDocType, handleTradeSave, data, currentDocId, currentStageValue, mode
    );

    // ═══ Action Handler (extracted to useSheetActions) ═══
    const handleAction = useSheetActionHandler({
        docType, tradeMode, mode, data, documentId,
        companyId: resolvedCompanyId,
        isTradeDocType, isAccountingDocType, isPostableDocType,
        handleAccountingSave, handleTradeSave,
        setData, setMode, setLoading, setHasChanges, handleModeChange,
        setConfirmDialogOpen, setConfirmValidation, setConfirmSettings, setConfirmNeedsApproval,
        onSave, onDelete, onPost, onUnpost, onDuplicate, onPrint, onRefresh, onClose,
        enableEditFlow, onEditPermissionDenied, onAdjustmentRequired,
        initialData, hasChanges,
    });

    // Filter tabs based on props and current stage
    const visibleTabs = useMemo(() => {
        let tabs = config.tabs;

        if (allowedTabs && allowedTabs.length > 0) {
            tabs = tabs.filter(tab => allowedTabs.includes(tab.id));
        }

        if (hiddenTabs && hiddenTabs.length > 0) {
            tabs = tabs.filter(tab => !hiddenTabs.includes(tab.id));
        }

        // Stage-based visibility filtering (NEW)
        if (currentStage) {
            tabs = tabs.filter(tab => {
                if (!tab.visibleInStages) return true; // No restriction = always visible
                return tab.visibleInStages.includes(currentStage);
            });
        }

        return tabs;
    }, [config.tabs, allowedTabs, hiddenTabs, currentStage]);

    // Is the current stage editable? (NEW)
    const isStageEditable = useMemo(() => {
        if (!currentStage || !config.editableStages) return true; // No stage = legacy mode
        return config.editableStages.includes(currentStage);
    }, [currentStage, config.editableStages]);

    // Is the current stage locked? (NEW)
    const isStageLocked = useMemo(() => {
        if (!currentStage || !config.lockedStages) return false;
        return config.lockedStages.includes(currentStage);
    }, [currentStage, config.lockedStages]);

    // ═══ Container Lock — فاتورة مربوطة بكونتينر = مقفلة ═══
    const isContainerLinked = useMemo(() => {
        if (docType !== 'trade_invoice' || tradeMode !== 'purchase') return false;
        return !!(data?.container_id);
    }, [docType, tradeMode, data?.container_id]);

    const containerLockInfo = useMemo(() => {
        if (!isContainerLinked) return null;
        return {
            containerId: data?.container_id,
            containerNumber: data?.container_number || data?.container_id?.substring(0, 8),
            containerStatus: data?.container_status,
        };
    }, [isContainerLinked, data?.container_id, data?.container_number, data?.container_status]);

    // Get stage-specific actions (NEW)
    const currentStageActions: StageActionConfig[] = useMemo(() => {
        if (!currentStage || !config.stageActions) return [];
        return config.stageActions[currentStage] || [];
    }, [currentStage, config.stageActions]);

    // Get mock ledger entries for demo
    const mockLedgerEntries: LedgerEntry[] = useMemo(() => {
        if (!data) return [];

        // Generate mock ledger entries
        const entries: LedgerEntry[] = [];
        let balance = data.opening_balance || 0;

        for (let i = 0; i < 15; i++) {
            const isDebit = Math.random() > 0.5;
            const amount = Math.floor(Math.random() * 5000) + 500;
            balance += isDebit ? amount : -amount;

            entries.push({
                id: `LE-${1000 + i}`,
                date: new Date(Date.now() - (15 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                entry_number: `JV-${2024}${String(i + 1).padStart(4, '0')}`,
                description: isDebit ? 'إيداع نقدي' : 'صرف مصروفات',
                debit: isDebit ? amount : 0,
                credit: isDebit ? 0 : amount,
                balance,
                status: 'posted',
                reference: `REF-${100 + i}`,
                cost_center: isDebit ? 'المبيعات' : 'المشتريات',
            });
        }

        return entries;
    }, [data]);

    // Activity events are now fetched from audit_logs inside ActivityTab

    // ═══ Lazy-loaded Tab Content Renderer (extracted to reduce file size) ═══
    const renderTabContent = useTabContentRenderer({
        data, mode, docType, tradeMode, loading,
        companyId: resolvedCompanyId, documentId, currentStage, options,
        useArabicNumerals,
        setData, setHasChanges, onClose, onRefresh,
        openDocs, setOpenDocs, setActiveDocId,
        stats: config.stats,
        mockLedgerEntries,
    });

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <SheetContent
                    className={cn(
                        docType === 'materialGroup'
                            ? "!w-[38vw] !max-w-[38vw] p-0 flex flex-col h-full"
                            : "!w-[60vw] !max-w-[60vw] p-0 flex flex-col h-full",
                        "bg-gray-50 dark:bg-gray-900"
                    )}
                    side={isRTL ? 'left' : 'right'}
                >
                    <div className="flex flex-col h-full w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                        {/* Accessibility requirements */}
                        <UiSheetHeader className="sr-only">
                            <SheetTitle>{t(config.titleKey)}</SheetTitle>
                            <SheetDescription>
                                {language === 'ar' ? 'نموذج عرض وتعديل البيانات' : 'Data view and edit form'}
                            </SheetDescription>
                        </UiSheetHeader>

                        {/* Loading Overlay */}
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-erp-primary" />
                            </div>
                        )}

                        {/* Combined Header + Action Toolbar — Compact (FIRST) */}
                        {customHeader || (
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
                                {/* Single Row: Icon, Title, Code, Status, Actions, Close */}
                                <div className="flex items-center justify-between gap-3">
                                    {/* Left: Icon + Title + Code + Status */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {/* Document Icon — Compact */}
                                        <div className="w-9 h-9 rounded-lg bg-erp-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-base">
                                                {data?.type === 'cash' ? '💵' : data?.type === 'bank' ? '🏦' :
                                                    docType === 'account' ? '📋' : docType === 'journal' ? '📝' :
                                                        docType === 'receipt' ? '🧾' : docType === 'payment' ? '💳' : '📄'}
                                            </span>
                                        </div>

                                        {/* Title + Code + Status — single row */}
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                    {/* Dynamic title for trade docs based on status/stage */}
                                                    {isTradeDocType ? (
                                                        (() => {
                                                            // Special title for containers
                                                            if (docType === 'trade_container') {
                                                                if (mode === 'create') return language === 'ar' ? 'إنشاء كونتينر' : 'New Container';
                                                                return language === 'ar' ? 'تفاصيل الكونتينر' : 'Container Details';
                                                            }
                                                            const stage = data?.stage || data?.document_stage || data?.status;
                                                            const isSales = tradeMode === 'sales';
                                                            const stageTitle: Record<string, { ar: string; en: string }> = {
                                                                draft: { ar: isSales ? 'مسودة مبيعات' : 'مسودة مشتريات', en: isSales ? 'Sales Draft' : 'Purchase Draft' },
                                                                confirmed: { ar: isSales ? 'مبيعات مؤكدة' : 'مشتريات مؤكدة', en: isSales ? 'Confirmed Sales' : 'Confirmed Purchase' },
                                                                partially_received: { ar: 'مستلم جزئياً', en: 'Partially Received' },
                                                                requested: { ar: isSales ? 'طلب بيع' : 'طلب شراء', en: isSales ? 'Sales Request' : 'Purchase Request' },
                                                                quoted: { ar: isSales ? 'عرض سعر مبيعات' : 'عرض سعر شراء', en: isSales ? 'Sales Quotation' : 'Purchase Quotation' },
                                                                ordered: { ar: isSales ? 'أمر بيع' : 'أمر شراء', en: isSales ? 'Sales Order' : 'Purchase Order' },
                                                                received: { ar: 'تم الاستلام', en: 'Received' },
                                                                invoiced: { ar: isSales ? 'فاتورة مبيعات' : 'فاتورة مشتريات', en: isSales ? 'Sales Invoice' : 'Purchase Invoice' },
                                                                posted: { ar: isSales ? 'فاتورة مرحّلة' : 'فاتورة مرحّلة', en: 'Posted Invoice' },
                                                                partially_paid: { ar: 'مدفوعة جزئياً', en: 'Partially Paid' },
                                                                partial_paid: { ar: 'مدفوعة جزئياً', en: 'Partially Paid' },
                                                                paid: { ar: 'مدفوعة', en: 'Paid' },
                                                                cancelled: { ar: 'ملغاة', en: 'Cancelled' },
                                                            };
                                                            const title = stageTitle[stage || 'draft'] || stageTitle.draft;
                                                            return language === 'ar' ? title.ar : title.en;
                                                        })()
                                                    ) : (
                                                        language === 'ar' ? (data?.nameAr || data?.name_ar || data?.name) : (data?.name_en || data?.name) || t(config.titleKey)
                                                    )}
                                                </h2>

                                                {/* Status — Stage-based badge for trade docs, simple badge for others */}
                                                {isTradeDocType && data?.id ? (() => {
                                                    const stageCode = data?.stage || data?.status || 'draft';
                                                    const stageStyles: Record<string, string> = {
                                                        draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                                                        confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                                                        partially_received: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                                                        received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                                                        posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                                        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                                                        paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                                        partial_paid: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                                                    };
                                                    const stageLabels: Record<string, { ar: string; en: string }> = {
                                                        draft: { ar: 'مسودة', en: 'Draft' },
                                                        confirmed: { ar: 'مؤكد', en: 'Confirmed' },
                                                        partially_received: { ar: 'مستلم جزئياً', en: 'Partially Received' },
                                                        received: { ar: 'مستلم', en: 'Received' },
                                                        posted: { ar: 'مرحّل', en: 'Posted' },
                                                        cancelled: { ar: 'ملغى', en: 'Cancelled' },
                                                        paid: { ar: 'مدفوع', en: 'Paid' },
                                                        partial_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
                                                    };
                                                    const label = stageLabels[stageCode] || { ar: stageCode, en: stageCode };
                                                    return (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border",
                                                            stageStyles[stageCode] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                        )}>
                                                            {language === 'ar' ? label.ar : label.en}
                                                        </span>
                                                    );
                                                })() : data?.status ? (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                                                        data.status === 'posted' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                                                            data.status === 'draft' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                                                data.status === 'saved' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                                                                    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                    )}>
                                                        {data.status === 'posted' ? (t('status.posted') || 'Posted') :
                                                            data.status === 'draft' ? (t('status.draft') || 'Draft') :
                                                                data.status === 'saved' ? (t('status.saved') || 'Saved') :
                                                                    data.status}
                                                    </span>
                                                ) : null}
                                                {data?.is_active !== undefined && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                                                        data.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                    )}>
                                                        {data.is_active ? (t('status.active') || 'Active') : (t('status.inactive') || 'Inactive')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Code / Document Number in compact second line */}
                                            <div className="flex items-center gap-2">
                                                {/* Show invoice/order number prominently for trade docs */}
                                                {(data?.invoice_no || data?.invoice_number || data?.order_number) ? (
                                                    <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                                        {data.invoice_no || data.invoice_number || data.order_number}
                                                    </span>
                                                ) : (data?.code || data?.entry_number) ? (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        #{data.code || data.entry_number}
                                                    </span>
                                                ) : null}

                                                {/* Balance / Grand Total inline with code */}
                                                {data && (() => {
                                                    // For trade docs: use pre-calculated grand_total (tax-inclusive)
                                                    let displayAmount: number | undefined;
                                                    if (isTradeDocType) {
                                                        displayAmount = Number(data?.grand_total || data?.total_amount || data?.subtotal || 0) || undefined;
                                                    } else {
                                                        displayAmount = data?.current_balance ?? data?.balance;
                                                    }
                                                    if (displayAmount === undefined || displayAmount === null) return null;
                                                    return (
                                                        <span className="text-sm font-bold font-mono text-erp-primary">
                                                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                .format(displayAmount)}
                                                            <span className="text-xs ms-1 text-gray-500 font-normal">
                                                                {t(`currencies.${(data.currency || '').toUpperCase()}`) || data.currency || ''}
                                                            </span>
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Action Toolbar — hidden when container-linked */}
                                    {!hideActions && !isContainerLinked && (
                                        <EnhancedActionToolbar
                                            mode={mode}
                                            status={data?.status}
                                            stage={isTradeDocType ? (data?.stage || data?.document_stage || currentStage || '') : undefined}
                                            onAction={handleAction}
                                            loading={loading}
                                            // Navigation
                                            onNavigatePrev={onNavigatePrev}
                                            onNavigateNext={onNavigateNext}
                                            hasPrev={hasPrev}
                                            hasNext={hasNext}
                                            // QR
                                            docType={docType}
                                            docNumber={data?.id || documentId || ''}
                                            docId={data?.id || documentId || ''}
                                            displayNumber={data?.invoice_no || data?.invoice_number || data?.order_number || data?.quotation_number || data?.receipt_number || data?.code || data?.entry_number || (isTradeDocType ? (language === 'ar' ? 'مسودة' : 'Draft') : '')}
                                            amount={isTradeDocType
                                                ? Number(data?.grand_total || data?.total_amount || 0)
                                                : (data?.grand_total ?? data?.total_amount ?? data?.current_balance ?? data?.balance ?? data?.total)
                                            }
                                            currency={data?.currency || ''}
                                            // Mode
                                            onModeChange={handleModeChange}
                                            onCancelEdit={() => {
                                                setData(initialData);
                                                setHasChanges(false);
                                            }}
                                            hasChanges={hasChanges}
                                            // Confirmation
                                            showConfirmAction={isTradeDocType}
                                            confirmationStatus={data?.confirmation_status}
                                            tradeMode={tradeMode as 'sales' | 'purchase'}
                                        />
                                    )}

                                    {/* Container Lock Badge — shown instead of toolbar */}
                                    {isContainerLinked && containerLockInfo && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-50 border border-cyan-200 rounded-md">
                                            <Anchor className="w-3.5 h-3.5 text-cyan-600" />
                                            <span className="text-[11px] font-semibold text-cyan-700 font-mono">
                                                {containerLockInfo.containerNumber}
                                            </span>
                                        </div>
                                    )}

                                    {/* Close Button — Compact */}
                                    <button
                                        onClick={onClose}
                                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center transition-colors shrink-0"
                                    >
                                        <span className="text-sm text-gray-600 dark:text-gray-300">✕</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Extra header slot — renders AFTER toolbar (e.g. receipt type / document selectors) */}
                        {headerExtra}

                        {/* ⚓ Container Lock Banner — shown when invoice is linked to a container */}
                        {isContainerLinked && containerLockInfo && (
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-2.5 border-b",
                                "bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50",
                                "dark:from-cyan-950/30 dark:via-sky-950/30 dark:to-blue-950/30",
                                "border-cyan-200 dark:border-cyan-800"
                            )}>
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 shrink-0">
                                    <Ship className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                                        {language === 'ar'
                                            ? `⚓ هذه الفاتورة مربوطة بالكونتينر`
                                            : `⚓ This invoice is linked to container`}
                                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 ms-1.5">
                                            {containerLockInfo.containerNumber}
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-cyan-600/80 dark:text-cyan-400/60 mt-0.5">
                                        {language === 'ar'
                                            ? 'الفاتورة مقفلة — لا يمكن التعديل. لفك الارتباط اذهب لصفحة الكونتينر'
                                            : 'Invoice is locked — no edits allowed. To unlink, go to the container page'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        // Open container in new tab/window 
                                        window.open(`/purchases?tab=containers&container=${containerLockInfo.containerId}`, '_blank');
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium shrink-0",
                                        "bg-cyan-100 hover:bg-cyan-200 text-cyan-700",
                                        "dark:bg-cyan-900/50 dark:hover:bg-cyan-800/50 dark:text-cyan-300",
                                        "transition-colors border border-cyan-200 dark:border-cyan-700"
                                    )}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    {language === 'ar' ? 'عرض الكونتينر' : 'View Container'}
                                </button>
                            </div>
                        )}

                        {/* Main Document Tabs */}
                        {openDocs.length > 0 && (
                            <MainDocumentTabs
                                documents={openDocs}
                                activeId={activeDocId}
                                onTabChange={(id) => {
                                    setActiveDocId(id);
                                    const doc = openDocs.find(d => d.id === id);
                                    if (doc) {
                                        setData(doc.data);
                                    }
                                    onActiveDocumentChange?.(id);
                                }}
                                onTabClose={(id) => {
                                    setOpenDocs(prev => prev.filter(d => d.id !== id));
                                    // Switch to previous tab if active one was closed
                                    if (id === activeDocId && openDocs.length > 1) {
                                        const remaining = openDocs.filter(d => d.id !== id);
                                        setActiveDocId(remaining[remaining.length - 1].id);
                                        setData(remaining[remaining.length - 1].data);
                                    }
                                    onCloseDocument?.(id);
                                }}
                            />
                        )}

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col overflow-hidden min-h-0" ref={contentRef}>
                            {hideTabs ? (
                                // Single content without tabs
                                <ScrollArea className="flex-1 p-4">
                                    {renderTabContent(activeTab)}
                                </ScrollArea>
                            ) : (
                                // Tabs layout - SheetTabs is flex-col h-full with fixed header
                                <SheetTabs
                                    tabs={visibleTabs}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    mode={mode}
                                    variant="default"
                                >
                                    {/* Ledger tab needs special handling for sticky footer */}
                                    {activeTab === 'ledger' ? (
                                        <div className="flex-1 flex flex-col overflow-hidden p-4">
                                            {visibleTabs.map((tab) => (
                                                <TabsContent
                                                    key={tab.id}
                                                    value={tab.id}
                                                    className="m-0 outline-none flex-1 flex flex-col min-h-0"
                                                >
                                                    {activeTab === tab.id && renderTabContent(tab.id)}
                                                </TabsContent>
                                            ))}
                                        </div>
                                    ) : (
                                        <ScrollArea className="flex-1 h-full">
                                            <div className="p-4">
                                                {visibleTabs.map((tab) => (
                                                    <TabsContent
                                                        key={tab.id}
                                                        value={tab.id}
                                                        className="m-0 outline-none"
                                                    >
                                                        {activeTab === tab.id && renderTabContent(tab.id)}
                                                    </TabsContent>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </SheetTabs>
                            )}
                        </div>

                        {/* Custom Footer */}
                        {customFooter}

                        {/* Stage Action Buttons (NEW — shown when stage is active) */}
                        {currentStage && currentStageActions.length > 0 && onStageAdvance && (
                            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/80">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Stage indicator */}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 me-auto">
                                        {language === 'ar' ? `المرحلة: ${currentStage}` : `Stage: ${currentStage}`}
                                        {isStageLocked && (
                                            <span className="ms-1.5 text-amber-500">🔒</span>
                                        )}
                                        {/* Auto-save indicator */}
                                        {isAutoSaving && (
                                            <span className="ms-2 text-blue-500 animate-pulse">💾 {language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                                        )}
                                        {!isAutoSaving && autoSavedAt && (
                                            <span className="ms-2 text-emerald-500">✅ {language === 'ar' ? 'تم الحفظ' : 'Saved'}</span>
                                        )}
                                        {autoUnsaved && !isAutoSaving && (
                                            <span className="ms-2 text-amber-500">● {language === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved'}</span>
                                        )}
                                    </span>
                                    {/* Action buttons */}
                                    {currentStageActions.map((action) => (
                                        <button
                                            key={action.id}
                                            onClick={() => onStageAdvance(action.targetStage)}
                                            disabled={loading}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                                                action.variant === 'success' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                                                action.variant === 'destructive' && 'bg-red-600 hover:bg-red-700 text-white',
                                                action.variant === 'warning' && 'bg-amber-500 hover:bg-amber-600 text-white',
                                                action.variant === 'outline' && 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
                                                action.variant === 'default' && 'bg-blue-600 hover:bg-blue-700 text-white',
                                                loading && 'opacity-50 cursor-not-allowed',
                                            )}
                                        >
                                            <span>{action.icon}</span>
                                            <span>{language === 'ar' ? action.labelAr : action.labelEn}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* ═══ Confirmation Dialog ═══ */}
            <ConfirmationDialog
                isOpen={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={async () => {
                    if (!resolvedCompanyId) return;

                    const confDocType = resolveConfDocType(docType, tradeMode);

                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const result = await confirmationService.confirmDocument(
                        confDocType,
                        documentId || data?.id || '',
                        data,
                        data?.tenant_id || '',
                        resolvedCompanyId,
                        user.id,
                        confirmSettings!
                    );

                    if (result.success) {
                        toast.success(language === 'ar' ? result.message_ar : result.message_en);
                        setData((prev: any) => ({
                            ...prev,
                            confirmation_status: 'confirmed',
                            status: 'confirmed',
                        }));
                        setConfirmDialogOpen(false);
                        onRefresh?.();
                    } else {
                        toast.error(language === 'ar' ? result.message_ar : result.message_en);
                    }
                }}
                onRequestApproval={async () => {
                    if (!resolvedCompanyId) return;

                    const confDocType = resolveConfDocType(docType, tradeMode);

                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const result = await confirmationService.requestApproval(
                        confDocType,
                        documentId || data?.id || '',
                        data?.order_number || data?.invoice_number || '',
                        data?.total_amount || data?.grand_total || 0,
                        data?.currency || 'USD',
                        data?.tenant_id || '',
                        resolvedCompanyId,
                        user.id
                    );

                    if (result.success) {
                        toast.success(result.message);
                        setData((prev: any) => ({
                            ...prev,
                            approval_status: 'pending',
                            confirmation_status: 'pending_approval',
                        }));
                        setConfirmDialogOpen(false);
                    } else {
                        toast.error(result.message);
                    }
                }}
                docType={resolveConfDocType(docType, tradeMode)}
                docData={data}
                validation={confirmValidation}
                settings={confirmSettings}
                loading={loading}
                needsApproval={confirmNeedsApproval}
            />
        </>
    );
}

export default UnifiedAccountingSheet;
