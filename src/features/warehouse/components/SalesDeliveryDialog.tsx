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
    Wifi, WifiOff,
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
        }
    }, [isOpen]);

    // ═══ Draft key for localStorage ═══
    const draftKey = `delivery_draft_${invoiceId}`;

    // ═══ NOTE: Auto-save is handled directly in SalesDeliveryItemsTab.notifyParent() ═══
    // No auto-save here — avoids race condition where Dialog's empty selectedRolls
    // would overwrite the draft saved by the Items tab.

    // ═══ Fetch invoice details + items + restore draft/delivered rolls ═══
    useEffect(() => {
        if (!invoiceId || !isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            setDraftRestored(false);
            setIsDelivered(false);
            try {
                // 1. Fetch invoice header
                const { data: inv, error: invErr } = await supabase
                    .from('sales_transactions')
                    .select('*')
                    .eq('id', invoiceId)
                    .maybeSingle();

                if (invErr) console.warn('[SalesDelivery] invoice fetch error:', invErr.message);
                if (inv) {
                    setInvoiceData(inv);
                    if (inv.warehouse_id) setSelectedWarehouseId(inv.warehouse_id);
                }

                // 2. Fetch invoice items
                const { data: items, error: itemsErr } = await supabase
                    .from('sales_transaction_items')
                    .select('*')
                    .eq('transaction_id', invoiceId);

                if (itemsErr) console.warn('[SalesDelivery] items fetch error:', itemsErr.message);

                if (items && items.length > 0) {
                    const materialIds = [...new Set(items.map((i: any) => i.material_id).filter(Boolean))];
                    let materialsMap: Record<string, { name_ar: string; name_en: string }> = {};

                    if (materialIds.length > 0) {
                        const { data: mats } = await supabase
                            .from('fabric_materials')
                            .select('id, name_ar, name_en')
                            .in('id', materialIds);
                        if (mats) {
                            materialsMap = mats.reduce((acc: any, m: any) => {
                                acc[m.id] = { name_ar: m.name_ar || '', name_en: m.name_en || '' };
                                return acc;
                            }, {});
                        }
                    }

                    setSourceItems(items.map((item: any) => {
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
                    }));
                } else {
                    setSourceItems([]);
                }

                // ═══ 3. AUTO-DETECT DELIVERED STATE ═══
                // إذا كانت الفاتورة مسلّمة بالفعل ← جلب الرولونات من inventory_movements
                const stageDelivered = ['delivered', 'partial_delivered', 'in_delivery'];
                const isCompletedDelivery = inv && stageDelivered.includes(inv.stage);

                if (isCompletedDelivery) {
                    console.log('[SalesDelivery] 📦 Stage is', inv.stage, '| invoiceId:', invoiceId, '| invoice_no:', inv.invoice_no);

                    // محاولة 1: البحث بـ reference_id
                    let movements: any[] = [];
                    const { data: byId, error: mvErr1 } = await supabase
                        .from('inventory_movements')
                        .select('roll_id, quantity, material_id, movement_type, reference_id, reference_number')
                        .eq('reference_id', invoiceId);

                    if (mvErr1) console.warn('[SalesDelivery] byId error:', mvErr1.message);
                    console.log('[SalesDelivery] byId found:', byId?.length ?? 0, byId?.slice(0, 2));

                    if (byId && byId.length > 0) {
                        movements = byId;
                    } else if (inv.invoice_no) {
                        // محاولة 2: البحث بـ reference_number (لو reference_id مختلف)
                        const { data: byNum, error: mvErr2 } = await supabase
                            .from('inventory_movements')
                            .select('roll_id, quantity, material_id, movement_type, reference_id, reference_number')
                            .eq('reference_number', inv.invoice_no);
                        if (mvErr2) console.warn('[SalesDelivery] byNum error:', mvErr2.message);
                        console.log('[SalesDelivery] byNum found:', byNum?.length ?? 0, byNum?.slice(0, 2));
                        movements = byNum || [];
                    }

                    // فلترة على movement_type بعد الجلب (لا نُقيّد في الاستعلام)
                    const saleMovements = movements.filter((m: any) =>
                        ['sale', 'issue', 'delivery'].includes(m.movement_type) || !m.movement_type
                    );
                    console.log('[SalesDelivery] sale movements after filter:', saleMovements.length);

                    if (saleMovements.length > 0) {
                        const rollIds = saleMovements.map((m: any) => m.roll_id).filter(Boolean);
                        if (rollIds.length > 0) {
                            const { data: rolls } = await supabase
                                .from('fabric_rolls')
                                .select('id, roll_number, material_id, current_length, color_id, color_name, status, warehouse_id')
                                .in('id', rollIds);

                            if (rolls && rolls.length > 0) {
                                const mapped = rolls.map((r: any) => {
                                    const mv = saleMovements.find((m: any) => m.roll_id === r.id);
                                    return {
                                        ...r,
                                        net_length: mv?.quantity || r.current_length || 0,
                                        color_name: r.color_name || '',
                                        _delivered: true,
                                    };
                                });
                                console.log('[SalesDelivery] ✅ Loaded', mapped.length, 'delivered rolls');
                                setSelectedRolls(mapped);
                                setDraftRestored(true);
                                setIsDelivered(inv.stage === 'delivered');
                                return;
                            }
                        }
                    }
                    // لا توجد حركات — الحالة مسلّمة لكن قد يكون البيانات قديمة
                    if (inv.stage === 'delivered') setIsDelivered(true);
                    return;
                }

                // ═══ 4. RESTORE DRAFT (for in-progress deliveries only) ═══
                if (selectedRolls.length === 0 && !draftRestored) {
                    let restoredRolls: any[] | null = null;

                    try {
                        const localDraft = localStorage.getItem(draftKey);
                        if (localDraft) {
                            const parsed = JSON.parse(localDraft);
                            if (parsed?.rolls?.length > 0) {
                                restoredRolls = parsed.rolls;
                                console.log(`[Draft] 📂 Restored ${restoredRolls!.length} rolls from localStorage`);
                            }
                        }
                    } catch (e) { /* ignore */ }

                    if (!restoredRolls && inv?.delivery_draft?.rolls?.length > 0) {
                        restoredRolls = inv.delivery_draft.rolls;
                        console.log(`[Draft] ☁️ Restored ${restoredRolls!.length} rolls from Supabase`);
                    }

                    if (restoredRolls && restoredRolls.length > 0) {
                        setSelectedRolls(restoredRolls);
                        setDraftRestored(true);
                        toast.info(tl(
                            `📂 تم استعادة مسودة التحميل (${restoredRolls.length} رولون)`,
                            `📂 Delivery draft restored (${restoredRolls.length} rolls)`
                        ));
                    }
                }
            } catch (err) {
                console.error('SalesDeliveryDialog fetchData:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [invoiceId, isOpen]);

    // ═══ VIEW MODE / COMPLETED: جلب الرولونات المسلّمة ═══
    useEffect(() => {
        // يعمل عند: isDelivered (مكتشف تلقائياً) أو viewMode prop صريح
        const shouldFetch = (isDelivered || viewMode) && invoiceId && isOpen;
        if (!shouldFetch) return;
        if (selectedRolls.length > 0 && draftRestored) return; // مُسبق التحميل في fetchData

        const fetchDeliveredRolls = async () => {
            console.log('[SalesDelivery] 📦 fetchDeliveredRolls — invoiceId:', invoiceId);

            // ── مرحلة 1: جلب الحركات مع roll_id أو بدونه ──
            const { data: movements, error: mvErr } = await supabase
                .from('inventory_movements')
                .select('roll_id, quantity, material_id, notes')
                .eq('reference_id', invoiceId)
                .in('movement_type', ['sale', 'issue']);

            if (mvErr) console.warn('[SalesDelivery] movements error:', mvErr.message);
            console.log('[SalesDelivery] movements found:', movements?.length ?? 0);

            // ── مرحلة 2: محاولة بـ reference_number إذا فشل reference_id ──
            let allMovements = movements || [];
            if (allMovements.length === 0) {
                const { data: mvByRef } = await supabase
                    .from('inventory_movements')
                    .select('roll_id, quantity, material_id, notes')
                    .eq('reference_number', invoiceData?.invoice_no || '')
                    .in('movement_type', ['sale', 'issue']);
                allMovements = mvByRef || [];
                console.log('[SalesDelivery] byRef found:', allMovements.length);
            }

            // ── مرحلة 3: جلب الرولونات المباشرة (لو roll_id موجود) ──
            const rollIds = allMovements.map((m: any) => m.roll_id).filter(Boolean);
            console.log('[SalesDelivery] roll_ids with value:', rollIds.length, '/ total:', allMovements.length);

            if (rollIds.length > 0) {
                const { data: rolls } = await supabase
                    .from('fabric_rolls')
                    .select('id, roll_number, material_id, current_length, color_id, color_name, status')
                    .in('id', rollIds);

                if (rolls && rolls.length > 0) {
                    const mappedRolls = rolls.map((r: any) => {
                        const mv = allMovements.find((m: any) => m.roll_id === r.id);
                        return {
                            ...r,
                            net_length: mv?.quantity || r.current_length || 0,
                            _viewOnly: true,
                            color_name: r.color_name || '',
                            _delivered: true,
                        };
                    });
                    console.log('[SalesDelivery] ✅ loaded from inventory_movements:', mappedRolls.length);
                    setSelectedRolls(mappedRolls);
                    setIsDelivered(true);
                    setDraftRestored(true);
                    return;
                }
            }

            // ── مرحلة 4: Fallback — لا roll_ids (تسليم قديم بالإجمالي)
            // نعرض الرولونات المباعة من fabric_rolls للمواد في الفاتورة
            console.log('[SalesDelivery] ⚠️ No roll_ids in movements — trying fabric_rolls[status=sold] for invoice materials');
            const materialIds = sourceItems.map((i: any) => i.material_id).filter(Boolean);
            if (materialIds.length > 0) {
                const { data: soldRolls } = await supabase
                    .from('fabric_rolls')
                    .select('id, roll_number, material_id, current_length, color_id, color_name, status, warehouse_id')
                    .in('material_id', materialIds)
                    .eq('status', 'sold');

                if (soldRolls && soldRolls.length > 0) {
                    // ربط الكمية من الحركة الإجمالية للمادة
                    const movByMat: Record<string, number> = {};
                    allMovements.forEach((m: any) => {
                        if (m.material_id) movByMat[m.material_id] = (movByMat[m.material_id] || 0) + (m.quantity || 0);
                    });

                    const mapped = soldRolls.map((r: any) => ({
                        ...r,
                        net_length: r.current_length || 0,
                        _viewOnly: true,
                        _delivered: true,
                        color_name: r.color_name || '',
                    }));
                    console.log('[SalesDelivery] ✅ loaded from sold rolls:', mapped.length);
                    setSelectedRolls(mapped);
                    setIsDelivered(true);
                    setDraftRestored(true);
                    return;
                }
            }

            // لا يوجد شيء — نضبط isDelivered فقط
            console.log('[SalesDelivery] ⚠️ No rolls found — marking as delivered with no roll details');
            setIsDelivered(true);
        };
        fetchDeliveredRolls();
    }, [viewMode, isDelivered, invoiceId, isOpen]);

    // ═══ Stable callback ref for delivery data changes ═══
    const onDeliveryDataChangeRef = React.useRef<(updates: any) => void>(() => { });
    onDeliveryDataChangeRef.current = (updates: any) => {
        if (updates?.selected_rolls) {
            setSelectedRolls(updates.selected_rolls);
        }
    };

    // ═══ Enhanced data for UnifiedAccountingSheet ═══
    const enhancedData = useMemo(() => ({
        ...invoiceData,
        source_items: sourceItems,
        warehouse_id: selectedWarehouseId,
        selected_rolls: selectedRolls,
        rolls_count: selectedRolls.length,
        total_length: selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0),
        view_mode: effectiveViewMode,  // ← يتغيّر ديناميكياً عند التبديل بين العرض والتعديل
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
    }, []);

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

    // ═══ Confirm Delivery (supports partial) ═══
    const handleConfirmDelivery = useCallback(async () => {
        if (!invoiceId || !selectedWarehouseId || selectedRolls.length === 0) return;

        setIsCompleting(true);
        try {
            const now = new Date().toISOString();

            // ── 1. Group selected rolls by material_id ──
            const rollsByMaterial: Record<string, any[]> = {};
            for (const roll of selectedRolls) {
                const matId = roll.material_id;
                if (!rollsByMaterial[matId]) rollsByMaterial[matId] = [];
                rollsByMaterial[matId].push(roll);
            }

            // ── 1.5 Fetch cost_per_meter from DB for accurate COGS ──
            const rollIds = selectedRolls.map(r => r.id);
            const { data: rollCosts } = await supabase
                .from('fabric_rolls')
                .select('id, material_id, cost_per_meter, current_length')
                .in('id', rollIds);

            // Build cost map: material_id → { totalCost, totalLength }
            const costByMaterial: Record<string, { totalCost: number; totalLength: number }> = {};
            if (rollCosts) {
                for (const rc of rollCosts) {
                    const matId = rc.material_id;
                    if (!costByMaterial[matId]) costByMaterial[matId] = { totalCost: 0, totalLength: 0 };
                    const len = Number(rc.current_length) || 0;
                    const cpm = Number(rc.cost_per_meter) || 0;
                    costByMaterial[matId].totalCost += cpm * len;
                    costByMaterial[matId].totalLength += len;
                }
            }

            // ── 2. Update fabric_rolls status → 'sold' ──
            const { error: rollError } = await supabase
                .from('fabric_rolls')
                .update({ status: 'sold', updated_at: now })
                .in('id', rollIds);

            if (rollError) throw new Error(`Roll update failed: ${rollError.message}`);

            // ── 3. Update delivered_qty + cost_price on each sales_transaction_item ──
            for (const item of sourceItems) {
                const materialRolls = rollsByMaterial[item.material_id] || [];
                if (materialRolls.length === 0) continue;

                const deliveredLength = materialRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
                const existingDelivered = Number(item.delivered_qty) || 0;
                const newDelivered = existingDelivered + deliveredLength;

                // Calculate weighted average cost_per_meter for this material
                const matCost = costByMaterial[item.material_id];
                const avgCostPerMeter = matCost && matCost.totalLength > 0
                    ? matCost.totalCost / matCost.totalLength
                    : 0;

                const updatePayload: any = {
                    delivered_qty: newDelivered,
                    updated_at: now,
                };

                // Set cost_price (average cost per meter) for COGS calculation
                if (avgCostPerMeter > 0) {
                    updatePayload.cost_price = Math.round(avgCostPerMeter * 10000) / 10000;
                }

                const { error: itemErr } = await supabase
                    .from('sales_transaction_items')
                    .update(updatePayload)
                    .eq('id', item.id);

                if (itemErr) console.warn(`Item ${item.id} update error:`, itemErr.message);
            }

            // ── 4. Create inventory_movements (one per roll) ──
            // stock_movements جدول غير موجود — نكتب في inventory_movements
            const movNumber = `MV-SALE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${invoiceData?.invoice_no?.slice(-6) || invoiceId?.slice(0, 6) || 'SALE'}`;
            const movementRows = selectedRolls.map((roll: any, idx: number) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10), // date only
                movement_type: 'sale',
                material_id: roll.material_id || null,
                color_id: roll.color_id || null,
                roll_id: roll.id,
                from_warehouse_id: selectedWarehouseId,
                quantity: roll.net_length || roll.current_length || 0,
                reference_type: 'sale_invoice',
                reference_id: invoiceId,
                reference_number: invoiceData?.invoice_no || invoiceData?.draft_no || '',
                notes: tl(
                    `تسليم مبيعات — رولون ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)} م)${isPartialDelivery ? ' [جزئي]' : ' [كامل]'}`,
                    `Sales delivery — roll ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)}m)${isPartialDelivery ? ' [partial]' : ' [complete]'}`
                ),
            }));

            const { error: movError } = await supabase
                .from('inventory_movements')
                .insert(movementRows);

            if (movError) console.warn('inventory_movements insert error:', movError.message);


            // ── 6. Determine stage: partial or complete ──
            const totalRequired = sourceItems.reduce((s, si) => s + (Number(si.quantity) || 0), 0);

            // Re-fetch all items to check total delivered across all deliveries
            const { data: freshItems } = await supabase
                .from('sales_transaction_items')
                .select('quantity, delivered_qty')
                .eq('transaction_id', invoiceId);

            let totalNowDelivered = 0;
            let totalExpected = 0;
            if (freshItems) {
                for (const fi of freshItems) {
                    totalNowDelivered += Number(fi.delivered_qty) || 0;
                    totalExpected += Number(fi.quantity) || 0;
                }
            }

            const isFullyDelivered = totalExpected > 0 && totalNowDelivered >= totalExpected * 0.99;
            const newStage = isFullyDelivered ? 'delivered' : 'in_delivery';

            const { error: stageError } = await supabase
                .from('sales_transactions')
                .update({
                    stage: newStage,
                    updated_at: now,
                    delivery_draft: null, // Clear draft after confirm
                    ...(isFullyDelivered ? { delivered_at: now } : {}),
                })
                .eq('id', invoiceId);

            if (stageError) console.warn('Stage update error:', stageError.message);

            // ── 7. Clean up localStorage draft ──
            try { localStorage.removeItem(draftKey); } catch { /* ignore */ }

            // ── 8. Auto-post invoice on full delivery ──
            try {
                if (isFullyDelivered && invoiceId) {
                    console.log('[Accounting] 📒 Auto-posting sales invoice...');
                    const { data: postResult, error: postError } = await supabase.rpc('post_sales_invoice', {
                        p_invoice_id: invoiceId,
                    });
                    if (postError) {
                        console.warn('[Accounting] Post error:', postError.message);
                    } else if (postResult?.success) {
                        console.log('[Accounting] ✅ Invoice posted! JE:', postResult.journal_entry_id);
                    } else {
                        console.warn('[Accounting] Post result:', postResult?.error);
                    }
                }
            } catch (accErr) {
                console.warn('[Accounting] Non-critical error:', accErr);
            }

            // ── 9. Success ──
            const totalDeliveredLength = selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
            toast.success(tl(
                isFullyDelivered
                    ? `✅ تسليم كامل! ${selectedRolls.length} رولون — ${totalDeliveredLength.toFixed(1)} م — تم ترحيل الفاتورة`
                    : `📦 تسليم جزئي — ${selectedRolls.length} رولون (${totalDeliveredLength.toFixed(1)} م). المتبقي: ${(totalExpected - totalNowDelivered).toFixed(1)} م`,
                isFullyDelivered
                    ? `✅ Full delivery! ${selectedRolls.length} rolls — ${totalDeliveredLength.toFixed(1)}m — Invoice posted`
                    : `📦 Partial delivery — ${selectedRolls.length} rolls (${totalDeliveredLength.toFixed(1)}m). Remaining: ${(totalExpected - totalNowDelivered).toFixed(1)}m`
            ));

            // 🔔 Telegram: Notify warehouse staff (issue_order)
            // → dispatch_notification already checks company settings internally
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

                // 🔔 Telegram: Notify customer directly (if company setting enabled)
                if (invoiceData?.customer_id) {
                    // Check company-level setting before sending to customer
                    supabase.from('telegram_bot_config')
                        .select('notification_preferences')
                        .eq('company_id', companyId)
                        .maybeSingle()
                        .then(({ data: cfg }) => {
                            const prefs = cfg?.notification_preferences || {};
                            if (prefs.sales_notify_customer !== false) {
                                telegramNotify.customerGoodsReady(companyId!, {
                                    customerId: invoiceData.customer_id,
                                    customerName: invoiceData.customer_name || '',
                                    invoiceNumber: invoiceData.invoice_no || invoiceData.draft_no || '',
                                    totalQty: Math.round(totalDeliveredLength * 100) / 100,
                                }).catch(() => { });
                            }
                        })
                        .catch(() => { });
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
    }, [invoiceId, selectedWarehouseId, selectedRolls, sourceItems, companyId, tenantId, invoiceData, tl, onComplete, onOpenChange, draftKey]);

    // ═══ Handle close ═══
    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // ═══ Header Extra ═══
    const HeaderExtra = (
        <div className="flex flex-col gap-0 border-b">
            {/* Row 1: Warehouse + Invoice Info */}
            <div className={`px-4 py-2.5 border-b bg-gradient-to-r ${effectiveViewMode
                ? 'from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20'
                : 'from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Delivery Type Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${effectiveViewMode
                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
                        <div className={`p-1 rounded-md ${effectiveViewMode ? 'bg-teal-200' : 'bg-rose-200 dark:bg-rose-800'}`}>
                            {effectiveViewMode ? <PackageCheck className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                        </div>
                        {effectiveViewMode ? tl('تم التسليم ✅', 'Delivered ✅') : tl('تسليم مبيعات', 'Sales Delivery')}
                    </div>

                    {/* Warehouse — only in edit mode */}
                    {!effectiveViewMode && (
                        <div className="flex items-center gap-1.5">
                            <Warehouse className="w-4 h-4 text-gray-400" />
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger className="h-9 w-[170px] text-sm bg-white dark:bg-slate-800 shadow-sm">
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

                    <div className="w-px h-7 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                    {/* Invoice Info + Customer */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <FileText className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="text-sm font-mono font-bold text-rose-600">
                            {invoiceData?.invoice_no || invoiceData?.draft_no || invoiceId?.substring(0, 8)}
                        </span>
                        {invoiceData?.customer_name && (
                            onOpenInvoice ? (
                                <button
                                    type="button"
                                    onClick={() => onOpenInvoice(invoiceData)}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate transition-colors font-medium"
                                    title={tl('فتح الفاتورة المالية', 'Open Financial Invoice')}
                                >
                                    — {invoiceData.customer_name}
                                </button>
                            ) : (
                                <span className="text-sm text-gray-600 truncate">
                                    — {invoiceData.customer_name}
                                </span>
                            )
                        )}
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {effectiveViewMode ? (
                            <>
                                {/* Rolls count */}
                                <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                                    <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                                    <span className="text-xs font-bold text-teal-700">
                                        {selectedRolls.length} {tl('رولون مسلّم', 'rolls delivered')}
                                    </span>
                                </div>
                                {/* Open Invoice button */}
                                {onOpenInvoice && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onOpenInvoice(invoiceData)}
                                        className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs h-8"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        {tl('الفاتورة', 'Invoice')}
                                    </Button>
                                )}
                                {/* Edit toggle — للمخوّلين فقط */}
                                {canEdit && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditing(true)}
                                        className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 text-xs h-8"
                                    >
                                        ✏️ {tl('تعديل', 'Edit')}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Online Badge */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${navigator.onLine
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    {navigator.onLine ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                    {navigator.onLine ? tl('متصل', 'Online') : tl('غير متصل', 'Offline')}
                                </div>
                                {/* Back to view mode if was viewMode originally */}
                                {viewMode && isEditing && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                        className="gap-1.5 text-teal-600 border-teal-200 hover:bg-teal-50 text-xs h-8"
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
                                        className="gap-2 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-bold shadow-lg shadow-rose-500/30 px-4"
                                    >
                                        {isCompleting
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <PackageCheck className="h-4 w-4" />
                                        }
                                        {tl('تسليم', 'Deliver')}
                                        <span className="bg-rose-800/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                                            {selectedRolls.length}
                                        </span>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Progress */}
            {sourceItems.length > 0 && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-rose-50/50 to-orange-50/50 dark:from-rose-950/20 dark:to-orange-950/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                                <Truck className="w-4 h-4 text-rose-600" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                    {invoiceData?.customer_name || tl('فاتورة مبيعات', 'Sales Invoice')}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                    {invoiceData?.invoice_no || invoiceData?.draft_no || ''}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ms-auto shrink-0">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{tl('البنود', 'Items')}</span>
                                <span className="text-sm font-bold text-blue-600">{sourceItems.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{tl('رولونات', 'Rolls')}</span>
                                <span className={`text-sm font-bold ${selectedRolls.length > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                    {selectedRolls.length}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] capitalize bg-rose-50 text-rose-600 border-rose-200">
                                {invoiceData?.stage || 'confirmed'}
                            </Badge>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-medium shrink-0">
                            {tl('تقدم التسليم', 'Delivery Progress')}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${deliveryProgress.percent >= 100
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : deliveryProgress.percent > 0
                                        ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                                        : 'bg-gray-300'
                                    }`}
                                style={{ width: `${deliveryProgress.percent}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold font-mono min-w-[40px] text-end ${deliveryProgress.percent >= 100 ? 'text-green-600' : 'text-rose-600'
                            }`}>
                            {deliveryProgress.percent.toFixed(0)}%
                        </span>
                    </div>
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
                mode={effectiveViewMode ? 'view' : 'create'}
                data={enhancedData}
                onSave={effectiveViewMode ? undefined : handleSave}
                headerExtra={HeaderExtra}
                onRefresh={onComplete}
                defaultTab="sales_delivery_items"
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
        </>
    );
}

export default SalesDeliveryDialog;
