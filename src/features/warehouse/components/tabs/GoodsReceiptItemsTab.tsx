/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Goods Receipt Items Tab — تبويب بنود الاستلام (Fabric GRN)
 * ════════════════════════════════════════════════════════════════
 *
 * Phase 13E-2: Fabric GRN — إذن استلام الأقمشة
 *
 * يوفر:
 * - عرض بنود فاتورة الشراء المرتبطة (المتوقع استلامه)
 * - إدخال تفاصيل الرولونات (الرقم، الطول، اللون، الجودة)
 * - مقارنة الكمية المطلوبة vs المستلمة مع تتبع الفروقات
 * - إنشاء سجلات fabric_rolls تلقائياً عند التأكيد
 * - تحديث حالة الاستلام (غير مستلم / جزئي / مكتمل)
 * - مسح الباركود / RFID
 * - حفظ تلقائي فوري في localStorage + مزامنة Supabase
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useMaterials } from '../../hooks/useWarehouseQueries';
import {
    receiptLocalStore,
    generateRollNumber,
    generateBatchId,
    type ReceiptItem,
} from '../../services/receiptLocalStore';

// UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Icons
import {
    Plus, Trash2, QrCode, Camera, Radio,
    Cloud, CloudOff, Loader2, CheckCircle2, Clock,
    Package, Tag, Printer, Boxes, Ruler, Filter,
    Wifi, WifiOff, Barcode, AlertTriangle,
    ChevronDown, ChevronUp, FileText, ArrowRight,
    ShieldCheck, ShieldAlert, CircleDot, CheckCircle, Circle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
interface SourceDocumentItem {
    id: string;
    material_id?: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    total: number;
    unit?: string;
    notes?: string;
    received_quantity?: number;
}

// ─── Props ───────────────────────────────────────────────────
interface GoodsReceiptItemsTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

// ─── Quality Options ─────────────────────────────────────────
const QUALITY_OPTIONS: { value: string; labelAr: string; labelEn: string; color: string }[] = [
    { value: 'A', labelAr: 'ممتاز (A)', labelEn: 'Excellent (A)', color: 'text-green-600' },
    { value: 'B', labelAr: 'جيد (B)', labelEn: 'Good (B)', color: 'text-blue-600' },
    { value: 'C', labelAr: 'مقبول (C)', labelEn: 'Acceptable (C)', color: 'text-amber-600' },
    { value: 'damaged', labelAr: 'تالف', labelEn: 'Damaged', color: 'text-red-600' },
];

// ════════════════════════════════════════════════════════════════
// 🎯 Main Tab Component
// ════════════════════════════════════════════════════════════════

export function GoodsReceiptItemsTab({ data, mode, onChange }: GoodsReceiptItemsTabProps) {
    const { language, isRTL } = useLanguage();
    const { materials } = useMaterials();

    // ─── Local State ─────────────────────────────────────────
    const [materialId, setMaterialId] = useState('');
    const [colorName, setColorName] = useState('');
    const [rollLength, setRollLength] = useState('');
    const [quality, setQuality] = useState<string>('A');
    const [selectedSourceItemId, setSelectedSourceItemId] = useState('');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [filterText, setFilterText] = useState('all');
    const [isSaving, setIsSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showInvoiceItems, setShowInvoiceItems] = useState(true);

    // Label preview
    const [showLabelPreview, setShowLabelPreview] = useState(false);
    const [pendingItem, setPendingItem] = useState<ReceiptItem | null>(null);

    // Refs
    const rollLengthInputRef = useRef<HTMLInputElement>(null);

    // Items from data
    const items: ReceiptItem[] = data?.receipt_items || [];
    const sessionId = data?.sessionId || data?.id || '';
    const sourceItems: SourceDocumentItem[] = data?.source_items || [];
    const sourceDocument = data?.source_document;

    const readOnly = mode === 'view';

    // ─── Filter materials to invoice items only ──────────────
    const availableMaterials = useMemo(() => {
        if (sourceItems.length === 0) return materials;
        const sourceMatIds = new Set(
            sourceItems
                .map(si => si.material_id || si.product_id)
                .filter(Boolean)
        );
        if (sourceMatIds.size === 0) return materials;
        const filtered = materials.filter(m => sourceMatIds.has(m.id));
        return filtered.length > 0 ? filtered : materials;
    }, [materials, sourceItems]);

    // ─── Online/Offline ──────────────────────────────────────
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

    // ─── Receipt Stats per Source Item ────────────────────────
    const sourceItemStats = useMemo(() => {
        const map: Record<string, { received: number; rollCount: number }> = {};
        for (const si of sourceItems) {
            // Match by sourceItemId first, then fallback to materialId match
            const matchingRolls = items.filter(i =>
                i.sourceItemId === si.id ||
                (!i.sourceItemId && i.materialId === (si.material_id || si.product_id))
            );
            map[si.id] = {
                received: matchingRolls.reduce((s, r) => s + (r.rollLength || 0), 0),
                rollCount: matchingRolls.length,
            };
        }
        return map;
    }, [items, sourceItems]);

    // ─── Overall Stats ───────────────────────────────────────
    const stats = useMemo(() => ({
        totalItems: items.length,
        totalLength: items.reduce((sum, i) => sum + (i.rollLength || 0), 0),
        syncedCount: items.filter(i => i.syncStatus === 'synced').length,
        pendingCount: items.filter(i => i.syncStatus === 'pending' || i.syncStatus === 'syncing').length,
        errorCount: items.filter(i => i.syncStatus === 'error').length,
        expectedTotal: sourceItems.reduce((s, si) => s + (si.quantity || 0), 0),
    }), [items, sourceItems]);

    // ─── Filtered Items ──────────────────────────────────────
    const filteredItems = useMemo(() => {
        if (filterText === 'all') return items;
        return items.filter(i => i.syncStatus === filterText);
    }, [items, filterText]);

    // ─── Get Receipt Status for a Source Item ────────────────
    const getSourceItemStatus = useCallback((si: SourceDocumentItem) => {
        const stat = sourceItemStats[si.id];
        if (!stat || stat.rollCount === 0) return 'not_received';
        if (stat.received >= si.quantity) return 'complete';
        return 'partial';
    }, [sourceItemStats]);

    // ─── Select Source Item → Auto-fill Material ─────────────
    const handleSelectSourceItem = useCallback((si: SourceDocumentItem) => {
        setSelectedSourceItemId(si.id);
        if (si.material_id) {
            setMaterialId(si.material_id);
        }
        // Focus on roll length for fast entry
        setTimeout(() => rollLengthInputRef.current?.focus(), 150);
    }, []);

    // ─── Pre-Add Item (show label preview) ───────────────────
    const handlePreAddItem = useCallback(() => {
        if (!materialId || !colorName || !rollLength || Number(rollLength) <= 0) return;

        const mat = materials.find(m => m.id === materialId);
        const rollNum = generateRollNumber();
        const batchNum = generateBatchId(data?.reference_number || undefined);

        // Auto-resolve sourceItemId if not manually selected
        let resolvedSourceItemId = selectedSourceItemId;
        if (!resolvedSourceItemId && sourceItems.length > 0) {
            const matchingSourceItem = sourceItems.find(
                si => (si.material_id === materialId) || (si.product_id === materialId)
            );
            if (matchingSourceItem) {
                resolvedSourceItemId = matchingSourceItem.id;
            }
        }

        const previewItem: ReceiptItem = {
            id: `preview_${Date.now()}`,
            localId: `preview_${Date.now()}`,
            rollNumber: rollNum,
            batchId: batchNum,
            materialId,
            materialName: mat
                ? (language === 'ar' ? (mat.name_ar || mat.name_en) : (mat.name_en || mat.name_ar))
                : materialId,
            colorName,
            rollLength: Number(rollLength),
            quality: quality as ReceiptItem['quality'],
            sourceItemId: resolvedSourceItemId || undefined,
            source: 'manual',
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
        };
        setPendingItem(previewItem);
        setShowLabelPreview(true);
    }, [materialId, colorName, rollLength, quality, selectedSourceItemId, sourceItems, materials, language, data?.reference_number]);

    // ─── Confirm Add Item ────────────────────────────────────
    const confirmAddItem = useCallback(async () => {
        if (!pendingItem || !sessionId) return;

        setIsSaving(true);
        try {
            const savedItem = await receiptLocalStore.addItem(sessionId, {
                rollNumber: pendingItem.rollNumber,
                batchId: pendingItem.batchId,
                materialId: pendingItem.materialId,
                materialName: pendingItem.materialName,
                colorName: pendingItem.colorName,
                rollLength: pendingItem.rollLength,
                quality: pendingItem.quality,
                sourceItemId: pendingItem.sourceItemId,
                source: pendingItem.source,
            });

            // Update parent data through onChange
            onChange({
                receipt_items: [savedItem, ...items],
            });

            // Lock the invoice selector after first item
            if (data?.onEntryStarted) {
                data.onEntryStarted();
            }

            setPendingItem(null);
            setShowLabelPreview(false);
            setRollLength('');

            setTimeout(() => rollLengthInputRef.current?.focus(), 150);
        } finally {
            setIsSaving(false);
        }
    }, [pendingItem, sessionId, items, onChange, data]);

    // ─── Remove Item ─────────────────────────────────────────
    const handleRemoveItem = useCallback((itemId: string) => {
        if (!sessionId) return;
        receiptLocalStore.removeItem(sessionId, itemId);
        onChange({
            receipt_items: items.filter(i => i.id !== itemId),
        });
    }, [sessionId, items, onChange]);

    // ─── Handle Enter on Length ──────────────────────────────
    const handleLengthKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePreAddItem();
        }
    }, [handlePreAddItem]);

    // ─── Barcode Enter ───────────────────────────────────────
    const handleBarcodeKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && barcodeInput.trim()) {
            console.log('Barcode scanned:', barcodeInput);
            setBarcodeInput('');
        }
    }, [barcodeInput]);

    // ─── Sync icons & badges ─────────────────────────────────
    const getSyncIcon = (status: ReceiptItem['syncStatus']) => {
        switch (status) {
            case 'synced': return <Cloud className="h-3.5 w-3.5 text-green-500" />;
            case 'syncing': return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
            case 'pending': return <Clock className="h-3.5 w-3.5 text-amber-500" />;
            case 'error': return <CloudOff className="h-3.5 w-3.5 text-red-500" />;
        }
    };

    const getSyncBadge = (status: ReceiptItem['syncStatus']) => {
        const map = {
            synced: { label: language === 'ar' ? 'مُزامَن' : 'Synced', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            syncing: { label: language === 'ar' ? 'جاري...' : 'Syncing', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            pending: { label: language === 'ar' ? 'محلي' : 'Local', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            error: { label: language === 'ar' ? 'خطأ' : 'Error', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        };
        const s = map[status];
        return <Badge className={`text-[10px] px-1.5 py-0 ${s.cls}`}>{s.label}</Badge>;
    };

    // ─── Receipt Status Badge ─────────────────────────────────
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'complete':
                return (
                    <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {language === 'ar' ? 'مكتمل' : 'Complete'}
                    </Badge>
                );
            case 'partial':
                return (
                    <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                        <CircleDot className="h-3 w-3" />
                        {language === 'ar' ? 'جزئي' : 'Partial'}
                    </Badge>
                );
            default:
                return (
                    <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 gap-1">
                        <Circle className="h-3 w-3" />
                        {language === 'ar' ? 'لم يُستلم' : 'Not Received'}
                    </Badge>
                );
        }
    };

    // ─── Get Material Name ───────────────────────────────────
    const getMaterialName = useCallback((matId?: string) => {
        if (!matId) return '—';
        const mat = materials.find(m => m.id === matId);
        if (!mat) return matId.substring(0, 8);
        return language === 'ar' ? (mat.name_ar || mat.name_en) : (mat.name_en || mat.name_ar);
    }, [materials, language]);

    // ─── Discrepancy Calculation ──────────────────────────────
    const overallDiscrepancy = useMemo(() => {
        if (stats.expectedTotal === 0) return { type: 'none', amount: 0 };
        const diff = stats.totalLength - stats.expectedTotal;
        if (diff === 0) return { type: 'none' as const, amount: 0 };
        if (diff > 0) return { type: 'excess' as const, amount: diff };
        return { type: 'shortage' as const, amount: Math.abs(diff) };
    }, [stats]);

    // ════════════════════════════════════════════════════════════
    // 🎨 RENDER
    // ════════════════════════════════════════════════════════════

    return (
        <div className="space-y-4 p-1">

            {/* ═══ Auto-save + Connectivity Bar ═══ */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>
                        {language === 'ar'
                            ? 'الحفظ التلقائي مفعل — كل بند يُحفظ فوراً'
                            : 'Auto-save — every item saved instantly'
                        }
                    </span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${isOnline
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {isOnline
                        ? (language === 'ar' ? 'متصل' : 'Online')
                        : (language === 'ar' ? 'غير متصل' : 'Offline')
                    }
                </div>
            </div>

            {/* ═══ Invoice Items Panel (Source Document) ═══ */}
            {sourceItems.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 shadow-sm">
                    <CardContent className="p-0">
                        {/* Header */}
                        <button
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                            onClick={() => setShowInvoiceItems(!showInvoiceItems)}
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                    {language === 'ar' ? 'بنود المستند المصدر' : 'Source Document Items'}
                                </span>
                                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                    {sourceItems.length} {language === 'ar' ? 'بند' : 'items'}
                                </Badge>
                                {stats.expectedTotal > 0 && (
                                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                                        ({stats.expectedTotal.toLocaleString()} {language === 'ar' ? 'متر متوقع' : 'm expected'})
                                    </span>
                                )}
                            </div>
                            {showInvoiceItems ? <ChevronUp className="h-4 w-4 text-blue-400" /> : <ChevronDown className="h-4 w-4 text-blue-400" />}
                        </button>

                        {/* Expandable Content */}
                        {showInvoiceItems && (
                            <div className="border-t border-blue-200/50 dark:border-blue-800/50">
                                <div className="max-h-[200px] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-100/50 dark:bg-blue-900/20 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-2 text-start text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                                    {language === 'ar' ? 'المادة' : 'Material'}
                                                </th>
                                                <th className="p-2 text-start text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                                    {language === 'ar' ? 'الكمية المطلوبة' : 'Required Qty'}
                                                </th>
                                                <th className="p-2 text-start text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                                    {language === 'ar' ? 'المستلم' : 'Received'}
                                                </th>
                                                <th className="p-2 text-start text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                                    {language === 'ar' ? 'الفرق' : 'Diff'}
                                                </th>
                                                <th className="p-2 text-start text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                                    {language === 'ar' ? 'الحالة' : 'Status'}
                                                </th>
                                                {!readOnly && <th className="p-2 w-10"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sourceItems.map((si) => {
                                                const stat = sourceItemStats[si.id] || { received: 0, rollCount: 0 };
                                                const diff = stat.received - si.quantity;
                                                const status = getSourceItemStatus(si);
                                                const isSelected = selectedSourceItemId === si.id;

                                                return (
                                                    <tr
                                                        key={si.id}
                                                        className={`border-t border-blue-100/50 dark:border-blue-800/30 transition-colors cursor-pointer
                                                            ${isSelected
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-inset ring-blue-400'
                                                                : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                                            }`}
                                                        onClick={() => !readOnly && handleSelectSourceItem(si)}
                                                    >
                                                        <td className="p-2 text-xs font-medium">
                                                            {si.description || getMaterialName(si.material_id)}
                                                        </td>
                                                        <td className="p-2 font-mono text-xs font-medium text-blue-700 dark:text-blue-400">
                                                            {si.quantity.toLocaleString()}
                                                            {si.unit && <span className="text-muted-foreground ms-1">{si.unit}</span>}
                                                        </td>
                                                        <td className="p-2 font-mono text-xs font-bold">
                                                            <span className={stat.received > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                                                                {stat.received.toLocaleString()}
                                                            </span>
                                                            {stat.rollCount > 0 && (
                                                                <span className="text-[10px] text-muted-foreground ms-1">
                                                                    ({stat.rollCount} {language === 'ar' ? 'رول' : 'rolls'})
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 font-mono text-xs font-bold">
                                                            {diff !== 0 && (
                                                                <span className={diff > 0 ? 'text-amber-600' : 'text-red-600'}>
                                                                    {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                                                </span>
                                                            )}
                                                            {diff === 0 && stat.received > 0 && (
                                                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2">{getStatusBadge(status)}</td>
                                                        {!readOnly && (
                                                            <td className="p-2">
                                                                {isSelected ? (
                                                                    <ArrowRight className="h-4 w-4 text-blue-500" />
                                                                ) : (
                                                                    <Plus className="h-4 w-4 text-gray-300" />
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Discrepancy Summary */}
                                {stats.totalLength > 0 && stats.expectedTotal > 0 && (
                                    <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-t border-blue-200/50 dark:border-blue-800/50 ${overallDiscrepancy.type === 'none' ? 'text-green-700 bg-green-50/50 dark:text-green-400 dark:bg-green-900/10' :
                                        overallDiscrepancy.type === 'excess' ? 'text-amber-700 bg-amber-50/50 dark:text-amber-400 dark:bg-amber-900/10' :
                                            'text-red-700 bg-red-50/50 dark:text-red-400 dark:bg-red-900/10'
                                        }`}>
                                        {overallDiscrepancy.type === 'none' ? (
                                            <><ShieldCheck className="h-3.5 w-3.5" /> {language === 'ar' ? 'الكميات متطابقة' : 'Quantities match'}</>
                                        ) : overallDiscrepancy.type === 'excess' ? (
                                            <><AlertTriangle className="h-3.5 w-3.5" /> {language === 'ar' ? `زيادة ${overallDiscrepancy.amount} متر` : `Excess: ${overallDiscrepancy.amount}m`}</>
                                        ) : (
                                            <><ShieldAlert className="h-3.5 w-3.5" /> {language === 'ar' ? `نقص ${overallDiscrepancy.amount} متر` : `Shortage: ${overallDiscrepancy.amount}m`}</>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ Statistics Cards ═══ */}
            {items.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-[10px] text-muted-foreground font-medium uppercase">
                                {language === 'ar' ? 'الرولونات' : 'Rolls'}
                            </div>
                            <div className="text-2xl font-bold mt-0.5">{stats.totalItems}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-0 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">
                                {language === 'ar' ? 'الأمتار' : 'Meters'}
                            </div>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {stats.totalLength.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-0 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase">
                                {language === 'ar' ? 'مُزامَن' : 'Synced'}
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mt-0.5 flex items-center justify-center gap-1">
                                <Cloud className="h-4 w-4" />
                                {stats.syncedCount}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={`border-0 shadow-sm ${stats.errorCount > 0
                        ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20'
                        : 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20'
                        }`}>
                        <CardContent className="p-3 text-center">
                            <div className={`text-[10px] font-medium uppercase ${stats.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                {stats.errorCount > 0
                                    ? (language === 'ar' ? 'أخطاء' : 'Errors')
                                    : (language === 'ar' ? 'قيد المزامنة' : 'Pending')
                                }
                            </div>
                            <div className={`text-2xl font-bold mt-0.5 ${stats.errorCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                {stats.errorCount > 0 ? stats.errorCount : stats.pendingCount}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ Input Zone (create/edit only) ═══ */}
            {!readOnly && (
                <>
                    {/* Barcode Scanner Row */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <QrCode className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                            <Input
                                type="text"
                                placeholder={language === 'ar' ? 'امسح الباركود أو أدخل الرقم...' : 'Scan barcode or enter code...'}
                                className={`h-10 ${isRTL ? 'pr-10' : 'pl-10'}`}
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onKeyDown={handleBarcodeKeyDown}
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-10 w-10" title={language === 'ar' ? 'كاميرا' : 'Camera'}>
                            <Camera className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 text-xs gap-1">
                            <Radio className="h-3.5 w-3.5" />
                            RFID
                        </Button>
                    </div>

                    <div className="relative flex items-center justify-center">
                        <Separator className="flex-1" />
                        <span className="px-3 text-xs text-muted-foreground bg-background">
                            {language === 'ar' ? 'أو إدخال يدوي' : 'OR manual entry'}
                        </span>
                        <Separator className="flex-1" />
                    </div>

                    {/* Manual Entry Row */}
                    <div className="flex items-end gap-2 flex-wrap">
                        <div className="flex-1 min-w-[150px] space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'المادة' : 'Material'}
                            </Label>
                            <Select value={materialId} onValueChange={setMaterialId}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMaterials.map(mat => (
                                        <SelectItem key={mat.id} value={mat.id}>
                                            {language === 'ar' ? (mat.name_ar || mat.name_en) : (mat.name_en || mat.name_ar)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[110px] space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'اللون' : 'Color'}
                            </Label>
                            <Input
                                className="h-9"
                                placeholder={language === 'ar' ? 'اللون' : 'Color'}
                                value={colorName}
                                onChange={(e) => setColorName(e.target.value)}
                            />
                        </div>

                        <div className="w-[100px] space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'الطول (م)' : 'Length (m)'}
                            </Label>
                            <Input
                                ref={rollLengthInputRef}
                                className="h-9"
                                type="number"
                                min="0.1"
                                step="0.01"
                                placeholder="0.00"
                                value={rollLength}
                                onChange={(e) => setRollLength(e.target.value)}
                                onKeyDown={handleLengthKeyDown}
                            />
                        </div>

                        <div className="w-[110px] space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'الجودة' : 'Quality'}
                            </Label>
                            <Select value={quality} onValueChange={setQuality}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {QUALITY_OPTIONS.map(q => (
                                        <SelectItem key={q.value} value={q.value}>
                                            <span className={q.color}>{language === 'ar' ? q.labelAr : q.labelEn}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            className="h-9 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20"
                            onClick={handlePreAddItem}
                            disabled={!materialId || !colorName || !rollLength || Number(rollLength) <= 0}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Selected source item indicator */}
                    {selectedSourceItemId && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                            <ArrowRight className="h-3.5 w-3.5" />
                            <span className="font-medium">
                                {language === 'ar' ? 'مرتبط ببند الفاتورة:' : 'Linked to invoice item:'}
                            </span>
                            <span className="font-mono">{sourceItems.find(s => s.id === selectedSourceItemId)?.description || selectedSourceItemId.substring(0, 8)}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-blue-400 hover:text-blue-600"
                                onClick={() => setSelectedSourceItemId('')}
                            >
                                ✕
                            </Button>
                        </div>
                    )}
                </>
            )}

            <Separator />

            {/* ═══ Items Table ═══ */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 text-emerald-500" />
                        {language === 'ar' ? 'البنود المستلمة' : 'Received Items'}
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </span>
                    {items.length > 0 && (
                        <Select value={filterText} onValueChange={setFilterText}>
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                                <Filter className="h-3 w-3 me-1" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                                <SelectItem value="synced">{language === 'ar' ? 'مُزامَن' : 'Synced'}</SelectItem>
                                <SelectItem value="pending">{language === 'ar' ? 'محلي' : 'Pending'}</SelectItem>
                                <SelectItem value="error">{language === 'ar' ? 'أخطاء' : 'Errors'}</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <Boxes className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">
                            {language === 'ar'
                                ? 'لم يتم إضافة أي بنود بعد'
                                : 'No items added yet'
                            }
                        </p>
                        <p className="text-xs mt-1">
                            {sourceItems.length > 0
                                ? (language === 'ar'
                                    ? 'اختر بند من المستند المصدر أعلاه ثم أدخل تفاصيل الرولون'
                                    : 'Select an item from source document above, then enter roll details')
                                : (language === 'ar'
                                    ? 'اختر المادة واللون والطول ثم اضغط +'
                                    : 'Select material, color, and length then press +')
                            }
                        </p>
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[350px] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 text-start text-xs font-medium text-muted-foreground">
                                            {language === 'ar' ? 'رقم الرولون' : 'Roll #'}
                                        </th>
                                        <th className="p-2 text-start text-xs font-medium text-muted-foreground">
                                            {language === 'ar' ? 'المادة' : 'Material'}
                                        </th>
                                        <th className="p-2 text-start text-xs font-medium text-muted-foreground">
                                            {language === 'ar' ? 'اللون' : 'Color'}
                                        </th>
                                        <th className="p-2 text-start text-xs font-medium text-muted-foreground">
                                            {language === 'ar' ? 'الطول' : 'Length'}
                                        </th>
                                        <th className="p-2 text-start text-xs font-medium text-muted-foreground">
                                            {language === 'ar' ? 'الجودة' : 'Quality'}
                                        </th>
                                        <th className="p-2 text-start text-xs font-medium text-muted-foreground">
                                            {language === 'ar' ? 'الحالة' : 'Status'}
                                        </th>
                                        {!readOnly && <th className="p-2 w-10"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => {
                                        const qualityOpt = QUALITY_OPTIONS.find(q => q.value === item.quality);
                                        return (
                                            <tr
                                                key={item.id}
                                                className={`border-t hover:bg-muted/30 transition-colors ${idx === 0 ? 'animate-in fade-in slide-in-from-top-2 duration-300' : ''
                                                    }`}
                                            >
                                                <td className="p-2">
                                                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                                        {item.rollNumber}
                                                    </span>
                                                </td>
                                                <td className="p-2 font-medium text-xs">{item.materialName}</td>
                                                <td className="p-2 text-xs">{item.colorName}</td>
                                                <td className="p-2 font-mono text-xs font-medium">
                                                    {item.rollLength} <span className="text-muted-foreground">{language === 'ar' ? 'م' : 'm'}</span>
                                                </td>
                                                <td className="p-2">
                                                    {qualityOpt ? (
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${qualityOpt.color}`}>
                                                            {language === 'ar' ? qualityOpt.labelAr : qualityOpt.labelEn}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-1">
                                                        {getSyncIcon(item.syncStatus)}
                                                        {getSyncBadge(item.syncStatus)}
                                                    </div>
                                                </td>
                                                {!readOnly && (
                                                    <td className="p-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                            onClick={() => handleRemoveItem(item.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Summary Footer */}
                {items.length > 0 && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1">
                            <Ruler className="h-3.5 w-3.5" />
                            <span className="font-medium">{stats.totalItems}</span>
                            <span>{language === 'ar' ? 'رولون' : 'rolls'}</span>
                        </div>
                        <span className="text-muted-foreground/30">|</span>
                        <div className="flex items-center gap-1">
                            <span className="font-medium">{stats.totalLength.toLocaleString()}</span>
                            <span>{language === 'ar' ? 'متر' : 'meters'}</span>
                        </div>
                        <span className="text-muted-foreground/30">|</span>
                        <div className="flex items-center gap-1">
                            <Cloud className="h-3 w-3 text-green-500" />
                            <span>{stats.syncedCount}/{stats.totalItems}</span>
                            <span>{language === 'ar' ? 'مُزامَن' : 'synced'}</span>
                        </div>
                        {stats.expectedTotal > 0 && (
                            <>
                                <span className="text-muted-foreground/30">|</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-medium">{((stats.totalLength / stats.expectedTotal) * 100).toFixed(0)}%</span>
                                    <span>{language === 'ar' ? 'من المتوقع' : 'of expected'}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Label Preview Dialog ─── */}
            <AlertDialog open={showLabelPreview} onOpenChange={setShowLabelPreview}>
                <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAddItem(); } }}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-emerald-500" />
                            {language === 'ar' ? 'معاينة ملصق الرولون' : 'Roll Label Preview'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {language === 'ar'
                                ? 'تأكد من البيانات ثم اضغط تأكيد لإضافة الرولون'
                                : 'Verify the data then press confirm to add the roll'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {pendingItem && (
                        <div className="my-4 p-4 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/30">
                            <div className="text-center space-y-3">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg mx-auto flex items-center justify-center">
                                    <QrCode className="h-14 w-14 text-slate-400" />
                                </div>
                                <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                    {pendingItem.rollNumber}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-end text-muted-foreground">{language === 'ar' ? 'المادة:' : 'Material:'}</div>
                                    <div className="text-start font-medium">{pendingItem.materialName}</div>
                                    <div className="text-end text-muted-foreground">{language === 'ar' ? 'اللون:' : 'Color:'}</div>
                                    <div className="text-start font-medium">{pendingItem.colorName}</div>
                                    <div className="text-end text-muted-foreground">{language === 'ar' ? 'الطول:' : 'Length:'}</div>
                                    <div className="text-start font-medium">{pendingItem.rollLength} {language === 'ar' ? 'متر' : 'm'}</div>
                                    <div className="text-end text-muted-foreground">{language === 'ar' ? 'الجودة:' : 'Quality:'}</div>
                                    <div className="text-start font-medium">
                                        {QUALITY_OPTIONS.find(q => q.value === pendingItem.quality)
                                            ? (language === 'ar'
                                                ? QUALITY_OPTIONS.find(q => q.value === pendingItem.quality)!.labelAr
                                                : QUALITY_OPTIONS.find(q => q.value === pendingItem.quality)!.labelEn)
                                            : 'A'}
                                    </div>
                                    <div className="text-end text-muted-foreground">{language === 'ar' ? 'الدفعة:' : 'Batch:'}</div>
                                    <div className="text-start font-medium font-mono text-xs">{pendingItem.batchId}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setPendingItem(null); }}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <Button variant="outline" className="gap-1" onClick={confirmAddItem}>
                            <Printer className="h-4 w-4" />
                            {language === 'ar' ? 'تأكيد + طباعة' : 'Confirm + Print'}
                        </Button>
                        <AlertDialogAction
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                            onClick={confirmAddItem}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 me-1" />}
                            {language === 'ar' ? 'تأكيد الإضافة' : 'Confirm Add'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default GoodsReceiptItemsTab;
