/**
 * ════════════════════════════════════════════════════════════════
 * 📋 StockCountSheet v2 — شيت الجرد المخزني الاحترافي
 * ════════════════════════════════════════════════════════════════
 *
 * إعادة بناء كاملة على نمط PlatformDetailSheet:
 *   - Header ملون بـ gradient مع إحصائيات سريعة
 *   - تبويبات فرعية: بنود الجرد | المواد المحددة | سجل النشاط | المرفقات
 *   - Dexie.js offline-first (IndexedDB)
 *   - حفظ مباشر في stock_counts + stock_count_items
 *   - دعم AR/EN + RTL/LTR
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
    ClipboardList,
    PackageCheck,
    Warehouse,
    Wifi,
    WifiOff,
    ScanBarcode,
    ListChecks,
    CalendarClock,
    History,
    Paperclip,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    RefreshCw,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Package,
    BadgeCheck,
    BarChart3,
    Hash,
    Search,
    Plus,
    X,
    FileText,
    Printer,
    QrCode,
    Trash2,
    Tag,
    Palette,
    Ruler,
    Save,
    Download,
    XCircle,
    FileDown,
    SquareCheckBig,
    ClipboardCheck,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useWarehouses, useMaterials } from '../hooks/useWarehouseQueries';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { normalizeNumerals } from '@/lib/arabicNumeralNormalizer';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalizedName } from '@/lib/i18n-helpers';
import { generateRollNumber, generateBatchId } from '../services/receiptLocalStore';
import { rollNumberService, buildRollCode } from '../services/rollNumberService';
import { QRPopover } from '@/features/accounting/components/unified/components/QRPopover';

// ─── Types ───────────────────────────────────────────────────
type StockCountMode = 'periodic' | 'administrative';

interface StockCountData {
    id: string;
    count_number: string;
    warehouse_id: string;
    count_type: string;
    count_mode: StockCountMode;
    status: string;
    count_date: string;
    planned_date: string | null;
    completed_date: string | null;
    total_items: number;
    counted_items: number;
    match_count: number;
    variance_count: number;
    total_system_quantity: number;
    total_actual_quantity: number;
    total_variance: number;
    notes: string | null;
    scope_material_ids: string[] | null;
    scope_group_ids: string[] | null;
    is_scheduled: boolean;
    schedule_id: string | null;
    created_by: string | null;
    completed_by: string | null;
    created_at: string;
    updated_at: string;
}

interface CountItem {
    id: string;
    stock_count_id: string;
    material_id: string | null;
    roll_id: string | null;
    roll_number: string | null;
    material_name: string | null;
    unit: string;
    system_quantity: number;
    actual_quantity: number | null;
    variance: number | null;
    is_counted: boolean;
    scan_method: string | null;
    variance_reason: string | null;
    is_loose_stock: boolean;
    counted_at: string | null;
    notes: string | null;
}

// ─── Sub-tab definition ──────────────────────────────────────
interface SubTab {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    badge?: number;
}

// ─── Count Mode Definitions ─────────────────────────────────
const COUNT_MODES: { id: StockCountMode; labelAr: string; labelEn: string; descAr: string; descEn: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { id: 'periodic', labelAr: 'جرد دوري', labelEn: 'Periodic Count', descAr: 'جرد منتظم (شهري/ربع سنوي)', descEn: 'Routine count (monthly/quarterly)', icon: CalendarClock, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    { id: 'administrative', labelAr: 'جرد بأمر إداري', labelEn: 'Administrative Count', descAr: 'جرد خاص بطلب من الإدارة', descEn: 'On-demand count by management', icon: ClipboardList, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
];

// ─── Props ───────────────────────────────────────────────────
interface StockCountSheetProps {
    /** Stock count data (existing or null for new) */
    stockCount?: StockCountData | null;
    /** Controlled open state */
    isOpen?: boolean;
    /** Controlled open change handler */
    onOpenChange?: (open: boolean) => void;
    /** Called when count is saved/completed */
    onComplete?: () => void;
    /** Create mode: true = new count, false = open existing */
    createMode?: boolean;
}

// ════════════════════════════════════════════════════════════════
// 🎯 Main Component — Stock Count Sheet v2
// ════════════════════════════════════════════════════════════════

