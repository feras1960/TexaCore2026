/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Material Movements Tab - Enhanced v2
 * تبويب الحركات المحسّن للمادة
 * - تجميع الحركات حسب الوثيقة (فاتورة / استلام)
 * - تفاصيل الرولونات عند الفتح
 * - رصيد تراكمي بعد كل حركة
 * - ترتيب من الأقدم للأحدث
 * - زر فتح الوثيقة الأصلية
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Calendar,
    Filter,
    ShoppingCart,
    Package,
    RotateCcw,
    ClipboardCheck,
    PackagePlus,
    PackageMinus,
    Search,
    X,
    RefreshCw,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Boxes,
    Truck,
    User,
    Ship,
    CheckCircle2,
    Clock,
    Building2,
    Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';

// ─── Types ──────────────────────────────────────────────────────
type MovementType = 'all' | 'sale' | 'purchase' | 'transfer' | 'adjustment' | 'sales_return' | 'purchase_return' | 'in' | 'out';

interface RollLine {
    id: string;
    roll_id?: string;
    roll_number: string;
    quantity: number;
    unit_cost?: number;
    total_cost?: number;
    warehouse_from?: string;
    warehouse_to?: string;
}

interface DocMeta {
    partyName?: string;       // اسم المورد أو العميل
    partyId?: string;         // ID الجهة لفتح شيتها
    partyType?: 'supplier' | 'customer';
    containerId?: string;     // ID الكونتينر
    containerNumber?: string; // رقم الكونتينر
    receiptMethod?: 'direct' | 'container'; // طريقة الاستلام
    docStage?: string;        // حالة الترحيل (posted, draft...)
    receiptStatus?: string;   // حالة الاستلام
    deliveryStatus?: string;  // حالة التسليم
    invoiceId?: string;       // ID الفاتورة الأصلية
    invoiceNumber?: string;   // رقم الفاتورة
}

interface MovementGroup {
    key: string;              // reference_number
    reference_id?: string;    // for opening original doc
    reference_type?: string;  // goods_receipt, sale_invoice, etc.
    date: string;
    type: string;             // DB type
    displayType: MovementType;
    totalQty: number;         // signed
    totalValue?: number;
    counterparty?: string;
    warehouse?: string;
    runningBalance: number;   // balance after this group
    rolls: RollLine[];
    meta?: DocMeta;           // ✨ بيانات إضافية (مورد، عميل، كونتينر، حالات)
}

interface MaterialMovementsTabProps {
    data: any;
    onOpenDocument?: (docType: string, docId: string, docData?: any) => void;
}

