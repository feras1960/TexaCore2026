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
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Sheet, SheetContent, SheetHeader as UiSheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import components
import { SheetHeader } from './components/SheetHeader';
import { EnhancedActionToolbar, ActionToolbar } from './components/ActionToolbar';
import { SheetTabs, TabContentWrapper } from './components/SheetTabs';
import { MainDocumentTabs } from './components/MainDocumentTabs';

// Import tabs
import { OverviewTab } from './tabs/OverviewTab';
import { LedgerTab } from './tabs/LedgerTab';
import { ActivityTab } from './tabs/ActivityTab';
// Warehouse Tabs
import { WarehouseOverviewTab } from './tabs/WarehouseOverviewTab';
import { WarehouseItemsTab } from './tabs/WarehouseItemsTab';
import { WarehouseStocktakesTab } from './tabs/WarehouseStocktakesTab';
// Material Tabs
import {
    MaterialOverviewTab,
    MaterialInventoryTab,
    MaterialMovementsTab,
    MaterialPricingTab,
    MaterialSalesTab,
    MaterialPurchasesTab,
    MaterialAnalyticsTab,
    MaterialVariantsTab,
    MaterialRollsTab,
    MaterialBasicInfoTab,
    MaterialSpecsTab,
    MaterialImagesTab,
    MaterialAdditionalInfoTab,
    MaterialGroupInfoTab,
} from './tabs';
import { TradeMainTab } from './tabs/TradeMainTab';
import { TradeShippingTab } from './tabs/TradeShippingTab';
import { MaterialBrowserTab } from '@/features/trade/components/tabs/MaterialBrowserTab';
import { PaymentReceiptTab } from '@/features/trade/components/tabs/PaymentReceiptTab';
import { CustomerShippingTab } from '@/features/trade/components/tabs/CustomerShippingTab';
import { NexaAgentTab } from '@/features/trade/components/tabs/NexaAgentTab';
import { SupplierInfoTab } from '@/features/trade/components/tabs/SupplierInfoTab';
import { PurchasePaymentTab } from '@/features/trade/components/tabs/PurchasePaymentTab';
import { ShipmentItemsTab } from '@/features/trade/components/tabs/ShipmentItemsTab';
import { DocumentAttachmentsTab } from '@/features/trade/components/tabs/DocumentAttachmentsTab';
import { ContainerExpensesTab } from './tabs/ContainerExpensesTab';
// Confirmation Workflow
import { ConfirmationDialog } from '@/features/trade/components/ConfirmationDialog';
import { confirmationService, type ValidationResult, type WorkflowSettings, type DocType as ConfDocType } from '@/services/confirmationService';
import { supabase } from '@/lib/supabase';
// Accounting Entry Tabs (Phase 1 - Unified)
import { AccountingEntryTab } from './tabs/AccountingEntryTab';
// CRM Contact Tabs
import { ContactOverviewTab } from './tabs/ContactOverviewTab';
import { ContactInteractionsTab } from './tabs/ContactInteractionsTab';
import { ContactCallsTab } from './tabs/ContactCallsTab';
import { ContactNotesTab } from './tabs/ContactNotesTab';

