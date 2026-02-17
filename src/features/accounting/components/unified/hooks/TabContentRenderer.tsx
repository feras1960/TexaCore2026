/**
 * TabContentRenderer — Lazy-loaded tab content rendering
 * 
 * Extracted from UnifiedAccountingSheet to reduce file size and enable
 * code-splitting via React.lazy for faster initial load.
 */

import React, { lazy, Suspense, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { recalcItemTotals, resolveConfDocType } from '../hooks/useSheetActions';
import type { SheetMode, LedgerEntry, OpenDocument } from '../types';

// ═══ Eager imports (always needed for core tabs) ═══
import { OverviewTab } from '../tabs/OverviewTab';
import { AccountingEntryTab } from '../tabs/AccountingEntryTab';

// ═══ Lazy imports (loaded on demand per tab) ═══
const LedgerTab = lazy(() => import('../tabs/LedgerTab').then(m => ({ default: m.LedgerTab })));
const ActivityTab = lazy(() => import('../tabs/ActivityTab').then(m => ({ default: m.ActivityTab })));

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
const MaterialAdditionalInfoTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialAdditionalInfoTab })));
const MaterialGroupInfoTab = lazy(() => import('../tabs').then(m => ({ default: m.MaterialGroupInfoTab })));

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
const StageJournalPreview = lazy(() => import('@/features/trade/components/shared/StageJournalPreview').then(m => ({ default: m.StageJournalPreview })));

// Warehouse receipt
const GoodsReceiptItemsTab = lazy(() => import('@/features/warehouse/components/tabs/GoodsReceiptItemsTab').then(m => ({ default: m.GoodsReceiptItemsTab })));
const ReceiptSummaryTab = lazy(() => import('@/features/warehouse/components/tabs/ReceiptSummaryTab').then(m => ({ default: m.ReceiptSummaryTab })));
const ContainerExpensesTab = lazy(() => import('../tabs/ContainerExpensesTab').then(m => ({ default: m.ContainerExpensesTab })));

// CRM
const ContactOverviewTab = lazy(() => import('../tabs/ContactOverviewTab').then(m => ({ default: m.ContactOverviewTab })));
const ContactInteractionsTab = lazy(() => import('../tabs/ContactInteractionsTab').then(m => ({ default: m.ContactInteractionsTab })));
const ContactCallsTab = lazy(() => import('../tabs/ContactCallsTab').then(m => ({ default: m.ContactCallsTab })));
const ContactNotesTab = lazy(() => import('../tabs/ContactNotesTab').then(m => ({ default: m.ContactNotesTab })));

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
    // Config
    stats?: any;
    mockLedgerEntries: LedgerEntry[];
}

// ═══ Shared onChange handler builder ═══
function makeOnChange(setData: (fn: any) => void, setHasChanges: (v: boolean) => void) {
    return (updates: any) => {
        setData((prev: any) => ({ ...prev, ...updates }));
        setHasChanges(true);
    };
}

export function useTabContentRenderer(props: TabContentRendererProps) {
    const { t } = useLanguage();
    const {
        data, mode, docType, tradeMode, loading, companyId, documentId,
        currentStage, options, useArabicNumerals,
        setData, setHasChanges, onClose, onRefresh,
        openDocs, setOpenDocs, setActiveDocId,
        stats, mockLedgerEntries,
    } = props;

    const onChange = useCallback(makeOnChange(setData, setHasChanges), [setData, setHasChanges]);

    const renderTabContent = useCallback((tabId: string): React.ReactNode => {
        const content = renderTabContentInner(tabId);
        // Wrap lazy-loaded tabs in Suspense
        if (content && tabId !== 'entry' && tabId !== 'form' && tabId !== 'overview') {
            return <Suspense fallback={<TabLoading />}>{content}</Suspense>;
        }
        return content;
    }, [data, mode, docType, tradeMode, loading, companyId, documentId, currentStage, options, useArabicNumerals, onChange, openDocs, mockLedgerEntries]);

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
                            onSaveComplete={() => console.log('Entry saved successfully')}
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
                return (
                    <OverviewTab
                        data={data}
                        stats={stats}
                        currency={data?.currency || ''}
                        useArabicNumerals={useArabicNumerals}
                    />
                );

            case 'variants':
                if (docType === 'material') {
                    return <MaterialVariantsTab data={data} mode={mode} onChange={onChange} />;
                }
                break;

            case 'inventory':
                if (docType === 'material') {
                    return <MaterialInventoryTab data={data} onClose={onClose} />;
                }
                break;

            case 'movements':
                if (docType === 'material') return <MaterialMovementsTab data={data} />;
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
                        onEntryClick={(entry) => console.log('Entry clicked:', entry)}
                        onEntryOpen={(entry) => {
                            const newDocId = entry.id;
                            const existingDoc = openDocs.find(d => d.id === newDocId);
                            if (existingDoc) {
                                setActiveDocId(newDocId);
                            } else {
                                setOpenDocs(prev => [...prev, {
                                    id: newDocId,
                                    type: 'journal' as const,
                                    title: entry.entry_number || entry.description || 'Entry',
                                    titleAr: entry.entry_number || entry.description,
                                    code: entry.entry_number,
                                    data: entry,
                                    isClosable: true,
                                }]);
                                setActiveDocId(newDocId);
                            }
                        }}
                    />
                );

            case 'activity': {
                const resolveEntityType = () => {
                    if (tradeMode === 'purchase') {
                        const map: Record<string, string> = {
                            trade_order: 'purchase_orders', trade_invoice: 'purchase_transactions',
                            trade_quotation: 'purchase_quotations', trade_request: 'purchase_requests',
                            trade_receipt: 'purchase_receipts', trade_return: 'purchase_returns',
                            trade_container: 'shipments',
                        };
                        return map[docType];
                    }
                    const map: Record<string, string> = {
                        trade_order: 'sales_orders', trade_invoice: 'sales_transactions',
                        trade_quotation: 'quotations', trade_delivery: 'sales_deliveries',
                        trade_return: 'sales_returns',
                    };
                    return map[docType];
                };
                return (
                    <ActivityTab
                        documentId={documentId || data?.id}
                        entityType={resolveEntityType()}
                        useArabicNumerals={useArabicNumerals}
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

            case 'additionalInfo':
                if (docType === 'material') return <MaterialAdditionalInfoTab data={data} mode={mode} onChange={onChange} />;
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
                        readOnly={mode === 'view'}
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
                        supplierName={data?.supplier_name || data?.party_name || ''}
                        currency={data?.currency || ''}
                        transactionType={tradeMode === 'sales' ? 'sale' : 'purchase'}
                        companyId={companyId}
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

            case 'receipt_summary':
                return <ReceiptSummaryTab data={data} mode={mode} onChange={onChange} />;

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
