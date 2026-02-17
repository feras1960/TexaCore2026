/**
 * 📦 ReceiptSummaryTab — تبويب ملخص الاستلام
 * ═══════════════════════════════════════════════════════════════
 * يظهر في:
 *   1. أمر الشراء / فاتورة المشتريات → يعرض تفاصيل الاستلام المرتبط
 *   2. إذن الاستلام (GRN) نفسه → يعرض ملخصه
 *
 * المحتوى:
 *   - معلومات إذن الاستلام (رقم، تاريخ، مستودع، حالة)
 *   - جدول مقارنة: المطلوب vs المستلم vs الفرق
 *   - عند الضغط على مادة → يظهر الرولونات وتفاصيلها
 *   - القيد المحاسبي المرتبط (للمدير فقط)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Package, Calendar, Warehouse, FileText, Hash,
    ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
    TrendingUp, TrendingDown, Minus, Loader2, Layers,
    ArrowRightLeft, BookOpen, Banknote, ClipboardCheck,
    ScanLine
} from 'lucide-react';

interface ReceiptSummaryTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

interface ReceiptData {
    id: string;
    receipt_number: string;
    receipt_date: string;
    status: string;
    warehouse_id: string;
    warehouse_name_ar?: string;
    warehouse_name_en?: string;
    supplier_id?: string;
    supplier_name_ar?: string;
    supplier_name_en?: string;
    notes?: string;
    order_id?: string;
    invoice_id?: string;
}

interface ReceiptItemData {
    id: string;
    product_id: string;
    quantity_received: number;
    quantity_accepted: number;
    quantity_rejected: number;
    notes?: string;
    material_name_ar?: string;
    material_name_en?: string;
    material_code?: string;
}

interface FabricRollData {
    id: string;
    roll_number: string;
    material_id: string;
    initial_length: number;
    current_length: number;
    available_length: number;
    status: string;
    batch_number?: string;
}

interface JournalEntryData {
    id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    status: string;
    total_debit: number;
    total_credit: number;
    lines: Array<{
        id: string;
        line_number: number;
        description: string;
        debit_amount: number;
        credit_amount: number;
        account_name?: string;
    }>;
}

interface SourceItemData {
    id: string;
    product_id?: string;
    material_id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total?: number;
}

export const ReceiptSummaryTab: React.FC<ReceiptSummaryTabProps> = ({
    data,
    mode,
    onChange,
}) => {
    const { isRTL, t, language } = useLanguage();
    const { companyId } = useCompany();
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);

    // ═══ Determine source document type ═══
    // If data has receipt_number → this IS a receipt (opened from GRN directly)
    // If data has order_number → this is a PO, look for linked receipts
    // If data has invoice_number → this is an invoice, look for linked receipts
    const isDirectReceipt = !!data?.receipt_number;
    const sourceDocId = data?.id;
    const sourceType = useMemo(() => {
        if (isDirectReceipt) return 'receipt';
        if (data?.order_number || data?.subType === 'order') return 'order';
        if (data?.invoice_number || data?.subType === 'invoice') return 'invoice';
        return 'unknown';
    }, [data, isDirectReceipt]);

    // ═══ 1. Fetch linked receipt(s) ═══
    const { data: receipts = [], isLoading: receiptsLoading } = useQuery({
        queryKey: ['receipt_summary_receipts', sourceDocId, sourceType],
        queryFn: async () => {
            if (!sourceDocId) return [];

            let query = supabase
                .from('purchase_receipts')
                .select(`
                    *,
                    warehouses:warehouse_id(name_ar, name_en),
                    suppliers:supplier_id(name_ar, name_en)
                `);

            if (isDirectReceipt) {
                query = query.eq('id', sourceDocId);
            } else if (sourceType === 'order') {
                query = query.eq('order_id', sourceDocId);
            } else if (sourceType === 'invoice') {
                query = query.eq('invoice_id', sourceDocId);
            } else {
                return [];
            }

            const { data: rows, error } = await query.order('created_at', { ascending: false });
            if (error) {
                console.error('[ReceiptSummaryTab] Failed to fetch receipts:', error.message);
                return [];
            }

            return (rows || []).map((r: any) => ({
                ...r,
                warehouse_name_ar: r.warehouses?.name_ar || '',
                warehouse_name_en: r.warehouses?.name_en || '',
                supplier_name_ar: r.suppliers?.name_ar || '',
                supplier_name_en: r.suppliers?.name_en || '',
            }));
        },
        enabled: !!sourceDocId,
        staleTime: 30000,
    });

    // Get primary receipt
    const receipt: ReceiptData | null = receipts.length > 0 ? receipts[0] : null;

    // ═══ 2. Fetch receipt items with material info ═══
    const { data: receiptItems = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['receipt_summary_items', receipt?.id],
        queryFn: async () => {
            if (!receipt?.id) return [];

            const { data: items, error } = await supabase
                .from('purchase_receipt_items')
                .select('*')
                .eq('receipt_id', receipt.id);

            if (error) {
                console.error('[ReceiptSummaryTab] Failed to fetch receipt items:', error.message);
                return [];
            }

            // Enrich with material names
            // 🔑 FIX: Check both product_id and material_id (new column from migration)
            const materialIds = (items || [])
                .map((i: any) => i.material_id || i.product_id)
                .filter(Boolean);
            let materialMap: Record<string, any> = {};

            if (materialIds.length > 0) {
                // 🔑 FIX: Query fabric_materials (actual table) instead of materials (view/missing)
                const { data: materials } = await supabase
                    .from('fabric_materials')
                    .select('id, name_ar, name_en, code')
                    .in('id', materialIds);

                for (const m of materials || []) {
                    // Map code -> material_code for frontend compatibility
                    materialMap[m.id] = { ...m, material_code: m.code };
                }
            }

            return (items || []).map((item: any) => {
                const matId = item.material_id || item.product_id;
                return {
                    ...item,
                    product_id: matId, // Normalize for downstream use
                    material_name_ar: materialMap[matId]?.name_ar || '',
                    material_name_en: materialMap[matId]?.name_en || '',
                    material_code: materialMap[matId]?.material_code || '',
                };
            });
        },
        enabled: !!receipt?.id,
        staleTime: 30000,
    });

    // ═══ 3. Fetch fabric rolls for the receipt ═══
    const { data: fabricRolls = [] } = useQuery({
        queryKey: ['receipt_summary_rolls', receipt?.id],
        queryFn: async () => {
            if (!receipt?.id) return [];

            const { data: rolls, error } = await supabase
                .from('fabric_rolls')
                .select('*')
                .ilike('notes', `%${receipt.id}%`);

            if (error) {
                console.warn('[ReceiptSummaryTab] Failed to fetch rolls:', error.message);
                return [];
            }
            return rolls || [];
        },
        enabled: !!receipt?.id,
        staleTime: 30000,
    });

    // ═══ 4. Fetch source document items for comparison ═══
    const { data: sourceItems = [] } = useQuery({
        queryKey: ['receipt_summary_source_items', sourceDocId, sourceType],
        queryFn: async () => {
            if (!sourceDocId || isDirectReceipt) return [];

            let tableName = '';
            let foreignKey = '';

            if (sourceType === 'order') {
                tableName = 'purchase_order_items';
                foreignKey = 'order_id';
            } else if (sourceType === 'invoice') {
                tableName = 'purchase_transaction_items';
                foreignKey = 'transaction_id';
            }

            if (!tableName) return [];

            const { data: items, error } = await supabase
                .from(tableName)
                .select('*')
                .eq(foreignKey, sourceDocId);

            if (error) {
                console.warn('[ReceiptSummaryTab] Failed to fetch source items:', error.message);
                return [];
            }
            return items || [];
        },
        enabled: !!sourceDocId && !isDirectReceipt,
        staleTime: 30000,
    });

    // ═══ 5. Fetch journal entry for the receipt ═══
    const { data: journalEntry } = useQuery({
        queryKey: ['receipt_summary_journal', receipt?.id],
        queryFn: async () => {
            if (!receipt?.id) return null;

            const { data: entry, error } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('reference_id', receipt.id)
                .eq('reference_type', 'goods_receipt')
                .maybeSingle();

            if (error || !entry) return null;

            // Fetch entry lines
            const { data: lines } = await supabase
                .from('journal_entry_lines')
                .select('*')
                .eq('entry_id', entry.id)
                .order('line_number', { ascending: true });

            return {
                ...entry,
                lines: lines || [],
            } as JournalEntryData;
        },
        enabled: !!receipt?.id,
        staleTime: 30000,
    });

    // ═══ Build comparison table data ═══
    const comparisonData = useMemo(() => {
        if (receiptItems.length === 0) return [];

        return receiptItems.map((ri: ReceiptItemData) => {
            // Find matching source item
            const sourceItem = sourceItems.find((si: any) =>
                (si.product_id === ri.product_id) ||
                (si.material_id === ri.product_id)
            );

            const orderedQty = sourceItem ? Number(sourceItem.quantity || 0) : 0;
            const receivedQty = Number(ri.quantity_received || 0);
            const acceptedQty = Number(ri.quantity_accepted || 0);
            const rejectedQty = Number(ri.quantity_rejected || 0);
            const diff = receivedQty - orderedQty;

            // Get rolls for this material
            const materialRolls = fabricRolls.filter(
                (r: FabricRollData) => r.material_id === ri.product_id
            );

            const unitPrice = sourceItem ? Number(sourceItem.unit_price || 0) : 0;

            return {
                materialId: ri.product_id,
                materialName: language === 'ar'
                    ? (ri.material_name_ar || ri.material_name_en || '—')
                    : (ri.material_name_en || ri.material_name_ar || '—'),
                materialCode: ri.material_code || '',
                orderedQty,
                receivedQty,
                acceptedQty,
                rejectedQty,
                diff,
                diffPercent: orderedQty > 0 ? ((diff / orderedQty) * 100) : 0,
                unitPrice,
                orderedValue: orderedQty * unitPrice,
                receivedValue: receivedQty * unitPrice,
                rollCount: materialRolls.length,
                rolls: materialRolls,
                notes: ri.notes || '',
            };
        });
    }, [receiptItems, sourceItems, fabricRolls, language]);

    // ═══ Loading State ═══
    if (receiptsLoading || itemsLoading) {
        return (
            <div className="flex items-center justify-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                        {isRTL ? 'جارِ تحميل بيانات الاستلام...' : 'Loading receipt data...'}
                    </p>
                </div>
            </div>
        );
    }

    // ═══ No Receipt Found ═══
    if (!receipt) {
        return (
            <div className="flex items-center justify-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="text-center space-y-3">
                    <Package className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-muted-foreground">
                        {isRTL ? 'لم يتم استلام بضائع بعد لهذا المستند' : 'No goods received yet for this document'}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                        {isRTL
                            ? 'قم بإنشاء إذن استلام من المستودع لعرض التفاصيل هنا'
                            : 'Create a goods receipt from the warehouse to see details here'}
                    </p>
                </div>
            </div>
        );
    }

    const warehouseName = language === 'ar'
        ? (receipt.warehouse_name_ar || receipt.warehouse_name_en || '—')
        : (receipt.warehouse_name_en || receipt.warehouse_name_ar || '—');

    const totalReceived = comparisonData.reduce((s, c) => s + c.receivedQty, 0);
    const totalOrdered = comparisonData.reduce((s, c) => s + c.orderedQty, 0);
    const totalRolls = comparisonData.reduce((s, c) => s + c.rollCount, 0);

    const statusColor = receipt.status === 'completed'
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
        : receipt.status === 'draft'
            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';

    const formatNumber = (n: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(n);

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            return d;
        }
    };

    return (
        <div className="space-y-4 pb-4" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══ Receipt Info Header ═══ */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50/80 to-amber-50/40 dark:from-orange-950/20 dark:to-amber-950/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                                <ClipboardCheck className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">
                                    {isRTL ? 'إذن استلام البضائع' : 'Goods Receipt Note'}
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {receipt.receipt_number}
                                </p>
                            </div>
                        </div>
                        <Badge className={cn('text-xs px-3 py-1', statusColor)}>
                            {receipt.status === 'completed'
                                ? (isRTL ? 'مكتمل' : 'Completed')
                                : receipt.status === 'draft'
                                    ? (isRTL ? 'مسودة' : 'Draft')
                                    : receipt.status}
                        </Badge>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <InfoItem
                            icon={<Calendar className="w-3.5 h-3.5" />}
                            label={isRTL ? 'تاريخ الاستلام' : 'Receipt Date'}
                            value={formatDate(receipt.receipt_date)}
                        />
                        <InfoItem
                            icon={<Warehouse className="w-3.5 h-3.5" />}
                            label={isRTL ? 'المستودع' : 'Warehouse'}
                            value={warehouseName}
                        />
                        <InfoItem
                            icon={<Layers className="w-3.5 h-3.5" />}
                            label={isRTL ? 'عدد الرولونات' : 'Total Rolls'}
                            value={`${totalRolls}`}
                            highlight
                        />
                        <InfoItem
                            icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                            label={isRTL ? 'إجمالي المستلم' : 'Total Received'}
                            value={`${formatNumber(totalReceived)} ${isRTL ? 'م' : 'm'}`}
                            highlight
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Comparison Table ═══ */}
            <Card className="border shadow-sm">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-primary" />
                        {isRTL ? 'مقارنة الكميات — المطلوب vs المستلم' : 'Quantity Comparison — Ordered vs Received'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Table Header */}
                    <div className={cn(
                        "grid grid-cols-[1fr_100px_100px_100px_80px_80px] gap-1 px-4 py-2",
                        "bg-gray-50 dark:bg-gray-800/50 border-b text-xs font-semibold text-muted-foreground"
                    )}>
                        <span>{isRTL ? 'المادة' : 'Material'}</span>
                        <span className="text-center">{isRTL ? 'المطلوب' : 'Ordered'}</span>
                        <span className="text-center">{isRTL ? 'المستلم' : 'Received'}</span>
                        <span className="text-center">{isRTL ? 'المؤكد' : 'Accepted'}</span>
                        <span className="text-center">{isRTL ? 'الفرق' : 'Diff'}</span>
                        <span className="text-center">{isRTL ? 'الرولونات' : 'Rolls'}</span>
                    </div>

                    {/* Table Rows */}
                    {comparisonData.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                            {isRTL ? 'لا توجد بنود مستلمة' : 'No received items'}
                        </div>
                    ) : (
                        comparisonData.map((row, idx) => (
                            <React.Fragment key={row.materialId || idx}>
                                {/* Material Row (clickable) */}
                                <div
                                    className={cn(
                                        "grid grid-cols-[1fr_100px_100px_100px_80px_80px] gap-1 px-4 py-3 items-center",
                                        "border-b last:border-b-0 transition-colors cursor-pointer",
                                        expandedMaterial === row.materialId
                                            ? "bg-orange-50/60 dark:bg-orange-950/10"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                    )}
                                    onClick={() => setExpandedMaterial(
                                        expandedMaterial === row.materialId ? null : row.materialId
                                    )}
                                >
                                    {/* Material Name */}
                                    <div className="flex items-center gap-2">
                                        <button className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                                            {expandedMaterial === row.materialId
                                                ? <ChevronUp className="w-4 h-4 text-orange-500" />
                                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                                            }
                                        </button>
                                        <div>
                                            <p className="font-medium text-sm">{row.materialName}</p>
                                            {row.materialCode && (
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {row.materialCode}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ordered */}
                                    <span className="text-center text-sm font-mono">
                                        {row.orderedQty > 0 ? formatNumber(row.orderedQty) : '—'}
                                    </span>

                                    {/* Received */}
                                    <span className="text-center text-sm font-mono font-bold text-primary">
                                        {formatNumber(row.receivedQty)}
                                    </span>

                                    {/* Accepted */}
                                    <span className="text-center text-sm font-mono text-emerald-600">
                                        {formatNumber(row.acceptedQty)}
                                    </span>

                                    {/* Difference */}
                                    <div className="flex items-center justify-center gap-1">
                                        {row.diff > 0 ? (
                                            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-1.5 gap-0.5">
                                                <TrendingUp className="w-3 h-3" />
                                                +{formatNumber(row.diff)}
                                            </Badge>
                                        ) : row.diff < 0 ? (
                                            <Badge className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs px-1.5 gap-0.5">
                                                <TrendingDown className="w-3 h-3" />
                                                {formatNumber(row.diff)}
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-50 text-gray-500 dark:bg-gray-800 text-xs px-1.5 gap-0.5">
                                                <Minus className="w-3 h-3" />
                                                0
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Roll Count */}
                                    <span className="text-center text-sm font-semibold text-orange-600">
                                        {row.rollCount}
                                    </span>
                                </div>

                                {/* Expanded Roll Details */}
                                {expandedMaterial === row.materialId && row.rolls.length > 0 && (
                                    <div className="bg-orange-50/40 dark:bg-orange-950/5 border-b">
                                        <div className="px-8 py-2">
                                            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5" />
                                                {isRTL
                                                    ? `تفاصيل الرولونات (${row.rollCount} رولون)`
                                                    : `Roll Details (${row.rollCount} rolls)`}
                                            </p>

                                            {/* Roll Table Header */}
                                            <div className="grid grid-cols-[40px_1fr_100px_100px_100px_80px] gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 px-2">
                                                <span>#</span>
                                                <span>{isRTL ? 'رقم الرولون' : 'Roll No.'}</span>
                                                <span className="text-center">{isRTL ? 'الطول الأصلي' : 'Original'}</span>
                                                <span className="text-center">{isRTL ? 'الطول الحالي' : 'Current'}</span>
                                                <span className="text-center">{isRTL ? 'المتاح' : 'Available'}</span>
                                                <span className="text-center">{isRTL ? 'الحالة' : 'Status'}</span>
                                            </div>

                                            {/* Roll Rows */}
                                            {row.rolls.map((roll: FabricRollData, rollIdx: number) => (
                                                <div
                                                    key={roll.id}
                                                    className={cn(
                                                        "grid grid-cols-[40px_1fr_100px_100px_100px_80px] gap-1 px-2 py-1.5 rounded-md text-xs",
                                                        rollIdx % 2 === 0
                                                            ? "bg-white/60 dark:bg-gray-800/30"
                                                            : "bg-transparent"
                                                    )}
                                                >
                                                    <span className="text-muted-foreground font-mono">
                                                        {rollIdx + 1}
                                                    </span>
                                                    <span className="font-mono font-medium text-orange-700 dark:text-orange-400">
                                                        {roll.roll_number}
                                                    </span>
                                                    <span className="text-center font-mono">
                                                        {formatNumber(roll.initial_length)} {isRTL ? 'م' : 'm'}
                                                    </span>
                                                    <span className="text-center font-mono">
                                                        {formatNumber(roll.current_length)} {isRTL ? 'م' : 'm'}
                                                    </span>
                                                    <span className="text-center font-mono text-emerald-600">
                                                        {formatNumber(roll.available_length)} {isRTL ? 'م' : 'm'}
                                                    </span>
                                                    <span className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-[10px] px-1.5",
                                                                roll.status === 'available'
                                                                    ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400'
                                                                    : roll.status === 'reserved'
                                                                        ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400'
                                                                        : 'border-gray-300 text-gray-600'
                                                            )}
                                                        >
                                                            {roll.status === 'available'
                                                                ? (isRTL ? 'متاح' : 'Available')
                                                                : roll.status === 'reserved'
                                                                    ? (isRTL ? 'محجوز' : 'Reserved')
                                                                    : roll.status}
                                                        </Badge>
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Roll Summary */}
                                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-orange-200/50 dark:border-orange-900/30 px-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {isRTL ? 'إجمالي الطول:' : 'Total Length:'}
                                                    <strong className="ms-1 text-foreground">
                                                        {formatNumber(row.rolls.reduce((s: number, r: FabricRollData) => s + r.initial_length, 0))}
                                                        {isRTL ? ' م' : ' m'}
                                                    </strong>
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {isRTL ? 'المتاح:' : 'Available:'}
                                                    <strong className="ms-1 text-emerald-600">
                                                        {formatNumber(row.rolls.reduce((s: number, r: FabricRollData) => s + r.available_length, 0))}
                                                        {isRTL ? ' م' : ' m'}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Expanded but no rolls */}
                                {expandedMaterial === row.materialId && row.rolls.length === 0 && (
                                    <div className="bg-orange-50/40 dark:bg-orange-950/5 border-b px-8 py-4">
                                        <p className="text-xs text-muted-foreground text-center">
                                            {isRTL
                                                ? 'لا توجد رولونات مسجلة لهذه المادة'
                                                : 'No rolls recorded for this material'}
                                        </p>
                                    </div>
                                )}
                            </React.Fragment>
                        ))
                    )}

                    {/* Totals Row */}
                    {comparisonData.length > 0 && (
                        <div className={cn(
                            "grid grid-cols-[1fr_100px_100px_100px_80px_80px] gap-1 px-4 py-3",
                            "bg-gray-100/80 dark:bg-gray-800/80 font-semibold text-sm border-t-2"
                        )}>
                            <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                            <span className="text-center font-mono">
                                {totalOrdered > 0 ? formatNumber(totalOrdered) : '—'}
                            </span>
                            <span className="text-center font-mono text-primary">
                                {formatNumber(totalReceived)}
                            </span>
                            <span className="text-center font-mono text-emerald-600">
                                {formatNumber(comparisonData.reduce((s, c) => s + c.acceptedQty, 0))}
                            </span>
                            <span className="text-center font-mono">
                                {(() => {
                                    const totalDiff = totalReceived - totalOrdered;
                                    if (totalOrdered === 0) return '—';
                                    return totalDiff > 0
                                        ? <span className="text-blue-600">+{formatNumber(totalDiff)}</span>
                                        : totalDiff < 0
                                            ? <span className="text-red-600">{formatNumber(totalDiff)}</span>
                                            : '0';
                                })()}
                            </span>
                            <span className="text-center font-mono text-orange-600">{totalRolls}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Accounting Entry Section ═══ */}
            {journalEntry && (
                <Card className="border shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            {isRTL ? 'القيد المحاسبي — عند الاستلام' : 'Accounting Entry — Upon Receipt'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        {/* Entry Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="text-xs space-y-0.5">
                                    <p className="font-mono text-muted-foreground">
                                        {journalEntry.entry_number}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {formatDate(journalEntry.entry_date)}
                                    </p>
                                </div>
                            </div>
                            <Badge className={cn(
                                "text-xs",
                                journalEntry.status === 'posted'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-gray-100 text-gray-600'
                            )}>
                                {journalEntry.status === 'posted'
                                    ? (isRTL ? 'مُرحّل' : 'Posted')
                                    : (isRTL ? 'مسودة' : 'Draft')}
                            </Badge>
                        </div>

                        {/* Description */}
                        {journalEntry.description && (
                            <p className="text-xs text-muted-foreground mb-3 bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                                {journalEntry.description}
                            </p>
                        )}

                        <Separator className="mb-3" />

                        {/* Entry Lines */}
                        <div className="space-y-0">
                            {/* Header */}
                            <div className="grid grid-cols-[1fr_120px_120px] gap-2 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>{isRTL ? 'البيان' : 'Description'}</span>
                                <span className="text-center">{isRTL ? 'مدين' : 'Debit'}</span>
                                <span className="text-center">{isRTL ? 'دائن' : 'Credit'}</span>
                            </div>

                            {journalEntry.lines.map((line, idx) => (
                                <div
                                    key={line.id || idx}
                                    className={cn(
                                        "grid grid-cols-[1fr_120px_120px] gap-2 px-3 py-2 rounded text-sm",
                                        idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''
                                    )}
                                >
                                    <span className="text-sm">
                                        {line.description || line.account_name || '—'}
                                    </span>
                                    <span className={cn(
                                        "text-center font-mono",
                                        line.debit_amount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
                                    )}>
                                        {line.debit_amount > 0 ? formatNumber(line.debit_amount) : '—'}
                                    </span>
                                    <span className={cn(
                                        "text-center font-mono",
                                        line.credit_amount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
                                    )}>
                                        {line.credit_amount > 0 ? formatNumber(line.credit_amount) : '—'}
                                    </span>
                                </div>
                            ))}

                            {/* Totals */}
                            <div className="grid grid-cols-[1fr_120px_120px] gap-2 px-3 py-2 border-t-2 font-bold text-sm">
                                <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                                <span className="text-center font-mono text-red-600 dark:text-red-400">
                                    {formatNumber(journalEntry.total_debit || 0)}
                                </span>
                                <span className="text-center font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatNumber(journalEntry.total_credit || 0)}
                                </span>
                            </div>

                            {/* Balance Check */}
                            {Math.abs((journalEntry.total_debit || 0) - (journalEntry.total_credit || 0)) < 0.01 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {isRTL ? 'القيد متوازن ✓' : 'Entry is balanced ✓'}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ Notes Section ═══ */}
            {receipt.notes && (
                <Card className="border-none shadow-sm bg-gray-50/50 dark:bg-gray-900/50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-semibold mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            {isRTL ? 'ملاحظات الاستلام' : 'Receipt Notes'}
                        </p>
                        <p className="text-sm">{receipt.notes}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

// ═══ Helper Component ═══
const InfoItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-800/30">
        <div className="text-orange-500 dark:text-orange-400">{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">{label}</p>
            <p className={cn(
                "text-sm font-medium truncate",
                highlight && "text-primary font-bold"
            )}>
                {value}
            </p>
        </div>
    </div>
);

export default ReceiptSummaryTab;
