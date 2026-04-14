/**
 * ════════════════════════════════════════════════════════════════
 * 📤 SalesDeliveryItemsTab — تبويب اختيار الرولونات للتسليم
 * ════════════════════════════════════════════════════════════════
 *
 * التصميم المحسّن (v3):
 *  ─ يدعم viewMode: عرض الرولونات المسلّمة للقراءة فقط
 *  ─ صفحة واحدة شاملة (لا حاجة لتبويب ملخص منفصل)
 *  ─ شريط مسح QR/RFID/باركود في الأعلى (مخفي في viewMode)
 *  ─ سطر مطوي لكل مادة → ينفتح لعرض الرولونات
 *  ─ دعم التسليم الجزئي
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { autoRollService } from '@/features/warehouse/services/autoRollService';
import { warehouseLocalCache } from '@/features/warehouse/services/warehouseLocalCache';
import { normalizeNumerals } from '@/lib/arabicNumeralNormalizer';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Package, ChevronDown, ChevronUp, CheckCircle2,
    ScanLine, Trash2, Loader2, AlertTriangle, Search,
    PackageCheck, Cylinder, Info, Plus, Palette, Filter, Ruler,
} from 'lucide-react';
import { RollLabelPreviewDialog, type RollLabelData } from '@/features/warehouse/components/RollLabelPreviewDialog';

// ═══════════════════════════════════════════════════════════════
// 🔍 RollBrowser — متصفح الرولونات المتاحة (for edit mode only)
// ═══════════════════════════════════════════════════════════════

interface RollBrowserProps {
    materialRolls: FabricRoll[];
    isLoading: boolean;
    selectedRolls: FabricRoll[];
    onAddRoll: (roll: FabricRoll) => void;
    tl: (ar: string, en: string) => string;
    isRTL: boolean;
}

function RollBrowser({ materialRolls, isLoading, selectedRolls, onAddRoll, tl, isRTL }: RollBrowserProps) {
    const [searchText, setSearchText] = React.useState('');
    const [selectedColor, setSelectedColor] = React.useState<string | null>(null);
    const [expandedColors, setExpandedColors] = React.useState<Set<string>>(new Set());

    const colorGroups = React.useMemo(() => {
        const groups: Record<string, { color_id: string; color_name: string; rolls: FabricRoll[]; totalLength: number }> = {};
        for (const roll of materialRolls) {
            const colorKey = roll.color_id || '_no_color';
            if (!groups[colorKey]) {
                groups[colorKey] = {
                    color_id: colorKey,
                    color_name: roll.color_name || tl('بدون لون', 'No color'),
                    rolls: [],
                    totalLength: 0,
                };
            }
            groups[colorKey].rolls.push(roll);
            groups[colorKey].totalLength += roll.net_length || 0;
        }
        return Object.values(groups);
    }, [materialRolls, tl]);

    const filteredGroups = React.useMemo(() => {
        return colorGroups
            .filter(g => !selectedColor || g.color_id === selectedColor)
            .map(g => ({
                ...g,
                rolls: g.rolls.filter(r =>
                    !searchText || r.roll_number?.toLowerCase().includes(searchText.toLowerCase())
                ),
            }))
            .filter(g => g.rolls.length > 0);
    }, [colorGroups, selectedColor, searchText]);

    const totalFiltered = filteredGroups.reduce((s, g) => s + g.rolls.length, 0);
    const notAddedCount = filteredGroups.reduce((s, g) =>
        s + g.rolls.filter(r => !selectedRolls.some(sr => sr.id === r.id)).length, 0
    );

    const toggleColor = (colorId: string) => {
        setExpandedColors(prev => {
            const next = new Set(prev);
            next.has(colorId) ? next.delete(colorId) : next.add(colorId);
            return next;
        });
    };

    const addAllFiltered = () => {
        for (const g of filteredGroups) {
            for (const roll of g.rolls) {
                if (!selectedRolls.some(sr => sr.id === roll.id)) {
                    onAddRoll(roll);
                }
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8 px-4">
                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                <span className="ms-2 text-sm text-gray-500">{tl('جاري تحميل الرولونات...', 'Loading rolls...')}</span>
            </div>
        );
    }

    if (materialRolls.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm px-4">
                <AlertTriangle className="w-6 h-6 mx-auto mb-1 opacity-50 text-amber-400" />
                {tl('لا توجد رولونات متاحة لهذه المادة في المستودع المحدد', 'No available rolls for this material in selected warehouse')}
            </div>
        );
    }

    return (
        <div className="px-4 py-3 space-y-2.5" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-blue-500" />
                <h5 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex-1">
                    {tl('📦 الرولونات المتاحة في المستودع', '📦 Available Rolls in Warehouse')}
                </h5>
                <Badge variant="outline" className="text-[9px] h-5">
                    {totalFiltered} {tl('رولون', 'rolls')}
                </Badge>
            </div>

            {colorGroups.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Palette className="w-3 h-3 text-gray-400 shrink-0" />
                    <button
                        onClick={() => setSelectedColor(null)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${!selectedColor
                            ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700'
                            }`}
                    >
                        {tl('الكل', 'All')} ({materialRolls.length})
                    </button>
                    {colorGroups.map(cg => (
                        <button
                            key={cg.color_id}
                            onClick={() => setSelectedColor(selectedColor === cg.color_id ? null : cg.color_id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${selectedColor === cg.color_id
                                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700'
                                }`}
                        >
                            {cg.color_name} ({cg.rolls.length})
                        </button>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={tl('بحث برقم الرولون...', 'Search by roll number...')}
                        className="h-8 text-xs ps-8 bg-white dark:bg-slate-800"
                    />
                </div>
                {notAddedCount > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={addAllFiltered}
                        className="h-8 text-[10px] gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        <Plus className="w-3 h-3" />
                        {tl(`إضافة الكل (${notAddedCount})`, `Add All (${notAddedCount})`)}
                    </Button>
                )}
            </div>

            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                {filteredGroups.map(colorGroup => {
                    const isOpen = expandedColors.has(colorGroup.color_id) || filteredGroups.length === 1;
                    const addedInGroup = colorGroup.rolls.filter(r => selectedRolls.some(sr => sr.id === r.id)).length;
                    const allAdded = addedInGroup === colorGroup.rolls.length;

                    return (
                        <div key={colorGroup.color_id} className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                            <button
                                onClick={() => toggleColor(colorGroup.color_id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${isOpen
                                    ? 'bg-blue-50/80 dark:bg-blue-900/15'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                                    }`}
                            >
                                <Palette className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="flex-1 font-medium text-start truncate">{colorGroup.color_name}</span>
                                <span className="text-[10px] font-mono text-green-600 dark:text-green-400 shrink-0">
                                    {colorGroup.totalLength.toFixed(1)} {tl('م', 'm')}
                                </span>
                                <Badge variant="outline" className={`text-[9px] h-4 shrink-0 ${allAdded ? 'bg-green-50 text-green-600 border-green-200' : ''}`}>
                                    {allAdded ? tl('✓ مضاف', '✓ Added') : `${colorGroup.rolls.length} ${tl('رولون', 'rolls')}`}
                                </Badge>
                                {addedInGroup > 0 && !allAdded && (
                                    <span className="text-[9px] text-amber-600 font-medium shrink-0">
                                        {addedInGroup}/{colorGroup.rolls.length}
                                    </span>
                                )}
                                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOpen && (
                                <div className="border-t divide-y divide-gray-100 dark:divide-gray-800">
                                    {colorGroup.rolls.map(roll => {
                                        const isAdded = selectedRolls.some(sr => sr.id === roll.id);
                                        return (
                                            <div
                                                key={roll.id}
                                                className={`flex items-center gap-2 px-4 py-2 text-xs transition-all ${isAdded
                                                    ? 'bg-green-50/50 dark:bg-green-950/10'
                                                    : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer'
                                                    }`}
                                                onClick={() => !isAdded && onAddRoll(roll)}
                                            >
                                                <Cylinder className={`w-3.5 h-3.5 shrink-0 ${isAdded ? 'text-green-500' : 'text-gray-300'}`} />
                                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 min-w-[80px]">
                                                    {roll.roll_number}
                                                </span>
                                                <span className="text-[10px] font-mono text-green-600 dark:text-green-400 font-medium">
                                                    {(roll.net_length || 0).toFixed(1)} {tl('م', 'm')}
                                                </span>
                                                <div className="flex-1" />
                                                {isAdded ? (
                                                    <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-200 h-5">
                                                        <CheckCircle2 className="w-2.5 h-2.5 me-0.5" />
                                                        {tl('مضاف', 'Added')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-200 hover:bg-blue-100 h-5 cursor-pointer">
                                                        <Plus className="w-2.5 h-2.5 me-0.5" />
                                                        {tl('إضافة', 'Add')}
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface SalesDeliveryItemsTabProps {
    data: any;
    mode: string;
    onChange: (updates: any) => void;
}

interface InvoiceItem {
    id: string;
    material_id: string;
    material_name_ar?: string;
    material_name?: string;
    color_id?: string;
    color_name?: string;
    quantity: number;
    unit_price: number;
    total: number;
    description?: string;
    roll_id?: string;
    roll_code?: string;
    rolls_count?: number;
}

interface FabricRoll {
    id: string;
    roll_number: string;
    material_id: string;
    color_id?: string;
    color_name?: string;
    current_length: number;
    available_length: number;
    initial_length: number;
    net_length: number;
    status: string;
    warehouse_id: string;
    qr_code?: string;
    rfid_tag?: string;
    barcode?: string;
    /** 🔑 true = رولون مُنشأ تلقائياً (JIT) — يُحذف من DB عند الإزالة */
    _isJIT?: boolean;
    _delivered?: boolean;
}

