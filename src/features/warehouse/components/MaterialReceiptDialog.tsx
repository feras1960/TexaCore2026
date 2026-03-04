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

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
    ArrowDownToLine, Truck, RotateCcw, PackageCheck, Ship,
    Wifi, WifiOff, Warehouse, ShoppingCart, FileText,
    ArrowLeftRight, Container, CheckCircle2, AlertTriangle, ExternalLink,
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
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';

// ─── Receipt Type Definitions ────────────────────────────────
type ReceiptType = 'purchase_local' | 'container' | 'transfer' | 'return' | 'stock_count' | 'sales_delivery';

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
    {
        id: 'sales_delivery',
        labelAr: 'تسليم مبيعات',
        labelEn: 'Sales Delivery',
        icon: Truck,
        color: 'text-rose-600',
        bgColor: 'bg-rose-100',
        billType: 'sales_delivery',
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
    /** ✅ وضع العرض: يفتح إذن استلام مكتمل للعرض فقط */
    viewMode?: boolean;
    /** ✅ معرف إذن الاستلام المكتمل (purchase_receipts.id) */
    receiptId?: string;
    /** ✅ Callback عند الضغط على قفز الوثيقة الأم (اختياري) */
    onOpenSourceDocument?: (sourceId: string, sourceType: string) => void;
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
    onOpenChange,
    viewMode = false,
    receiptId,
    onOpenSourceDocument,
}: MaterialReceiptDialogProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();
    const { warehouses } = useWarehouses();
    // ✅ حالة التعديل في وضع العرض
    const [isEditing, setIsEditing] = useState(false);
    // 🔒 تتبع حالة قفل الكونتينر (closed) — عند القفل لا يسمح بالتعديل نهائياً
    const [isContainerClosed, setIsContainerClosed] = useState(false);
    // وضع العرض الفعلي (viewMode prop + ليس في وضع تعديل)
    const effectiveViewMode = viewMode && !isEditing;

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

    // 🔑 Sync props → state when dialog reopens with new defaults
    useEffect(() => {
        if (open && defaultReference) {
            setSelectedReference(defaultReference);
        }
    }, [open, defaultReference]);
    useEffect(() => {
        if (open && defaultBillType) {
            setActiveReceiptType(defaultBillType);
        }
    }, [open, defaultBillType]);
    const [session, setSession] = useState<ReceiptSession | null>(null);
    const [entryLocked, setEntryLocked] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    // 🔑 FIX: Independent live receipt items state — NOT derived from session
    // This prevents the useEffect([initialData]) in UnifiedAccountingSheet from overwriting items
    const [liveReceiptItems, setLiveReceiptItems] = useState<ReceiptItem[]>([]);
    // 🔑 Draft persistence: track the DB draft receipt ID
    const [draftReceiptId, setDraftReceiptId] = useState<string | null>(null);
    // 🔑 Receipt confirmation dialog
    const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    // 🔑 Completed receipt metadata (for view mode badge + status)
    const [completedReceiptInfo, setCompletedReceiptInfo] = useState<{
        id: string;
        receiptNumber?: string;
        completedAt?: string;
    } | null>(null);
    const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDeletingRef = useRef(false);

    // ✅ حالة فتح الوثيقة الأم (فاتورة أو كونتينر) فوق إذن الاستلام
    const [sourceDocSheet, setSourceDocSheet] = React.useState<{
        open: boolean;
        type: 'invoice' | 'container' | 'transfer';
        data: any;
    } | null>(null);
    const [loadingSourceDoc, setLoadingSourceDoc] = React.useState(false);

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

    // ─── Create/Restore Session on Open (skip in viewMode) ───────────────
    useEffect(() => {
        if (viewMode) return;  // لا تنشئ session في وضع العرض
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
    }, [open, companyId, tenantId, selectedWarehouseId, activeReceiptType, warehouses, language, viewMode]);


    // ─── Load Draft / Completed Receipt on Open ───────────────
    useEffect(() => {
        if (!open || !selectedReference || !companyId) return;

        const loadDraft = async () => {
            try {
                const resolvedType = resolveSourceDocumentType();

                // ══════════════════════════════════════════════════════════
                // 🔑 HELPER: جلب الرولونات المستلمة لاستلام مكتمل
                // الأولوية: container_id → notes 'GRN:' → receipt_items→material
                // ══════════════════════════════════════════════════════════
                const loadCompletedRolls = async (rec: { id: string; container_id?: string | null }): Promise<ReceiptItem[]> => {
                    const rid = rec.id;

                    // ── 1: كونتينر → fabric_rolls.container_id (ربط مباشر) ──
                    if (rec.container_id) {
                        const { data: rolls } = await supabase.from('fabric_rolls')
                            .select('id, roll_number, material_id, current_length, color_id, color_name')
                            .eq('container_id', rec.container_id);
                        if (rolls && rolls.length > 0) {
                            console.log('✅ [loadDraft] container_id rolls:', rolls.length);
                            return rolls.map((r: any) => ({
                                id: r.id, localId: `view-${r.id}`, batchId: '',
                                materialId: r.material_id || '', materialName: '',
                                rollNumber: r.roll_number || '', rollLength: r.current_length ?? 0,
                                colorId: r.color_id || '', colorName: r.color_name || '',
                                position: 0, timestamp: Date.now(),
                                source: 'manual' as const, syncStatus: 'synced' as const,
                                createdAt: new Date().toISOString(),
                            } as ReceiptItem));
                        }
                    }

                    // ── 2: fabric_rolls.notes = 'GRN: {receiptId}' (مشتريات) ──
                    const { data: byNote } = await supabase.from('fabric_rolls')
                        .select('id, roll_number, material_id, current_length, color_id, color_name')
                        .like('notes', `GRN: ${rid}%`);
                    if (byNote && byNote.length > 0) {
                        console.log('✅ [loadDraft] notes-GRN rolls:', byNote.length);
                        return byNote.map((r: any) => ({
                            id: r.id, localId: `view-${r.id}`, batchId: '',
                            materialId: r.material_id || '', materialName: '',
                            rollNumber: r.roll_number || '', rollLength: r.current_length ?? 0,
                            colorId: r.color_id || '', colorName: r.color_name || '',
                            position: 0, timestamp: Date.now(),
                            source: 'manual' as const, syncStatus: 'synced' as const,
                            createdAt: new Date().toISOString(),
                        } as ReceiptItem));
                    }

                    // ── 3: Fallback — receipt_items → material_id → fabric_rolls ──
                    const { data: receiptItems } = await supabase
                        .from('purchase_receipt_items')
                        .select('material_id, quantity_received')
                        .eq('receipt_id', rid);
                    if (receiptItems && receiptItems.length > 0) {
                        const matIds = [...new Set(receiptItems.map((i: any) => i.material_id).filter(Boolean))] as string[];
                        const { data: fr } = await supabase.from('fabric_rolls')
                            .select('id, roll_number, material_id, current_length, color_id, color_name')
                            .in('material_id', matIds)
                            .in('status', ['in_stock', 'available', 'received', 'sold']);
                        if (fr && fr.length > 0) {
                            console.log('✅ [loadDraft] receipt_items→material rolls:', fr.length);
                            return fr.map((r: any) => ({
                                id: r.id, localId: `view-${r.id}`, batchId: '',
                                materialId: r.material_id || '', materialName: '',
                                rollNumber: r.roll_number || '', rollLength: r.current_length ?? 0,
                                colorId: r.color_id || '', colorName: r.color_name || '',
                                position: 0, timestamp: Date.now(),
                                source: 'manual' as const, syncStatus: 'synced' as const,
                                createdAt: new Date().toISOString(),
                            } as ReceiptItem));
                        }
                    }
                    console.log('⚠️ [loadDraft] No rolls found for receipt:', rid);
                    return [];
                };

                // ══════════════════════════════════════════════════════════
                // ✅ SHORTCUT: viewMode + receiptId مُعطى صراحةً من props
                // ══════════════════════════════════════════════════════════
                if (viewMode && receiptId) {
                    console.log('🔍 [loadDraft] viewMode shortcut — receiptId:', receiptId);
                    const { data: rec } = await supabase
                        .from('purchase_receipts')
                        .select('id, status, container_id, receipt_number, updated_at')
                        .eq('id', receiptId)
                        .maybeSingle();
                    if (rec) {
                        if (rec.status === 'completed') {
                            setCompletedReceiptInfo({ id: rec.id, receiptNumber: rec.receipt_number, completedAt: rec.updated_at });
                        }
                        // 🔒 تحقق من حالة الكونتينر — إذا closed → لا تعديل
                        if (rec.container_id) {
                            const { data: container } = await supabase
                                .from('containers')
                                .select('status')
                                .eq('id', rec.container_id)
                                .maybeSingle();
                            if (container?.status === 'closed') {
                                setIsContainerClosed(true);
                            }
                        }
                        const viewItems = await loadCompletedRolls(rec);
                        setLiveReceiptItems(viewItems);
                        setEntryLocked(true);
                    } else {
                        setEntryLocked(true);
                    }
                    return;
                }

                // ══════════════════════════════════════════════════════════
                // 🔍 SEARCH PATH: البحث بـ selectedReference
                // ══════════════════════════════════════════════════════════
                console.log('🔍 [loadDraft] Searching...', { selectedReference, resolvedType });

                const searchOrder: Array<{ column: string }> =
                    resolvedType === 'container'
                        ? [{ column: 'container_id' }, { column: 'invoice_id' }]
                        : resolvedType === 'purchase_order'
                            ? [{ column: 'order_id' }, { column: 'invoice_id' }]
                            : [{ column: 'invoice_id' }, { column: 'order_id' }, { column: 'container_id' }];

                let foundReceipt: any = null;
                let isCompleted = false;

                for (const { column } of searchOrder) {
                    if (foundReceipt) break;
                    // 1. مسودة (draft)
                    const { data: draftRec } = await supabase
                        .from('purchase_receipts')
                        .select('id, draft_data, container_id, status')
                        .eq('company_id', companyId).eq(column, selectedReference)
                        .eq('status', 'draft')
                        .order('created_at', { ascending: false }).limit(1).maybeSingle();
                    if (draftRec) { foundReceipt = draftRec; isCompleted = false; break; }

                    // 2. مكتمل (completed) — ⚠️ الحالة الفعلية في DB هي 'completed' لا 'received'
                    const { data: completedRec } = await supabase
                        .from('purchase_receipts')
                        .select('id, container_id, status, receipt_number, updated_at')
                        .eq('company_id', companyId).eq(column, selectedReference)
                        .eq('status', 'completed')
                        .order('created_at', { ascending: false }).limit(1).maybeSingle();
                    if (completedRec) { foundReceipt = completedRec; isCompleted = true; }
                }

                console.log('🔍 [loadDraft] Result:', { found: !!foundReceipt, isCompleted, id: foundReceipt?.id });

                // ─── استلام مكتمل → عرض الرولونات ───
                if (isCompleted && foundReceipt?.id) {
                    setCompletedReceiptInfo({
                        id: foundReceipt.id,
                        receiptNumber: foundReceipt.receipt_number,
                        completedAt: foundReceipt.updated_at,
                    });
                    const viewItems = await loadCompletedRolls(foundReceipt);
                    setLiveReceiptItems(viewItems);
                    setEntryLocked(true);
                    return;
                }

                // ─── مسودة → تحميلها للاستكمال ───
                if (foundReceipt?.id && foundReceipt?.draft_data && !isCompleted) {
                    setDraftReceiptId(foundReceipt.id);
                    const items = (foundReceipt.draft_data as any)?.items || [];
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
                console.error('❌ [loadDraft] Failed:', err);
            }
        };

        loadDraft();
    }, [open, selectedReference, companyId, language, activeReceiptType, viewMode, receiptId]);



    // ─── Auto-select first warehouse ─────────────────────────
    useEffect(() => {
        if (warehouses.length > 0 && !selectedWarehouseId) {
            setSelectedWarehouseId(warehouses[0].id);
        }
    }, [warehouses, selectedWarehouseId]);

    // ─── Reset reference when type changes (but not on first mount) ───
    // Removed buggy useEffect here. The reference should ONLY clear when the
    // user manually changes the receipt type in the UI, not when React syncs
    // the initial state from props (e.g., when opening a pending 'container' receipt).

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

    // ─── Helper: Determine the correct source document type ─────
    // Uses activeReceiptType (UI tab) as the primary source of truth,
    // with selectedDocument?.type as a secondary fallback.
    const resolveSourceDocumentType = useCallback((): 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'purchase_transaction' | 'container' => {
        // Primary: UI tab selection (always reliable)
        if (activeReceiptType === 'container') return 'container';
        if (activeReceiptType === 'sales_delivery') return 'purchase_invoice'; // Reuse same structure
        // Secondary: selected document type
        const docType = selectedDocument?.type;
        if (docType === 'purchase_order') return 'purchase_order';
        if (docType === 'container') return 'container';
        return 'purchase_invoice';
    }, [activeReceiptType, selectedDocument?.type]);

    // ─── Auto-save Draft to DB when items change ─────────────
    useEffect(() => {
        if (!open || !selectedReference || !companyId || !tenantId) return;
        if (liveReceiptItems.length === 0) return;
        // 🔑 لا تحفظ مسودة في وضع العرض أو عند استلام مكتمل
        if (viewMode || completedReceiptInfo) return;

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
                    // Create new draft — use resolveSourceDocumentType for reliable type detection
                    const result = await warehouseService.createDraftReceipt({
                        tenantId,
                        companyId,
                        warehouseId: selectedWarehouseId,
                        sourceDocumentId: selectedReference,
                        sourceDocumentType: resolveSourceDocumentType(),
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
    }, [liveReceiptItems, open, selectedReference, companyId, tenantId, selectedWarehouseId, draftReceiptId, resolveSourceDocumentType, selectedDocument?.supplier_id]);

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
            // ⚠️ استخدم 'received' للاستلامات المكتملة بدل 'draft'
            status: isContainerClosed ? 'closed' : (completedReceiptInfo ? 'received' : (session?.status || 'draft')),
            date: completedReceiptInfo?.completedAt
                ? completedReceiptInfo.completedAt.split('T')[0]
                : new Date().toISOString().split('T')[0],
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

    // ─── Handle Complete Receipt (called after confirmation) ─────
    // NOTE: handleSave is defined below — we use a ref to avoid circular deps
    const handleSaveRef = useRef<((data: any) => Promise<void>) | null>(null);
    const handleCompleteReceipt = useCallback(async () => {
        if (!session) {
            toast.error(language === 'ar' ? 'لا توجد جلسة نشطة' : 'No active session');
            return;
        }
        let items = liveReceiptItems.length > 0 ? liveReceiptItems : [];
        if (items.length === 0) {
            const currentSession = receiptLocalStore.getSession(session.sessionId);
            items = currentSession?.items || [];
        }
        if (items.length === 0) {
            toast.error(language === 'ar' ? 'لا توجد بنود للاستلام' : 'No items to receive');
            return;
        }
        // Call via ref to avoid "used before declaration"
        if (handleSaveRef.current) {
            await handleSaveRef.current({});
        }
    }, [session, liveReceiptItems, language]);


    // ─── Tolerance: per-document > company_settings > fallback 1% ───
    // Priority:
    //   1. selectedDocument.variance_tolerance_pct  (per-invoice/container override)
    //   2. Company settings  receipt_variance_tolerance_pct  (TODO: wire from useCompanySettings)
    //   3. Default: 1%
    const VARIANCE_TOLERANCE_PCT = useMemo(() => {
        const docTolerance = (selectedDocument as any)?.variance_tolerance_pct;
        if (docTolerance != null && !isNaN(Number(docTolerance))) return Number(docTolerance);
        // TODO: replace 1 with value from company settings when hook is available
        return 1;
    }, [selectedDocument]);

    // ─── Build receipt summary for confirm dialog ────────────
    // Groups by materialId ONLY — avoids color-ID mismatch issues
    // Colors are collected as display metadata, not grouping keys
    const receiptSummary = useMemo(() => {
        if (!selectedDocument || liveReceiptItems.length === 0) return null;

        const sourceItems = (selectedDocument.items as any[]) || [];

        // SUM expected quantities by materialId (handles multiple source lines per material)
        const sourceByMat: Record<string, number> = {};
        for (const si of sourceItems) {
            const matId = si.material_id || si.product_id || 'unknown';
            sourceByMat[matId] = (sourceByMat[matId] || 0) + (Number(si.quantity) || 0);
        }

        // Group received items by materialId ONLY
        const grouped: Record<string, {
            name: string;
            colors: string[];          // distinct color names for display
            totalLength: number;
            rolls: number;
            sourceMeter: number;
            diffPct: number;
            withinTolerance: boolean;
        }> = {};

        for (const item of liveReceiptItems) {
            const matId = item.materialId || 'unknown';
            // Normalize color name from all possible fields
            const colorName = (
                (item as any).colorName
                || (item as any).colour_name
                || (item as any).color_name
                || (item as any).color
                || ''
            ).trim();

            if (!grouped[matId]) {
                grouped[matId] = {
                    name: item.materialName || matId.substring(0, 8),
                    colors: [],
                    totalLength: 0,
                    rolls: 0,
                    sourceMeter: sourceByMat[matId] ?? 0,
                    diffPct: 0,
                    withinTolerance: true,
                };
            }

            grouped[matId].totalLength += item.rollLength || 0;
            grouped[matId].rolls += 1;

            // Collect distinct colors for display
            if (colorName && !grouped[matId].colors.includes(colorName)) {
                grouped[matId].colors.push(colorName);
            }
        }

        // Calculate variance per material
        for (const g of Object.values(grouped)) {
            if (g.sourceMeter > 0) {
                g.diffPct = ((g.totalLength - g.sourceMeter) / g.sourceMeter) * 100;
                g.withinTolerance = Math.abs(g.diffPct) <= VARIANCE_TOLERANCE_PCT;
            } else {
                // Received material not in source document → unexpected excess
                g.diffPct = 100;
                g.withinTolerance = false;
            }
        }

        const totalMeters = liveReceiptItems.reduce((s, i) => s + (i.rollLength || 0), 0);
        const expectedMeters = sourceItems.reduce(
            (s: number, si: any) => s + (Number(si.quantity) || 0), 0
        );
        const diff = Math.round((totalMeters - expectedMeters) * 1000) / 1000;
        const overallPct = expectedMeters > 0
            ? ((totalMeters - expectedMeters) / expectedMeters) * 100
            : 0;
        const overallWithinTolerance = Math.abs(overallPct) <= VARIANCE_TOLERANCE_PCT;
        const hasOutOfTolerance = !overallWithinTolerance ||
            Object.values(grouped).some(g => !g.withinTolerance);

        return {
            grouped,
            totalMeters,
            expectedMeters,
            diff,
            rollCount: liveReceiptItems.length,
            overallPct: Math.round(overallPct * 10) / 10,
            overallWithinTolerance,
            hasOutOfTolerance,
        };
    }, [selectedDocument, liveReceiptItems, VARIANCE_TOLERANCE_PCT]);

    // ─── Handle Save (legacy — called by UnifiedAccountingSheet) ─
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

        // Determine source document type — use resolveSourceDocumentType for reliability
        const sourceDocType = resolveSourceDocumentType() as 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'container';

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
            // 🔑 Variance tracking: saved in purchase_receipts for accountant review
            varianceStatus: receiptSummary?.hasOutOfTolerance ? 'requires_review' : 'ok',
            varianceAmount: receiptSummary?.diff ?? 0,
            variancePct: receiptSummary?.overallPct ?? 0,
            varianceTolerancePct: VARIANCE_TOLERANCE_PCT,
        });

        toast.dismiss();

        if (result.success) {
            // Complete local session
            receiptLocalStore.completeSession(session.sessionId);

            const hasVariance = receiptSummary?.hasOutOfTolerance;
            const varianceNote = hasVariance
                ? (language === 'ar'
                    ? `\n⚠️ فارق ${Math.abs(receiptSummary!.diff)}م (${Math.abs(receiptSummary!.overallPct)}%) — مُعلَّم للمراجعة`
                    : `\n⚠️ Variance ${Math.abs(receiptSummary!.diff)}m (${Math.abs(receiptSummary!.overallPct)}%) — flagged for review`)
                : '';
            const msg = language === 'ar'
                ? `✅ تم الاستلام بنجاح\n📋 رقم الاستلام: ${result.receiptNumber}\n📦 البنود: ${result.details.receiptItemsCreated}\n🎠 الرولونات: ${result.details.fabricRollsSynced}${varianceNote}`
                : `✅ Receipt completed\n📋 Receipt #: ${result.receiptNumber}\n📦 Items: ${result.details.receiptItemsCreated}\n🎠 Rolls: ${result.details.fabricRollsSynced}${varianceNote}`;

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
    }, [session, selectedDocument, selectedReference, selectedWarehouseId, tenantId, companyId, language, onComplete, resolveSourceDocumentType, receiptSummary, VARIANCE_TOLERANCE_PCT]);
    // 🔑 Wire the ref so handleCompleteReceipt can call handleSave without circular deps
    handleSaveRef.current = handleSave;

    // ─── Handle Close (saves draft if items exist) ───────────
    const handleClose = async () => {
        if (isDeletingRef.current) {
            setOpen(false);
            setSession(null);
            setEntryLocked(false);
            setLiveReceiptItems([]);
            setDraftReceiptId(null);
            return;
        }

        // 🔑 Save draft to DB before closing if there are items (skip in view mode)
        if (!viewMode && !completedReceiptInfo && liveReceiptItems.length > 0 && selectedReference && companyId && tenantId) {
            // Determine sourceDocumentType — use resolveSourceDocumentType for reliability
            const sourceDocumentType = resolveSourceDocumentType();

            console.log('💾 [handleClose] Saving draft...', {
                draftReceiptId,
                selectedReference,
                sourceDocumentType,
                itemsCount: liveReceiptItems.length,
                activeReceiptType,
            });

            try {
                let success = false;
                if (draftReceiptId) {
                    success = await warehouseService.updateDraftReceipt(draftReceiptId, liveReceiptItems);
                    if (success) console.log('💾 [handleClose] Draft updated:', draftReceiptId);
                } else {
                    const result = await warehouseService.createDraftReceipt({
                        tenantId,
                        companyId,
                        warehouseId: selectedWarehouseId,
                        sourceDocumentId: selectedReference,
                        sourceDocumentType,
                        supplierId: selectedDocument?.supplier_id,
                        items: liveReceiptItems,
                    });
                    if (result) {
                        success = true;
                        console.log('💾 [handleClose] Draft created:', result);
                        setDraftReceiptId(result.id);
                    }
                }

                if (success) {
                    toast.info(
                        language === 'ar'
                            ? '💾 تم حفظ المسودة — يمكنك المتابعة لاحقاً'
                            : '💾 Draft saved — you can continue later',
                        { duration: 4000 }
                    );
                } else {
                    toast.error(
                        language === 'ar'
                            ? '❌ فشل في حفظ المسودة'
                            : '❌ Failed to save draft',
                        { duration: 4000 }
                    );
                }
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

    // ─── Handle Delete (حذف المسودة) ──────────────────────────
    const handleDelete = useCallback(async () => {
        if (!draftReceiptId) {
            toast.info(
                language === 'ar' ? 'لا توجد مسودة لحذفها' : 'No draft to delete'
            );
            return;
        }

        isDeletingRef.current = true;
        // Note: useSheetActionHandler already shows window.confirm before calling onDelete
        const success = await warehouseService.deleteDraftReceipt(draftReceiptId);
        if (success) {
            toast.success(
                language === 'ar' ? '🗑️ تم حذف المسودة بنجاح' : '🗑️ Draft deleted successfully'
            );
            setLiveReceiptItems([]);
            setDraftReceiptId(null);
            setEntryLocked(false);
            setOpen(false);
            setSession(null);
            onComplete?.();
        } else {
            toast.error(
                language === 'ar' ? '❌ فشل حذف المسودة' : '❌ Failed to delete draft'
            );
        }
        setTimeout(() => { isDeletingRef.current = false; }, 1000);
    }, [draftReceiptId, language, onComplete]);

    // ─── Reference Placeholder Text ──────────────────────────
    const getReferencePlaceholder = () => {
        const map: Record<ReceiptType, { ar: string; en: string }> = {
            purchase_local: { ar: 'اختر أمر الشراء أو الفاتورة', en: 'Select PO or Invoice' },
            container: { ar: 'اختر الكونتينر', en: 'Select container' },
            transfer: { ar: 'اختر فاتورة المناقلة', en: 'Select transfer' },
            return: { ar: 'اختر فاتورة المرتجع', en: 'Select return' },
            stock_count: { ar: 'اختر الجرد المجدول', en: 'Select scheduled count' },
            sales_delivery: { ar: 'اختر فاتورة المبيعات', en: 'Select sales invoice' },
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
            sales_delivery: { ar: 'رقم فاتورة المبيعات:', en: 'Sales Invoice #:' },
        };
        const entry = map[activeReceiptType];
        return language === 'ar' ? entry.ar : entry.en;
    };

    // ─── Receipt Progress ─────────────────────────────────────
    const receiptProgress = useMemo(() => {
        if (!selectedDocument) return { percent: 0, received: 0, total: 0, pending: 0 };
        // 🔑 FIX: Measure progress by METERS (not by item count vs roll count)
        // Expected = sum of source item quantities (meters)
        // Received = sum of received roll lengths (meters from liveReceiptItems)
        const expectedMeters = (selectedDocument.items as any[]).reduce(
            (s: number, si: any) => s + (Number(si.quantity) || 0), 0
        );
        const receivedMeters = liveReceiptItems.reduce(
            (s, i) => s + (i.rollLength || 0), 0
        );
        const EPSILON = 0.001;
        const effectiveReceived = Math.round(receivedMeters * 1000) / 1000;
        const effectiveExpected = Math.round(expectedMeters * 1000) / 1000;
        const percent = effectiveExpected > 0
            ? Math.min(100, (effectiveReceived / effectiveExpected) * 100)
            : 0;
        // Count how many source items are ≥99% received
        const receivedItems = (selectedDocument.items as any[]).filter((si: any) => {
            const siMeters = Number(si.quantity) || 0;
            const rollsForItem = liveReceiptItems.filter(r =>
                r.sourceItemId === si.id ||
                r.materialId === (si.material_id || si.product_id)
            );
            const receivedForItem = rollsForItem.reduce((s, r) => s + (r.rollLength || 0), 0);
            return siMeters > 0 && receivedForItem >= siMeters * 0.99;
        }).length;
        return {
            percent: Math.round(percent * 10) / 10,
            received: receivedItems,
            total: selectedDocument.items.length,
            pending: selectedDocument.items.length - receivedItems,
        };
    }, [selectedDocument, liveReceiptItems]);


    // ─── Header Extra — below toolbar ────────────────────────
    const HeaderExtra = (
        <div className="flex flex-col gap-0 border-b">
            {/* ═══ Row 1: Warehouse + Document Selector ═══ */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-900 dark:to-slate-800 border-b">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Receipt Type */}
                    <Select
                        value={activeReceiptType}
                        onValueChange={(v) => {
                            setActiveReceiptType(v as ReceiptType);
                            setSelectedReference(''); // Only clear reference on manual user change
                        }}
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

                    {/* 🔑 RECEIVE BUTTON — في وضع الإنشاء فقط */}
                    {!effectiveViewMode && liveReceiptItems.length > 0 && selectedReference && (
                        <Button
                            size="sm"
                            onClick={() => setShowReceiptConfirm(true)}
                            disabled={isCompleting}
                            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/30 shrink-0 px-4"
                        >
                            {isCompleting
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <PackageCheck className="h-4 w-4" />
                            }
                            {isRTL ? 'استلام' : 'Receive'}
                            <span className="bg-emerald-800/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                                {liveReceiptItems.length}
                            </span>
                        </Button>
                    )}

                    {/* ✅ STATUS BADGE — في وضع العرض للاستلامات المكتملة */}
                    {effectiveViewMode && completedReceiptInfo && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg shrink-0">
                            <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                {isRTL ? 'مستلم' : 'Received'}
                            </span>
                            {completedReceiptInfo.completedAt && (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                                    {new Date(completedReceiptInfo.completedAt).toLocaleDateString(
                                        isRTL ? 'ar-SA' : 'en-US',
                                        { year: 'numeric', month: 'short', day: 'numeric' }
                                    )}
                                </span>
                            )}
                            {completedReceiptInfo.receiptNumber && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                                    {completedReceiptInfo.receiptNumber}
                                </Badge>
                            )}
                        </div>
                    )}
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
                            {/* ✅ زر الوثيقة الأم */}
                            {selectedReference && (
                                <button
                                    onClick={async () => {
                                        if (loadingSourceDoc) return;
                                        setLoadingSourceDoc(true);
                                        try {
                                            if (activeReceiptType === 'container') {
                                                // جلب بيانات الكونتينر الكاملة (بدون join لتجنب مشاكل العلاقات)
                                                const { data: container, error: cErr } = await supabase
                                                    .from('containers')
                                                    .select('*')
                                                    .eq('id', selectedReference)
                                                    .maybeSingle();
                                                if (cErr) {
                                                    console.error('Container fetch error:', cErr);
                                                    toast.error(isRTL ? `خطأ: ${cErr.message}` : `Error: ${cErr.message}`);
                                                } else if (container) {
                                                    setSourceDocSheet({ open: true, type: 'container', data: { ...container, party_id: container.supplier_id } });
                                                } else {
                                                    toast.error(isRTL ? 'لم يتم العثور على الكونتينر' : 'Container not found');
                                                }
                                            } else if (activeReceiptType === 'transfer') {
                                                // جلب بيانات المناقلة
                                                const { data: tr } = await supabase
                                                    .from('warehouse_transfers')
                                                    .select('*')
                                                    .eq('id', selectedReference)
                                                    .maybeSingle();
                                                if (tr) {
                                                    setSourceDocSheet({ open: true, type: 'transfer', data: tr });
                                                } else {
                                                    toast.error(isRTL ? 'لم يتم العثور على المناقلة' : 'Transfer not found');
                                                }
                                            } else {
                                                // فاتورة شراء — جلب من purchase_transactions
                                                const { data: inv } = await supabase
                                                    .from('purchase_transactions')
                                                    .select('*')
                                                    .eq('id', selectedReference)
                                                    .maybeSingle();
                                                if (!inv) {
                                                    // تجريبة ثانية من purchase_invoices
                                                    const { data: pinv } = await supabase
                                                        .from('purchase_invoices')
                                                        .select('*')
                                                        .eq('id', selectedReference)
                                                        .maybeSingle();
                                                    if (pinv) {
                                                        setSourceDocSheet({ open: true, type: 'invoice', data: pinv });
                                                    } else {
                                                        toast.error(isRTL ? 'لم يتم العثور على الفاتورة' : 'Invoice not found');
                                                    }
                                                } else {
                                                    setSourceDocSheet({ open: true, type: 'invoice', data: inv });
                                                }
                                            }
                                        } catch (err: any) {
                                            toast.error(err.message);
                                        } finally {
                                            setLoadingSourceDoc(false);
                                        }
                                    }}
                                    disabled={loadingSourceDoc}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg transition-all shrink-0 disabled:opacity-50"
                                    title={isRTL ? 'عرض الوثيقة الأصلية' : 'Open source document'}
                                >
                                    {loadingSourceDoc
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <ExternalLink className="w-3 h-3" />
                                    }
                                    {isRTL
                                        ? (activeReceiptType === 'container' ? 'عرض الكونتينر' : activeReceiptType === 'transfer' ? 'عرض المناقلة' : 'عرض الفاتورة')
                                        : (activeReceiptType === 'container' ? 'View Container' : activeReceiptType === 'transfer' ? 'View Transfer' : 'View Invoice')
                                    }
                                </button>
                            )}
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
                mode={effectiveViewMode ? 'view' : 'create'}
                data={enhancedData}
                onSave={effectiveViewMode ? undefined : handleSave}
                onDelete={handleDelete}
                headerExtra={HeaderExtra}
                onRefresh={onComplete}
                defaultTab="goods_receipt_items"
            />

            {/* ─── Receipt Confirmation Dialog ─── */}
            <Dialog open={showReceiptConfirm} onOpenChange={setShowReceiptConfirm}>
                <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${receiptSummary?.hasOutOfTolerance ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {receiptSummary?.hasOutOfTolerance
                                ? <AlertTriangle className="h-5 w-5" />
                                : <PackageCheck className="h-5 w-5" />
                            }
                            {isRTL ? 'تأكيد الاستلام' : 'Confirm Receipt'}
                            {receiptSummary?.hasOutOfTolerance && (
                                <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-normal ms-1">
                                    {isRTL ? 'يحتاج مراجعة' : 'Needs Review'}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {isRTL
                                ? 'راجع الكميات بدقة قبل تأكيد الاستلام وترحيل المواد إلى المستودع'
                                : 'Review quantities carefully before confirming receipt and posting to warehouse'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {receiptSummary && (
                        <div className="space-y-3">
                            {/* Source Info */}
                            <div className="flex items-center gap-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="text-blue-700 dark:text-blue-300">
                                    {selectedDocument?.document_number} — {selectedDocument?.supplier_name}
                                </span>
                            </div>

                            {/* Items Summary Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className={`px-3 py-2 text-xs font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {isRTL ? 'المادة / اللون' : 'Material / Color'}
                                            </th>
                                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center">
                                                {isRTL ? 'رولونات' : 'Rolls'}
                                            </th>
                                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center">
                                                {isRTL ? 'مستلم (م)' : 'Recv (m)'}
                                            </th>
                                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center">
                                                {isRTL ? 'مطلوب (م)' : 'Exp (m)'}
                                            </th>
                                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center">
                                                {isRTL ? 'الفارق%' : 'Var%'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {Object.entries(receiptSummary.grouped).map(([key, g]) => {
                                            const diff = Math.round((g.totalLength - g.sourceMeter) * 100) / 100;
                                            const pctLabel = Math.abs(g.diffPct) > 0.05
                                                ? `${g.diffPct > 0 ? '+' : ''}${g.diffPct.toFixed(1)}%`
                                                : '—';
                                            const isExact = Math.abs(diff) < 0.01;
                                            return (
                                                <tr key={key} className={`transition-colors ${!g.withinTolerance
                                                    ? 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                                    {/* Material + Colors list */}
                                                    <td className={`px-3 py-2.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                        <div className="font-medium text-xs leading-tight">{g.name}</div>
                                                        {g.colors.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {g.colors.map(c => (
                                                                    <span key={c} className="inline-flex items-center gap-0.5 text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                                                        {c}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Rolls */}
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className="inline-flex items-center justify-center text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-full w-7 h-7 font-mono">
                                                            {g.rolls}
                                                        </span>
                                                    </td>
                                                    {/* Received */}
                                                    <td className="px-3 py-2.5 text-center text-xs font-mono font-bold">
                                                        {g.totalLength.toLocaleString()}
                                                    </td>
                                                    {/* Expected */}
                                                    <td className="px-3 py-2.5 text-center text-xs font-mono text-gray-500">
                                                        {g.sourceMeter > 0 ? g.sourceMeter.toLocaleString() : '—'}
                                                    </td>
                                                    {/* Variance */}
                                                    <td className="px-3 py-2.5 text-center">
                                                        {g.withinTolerance ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                                                                ✓ {isExact ? (isRTL ? 'مطابق' : 'Exact') : pctLabel}
                                                            </span>
                                                        ) : (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${diff > 0
                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                ⚠ {pctLabel}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2">
                                        <tr>
                                            <td className={`px-3 py-2 text-xs font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {isRTL ? 'الإجمالي' : 'Total'}
                                            </td>
                                            <td className="px-3 py-2 text-center text-xs font-bold text-blue-600">
                                                {receiptSummary.rollCount}
                                            </td>
                                            <td className="px-3 py-2 text-center text-xs font-bold font-mono">
                                                {receiptSummary.totalMeters.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-center text-xs font-mono text-gray-500">
                                                {receiptSummary.expectedMeters.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {receiptSummary.overallWithinTolerance ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* ── Variance Status Banner ─────────────────── */}
                            {receiptSummary.hasOutOfTolerance ? (
                                /* OUT-OF-TOLERANCE: warn clearly but don't block */
                                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300 dark:bg-amber-900/20 dark:border-amber-700">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                            {receiptSummary.diff > 0
                                                ? (isRTL
                                                    ? `زيادة ${Math.abs(receiptSummary.diff)}م (${Math.abs(receiptSummary.overallPct)}%) — تجاوز حد التسامح ${VARIANCE_TOLERANCE_PCT}%`
                                                    : `Excess +${Math.abs(receiptSummary.diff)}m (${Math.abs(receiptSummary.overallPct)}%) — exceeds ${VARIANCE_TOLERANCE_PCT}% tolerance`)
                                                : (isRTL
                                                    ? `نقص ${Math.abs(receiptSummary.diff)}م (${Math.abs(receiptSummary.overallPct)}%) — تجاوز حد التسامح ${VARIANCE_TOLERANCE_PCT}%`
                                                    : `Shortage ${Math.abs(receiptSummary.diff)}m (${Math.abs(receiptSummary.overallPct)}%) — exceeds ${VARIANCE_TOLERANCE_PCT}% tolerance`)
                                            }
                                        </p>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
                                            {isRTL
                                                ? `سيتم الاستلام والترحيل. سيُعلَّم الفارق للمراجعة من قِبل المحاسب أو المدير في سجل الحركات.`
                                                : `Receipt will be posted. Variance will be flagged for accountant/manager review in inventory movements.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : receiptSummary.diff !== 0 ? (
                                /* WITHIN-TOLERANCE: just info, no concern */
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                        {isRTL
                                            ? `فارق ${Math.abs(receiptSummary.overallPct)}% — ضمن حد التسامح المسموح (${VARIANCE_TOLERANCE_PCT}%) ✓`
                                            : `${Math.abs(receiptSummary.overallPct)}% variance — within ${VARIANCE_TOLERANCE_PCT}% tolerance ✓`
                                        }
                                    </p>
                                </div>
                            ) : (
                                /* PERFECT MATCH */
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                        {isRTL ? '✓ الكميات مطابقة تماماً — جاهز للاستلام' : '✓ Quantities match exactly — ready to receive'}
                                    </p>
                                </div>
                            )}

                            {/* Warehouse destination */}
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Warehouse className="h-4 w-4 text-gray-400" />
                                <span className="text-xs">{isRTL ? 'الوجهة:' : 'Destination:'}</span>
                                <span className="text-xs font-semibold">
                                    {warehouses.find(w => w.id === selectedWarehouseId)
                                        ? (isRTL
                                            ? (warehouses.find(w => w.id === selectedWarehouseId)?.name_ar || '')
                                            : (warehouses.find(w => w.id === selectedWarehouseId)?.name_en || ''))
                                        : selectedWarehouseId
                                    }
                                </span>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowReceiptConfirm(false)}
                            disabled={isCompleting}
                        >
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            onClick={async () => {
                                setIsCompleting(true);
                                setShowReceiptConfirm(false);
                                await handleCompleteReceipt();
                                setIsCompleting(false);
                            }}
                            disabled={isCompleting || liveReceiptItems.length === 0}
                            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold"
                        >
                            {isCompleting
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <PackageCheck className="h-4 w-4" />
                            }
                            {isRTL ? 'تأكيد الاستلام' : 'Confirm Receipt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ✅ وثيقة الأم — تفتح فوق إذن الاستلام */}
            {sourceDocSheet?.open && sourceDocSheet.data && (
                <UnifiedTradeSheet
                    open={sourceDocSheet.open}
                    onOpenChange={(o) => setSourceDocSheet(prev => prev ? { ...prev, open: o } : null)}
                    mode="purchase"
                    type={sourceDocSheet.type === 'container' ? 'container' : 'invoice'}
                    initialData={sourceDocSheet.data}
                    companyId={companyId ?? undefined}
                    onRefresh={() => { }}
                />
            )}
        </>
    );
}

export default MaterialReceiptDialog;