// Import configs
import { getDocumentConfig } from './configs/documentConfigs';

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
}: ExtendedSheetProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';

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
        ['trade_order', 'trade_invoice', 'trade_quotation', 'trade_reservation', 'trade_delivery', 'trade_request'].includes(docType),
        [docType]
    );

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

    // Update data when props change
    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

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

    // ═══ Built-in Accounting Save Handler (Polymorphic Save Pattern) ═══
    const isAccountingDocType = ['journal', 'cash', 'receipt', 'payment', 'transfer', 'exchange', 'debit_note', 'credit_note'].includes(docType);

    const handleAccountingSave = useCallback(async (saveData: any) => {
        if (!isAccountingDocType) return;
        if (!saveData) {
            toast.error(t('accounting.errors.saveFailed') || 'فشل الحفظ');
            return;
        }

        // Dynamic import to avoid circular deps
        const { journalEntriesService } = await import('@/services/journalEntriesService');

        // Get company ID from the data or from component context
        const saveCompanyId = saveData.company_id || resolvedCompanyId;
        if (!saveCompanyId) {
            toast.error(t('errors.companyRequired') || 'يجب تحديد الشركة');
            return;
        }

        // --- Prepare lines ---
        let finalLines = (saveData.lines || []).filter((line: any) =>
            line.account_id && (Number(line.debit) > 0 || Number(line.credit) > 0)
        );

        // --- Auto-Balance for Receipt/Payment ---
        const entryType = saveData.entry_type || docType;
        if ((entryType === 'receipt' || entryType === 'payment') && saveData.header_account_id) {
            const lineTotal = finalLines.reduce((sum: number, line: any) => {
                return sum + (entryType === 'receipt'
                    ? (Number(line.credit) || 0)
                    : (Number(line.debit) || 0));
            }, 0);

            if (lineTotal > 0) {
                // Add the balancing header account line
                finalLines.push({
                    account_id: saveData.header_account_id,
                    description: saveData.description || (entryType === 'receipt' ? 'سند قبض' : 'سند صرف'),
                    debit: entryType === 'receipt' ? lineTotal : 0,   // Receipt: fund is DEBIT
                    credit: entryType === 'payment' ? lineTotal : 0,  // Payment: fund is CREDIT
                    cost_center_id: null,
                });
            }
        }

        // --- Validation ---
        if (finalLines.length < 2) {
            toast.error(t('accounting.errors.saveFailed') || 'فشل الحفظ', {
                description: t('accounting.errors.minLinesRequired') || 'يجب إدخال بندين على الأقل',
            });
            return;
        }

        const totalDebit = finalLines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
        const totalCredit = finalLines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            toast.error(t('accounting.errors.notBalanced') || 'القيد غير متوازن!', {
                description: `${t('accounting.debit') || 'مدين'}: ${totalDebit.toFixed(2)} ≠ ${t('accounting.credit') || 'دائن'}: ${totalCredit.toFixed(2)}`,
            });
            return;
        }

        // --- Build entry data ---
        const entryInput = {
            company_id: saveCompanyId,
            entry_date: saveData.entry_date || new Date().toISOString().split('T')[0],
            description: saveData.description || '',
            entry_type: entryType,
            lines: finalLines.map((line: any) => ({
                account_id: line.account_id,
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                description: line.description || '',
                cost_center_id: line.cost_center_id || null,
            })),
        };

        // --- Create or Update ---
        const entryId = saveData.id || documentId;
        if (mode === 'edit' && entryId) {
            await journalEntriesService.update(entryId, entryInput);
        } else {
            await journalEntriesService.create(entryInput);
        }
    }, [isAccountingDocType, docType, companyId, documentId, mode, t]);

    // ═══ Built-in Trade Save Handler ═══
    const handleTradeSave = useCallback(async (saveData: any) => {
        if (!isTradeDocType || !saveData) return;

        const { TradeService } = await import('@/features/trade/services/TradeService');

        // Map unified docType + tradeMode → TradeService type key
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
                trade_order: 'purchase_invoice', // fallback — purchase orders go via invoice table for now
                trade_quotation: 'purchase_invoice',
                trade_request: 'purchase_invoice',
            },
        };

        const modeKey = tradeMode || 'sales';
        const serviceDocType = tradeTypeMap[modeKey]?.[docType] || 'invoice';

        const docId = saveData.id || documentId;
        const saveCompanyId = saveData.company_id || resolvedCompanyId;
        if (!saveCompanyId) {
            toast.error(t('errors.companyRequired') || 'يجب تحديد الشركة');
            return;
        }

        // ─── Build document payload ───
        const docPayload: Record<string, any> = {
            party_id: saveData.party_id || saveData.customer_id || saveData.supplier_id,
            warehouse_id: saveData.warehouse_id,
            date: saveData.date || saveData.invoice_date || saveData.order_date || new Date().toISOString(),
            currency: saveData.currency || '',
            exchange_rate: saveData.exchange_rate || 1,
            notes: saveData.notes,
            subtotal: Number(saveData.subtotal || 0),
            grand_total: Number(saveData.grand_total || saveData.total_amount || 0),
            tax_total: Number(saveData.tax_amount || saveData.tax_total || 0),
            items: saveData.items || [],
        };

        // ─── Purchase-specific fields ───
        if (modeKey === 'purchase') {
            docPayload.supplier_invoice_number = saveData.supplier_invoice_number;
            docPayload.supplier_invoice_date = saveData.supplier_invoice_date;
            docPayload.payment_terms = saveData.payment_terms;
            docPayload.due_date = saveData.due_date;
            docPayload.supplier_notes = saveData.supplier_notes;
        }

        // ─── Expenses & Attachments (included in payload for both create & update) ───
        if (saveData.expenses) {
            docPayload.expenses = saveData.expenses;
            docPayload.expenses_total = saveData.expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        }
        if (saveData.attachments) {
            docPayload.attachments = saveData.attachments;
        }

        // ─── Create or Update ───
        if (mode === 'create' || !docId) {
            const result = await TradeService.createTradeDocument(docPayload, serviceDocType, docPayload.currency);
            // Update local data with the created document (for subsequent saves/edits)
            setData((prev: any) => ({ ...prev, ...result, id: result.id }));
            // Switch to edit mode so further saves become updates
            setMode('edit');
        } else {
            // ─── Update existing document ───
            await TradeService.updateTradeDocument(docId, docPayload, serviceDocType);

            // Also update extra fields directly (purchase-specific + JSONB)
            const { supabase } = await import('@/lib/supabase');
            const tableMapping: Record<string, string> = {
                invoice: 'sales_invoices',
                order: 'sales_orders',
                quotation: 'quotations',
                delivery: 'sales_deliveries',
                reservation: 'transit_reservations',
                purchase_invoice: 'purchase_invoices',
            };
            const tableName = tableMapping[serviceDocType];
            if (tableName) {
                const extraUpdates: Record<string, any> = {};

                // Purchase-specific columns
                if (modeKey === 'purchase') {
                    if (saveData.supplier_invoice_number !== undefined) extraUpdates.supplier_invoice_number = saveData.supplier_invoice_number;
                    if (saveData.supplier_invoice_date !== undefined) extraUpdates.supplier_invoice_date = saveData.supplier_invoice_date;
                    if (saveData.payment_terms !== undefined) extraUpdates.payment_terms = saveData.payment_terms;
                    if (saveData.due_date !== undefined) extraUpdates.due_date = saveData.due_date;
                    if (saveData.supplier_notes !== undefined) extraUpdates.supplier_notes = saveData.supplier_notes;
                }

                // Expenses JSONB
                if (saveData.expenses) {
                    extraUpdates.expenses = saveData.expenses;
                    extraUpdates.expenses_total = saveData.expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
                }

                // Attachments JSONB
                if (saveData.attachments) {
                    extraUpdates.attachments = saveData.attachments;
                }

                if (Object.keys(extraUpdates).length > 0) {
                    await supabase
                        .from(tableName)
                        .update(extraUpdates)
                        .eq('id', docId);
                }
            }
        }
    }, [isTradeDocType, docType, tradeMode, resolvedCompanyId, documentId, mode, t]);

    // Check edit permission for journal entries
    const checkEditPermission = useCallback(async (): Promise<boolean> => {
        // Only check for journal entries when edit flow is enabled
        if (!enableEditFlow || docType !== 'journal' || !documentId) {
            return true;
        }

        try {
            // Import supabase dynamically to avoid circular dependencies
            const { supabase } = await import('@/lib/supabase');

            const { data: result, error } = await supabase
                .rpc('can_edit_journal_entry', { p_entry_id: documentId });

            if (error) {
                console.error('Edit permission check failed:', error);
                return true; // Allow edit if check fails
            }

            if (!result?.can_edit) {
                // Permission denied
                const options = result?.options?.map((opt: any) => ({
                    id: opt.id,
                    label: opt.label,
                    recommended: opt.recommended,
                    warning: opt.warning,
                    requires_permission: opt.requires_permission,
                }));

                onEditPermissionDenied?.(result?.message || 'لا يمكن التحرير', options);

                // If linked mode and requires adjustment, notify
                if (result?.mode === 'linked_closed_year') {
                    onAdjustmentRequired?.(documentId);
                }

                return false;
            }

            // If auto_unpost is needed, handle it
            if (result?.auto_unpost && onUnpost) {
                toast.info(t('messages.unpostingEntry') || 'جاري إلغاء الترحيل للتعديل...');
                await onUnpost();
            }

            return true;
        } catch (error) {
            console.error('Edit permission check error:', error);
            return true; // Allow edit if check fails
        }
    }, [enableEditFlow, docType, documentId, onEditPermissionDenied, onAdjustmentRequired, onUnpost, t]);

    // Handle action
    const handleAction = useCallback(async (actionId: string) => {
        try {
            switch (actionId) {
                case 'edit':
                    // Check edit permission first if enabled
                    if (enableEditFlow && docType === 'journal') {
                        const canEdit = await checkEditPermission();
                        if (!canEdit) {
                            return; // Permission denied, don't enter edit mode
                        }
                    }
                    handleModeChange('edit');
                    break;

                case 'save':
                    // Check if the entry has any meaningful data
                    if (isAccountingDocType) {
                        const entryLines = data?.lines || [];
                        const hasData = entryLines.some((line: any) =>
                            line.account_id && (Number(line.debit) > 0 || Number(line.credit) > 0)
                        );
                        if (!hasData) {
                            // Empty entry — do nothing
                            toast.warning(
                                language === 'ar'
                                    ? 'لا يوجد بيانات للحفظ — أدخل بنوداً أولاً'
                                    : 'No data to save — add line items first'
                            );
                            return;
                        }
                    }

                    setLoading(true);
                    if (onSave) {
                        await onSave(data);
                    } else if (isAccountingDocType) {
                        await handleAccountingSave(data);
                    } else if (isTradeDocType) {
                        await handleTradeSave(data);
                    }
                    toast.success(t('messages.savedSuccessfully') || 'تم الحفظ بنجاح');
                    setHasChanges(false);

                    if (mode === 'create' && isAccountingDocType) {
                        // Stay in sheet, reset for new entry
                        setData({});
                        // Trigger re-render with fresh state
                        setTimeout(() => {
                            setData({ type: docType });
                        }, 50);
                    } else if (mode === 'create' && isTradeDocType) {
                        // Trade documents: switch to view mode to allow Confirm action
                        handleModeChange('view');
                    } else if (mode === 'create') {
                        onClose();
                    } else {
                        handleModeChange('view');
                    }
                    break;

                case 'delete':
                    if (onDelete) {
                        const confirmed = window.confirm(t('messages.confirmDelete') || 'هل أنت متأكد من الحذف؟');
                        if (confirmed) {
                            setLoading(true);
                            await onDelete();
                            toast.success(t('messages.deletedSuccessfully') || 'تم الحذف بنجاح');
                            onClose();
                        }
                    }
                    break;

                case 'post':
                    if (onPost) {
                        setLoading(true);
                        await onPost();
                        toast.success(t('messages.postedSuccessfully') || 'تم الترحيل بنجاح');
                        if (documentId) {
                            // Refresh data
                            onRefresh?.();
                        }
                    }
                    break;

                case 'duplicate':
                    if (onDuplicate) {
                        onDuplicate?.();
                    } else if (isTradeDocType && data) {
                        // ═══ Built-in Trade Document Duplication ═══
                        // Copy: customer, items, prices, currency, warehouse
                        // Reset: id, status, dates, confirmation, document_number
                        const duplicatedData = {
                            ...data,
                            id: undefined,
                            document_number: undefined,
                            order_number: undefined,
                            invoice_number: undefined,
                            quotation_number: undefined,
                            delivery_number: undefined,
                            return_number: undefined,
                            reservation_number: undefined,
                            status: 'draft',
                            confirmation_status: undefined,
                            confirmed_at: undefined,
                            confirmed_by: undefined,
                            delivery_note_id: undefined,
                            approval_status: undefined,
                            date: new Date().toISOString(),
                            created_at: undefined,
                            updated_at: undefined,
                            type: data.type || data.subType,
                            subType: data.subType || data.type,
                        };
                        setData(duplicatedData);
                        handleModeChange('create');
                        setHasChanges(true);
                        toast.success(
                            language === 'ar'
                                ? '📋 تم نسخ المستند — عدّل ثم احفظ'
                                : '📋 Document duplicated — edit and save'
                        );
                    } else {
                        toast.info(t('messages.featureComingSoon') || 'قريباً');
                    }
                    break;

                case 'print':
                    onPrint?.();
                    break;

                case 'refresh':
                    onRefresh?.();
                    break;

                case 'convertToCustomer':
                    // CRM: Convert contact to customer — handled by parent via onSave with special flag
                    if (data?.id) {
                        const confirmed = window.confirm(
                            language === 'ar' ? 'هل تريد تحويل جهة الاتصال إلى عميل؟' : 'Convert this contact to a customer?'
                        );
                        if (confirmed) {
                            try {
                                const { contactsService } = await import('@/services/contactsService');
                                const result = await contactsService.convertToCustomer(data.id);
                                if (result.success) {
                                    toast.success(language === 'ar' ? 'تم التحويل بنجاح' : 'Converted successfully');
                                    onRefresh?.();
                                } else {
                                    toast.error(result.message);
                                }
                            } catch (err: any) {
                                toast.error(err.message);
                            }
                        }
                    }
                    break;

                case 'export':
                    // TODO: Implement export
                    toast.info(t('messages.featureComingSoon') || 'قريباً');
                    break;

                case 'confirm': {
                    // ═══ Confirmation Workflow ═══
                    if (!resolvedCompanyId) {
                        toast.error(language === 'ar' ? 'حدد الشركة أولاً' : 'Select company first');
                        break;
                    }
                    setLoading(true);
                    try {
                        // 1. Get workflow settings
                        const settings = await confirmationService.getWorkflowSettings(resolvedCompanyId);
                        setConfirmSettings(settings);

                        // 2. Map docType to confirmation docType
                        const confDocType: ConfDocType =
                            docType === 'trade_order' ? 'sales_order' :
                                docType === 'trade_invoice' ? 'sales_invoice' :
                                    docType === 'trade_quotation' ? 'quotation' :
                                        docType === 'trade_reservation' ? 'reservation' : 'sales_order';

                        // 3. Check if approval is needed
                        const needsApproval = confirmationService.isApprovalRequired(confDocType, settings, data);
                        setConfirmNeedsApproval(needsApproval);

                        // 4. Run validation
                        const validation = await confirmationService.validateForConfirmation(
                            confDocType,
                            documentId || data?.id || '',
                            data,
                            settings
                        );
                        setConfirmValidation(validation);

                        // 5. Open dialog
                        setConfirmDialogOpen(true);
                    } catch (err: any) {
                        toast.error(err.message);
                    } finally {
                        setLoading(false);
                    }
                    break;
                }

                case 'cancel':
                    // In create mode, cancel closes the sheet
                    if (mode === 'create') {
                        onClose();
                    } else {
                        // In edit mode, revert to view
                        setData(initialData);
                        setHasChanges(false);
                        handleModeChange('view');
                    }
                    break;

                default:
                    console.log('Unknown action:', actionId);
            }
        } catch (error: any) {
            console.error('Action error:', error);
            toast.error(error.message || t('messages.error') || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    }, [data, onSave, onDelete, onPost, onDuplicate, onPrint, onRefresh, onClose, documentId, handleModeChange, handleAccountingSave, handleTradeSave, isAccountingDocType, isTradeDocType, mode, t, resolvedCompanyId]);

    // Filter tabs based on props
    const visibleTabs = useMemo(() => {
        let tabs = config.tabs;

        if (allowedTabs && allowedTabs.length > 0) {
            tabs = tabs.filter(tab => allowedTabs.includes(tab.id));
        }

        if (hiddenTabs && hiddenTabs.length > 0) {
            tabs = tabs.filter(tab => !hiddenTabs.includes(tab.id));
        }

        return tabs;
    }, [config.tabs, allowedTabs, hiddenTabs]);

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

    // Render tab content
    const renderTabContent = (tabId: string) => {
        switch (tabId) {
            // ═══ Accounting Entry Tabs (Unified) ═══
            case 'entry':
            case 'form':
                if (['journal', 'cash', 'receipt', 'payment', 'transfer', 'exchange', 'debit_note', 'credit_note'].includes(docType)) {
                    return (
                        <AccountingEntryTab
                            data={data}
                            mode={mode}
                            docType={docType}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                            onSaveComplete={() => {
                                console.log('Entry saved successfully');
                            }}
                            companyId={resolvedCompanyId}
                        />
                    );
                }
                break;

            case 'items':
                return <WarehouseItemsTab />;

            case 'stocktakes':
                return <WarehouseStocktakesTab />;

            case 'overview':
                if (docType === 'warehouse') {
                    return (
                        <WarehouseOverviewTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => setData((prev: any) => ({ ...prev, ...updates }))}
                        />
                    );
                }
                if (docType === 'material') {
                    return (
                        <MaterialOverviewTab
                            data={data}
                            mode={mode}
                            groups={options?.groups}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                return (
                    <OverviewTab
                        data={data}
                        stats={config.stats}
                        currency={data?.currency || ''}
                        useArabicNumerals={useArabicNumerals}
                    />
                );

            case 'variants':
                if (docType === 'material') {
                    return (
                        <MaterialVariantsTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'inventory':
                if (docType === 'material') {
                    return <MaterialInventoryTab data={data} onClose={onClose} />;
                }
                break;

            case 'movements':
                if (docType === 'material') {
                    return <MaterialMovementsTab data={data} />;
                }
                break;

            case 'pricing':
                if (docType === 'material') {
                    return <MaterialPricingTab data={data} />;
                }
                break;

            case 'sales':
                if (docType === 'material') {
                    return <MaterialSalesTab data={data} />;
                }
                break;

            case 'purchases':
                if (docType === 'material') {
                    return <MaterialPurchasesTab data={data} />;
                }
                break;

            case 'analytics':
                if (docType === 'material') {
                    return <MaterialAnalyticsTab data={data} />;
                }
                break;

            case 'ledger':
                return (
                    <LedgerTab
                        entries={mockLedgerEntries}
                        loading={loading}
                        currency={data?.currency || ''}
                        useArabicNumerals={useArabicNumerals}
                        openingBalance={data?.opening_balance || 0}
                        closingBalance={data?.current_balance || data?.balance || 0}
                        totalDebit={data?.total_debit || 0}
                        totalCredit={data?.total_credit || 0}
                        onEntryClick={(entry) => {
                            console.log('Entry clicked:', entry);
                        }}
                        onEntryOpen={(entry) => {
                            // MDI: Open entry in new tab
                            const newDocId = entry.id;
                            const existingDoc = openDocs.find(d => d.id === newDocId);

                            if (existingDoc) {
                                setActiveDocId(newDocId);
                            } else {
                                const newDoc = {
                                    id: newDocId,
                                    type: 'journal' as const, // Treat ledger entries as journals for now
                                    title: entry.entry_number || entry.description || 'Entry',
                                    titleAr: entry.entry_number || entry.description,
                                    code: entry.entry_number,
                                    data: entry,
                                    isClosable: true,
                                };
                                setOpenDocs(prev => [...prev, newDoc]);
                                setActiveDocId(newDocId);
                            }
                        }}
                    />
                );

            case 'activity': {
                // Resolve entity type for audit log queries
                const resolveEntityType = () => {
                    if (tradeMode === 'purchase') {
                        switch (docType) {
                            case 'trade_order': return 'purchase_orders';
                            case 'trade_invoice': return 'purchase_invoices';
                            case 'trade_quotation': return 'purchase_quotations';
                            case 'trade_request': return 'purchase_requests';
                            case 'trade_receipt': return 'purchase_receipts';
                            case 'trade_return': return 'purchase_returns';
                            case 'trade_container': return 'shipments';
                            default: return undefined;
                        }
                    }
                    switch (docType) {
                        case 'trade_order': return 'sales_orders';
                        case 'trade_invoice': return 'sales_invoices';
                        case 'trade_quotation': return 'quotations';
                        case 'trade_delivery': return 'sales_deliveries';
                        case 'trade_return': return 'sales_returns';
                        default: return undefined;
                    }
                };
                return (
                    <ActivityTab
                        documentId={documentId || data?.id}
                        entityType={resolveEntityType()}
                        useArabicNumerals={useArabicNumerals}
                    />
                );
            }

            // === New Material Tabs ===
            case 'rolls':
                if (docType === 'material') {
                    return <MaterialRollsTab data={data} />;
                }
                break;

            case 'images':
            case 'createImages':
                if (docType === 'material') {
                    return (
                        <MaterialImagesTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'basicInfo':
                if (docType === 'material') {
                    return (
                        <MaterialBasicInfoTab
                            data={data}
                            mode={mode}
                            groups={options?.groups}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            // ═══ Material Group Tabs ═══
            case 'groupInfo':
                if (docType === 'materialGroup') {
                    return (
                        <MaterialGroupInfoTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'specs':
                if (docType === 'material') {
                    return (
                        <MaterialSpecsTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'createPricing':
                if (docType === 'material') {
                    return (
                        <MaterialPricingTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'additionalInfo':
                if (docType === 'material') {
                    return (
                        <MaterialAdditionalInfoTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'trade_details':
                return (
                    <TradeMainTab
                        data={data}
                        mode={mode as any}
                        tradeMode={tradeMode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            case 'material_browser':
                return (
                    <MaterialBrowserTab
                        items={data?.items || []}
                        onAddItem={(newItem: any) => {
                            const currentItems = data?.items || [];
                            setData((prev: any) => ({
                                ...prev,
                                items: [...currentItems, newItem],
                            }));
                            setHasChanges(true);
                        }}
                        currency={data?.currency || 'SAR'}
                        readOnly={mode === 'view'}
                    />
                );

            case 'payment_receipt':
                return (
                    <PaymentReceiptTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            case 'shipping': {
                // Trade documents → CustomerShippingTab (customer delivery)
                // Containers → TradeShippingTab (maritime shipping)
                const isContainer = docType === 'trade_container';
                if (isContainer) {
                    return (
                        <TradeShippingTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                return (
                    <CustomerShippingTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );
            }

            // ═══ Shipment Items Tab ═══
            case 'shipment_items':
                return (
                    <ShipmentItemsTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            case 'expenses':
                return (
                    <ContainerExpensesTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            // ═══ NexaAgent Tab ═══
            case 'nexa_agent':
                return (
                    <NexaAgentTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            // ═══ Purchase-specific Tabs ═══
            case 'supplier_info':
                return (
                    <SupplierInfoTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            case 'purchase_payment':
                return (
                    <PurchasePaymentTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );
            // ═══ Attachments Tab (PDF uploads) ═══
            case 'attachments':
                return (
                    <DocumentAttachmentsTab
                        data={data}
                        mode={mode}
                        docType={docType}
                        tradeMode={tradeMode}
                        onChange={(updates: any) => {
                            setData((prev: any) => ({ ...prev, ...updates }));
                            setHasChanges(true);
                        }}
                    />
                );

            // ═══ CRM Contact Tabs ═══
            case 'contactOverview':
                if (docType === 'contact') {
                    return (
                        <ContactOverviewTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'contactInteractions':
                if (docType === 'contact') {
                    return (
                        <ContactInteractionsTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            case 'contactCalls':
                if (docType === 'contact') {
                    return (
                        <ContactCallsTab
                            data={data}
                            mode={mode}
                        />
                    );
                }
                break;

            case 'contactNotes':
                if (docType === 'contact') {
                    return (
                        <ContactNotesTab
                            data={data}
                            mode={mode}
                            onChange={(updates: any) => {
                                setData((prev: any) => ({ ...prev, ...updates }));
                                setHasChanges(true);
                            }}
                        />
                    );
                }
                break;

            default:
                return (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        <p>{t('messages.contentComingSoon') || 'المحتوى قيد التطوير'}</p>
                    </div>
                );
        }
    };

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

                        {/* Extra header slot (e.g. document type selector) */}
                        {headerExtra}

                        {/* Combined Header + Action Toolbar — Compact */}
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
                                                    {language === 'ar' ? (data?.nameAr || data?.name_ar || data?.name) : (data?.name_en || data?.name) || t(config.titleKey)}
                                                </h2>

                                                {/* Status Badges inline */}
                                                {data?.status && (
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
                                                )}
                                                {data?.is_active !== undefined && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                                                        data.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                    )}>
                                                        {data.is_active ? (t('status.active') || 'Active') : (t('status.inactive') || 'Inactive')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Code + Balance in compact second line */}
                                            <div className="flex items-center gap-2">
                                                {(data?.code || data?.entry_number) && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        #{data?.code || data?.entry_number}
                                                    </span>
                                                )}

                                                {/* Balance inline with code */}
                                                {data && (data.current_balance !== undefined || data.balance !== undefined) && (
                                                    <span className="text-sm font-bold font-mono text-erp-primary">
                                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                            .format(data.current_balance ?? data.balance ?? 0)}
                                                        <span className="text-xs ms-1 text-gray-500 font-normal">
                                                            {t(`currencies.${(data.currency || '').toUpperCase()}`) || data.currency || ''}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Action Toolbar */}
                                    {!hideActions && (
                                        <EnhancedActionToolbar
                                            mode={mode}
                                            status={data?.status}
                                            onAction={handleAction}
                                            loading={loading}
                                            // Navigation
                                            onNavigatePrev={onNavigatePrev}
                                            onNavigateNext={onNavigateNext}
                                            hasPrev={hasPrev}
                                            hasNext={hasNext}
                                            // QR
                                            docType={docType}
                                            docNumber={data?.code || data?.entry_number || data?.id || ''}
                                            docId={data?.id || documentId || ''}
                                            amount={data?.current_balance ?? data?.balance ?? data?.total}
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
                                        />
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
                    </div>
                </SheetContent>
            </Sheet>

            {/* ═══ Confirmation Dialog ═══ */}
            <ConfirmationDialog
                isOpen={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={async () => {
                    if (!resolvedCompanyId) return;

                    const confDocType: ConfDocType =
                        docType === 'trade_order' ? 'sales_order' :
                            docType === 'trade_invoice' ? 'sales_invoice' :
                                docType === 'trade_quotation' ? 'quotation' :
                                    docType === 'trade_reservation' ? 'reservation' : 'sales_order';

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

                    const confDocType: ConfDocType =
                        docType === 'trade_order' ? 'sales_order' :
                            docType === 'trade_invoice' ? 'sales_invoice' :
                                docType === 'trade_quotation' ? 'quotation' :
                                    docType === 'trade_reservation' ? 'reservation' : 'sales_order';

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
                docType={
                    docType === 'trade_order' ? 'sales_order' :
                        docType === 'trade_invoice' ? 'sales_invoice' :
                            docType === 'trade_quotation' ? 'quotation' :
                                docType === 'trade_reservation' ? 'reservation' : 'sales_order'
                }
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
