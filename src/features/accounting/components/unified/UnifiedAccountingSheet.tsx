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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
import { ActivityTab, generateMockActivityEvents } from './tabs/ActivityTab';
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

    // Get document config
    const config = useMemo(() => getDocumentConfig(docType), [docType]);

    // State
    const [mode, setMode] = useState<SheetMode>(initialMode);
    const [data, setData] = useState<any>(initialData);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab || config.defaultTab);
    const [hasChanges, setHasChanges] = useState(false);

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
                    if (onSave) {
                        setLoading(true);
                        await onSave(data);
                        toast.success(t('messages.savedSuccessfully') || 'تم الحفظ بنجاح');
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
                    onDuplicate?.();
                    break;

                case 'print':
                    onPrint?.();
                    break;

                case 'refresh':
                    onRefresh?.();
                    break;

                case 'export':
                    // TODO: Implement export
                    toast.info(t('messages.featureComingSoon') || 'قريباً');
                    break;

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
    }, [data, onSave, onDelete, onPost, onDuplicate, onPrint, onRefresh, onClose, documentId, handleModeChange, t]);

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

    // Get mock activity events
    const mockActivityEvents = useMemo(() => {
        return generateMockActivityEvents(documentId || 'new');
    }, [documentId]);

    // Render tab content
    const renderTabContent = (tabId: string) => {
        switch (tabId) {
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
                        currency={data?.currency || 'SAR'}
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
                    return <MaterialInventoryTab data={data} />;
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
                        currency={data?.currency || 'SAR'}
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

            case 'activity':
                return (
                    <ActivityTab
                        events={mockActivityEvents}
                        loading={loading}
                        useArabicNumerals={useArabicNumerals}
                    />
                );

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

            // TODO: Add more tab content renderers
            default:
                return (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        <p>{t('messages.contentComingSoon') || 'المحتوى قيد التطوير'}</p>
                    </div>
                );
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                className={cn(
                    docType === 'materialGroup'
                        ? "!w-[38vw] !max-w-[38vw] p-0 flex flex-col h-full"
                        : "!w-[50vw] !max-w-[50vw] p-0 flex flex-col h-full",
                    "bg-gray-50 dark:bg-gray-900"
                )}
                side={isRTL ? 'left' : 'right'}
            >
                <div className="flex flex-col h-full w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Accessibility requirements */}
                    <SheetHeader className="sr-only">
                        <SheetTitle>{t(config.titleKey)}</SheetTitle>
                        <SheetDescription>
                            {language === 'ar' ? 'نموذج عرض وتعديل البيانات' : 'Data view and edit form'}
                        </SheetDescription>
                    </SheetHeader>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-erp-primary" />
                        </div>
                    )}

                    {/* Combined Header + Action Toolbar */}
                    {customHeader || (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b">
                            {/* Top Row: Icon, Title, Code, Status, and Actions */}
                            <div className="flex items-center justify-between gap-4">
                                {/* Left: Icon + Title + Code + Status */}
                                <div className="flex items-center gap-3">
                                    {/* Document Icon */}
                                    <div className="w-12 h-12 rounded-xl bg-erp-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-xl">
                                            {data?.type === 'cash' ? '💵' : data?.type === 'bank' ? '🏦' :
                                                docType === 'account' ? '📋' : docType === 'journal' ? '📝' :
                                                    docType === 'receipt' ? '🧾' : docType === 'payment' ? '💳' : '📄'}
                                        </span>
                                    </div>

                                    {/* Title + Code + Status */}
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {language === 'ar' ? (data?.nameAr || data?.name_ar || data?.name) : (data?.name_en || data?.name) || t(config.titleKey)}
                                            </h2>

                                            {/* Status Badges inline */}
                                            {data?.status && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    data.status === 'posted' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                                                        data.status === 'draft' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                                            "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                )}>
                                                    {data.status === 'posted' ? (t('status.posted') || 'Posted') :
                                                        data.status === 'draft' ? (t('status.draft') || 'Draft') :
                                                            data.status}
                                                </span>
                                            )}
                                            {data?.is_active !== undefined && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    data.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                )}>
                                                    {data.is_active ? (t('status.active') || 'Active') : (t('status.inactive') || 'Inactive')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Code + Balance in second line */}
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {(data?.code || data?.entry_number) && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                    #{data?.code || data?.entry_number}
                                                </span>
                                            )}

                                            {/* Balance inline with code */}
                                            {data && (data.current_balance !== undefined || data.balance !== undefined) && (
                                                <span className="text-lg font-bold font-mono text-erp-primary">
                                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        .format(data.current_balance ?? data.balance ?? 0)}
                                                    <span className="text-sm ms-1 text-gray-500 font-normal">
                                                        {t(`currencies.${(data.currency || 'SAR').toUpperCase()}`) || data.currency || 'SAR'}
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
                                        currency={data?.currency || 'SAR'}
                                        // Mode
                                        onModeChange={handleModeChange}
                                        onCancelEdit={() => {
                                            setData(initialData);
                                            setHasChanges(false);
                                        }}
                                        hasChanges={hasChanges}
                                    />
                                )}

                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                                >
                                    <span className="text-lg text-gray-600 dark:text-gray-300">✕</span>
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
    );
}

export default UnifiedAccountingSheet;

