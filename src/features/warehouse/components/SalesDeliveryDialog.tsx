/**
 * ════════════════════════════════════════════════════════════════
 * 📤 SalesDeliveryDialog — مكون تسليم مبيعات
 * ════════════════════════════════════════════════════════════════
 *
 * مبني على UnifiedAccountingSheet بنفس البنية المعمارية لمكون الاستلام
 * الفرق الجوهري: يختار رولونات موجودة بدلاً من إنشاء جديدة
 *
 * التدفق:
 * 1. اختيار المستودع
 * 2. تحميل بنود فاتورة المبيعات
 * 3. اختيار الرولونات (مسح / يدوي)
 * 4. تأكيد التسليم → تحديث المخزون
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useWarehouses } from '@/features/warehouse/hooks/useWarehouseQueries';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { telegramNotify } from '@/services/telegramNotificationService';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import type { UnifiedDocType } from '@/features/accounting/components/unified/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Warehouse, FileText, Loader2, PackageCheck, Truck,
    Wifi, WifiOff, RotateCcw, AlertTriangle, Building2, Navigation,
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

// ─── Props ──────────────────────────────────────────────────
interface SalesDeliveryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    salesInvoice: any;           // من ReceiptsDeliveriesPage
    salesInvoiceId?: string;
    onComplete?: () => void;
    onOpenInvoice?: (invoiceData: any) => void;
    viewMode?: boolean;          // وضع العرض فقط (بعد التسليم)
}

export function SalesDeliveryDialog({
    isOpen,
    onOpenChange,
    salesInvoice,
    salesInvoiceId,
    onComplete,
    onOpenInvoice,
    viewMode = false,
}: SalesDeliveryDialogProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();
    const { hasAnyRole } = useRBAC();
    const { warehouses } = useWarehouses();
    const queryClient = useQueryClient();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ═══ Edit mode toggle (internal) ═══
    const [isEditing, setIsEditing] = useState(false);
    // هل التسليم مكتمل? (يكتشفه من stage)
    const [isDelivered, setIsDelivered] = useState(false);
    // ✅ الأدوار المسموح لها بالتعديل: صاحب الاشتراك + المدير + المحاسب
    const canEdit = hasAnyRole([
        'super_admin',       // المشرف العام
        'tenant_owner',     // صاحب الاشتراك
        'company_owner',    // مالك الشركة
        'company_admin',    // مدير الشركة
        'accountant',       // المحاسب
    ]);
    // effectiveViewMode: عرض فقط = مكتمل + ليس في وضع تعديل
    const effectiveViewMode = (viewMode || isDelivered) && !isEditing;

    // ═══ State ═══
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
        salesInvoice?.warehouse_id || warehouses?.[0]?.id || ''
    );
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [sourceItems, setSourceItems] = useState<any[]>([]);
    const [selectedRolls, setSelectedRolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);
    const draftRestoredRef = React.useRef(false); // Sync flag (no closure staleness)
    const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Get the invoice ID
    const invoiceId = salesInvoiceId || salesInvoice?.source_id || salesInvoice?.id;

    // Reset isEditing + isDelivered when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            setIsDelivered(false);
            setSelectedRolls([]);
            setDraftRestored(false);
            draftRestoredRef.current = false;
        }
    }, [isOpen]);

    // ═══ Draft key for localStorage ═══
    const draftKey = `delivery_draft_${invoiceId}`;

    // ═══ NOTE: Auto-save is handled directly in SalesDeliveryItemsTab.notifyParent() ═══
    // No auto-save here — avoids race condition where Dialog's empty selectedRolls
    // would overwrite the draft saved by the Items tab.

    // ═══ Fetch invoice details + items + restore draft/delivered rolls ═══
    // 🚀 CACHE-FIRST: React Query cache → localStorage → Supabase
    //    Realtime keeps React Query fresh — UI should load INSTANTLY.
    const invoiceCacheKey = `delivery_inv_${invoiceId}`;
    const itemsCacheKey = `delivery_items_${invoiceId}`;
    const rollsCacheKey = `delivery_rolls_${invoiceId}`;

    // ── Helper: Map raw items to UnifiedAccountingSheet format ──
    const mapItemsForSheet = useCallback((items: any[]) => {
        return items.map((i: any) => ({
            item_id: i.material_id || i.id,
            material_id: i.material_id,
            item_name: i.description || i.description_ar || '',
            quantity: Number(i.quantity) || 0,
            unit_price: Number(i.unit_price) || 0,
            subtotal: Number(i.subtotal) || (Number(i.quantity) * Number(i.unit_price)) || 0,
            total: Number(i.total) || Number(i.subtotal) || 0,
            tax_amount: Number(i.tax_amount) || 0,
            tax_rate: Number(i.tax_rate) || 0,
            discount_amount: Number(i.discount_amount) || 0,
            color_id: i.color_id,
            color_name: i.color_name,
            delivered_qty: Number(i.delivered_qty) || 0,
            received_qty: Number(i.received_qty) || 0,
        }));
    }, []);

    // ── Helper: Search React Query cache for this invoice ──
    const findInvoiceInCache = useCallback(() => {
        // Search all sales_cycle_full query data (fuzzy match — all date ranges)
        const allQueries = queryClient.getQueriesData<any[]>({ queryKey: ['sales_cycle_full'] });
        for (const [, data] of allQueries) {
            if (!data || !Array.isArray(data)) continue;
            const found = data.find((tx: any) => tx.id === invoiceId);
            if (found) return found;
        }
        // Also check sales_transactions_list
        const listQueries = queryClient.getQueriesData<any[]>({ queryKey: ['sales_transactions_list'] });
        for (const [, data] of listQueries) {
            if (!data || !Array.isArray(data)) continue;
            const found = data.find((tx: any) => tx.id === invoiceId);
            if (found) return found;
        }
        return null;
    }, [queryClient, invoiceId]);

    // ── Helper: Open invoice with FULL data (cache-first, then DB fallback) ──
    const openInvoiceWithFullData = useCallback(async () => {
        if (!onOpenInvoice || !invoiceId) return;

        // 1️⃣ Try cache first
        const cached = findInvoiceInCache();
        if (cached?.items?.length) {
            console.log('[DeliveryDialog] ✅ Invoice found in cache with items');
            onOpenInvoice({ ...cached, items: mapItemsForSheet(cached.items) });
            return;
        }

        // 2️⃣ Cache miss — fetch from DB with items
        console.log('[DeliveryDialog] 📡 Cache miss — fetching invoice from DB...');
        const { data: freshInvoice, error } = await supabase
            .from('sales_transactions')
            .select('*, items:sales_transaction_items(*)')
            .eq('id', invoiceId)
            .single();

        if (error || !freshInvoice) {
            console.warn('[DeliveryDialog] ❌ Failed to fetch invoice:', error?.message);
            // Last resort — open with whatever we have
            onOpenInvoice(invoiceData || cached || {});
            return;
        }

        // 3️⃣ Inject into sales_cycle_full cache for future use
        const allQueries = queryClient.getQueriesData<any[]>({ queryKey: ['sales_cycle_full'] });
        if (allQueries.length > 0) {
            // Add to the first available cache entry
            const [firstKey, firstData] = allQueries[0];
            if (firstData && Array.isArray(firstData)) {
                const existsIdx = firstData.findIndex((tx: any) => tx.id === invoiceId);
                if (existsIdx >= 0) {
                    // Replace existing entry with fresh data
                    firstData[existsIdx] = freshInvoice;
                } else {
                    // Add new entry
                    firstData.unshift(freshInvoice);
                }
                queryClient.setQueryData(firstKey, [...firstData]);
                console.log('[DeliveryDialog] 💾 Injected invoice into sales_cycle_full cache');
            }
        }

        // 4️⃣ Open with fresh data + mapped items
        onOpenInvoice({ ...freshInvoice, items: mapItemsForSheet(freshInvoice.items || []) });
    }, [findInvoiceInCache, mapItemsForSheet, onOpenInvoice, invoiceId, invoiceData, queryClient]);

    useEffect(() => {
        if (!invoiceId || !isOpen) return;

        // ══════════════════════════════════════════════════════════════
        // PHASE 1: INSTANT — React Query cache + localStorage (0ms)
        // ══════════════════════════════════════════════════════════════

        let cachedInvoice: any = null;
        let cachedItems: any[] = [];
        let cachedRolls: any[] = [];
        let fullyLoadedFromCache = false;

        // A. 🔥 React Query cache — Realtime-fresh data (BEST SOURCE)
        const rqInvoice = findInvoiceInCache();
        if (rqInvoice) {
            cachedInvoice = rqInvoice;
            console.log(`[Delivery] ⚡ Invoice from React Query cache`);

            // items are nested in sales_cycle_full query
            if (rqInvoice.items && Array.isArray(rqInvoice.items) && rqInvoice.items.length > 0) {
                cachedItems = rqInvoice.items.map((item: any) => ({
                    id: item.id,
                    material_id: item.material_id,
                    material_name_ar: item.description_ar || item.description || '',
                    material_name: item.description || '',
                    color_id: item.color_id,
                    color_name: item.color_name,
                    quantity: item.quantity || 0,
                    unit_price: item.unit_price || 0,
                    total: item.total || 0,
                    description: item.description,
                }));
                console.log(`[Delivery] ⚡ ${cachedItems.length} items from React Query cache`);
            }
        }

        // B. localStorage invoice cache — persists across refreshes
        if (!cachedInvoice || !cachedInvoice.stage) {
            try {
                const lsInv = localStorage.getItem(invoiceCacheKey);
                if (lsInv) {
                    const parsed = JSON.parse(lsInv);
                    if (parsed?.id && parsed?.stage) {
                        cachedInvoice = parsed;
                        console.log(`[Delivery] ⚡ Invoice from localStorage cache (stage=${parsed.stage})`);
                    }
                }
            } catch { /* ignore */ }
        }

        // C. salesInvoice prop — ALWAYS merge (has invoice_no, customer_name from StockMovementsPage)
        if (salesInvoice) {
            if (!cachedInvoice) {
                cachedInvoice = { ...salesInvoice, id: invoiceId };
            } else {
                // 🔑 Merge prop data: prop fields fill gaps in cached data
                if (salesInvoice.invoice_no && !cachedInvoice.invoice_no) {
                    cachedInvoice.invoice_no = salesInvoice.invoice_no;
                }
                if (salesInvoice.customer_name && !cachedInvoice.customer_name) {
                    cachedInvoice.customer_name = salesInvoice.customer_name;
                }
                if (salesInvoice.from_warehouse_name && !cachedInvoice.from_warehouse_name) {
                    cachedInvoice.from_warehouse_name = salesInvoice.from_warehouse_name;
                }
            }
        }

        // D. localStorage items cache (if not from RQ)
        if (cachedItems.length === 0) {
            try {
                const lsItems = localStorage.getItem(itemsCacheKey);
                if (lsItems) {
                    const parsed = JSON.parse(lsItems);
                    if (parsed?.length > 0) {
                        cachedItems = parsed;
                        console.log(`[Delivery] ⚡ ${parsed.length} items from localStorage`);
                    }
                }
            } catch { /* ignore */ }
        }

        // E. Delivered rolls from localStorage cache
        if (!draftRestoredRef.current) {
            try {
                const lsRolls = localStorage.getItem(rollsCacheKey);
                if (lsRolls) {
                    const parsed = JSON.parse(lsRolls);
                    if (parsed?.length > 0) {
                        cachedRolls = parsed;
                        console.log(`[Delivery] ⚡ ${parsed.length} rolls from localStorage cache`);
                    }
                }
            } catch { /* ignore */ }
        }

        // F. Draft rolls from localStorage
        if (cachedRolls.length === 0 && !draftRestoredRef.current) {
            try {
                const localDraft = localStorage.getItem(draftKey);
                if (localDraft) {
                    const parsed = JSON.parse(localDraft);
                    if (parsed?.rolls?.length > 0) {
                        cachedRolls = parsed.rolls;
                        console.log(`[Draft] ⚡ ${cachedRolls.length} rolls from localStorage`);
                    }
                }
            } catch { /* ignore */ }
        }

        // ═══ BATCH SET — apply ALL cache data in ONE render ═══
        const hasLocalData = !!(cachedInvoice?.stage && cachedItems.length > 0);
        fullyLoadedFromCache = hasLocalData && cachedRolls.length > 0;

        if (cachedInvoice) {
            setInvoiceData(cachedInvoice);
            if (cachedInvoice.warehouse_id) setSelectedWarehouseId(cachedInvoice.warehouse_id);
        }
        if (cachedItems.length > 0) setSourceItems(cachedItems);
        if (cachedRolls.length > 0) {
            setSelectedRolls(cachedRolls);
            setDraftRestored(true);
            draftRestoredRef.current = true;
            const stage = cachedInvoice?.stage;
            if (stage && ['delivered', 'posted', 'in_transit', 'at_branch', 'returned'].includes(stage)) {
                setIsDelivered(true);
            }
        }

        if (fullyLoadedFromCache) {
            console.log(`[Delivery] ✅ Fully loaded from cache — skipping Phase 2`);
            return; // 🚀 لا حاجة لجلب من الشبكة — كل البيانات موجودة في الكاش
        }

        // ══════════════════════════════════════════════════════════════
        // PHASE 2: ATOMIC FETCH — one function, batch state at end
        // ══════════════════════════════════════════════════════════════

        if (!hasLocalData) setLoading(true);

        const fetchAllData = async () => {
            try {
                // ══ STEP 1: PARALLEL — Fetch ALL data at once ══
                const [invRes, itemsRes, mvByIdRes, mvByNumRes] = await Promise.all([
                    supabase
                        .from('sales_transactions')
                        .select('*')
                        .eq('id', invoiceId)
                        .maybeSingle(),
                    supabase
                        .from('sales_transaction_items')
                        .select('*')
                        .eq('transaction_id', invoiceId),
                    supabase
                        .from('inventory_movements')
                        .select('roll_id, quantity, material_id, movement_type, notes')
                        .eq('reference_id', invoiceId),
                    salesInvoice?.invoice_no
                        ? supabase
                            .from('inventory_movements')
                            .select('roll_id, quantity, material_id, movement_type, notes')
                            .eq('reference_number', salesInvoice.invoice_no)
                        : Promise.resolve({ data: [] as any[], error: null }),
                ]);

                const inv = invRes.data;
                const items = itemsRes.data;

                // ══ STEP 2: Process movements → get roll IDs ══
                let movements = (mvByIdRes.data?.length ? mvByIdRes.data : mvByNumRes.data) || [];
                const saleMovements = movements.filter((m: any) =>
                    ['sale', 'issue', 'delivery', 'transfer_out'].includes(m.movement_type) || !m.movement_type
                );
                const rollIds = saleMovements.map((m: any) => m.roll_id).filter(Boolean);

                // Prepare material IDs from items
                const materialIds = items?.length
                    ? [...new Set(items.map((i: any) => i.material_id).filter(Boolean))]
                    : [];

                // ══ STEP 3: PARALLEL — Materials + Rolls ══
                const [matsRes, rollsRes] = await Promise.all([
                    materialIds.length > 0
                        ? supabase.from('fabric_materials').select('id, name_ar, name_en').in('id', materialIds)
                        : Promise.resolve({ data: [] as any[], error: null }),
                    rollIds.length > 0
                        ? supabase.from('fabric_rolls').select('id, roll_number, material_id, current_length, color_id, color_name, status, warehouse_id').in('id', rollIds)
                        : Promise.resolve({ data: [] as any[], error: null }),
                ]);

                // ══ STEP 4: Process all results ══
                // Materials map
                const materialsMap: Record<string, { name_ar: string; name_en: string }> = {};
                matsRes.data?.forEach((m: any) => {
                    materialsMap[m.id] = { name_ar: m.name_ar || '', name_en: m.name_en || '' };
                });

                // Map items
                let finalItems: any[] = [];
                if (items && items.length > 0) {
                    finalItems = items.map((item: any) => {
                        const mat: any = materialsMap[item.material_id] || {};
                        return {
                            id: item.id,
                            material_id: item.material_id,
                            material_name_ar: item.description_ar || mat.name_ar || item.description || '',
                            material_name: mat.name_en || item.description || '',
                            color_id: item.color_id,
                            color_name: item.color_name,
                            quantity: item.quantity || 0,
                            unit_price: item.unit_price || 0,
                            total: item.total || 0,
                            description: item.description,
                        };
                    });
                }

                // Map rolls
                let finalRolls: any[] = [];
                const isCompletedDelivery = inv && ['delivered', 'posted', 'in_transit', 'at_branch', 'returned'].includes(inv.stage);
                const isInDelivery = inv && inv.stage === 'in_delivery';

                if ((isCompletedDelivery || isInDelivery) && rollsRes.data && rollsRes.data.length > 0) {
                    finalRolls = rollsRes.data.map((r: any) => {
                        const mv = saleMovements.find((m: any) => m.roll_id === r.id);
                        return { ...r, net_length: mv?.quantity || r.current_length || 0, color_name: r.color_name || '', _delivered: true };
                    });
                } else if (isCompletedDelivery && rollIds.length === 0) {
                    // ── Fallback: No roll_ids in movements — try sold rolls for these materials ──
                    if (materialIds.length > 0) {
                        const { data: soldRolls } = await supabase
                            .from('fabric_rolls')
                            .select('id, roll_number, material_id, current_length, color_id, color_name, status, warehouse_id')
                            .in('material_id', materialIds)
                            .eq('status', 'sold');

                        if (soldRolls && soldRolls.length > 0) {
                            finalRolls = soldRolls.map((r: any) => ({
                                ...r,
                                net_length: r.current_length || 0,
                                _viewOnly: true,
                                _delivered: true,
                                color_name: r.color_name || '',
                            }));
                            console.log(`[Delivery] ✅ ${finalRolls.length} rolls from sold-status fallback`);
                        }
                    }
                }

                // ── Draft fallback if no delivered rolls ──
                if (finalRolls.length === 0 && !draftRestoredRef.current && inv?.delivery_draft?.rolls?.length > 0) {
                    finalRolls = inv.delivery_draft.rolls;
                }

                // ══════════════════════════════════════════════════════════════
                // STEP 5: 🔥 ATOMIC BATCH — Set ALL state at once
                // ══════════════════════════════════════════════════════════════
                console.log(`[Delivery] ✅ Atomic load: invoice=${!!inv} items=${finalItems.length} rolls=${finalRolls.length} stage=${inv?.stage}`);

                if (inv) {
                    setInvoiceData(inv);
                    if (inv.warehouse_id) setSelectedWarehouseId(inv.warehouse_id);
                    try { localStorage.setItem(invoiceCacheKey, JSON.stringify(inv)); } catch { }
                }

                if (finalItems.length > 0) {
                    setSourceItems(finalItems);
                    try { localStorage.setItem(itemsCacheKey, JSON.stringify(finalItems)); } catch { }
                }

                if (finalRolls.length > 0) {
                    setSelectedRolls(finalRolls);
                    setDraftRestored(true);
                    draftRestoredRef.current = true;
                    try { localStorage.setItem(rollsCacheKey, JSON.stringify(finalRolls)); } catch { }
                }

                if (isCompletedDelivery) {
                    setIsDelivered(true);
                } else if (!draftRestoredRef.current) {
                    setIsDelivered(false);
                }

            } catch (err) {
                console.error('SalesDeliveryDialog fetchAllData:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [invoiceId, isOpen]);

    // ═══ Stable callback ref for delivery data changes ═══
    const onDeliveryDataChangeRef = React.useRef<(updates: any) => void>(() => { });
    onDeliveryDataChangeRef.current = (updates: any) => {
        if (updates?.selected_rolls) {
            setSelectedRolls(updates.selected_rolls);
        }
        // Sync delivery-related fields back to invoiceData + DB
        const fieldsToSync = ['delivery_method', 'driver_id', 'driver_name', 'driver_phone',
            'receiving_branch_id', 'receiving_branch_name', 'delivery_notes',
            'pickup_person_name', 'pickup_person_id_number', 'pickup_vehicle_number',
            'pickup_vehicle_type', 'pickup_driver_name', 'pickup_driver_phone'];
        const dbUpdates: Record<string, any> = {};
        let hasFieldUpdate = false;
        for (const field of fieldsToSync) {
            if (field in (updates || {})) {
                dbUpdates[field] = updates[field];
                hasFieldUpdate = true;
            }
        }
        if (hasFieldUpdate) {
            setInvoiceData((prev: any) => prev ? { ...prev, ...dbUpdates } : prev);
            if (invoiceId) {
                supabase.from('sales_transactions')
                    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
                    .eq('id', invoiceId)
                    .then(() => { console.log('[SalesDelivery] ✅ Fields persisted:', Object.keys(dbUpdates)); },
                          (err: any) => { console.warn('[SalesDelivery] DB update error:', err); });
            }
        }
    };

    // ═══ Enhanced data for UnifiedAccountingSheet ═══
    const enhancedData = useMemo(() => ({
        ...invoiceData,
        items: sourceItems, // ← needed by SalesFinanceTab + StageJournalPreview
        source_items: sourceItems,
        warehouse_id: selectedWarehouseId,
        selected_rolls: selectedRolls,
        rolls_count: selectedRolls.length,
        total_length: selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0),
        view_mode: effectiveViewMode,
        onDeliveryDataChange: (updates: any) => onDeliveryDataChangeRef.current(updates),
    }), [invoiceData, sourceItems, selectedWarehouseId, selectedRolls, effectiveViewMode]);

    // ═══ Handle Save = "تحميل" (Start Loading) ═══
    const handleSave = useCallback(async (data: any) => {
        if (data?.selected_rolls) {
            setSelectedRolls(data.selected_rolls);
        }

        // If rolls are selected, show confirm dialog
        if (selectedRolls.length > 0 || data?.selected_rolls?.length > 0) {
            setShowConfirm(true);
        } else {
            toast.warning(tl('⚠️ لم يتم اختيار أي رولون', '⚠️ No rolls selected'));
        }
    }, [selectedRolls, tl]);

    // ═══ Handle onChange from tabs ═══
    const handleDataChange = useCallback((updates: any) => {
        if (updates?.selected_rolls) {
            setSelectedRolls(updates.selected_rolls);
        }
        // Persist delivery-related fields to invoiceData + DB
        const fieldsToSync = ['delivery_method', 'driver_id', 'driver_name', 'driver_phone',
            'receiving_branch_id', 'receiving_branch_name', 'delivery_notes',
            'pickup_person_name', 'pickup_person_id_number', 'pickup_vehicle_number',
            'pickup_vehicle_type', 'pickup_driver_name', 'pickup_driver_phone'];
        const dbUpdates: Record<string, any> = {};
        let hasFieldUpdate = false;
        for (const field of fieldsToSync) {
            if (field in (updates || {})) {
                dbUpdates[field] = updates[field];
                hasFieldUpdate = true;
            }
        }
        if (hasFieldUpdate) {
            // Update local invoiceData
            setInvoiceData((prev: any) => prev ? { ...prev, ...dbUpdates } : prev);
            // Persist to DB
            if (invoiceId) {
                supabase.from('sales_transactions')
                    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
                    .eq('id', invoiceId)
                    .then(() => { console.log('[SalesDelivery] ✅ Fields persisted:', Object.keys(dbUpdates)); }, 
                          (err: any) => { console.warn('[SalesDelivery] DB update error:', err); });
            }
        }
    }, [invoiceId]);

    // ═══ Save Draft Manually ═══
    const handleSaveDraft = useCallback(async () => {
        if (!invoiceId) return;
        setIsSavingDraft(true);
        try {
            const draft = {
                rolls: selectedRolls,
                warehouse_id: selectedWarehouseId,
                saved_at: new Date().toISOString(),
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));

            await supabase
                .from('sales_transactions')
                .update({
                    delivery_draft: draft,
                    stage: selectedRolls.length > 0 ? 'in_delivery' : invoiceData?.stage,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', invoiceId);

            toast.success(tl(
                `✅ تم حفظ المسودة (${selectedRolls.length} رولون)`,
                `✅ Draft saved (${selectedRolls.length} rolls)`
            ));
        } catch (err) {
            console.error('Save draft error:', err);
            toast.error(tl('❌ فشل حفظ المسودة', '❌ Draft save failed'));
        } finally {
            setIsSavingDraft(false);
        }
    }, [invoiceId, selectedRolls, selectedWarehouseId, draftKey, invoiceData, tl]);

    // ═══ Delivery Progress ═══
    const deliveryProgress = useMemo(() => {
        const expectedMeters = sourceItems.reduce((s, si) => s + (Number(si.quantity) || 0), 0);
        const selectedMeters = selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
        const percent = expectedMeters > 0 ? Math.min(100, (selectedMeters / expectedMeters) * 100) : 0;
        return {
            percent: Math.round(percent * 10) / 10,
            selectedMeters,
            expectedMeters,
            rollCount: selectedRolls.length,
        };
    }, [sourceItems, selectedRolls]);

    // Is this a partial delivery?
    const isPartialDelivery = useMemo(() => {
        return deliveryProgress.percent < 99;
    }, [deliveryProgress.percent]);

    // ═══ Confirm Delivery — delivery_method aware ═══
    const handleConfirmDelivery = useCallback(async () => {
        if (!invoiceId || !selectedWarehouseId || selectedRolls.length === 0) return;

        setIsCompleting(true);
        try {
            const now = new Date().toISOString();
            const deliveryMethod = invoiceData?.delivery_method || 'store_pickup';
            const isBranchDelivery = deliveryMethod === 'store_pickup';
            const rollIds = selectedRolls.map(r => r.id);

            // ── Group selected rolls by material_id ──
            const rollsByMaterial: Record<string, any[]> = {};
            for (const roll of selectedRolls) {
                const matId = roll.material_id;
                if (!rollsByMaterial[matId]) rollsByMaterial[matId] = [];
                rollsByMaterial[matId].push(roll);
            }

            // ═══ BATCH 1: Parallel — fetch costs + update roll status ═══
            const rollStatus = isBranchDelivery ? 'in_transit' : 'sold';
            const rollUpdate: any = { status: rollStatus, updated_at: now };
            if (isBranchDelivery) rollUpdate.warehouse_id = null;

            const [costResult, rollUpdateResult] = await Promise.all([
                // 1a. Fetch cost_per_meter
                supabase.from('fabric_rolls')
                    .select('id, material_id, cost_per_meter, current_length')
                    .in('id', rollIds),
                // 1b. Update roll status (independent)
                supabase.from('fabric_rolls')
                    .update(rollUpdate)
                    .in('id', rollIds),
            ]);

            if (rollUpdateResult.error) throw new Error(`Roll update failed: ${rollUpdateResult.error.message}`);

            // Build cost map from results
            const costByMaterial: Record<string, { totalCost: number; totalLength: number }> = {};
            if (costResult.data) {
                for (const rc of costResult.data) {
                    const matId = rc.material_id;
                    if (!costByMaterial[matId]) costByMaterial[matId] = { totalCost: 0, totalLength: 0 };
                    const len = Number(rc.current_length) || 0;
                    const cpm = Number(rc.cost_per_meter) || 0;
                    costByMaterial[matId].totalCost += cpm * len;
                    costByMaterial[matId].totalLength += len;
                }
            }

            // ═══ BATCH 2: Parallel — update items + insert movements ═══
            const movNumber = `MV-SALE-${now.slice(0, 10).replace(/-/g, '')}-${invoiceData?.invoice_no?.slice(-6) || invoiceId?.slice(0, 6) || 'SALE'}`;
            const movType = isBranchDelivery ? 'transfer_out' : 'sale';
            const movementRows = selectedRolls.map((roll: any, idx: number) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10),
                movement_type: movType,
                material_id: roll.material_id || null,
                color_id: roll.color_id || null,
                roll_id: roll.id,
                from_warehouse_id: selectedWarehouseId,
                quantity: roll.net_length || roll.current_length || 0,
                reference_type: 'sale_invoice',
                reference_id: invoiceId,
                reference_number: invoiceData?.invoice_no || invoiceData?.draft_no || '',
                notes: tl(
                    `${isBranchDelivery ? 'تحويل للفرع' : 'تسليم مبيعات'} — رولون ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)} م)`,
                    `${isBranchDelivery ? 'Branch transfer' : 'Sales delivery'} — roll ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)}m)`
                ),
            }));

            // Build all item update promises
            const itemUpdatePromises = sourceItems
                .filter(item => (rollsByMaterial[item.material_id] || []).length > 0)
                .map(item => {
                    const materialRolls = rollsByMaterial[item.material_id];
                    const deliveredLength = materialRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
                    const newDelivered = (Number(item.delivered_qty) || 0) + deliveredLength;
                    const matCost = costByMaterial[item.material_id];
                    const avgCostPerMeter = matCost && matCost.totalLength > 0 ? matCost.totalCost / matCost.totalLength : 0;
                    const updatePayload: any = {
                        delivered_qty: newDelivered,
                        updated_at: now,
                    };
                    if (avgCostPerMeter > 0) {
                        updatePayload.cost_price = Math.round(avgCostPerMeter * 10000) / 10000;
                    }
                    return supabase.from('sales_transaction_items').update(updatePayload).eq('id', item.id);
                });

            await Promise.all([
                // 2a. Update all items in parallel
                ...itemUpdatePromises,
                // 2b. Insert movements (independent)
                supabase.from('inventory_movements').insert(movementRows),
            ]);

            // ═══ BATCH 3: Parallel — recalc totals + update stage ═══
            // Recalculate from local data (skip extra DB fetch)
            let newSubtotal = 0, newDiscount = 0, newTax = 0;
            for (const item of sourceItems) {
                const materialRolls = rollsByMaterial[item.material_id] || [];
                const deliveredLength = materialRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
                const qty = (Number(item.delivered_qty) || 0) + deliveredLength;
                const price = Number(item.unit_price) || 0;
                const lineTotal = qty * price;
                const lineDiscount = lineTotal * (Number(item.discount_percent) || 0) / 100;
                const lineTax = (lineTotal - lineDiscount) * (Number(item.tax_rate) || 0) / 100;
                newSubtotal += lineTotal;
                newDiscount += lineDiscount;
                newTax += lineTax;
            }
            const newTotal = newSubtotal - newDiscount + newTax;

            const newStage = isBranchDelivery ? 'in_transit' : 'delivered';
            await supabase.from('sales_transactions')
                .update({
                    stage: newStage,
                    subtotal: Math.round(newSubtotal * 100) / 100,
                    discount_amount: Math.round(newDiscount * 100) / 100,
                    tax_amount: Math.round(newTax * 100) / 100,
                    total_amount: Math.round(newTotal * 100) / 100,
                    updated_at: now,
                    delivery_draft: null,
                    ...(!isBranchDelivery ? { delivered_at: now } : {}),
                })
                .eq('id', invoiceId);

            // Clean up localStorage draft
            try { localStorage.removeItem(draftKey); } catch { /* ignore */ }

            // ═══ Auto-post + notifications (non-blocking — fire and forget) ═══
            if (!isBranchDelivery) {
                supabase.rpc('post_sales_invoice', { p_invoice_id: invoiceId })
                    .then(({ data: r, error: e }) => {
                        if (e) console.warn('[Accounting] Post error:', e.message);
                        else if (r?.success) console.log('[Accounting] ✅ Posted! JE:', r.journal_entry_id);
                    }, () => {});
            }

            // Success toast — immediate
            const totalDeliveredLength = selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
            if (isBranchDelivery) {
                toast.success(tl(
                    `🚚 تم إخراج ${selectedRolls.length} رولون (${totalDeliveredLength.toFixed(1)} م) — بالطريق للفرع`,
                    `🚚 ${selectedRolls.length} rolls dispatched (${totalDeliveredLength.toFixed(1)}m) — In transit to branch`
                ));
            } else {
                toast.success(tl(
                    `✅ تسليم ${selectedRolls.length} رولون — ${totalDeliveredLength.toFixed(1)} م — تم الفوترة والترحيل`,
                    `✅ Delivered ${selectedRolls.length} rolls — ${totalDeliveredLength.toFixed(1)}m — Invoiced & posted`
                ));
            }

            // 🔔 Telegram — fire and forget (non-blocking)
            if (companyId) {
                const wh = warehouses.find(w => w.id === selectedWarehouseId);
                const whName = wh ? (language === 'ar' ? (wh.name_ar || wh.name_en || '') : (wh.name_en || wh.name_ar || '')) : '';
                telegramNotify.issueOrder(companyId, {
                    orderNumber: invoiceData?.invoice_no || invoiceData?.draft_no || '',
                    customerName: invoiceData?.customer_name || '',
                    warehouseName: whName,
                    items: sourceItems.map((si: any) => ({
                        name: si.material_name_ar || si.material_name || '',
                        qty: Math.round((Number(si.quantity) || 0) * 100) / 100,
                        unit: 'م',
                        rolls: (rollsByMaterial[si.material_id] || []).length,
                    })),
                    invoiceNumber: invoiceData?.invoice_no || '',
                }).catch(() => { });

                if (!isBranchDelivery && invoiceData?.customer_id) {
                    (async () => {
                        try {
                            const { data: cfg } = await supabase.from('telegram_bot_config')
                                .select('notification_preferences')
                                .eq('company_id', companyId)
                                .maybeSingle();
                            const prefs = cfg?.notification_preferences || {};
                            if (prefs.sales_notify_customer !== false) {
                                telegramNotify.customerGoodsReady(companyId!, {
                                    customerId: invoiceData.customer_id,
                                    customerName: invoiceData.customer_name || '',
                                    invoiceNumber: invoiceData.invoice_no || invoiceData.draft_no || '',
                                    totalQty: Math.round(totalDeliveredLength * 100) / 100,
                                }).catch(() => { });
                            }
                        } catch { /* ignore */ }
                    })();
                }
            }

            setShowConfirm(false);
            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('Delivery error:', err);
            toast.error(tl('❌ فشل في تسليم البضاعة', '❌ Delivery failed'));
        } finally {
            setIsCompleting(false);
        }
    }, [invoiceId, selectedWarehouseId, selectedRolls, sourceItems, companyId, tenantId, invoiceData, tl, onComplete, onOpenChange, draftKey, language, warehouses, isPartialDelivery]);

    // ═══ Reverse Delivery — إلغاء التسليم (Manager Only) ═══
    const [showReverseConfirm, setShowReverseConfirm] = useState(false);
    const [isReversing, setIsReversing] = useState(false);

    const handleReverseDelivery = useCallback(async () => {
        if (!invoiceId) return;

        setIsReversing(true);
        try {
            const now = new Date().toISOString();

            // ── 1. Find all inventory_movements linked to this invoice ──
            const { data: movements, error: mvErr } = await supabase
                .from('inventory_movements')
                .select('id, roll_id, material_id, quantity, movement_type')
                .eq('reference_id', invoiceId)
                .in('movement_type', ['sale', 'issue', 'delivery']);

            if (mvErr) console.warn('[ReverseDelivery] movements fetch error:', mvErr.message);

            const rollIds = (movements || []).map((m: any) => m.roll_id).filter(Boolean);
            const uniqueRollIds = [...new Set(rollIds)];

            console.log(`[ReverseDelivery] Found ${movements?.length || 0} movements, ${uniqueRollIds.length} unique rolls`);

            // ── 2. Reset fabric_rolls status back to 'available' ──
            if (uniqueRollIds.length > 0) {
                const { error: rollErr } = await supabase
                    .from('fabric_rolls')
                    .update({ status: 'available', updated_at: now })
                    .in('id', uniqueRollIds);

                if (rollErr) console.warn('[ReverseDelivery] roll reset error:', rollErr.message);
                else console.log(`[ReverseDelivery] ✅ Reset ${uniqueRollIds.length} rolls to 'available'`);
            }

            // ── 3. Delete inventory_movements ──
            if (movements && movements.length > 0) {
                const mvIds = movements.map((m: any) => m.id);
                const { error: delMvErr } = await supabase
                    .from('inventory_movements')
                    .delete()
                    .in('id', mvIds);

                if (delMvErr) console.warn('[ReverseDelivery] movement delete error:', delMvErr.message);
                else console.log(`[ReverseDelivery] ✅ Deleted ${mvIds.length} inventory_movements`);
            }

            // ── 4. Reset delivered_qty on sales_transaction_items ──
            const { error: itemErr } = await supabase
                .from('sales_transaction_items')
                .update({ delivered_qty: 0, cost_price: null, updated_at: now })
                .eq('transaction_id', invoiceId);

            if (itemErr) console.warn('[ReverseDelivery] item reset error:', itemErr.message);

            // ── 5. Delete COGS journal entry (if exists) ──
            const { data: txn } = await supabase
                .from('sales_transactions')
                .select('cogs_journal_entry_id, journal_entry_id')
                .eq('id', invoiceId)
                .maybeSingle();

            if (txn?.cogs_journal_entry_id) {
                await supabase.from('journal_entry_lines').delete().eq('entry_id', txn.cogs_journal_entry_id);
                await supabase.from('journal_entries').delete().eq('id', txn.cogs_journal_entry_id);
                console.log('[ReverseDelivery] ✅ Deleted COGS journal entry');
            }
            if (txn?.journal_entry_id) {
                await supabase.from('journal_entry_lines').delete().eq('entry_id', txn.journal_entry_id);
                await supabase.from('journal_entries').delete().eq('id', txn.journal_entry_id);
                console.log('[ReverseDelivery] ✅ Deleted sales journal entry');
            }

            // ── 6. Reset invoice stage back to 'confirmed' ──
            const { error: stageErr } = await supabase
                .from('sales_transactions')
                .update({
                    stage: 'confirmed',
                    delivery_draft: null,
                    delivered_at: null,
                    journal_entry_id: null,
                    cogs_journal_entry_id: null,
                    updated_at: now,
                })
                .eq('id', invoiceId);

            if (stageErr) console.warn('[ReverseDelivery] stage reset error:', stageErr.message);

            // ── 7. Clean up localStorage draft ──
            try { localStorage.removeItem(draftKey); } catch { /* ignore */ }

            toast.success(tl(
                `✅ تم إلغاء التسليم بنجاح — ${uniqueRollIds.length} رولون تم إعادتها للمستودع`,
                `✅ Delivery reversed — ${uniqueRollIds.length} rolls returned to inventory`
            ));

            setShowReverseConfirm(false);
            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('[ReverseDelivery] error:', err);
            toast.error(tl(
                '❌ فشل في إلغاء التسليم',
                '❌ Failed to reverse delivery'
            ));
        } finally {
            setIsReversing(false);
        }
    }, [invoiceId, draftKey, tl, onComplete, onOpenChange]);

    // ═══ Branch Receive — الفرع يؤكد استلام الشحنة ═══
    const [isBranchActing, setIsBranchActing] = useState(false);

    const handleBranchReceive = useCallback(async () => {
        if (!invoiceId) return;
        setIsBranchActing(true);
        try {
            const now = new Date().toISOString();

            // 1. Get all rolls for this invoice that are in_transit
            const { data: movements } = await supabase
                .from('inventory_movements')
                .select('roll_id')
                .eq('reference_id', invoiceId)
                .eq('movement_type', 'transfer_out');

            const rollIds = [...new Set((movements || []).map(m => m.roll_id).filter(Boolean))];

            // 1b. Fetch actual roll data (lengths + material_id)
            let rollDataMap: Record<string, { length: number; material_id: string | null }> = {};
            if (rollIds.length > 0) {
                const { data: rollsData } = await supabase
                    .from('fabric_rolls')
                    .select('id, current_length, net_length, material_id')
                    .in('id', rollIds);
                if (rollsData) {
                    rollsData.forEach((r: any) => {
                        rollDataMap[r.id] = {
                            length: Number(r.net_length || r.current_length || 0),
                            material_id: r.material_id,
                        };
                    });
                }
            }

            // 2. Update rolls: in_transit → at_branch, assign to receiving branch warehouse
            if (rollIds.length > 0) {
                const { error: rollErr } = await supabase
                    .from('fabric_rolls')
                    .update({
                        status: 'at_branch',
                        warehouse_id: selectedWarehouseId, // Branch warehouse
                        updated_at: now,
                    })
                    .in('id', rollIds);
                if (rollErr) console.warn('[BranchReceive] roll update error:', rollErr.message);
            }

            // 3. Create transfer_in movements
            const movNumber = `MV-BRN-${now.slice(0, 10).replace(/-/g, '')}-${invoiceData?.invoice_no?.slice(-6) || 'BRN'}`;
            const inMovements = rollIds.map((rollId, idx) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10),
                movement_type: 'transfer_in',
                material_id: rollDataMap[rollId]?.material_id || null,
                roll_id: rollId,
                to_warehouse_id: selectedWarehouseId,
                quantity: rollDataMap[rollId]?.length || 0,
                reference_type: 'sale_invoice',
                reference_id: invoiceId,
                reference_number: invoiceData?.invoice_no || '',
                notes: tl('استلام الفرع للشحنة', 'Branch received shipment'),
            }));

            if (inMovements.length > 0) {
                await supabase.from('inventory_movements').insert(inMovements);
            }

            // 4. Update invoice stage
            await supabase
                .from('sales_transactions')
                .update({ stage: 'at_branch', updated_at: now })
                .eq('id', invoiceId);

            toast.success(tl(
                `📥 تم استلام ${rollIds.length} رولون في الفرع — جاهز للتسليم للعميل`,
                `📥 ${rollIds.length} rolls received at branch — Ready for customer delivery`
            ));

            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('[BranchReceive] error:', err);
            toast.error(tl('❌ فشل في تأكيد الاستلام', '❌ Failed to confirm receipt'));
        } finally {
            setIsBranchActing(false);
        }
    }, [invoiceId, selectedWarehouseId, tenantId, companyId, invoiceData, tl, onComplete, onOpenChange]);

    // ═══ Branch Deliver — الفرع يسلّم للعميل + فوترة ═══
    const handleBranchDeliver = useCallback(async () => {
        if (!invoiceId) return;
        setIsBranchActing(true);
        try {
            const now = new Date().toISOString();

            // 1. Get rolls at_branch for this invoice
            const { data: movements } = await supabase
                .from('inventory_movements')
                .select('roll_id')
                .eq('reference_id', invoiceId)
                .in('movement_type', ['transfer_out', 'transfer_in']);

            const rollIds = [...new Set((movements || []).map(m => m.roll_id).filter(Boolean))];

            // 1b. Fetch actual roll data (lengths + material_id) before updating status
            let rollDataMap: Record<string, { length: number; material_id: string | null }> = {};
            if (rollIds.length > 0) {
                const { data: rollsData } = await supabase
                    .from('fabric_rolls')
                    .select('id, current_length, net_length, material_id')
                    .in('id', rollIds);
                if (rollsData) {
                    rollsData.forEach((r: any) => {
                        rollDataMap[r.id] = {
                            length: Number(r.net_length || r.current_length || 0),
                            material_id: r.material_id,
                        };
                    });
                }
            }

            // 2. Update rolls: at_branch → sold
            if (rollIds.length > 0) {
                await supabase
                    .from('fabric_rolls')
                    .update({ status: 'sold', warehouse_id: null, updated_at: now })
                    .in('id', rollIds);
            }

            // 3. Create sale movements from branch
            const movNumber = `MV-BSALE-${now.slice(0, 10).replace(/-/g, '')}-${invoiceData?.invoice_no?.slice(-6) || 'BSALE'}`;
            const saleMovements = rollIds.map((rollId, idx) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10),
                movement_type: 'sale',
                material_id: rollDataMap[rollId]?.material_id || null,
                roll_id: rollId,
                from_warehouse_id: selectedWarehouseId,
                quantity: rollDataMap[rollId]?.length || 0,
                reference_type: 'sale_invoice',
                reference_id: invoiceId,
                reference_number: invoiceData?.invoice_no || '',
                notes: tl('تسليم للعميل من الفرع', 'Delivered to customer from branch'),
            }));

            if (saleMovements.length > 0) {
                await supabase.from('inventory_movements').insert(saleMovements);
            }

            // 4. Update invoice: delivered_at + stage
            await supabase
                .from('sales_transactions')
                .update({ stage: 'delivered', delivered_at: now, updated_at: now })
                .eq('id', invoiceId);

            // 5. Auto-post (billing)
            try {
                console.log('[BranchDeliver] 📒 Auto-posting sales invoice...');
                const { data: postResult, error: postError } = await supabase.rpc('post_sales_invoice', {
                    p_invoice_id: invoiceId,
                });
                if (postError) {
                    console.warn('[BranchDeliver] Post error:', postError.message);
                } else if (postResult?.success) {
                    console.log('[BranchDeliver] ✅ Invoice posted! JE:', postResult.journal_entry_id);
                }
            } catch (accErr) {
                console.warn('[BranchDeliver] Non-critical error:', accErr);
            }

            // 6. Notify customer
            if (companyId && invoiceData?.customer_id) {
                telegramNotify.customerGoodsReady(companyId, {
                    customerId: invoiceData.customer_id,
                    customerName: invoiceData.customer_name || '',
                    invoiceNumber: invoiceData.invoice_no || invoiceData.draft_no || '',
                    totalQty: 0,
                }).catch(() => { });
            }

            toast.success(tl(
                `✅ تم تسليم العميل — تمت الفوترة والترحيل المحاسبي`,
                `✅ Delivered to customer — Invoiced & posted`
            ));

            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('[BranchDeliver] error:', err);
            toast.error(tl('❌ فشل في التسليم للعميل', '❌ Failed to deliver to customer'));
        } finally {
            setIsBranchActing(false);
        }
    }, [invoiceId, selectedWarehouseId, tenantId, companyId, invoiceData, tl, onComplete, onOpenChange]);

    // ═══ Branch Return — إرجاع البضاعة للمستودع الأصلي ═══
    const handleBranchReturn = useCallback(async () => {
        if (!invoiceId) return;
        setIsBranchActing(true);
        try {
            const now = new Date().toISOString();

            // 1. Get original warehouse from transfer_out movements
            const { data: outMovements } = await supabase
                .from('inventory_movements')
                .select('roll_id, from_warehouse_id')
                .eq('reference_id', invoiceId)
                .eq('movement_type', 'transfer_out');

            const rollIds = [...new Set((outMovements || []).map(m => m.roll_id).filter(Boolean))];
            const originalWarehouseId = outMovements?.[0]?.from_warehouse_id || selectedWarehouseId;

            // 2. Return rolls to original warehouse
            if (rollIds.length > 0) {
                await supabase
                    .from('fabric_rolls')
                    .update({
                        status: 'available',
                        warehouse_id: originalWarehouseId,
                        updated_at: now,
                    })
                    .in('id', rollIds);
            }

            // 3. Create return movements
            const movNumber = `MV-RTN-${now.slice(0, 10).replace(/-/g, '')}-${invoiceData?.invoice_no?.slice(-6) || 'RTN'}`;
            const returnMovements = rollIds.map((rollId, idx) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10),
                movement_type: 'return',
                roll_id: rollId,
                to_warehouse_id: originalWarehouseId,
                from_warehouse_id: selectedWarehouseId,
                quantity: 0,
                reference_type: 'sale_invoice',
                reference_id: invoiceId,
                reference_number: invoiceData?.invoice_no || '',
                notes: tl('إرجاع من الفرع للمستودع', 'Returned from branch to warehouse'),
            }));

            if (returnMovements.length > 0) {
                await supabase.from('inventory_movements').insert(returnMovements);
            }

            // 4. Reset delivered_qty
            await supabase
                .from('sales_transaction_items')
                .update({ delivered_qty: 0, cost_price: null, updated_at: now })
                .eq('transaction_id', invoiceId);

            // 5. Update stage
            await supabase
                .from('sales_transactions')
                .update({
                    stage: 'returned',
                    delivery_draft: null,
                    delivered_at: null,
                    updated_at: now,
                })
                .eq('id', invoiceId);

            toast.success(tl(
                `↩️ تم إرجاع ${rollIds.length} رولون للمستودع — لم تتم الفوترة`,
                `↩️ ${rollIds.length} rolls returned to warehouse — No billing`
            ));

            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('[BranchReturn] error:', err);
            toast.error(tl('❌ فشل في الإرجاع', '❌ Failed to return'));
        } finally {
            setIsBranchActing(false);
        }
    }, [invoiceId, selectedWarehouseId, tenantId, companyId, invoiceData, tl, onComplete, onOpenChange]);

    // ═══ Handle close ═══
    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // ═══ Header Extra — Compact single row + thin progress bar ═══
    const HeaderExtra = (
        <div className="flex flex-col gap-0">
            {/* Single merged row: Badge + Warehouse + Invoice + Stats + Actions */}
            <div className={`px-4 py-2 bg-gradient-to-r ${effectiveViewMode
                ? 'from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20'
                : 'from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20'}`}>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Delivery Type Badge — stage-aware */}
                    {(() => {
                        const stage = invoiceData?.stage;
                        if (stage === 'in_transit') return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                <Truck className="w-3.5 h-3.5" /> {tl('🚚 بالطريق للفرع', '🚚 In Transit')}
                            </div>
                        );
                        if (stage === 'at_branch') return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <Building2 className="w-3.5 h-3.5" /> {tl('🏪 في الفرع', '🏪 At Branch')}
                            </div>
                        );
                        if (stage === 'returned') return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                <RotateCcw className="w-3.5 h-3.5" /> {tl('↩️ مُرجع', '↩️ Returned')}
                            </div>
                        );
                        if (effectiveViewMode) return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                                <PackageCheck className="w-3.5 h-3.5" /> {tl('تم التسليم ✅', 'Delivered ✅')}
                            </div>
                        );
                        return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                                <Truck className="w-3.5 h-3.5" /> {tl('تسليم مبيعات', 'Sales Delivery')}
                            </div>
                        );
                    })()}

                    {/* Warehouse — only in edit mode */}
                    {!effectiveViewMode && (
                        <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger className="h-7 w-[150px] text-xs bg-white dark:bg-slate-800 shadow-sm">
                                    <SelectValue placeholder={tl('اختر المستودع', 'Select warehouse')} />
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
                    )}

                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                    {/* Invoice + Customer + Branch — compact inline */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {/* Branch Node */}
                        {invoiceData?.from_warehouse_name && (
                            <>
                                <Warehouse className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-600 truncate max-w-[140px]" title={invoiceData.from_warehouse_name}>
                                    {invoiceData.from_warehouse_name}
                                </span>
                                <span className="text-gray-300 mx-1">|</span>
                            </>
                        )}
                        
                        {/* Invoice Node */}
                        <FileText className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span className="text-xs font-mono font-bold text-rose-600">
                            {invoiceData?.invoice_no || invoiceData?.draft_no || invoiceId?.substring(0, 8)}
                        </span>
                        
                        {/* Customer Node */}
                        {invoiceData?.customer_name && (
                            onOpenInvoice ? (
                                <button
                                    type="button"
                                    onClick={() => openInvoiceWithFullData()}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate transition-colors font-medium max-w-[180px]"
                                    title={tl('فتح الفاتورة المالية', 'Open Financial Invoice')}
                                >
                                    — {invoiceData.customer_name}
                                </button>
                            ) : (
                                <span className="text-xs text-gray-500 truncate max-w-[180px]">
                                    — {invoiceData.customer_name}
                                </span>
                            )
                        )}
                    </div>

                    {/* Inline stats pills */}
                    {sourceItems.length > 0 && (
                        <>
                            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400">{tl('بنود', 'Items')}</span>
                                <span className="text-xs font-bold text-blue-600 font-mono">{sourceItems.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400">{tl('رولونات', 'Rolls')}</span>
                                <span className={`text-xs font-bold font-mono ${selectedRolls.length > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                    {selectedRolls.length}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Delivery Method — read-only info badge (editing only from DeliveryInfoTab) */}
                    <>
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                        {(() => {
                            const dm = invoiceData?.delivery_method || 'store_pickup';
                            const colorClass = dm === 'store_pickup'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : dm === 'direct_delivery'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : dm === 'direct_pickup'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                            return (
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colorClass}`}>
                                    {dm === 'store_pickup' && <><Building2 className="w-3 h-3" /> {tl('عبر الفرع', 'Branch')}</>}
                                    {dm === 'direct_pickup' && <><Warehouse className="w-3 h-3" /> {tl('مباشر', 'Pickup')}</>}
                                    {dm === 'direct_delivery' && <><Truck className="w-3 h-3" /> {tl('توصيل', 'Delivery')}</>}
                                    {dm === 'carrier' && <><Navigation className="w-3 h-3" /> {tl('شحن', 'Carrier')}</>}
                                    {!['store_pickup', 'direct_pickup', 'direct_delivery', 'carrier'].includes(dm) && <><Truck className="w-3 h-3" /> {dm}</>}
                                </div>
                            );
                        })()}
                    </>

                    {/* Right actions — pushed to end */}
                    <div className="flex items-center gap-1.5 ms-auto shrink-0">
                        {effectiveViewMode ? (
                            <>
                                {/* Open Invoice button */}
                                {onOpenInvoice && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openInvoiceWithFullData()}
                                        className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-[11px] h-7 px-2"
                                    >
                                        <FileText className="w-3 h-3" />
                                        {tl('الفاتورة', 'Invoice')}
                                    </Button>
                                )}
                                {/* Edit toggle */}
                                {canEdit && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditing(true)}
                                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 text-[11px] h-7 px-2"
                                    >
                                        ✏️ {tl('تعديل', 'Edit')}
                                    </Button>
                                )}
                                {/* Reverse delivery — only for delivered/posted */}
                                {canEdit && isDelivered && ['delivered', 'posted'].includes(invoiceData?.stage) && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowReverseConfirm(true)}
                                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50 text-[11px] h-7 px-2"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        {tl('إلغاء', 'Reverse')}
                                    </Button>
                                )}

                                {/* ═══ Branch Actions — in_transit stage ═══ */}
                                {invoiceData?.stage === 'in_transit' && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={handleBranchReceive}
                                            disabled={isBranchActing}
                                            className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 h-7 px-3 text-xs"
                                        >
                                            {isBranchActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                                            {tl('تأكيد الاستلام', 'Confirm Receipt')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleBranchReturn}
                                            disabled={isBranchActing}
                                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50 text-[11px] h-7 px-2"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            {tl('إرجاع', 'Return')}
                                        </Button>
                                    </>
                                )}

                                {/* ═══ Branch Actions — at_branch stage ═══ */}
                                {invoiceData?.stage === 'at_branch' && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={handleBranchDeliver}
                                            disabled={isBranchActing}
                                            className="gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/30 h-7 px-3 text-xs"
                                        >
                                            {isBranchActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                                            {tl('تسليم للعميل', 'Deliver to Customer')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleBranchReturn}
                                            disabled={isBranchActing}
                                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50 text-[11px] h-7 px-2"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            {tl('إرجاع', 'Return')}
                                        </Button>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Online badge — compact dot */}
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${navigator.onLine
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    {navigator.onLine ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                                </div>
                                {/* Back to view mode */}
                                {viewMode && isEditing && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                        className="gap-1 text-teal-600 border-teal-200 hover:bg-teal-50 text-[11px] h-7 px-2"
                                    >
                                        👁 {tl('عرض', 'View')}
                                    </Button>
                                )}
                                {/* Deliver Button */}
                                {selectedRolls.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => setShowConfirm(true)}
                                        disabled={isCompleting}
                                        className="gap-1.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-bold shadow-lg shadow-rose-500/30 px-3 h-7 text-xs"
                                    >
                                        {isCompleting
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <PackageCheck className="h-3.5 w-3.5" />
                                        }
                                        {tl('تسليم', 'Deliver')}
                                        <span className="bg-rose-800/30 text-white text-[9px] px-1 py-0.5 rounded-full font-mono">
                                            {selectedRolls.length}
                                        </span>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Thin progress bar — 3px, no labels */}
            {sourceItems.length > 0 && (
                <div className="relative h-[3px] bg-gray-200 dark:bg-gray-700">
                    <div
                        className={`absolute inset-y-0 start-0 rounded-e-full transition-all duration-700 ease-out ${deliveryProgress.percent >= 100
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : deliveryProgress.percent > 0
                                ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                                : ''
                            }`}
                        style={{ width: `${deliveryProgress.percent}%` }}
                    />
                    {/* Percentage tooltip — only when > 0 */}
                    {deliveryProgress.percent > 0 && (
                        <span className={`absolute top-full mt-0.5 text-[9px] font-mono font-bold ${
                            deliveryProgress.percent >= 100 ? 'text-green-600' : 'text-rose-500'
                        }`} style={{ [document.documentElement.dir === 'rtl' ? 'right' : 'left']: `${Math.min(deliveryProgress.percent, 95)}%` }}>
                            {deliveryProgress.percent.toFixed(0)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Unified Accounting Sheet */}
            <UnifiedAccountingSheet
                isOpen={isOpen}
                onClose={handleClose}
                docType={'sales_delivery' as UnifiedDocType}
                tradeMode="sales"
                mode={effectiveViewMode ? 'view' : 'create'}
                data={enhancedData}
                onSave={effectiveViewMode ? undefined : handleSave}
                headerExtra={HeaderExtra}
                onRefresh={onComplete}
                defaultTab="sales_delivery_items"
                hideMainDocTabs={true}
            />

            {/* Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-700">
                            <PackageCheck className="h-5 w-5" />
                            {tl('تأكيد التسليم', 'Confirm Delivery')}
                        </DialogTitle>
                        <DialogDescription>
                            {tl(
                                `سيتم تسليم ${selectedRolls.length} رولون بإجمالي ${deliveryProgress.selectedMeters.toFixed(1)} متر`,
                                `${selectedRolls.length} rolls will be delivered, total ${deliveryProgress.selectedMeters.toFixed(1)} meters`
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Partial / Complete indicator */}
                        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold ${isPartialDelivery
                            ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700'
                            : 'bg-green-100 dark:bg-green-900/20 text-green-700'
                            }`}>
                            {isPartialDelivery
                                ? tl('📦 تسليم جزئي — ستبقى الفاتورة "قيد التسليم"', '📦 Partial delivery — invoice stays "in delivery"')
                                : tl('✅ تسليم كامل — سيتم تحويل الحالة إلى "مُسلّم"', '✅ Full delivery — status will change to "delivered"')
                            }
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('الرولونات', 'Rolls')}</div>
                                <div className="text-lg font-bold text-rose-600">{selectedRolls.length}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('الأمتار', 'Meters')}</div>
                                <div className="text-lg font-bold text-blue-600 font-mono">
                                    {deliveryProgress.selectedMeters.toFixed(1)}
                                </div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('المتبقي', 'Remaining')}</div>
                                <div className="text-lg font-bold text-amber-600 font-mono">
                                    {Math.max(0, deliveryProgress.expectedMeters - deliveryProgress.selectedMeters).toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Stage transition */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className="text-[10px] capitalize">{invoiceData?.stage || 'confirmed'}</Badge>
                            <span>→</span>
                            <Badge className={`text-[10px] ${isPartialDelivery ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                {isPartialDelivery ? 'in_delivery' : 'delivered'}
                            </Badge>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>
                            {tl('إلغاء', 'Cancel')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => { handleSaveDraft(); setShowConfirm(false); }}
                            disabled={isSavingDraft}
                            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                            {isSavingDraft && <Loader2 className="h-4 w-4 animate-spin" />}
                            {tl('💾 حفظ مسودة', '💾 Save Draft')}
                        </Button>
                        <Button
                            onClick={handleConfirmDelivery}
                            disabled={isCompleting}
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                            {isCompleting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {tl('✅ تأكيد التحميل والكميات', '✅ Confirm Loading & Quantities')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Reverse Delivery Confirmation Dialog ═══ */}
            <Dialog open={showReverseConfirm} onOpenChange={setShowReverseConfirm}>
                <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                            {tl('إلغاء التسليم', 'Reverse Delivery')}
                        </DialogTitle>
                        <DialogDescription>
                            {tl(
                                'سيتم إلغاء التسليم وإعادة جميع الرولونات للمستودع. هذا الإجراء لا يمكن التراجع عنه.',
                                'This will reverse the delivery and return all rolls to inventory. This action cannot be undone.'
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Warning Card */}
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-4 space-y-2">
                            <div className="text-sm font-bold text-red-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {tl('سيتم تنفيذ الإجراءات التالية:', 'The following actions will be performed:')}
                            </div>
                            <ul className="text-xs text-red-600 space-y-1.5 list-disc list-inside">
                                <li>{tl('إعادة حالة الرولونات المسلّمة إلى "متاح"', 'Reset delivered rolls status to "available"')}</li>
                                <li>{tl('حذف حركات المخزون المرتبطة بالتسليم', 'Delete delivery inventory movements')}</li>
                                <li>{tl('إعادة الكميات المسلّمة إلى صفر', 'Reset delivered quantities to zero')}</li>
                                <li>{tl('حذف القيود المحاسبية (تكلفة البضائع المباعة)', 'Delete COGS journal entries')}</li>
                                <li>{tl('إعادة حالة الفاتورة إلى "مؤكدة"', 'Revert invoice stage to "confirmed"')}</li>
                            </ul>
                        </div>

                        {/* Invoice Info */}
                        <div className="flex items-center justify-center gap-3 text-sm">
                            <span className="font-mono font-bold text-rose-600">
                                {invoiceData?.invoice_no || invoiceData?.draft_no || ''}
                            </span>
                            <span className="text-gray-400">—</span>
                            <span className="text-gray-600">{invoiceData?.customer_name || ''}</span>
                        </div>

                        {/* Stage transition */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className="text-[10px] capitalize bg-teal-50 text-teal-700 border-teal-200">
                                {invoiceData?.stage || 'delivered'}
                            </Badge>
                            <span>→</span>
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                                confirmed
                            </Badge>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowReverseConfirm(false)}>
                            {tl('إلغاء', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleReverseDelivery}
                            disabled={isReversing}
                            className="bg-red-600 hover:bg-red-700 text-white gap-2"
                        >
                            {isReversing && <Loader2 className="h-4 w-4 animate-spin" />}
                            {tl('⚠️ تأكيد إلغاء التسليم', '⚠️ Confirm Reverse')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default SalesDeliveryDialog;
