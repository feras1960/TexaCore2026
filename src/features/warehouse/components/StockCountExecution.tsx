/**
 * ════════════════════════════════════════════════════════════════
 * 📋 Stock Count Execution Sheet — شاشة تنفيذ الجرد المخزني
 * ════════════════════════════════════════════════════════════════
 *
 * الشاشة التي يستخدمها عامل المستودع لتنفيذ الجرد:
 *  - تبويب المسح: باركود/QR/RFID (بحث محلي أولاً)
 *  - تبويب السائب: عد المواد السائبة
 *  - تبويب الملخص: الانحرافات
 *
 * 🔐 Offline-First:
 *  - كل إدخال يُحفظ فوراً في IndexedDB
 *  - يُزامن في الخلفية عند الاتصال
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { stockCountOfflineStore } from '@/features/warehouse/services/stockCountOfflineStore';
import { offlineDB, type LocalStockCountItem, type CachedRoll } from '@/features/warehouse/services/warehouseOfflineDB';
import { supabase } from '@/lib/supabase';

// UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Icons
import {
    ArrowRight,
    Scan,
    Boxes,
    BarChart3,
    Wifi,
    WifiOff,
    RefreshCw,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Download,
    Volume2,
    Package,
    Search,
    Check,
    X,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

interface StockCountExecutionProps {
    stockCount: any;
    onBack: () => void;
    onComplete: () => void;
}

// ─── Variance Reason Options ──────────────────────────────────

const varianceReasons = [
    { value: 'natural_shrinkage', labelAr: 'انكماش طبيعي', labelEn: 'Natural shrinkage' },
    { value: 'damaged', labelAr: 'تلف', labelEn: 'Damaged' },
    { value: 'lost', labelAr: 'مفقود', labelEn: 'Lost' },
    { value: 'miscounted', labelAr: 'خطأ بالعد', labelEn: 'Miscounted' },
    { value: 'theft', labelAr: 'سرقة', labelEn: 'Theft' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function StockCountExecution({ stockCount, onBack, onComplete }: StockCountExecutionProps) {
    const { isRTL } = useLanguage();
    const { companyId, tenantId, user } = useAuth();

    // ─── State ───
    const [activeTab, setActiveTab] = useState('scan');
    const [online, setOnline] = useState(navigator.onLine);
    const [loading, setLoading] = useState(false);

    // Pre-cache
    const [preloading, setPreloading] = useState(false);
    const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
    const [cachedRollsCount, setCachedRollsCount] = useState(0);

    // Scan
    const [scanQuery, setScanQuery] = useState('');
    const [scanResult, setScanResult] = useState<CachedRoll | null>(null);
    const [scanSource, setScanSource] = useState<'cache' | 'live' | 'not_found'>('not_found');
    const [scanSearching, setScanSearching] = useState(false);
    const [actualQuantity, setActualQuantity] = useState('');
    const [selectedReason, setSelectedReason] = useState('');

    // Items
    const [countedItems, setCountedItems] = useState<LocalStockCountItem[]>([]);
    const [syncStats, setSyncStats] = useState({ total: 0, counted: 0, synced: 0, pending: 0, errors: 0, withVariance: 0 });

    // Audio
    const scanAudioRef = useRef<HTMLAudioElement | null>(null);
    const errorAudioRef = useRef<HTMLAudioElement | null>(null);
    const scanInputRef = useRef<HTMLInputElement>(null);

    // ─── Network Monitoring ───
    useEffect(() => {
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        // بدء مراقبة المزامنة
        stockCountOfflineStore.setupReconnectListener();

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // ─── Load Items & Stats ───
    const refreshItems = useCallback(async () => {
        if (!tenantId || !companyId) return;
        try {
            const items = await offlineDB.getStockCountItems(stockCount.id, tenantId, companyId);
            setCountedItems(items);

            const stats = await offlineDB.getStockCountStats(stockCount.id, tenantId, companyId);
            setSyncStats(stats);

            const rollsCount = await offlineDB.getCachedRollsCount(stockCount.warehouse_id);
            setCachedRollsCount(rollsCount);
        } catch { /* ignore */ }
    }, [stockCount.id, stockCount.warehouse_id, tenantId, companyId]);

    useEffect(() => {
        refreshItems();
        const interval = setInterval(refreshItems, 5000);
        return () => clearInterval(interval);
    }, [refreshItems]);

    // ─── Pre-cache Rolls ───
    const handlePreload = async () => {
        if (!tenantId || !companyId) return;
        setPreloading(true);
        try {
            await stockCountOfflineStore.preloadWarehouseRolls(
                stockCount.warehouse_id,
                tenantId,
                companyId,
                (loaded, total) => setPreloadProgress({ loaded, total })
            );
            await refreshItems();
        } catch (err: any) {
            console.error('Preload failed:', err);
        } finally {
            setPreloading(false);
        }
    };

    // ─── Auto Pre-load on first open ───
    useEffect(() => {
        if (cachedRollsCount === 0 && online && tenantId && companyId) {
            handlePreload();
        }
    }, [cachedRollsCount, online, tenantId, companyId]);

    // ─── Update stock count status to in_progress ───
    useEffect(() => {
        if (stockCount.status === 'planned' && companyId) {
            supabase
                .from('stock_counts')
                .update({ status: 'in_progress' })
                .eq('id', stockCount.id)
                .then(() => {});
        }
    }, [stockCount.id, stockCount.status, companyId]);

    // ─── Scan Roll ───
    const handleScan = async () => {
        if (!scanQuery.trim() || !tenantId || !companyId) return;
        setScanSearching(true);
        setScanResult(null);

        try {
            const result = await stockCountOfflineStore.scanRoll(
                scanQuery.trim(),
                stockCount.warehouse_id,
                tenantId,
                companyId
            );

            setScanResult(result.roll);
            setScanSource(result.source);

            if (result.roll) {
                // نجاح — صوت تأكيد
                playSound('success');
                setActualQuantity(String(result.roll.currentLength));
            } else {
                // غير موجود — صوت خطأ
                playSound('error');
            }
        } catch {
            playSound('error');
        } finally {
            setScanSearching(false);
        }
    };

    // ─── Save Scanned Item ───
    const handleSaveScannedItem = async () => {
        if (!scanResult || !tenantId || !companyId) return;

        const actual = parseFloat(actualQuantity) || 0;
        const system = scanResult.currentLength;
        const variance = actual - system;

        try {
            await stockCountOfflineStore.addCountItem({
                stockCountId: stockCount.id,
                rollId: scanResult.id,
                materialId: scanResult.materialId,
                materialName: scanResult.materialName || scanResult.colorName || scanResult.rollNumber,
                rollNumber: scanResult.rollNumber,
                colorName: scanResult.colorName,
                unit: 'meter',
                systemQuantity: system,
                actualQuantity: actual,
                variance,
                varianceReason: variance !== 0 ? selectedReason : undefined,
                scanMethod: 'barcode',
                barcodeScanned: scanQuery.trim(),
                isLooseStock: false,
                isCounted: true,
                notes: undefined,
                tenantId,
                companyId,
                warehouseId: stockCount.warehouse_id,
            });

            playSound('success');

            // إعادة تعيين
            setScanQuery('');
            setScanResult(null);
            setActualQuantity('');
            setSelectedReason('');
            await refreshItems();

            // رجوع للحقل
            scanInputRef.current?.focus();
        } catch (err: any) {
            console.error('Save failed:', err);
        }
    };

    // ─── Play Sound ───
    const playSound = (type: 'success' | 'error') => {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = 0.3;

            if (type === 'success') {
                osc.frequency.value = 800;
                osc.type = 'sine';
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            } else {
                osc.frequency.value = 300;
                osc.type = 'square';
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch { /* audio not supported */ }
    };

    // ─── Handle Keyboard ───
    const handleScanKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScan();
        }
    };

    // ─── Progress ───
    const progress = syncStats.total > 0 ? Math.round((syncStats.counted / syncStats.total) * 100) : 0;

    // ═══════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ─── Header Bar ─── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <span className="font-mono text-sm">{stockCount.count_number}</span>
                            <Badge variant="outline" className="text-[10px]">
                                {stockCount.count_mode === 'loose_only'
                                    ? (isRTL ? 'سائب' : 'Loose')
                                    : stockCount.count_mode === 'barcode_scan'
                                    ? (isRTL ? 'باركود' : 'Barcode')
                                    : (isRTL ? 'كامل' : 'Full')}
                            </Badge>
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Online/Offline */}
                    <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${online ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300 animate-pulse'}`}
                    >
                        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {online ? (isRTL ? 'متصل' : 'Online') : (isRTL ? 'غير متصل' : 'Offline')}
                    </Badge>

                    {/* Sync Stats */}
                    {syncStats.pending > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            {syncStats.pending}
                        </Badge>
                    )}

                    {/* Cached Rolls */}
                    <Badge variant="outline" className="text-[10px] gap-1 text-blue-600 border-blue-300">
                        <Download className="h-3 w-3" />
                        {cachedRollsCount} {isRTL ? 'رولون' : 'rolls'}
                    </Badge>
                </div>
            </div>

            {/* ─── Preloading Bar ─── */}
            {preloading && (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="flex items-center gap-1.5 text-blue-700">
                                <Download className="h-3.5 w-3.5 animate-bounce" />
                                {isRTL ? 'جاري تحميل بيانات الرولونات...' : 'Loading roll data...'}
                            </span>
                            <span className="font-mono text-blue-600">
                                {preloadProgress.loaded}/{preloadProgress.total || '?'}
                            </span>
                        </div>
                        <Progress
                            value={preloadProgress.total > 0 ? (preloadProgress.loaded / preloadProgress.total) * 100 : 0}
                            className="h-1.5"
                        />
                    </CardContent>
                </Card>
            )}

            {/* ─── Stats Bar ─── */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: isRTL ? 'مُجرَد' : 'Counted', value: syncStats.counted, color: 'text-blue-600', icon: Check },
                    { label: isRTL ? 'مُزامَن' : 'Synced', value: syncStats.synced, color: 'text-green-600', icon: CheckCircle2 },
                    { label: isRTL ? 'معلق' : 'Pending', value: syncStats.pending, color: 'text-amber-600', icon: Clock },
                    { label: isRTL ? 'انحراف' : 'Variance', value: syncStats.withVariance, color: 'text-red-600', icon: AlertTriangle },
                ].map((s, i) => (
                    <Card key={i}>
                        <CardContent className="p-2 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                <p className="text-lg font-bold font-mono">{s.value}</p>
                            </div>
                            <s.icon className={`h-4 w-4 opacity-50 ${s.color}`} />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Tabs ─── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9 w-full grid grid-cols-3">
                    <TabsTrigger value="scan" className="text-xs h-7 gap-1">
                        <Scan className="h-3.5 w-3.5" />
                        {isRTL ? 'مسح' : 'Scan'}
                    </TabsTrigger>
                    <TabsTrigger value="loose" className="text-xs h-7 gap-1">
                        <Boxes className="h-3.5 w-3.5" />
                        {isRTL ? 'سائب' : 'Loose'}
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="text-xs h-7 gap-1">
                        <BarChart3 className="h-3.5 w-3.5" />
                        {isRTL ? 'ملخص' : 'Summary'}
                    </TabsTrigger>
                </TabsList>

                {/* ═══════════════════════════════════════════════ */}
                {/* 📱 Scan Tab                                    */}
                {/* ═══════════════════════════════════════════════ */}
                <TabsContent value="scan" className="mt-3 space-y-3">

                    {/* Scan Input */}
                    <Card>
                        <CardContent className="p-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Scan className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={scanInputRef}
                                        value={scanQuery}
                                        onChange={e => setScanQuery(e.target.value)}
                                        onKeyDown={handleScanKeyDown}
                                        placeholder={isRTL ? 'امسح الباركود أو أدخل رقم الرولون...' : 'Scan barcode or enter roll number...'}
                                        className="ps-9 h-10 text-sm font-mono"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    onClick={handleScan}
                                    disabled={!scanQuery.trim() || scanSearching}
                                    className="h-10 px-4"
                                >
                                    {scanSearching ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Scan Source Indicator */}
                            {scanResult && (
                                <div className="mt-2 flex items-center gap-1.5">
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] ${
                                            scanSource === 'cache'
                                                ? 'text-blue-600 border-blue-300'
                                                : 'text-green-600 border-green-300'
                                        }`}
                                    >
                                        {scanSource === 'cache'
                                            ? (isRTL ? '📦 من الكاش المحلي' : '📦 From local cache')
                                            : (isRTL ? '☁️ من السحابة' : '☁️ From cloud')}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Scan Result  */}
                    {scanResult && (
                        <Card className="border-cyan-200 bg-cyan-50/30 dark:bg-cyan-950/10">
                            <CardContent className="p-4 space-y-3">
                                {/* Roll Info */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isRTL ? 'رقم الرولون' : 'Roll #'}
                                        </p>
                                        <p className="font-mono font-semibold">{scanResult.rollNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isRTL ? 'المادة' : 'Material'}
                                        </p>
                                        <p className="font-medium">{scanResult.materialName || scanResult.materialId}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isRTL ? 'اللون' : 'Color'}
                                        </p>
                                        <p>{scanResult.colorName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isRTL ? 'الكمية النظامية' : 'System Qty'}
                                        </p>
                                        <p className="font-mono font-bold text-blue-700">
                                            {scanResult.currentLength} {isRTL ? 'م' : 'm'}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Actual Quantity Input */}
                                <div className="space-y-2">
                                    <Label className="text-xs">
                                        {isRTL ? 'الكمية الفعلية (م)' : 'Actual Quantity (m)'}
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        value={actualQuantity}
                                        onChange={e => setActualQuantity(e.target.value)}
                                        className="h-10 text-lg font-mono font-bold text-center"
                                        placeholder="0.000"
                                    />

                                    {/* Variance Display */}
                                    {actualQuantity && (() => {
                                        const variance = parseFloat(actualQuantity) - scanResult.currentLength;
                                        const isExact = Math.abs(variance) < 0.001;
                                        return (
                                            <div className={`flex items-center justify-center gap-2 p-2 rounded-md text-sm font-medium ${
                                                isExact
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30'
                                                    : variance < 0
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/30'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30'
                                            }`}>
                                                {isExact ? (
                                                    <><CheckCircle2 className="h-4 w-4" /> {isRTL ? 'مطابق ✓' : 'Match ✓'}</>
                                                ) : (
                                                    <>
                                                        <AlertTriangle className="h-4 w-4" />
                                                        {isRTL ? 'فرق:' : 'Variance:'}{' '}
                                                        <span className="font-mono font-bold">
                                                            {variance > 0 ? '+' : ''}{variance.toFixed(3)} {isRTL ? 'م' : 'm'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Variance Reason (if variance exists) */}
                                    {actualQuantity && Math.abs(parseFloat(actualQuantity) - scanResult.currentLength) >= 0.001 && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">{isRTL ? 'سبب الفرق' : 'Reason'}</Label>
                                            <Select value={selectedReason} onValueChange={setSelectedReason}>
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder={isRTL ? 'اختر السبب...' : 'Select reason...'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {varianceReasons.map(r => (
                                                        <SelectItem key={r.value} value={r.value} className="text-xs">
                                                            {isRTL ? r.labelAr : r.labelEn}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <Button
                                    onClick={handleSaveScannedItem}
                                    className="w-full h-10"
                                    disabled={!actualQuantity}
                                >
                                    <Check className="h-4 w-4 me-2" />
                                    {isRTL ? 'تأكيد وحفظ' : 'Confirm & Save'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Not Found */}
                    {scanSource === 'not_found' && scanQuery && !scanSearching && !scanResult && (
                        <Card className="border-red-200 bg-red-50/30">
                            <CardContent className="p-4 flex items-center gap-3 text-sm text-red-700">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-medium">{isRTL ? 'لم يُعثر على الرولون' : 'Roll not found'}</p>
                                    <p className="text-xs opacity-70 mt-0.5">
                                        {isRTL ? 'تأكد من الرقم أو حاول مسح الباركود مرة أخرى' : 'Verify the number or try scanning again'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Counted Items List */}
                    {countedItems.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-medium text-muted-foreground">
                                    {isRTL ? `البنود المُجردة (${countedItems.length})` : `Counted Items (${countedItems.length})`}
                                </h4>
                            </div>
                            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                                {countedItems
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .slice(0, 20)
                                    .map(item => (
                                    <Card key={item.id} className="border-s-2" style={{
                                        borderInlineStartColor: item.variance === 0 ? '#22c55e' : item.variance < 0 ? '#ef4444' : '#eab308',
                                    }}>
                                        <CardContent className="p-2.5 flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-medium truncate">
                                                        {item.rollNumber || item.materialName}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[9px] shrink-0 ${
                                                            item.syncStatus === 'synced' ? 'text-green-600 border-green-300'
                                                            : item.syncStatus === 'error' ? 'text-red-600 border-red-300'
                                                            : 'text-amber-600 border-amber-300'
                                                        }`}
                                                    >
                                                        {item.syncStatus === 'synced' ? '✓' : item.syncStatus === 'error' ? '✗' : '⏳'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                                    <span>{isRTL ? 'نظام' : 'Sys'}: {item.systemQuantity}</span>
                                                    <span>{isRTL ? 'فعلي' : 'Act'}: {item.actualQuantity}</span>
                                                    {item.variance !== 0 && (
                                                        <span className={item.variance < 0 ? 'text-red-600' : 'text-amber-600'}>
                                                            {item.variance > 0 ? '+' : ''}{item.variance.toFixed(3)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ═══════════════════════════════════════════════ */}
                {/* 📦 Loose Stock Tab                             */}
                {/* ═══════════════════════════════════════════════ */}
                <TabsContent value="loose" className="mt-3 space-y-3">
                    <Card>
                        <CardContent className="p-4 text-center space-y-3">
                            <Boxes className="h-10 w-10 mx-auto text-muted-foreground/40" />
                            <div>
                                <p className="font-medium text-sm">
                                    {isRTL ? 'جرد المخزون السائب' : 'Loose Stock Count'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {isRTL
                                        ? 'عد المواد السائبة بالمستودع وتحويلها لرولونات\nالعد يعمل بدون إنترنت — إنشاء الرولونات يحتاج اتصال'
                                        : 'Count loose materials and convert to rolls\nCounting works offline — Roll creation needs internet'}
                                </p>
                            </div>
                            {!online && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                    <WifiOff className="h-3 w-3 me-1" />
                                    {isRTL ? 'إنشاء الرولونات يحتاج اتصال' : 'Roll creation needs internet'}
                                </Badge>
                            )}
                            <p className="text-[11px] text-muted-foreground italic">
                                {isRTL ? 'قيد التطوير — سيتم إضافته في التحديث القادم' : 'Coming soon — will be added in next update'}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══════════════════════════════════════════════ */}
                {/* 📊 Summary Tab                                 */}
                {/* ═══════════════════════════════════════════════ */}
                <TabsContent value="summary" className="mt-3 space-y-3">
                    {/* Overall Progress */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <h4 className="text-sm font-medium">
                                {isRTL ? 'ملخص الجرد' : 'Count Summary'}
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold font-mono text-blue-600">{syncStats.counted}</p>
                                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'تم جرده' : 'Counted'}</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold font-mono text-green-600">
                                        {syncStats.counted - syncStats.withVariance}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'مطابق' : 'Match'}</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold font-mono text-red-600">{syncStats.withVariance}</p>
                                    <p className="text-[10px] text-muted-foreground">{isRTL ? 'انحراف' : 'Variance'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Variance Items */}
                    {syncStats.withVariance > 0 && (
                        <Card>
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    {isRTL ? 'بنود فيها انحرافات' : 'Items with Variance'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="space-y-1.5">
                                    {countedItems
                                        .filter(i => i.variance !== 0)
                                        .map(item => (
                                        <div key={item.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                                            <div>
                                                <p className="font-mono text-xs">{item.rollNumber || item.materialName}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {isRTL ? 'نظام' : 'Sys'}: {item.systemQuantity} → {isRTL ? 'فعلي' : 'Act'}: {item.actualQuantity}
                                                </p>
                                            </div>
                                            <div className="text-end">
                                                <p className={`font-mono font-bold text-sm ${
                                                    item.variance < 0 ? 'text-red-600' : 'text-amber-600'
                                                }`}>
                                                    {item.variance > 0 ? '+' : ''}{item.variance.toFixed(3)}
                                                </p>
                                                {item.varianceReason && (
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {varianceReasons.find(r => r.value === item.varianceReason)?.[isRTL ? 'labelAr' : 'labelEn']}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sync Status */}
                    <Card>
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {isRTL ? 'حالة المزامنة' : 'Sync Status'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600 text-xs">✓ {syncStats.synced}</span>
                                    {syncStats.pending > 0 && <span className="text-amber-600 text-xs">⏳ {syncStats.pending}</span>}
                                    {syncStats.errors > 0 && <span className="text-red-600 text-xs">✗ {syncStats.errors}</span>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
