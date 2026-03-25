/**
 * 📦 ContainerReceiptSummaryTab — نمط متطابق مع ContainerExpensesTab
 * ════════════════════════════════════════════════════════════════
 * ✅ حاوية خارجية rounded-xl border ... overflow-hidden shadow-sm
 * ✅ رأس GRN: gradient + hover
 * ✅ border-t يفصل الرأس عن المحتوى
 * ✅ المادة: حاوية فرعية rounded-xl border violet داخل المحتوى
 * ✅ اللون: حاوية فرعية rounded-xl border sky داخل المادة
 * ✅ جدول الرولونات: جدول نظيف داخل اللون
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    ChevronDown, ChevronRight,
    Package, Warehouse, CheckCircle2,
    Clock, AlertCircle, Loader2,
    Calendar, RefreshCw, AlertTriangle,
    Tag, Layers, BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VarianceReviewPanel } from '@/features/trade/components/tabs/VarianceReviewPanel';

// ─── Types ────────────────────────────────────────────────────
interface RollDetail {
    id: string;
    roll_number: string;
    length: number;
    cost_per_meter: number;
    status: string;
}

interface ColorGroup {
    key: string;
    color_name: string | null;
    total_length: number;
    rolls: RollDetail[];
    isExpanded: boolean;
}

interface MaterialGroup {
    key: string;
    material_id: string;
    material_code: string | null;
    material_name: string;
    total_length: number;
    roll_count: number;
    colors: ColorGroup[];
    isExpanded: boolean;
}

interface GRNSummary {
    id: string;
    receipt_number: string;
    status: string;
    receipt_date: string | null;
    warehouse_name: string | null;
    variance_status: string | null;
    variance_pct: number | null;
    total_length_m: number;
    total_rolls: number;
    materials: MaterialGroup[];
    isExpanded: boolean;
}

interface ContainerReceiptSummaryTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange?: (updates: any) => void;
}

// ─── Status Config ────────────────────────────────────────────
const GRN_STATUS: Record<string, { ar: string; en: string; dotColor: string; badgeClass: string; icon: any }> = {
    draft: { ar: 'مسودة', en: 'Draft', dotColor: 'bg-gray-400', badgeClass: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock },
    in_progress: { ar: 'جارٍ الاستلام', en: 'In Progress', dotColor: 'bg-teal-500', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200', icon: Loader2 },
    completed: { ar: 'مكتمل', en: 'Completed', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    cancelled: { ar: 'ملغي', en: 'Cancelled', dotColor: 'bg-red-500', badgeClass: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
};

const ROLL_STATUS: Record<string, { ar: string; dot: string }> = {
    available: { ar: 'متاح', dot: 'bg-emerald-500' },
    reserved: { ar: 'محجوز', dot: 'bg-amber-500' },
    used: { ar: 'مستخدم', dot: 'bg-gray-400' },
    damaged: { ar: 'تالف', dot: 'bg-red-500' },
};

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

// ─── Component ───────────────────────────────────────────────
export function ContainerReceiptSummaryTab({ data }: ContainerReceiptSummaryTabProps) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    const sourceType = useMemo(() => {
        if (data?.subType === 'invoice' || data?.invoice_number) return 'invoice';
        if (data?.subType === 'order' || data?.order_number) return 'order';
        return 'container';
    }, [data]);
    const sourceId = data?.id;

    const [grns, setGrns] = useState<GRNSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // ─── Toggles ─────────────────────────────────────────────
    const toggleGRN = (id: string) =>
        setGrns(p => p.map(g => g.id === id ? { ...g, isExpanded: !g.isExpanded } : g));

    const toggleMaterial = (gid: string, mk: string) =>
        setGrns(p => p.map(g => g.id !== gid ? g : {
            ...g, materials: g.materials.map(m => m.key === mk ? { ...m, isExpanded: !m.isExpanded } : m),
        }));

    const toggleColor = (gid: string, mk: string, ck: string) =>
        setGrns(p => p.map(g => g.id !== gid ? g : {
            ...g, materials: g.materials.map(m => m.key !== mk ? m : {
                ...m, colors: m.colors.map(c => c.key === ck ? { ...c, isExpanded: !c.isExpanded } : c),
            }),
        }));

    // ─── Fetch ───────────────────────────────────────────────
    const fetchGRNs = useCallback(async () => {
        if (!sourceId) return;
        setIsLoading(true);
        try {
            let query = supabase
                .from('purchase_receipts')
                .select('id, receipt_number, status, receipt_date, warehouse_id, variance_status, variance_pct');

            if (sourceType === 'invoice') query = query.eq('invoice_id', sourceId);
            else if (sourceType === 'order') query = query.eq('order_id', sourceId);
            else query = query.eq('container_id', sourceId);

            const { data: receipts, error } = await query.order('created_at', { ascending: false });
            if (error) { console.error('[GRNTab]', error.message); return; }

            // warehouse names
            const whIds = [...new Set((receipts || []).map((r: any) => r.warehouse_id).filter(Boolean))];
            const whMap: Record<string, string> = {};
            if (whIds.length) {
                const { data: whs } = await supabase.from('warehouses').select('id, name_ar, name_en').in('id', whIds);
                (whs || []).forEach((w: any) => { whMap[w.id] = isRTL ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar); });
            }

            // fabric rolls
            const receiptIds = (receipts || []).map((r: any) => r.id);
            const rollsByReceipt: Record<string, any[]> = {};
            if (receiptIds.length) {
                const { data: rolls } = await supabase
                    .from('fabric_rolls')
                    .select('id, roll_number, material_id, color_name, initial_length, current_length, cost_per_meter, status, notes')
                    .in('notes', receiptIds.map((id: string) => `GRN: ${id}`));

                (rolls || []).forEach((roll: any) => {
                    const m = roll.notes?.match(/GRN: ([a-f0-9-]{36})/);
                    if (m) {
                        if (!rollsByReceipt[m[1]]) rollsByReceipt[m[1]] = [];
                        rollsByReceipt[m[1]].push(roll);
                    }
                });
            }

            // material names
            const allRolls = Object.values(rollsByReceipt).flat();
            const matIds = [...new Set(allRolls.map((r: any) => r.material_id).filter(Boolean))];
            const matNames: Record<string, { code: string; name: string }> = {};
            if (matIds.length) {
                const { data: mats } = await supabase.from('fabric_materials').select('id, code, name_ar, name_en').in('id', matIds);
                (mats || []).forEach((m: any) => {
                    matNames[m.id] = { code: m.code || '', name: isRTL ? (m.name_ar || m.name_en || m.code) : (m.name_en || m.name_ar || m.code) };
                });
            }

            // build hierarchy
            const mapped: GRNSummary[] = (receipts || []).map((r: any) => {
                const rolls = rollsByReceipt[r.id] || [];
                const m2: Record<string, Record<string, RollDetail[]>> = {};
                for (const roll of rolls) {
                    const mid = roll.material_id || 'unknown';
                    const cKey = roll.color_name?.trim() || (isRTL ? 'بدون لون' : 'No Color');
                    if (!m2[mid]) m2[mid] = {};
                    if (!m2[mid][cKey]) m2[mid][cKey] = [];
                    m2[mid][cKey].push({ id: roll.id, roll_number: roll.roll_number || roll.id.slice(0, 8), length: Number(roll.current_length || roll.initial_length) || 0, cost_per_meter: Number(roll.cost_per_meter) || 0, status: roll.status || 'available' });
                }
                const materials: MaterialGroup[] = Object.entries(m2).map(([mid, cm]) => {
                    const mat = matNames[mid] || { code: '', name: mid.slice(0, 8) };
                    const colors: ColorGroup[] = Object.entries(cm).map(([cKey, rl]) => ({
                        key: cKey,
                        color_name: cKey === (isRTL ? 'بدون لون' : 'No Color') ? null : cKey,
                        total_length: rl.reduce((s, r) => s + r.length, 0),
                        rolls: rl.sort((a, b) => a.roll_number.localeCompare(b.roll_number)),
                        isExpanded: false,
                    }));
                    return { key: mid, material_id: mid, material_code: mat.code || null, material_name: mat.name, total_length: colors.reduce((s, c) => s + c.total_length, 0), roll_count: colors.reduce((s, c) => s + c.rolls.length, 0), colors, isExpanded: false };
                });
                return { id: r.id, receipt_number: r.receipt_number || `GRN-${r.id.slice(0, 8)}`, status: r.status || 'draft', receipt_date: r.receipt_date, warehouse_name: whMap[r.warehouse_id] || null, variance_status: r.variance_status || null, variance_pct: r.variance_pct != null ? Number(r.variance_pct) : null, total_length_m: materials.reduce((s, m) => s + m.total_length, 0), total_rolls: rolls.length, materials, isExpanded: false };
            });

            if (mapped.length === 1) mapped[0].isExpanded = true;
            else { const ip = mapped.find(g => g.status === 'in_progress'); if (ip) ip.isExpanded = true; }

            setGrns(mapped);
            setLastUpdated(new Date());
        } finally {
            setIsLoading(false);
        }
    }, [sourceId, sourceType, isRTL]);

    useEffect(() => { fetchGRNs(); }, [fetchGRNs]);

    const totalRolls = grns.reduce((s, g) => s + g.total_rolls, 0);
    const totalLength = grns.reduce((s, g) => s + g.total_length_m, 0);
    const completedCnt = grns.filter(g => g.status === 'completed').length;
    const hasVariance = grns.some(g => g.variance_status === 'requires_review');

    // ─── Empty ────────────────────────────────────────────────
    if (!isLoading && grns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Package className="w-8 h-8 text-emerald-300" />
                </div>
                <p className="font-semibold text-gray-500 text-sm">
                    {isRTL ? 'لا توجد إذونات استلام' : 'No goods receipts found'}
                </p>
                <p className="text-xs text-gray-400 max-w-xs text-center">
                    {isRTL ? 'ستظهر هنا إذونات الاستلام (GRN) بمجرد بدء الاستلام من المستودع' : 'GRN records will appear here once warehouse starts receiving'}
                </p>
                <Button variant="outline" size="sm" onClick={fetchGRNs} className="gap-2 text-xs mt-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isRTL ? 'تحديث' : 'Refresh'}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 px-4 py-4" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ══ Summary Cards — نفس نمط المصاريف ══ */}
            <div className="grid grid-cols-4 gap-3">
                {([
                    { label: isRTL ? 'إذونات الاستلام' : 'GRN Count', value: grns.length, color: 'text-violet-700', bg: 'bg-violet-50/80 border-violet-200/60' },
                    { label: isRTL ? 'مكتمل' : 'Completed', value: completedCnt, color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200/60' },
                    { label: isRTL ? 'إجمالي الرولونات' : 'Total Rolls', value: totalRolls, color: 'text-sky-700', bg: 'bg-sky-50/80 border-sky-200/60' },
                    { label: isRTL ? 'الكمية (م)' : 'Total Qty (m)', value: fmt(totalLength), color: 'text-teal-700', bg: 'bg-teal-50/80 border-teal-200/60' },
                ] as const).map((s, i) => (
                    <div key={i} className={cn('rounded-xl border px-4 py-3', s.bg)}>
                        <p className={cn('text-2xl font-bold font-mono', s.color)}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ══ Variance Review Panel ══ */}
            {(data?.variance_status === 'pending_review' || data?.variance_status === 'reviewed') && (
                <VarianceReviewPanel
                    containerId={sourceId}
                    containerNumber={data?.container_number || ''}
                    varianceStatus={data?.variance_status}
                    onReviewComplete={fetchGRNs}
                />
            )}

            {/* ══ Toolbar ══ */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                    {isRTL ? 'آخر تحديث' : 'Updated'}: {format(lastUpdated, 'HH:mm:ss')}
                </span>
                <Button variant="outline" size="sm" onClick={fetchGRNs} disabled={isLoading}
                    className="h-7 gap-1.5 text-xs text-teal-600 border-teal-200 hover:bg-teal-50">
                    <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                    {isRTL ? 'تحديث' : 'Refresh'}
                </Button>
            </div>

            {/* ══ Loading ══ */}
            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
            )}

            {/* ══ GRN List — نفس نمط batchGroups في المصاريف ══ */}
            {!isLoading && (
                <div className="space-y-3">
                    {grns.map(grn => {
                        const sd = GRN_STATUS[grn.status] || GRN_STATUS.draft;
                        const Icon = sd.icon;
                        const hasVar = grn.variance_status === 'requires_review';

                        return (
                            /* ── الحاوية الخارجية — نفس نمط batchGroups ── */
                            <div key={grn.id} className={cn(
                                'rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow',
                                grn.status === 'completed' && !hasVar && 'border-emerald-200/80 dark:border-emerald-800/60',
                                grn.status === 'completed' && hasVar && 'border-amber-200/80 dark:border-amber-800/60',
                                grn.status === 'in_progress' && 'border-teal-300/80 dark:border-teal-700/60',
                                grn.status === 'draft' && 'border-gray-200/80 dark:border-gray-700/60',
                                grn.status === 'cancelled' && 'border-gray-100 opacity-60',
                            )}>
                                {/* ── GRN Header — gradient نفس نمط المصاريف ── */}
                                <div
                                    className={cn(
                                        'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors',
                                        grn.status === 'completed' && !hasVar && (
                                            grn.isExpanded
                                                ? 'bg-emerald-100/80 dark:bg-emerald-900/40'
                                                : 'bg-gradient-to-r from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-gray-900 hover:from-emerald-100/80 hover:to-emerald-50/30'
                                        ),
                                        grn.status === 'in_progress' && (
                                            grn.isExpanded
                                                ? 'bg-teal-100/80 dark:bg-teal-900/40'
                                                : 'bg-gradient-to-r from-teal-50/80 to-white dark:from-teal-950/30 dark:to-gray-900 hover:from-teal-100/80 hover:to-teal-50/30'
                                        ),
                                        grn.status === 'draft' && (
                                            grn.isExpanded
                                                ? 'bg-gray-100/60 dark:bg-gray-800/40'
                                                : 'bg-gradient-to-r from-gray-50/60 to-white dark:from-gray-900/20 dark:to-gray-900 hover:from-gray-100/60 hover:to-gray-50/30'
                                        ),
                                        (grn.status === 'completed' && hasVar) && (
                                            grn.isExpanded
                                                ? 'bg-amber-100/60 dark:bg-amber-900/30'
                                                : 'bg-gradient-to-r from-amber-50/60 to-white dark:from-amber-950/20 dark:to-gray-900 hover:from-amber-100/60 hover:to-amber-50/30'
                                        ),
                                    )}
                                    onClick={() => toggleGRN(grn.id)}
                                >
                                    {/* Left: icon + info */}
                                    <div className="flex items-center gap-3">
                                        <ChevronDown className={cn(
                                            'w-4 h-4 transition-transform duration-200',
                                            grn.status === 'completed' && !hasVar && 'text-emerald-600',
                                            grn.status === 'in_progress' && 'text-teal-600',
                                            grn.status === 'draft' && 'text-gray-400',
                                            grn.status === 'completed' && hasVar && 'text-amber-600',
                                            grn.isExpanded && 'rotate-0', !grn.isExpanded && '-rotate-90',
                                        )} />
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <BookOpen className={cn('w-4 h-4',
                                                    grn.status === 'completed' && !hasVar && 'text-emerald-600',
                                                    grn.status === 'in_progress' && 'text-teal-600',
                                                    grn.status === 'draft' && 'text-gray-400',
                                                    grn.status === 'completed' && hasVar && 'text-amber-600',
                                                )} />
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                    {grn.receipt_number}
                                                </span>
                                                <Badge className={cn('text-xs h-5 px-2 border font-medium gap-1', sd.badgeClass)}>
                                                    <Icon className={cn('w-3 h-3', grn.status === 'in_progress' && 'animate-spin')} />
                                                    {isRTL ? sd.ar : sd.en}
                                                </Badge>
                                                {hasVar && (
                                                    <Badge className="text-xs h-5 px-2 border bg-amber-50 text-amber-700 border-amber-200 gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {grn.variance_pct != null ? `${grn.variance_pct > 0 ? '+' : ''}${grn.variance_pct.toFixed(1)}%` : isRTL ? 'فارق' : 'Var.'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                {grn.warehouse_name && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Warehouse className="w-3 h-3" />
                                                        {grn.warehouse_name}
                                                    </span>
                                                )}
                                                {grn.receipt_date && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(grn.receipt_date), 'yyyy-MM-dd')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: stats */}
                                    <div className="text-end">
                                        <div className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300">
                                            {fmt(grn.total_length_m)} م
                                        </div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                                            <Layers className="w-3 h-3" />
                                            {grn.total_rolls} {isRTL ? 'رولون' : 'roll(s)'}
                                        </div>
                                    </div>
                                </div>

                                {/* ── GRN Content — border-t يفصل عن الرأس ── */}
                                {grn.isExpanded && (
                                    <div className={cn(
                                        'border-t',
                                        grn.status === 'completed' && !hasVar && 'border-emerald-200/60 dark:border-emerald-800/40',
                                        grn.status === 'in_progress' && 'border-teal-200/60 dark:border-teal-800/40',
                                        grn.status === 'draft' && 'border-gray-200/60 dark:border-gray-700/40',
                                        grn.status === 'completed' && hasVar && 'border-amber-200/60 dark:border-amber-800/40',
                                    )}>
                                        {grn.materials.length === 0 ? (
                                            <div className="py-10 text-center text-sm text-gray-400">
                                                {isRTL ? 'لا توجد رولونات مسجلة في هذا الإذن' : 'No rolls recorded for this receipt'}
                                            </div>
                                        ) : (
                                            <div className="p-3 space-y-2 bg-gray-50/40 dark:bg-gray-800/10">
                                                {/* ── Materials — حاوية فرعية لكل مادة ── */}
                                                {grn.materials.map(mat => (
                                                    <div key={mat.key} className="rounded-xl border border-violet-200/80 dark:border-violet-800/60 overflow-hidden shadow-sm">
                                                        {/* Material Header */}
                                                        <div
                                                            className={cn(
                                                                'flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors',
                                                                mat.isExpanded
                                                                    ? 'bg-violet-100/60 dark:bg-violet-900/30'
                                                                    : 'bg-gradient-to-r from-violet-50/60 to-white dark:from-violet-950/20 dark:to-gray-900 hover:from-violet-100/60 hover:to-violet-50/20'
                                                            )}
                                                            onClick={() => toggleMaterial(grn.id, mat.key)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <ChevronDown className={cn('w-3.5 h-3.5 text-violet-600 transition-transform duration-200', !mat.isExpanded && '-rotate-90')} />
                                                                <Package className="w-3.5 h-3.5 text-violet-500" />
                                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                                    {mat.material_name}
                                                                </span>
                                                                {mat.material_code && (
                                                                    <span className="text-xs text-gray-400 font-mono">({mat.material_code})</span>
                                                                )}
                                                                <Badge className="text-xs px-1.5 py-0 bg-violet-100/80 text-violet-700 dark:bg-violet-800/40 dark:text-violet-200 border-violet-200">
                                                                    {mat.roll_count} {isRTL ? (mat.roll_count === 1 ? 'رولون' : 'رولون') : 'roll(s)'}
                                                                </Badge>
                                                            </div>
                                                            <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300">
                                                                {fmt(mat.total_length)} م
                                                            </span>
                                                        </div>

                                                        {/* Material Content */}
                                                        {mat.isExpanded && (
                                                            <div className="border-t border-violet-200/60 dark:border-violet-800/40">
                                                                <div className="p-2 space-y-2 bg-white/60 dark:bg-gray-900/20">
                                                                    {/* ── Colors — حاوية فرعية لكل لون ── */}
                                                                    {mat.colors.map(color => (
                                                                        <div key={color.key} className="rounded-xl border border-sky-200/80 dark:border-sky-800/60 overflow-hidden shadow-sm">
                                                                            {/* Color Header */}
                                                                            <div
                                                                                className={cn(
                                                                                    'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors',
                                                                                    color.isExpanded
                                                                                        ? 'bg-sky-100/60 dark:bg-sky-900/30'
                                                                                        : 'bg-gradient-to-r from-sky-50/60 to-white dark:from-sky-950/20 dark:to-gray-900 hover:from-sky-100/60 hover:to-sky-50/20'
                                                                                )}
                                                                                onClick={() => toggleColor(grn.id, mat.key, color.key)}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <ChevronDown className={cn('w-3.5 h-3.5 text-sky-600 transition-transform duration-200', !color.isExpanded && '-rotate-90')} />
                                                                                    <Tag className="w-3 h-3 text-sky-500" />
                                                                                    <span className="text-sm text-gray-700 dark:text-gray-200">
                                                                                        {color.color_name
                                                                                            ? <span className="font-semibold">{color.color_name}</span>
                                                                                            : <span className="italic text-gray-400">{isRTL ? 'بدون لون' : 'No Color'}</span>
                                                                                        }
                                                                                    </span>
                                                                                    <Badge className="text-xs px-1.5 py-0 bg-sky-100/80 text-sky-700 dark:bg-sky-800/40 dark:text-sky-200 border-sky-200">
                                                                                        {color.rolls.length} {isRTL ? 'رولون' : 'roll(s)'}
                                                                                    </Badge>
                                                                                </div>
                                                                                <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                                                                                    {fmt(color.total_length)} م
                                                                                </span>
                                                                            </div>

                                                                            {/* Rolls Table */}
                                                                            {color.isExpanded && (
                                                                                <div className="border-t border-sky-200/60 dark:border-sky-800/40 bg-white dark:bg-gray-900">
                                                                                    <table className="w-full text-sm">
                                                                                        <thead>
                                                                                            <tr className="bg-gray-50/60 dark:bg-gray-800/30 border-b border-gray-200/60">
                                                                                                <th className={cn('py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide', isRTL ? 'text-right' : 'text-left')}>
                                                                                                    {isRTL ? 'رقم الرولون' : 'Roll #'}
                                                                                                </th>
                                                                                                <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                                                                    {isRTL ? 'الطول (م)' : 'Length (m)'}
                                                                                                </th>
                                                                                                <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                                                                    {isRTL ? 'التكلفة/م' : 'Cost/m'}
                                                                                                </th>
                                                                                                <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                                                                    {isRTL ? 'الحالة' : 'Status'}
                                                                                                </th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                                            {color.rolls.map((roll, idx) => {
                                                                                                const rs = ROLL_STATUS[roll.status] || ROLL_STATUS.available;
                                                                                                return (
                                                                                                    <tr key={roll.id} className={cn('transition-colors', idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/20')}>
                                                                                                        <td className={cn('py-2 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400', isRTL ? 'text-right' : 'text-left')}>
                                                                                                            {roll.roll_number}
                                                                                                        </td>
                                                                                                        <td className="py-2 px-3 text-center font-mono font-semibold text-gray-700">
                                                                                                            {fmt(roll.length)}
                                                                                                        </td>
                                                                                                        <td className="py-2 px-3 text-center font-mono text-gray-500">
                                                                                                            {roll.cost_per_meter > 0 ? fmt(roll.cost_per_meter) : '—'}
                                                                                                        </td>
                                                                                                        <td className="py-2 px-3 text-center">
                                                                                                            <span className="inline-flex items-center gap-1.5">
                                                                                                                <span className={cn('w-2 h-2 rounded-full', rs.dot)} />
                                                                                                                <span className="text-xs text-gray-600 dark:text-gray-400">{isRTL ? rs.ar : roll.status}</span>
                                                                                                            </span>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                );
                                                                                            })}
                                                                                        </tbody>
                                                                                        <tfoot>
                                                                                            <tr className="bg-sky-50/60 dark:bg-sky-900/20 border-t border-sky-200/60">
                                                                                                <td className={cn('py-2 px-4 text-xs font-bold text-sky-700', isRTL ? 'text-right' : 'text-left')}>
                                                                                                    {color.rolls.length} {isRTL ? 'رولون' : 'roll(s)'}
                                                                                                </td>
                                                                                                <td className="py-2 px-3 text-center font-mono font-bold text-teal-700">
                                                                                                    {fmt(color.total_length)} م
                                                                                                </td>
                                                                                                <td colSpan={2} />
                                                                                            </tr>
                                                                                        </tfoot>
                                                                                    </table>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    {/* Material footer */}
                                                                    <div className="flex items-center justify-between pt-2 border-t border-violet-200/60 mt-1 px-1">
                                                                        <span className="text-xs text-violet-700 font-semibold">
                                                                            {mat.roll_count} {isRTL ? 'رولون' : 'roll(s)'}
                                                                            {' • '}
                                                                            {mat.colors.length} {isRTL ? 'لون' : 'color(s)'}
                                                                        </span>
                                                                        <span className="font-mono text-sm font-bold text-teal-700">{fmt(mat.total_length)} م</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* GRN footer summary */}
                                                <div className={cn(
                                                    'flex items-center justify-between px-4 py-2.5 rounded-lg border mt-1',
                                                    grn.status === 'completed' && !hasVar && 'bg-emerald-50/80 border-emerald-200/60 dark:border-emerald-800/40',
                                                    grn.status === 'in_progress' && 'bg-teal-50/80 border-teal-200/60 dark:border-teal-800/40',
                                                    grn.status === 'draft' && 'bg-gray-50/80 border-gray-200/60',
                                                    grn.status === 'completed' && hasVar && 'bg-amber-50/80 border-amber-200/60',
                                                )}>
                                                    <span className="text-xs font-semibold text-gray-600">
                                                        {grn.materials.length} {isRTL ? 'مادة' : 'material(s)'}
                                                        {' • '}
                                                        {grn.total_rolls} {isRTL ? 'رولون' : 'roll(s)'}
                                                    </span>
                                                    <span className="font-mono text-sm font-bold text-teal-700">{fmt(grn.total_length_m)} م</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
