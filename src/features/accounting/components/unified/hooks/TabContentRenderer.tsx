/**
 * TabContentRenderer — Lazy-loaded tab content rendering
 * 
 * Extracted from UnifiedAccountingSheet to reduce file size and enable
 * code-splitting via React.lazy for faster initial load.
 */

import React, { lazy, Suspense, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { journalEntriesService } from '@/services/journalEntriesService';
import { recalcItemTotals, resolveConfDocType } from '../hooks/useSheetActions';
import type { SheetMode, OpenDocument } from '../types';
import { supabase } from '@/lib/supabase';
import { TradeService } from '@/features/trade/services/TradeService';

// ═══ Eager imports (always needed for core tabs) ═══
import { OverviewTab } from '../tabs/OverviewTab';
import { AccountingEntryTab } from '../tabs/AccountingEntryTab';

// ═══ Lazy imports (loaded on demand per tab) ═══
const LedgerTab = lazy(() => import('../tabs/LedgerTab').then(m => ({ default: m.LedgerTab })));
const ActivityTab = lazy(() => import('../tabs/ActivityTab').then(m => ({ default: m.ActivityTab })));
const ActivityTabV2 = lazy(() => import('../tabs/ActivityTabV2').then(m => ({ default: m.ActivityTabV2 })));

// Warehouse
const WarehouseOverviewTab = lazy(() => import('../tabs/WarehouseOverviewTab').then(m => ({ default: m.WarehouseOverviewTab })));
const WarehouseItemsTab = lazy(() => import('../tabs/WarehouseItemsTab').then(m => ({ default: m.WarehouseItemsTab })));
const WarehouseStocktakesTab = lazy(() => import('../tabs/WarehouseStocktakesTab').then(m => ({ default: m.WarehouseStocktakesTab })));

// Material
const MaterialOverviewTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialOverviewTab })));
const MaterialInventoryTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialInventoryTab })));
const MaterialMovementsTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialMovementsTab })));
const MaterialPricingTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialPricingTab })));
const MaterialSalesTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialSalesTab })));
const MaterialPurchasesTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialPurchasesTab })));
const MaterialAnalyticsTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialAnalyticsTab })));
const MaterialVariantsTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialVariantsTab })));
const MaterialRollsTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialRollsTab })));
const MaterialBasicInfoTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialBasicInfoTab })));
const MaterialSpecsTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialSpecsTab })));
const MaterialImagesTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialImagesTab })));
const MaterialEcommerceTab = lazy(() => import('../tabs/MaterialEcommerceTab').then(m => ({ default: m.MaterialEcommerceTab })));
const MaterialAdditionalInfoTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialAdditionalInfoTab })));
const MaterialGroupInfoTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialGroupInfoTab })));
const MaterialDetailsTab = lazy(() => import('../tabs/MaterialDetailsTab').then(m => ({ default: m.MaterialDetailsTab })));

// Trade
const TradeMainTab = lazy(() => import('../tabs/TradeMainTab').then(m => ({ default: m.TradeMainTab })));
const TradeShippingTab = lazy(() => import('../tabs/TradeShippingTab').then(m => ({ default: m.TradeShippingTab })));
const MaterialBrowserTab = lazy(() => import('@/features/trade/components/tabs/MaterialBrowserTab').then(m => ({ default: m.MaterialBrowserTab })));
const PurchaseMaterialBrowserTab = lazy(() => import('@/features/trade/components/tabs/PurchaseMaterialBrowserTab').then(m => ({ default: m.PurchaseMaterialBrowserTab })));
const PaymentReceiptTab = lazy(() => import('@/features/trade/components/tabs/PaymentReceiptTab').then(m => ({ default: m.PaymentReceiptTab })));
const CustomerShippingTab = lazy(() => import('@/features/trade/components/tabs/CustomerShippingTab').then(m => ({ default: m.CustomerShippingTab })));
const NexaAgentTab = lazy(() => import('@/features/trade/components/tabs/NexaAgentTab').then(m => ({ default: m.NexaAgentTab })));
const SupplierInfoTab = lazy(() => import('@/features/trade/components/tabs/SupplierInfoTab').then(m => ({ default: m.SupplierInfoTab })));
const PurchasePaymentTab = lazy(() => import('@/features/trade/components/tabs/PurchasePaymentTab').then(m => ({ default: m.PurchasePaymentTab })));
const ShipmentItemsTab = lazy(() => import('@/features/trade/components/tabs/ShipmentItemsTab').then(m => ({ default: m.ShipmentItemsTab })));
const DocumentAttachmentsTab = lazy(() => import('@/features/trade/components/tabs/DocumentAttachmentsTab').then(m => ({ default: m.DocumentAttachmentsTab })));
const SupplierFinanceTab = lazy(() => import('@/features/trade/components/tabs/SupplierFinanceTab').then(m => ({ default: m.SupplierFinanceTab })));
const SalesFinanceTab = lazy(() => import('@/features/trade/components/tabs/SalesFinanceTab').then(m => ({ default: m.SalesFinanceTab })));
const StageJournalPreview = lazy(() => import('@/features/trade/components/shared/StageJournalPreview').then(m => ({ default: m.StageJournalPreview })));

