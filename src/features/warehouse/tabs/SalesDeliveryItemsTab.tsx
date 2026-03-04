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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Package, ChevronDown, ChevronUp, CheckCircle2,
    ScanLine, Trash2, Loader2, AlertTriangle, Search,
    PackageCheck, Cylinder, Info, Plus, Palette, Filter,
} from 'lucide-react';

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
}

export function SalesDeliveryItemsTab({ data, mode, onChange }: SalesDeliveryItemsTabProps) {
    const { language, isRTL } = useLanguage();
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

    // ═══ Sync selectedRolls when parent restores draft OR delivered rolls ═══
    useEffect(() => {
        const parentRolls = data?.selected_rolls;
        if (parentRolls && parentRolls.length > 0 && selectedRolls.length === 0) {
            console.log(`[ItemsTab] 📂 Syncing ${parentRolls.length} rolls from parent`);
            setSelectedRolls(parentRolls);
        }
    }, [data?.selected_rolls]);

    // Source document items
    const sourceItems: InvoiceItem[] = useMemo(() => {
        return data?.source_items || data?.source_document?.items || [];
    }, [data?.source_items, data?.source_document?.items]);

    const warehouseId = data?.warehouse_id;

    // ═══ Fetch available rolls for a material (only in edit mode) ═══
    const fetchRollsForMaterial = useCallback(async (materialId: string) => {
        if (!materialId || !warehouseId || isViewMode) return;
        setLoadingRolls(prev => ({ ...prev, [materialId]: true }));

        try {
            const { data: rolls, error } = await supabase
                .from('fabric_rolls')
                .select('id, roll_number, material_id, color_id, current_length, available_length, initial_length, status, warehouse_id, qr_code, rfid_tag, barcode, fabric_colors!color_id(name_ar, name_en)')
                .eq('material_id', materialId)
                .eq('warehouse_id', warehouseId)
                .eq('status', 'available')
                .order('roll_number');

            if (error) {
                console.warn('fetchRollsForMaterial error:', error.message);
            } else {
                const mapped = (rolls || []).map((r: any) => ({
                    ...r,
                    color_name: r.fabric_colors?.name_ar || r.fabric_colors?.name_en || '',
                    net_length: Number(r.current_length) || 0,
                    fabric_colors: undefined,
                }));
                setAvailableRolls(prev => ({ ...prev, [materialId]: mapped }));
            }
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

    // ═══ Remove roll from selection ═══
    const removeRoll = useCallback((rollId: string) => {
        const updated = selectedRolls.filter(r => r.id !== rollId);
        setSelectedRolls(updated);
        notifyParent(updated);
    }, [selectedRolls]);

    // ═══ Notify parent + save directly to Supabase ═══
    const prevRollCountRef = React.useRef(selectedRolls.length);

    const notifyParent = useCallback((rolls: FabricRoll[]) => {
        const update = {
            selected_rolls: rolls,
            rolls_count: rolls.length,
            total_length: rolls.reduce((s, r) => s + (r.net_length || r.current_length || 0), 0),
        };
        onChange(update);

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
            })),
            warehouse_id: warehouseId,
            saved_at: new Date().toISOString(),
        };

        try {
            localStorage.setItem(`delivery_draft_${invoiceId}`, JSON.stringify(draft));
        } catch { /* ignore */ }

        const updates: any = {
            delivery_draft: rolls.length > 0 ? draft : null,
            updated_at: new Date().toISOString(),
        };

        if (rolls.length > 0 && prevRollCountRef.current === 0) {
            updates.stage = 'in_delivery';
        }
        if (rolls.length === 0 && prevRollCountRef.current > 0) {
            updates.stage = 'confirmed';
            updates.delivery_draft = null;
        }

        prevRollCountRef.current = rolls.length;

        supabase
            .from('sales_transactions')
            .update(updates)
            .eq('id', invoiceId)
            .then(({ error }) => {
                if (error) console.warn('[DirectSave] Error:', error.message);
            });
    }, [onChange, data?.id, warehouseId]);

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
                                            {deliveredRolls.map(roll => (
                                                <div
                                                    key={roll.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 transition-colors group"
                                                >
                                                    <span className="font-mono font-bold">({(roll.net_length || 0).toFixed(1)})</span>
                                                    <span className="font-mono">{roll.roll_number}</span>
                                                    {!isViewMode && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeRoll(roll.id); }}
                                                            className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-green-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-60 group-hover:opacity-100"
                                                            title={tl('إزالة', 'Remove')}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Roll Browser (edit mode only) */}
                                {isExpanded && !isViewMode && (
                                    <div className="border-t bg-gray-50/50 dark:bg-slate-800/30">
                                        <RollBrowser
                                            materialRolls={materialRolls}
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
        </div>
    );
}

export default SalesDeliveryItemsTab;
