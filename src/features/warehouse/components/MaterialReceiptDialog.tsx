/**
 * ════════════════════════════════════════════════════════════════
 * 📦 MaterialReceiptDialog — مكوّن استلام المواد (Goods Receipt)
 * ════════════════════════════════════════════════════════════════
 *
 * مبني فوق UnifiedAccountingSheet بنفس نمط UnifiedTradeSheet
 * يوفر:
 *  - اختيار نوع المستند المصدر (فاتورة شراء / شراء داخلي / كونتينر / مناقلة / مرتجع)
 *  - اختيار المرجع من البيانات الحقيقية (Supabase)
 *  - ملخص الاستلام (المتوقع vs المستلم)
 *  - إنشاء جلسة استلام تلقائية عبر receiptLocalStore
 *  - حفظ تلقائي + مزامنة Supabase
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import type { UnifiedDocType } from '@/features/accounting/components/unified/types';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useWarehouses } from '../hooks/useWarehouseQueries';
import { useReceiptSources, type ReceiptTypeKey } from '../hooks/useReceiptSources';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowDownToLine, Truck, RotateCcw, PackageCheck, Ship,
    Wifi, WifiOff, Warehouse, ShoppingCart, FileText,
    ArrowLeftRight, Container,
} from 'lucide-react';
import {
    receiptLocalStore,
    type ReceiptSession,
    type ReceiptItem,
} from '../services/receiptLocalStore';
import { completeReceipt } from '../services/receiptCompletionService';
import { warehouseService } from '@/services/warehouseService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Receipt Type Definitions ────────────────────────────────
type ReceiptType = 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count';

interface ReceiptTypeDef {
    id: ReceiptType;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    billType: string;
}

const RECEIPT_TYPES: ReceiptTypeDef[] = [
    {
        id: 'purchase_local',
        labelAr: 'فاتورة شراء داخلي',
        labelEn: 'Local Purchase',
        icon: FileText,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        billType: 'purchase_receipt',
    },
    {
        id: 'container',
        labelAr: 'كونتينر',
        labelEn: 'Container',
        icon: Ship,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        billType: 'container_receipt',
    },
    {
        id: 'transfer',
        labelAr: 'مناقلة',
        labelEn: 'Transfer',
        icon: ArrowLeftRight,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        billType: 'transfer_receipt',
    },
    {
        id: 'return',
        labelAr: 'مرتجع',
        labelEn: 'Return',
        icon: RotateCcw,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        billType: 'return_receipt',
    },
    {
        id: 'stock_count',
        labelAr: 'جرد',
        labelEn: 'Stock Count',
        icon: ClipboardList,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
        billType: 'stock_count_receipt',
    },
];

// ─── Props ──────────────────────────────────────────────────
interface MaterialReceiptDialogProps {
    /** Custom trigger element; if absent, renders the default button */
    trigger?: React.ReactNode;
    /** Default bill type */
    defaultBillType?: ReceiptType;  // default: 'purchase_local'
    /** Default reference ID to auto-select */
    defaultReference?: string;
    /** Called when receipt is completed */
    onComplete?: () => void;
    /** Controlled open state */
    isOpen?: boolean;
    /** Controlled open change handler */
    onOpenChange?: (open: boolean) => void;
}

// ════════════════════════════════════════════════════════════════
// 🎯 Main Component 
// ════════════════════════════════════════════════════════════════