// Warehouse receipt
const GoodsReceiptItemsTab = lazy(() => import('@/features/warehouse/components/tabs/GoodsReceiptItemsTab').then(m => ({ default: m.GoodsReceiptItemsTab })));
const ReceiptSummaryTab = lazy(() => import('@/features/warehouse/components/tabs/ReceiptSummaryTab').then(m => ({ default: m.ReceiptSummaryTab })));
const ContainerExpensesTab = lazy(() => import('../tabs/ContainerExpensesTab').then(m => ({ default: m.ContainerExpensesTab })));
const ContainerReceiptSummaryTab = lazy(() => import('../tabs/ContainerReceiptSummaryTab').then(m => ({ default: m.ContainerReceiptSummaryTab })));

// Sales Delivery (roll picking)
const SalesDeliveryItemsTab = lazy(() => import('@/features/warehouse/tabs/SalesDeliveryItemsTab').then(m => ({ default: m.SalesDeliveryItemsTab })));
const DeliverySummaryTab = lazy(() => import('@/features/warehouse/tabs/DeliverySummaryTab').then(m => ({ default: m.DeliverySummaryTab })));
const DeliveryInfoTab = lazy(() => import('@/features/warehouse/tabs/DeliveryInfoTab').then(m => ({ default: m.DeliveryInfoTab })));

// Party
const PartyOverviewTab = lazy(() => import('../tabs/PartyOverviewTab').then(m => ({ default: m.PartyOverviewTab })));
const PartyLedgerExpandedRow = lazy(() => import('../tabs/PartyLedgerExpandedRow').then(m => ({ default: m.PartyLedgerExpandedRow })));

// CRM
const ContactOverviewTab = lazy(() => import('../tabs/ContactOverviewTab').then(m => ({ default: m.ContactOverviewTab })));
const ContactInteractionsTab = lazy(() => import('../tabs/ContactInteractionsTab').then(m => ({ default: m.ContactInteractionsTab })));
const ContactCallsTab = lazy(() => import('../tabs/ContactCallsTab').then(m => ({ default: m.ContactCallsTab })));
const ContactNotesTab = lazy(() => import('../tabs/ContactNotesTab').then(m => ({ default: m.ContactNotesTab })));

// Roll — شيت الرولون
const RollOverviewTab = lazy(() => import('../tabs/RollOverviewTab').then(m => ({ default: m.RollOverviewTab })));
const RollMovementsTab = lazy(() => import('../tabs/RollMovementsTab').then(m => ({ default: m.RollMovementsTab })));
const RollLocationTab = lazy(() => import('../tabs/RollLocationTab').then(m => ({ default: m.RollLocationTab })));

// ═══ Loading fallback ═══
function TabLoading() {
    return (
        <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-erp-primary" />
        </div>
    );
}

export interface TabContentRendererProps {
    data: any;
    mode: SheetMode;
    docType: string;
    tradeMode?: string;
    loading: boolean;
    companyId?: string;
    documentId?: string;
    currentStage?: string;
    options?: any;
    useArabicNumerals?: boolean;
    // State management
    setData: (fn: any) => void;
    setHasChanges: (v: boolean) => void;
    onClose: () => void;
    onRefresh?: () => void;
    // MDI
    openDocs: OpenDocument[];
    setOpenDocs: React.Dispatch<React.SetStateAction<OpenDocument[]>>;
    setActiveDocId: React.Dispatch<React.SetStateAction<string>>;
    activeTab?: string; // Current active tab — needed to save before switching to sub-doc
    // Config
    stats?: any;
}

// ═══ Shared onChange handler builder ═══
function makeOnChange(setData: (fn: any) => void, setHasChanges: (v: boolean) => void) {
    return (updates: any) => {
        setData((prev: any) => ({ ...prev, ...updates }));
        setHasChanges(true);
    };
}