export function SalesDeliveryItemsTab({ data, mode, onChange }: SalesDeliveryItemsTabProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;

    const isViewMode = !!(data?.view_mode);

    // ═══ State ═══
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [availableRolls, setAvailableRolls] = useState<Record<string, FabricRoll[]>>({});
    const [selectedRolls, setSelectedRolls] = useState<FabricRoll[]>(data?.selected_rolls || []);
    const [loadingRolls, setLoadingRolls] = useState<Record<string, boolean>>({});
    const [scanInput, setScanInput] = useState('');
    const [scanLoading, setScanLoading] = useState(false);
    const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // ═══ Loose Stock Entry State ═══
    const [looseMatId, setLooseMatId] = useState('');
    const [looseColorName, setLooseColorName] = useState('');
    const [looseColorId, setLooseColorId] = useState('');
    const [looseLength, setLooseLength] = useState('');
    const [looseCreating, setLooseCreating] = useState(false);
    const looseLengthRef = useRef<HTMLInputElement>(null);
    const [looseMaterials, setLooseMaterials] = useState<Array<{ id: string; name_ar: string; name_en: string; loose_stock: number; current_stock: number }>>([]);

    // ═══ JIT Roll Label Preview Dialog State ═══
    const [showJITPreview, setShowJITPreview] = useState(false);
    const [pendingJITRoll, setPendingJITRoll] = useState<FabricRoll | null>(null);
    const [pendingJITLabel, setPendingJITLabel] = useState<RollLabelData | null>(null);
    const [pendingJITRemaining, setPendingJITRemaining] = useState<number | null>(null);
    // 🔑 Track auto-created rolls for cleanup on removal
    const jitCreatedIdsRef = useRef<Set<string>>(new Set());
    const [loadingLooseMats, setLoadingLooseMats] = useState(false);
    const [showAllLooseMats, setShowAllLooseMats] = useState(false);

    // ═══ Toggle for Loose Stock Section (persisted in localStorage) ═══
    const [showLooseSection, setShowLooseSection] = useState(() => {
        try { return localStorage.getItem('delivery_show_loose') !== 'false'; } catch { return true; }
    });
    const toggleLooseSection = useCallback(() => {
        setShowLooseSection(prev => {
            const next = !prev;
            try { localStorage.setItem('delivery_show_loose', String(next)); } catch { }
            return next;
        });
    }, []);

    // Source document items (declared early — used by useEffects below)
    const sourceItems: InvoiceItem[] = useMemo(() => {
        return data?.source_items || data?.source_document?.items || [];
    }, [data?.source_items, data?.source_document?.items]);

    const warehouseId = data?.warehouse_id;

    // ═══ Fetch materials with loose stock (LOCAL-FIRST) ═══
    useEffect(() => {
        if (!companyId || isViewMode) return;

        // 1. Instant load from local cache
        const { data: cached, isStale } = warehouseLocalCache.getLooseMaterials(companyId, warehouseId);
        if (cached.length > 0) {
            setLooseMaterials(cached);
            setLoadingLooseMats(false);
            console.log(`[LooseStock] ⚡ Loaded ${cached.length} materials from cache${isStale ? ' (stale)' : ''}`);
        } else {
            setLoadingLooseMats(true);
        }

        // 2. Background refresh from Supabase
        warehouseLocalCache.refreshLooseMaterials(companyId, warehouseId)
            .then(fresh => {
                setLooseMaterials(fresh);
                setLoadingLooseMats(false);
                console.log(`[LooseStock] ☁️ Synced ${fresh.length} materials from Supabase`);
            })
            .catch(() => setLoadingLooseMats(false));
    }, [companyId, warehouseId, isViewMode]);

    // Refresh loose materials — updates cache + state
    const refreshLooseMaterials = useCallback(() => {
        if (!companyId) return;
        warehouseLocalCache.refreshLooseMaterials(companyId, warehouseId)
            .then(mats => setLooseMaterials(mats));
    }, [companyId, warehouseId]);

    // Selected loose material info (for displaying available stock)
    const selectedLooseMat = useMemo(() => {
        return looseMaterials.find(m => m.id === looseMatId) || null;
    }, [looseMaterials, looseMatId]);

    // ═══ Filter Loose Materials ═══
    const filteredLooseMats = useMemo(() => {
        if (showAllLooseMats) return looseMaterials;
        if (!sourceItems || sourceItems.length === 0) return looseMaterials;
        return looseMaterials.filter(m => sourceItems.some(si => si.material_id === m.id));
    }, [looseMaterials, sourceItems, showAllLooseMats]);

    // Auto-select if there is exactly 1 required material with loose stock
    useEffect(() => {
        if (!showAllLooseMats && filteredLooseMats.length === 1 && !looseMatId) {
            setLooseMatId(filteredLooseMats[0].id);
        }
    }, [filteredLooseMats, showAllLooseMats, looseMatId]);

    // ═══ Sync selectedRolls when parent restores draft OR delivered rolls ═══
    // Also detect JIT rolls by source_type and re-track them
    useEffect(() => {
        const parentRolls = data?.selected_rolls;
        if (parentRolls && parentRolls.length > 0 && selectedRolls.length === 0) {
            console.log(`[ItemsTab] 📂 Syncing ${parentRolls.length} rolls from parent`);
            setSelectedRolls(parentRolls);

            // Re-track JIT rolls from restored draft
            const jitIds = parentRolls
                .filter((r: any) => r._isJIT || r.status === 'reserved')
                .map((r: any) => r.id);
            if (jitIds.length > 0) {
                jitIds.forEach((id: string) => jitCreatedIdsRef.current.add(id));
                console.log(`[ItemsTab] 🔄 Re-tracked ${jitIds.length} JIT rolls`);
            }
        }
    }, [data?.selected_rolls]);

    // ═══ Color options for selected loose material (from source items) ═══
    const looseColorOptions = useMemo(() => {
        if (!looseMatId || sourceItems.length === 0) return [];
        const matItems = sourceItems.filter(si => si.material_id === looseMatId && (si.color_name || si.color_id));
        const seen = new Set<string>();
        const opts: Array<{ id?: string; name: string }> = [];
        for (const si of matItems) {
            const key = si.color_name || si.color_id || '';
            if (key && !seen.has(key)) {
                seen.add(key);
                opts.push({ id: si.color_id, name: si.color_name || si.color_id || '' });
            }
        }
        return opts;
    }, [looseMatId, sourceItems]);

    // Auto-select single color
    useEffect(() => {
        if (looseColorOptions.length === 1) {
            setLooseColorName(looseColorOptions[0].name);
            setLooseColorId(looseColorOptions[0].id || '');
        } else if (looseColorOptions.length === 0) {
            setLooseColorName('');
            setLooseColorId('');
        } else {
            setLooseColorName('');
            setLooseColorId('');
        }
    }, [looseMatId]);

    // ═══ Create roll from loose stock (with validation) ═══
    const handleCreateLooseRoll = useCallback(async () => {
        if (!looseMatId || !looseLength || Number(looseLength) <= 0) return;
        if (!tenantId || !companyId || !warehouseId) return;

        setLooseCreating(true);
        try {
            const { roll, error, remainingLooseStock } = await autoRollService.createRollFromLooseStock({
                tenantId,
                companyId,
                warehouseId,
                materialId: looseMatId,
                colorId: looseColorId || undefined,
                colorName: looseColorName || undefined,
                rollLength: Number(looseLength),
                purpose: 'sales_delivery',
                referenceNumber: data?.invoice_no || data?.draft_no || '',
            });

            if (error) {
                // Handle specific errors
                if (error === 'no_loose_stock') {
                    toast.error(tl(
                        '❌ هذه المادة ليس لها مخزون سائب — لا يمكن إنشاء رولون',
                        '❌ This material has no loose stock — cannot create roll'
                    ));
                } else if (error === 'insufficient_loose_stock') {
                    toast.error(tl(
                        `❌ الكمية السائبة غير كافية — المتاح: ${remainingLooseStock?.toFixed(1)} م`,
                        `❌ Insufficient loose stock — available: ${remainingLooseStock?.toFixed(1)}m`
                    ));
                } else if (error === 'material_not_found') {
                    toast.error(tl('❌ المادة غير موجودة', '❌ Material not found'));
                } else {
                    toast.error(tl('❌ فشل إنشاء الرولون', '❌ Failed to create roll'));
                }
                return;
            }

            if (roll) {
                const newRoll: FabricRoll = {
                    id: roll.id,
                    roll_number: roll.roll_number,
                    material_id: roll.material_id,
                    color_id: roll.color_id,
                    color_name: roll.color_name,
                    current_length: roll.current_length,
                    available_length: roll.current_length,
                    initial_length: roll.current_length,
                    net_length: roll.net_length,
                    status: roll.status,
                    _isJIT: true,  // 🔑 Mark as auto-created
                    warehouse_id: roll.warehouse_id,
                };

                const mat = looseMaterials.find(m => m.id === looseMatId);
                const matName = mat ? (language === 'ar' ? (mat.name_ar || mat.name_en) : (mat.name_en || mat.name_ar)) : '';

                // Store pending roll and show label preview dialog
                setPendingJITRoll(newRoll);
                setPendingJITLabel({
                    rollNumber: roll.roll_number,
                    materialName: matName,
                    colorName: roll.color_name || looseColorName || undefined,
                    rollLength: roll.net_length || roll.current_length,
                    extraInfo: [
                        { label: tl('المرجع:', 'Reference:'), value: data?.invoice_no || data?.draft_no || '—' },
                        { label: tl('المتبقي السائب:', 'Remaining loose:'), value: `${remainingLooseStock?.toFixed(1) || '?'} ${tl('م', 'm')}` },
                    ],
                });
                setPendingJITRemaining(remainingLooseStock ?? null);
                setShowJITPreview(true);

                setLooseLength('');

                // ⚡ INSTANT: Deduct from local looseMaterials for instant UI
                const deducted = Number(looseLength);
                setLooseMaterials(prev => prev.map(m =>
                    m.id === looseMatId
                        ? { ...m, loose_stock: Math.max(0, m.loose_stock - deducted) }
                        : m
                ));
                // Also persist to localStorage cache
                warehouseLocalCache.adjustLooseStock(companyId!, warehouseId, looseMatId, -deducted);

                // ☁️ DELAYED BACKGROUND: Give DB time to process before re-syncing
                setTimeout(() => refreshLooseMaterials(), 3000);
            }
        } catch (err) {
            console.error('[LooseStock] Error:', err);
            toast.error(tl('❌ خطأ في إنشاء الرولون', '❌ Error creating roll'));
        } finally {
            setLooseCreating(false);
        }
    }, [looseMatId, looseColorId, looseColorName, looseLength, tenantId, companyId, warehouseId, selectedRolls, looseMaterials, language, data, tl, refreshLooseMaterials]);

    // ═══ Confirm JIT Roll from Preview Dialog ═══
    const handleConfirmJITRoll = useCallback((shouldPrint: boolean) => {
        if (!pendingJITRoll) return;

        // Add the roll to selection
        const updated = [...selectedRolls, pendingJITRoll];
        setSelectedRolls(updated);
        notifyParent(updated);

        // Track this roll as auto-created
        jitCreatedIdsRef.current.add(pendingJITRoll.id);

        toast.success(tl(
            `✅ تم إضافة رولون ${pendingJITRoll.roll_number} (${(pendingJITRoll.net_length || pendingJITRoll.current_length || 0).toFixed(1)} م)`,
            `✅ Added roll ${pendingJITRoll.roll_number} (${(pendingJITRoll.net_length || pendingJITRoll.current_length || 0).toFixed(1)}m)`
        ));

        if (shouldPrint) {
            // TODO: trigger actual print via window.print() or print service
            console.log('[JIT Print] 🖨️ Print label for:', pendingJITRoll.roll_number);
        }

        // Cleanup
        setShowJITPreview(false);
        setPendingJITRoll(null);
        setPendingJITLabel(null);
        setPendingJITRemaining(null);
        setTimeout(() => looseLengthRef.current?.focus(), 150);
    }, [pendingJITRoll, selectedRolls, tl]);

    // ═══ Cancel JIT Roll — if user cancels, delete the JIT roll from DB ═══
    const handleCancelJITRoll = useCallback(async (open: boolean) => {
        if (!open && pendingJITRoll) {
            // User cancelled — delete the JIT roll from DB to return loose stock
            const deleted = await autoRollService.deleteAutoRoll(pendingJITRoll.id);
            if (deleted) {
                // ⚡ INSTANT: Return length to local looseMaterials
                const returnedLength = pendingJITRoll.net_length || pendingJITRoll.current_length || 0;
                setLooseMaterials(prev => prev.map(m =>
                    m.id === pendingJITRoll.material_id
                        ? { ...m, loose_stock: m.loose_stock + returnedLength }
                        : m
                ));
                // Also persist to localStorage cache
                warehouseLocalCache.adjustLooseStock(companyId!, warehouseId, pendingJITRoll.material_id, returnedLength);

                toast.info(tl(
                    `🗑️ تم إلغاء الرولون ${pendingJITRoll.roll_number} وإرجاع الكمية للمخزون السائب`,
                    `🗑️ Cancelled ${pendingJITRoll.roll_number} — returned to loose stock`
                ));
                setTimeout(() => refreshLooseMaterials(), 3000);
            }
            setPendingJITRoll(null);
            setPendingJITLabel(null);
            setPendingJITRemaining(null);
        }
        setShowJITPreview(open);
    }, [pendingJITRoll, tl, refreshLooseMaterials]);

    // ═══ Fetch available rolls for a material (LOCAL-FIRST, edit mode only) ═══
    const fetchRollsForMaterial = useCallback(async (materialId: string) => {
        if (!materialId || !warehouseId || isViewMode) return;

        // 1. Instant load from cache
        const { data: cached, isStale } = warehouseLocalCache.getAvailableRolls(materialId, warehouseId);
        if (cached.length > 0) {
            setAvailableRolls(prev => ({ ...prev, [materialId]: cached as any }));
            if (!isStale) return; // Fresh cache — no need to refresh
        } else {
            setLoadingRolls(prev => ({ ...prev, [materialId]: true }));
        }

        // 2. Background refresh from Supabase
        try {
            const fresh = await warehouseLocalCache.refreshAvailableRolls(materialId, warehouseId);
            setAvailableRolls(prev => ({ ...prev, [materialId]: fresh as any }));
        } catch (err) {
            console.error('fetchRollsForMaterial:', err);
        } finally {
            setLoadingRolls(prev => ({ ...prev, [materialId]: false }));
        }
    }, [warehouseId, isViewMode]);

    // ═══ Toggle item expansion ═══
    const toggleItem = useCallback((item: InvoiceItem) => {
        const key = item.material_id;
        if (expandedItemId === item.id) {
            setExpandedItemId(null);
        } else {
            setExpandedItemId(item.id);
            if (!availableRolls[key] && !isViewMode) {
                fetchRollsForMaterial(key);
            }
        }
    }, [expandedItemId, availableRolls, fetchRollsForMaterial, isViewMode]);

    // ═══ Add roll to selection ═══
    const addRoll = useCallback((roll: FabricRoll) => {
        if (selectedRolls.some(r => r.id === roll.id)) return;
        const updated = [...selectedRolls, roll];
        setSelectedRolls(updated);
        notifyParent(updated);
    }, [selectedRolls]);

    // ═══ Remove roll from selection (with auto-created DB cleanup) ═══
    const removeRoll = useCallback(async (rollId: string) => {
        const rollToRemove = selectedRolls.find(r => r.id === rollId);
        const updated = selectedRolls.filter(r => r.id !== rollId);
        setSelectedRolls(updated);
        notifyParent(updated);

        // If it's an auto-created roll (tracked in this session), delete from DB
        if (jitCreatedIdsRef.current.has(rollId)) {
            const deleted = await autoRollService.deleteAutoRoll(rollId);
            if (deleted) {
                jitCreatedIdsRef.current.delete(rollId);

                // ⚡ INSTANT: Update looseMaterials locally — add length back
                if (rollToRemove) {
                    const returnedLength = rollToRemove.net_length || rollToRemove.current_length || 0;
                    setLooseMaterials(prev => prev.map(m =>
                        m.id === rollToRemove.material_id
                            ? { ...m, loose_stock: m.loose_stock + returnedLength }
                            : m
                    ));
                    // Also persist to localStorage cache
                    warehouseLocalCache.adjustLooseStock(companyId!, warehouseId, rollToRemove.material_id, returnedLength);
                }

                toast.success(tl(
                    `🗑️ تم حذف الرولون ${rollToRemove?.roll_number || ''} وإرجاع الكمية للمخزون السائب`,
                    `🗑️ Deleted ${rollToRemove?.roll_number || ''} — returned to loose stock`
                ));

                // ☁️ DELAYED BACKGROUND: Give DB time to process before re-syncing
                setTimeout(() => refreshLooseMaterials(), 3000);
            } else {
                toast.error(tl('❌ فشل حذف الرولون من قاعدة البيانات', '❌ Failed to delete roll from database'));
            }
        }
    }, [selectedRolls, refreshLooseMaterials, tl]);

    // ═══ Notify parent + save directly to Supabase ═══
    const prevRollCountRef = React.useRef(selectedRolls.length);

    // Determine target table: stock_transfers (for transfer delivery) or sales_transactions (default)
    const saveTarget = data?._saveTarget || 'sales_transactions';
    const isTransferMode = saveTarget === 'stock_transfers';

    const notifyParent = useCallback((rolls: FabricRoll[]) => {
        const update = {
            selected_rolls: rolls,
            rolls_count: rolls.length,
            total_length: rolls.reduce((s, r) => s + (r.net_length || r.current_length || 0), 0),
        };
        onChange(update);

        // Skip DB writes in view mode (e.g. shipped transfers)
        if (data?.view_mode) return;

        const invoiceId = data?.id || data?.source_id || data?.transaction_id;
        if (!invoiceId) return;

        const draft = {
            rolls: rolls.map(r => ({
                id: r.id,
                roll_number: r.roll_number,
                material_id: r.material_id,
                color_id: r.color_id,
                color_name: r.color_name,
                current_length: r.current_length,
                net_length: r.net_length || r.current_length,
                available_length: r.available_length,
                status: r.status,
                warehouse_id: r.warehouse_id,
                barcode: r.barcode,
                _isJIT: r._isJIT || jitCreatedIdsRef.current.has(r.id) || false,
            })),
            warehouse_id: warehouseId,
            saved_at: new Date().toISOString(),
        };

        const draftKeyPrefix = isTransferMode ? 'transfer_delivery_draft_' : 'delivery_draft_';
        try {
            localStorage.setItem(`${draftKeyPrefix}${invoiceId}`, JSON.stringify(draft));
        } catch { /* ignore */ }

        const updates: any = {
            delivery_draft: rolls.length > 0 ? draft : null,
            updated_at: new Date().toISOString(),
        };

        // Stage/Status field depends on target table
        const statusField = isTransferMode ? 'status' : 'stage';
        const loadingStatus = isTransferMode ? 'loading' : 'in_delivery';
        const confirmedStatus = 'confirmed';

        if (rolls.length > 0 && prevRollCountRef.current === 0) {
            updates[statusField] = loadingStatus;
        }
        if (rolls.length === 0 && prevRollCountRef.current > 0) {
            updates[statusField] = confirmedStatus;
            updates.delivery_draft = null;
        }

        prevRollCountRef.current = rolls.length;

        supabase
            .from(saveTarget)
            .update(updates)
            .eq('id', invoiceId)
            .then(({ error }) => {
                if (error) console.warn(`[DirectSave → ${saveTarget}] Error:`, error.message);
            });
    }, [onChange, data?.id, warehouseId, saveTarget, isTransferMode]);

    // ═══ Scan QR/RFID/Roll Number ═══
    const handleScan = useCallback(async () => {
        const query = scanInput.trim();
        if (!query || !warehouseId) return;

        setScanLoading(true);
        setScanMessage(null);
        try {
            let roll: FabricRoll | null = null;

            for (const field of ['roll_number', 'qr_code', 'rfid_tag', 'barcode']) {
                if (roll) break;
                const { data: found } = await supabase
                    .from('fabric_rolls')
                    .select('id, roll_number, material_id, color_id, current_length, available_length, initial_length, status, warehouse_id, qr_code, rfid_tag, barcode, fabric_colors!color_id(name_ar, name_en)')
                    .eq(field, query)
                    .eq('warehouse_id', warehouseId)
                    .maybeSingle();
                if (found) {
                    roll = {
                        ...found,
                        color_name: (found as any).fabric_colors?.name_ar || (found as any).fabric_colors?.name_en || '',
                        net_length: Number(found.current_length) || 0,
                    } as FabricRoll;
                }
            }

            if (!roll) {
                setScanMessage({ type: 'error', text: tl('❌ الرولون غير موجود في هذا المستودع', '❌ Roll not found in this warehouse') });
                return;
            }

            if (roll.status !== 'available') {
                setScanMessage({ type: 'error', text: tl(`❌ الرولون ${roll.roll_number} غير متاح — الحالة: ${roll.status}`, `❌ Roll ${roll.roll_number} not available — status: ${roll.status}`) });
                return;
            }

            if (selectedRolls.some(r => r.id === roll!.id)) {
                setScanMessage({ type: 'info', text: tl('⚠️ هذا الرولون مضاف بالفعل', '⚠️ Roll already added') });
                return;
            }

            const matchingItem = sourceItems.find(si => si.material_id === roll!.material_id);
            if (!matchingItem) {
                setScanMessage({ type: 'error', text: tl('❌ هذا الرولون لا ينتمي لأي مادة في الفاتورة', '❌ This roll does not match any material in the invoice') });
                return;
            }

            addRoll(roll);
            setScanInput('');
            setScanMessage({ type: 'success', text: tl(`✅ تم إضافة ${roll.roll_number} (${roll.net_length} م)`, `✅ Added ${roll.roll_number} (${roll.net_length}m)`) });
            setTimeout(() => setScanMessage(null), 3000);
        } catch (err) {
            console.error('Scan error:', err);
            setScanMessage({ type: 'error', text: tl('❌ خطأ في البحث', '❌ Search error') });
        } finally {
            setScanLoading(false);
        }
    }, [scanInput, warehouseId, selectedRolls, sourceItems, addRoll, tl]);

    const handleScanKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScan();
        }
    };

    // ═══ Computed: selected rolls per material ═══
    const selectedByMaterial = useMemo(() => {
        const map: Record<string, FabricRoll[]> = {};
        for (const roll of selectedRolls) {
            if (!map[roll.material_id]) map[roll.material_id] = [];
            map[roll.material_id].push(roll);
        }
        return map;
    }, [selectedRolls]);

    // ═══ Total stats ═══
    const totalStats = useMemo(() => {
        const expectedMeters = sourceItems.reduce((s, si) => s + (Number(si.quantity) || 0), 0);
        const selectedMeters = selectedRolls.reduce((s, r) => s + (r.net_length || 0), 0);
        const percent = expectedMeters > 0 ? Math.min(100, (selectedMeters / expectedMeters) * 100) : 0;
        return {
            expectedMeters,
            selectedMeters,
            percent: Math.round(percent * 10) / 10,
            rollCount: selectedRolls.length,
            isComplete: percent >= 99,
        };
    }, [sourceItems, selectedRolls]);

    return (
        <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══ 1. Scanner Bar — hidden in viewMode ═══ */}
            {!isViewMode && (
                <div className="px-4 py-3 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border-b">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-rose-500 shrink-0" />
                        <Input
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            onKeyDown={handleScanKeyDown}
                            placeholder={tl('امسح الباركود أو أدخل رقم الرولون...', 'Scan barcode or enter roll number...')}
                            className="flex-1 h-9 text-sm bg-white dark:bg-slate-800"
                            autoFocus
                        />
                        <Button
                            size="sm"
                            onClick={handleScan}
                            disabled={scanLoading || !scanInput.trim()}
                            className="h-9 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white"
                        >
                            {scanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            {tl('بحث', 'Search')}
                        </Button>
                    </div>
                    {scanMessage && (
                        <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium ${scanMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            scanMessage.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                            {scanMessage.text}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Loose Stock Toggle + Collapsible Section ═══ */}
            {!isViewMode && (
                <>
                    {/* Toggle Button — always visible */}
                    <button
                        onClick={toggleLooseSection}
                        className="w-full px-4 py-1.5 border-b border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 flex items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-start"
                    >
                        <Ruler className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            {tl('إنشاء من السائب', 'Create from Loose')}
                        </span>
                        <Badge variant="outline" className="text-[8px] h-[14px] px-1 bg-amber-100/50 text-amber-500 border-amber-200">
                            JIT
                        </Badge>
                        <div className="flex-1" />
                        {showLooseSection
                            ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                        }
                    </button>

                    {/* Collapsible content */}
                    {showLooseSection && (
                        <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-b border-amber-200/50">
                            <div className="flex items-center gap-2 mb-2">
                                {loadingLooseMats && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                                {!loadingLooseMats && looseMaterials.length === 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {tl('لا توجد مواد بمخزون سائب', 'No materials with loose stock')}
                                    </span>
                                )}
                                {selectedLooseMat && (
                                    <Badge variant="secondary" className="text-[9px] h-4 bg-amber-200/50 text-amber-700">
                                        {tl(`المتاح: ${selectedLooseMat.loose_stock.toFixed(1)} م`, `Available: ${selectedLooseMat.loose_stock.toFixed(1)}m`)}
                                    </Badge>
                                )}
                                <div className="flex-1" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllLooseMats(!showAllLooseMats)}
                                    className={`h-6 text-[10px] px-2 ${showAllLooseMats ? 'bg-amber-100 text-amber-700' : 'text-amber-600 hover:bg-amber-100 hover:text-amber-700'}`}
                                >
                                    {showAllLooseMats ? tl('المواد المطلوبة فقط', 'Required only') : tl('كل المواد', 'All materials')}
                                </Button>
                            </div>
                            {filteredLooseMats.length > 0 && (
                                <div className="flex items-end gap-2 flex-wrap">
                                    {/* Material */}
                                    <div className="flex-1 min-w-[140px] space-y-1">
                                        <Label className="text-[10px] text-amber-600">{tl('المادة', 'Material')}</Label>
                                        <Select value={looseMatId} onValueChange={(v) => { setLooseMatId(v); setLooseColorName(''); setLooseColorId(''); }}>
                                            <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-800 border-amber-200">
                                                <SelectValue placeholder={tl('اختر المادة...', 'Select material...')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredLooseMats.map(m => (
                                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                                        <div className="flex items-center justify-between w-full gap-2">
                                                            <span>{language === 'ar' ? (m.name_ar || m.name_en) : (m.name_en || m.name_ar)}</span>
                                                            <span className="text-[10px] text-amber-600 font-mono">
                                                                ({m.loose_stock.toFixed(1)} {tl('م', 'm')})
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Color */}
                                    {looseColorOptions.length > 0 ? (
                                        <div className="min-w-[120px] space-y-1">
                                            <Label className="text-[10px] text-amber-600">{tl('اللون', 'Color')}</Label>
                                            <Select value={looseColorName} onValueChange={(v) => {
                                                setLooseColorName(v);
                                                const opt = looseColorOptions.find(o => o.name === v);
                                                setLooseColorId(opt?.id || '');
                                            }}>
                                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-800">
                                                    <SelectValue placeholder={tl('اللون...', 'Color...')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {looseColorOptions.map(c => (
                                                        <SelectItem key={c.name} value={c.name} className="text-xs">
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : looseMatId ? (
                                        <div className="min-w-[120px] space-y-1">
                                            <Label className="text-[10px] text-amber-600">{tl('اللون', 'Color')}</Label>
                                            <Input
                                                value={looseColorName}
                                                onChange={(e) => setLooseColorName(e.target.value)}
                                                placeholder={tl('اسم اللون...', 'Color name...')}
                                                className="h-9 text-xs bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                    ) : null}
                                    {/* Length */}
                                    <div className="w-[100px] space-y-1">
                                        <Label className="text-[10px] text-amber-600">{tl('الطول (م)', 'Length (m)')}</Label>
                                        <Input
                                            ref={looseLengthRef}
                                            type="text"
                                            inputMode="decimal"
                                            value={looseLength}
                                            onChange={(e) => {
                                                // Normalize Arabic/Persian numerals → English
                                                const normalized = normalizeNumerals(e.target.value);
                                                // Allow only valid decimal input
                                                if (normalized === '' || /^\d*\.?\d*$/.test(normalized)) {
                                                    setLooseLength(normalized);
                                                }
                                            }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLooseRoll(); } }}
                                            placeholder="0.0"
                                            className="h-9 text-xs font-mono bg-white dark:bg-slate-800 text-center"
                                        />
                                    </div>
                                    {/* Create Button */}
                                    <Button
                                        size="sm"
                                        disabled={!looseMatId || !looseLength || Number(looseLength) <= 0 || looseCreating}
                                        onClick={handleCreateLooseRoll}
                                        className="h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                    >
                                        {looseCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        {tl('إنشاء وتسليم', 'Create & Deliver')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ═══ viewMode: Delivered banner ═══ */}
            {isViewMode && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border-b border-teal-100 dark:border-teal-900 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                        {tl('وضع العرض — الرولونات المسلّمة فعلياً', 'View Mode — Actually Delivered Rolls')}
                    </span>
                    <Badge className="ms-auto text-[10px] bg-teal-100 text-teal-700 border-teal-200">
                        {selectedRolls.length} {tl('رولون', 'rolls')}
                    </Badge>
                </div>
            )}

            {/* ═══ 1.5 Invoice Summary (compact) ═══ */}
            {data && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b border-blue-100 dark:border-blue-900 flex items-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">{tl('الفاتورة:', 'Invoice:')}</span>
                        <span className="font-mono font-bold text-rose-600">
                            {data.invoice_no || data.draft_no || '—'}
                        </span>
                    </div>
                    {data.customer_name && (
                        <>
                            <span className="text-gray-300">|</span>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400">{tl('العميل:', 'Customer:')}</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{data.customer_name}</span>
                            </div>
                        </>
                    )}
                    {data.grand_total && (
                        <>
                            <span className="text-gray-300">|</span>
                            <span className="font-mono font-bold text-blue-600">{Number(data.grand_total).toLocaleString()}</span>
                        </>
                    )}
                </div>
            )}

            {/* ═══ 2. Materials List (scrollable) ═══ */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {sourceItems.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{tl('لا توجد بنود في الفاتورة', 'No items in the invoice')}</p>
                        <p className="text-xs mt-1 text-gray-300">{tl('تأكد من أن الفاتورة تحتوي على بنود', 'Make sure invoice has items')}</p>
                    </div>
                ) : (
                    sourceItems.map((item) => {
                        const matId = item.material_id;
                        const isExpanded = expandedItemId === item.id;
                        const materialRolls = availableRolls[matId] || [];
                        const deliveredRolls = selectedByMaterial[matId] || [];
                        const deliveredLength = deliveredRolls.reduce((s, r) => s + (r.net_length || 0), 0);
                        const isLoading = loadingRolls[matId];
                        const fulfillmentPct = item.quantity > 0 ? (deliveredLength / item.quantity) * 100 : 0;
                        const isFulfilled = fulfillmentPct >= 99;

                        return (
                            <div key={item.id} className={`border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all ${isExpanded ? 'ring-2 ring-rose-200 dark:ring-rose-800' : ''}`}>
                                {/* Material Header */}
                                <button
                                    onClick={() => toggleItem(item)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors text-start"
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isFulfilled ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                                        deliveredRolls.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                            'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                        }`}>
                                        {isFulfilled ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm truncate">
                                            {item.material_name_ar || item.material_name || item.description || item.id?.substring(0, 8)}
                                        </div>
                                        {item.color_name && (
                                            <Badge variant="outline" className="h-4 text-[9px] px-1.5 bg-gray-50 mt-0.5">
                                                {item.color_name}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs">
                                        <div className="text-center min-w-[50px]">
                                            <div className="text-[10px] text-gray-400 uppercase">{tl('المطلوب', 'Required')}</div>
                                            <div className="font-bold font-mono text-sm text-gray-800 dark:text-gray-200">
                                                {item.quantity} <span className="text-[10px] text-gray-400">م</span>
                                            </div>
                                        </div>
                                        <div className="text-center min-w-[50px]">
                                            <div className="text-[10px] text-gray-400 uppercase">{tl('المسلّم', 'Delivered')}</div>
                                            <div className={`font-bold font-mono text-sm ${isFulfilled ? 'text-green-600' : deliveredRolls.length > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                                                {deliveredLength.toFixed(1)} <span className="text-[10px] text-gray-400">م</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`text-[10px] ${isFulfilled ? 'bg-green-50 text-green-600 border-green-200' : deliveredRolls.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-gray-400'}`}>
                                            <Cylinder className="w-3 h-3 me-0.5" />
                                            {deliveredRolls.length}
                                        </Badge>
                                    </div>

                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                                </button>

                                {/* Progress Bar */}
                                <div className="px-4 pb-1">
                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ease-out ${isFulfilled ? 'bg-gradient-to-r from-green-400 to-emerald-500' : deliveredRolls.length > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                            style={{ width: `${Math.min(fulfillmentPct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5 text-end font-mono">{fulfillmentPct.toFixed(0)}%</div>
                                </div>

                                {/* Roll Chips */}
                                {deliveredRolls.length > 0 && (
                                    <div className="px-4 pb-3">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <PackageCheck className="w-3 h-3 text-green-500" />
                                            <span className="text-[10px] font-medium text-green-700 dark:text-green-400">
                                                {isViewMode ? tl('رولونات مُسلّمة', 'Delivered Rolls') : tl('رولونات مُختارة', 'Selected Rolls')}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] h-4 bg-green-50 text-green-600 border-green-200">
                                                {deliveredRolls.length}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {deliveredRolls.map(roll => {
                                                const isJIT = roll._isJIT || jitCreatedIdsRef.current.has(roll.id);
                                                return (
                                                    <div
                                                        key={roll.id}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors group ${
                                                            isJIT
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                                        }`}
                                                    >
                                                        {isJIT && (
                                                            <span className="text-[8px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1 rounded">JIT</span>
                                                        )}
                                                        <span className="font-mono font-bold">({(roll.net_length || 0).toFixed(1)})</span>
                                                        <span className="font-mono">{roll.roll_number}</span>
                                                        {!isViewMode && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeRoll(roll.id); }}
                                                                className={`w-3.5 h-3.5 flex items-center justify-center rounded-full hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-60 group-hover:opacity-100 ${
                                                                    isJIT ? 'text-amber-500' : 'text-green-500'
                                                                }`}
                                                                title={isJIT ? tl('حذف الرولون المؤقت', 'Delete temporary roll') : tl('إزالة من التسليم', 'Remove from delivery')}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Roll Browser (edit mode only) */}
                                {isExpanded && !isViewMode && (
                                    <div className="border-t bg-gray-50/50 dark:bg-slate-800/30">
                                        <RollBrowser
                                            materialRolls={materialRolls.filter(r => !selectedRolls.some(sr => sr.id === r.id))}
                                            isLoading={isLoading || false}
                                            selectedRolls={selectedRolls}
                                            onAddRoll={addRoll}
                                            tl={tl}
                                            isRTL={isRTL}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ═══ 3. Bottom Summary Bar ═══ */}
            <div className="border-t px-4 py-3 bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] text-gray-500 font-medium shrink-0 w-16">{tl('التقدم', 'Progress')}</span>
                    <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${totalStats.isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : totalStats.rollCount > 0 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            style={{ width: `${totalStats.percent}%` }}
                        />
                    </div>
                    <span className={`text-sm font-bold font-mono min-w-[40px] text-end ${totalStats.isComplete ? 'text-green-600' : 'text-rose-600'}`}>
                        {totalStats.percent.toFixed(0)}%
                    </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Cylinder className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-gray-500">{tl('رولونات:', 'Rolls:')}</span>
                            <span className="font-bold font-mono text-rose-600">{totalStats.rollCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">{tl('المسلّم:', 'Delivered:')}</span>
                            <span className="font-bold font-mono text-gray-700 dark:text-gray-300">
                                {totalStats.selectedMeters.toFixed(1)} / {totalStats.expectedMeters.toFixed(1)} م
                            </span>
                        </div>
                    </div>

                    {totalStats.rollCount > 0 && !totalStats.isComplete && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 gap-1">
                            <Info className="w-3 h-3" />
                            {tl('تسليم جزئي', 'Partial Delivery')}
                        </Badge>
                    )}
                    {totalStats.isComplete && (
                        <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {tl('تسليم مكتمل', 'Complete')}
                        </Badge>
                    )}
                </div>
            </div>

            {/* ═══ JIT Roll Label Preview Dialog ═══ */}
            <RollLabelPreviewDialog
                open={showJITPreview}
                onOpenChange={handleCancelJITRoll}
                rollData={pendingJITLabel}
                onConfirm={handleConfirmJITRoll}
                loading={false}
                defaultPrint={true}
                context="delivery"
            />
        </div>
    );
}

export default SalesDeliveryItemsTab;
