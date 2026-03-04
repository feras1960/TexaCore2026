/**
 * ════════════════════════════════════════════════════════════════
 * 📍 Warehouse Locations — إدارة مواقع التخزين في المستودعات
 * ════════════════════════════════════════════════════════════════
 *
 * يتيح تعريف تقسيمات المستودعات (Bins / Shelves)
 * بنظام الصف × العمود × الرف (Row × Column × Shelf)
 * مع عرض رسومي للخريطة + عدد الرولونات في كل موقع
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { warehouseService } from '@/services/warehouseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    MapPin,
    Plus,
    RefreshCw,
    Warehouse as WarehouseIcon,
    Layers,
    Edit2,
    Trash2,
    Package,
    Loader2,
    Grid3X3,
    LayoutGrid,
    List,
    Map,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    HelpCircle,
    ArrowDown,
    SlidersHorizontal,
    X,
    Circle,
    Filter,
    ChevronDown,
    Check,
} from 'lucide-react';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { WarehouseMap } from '../components/WarehouseMap';
import { WarehouseDetailSheet, type BinSelection } from '../components/WarehouseDetailSheet';
import { supabase } from '@/lib/supabase';


// ─── Types ─────────────────────────────────────────────────────
interface BinLocation {
    id: string;
    warehouse_id: string;
    code: string;
    name?: string;
    name_ar?: string;
    name_en?: string;
    row_code?: string;
    column_code?: string;
    shelf_code?: string;
    capacity_rolls?: number;
    current_rolls_count?: number;
    is_active?: boolean;
    description?: string;
}

interface Warehouse {
    id: string;
    name_ar: string;
    name_en?: string;
}

type ViewMode = 'grid' | 'list' | 'map';

// ─── Material filter types ─────────────────────────────────────
interface MaterialOption {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
}

// ─── Helpers ───────────────────────────────────────────────────
function getCapacityPct(bin: BinLocation) {
    if (!bin.capacity_rolls || bin.capacity_rolls === 0) return null;
    return Math.min(((bin.current_rolls_count || 0) / bin.capacity_rolls) * 100, 100);
}

function CapacityBar({ pct }: { pct: number | null }) {
    if (pct === null) return null;
    const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1.5">
            <div className={cn('h-1 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
        </div>
    );
}

// ─── Batch Generate Dialog (Smart Mode) ────────────────────────

type NumberingType = 'letters' | 'numbers';
type PaddingType = '1' | '2' | '3';

function generateValues(count: number, type: NumberingType, startFrom: number, padding: PaddingType): string[] {
    const pad = (n: number) => String(n).padStart(parseInt(padding), '0');
    return Array.from({ length: count }, (_, i) => {
        const idx = startFrom + i;
        if (type === 'letters') {
            // A=1, B=2... Z=26, AA=27...
            let result = '';
            let n = idx;
            while (n > 0) {
                n--;
                result = String.fromCharCode(65 + (n % 26)) + result;
                n = Math.floor(n / 26);
            }
            return result;
        }
        return pad(idx);
    });
}

function DimConfig({
    label, count, setCount, type, setType, start, setStart, padding, setPadding, isRTL, preview,
}: {
    label: string; count: number; setCount: (n: number) => void;
    type: NumberingType; setType: (t: NumberingType) => void;
    start: number; setStart: (n: number) => void;
    padding: PaddingType; setPadding: (p: PaddingType) => void;
    isRTL: boolean; preview: string[];
}) {
    const T = (ar: string, en: string) => (isRTL ? ar : en);
    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-0.5">
                    <button
                        onClick={() => setType('letters')}
                        className={cn('px-2 py-1 rounded-md text-[10px] font-bold transition-colors', type === 'letters' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700')}
                    >A, B, C</button>
                    <button
                        onClick={() => setType('numbers')}
                        className={cn('px-2 py-1 rounded-md text-[10px] font-bold transition-colors', type === 'numbers' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700')}
                    >1, 2, 3</button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {/* Count */}
                <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-1">{T('العدد', 'Count')}</p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCount(Math.max(1, count - 1))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 text-sm font-bold flex items-center justify-center">−</button>
                        <span className="w-8 text-center font-mono font-bold text-sm text-gray-900 dark:text-gray-100">{count}</span>
                        <button onClick={() => setCount(Math.min(50, count + 1))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 text-sm font-bold flex items-center justify-center">+</button>
                    </div>
                </div>
                {/* Start from */}
                <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-1">{T('يبدأ من', 'Start at')}</p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setStart(Math.max(1, start - 1))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 text-sm font-bold flex items-center justify-center">−</button>
                        <span className="w-8 text-center font-mono font-bold text-sm text-gray-900 dark:text-gray-100">{type === 'letters' ? generateValues(1, 'letters', start, '1')[0] : String(start).padStart(parseInt(padding), '0')}</span>
                        <button onClick={() => setStart(start + 1)} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 text-sm font-bold flex items-center justify-center">+</button>
                    </div>
                </div>
                {/* Padding (numbers only) */}
                {type === 'numbers' && (
                    <div className="flex-1">
                        <p className="text-[10px] text-gray-400 mb-1">{T('الأصفار', 'Zeros')}</p>
                        <div className="flex items-center gap-0.5">
                            {(['1', '2', '3'] as PaddingType[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPadding(p)}
                                    className={cn('flex-1 h-6 rounded-md text-[10px] font-mono font-bold transition-colors', padding === p ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300')}
                                >
                                    {p === '1' ? '1' : p === '2' ? '01' : '001'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* Mini preview */}
            <div className="flex gap-1 flex-wrap">
                {preview.slice(0, 6).map(v => (
                    <span key={v} className="font-mono text-[10px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">{v}</span>
                ))}
                {preview.length > 6 && <span className="text-[10px] text-gray-400">+{preview.length - 6}</span>}
            </div>
        </div>
    );
}

function BatchGenerateDialog({
    open, onClose, warehouseId, companyId, tenantId, onGenerated, isRTL,
}: {
    open: boolean; onClose: () => void; warehouseId: string;
    companyId: string; tenantId: string; onGenerated: () => void; isRTL: boolean;
}) {
    const T = (ar: string, en: string) => (isRTL ? ar : en);

    // ─── Row config ─────────────────────────
    const [rowCount, setRowCount] = useState(3);
    const [rowType, setRowType] = useState<NumberingType>('letters');
    const [rowStart, setRowStart] = useState(1);
    const [rowPad, setRowPad] = useState<PaddingType>('1');

    // ─── Column config ──────────────────────
    const [colCount, setColCount] = useState(5);
    const [colType, setColType] = useState<NumberingType>('numbers');
    const [colStart, setColStart] = useState(1);
    const [colPad, setColPad] = useState<PaddingType>('2');

    // ─── Shelf config ───────────────────────
    const [shelfCount, setShelfCount] = useState(3);
    const [shelfType, setShelfType] = useState<NumberingType>('numbers');
    const [shelfStart, setShelfStart] = useState(1);
    const [shelfPad, setShelfPad] = useState<PaddingType>('3');

    // ─── Capacity ────────────────────────────
    const [capacity, setCapacity] = useState('20');
    const [saving, setSaving] = useState(false);

    // ─── Generate arrays ────────────────────
    const rows = useMemo(() => generateValues(rowCount, rowType, rowStart, rowPad), [rowCount, rowType, rowStart, rowPad]);
    const cols = useMemo(() => generateValues(colCount, colType, colStart, colPad), [colCount, colType, colStart, colPad]);
    const shelves = useMemo(() => generateValues(shelfCount, shelfType, shelfStart, shelfPad), [shelfCount, shelfType, shelfStart, shelfPad]);
    const total = rows.length * cols.length * shelves.length;

    // Preview: first 12 codes
    const previewCodes = useMemo(() => {
        const codes: string[] = [];
        for (const r of rows) {
            for (const c of cols) {
                for (const s of shelves) {
                    codes.push(`${r}-${c}-${s}`);
                    if (codes.length >= 12) break;
                }
                if (codes.length >= 12) break;
            }
            if (codes.length >= 12) break;
        }
        return codes;
    }, [rows, cols, shelves]);

    const handleGenerate = async () => {
        setSaving(true);
        let created = 0;
        try {
            for (const row of rows) {
                for (const col of cols) {
                    for (const shelf of shelves) {
                        try {
                            await warehouseService.createBinLocation(companyId, tenantId, {
                                warehouse_id: warehouseId,
                                code: `${row}-${col}-${shelf}`,
                                row_code: row,
                                column_code: col,
                                shelf_code: shelf,
                                capacity_rolls: capacity ? parseInt(capacity) : undefined,
                            });
                            created++;
                        } catch { /* skip duplicates */ }
                    }
                }
            }
            toast.success(T(`تم إنشاء ${created} موقع بنجاح 🚀`, `Created ${created} locations 🚀`));
            onGenerated();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl" dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Grid3X3 className="w-5 h-5 text-purple-500" />
                        {T('توليد مواقع المستودع تلقائياً', 'Auto-Generate Warehouse Locations')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-1">
                    {/* Row / Column / Shelf configs */}
                    <DimConfig
                        label={T('📍 الصفوف (الممرات)', '📍 Rows (Aisles)')}
                        count={rowCount} setCount={setRowCount}
                        type={rowType} setType={setRowType}
                        start={rowStart} setStart={setRowStart}
                        padding={rowPad} setPadding={setRowPad}
                        isRTL={isRTL} preview={rows}
                    />
                    <DimConfig
                        label={T('🔢 الأعمدة (حوامل الرفوف)', '🔢 Columns (Rack Positions)')}
                        count={colCount} setCount={setColCount}
                        type={colType} setType={setColType}
                        start={colStart} setStart={setColStart}
                        padding={colPad} setPadding={setColPad}
                        isRTL={isRTL} preview={cols}
                    />
                    <DimConfig
                        label={T('🗂️ الرفوف (الطوابق)', '🗂️ Shelves (Levels)')}
                        count={shelfCount} setCount={setShelfCount}
                        type={shelfType} setType={setShelfType}
                        start={shelfStart} setStart={setShelfStart}
                        padding={shelfPad} setPadding={setShelfPad}
                        isRTL={isRTL} preview={shelves}
                    />

                    {/* Capacity */}
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
                            {T('السعة القصوى لكل موقع (رولونات)', 'Max capacity per location (rolls)')}
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCapacity(v => String(Math.max(1, parseInt(v || '1') - 1)))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 font-bold flex items-center justify-center">−</button>
                            <span className="w-10 text-center font-mono font-bold text-sm text-gray-900 dark:text-gray-100">{capacity || '∞'}</span>
                            <button onClick={() => setCapacity(v => String(parseInt(v || '0') + 1))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 font-bold flex items-center justify-center">+</button>
                        </div>
                    </div>

                    {/* Code preview */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{T('معاينة الكودات', 'Code Preview')}</span>
                            <Badge className="bg-blue-600 text-white text-xs">
                                {T(`${total} موقع`, `${total} locations`)}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {previewCodes.map(code => (
                                <span key={code} className="font-mono text-[10px] bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">{code}</span>
                            ))}
                            {total > 12 && <span className="text-[10px] text-blue-400">… +{total - 12} {T('أكثر', 'more')}</span>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>{T('إلغاء', 'Cancel')}</Button>
                    <Button size="sm" onClick={handleGenerate} disabled={saving || total === 0} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
                        {saving
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{T('جارٍ الإنشاء...', 'Generating...')}</>
                            : <><CheckCircle2 className="w-3.5 h-3.5" />{T(`إنشاء ${total} موقع 🚀`, `Generate ${total} locations 🚀`)}</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

}

// ─── Main Page ─────────────────────────────────────────────────
export default function WarehouseLocationsPage() {
    const { language, direction } = useLanguage();
    const { company, companyId } = useCompany();
    const tenantId = (company as any)?.tenant_id || '';
    const isRTL = language === 'ar';
    const t = (ar: string, en: string) => (isRTL ? ar : en);

    // ─── State ───────────────────────────────────────────────
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [bins, setBins] = useState<BinLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    // ─── Advanced Filters ──────────────────────────────────────
    type OccupancyFilter = 'all' | 'empty' | 'partial' | 'full';
    const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>(() =>
        (localStorage.getItem('wh_occ_filter') as OccupancyFilter) || 'all'
    );
    const [filterRow, setFilterRow] = useState<string | null>(() =>
        localStorage.getItem('wh_row_filter') || null
    );
    const [filterCol, setFilterCol] = useState<string | null>(() =>
        localStorage.getItem('wh_col_filter') || null
    );
    const [materialPopoverOpen, setMaterialPopoverOpen] = useState(false);
    const [occupancyPopoverOpen, setOccupancyPopoverOpen] = useState(false);
    const [rowPopoverOpen, setRowPopoverOpen] = useState(false);
    const [colPopoverOpen, setColPopoverOpen] = useState(false);

    // Persist filters
    useEffect(() => { localStorage.setItem('wh_occ_filter', occupancyFilter); }, [occupancyFilter]);
    useEffect(() => { localStorage.setItem('wh_row_filter', filterRow || ''); }, [filterRow]);
    useEffect(() => { localStorage.setItem('wh_col_filter', filterCol || ''); }, [filterCol]);

    // Unique rows & cols from bins (for chips)
    const uniqueRows = useMemo(() => [...new Set(bins.map(b => b.row_code).filter(Boolean))].sort() as string[], [bins]);
    const uniqueCols = useMemo(() => [...new Set(bins.map(b => b.column_code).filter(Boolean))].sort() as string[], [bins]);

    // ─── Material filter (fetches roll counts per bin) ─────────
    const [materials, setMaterials] = useState<MaterialOption[]>([]);
    const [filterMaterial, setFilterMaterial] = useState<string | null>(null);
    const [materialSearch, setMaterialSearch] = useState('');
    // materialBinCounts: { binId → rollCount } for the selected material
    const [materialBinCounts, setMaterialBinCounts] = useState<Record<string, number>>({});
    const [loadingMaterialFilter, setLoadingMaterialFilter] = useState(false);

    // Fetch materials list once companyId is ready
    useEffect(() => {
        if (!companyId) return;
        warehouseService.getMaterials(companyId).then((data) => {
            if (data) {
                setMaterials(data.filter((m: any) => !m.is_group).map((m: any) => ({
                    id: m.id,
                    code: m.code || '',
                    name_ar: m.name_ar || '',
                    name_en: m.name_en || '',
                })));
            }
        });
    }, [companyId]);

    // When material filter changes → fetch roll counts per bin
    useEffect(() => {
        if (!filterMaterial || !selectedWarehouse) {
            setMaterialBinCounts({});
            return;
        }
        setLoadingMaterialFilter(true);
        supabase
            .from('fabric_rolls')
            .select('bin_location_id')
            .eq('material_id', filterMaterial)
            .not('bin_location_id', 'is', null)
            .not('status', 'in', '(consumed,sold)')
            .then(({ data }) => {
                const counts: Record<string, number> = {};
                (data || []).forEach((r: any) => {
                    if (r.bin_location_id) {
                        counts[r.bin_location_id] = (counts[r.bin_location_id] || 0) + 1;
                    }
                });
                setMaterialBinCounts(counts);
                setLoadingMaterialFilter(false);
            });
    }, [filterMaterial, selectedWarehouse]);

    // ── Warehouse materials: only materials with rolls in this warehouse ──
    const [warehouseMaterialIds, setWarehouseMaterialIds] = useState<Set<string>>(new Set());
    const [loadingWarehouseMaterials, setLoadingWarehouseMaterials] = useState(false);

    useEffect(() => {
        if (!selectedWarehouse) { setWarehouseMaterialIds(new Set()); return; }
        setLoadingWarehouseMaterials(true);
        supabase
            .from('fabric_rolls')
            .select('material_id, bin_location:bin_locations!bin_location_id(warehouse_id)')
            .not('bin_location_id', 'is', null)
            .not('status', 'in', '(consumed,sold)')
            .then(({ data }) => {
                const ids = new Set<string>();
                (data || []).forEach((r: any) => {
                    if (r.bin_location?.warehouse_id === selectedWarehouse && r.material_id) {
                        ids.add(r.material_id);
                    }
                });
                setWarehouseMaterialIds(ids);
                setLoadingWarehouseMaterials(false);
            });
    }, [selectedWarehouse]);

    // Material combobox: text typed directly
    const [materialInputText, setMaterialInputText] = useState('');

    const selectedMaterial = materials.find(m => m.id === filterMaterial);

    // Only materials that have rolls in the current warehouse
    const warehouseMaterials = useMemo(() =>
        materials.filter(m => warehouseMaterialIds.size === 0 || warehouseMaterialIds.has(m.id)),
        [materials, warehouseMaterialIds]);

    // Combobox dropdown list — filter by what user typed
    const comboboxMaterials = useMemo(() => {
        const q = materialInputText.toLowerCase().trim();
        if (!q) return warehouseMaterials;
        return warehouseMaterials.filter(m =>
            m.name_ar.toLowerCase().includes(q) ||
            (m.name_en && m.name_en.toLowerCase().includes(q)) ||
            m.code.toLowerCase().includes(q)
        );
    }, [warehouseMaterials, materialInputText]);

    // Legacy alias (used in clearAllFilters + filteredBins materialSearch)
    const filteredMaterials = warehouseMaterials;

    const activeFilterCount =
        (occupancyFilter !== 'all' ? 1 : 0) +
        (filterRow ? 1 : 0) +
        (filterCol ? 1 : 0) +
        (filterMaterial ? 1 : 0);

    const clearAllFilters = () => {
        setOccupancyFilter('all');
        setFilterRow(null);
        setFilterCol(null);
        setFilterMaterial(null);
        setMaterialSearch('');
        setMaterialInputText('');
        setSearchQuery('');
    };



    // Dialogs
    const [editDialog, setEditDialog] = useState<{ open: boolean; bin: BinLocation | null }>({ open: false, bin: null });
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; bin: BinLocation | null }>({ open: false, bin: null });
    const [batchDialog, setBatchDialog] = useState(false);
    const [addSingleDialog, setAddSingleDialog] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Single Add/Edit form
    const [formData, setFormData] = useState({
        code: '', name_ar: '', row_code: '', column_code: '', shelf_code: '',
        capacity_rolls: '', description: '',
    });
    const [saving, setSaving] = useState(false);
    const [continueAdding, setContinueAdding] = useState(false);

    // ─── Bin Detail Sheet state ───────────────────────────────
    const [binSelection, setBinSelection] = useState<BinSelection | null>(null);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);

    // Open sheet from WarehouseMap cell/row/col click
    const handleMapCellSelect = useCallback((type: 'cell' | 'row' | 'col', row?: string, col?: string) => {
        const warehouseName = warehouses.find(w => w.id === selectedWarehouse)?.name_ar;
        let selectedBins: BinLocation[] = [];
        if (type === 'cell') {
            selectedBins = bins.filter(b => b.row_code === row && b.column_code === col);
        } else if (type === 'row') {
            selectedBins = bins.filter(b => b.row_code === row);
        } else if (type === 'col') {
            selectedBins = bins.filter(b => b.column_code === col);
        }
        if (selectedBins.length === 0) return;
        setBinSelection({ type, row, col, bins: selectedBins, warehouseName, warehouseId: selectedWarehouse || undefined });
        setDetailSheetOpen(true);
    }, [bins, selectedWarehouse, warehouses]);

    // Open sheet from a single bin (Grid/List view click)
    const openBinSheet = useCallback((bin: BinLocation) => {
        const warehouseName = warehouses.find(w => w.id === selectedWarehouse)?.name_ar;
        setBinSelection({
            type: 'cell',
            row: bin.row_code,
            col: bin.column_code,
            bins: [bin],
            warehouseName,
            warehouseId: selectedWarehouse || undefined,
        });
        setDetailSheetOpen(true);
    }, [bins, selectedWarehouse, warehouses]);

    // Roll details state (for sub-tab inside the sheet)
    const [openedRollId, setOpenedRollId] = useState<string | null>(null);
    const [openedRollNumber, setOpenedRollNumber] = useState<string | null>(null);


    // Auto-generate code from row + col + shelf
    useEffect(() => {
        if (!editDialog.bin) {
            const parts = [formData.row_code, formData.column_code, formData.shelf_code].filter(Boolean);
            if (parts.length > 0) {
                setFormData(prev => ({ ...prev, code: parts.join('-').toUpperCase() }));
            }
        }
    }, [formData.row_code, formData.column_code, formData.shelf_code, editDialog.bin]);

    // Suggest next position from existing bins
    const suggestNextPosition = useCallback(() => {
        if (bins.length === 0) return;
        const lastBin = [...bins].sort((a, b) => b.code.localeCompare(a.code))[0];
        if (!lastBin) return;
        setFormData(prev => ({
            ...prev,
            row_code: lastBin.row_code || '',
            column_code: lastBin.column_code || '',
            // Increment shelf by 1
            shelf_code: lastBin.shelf_code
                ? String(parseInt(lastBin.shelf_code) + 1).padStart(lastBin.shelf_code.length, '0')
                : '',
            capacity_rolls: lastBin.capacity_rolls?.toString() || '',
        }));
    }, [bins]);

    // ─── Load Warehouses ──────────────────────────────────────
    useEffect(() => {
        if (!companyId) return;
        warehouseService.getAll(companyId).then(data => {
            setWarehouses(data);
            if (data.length > 0) setSelectedWarehouse(data[0].id);
        });
    }, [companyId]);

    // ─── Load Bin Locations ───────────────────────────────────
    const loadBins = useCallback(async () => {
        if (!companyId || !selectedWarehouse) return;
        setLoading(true);
        try {
            const data = await warehouseService.getBinLocations(companyId, selectedWarehouse);
            setBins(data);
        } catch (e: any) {
            toast.error(t('فشل تحميل المواقع', 'Failed to load locations'));
        } finally {
            setLoading(false);
        }
    }, [companyId, selectedWarehouse]);

    useEffect(() => { loadBins(); }, [loadBins]);

    // ─── Filter ───────────────────────────────────────────────
    const filteredBins = useMemo(() => bins.filter(b => {
        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matches = b.code.toLowerCase().includes(q)
                || (b.name_ar && b.name_ar.toLowerCase().includes(q))
                || (b.row_code && b.row_code.toLowerCase().includes(q))
                || (b.column_code && b.column_code.toLowerCase().includes(q));
            if (!matches) return false;
        }
        // Row filter
        if (filterRow && b.row_code !== filterRow) return false;
        // Col filter
        if (filterCol && b.column_code !== filterCol) return false;
        // Material filter: only bins with ≥1 roll of the material
        if (filterMaterial) {
            const count = materialBinCounts[b.id] || 0;
            if (count === 0) return false;
        }
        // Occupancy filter (uses material count if material filter active)
        if (occupancyFilter !== 'all') {
            const used = filterMaterial
                ? (materialBinCounts[b.id] || 0)
                : (b.current_rolls_count || 0);
            const cap = b.capacity_rolls || 0;
            if (occupancyFilter === 'empty' && used > 0) return false;
            if (occupancyFilter === 'full' && (cap === 0 || used < cap)) return false;
            if (occupancyFilter === 'partial' && (used === 0 || (cap > 0 && used >= cap))) return false;
        }
        return true;
    }), [bins, searchQuery, filterRow, filterCol, occupancyFilter, filterMaterial, materialBinCounts]);

    // Helper: get display roll count (material-specific or total)
    const getBinDisplayCount = useCallback((bin: BinLocation): number => {
        if (filterMaterial) return materialBinCounts[bin.id] || 0;
        return bin.current_rolls_count || 0;
    }, [filterMaterial, materialBinCounts]);

    // ─── Group by Row ─────────────────────────────────────────
    const groupedByRow = filteredBins.reduce<Record<string, BinLocation[]>>((acc, bin) => {
        const row = bin.row_code || t('غير محدد', 'Unassigned');
        if (!acc[row]) acc[row] = [];
        acc[row].push(bin);
        return acc;
    }, {});

    const selectedWarehouseName = warehouses.find(w => w.id === selectedWarehouse);

    // ─── Save Single Bin ──────────────────────────────────────
    const handleSaveBin = async () => {
        if (!companyId || !formData.code.trim()) return;
        setSaving(true);
        try {
            if (editDialog.bin) {
                // Update
                const { error } = await (await import('@/lib/supabase')).supabase
                    .from('bin_locations')
                    .update({
                        code: formData.code.toUpperCase(),
                        name_ar: formData.name_ar || null,
                        row_code: formData.row_code || null,
                        column_code: formData.column_code || null,
                        shelf_code: formData.shelf_code || null,
                        capacity_rolls: formData.capacity_rolls ? parseInt(formData.capacity_rolls) : null,
                        description: formData.description || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editDialog.bin.id);
                if (error) throw error;
                toast.success(t('تم التحديث بنجاح', 'Updated successfully'));
                setEditDialog({ open: false, bin: null });
            } else {
                // Create
                await warehouseService.createBinLocation(companyId, tenantId, {
                    warehouse_id: selectedWarehouse,
                    code: formData.code.toUpperCase(),
                    name_ar: formData.name_ar || undefined,
                    row_code: formData.row_code || undefined,
                    column_code: formData.column_code || undefined,
                    shelf_code: formData.shelf_code || undefined,
                    capacity_rolls: formData.capacity_rolls ? parseInt(formData.capacity_rolls) : undefined,
                    description: formData.description || undefined,
                });
                toast.success(t('تم إضافة الموقع', 'Location added'));
                if (continueAdding) {
                    // Advance shelf by 1 and keep dialog open
                    setFormData(prev => ({
                        ...prev,
                        shelf_code: prev.shelf_code
                            ? String(parseInt(prev.shelf_code) + 1).padStart(prev.shelf_code.length, '0')
                            : '',
                    }));
                    loadBins();
                } else {
                    setAddSingleDialog(false);
                    setFormData({ code: '', name_ar: '', row_code: '', column_code: '', shelf_code: '', capacity_rolls: '', description: '' });
                    loadBins();
                }
            }
            setFormData({ code: '', name_ar: '', row_code: '', column_code: '', shelf_code: '', capacity_rolls: '', description: '' });
            loadBins();
        } catch (e: any) {
            toast.error(e.message || t('حدث خطأ', 'An error occurred'));
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete Bin ────────────────────────────────────────────
    const handleDeleteBin = async () => {
        if (!deleteConfirm.bin) return;
        try {
            const { error } = await (await import('@/lib/supabase')).supabase
                .from('bin_locations')
                .delete()
                .eq('id', deleteConfirm.bin.id);
            if (error) throw error;
            toast.success(t('تم الحذف', 'Deleted'));
            setDeleteConfirm({ open: false, bin: null });
            loadBins();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // ─── Open Edit Dialog ──────────────────────────────────────
    const openEdit = (bin: BinLocation) => {
        setFormData({
            code: bin.code,
            name_ar: bin.name_ar || '',
            row_code: bin.row_code || '',
            column_code: bin.column_code || '',
            shelf_code: bin.shelf_code || '',
            capacity_rolls: bin.capacity_rolls?.toString() || '',
            description: bin.description || '',
        });
        setEditDialog({ open: true, bin });
    };

    // ─── Stats ─────────────────────────────────────────────────
    const totalCapacity = bins.reduce((s, b) => s + (b.capacity_rolls || 0), 0);
    const totalUsed = bins.reduce((s, b) => s + (b.current_rolls_count || 0), 0);
    const fullBins = bins.filter(b => b.capacity_rolls && (b.current_rolls_count || 0) >= b.capacity_rolls).length;

    // ────────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        {t('مواقع التخزين', 'Storage Locations')}
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {t('تعريف وإدارة مواقع الرولونات داخل المستودعات', 'Define and manage roll storage positions within warehouses')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadBins} disabled={loading} className="h-8 gap-1.5 text-xs">
                        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                        {t('تحديث', 'Refresh')}
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        className="h-8 gap-1.5 text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
                        onClick={() => setBatchDialog(true)}
                        disabled={!selectedWarehouse}
                    >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        {t('توليد بالجملة', 'Batch Generate')}
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                            setFormData({ code: '', name_ar: '', row_code: '', column_code: '', shelf_code: '', capacity_rolls: '', description: '' });
                            setAddSingleDialog(true);
                        }}
                        disabled={!selectedWarehouse}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t('موقع جديد', 'New Location')}
                    </Button>
                    {/* Help button */}
                    <button
                        onClick={() => setShowHelp(true)}
                        title={t('شرح نظام المواقع', 'How locations work')}
                        className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-blue-200 dark:border-blue-700 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ═══ Control Row: Warehouse + Search + View Toggle ═══ */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Warehouse selector */}
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-52 h-9 text-sm">
                        <WarehouseIcon className="w-3.5 h-3.5 text-gray-400 me-1.5" />
                        <SelectValue placeholder={t('اختر المستودع', 'Select Warehouse')} />
                    </SelectTrigger>
                    <SelectContent>
                        {warehouses.map(wh => (
                            <SelectItem key={wh.id} value={wh.id}>
                                {isRTL ? wh.name_ar : (wh.name_en || wh.name_ar)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative">
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('بحث بالكود...', 'Search by code...')}
                        className="h-9 text-sm w-40"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* View toggle */}
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 ms-auto">
                    <button onClick={() => setViewMode('map')} title={t('خريطة', 'Map')}
                        className={cn('p-1.5 rounded-md transition-colors', viewMode === 'map' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
                        <Map className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('grid')}
                        className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ═══ Filter Bar — Popover Buttons ═══ */}
            {selectedWarehouse && (
                <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5">

                    {/* ── Occupancy Popover ── */}
                    <Popover open={occupancyPopoverOpen} onOpenChange={setOccupancyPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className={cn(
                                'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all',
                                occupancyFilter !== 'all'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}>
                                {{
                                    all: <><span className="w-2 h-2 rounded-full bg-gray-400" /></>,
                                    empty: <><span className="w-2 h-2 rounded-full border border-gray-400" /></>,
                                    partial: <><span className="w-2 h-2 rounded-full bg-emerald-500" /></>,
                                    full: <><span className="w-2 h-2 rounded-full bg-red-500" /></>,
                                }[occupancyFilter]}
                                {occupancyFilter === 'all'
                                    ? t('الامتلاء', 'Occupancy')
                                    : isRTL
                                        ? { empty: 'فارغة', partial: 'جزئية', full: 'ممتلئة' }[occupancyFilter]
                                        : { empty: 'Empty', partial: 'Partial', full: 'Full' }[occupancyFilter]
                                }
                                <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform', occupancyPopoverOpen && 'rotate-180')} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5" align="start" side="bottom">
                            {(['all', 'empty', 'partial', 'full'] as OccupancyFilter[]).map(key => {
                                const dots = { all: 'bg-gray-400', empty: 'bg-gray-200 border border-gray-300', partial: 'bg-emerald-500', full: 'bg-red-500' };
                                const labels = { all: [t('الكل', 'All')], empty: [t('فارغة', 'Empty')], partial: [t('جزئية', 'Partial')], full: [t('ممتلئة', 'Full')] };
                                return (
                                    <button key={key}
                                        onClick={() => { setOccupancyFilter(key); setOccupancyPopoverOpen(false); }}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                                            occupancyFilter === key
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        )}>
                                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dots[key])} />
                                        {labels[key]}
                                        {occupancyFilter === key && <Check className="w-3.5 h-3.5 ms-auto text-blue-600" />}
                                    </button>
                                );
                            })}
                        </PopoverContent>
                    </Popover>

                    {/* ── Row Popover ── */}
                    {uniqueRows.length > 0 && (
                        <Popover open={rowPopoverOpen} onOpenChange={setRowPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className={cn(
                                    'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all',
                                    filterRow
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}>
                                    {filterRow ? <><strong>{t('صف', 'Row')}: {filterRow}</strong></> : t('الصف', 'Row')}
                                    <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform', rowPopoverOpen && 'rotate-180')} />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1.5" align="start" side="bottom">
                                <button onClick={() => { setFilterRow(null); setRowPopoverOpen(false); }}
                                    className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                                        !filterRow ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    )}>
                                    {t('الكل', 'All')}
                                    {!filterRow && <Check className="w-3.5 h-3.5 ms-auto text-indigo-600" />}
                                </button>
                                {uniqueRows.map(row => {
                                    const cnt = bins.filter(b => b.row_code === row).reduce((s, b) => s + (b.current_rolls_count || 0), 0);
                                    return (
                                        <button key={row}
                                            onClick={() => { setFilterRow(filterRow === row ? null : row); setRowPopoverOpen(false); }}
                                            className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors font-mono',
                                                filterRow === row ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            )}>
                                            {row}
                                            {cnt > 0 && <span className="text-[10px] text-gray-400 ms-1">{cnt}</span>}
                                            {filterRow === row && <Check className="w-3.5 h-3.5 ms-auto text-indigo-600" />}
                                        </button>
                                    );
                                })}
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* ── Column Popover ── */}
                    {uniqueCols.length > 0 && (
                        <Popover open={colPopoverOpen} onOpenChange={setColPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className={cn(
                                    'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all',
                                    filterCol
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}>
                                    {filterCol ? <><strong>{t('عمود', 'Col')}: {filterCol}</strong></> : t('العمود', 'Column')}
                                    <ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform', colPopoverOpen && 'rotate-180')} />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1.5" align="start" side="bottom">
                                <button onClick={() => { setFilterCol(null); setColPopoverOpen(false); }}
                                    className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                                        !filterCol ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    )}>
                                    {t('الكل', 'All')}
                                    {!filterCol && <Check className="w-3.5 h-3.5 ms-auto text-teal-600" />}
                                </button>
                                {uniqueCols.map(col => {
                                    const cnt = bins.filter(b => b.column_code === col).reduce((s, b) => s + (b.current_rolls_count || 0), 0);
                                    return (
                                        <button key={col}
                                            onClick={() => { setFilterCol(filterCol === col ? null : col); setColPopoverOpen(false); }}
                                            className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors font-mono',
                                                filterCol === col ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            )}>
                                            {col}
                                            {cnt > 0 && <span className="text-[10px] text-gray-400 ms-1">{cnt}</span>}
                                            {filterCol === col && <Check className="w-3.5 h-3.5 ms-auto text-teal-600" />}
                                        </button>
                                    );
                                })}
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* ── Material Combobox ── */}
                    {materials.length > 0 && (
                        <Popover open={materialPopoverOpen} onOpenChange={(o) => {
                            setMaterialPopoverOpen(o);
                            if (!o && !filterMaterial) setMaterialInputText('');
                        }}>
                            <PopoverAnchor asChild>
                                <div className={cn(
                                    'flex items-center gap-1.5 h-8 min-w-[160px] px-2 rounded-lg border text-xs transition-all cursor-text',
                                    filterMaterial || materialInputText
                                        ? 'border-blue-500 ring-1 ring-blue-200 dark:ring-blue-800'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                )}>
                                    <Package className={cn('w-3.5 h-3.5 flex-shrink-0', filterMaterial ? 'text-blue-600' : 'text-gray-400')} />
                                    <input
                                        type="text"
                                        value={filterMaterial && selectedMaterial && !materialInputText
                                            ? (isRTL ? selectedMaterial.name_ar : (selectedMaterial.name_en || selectedMaterial.name_ar))
                                            : materialInputText
                                        }
                                        onChange={e => {
                                            setMaterialInputText(e.target.value);
                                            setMaterialPopoverOpen(true);
                                            if (!e.target.value) setFilterMaterial(null);
                                        }}
                                        onFocus={() => {
                                            setMaterialPopoverOpen(true);
                                            if (filterMaterial) setMaterialInputText('');
                                        }}
                                        onBlur={() => {
                                            // delay so CommandItem click fires before popover closes
                                            setTimeout(() => setMaterialPopoverOpen(false), 200);
                                        }}
                                        placeholder={loadingWarehouseMaterials
                                            ? t('جاري التحميل...', 'Loading...')
                                            : t('اختر/اكتب مادة...', 'Filter by material...')}
                                        className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 min-w-0"
                                    />
                                    {filterMaterial
                                        ? <>
                                            {loadingMaterialFilter
                                                ? <Loader2 className="w-3 h-3 animate-spin text-blue-500 flex-shrink-0" />
                                                : <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0">
                                                    {Object.values(materialBinCounts).reduce((s, c) => s + c, 0)} {t('رول', 'rolls')}
                                                </span>
                                            }
                                            <button onClick={e => { e.stopPropagation(); setFilterMaterial(null); setMaterialInputText(''); }}
                                                className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                        : <ChevronDown className={cn('w-3 h-3 text-gray-400 flex-shrink-0 transition-transform', materialPopoverOpen && 'rotate-180')} />
                                    }
                                </div>
                            </PopoverAnchor>
                            <PopoverContent className="w-72 p-0" align="start" side="bottom">
                                <Command>
                                    <CommandList className="max-h-64">
                                        <CommandEmpty>{t('لا توجد نتائج', 'No results')}</CommandEmpty>
                                        <CommandGroup heading={
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Package className="w-2.5 h-2.5" />
                                                {t('المواد في المستودع', 'Materials in warehouse')}
                                                {loadingWarehouseMaterials && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                            </span>
                                        }>
                                            {filterMaterial && (
                                                <CommandItem onSelect={() => { setFilterMaterial(null); setMaterialInputText(''); setMaterialPopoverOpen(false); }}
                                                    className="text-red-500 text-xs">
                                                    <X className="w-3 h-3 me-2" />
                                                    {t('إلغاء الفلتر', 'Clear filter')}
                                                </CommandItem>
                                            )}
                                            {comboboxMaterials.map(mat => {
                                                const isSelected = filterMaterial === mat.id;
                                                return (
                                                    <CommandItem key={mat.id}
                                                        value={`${mat.code} ${mat.name_ar} ${mat.name_en || ''}`}
                                                        onSelect={() => {
                                                            setFilterMaterial(isSelected ? null : mat.id);
                                                            setMaterialInputText('');
                                                            setMaterialPopoverOpen(false);
                                                        }}
                                                        className="flex items-center gap-2">
                                                        <Check className={cn('w-3.5 h-3.5 flex-shrink-0', isSelected ? 'opacity-100 text-blue-600' : 'opacity-0')} />
                                                        <span className="font-mono text-[10px] text-gray-400 w-14 flex-shrink-0">{mat.code}</span>
                                                        <span className="flex-1 truncate text-sm">
                                                            {isRTL ? mat.name_ar : (mat.name_en || mat.name_ar)}
                                                        </span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* ── Divider ── */}
                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                    {/* ── Results + Clear ── */}
                    <span className="text-xs text-gray-400">
                        {filteredBins.length}/{bins.length} {t('موقع', 'loc')}
                    </span>
                    {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <X className="w-2.5 h-2.5" />
                            {t('مسح الكل', 'Clear all')}
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1 rounded-full text-[9px] font-bold">{activeFilterCount}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Stats & Info Bar */}
            {bins.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: t('إجمالي المواقع', 'Total Locations'), val: bins.length, color: 'text-blue-600', icon: MapPin },
                        { label: t('إجمالي الطاقة', 'Total Capacity'), val: totalCapacity || '∞', color: 'text-purple-600', icon: Package },
                        { label: t('المشغولة', 'Occupied'), val: totalUsed, color: 'text-emerald-600', icon: Layers },
                        { label: t('مكتملة', 'Full Bins'), val: fullBins, color: 'text-red-500', icon: AlertCircle },
                    ].map(item => (
                        <div key={item.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800', item.color)}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className={cn('text-lg font-bold font-mono', item.color)}>{item.val}</div>
                                <div className="text-[10px] text-gray-400">{item.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="ms-2 text-gray-500">{t('تحميل...', 'Loading...')}</span>
                </div>
            ) : !selectedWarehouse ? (
                <div className="text-center py-16 text-gray-400">
                    <WarehouseIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('اختر مستودعاً', 'Select a warehouse')}</p>
                </div>
            ) : filteredBins.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-gray-600 dark:text-gray-400">
                        {bins.length === 0
                            ? t('لا توجد مواقع محددة في هذا المستودع', 'No locations defined in this warehouse')
                            : t('لا توجد نتائج', 'No results found')
                        }
                    </p>
                    {bins.length === 0 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Button size="sm" variant="outline" onClick={() => setBatchDialog(true)} className="gap-1.5">
                                <Grid3X3 className="w-3.5 h-3.5" />
                                {t('توليد بالجملة', 'Batch Generate')}
                            </Button>
                            <Button size="sm" onClick={() => setAddSingleDialog(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-3.5 h-3.5" />
                                {t('إضافة موقع', 'Add Location')}
                            </Button>
                        </div>
                    )}
                </div>
            ) : viewMode === 'map' ? (
                /* ═══ MAP VIEW — Physical floor plan ═══ */
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <WarehouseMap
                        bins={filteredBins}
                        isRTL={isRTL}
                        warehouseId={selectedWarehouse || undefined}
                        warehouseName={isRTL
                            ? selectedWarehouseName?.name_ar
                            : (selectedWarehouseName?.name_en || selectedWarehouseName?.name_ar)
                        }
                        onCellSelect={(row, col) => handleMapCellSelect('cell', row, col)}
                        onRowSelect={(row) => handleMapCellSelect('row', row)}
                        onColSelect={(col) => handleMapCellSelect('col', undefined, col)}
                    />
                </div>
            ) : viewMode === 'grid' ? (
                /* ═══ GRID VIEW — Grouped by Row ═══ */
                <ScrollArea className="h-[60vh]">
                    <div className="space-y-6 pe-2">
                        {Object.entries(groupedByRow).sort(([a], [b]) => a.localeCompare(b)).map(([row, rowBins]) => (
                            <div key={row}>
                                {/* Row Header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                        <ChevronRight className="w-3 h-3" />
                                        <span className="text-xs font-bold font-mono">{t('صف', 'Row')} {row}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">({rowBins.length} {t('موقع', 'locations')})</span>
                                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                                </div>

                                {/* Bins */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {rowBins.sort((a, b) => a.code.localeCompare(b.code)).map(bin => {
                                        const pct = getCapacityPct(bin);
                                        const isFull = pct !== null && pct >= 100;
                                        const isEmpty = !bin.current_rolls_count || bin.current_rolls_count === 0;

                                        return (
                                            <div
                                                key={bin.id}
                                                onClick={() => openBinSheet(bin)}
                                                className={cn(
                                                    'relative group border-2 rounded-xl p-2.5 transition-all cursor-pointer',
                                                    isFull
                                                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20 hover:border-red-400'
                                                        : isEmpty
                                                            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300'
                                                            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 hover:border-emerald-400'
                                                )}
                                            >
                                                {/* Action buttons — stop propagation to avoid sheet opening */}
                                                <div className="absolute top-1 end-1 hidden group-hover:flex gap-0.5">
                                                    <button onClick={(e) => { e.stopPropagation(); openEdit(bin); }} className="p-0.5 rounded bg-white/80 hover:bg-blue-50 text-gray-500 hover:text-blue-600">
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, bin }); }} className="p-0.5 rounded bg-white/80 hover:bg-red-50 text-gray-500 hover:text-red-600">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Code */}
                                                <div className="font-mono font-bold text-xs text-gray-800 dark:text-gray-100">{bin.code}</div>

                                                {/* Row/Col/Shelf */}
                                                {(bin.column_code || bin.shelf_code) && (
                                                    <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                                                        {[bin.column_code, bin.shelf_code].filter(Boolean).join('-')}
                                                    </div>
                                                )}

                                                {/* Occupancy */}
                                                <div className={cn('text-xs font-bold font-mono mt-1.5', isFull ? 'text-red-600' : isEmpty ? 'text-gray-400' : 'text-emerald-600')}>
                                                    {getBinDisplayCount(bin)}
                                                    {bin.capacity_rolls && <span className="font-normal text-gray-400">/{bin.capacity_rolls}</span>}
                                                    <span className="text-[9px] font-normal ms-0.5">{t('رول', 'rolls')}</span>
                                                </div>

                                                {/* Material badge when filter active */}
                                                {filterMaterial && (materialBinCounts[bin.id] || 0) > 0 && (
                                                    <div className="mt-1 flex items-center gap-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                        <span className="text-[9px] text-blue-600 dark:text-blue-400">
                                                            {materialBinCounts[bin.id]} {t('من المادة', 'material rolls')}
                                                        </span>
                                                    </div>
                                                )}

                                                <CapacityBar pct={pct} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                /* ═══ LIST VIEW ═══ */
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                {[
                                    t('الكود', 'Code'),
                                    t('الاسم', 'Name'),
                                    t('الصف', 'Row'),
                                    t('العمود', 'Col'),
                                    t('الرف', 'Shelf'),
                                    t('السعة', 'Capacity'),
                                    t('الرولونات', 'Rolls'),
                                    '',
                                ].map((h, i) => (
                                    <th key={i} className={cn('px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-start', i === 7 && 'w-20')}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredBins.map(bin => {
                                const pct = getCapacityPct(bin);
                                const isFull = pct !== null && pct >= 100;
                                return (
                                    <tr
                                        key={bin.id}
                                        className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                                        onClick={() => openBinSheet(bin)}
                                    >
                                        <td className="px-3 py-2 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">{bin.code}</td>
                                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{bin.name_ar || '—'}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{bin.row_code || '—'}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{bin.column_code || '—'}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{bin.shelf_code || '—'}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{bin.capacity_rolls || '∞'}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn('font-mono font-bold text-xs', isFull ? 'text-red-600' : 'text-emerald-600')}>
                                                    {getBinDisplayCount(bin)}
                                                </span>
                                                {filterMaterial && (
                                                    <span className="text-[9px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full font-medium">
                                                        {t('من المادة', 'material')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(bin)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setDeleteConfirm({ open: true, bin })} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ═══ Add/Edit Single Location Dialog ═══ */}
            <Dialog
                open={addSingleDialog || editDialog.open}
                onOpenChange={(open) => {
                    if (!open) { setAddSingleDialog(false); setEditDialog({ open: false, bin: null }); }
                }}
            >
                <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-500" />
                            {editDialog.bin ? t('تعديل الموقع', 'Edit Location') : t('موقع تخزين جديد', 'New Storage Location')}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Auto-generated code preview */}
                    {!editDialog.bin && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-3 py-2 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400">{t('كود الموقع (تلقائي):', 'Auto code:')}</span>
                            <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-200 flex-1">
                                {formData.code || '—'}
                            </span>
                            {bins.length > 0 && (
                                <button
                                    onClick={suggestNextPosition}
                                    className="text-[10px] text-blue-500 hover:text-blue-700 border border-blue-300 rounded px-1.5 py-0.5"
                                    title={t('اقتراح الموقع التالي', 'Suggest next position')}
                                >
                                    {t('التالي ↓', 'Next ↓')}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 py-1">
                        <div>
                            <Label className="text-xs">{t('الصف', 'Row')}</Label>
                            <Input value={formData.row_code} onChange={e => setFormData(p => ({ ...p, row_code: e.target.value.toUpperCase() }))} className="h-9 text-sm font-mono mt-1 text-base font-bold" placeholder="A" />
                        </div>
                        <div>
                            <Label className="text-xs">{t('العمود', 'Column')}</Label>
                            <Input value={formData.column_code} onChange={e => setFormData(p => ({ ...p, column_code: e.target.value.toUpperCase() }))} className="h-9 text-sm font-mono mt-1 font-bold" placeholder="01" />
                        </div>
                        <div>
                            <Label className="text-xs">{t('الرف/الطابق', 'Shelf/Level')}</Label>
                            <Input value={formData.shelf_code} onChange={e => setFormData(p => ({ ...p, shelf_code: e.target.value.toUpperCase() }))} className="h-9 text-sm font-mono mt-1 font-bold" placeholder="001" />
                        </div>
                        <div>
                            <Label className="text-xs">{t('الاسم (اختياري)', 'Name (optional)')}</Label>
                            <Input value={formData.name_ar} onChange={e => setFormData(p => ({ ...p, name_ar: e.target.value }))} className="h-8 text-sm mt-1" placeholder={t('مثال: رف الشمال', 'e.g. North Rack')} />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">{t('السعة (رولونات)', 'Capacity (rolls)')}</Label>
                            <div className="flex items-center gap-1 mt-1">
                                <button onClick={() => setFormData(p => ({ ...p, capacity_rolls: String(Math.max(1, parseInt(p.capacity_rolls || '1') - 1)) }))} className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 font-bold text-gray-600 hover:bg-gray-200 flex-shrink-0">−</button>
                                <Input type="number" value={formData.capacity_rolls} onChange={e => setFormData(p => ({ ...p, capacity_rolls: e.target.value }))} className="h-8 text-sm font-mono text-center" placeholder="20" min={1} />
                                <button onClick={() => setFormData(p => ({ ...p, capacity_rolls: String(parseInt(p.capacity_rolls || '0') + 1) }))} className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 font-bold text-gray-600 hover:bg-gray-200 flex-shrink-0">+</button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setAddSingleDialog(false); setEditDialog({ open: false, bin: null }); setContinueAdding(false); }} disabled={saving}>
                            {t('إلغاء', 'Cancel')}
                        </Button>
                        {!editDialog.bin && (
                            <Button
                                variant="outline" size="sm"
                                onClick={() => { setContinueAdding(true); handleSaveBin(); }}
                                disabled={saving || !formData.code.trim()}
                                className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t('حفظ وتابع', 'Save & Continue')}
                            </Button>
                        )}
                        <Button size="sm" onClick={() => { setContinueAdding(false); handleSaveBin(); }} disabled={saving || !formData.code.trim()} className="gap-1.5">
                            {saving
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('حفظ...', 'Saving...')}</>
                                : <><CheckCircle2 className="w-3.5 h-3.5" />{t('حفظ', 'Save')}</>
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Batch Generate Dialog ═══ */}
            <BatchGenerateDialog
                open={batchDialog}
                onClose={() => setBatchDialog(false)}
                warehouseId={selectedWarehouse}
                companyId={companyId || ''}
                tenantId={tenantId}
                onGenerated={loadBins}
                isRTL={isRTL}
            />

            {/* ═══ Delete Confirm ═══ */}
            <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false, bin: null })}>
                <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('حذف الموقع', 'Delete Location')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(`هل تريد حذف الموقع "${deleteConfirm.bin?.code}"؟ لن يُحذف الموقع إذا كان يحتوي على رولونات.`, `Delete location "${deleteConfirm.bin?.code}"? Cannot delete if it contains rolls.`)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBin} className="bg-red-600 hover:bg-red-700">{t('حذف', 'Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ═══ Bin Detail Sheet ═══ */}
            <WarehouseDetailSheet
                isOpen={detailSheetOpen}
                onClose={() => setDetailSheetOpen(false)}
                selection={binSelection}
                companyId={companyId || ''}
                onOpenRoll={(rollId, rollNumber) => {
                    // Store the roll to open in sub-tab
                    setOpenedRollId(rollId);
                    setOpenedRollNumber(rollNumber || null);
                }}
                onRollsAssigned={async () => {
                    // Reload bins to refresh map occupancy after new rolls assigned
                    if (selectedWarehouse && companyId) {
                        const freshBins = await warehouseService.getBinLocations(companyId, selectedWarehouse);
                        setBins(freshBins);
                    }
                }}
            />

            {/* ═══ Help Dialog ═══ */}
            <Dialog open={showHelp} onOpenChange={setShowHelp}>
                <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <HelpCircle className="w-4 h-4 text-blue-600" />
                            </div>
                            {t('🏭 شرح نظام مواقع التخزين', '🏭 Storage Location System Guide')}
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="space-y-5 py-2 px-1">
                            {/* Visual floor plan */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    {t('نظرة من الأعلى — تخطيط المستودع', "Bird's Eye View — Warehouse Layout")}
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 font-mono text-xs leading-6 overflow-x-auto" dir="ltr">
                                    <div className="text-gray-400 mb-1">{'     Col 01   Col 02   Col 03   Col 04   Col 05'}</div>
                                    <div><span className="font-bold text-blue-600">{'Row A '}</span><span className="text-emerald-600">{'[RACK] '}</span><span className="text-emerald-600">{'[RACK] '}</span><span className="text-amber-500">{'[RACK] '}</span><span className="text-blue-400">{'[RACK] '}</span><span className="text-emerald-600">{'[RACK]'}</span></div>
                                    <div className="text-gray-300 dark:text-gray-600 my-0.5">{'      ══════════════════════════════ ← '}<span className="text-gray-400">{t('ممر سير', 'Aisle / Walkway')}</span></div>
                                    <div><span className="font-bold text-blue-600">{'Row B '}</span><span className="text-amber-500">{'[RACK] '}</span><span className="text-red-500">{'[RACK] '}</span><span className="text-emerald-600">{'[RACK] '}</span><span className="text-amber-500">{'[RACK] '}</span><span className="text-blue-400">{'[RACK]'}</span></div>
                                    <div className="text-gray-300 dark:text-gray-600 my-0.5">{'      ══════════════════════════════ ← '}<span className="text-gray-400">{t('ممر سير', 'Aisle / Walkway')}</span></div>
                                    <div><span className="font-bold text-blue-600">{'Row C '}</span><span className="text-emerald-600">{'[RACK] '}</span><span className="text-emerald-600">{'[RACK] '}</span><span className="text-blue-400">{'[RACK] '}</span><span className="text-red-500">{'[RACK] '}</span><span className="text-emerald-600">{'[RACK]'}</span></div>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px]">
                                        {[
                                            { c: 'text-emerald-600', l: t('فارغ', 'Empty') },
                                            { c: 'text-amber-500', l: t('نصف ممتلئ', 'Half Full') },
                                            { c: 'text-red-500', l: t('ممتلئ', 'Full') },
                                            { c: 'text-blue-400', l: t('بدون طاقة', 'No capacity') },
                                        ].map(x => (
                                            <span key={x.l} className={`${x.c} flex items-center gap-1`}><span>[RACK]</span> = {x.l}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Single rack + code breakdown */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    {t('كل خلية [RACK] = حامل رف بطوابق عمودية', 'Each [RACK] = vertical shelf unit with levels')}
                                </p>
                                <div className="flex gap-4 items-start">
                                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 font-mono text-xs leading-7 flex-1" dir="ltr">
                                        <div className="text-gray-400 text-[10px] mb-1">{t('مثال: حامل B-03', 'Example: Rack B-03')}</div>
                                        <div className="border-l-2 border-r-2 border-gray-400">
                                            <div className="border-b border-gray-300 px-3 bg-amber-50 dark:bg-amber-900/20"><span className="font-bold text-amber-600">003</span><span className="text-gray-400 ms-2 text-[10px]">← {t('الأعلى', 'Top')}</span></div>
                                            <div className="border-b border-gray-300 px-3 bg-emerald-50 dark:bg-emerald-900/20"><span className="font-bold text-emerald-600">002</span><span className="text-gray-400 ms-2 text-[10px]">← {t('الوسط', 'Middle')}</span><span className="ms-2 text-emerald-500 text-[10px]">🟢 12 {t('رولون', 'rolls')}</span></div>
                                            <div className="px-3 bg-red-50 dark:bg-red-900/20"><span className="font-bold text-red-600">001</span><span className="text-gray-400 ms-2 text-[10px]">← {t('الأسفل', 'Bottom')}</span><span className="ms-2 text-red-500 text-[10px]">🔴 {t('20/20 ممتلئ', '20/20 full')}</span></div>
                                        </div>
                                        <div className="text-center text-[10px] text-gray-400 mt-1">▼ {t('الأرض', 'Floor')}</div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('تفسير الكود', 'Code Breakdown')}</p>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 font-mono text-center text-lg tracking-widest">
                                            <span className="text-blue-700 font-black">B</span><span className="text-gray-400">-</span><span className="text-purple-600 font-black">03</span><span className="text-gray-400">-</span><span className="text-emerald-600 font-black">002</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {[
                                                { code: 'B', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200', ar: 'الصف (ممر B)', en: 'Row = Aisle B' },
                                                { code: '03', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200', ar: 'العمود (الحامل 3)', en: 'Column = Rack #3' },
                                                { code: '002', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200', ar: 'الطابق الثاني من الأسفل', en: 'Level 2 from bottom' },
                                            ].map(item => (
                                                <div key={item.code} className="flex items-center gap-2 text-xs">
                                                    <span className={`font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap ${item.color}`}>{item.code}</span>
                                                    <span className="text-gray-600 dark:text-gray-400">{isRTL ? item.ar : item.en}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Batch tip */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                                <p className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5 mb-2">
                                    <Grid3X3 className="w-3.5 h-3.5" />
                                    {t('⚡ نصيحة: استخدم التوليد بالجملة!', '⚡ Tip: Use Batch Generate!')}
                                </p>
                                <p className="text-xs text-purple-700 dark:text-purple-400">
                                    {t('بدلاً من إضافة كل موقع يدوياً، اضغط "توليد بالجملة" وأدخل الصفوف والأعمدة والرفوف — سيُنشئ النظام جميع التوليفات تلقائياً.', 'Instead of adding locations one by one, click "Batch Generate" and enter rows, columns and shelves — the system creates all combinations automatically.')}
                                </p>
                                <div className="mt-2 font-mono text-[11px] bg-white dark:bg-gray-900 rounded-lg p-2 text-gray-600 dark:text-gray-400">
                                    {t('صفوف: A,B,C × أعمدة: 01..10 × رفوف: 001,002,003', 'Rows: A,B,C × Cols: 01..10 × Shelves: 001,002,003')}
                                    <span className="text-purple-600 font-bold ms-2">= 90 {t('موقع', 'locations')} 🚀</span>
                                </div>
                            </div>
                            {/* View modes */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { icon: Map, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', label_ar: '🗺️ عرض الخريطة', label_en: '🗺️ Map View', desc_ar: 'خريطة تفاعلية للمستودع مع الممرات', desc_en: 'Interactive warehouse floor plan' },
                                    { icon: LayoutGrid, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', label_ar: '⊞ عرض الشبكة', label_en: '⊞ Grid View', desc_ar: 'بطاقات مع شريط الإشغال', desc_en: 'Cards with capacity bars' },
                                    { icon: List, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', label_ar: '≡ عرض القائمة', label_en: '≡ List View', desc_ar: 'جدول تفصيلي كامل', desc_en: 'Full detailed table' },
                                ].map(item => (
                                    <div key={item.label_en} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
                                        <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${item.color}`}>
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{isRTL ? item.label_ar : item.label_en}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{isRTL ? item.desc_ar : item.desc_en}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button size="sm" onClick={() => setShowHelp(false)} className="bg-blue-600 hover:bg-blue-700">
                            {t('فهمت! 👍', 'Got it! 👍')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
