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

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useInventoryPage, InventoryMaterialRow } from '../hooks/useInventoryPage';
import { currencyMetadata } from '@/hooks/useCompanyCurrencies';
import { WarehouseStockSection, WarehouseStockRow } from '../components/WarehouseStockSection';
import { warehouseService } from '@/services/warehouseService';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Package, RefreshCw, Download, ShoppingCart, Check,
    ChevronDown, Warehouse, Layers, Ruler, Eye, EyeOff,
    AlertTriangle, Boxes, DollarSign, ShieldAlert, Filter, X,
    Search, MapPin, Building2, TrendingUp, ArrowLeftRight,
    Columns3, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getMaterialName } from '@/lib/utils/getLocalizedName';
import { getLocalizedLabel } from '@/lib/utils/getLocalizedUnit';

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
function StockBadge({ meters, currentStock, minStock, t }: {
    meters: number; currentStock?: number; minStock: number; t: (k: string) => string;
}) {
    // Use current_stock (total including loose) for status determination
    const effectiveStock = currentStock ?? meters;
    if (effectiveStock <= 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {t('inventory.outOfStock')}
        </span>
    );
    if (minStock > 0 && effectiveStock <= minStock) return (
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
    const { user, companyId } = useAuth();
    const { actions: cartActions } = useCart();
    const isRTL = direction === 'rtl';

    const role = resolveRole(user?.user_metadata);
    const canSeeCost = ['admin', 'manager', 'accountant'].includes(role);
    const canSeePrices = ['admin', 'manager', 'accountant'].includes(role);
    const canSeeValue = ['admin', 'manager', 'accountant'].includes(role);
    const canAddToCart = ['admin', 'manager', 'sales'].includes(role);

    // ─── Column Visibility (persisted) ─────────────────────
    type ColKey = 'colors' | 'rolls' | 'available' | 'status' | 'cost' | 'sellPrice' | 'wholesalePrice' | 'halfWholesalePrice' | 'specialPrice' | 'costPrice' | 'totalValue' | 'container';
    const DEFAULT_VISIBLE: Record<ColKey, boolean> = {
        colors: true,
        rolls: true,
        available: true,
        status: true,
        cost: true,
        sellPrice: true,
        wholesalePrice: false,
        halfWholesalePrice: false,
        specialPrice: false,
        costPrice: false,
        totalValue: true,
        container: true,
    };
    const [columnVisibility, setColumnVisibility] = useState<Record<ColKey, boolean>>(() => {
        try {
            const saved = localStorage.getItem('inventory_columns');
            if (saved) return { ...DEFAULT_VISIBLE, ...JSON.parse(saved) };
        } catch {}
        return DEFAULT_VISIBLE;
    });
    const toggleColumn = useCallback((key: ColKey) => {
        setColumnVisibility(prev => {
            const next = { ...prev, [key]: !prev[key] };
            try { localStorage.setItem('inventory_columns', JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);
    const col = columnVisibility; // shorthand

    // Column definitions for the toggle menu
    const COLUMN_DEFS: { key: ColKey; labelKey: string; priceOnly?: boolean }[] = [
        { key: 'colors', labelKey: 'col_colors' },
        { key: 'rolls', labelKey: 'col_rolls' },
        { key: 'available', labelKey: 'col_available' },
        { key: 'status', labelKey: 'col_status' },
        { key: 'cost', labelKey: 'col_cost', priceOnly: true },
        { key: 'sellPrice', labelKey: 'col_sell', priceOnly: true },
        { key: 'wholesalePrice', labelKey: 'col_wholesale', priceOnly: true },
        { key: 'halfWholesalePrice', labelKey: 'col_half_w', priceOnly: true },
        { key: 'specialPrice', labelKey: 'col_special', priceOnly: true },
        { key: 'costPrice', labelKey: 'col_cost_price', priceOnly: true },
        { key: 'totalValue', labelKey: 'col_total_val', priceOnly: true },
        { key: 'container', labelKey: 'col_container' },
    ];

    // ─── Sorting State ─────────────────────────────────
    type SortKey = 'name' | 'rolls' | 'available' | 'cost' | 'sellPrice' | 'wholesalePrice' | 'halfWholesalePrice' | 'specialPrice' | 'costPrice' | 'totalValue' | 'container';
    type SortDir = 'asc' | 'desc' | null;
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const handleSort = useCallback((key: SortKey) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
            else setSortDir('asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }, [sortKey, sortDir]);

    const {
        materials: rawMaterials, allMaterials, allRolls, filterOptions, filters, setFilters,
        summary, loading, error, refetch, hasActiveFilters, resetFilters,
        activeCurrency, convertPrice, baseCurrency,
    } = useInventoryPage();

    // ─── Sorted materials ───────────────────────────────
    const materials = useMemo(() => {
        if (!sortKey || !sortDir) return rawMaterials;
        const sorted = [...rawMaterials];
        const getValue = (m: InventoryMaterialRow): number | string => {
            switch (sortKey) {
                case 'name': return getMaterialName(m, language);
                case 'rolls': return m.total_rolls;
                case 'available': return Math.max(m.current_stock, m.total_meters);
                case 'cost': return m.avg_cost_per_meter > 0 ? m.avg_cost_per_meter : m.purchase_price;
                case 'sellPrice': return m.selling_price;
                case 'wholesalePrice': return m.wholesale_price;
                case 'halfWholesalePrice': return m.half_wholesale_price;
                case 'specialPrice': return m.special_price;
                case 'costPrice': return m.cost_price;
                case 'totalValue': return m.total_stock_value;
                case 'container': return m.last_container_number || '';
                default: return 0;
            }
        };
        sorted.sort((a, b) => {
            const va = getValue(a), vb = getValue(b);
            const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [rawMaterials, sortKey, sortDir, language]);

    // ─── Totals for visible materials ─────────────────────
    const totals = useMemo(() => ({
        rolls: materials.reduce((s, m) => s + m.total_rolls, 0),
        meters: materials.reduce((s, m) => s + m.total_meters, 0),
        available: materials.reduce((s, m) => s + Math.max(m.current_stock, m.total_meters), 0),
        looseStock: materials.reduce((s, m) => s + m.loose_stock, 0),
        totalValue: materials.reduce((s, m) => s + m.total_stock_value, 0),
    }), [materials]);

    // ─── Inline Expanded Row ───────────────────────────────
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const expandedRef = useRef<HTMLTableRowElement | null>(null);

    // ─── Warehouse + Roll Cache (persists across open/close) ───
    const [whCache, setWhCache] = useState<Record<string, WarehouseStockRow[]>>({});
    const [whLoading, setWhLoading] = useState<Set<string>>(new Set());
    const [rollCache, setRollCache] = useState<Record<string, any[]>>({});
    const [rollLoading, setRollLoading] = useState<Set<string>>(new Set());
    const [expandedWhId, setExpandedWhId] = useState<string | null>(null);

    // ⚡ Invalidate caches when underlying data changes (prevents stale empty cache)
    const allRollsCountRef = useRef(allRolls.length);
    const materialsCountRef = useRef(materials.length);
    useEffect(() => {
        const rollsChanged = allRolls.length !== allRollsCountRef.current;
        const matsChanged = materials.length !== materialsCountRef.current;
        if (rollsChanged || matsChanged) {
            allRollsCountRef.current = allRolls.length;
            materialsCountRef.current = materials.length;
            setWhCache({});
            setRollCache({});
        }
    }, [allRolls.length, materials.length]);

    // ⚡ Compute warehouse stock from cached allRolls + inventory_stock for loose items
    const fetchWarehouseData = useCallback(async (materialId: string, matOrForce?: InventoryMaterialRow | true) => {
        const isForce = matOrForce === true;
        if (!isForce && whCache[materialId]) return;
        if (!companyId) return;

        const mat = isForce ? materials.find(m => m.material_id === materialId) : (matOrForce as InventoryMaterialRow | undefined);
        const looseStock = mat?.loose_stock || 0;

        // Aggregate from cached rolls (already loaded by DataEngine)
        const materialRolls = allRolls.filter((r: any) => r.material_id === materialId);

        const whMap = new Map<string, WarehouseStockRow>();
        for (const roll of materialRolls) {
            const whId = roll.warehouse_id;
            if (!whId) continue;
            const existing = whMap.get(whId);
            const len = Number(roll.current_length) || 0;
            const avail = Math.max(0, len - (Number(roll.reserved_length) || 0));
            const reserved = Number(roll.reserved_length) || 0;
            const whInfo = roll.warehouses || {};
            
            if (existing) {
                existing.roll_count += 1;
                existing.total_length += len;
                existing.available_length += avail;
                existing.reserved_length += reserved;
            } else {
                whMap.set(whId, {
                    warehouse_id: whId,
                    warehouse_code: whInfo.code || '',
                    warehouse_name_ar: whInfo.name_ar || '',
                    warehouse_name_en: whInfo.name_en || '',
                    roll_count: 1,
                    total_length: len,
                    available_length: avail,
                    reserved_length: reserved,
                    loose_stock: 0,
                    last_updated: null,
                });
            }
        }

        let rows = Array.from(whMap.values());

        // ═══ Handle loose stock: query inventory_stock for per-warehouse distribution ═══
        if (looseStock > 0 || (rows.length === 0 && (mat?.current_stock || 0) > 0)) {
            try {
                const { data: stockRows } = await supabase
                    .from('inventory_stock')
                    .select('warehouse_id, quantity_on_hand, warehouse:warehouses(id, code, name_ar, name_en)')
                    .eq('material_id', materialId)
                    .eq('company_id', companyId);

                if (stockRows && stockRows.length > 0) {
                    for (const sr of stockRows) {
                        const whId = sr.warehouse_id;
                        const qty = Number(sr.quantity_on_hand) || 0;
                        if (qty <= 0) continue;
                        const whInfo: any = sr.warehouse || {};
                        const existing = whMap.get(whId);
                        const rollQtyInThisWh = existing?.total_length || 0;
                        // Loose = inventory_stock qty minus roll qty already tracked
                        const looseForWh = Math.max(0, qty - rollQtyInThisWh);

                        if (existing) {
                            existing.loose_stock = looseForWh;
                        } else if (looseForWh > 0) {
                            whMap.set(whId, {
                                warehouse_id: whId,
                                warehouse_code: whInfo.code || '',
                                warehouse_name_ar: whInfo.name_ar || '',
                                warehouse_name_en: whInfo.name_en || '',
                                roll_count: 0,
                                total_length: 0,
                                available_length: 0,
                                reserved_length: 0,
                                loose_stock: looseForWh,
                                last_updated: null,
                            });
                        }
                    }
                    rows = Array.from(whMap.values());
                }
            } catch (err) {
                console.warn('[fetchWarehouseData] inventory_stock query failed:', err);
            }

            // Fallback: if still no rows and we have loose stock
            if (rows.length === 0 && looseStock > 0) {
                const firstWh = filterOptions.warehouses[0];
                if (firstWh) {
                    rows = [{
                        warehouse_id: firstWh.id,
                        warehouse_code: '',
                        warehouse_name_ar: firstWh.name_ar || '',
                        warehouse_name_en: firstWh.name_en || '',
                        roll_count: 0, total_length: 0, available_length: 0, reserved_length: 0,
                        loose_stock: looseStock, last_updated: null,
                    }];
                } else {
                    return; // Warehouses not loaded yet
                }
            }
        }

        // Don't cache empty result when material has stock
        if (rows.length === 0 && mat && (mat.current_stock || 0) > 0) return;

        setWhCache(p => ({ ...p, [materialId]: rows }));
    }, [whCache, companyId, materials, allRolls, filterOptions.warehouses]);

    // Toggle material expand
    const toggleExpand = useCallback((id: string, mat: InventoryMaterialRow) => {
        setExpandedId(prev => prev === id ? null : id);
        // Fetch warehouse data OUTSIDE of setState (avoid side-effects in updater)
        if (expandedId !== id) {
            fetchWarehouseData(id, mat);
        }
    }, [expandedId, fetchWarehouseData]);

    // ⚡ Auto-refetch expanded material when cache is invalidated
    useEffect(() => {
        if (expandedId && !whCache[expandedId] && materials.length > 0 && filterOptions.warehouses.length > 0) {
            fetchWarehouseData(expandedId, true);
        }
    }, [expandedId, whCache, materials, filterOptions.warehouses]); // eslint-disable-line

    const fetchRollData = useCallback((materialId: string, warehouseId: string, force?: boolean) => {
        const whKey = `${materialId}::${warehouseId}`;
        if (!force && rollCache[whKey]) return;

        const rolls = allRolls
            .filter((r: any) => r.material_id === materialId && r.warehouse_id === warehouseId)
            .map((r: any) => ({
                id: r.id,
                roll_number: r.roll_number || '',
                material_id: r.material_id,
                warehouse_id: r.warehouse_id,
                current_length: Number(r.current_length) || 0,
                reserved_length: Number(r.reserved_length) || 0,
                cost_per_meter: Number(r.cost_per_meter) || 0,
                status: r.status || 'available',
                color_id: r.color_id || null,
            }));

        setRollCache(p => ({ ...p, [whKey]: rolls }));
    }, [rollCache, allRolls]);

    // Toggle warehouse rolls
    const toggleWarehouseRolls = useCallback(async (materialId: string, warehouseId: string) => {
        const whKey = `${materialId}::${warehouseId}`;
        if (expandedWhId === whKey) { setExpandedWhId(null); return; }
        setExpandedWhId(whKey);
        fetchRollData(materialId, warehouseId);
    }, [expandedWhId, fetchRollData]);

    // Refs for real-time handler (avoid stale closures)
    const expandedIdRef = useRef(expandedId);
    const expandedWhIdRef = useRef(expandedWhId);
    useEffect(() => { expandedIdRef.current = expandedId; }, [expandedId]);
    useEffect(() => { expandedWhIdRef.current = expandedWhId; }, [expandedWhId]);

    // ─── Supabase Real-time — invalidate + auto-refetch ───
    useEffect(() => {
        if (!companyId) return;

        // Debounce refetch to prevent 150+ parallel calls during bulk import
        let refetchTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedRefetch = () => {
            if (refetchTimer) clearTimeout(refetchTimer);
            refetchTimer = setTimeout(() => {
                refetch();
                refetchTimer = null;
            }, 1000); // Wait 1s of inactivity before refreshing
        };

        const channel = supabase
            .channel('inventory-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'fabric_rolls',
                filter: `company_id=eq.${companyId}`,
            }, (payload: any) => {
                const materialId = payload.new?.material_id || payload.old?.material_id;
                if (!materialId) return;

                // Invalidate caches
                setWhCache(p => { const n = { ...p }; delete n[materialId]; return n; });
                setRollCache(p => {
                    const n = { ...p };
                    Object.keys(n).forEach(k => { if (k.startsWith(materialId)) delete n[k]; });
                    return n;
                });

                // Auto-refetch if this material is currently expanded
                if (expandedIdRef.current === materialId) {
                    setTimeout(() => fetchWarehouseData(materialId, true), 300);
                    // Also refetch rolls if a warehouse is expanded for this material
                    const whKey = expandedWhIdRef.current;
                    if (whKey?.startsWith(materialId)) {
                        const whId = whKey.split('::')[1];
                        setTimeout(() => fetchRollData(materialId, whId, true), 500);
                    }
                }
                // Also refresh main inventory data (debounced)
                debouncedRefetch();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'fabric_materials',
                filter: `company_id=eq.${companyId}`,
            }, (payload: any) => {
                const materialId = payload.new?.id || payload.old?.id;
                if (!materialId) return;
                setWhCache(p => { const n = { ...p }; delete n[materialId]; return n; });
                if (expandedIdRef.current === materialId) {
                    if (payload.eventType === 'DELETE') {
                        setExpandedId(null);
                    } else {
                        setTimeout(() => fetchWarehouseData(materialId, true), 300);
                    }
                }
                debouncedRefetch();
            })
            // Listen for inventory_stock changes (trigger creates these on movement insert)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'inventory_stock',
                filter: `company_id=eq.${companyId}`,
            }, () => {
                // Flush all warehouse caches and debounced refetch
                setWhCache({});
                debouncedRefetch();
            })
            .subscribe();

        return () => {
            if (refetchTimer) clearTimeout(refetchTimer);
            supabase.removeChannel(channel);
        };
    }, [companyId]); // eslint-disable-line -- refs handle stale closures

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

    // ─── Transfer Sheet ───────────────────────────────────────
    const [transferOpen, setTransferOpen] = useState(false);

    // ─── Material Sheet ───────────────────────────────────────
    const [matSheetOpen, setMatSheetOpen] = useState(false);
    const [matSheetData, setMatSheetData] = useState<any>(null);

    const openMaterialSheet = useCallback(async (materialId: string) => {
        try {
            const { data: fullMat, error } = await supabase
                .from('fabric_materials')
                .select('*')
                .eq('id', materialId)
                .single();
            if (error || !fullMat) return;
            setMatSheetData(fullMat);
            setMatSheetOpen(true);
        } catch {}
    }, []);

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
                toast.error(getLocalizedLabel('roll_load_err', language));
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

    // ─── Smart CSV Export (respects visible columns) ────────
    const handleExportCSV = useCallback(() => {
        if (materials.length === 0) return;
        // Build dynamic columns list based on visibility
        const cols: { header: string; getValue: (m: InventoryMaterialRow) => string | number }[] = [
            { header: '#', getValue: (_, i?: number) => (i ?? 0) + 1 } as any,
            { header: getLocalizedLabel('code_label', language), getValue: m => m.material_code },
            { header: getLocalizedLabel('material_col', language), getValue: m => getMaterialName(m, language) },
        ];
        if (col.rolls) cols.push({ header: getLocalizedLabel('col_rolls', language), getValue: m => m.total_rolls });
        if (col.available) cols.push({ header: getLocalizedLabel('avail_meters', language), getValue: m => Math.max(m.current_stock, m.total_meters) });
        if (canSeeCost && col.cost) cols.push({ header: `${getLocalizedLabel('cost_per_m', language)} ${activeCurrency}`, getValue: m => { const c = m.avg_cost_per_meter > 0 ? m.avg_cost_per_meter : m.purchase_price; return c > 0 ? convertPrice(c, m.material_currency || baseCurrency || 'UAH').toFixed(2) : ''; } });
        if (canSeePrices && col.sellPrice) cols.push({ header: `${getLocalizedLabel('sell_price', language)} ${activeCurrency}`, getValue: m => m.selling_price > 0 ? convertPrice(m.selling_price, m.material_currency || baseCurrency || 'UAH').toFixed(2) : '' });
        if (canSeePrices && col.wholesalePrice) cols.push({ header: `${getLocalizedLabel('col_wholesale', language)} ${activeCurrency}`, getValue: m => m.wholesale_price > 0 ? convertPrice(m.wholesale_price, m.material_currency || baseCurrency || 'UAH').toFixed(2) : '' });
        if (canSeePrices && col.halfWholesalePrice) cols.push({ header: `${getLocalizedLabel('half_w', language)} ${activeCurrency}`, getValue: m => m.half_wholesale_price > 0 ? convertPrice(m.half_wholesale_price, m.material_currency || baseCurrency || 'UAH').toFixed(2) : '' });
        if (canSeePrices && col.specialPrice) cols.push({ header: `${getLocalizedLabel('col_special', language)} ${activeCurrency}`, getValue: m => m.special_price > 0 ? convertPrice(m.special_price, m.material_currency || baseCurrency || 'UAH').toFixed(2) : '' });
        if (canSeePrices && col.costPrice) cols.push({ header: `${getLocalizedLabel('col_cost_price', language)} ${activeCurrency}`, getValue: m => m.cost_price > 0 ? convertPrice(m.cost_price, m.material_currency || baseCurrency || 'UAH').toFixed(2) : '' });
        if (canSeeValue && col.totalValue) cols.push({ header: `${getLocalizedLabel('total_value', language)} ${activeCurrency}`, getValue: m => m.total_stock_value > 0 ? convertPrice(m.total_stock_value, m.material_currency || baseCurrency || 'UAH').toFixed(2) : '' });
        if (col.container) cols.push({ header: getLocalizedLabel('container', language), getValue: m => m.last_container_number || '' });

        // Generate CSV
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel
        const header = cols.map(c => `"${c.header}"`).join(',');
        const rows = materials.map((m, i) => cols.map(c => {
            const v = (c as any).getValue(m, i);
            return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(','));
        const csv = BOM + header + '\n' + rows.join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${getLocalizedLabel('exported', language)} ${materials.length} ${getLocalizedLabel('materials_word', language)}`);
    }, [materials, col, canSeeCost, canSeePrices, canSeeValue, activeCurrency, baseCurrency, convertPrice, isRTL, language]);

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
        const total = allMaterials.filter(m => m.total_rolls > 0 || m.loose_stock > 0).length;
        return `${t('inventory.showing')} ${fmt0(visible)} ${t('inventory.of')} ${fmt0(total)} ${t('warehouse.tabs.materials')}`;
    }, [materials.length, allMaterials, t]);

    // ─── Render ─────────────────────────────────────────────
    return (
        <>
            <div className="flex flex-col h-[calc(100vh-200px)] gap-4 animate-in fade-in duration-500" dir={direction}>

                {/* ═══ Header ═══ */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shadow-sm flex-shrink-0">
                            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                {t('inventory.management')}
                            </h1>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {fmt0(summary.totalMaterials)} {t('warehouse.tabs.materials')} · {fmt0(summary.totalRolls)} {getLocalizedLabel('rolls', language)} · {fmt(summary.totalMeters + summary.totalLooseStock)} {t('inventory.meterUnit')}
                            </p>
                        </div>
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
                        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={loading}>
                            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                            <span className="hidden md:inline">{t('common.refresh')}</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportCSV}>
                            <Download className="w-4 h-4" />
                            <span className="hidden md:inline">{t('common.export')}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                            onClick={() => setTransferOpen(true)}
                        >
                            <ArrowLeftRight className="w-4 h-4" />
                            <span className="hidden md:inline">{getLocalizedLabel('transfer', language)}</span>
                        </Button>
                        {/* Column Visibility Toggle */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                    <Columns3 className="w-4 h-4" />
                                    <span className="hidden md:inline">{getLocalizedLabel('columns', language)}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-56">
                                <DropdownMenuLabel>{getLocalizedLabel('show_hide_cols', language)}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {COLUMN_DEFS.filter(c => !c.priceOnly || canSeePrices).map(c => (
                                    <DropdownMenuCheckboxItem
                                        key={c.key}
                                        checked={col[c.key]}
                                        onCheckedChange={() => toggleColumn(c.key)}
                                    >
                                        {getLocalizedLabel(c.labelKey, language)}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ═══ RBAC notice ═══ */}
                {!canSeePrices && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        {t('inventory.priceRestricted')}
                    </div>
                )}



                {/* ═══ Error ═══ */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-red-600"><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                )}

                {/* ═══ Table Panel ═══ */}
                <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

                    {/* ── Toolbar ── */}
                    <div className="flex items-end gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex-wrap">

                        {/* Search — grows to fill remaining space */}
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-xs">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                                {getLocalizedLabel('search', language)}
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
                            label={getLocalizedLabel('warehouse', language)}
                            value={filters.warehouseId}
                            onChange={v => setFilters(p => ({ ...p, warehouseId: v }))}
                            options={[
                                { value: 'all', label: getLocalizedLabel('all_warehouses', language) },
                                ...filterOptions.warehouses.map(w => ({
                                    value: w.id,
                                    label: isRTL ? w.name_ar : (w.name_en || w.name_ar),
                                })),
                            ]}
                        />

                        {/* Season */}
                        <FilterSelect
                            label={getLocalizedLabel('season', language)}
                            value={filters.season || 'all'}
                            onChange={v => setFilters(p => ({ ...p, season: v === 'all' ? '' : v }))}
                            options={[
                                { value: 'all', label: getLocalizedLabel('all_seasons', language) },
                                { value: 'winter', label: getLocalizedLabel('winter', language) },
                                { value: 'spring', label: getLocalizedLabel('spring', language) },
                                { value: 'summer', label: getLocalizedLabel('summer', language) },
                                { value: 'autumn', label: getLocalizedLabel('autumn', language) },
                            ]}
                        />

                        {/* Currency */}
                        {currencyOptions.length >= 1 && (
                            <FilterSelect
                                label={getLocalizedLabel('currency', language)}
                                value={filters.currencyCode || activeCurrency}
                                onChange={v => setFilters(p => ({ ...p, currencyCode: v }))}
                                options={currencyOptions}
                            />
                        )}

                        {/* Status */}
                        <FilterSelect
                            label={getLocalizedLabel('status_filter', language)}
                            value={filters.status}
                            onChange={v => setFilters(p => ({ ...p, status: v as any }))}
                            options={[
                                { value: 'all', label: getLocalizedLabel('all', language) },
                                { value: 'in_stock', label: getLocalizedLabel('in_stock', language) },
                                { value: 'low_stock', label: getLocalizedLabel('low_stock', language) },
                                { value: 'out_of_stock', label: getLocalizedLabel('out_of_stock', language) },
                            ]}
                        />

                        {/* Color */}
                        {filterOptions.colors.length > 0 && (
                            <FilterSelect
                                label={getLocalizedLabel('color_filter', language)}
                                value={filters.colorId}
                                onChange={v => setFilters(p => ({ ...p, colorId: v }))}
                                options={[
                                    { value: 'all', label: getLocalizedLabel('all_colors', language) },
                                    ...filterOptions.colors.map(c => ({
                                        value: c.id,
                                        label: isRTL ? c.name_ar : (c.name_en || c.name_ar),
                                    })),
                                ]}
                            />
                        )}

                        {/* Stock Type */}
                        <FilterSelect
                            label={getLocalizedLabel('stock_type', language)}
                            value={filters.stockType}
                            onChange={v => setFilters(p => ({ ...p, stockType: v as any }))}
                            options={[
                                { value: 'all', label: getLocalizedLabel('stock_all', language) },
                                { value: 'rolls', label: getLocalizedLabel('stock_rolls', language) },
                                { value: 'loose', label: getLocalizedLabel('stock_loose', language) },
                                { value: 'mixed', label: getLocalizedLabel('stock_mixed', language) },
                            ]}
                        />

                        {/* Clear + Count */}
                        <div className="flex items-end gap-2 flex-shrink-0">
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={resetFilters}>
                                    <X className="w-3.5 h-3.5" />
                                    {getLocalizedLabel('clear', language)}
                                </Button>
                            )}
                            <div className="text-xs text-gray-400 pb-1 font-mono" dir="ltr">
                                {fmt0(materials.length)}/{fmt0(allMaterials.filter(m => m.total_rolls > 0 || m.loose_stock > 0).length)}
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
                                <thead className="sticky top-0 z-30">
                                    <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                                        {/* # — STICKY */}
                                        <th className={cn(
                                            'w-8 px-3 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide sticky z-30 bg-gray-100 dark:bg-gray-800',
                                            isRTL ? 'right-0' : 'left-0'
                                        )}>#</th>
                                        {/* Chevron — STICKY */}
                                        <th className={cn(
                                            'w-8 px-2 py-3 sticky z-30 bg-gray-100 dark:bg-gray-800',
                                            isRTL ? 'right-[32px]' : 'left-[32px]'
                                        )} />
                                        {/* Material — STICKY */}
                                        <th className={cn(
                                            'px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors sticky z-30 bg-gray-100 dark:bg-gray-800',
                                            isRTL ? 'text-right right-[64px]' : 'text-left left-[64px]'
                                        )} onClick={() => handleSort('name')}>
                                            <span className="inline-flex items-center gap-1">
                                                {t('inventory.material')}
                                                {sortKey === 'name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                            </span>
                                        </th>
                                        {/* Colors */}
                                        {col.colors && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-center w-24">
                                                {t('inventory.colors')}
                                            </th>
                                        )}
                                        {/* Rolls */}
                                        {col.rolls && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-center w-20 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('rolls')}>
                                                <span className="inline-flex items-center gap-1 justify-center">
                                                    {t('inventory.rolls')}
                                                    {sortKey === 'rolls' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Available */}
                                        {col.available && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-32 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('available')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {t('inventory.availableMeters')}
                                                    {sortKey === 'available' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Status */}
                                        {col.status && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide w-24">
                                                {t('common.status._')}
                                            </th>
                                        )}
                                        {/* Cost — conditionally */}
                                        {canSeeCost && col.cost && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-32 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('cost')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {t('inventory.costPerMeter')} ({activeCurrency})
                                                    {sortKey === 'cost' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Sell price */}
                                        {canSeePrices && col.sellPrice && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-28 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('sellPrice')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {t('inventory.sellPrice')} ({activeCurrency})
                                                    {sortKey === 'sellPrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Wholesale price */}
                                        {canSeePrices && col.wholesalePrice && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-28 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('wholesalePrice')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {getLocalizedLabel('col_wholesale', language)} ({activeCurrency})
                                                    {sortKey === 'wholesalePrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Half wholesale price */}
                                        {canSeePrices && col.halfWholesalePrice && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-28 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('halfWholesalePrice')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {getLocalizedLabel('half_w', language)} ({activeCurrency})
                                                    {sortKey === 'halfWholesalePrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Special price */}
                                        {canSeePrices && col.specialPrice && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-28 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('specialPrice')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {getLocalizedLabel('col_special', language)} ({activeCurrency})
                                                    {sortKey === 'specialPrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Cost price (from custom_fields) */}
                                        {canSeePrices && col.costPrice && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-28 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('costPrice')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {getLocalizedLabel('col_cost_price', language)} ({activeCurrency})
                                                    {sortKey === 'costPrice' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Total value */}
                                        {canSeeValue && col.totalValue && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-end w-36 cursor-pointer select-none hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" onClick={() => handleSort('totalValue')}>
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    {t('inventory.totalValue')} ({activeCurrency})
                                                    {sortKey === 'totalValue' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                </span>
                                            </th>
                                        )}
                                        {/* Container */}
                                        {col.container && (
                                            <th className="px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide w-28">
                                                {t('inventory.container')}
                                            </th>
                                        )}
                                        {/* Cart */}
                                        {canAddToCart && <th className="w-10 px-2 py-3" />}
                                    </tr>
                                </thead>


                                <tbody>
                                    {materials.map((mat, idx) => {
                                        const isOpen = expandedId === mat.material_id;
                                        // Effective total = max(current_stock, rolled_meters) + ensures stale DB values don't hide real stock
                                        const effectiveTotal = Math.max(mat.current_stock, mat.total_meters);
                                        const isLowStock = mat.min_stock > 0 && effectiveTotal <= mat.min_stock;
                                        const isOutOfStock = effectiveTotal <= 0;
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
                                                    onClick={() => toggleExpand(mat.material_id, mat)}
                                                >
                                                    {/* # — STICKY */}
                                                    <td className={cn(
                                                        'px-3 py-3 text-center text-xs text-gray-400 font-mono sticky z-[5] bg-white dark:bg-gray-900',
                                                        isRTL ? 'right-0' : 'left-0'
                                                    )} dir="ltr">
                                                        {fmt0(idx + 1)}
                                                    </td>
                                                    {/* Chevron — STICKY */}
                                                    <td className={cn(
                                                        'px-2 py-3 text-center sticky z-[5] bg-white dark:bg-gray-900',
                                                        isRTL ? 'right-[32px]' : 'left-[32px]'
                                                    )}>
                                                        <motion.div
                                                            animate={{ rotate: isOpen ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="flex justify-center"
                                                        >
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        </motion.div>
                                                    </td>
                                                    {/* Material name — click opens sheet — STICKY */}
                                                    <td className={cn(
                                                        'px-3 py-3 sticky z-[5] bg-white dark:bg-gray-900',
                                                        isRTL ? 'right-[64px]' : 'left-[64px]'
                                                    )}>
                                                        <div>
                                                            <p
                                                                className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); openMaterialSheet(mat.material_id); }}
                                                            >
                                                                {getMaterialName(mat, language)}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 mt-0.5" dir="ltr">
                                                                {mat.material_code || '—'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    {/* Colors */}
                                                    {col.colors && (
                                                        <td className="px-3 py-3 text-center">
                                                            <ColorDots colorIds={mat.color_ids} colors={filterOptions.colors as any} />
                                                        </td>
                                                    )}
                                                    {/* Rolls — count + rolled meters */}
                                                    {col.rolls && (
                                                        <td className="px-3 py-3 text-center">
                                                            <span className={cn('text-sm font-bold font-mono', mat.total_rolls > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300')} dir="ltr">
                                                                {fmt0(mat.total_rolls)}
                                                            </span>
                                                            {mat.total_meters > 0 && (
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5" dir="ltr">
                                                                    {fmt(mat.total_meters)} {t('inventory.meterUnit')}
                                                                </p>
                                                            )}
                                                            {mat.warehouse_count > 0 && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5" dir="ltr">
                                                                    {fmt0(mat.warehouse_count)} {t('inventory.warehouseCount')}
                                                                </p>
                                                            )}
                                                        </td>
                                                    )}
                                                    {/* Available meters — effective total + loose sub-line */}
                                                    {col.available && (
                                                        <td className="px-3 py-3 text-end">
                                                            <span className={cn('text-sm font-bold font-mono', effectiveTotal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300')} dir="ltr">
                                                                {fmt(effectiveTotal)} {t('inventory.meterUnit')}
                                                            </span>
                                                            {mat.loose_stock > 0 && (
                                                                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5" dir="ltr">
                                                                    {fmt(mat.loose_stock)} {getLocalizedLabel('loose', language)}
                                                                </p>
                                                            )}
                                                            {mat.reserved_meters > 0 && (
                                                                <p className="text-[10px] text-amber-500 mt-0.5" dir="ltr">
                                                                    {fmt(mat.reserved_meters)} {t('inventory.reserved')}
                                                                </p>
                                                            )}
                                                        </td>
                                                    )}
                                                    {/* Status — considers effective total */}
                                                    {col.status && (
                                                        <td className="px-3 py-3">
                                                            <StockBadge meters={mat.available_meters} currentStock={effectiveTotal} minStock={mat.min_stock} t={t} />
                                                        </td>
                                                    )}
                                                    {/* Cost — fallback to purchase_price */}
                                                    {canSeeCost && col.cost && (() => {
                                                        const costVal = mat.avg_cost_per_meter > 0 ? mat.avg_cost_per_meter : mat.purchase_price;
                                                        const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                        return (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {costVal > 0 ? (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-200 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(costVal, matCur))}
                                                                        <span className="text-[9px] font-normal text-gray-400 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(costVal)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">
                                                                        {mat.avg_cost_per_meter > 0 ? t('inventory.avgCost') : getLocalizedLabel('col_cost_price', language)}
                                                                    </p>
                                                                </div>
                                                            ) : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                        );
                                                    })()}
                                                    {/* Sell price + margin indicator */}
                                                    {canSeePrices && col.sellPrice && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.selling_price > 0 ? (() => {
                                                                const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                                const costVal = mat.avg_cost_per_meter > 0 ? mat.avg_cost_per_meter : mat.purchase_price;
                                                                const isLoss = costVal > 0 && mat.selling_price < costVal;
                                                                return (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className={cn('text-sm font-bold font-mono leading-tight', isLoss ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')} dir="ltr">
                                                                        {fmt2(convertPrice(mat.selling_price, matCur))}
                                                                        <span className={cn('text-[9px] font-normal ms-1', isLoss ? 'text-red-400/70' : 'text-blue-400/70')}>{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.selling_price)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                    {isLoss && (
                                                                        <span className="text-[9px] font-semibold text-red-500 dark:text-red-400 mt-0.5">
                                                                            {getLocalizedLabel('loss', language)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })() : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Wholesale price */}
                                                    {canSeePrices && col.wholesalePrice && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.wholesale_price > 0 ? (() => {
                                                                const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                                return (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-teal-600 dark:text-teal-400 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(mat.wholesale_price, matCur))}
                                                                        <span className="text-[9px] font-normal text-teal-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.wholesale_price)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })() : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Half wholesale price */}
                                                    {canSeePrices && col.halfWholesalePrice && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.half_wholesale_price > 0 ? (() => {
                                                                const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                                return (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(mat.half_wholesale_price, matCur))}
                                                                        <span className="text-[9px] font-normal text-indigo-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.half_wholesale_price)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })() : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Special price */}
                                                    {canSeePrices && col.specialPrice && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.special_price > 0 ? (() => {
                                                                const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                                return (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-orange-600 dark:text-orange-400 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(mat.special_price, matCur))}
                                                                        <span className="text-[9px] font-normal text-orange-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.special_price)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })() : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Cost price (custom_fields) */}
                                                    {canSeePrices && col.costPrice && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.cost_price > 0 ? (() => {
                                                                const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                                return (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 leading-tight" dir="ltr">
                                                                        {fmt2(convertPrice(mat.cost_price, matCur))}
                                                                        <span className="text-[9px] font-normal text-rose-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt2(mat.cost_price)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })() : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Total value */}
                                                    {canSeeValue && col.totalValue && (
                                                        <td className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}>
                                                            {mat.total_stock_value > 0 ? (() => {
                                                                const matCur = mat.material_currency || baseCurrency || 'UAH';
                                                                return (
                                                                <div className="flex flex-col items-end gap-0">
                                                                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400 leading-tight" dir="ltr">
                                                                        {fmt0(convertPrice(mat.total_stock_value, matCur))}
                                                                        <span className="text-[9px] font-normal text-purple-400/70 ms-1">{activeCurrency}</span>
                                                                    </span>
                                                                    {activeCurrency !== matCur && (
                                                                        <span className="text-[10px] font-mono text-gray-400 leading-tight" dir="ltr">
                                                                            {fmt0(mat.total_stock_value)}
                                                                            <span className="text-[9px] ms-0.5">{matCur}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })() : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Container */}
                                                    {col.container && (
                                                        <td className="px-3 py-3">
                                                            {mat.last_container_number ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" dir="ltr">
                                                                    {mat.last_container_number}
                                                                </span>
                                                            ) : <span className="text-gray-300 text-sm">—</span>}
                                                        </td>
                                                    )}
                                                    {/* Cart */}
                                                    {canAddToCart && (
                                                        <td className="px-2 py-3 text-center">
                                                            {(mat.total_rolls > 0 || mat.loose_stock > 0) && (
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
                                                                    3 + // #, chevron, material (always visible)
                                                                    (col.colors ? 1 : 0) +
                                                                    (col.rolls ? 1 : 0) +
                                                                    (col.available ? 1 : 0) +
                                                                    (col.status ? 1 : 0) +
                                                                    (canSeeCost && col.cost ? 1 : 0) +
                                                                    (canSeePrices && col.sellPrice ? 1 : 0) +
                                                                    (canSeePrices && col.wholesalePrice ? 1 : 0) +
                                                                    (canSeePrices && col.halfWholesalePrice ? 1 : 0) +
                                                                    (canSeePrices && col.specialPrice ? 1 : 0) +
                                                                    (canSeePrices && col.costPrice ? 1 : 0) +
                                                                    (canSeeValue && col.totalValue ? 1 : 0) +
                                                                    (col.container ? 1 : 0) +
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
                                                                    {/* Warehouse Stock Section — nested accordion */}
                                                                    <div className="bg-slate-50/80 dark:bg-gray-950/50 max-h-[520px] overflow-y-auto border-t border-indigo-200/60 dark:border-indigo-800/40">
                                                                        <WarehouseStockSection
                                                                            materialId={mat.material_id}
                                                                            companyId={companyId || ''}
                                                                            warehouseRows={whCache[mat.material_id] || []}
                                                                            isLoading={whLoading.has(mat.material_id)}
                                                                            rollCache={rollCache}
                                                                            rollLoading={rollLoading}
                                                                            onToggleRolls={toggleWarehouseRolls}
                                                                            expandedWhId={expandedWhId?.startsWith(mat.material_id) ? expandedWhId.split('::')[1] : null}
                                                                            costDisplay={mat.avg_cost_per_meter > 0 ? mat.avg_cost_per_meter : mat.purchase_price}
                                                                            isRTL={isRTL}
                                                                            canSeeCost={canSeeCost}
                                                                            canSeeValue={canSeeValue}
                                                                            activeCurrency={activeCurrency}
                                                                            baseCurrency={mat.material_currency || baseCurrency || 'UAH'}
                                                                            convertPrice={convertPrice}
                                                                            onRollClick={openRollSheet}
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
                                {/* ═══ Totals Row ═══ */}
                                <tfoot className="sticky bottom-0 z-10">
                                    <tr className="bg-gray-50 dark:bg-gray-800/90 border-t-2 border-gray-300 dark:border-gray-600 backdrop-blur-sm">
                                        {/* # — STICKY */}
                                        <td className={cn(
                                            'px-3 py-2.5 text-center text-xs font-bold text-gray-500 sticky z-20 bg-gray-50 dark:bg-gray-800/90',
                                            isRTL ? 'right-0' : 'left-0'
                                        )}>
                                            {getLocalizedLabel('total', language)}
                                        </td>
                                        {/* Chevron — STICKY empty */}
                                        <td className={cn(
                                            'sticky z-20 bg-gray-50 dark:bg-gray-800/90',
                                            isRTL ? 'right-[32px]' : 'left-[32px]'
                                        )} />
                                        {/* Material — STICKY */}
                                        <td className={cn(
                                            'px-3 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 sticky z-20 bg-gray-50 dark:bg-gray-800/90',
                                            isRTL ? 'right-[64px]' : 'left-[64px]'
                                        )}>
                                            <span className="font-mono" dir="ltr">{fmt0(materials.length)} {getLocalizedLabel('items', language)}</span>
                                        </td>
                                        {/* Colors — empty */}
                                        {col.colors && <td />}
                                        {/* Rolls */}
                                        {col.rolls && (
                                            <td className="px-3 py-2.5 text-center">
                                                <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400" dir="ltr">
                                                    {fmt0(totals.rolls)}
                                                </span>
                                                {totals.meters > 0 && (
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5" dir="ltr">
                                                        {fmt(totals.meters)} {t('inventory.meterUnit')}
                                                    </p>
                                                )}
                                            </td>
                                        )}
                                        {/* Available */}
                                        {col.available && (
                                            <td className="px-3 py-2.5 text-end">
                                                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                                                    {fmt(totals.available)} {t('inventory.meterUnit')}
                                                </span>
                                                {totals.looseStock > 0 && (
                                                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5" dir="ltr">
                                                        {fmt(totals.looseStock)} {getLocalizedLabel('loose', language)}
                                                    </p>
                                                )}
                                            </td>
                                        )}
                                        {/* Status — empty */}
                                        {col.status && <td />}
                                        {/* Cost — empty */}
                                        {canSeeCost && col.cost && <td />}
                                        {/* Sell — empty */}
                                        {canSeePrices && col.sellPrice && <td />}
                                        {/* Wholesale — empty */}
                                        {canSeePrices && col.wholesalePrice && <td />}
                                        {/* Half wholesale — empty */}
                                        {canSeePrices && col.halfWholesalePrice && <td />}
                                        {/* Special — empty */}
                                        {canSeePrices && col.specialPrice && <td />}
                                        {/* Cost price — empty */}
                                        {canSeePrices && col.costPrice && <td />}
                                        {/* Total value */}
                                        {canSeeValue && col.totalValue && (
                                            <td className="px-3 py-2.5 text-end">
                                                <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400" dir="ltr">
                                                    {fmt0(convertPrice(totals.totalValue, baseCurrency || 'UAH'))}
                                                    <span className="text-[9px] font-normal text-purple-400/70 ms-1">{activeCurrency}</span>
                                                </span>
                                            </td>
                                        )}
                                        {/* Container — empty */}
                                        {col.container && <td />}
                                        {/* Cart — empty */}
                                        {canAddToCart && <td />}
                                    </tr>
                                </tfoot>
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
            {/* ═══ Transfer Sheet ═══ */}
            {transferOpen && (
                <UnifiedAccountingSheet
                    isOpen={transferOpen}
                    onClose={() => {
                        setTransferOpen(false);
                        refetch();
                    }}
                    docType="trade_invoice"
                    tradeMode="transfer"
                    mode="create"
                    data={{ type: 'transfer', status: 'draft', subType: 'transfer' }}
                />
            )}
            {/* ═══ Material Sheet ═══ */}
            {matSheetData && (
                <UnifiedAccountingSheet
                    isOpen={matSheetOpen}
                    onClose={() => {
                        setMatSheetOpen(false);
                        setMatSheetData(null);
                    }}
                    docType="material"
                    data={matSheetData}
                    mode="view"
                />
            )}
        </>
    );
}
