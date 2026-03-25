/**
 * ════════════════════════════════════════════════════════════════
 * 📋 Movement Detail Sheet — بضاعة أول المدة
 * ════════════════════════════════════════════════════════════════
 *
 * Sheet مخصص لعرض حركات الاستيراد (opening_balance) فقط.
 * يفتح من الجهة اليسرى (عكس الـ Sidebar) بنصف عرض الشاشة.
 *
 * يعرض:
 * - Header بـ gradient حديث مع ملخص (المواد، الكمية، التاريخ)
 * - بطاقات معلومات الحركة
 * - جدول المواد بالكميات والأسعار عند الاستيراد + الإجمالي
 * - القيد الافتتاحي المرتبط في أكورديون قابل للفتح
 * ════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';
import { cn } from '@/lib/utils';
import {
    Package,
    Warehouse,
    Calendar,
    Hash,
    Loader2,
    ExternalLink,
    BookOpen,
    CreditCard,
    Info,
    X,
    Layers,
    Import,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Coins,
} from 'lucide-react';

interface MovementDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    movement: any;
    onOpenJournal?: (journalId: string) => void;
}

interface JournalEntryInfo {
    id: string;
    entry_number: string;
    entry_date: string;
    description_ar?: string;
    description_en?: string;
    entry_type: string;
    status: string;
    is_posted: boolean;
    currency: string;
    exchange_rate: number;
    total_debit: number;
    total_credit: number;
    lines: {
        id: string;
        line_number: number;
        account_code: string;
        account_name_ar: string;
        account_name_en: string;
        debit: number;
        credit: number;
        debit_fc?: number;
        credit_fc?: number;
        currency?: string;
        description: string;
    }[];
}

// ── Cache for fetched data ──
interface CachedData {
    key: string;
    rows: any[];
    journal: JournalEntryInfo | null;
}

export function MovementDetailDialog({
    open,
    onOpenChange,
    movement,
    onOpenJournal,
}: MovementDetailDialogProps) {
    const { language, direction } = useLanguage();
    const { companyId } = useAuth();
    const isRTL = language === 'ar';

    const [loading, setLoading] = useState(false);
    const [journal, setJournal] = useState<JournalEntryInfo | null>(null);
    const [allMovementRows, setAllMovementRows] = useState<any[]>([]);
    const [journalOpen, setJournalOpen] = useState(false);
    const [materialSheet, setMaterialSheet] = useState<{ open: boolean; data: any }>({ open: false, data: null });

    // ── Cache ref: stores last fetched data by reference_number ──
    const cacheRef = useRef<CachedData | null>(null);

    const t = (ar: string, en: string) => isRTL ? ar : en;

    // ── Fetch details (optimized: parallel queries + cache) ──
    useEffect(() => {
        if (!open || !movement) return;

        const cacheKey = movement.reference_number || movement.id || '';

        // ═══ CHECK CACHE: if same movement, restore instantly ═══
        if (cacheRef.current?.key === cacheKey) {
            setAllMovementRows(cacheRef.current.rows);
            setJournal(cacheRef.current.journal);
            return; // No fetch needed!
        }

        const fetchDetails = async () => {
            setLoading(true);
            setJournal(null);
            setAllMovementRows([]);
            setJournalOpen(false);

            try {
                const referenceNumber = movement.reference_number || '';
                const refType = movement.reference_type || '';
                const compId = movement.company_id || companyId;
                const movementDate = movement.movement_date
                    ? new Date(movement.movement_date).toISOString().split('T')[0]
                    : '';

                // ═══ STEP 1: Parallel — fetch movement rows + journal header simultaneously ═══
                const [movementResult, journalResult] = await Promise.all([
                    // (A) Movement rows
                    referenceNumber
                        ? supabase
                            .from('inventory_movements')
                            .select('id, movement_number, material_id, quantity, unit_cost, total_cost, movement_date, notes, to_warehouse_id')
                            .eq('company_id', compId)
                            .eq('reference_number', referenceNumber)
                            .order('created_at', { ascending: true })
                        : Promise.resolve({ data: null }),

                    // (B) Journal entry header (opening_balance type)
                    refType === 'opening_balance'
                        ? supabase
                            .from('journal_entries')
                            .select('id, entry_number, entry_date, description_ar, description_en, entry_type, status, is_posted, currency, exchange_rate, total_debit, total_credit')
                            .eq('company_id', compId)
                            .eq('entry_type', 'opening_balance')
                            .eq('reference_type', 'import')
                            .order('entry_date', { ascending: false })
                            .limit(5)
                        : Promise.resolve({ data: null }),
                ]);

                const rows = movementResult.data || [];
                const journalEntries = journalResult.data || [];

                // Find best matching journal
                let foundJournal = journalEntries.length > 0
                    ? (journalEntries.find((j: any) =>
                        j.entry_date === movementDate ||
                        j.entry_number?.includes('PROD') ||
                        j.entry_number?.includes('MAT')
                    ) || journalEntries[0])
                    : null;

                // Fallback: search by reference_number (only if no journal found yet)
                if (!foundJournal && referenceNumber) {
                    const { data: je2 } = await supabase
                        .from('journal_entries')
                        .select('id, entry_number, entry_date, description_ar, description_en, entry_type, status, is_posted, currency, exchange_rate, total_debit, total_credit')
                        .eq('company_id', compId)
                        .ilike('reference_number', `%${referenceNumber}%`)
                        .maybeSingle();
                    if (je2) foundJournal = je2;
                }

                // ═══ STEP 2: Parallel — fetch materials + journal lines + warehouse names ═══
                const matIds = [...new Set(rows.map((r: any) => r.material_id).filter(Boolean))];
                const warehouseIds = [...new Set(rows.map((r: any) => r.to_warehouse_id).filter(Boolean))];

                const [materialsResult, journalLinesResult, warehousesResult] = await Promise.all([
                    // (A) Materials
                    matIds.length > 0
                        ? supabase
                            .from('fabric_materials')
                            .select('id, code, name_ar, name_en, unit, purchase_price, selling_price, currency')
                            .in('id', matIds)
                        : Promise.resolve({ data: null }),

                    // (B) Journal lines
                    foundJournal
                        ? supabase
                            .from('journal_entry_lines')
                            .select('id, line_number, debit, credit, debit_fc, credit_fc, currency, exchange_rate, description, account_id, account:chart_of_accounts(account_code, name_ar, name_en)')
                            .eq('entry_id', foundJournal.id)
                            .order('line_number', { ascending: true })
                        : Promise.resolve({ data: null }),

                    // (C) Warehouse names
                    warehouseIds.length > 0
                        ? supabase
                            .from('warehouses')
                            .select('id, name_ar, name_en')
                            .in('id', warehouseIds)
                        : Promise.resolve({ data: null }),
                ]);

                // ── Build material map ──
                const matMap: Record<string, any> = {};
                (materialsResult.data || []).forEach((m: any) => { matMap[m.id] = m; });

                // ── Build warehouse map ──
                const whMap: Record<string, any> = {};
                (warehousesResult.data || []).forEach((w: any) => { whMap[w.id] = w; });

                // ── Build enriched rows ──
                const enrichedRows = rows.length > 0
                    ? rows.map((r: any) => ({
                        ...r,
                        material_name_ar: matMap[r.material_id]?.name_ar || '',
                        material_name_en: matMap[r.material_id]?.name_en || '',
                        material_code: matMap[r.material_id]?.code || '',
                        material_unit: matMap[r.material_id]?.unit || 'meter',
                        material_currency: matMap[r.material_id]?.currency || '',
                        material_purchase_price: matMap[r.material_id]?.purchase_price || 0,
                        warehouse_name: whMap[r.to_warehouse_id]?.name_ar || whMap[r.to_warehouse_id]?.name_en || '—',
                    }))
                    : [];
                setAllMovementRows(enrichedRows);

                // ── Build journal data ──
                let journalData: JournalEntryInfo | null = null;
                if (foundJournal) {
                    journalData = {
                        ...foundJournal,
                        exchange_rate: foundJournal.exchange_rate || 1,
                        lines: (journalLinesResult.data || []).map((l: any) => ({
                            id: l.id,
                            line_number: l.line_number,
                            account_code: l.account?.account_code || '',
                            account_name_ar: l.account?.name_ar || '',
                            account_name_en: l.account?.name_en || '',
                            debit: l.debit || 0,
                            credit: l.credit || 0,
                            debit_fc: l.debit_fc || 0,
                            credit_fc: l.credit_fc || 0,
                            currency: l.currency,
                            description: l.description || '',
                        })),
                    };
                    setJournal(journalData);
                }

                // ═══ SAVE TO CACHE ═══
                cacheRef.current = { key: cacheKey, rows: enrichedRows, journal: journalData };
            } catch (err) {
                console.error('MovementDetailDialog fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [open, movement, companyId]);

    if (!movement) return null;

    const fmtDate = (d: string) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch { return d; }
    };

    const fmtNum = (n: number) => Number(n || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });

    const totalQty = movement.total_quantity || movement.quantity || 0;
    const totalValue = allMovementRows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);

    return (<>
        <Sheet open={open} onOpenChange={(v) => {
            // Don't close parent sheet if material child sheet is open
            if (!v && materialSheet.open) return;
            onOpenChange(v);
        }}>
            <SheetContent
                side={isRTL ? 'left' : 'right'}
                className="w-full sm:max-w-[50vw] p-0 flex flex-col overflow-hidden border-0"
                dir={direction}
                onInteractOutside={(e) => { if (materialSheet.open) e.preventDefault(); }}
                onPointerDownOutside={(e) => { if (materialSheet.open) e.preventDefault(); }}
            >
                <VisuallyHidden>
                    <SheetTitle>{t('بضاعة أول المدة', 'Opening Balance')}</SheetTitle>
                </VisuallyHidden>

                {/* ═══════════════════════════════════════
                     HEADER
                    ═══════════════════════════════════════ */}
                <div className="relative px-6 py-5 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 text-white flex-shrink-0">
                    {/* Close */}
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-3 start-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3.5 pe-8">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
                            <Import className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold leading-tight">
                                {t('بضاعة أول المدة', 'Opening Balance')}
                            </h2>
                            <p className="text-sm text-white/70 mt-0.5">
                                {t('استيراد بيانات — رصيد افتتاحي مخزون', 'Data Import — Opening Inventory Balance')}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge className="bg-white/20 text-white border-white/30 text-[11px] backdrop-blur-sm">
                                    {movement.reference_number || movement.id?.substring(0, 8)}
                                </Badge>
                                <Badge className="bg-emerald-500/30 text-white border-emerald-400/40 text-[11px] backdrop-blur-sm">
                                    {t('مكتمل', 'Completed')}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-2.5 mt-4">
                        <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2.5 text-center">
                            <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                                {t('المواد', 'Materials')}
                            </p>
                            <p className="text-xl font-bold font-mono mt-0.5">
                                {allMovementRows.length || movement.items_count || '—'}
                            </p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2.5 text-center">
                            <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                                {t('الكمية', 'Quantity')}
                            </p>
                            <p className="text-xl font-bold font-mono mt-0.5">
                                {Number(allMovementRows.length > 0
                                    ? allMovementRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
                                    : totalQty
                                ).toLocaleString('en-US')}
                            </p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2.5 text-center">
                            <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                                {t('التاريخ', 'Date')}
                            </p>
                            <p className="text-sm font-bold mt-1">
                                {movement.movement_date
                                    ? new Date(movement.movement_date).toLocaleDateString('en-CA')
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════
                     BODY
                    ═══════════════════════════════════════ */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="px-5 py-4 space-y-4">

                            {/* ── Section 1: Movement Info ── */}
                            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                                <SectionTitle icon={<Info className="w-4 h-4" />} title={t('معلومات الحركة', 'Movement Info')} />
                                <div className="grid grid-cols-2 gap-2.5 mt-3">
                                    <InfoCard
                                        icon={<Calendar className="w-4 h-4 text-blue-500" />}
                                        label={t('التاريخ', 'Date')}
                                        value={fmtDate(movement.movement_date || movement.created_at)}
                                    />
                                    <InfoCard
                                        icon={<Hash className="w-4 h-4 text-gray-500" />}
                                        label={t('رقم المرجع', 'Reference')}
                                        value={<span className="font-mono text-xs">{movement.reference_number || '—'}</span>}
                                    />
                                    <InfoCard
                                        icon={<Warehouse className="w-4 h-4 text-teal-500" />}
                                        label={t('المستودع', 'Warehouse')}
                                        value={movement.to_warehouse_name || movement.warehouse_name || movement.from_warehouse_name || '—'}
                                    />
                                    <InfoCard
                                        icon={<Import className="w-4 h-4 text-indigo-500" />}
                                        label={t('النوع', 'Type')}
                                        value={t('رصيد افتتاحي', 'Opening Balance')}
                                    />
                                </div>
                            </section>

                            {/* ── Section 2: Materials Table ── */}
                            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="px-4 pt-4 pb-2">
                                    <SectionTitle
                                        icon={<Layers className="w-4 h-4" />}
                                        title={t('بنود الحركة', 'Movement Items')}
                                        badge={allMovementRows.length > 0 ? `${allMovementRows.length}` : undefined}
                                    />
                                </div>

                                {allMovementRows.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-800/80 border-y border-gray-100 dark:border-gray-700">
                                                    <th className="px-4 py-2.5 text-start font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider w-8">
                                                        #
                                                    </th>
                                                    <th className="px-3 py-2.5 text-start font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
                                                        {t('المادة', 'Material')}
                                                    </th>
                                                    <th className="px-3 py-2.5 text-end font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
                                                        {t('الكمية', 'Qty')}
                                                    </th>
                                                    <th className="px-3 py-2.5 text-end font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
                                                        {t('سعر الوحدة', 'Unit Price')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-end font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
                                                        {t('الإجمالي', 'Total')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {allMovementRows.map((row, i) => {
                                                    const unitLabel = row.material_unit === 'meter' ? t('م', 'm')
                                                        : row.material_unit === 'kg' ? t('كغ', 'kg')
                                                            : row.material_unit === 'yard' ? t('ي', 'yd')
                                                                : row.material_unit || t('م', 'm');
                                                    return (
                                                        <tr
                                                            key={row.id || i}
                                                            className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/15 transition-colors cursor-pointer group"
                                                            onClick={async () => {
                                                                if (row.material_id) {
                                                                    // Fetch full material data for the sheet
                                                                    const { data: fullMat } = await supabase
                                                                        .from('fabric_materials')
                                                                        .select('*')
                                                                        .eq('id', row.material_id)
                                                                        .maybeSingle();
                                                                    if (fullMat) {
                                                                        setMaterialSheet({ open: true, data: fullMat });
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold inline-flex items-center justify-center">
                                                                    {i + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className="min-w-0 flex items-center gap-1.5">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-[12px] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                            {isRTL ? row.material_name_ar : row.material_name_en || row.material_name_ar || '—'}
                                                                        </p>
                                                                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">{row.material_code}</p>
                                                                    </div>
                                                                    <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-end">
                                                                <span className="font-mono font-bold text-[13px] text-gray-800 dark:text-gray-200 tabular-nums">
                                                                    {Number(row.quantity || 0).toLocaleString('en-US')}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground ms-0.5">{unitLabel}</span>
                                                            </td>
                                                            <td className="px-3 py-3 text-end">
                                                                <span className="font-mono text-[12px] text-gray-600 dark:text-gray-400 tabular-nums">
                                                                    {row.unit_cost > 0 ? fmtNum(row.unit_cost) : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-end">
                                                                {(row.total_cost > 0) ? (
                                                                    <span className="font-mono font-bold text-[13px] text-indigo-700 dark:text-indigo-400 tabular-nums">
                                                                        {fmtNum(row.total_cost)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {/* Footer totals */}
                                            <tfoot>
                                                <tr className="bg-indigo-50/50 dark:bg-indigo-900/10 border-t-2 border-indigo-200 dark:border-indigo-800">
                                                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 text-[12px]">
                                                        <Coins className="w-4 h-4 inline me-1.5 text-indigo-500 -mt-0.5" />
                                                        {t('الإجمالي', 'Total')}
                                                        <span className="text-[10px] text-muted-foreground font-normal ms-2">
                                                            ({allMovementRows.length} {t('صنف', 'items')})
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-end font-mono font-bold text-[14px] text-gray-800 dark:text-gray-200 tabular-nums">
                                                        {Number(allMovementRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)).toLocaleString('en-US')}
                                                    </td>
                                                    <td className="px-3 py-3" />
                                                    <td className="px-4 py-3 text-end font-mono font-bold text-[14px] text-indigo-700 dark:text-indigo-400 tabular-nums">
                                                        {fmtNum(totalValue)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="px-4 pb-4 text-sm text-muted-foreground">
                                        {t('لا توجد بنود', 'No items found')}
                                    </div>
                                )}
                            </section>

                            {/* ── Section 3: Journal Entry (Accordion) ── */}
                            {journal && (
                                <Collapsible open={journalOpen} onOpenChange={setJournalOpen}>
                                    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                        <CollapsibleTrigger className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="text-start">
                                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                        {t('القيد الافتتاحي المرتبط', 'Related Opening Entry')}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        {journal.entry_number}
                                                        <span className="mx-1.5">•</span>
                                                        {journal.currency}
                                                        <span className="mx-1.5">•</span>
                                                        <span className={cn(
                                                            journal.is_posted ? 'text-emerald-600' : 'text-amber-600'
                                                        )}>
                                                            {journal.is_posted ? t('مُرحّل', 'Posted') : t('مسودة', 'Draft')}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {onOpenJournal && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-7 gap-1 text-blue-600 hover:text-blue-700"
                                                        onClick={(e) => { e.stopPropagation(); onOpenJournal(journal.id); }}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        {t('فتح', 'Open')}
                                                    </Button>
                                                )}
                                                {journalOpen
                                                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                                                }
                                            </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="border-t border-gray-100 dark:border-gray-700">
                                                {/* Description */}
                                                <div className="px-4 py-2.5 bg-indigo-50/30 dark:bg-indigo-900/10 text-xs text-gray-600 dark:text-gray-400">
                                                    {isRTL ? journal.description_ar : journal.description_en || journal.description_ar}
                                                    <span className="mx-2">•</span>
                                                    {fmtDate(journal.entry_date)}
                                                </div>

                                                {/* Lines table */}
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-800/80 border-y border-gray-100 dark:border-gray-700">
                                                            <th className="px-4 py-2 text-start font-bold text-gray-500 text-[11px] uppercase tracking-wider">
                                                                {t('الحساب', 'Account')}
                                                            </th>
                                                            <th className="px-3 py-2 text-end font-bold text-emerald-600 text-[11px] uppercase tracking-wider">
                                                                {t('مدين', 'Debit')}
                                                            </th>
                                                            <th className="px-4 py-2 text-end font-bold text-rose-600 text-[11px] uppercase tracking-wider">
                                                                {t('دائن', 'Credit')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                        {journal.lines.map(line => (
                                                            <tr key={line.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-2.5">
                                                                    <span className="font-mono text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 rounded me-1.5">
                                                                        {line.account_code}
                                                                    </span>
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300 text-[12px]">
                                                                        {isRTL ? line.account_name_ar : line.account_name_en || line.account_name_ar}
                                                                    </span>
                                                                    {line.description && (
                                                                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 ps-1">
                                                                            {line.description}
                                                                        </p>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-end font-mono tabular-nums">
                                                                    {line.debit > 0 ? (
                                                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[13px]">
                                                                            {fmtNum(line.debit)}
                                                                        </span>
                                                                    ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-end font-mono tabular-nums">
                                                                    {line.credit > 0 ? (
                                                                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[13px]">
                                                                            {fmtNum(line.credit)}
                                                                        </span>
                                                                    ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700 font-bold">
                                                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-[12px]">
                                                                <CreditCard className="w-3.5 h-3.5 inline me-1.5 text-gray-400 -mt-0.5" />
                                                                {t('الإجمالي', 'Total')}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-end font-mono tabular-nums text-emerald-700 dark:text-emerald-400 text-[13px]">
                                                                {fmtNum(journal.total_debit)}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-end font-mono tabular-nums text-rose-600 dark:text-rose-400 text-[13px]">
                                                                {fmtNum(journal.total_credit)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </CollapsibleContent>
                                    </section>
                                </Collapsible>
                            )}

                            {!journal && !loading && (
                                <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                            <BookOpen className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {t('لا يوجد قيد محاسبي', 'No Journal Entry')}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {t('هذه الحركة غير مرتبطة بقيد محاسبي', 'This movement has no linked journal entry')}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <div className="h-4" />
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        {/* Material Detail Sheet */}
        <UnifiedAccountingSheet
            key={materialSheet.data?.id || 'no-material'}
            isOpen={materialSheet.open}
            onClose={() => setMaterialSheet({ open: false, data: null })}
            docType="material"
            mode="view"
            companyId={companyId || undefined}
            data={materialSheet.data}
            onSave={async () => {}}
        />
    </>);
}

// ── Section Title ──
function SectionTitle({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">{icon}</span>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight">{title}</h3>
            {badge && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">{badge}</Badge>
            )}
        </div>
    );
}

// ── Info Card ──
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
            <div className="mt-0.5 flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{value}</div>
            </div>
        </div>
    );
}