export function useTabContentRenderer(props: TabContentRendererProps) {
    const { t, language } = useLanguage();
    const {
        data, mode, docType, tradeMode, loading, companyId, documentId,
        currentStage, options, useArabicNumerals,
        setData, setHasChanges, onClose, onRefresh,
        openDocs, setOpenDocs, setActiveDocId,
        activeTab: currentActiveTab,
        stats,
    } = props;

    const onChange = useCallback(makeOnChange(setData, setHasChanges), [setData, setHasChanges]);

    // Track activeTab in a ref to avoid stale closures inside useCallback
    const activeTabRef = useRef(currentActiveTab);
    activeTabRef.current = currentActiveTab;

    const renderTabContent = useCallback((tabId: string): React.ReactNode => {
        const content = renderTabContentInner(tabId);
        // Wrap lazy-loaded tabs in Suspense
        if (content && tabId !== 'entry' && tabId !== 'form' && tabId !== 'overview') {
            return <Suspense fallback={<TabLoading />}>{content}</Suspense>;
        }
        return content;
    }, [data, mode, docType, tradeMode, loading, companyId, documentId, currentStage, options, useArabicNumerals, onChange, openDocs]);

    function renderTabContentInner(tabId: string): React.ReactNode {
        switch (tabId) {
            // ═══ Accounting Entry Tabs ═══
            case 'entry':
            case 'form':
                if (['journal', 'cash', 'receipt', 'payment', 'transfer', 'exchange', 'debit_note', 'credit_note'].includes(docType)) {
                    return (
                        <AccountingEntryTab
                            data={data}
                            mode={mode}
                            docType={docType as any}
                            onChange={onChange}
                            onSaveComplete={() => { /* entry saved */ }}
                            companyId={companyId}
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
                    return <WarehouseOverviewTab data={data} mode={mode} onChange={onChange} />;
                }
                if (docType === 'material') {
                    return <MaterialOverviewTab data={data} mode={mode} groups={options?.groups} onChange={onChange} />;
                }
                if (docType === 'party' || docType === 'account') {
                    return (
                        <Suspense fallback={<TabLoading />}>
                            <PartyOverviewTab
                                data={data}
                                mode={mode}
                                onChange={onChange}
                                companyId={companyId}
                            />
                        </Suspense>
                    );
                }
                return (
                    <Suspense fallback={<TabLoading />}>
                        <OverviewTab
                            data={data}
                            stats={stats}
                            currency={data?.currency || ''}
                            useArabicNumerals={useArabicNumerals}
                            mode={mode}
                            onChange={(field: string, value: any) => onChange({ [field]: value })}
                            companyId={companyId}
                            allAccounts={options?.allAccounts}
                        />
                    </Suspense>
                );

            case 'variants':
                if (docType === 'material') {
                    return <MaterialVariantsTab data={data} mode={mode} onChange={onChange} />;
                }
                break;

            case 'inventory':
                if (docType === 'material') {
                    // ── MDI handler: open a roll as a new document tab ──
                    const handleRollOpen = async (roll: any) => {
                        const rollId = roll.id;
                        if (!rollId) return;

                        // If already open, just activate
                        const existingDoc = openDocs.find(d => d.id === rollId);
                        if (existingDoc) {
                            setActiveDocId(rollId);
                            return;
                        }

                        // Fetch full roll details with warehouse/color joins
                        const { data: fullRoll, error } = await supabase
                            .from('fabric_rolls')
                            .select(`
                                *,
                                warehouse:warehouses!left(id, name_ar, name_en, code),
                                color:fabric_colors!left(id, name_ar, name_en, hex_code)
                            `)
                            .eq('id', rollId)
                            .single();

                        if (error || !fullRoll) {
                            console.warn('[Roll MDI] fetch error:', error?.message);
                            return;
                        }

                        const rollData = {
                            ...fullRoll,
                            warehouse_name_ar: fullRoll.warehouse?.name_ar,
                            warehouse_name_en: fullRoll.warehouse?.name_en,
                            material_name_ar: data?.name_ar || data?.name,
                        };

                        // Save current tab in active doc, then push roll as new MDI doc
                        setOpenDocs(prev => {
                            const savedTab = activeTabRef.current;
                            const updated = prev.map(d =>
                                d.id === (documentId || data?.id)
                                    ? { ...d, lastActiveTab: savedTab || d.lastActiveTab }
                                    : d
                            );
                            return [...updated, {
                                id: rollId,
                                type: 'roll' as any,
                                title: `🧻 ${fullRoll.roll_number}`,
                                titleAr: `رولون ${fullRoll.roll_number}`,
                                code: fullRoll.roll_number,
                                data: rollData,
                                isClosable: true,
                                lastActiveTab: 'roll_overview',
                            }];
                        });
                        // NOTE: No setData — each doc's data lives in openDocs[].data
                        setActiveDocId(rollId);
                    };

                    return <MaterialInventoryTab data={data} onClose={onClose} onOpenRoll={handleRollOpen} />;
                }
                break;

            case 'movements':
                if (docType === 'material') {
                    const handleMovDoc = async (movDocType: string, movDocId: string) => {
                        const existingDoc = openDocs.find(d => d.id === movDocId);
                        if (existingDoc) { setActiveDocId(movDocId); return; }

                        try {
                            let mdiType = 'trade_invoice';
                            let tradeM: 'sales' | 'purchase' | undefined;
                            let typeIcon = '📋';
                            let docTitle = '';
                            let docData: any = null;

                            if (movDocType === 'sale_invoice') {
                                mdiType = 'trade_invoice'; tradeM = 'sales'; typeIcon = '🧾';
                                docTitle = language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice';
                                const { header, items } = await TradeService.getTradeDocumentWithItems(movDocId, 'invoice');
                                docData = { ...header, items, type: 'sales', subType: 'invoice', status: header?.status || 'draft' };
                            } else if (movDocType === 'purchase_invoice') {
                                mdiType = 'trade_invoice'; tradeM = 'purchase'; typeIcon = '📦';
                                docTitle = language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice';
                                const { header, items } = await TradeService.getTradeDocumentWithItems(movDocId, 'purchase_invoice');
                                docData = { ...header, items, type: 'purchase', subType: 'invoice', status: header?.status || 'draft' };
                            } else if (movDocType === 'container') {
                                mdiType = 'trade_container'; typeIcon = '🚢';
                                docTitle = language === 'ar' ? 'كونتينر' : 'Container';
                                const [cRes, iRes] = await Promise.all([
                                    supabase.from('containers').select('*').eq('id', movDocId).single(),
                                    supabase.from('container_items').select('*').eq('container_id', movDocId),
                                ]);
                                docData = { ...cRes.data, items: iRes.data || [], type: 'purchase', subType: 'container', status: cRes.data?.status || 'draft' };
                            } else if (movDocType === 'party_customer') {
                                mdiType = 'party'; typeIcon = '👤';
                                docTitle = language === 'ar' ? 'كشف حساب عميل' : 'Customer Account';
                                const { data: cust } = await supabase.from('customers').select('*').eq('id', movDocId).single();
                                // _partyType is used by ledger case to pick receivable_account_id
                                docData = { ...cust, _partyType: 'customer', partyType: 'customer', type: 'party', status: 'active', id: movDocId };
                                docTitle = cust?.name_ar || cust?.name_en || docTitle;
                            } else if (movDocType === 'party_supplier') {
                                mdiType = 'party'; typeIcon = '🏢';
                                docTitle = language === 'ar' ? 'كشف حساب مورد' : 'Supplier Account';
                                const { data: supp } = await supabase.from('suppliers').select('*').eq('id', movDocId).single();
                                // _partyType is used by ledger case to pick payable_account_id
                                docData = { ...supp, _partyType: 'supplier', partyType: 'supplier', type: 'party', status: 'active', id: movDocId };
                                docTitle = supp?.name_ar || supp?.name_en || supp?.company_name || docTitle;
                            } else {
                                mdiType = 'trade_invoice'; tradeM = 'purchase'; typeIcon = '📦';
                                docTitle = language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice';
                                const { header, items } = await TradeService.getTradeDocumentWithItems(movDocId, 'purchase_invoice');
                                docData = { ...header, items, type: 'purchase', subType: 'invoice', status: header?.status || 'draft' };
                            }

                            setOpenDocs(prev => {
                                const savedTab = activeTabRef.current;
                                const updated = prev.map(d => d.id === (documentId || data?.id) ? { ...d, lastActiveTab: savedTab || d.lastActiveTab } : d);
                                const isParty = movDocType === 'party_customer' || movDocType === 'party_supplier';
                                const defaultTab = isParty ? 'overview' : 'trade_details';
                                const codeVal = isParty
                                    ? (docData?.name_ar || docData?.name_en || docData?.company_name || movDocId.slice(0, 8))
                                    : (docData?.invoice_no || docData?.container_number || movDocId.slice(0, 8));
                                return [...updated, {
                                    id: movDocId, type: mdiType as any,
                                    title: `${typeIcon} ${docTitle}`, titleAr: docTitle,
                                    code: codeVal,
                                    data: docData, isClosable: true, tradeMode: tradeM,
                                    lastActiveTab: defaultTab,
                                }];
                            });
                            // NOTE: Do NOT call setData here — it would overwrite
                            // the original material sheet's data with the new doc's data.
                            // The new doc's data is already inside openDocs[].data
                            setActiveDocId(movDocId);
                        } catch (err) { console.error('[movements MDI] open doc error:', err); }
                    };
                    return <MaterialMovementsTab data={data} onOpenDocument={handleMovDoc} />;
                }
                break;

            case 'pricing':
                if (docType === 'material') return <MaterialPricingTab data={data} />;
                break;

            case 'sales':
                if (docType === 'material') return <MaterialSalesTab data={data} />;
                break;

            case 'purchases':
                if (docType === 'material') return <MaterialPurchasesTab data={data} />;
                break;

            case 'analytics':
                if (docType === 'material') return <MaterialAnalyticsTab data={data} />;
                break;

            // ═══ Roll Tabs ═══
            case 'roll_overview':
                return <RollOverviewTab data={data} language={language} />;

            case 'roll_movements':
                return <RollMovementsTab data={data} language={language} />;

            case 'roll_location':
                return <RollLocationTab data={data} language={language} />;

            case 'ledger': {
                // For parties, use their accounting sub-account ID
                let ledgerAccountId = data?.id || documentId || '';
                if (docType === 'party') {
                    const partyType = data?._partyType || data?.party_type || data?.type || 'customer';
                    ledgerAccountId = partyType === 'customer'
                        ? (data?.receivable_account_id || '')
                        : (data?.payable_account_id || '');
                }

                // ═══ MDI Document Open Handler — shared between LedgerTab and PartyLedgerExpandedRow ═══
                const handleEntryOpen = async (entry: any) => {
                    // Determine the correct document type and ID to open
                    let refType = entry.referenceType || '';
                    const entryType = (entry as any).entryType || entry.type || '';
                    let refId = entry.referenceId;

                    // Map reference_type to document type for MDI
                    let mdiDocType: string = 'journal';
                    let tradeModeExt: 'sales' | 'purchase' | undefined = undefined;
                    let lastActiveTabExt: string | undefined = undefined;
                    let docId = entry.entryId;
                    let docTitle = entry.entryNumber || entry.description || 'Entry';
                    let typeIcon = '📋';

                    // ═══ Reverse Lookup: when refId is missing, find the original document via journal_entry_id ═══
                    if (!refId && entry.entryId) {
                        // Check entry_type or entryType to determine which table to reverse-lookup
                        const jeType = entryType || '';

                        if (jeType.includes('purchase') || jeType === 'invoice') {
                            // Reverse lookup: purchase_transactions → journal_entry_id
                            const { data: ptRow } = await supabase
                                .from('purchase_transactions')
                                .select('id, invoice_no, stage, container_id')
                                .eq('journal_entry_id', entry.entryId)
                                .maybeSingle();
                            if (ptRow) {
                                refId = ptRow.id;
                                refType = 'purchase_invoice';
                                mdiDocType = 'trade_invoice';
                                tradeModeExt = 'purchase';
                                docId = ptRow.id;
                                typeIcon = '📦';
                                docTitle = language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice';
                            }
                        }

                        if (!refId && (jeType.includes('sales') || jeType === 'invoice')) {
                            // Reverse lookup: sales_transactions → journal_entry_id
                            const { data: stRow } = await supabase
                                .from('sales_transactions')
                                .select('id, invoice_no, stage')
                                .eq('journal_entry_id', entry.entryId)
                                .maybeSingle();
                            if (stRow) {
                                refId = stRow.id;
                                refType = 'sales_invoice';
                                mdiDocType = 'trade_invoice';
                                tradeModeExt = 'sales';
                                docId = stRow.id;
                                typeIcon = '🧾';
                                docTitle = language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice';
                            }
                        }

                        if (!refId && jeType.includes('container')) {
                            // Reverse lookup: containers
                            const { data: cRow } = await supabase
                                .from('containers')
                                .select('id, container_number')
                                .eq('journal_entry_id', entry.entryId)
                                .maybeSingle();
                            if (cRow) {
                                refId = cRow.id;
                                refType = 'container';
                                mdiDocType = 'trade_container';
                                docId = cRow.id;
                                typeIcon = '🚢';
                                docTitle = language === 'ar' ? 'كونتينر' : 'Container';
                            }
                        }
                    }

                    if (refId) {
                        if (mdiDocType === 'journal') {
                            // Only re-detect if not already set by reverse lookup
                            if (refType.includes('sales_invoice') || refType === 'sales' || refType.includes('sales_order')) {
                                mdiDocType = 'trade_invoice';
                                tradeModeExt = 'sales';
                                docId = refId;
                                typeIcon = '🧾';
                                docTitle = `${language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice'}`;
                                if (refType.includes('order')) {
                                    mdiDocType = 'trade_order';
                                    docTitle = `${language === 'ar' ? 'أمر بيع' : 'Sales Order'}`;
                                }
                            } else if (refType.includes('purchase_invoice') || refType === 'purchase' || refType.includes('purchase_order')) {
                                mdiDocType = 'trade_invoice';
                                tradeModeExt = 'purchase';
                                docId = refId;
                                typeIcon = '📦';
                                docTitle = `${language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice'}`;
                                if (refType.includes('order')) {
                                    mdiDocType = 'trade_order';
                                    docTitle = `${language === 'ar' ? 'أمر شراء' : 'Purchase Order'}`;
                                }
                            } else if (refType.includes('payment') || refType === 'PAY') {
                                mdiDocType = 'payment';
                                docId = refId;
                                typeIcon = '💸';
                                docTitle = `${language === 'ar' ? 'سند صرف' : 'Payment'}`;
                            } else if (refType.includes('receipt') || refType === 'RCT') {
                                mdiDocType = 'receipt';
                                docId = refId;
                                typeIcon = '💰';
                                docTitle = `${language === 'ar' ? 'سند قبض' : 'Receipt'}`;
                            } else if (refType.includes('container') || refType.includes('shipment')) {
                                mdiDocType = 'trade_container';
                                docId = refId;
                                typeIcon = '🚢';
                                docTitle = `${language === 'ar' ? 'كونتينر' : 'Container'}`;
                                if (refType.includes('expense') || refType.includes('tax') || entryType === 'container_expense') {
                                    lastActiveTabExt = 'expenses';
                                }
                            } else if (refType.includes('expense') || entryType.includes('expense')) {
                                mdiDocType = 'expense';
                                docId = refId;
                                typeIcon = '💳';
                                docTitle = `${language === 'ar' ? 'مصروف' : 'Expense'}`;
                            } else if (refType.includes('transfer') || refType === 'TRF') {
                                mdiDocType = 'transfer';
                                docId = refId;
                                typeIcon = '🔄';
                                docTitle = `${language === 'ar' ? 'تحويل' : 'Transfer'}`;
                            }
                        }
                    }

                    // Check if already open
                    const existingDoc = openDocs.find(d => d.id === docId);
                    if (existingDoc) {
                        setActiveDocId(docId);
                        return;
                    }

                    try {
                        let docData: any = null;

                        if (mdiDocType === 'trade_invoice' || mdiDocType === 'trade_order' || mdiDocType === 'trade_delivery') {
                            // Map to correct DOC_TYPE_TABLE_MAP key:
                            // purchase → 'purchase_invoice', sales → 'invoice'
                            const baseDocType = mdiDocType.replace('trade_', '');
                            const tradeDocType = tradeModeExt === 'purchase' ? `purchase_${baseDocType}` : baseDocType;
                            const { header, items } = await TradeService.getTradeDocumentWithItems(docId, tradeDocType);
                            docData = {
                                ...header,
                                items,
                                _sourceEntryId: entry.entryId,
                                // Match UnifiedTradeSheet enhancedData format
                                type: tradeModeExt || 'sales',
                                subType: baseDocType,
                                status: header?.status || header?.stage || 'draft',
                            };
                            if (!docData.invoice_no && docData.number) docData.invoice_no = docData.number;
                        } else if (mdiDocType === 'trade_container') {
                            // Fetch container header + items + linked invoices in parallel
                            const [containerResult, itemsResult, linkedInvoicesResult] = await Promise.all([
                                supabase.from('containers').select('*').eq('id', docId).single(),
                                supabase.from('container_items').select('*').eq('container_id', docId),
                                supabase.from('purchase_transactions').select('id, invoice_no, total_amount, stage, supplier_name').eq('container_id', docId),
                            ]);
                            if (containerResult.error) throw containerResult.error;
                            const containerItems = itemsResult.data || [];
                            const linkedInvoices = linkedInvoicesResult.data || [];
                            docData = {
                                ...containerResult.data,
                                items: containerItems,
                                linked_invoices: linkedInvoices,
                                _sourceEntryId: entry.entryId,
                                // Match UnifiedTradeSheet enhancedData format
                                type: 'purchase',
                                subType: 'container',
                                party_id: containerResult.data.supplier_id,
                                status: containerResult.data.status || 'draft',
                            };
                        } else if (mdiDocType === 'receipt') {
                            const { data: receiptData, error } = await supabase.from('cash_receipts').select('*').eq('id', docId).single();
                            if (error) throw error;
                            docData = { ...receiptData, _sourceEntryId: entry.entryId };
                        } else if (mdiDocType === 'payment') {
                            const { data: paymentData, error } = await supabase.from('payment_transactions').select('*').eq('id', docId).single();
                            if (error) throw error;
                            docData = { ...paymentData, _sourceEntryId: entry.entryId };
                        } else {
                            // Fallback: journal entry
                            docData = await journalEntriesService.getById(entry.entryId);
                            if (refId) {
                                docData._sourceRefId = refId;
                                docData._sourceRefType = refType;
                            }
                        }

                        // Save active tab in the current doc (not just prev[0])
                        // CRITICAL: preserve each doc's OWN data, do NOT overwrite with shared 'data'
                        setOpenDocs(prev => {
                            const savedTab = activeTabRef.current;
                            // savedTab preserved per document
                            const updated = prev.map(d =>
                                d.id === (documentId || data?.id)
                                    ? { ...d, lastActiveTab: savedTab || d.lastActiveTab }
                                    : d
                            );
                            return [...updated, {
                                id: docId,
                                type: mdiDocType as any,
                                title: `${typeIcon} ${docTitle}`,
                                titleAr: docTitle,
                                code: docData?.invoice_no || docData?.number || docData?.container_number || docData?.receipt_number || docData?.payment_number || entry.entryNumber,
                                data: docData,
                                isClosable: true,
                                tradeMode: tradeModeExt,
                                lastActiveTab: lastActiveTabExt || (
                                    mdiDocType === 'trade_container' ? 'trade_details' :
                                        mdiDocType === 'trade_invoice' || mdiDocType === 'trade_order' ? 'trade_details' :
                                            undefined
                                ),
                            }];
                        });
                        // NOTE: Do NOT call setData here — it would corrupt other open documents.
                        // Each document's data lives inside its openDocs[].data entry.
                        // Auto-activate the opened document tab
                        setActiveDocId(docId);
                    } catch (err) {
                        console.error('Error opening document:', err);
                    }
                };

                return (
                    <LedgerTab
                        accountId={ledgerAccountId}
                        companyId={companyId || ''}
                        currency={data?.currency || ''}
                        partyMode={true}
                        renderExpandedRowOverride={(row) => (
                            <Suspense fallback={<div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>}>
                                <PartyLedgerExpandedRow
                                    entry={row}
                                    currency={data?.currency || ''}
                                    onOpenEntry={handleEntryOpen}
                                />
                            </Suspense>
                        )}
                        onEntryOpen={handleEntryOpen}
                    />
                );
            }

            case 'activity': {
                return (
                    <ActivityTabV2
                        documentId={documentId || data?.id}
                        docType={docType}
                        tradeMode={tradeMode}
                        mode={mode}
                        onChange={onChange}
                    />
                );
            }

            // ═══ Material creation / edit tabs ═══
            case 'rolls':
                if (docType === 'material') return <MaterialRollsTab data={data} />;
                break;

            case 'images':
            case 'createImages':
                if (docType === 'material') return <MaterialImagesTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'basicInfo':
                if (docType === 'material') return <MaterialBasicInfoTab data={data} mode={mode} groups={options?.groups} onChange={onChange} />;
                break;

            case 'groupInfo':
                if (docType === 'materialGroup') return <MaterialGroupInfoTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'specs':
                if (docType === 'material') return <MaterialSpecsTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'createPricing':
                if (docType === 'material') return <MaterialPricingTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'ecommerce':
            case 'createEcommerce':
                if (docType === 'material') return <MaterialEcommerceTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'additionalInfo':
                if (docType === 'material') return <MaterialAdditionalInfoTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'details':
                if (docType === 'material') return <MaterialDetailsTab data={data} mode={mode} onChange={onChange} />;
                break;

            // ═══ Trade tabs ═══
            case 'trade_details':
                return (
                    <TradeMainTab
                        data={data}
                        mode={mode as any}
                        tradeMode={tradeMode as any}
                        onChange={(updates: any) => {
                            setData((prev: any) => {
                                const merged = { ...prev, ...updates };
                                const items = merged.items || [];
                                if (items.length > 0) {
                                    Object.assign(merged, recalcItemTotals(items));
                                }
                                return merged;
                            });
                            setHasChanges(true);
                        }}
                    />
                );

            case 'material_browser':
                return (
                    <MaterialBrowserTab
                        items={data?.items || []}
                        onAddItem={(newItem: any) => {
                            const updatedItems = [...(data?.items || []), newItem];
                            setData((prev: any) => ({ ...prev, items: updatedItems, ...recalcItemTotals(updatedItems) }));
                            setHasChanges(true);
                        }}
                        currency={data?.currency || ''}
                        tradeMode={tradeMode}
                        readOnly={mode === 'view'}
                        sourceWarehouseId={data?.warehouse_id || data?.from_warehouse_id}
                    />
                );

            case 'purchase_material_browser':
                return (
                    <PurchaseMaterialBrowserTab
                        items={data?.items || []}
                        onAddItem={(newItem: any) => {
                            const updatedItems = [...(data?.items || []), newItem];
                            setData((prev: any) => ({ ...prev, items: updatedItems, ...recalcItemTotals(updatedItems) }));
                            setHasChanges(true);
                        }}
                        currency={data?.currency || ''}
                        readOnly={mode === 'view'}
                        supplierId={data?.supplier_id}
                        receiptMode={data?.receipt_mode}
                    />
                );

            case 'payment_receipt':
                return <PaymentReceiptTab data={data} mode={mode} onChange={onChange} />;

            case 'shipping': {
                if (docType === 'trade_container') {
                    return <TradeShippingTab data={data} mode={mode} onChange={onChange} />;
                }
                return <CustomerShippingTab data={data} mode={mode} onChange={onChange} />;
            }

            case 'shipment_items':
                return <ShipmentItemsTab data={data} mode={mode} onChange={onChange} onClose={onClose} />;

            case 'expenses':
                return <ContainerExpensesTab data={data} mode={mode} onChange={onChange} />;

            case 'receipt_summary':
                return <ContainerReceiptSummaryTab data={data} mode={mode} />;

            case 'nexa_agent':
                return <NexaAgentTab data={data} mode={mode} onChange={onChange} />;

            case 'supplier_info':
                return <SupplierInfoTab data={data} mode={mode} onChange={onChange} />;

            case 'purchase_payment':
                return <PurchasePaymentTab data={data} mode={mode} onChange={onChange} />;

            case 'supplier_finance':
                return (
                    <SupplierFinanceTab
                        data={data}
                        mode={mode}
                        onChange={onChange}
                        currentStage={currentStage || data?.stage || 'draft'}
                        transactionType={tradeMode === 'sales' ? 'sale' : 'purchase'}
                        isLoading={false}
                        companyId={companyId}
                    />
                );

            case 'sales_finance':
                return (
                    <SalesFinanceTab
                        data={data}
                        mode={mode}
                        onChange={onChange}
                        currentStage={currentStage || data?.stage || 'draft'}
                        transactionType="sale"
                        isLoading={false}
                        companyId={companyId}
                    />
                );

            case 'journal_preview': {
                const jpItems = data?.items || data?.purchase_transaction_items || data?.sale_items || [];
                const jpTotals = jpItems.length > 0 ? recalcItemTotals(jpItems) : null;
                const jpNet = jpTotals ? (jpTotals.subtotal - jpTotals.discount_amount) : Number(data?.subtotal || data?.total_amount || 0);
                return (
                    <StageJournalPreview
                        stage={currentStage || data?.stage || 'draft'}
                        totalAmount={jpNet}
                        taxAmount={jpTotals?.tax_amount || Number(data?.tax_amount || 0)}
                        discountAmount={jpTotals?.discount_amount || Number(data?.discount_amount || 0)}
                        supplierName={tradeMode === 'sales' ? (data?.customer_name || data?.party_name || '') : (data?.supplier_name || data?.party_name || '')}
                        currency={data?.currency || ''}
                        transactionType={tradeMode === 'sales' ? 'sale' : 'purchase'}
                        companyId={companyId}
                        journalEntryId={data?.journal_entry_id}
                        partyId={data?.customer_id || data?.supplier_id || data?.party_id}
                    />
                );
            }

            case 'attachments':
                return <DocumentAttachmentsTab data={data} mode={mode} docType={docType as any} tradeMode={tradeMode as any} onChange={onChange} />;

            // ═══ Warehouse Receipt ═══
            case 'goods_receipt_items':
            case 'warehouse_receiving':
                return (
                    <GoodsReceiptItemsTab
                        data={data}
                        mode={mode}
                        onChange={(updates: any) => {
                            onChange(updates);
                            if (data?.onReceiptDataChange && updates?.receipt_items) {
                                data.onReceiptDataChange(updates);
                            }
                        }}
                    />
                );

            // ═══ Sales Delivery (roll picking) ═══
            case 'sales_delivery_items':
                return (
                    <SalesDeliveryItemsTab
                        data={data}
                        mode={mode}
                        onChange={onChange}
                    />
                );

            case 'delivery_summary':
                return (
                    <DeliverySummaryTab
                        data={data}
                        mode={mode}
                        onChange={onChange}
                    />
                );

            case 'delivery_info':
                return (
                    <DeliveryInfoTab
                        data={data}
                        mode={mode}
                        onChange={onChange}
                    />
                );

            // ═══ CRM Contact Tabs ═══
            case 'contactOverview':
                if (docType === 'contact') return <ContactOverviewTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'contactInteractions':
                if (docType === 'contact') return <ContactInteractionsTab data={data} mode={mode} onChange={onChange} />;
                break;

            case 'contactCalls':
                if (docType === 'contact') return <ContactCallsTab data={data} mode={mode} />;
                break;

            case 'contactNotes':
                if (docType === 'contact') return <ContactNotesTab data={data} mode={mode} onChange={onChange} />;
                break;

            // ═══ Roll Detail Sheet Tabs ═══
            case 'roll_overview':
                if (docType === 'roll') return (
                    <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>}>
                        <RollOverviewTab data={data} />
                    </Suspense>
                );
                break;

            case 'roll_movements':
                if (docType === 'roll') return (
                    <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>}>
                        <RollMovementsTab data={data} />
                    </Suspense>
                );
                break;

            case 'roll_location':
                if (docType === 'roll') return (
                    <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>}>
                        <RollLocationTab data={data} />
                    </Suspense>
                );
                break;

            default:
                return (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        <p>{t('messages.contentComingSoon') || 'المحتوى قيد التطوير'}</p>
                    </div>
                );
        }
    }

    return renderTabContent;
}