// ─── Movement Type Config ────────────────────────────────────────
const getMovementTypeConfig = (language: string) => ({
    all: { label: language === 'ar' ? 'الكل' : 'All', icon: Filter, color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300', activeColor: 'bg-gray-700 text-white border-gray-700', badgeColor: 'bg-gray-200 text-gray-700' },
    sale: { label: language === 'ar' ? 'مبيعات' : 'Sales', icon: ShoppingCart, color: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400', activeColor: 'bg-red-600 text-white border-red-600', badgeColor: 'bg-red-100 text-red-800' },
    purchase: { label: language === 'ar' ? 'مشتريات' : 'Purchases', icon: Package, color: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400', activeColor: 'bg-blue-600 text-white border-blue-600', badgeColor: 'bg-blue-100 text-blue-800' },
    transfer: { label: language === 'ar' ? 'مناقلات' : 'Transfers', icon: ArrowRightLeft, color: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400', activeColor: 'bg-purple-600 text-white border-purple-600', badgeColor: 'bg-purple-100 text-purple-800' },
    adjustment: { label: language === 'ar' ? 'تسويات' : 'Adj.', icon: ClipboardCheck, color: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400', activeColor: 'bg-amber-600 text-white border-amber-600', badgeColor: 'bg-amber-100 text-amber-800' },
    sales_return: { label: language === 'ar' ? 'مرتجع مبيعات' : 'Sales Ret.', icon: RotateCcw, color: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400', activeColor: 'bg-orange-600 text-white border-orange-600', badgeColor: 'bg-orange-100 text-orange-800' },
    purchase_return: { label: language === 'ar' ? 'مرتجع شراء' : 'Purch. Ret.', icon: RotateCcw, color: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/20 dark:text-rose-400', activeColor: 'bg-rose-600 text-white border-rose-600', badgeColor: 'bg-rose-100 text-rose-800' },
    in: { label: language === 'ar' ? 'إدخال' : 'Stock In', icon: PackagePlus, color: 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/20 dark:text-teal-400', activeColor: 'bg-teal-600 text-white border-teal-600', badgeColor: 'bg-teal-100 text-teal-800' },
    out: { label: language === 'ar' ? 'إخراج' : 'Stock Out', icon: PackageMinus, color: 'bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400', activeColor: 'bg-gray-600 text-white border-gray-600', badgeColor: 'bg-gray-100 text-gray-800' },
});

const mapMovementType = (dbType: string): MovementType => {
    const t = dbType?.toLowerCase() || '';
    if (t.includes('sale_return') || t.includes('sales_return')) return 'sales_return';
    if (t.includes('purchase_return')) return 'purchase_return';
    if (t.includes('sale')) return 'sale';
    if (t.includes('purchase') || t.includes('receipt') || t.includes('container_receipt')) return 'purchase';
    if (t.includes('transfer')) return 'transfer';
    if (t.includes('adjustment') || t.includes('stock_count')) return 'adjustment';
    if (t.includes('in') || t.includes('receive')) return 'in';
    if (t.includes('out') || t.includes('issue')) return 'out';
    return 'purchase';
};

const isOutgoing = (dbType: string): boolean => {
    const t = dbType?.toLowerCase() || '';
    return t.includes('sale') && !t.includes('return') || t.includes('out') || t.includes('issue') || t.includes('transfer_out') || (t.includes('purchase_return'));
};

// ─── RollNumberMap type alias ────────────────────────────────────
type RollInfoMap = Record<string, { roll_number: string; initial_length: number; cost_per_meter: number; total_cost: number }>;

// ─── processAndGroup — pure function outside component for stability ─
function processAndGroup(
    rawData: any[],
    rollNumberMap: RollInfoMap,
    containerRollsMap: Record<string, any[]>,
    currentMaterialId: string | undefined,
    isRTL: boolean,
    isAr: boolean
): MovementGroup[] {
    // Group by reference_number (each document = one group)
    const groupMap = new Map<string, {
        rows: any[];
        key: string;
        date: string;
        type: string;
        reference_id?: string;
        reference_type?: string;
    }>();

    rawData.forEach((m: any) => {
        const key = m.reference_number || m.id;
        if (!groupMap.has(key)) {
            groupMap.set(key, {
                rows: [],
                key,
                date: m.movement_date || m.created_at?.split('T')[0],
                type: m.movement_type,
                reference_id: m.reference_id,
                reference_type: m.reference_type,
            });
        }
        groupMap.get(key)!.rows.push(m);
    });

    // Build groups with running balance
    let runningBalance = 0;
    const result: MovementGroup[] = [];

    groupMap.forEach((g) => {
        const rows = g.rows;
        const displayType = mapMovementType(g.type);
        const out = isOutgoing(g.type);

        let totalQty = 0;
        let totalValue = 0;
        const rolls: RollLine[] = [];

        // Check if this group has rolls from inventory_movements (roll_id present)
        const hasLinkedRolls = rows.some((m: any) => !!m.roll_id);

        if (hasLinkedRolls) {
            // Normal path: each inventory_movement row = one roll line
            rows.forEach((m: any) => {
                const qty = Math.abs(Number(m.quantity) || 0);
                const signedQty = out ? -qty : qty;
                totalQty += signedQty;
                totalValue += Number(m.total_cost) || 0;

                const rollInfo = m.roll_id ? rollNumberMap[m.roll_id] : null;
                const rollNum = rollInfo?.roll_number || (m.roll_id ? m.roll_id.slice(0, 8) : null);
                const whFrom = isRTL ? m.from_warehouse?.name_ar : (m.from_warehouse?.name_en || m.from_warehouse?.name_ar);
                const whTo = isRTL ? m.to_warehouse?.name_ar : (m.to_warehouse?.name_en || m.to_warehouse?.name_ar);

                rolls.push({
                    id: m.id,
                    roll_id: m.roll_id,
                    roll_number: rollNum || (isAr ? 'بدون رقم' : 'No #'),
                    quantity: signedQty,
                    unit_cost: m.unit_cost || rollInfo?.cost_per_meter,
                    total_cost: m.total_cost || rollInfo?.total_cost,
                    warehouse_from: whFrom,
                    warehouse_to: whTo,
                });
            });
        } else {
            // Container/Goods receipt path: aggregate row in inventory_movements, individual rolls in fabric_rolls
            rows.forEach((m: any) => {
                const qty = Math.abs(Number(m.quantity) || 0);
                const signedQty = out ? -qty : qty;
                totalQty += signedQty;
                totalValue += Number(m.total_cost) || 0;
            });

            // Get rolls from containerRollsMap (keyed by reference_id = purchase_receipt.id)
            // ✅ Filter by currentMaterialId (the open material sheet)
            const refId = g.reference_id;
            const containerRolls = refId ? (containerRollsMap[refId] || []) : [];
            const materialRolls = currentMaterialId
                ? containerRolls.filter((r: any) =>
                    r.material_id === currentMaterialId ||
                    r.product_id === currentMaterialId
                )
                : containerRolls;

            const firstRow = rows[0];
            const whTo = isRTL ? firstRow?.to_warehouse?.name_ar : (firstRow?.to_warehouse?.name_en || firstRow?.to_warehouse?.name_ar);

            if (materialRolls.length > 0) {
                materialRolls.forEach((r: any) => {
                    const whName = isRTL ? r.warehouse?.name_ar : (r.warehouse?.name_en || r.warehouse?.name_ar);
                    rolls.push({
                        id: r.id,
                        roll_id: r.id,
                        roll_number: r.roll_number || r.id.slice(0, 8),
                        quantity: Number(r.initial_length) || 0,
                        unit_cost: r.cost_per_meter,
                        total_cost: r.total_cost,
                        warehouse_from: undefined,
                        warehouse_to: whName || whTo,
                    });
                });
            } else {
                // No rolls found — show single summary row
                const whFrom = isRTL ? firstRow?.from_warehouse?.name_ar : (firstRow?.from_warehouse?.name_en || firstRow?.from_warehouse?.name_ar);
                const whTo2 = isRTL ? firstRow?.to_warehouse?.name_ar : (firstRow?.to_warehouse?.name_en || firstRow?.to_warehouse?.name_ar);
                rolls.push({
                    id: rows[0]?.id || g.key,
                    roll_number: isAr ? 'تجميعي' : 'Aggregate',
                    quantity: totalQty,
                    warehouse_from: whFrom,
                    warehouse_to: whTo2,
                });
            }
        }

        runningBalance += totalQty;

        // Warehouse display (use first row)
        const firstRow = rows[0];
        const whFrom = isRTL ? firstRow.from_warehouse?.name_ar : (firstRow.from_warehouse?.name_en || firstRow.from_warehouse?.name_ar);
        const whTo = isRTL ? firstRow.to_warehouse?.name_ar : (firstRow.to_warehouse?.name_en || firstRow.to_warehouse?.name_ar);

        result.push({
            key: g.key,
            reference_id: g.reference_id,
            reference_type: g.reference_type,
            date: g.date,
            type: g.type,
            displayType,
            totalQty,
            totalValue: totalValue || undefined,
            warehouse: out ? whFrom : whTo,
            runningBalance,
            rolls,
        });
    });

    return result;
}

// ─── Component ─────────────────────────────────────────────────
export function MaterialMovementsTab({ data, onOpenDocument }: MaterialMovementsTabProps) {
    const { language, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const isAr = language === 'ar';

    const [groups, setGroups] = useState<MovementGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<MovementType>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    const typeConfig = useMemo(() => getMovementTypeConfig(language), [language]);

    // ─── Fetch & Group ──────────────────────────────────────────
    const fetchMovements = useCallback(async () => {
        if (!companyId || !data?.id) return;
        setLoading(true);
        setError(null);

        try {
            // Fetch all movements for this material with roll info
            const { data: rawData, error: fetchError } = await supabase
                .from('inventory_movements')
                .select(`
                    id,
                    movement_date,
                    movement_type,
                    reference_type,
                    reference_id,
                    reference_number,
                    quantity,
                    unit_cost,
                    total_cost,
                    notes,
                    created_at,
                    roll_id,
                    balance_after,
                    from_warehouse:warehouses!from_warehouse_id(name_ar, name_en),
                    to_warehouse:warehouses!to_warehouse_id(name_ar, name_en)
                `)
                .eq('company_id', companyId)
                .or(`product_id.eq.${data.id},material_id.eq.${data.id}`)
                .order('movement_date', { ascending: true })
                .order('created_at', { ascending: true })
                .limit(500);

            if (fetchError) throw fetchError;

            const allRows = rawData || [];

            // ── Fetch roll numbers for rows that HAVE roll_id ──
            const rollIds = [...new Set(allRows.map((m: any) => m.roll_id).filter(Boolean))];
            let rollNumberMap: Record<string, { roll_number: string; initial_length: number; cost_per_meter: number; total_cost: number }> = {};
            if (rollIds.length > 0) {
                const { data: rolls } = await supabase
                    .from('fabric_rolls')
                    .select('id, roll_number, initial_length, cost_per_meter, total_cost')
                    .in('id', rollIds);
                if (rolls) rolls.forEach((r: any) => {
                    rollNumberMap[r.id] = { roll_number: r.roll_number, initial_length: r.initial_length || 0, cost_per_meter: r.cost_per_meter || 0, total_cost: r.total_cost || 0 };
                });
            }

            // ── For container_receipt rows without roll_id: fetch rolls via container_id ──
            // Strategy: reference_id = purchase_receipt.id → purchase_receipt.container_id → fabric_rolls.container_id
            const receiptGroups = new Map<string, { receiptId: string; materialId: string }>();
            allRows.forEach((m: any) => {
                if (!m.roll_id && m.reference_id && (m.reference_type === 'goods_receipt' || (m.movement_type || '').toLowerCase().includes('container'))) {
                    const key = `${m.reference_id}:${m.material_id || m.product_id}`;
                    if (!receiptGroups.has(key)) {
                        receiptGroups.set(key, { receiptId: m.reference_id, materialId: m.material_id || m.product_id });
                    }
                }
            });

            // Fetch container_id from purchase_receipts for each group
            let containerRollsMap: Record<string, any[]> = {}; // key = reference_id → rolls[]
            if (receiptGroups.size > 0) {
                const receiptIds = [...new Set([...receiptGroups.values()].map(g => g.receiptId))];
                const { data: receipts } = await supabase
                    .from('purchase_receipts')
                    .select('id, container_id')
                    .in('id', receiptIds);

                if (receipts) {
                    // Collect all container_ids to fetch in one query
                    const containerIds = [...new Set(receipts.map((r: any) => r.container_id).filter(Boolean))];
                    const receiptContainerMap: Record<string, string> = {}; // receiptId → containerId
                    receipts.forEach((r: any) => { if (r.container_id) receiptContainerMap[r.id] = r.container_id; });

                    if (containerIds.length > 0) {
                        const { data: containerRolls } = await supabase
                            .from('fabric_rolls')
                            .select('id, roll_number, material_id, container_id, initial_length, cost_per_meter, total_cost, status, warehouse:warehouses!left(name_ar, name_en)')
                            .in('container_id', containerIds);

                        if (containerRolls) {
                            // Map by receiptId
                            receipts.forEach((receipt: any) => {
                                if (!receipt.container_id) return;
                                const rollsForContainer = containerRolls.filter((r: any) => r.container_id === receipt.container_id);
                                containerRollsMap[receipt.id] = rollsForContainer;
                            });
                        }
                    }
                }
            }

            applyGroupsAndEnrich(allRows, rollNumberMap, containerRollsMap);
        } catch (err: any) {
            // Fallback without joins
            try {
                const { data: simpleData } = await supabase
                    .from('inventory_movements')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('product_id', data.id)
                    .order('movement_date', { ascending: true })
                    .order('created_at', { ascending: true })
                    .limit(500);
                applyGroupsAndEnrich(simpleData || [], {}, {});
            } catch (e2: any) {
                setError(isAr ? 'فشل في تحميل الحركات' : 'Failed to load movements');
            }
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, data?.id, language]);

    // ─── Fetch Document Metadata (party names, container info, statuses) ───
    const fetchDocMetadata = useCallback(async (grps: MovementGroup[]): Promise<MovementGroup[]> => {
        if (grps.length === 0) return grps;

        // Separate receipt IDs (purchase) and sale invoice IDs
        const receiptIds: string[] = [];
        const saleIds: string[] = [];
        grps.forEach(g => {
            if (!g.reference_id) return;
            const rt = g.reference_type || '';
            const mt = g.type || '';
            if (rt === 'goods_receipt' || mt.includes('container') || mt.includes('receipt') || mt.includes('purchase')) {
                receiptIds.push(g.reference_id);
            }
            if (rt === 'sale_invoice' || mt.includes('sale')) {
                saleIds.push(g.reference_id);
            }
        });

        // Build metadata map: reference_id → DocMeta
        const metaMap: Record<string, DocMeta> = {};

        // ── Fetch purchase receipts metadata ──────────────────────
        if (receiptIds.length > 0) {
            const { data: receipts } = await supabase
                .from('purchase_receipts')
                .select('id, status, container_id, supplier_id')
                .in('id', receiptIds);

            if (receipts) {
                const containerIds = [...new Set(receipts.map((r: any) => r.container_id).filter(Boolean))];
                let containerMap: Record<string, { container_number: string; supplier_id?: string; invoice_id?: string; invoice_no?: string }> = {};
                if (containerIds.length > 0) {
                    const [contRes, ptRes] = await Promise.all([
                        supabase.from('containers').select('id, container_number, supplier_id').in('id', containerIds),
                        supabase.from('purchase_transactions')
                            .select('id, container_id, supplier_id, invoice_no')
                            .in('container_id', containerIds)
                            .limit(containerIds.length * 5),
                    ]);
                    if (contRes.data) contRes.data.forEach((c: any) => {
                        containerMap[c.id] = { container_number: c.container_number, supplier_id: c.supplier_id };
                    });
                    if (ptRes.data) ptRes.data.forEach((pt: any) => {
                        if (pt.container_id && containerMap[pt.container_id]) {
                            if (!containerMap[pt.container_id].supplier_id && pt.supplier_id)
                                containerMap[pt.container_id].supplier_id = pt.supplier_id;
                            if (!containerMap[pt.container_id].invoice_id) {
                                containerMap[pt.container_id].invoice_id = pt.id;
                                containerMap[pt.container_id].invoice_no = pt.invoice_no;
                            }
                        }
                    });
                }
                const allSupplierIds = [...new Set([
                    ...receipts.map((r: any) => r.supplier_id).filter(Boolean),
                    ...Object.values(containerMap).map((c: any) => c.supplier_id).filter(Boolean),
                ])];
                let supplierMap: Record<string, string> = {};
                if (allSupplierIds.length > 0) {
                    const { data: suppliersData } = await supabase
                        .from('suppliers')
                        .select('id, name_ar, name_en, company_name')
                        .in('id', allSupplierIds);
                    if (suppliersData) suppliersData.forEach((s: any) => {
                        supplierMap[s.id] = s.name_ar || s.name_en || s.company_name || '';
                    });
                }
                receipts.forEach((r: any) => {
                    const container = r.container_id ? containerMap[r.container_id] : null;
                    const supplierId = r.supplier_id || container?.supplier_id;
                    metaMap[r.id] = {
                        partyName: supplierId ? supplierMap[supplierId] : undefined,
                        partyId: supplierId,
                        partyType: 'supplier',
                        containerId: r.container_id,
                        containerNumber: container?.container_number,
                        receiptMethod: r.container_id ? 'container' : 'direct',
                        receiptStatus: r.status,
                        invoiceId: container?.invoice_id,
                        invoiceNumber: container?.invoice_no,
                    };
                });
            }
        }

        // ── Fetch sales transactions metadata ─────────────────────
        if (saleIds.length > 0) {
            const { data: salesData } = await supabase
                .from('sales_transactions')
                .select('id, stage, customer_name, customer_id, invoice_no')
                .in('id', saleIds);

            if (salesData) {
                const customerIds = [...new Set(salesData.map((s: any) => s.customer_id).filter(Boolean))];

                let customerMap: Record<string, string> = {};
                if (customerIds.length > 0) {
                    const { data: customersData } = await supabase
                        .from('customers')
                        .select('id, name_ar, name_en')
                        .in('id', customerIds);
                    if (customersData) customersData.forEach((c: any) => {
                        customerMap[c.id] = c.name_ar || c.name_en || '';
                    });
                }

                salesData.forEach((s: any) => {
                    const customerName = s.customer_name || (s.customer_id ? customerMap[s.customer_id] : undefined);
                    metaMap[s.id] = {
                        partyName: customerName,
                        partyId: s.customer_id,
                        partyType: 'customer',
                        docStage: s.stage,
                        invoiceId: s.id,
                        invoiceNumber: s.invoice_no,
                    };
                });
            }
        }

        // Merge metadata into groups
        return grps.map(g => ({
            ...g,
            meta: g.reference_id ? metaMap[g.reference_id] : undefined,
        }));
    }, []);

    // currentMaterialId = the material sheet currently open
    const currentMaterialId = data?.id;

    // ─── Wrapper that calls pure function then enriches with metadata ─
    const applyGroupsAndEnrich = useCallback((
        rawData: any[],
        rollNumberMap: RollInfoMap,
        containerRollsMap: Record<string, any[]> = {}
    ) => {
        const result = processAndGroup(rawData, rollNumberMap, containerRollsMap, currentMaterialId, isRTL, isAr);
        // Fast render first, then async enrich with party names / statuses
        setGroups(result);
        fetchDocMetadata(result)
            .then(enriched => setGroups(enriched))
            .catch(() => {/* metadata is optional */ });
    }, [currentMaterialId, isRTL, isAr, fetchDocMetadata]);

    useEffect(() => { fetchMovements(); }, [fetchMovements]);

    // ─── Toggle expand ─────────────────────────────────────────
    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // ─── Open original document ───────────────────────────────
    const handleOpenDoc = async (group: MovementGroup) => {
        if (!group.reference_id) return;

        const refType = group.reference_type || '';
        let docType = 'purchase_invoice';

        if (refType.includes('sale') || group.displayType === 'sale') docType = 'sale_invoice';
        else if (refType.includes('container') || group.type.includes('container')) docType = 'container';
        else if (refType.includes('transfer') || group.displayType === 'transfer') docType = 'transfer';
        else docType = 'purchase_invoice';

        if (onOpenDocument) {
            onOpenDocument(docType, group.reference_id);
        }
    };

    // ─── Filters ───────────────────────────────────────────────
    const filteredGroups = useMemo(() => {
        let result = groups;
        if (activeFilter !== 'all') result = result.filter(g => g.displayType === activeFilter);
        if (dateFrom) result = result.filter(g => g.date >= dateFrom);
        if (dateTo) result = result.filter(g => g.date <= dateTo);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.key.toLowerCase().includes(q) ||
                g.warehouse?.toLowerCase().includes(q) ||
                g.rolls.some(r => r.roll_number?.toLowerCase().includes(q))
            );
        }
        return result;
    }, [groups, activeFilter, dateFrom, dateTo, searchQuery]);

    // ─── Stats ────────────────────────────────────────────────
    const stats = useMemo(() => {
        const totalIn = filteredGroups.filter(g => g.totalQty > 0).reduce((s, g) => s + g.totalQty, 0);
        const totalOut = filteredGroups.filter(g => g.totalQty < 0).reduce((s, g) => s + Math.abs(g.totalQty), 0);
        return { totalIn, totalOut, net: totalIn - totalOut, count: filteredGroups.length };
    }, [filteredGroups]);

    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: groups.length };
        groups.forEach(g => { counts[g.displayType] = (counts[g.displayType] || 0) + 1; });
        return counts;
    }, [groups]);

    const hasActiveFilters = activeFilter !== 'all' || !!dateFrom || !!dateTo || !!searchQuery;
    const clearFilters = () => { setActiveFilter('all'); setDateFrom(''); setDateTo(''); setSearchQuery(''); };

    const filterTypes: MovementType[] = ['all', 'purchase', 'sale', 'transfer', 'adjustment', 'sales_return', 'purchase_return'];

    // ─── Format date ──────────────────────────────────────────
    const fmtDate = (d: string) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch { return d; }
    };

    // ─── Stage / Status badge ─────────────────────────────────
    const stageBadge = (stage?: string) => {
        if (!stage) return null;
        const s = stage.toLowerCase();
        const map: Record<string, { label: string; labelAr: string; cls: string; icon: React.ReactNode }> = {
            posted: { label: 'Posted', labelAr: 'مرحّل', cls: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
            draft: { label: 'Draft', labelAr: 'مسودة', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Clock className="w-3 h-3" /> },
            completed: { label: 'Completed', labelAr: 'مكتمل', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <CheckCircle2 className="w-3 h-3" /> },
            pending: { label: 'Pending', labelAr: 'قيد التنفيذ', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
            delivered: { label: 'Delivered', labelAr: 'مسلّم', cls: 'bg-teal-100 text-teal-700 border-teal-200', icon: <CheckCircle2 className="w-3 h-3" /> },
            partial: { label: 'Partial', labelAr: 'جزئي', cls: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="w-3 h-3" /> },
        };
        const cfg = map[s] || { label: stage, labelAr: stage, cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: null };
        return (
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", cfg.cls)}>
                {cfg.icon}
                {isAr ? cfg.labelAr : cfg.label}
            </span>
        );
    };

    // ─── Open party sheet (MDI) ───────────────────────────────
    const handleOpenParty = useCallback((e: React.MouseEvent, meta?: DocMeta) => {
        e.stopPropagation();
        if (!meta?.partyId || !onOpenDocument) return;
        onOpenDocument(meta.partyType === 'customer' ? 'party_customer' : 'party_supplier', meta.partyId);
    }, [onOpenDocument]);

    // ─── Open container sheet (MDI) ───────────────────────────
    const handleOpenContainer = useCallback((e: React.MouseEvent, containerId?: string) => {
        e.stopPropagation();
        if (!containerId || !onOpenDocument) return;
        onOpenDocument('container', containerId);
    }, [onOpenDocument]);

    return (
        <div className="space-y-4 pb-6" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ─── Summary Stats ───────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <p className="text-xs text-green-600 dark:text-green-400">{isAr ? 'إجمالي الوارد' : 'Total In'}</p>
                        </div>
                        <p className="text-xl font-bold text-green-800 dark:text-green-200 font-mono">{stats.totalIn.toFixed(1)}</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/20 dark:border-red-800">
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <p className="text-xs text-red-600 dark:text-red-400">{isAr ? 'إجمالي الصادر' : 'Total Out'}</p>
                        </div>
                        <p className="text-xl font-bold text-red-800 dark:text-red-200 font-mono">{stats.totalOut.toFixed(1)}</p>
                    </CardContent>
                </Card>
                <Card className={cn("dark:border-gray-700", stats.net >= 0 ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/20" : "border-orange-200 bg-orange-50/50")}>
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                            <p className="text-xs text-blue-600 dark:text-blue-400">{isAr ? 'الرصيد الحالي' : 'Current Balance'}</p>
                        </div>
                        <p className={cn("text-xl font-bold font-mono", stats.net >= 0 ? "text-blue-800 dark:text-blue-200" : "text-orange-800")}>
                            {stats.net.toFixed(1)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-800">
                    <CardContent className="pt-3 pb-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Boxes className="w-4 h-4 text-purple-600" />
                            <p className="text-xs text-purple-600 dark:text-purple-400">{isAr ? 'عدد الوثائق' : 'Documents'}</p>
                        </div>
                        <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{stats.count}</p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Error ──────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                    <Button variant="ghost" size="sm" onClick={fetchMovements} className="ms-auto h-8 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 me-1" />{isAr ? 'إعادة المحاولة' : 'Retry'}
                    </Button>
                </div>
            )}

            {/* ─── Filters ────────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {filterTypes.map(type => {
                                const config = typeConfig[type];
                                if (!config) return null;
                                const count = typeCounts[type] || 0;
                                if (type !== 'all' && count === 0) return null;
                                const isActive = activeFilter === type;
                                const Icon = config.icon;
                                return (
                                    <button key={type} onClick={() => setActiveFilter(type)}
                                        className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm active:scale-95",
                                            isActive ? config.activeColor : config.color)}>
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{config.label}</span>
                                        <span className={cn("inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold",
                                            isActive ? "bg-white/30 text-current" : config.badgeColor)}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className={cn("w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-3" : "left-3")} />
                                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={isAr ? 'بحث بالمرجع أو الرولون...' : 'Search reference or roll...'}
                                    className={cn("h-9 text-sm", isRTL ? "pr-9" : "pl-9")} />
                            </div>
                            <div className="relative">
                                <Calendar className={cn("w-3.5 h-3.5 text-gray-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-2.5" : "left-2.5")} />
                                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className={cn("h-9 text-xs w-36", isRTL ? "pr-8" : "pl-8")} />
                            </div>
                            <span className="text-gray-400 text-xs">→</span>
                            <div className="relative">
                                <Calendar className={cn("w-3.5 h-3.5 text-gray-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-2.5" : "left-2.5")} />
                                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className={cn("h-9 text-xs w-36", isRTL ? "pr-8" : "pl-8")} />
                            </div>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-red-500 hover:text-red-700">
                                    <X className="w-3.5 h-3.5 me-1" />{isAr ? 'مسح' : 'Clear'}
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={fetchMovements} disabled={loading} className="h-9 w-9 p-0">
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Movements Table ─────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ArrowRightLeft className="w-5 h-5 text-erp-teal" />
                        {isAr ? 'سجل الحركات' : 'Movement Log'}
                        <Badge variant="secondary" className="text-xs">
                            {filteredGroups.length} {isAr ? 'وثيقة' : 'docs'}
                        </Badge>
                        <span className="text-[11px] text-gray-400 font-normal ms-auto">
                            {isAr ? '← من الأقدم إلى الأحدث' : 'Oldest → Newest'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin w-8 h-8 border-2 border-erp-teal border-t-transparent rounded-full" />
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="text-center py-12">
                            <ArrowRightLeft className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-500">{isAr ? 'لا توجد حركات' : 'No movements found'}</p>
                            {hasActiveFilters && (
                                <Button variant="link" onClick={clearFilters} className="mt-2 text-erp-teal text-xs">
                                    {isAr ? 'مسح الفلاتر' : 'Clear filters'}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {/* Table Header */}
                            <div className={cn(
                                "grid gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider",
                                "grid-cols-[32px_90px_130px_1fr_80px_80px_90px_36px]"
                            )}>
                                <div></div>
                                <div>{isAr ? 'التاريخ' : 'Date'}</div>
                                <div>{isAr ? 'النوع' : 'Type'}</div>
                                <div>{isAr ? 'المرجع / المستودع' : 'Reference / Warehouse'}</div>
                                <div className="text-center">{isAr ? 'الوارد' : 'In'}</div>
                                <div className="text-center">{isAr ? 'الصادر' : 'Out'}</div>
                                <div className="text-center">{isAr ? 'الرصيد' : 'Balance'}</div>
                                <div></div>
                            </div>

                            {/* Rows */}
                            {filteredGroups.map((group, idx) => {
                                const tc = typeConfig[group.displayType];
                                const TypeIcon = tc?.icon || Filter;
                                const isExpanded = expandedKeys.has(group.key);
                                const isIn = group.totalQty > 0;
                                const hasRolls = group.rolls.length > 0;
                                const hasDoc = !!group.reference_id && !!onOpenDocument;

                                return (
                                    <div key={group.key} className="group">
                                        {/* Main Group Row */}
                                        <div
                                            className={cn(
                                                "grid gap-2 px-4 py-3 items-center transition-colors cursor-pointer",
                                                "grid-cols-[32px_90px_130px_1fr_80px_80px_90px_36px]",
                                                isExpanded
                                                    ? "bg-blue-50/60 dark:bg-blue-900/10"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                            )}
                                            onClick={() => hasRolls && toggleExpand(group.key)}
                                        >
                                            {/* Expand toggle */}
                                            <div className="flex items-center justify-center">
                                                {hasRolls ? (
                                                    <div className={cn(
                                                        "w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        isExpanded ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"
                                                    )}>
                                                        {isExpanded
                                                            ? <ChevronDown className="w-4 h-4" />
                                                            : isRTL ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />
                                                        }
                                                    </div>
                                                ) : <div className="w-6" />}
                                            </div>

                                            {/* Date */}
                                            <div className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                                                {fmtDate(group.date)}
                                            </div>

                                            {/* Type Badge */}
                                            <div>
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                                                    tc?.color || 'bg-gray-50 text-gray-600 border-gray-200'
                                                )}>
                                                    <TypeIcon className="w-3 h-3" />
                                                    {tc?.label || group.type}
                                                </span>
                                            </div>

                                            {/* Reference + Warehouse */}
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="font-mono text-xs font-semibold text-erp-navy dark:text-white truncate">
                                                    {group.key}
                                                </span>
                                                {group.warehouse && (
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                        <Truck className="w-3 h-3 flex-shrink-0" />
                                                        {group.warehouse}
                                                    </span>
                                                )}
                                                {group.rolls.length > 0 && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {group.rolls.length} {isAr ? 'رولون' : 'rolls'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* In qty */}
                                            <div className="text-center">
                                                {isIn ? (
                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
                                                        +{Math.abs(group.totalQty).toFixed(1)}
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </div>

                                            {/* Out qty */}
                                            <div className="text-center">
                                                {!isIn ? (
                                                    <span className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
                                                        {Math.abs(group.totalQty).toFixed(1)}-
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </div>

                                            {/* Running Balance */}
                                            <div className="text-center">
                                                <span className={cn(
                                                    "text-sm font-bold font-mono px-2 py-0.5 rounded",
                                                    group.runningBalance >= 0
                                                        ? "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30"
                                                        : "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30"
                                                )}>
                                                    {group.runningBalance.toFixed(1)}
                                                </span>
                                            </div>

                                            {/* Open original doc button */}
                                            <div className="flex items-center justify-center">
                                                {hasDoc && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-erp-teal hover:bg-erp-teal/10 transition-all"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenDoc(group); }}
                                                        title={isAr ? 'فتح الوثيقة الأصلية' : 'Open original document'}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ─── Info Bar: Party + Container + Statuses ── */}
                                        {group.meta && (
                                            <div className={cn(
                                                "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2 pt-0",
                                                isExpanded ? "bg-blue-50/60 dark:bg-blue-900/10" : "bg-gray-50/50 dark:bg-gray-800/20",
                                                "border-b border-gray-100 dark:border-gray-800/50"
                                            )}>
                                                {/* Spacer matching the grid start */}
                                                <div className="w-[32px] flex-shrink-0" />

                                                {/* ── Party (Supplier / Customer) ── */}
                                                {group.meta.partyName && (
                                                    <button
                                                        onClick={(e) => handleOpenParty(e, group.meta)}
                                                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline transition-colors group/party"
                                                        title={isAr ? 'فتح شيت الجهة' : 'Open party sheet'}
                                                    >
                                                        {group.meta.partyType === 'customer'
                                                            ? <User className="w-3 h-3 flex-shrink-0" />
                                                            : <Building2 className="w-3 h-3 flex-shrink-0" />
                                                        }
                                                        <span className="font-medium">{group.meta.partyName}</span>
                                                        <Link2 className="w-2.5 h-2.5 opacity-0 group-hover/party:opacity-100 transition-opacity" />
                                                    </button>
                                                )}

                                                {/* ── Receipt Method + Container ── */}
                                                {group.meta.receiptMethod && (
                                                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                                        <Truck className="w-3 h-3 flex-shrink-0" />
                                                        {group.meta.receiptMethod === 'container' ? (
                                                            <>
                                                                <span>{isAr ? 'كونتينر:' : 'Container:'}</span>
                                                                {group.meta.containerNumber && group.meta.containerId ? (
                                                                    <button
                                                                        onClick={(e) => handleOpenContainer(e, group.meta?.containerId)}
                                                                        className="inline-flex items-center gap-0.5 font-mono font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline transition-colors group/cont"
                                                                        title={isAr ? 'فتح شيت الكونتينر' : 'Open container sheet'}
                                                                    >
                                                                        <Ship className="w-2.5 h-2.5" />
                                                                        {group.meta.containerNumber}
                                                                        <Link2 className="w-2.5 h-2.5 opacity-0 group-hover/cont:opacity-100 transition-opacity" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="font-mono font-semibold">{group.meta.containerNumber}</span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span>{isAr ? 'مباشر' : 'Direct'}</span>
                                                        )}
                                                    </span>
                                                )}

                                                {/* ── Invoice link ── */}
                                                {group.meta.invoiceNumber && group.meta.invoiceId && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (onOpenDocument && group.meta?.invoiceId) onOpenDocument(group.meta.partyType === 'customer' ? 'sale_invoice' : 'purchase_invoice', group.meta.invoiceId); }}
                                                        className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-800 hover:underline transition-colors group/inv"
                                                        title={isAr ? 'فتح الفاتورة الأصلية' : 'Open invoice'}
                                                    >
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                        <span className="font-mono font-semibold">{group.meta.invoiceNumber}</span>
                                                        <Link2 className="w-2.5 h-2.5 opacity-0 group-hover/inv:opacity-100 transition-opacity" />
                                                    </button>
                                                )}

                                                {/* ── Status Badges ── */}
                                                <div className="flex items-center gap-1 ms-auto">
                                                    {group.meta.docStage && stageBadge(group.meta.docStage)}
                                                    {group.meta.receiptStatus && stageBadge(group.meta.receiptStatus)}
                                                    {group.meta.deliveryStatus && stageBadge(group.meta.deliveryStatus)}
                                                </div>
                                            </div>
                                        )}

                                        {/* ─── Expanded: Roll Details ─────────── */}
                                        {isExpanded && hasRolls && (
                                            <div className="bg-slate-50 dark:bg-slate-900/40 border-t border-b border-blue-100 dark:border-blue-900/30">
                                                {/* Sub-header */}
                                                <div className={cn(
                                                    "grid gap-2 px-8 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800",
                                                    "grid-cols-[1fr_80px_80px_80px]"
                                                )}>
                                                    <div>{isAr ? 'رقم الرولون' : 'Roll #'}</div>
                                                    <div className="text-center">{isAr ? 'الكمية' : 'Qty'}</div>
                                                    <div className="text-center">{isAr ? 'سعر/م' : 'Cost/m'}</div>
                                                    <div className="text-center">{isAr ? 'الإجمالي' : 'Total'}</div>
                                                </div>
                                                {group.rolls.map((roll, ri) => (
                                                    <div
                                                        key={roll.id}
                                                        className={cn(
                                                            "grid gap-2 px-8 py-2.5 text-xs items-center",
                                                            "grid-cols-[1fr_80px_80px_80px]",
                                                            ri % 2 === 1 ? "bg-white/50 dark:bg-white/5" : ""
                                                        )}
                                                    >
                                                        {/* Roll number with icon */}
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                                roll.quantity > 0 ? "bg-green-400" : "bg-red-400"
                                                            )} />
                                                            <span className={cn(
                                                                "font-mono font-medium",
                                                                roll.roll_id ? "text-erp-navy dark:text-blue-300" : "text-gray-400 italic"
                                                            )}>
                                                                {roll.roll_number}
                                                            </span>
                                                            {(roll.warehouse_from || roll.warehouse_to) && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {roll.warehouse_from && roll.warehouse_to
                                                                        ? `${roll.warehouse_from} → ${roll.warehouse_to}`
                                                                        : roll.warehouse_from || roll.warehouse_to}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Qty */}
                                                        <div className="text-center font-mono font-semibold">
                                                            <span className={roll.quantity > 0 ? "text-green-600" : "text-red-600"}>
                                                                {roll.quantity > 0 ? '+' : ''}{Math.abs(roll.quantity).toFixed(1)}
                                                            </span>
                                                        </div>

                                                        {/* Unit cost */}
                                                        <div className="text-center text-gray-500 font-mono">
                                                            {roll.unit_cost ? roll.unit_cost.toFixed(2) : '—'}
                                                        </div>

                                                        {/* Total */}
                                                        <div className="text-center text-gray-600 dark:text-gray-400 font-mono">
                                                            {roll.total_cost ? roll.total_cost.toFixed(2) : '—'}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Sub-total */}
                                                <div className={cn(
                                                    "grid gap-2 px-8 py-2 border-t border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10",
                                                    "grid-cols-[1fr_80px_80px_80px] text-[11px] font-semibold text-gray-600"
                                                )}>
                                                    <div>{isAr ? `المجموع (${group.rolls.length} رولون)` : `Total (${group.rolls.length} rolls)`}</div>
                                                    <div className="text-center font-mono">
                                                        <span className={group.totalQty > 0 ? "text-green-700" : "text-red-700"}>
                                                            {group.totalQty > 0 ? '+' : ''}{Math.abs(group.totalQty).toFixed(1)}
                                                        </span>
                                                    </div>
                                                    <div />
                                                    <div className="text-center font-mono text-gray-700">
                                                        {group.totalValue ? group.totalValue.toFixed(2) : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                    }
                </CardContent >
            </Card >

            {/* ─── Info Note ──────────────────────────────── */}
            < div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2.5" >
                <ArrowRightLeft className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    {isAr
                        ? 'يعرض هذا التبويب جميع حركات المادة مجمعةً حسب الوثيقة — مشتريات، مبيعات، ومناقلات. اضغط على أي سطر لعرض الرولونات التفصيلية. استخدم أيقونة الرابط لفتح الوثيقة الأصلية.'
                        : 'This tab shows all material movements grouped by document. Click any row to expand roll details. Use the link icon to open the original document.'}
                </p>
            </div >
        </div >
    );
}

export default MaterialMovementsTab;
