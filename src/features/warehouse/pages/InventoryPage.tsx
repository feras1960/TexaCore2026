/**
 * ════════════════════════════════════════════════════════════════════
 * 📦 InventoryPage V3 — Inline Expandable Inventory Table
 * صفحة المخزون — expand مباشرة تحت الصف (inline accordion)
 *
 * ✅ الأرقام دائماً إنجليزية (en-US)
 * ✅ RTL/LTR عبر dir + logical CSS
 * ✅ كل النصوص بمفاتيح t('key')
 * ✅ RBAC — الأسعار حسب دور المستخدم
 * ✅ فلتر العملة مع تحويل تلقائي
 * ✅ inline expand — التفاصيل تحت الصف مباشرة
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useInventoryPage, InventoryMaterialRow } from '../hooks/useInventoryPage';
import { currencyMetadata } from '@/hooks/useCompanyCurrencies';
import { MaterialInventoryTab } from '@/features/accounting/components/unified/tabs/MaterialInventoryTab';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Package, RefreshCw, Download, ShoppingCart, Check,
    ChevronDown, Warehouse, Layers, Ruler, Eye, EyeOff,
    AlertTriangle, Boxes, DollarSign, ShieldAlert, Filter, X,
    Search, MapPin, Building2, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Always English numerals ──────────────────────────────
const FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const FMT2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const FMT0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n: number) => FMT.format(n);
const fmt2 = (n: number) => FMT2.format(n);
const fmt0 = (n: number) => FMT0.format(n);

// ─── RBAC ────────────────────────────────────────────────
type UserRole = 'admin' | 'manager' | 'accountant' | 'sales' | 'warehouse' | 'viewer';
function resolveRole(metadata: any): UserRole {
    const role = (metadata?.role || metadata?.user_role || '').toLowerCase();
    if (role.includes('admin') || role.includes('super')) return 'admin';
    if (role.includes('manager') || role.includes('مدير')) return 'manager';
    if (role.includes('account')) return 'accountant';
    if (role.includes('sales') || role.includes('مبيع')) return 'sales';
    if (role.includes('warehouse') || role.includes('مخزن')) return 'warehouse';
    return 'manager';
}

// ─── Summary Card ─────────────────────────────────────────
function SummaryCard({ label, value, sub, icon, color }: {
    label: string; value: string; sub?: string;
    icon: React.ReactNode;
    color: 'indigo' | 'green' | 'blue' | 'amber' | 'purple';
}) {
    const styles = {
        indigo: { wrap: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200/60 dark:border-indigo-800/40', icon: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' },
        green: { wrap: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/60 dark:border-emerald-800/40', icon: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/40' },
        blue: { wrap: 'from-blue-500/10 to-blue-600/5 border-blue-200/60 dark:border-blue-800/40', icon: 'text-blue-500 bg-blue-50 dark:bg-blue-900/40' },
        amber: { wrap: 'from-amber-500/10 to-amber-600/5 border-amber-200/60 dark:border-amber-800/40', icon: 'text-amber-500 bg-amber-50 dark:bg-amber-900/40' },
        purple: { wrap: 'from-purple-500/10 to-purple-600/5 border-purple-200/60 dark:border-purple-800/40', icon: 'text-purple-500 bg-purple-50 dark:bg-purple-900/40' },
    };
    const s = styles[color];
    return (
        <div className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-br px-5 py-4 shadow-sm transition-shadow hover:shadow-md', s.wrap)}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{label}</p>
                    <p className="text-2xl font-bold font-mono mt-1.5 text-gray-900 dark:text-white" dir="ltr">{value}</p>
                    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0', s.icon)}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

// ─── Stock Status Badge ───────────────────────────────────
function StockBadge({ meters, minStock, t }: {
    meters: number; minStock: number; t: (k: string) => string;
}) {
    if (meters <= 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {t('inventory.outOfStock')}
        </span>
    );
    if (minStock > 0 && meters <= minStock) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t('inventory.lowStock')}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('inventory.inStock')}
        </span>
    );
}

// ─── Color Dots ───────────────────────────────────────────
function ColorDots({ colorIds, colors, max = 4 }: {
    colorIds: string[];
    colors: { id: string; hex_code: string; name_ar: string; name_en: string }[];
    max?: number;
}) {
    const resolved = colorIds.slice(0, max).map(id => colors.find(c => c.id === id)).filter(Boolean);
    const extra = colorIds.length - max;
    if (resolved.length === 0) return <span className="text-gray-300 text-xs">—</span>;
    return (
        <div className="flex items-center gap-0.5 flex-wrap">
            {resolved.map((c, i) => (
                <div
                    key={i}
                    className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                    style={{ backgroundColor: c!.hex_code || '#ccc' }}
                    title={c!.name_ar}
                />
            ))}
            {extra > 0 && <span className="text-[10px] text-gray-400 font-mono ms-0.5" dir="ltr">+{extra}</span>}
        </div>
    );
}

// ─── Filter Select ─────────────────────────────────────────
function FilterSelect({ label, value, onChange, options, compact = false }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    compact?: boolean;
}) {
    // In compact mode: no text label above, narrower trigger, tooltip on hover
    return compact ? (
        <div className="flex flex-col gap-0.5 flex-shrink-0" title={label}>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-7 text-[11px] min-w-[100px] max-w-[140px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 gap-1 px-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider me-1 flex-shrink-0">{label}</span>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    ) : (
        <div className="flex flex-col gap-1 min-w-[130px]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">{label}</span>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
export default function InventoryPage() {
    const { t, language, direction } = useLanguage();
    const { user } = useAuth();
    const { actions: cartActions } = useCart();
    const isRTL = direction === 'rtl';

    const role = resolveRole(user?.user_metadata);
    const canSeeCost = ['admin', 'manager', 'accountant'].includes(role);
    const canSeePrices = ['admin', 'manager', 'accountant'].includes(role);
    const canSeeValue = ['admin', 'manager', 'accountant'].includes(role);
    const canAddToCart = ['admin', 'manager', 'sales'].includes(role);

    const {
        materials, allMaterials, filterOptions, filters, setFilters,
        summary, loading, error, refetch, hasActiveFilters, resetFilters,
        activeCurrency, convertPrice, baseCurrency,
    } = useInventoryPage();

    // ─── Inline Expanded Row ───────────────────────────────
    // Only ONE material open at a time (better UX for inline)
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const expandedRef = useRef<HTMLTableRowElement | null>(null);

    const toggleExpand = useCallback((id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
    }, []);

    // Scroll to expanded panel when it opens
    const handleExpandedRef = useCallback((el: HTMLTableRowElement | null) => {
        if (el) {
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 150);
        }
    }, []);

    // ─── Roll Sheet ────────────────────────────────────────────
    const [rollSheetOpen, setRollSheetOpen] = useState<boolean>(false);
    const [rollSheetData, setRollSheetData] = useState<any>(null);
    const [rollSheetLoading, setRollSheetLoading] = useState(false);

    const openRollSheet = useCallback(async (roll: { id: string; roll_number: string }) => {
        setRollSheetLoading(true);
        try {
            const { data: fullRoll, error } = await supabase
                .from('fabric_rolls')
                .select(`
                    *,
                    warehouse:warehouses!left(id, name_ar, name_en, code),
                    color:fabric_colors!left(id, name_ar, name_en, hex_code),
                    bin_location:bin_locations!left(id, code, name_ar)
                `)
                .eq('id', roll.id)
                .single();
            if (error || !fullRoll) {
                toast.error(isRTL ? 'فشل جلب بيانات الرولون' : 'Failed to load roll data');
                return;
            }
            setRollSheetData({
                ...fullRoll,
                warehouse_name_ar: fullRoll.warehouse?.name_ar,
                warehouse_name_en: fullRoll.warehouse?.name_en,
                bin_location_code: fullRoll.bin_location?.code,
            });
            setRollSheetOpen(true);
        } finally {
            setRollSheetLoading(false);
        }
    }, [isRTL]);

    // ─── Currency options ──────────────────────────────────
    const currencyOptions = useMemo(() =>
        filterOptions.currencies.map(c => ({
            value: c.code,
            label: isRTL
                ? `${currencyMetadata[c.code]?.symbol || ''} ${currencyMetadata[c.code]?.nameAr || c.code} (${c.code})`
                : `${currencyMetadata[c.code]?.symbol || ''} ${currencyMetadata[c.code]?.name || c.code} (${c.code})`,
        }))
        , [filterOptions.currencies, isRTL]);

    // Footer text
    const footerText = useMemo(() => {
        const visible = materials.length;
        const total = allMaterials.filter(m => m.total_rolls > 0).length;
        return `${t('inventory.showing')} ${fmt0(visible)} ${t('inventory.of')} ${fmt0(total)} ${t('warehouse.tabs.materials')}`;
    }, [materials.length, allMaterials, t]);

    // ─── Render ─────────────────────────────────────────────
    return (
        <>
            <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500" dir={direction}>

                {/* ═══ Header ═══ */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo flex items-center gap-2">
                            <Package className="w-6 h-6 text-indigo-500" />
                            {t('inventory.management')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {t('inventory.managementDesc')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={filters.showEmpty ? 'default' : 'outline'}
                            size="sm"
                            className={cn('h-9 gap-1.5', filters.showEmpty && 'bg-indigo-600 hover:bg-indigo-700 text-white')}
                            onClick={() => setFilters(p => ({ ...p, showEmpty: !p.showEmpty }))}
                        >
                            {filters.showEmpty
                                ? <><Eye className="w-4 h-4" /><span className="hidden md:inline">{t('inventory.hideEmpty')}</span></>
                                : <><EyeOff className="w-4 h-4" /><span className="hidden md:inline">{t('inventory.showEmpty')}</span></>
                            }
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refetch} disabled={loading}>
                            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                            <span className="hidden md:inline">{t('common.refresh')}</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5">
                            <Download className="w-4 h-4" />
                            <span className="hidden md:inline">{t('common.export')}</span>
                        </Button>
                    </div>
                </div>

                {/* ═══ RBAC notice ═══ */}
                {!canSeePrices && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        {t('inventory.priceRestricted')}
                    </div>
                )}

                {/* ═══ Summary Cards ═══ */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-shrink-0">
                    <SummaryCard label={t('warehouse.tabs.materials')} value={fmt0(summary.totalMaterials)} sub={t('inventory.types')} icon={<Package className="w-5 h-5" />} color="indigo" />
                    <SummaryCard label={t('inventory.totalRolls')} value={fmt0(summary.totalRolls)} icon={<Boxes className="w-5 h-5" />} color="purple" />
                    <SummaryCard label={t('inventory.availableMeters')} value={fmt(summary.availableMeters)} sub={t('inventory.meterUnit')} icon={<Ruler className="w-5 h-5" />} color="green" />
                    <SummaryCard label={t('inventory.totalStock')} value={fmt(summary.totalMeters)} sub={t('inventory.meterUnit')} icon={<Layers className="w-5 h-5" />} color="blue" />
                    {canSeeValue
                        ? <SummaryCard label={`${t('inventory.stockValue')} (${activeCurrency})`} value={fmt0(convertPrice(summary.totalValue, 'UAH'))} icon={<DollarSign className="w-5 h-5" />} color="amber" />
                        : <SummaryCard label={t('inventory.warehouses')} value={fmt0(filterOptions.warehouses.length)} icon={<Warehouse className="w-5 h-5" />} color="amber" />
                    }
                </div>

                {/* ═══ Error ═══ */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</span>
                        <Button variant="ghost" size="sm" onClick={refetch} className="text-red-600"><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                )}

                {/* ═══ Table Panel ═══ */}
                <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

                    {/* ── Toolbar ── */}
                    <div className="flex items-end gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex-wrap">

                        {/* Search — grows to fill remaining space */}
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-xs">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                                {isRTL ? 'بحث' : 'Search'}
                            </span>
                            <div className="relative">
                                <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRTL ? 'right-3' : 'left-3')} />
                                <Input
                                    value={filters.search}
                                    onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                                    placeholder={t('inventory.searchPlaceholder')}
                                    className={cn('h-8 text-sm', isRTL ? 'pr-9' : 'pl-9')}
                                />
                            </div>
                        </div>

                        {/* Warehouse */}
                        <FilterSelect
                            label={isRTL ? 'المستودع' : 'Warehouse'}
                            value={filters.warehouseId}
                            onChange={v => setFilters(p => ({ ...p, warehouseId: v }))}
                            options={[
                                { value: 'all', label: isRTL ? 'كل المستودعات' : 'All Warehouses' },
                                ...filterOptions.warehouses.map(w => ({
                                    value: w.id,
                                    label: isRTL ? w.name_ar : (w.name_en || w.name_ar),
                                })),
                            ]}
                        />

                        {/* Season */}
                        <FilterSelect
                            label={isRTL ? 'الموسم' : 'Season'}
                            value={filters.season || 'all'}
                            onChange={v => setFilters(p => ({ ...p, season: v === 'all' ? '' : v }))}
                            options={[
                                { value: 'all', label: isRTL ? 'كل المواسم' : 'All Seasons' },
                                { value: 'winter', label: isRTL ? '❄️ شتوي' : '❄️ Winter' },
                                { value: 'spring', label: isRTL ? '🌸 ربيعي' : '🌸 Spring' },
                                { value: 'summer', label: isRTL ? '☀️ صيفي' : '☀️ Summer' },
                                { value: 'autumn', label: isRTL ? '🍂 خريفي' : '🍂 Autumn' },
                            ]}
                        />

                        {/* Currency */}
                        {currencyOptions.length >= 1 && (
                            <FilterSelect
                                label={isRTL ? 'العملة' : 'Currency'}
                                value={filters.currencyCode || activeCurrency}
                                onChange={v => setFilters(p => ({ ...p, currencyCode: v }))}
                                options={currencyOptions}
                            />
                        )}

                        {/* Status */}
                        <FilterSelect
                            label={isRTL ? 'الحالة' : 'Status'}
                            value={filters.status}
                            onChange={v => setFilters(p => ({ ...p, status: v as any }))}
                            options={[
                                { value: 'all', label: isRTL ? 'الكل' : 'All' },
                                { value: 'in_stock', label: isRTL ? '🟢 متوفر' : '🟢 In Stock' },
                                { value: 'low_stock', label: isRTL ? '🟡 مخزون منخفض' : '🟡 Low Stock' },
                                { value: 'out_of_stock', label: isRTL ? '🔴 نفذ' : '🔴 Out of Stock' },
                            ]}
                        />

                        {/* Clear + Count */}
                        <div className="flex items-end gap-2 flex-shrink-0">
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={resetFilters}>
                                    <X className="w-3.5 h-3.5" />
                                    {isRTL ? 'مسح الكل' : 'Clear'}
                                </Button>
                            )}
                            <div className="text-xs text-gray-400 pb-1 font-mono" dir="ltr">
                                {fmt0(materials.length)}/{fmt0(allMaterials.filter(m => m.total_rolls > 0).length)}
                            </div>
                        </div>
                    </div>

                    {/* ── Table ── */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            // Skeleton
                            <div className="p-4 space-y-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : materials.length === 0 ? (
                            // Empty
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Package className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" />
                                <p className="text-sm">{t('inventory.noInventory')}</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                                        {/* # */}
                                        <th className="w-8 px-3 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">#</th>
                                        {/* Chevron */}
                                        <th className="w-8 px-2 py-3" />
                                        {/* Material */}
                                        <th className={cn('px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide', isRTL ? 'text-right' : 'text-left')}>
                                            {t('inventory.material')}
                                        </th>
                                        {/* Colors */}
                                        <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-center w-24">
                                            {t('inventory.colors')}
                                        </th>
                                        {/* Rolls */}
                                        <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-center w-20">
                                            {t('inventory.rolls')}
                                        </th>
                                        {/* Available */}
                                        <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-32">
                                            {t('inventory.availableMeters')}
                                        </th>
                                        {/* Status */}
                                        <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide w-24">
                                            {t('common.status._')}
                                        </th>
                                        {/* Cost — conditionally */}
                                        {canSeeCost && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-32">
                                                {t('inventory.costPerMeter')} ({activeCurrency})
                                            </th>
                                        )}
                                        {/* Sell price */}
                                        {canSeePrices && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-32">
                                                {t('inventory.sellPrice')} ({activeCurrency})
                                            </th>
                                        )}
                                        {/* Total value */}
                                        {canSeeValue && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-36">
                                                {t('inventory.totalValue')} ({activeCurrency})
                                            </th>
                                        )}
                                        {/* Container */}
                                        <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide w-28">
                                            {t('inventory.container')}
                                        </th>
                                        {/* Cart */}
                                        {canAddToCart && <th className="w-10 px-2 py-3" />}
                                    </tr>
                                </thead>


                                <tbody>
                                    {materials.map((mat, idx) => {
                                        const isOpen = expandedId === mat.material_id;
                                        const isLowStock = mat.min_stock > 0 && mat.available_meters <= mat.min_stock;
                                        const isOutOfStock = mat.available_meters <= 0;
                                        const inCart = cartActions.isInCart(mat.material_id);

                                        return (
                                            <React.Fragment key={mat.material_id}>
                                                {/* ── Material Row ── */}
                                                <tr
                                                    className={cn(
                                                        'border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                                                        'hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10',
                                                        isOpen && 'bg-indigo-50/60 dark:bg-indigo-900/20',
                                                        // Accent left border
                                                        'border-s-2',
                                                        isOutOfStock ? 'border-s-gray-200 dark:border-s-gray-700'
                                                            : isLowStock ? 'border-s-amber-400'
                                                                : 'border-s-emerald-400'
                                                    )}
                                                    onClick={() => toggleExpand(mat.material_id)}
                                                >
                                                    {/* # */}
                                                    <td className="px-3 py-3 text-center text-xs text-gray-400 font-mono" dir="ltr">
                                                        {fmt0(idx + 1)}
                                                    </td>
                                                    {/* Chevron */}
                                                    <td className="px-2 py-3 text-center">
                                                        <motion.div
                                                            animate={{ rotate: isOpen ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="flex justify-center"
                                                        >
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        </motion.div>
                                                    </td>
                                                    {/* Material name */}
                                                    <td className="px-3 py-3">
                                                        <div>
                                                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">
                                                                {isRTL ? mat.material_name_ar : (mat.material_name_en || mat.material_name_ar)}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 mt-0.5" dir="ltr">
                                                                {mat.material_code || '—'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    {/* Colors */}
                                                    <td className="px-3 py-3 text-center">
                                                        <ColorDots colorIds={mat.color_ids} colors={filterOptions.colors as any} />
                                                    </td>
                                                    {/* Rolls + WH count */}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={cn('text-sm font-bold font-mono', mat.total_rolls > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300')} dir="ltr">
                                                            {fmt0(mat.total_rolls)}
                                                        </span>
                                                        {mat.warehouse_count > 0 && (
                                                            <p className="text-[10px] text-gray-400 mt-0.5" dir="ltr">
                                                                {fmt0(mat.warehouse_count)} {t('inventory.warehouseCount')}
                                                            </p>
                                                        )}
                                                    </td>
                                                    {/* Available meters */}
                                                    <td className="px-3 py-3 text-end">
                                                        <span className={cn('text-sm font-bold font-mono', mat.available_meters > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300')} dir="ltr">
                                                            {fmt(mat.available_meters)} {t('inventory.meterUnit')}
                                                        </span>
                                                        {mat.reserved_meters > 0 && (
                                                            <p className="text-[10px] text-amber-500 mt-0.5" dir="ltr">
                                                                {fmt(mat.reserved_meters)} {t('inventory.reserved')}
                                                            </p>
                                                        )}
                                                    </td>
                                                    {/* Status */}
                                                    <td className="px-3 py-3">
                                                        <StockBadge meters={mat.available_meters} minStock={mat.min_stock} t={t} />
                                                    </td>
                                                    {/* Cost */}
                                                    {canSeeCost && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.avg_cost_per_meter > 0 ? (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    {/* Primary: selected currency */}
                                                                    <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-200 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(mat.avg_cost_per_meter, 'UAH'))}
                                                                        <span className="text-[9px] font-normal text-gray-400 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {/* Secondary: base currency (if different) */}
                                                                    {activeCurrency !== (baseCurrency || 'UAH') && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.avg_cost_per_meter)}
                                                                            <span className="text-[9px] ms-0.5">{baseCurrency || 'UAH'}</span>
                                                                        </span>
                                                                    )}
                                                                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{t('inventory.avgCost')}</p>
                                                                </div>
                                                            ) : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Sell price */}
                                                    {canSeePrices && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.selling_price > 0 ? (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    {/* Primary: selected currency */}
                                                                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(mat.selling_price, 'UAH'))}
                                                                        <span className="text-[9px] font-normal text-blue-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {/* Secondary: base currency (if different) */}
                                                                    {activeCurrency !== (baseCurrency || 'UAH') && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.selling_price)}
                                                                            <span className="text-[9px] ms-0.5">{baseCurrency || 'UAH'}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Total value */}
                                                    {canSeeValue && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.total_stock_value > 0 ? (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400 leading-tight" dir="ltr">
                                                                        {fmt0(convertPrice(mat.total_stock_value, 'UAH'))}
                                                                        <span className="text-[9px] font-normal text-purple-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== (baseCurrency || 'UAH') && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt0(mat.total_stock_value)}
                                                                            <span className="text-[9px] ms-0.5">{baseCurrency || 'UAH'}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Container */}
                                                    <td className="px-3 py-3">
                                                        {mat.last_container_number ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" dir="ltr">
                                                                {mat.last_container_number}
                                                            </span>
                                                        ) : <span className="text-gray-300 text-sm">—</span>}
                                                    </td>
                                                    {/* Cart */}
                                                    {canAddToCart && (
                                                        <td className="px-2 py-3 text-center">
                                                            {mat.total_rolls > 0 && (
                                                                <button
                                                                    className={cn(
                                                                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all border mx-auto',
                                                                        inCart
                                                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                                            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                                    )}
                                                                    onClick={e => { e.stopPropagation(); if (inCart) cartActions.openDrawer(); }}
                                                                    title={inCart ? t('inventory.inCart') : t('inventory.addToCart')}
                                                                >
                                                                    {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>

                                                {/* ══ INLINE EXPAND ROW — directly below the material row ══ */}
                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <tr
                                                            ref={handleExpandedRef}
                                                            key={`expand-${mat.material_id}`}
                                                        >
                                                            {/* Span ALL columns */}
                                                            <td
                                                                colSpan={
                                                                    6 + // base cols
                                                                    (canSeeCost ? 1 : 0) +
                                                                    (canSeePrices ? 1 : 0) +
                                                                    (canSeeValue ? 1 : 0) +
                                                                    1 + // container
                                                                    (canAddToCart ? 1 : 0)
                                                                }
                                                                className="p-0"
                                                            >
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                    style={{ overflow: 'hidden' }}
                                                                >
                                                                    {/* MaterialInventoryTab — warehouse + rolls details */}
                                                                    <div className="bg-white dark:bg-gray-900 max-h-[520px] overflow-y-auto border-t border-indigo-200/60 dark:border-indigo-800/40">
                                                                        <MaterialInventoryTab
                                                                            data={{
                                                                                id: mat.material_id,
                                                                                name_ar: mat.material_name_ar,
                                                                                name_en: mat.material_name_en,
                                                                                code: mat.material_code,
                                                                                unit: mat.material_unit,
                                                                                price: mat.selling_price,
                                                                                currency: activeCurrency,
                                                                                min_stock: mat.min_stock,
                                                                            }}
                                                                            onClose={() => setExpandedId(null)}
                                                                            onOpenRoll={openRollSheet}
                                                                        />
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 text-xs text-gray-400">
                        <span dir="ltr">{footerText}</span>
                        {canSeeValue && (
                            <div className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{t('inventory.stockValueLabel')}</span>
                                <span className="font-mono" dir="ltr">{fmt0(convertPrice(summary.totalValue, 'UAH'))} {activeCurrency}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* ═══ Roll Detail Sheet ═══ */}
            {rollSheetData && (
                <UnifiedAccountingSheet
                    isOpen={rollSheetOpen}
                    onClose={() => {
                        setRollSheetOpen(false);
                        setRollSheetData(null);
                    }}
                    docType="roll"
                    data={rollSheetData}
                    mode="view"
                />
            )}
        </>
    );
}
