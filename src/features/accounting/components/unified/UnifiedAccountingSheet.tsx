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
import { Loader2, Anchor, Ship, ExternalLink, AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// Import components
import { SheetHeader } from './components/SheetHeader';
import { EnhancedActionToolbar, ActionToolbar } from './components/ActionToolbar';
import { SheetTabs, TabContentWrapper } from './components/SheetTabs';
import { MainDocumentTabs } from './components/MainDocumentTabs';

// Confirmation Workflow
import { ConfirmationDialog } from '@/features/trade/components/ConfirmationDialog';
import { confirmationService, type ValidationResult, type WorkflowSettings } from '@/services/confirmationService';
import { supabase } from '@/lib/supabase';
import { attachmentService, resolveEntityType } from '@/services/attachmentService';
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
import { useDocumentActivityLogger } from './hooks/useDocumentActivityLogger';

// Import configs
import { getDocumentConfig } from './configs/documentConfigs';
import { StatusDropdown } from '@/components/shared/status';

// Import types
import type {
    UnifiedAccountingSheetProps,
    UnifiedDocType,
    SheetMode,
    DocumentConfig,
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
    // effectiveConfig: used for rendering tabs/content when MDI switches document type

    // State
    const [mode, setMode] = useState<SheetMode>(initialMode);
    const [data, setData] = useState<any>(initialData);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab || config.defaultTab);
    const [hasChanges, setHasChanges] = useState(false);
    const [attachmentCount, setAttachmentCount] = useState<number>(0);
    const [activityCount, setActivityCount] = useState<number>(0);
    const [displayCurrency, setDisplayCurrency] = useState<string>('all');

    // ═══ Confirmation Workflow State ═══
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmValidation, setConfirmValidation] = useState<ValidationResult | null>(null);
    const [confirmSettings, setConfirmSettings] = useState<WorkflowSettings | null>(null);
    const [confirmNeedsApproval, setConfirmNeedsApproval] = useState(false);

    // ═══ Unsaved Changes Guard ═══
    const [showUnsavedGuard, setShowUnsavedGuard] = useState(false);

    // Is this a trade document type?
    const isTradeDocType = useMemo(() =>
        ['trade_order', 'trade_invoice', 'trade_quotation', 'trade_reservation', 'trade_delivery', 'trade_request', 'trade_return', 'trade_receipt', 'trade_container', 'sales_delivery'].includes(docType),
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
                lastActiveTab: defaultTab || config.defaultTab,
                tradeMode: tradeMode as any,
            }];
        }
        return [];
    });
    const [activeDocId, setActiveDocId] = useState<string>(activeDocumentId || (openDocs.length > 0 ? openDocs[0].id : 'primary'));

    // ═══ Ensure Primary Document is in MDI Tabs ═══
    // If the sheet opens with no initialData, openDocs starts empty. 
    // We must inject the primary document as soon as data arrives, so the tab is visible.
    useEffect(() => {
        if (data && openDocs.length === 0) {
            const primaryId = documentId || data.id || 'primary';
            setOpenDocs([{
                id: primaryId,
                type: docType,
                title: data.name || data.entry_number || data.name_en || 'Document',
                titleAr: data.name_ar || data.name,
                code: data.code || data.account_code || data.entry_number,
                data: data,
                isClosable: false, // The primary document cannot be closed
                lastActiveTab: defaultTab || config.defaultTab,
                tradeMode: tradeMode as any,
            }]);
            if (activeDocId === 'primary') {
                setActiveDocId(primaryId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, documentId, docType]);

    // ═══ Reset MDI when a DIFFERENT document is opened ═══
    // When the sheet is reused for a different party/document, clear all sub-tabs
    // IMPORTANT: Only track `documentId` prop (external), NOT `data?.id` (changes with MDI sub-tabs)
    const prevDocIdRef = useRef(documentId || initialData?.id);
    useEffect(() => {
        const currentPrimaryId = documentId || initialData?.id;
        if (!currentPrimaryId) return;

        // If the primary document has changed (new party/document opened)
        if (prevDocIdRef.current && prevDocIdRef.current !== currentPrimaryId) {
            console.log('[MDI] Document changed from', prevDocIdRef.current, 'to', currentPrimaryId, '— resetting tabs');
            // Use initialData (new party) — NOT data (old party state)
            const newData = initialData || {};
            const newPrimary: OpenDocument = {
                id: currentPrimaryId,
                type: docType,
                title: newData.name || newData.entry_number || newData.name_en || 'Document',
                titleAr: newData.name_ar || newData.name,
                code: newData.code || newData.account_code || newData.entry_number,
                data: newData,
                isClosable: false,
                lastActiveTab: defaultTab || config.defaultTab,
                tradeMode: tradeMode as any,
            };
            setOpenDocs([newPrimary]);
            setActiveDocId(currentPrimaryId);
            setActiveTab(defaultTab || config.defaultTab);
            // Fully reset all state to new party
            setData(newData);
            setMode(initialMode);
            setHasChanges(false);
        }
        prevDocIdRef.current = currentPrimaryId;
    }, [documentId, initialData?.id]);

    // Effective docType: changes based on active document type (for MDI cross-type navigation)
    const effectiveDocType = useMemo(() => {
        const activeDoc = openDocs.find(d => d.id === activeDocId);
        return activeDoc?.type || docType;
    }, [activeDocId, openDocs, docType]);

    const effectiveTradeMode = useMemo(() => {
        const activeDoc = openDocs.find(d => d.id === activeDocId);
        return activeDoc?.tradeMode || tradeMode || 'sales';
    }, [activeDocId, openDocs, tradeMode]);

    // Effective data: when viewing a sub-document (MDI tab), use its pre-fetched data
    const effectiveData = useMemo(() => {
        const activeDoc = openDocs.find(d => d.id === activeDocId);
        // If the active doc is a closable sub-tab with its own data, use that data
        if (activeDoc?.isClosable && activeDoc?.data) {
            return activeDoc.data;
        }
        return data;
    }, [activeDocId, openDocs, data]);

    // Effective documentId: changes when viewing sub-documents
    const effectiveDocumentId = useMemo(() => {
        const activeDoc = openDocs.find(d => d.id === activeDocId);
        if (activeDoc?.isClosable) return activeDoc.id;
        return documentId;
    }, [activeDocId, openDocs, documentId]);

    const effectiveConfig = useMemo(() => getDocumentConfig(effectiveDocType, effectiveTradeMode as any), [effectiveDocType, effectiveTradeMode]);

    // Get user preferences (would normally come from settings context)
    const useArabicNumerals = false; // سيتم ربطها بإعدادات المستخدم

    // Refs
    const contentRef = useRef<HTMLDivElement>(null);

    // Update data when props change — MERGE to preserve fetched items & posting state
    useEffect(() => {
        if (initialData) {
            setData((prev: any) => {
                // ═══ If the document ID changed, do a FULL REPLACE (not merge) ═══
                // This prevents data from one party leaking into another
                const currentPrimaryId = documentId || initialData?.id;
                if (prev?.id && currentPrimaryId && prev.id !== currentPrimaryId) {
                    console.log('[Data Sync] Document changed — full replace');
                    return initialData;
                }

                // ═══ Guard: If we already saved (prev has id) but parent still sends
                // create-mode skeleton (initialData has no id), skip the merge entirely.
                // This prevents stale parent props from overwriting locally-saved data.
                if (prev?.id && !initialData?.id) {
                    return prev;
                }

                // If prev has items from DB fetch, keep them
                const mergedItems = prev?.items?.length > 0 ? prev.items : initialData.items;

                // Preserve critical posting fields that may have been set locally
                // (e.g., after journal entry creation) and not yet reflected in parent data
                const preservePostingState: Record<string, any> = {};
                if (prev?.journal_entry_id && !initialData.journal_entry_id) {
                    preservePostingState.journal_entry_id = prev.journal_entry_id;
                }
                if (prev?.is_posted && !initialData.is_posted) {
                    preservePostingState.is_posted = prev.is_posted;
                    preservePostingState.posted_at = prev.posted_at;
                }
                if (prev?.stage === 'posted' && initialData.stage !== 'posted') {
                    preservePostingState.stage = 'posted';
                }
                // Preserve advanced stage (confirmed/received) if parent data has a lower stage
                const stageOrder = ['', 'draft', 'confirmed', 'received', 'posted'];
                const prevStageIdx = stageOrder.indexOf(prev?.stage || '');
                const initStageIdx = stageOrder.indexOf(initialData.stage || '');
                if (prevStageIdx > 0 && initStageIdx >= 0 && prevStageIdx > initStageIdx) {
                    preservePostingState.stage = prev.stage;
                    if (prev?.status) preservePostingState.status = prev.status;
                }

                // Preserve calculated financial fields if parent data doesn't include them
                // (PurchaseCycleList query doesn't fetch subtotal/tax_amount/etc)
                const preserveFinancials: Record<string, any> = {};
                const financialFields = ['subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'grand_total'];
                for (const field of financialFields) {
                    if (prev?.[field] != null && prev[field] !== 0 && (initialData[field] == null || initialData[field] === undefined)) {
                        preserveFinancials[field] = prev[field];
                    }
                }

                return {
                    ...initialData,
                    ...(mergedItems ? { items: mergedItems } : {}),
                    ...preserveFinancials,
                    ...preservePostingState,
                };
            });
        }
    }, [initialData]);

    // ═══ Auto-fetch Account Stats (total_debit, total_credit, transaction_count) ═══
    // يجلب الإحصائيات الحقيقية للحساب من journal_entry_lines عند فتح الشيت
    useEffect(() => {
        if (docType !== 'account') return;
        const accountId = initialData?.id || documentId;
        if (!accountId) return;

        const fetchAccountStats = async () => {
            try {
                // 1) جلب عملة الحساب من chart_of_accounts (الحقل اسمه currency وليس currency_code)
                const { data: acctRow } = await supabase
                    .from('chart_of_accounts')
                    .select('currency, company_id')
                    .eq('id', accountId)
                    .single();

                // 2) Fallback: عملة الشركة الأساسية (الحقل default_currency في جدول companies)
                let currencyCode = acctRow?.currency || '';
                if (!currencyCode && acctRow?.company_id) {
                    const { data: companyRow } = await supabase
                        .from('companies')
                        .select('default_currency')
                        .eq('id', acctRow.company_id)
                        .single();
                    currencyCode = companyRow?.default_currency || '';
                }

                // 3) جلب سطور القيود (مع العملة لتحويل متعدد العملات)
                const { data: lines, error } = await supabase
                    .from('journal_entry_lines')
                    .select(`
                        debit,
                        credit,
                        currency,
                        journal_entries (
                            entry_date,
                            status,
                            currency
                        )
                    `)
                    .eq('account_id', accountId);

                if (error || !lines) return;

                // فلترة المرحّلة فقط — استثناء cancelled و voided
                const postedLines = lines.filter((l: any) => {
                    const status = l.journal_entries?.status;
                    return status === 'posted';
                });

                // جلب أسعار الصرف من DB لتحويل العملات المختلفة
                let ratesMap: Record<string, number> = {};
                if (currencyCode) {
                    const compId = acctRow?.company_id || initialData?.company_id;
                    if (compId) {
                        const { data: rates } = await supabase
                            .from('exchange_rates')
                            .select('from_currency, to_currency, buy_rate')
                            .eq('company_id', compId)
                            .eq('is_active', true)
                            .order('effective_from', { ascending: false });
                        if (rates) {
                            // Build latest rate map (first occurrence = latest due to descending order)
                            for (const r of rates) {
                                const key = `${r.from_currency}-${r.to_currency}`;
                                if (!ratesMap[key]) ratesMap[key] = r.buy_rate;
                            }
                        }
                    }
                }

                // Helper to get exchange rate between two currencies
                const getRate = (from: string, to: string): number => {
                    if (from === to) return 1;
                    const directKey = `${from}-${to}`;
                    if (ratesMap[directKey]) return ratesMap[directKey];
                    // Try inverse
                    const inverseKey = `${to}-${from}`;
                    if (ratesMap[inverseKey]) return 1 / ratesMap[inverseKey];
                    // Try pivot through common currencies
                    for (const pivot of ['USD', 'EUR', 'UAH', 'SAR']) {
                        const fromToPivot = ratesMap[`${from}-${pivot}`] || (ratesMap[`${pivot}-${from}`] ? 1 / ratesMap[`${pivot}-${from}`] : 0);
                        const pivotToTarget = ratesMap[`${pivot}-${to}`] || (ratesMap[`${to}-${pivot}`] ? 1 / ratesMap[`${to}-${pivot}`] : 0);
                        if (fromToPivot > 0 && pivotToTarget > 0) {
                            return fromToPivot * pivotToTarget;
                        }
                    }
                    return 1; // Fallback
                };

                let totalDebit = 0;
                let totalCredit = 0;
                let transactionCount = postedLines.length;

                for (const l of postedLines as any[]) {
                    const lineCurrency = l.currency || l.journal_entries?.currency || currencyCode;
                    const debit = l.debit || 0;
                    const credit = l.credit || 0;

                    if (lineCurrency === currencyCode || !currencyCode) {
                        totalDebit += debit;
                        totalCredit += credit;
                    } else {
                        const rate = getRate(lineCurrency, currencyCode);
                        totalDebit += debit * rate;
                        totalCredit += credit * rate;
                    }
                }

                // الرصيد الصحيح = افتتاحي + مدين - دائن (بعد التحويل)
                const openingBalance = initialData?.opening_balance || 0;
                const correctBalance = openingBalance + totalDebit - totalCredit;

                // آخر تاريخ حركة مرحّلة
                const dates = postedLines
                    .map((l: any) => l.journal_entries?.entry_date)
                    .filter(Boolean)
                    .sort()
                    .reverse();
                const lastActivity = dates[0] || null;

                setData((prev: any) => {
                    // لا تستبدل العملة إذا كانت القيمة الجديدة فارغة
                    const finalCurrency = currencyCode || prev?.currency || '';
                    return {
                        ...prev,
                        total_debit: Math.round(totalDebit * 100) / 100,
                        total_credit: Math.round(totalCredit * 100) / 100,
                        transaction_count: transactionCount,
                        last_activity: lastActivity,
                        current_balance: Math.round(correctBalance * 100) / 100,
                        currency: finalCurrency,
                    };
                });
            } catch (err) {
                console.error('[Account Stats] fetch error:', err);
            }
        };

        fetchAccountStats();
    }, [docType, initialData?.id, documentId]);

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
                    transfer: {
                        trade_invoice: 'stock_transfer',
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
                    // ═══ Receipt/Delivery tracking — CRITICAL for sync ═══
                    received_qty: Number(dbItem.received_qty) || 0,
                    delivered_qty: Number(dbItem.delivered_qty) || 0,
                    delivery_rolls: dbItem.delivery_rolls || [],
                    // Warehouse info
                    warehouse_id: dbItem.warehouse_id || '',
                    warehouse_name_ar: dbItem.warehouse_name_ar || '',
                    warehouse_name_en: dbItem.warehouse_name_en || '',
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

    // When MDI active document changes, switch to that document's saved tab
    useEffect(() => {
        const activeDoc = openDocs.find(d => d.id === activeDocId);
        if (activeDoc?.isClosable) {
            // Sub-document: use its saved tab or the effective config default
            const docConfig = getDocumentConfig(activeDoc.type, (activeDoc.tradeMode || tradeMode || 'sales') as any);
            setActiveTab(activeDoc.lastActiveTab || docConfig.defaultTab);
        }
    }, [activeDocId]);

    // hasChanges is set ONLY when the user actually modifies data (via handleChange)
    // We use a ref to skip the very first onChange that fires from initializing empty rows
    const skipInitialOnChangeRef = useRef(false);
    useEffect(() => {
        if (mode === 'create' || mode === 'edit') {
            setHasChanges(false); // start clean — user must actually type something
            skipInitialOnChangeRef.current = true; // skip next onChange (empty rows init)
        }
    }, [mode]);

    // Handle mode change
    const handleModeChange = useCallback((newMode: SheetMode) => {
        setMode(newMode);
        if (newMode === 'edit') {
            // Don't mark dirty immediately — wait for first real user change
            // (skipInitialOnChangeRef is already set by the mode useEffect)
            // ═══ Reset to appropriate tab when entering edit mode ═══
            const editDefaultTab = config.tabs.find(t => t.showInModes?.includes('edit'))?.id || defaultTab || config.defaultTab;
            setActiveTab(editDefaultTab);
        }
        onModeChange?.(newMode);
    }, [onModeChange, defaultTab, config.defaultTab, config.tabs]);


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
    const handleActionRaw = useSheetActionHandler({
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

    // ═══ Auto-log document events (confirm, post, print, etc.) ═══
    const handleAction = useDocumentActivityLogger({
        documentId, docType, tradeMode, data, mode,
        handleAction: handleActionRaw,
    });

    // ═══ Fetch attachment count for badge ═══
    useEffect(() => {
        const entityId = data?.id || documentId;
        if (!entityId || mode === 'create') {
            setAttachmentCount(0);
            return;
        }
        // If child (DocumentAttachmentsTab) reported count via onChange, use it directly
        if (typeof data?.attachments_count === 'number') {
            setAttachmentCount(data.attachments_count);
            return;
        }
        // Otherwise fetch from DB
        const hasAttachmentsTab = config.tabs.some(t => t.id === 'attachments');
        if (!hasAttachmentsTab) return;

        const entityType = resolveEntityType(docType, tradeMode);
        attachmentService.getEntityAttachmentCount(entityType, entityId)
            .then(count => setAttachmentCount(count))
            .catch(() => setAttachmentCount(0));
    }, [data?.id, data?.attachments_count, documentId, docType, tradeMode, mode, config.tabs]);

    // ═══ Sync activity count from child component ═══
    useEffect(() => {
        if (typeof data?.activity_count === 'number') {
            setActivityCount(data.activity_count);
        }
    }, [data?.activity_count]);

    // Filter tabs based on props, mode, and current stage
    const visibleTabs = useMemo(() => {
        let tabs = [...effectiveConfig.tabs];

        // ═══ Filter by current mode (view/edit/create) ═══
        tabs = tabs.filter(tab => {
            if (!tab.showInModes) return true; // No restriction → always show
            return tab.showInModes.includes(mode);
        });

        // ═══ Auto-inject activity tab if not present ═══
        if (!tabs.some(t => t.id === 'activity')) {
            const activityTab = {
                id: 'activity' as const,
                labelKey: 'accounting.tabs.activity',
                icon: 'Clock',
                component: 'ActivityTab',
            };
            // Insert before the last tab (usually stageHistory) for consistent positioning
            const insertIndex = Math.max(tabs.length - 1, 0);
            tabs.splice(insertIndex, 0, activityTab);
        }

        if (allowedTabs && allowedTabs.length > 0) {
            tabs = tabs.filter(tab => allowedTabs.includes(tab.id));
        }

        if (hiddenTabs && hiddenTabs.length > 0) {
            tabs = tabs.filter(tab => !hiddenTabs.includes(tab.id));
        }

        // Stage-based visibility filtering
        if (currentStage) {
            tabs = tabs.filter(tab => {
                if (!tab.visibleInStages) return true;
                return tab.visibleInStages.includes(currentStage);
            });
        }

        // ═══ Dynamic badges for attachments & activity tabs ═══
        tabs = tabs.map(tab => {
            if (tab.id === 'attachments') {
                return { ...tab, badge: attachmentCount > 0 ? String(attachmentCount) : undefined };
            }
            if (tab.id === 'activity') {
                return { ...tab, badge: activityCount > 0 ? String(activityCount) : undefined };
            }
            // ═══ Variance badge on receipt_summary tab ═══
            if (tab.id === 'receipt_summary' && data?.variance_status === 'pending_review') {
                return { ...tab, badge: '⚠️' };
            }
            return tab;
        });

        return tabs;
    }, [effectiveConfig.tabs, allowedTabs, hiddenTabs, currentStage, attachmentCount, activityCount, data?.variance_status, mode]);

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

    // Activity events are now fetched from audit_logs inside ActivityTab

    // ═══ Lazy-loaded Tab Content Renderer (extracted to reduce file size) ═══
    const renderTabContent = useTabContentRenderer({
        data: effectiveData, mode, docType: effectiveDocType, tradeMode: effectiveTradeMode as any, loading,
        companyId: resolvedCompanyId, documentId: effectiveDocumentId, currentStage, options,
        useArabicNumerals,
        setData, setHasChanges, onClose, onRefresh,
        openDocs, setOpenDocs, setActiveDocId,
        activeTab,
        stats: config.stats,
        onDisplayCurrencyChange: setDisplayCurrency,
        skipInitialOnChangeRef,
    });

    // ═══ Close with Unsaved Changes Guard ═══
    const handleCloseAttempt = useCallback(() => {
        // Auto-saved trade documents: skip dialog — changes are already persisted
        // Even on first create before auto-save runs, nothing critical is lost
        if (isTradeDocType) {
            setHasChanges(false);
            onClose();
            return;
        }
        // Only guard if there are unsaved changes and we're in edit/create mode
        const isEditing = mode === 'edit' || mode === 'create';
        if (isEditing && hasChanges) {
            setShowUnsavedGuard(true);
            return;
        }
        onClose();
    }, [mode, hasChanges, onClose, isTradeDocType]);

    const handleDiscardAndClose = useCallback(() => {
        setShowUnsavedGuard(false);
        setHasChanges(false);
        onClose();
    }, [onClose]);

    const handleSaveAsDraft = useCallback(async () => {
        setShowUnsavedGuard(false);
        try {
            if (isAccountingDocType) {
                await handleAction('save');
            } else if (isTradeDocType) {
                await handleAction('save');
            }
            toast.success(
                language === 'ar' ? '✅ تم الحفظ كمسودة' : '✅ Saved as draft'
            );
            onClose();
        } catch (err) {
            toast.error(
                language === 'ar' ? '❌ فشل الحفظ' : '❌ Save failed'
            );
        }
    }, [isAccountingDocType, isTradeDocType, handleAction, language, onClose]);

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(open) => !open && handleCloseAttempt()}>
                <SheetContent
                    className={cn(
                        docType === 'materialGroup'
                            ? "!w-[38vw] !max-w-[38vw] p-0 flex flex-col h-full"
                            : "!w-[70vw] !max-w-[70vw] p-0 flex flex-col h-full",
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
                                                            const isTransfer = tradeMode === 'transfer';
                                                            const stageTitle: Record<string, { ar: string; en: string }> = {
                                                                draft: {
                                                                    ar: isTransfer ? 'مسودة مناقلة' : isSales ? 'مسودة مبيعات' : 'مسودة مشتريات',
                                                                    en: isTransfer ? 'Transfer Draft' : isSales ? 'Sales Draft' : 'Purchase Draft'
                                                                },
                                                                confirmed: {
                                                                    ar: isTransfer ? 'مناقلة مؤكدة' : isSales ? 'فاتورة مبيعات مؤكدة' : 'فاتورة مشتريات مؤكدة',
                                                                    en: isTransfer ? 'Confirmed Transfer' : isSales ? 'Confirmed Sales Invoice' : 'Confirmed Purchase Invoice'
                                                                },
                                                                posted: {
                                                                    ar: isTransfer ? 'مناقلة مرحّلة' : isSales ? 'فاتورة مبيعات مرحّلة' : 'فاتورة مشتريات مرحّلة',
                                                                    en: isTransfer ? 'Posted Transfer' : isSales ? 'Posted Sales Invoice' : 'Posted Purchase Invoice'
                                                                },
                                                                in_delivery: { ar: 'فاتورة مبيعات — قيد التسليم', en: 'Sales Invoice — In Delivery' },
                                                                sent_to_branch: { ar: 'فاتورة مبيعات — أُرسلت للفرع', en: 'Sales Invoice — Sent to Branch' },
                                                                delivered: { ar: 'فاتورة مبيعات — تم التسليم', en: 'Sales Invoice — Delivered' },
                                                                in_receiving: { ar: 'فاتورة مشتريات — قيد الاستلام', en: 'Purchase Invoice — In Receiving' },
                                                                partially_received: { ar: 'فاتورة مشتريات — مستلم جزئياً', en: 'Purchase Invoice — Partially Received' },
                                                                received: { ar: isSales ? 'تم التسليم' : 'تم الاستلام', en: isSales ? 'Delivered' : 'Received' },
                                                                fully_received: { ar: 'تم الاستلام بالكامل', en: 'Fully Received' },
                                                                completed: {
                                                                    ar: isTransfer ? 'مناقلة مكتملة' : 'فاتورة مكتملة',
                                                                    en: isTransfer ? 'Completed Transfer' : 'Completed Invoice'
                                                                },
                                                                requested: { ar: isSales ? 'طلب بيع' : 'طلب شراء', en: isSales ? 'Sales Request' : 'Purchase Request' },
                                                                quoted: { ar: isSales ? 'عرض سعر مبيعات' : 'عرض سعر شراء', en: isSales ? 'Sales Quotation' : 'Purchase Quotation' },
                                                                ordered: { ar: isSales ? 'أمر بيع' : 'أمر شراء', en: isSales ? 'Sales Order' : 'Purchase Order' },
                                                                invoiced: { ar: isSales ? 'فاتورة مبيعات' : 'فاتورة مشتريات', en: isSales ? 'Sales Invoice' : 'Purchase Invoice' },
                                                                partially_paid: { ar: 'مدفوعة جزئياً', en: 'Partially Paid' },
                                                                partial_paid: { ar: 'مدفوعة جزئياً', en: 'Partially Paid' },
                                                                paid: { ar: 'مدفوعة بالكامل', en: 'Fully Paid' },
                                                                cancelled: { ar: 'ملغاة', en: 'Cancelled' },
                                                                closed: { ar: 'مغلقة', en: 'Closed' },
                                                            };
                                                            const title = stageTitle[stage || 'draft'] || stageTitle.draft;
                                                            return language === 'ar' ? title.ar : title.en;
                                                        })()
                                                    ) : (
                                                        // عنوان ذكي لأنواع المستندات المحاسبية
                                                        (() => {
                                                            if (isAccountingDocType) {
                                                                const accountingTitles: Record<string, { ar: string; en: string }> = {
                                                                    journal:    { ar: 'قيد يومية', en: 'Journal Entry' },
                                                                    cash:       { ar: 'يومية الصندوق', en: 'Cash Journal' },
                                                                    receipt:    { ar: 'سند قبض', en: 'Receipt Voucher' },
                                                                    payment:    { ar: 'سند صرف', en: 'Payment Voucher' },
                                                                    transfer:   { ar: 'تحويل بنكي', en: 'Bank Transfer' },
                                                                    exchange:   { ar: 'صرف عملة', en: 'Currency Exchange' },
                                                                    debit_note: { ar: 'مذكرة مدين', en: 'Debit Note' },
                                                                    credit_note:{ ar: 'مذكرة دائن', en: 'Credit Note' },
                                                                };
                                                                const docTitle = accountingTitles[docType];
                                                                if (docTitle) return language === 'ar' ? docTitle.ar : docTitle.en;
                                                            }
                                                            return (language === 'ar'
                                                                ? (data?.nameAr || data?.name_ar || data?.name)
                                                                : (data?.name_en || data?.name)) || t(config.titleKey);
                                                        })()

                                                    )}
                                                </h2>

                                                {/* Status — Stage-based badge for trade docs, simple badge for others */}
                                                {isTradeDocType && data?.id ? (() => {
                                                    const stageCode = data?.stage || data?.status || 'draft';
                                                    const stageStyles: Record<string, string> = {
                                                        draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                                                        confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                                                        partially_received: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                                                        in_receiving: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
                                                        in_delivery: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
                                                        received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                                                        fully_received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                                        completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                                        posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                                        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                                                        paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                                        partial_paid: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                                                        partially_paid: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                                                        // 🔒 Closed
                                                        closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 border-slate-400',
                                                    };
                                                    const stageLabels: Record<string, { ar: string; en: string }> = {
                                                        draft: { ar: 'مسودة', en: 'Draft' },
                                                        confirmed: { ar: 'مؤكد', en: 'Confirmed' },
                                                        partially_received: { ar: 'مستلم جزئياً', en: 'Partially Received' },
                                                        in_receiving: { ar: 'جاري الاستلام', en: 'In Receiving' },
                                                        in_delivery: { ar: 'قيد التسليم', en: 'In Delivery' },
                                                        received: { ar: 'مستلم', en: 'Received' },
                                                        fully_received: { ar: 'مستلم بالكامل', en: 'Fully Received' },
                                                        completed: { ar: 'مكتمل', en: 'Completed' },
                                                        posted: { ar: 'مرحّل', en: 'Posted' },
                                                        cancelled: { ar: 'ملغى', en: 'Cancelled' },
                                                        paid: { ar: 'مدفوع', en: 'Paid' },
                                                        partial_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
                                                        partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
                                                        invoiced: { ar: 'مفوتر', en: 'Invoiced' },
                                                        // 🔒 Closed
                                                        closed: { ar: '🔒 مغلق — مرجعية', en: '🔒 Closed — Reference' },
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
                                                {(data?.invoice_no || data?.invoice_number || data?.order_number || data?.transfer_number) ? (
                                                    <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                                        {data.invoice_no || data.invoice_number || data.order_number || data.transfer_number}
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
                                                                {data.currency ? t(`currencies.${data.currency.toUpperCase()}`) : ''}
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
                                            displayNumber={data?.invoice_no || data?.invoice_number || data?.order_number || data?.quotation_number || data?.receipt_number || data?.transfer_number || data?.code || data?.entry_number || (isTradeDocType ? (language === 'ar' ? 'مسودة' : 'Draft') : '')}
                                            amount={isTradeDocType
                                                ? Number(data?.grand_total || data?.total_amount || 0)
                                                : (data?.grand_total ?? data?.total_amount ?? data?.current_balance ?? data?.balance ?? data?.total)
                                            }
                                            currency={data?.currency || ''}
                                            displayCurrency={displayCurrency !== 'all' ? displayCurrency : undefined}
                                            // Mode
                                            onModeChange={handleModeChange}
                                            onCancelEdit={() => {
                                                setData(initialData);
                                                setHasChanges(false);
                                            }}
                                            hasChanges={hasChanges}
                                            // Confirmation
                                            showConfirmAction={isTradeDocType && docType !== 'trade_container'}
                                            confirmationStatus={data?.confirmation_status}
                                            tradeMode={tradeMode as 'sales' | 'purchase'}
                                            isAccountingDocType={isAccountingDocType}
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
                                        onClick={handleCloseAttempt}
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

                        {/* Main Document Tabs — always visible to enable multi-document MDI */}
                        <MainDocumentTabs
                            documents={openDocs.length > 0 ? openDocs : [{
                                id: documentId || data?.id || 'primary',
                                type: docType,
                                title: data?.name || data?.entry_number || data?.name_en || (language === 'ar' ? 'مستند' : 'Document'),
                                titleAr: data?.name_ar || data?.name,
                                code: data?.code || data?.account_code || data?.entry_number,
                                data: data,
                                isClosable: false,
                            }]}
                            activeId={activeDocId || documentId || data?.id || 'primary'}
                            onTabChange={(id) => {
                                if (id === activeDocId) return;

                                // 1. Save current active document's data AND active tab back into openDocs
                                setOpenDocs(prevDocs => {
                                    const updatedDocs = prevDocs.map(d =>
                                        d.id === activeDocId ? { ...d, data: effectiveData, lastActiveTab: activeTab } : d
                                    );

                                    // 2. Find the target document we are switching to
                                    const targetDoc = updatedDocs.find(d => d.id === id);
                                    if (targetDoc) {
                                        // 3. Switch active state asynchronously to avoid render clash
                                        setTimeout(() => {
                                            setActiveDocId(id);
                                            setData(targetDoc.data);
                                            // 4. Update the active tab to the new document's saved tab or default tab
                                            const newConfig = getDocumentConfig(targetDoc.type, (targetDoc.tradeMode || tradeMode || 'sales') as any);
                                            setActiveTab(targetDoc.lastActiveTab || newConfig.defaultTab);
                                            onActiveDocumentChange?.(id);
                                        }, 0);
                                    }
                                    return updatedDocs;
                                });
                            }}
                            onTabClose={(id) => {
                                const remaining = openDocs.filter(d => d.id !== id);
                                setOpenDocs(remaining);

                                if (id === activeDocId && remaining.length > 0) {
                                    // Switch to primary (first) tab
                                    const primary = remaining[0];
                                    console.log('[MDI] onTabClose → restoring primary. lastActiveTab:', primary.lastActiveTab);
                                    setActiveDocId(primary.id);
                                    setData(primary.data);
                                    const newConfig = getDocumentConfig(primary.type, (primary.tradeMode || tradeMode || 'sales') as any);
                                    // Restore the saved tab (e.g. 'ledger') instead of default ('overview')
                                    setActiveTab(primary.lastActiveTab || newConfig.defaultTab);
                                }
                                onCloseDocument?.(id);
                            }}
                            onAddTab={onOpenDocument ? () => onOpenDocument({
                                id: 'new-' + Date.now(),
                                type: docType,
                                title: language === 'ar' ? 'مستند جديد' : 'New Document',
                                data: null,
                                isClosable: true,
                            }) : undefined}
                        />

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
                                    onTabChange={(tab) => {
                                        setActiveTab(tab);
                                        // Also save this tab as the document's lastActiveTab so MDI restore works
                                        setOpenDocs(prev => prev.map(d =>
                                            d.id === activeDocId ? { ...d, lastActiveTab: tab } : d
                                        ));
                                    }}
                                    mode={mode}
                                    variant="default"
                                >
                                    {/* ✅ plain divs — لا Radix TabsContent — حالة المكوّنات محفوظة دائماً
                                         JournalVoucherTab لا تُلغى عند التنقل بين التبويبات */}
                                    <div className="flex-1 h-full overflow-hidden relative">
                                        {visibleTabs.map((tab) => {
                                            const isActive = activeTab === tab.id;
                                            const isEntryType = ['entry', 'form'].includes(tab.id);
                                            // التبويبات الثقيلة: lazy — لا تُحمَّل إلا عند الطلب الأول
                                            const isLazy = ['activity', 'attachments', 'ledger', 'ledger_account'].includes(tab.id);
                                            if (isLazy && !isActive) return null;

                                            return (
                                                <div
                                                    key={tab.id}
                                                    role="tabpanel"
                                                    aria-labelledby={`tab-${tab.id}`}
                                                    className={cn(
                                                        'absolute inset-0 flex flex-col',
                                                        isActive ? 'z-10' : 'z-0 pointer-events-none'
                                                    )}
                                                    style={{ visibility: isActive ? 'visible' : 'hidden' }}
                                                >
                                                    {/* entry/form: بلا ScrollArea (تدير scroll داخلياً) */}
                                                    {/* باقي التبويبات: ScrollArea مع padding */}
                                                    {isEntryType ? (
                                                        <div className="flex-1 h-full overflow-hidden">
                                                            {renderTabContent(tab.id)}
                                                        </div>
                                                    ) : (
                                                        <ScrollArea className="flex-1 h-full">
                                                            <div className="p-4">
                                                                {renderTabContent(tab.id)}
                                                            </div>
                                                        </ScrollArea>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
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

                    const { data: { session } } = await supabase.auth.getSession();
                    const user = session?.user;
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

                    const { data: { session } } = await supabase.auth.getSession();
                    const user = session?.user;
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

            {/* ═══ Unsaved Changes Guard Dialog ═══ */}
            <AlertDialog open={showUnsavedGuard} onOpenChange={setShowUnsavedGuard}>
                <AlertDialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-base font-bold font-tajawal">
                                    {language === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved Changes'}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {language === 'ar'
                                        ? 'لديك تغييرات لم يتم حفظها. ماذا تريد أن تفعل؟'
                                        : 'You have unsaved changes. What would you like to do?'}
                                </AlertDialogDescription>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2 sm:gap-2 mt-4">
                        {/* Discard */}
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDiscardAndClose}
                            className="gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'تجاهل والخروج' : 'Discard & Close'}
                        </Button>

                        {/* Save as Draft */}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveAsDraft}
                            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}
                        </Button>

                        {/* Cancel (stay) */}
                        <AlertDialogCancel className="gap-1.5 mt-0">
                            <X className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default UnifiedAccountingSheet;