export function StockCountSheet({
    stockCount = null,
    isOpen = false,
    onOpenChange,
    onComplete,
    createMode = false,
}: StockCountSheetProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isAr = language === 'ar';
    const { companyId, tenantId, user } = useAuth();
    const { warehouses } = useWarehouses();

    // ─── State ───────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('count_items');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Count state
    const [countData, setCountData] = useState<StockCountData | null>(stockCount);
    const [countItems, setCountItems] = useState<CountItem[]>([]);
    const [scanInput, setScanInput] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Create mode state
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [selectedMode, setSelectedMode] = useState<StockCountMode>('periodic');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [countNotes, setCountNotes] = useState('');
    const [lastAddedRollId, setLastAddedRollId] = useState<string | null>(null);
    const [entryMode, setEntryMode] = useState<'scan' | 'create'>('scan');

    // Manual entry state
    const [materialId, setMaterialId] = useState('');
    const [colorName, setColorName] = useState('');
    const [materialSearch, setMaterialSearch] = useState('');
    const [rollLength, setRollLength] = useState('');
    const [showLabelPreview, setShowLabelPreview] = useState(false);
    const [pendingItem, setPendingItem] = useState<any>(null);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedVariantChildId, setSelectedVariantChildId] = useState('');
    const [showOverageDialog, setShowOverageDialog] = useState(false);
    const [overageItems, setOverageItems] = useState<{ materialId: string; materialName: string; counted: number; available: number; overage: number }[]>([]);
    const [isFinalizingCount, setIsFinalizingCount] = useState(false);
    const [showCompletionSummary, setShowCompletionSummary] = useState(false);
    const [completionCountType, setCompletionCountType] = useState<'full' | 'partial'>('full');
    const [printAfterSave, setPrintAfterSave] = useState(false);

    // Hooks
    const { materials } = useMaterials();
    const rollLengthRef = useRef<HTMLInputElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    // Selected material info
    const selectedMaterial = useMemo(() => materials.find(m => m.id === materialId), [materials, materialId]);
    const materialHasVariants = !!(selectedMaterial?.has_variants || selectedMaterial?.is_variant_parent);

    // Filtered materials: exclude variant children (show only parents & standalone)
    const filteredMaterials = useMemo(() => 
        materials.filter(m => !m.parent_material_id),
    [materials]);

    // Searched materials: filter by code or name (all languages)
    const searchedMaterials = useMemo(() => {
        if (!materialSearch.trim()) return filteredMaterials;
        const q = materialSearch.toLowerCase().trim();
        return filteredMaterials.filter(m =>
            (m.code || '').toLowerCase().includes(q) ||
            (m.name_ar || '').includes(q) ||
            (m.name_en || '').toLowerCase().includes(q) ||
            (m.name_tr || '').toLowerCase().includes(q) ||
            (m.name_ru || '').toLowerCase().includes(q) ||
            (m.name_uk || '').toLowerCase().includes(q)
        );
    }, [filteredMaterials, materialSearch]);

    // Variant children of selected parent material
    const variantChildren = useMemo(() => {
        if (!materialHasVariants || !materialId) return [];
        return materials.filter(m => m.parent_material_id === materialId);
    }, [materials, materialId, materialHasVariants]);

    // Extract variant axes structure from children's variant_data
    // Structure: { [axisId]: { sort_order, axis_name_ar, axis_name_en, value_id, name_ar, name_en, color_hex, code } }
    const variantAxesInfo = useMemo(() => {
        if (!variantChildren.length) return [];
        
        // Get axes from first child's variant_data
        const firstChild = variantChildren[0];
        const vd = firstChild?.variant_data as Record<string, any> | null;
        if (!vd) return [];
        
        const axes = Object.entries(vd).map(([axisId, axisData]) => ({
            axisId,
            sortOrder: axisData?.sort_order ?? 999,
            labelAr: axisData?.axis_name_ar || 'محور',
            labelEn: axisData?.axis_name_en || 'Axis',
            isColor: !!(axisData?.color_hex !== undefined),
        }));
        
        // Sort by sort_order (Design=0 first, Color=1 second)
        return axes.sort((a, b) => a.sortOrder - b.sortOrder);
    }, [variantChildren]);

    // Extract unique values for the PRIMARY axis (first by sort_order = Design)
    const primaryAxisOptions = useMemo(() => {
        if (!variantAxesInfo.length || !variantChildren.length) return [];
        const primaryAxisId = variantAxesInfo[0].axisId;
        const valueMap = new Map<string, { id: string; label: string }>();
        
        for (const child of variantChildren) {
            const vd = child.variant_data as Record<string, any> | null;
            if (!vd?.[primaryAxisId]) continue;
            const axisData = vd[primaryAxisId];
            const valueId = axisData?.value_id || '';
            const label = isAr ? (axisData?.name_ar || valueId) : (axisData?.name_en || axisData?.name_ar || valueId);
            if (valueId && !valueMap.has(valueId)) {
                valueMap.set(valueId, { id: valueId, label });
            }
        }
        return Array.from(valueMap.values());
    }, [variantChildren, variantAxesInfo, isAr]);

    // Extract unique values for the SECONDARY axis (Color), filtered by selected primary
    const secondaryAxisOptions = useMemo(() => {
        if (variantAxesInfo.length < 2 || !variantChildren.length || !selectedDesign) return [];
        const primaryAxisId = variantAxesInfo[0].axisId;
        const secondaryAxisId = variantAxesInfo[1].axisId;
        const valueMap = new Map<string, { id: string; label: string; hex?: string; childId: string }>();
        
        for (const child of variantChildren) {
            const vd = child.variant_data as Record<string, any> | null;
            if (!vd) continue;
            const primaryData = vd[primaryAxisId];
            const secondaryData = vd[secondaryAxisId];
            if (!primaryData || !secondaryData) continue;
            
            const primaryValueId = primaryData?.value_id || '';
            if (primaryValueId !== selectedDesign) continue;
            
            const valueId = secondaryData?.value_id || '';
            const label = isAr ? (secondaryData?.name_ar || valueId) : (secondaryData?.name_en || secondaryData?.name_ar || valueId);
            if (valueId && !valueMap.has(valueId)) {
                valueMap.set(valueId, { id: valueId, label, hex: secondaryData?.color_hex, childId: child.id });
            }
        }
        return Array.from(valueMap.values());
    }, [variantChildren, variantAxesInfo, selectedDesign, isAr]);

    // Auto-set child ID when color is selected
    useEffect(() => {
        if (selectedColor) {
            const match = secondaryAxisOptions.find(c => c.id === selectedColor);
            if (match) setSelectedVariantChildId(match.childId);
        } else {
            setSelectedVariantChildId('');
        }
    }, [selectedColor, secondaryAxisOptions]);

    // Reset variant selections when material changes
    useEffect(() => {
        setSelectedDesign('');
        setSelectedColor('');
        setSelectedVariantChildId('');
        setColorName('');
    }, [materialId]);

    // Auto-focus confirm button when label preview opens
    useEffect(() => {
        if (showLabelPreview) {
            const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [showLabelPreview]);

    // ─── Online / Offline ────────────────────────────────────
    useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // ─── Load count data when opening ────────────────────────
    useEffect(() => {
        if (isOpen && stockCount) {
            setCountData(stockCount);
            setActiveTab('count_items');
            loadCountItems(stockCount.id);
        } else if (isOpen && createMode) {
            setCountData(null);
            setCountItems([]);
            setActiveTab('count_items');
            if (warehouses.length > 0 && !selectedWarehouse) {
                setSelectedWarehouse(warehouses[0].id);
            }
        }
    }, [isOpen, stockCount, createMode]);

    // ─── Load Count Items ────────────────────────────────────
    const loadCountItems = async (countId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_count_items')
                .select('*')
                .eq('stock_count_id', countId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setCountItems(data || []);
        } catch (err) {
            console.error('Failed to load count items:', err);
            toast.error(isAr ? 'فشل تحميل بنود الجرد' : 'Failed to load count items');
        } finally {
            setLoading(false);
        }
    };

    // ─── Create New Stock Count ──────────────────────────────
    const handleCreateCount = async () => {
        if (!selectedWarehouse || !companyId || !tenantId) {
            toast.error(isAr ? 'اختر المستودع أولاً' : 'Select warehouse first');
            return;
        }

        setSaving(true);
        try {
            // Generate count number
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            const countNumber = `SC-${dateStr}-${random}`;

            const { data, error } = await supabase
                .from('stock_counts')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    count_number: countNumber,
                    warehouse_id: selectedWarehouse,
                    count_type: selectedMode,
                    count_mode: selectedMode,
                    status: 'in_progress',
                    count_date: now.toISOString().slice(0, 10),
                    notes: countNotes || null,
                    created_by: user?.id,
                    total_items: 0,
                    counted_items: 0,
                })
                .select()
                .single();

            if (error) throw error;

            setCountData(data);
            toast.success(isAr ? `✅ تم إنشاء الجرد ${countNumber}` : `✅ Count ${countNumber} created`);
        } catch (err: any) {
            console.error('Failed to create count:', err);
            toast.error(isAr ? `❌ فشل إنشاء الجرد: ${err.message}` : `❌ Failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // ─── Smart Search (debounced) ──────────────────────────────
    const handleSearchInput = (value: string) => {
        setScanInput(value);
        setSearchResults([]);

        // Clear previous timer
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!value.trim() || value.trim().length < 2 || !countData) return;

        // Debounce 300ms
        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await rollNumberService.search(
                    value.trim(), companyId, countData.warehouse_id
                );
                // Filter out already-counted rolls
                const filtered = results.filter(
                    (r: any) => !countItems.find(ci => ci.roll_id === r.id)
                );
                setSearchResults(filtered);
            } catch (err) {
                console.error('Search error:', err);
            }
            setIsSearching(false);
        }, 300);
    };

    // ─── Add roll from search result or Enter ─────────────────
    const addScannedRoll = async (roll: any) => {
        if (!countData) return;
        try {
            // Check if already counted
            const existing = countItems.find(i => i.roll_id === roll.id);
            if (existing) {
                toast.warning(isAr ? '⚠️ هذا الرولون تم مسحه مسبقاً' : '⚠️ This roll was already scanned');
                return;
            }

            const materialData = (roll as any).fabric_materials;
            const materialName = materialData ? getLocalizedName(materialData, language) : getMaterialName(roll.material_id);

            const { data: newItem, error } = await supabase
                .from('stock_count_items')
                .insert({
                    stock_count_id: countData.id,
                    roll_id: roll.id,
                    material_id: roll.material_id,
                    material_name: materialName,
                    roll_number: roll.roll_number,
                    system_quantity: roll.current_length,
                    actual_quantity: roll.current_length,
                    is_counted: true,
                    scan_method: 'barcode',
                    counted_at: new Date().toISOString(),
                    counted_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;

            setCountItems(prev => [...prev, newItem]);
            setScanInput('');
            setSearchResults([]);

            // Update count totals
            await supabase
                .from('stock_counts')
                .update({
                    counted_items: countItems.length + 1,
                    total_actual_quantity: countItems.reduce((s, i) => s + (i.actual_quantity || 0), 0) + roll.current_length,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', countData.id);

            try { new Audio('/sounds/beep.mp3').play(); } catch { }

            const displayNum = roll.roll_seq ? `#${roll.roll_seq}` : roll.roll_number;
            toast.success(`✅ ${displayNum} — ${materialName}`, { duration: 2000 });

        } catch (err: any) {
            console.error('Add roll error:', err);
            toast.error(isAr ? `خطأ: ${err.message}` : `Error: ${err.message}`);
        }
    };

    // ─── Handle Enter key — exact match ─────────────────────
    const handleScan = async (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter' || !scanInput.trim() || !countData) return;

        const query = scanInput.trim();

        // If there's exactly 1 search result, add it directly
        if (searchResults.length === 1) {
            await addScannedRoll(searchResults[0]);
            return;
        }

        // Try exact match (barcode scanner or full number)
        try {
            const roll = await rollNumberService.findExact(query, companyId, countData.warehouse_id);
            if (roll) {
                await addScannedRoll(roll);
            } else {
                toast.error(isAr ? `❌ لم يُعثر على الرولون: ${query}` : `❌ Roll not found: ${query}`);
                setScanInput('');
            }
        } catch (err: any) {
            console.error('Scan error:', err);
            toast.error(isAr ? `خطأ: ${err.message}` : `Error: ${err.message}`);
        }
    };


    // ─── Manual Entry → Label Preview ────────────────────────
    const handleManualAdd = useCallback(() => {
        if (!materialId || !rollLength || Number(rollLength) <= 0 || !countData) return;

        const batchNum = generateBatchId(countData.count_number);

        // For variant materials → use the child material
        const actualMaterialId = materialHasVariants && selectedVariantChildId ? selectedVariantChildId : materialId;
        const actualMat = materials.find(m => m.id === actualMaterialId);
        const matName = actualMat ? getLocalizedName(actualMat, language) : materialId;

        // Build variant label
        let variantLabel = colorName || '';
        let designCodeForRoll = '';
        let colorCodeForRoll = colorName || '';
        if (materialHasVariants) {
            const designLabel = primaryAxisOptions.find(d => d.id === selectedDesign)?.label || '';
            const colorLabel = secondaryAxisOptions.find(c => c.id === selectedColor)?.label || '';
            variantLabel = [designLabel, colorLabel].filter(Boolean).join(' - ');
            designCodeForRoll = designLabel;
            colorCodeForRoll = colorLabel;
        }

        // 🏷️ Generate local roll number — NO DB NEEDED ✅
        // Works identically online and offline
        const itemIndex = countItems.filter(i => i.is_loose_stock).length + 1;
        const { roll_number: rollNum, roll_code: rollCode } = rollNumberService.generateLocal({
            materialCode: actualMat?.code || undefined,
            materialName: matName,
            designCode: designCodeForRoll || undefined,
            colorCode: colorCodeForRoll || undefined,
            sourcePrefix: 'J',
            sourceDocNumber: countData.count_number,
            itemIndex,
        });

        setPendingItem({
            rollNumber: rollNum,
            rollCode,
            batchId: batchNum,
            materialId: actualMaterialId,
            materialName: matName,
            colorName: variantLabel,
            rollLength: Number(rollLength),
            isLoose: true,
        });
        setShowLabelPreview(true);
    }, [materialId, colorName, rollLength, countData, countItems, materials, language, materialHasVariants, selectedVariantChildId, selectedDesign, selectedColor, primaryAxisOptions, secondaryAxisOptions]);

    // ─── Confirm Add + Print Label ───────────────────────────
    const confirmAndPrint = useCallback(async () => {
        if (!pendingItem || !countData) return;
        setIsSavingItem(true);
        try {
            const { data: newItem, error } = await supabase
                .from('stock_count_items')
                .insert({
                    stock_count_id: countData.id,
                    material_id: pendingItem.materialId,
                    material_name: pendingItem.materialName,
                    roll_number: pendingItem.rollNumber,
                    system_quantity: 0,
                    actual_quantity: pendingItem.rollLength,
                    is_counted: true,
                    is_loose_stock: pendingItem.isLoose,
                    scan_method: 'manual',
                    counted_at: new Date().toISOString(),
                    counted_by: user?.id,
                    notes: pendingItem.colorName ? `Color: ${pendingItem.colorName}` : null,
                })
                .select()
                .single();

            if (error) throw error;

            setCountItems(prev => [...prev, newItem]);

            // 🔦 Highlight the last added roll + auto-expand its group
            setLastAddedRollId(newItem.id);
            setExpandedGroups(prev => {
                const newState: Record<string, boolean> = {};
                groupedMaterials.forEach(g => { newState[g.materialId] = false; });
                newState[pendingItem.materialId] = true;
                return newState;
            });
            // Clear highlight after 3 seconds
            setTimeout(() => setLastAddedRollId(null), 3000);

            // Update totals
            await supabase.from('stock_counts').update({
                counted_items: countItems.length + 1,
                total_actual_quantity: countItems.reduce((s, i) => s + (i.actual_quantity || 0), 0) + pendingItem.rollLength,
                updated_at: new Date().toISOString(),
            }).eq('id', countData.id);

            // ═══════════════════════════════════════════════════════════
            // 🔑 BACKGROUND: Create DRAFT fabric_roll for cache safety
            // If internet is lost or cache is cleared, the draft is safe in DB.
            // On finalize → draft gets promoted to 'available'.
            // ═══════════════════════════════════════════════════════════
            const capturedNewItemId = newItem.id;
            const capturedPendingItem = { ...pendingItem };
            (async () => {
                try {
                    const { data: draftRoll, error: draftErr } = await supabase
                        .from('fabric_rolls')
                        .insert({
                            tenant_id: tenantId,
                            company_id: companyId,
                            warehouse_id: countData.warehouse_id,
                            material_id: capturedPendingItem.materialId,
                            roll_number: capturedPendingItem.rollNumber,
                            roll_code: capturedPendingItem.rollCode || null,
                            // roll_seq → DB trigger assigns
                            initial_length: capturedPendingItem.rollLength,
                            current_length: capturedPendingItem.rollLength,
                            reserved_length: 0,
                            cost_per_meter: 0,
                            cost_status: 'pending',
                            status: 'draft', // 🔑 مسودة حتى إنهاء الجرد
                            color_name: capturedPendingItem.colorName || null,
                            notes: `Draft | Stock Count: ${countData.count_number}`,
                            source_type: 'stock_count',
                            source_document_id: countData.id,
                            source_document_number: countData.count_number,
                        })
                        .select('id')
                        .single();

                    if (!draftErr && draftRoll?.id) {
                        // Link draft roll to the count item
                        await supabase
                            .from('stock_count_items')
                            .update({ roll_id: draftRoll.id })
                            .eq('id', capturedNewItemId);

                        // Update local state
                        setCountItems(prev => prev.map(i =>
                            i.id === capturedNewItemId ? { ...i, roll_id: draftRoll.id } : i
                        ));
                        console.log(`✅ Draft roll synced: ${draftRoll.id} for ${capturedPendingItem.rollNumber}`);
                    }
                } catch (draftErr: any) {
                    console.warn('⚠️ Draft roll sync failed (will create on finalize):', draftErr.message);
                }
            })();

            // Print label immediately
            const printWin = window.open('', '_blank', 'width=400,height=300');
            if (printWin) {
                printWin.document.write(`
                    <html dir="rtl"><head><title>Label</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 16px; text-align: center; }
                        .roll { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
                        .info { font-size: 13px; color: #555; margin: 4px 0; }
                        .len { font-size: 24px; font-weight: bold; color: #0d9488; margin: 8px 0; }
                        .batch { font-size: 10px; color: #999; }
                    </style></head><body>
                    <div class="roll">${pendingItem.rollNumber}</div>
                    <div class="info">${pendingItem.materialName}</div>
                    ${pendingItem.colorName ? `<div class="info">🎨 ${pendingItem.colorName}</div>` : ''}
                    <div class="len">${pendingItem.rollLength} م</div>
                    <div class="batch">${countData.count_number}</div>
                    </body></html>
                `);
                printWin.document.close();
                printWin.focus();
                printWin.print();
                setTimeout(() => printWin.close(), 1000);
            }

            try { new Audio('/sounds/beep.mp3').play(); } catch { }

            toast.success(isAr
                ? `✅ تم إضافة ${pendingItem.rollNumber} وطباعة اللصاقة`
                : `✅ Added ${pendingItem.rollNumber} & printed label`,
                { duration: 2500 }
            );

            // Reset form
            setPendingItem(null);
            setShowLabelPreview(false);
            setRollLength('');
            setTimeout(() => rollLengthRef.current?.focus(), 150);
        } catch (err: any) {
            console.error('Failed to add item:', err);
            toast.error(isAr ? `❌ خطأ: ${err.message}` : `❌ Error: ${err.message}`);
        } finally {
            setIsSavingItem(false);
        }
    }, [pendingItem, countData, countItems, user, isAr, tenantId, companyId]);

    // ─── Remove Item ─────────────────────────────────────────
    const handleRemoveItem = useCallback(async (itemId: string) => {
        if (!countData) return;
        try {
            // Find item to check if it has a draft roll
            const itemToRemove = countItems.find(i => i.id === itemId);

            const { error } = await supabase
                .from('stock_count_items')
                .delete()
                .eq('id', itemId);
            if (error) throw error;

            // 🔑 Also delete draft roll from DB if it was synced
            if (itemToRemove?.roll_id && itemToRemove.is_loose_stock) {
                await supabase
                    .from('fabric_rolls')
                    .delete()
                    .eq('id', itemToRemove.roll_id)
                    .eq('status', 'draft'); // Safety: only delete drafts!
                console.log(`🗑️ Deleted draft roll: ${itemToRemove.roll_id}`);
            }

            setCountItems(prev => prev.filter(i => i.id !== itemId));
            toast.success(isAr ? 'تم حذف البند' : 'Item removed');
        } catch (err: any) {
            toast.error(err.message);
        }
    }, [countData, countItems, isAr]);

    // ─── Get Material Name Helper ────────────────────────────
    const getMaterialName = useCallback((matId?: string | null) => {
        if (!matId) return '—';
        const mat = materials.find(m => m.id === matId);
        if (!mat) return matId.substring(0, 8);
        return getLocalizedName(mat, language);
    }, [materials, language]);

    // Handle enter on length field
    const handleLengthKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleManualAdd(); }
    }, [handleManualAdd]);
    const countedCount = countItems.filter(i => i.is_counted).length;
    const totalCount = countItems.length;
    const progressPct = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0;
    const matchCount = countItems.filter(i => i.is_counted && (i.variance === 0 || i.variance === null)).length;
    const varianceCount = countItems.filter(i => i.is_counted && i.variance !== 0 && i.variance !== null).length;

    const currentMode = COUNT_MODES.find(m => m.id === (countData?.count_mode || selectedMode)) || COUNT_MODES[0];
    const warehouseName = useMemo(() => {
        const wh = warehouses.find(w => w.id === (countData?.warehouse_id || selectedWarehouse));
        return wh ? getLocalizedName(wh, language) : '';
    }, [warehouses, countData, selectedWarehouse, language]);

    // ─── Sub Tabs ────────────────────────────────────────────
    const SUB_TABS: SubTab[] = useMemo(() => [
        { id: 'count_items', labelAr: 'بنود الجرد', labelEn: 'Count Items', icon: ScanBarcode, badge: countItems.length },
        { id: 'scheduled_items', labelAr: 'المواد المحددة', labelEn: 'Scheduled Items', icon: CalendarClock, badge: countData?.scope_material_ids?.length || 0 },
        { id: 'activity_log', labelAr: 'سجل النشاط', labelEn: 'Activity Log', icon: History },
        { id: 'attachments', labelAr: 'المرفقات', labelEn: 'Attachments', icon: Paperclip },
    ], [countItems.length, countData?.scope_material_ids?.length]);

    // ─── Status Color ────────────────────────────────────────
    const statusConfig = useMemo(() => {
        const status = countData?.status || 'planned';
        const configs: Record<string, { gradient: string; labelAr: string; labelEn: string; badgeColor: string }> = {
            planned: { gradient: 'from-blue-500 to-indigo-600', labelAr: 'مخطط', labelEn: 'Planned', badgeColor: 'bg-blue-100 text-blue-700 border-blue-200' },
            in_progress: { gradient: 'from-amber-500 to-orange-600', labelAr: 'جاري', labelEn: 'In Progress', badgeColor: 'bg-amber-100 text-amber-700 border-amber-200' },
            completed: { gradient: 'from-emerald-500 to-teal-600', labelAr: 'مكتمل', labelEn: 'Completed', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            cancelled: { gradient: 'from-red-500 to-rose-600', labelAr: 'ملغي', labelEn: 'Cancelled', badgeColor: 'bg-red-100 text-red-700 border-red-200' },
        };
        return configs[status] || configs.planned;
    }, [countData?.status]);

    // ─── Handle Close ────────────────────────────────────────
    const handleClose = () => {
        onOpenChange?.(false);
    };

    // ─── Command Center Actions ──────────────────────────────
    // Step 1: Check for overages, then either show dialog or finalize directly
    // Computed summary data for completion dialog
    const completionSummary = useMemo(() => {
        if (!countData || countItems.length === 0) return null;
        const materialMap = new Map<string, { name: string; rolls: number; meters: number }>(); 
        for (const item of countItems) {
            const matId = item.material_id || 'unknown';
            const existing = materialMap.get(matId) || { name: item.material_name || getMaterialName(matId), rolls: 0, meters: 0 };
            existing.rolls += 1;
            existing.meters += item.actual_quantity || 0;
            materialMap.set(matId, existing);
        }
        // Get bulk_stock for each material from the materials list
        const summaryMaterials = Array.from(materialMap.entries()).map(([id, d]) => {
            const mat = (id !== 'unknown') ? materials.find((m: any) => m.id === id) : null;
            const bulkStock = Math.round(((mat as any)?.bulk_stock || (mat as any)?.current_stock || 0) * 100) / 100;
            const counted = Math.round(d.meters * 100) / 100;
            const variance = Math.round((counted - bulkStock) * 100) / 100;
            return {
                id, name: d.name, rolls: d.rolls, meters: counted,
                systemQty: bulkStock,
                variance,
                isMatch: Math.abs(variance) < 0.01 || bulkStock === 0, // if no bulk stock tracked, consider match
            };
        });
        const totalRolls = countItems.length;
        const totalMeters = Math.round(countItems.reduce((s, i) => s + (i.actual_quantity || 0), 0) * 100) / 100;
        const matchCount = summaryMaterials.filter(m => m.isMatch).length;
        const varianceCount = summaryMaterials.filter(m => !m.isMatch).length;
        return { materials: summaryMaterials, totalRolls, totalMeters, matchCount, varianceCount };
    }, [countData, countItems, getMaterialName, materials]);

    const handleCompleteCount = useCallback(async () => {
        if (!countData || countItems.length === 0) return;
        // Show completion summary dialog first
        setCompletionCountType(completionSummary?.varianceCount === 0 ? 'full' : 'partial');
        setShowCompletionSummary(true);
    }, [countData, countItems, completionSummary]);

    // Called when user confirms from summary dialog
    const handleConfirmCompletion = useCallback(async () => {
        if (!countData || countItems.length === 0) return;
        setSaving(true);
        try {
            // Group items by material_id
            const materialGroups = new Map<string, { totalCounted: number; name: string }>();
            for (const item of countItems) {
                const matId = item.material_id;
                if (!matId) continue;
                const existing = materialGroups.get(matId) || { totalCounted: 0, name: item.material_name || getMaterialName(matId) };
                existing.totalCounted += item.actual_quantity || 0;
                materialGroups.set(matId, existing);
            }

            // Fetch current bulk_stock for these materials
            const materialIds = Array.from(materialGroups.keys());
            const { data: matStocks } = await supabase
                .from('fabric_materials')
                .select('id, bulk_stock')
                .in('id', materialIds);

            const stockMap = new Map<string, number>();
            (matStocks || []).forEach((m: any) => stockMap.set(m.id, m.bulk_stock || 0));

            // Check for overages
            const overages: typeof overageItems = [];
            for (const [matId, info] of materialGroups) {
                const available = stockMap.get(matId) || 0;
                if (info.totalCounted > available) {
                    overages.push({
                        materialId: matId,
                        materialName: info.name,
                        counted: Math.round(info.totalCounted * 100) / 100,
                        available: Math.round(available * 100) / 100,
                        overage: Math.round((info.totalCounted - available) * 100) / 100,
                    });
                }
            }

            if (overages.length > 0) {
                // Show overage confirmation
                setOverageItems(overages);
                setShowCompletionSummary(false);
                setShowOverageDialog(true);
                setSaving(false);
                return;
            }

            // No overages → finalize directly
            setShowCompletionSummary(false);
            await finalizeCount();
        } catch (err: any) {
            toast.error(err.message);
            setSaving(false);
        }
    }, [countData, countItems, getMaterialName]);

    // Step 2: The actual finalization (create rolls, deduct stock, complete)
    const finalizeCount = useCallback(async () => {
        if (!countData || !companyId || !tenantId) return;
        setIsFinalizingCount(true);
        setSaving(true);
        try {
            const warehouseId = countData.warehouse_id;

            // ═══════════════════════════════════════════════════════════
            // ─── 1. Promote/Create fabric_rolls from counted items ───
            // 🔑 Strategy:
            //   - If item.roll_id exists (draft synced in background) → promote draft to 'available'
            //   - If item.roll_id is null (offline, sync failed) → insert new roll directly
            //   - If NOT is_loose_stock (scanned existing roll) → skip (already in DB)
            // ═══════════════════════════════════════════════════════════
            let rollsPromoted = 0;
            let rollsCreated = 0;

            for (const item of countItems) {
                if (!item.material_id) continue;

                // Skip scanned existing rolls (they're already real)
                if (!item.is_loose_stock) continue;

                if (item.roll_id) {
                    // ✅ Draft exists → promote to available
                    const { error: promoteErr } = await supabase
                        .from('fabric_rolls')
                        .update({
                            status: 'available',
                            notes: `Stock Count: ${countData.count_number}`,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', item.roll_id)
                        .eq('status', 'draft'); // Safety: only promote drafts!

                    if (promoteErr) {
                        console.error(`Promote failed for ${item.roll_number}:`, promoteErr.message);
                    } else {
                        rollsPromoted++;
                    }
                } else {
                    // ❌ No draft (offline/sync failed) → create new roll directly
                    const rollNum = item.roll_number || `ROLL-${Date.now()}`;
                    const dashIdx = rollNum.lastIndexOf('-');
                    const extractedCode = dashIdx > 0 ? rollNum.substring(0, dashIdx) : null;
                    const rollCode = extractedCode && /[A-Z]/.test(extractedCode) ? extractedCode : buildRollCode({
                        materialName: item.material_name || undefined,
                        colorCode: item.notes?.replace('Color: ', '') || undefined,
                    });

                    const { error: rollError } = await supabase
                        .from('fabric_rolls')
                        .insert({
                            tenant_id: tenantId,
                            company_id: companyId,
                            warehouse_id: warehouseId,
                            material_id: item.material_id,
                            roll_number: rollNum,
                            roll_code: rollCode || null,
                            // roll_seq → auto-assigned by DB trigger
                            initial_length: item.actual_quantity || 0,
                            current_length: item.actual_quantity || 0,
                            reserved_length: 0,
                            cost_per_meter: 0,
                            cost_status: 'pending',
                            status: 'available', // 🔑 مباشرة available (لا يوجد draft سابق)
                            color_name: item.notes?.replace('Color: ', '') || null,
                            notes: `Stock Count: ${countData.count_number}`,
                            source_type: 'stock_count',
                            source_document_id: countData.id,
                            source_document_number: countData.count_number,
                        });

                    if (rollError) {
                        console.error(`Roll creation failed for ${item.roll_number}:`, rollError.message);
                    } else {
                        rollsCreated++;
                    }
                }
            }
            console.log(`✅ [finalizeCount] Rolls: ${rollsPromoted} promoted, ${rollsCreated} created`);

            // ─── 2. Deduct bulk_stock & increase roll_stock per material ───
            const materialGroups = new Map<string, number>();
            for (const item of countItems) {
                if (!item.material_id) continue;
                materialGroups.set(item.material_id, (materialGroups.get(item.material_id) || 0) + (item.actual_quantity || 0));
            }

            for (const [matId, totalLength] of materialGroups) {
                // Get current stock values
                const { data: matData } = await supabase
                    .from('fabric_materials')
                    .select('bulk_stock, roll_stock')
                    .eq('id', matId)
                    .single();

                if (matData) {
                    const currentBulk = matData.bulk_stock || 0;
                    const currentRoll = matData.roll_stock || 0;
                    const newBulk = Math.max(0, currentBulk - totalLength); // Never go negative
                    const newRoll = currentRoll + totalLength;

                    await supabase
                        .from('fabric_materials')
                        .update({
                            bulk_stock: newBulk,
                            roll_stock: newRoll,
                            // total_stock stays the same (bulk + roll = same total)
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', matId);
                }

                // ─── 3. Create inventory movement record (audit only) ───
                // 🔑 Stock count = bulk→roll CONVERSION, NOT new incoming stock
                // quantity: 0 because total stock doesn't change (bulk decreases, roll increases)
                const mvIdx = Array.from(materialGroups.keys()).indexOf(matId) + 1;
                const rollCount = countItems.filter(i => i.material_id === matId).length;
                const remainingBulk = matData ? Math.max(0, (matData.bulk_stock || 0) - totalLength) : 0;
                
                // Structured notes for display in movements tab
                const conversionNotes = JSON.stringify({
                    type: 'bulk_to_roll_conversion',
                    rolled_meters: totalLength,
                    remaining_bulk: remainingBulk,
                    roll_count: rollCount,
                    count_number: countData.count_number,
                    label_ar: `تحويل سائب → ${rollCount} رولون (${totalLength} م) | المتبقي سائب: ${remainingBulk} م`,
                    label_en: `Bulk → ${rollCount} rolls (${totalLength} m) | Remaining loose: ${remainingBulk} m`,
                });

                const { error: mvError } = await supabase
                    .from('inventory_movements')
                    .insert({
                        tenant_id: tenantId,
                        company_id: companyId,
                        to_warehouse_id: warehouseId,
                        product_id: matId,          // legacy FK column
                        material_id: matId,          // new column (no FK)
                        movement_type: 'stock_count_conversion',
                        movement_number: `MV-SC-${countData.count_number.replace('SC-', '')}-${mvIdx}`,
                        movement_date: new Date().toISOString().split('T')[0],
                        quantity: 0,  // 🔑 NOT adding stock — just converting bulk→rolled
                        reference_type: 'stock_count',
                        reference_id: countData.id,
                        reference_number: countData.count_number,
                        notes: conversionNotes,
                        created_by: user?.id,
                    });
                if (mvError) console.warn('Movement insert failed:', mvError.message);
            }

            // ─── 4. Update stock_count status → completed ───
            const totalActual = countItems.reduce((s, i) => s + (i.actual_quantity || 0), 0);
            const totalSystem = countItems.reduce((s, i) => s + (i.system_quantity || 0), 0);

            const { error } = await supabase
                .from('stock_counts')
                .update({
                    status: 'completed',
                    completed_date: new Date().toISOString(),
                    completed_by: user?.id,
                    total_items: countItems.length,
                    counted_items: countItems.filter(i => i.is_counted).length,
                    total_actual_quantity: totalActual,
                    total_system_quantity: totalSystem,
                    total_variance: totalActual - totalSystem,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', countData.id);

            if (error) throw error;

            setCountData(prev => prev ? { ...prev, status: 'completed' } : null);
            setShowOverageDialog(false);
            setShowCompletionSummary(false);
            toast.success(isAr
                ? `✅ تم إنهاء الجرد — ${countItems.length} رولون تم إنشاؤه`
                : `✅ Count completed — ${countItems.length} rolls created`
            );
            // Auto-print if enabled
            if (printAfterSave) {
                setTimeout(() => handlePrintReport(), 500);
            }
            onComplete?.();
        } catch (err: any) {
            toast.error(isAr ? `❌ خطأ: ${err.message}` : `❌ Error: ${err.message}`);
        } finally {
            setSaving(false);
            setIsFinalizingCount(false);
        }
    }, [countData, countItems, companyId, tenantId, user, isAr, onComplete, printAfterSave]);

    const handlePrintReport = useCallback(() => {
        if (!countData) return;
        const rows = countItems.map((item, i) =>
            `<tr><td>${i + 1}</td><td>${item.roll_number || '—'}</td><td>${item.material_name || '—'}</td><td>${item.actual_quantity ?? '—'}</td><td>${item.system_quantity}</td><td>${(item.actual_quantity || 0) - item.system_quantity}</td></tr>`
        ).join('');
        const w = window.open('', '_blank', 'width=800,height=600');
        if (w) {
            w.document.write(`<html dir="rtl"><head><title>${countData.count_number}</title><style>
                body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}
                th,td{border:1px solid #ddd;padding:8px;text-align:center;font-size:12px}
                th{background:#0d9488;color:#fff}h2{color:#0d9488}
            </style></head><body>
            <h2>تقرير الجرد ${countData.count_number}</h2>
            <p>المستودع: ${warehouseName} | التاريخ: ${countData.count_date}</p>
            <table><thead><tr><th>#</th><th>${isAr ? 'رقم الرولون' : 'Roll#'}</th><th>${isAr ? 'المادة' : 'Material'}</th><th>${isAr ? 'الفعلي' : 'Actual'}</th><th>${isAr ? 'النظام' : 'System'}</th><th>${isAr ? 'الفرق' : 'Var'}</th></tr></thead><tbody>${rows}</tbody></table>
            </body></html>`);
            w.document.close(); w.focus(); w.print();
            setTimeout(() => w.close(), 1500);
        }
    }, [countData, countItems, warehouseName, isAr]);

    const handleExportCount = useCallback(() => {
        if (!countData || countItems.length === 0) return;
        const header = 'Roll Number,Material,Actual Qty,System Qty,Variance,Method\n';
        const rows = countItems.map(i =>
            `${i.roll_number || ''},${(i.material_name || '').replace(/,/g, ' ')},${i.actual_quantity || 0},${i.system_quantity},${(i.actual_quantity || 0) - i.system_quantity},${i.scan_method || ''}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${countData.count_number}.csv`;
        a.click();
        toast.success(isAr ? '📥 تم تصدير الملف' : '📥 File exported');
    }, [countData, countItems, isAr]);

    const handleDeleteCount = useCallback(async () => {
        if (!countData) return;
        const confirmed = window.confirm(isAr ? `هل أنت متأكد من حذف الجرد ${countData.count_number}؟` : `Delete count ${countData.count_number}?`);
        if (!confirmed) return;
        setSaving(true);
        try {
            await supabase.from('stock_count_items').delete().eq('stock_count_id', countData.id);
            const { error } = await supabase.from('stock_counts').delete().eq('id', countData.id);
            if (error) throw error;
            toast.success(isAr ? '🗑️ تم حذف الجرد' : '🗑️ Count deleted');
            onComplete?.();
            handleClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }, [countData, isAr, onComplete, handleClose]);

    // ─── Group countItems by material for display ─────────────
    const groupedMaterials = useMemo(() => {
        const groups: Record<string, {
            materialId: string;
            materialName: string;
            items: CountItem[];
            totalLength: number;
            scannedCount: number;
            newCount: number;
        }> = {};
        for (const item of countItems) {
            const matId = item.material_id || 'unknown';
            const matName = item.material_name || getMaterialName(item.material_id);
            if (!groups[matId]) {
                groups[matId] = { materialId: matId, materialName: matName, items: [], totalLength: 0, scannedCount: 0, newCount: 0 };
            }
            groups[matId].items.push(item);
            groups[matId].totalLength += item.actual_quantity || 0;
            if (item.scan_method === 'barcode') {
                groups[matId].scannedCount++;
            } else {
                groups[matId].newCount++;
            }
        }

        // 🔝 Sort: active material always first
        const activeMat = selectedVariantChildId || materialId;
        const result = Object.values(groups);
        if (activeMat) {
            result.sort((a, b) => {
                if (a.materialId === activeMat) return -1;
                if (b.materialId === activeMat) return 1;
                return 0; // keep original order for others
            });
        }
        return result;
    }, [countItems, getMaterialName, materialId, selectedVariantChildId]);

    // 🔁 Accordion: only one group open at a time
    const toggleGroup = (matId: string) => {
        setExpandedGroups(prev => {
            const isCurrentlyOpen = prev[matId] !== false;
            // Close all groups, then toggle the clicked one
            const newState: Record<string, boolean> = {};
            groupedMaterials.forEach(g => { newState[g.materialId] = false; });
            newState[matId] = !isCurrentlyOpen;
            return newState;
        });
    };

    // 🔄 Auto-expand material group when user selects a material for entry
    useEffect(() => {
        if (materialId) {
            const targetId = selectedVariantChildId || materialId;
            setExpandedGroups(prev => {
                const newState: Record<string, boolean> = {};
                groupedMaterials.forEach(g => { newState[g.materialId] = false; });
                newState[targetId] = true;
                return newState;
            });
        }
    }, [materialId, selectedVariantChildId]);

    const renderCountItemsTab = () => (
        <div className="space-y-3">
            {/* ═══ Compact Entry Zone — Accordion Tabs ═══ */}
            {countData && countData.status !== 'completed' && (
                <div className="space-y-0">
                    {/* Tab Switcher */}
                    <div className="flex rounded-t-lg overflow-hidden border border-b-0 border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setEntryMode('scan')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-all",
                                entryMode === 'scan'
                                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500"
                                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                            )}
                        >
                            <ScanBarcode className="w-3.5 h-3.5" />
                            {isAr ? '🟢 مسح باركود' : '🟢 Scan'}
                        </button>
                        <button
                            onClick={() => setEntryMode('create')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-all",
                                entryMode === 'create'
                                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-b-2 border-amber-500"
                                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                            )}
                        >
                            <Package className="w-3.5 h-3.5" />
                            {isAr ? '🟠 إنشاء رولون' : '🟠 New Roll'}
                        </button>
                    </div>

                    {/* Active Zone Content */}
                    <AnimatePresence mode="wait">
                        {entryMode === 'scan' ? (
                            <motion.div key="scan" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                                <div className="p-3 border border-t-0 border-emerald-200 dark:border-emerald-800 rounded-b-lg bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <ScanBarcode className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500`} />
                                            <Input
                                                placeholder={isAr ? 'ادخل الرقم (مثل 001) أو امسح الباركود...' : 'Enter number (e.g. 001) or scan barcode...'}
                                                value={scanInput} onChange={(e) => handleSearchInput(e.target.value)} onKeyDown={handleScan}
                                                className={`h-10 text-sm font-semibold ${isRTL ? 'pr-10 text-right' : 'pl-10'} bg-white dark:bg-gray-800/50 border-emerald-200 dark:border-emerald-700 focus:ring-emerald-500`} dir={isRTL ? 'rtl' : 'ltr'}
                                            />
                                            {isSearching && (
                                                <Loader2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-spin`} />
                                            )}
                                        </div>
                                        <Badge variant="outline" className={cn("text-[10px] px-2 h-7 shrink-0",
                                            isOnline ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                                        )}>
                                            {isOnline ? <Wifi className="w-3 h-3 me-1" /> : <WifiOff className="w-3 h-3 me-1" />}
                                            {isOnline ? (isAr ? 'متصل' : 'Online') : (isAr ? 'غير متصل' : 'Offline')}
                                        </Badge>
                                    </div>
                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                {isAr ? `${searchResults.length} نتيجة` : `${searchResults.length} results`}
                                            </div>
                                            {searchResults.map((r: any) => {
                                                const matData = r.fabric_materials;
                                                const matLabel = matData ? (isAr ? matData.name_ar : (matData.name_en || matData.name_tr)) : '—';
                                                return (
                                                    <button key={r.id} onClick={() => addScannedRoll(r)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-start">
                                                        <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400 min-w-[50px]">#{r.roll_seq || '—'}</span>
                                                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">{r.roll_code || r.roll_number?.split('-').slice(0, -1).join('-') || ''}</span>
                                                        <span className="flex-1 text-sm truncate">{matLabel}</span>
                                                        <span className="text-xs text-muted-foreground">{r.current_length}م</span>
                                                        <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="create" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                                <div className="p-3 border border-t-0 border-amber-200 dark:border-amber-800 rounded-b-lg bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20">
                                    <div className="flex items-end gap-2 flex-wrap">
                                        {/* Material */}
                                        <div className="flex-1 min-w-[180px]">
                                            <Label className="text-[10px] text-muted-foreground mb-1 block">{isAr ? 'المادة' : 'Material'}</Label>
                                            <Select value={materialId} onValueChange={(val) => { setMaterialId(val); setMaterialSearch(''); }} dir={isRTL ? 'rtl' : 'ltr'}>
                                                <SelectTrigger className={`h-9 text-sm border-amber-200 dark:border-amber-700 ${isRTL ? 'text-right' : ''}`}><SelectValue placeholder={isAr ? 'اختر المادة' : 'Select'} /></SelectTrigger>
                                                <SelectContent className={isRTL ? 'text-right' : ''} dir={isRTL ? 'rtl' : 'ltr'}>
                                                    <div className="px-2 pb-2 pt-1">
                                                        <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className={`h-8 text-xs ${isRTL ? 'text-right' : ''}`} autoFocus dir={isRTL ? 'rtl' : 'ltr'} />
                                                    </div>
                                                    {searchedMaterials.map(mat => {
                                                        const stock = (mat as any).current_stock || 0;
                                                        return (
                                                            <SelectItem key={mat.id} value={mat.id}>
                                                                <span className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                    <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">{mat.code}</span>
                                                                    <span className="flex-1 truncate">{getLocalizedName(mat, language)}</span>
                                                                    {/* TODO: Permission-based — show for company admin, hide for warehouse keeper */}
                                                                    {stock > 0 && (
                                                                        <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-gray-300 text-gray-500 font-mono shrink-0">
                                                                            {Number(stock).toFixed(1)}{isAr ? 'م' : 'm'}
                                                                        </Badge>
                                                                    )}
                                                                    {(mat.has_variants || mat.is_variant_parent) && (
                                                                        <Badge variant="outline" className="text-[9px] px-1 h-4 border-purple-300 text-purple-600 shrink-0">{isAr ? 'متغيرات' : 'Var'}</Badge>
                                                                    )}
                                                                </span>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                    {searchedMaterials.length === 0 && (
                                                        <div className="py-3 text-center text-xs text-muted-foreground">{isAr ? 'لا نتائج' : 'No results'}</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Variants / Color */}
                                        {materialHasVariants && variantChildren.length > 0 ? (
                                            <>
                                                {primaryAxisOptions.length > 0 && variantAxesInfo[0] && (
                                                    <div className="w-[120px]">
                                                        <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Tag className="w-3 h-3" />{isAr ? variantAxesInfo[0].labelAr : variantAxesInfo[0].labelEn}</Label>
                                                        <Select value={selectedDesign} onValueChange={(val) => { setSelectedDesign(val); setSelectedColor(''); }}>
                                                            <SelectTrigger className="h-8 text-xs border-amber-200"><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                                                            <SelectContent>{primaryAxisOptions.map(d => (<SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>))}</SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                {secondaryAxisOptions.length > 0 && variantAxesInfo[1] && (
                                                    <div className="w-[120px]">
                                                        <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Palette className="w-3 h-3" />{isAr ? variantAxesInfo[1].labelAr : variantAxesInfo[1].labelEn}</Label>
                                                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                                                            <SelectTrigger className="h-8 text-xs border-amber-200"><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                                                            <SelectContent>{secondaryAxisOptions.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    <span className="flex items-center gap-2">
                                                                        {c.hex && <div className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: c.hex }} />}
                                                                        {c.label}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}</SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </>
                                        ) : !materialHasVariants && (
                                            <div className="w-[100px]">
                                                <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Palette className="w-3 h-3" />{isAr ? 'اللون' : 'Color'}</Label>
                                                <Input className="h-8 text-xs border-amber-200" placeholder={isAr ? 'اللون' : 'Color'} value={colorName} onChange={(e) => setColorName(e.target.value)} />
                                            </div>
                                        )}

                                        {/* Length + Add */}
                                        <div className="w-[90px]">
                                            <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Ruler className="w-3 h-3" />{isAr ? 'الطول (م)' : 'Length'}</Label>
                                            <Input ref={rollLengthRef} className={`h-9 text-sm font-bold border-amber-200 ${isRTL ? 'text-right' : ''}`} type="text" inputMode="decimal" placeholder="0.00"
                                                value={rollLength} onChange={(e) => setRollLength(normalizeNumerals(e.target.value).replace(/[^0-9.]/g, ''))} onKeyDown={handleLengthKeyDown} />
                                        </div>
                                        <Button className="h-9 px-5 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
                                            onClick={handleManualAdd}
                                            disabled={!materialId || !rollLength || Number(rollLength) <= 0 || (materialHasVariants && !selectedVariantChildId)}>
                                            <Plus className="h-4 w-4 me-1" />{isAr ? 'إضافة' : 'Add'}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* 🏷️ Last Added Roll — compact inline card */}
            {countItems.length > 0 && (() => {
                const lastItem = countItems[countItems.length - 1];
                return (
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500/15 via-cyan-500/8 to-transparent dark:from-teal-900/30 border border-teal-200 dark:border-teal-800 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold shrink-0">{isAr ? '🏷️ آخر رولون:' : '🏷️ Last Roll:'}</span>
                        <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300">{lastItem.roll_number || '—'}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{lastItem.material_name || getMaterialName(lastItem.material_id)}</span>
                        <span className="ms-auto font-mono text-lg font-extrabold text-teal-700 dark:text-teal-400 shrink-0">{lastItem.actual_quantity ?? '—'}<span className="text-xs text-teal-500 ms-1 font-bold">{isAr ? 'م' : 'm'}</span></span>
                    </div>
                );
            })()}

            <Separator />

            {/* ═══ Items — Grouped by Material ═══ */}
            <div className="space-y-3">
                <span className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-500" />
                    {isAr ? 'البنود المُجرَدة' : 'Counted Items'}
                    <Badge variant="secondary" className="text-xs">{countItems.length}</Badge>
                </span>
                {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : groupedMaterials.length > 0 ? (
                    <div className="space-y-2">
                        {groupedMaterials.map((group) => {
                            const isExpanded = groupedMaterials.length <= 1 ? expandedGroups[group.materialId] !== false : expandedGroups[group.materialId] === true;
                            return (
                                <Card key={group.materialId} className="border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {/* Material Header Row */}
                                    <button
                                        onClick={() => toggleGroup(group.materialId)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-start"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4 text-teal-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.materialName}</div>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {group.scannedCount > 0 && (
                                                    <Badge className="text-[9px] px-1.5 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        🟢 {group.scannedCount} {isAr ? 'ممسوح' : 'scanned'}
                                                    </Badge>
                                                )}
                                                {group.newCount > 0 && (
                                                    <Badge className="text-[9px] px-1.5 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        🟠 {group.newCount} {isAr ? 'جديد' : 'new'}
                                                    </Badge>
                                                )}
                                                <span className="text-[10px] text-gray-400">
                                                    {isAr ? 'متوسط:' : 'avg:'} {group.items.length > 0 ? (group.totalLength / group.items.length).toFixed(1) : '0'}{isAr ? 'م' : 'm'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-end shrink-0">
                                            <div className="text-sm font-bold font-mono text-teal-700 dark:text-teal-400">{group.totalLength.toLocaleString()} <span className="text-[10px] text-gray-400">{isAr ? 'م' : 'm'}</span></div>
                                            <div className="text-[10px] text-gray-500">{group.items.length} {isAr ? 'رولون' : 'rolls'}</div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : (isRTL ? <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />)}
                                    </button>

                                    {/* Expanded Rolls */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                                    {[...group.items].reverse().map((item, idx) => {
                                                        const isScanned = item.scan_method === 'barcode';
                                                        const isLastAdded = item.id === lastAddedRollId;
                                                        const originalIdx = group.items.length - idx; // show original order number
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-4 py-2 border-b border-gray-100/70 dark:border-gray-800/70 last:border-b-0 transition-colors duration-1000",
                                                                    isScanned ? "border-s-[3px] border-s-emerald-400" : "border-s-[3px] border-s-amber-400",
                                                                    isLastAdded && "bg-teal-50/80 dark:bg-teal-900/20 ring-1 ring-teal-300 dark:ring-teal-700"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold",
                                                                    isLastAdded ? "bg-teal-200 text-teal-800 animate-pulse" : isScanned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                                )}>
                                                                    {originalIdx}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                                                                            {item.roll_number ? (item.roll_number.length > 16 ? `...${item.roll_number.slice(-10)}` : item.roll_number) : '—'}
                                                                        </span>
                                                                        <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4 shrink-0",
                                                                            isScanned ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                                                        )}>
                                                                            {isScanned ? (isAr ? '🟢 مسح' : '🟢 Scan') : (isAr ? '🟠 جديد' : '🟠 New')}
                                                                        </Badge>
                                                                    </div>
                                                                    {item.notes?.startsWith('Color:') && (
                                                                        <span className="text-[10px] text-purple-500">🎨 {item.notes.replace('Color: ', '')}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-end shrink-0">
                                                                    <span className="text-sm font-bold font-mono">{item.actual_quantity ?? '—'} <span className="text-[10px] text-gray-400">{isAr ? 'م' : 'm'}</span></span>
                                                                </div>
                                                                {countData?.status !== 'completed' && (
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500 shrink-0" onClick={() => handleRemoveItem(item.id)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <ScanBarcode className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{isAr ? 'لم يتم إضافة أي بنود بعد' : 'No items added yet'}</h3>
                        <p className="text-xs text-gray-500 max-w-xs">{isAr ? '🟢 امسح الباركود لتحقق من رولون موجود — أو 🟠 أدخل المادة يدوياً لإنشاء رولون من السائب' : '🟢 Scan barcode to verify existing roll — or 🟠 enter material manually to create from loose stock'}</p>
                    </div>
                )}
            </div>
            {/* Label Preview */}
            <AlertDialog open={showLabelPreview} onOpenChange={setShowLabelPreview}>
                <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-amber-500" />{isAr ? 'معاينة ملصق الرولون' : 'Roll Label Preview'}</AlertDialogTitle>
                        <AlertDialogDescription>{isAr ? 'تأكد من البيانات ثم اضغط تأكيد + طباعة' : 'Verify data then press Confirm + Print'}</AlertDialogDescription>
                    </AlertDialogHeader>
                    {pendingItem && (
                        <div className="my-4 p-4 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/30">
                            <div className="text-center space-y-3">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 border-2 border-slate-200 rounded-lg mx-auto flex items-center justify-center">
                                    <QrCode className="h-14 w-14 text-slate-400" />
                                </div>
                                <div className="font-mono text-lg font-bold text-amber-700 dark:text-amber-400">{pendingItem.rollNumber}</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-end text-muted-foreground">{isAr ? 'المادة:' : 'Material:'}</div>
                                    <div className="text-start font-medium">{pendingItem.materialName}</div>
                                    {pendingItem.colorName && (<><div className="text-end text-muted-foreground">{isAr ? 'اللون:' : 'Color:'}</div><div className="text-start font-medium">{pendingItem.colorName}</div></>)}
                                    <div className="text-end text-muted-foreground">{isAr ? 'الطول:' : 'Length:'}</div>
                                    <div className="text-start font-medium">{pendingItem.rollLength} {isAr ? 'متر' : 'm'}</div>
                                    <div className="text-end text-muted-foreground">{isAr ? 'النوع:' : 'Type:'}</div>
                                    <div className="text-start"><Badge className="text-[10px] bg-amber-100 text-amber-700">🟠 {isAr ? 'سائب → رولون' : 'Loose → Roll'}</Badge></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingItem(null)}>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <Button ref={confirmBtnRef} className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                            onClick={confirmAndPrint} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAndPrint(); } }} disabled={isSavingItem}>
                            {isSavingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                            {isAr ? 'تأكيد + طباعة' : 'Confirm + Print'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );




    // ════════════════════════════════════════════════════════════
    // 📑 TAB: Scheduled Items (المواد المحددة للجرد)
    // ════════════════════════════════════════════════════════════
    const [scheduledMaterials, setScheduledMaterials] = useState<any[]>([]);
    const [loadingScheduled, setLoadingScheduled] = useState(false);

    useEffect(() => {
        if (activeTab === 'scheduled_items' && countData?.scope_material_ids?.length) {
            loadScheduledMaterials();
        }
    }, [activeTab, countData?.scope_material_ids]);

    const loadScheduledMaterials = async () => {
        if (!countData?.scope_material_ids?.length) return;
        setLoadingScheduled(true);
        try {
            const { data } = await supabase
                .from('fabric_materials')
                .select('id, name_ar, name_en, name_tr, name_ru, name_uk, code')
                .in('id', countData.scope_material_ids);

            const materialsWithStatus = (data || []).map(mat => {
                const countedForMat = countItems.filter(i => i.material_id === mat.id && i.is_counted);
                const totalForMat = countItems.filter(i => i.material_id === mat.id);
                return {
                    ...mat,
                    name: getLocalizedName(mat, language),
                    counted: countedForMat.length,
                    total: totalForMat.length,
                    status: countedForMat.length === 0
                        ? 'pending'
                        : countedForMat.some(i => i.variance !== 0 && i.variance !== null)
                            ? 'variance'
                            : 'done',
                };
            });
            setScheduledMaterials(materialsWithStatus);
        } catch (err) {
            console.error('Failed to load scheduled materials:', err);
        } finally {
            setLoadingScheduled(false);
        }
    };

    const renderScheduledItemsTab = () => (
        <div className="space-y-4">
            {/* Summary */}
            {scheduledMaterials.length > 0 && (
                <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {isAr ? 'تقدم جرد المواد' : 'Material Count Progress'}
                            </span>
                            <span className="text-xs font-bold">
                                {scheduledMaterials.filter(m => m.status === 'done').length}/{scheduledMaterials.length}
                            </span>
                        </div>
                        <Progress
                            value={scheduledMaterials.length > 0
                                ? (scheduledMaterials.filter(m => m.status === 'done').length / scheduledMaterials.length) * 100
                                : 0
                            }
                            className="h-2"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Materials List */}
            {loadingScheduled ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : scheduledMaterials.length > 0 ? (
                <div className="space-y-2">
                    {scheduledMaterials.map((mat, idx) => (
                        <motion.div
                            key={mat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                        >
                            <Card className={cn(
                                "border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all",
                                mat.status === 'done' && "border-s-2 border-s-emerald-500",
                                mat.status === 'variance' && "border-s-2 border-s-amber-500",
                                mat.status === 'pending' && "border-s-2 border-s-gray-300",
                            )}>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                                            mat.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                                            mat.status === 'variance' ? 'bg-amber-100 dark:bg-amber-900/20' :
                                            'bg-gray-100 dark:bg-gray-800'
                                        )}>
                                            {mat.status === 'done' ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> :
                                             mat.status === 'variance' ? <AlertTriangle className="w-4.5 h-4.5 text-amber-600" /> :
                                             <Package className="w-4.5 h-4.5 text-gray-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {mat.name}
                                            </div>
                                            {mat.code && (
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{mat.code}</div>
                                            )}
                                        </div>
                                        <div className="text-end shrink-0">
                                            <Badge variant="outline" className={cn(
                                                "text-[10px]",
                                                mat.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                mat.status === 'variance' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                'bg-gray-50 text-gray-500 border-gray-200'
                                            )}>
                                                {mat.status === 'done' ? (isAr ? '✓ تم' : '✓ Done') :
                                                 mat.status === 'variance' ? (isAr ? '⚠ فرق' : '⚠ Var') :
                                                 (isAr ? '⏳ بانتظار' : '⏳ Pending')}
                                            </Badge>
                                            {mat.counted > 0 && (
                                                <div className="text-[10px] text-gray-400 mt-1">
                                                    {mat.counted} {isAr ? 'رولون' : 'rolls'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <CalendarClock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                        {isAr ? 'لا توجد مواد محددة' : 'No materials assigned'}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-xs">
                        {isAr
                            ? 'هذا الجرد يشمل جميع مواد المستودع'
                            : 'This count covers all warehouse materials'}
                    </p>
                </div>
            )}
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // 📑 TAB: Activity Log (سجل النشاط)
    // ════════════════════════════════════════════════════════════
    const renderActivityLogTab = () => (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-4", statusConfig.gradient)}>
                <History className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                {isAr ? 'سجل النشاط' : 'Activity Log'}
            </h3>
            <p className="text-xs text-gray-500 max-w-xs">
                {isAr ? 'سيتم تنفيذ سجل النشاط في المرحلة القادمة' : 'Activity log will be implemented in the next phase'}
            </p>
            <Badge variant="secondary" className="mt-3 text-[10px]">
                🔜 {isAr ? 'قريباً' : 'Coming Soon'}
            </Badge>
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // 📑 TAB: Attachments (المرفقات)
    // ════════════════════════════════════════════════════════════
    const renderAttachmentsTab = () => (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-4", statusConfig.gradient)}>
                <Paperclip className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                {isAr ? 'المرفقات' : 'Attachments'}
            </h3>
            <p className="text-xs text-gray-500 max-w-xs">
                {isAr ? 'سيتم تنفيذ المرفقات في المرحلة القادمة' : 'Attachments will be implemented in the next phase'}
            </p>
            <Badge variant="secondary" className="mt-3 text-[10px]">
                🔜 {isAr ? 'قريباً' : 'Coming Soon'}
            </Badge>
        </div>
    );

    // ─── Render Tab Content ──────────────────────────────────
    const renderTabContent = () => {
        switch (activeTab) {
            case 'count_items': return renderCountItemsTab();
            case 'scheduled_items': return renderScheduledItemsTab();
            case 'activity_log': return renderActivityLogTab();
            case 'attachments': return renderAttachmentsTab();
            default: return null;
        }
    };

    // ════════════════════════════════════════════════════════════
    // 🏠 CREATE MODE — New Count Form
    // ════════════════════════════════════════════════════════════
    const renderCreateForm = () => (
        <div className="p-5 space-y-5">
            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isAr ? 'إنشاء جرد مخزني جديد' : 'Create New Stock Count'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {isAr ? 'اختر المستودع ونوع الجرد للبدء' : 'Select warehouse and count type to start'}
                </p>
            </div>

            {/* Warehouse */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isAr ? 'المستودع' : 'Warehouse'}
                </label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="h-11 bg-gray-50 dark:bg-gray-800/50">
                        <Warehouse className="w-4 h-4 text-gray-400 me-2" />
                        <SelectValue placeholder={isAr ? 'اختر المستودع' : 'Select warehouse'} />
                    </SelectTrigger>
                    <SelectContent>
                        {warehouses.map(wh => (
                            <SelectItem key={wh.id} value={wh.id}>
                                {getLocalizedName(wh, language)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Count Type — 2 modes only */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isAr ? 'نوع الجرد' : 'Count Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {COUNT_MODES.map(mode => {
                        const Icon = mode.icon;
                        const isSelected = selectedMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                                    isSelected
                                        ? `${mode.bgColor} border-current ${mode.color} shadow-sm`
                                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}
                            >
                                <div className={cn("p-2 rounded-lg", isSelected ? mode.bgColor : 'bg-gray-100 dark:bg-gray-800')}>
                                    <Icon className={cn("w-5 h-5", isSelected ? mode.color : 'text-gray-400')} />
                                </div>
                                <div className={cn("text-sm font-semibold", isSelected ? mode.color : 'text-gray-700 dark:text-gray-300')}>
                                    {isAr ? mode.labelAr : mode.labelEn}
                                </div>
                                <div className="text-[10px] text-gray-500 leading-tight">
                                    {isAr ? mode.descAr : mode.descEn}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                </label>
                <Input
                    placeholder={isAr ? 'أضف ملاحظات...' : 'Add notes...'}
                    value={countNotes}
                    onChange={(e) => setCountNotes(e.target.value)}
                    className="h-10 bg-gray-50 dark:bg-gray-800/50"
                />
            </div>

            {/* Create Button */}
            <Button
                onClick={handleCreateCount}
                disabled={saving || !selectedWarehouse}
                className="w-full h-12 gap-2 text-sm font-bold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/20"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isAr ? 'بدء الجرد' : 'Start Count'}
            </Button>
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // 🎨 Main Render
    // ════════════════════════════════════════════════════════════
    return (
        <>
        <Sheet open={isOpen} onOpenChange={(o) => !o && handleClose()}>
            <SheetContent
                side={isRTL ? 'left' : 'right'}
                className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:w-[65vw] max-w-[1200px] p-0 border-0 [&>button]:hidden"
            >
                {/* ═══ HEADER — Gradient ═══ */}
                <div className={cn("bg-gradient-to-r p-5", countData ? statusConfig.gradient : 'from-teal-500 to-cyan-600')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-white">
                                    {isAr ? 'الجرد المخزني' : 'Stock Count'}
                                </SheetTitle>
                                <p className="text-sm text-white/70">
                                    {countData
                                        ? `${countData.count_number} • ${warehouseName}`
                                        : (isAr ? 'إنشاء جرد جديد' : 'Create new count')
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {countData && (
                                <Badge variant="outline" className="text-white/90 border-white/30 text-[10px]">
                                    {isAr ? statusConfig.labelAr : statusConfig.labelEn}
                                </Badge>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClose}
                                className="text-white/80 hover:text-white hover:bg-white/10"
                            >
                                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>

                    {/* Quick Stats + Command Buttons merged */}
                    {countData && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {[
                                { label: isAr ? 'بنود' : 'Items', value: countItems.length, icon: Hash },
                                { label: isAr ? 'مُجرَد' : 'Counted', value: countedCount, icon: BadgeCheck },
                                { label: isAr ? 'مطابق' : 'Match', value: matchCount, icon: CheckCircle2 },
                                { label: isAr ? 'فرق' : 'Variance', value: varianceCount, icon: BarChart3 },
                            ].map(s => (
                                <div key={s.label} className="px-2.5 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm flex items-center gap-2">
                                    <s.icon className="w-3.5 h-3.5 text-white/80" />
                                    <span className="text-base font-bold text-white">{s.value}</span>
                                    <span className="text-[10px] text-white/80 font-medium">{s.label}</span>
                                </div>
                            ))}
                            {/* 📏 Meters badge */}
                            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-400/25 backdrop-blur-sm flex items-center gap-2">
                                <Ruler className="w-3.5 h-3.5 text-white" />
                                <span className="text-base font-bold text-white">{countItems.reduce((s, i) => s + (i.actual_quantity || 0), 0).toLocaleString()}</span>
                                <span className="text-[10px] text-white/90 font-medium">{isAr ? 'م' : 'm'}</span>
                            </div>
                            {/* Spacer */}
                            <div className="flex-1" />
                            {/* Command buttons */}
                            {countData.status !== 'completed' && (
                                <Button size="sm" className="h-7 gap-1 text-[11px] bg-white/25 hover:bg-white/35 text-white border-0 backdrop-blur-sm font-semibold"
                                    onClick={handleCompleteCount} disabled={saving || countItems.length === 0}>
                                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <SquareCheckBig className="h-3 w-3" />}
                                    {isAr ? 'إنهاء' : 'Done'}
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-white/90 hover:text-white hover:bg-white/15"
                                onClick={handlePrintReport} disabled={countItems.length === 0}>
                                <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-white/90 hover:text-white hover:bg-white/15"
                                onClick={handleExportCount} disabled={countItems.length === 0}>
                                <FileDown className="h-3.5 w-3.5" />
                            </Button>
                            {countData && (
                                <QRPopover docType="stock_count" docNumber={countData.count_number} docId={countData.id} displayNumber={countData.count_number} className="h-7 text-[10px] text-white/90 hover:text-white" />
                            )}
                            {countData.status !== 'completed' && (
                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-white bg-red-500/30 hover:bg-red-500/50 rounded-md"
                                    onClick={handleDeleteCount} disabled={saving}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ Content Area ═══ */}
                {countData ? (
                    <>
                        {/* Sub-tabs Bar */}
                        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <div className="overflow-x-auto">
                                <div className="flex px-2 gap-0.5 min-w-max">
                                    {SUB_TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all whitespace-nowrap border-b-2",
                                                activeTab === tab.id
                                                    ? "border-current text-gray-900 dark:text-white"
                                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                            )}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            {isAr ? tab.labelAr : tab.labelEn}
                                            {tab.badge !== undefined && tab.badge > 0 && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 h-4 ms-1">
                                                    {tab.badge}
                                                </Badge>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>



                        {/* Tab Content */}
                        <ScrollArea className="h-[calc(100vh-270px)]">
                            <div className="p-5">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: isRTL ? 10 : -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {renderTabContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                    </>
                ) : (
                    <ScrollArea className="h-[calc(100vh-130px)]">
                        {renderCreateForm()}
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>

        {/* ═══ Completion Summary Dialog ═══ */}
        <AlertDialog open={showCompletionSummary} onOpenChange={setShowCompletionSummary}>
            <AlertDialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                <AlertDialogTitle className="sr-only">{isAr ? 'ملخص الجرد المخزني' : 'Stock Count Summary'}</AlertDialogTitle>
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 flex items-center justify-center">
                            <ClipboardCheck className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{isAr ? '📊 ملخص الجرد المخزني' : '📊 Stock Count Summary'}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{countData?.count_number}</p>
                        </div>
                    </div>

                    {completionSummary && (
                        <>
                            {/* Quick Stats Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800">
                                    <Package className="w-5 h-5 text-teal-600 shrink-0" />
                                    <div>
                                        <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-400">{completionSummary.totalRolls}</div>
                                        <div className="text-[10px] text-teal-600/70">{isAr ? 'إجمالي الرولونات' : 'Total Rolls'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <Ruler className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{completionSummary.totalMeters}</div>
                                        <div className="text-[10px] text-emerald-600/70">{isAr ? 'إجمالي الأمتار' : 'Total Meters'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Material Breakdown */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    {isAr ? 'تفاصيل المواد' : 'Material Breakdown'}
                                </div>
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="text-start p-2 font-medium">{isAr ? 'المادة' : 'Material'}</th>
                                            <th className="text-center p-2 font-medium">{isAr ? 'رولونات' : 'Rolls'}</th>
                                            <th className="text-center p-2 font-medium">{isAr ? 'المجرود' : 'Counted'}</th>
                                            <th className="text-center p-2 font-medium text-muted-foreground">{isAr ? 'النظام' : 'System'}</th>
                                            <th className="text-center p-2 font-medium">{isAr ? 'الحالة' : 'Status'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {completionSummary.materials.map(mat => (
                                            <tr key={mat.id} className="border-t">
                                                <td className="p-2 font-medium">{mat.name}</td>
                                                <td className="p-2 text-center font-mono">{mat.rolls}</td>
                                                <td className="p-2 text-center font-mono font-bold">{mat.meters}{isAr ? ' م' : ' m'}</td>
                                                <td className="p-2 text-center font-mono text-muted-foreground">{mat.systemQty}{isAr ? ' م' : ' m'}</td>
                                                <td className="p-2 text-center">
                                                    {mat.isMatch ? (
                                                        <Badge className="text-[9px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            ✅ {isAr ? 'مطابق' : 'Match'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="text-[9px] h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                            ⚠️ {isAr ? 'فرق' : 'Var'} {mat.variance > 0 ? '+' : ''}{mat.variance}
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4 text-[10px]">
                                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> {isAr ? 'مطابق' : 'Match'}: {completionSummary.matchCount}</span>
                                    <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> {isAr ? 'فروقات' : 'Variance'}: {completionSummary.varianceCount}</span>
                                </div>
                            </div>

                            {/* Count Type Selector */}
                            {completionSummary.varianceCount > 0 && (
                                <div className="space-y-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">{isAr ? 'نوع الإنهاء:' : 'Completion Type:'}</div>
                                    <div className="space-y-1.5">
                                        <label className={cn(
                                            "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-xs",
                                            completionCountType === 'full'
                                                ? "bg-white dark:bg-gray-800 border-blue-400 ring-1 ring-blue-400"
                                                : "bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}>
                                            <input type="radio" name="countType" checked={completionCountType === 'full'}
                                                onChange={() => setCompletionCountType('full')} className="accent-blue-600" />
                                            <div>
                                                <div className="font-semibold">{isAr ? '📋 جرد كلّي' : '📋 Full Count'}</div>
                                                <div className="text-[10px] text-muted-foreground">{isAr ? 'كل المواد تعتبر مكتملة الجرد (إقرار بالفروقات)' : 'All materials considered fully counted (variances acknowledged)'}</div>
                                            </div>
                                        </label>
                                        <label className={cn(
                                            "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-xs",
                                            completionCountType === 'partial'
                                                ? "bg-white dark:bg-gray-800 border-blue-400 ring-1 ring-blue-400"
                                                : "bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}>
                                            <input type="radio" name="countType" checked={completionCountType === 'partial'}
                                                onChange={() => setCompletionCountType('partial')} className="accent-blue-600" />
                                            <div>
                                                <div className="font-semibold">{isAr ? '📝 جرد جزئي' : '📝 Partial Count'}</div>
                                                <div className="text-[10px] text-muted-foreground">{isAr ? 'المواد المطابقة = كلّي، المواد بفروقات = جزئي' : 'Matching = full, Variance = partial'}</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Print option */}
                            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <input type="checkbox" checked={printAfterSave} onChange={(e) => setPrintAfterSave(e.target.checked)} className="accent-teal-600 w-4 h-4" />
                                <Printer className="w-4 h-4 text-gray-500" />
                                <span className="text-xs font-medium">{isAr ? '🖨️ طباعة التقرير بعد الحفظ' : '🖨️ Print report after save'}</span>
                            </label>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setShowCompletionSummary(false)} disabled={saving}>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            size="sm"
                            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6"
                            onClick={handleConfirmCompletion}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : <SquareCheckBig className="w-4 h-4 me-1.5" />}
                            {isAr ? '✅ تأكيد الإنهاء' : '✅ Confirm & Complete'}
                        </Button>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>

        {/* ═══ Overage Confirmation Dialog ═══ */}
        {/* Note: This must be outside Sheet but inside the Fragment */}
        <AlertDialog open={showOverageDialog} onOpenChange={setShowOverageDialog}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogTitle className="sr-only">{isAr ? 'تنبيه تجاوز الكمية' : 'Overage Warning'}</AlertDialogTitle>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base">{isAr ? 'تنبيه: تجاوز الكمية المتاحة' : 'Warning: Exceeds Available Stock'}</h3>
                            <p className="text-xs text-muted-foreground">{isAr ? 'المواد التالية تجاوزت المخزون السائب المتاح' : 'The following materials exceed available bulk stock'}</p>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-start p-2 font-medium">{isAr ? 'المادة' : 'Material'}</th>
                                    <th className="text-center p-2 font-medium">{isAr ? 'المتاح' : 'Available'}</th>
                                    <th className="text-center p-2 font-medium">{isAr ? 'المجرود' : 'Counted'}</th>
                                    <th className="text-center p-2 font-medium text-amber-600">{isAr ? 'الزيادة' : 'Overage'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overageItems.map(item => (
                                    <tr key={item.materialId} className="border-t">
                                        <td className="p-2 font-medium">{item.materialName}</td>
                                        <td className="p-2 text-center text-muted-foreground">{item.available} م</td>
                                        <td className="p-2 text-center">{item.counted} م</td>
                                        <td className="p-2 text-center text-amber-600 font-bold">+{item.overage} م</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                        {isAr
                            ? '⚠️ سيتم تصفير المخزون السائب للمواد المتجاوزة وإنشاء الرولونات بالكميات المُدخلة.'
                            : '⚠️ Bulk stock for exceeded materials will be set to 0, and rolls will be created with entered quantities.'}
                    </p>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowOverageDialog(false)} disabled={isFinalizingCount}>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={finalizeCount}
                            disabled={isFinalizingCount}
                        >
                            {isFinalizingCount ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : <SquareCheckBig className="w-3.5 h-3.5 me-1" />}
                            {isAr ? 'تأكيد مع التجاوز' : 'Confirm with Overage'}
                        </Button>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

export default StockCountSheet;