export function MaterialReceiptDialog({
    trigger,
    defaultBillType = 'purchase_local',
    defaultReference = '',
    onComplete,
    isOpen,
    onOpenChange
}: MaterialReceiptDialogProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();
    const { warehouses } = useWarehouses();

    // ─── Real data from Supabase ─────────────────────────────
    const {
        getDocumentsForReceiptType,
        getDocumentById,
        isLoading: isLoadingSources,
    } = useReceiptSources();

    // ─── State ───────────────────────────────────────────────
    // Controlled vs Uncontrolled logic
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = isOpen !== undefined;
    const open = isControlled ? isOpen : internalOpen;
    // Safe setter that handles both modes
    const setOpen = (newOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(newOpen);
        } else {
            setInternalOpen(newOpen);
        }
    };

    const [activeReceiptType, setActiveReceiptType] = useState<ReceiptType>(defaultBillType);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [selectedReference, setSelectedReference] = useState(defaultReference);
    const [session, setSession] = useState<ReceiptSession | null>(null);
    const [entryLocked, setEntryLocked] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    // 🔑 FIX: Independent live receipt items state — NOT derived from session
    // This prevents the useEffect([initialData]) in UnifiedAccountingSheet from overwriting items
    const [liveReceiptItems, setLiveReceiptItems] = useState<ReceiptItem[]>([]);
    // 🔑 Draft persistence: track the DB draft receipt ID
    const [draftReceiptId, setDraftReceiptId] = useState<string | null>(null);
    const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Online / Offline Listener ───────────────────────────
    useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // ─── Create/Restore Session on Open ──────────────────────
    useEffect(() => {
        if (open && companyId && tenantId && selectedWarehouseId) {
            const wh = warehouses.find(w => w.id === selectedWarehouseId);
            const typeDef = RECEIPT_TYPES.find(t => t.id === activeReceiptType);
            const newSession = receiptLocalStore.createSession({
                companyId,
                tenantId,
                warehouseId: selectedWarehouseId,
                warehouseName: wh ? (language === 'ar' ? (wh.name_ar || wh.name_en || '') : (wh.name_en || wh.name_ar || '')) : '',
                billType: typeDef?.billType || 'purchase_receipt',
                referenceId: selectedReference || undefined,
            });
            setSession(newSession);
        }
    }, [open, companyId, tenantId, selectedWarehouseId, activeReceiptType, warehouses, language]);

    // ─── Load Draft from DB on Open (resume after power/internet outage) ──
    useEffect(() => {
        if (!open || !selectedReference || !companyId) return;

        const loadDraft = async () => {
            try {
                // Try invoice_id first, then order_id
                let draft: any = null;

                const { data: invoiceDraft } = await supabase
                    .from('purchase_receipts')
                    .select('id, draft_data')
                    .eq('company_id', companyId)
                    .eq('invoice_id', selectedReference)
                    .eq('status', 'draft')
                    .maybeSingle();

                if (invoiceDraft) {
                    draft = invoiceDraft;
                } else {
                    const { data: orderDraft } = await supabase
                        .from('purchase_receipts')
                        .select('id, draft_data')
                        .eq('company_id', companyId)
                        .eq('order_id', selectedReference)
                        .eq('status', 'draft')
                        .maybeSingle();
                    draft = orderDraft;
                }

                if (draft?.id && draft?.draft_data) {
                    console.log('📂 Loading draft receipt:', draft.id, 'items:', (draft.draft_data as any)?.items?.length);
                    setDraftReceiptId(draft.id);
                    const items = (draft.draft_data as any)?.items || [];
                    if (items.length > 0) {
                        setLiveReceiptItems(items);
                        setEntryLocked(true);
                        toast.info(
                            language === 'ar'
                                ? `📂 تم تحميل ${items.length} بند محفوظ من المسودة`
                                : `📂 Loaded ${items.length} saved items from draft`,
                            { duration: 4000 }
                        );
                    }
                } else {
                    setDraftReceiptId(null);
                }
            } catch (err) {
                console.error('Failed to load draft:', err);
            }
        };

        loadDraft();
    }, [open, selectedReference, companyId, language]);



    // ─── Auto-select first warehouse ─────────────────────────
    useEffect(() => {
        if (warehouses.length > 0 && !selectedWarehouseId) {
            setSelectedWarehouseId(warehouses[0].id);
        }
    }, [warehouses, selectedWarehouseId]);

    // ─── Reset reference when type changes (but not on first mount) ───
    const isFirstMount = React.useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return; // Don't clear defaultReference on initial mount
        }
        setSelectedReference('');
    }, [activeReceiptType]);

    // ─── When reference changes, update warehouse from source doc ─
    useEffect(() => {
        if (selectedReference) {
            const doc = getDocumentById(selectedReference);
            if (doc?.warehouse_id) {
                setSelectedWarehouseId(doc.warehouse_id);
            }
        }
    }, [selectedReference]);

    const currentTypeDef = RECEIPT_TYPES.find(t => t.id === activeReceiptType) || RECEIPT_TYPES[0];

    // ─── Get available references for current type (REAL DATA) ─
    const availableReferences = useMemo(() => {
        return getDocumentsForReceiptType(activeReceiptType as ReceiptTypeKey);
    }, [activeReceiptType, getDocumentsForReceiptType]);

    // ─── Get selected document ───────────────────────────────
    const selectedDocument = useMemo(() => {
        if (!selectedReference) return null;
        return getDocumentById(selectedReference) || null;
    }, [selectedReference, getDocumentById]);

    // ─── Get reference label ─────────────────────────────────
    const getReferenceLabel = useMemo(() => {
        return selectedDocument?.label || '';
    }, [selectedDocument]);

    // ─── Auto-save Draft to DB when items change ─────────────
    useEffect(() => {
        if (!open || !selectedReference || !companyId || !tenantId) return;
        if (liveReceiptItems.length === 0) return;

        // Debounce: save after 5 seconds of no changes
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                if (draftReceiptId) {
                    // Update existing draft
                    await warehouseService.updateDraftReceipt(draftReceiptId, liveReceiptItems);
                    console.log('💾 Draft auto-saved (update):', draftReceiptId);
                } else {
                    // Create new draft
                    const result = await warehouseService.createDraftReceipt({
                        tenantId,
                        companyId,
                        warehouseId: selectedWarehouseId,
                        sourceDocumentId: selectedReference,
                        sourceDocumentType: selectedDocument?.type === 'purchase_order'
                            ? 'purchase_order' : 'purchase_invoice',
                        supplierId: selectedDocument?.supplier_id,
                        items: liveReceiptItems,
                    });
                    if (result) {
                        setDraftReceiptId(result.id);
                        console.log('💾 Draft auto-saved (new):', result.id);
                    }
                }
            } catch (err) {
                console.error('Auto-save draft failed:', err);
            }
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [liveReceiptItems, open, selectedReference, companyId, tenantId, selectedWarehouseId, draftReceiptId, selectedDocument]);

    // ─── Lock callback — passed to GoodsReceiptItemsTab via data ──
    const handleEntryStarted = useCallback(() => {
        setEntryLocked(true);
    }, []);

    const hasStartedEntry = entryLocked;

    // ─── Intercept onChange from GoodsReceiptItemsTab ─────────
    // This keeps liveReceiptItems in sync so enhancedData stays fresh
    const handleReceiptDataChange = useCallback((updates: any) => {
        if (updates?.receipt_items) {
            setLiveReceiptItems(updates.receipt_items);
        }
    }, []);

    // ─── Build enhanced data for UnifiedAccountingSheet ──────
    // 🔑 FIX: Uses liveReceiptItems instead of session?.items
    const enhancedData = useMemo(() => {
        const wh = warehouses.find(w => w.id === selectedWarehouseId);
        return {
            // Session meta
            sessionId: session?.sessionId || '',
            status: session?.status || 'draft',
            date: new Date().toISOString().split('T')[0],
            // Warehouse info
            warehouse_id: selectedWarehouseId,
            warehouse_name: wh ? (language === 'ar' ? (wh.name_ar || wh.name_en || '') : (wh.name_en || wh.name_ar || '')) : '',
            // Type info
            type: 'warehouse',
            subType: activeReceiptType,
            billType: currentTypeDef.billType,
            // Reference info
            reference: selectedReference,
            referenceLabel: getReferenceLabel,
            // Source document data (for ReceiptSummaryTab)
            source_document: selectedDocument,
            source_items: selectedDocument?.items || [],
            // Receipt items — 🔑 from LIVE state, not stale session snapshot
            receipt_items: liveReceiptItems,
            // Counters for stats (also from live state)
            rolls_count: liveReceiptItems.length,
            total_length: liveReceiptItems.reduce((s, i) => s + (i.rollLength || 0), 0),
            // Lock callback
            onEntryStarted: handleEntryStarted,
            // 🔑 Pass the interceptor so UnifiedAccountingSheet can forward changes
            onReceiptDataChange: handleReceiptDataChange,
        };
    }, [session, selectedWarehouseId, warehouses, language, activeReceiptType, currentTypeDef, selectedReference, getReferenceLabel, selectedDocument, handleEntryStarted, liveReceiptItems, handleReceiptDataChange]);

    // ─── Handle Save ─────────────────────────────────────────
    const handleSave = useCallback(async (data: any) => {
        if (!session) {
            toast.error(language === 'ar' ? 'لا توجد جلسة نشطة' : 'No active session');
            return;
        }

        // 🔑 FIX: Use liveReceiptItems first, fallback to localStorage
        let items = liveReceiptItems.length > 0 ? liveReceiptItems : [];
        if (items.length === 0) {
            // Fallback: try localStorage
            const currentSession = receiptLocalStore.getSession(session.sessionId);
            items = currentSession?.items || [];
        }

        if (items.length === 0) {
            toast.error(language === 'ar' ? 'لا توجد بنود للحفظ' : 'No items to save');
            return;
        }

        // Determine source document type
        let sourceDocType: 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' = 'purchase_invoice';
        if (selectedDocument) {
            if (selectedDocument.type === 'purchase_order') sourceDocType = 'purchase_order';
            else if (selectedDocument.type === 'purchase_invoice_local') sourceDocType = 'purchase_invoice_local';
            else sourceDocType = 'purchase_invoice';
        }

        toast.loading(language === 'ar' ? 'جاري حفظ الاستلام...' : 'Saving receipt...');

        // 🔍 Debug logging for receipt completion
        console.log('📦 [Receipt] Saving receipt:', {
            itemsCount: items.length,
            itemsSource: liveReceiptItems.length > 0 ? 'liveReceiptItems' : 'localStorage',
            sourceDocType,
            sourceDocNumber: selectedDocument?.document_number,
            sourceItemsCount: selectedDocument?.items?.length || 0,
            sourceItems: (selectedDocument?.items || []).map((si: any) => ({
                material_id: si.material_id || si.product_id,
                quantity: si.quantity,
                unit_price: si.unit_price,
                total: si.total,
                subtotal: si.subtotal,
            })),
            receiptItems: items.map(i => ({
                materialId: i.materialId,
                rollLength: i.rollLength,
                rollNumber: i.rollNumber,
            })),
        });

        const result = await completeReceipt({
            sessionId: session.sessionId,
            tenantId: tenantId || '',
            companyId: companyId || '',
            warehouseId: selectedWarehouseId,
            sourceDocumentId: selectedReference,
            sourceDocumentType: sourceDocType,
            sourceDocumentNumber: selectedDocument?.document_number || '',
            supplierId: selectedDocument?.supplier_id || undefined,
            items,
            sourceItems: selectedDocument?.items || [],
            notes: `Receipt via MaterialReceiptDialog`,
            createdBy: undefined, // Will be set by RLS
        });

        toast.dismiss();

        if (result.success) {
            // Complete local session
            receiptLocalStore.completeSession(session.sessionId);

            const msg = language === 'ar'
                ? `✅ تم الاستلام بنجاح\n📋 رقم الاستلام: ${result.receiptNumber}\n📦 البنود: ${result.details.receiptItemsCreated}\n🎲 الرولونات: ${result.details.fabricRollsSynced}\n${result.details.sourceUpdated ? '✅ تم تحديث حالة المستند' : '⚠️ لم يتم تحديث حالة المستند'}\n${result.details.journalEntryId ? '✅ تم إنشاء القيد المحاسبي' : '⚠️ لم يتم إنشاء القيد'}`
                : `✅ Receipt completed\n📋 Receipt #: ${result.receiptNumber}\n📦 Items: ${result.details.receiptItemsCreated}\n🎲 Rolls: ${result.details.fabricRollsSynced}\n${result.details.sourceUpdated ? '✅ Source updated' : '⚠️ Source not updated'}\n${result.details.journalEntryId ? '✅ Journal entry created' : '⚠️ No journal entry'}`;

            toast.success(msg, { duration: 6000 });
            onComplete?.();
            setOpen(false);
            setSession(null);
            setEntryLocked(false);
        } else {
            toast.error(
                language === 'ar'
                    ? `❌ خطأ في حفظ الاستلام: ${result.error}`
                    : `❌ Receipt save failed: ${result.error}`,
                { duration: 8000 }
            );
        }
    }, [session, selectedDocument, selectedReference, selectedWarehouseId, tenantId, companyId, language, onComplete]);

    // ─── Handle Close (saves draft if items exist) ───────────
    const handleClose = async () => {
        // 🔑 Save draft to DB before closing if there are items
        if (liveReceiptItems.length > 0 && selectedReference && companyId && tenantId) {
            try {
                if (draftReceiptId) {
                    await warehouseService.updateDraftReceipt(draftReceiptId, liveReceiptItems);
                } else {
                    await warehouseService.createDraftReceipt({
                        tenantId,
                        companyId,
                        warehouseId: selectedWarehouseId,
                        sourceDocumentId: selectedReference,
                        sourceDocumentType: selectedDocument?.type === 'purchase_order'
                            ? 'purchase_order' : 'purchase_invoice',
                        supplierId: selectedDocument?.supplier_id,
                        items: liveReceiptItems,
                    });
                }
                toast.info(
                    language === 'ar'
                        ? '💾 تم حفظ المسودة — يمكنك المتابعة لاحقاً'
                        : '💾 Draft saved — you can continue later',
                    { duration: 3000 }
                );
            } catch (err) {
                console.error('Failed to save draft on close:', err);
            }
        }

        setOpen(false);
        setSession(null);
        setEntryLocked(false);
        setLiveReceiptItems([]);
        setDraftReceiptId(null);
    };

    // ─── Reference Placeholder Text ──────────────────────────
    const getReferencePlaceholder = () => {
        const map: Record<ReceiptType, { ar: string; en: string }> = {
            purchase_local: { ar: 'اختر أمر الشراء أو الفاتورة', en: 'Select PO or Invoice' },
            container: { ar: 'اختر الكونتينر', en: 'Select container' },
            transfer: { ar: 'اختر فاتورة المناقلة', en: 'Select transfer' },
            return: { ar: 'اختر فاتورة المرتجع', en: 'Select return' },
            stock_count: { ar: 'اختر الجرد المجدول', en: 'Select scheduled count' },
        };
        const entry = map[activeReceiptType];
        return language === 'ar' ? entry.ar : entry.en;
    };

    // ─── Reference Icon ──────────────────────────────────────
    const getReferenceIcon = () => {
        const map: Record<ReceiptType, { ar: string; en: string }> = {
            purchase_local: { ar: 'رقم أمر الشراء / الفاتورة:', en: 'PO / Invoice #:' },
            container: { ar: 'رقم الكونتينر:', en: 'Container #:' },
            transfer: { ar: 'رقم المناقلة:', en: 'Transfer #:' },
            return: { ar: 'رقم المرتجع:', en: 'Return #:' },
            stock_count: { ar: 'رقم الجرد:', en: 'Count #:' },
        };
        const entry = map[activeReceiptType];
        return language === 'ar' ? entry.ar : entry.en;
    };

    // ─── Receipt Progress ─────────────────────────────────────
    const receiptProgress = useMemo(() => {
        if (!selectedDocument) return { percent: 0, received: 0, total: 0, pending: 0 };
        const totalItems = selectedDocument.items.length;
        const receivedItems = (session?.items || []).length;
        const percent = totalItems > 0 ? Math.min(100, (receivedItems / totalItems) * 100) : 0;
        return { percent, received: receivedItems, total: totalItems, pending: totalItems - receivedItems };
    }, [selectedDocument, session]);

    // ─── Header Extra — below toolbar ────────────────────────
    const HeaderExtra = (
        <div className="flex flex-col gap-0 border-b">
            {/* ═══ Row 1: Warehouse + Document Selector ═══ */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-900 dark:to-slate-800 border-b">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Receipt Type */}
                    <Select
                        value={activeReceiptType}
                        onValueChange={(v) => setActiveReceiptType(v as ReceiptType)}
                        disabled={hasStartedEntry}
                    >
                        <SelectTrigger className={`h-9 w-[170px] gap-2 text-sm font-semibold ${currentTypeDef.color} bg-white dark:bg-slate-800 shadow-sm ${hasStartedEntry ? 'opacity-70 cursor-not-allowed' : ''}`}>
                            <div className={`p-1 rounded-md ${currentTypeDef.bgColor}`}>
                                <currentTypeDef.icon className="w-3.5 h-3.5" />
                            </div>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RECEIPT_TYPES.map(rt => {
                                const Icon = rt.icon;
                                return (
                                    <SelectItem key={rt.id} value={rt.id}>
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-md ${rt.bgColor} ${rt.color}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm">{isRTL ? rt.labelAr : rt.labelEn}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    {/* Warehouse */}
                    <div className="flex items-center gap-1.5">
                        <Warehouse className="w-4 h-4 text-gray-400" />
                        <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId} disabled={hasStartedEntry}>
                            <SelectTrigger className={`h-9 w-[170px] text-sm bg-white dark:bg-slate-800 shadow-sm ${hasStartedEntry ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <SelectValue placeholder={isRTL ? 'اختر المستودع' : 'Select warehouse'} />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map(wh => (
                                    <SelectItem key={wh.id} value={wh.id}>
                                        {language === 'ar' ? (wh.name_ar || wh.name_en) : (wh.name_en || wh.name_ar)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-7 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                    {/* Document Selector */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <FileText className={`w-4 h-4 shrink-0 ${currentTypeDef.color}`} />
                        <Select value={selectedReference} onValueChange={setSelectedReference} disabled={hasStartedEntry}>
                            <SelectTrigger className={`h-9 flex-1 max-w-[350px] text-sm bg-white dark:bg-slate-800 shadow-sm border-gray-300 ${hasStartedEntry ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <SelectValue placeholder={getReferencePlaceholder()} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {isLoadingSources ? (
                                    <SelectItem value="_loading" disabled>
                                        <div className="flex items-center gap-2 py-1">
                                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                            <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
                                        </div>
                                    </SelectItem>
                                ) : availableReferences.length > 0 ? (
                                    availableReferences.map(doc => (
                                        <SelectItem key={doc.id} value={doc.id}>
                                            <div className="flex items-center gap-3 py-0.5">
                                                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                    {doc.document_number}
                                                </span>
                                                <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[160px]">
                                                    {doc.supplier_name || ''}
                                                </span>
                                                {doc.type === 'purchase_order' && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-blue-50 text-blue-600 border-blue-200">
                                                        {isRTL ? 'أمر شراء' : 'PO'}
                                                    </Badge>
                                                )}
                                                {(doc.type === 'purchase_invoice' || doc.type === 'purchase_invoice_local') && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-green-50 text-green-600 border-green-200">
                                                        {isRTL ? 'فاتورة' : 'INV'}
                                                    </Badge>
                                                )}
                                                {doc.total_amount > 0 && (
                                                    <span className="text-xs text-gray-500 font-mono ms-auto">
                                                        {doc.total_amount.toLocaleString()} {doc.currency}
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="_empty" disabled>
                                        <span className="text-sm text-muted-foreground">
                                            {isRTL ? 'لا توجد مستندات بانتظار الاستلام' : 'No documents pending receipt'}
                                        </span>
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        {hasStartedEntry && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md shrink-0" title={isRTL ? 'لا يمكن تغيير الفاتورة بعد بدء الإدخال' : 'Cannot change invoice after entry started'}>
                                🔒 {isRTL ? 'مقفل' : 'Locked'}
                            </div>
                        )}
                    </div>

                    {/* Online Badge */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium shrink-0 ${isOnline
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {isOnline ? (isRTL ? 'متصل' : 'Online') : (isRTL ? 'غير متصل' : 'Offline')}
                    </div>
                </div>
            </div>

            {/* ═══ Row 2: Document Info + Progress (only when document selected) ═══ */}
            {selectedDocument && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
                    {/* Document Info Row */}
                    <div className="flex items-center gap-4 mb-2">
                        {/* Supplier & Document Number */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg ${currentTypeDef.bgColor} flex items-center justify-center shrink-0`}>
                                <currentTypeDef.icon className={`w-4 h-4 ${currentTypeDef.color}`} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                    {selectedDocument.supplier_name || selectedDocument.document_number}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                    {selectedDocument.document_number}
                                </div>
                            </div>
                        </div>

                        {/* Stats Chips */}
                        <div className="flex items-center gap-2 ms-auto shrink-0">
                            {/* Items count */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{isRTL ? 'البنود' : 'Items'}</span>
                                <span className="text-sm font-bold text-blue-600">{selectedDocument.items.length}</span>
                            </div>
                            {/* Total Amount */}
                            {selectedDocument.total_amount > 0 && (
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                    <span className="text-[10px] text-gray-500">{isRTL ? 'المبلغ' : 'Amount'}</span>
                                    <span className="text-sm font-bold text-emerald-600 font-mono">
                                        {selectedDocument.total_amount.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{selectedDocument.currency}</span>
                                </div>
                            )}
                            {/* Received count */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{isRTL ? 'مستلم' : 'Received'}</span>
                                <span className={`text-sm font-bold ${receiptProgress.received > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {receiptProgress.received}
                                </span>
                            </div>
                            {/* Pending */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{isRTL ? 'متبقي' : 'Pending'}</span>
                                <span className={`text-sm font-bold ${receiptProgress.pending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {receiptProgress.pending}
                                </span>
                            </div>
                            {/* Status */}
                            <Badge variant="outline" className="text-[10px] capitalize bg-blue-50 text-blue-600 border-blue-200">
                                {selectedDocument.status}
                            </Badge>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-medium shrink-0">
                            {isRTL ? 'تقدم الاستلام' : 'Progress'}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${receiptProgress.percent >= 100
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : receiptProgress.percent > 0
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                        : 'bg-gray-300'
                                    }`}
                                style={{ width: `${receiptProgress.percent}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold font-mono min-w-[40px] text-end ${receiptProgress.percent >= 100 ? 'text-green-600' : 'text-blue-600'
                            }`}>
                            {receiptProgress.percent.toFixed(0)}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* ─── Trigger Button ─── */}
            {trigger ? (
                <div onClick={() => setOpen(true)}>{trigger}</div>
            ) : (
                <Button
                    onClick={() => setOpen(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2 shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.02]"
                >
                    <ArrowDownToLine className="h-4 w-4" />
                    {language === 'ar' ? 'استلام مواد' : 'Receive Materials'}
                </Button>
            )}

            {/* ─── Unified Accounting Sheet ─── */}
            <UnifiedAccountingSheet
                isOpen={open}
                onClose={handleClose}
                docType={'goods_receipt' as UnifiedDocType}
                mode="create"
                data={enhancedData}
                onSave={handleSave}
                headerExtra={HeaderExtra}
                onRefresh={onComplete}
                defaultTab="goods_receipt_items"
            />
        </>
    );
}

export default MaterialReceiptDialog;
