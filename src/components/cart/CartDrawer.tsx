/**
 * 🛒 CartDrawer V3 — Grouped by Material + Preferred Rolls Display
 * درج السلة — عرض مجمّع حسب المادة + الرولونات المفضلة
 * 
 * ✅ Constitution: Law 1 (t()), Law 2 (services only), Law 5 (keep-mounted)
 * ✅ RTL: Logical properties (start/end)
 * ✅ Uses UnifiedTradeSheet for document creation
 * ✅ Groups same material from multiple warehouses under one heading
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ShoppingCart,
    Trash2,
    Package,
    Scroll,
    Warehouse as WarehouseIcon,
    FileText,
    Minus,
    Plus,
    AlertCircle,
    Ruler,
    DollarSign,
    ChevronDown,
    Check,
    ArrowRightCircle,
    Send,
    Heart,
    X,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UnifiedTradeSheet } from '@/features/trade/components/UnifiedTradeSheet';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// ─── Convert Target Types ───────────────────────────────────────────────
type ConvertTarget = 'quotation' | 'reservation' | 'order';

interface ConvertOption {
    id: ConvertTarget;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    descAr: string;
    descEn: string;
}

const CONVERT_OPTIONS: ConvertOption[] = [
    {
        id: 'quotation',
        labelAr: 'عرض سعر',
        labelEn: 'Quotation',
        icon: FileText,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        descAr: 'إنشاء عرض سعر للعميل',
        descEn: 'Create a price quotation for client',
    },
    {
        id: 'reservation',
        labelAr: 'حجز بضائع',
        labelEn: 'Reservation',
        icon: Package,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
        descAr: 'حجز البضائع من المستودع',
        descEn: 'Reserve goods from warehouse',
    },
    {
        id: 'order',
        labelAr: 'أمر بيع',
        labelEn: 'Sales Order',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        descAr: 'إنشاء أمر بيع مباشر',
        descEn: 'Create a direct sales order',
    },
];

export function CartDrawer() {
    const { language, direction } = useLanguage();
    const { state, computed, actions } = useCart();
    const { toast } = useToast();
    const { companyId } = useCompany();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [editingQty, setEditingQty] = useState<string | null>(null);
    const [editingPrice, setEditingPrice] = useState<string | null>(null);
    const [tempQty, setTempQty] = useState('');
    const [tempPrice, setTempPrice] = useState('');
    // UnifiedTradeSheet state
    const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
    const [tradeSheetType, setTradeSheetType] = useState<ConvertTarget>('order');
    const [isSaving, setIsSaving] = useState(false);
    // Track whether document was already saved (to avoid duplicate saves on close)
    const savedRef = useRef(false);

    const isAr = language === 'ar';
    const isRTL = direction === 'rtl';

    // Bilingual helper
    const t = (ar: string, en: string) => isAr ? ar : en;

    const getName = (nameAr: string, nameEn?: string) =>
        isAr ? nameAr : (nameEn || nameAr);

    // ═════════════════════════════════════════════════════
    // Grouped items: material_id → CartItem[]
    // ═════════════════════════════════════════════════════
    const groupedItems = useMemo(() => {
        const groups: { materialId: string; materialName: string; materialCode: string; items: CartItem[] }[] = [];
        const map = new Map<string, CartItem[]>();

        state.items.forEach(item => {
            if (!map.has(item.material_id)) {
                map.set(item.material_id, []);
            }
            map.get(item.material_id)!.push(item);
        });

        map.forEach((items, materialId) => {
            const first = items[0];
            groups.push({
                materialId,
                materialName: getName(first.material_name_ar, first.material_name_en),
                materialCode: first.material_code,
                items,
            });
        });

        return groups;
    }, [state.items, isAr]);

    // ─── Quantity / Price editing ───
    const handleQuantityChange = (item: CartItem, delta: number) => {
        const newQty = Math.max(0.1, item.quantity + delta);
        if (item.available_stock && newQty > item.available_stock) return;
        actions.updateItem(item.id, { quantity: newQty });
    };

    const startEditQty = (item: CartItem) => {
        setEditingQty(item.id);
        setTempQty(String(item.quantity));
    };

    const confirmEditQty = (item: CartItem) => {
        const val = parseFloat(tempQty);
        if (val > 0) {
            actions.updateItem(item.id, { quantity: val });
        }
        setEditingQty(null);
    };

    const startEditPrice = (item: CartItem) => {
        setEditingPrice(item.id);
        setTempPrice(String(item.unit_price));
    };

    const confirmEditPrice = (item: CartItem) => {
        const val = parseFloat(tempPrice);
        if (val >= 0) {
            actions.updateItem(item.id, { unit_price: val });
        }
        setEditingPrice(null);
    };

    // ── Convert to Document ─────────────────────────────────────────────
    const handleConvert = (target: ConvertTarget) => {
        setTradeSheetType(target);
        savedRef.current = false;
        setTradeSheetOpen(true);
        // Close cart drawer — cart will be cleared after save
        actions.closeDrawer();
    };

    // Build initial data for trading sheet
    const tradeSheetInitialData = useMemo(() => {
        return {
            status: 'draft',
            currency: computed.currency,
            total_amount: computed.total_amount,
            date: new Date().toISOString(),
            customer_id: state.customer_id,
            customer_name: state.customer_name,
            items: state.items.map((item) => ({
                id: item.id || crypto.randomUUID(),
                material_id: item.material_id,
                material_code: item.material_code,
                material_name_ar: item.material_name_ar,
                material_name_en: item.material_name_en,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                subtotal: item.subtotal || item.quantity * item.unit_price,
                total: item.subtotal || item.quantity * item.unit_price,
                currency: item.currency,
                warehouse_id: item.warehouse_id,
                warehouse_name_ar: item.warehouse_name_ar,
                warehouse_name_en: item.warehouse_name_en,
                available_stock: item.available_stock,
                preferred_rolls: item.preferred_rolls,
                notes: item.notes,
            })),
        };
    }, [state.items, state.customer_id, state.customer_name, computed]);

    // ─── Map ConvertTarget to Supabase table & column names ───
    const TABLE_MAP: Record<ConvertTarget, {
        table: string;
        dateCol: string;
        numPrefix: string;
        totalCol?: string;
    }> = {
        quotation: { table: 'quotations', dateCol: 'quotation_date', numPrefix: 'QTN', totalCol: 'total_amount' },
        reservation: { table: 'transit_reservations', dateCol: 'reservation_date', numPrefix: 'RSV' },
        order: { table: 'sales_orders', dateCol: 'order_date', numPrefix: 'SO', totalCol: 'total_amount' },
    };

    // ─── Save document as draft to Supabase ───
    const saveDraftToSupabase = useCallback(async (docData?: any) => {
        if (savedRef.current || isSaving || !companyId) return;
        setIsSaving(true);
        try {
            const config = TABLE_MAP[tradeSheetType];
            const data = docData || tradeSheetInitialData;
            const docNumber = `${config.numPrefix}-${Date.now().toString(36).toUpperCase()}`;

            // Get tenant_id from the authenticated user
            const { data: { session } } = await supabase.auth.getSession();
            const tenantId = session?.user?.user_metadata?.tenant_id;

            // Serialize items into notes (all tables have text/notes column)
            const itemsJson = JSON.stringify({
                items: (data.items || []).map((item: any) => ({
                    material_id: item.material_id,
                    material_code: item.material_code,
                    material_name_ar: item.material_name_ar,
                    material_name_en: item.material_name_en,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    total: item.total,
                    warehouse_id: item.warehouse_id,
                    warehouse_name_ar: item.warehouse_name_ar,
                    warehouse_name_en: item.warehouse_name_en,
                    preferred_rolls: item.preferred_rolls,
                })),
                _source: 'cart',
            });

            // Base record — common columns
            const record: Record<string, any> = {
                company_id: companyId,
                ...(tenantId ? { tenant_id: tenantId } : {}),
                [config.dateCol]: new Date().toISOString().split('T')[0],
                [`${config.table === 'quotations' ? 'quotation' : config.table === 'sales_orders' ? 'order' : 'reservation'}_number`]: docNumber,
                status: 'draft',
                customer_id: data.customer_id || null,
                notes: itemsJson,
            };

            // Table-specific columns
            if (tradeSheetType !== 'reservation') {
                // quotations & sales_orders have 'currency'
                record.currency = data.currency || 'SAR';
            }
            if (tradeSheetType === 'reservation') {
                // transit_reservations requires reserved_quantity
                const totalQty = (data.items || []).reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
                record.reserved_quantity = totalQty;
                record.status = 'pending'; // reservations default to 'pending'
            }

            // Add total_amount if the table supports it
            if (config.totalCol) {
                record[config.totalCol] = data.total_amount || data.items?.reduce((s: number, i: any) => s + (i.total || i.subtotal || 0), 0) || 0;
            }

            const { error } = await supabase.from(config.table).insert(record);

            if (error) {
                console.error('Failed to save draft:', error);
                toast({
                    title: t('خطأ في الحفظ', 'Save Error'),
                    description: error.message,
                    variant: 'destructive',
                });
                return false;
            }

            savedRef.current = true;
            return true;
        } catch (err) {
            console.error('saveDraftToSupabase error:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [companyId, tradeSheetType, tradeSheetInitialData, isSaving, t]);

    // ─── Handle explicit Save from TradeSheet ───
    const handleTradeSheetSave = useCallback(async (docData?: any) => {
        const ok = await saveDraftToSupabase(docData);
        if (!ok) return;

        // Clear cart, show success toast, and navigate to sales cycle
        actions.clearCart();
        const typeName = CONVERT_OPTIONS.find(o => o.id === tradeSheetType);
        toast({
            title: t('تم الحفظ بنجاح ✅', 'Saved Successfully ✅'),
            description: t(
                `تم إنشاء ${typeName?.labelAr} كمسودة — يمكنك مراجعتها من دورة المبيعات`,
                `${typeName?.labelEn} saved as draft — review it in Sales Cycle`
            ),
        });

        // Invalidate sales cycle query so the new document appears
        queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });

        // Close sheet and navigate to sales cycle
        setTradeSheetOpen(false);
        navigate('/sales/cycle');
    }, [saveDraftToSupabase, actions, tradeSheetType, toast, t, queryClient, navigate]);

    // ─── Handle close (clicking outside, pressing X, or Escape) ───
    const handleTradeSheetClose = useCallback(async (open: boolean) => {
        if (open) {
            setTradeSheetOpen(true);
            return;
        }

        // Closing — auto-save as draft if not already saved
        if (!savedRef.current && state.items.length > 0) {
            const ok = await saveDraftToSupabase();
            if (ok) {
                actions.clearCart();
                const typeName = CONVERT_OPTIONS.find(o => o.id === tradeSheetType);
                toast({
                    title: t('تم الحفظ كمسودة 📋', 'Saved as Draft 📋'),
                    description: t(
                        `تم حفظ ${typeName?.labelAr} كمسودة تلقائياً`,
                        `${typeName?.labelEn} auto-saved as draft`
                    ),
                });
                queryClient.invalidateQueries({ queryKey: ['sales_cycle_full'] });
                navigate('/sales/cycle');
            }
        }

        setTradeSheetOpen(false);
    }, [saveDraftToSupabase, state.items.length, actions, tradeSheetType, toast, t, queryClient, navigate]);

    return (
        <TooltipProvider delayDuration={200}>
            <Sheet open={state.isDrawerOpen} onOpenChange={(open) => !open && actions.closeDrawer()}>
                <SheetContent
                    side={isAr ? 'left' : 'right'}
                    className="w-full sm:w-[720px] lg:w-[820px] sm:max-w-[820px] flex flex-col p-0"
                >
                    {/* ══════════ Header ══════════ */}
                    <SheetHeader className="px-5 py-4 border-b bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/30 flex-shrink-0">
                        <SheetTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <span className="text-base font-bold">{t('سلة المواد', 'Material Cart')}</span>
                                    {state.items.length > 0 && (
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="secondary" className="text-xs font-mono">
                                                {state.items.length} {t('بند', 'items')}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs font-mono text-emerald-600">
                                                {computed.material_count} {t('مادة', 'materials')}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Convert Button */}
                            {state.items.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20"
                                        >
                                            <Send className="h-4 w-4" />
                                            {t('تحويل إلى', 'Convert to')}
                                            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-72">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                            {t('تحويل سلة المواد إلى', 'Convert cart to')}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {CONVERT_OPTIONS.map((opt) => {
                                            const Icon = opt.icon;
                                            return (
                                                <DropdownMenuItem
                                                    key={opt.id}
                                                    onClick={() => handleConvert(opt.id)}
                                                    className="gap-3 cursor-pointer py-3"
                                                >
                                                    <div className={`p-1.5 rounded-lg ${opt.bgColor} ${opt.color}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-semibold text-sm block">
                                                            {isAr ? opt.labelAr : opt.labelEn}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {isAr ? opt.descAr : opt.descEn}
                                                        </span>
                                                    </div>
                                                    <ArrowRightCircle className={cn("w-4 h-4 text-gray-300", isRTL && "rotate-180")} />
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </SheetTitle>
                    </SheetHeader>

                    {/* ══════════ Content ══════════ */}
                    {state.items.length === 0 ? (
                        /* ── Empty State ── */
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-5 shadow-inner">
                                <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('السلة فارغة', 'Cart is Empty')}
                            </h3>
                            <p className="text-sm text-gray-500 max-w-[320px] leading-relaxed">
                                {t(
                                    'افتح أي مادة واضغط على رمز السلة بجانب المستودع لإضافتها',
                                    'Open any material and click the cart icon next to a warehouse to add it'
                                )}
                            </p>
                        </div>
                    ) : (
                        /* ── Grouped Material View ── */
                        <ScrollArea className="flex-1" dir={isAr ? 'rtl' : 'ltr'}>
                            <div className="p-4 space-y-4">
                                {groupedItems.map((group, groupIdx) => {
                                    // Calculate group totals
                                    const groupQty = group.items.reduce((s, i) => s + i.quantity, 0);
                                    const groupAmount = group.items.reduce((s, i) => s + i.subtotal, 0);
                                    const groupCurrency = group.items[0]?.currency || '';
                                    const groupUnit = group.items[0]?.unit || 'meter';

                                    return (
                                        <div
                                            key={group.materialId}
                                            className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
                                        >
                                            {/* ═══ Material Header ═══ */}
                                            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-800/60 dark:to-gray-800/40 px-4 py-3 border-b flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                                        <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-sm">{group.materialName}</h3>
                                                        <span className="text-[11px] text-gray-500 font-mono">{group.materialCode}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {/* Group Summary Badges */}
                                                    <div className="hidden sm:flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs font-mono gap-1">
                                                            <WarehouseIcon className="w-3 h-3" />
                                                            {group.items.length} {t('مستودع', 'wh')}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs font-mono gap-1">
                                                            <Ruler className="w-3 h-3" />
                                                            {groupQty.toLocaleString('en-US', { maximumFractionDigits: 2 })} {groupUnit}
                                                        </Badge>
                                                        <Badge className="text-xs font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                            {groupAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {groupCurrency}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ═══ Warehouse Sub-items ═══ */}
                                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {group.items.map((item) => {
                                                    const whName = getName(item.warehouse_name_ar, item.warehouse_name_en);
                                                    const isEditQty = editingQty === item.id;
                                                    const isEditPrice = editingPrice === item.id;
                                                    const preferredCount = item.preferred_rolls?.length || 0;

                                                    return (
                                                        <div key={item.id} className="group">
                                                            {/* Warehouse Row */}
                                                            <div className="px-4 py-3 flex items-center gap-3 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors">
                                                                {/* Warehouse Icon + Name */}
                                                                <div className="flex items-center gap-2 min-w-0 w-[180px] flex-shrink-0">
                                                                    <WarehouseIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                    <span className="text-sm font-medium truncate">{whName}</span>
                                                                </div>

                                                                {/* Quantity */}
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    {isEditQty ? (
                                                                        <div className="flex items-center gap-0.5">
                                                                            <Input
                                                                                type="number"
                                                                                value={tempQty}
                                                                                onChange={(e) => setTempQty(e.target.value)}
                                                                                className="h-7 w-20 text-xs font-mono text-center px-1"
                                                                                autoFocus
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') confirmEditQty(item);
                                                                                    if (e.key === 'Escape') setEditingQty(null);
                                                                                }}
                                                                            />
                                                                            <span className="text-[10px] text-gray-400">{item.unit}</span>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-emerald-600"
                                                                                onClick={() => confirmEditQty(item)}
                                                                            >
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-md px-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                onClick={() => handleQuantityChange(item, -10)}
                                                                                disabled={item.quantity <= 0.1}
                                                                            >
                                                                                <Minus className="h-3 w-3" />
                                                                            </Button>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <button
                                                                                        onClick={() => startEditQty(item)}
                                                                                        className="text-sm font-mono font-bold min-w-[50px] text-center hover:text-emerald-600 hover:underline transition-colors cursor-text"
                                                                                    >
                                                                                        {item.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" className="text-xs">
                                                                                    {t('انقر للتعديل', 'Click to edit')}
                                                                                    {item.available_stock ? ` — ${t('المتاح', 'Available')}: ${item.available_stock.toLocaleString('en-US')}` : ''}
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                onClick={() => handleQuantityChange(item, 10)}
                                                                                disabled={!!item.available_stock && item.quantity >= item.available_stock}
                                                                            >
                                                                                <Plus className="h-3 w-3" />
                                                                            </Button>
                                                                            <span className="text-[10px] text-gray-400 ms-0.5">{item.unit}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* × */}
                                                                <span className="text-gray-300 text-xs">×</span>

                                                                {/* Unit Price */}
                                                                <div className="flex-shrink-0">
                                                                    {isEditPrice ? (
                                                                        <div className="flex items-center gap-0.5">
                                                                            <Input
                                                                                type="number"
                                                                                value={tempPrice}
                                                                                onChange={(e) => setTempPrice(e.target.value)}
                                                                                className="h-7 w-20 text-xs font-mono text-center px-1"
                                                                                autoFocus
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') confirmEditPrice(item);
                                                                                    if (e.key === 'Escape') setEditingPrice(null);
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-emerald-600"
                                                                                onClick={() => confirmEditPrice(item)}
                                                                            >
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <button
                                                                                    onClick={() => startEditPrice(item)}
                                                                                    className="text-sm font-mono hover:text-emerald-600 hover:underline transition-colors cursor-text"
                                                                                >
                                                                                    {item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                                </button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top" className="text-xs">
                                                                                {t('سعر الوحدة — انقر للتعديل', 'Unit price — Click to edit')}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>

                                                                {/* = */}
                                                                <span className="text-gray-300 text-xs">=</span>

                                                                {/* Subtotal */}
                                                                <div className="flex-1 text-end">
                                                                    <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                                                        {item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 ms-1">{item.currency}</span>
                                                                </div>

                                                                {/* Delete */}
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                                                            onClick={() => actions.removeItem(item.id)}
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="text-xs">
                                                                        {t('حذف هذا المستودع', 'Remove this warehouse')}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </div>

                                                            {/* Preferred Rolls */}
                                                            {preferredCount > 0 && (
                                                                <div className="px-4 pb-2.5 -mt-1">
                                                                    <div className="ms-6 flex flex-wrap items-center gap-1.5">
                                                                        <Heart className="w-3 h-3 text-emerald-500" />
                                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                            {t('رولونات مفضلة:', 'Preferred:')}
                                                                        </span>
                                                                        {item.preferred_rolls.map(roll => (
                                                                            <Badge
                                                                                key={roll.roll_id}
                                                                                variant="outline"
                                                                                className="text-[10px] h-5 px-1.5 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 gap-1 font-mono"
                                                                            >
                                                                                <Scroll className="w-2.5 h-2.5" />
                                                                                {roll.roll_number}
                                                                                <span className="text-emerald-400">({roll.available_length.toLocaleString('en-US')})</span>
                                                                                <button
                                                                                    className="ms-0.5 text-emerald-400 hover:text-red-500 transition-colors"
                                                                                    onClick={() => actions.togglePreferredRoll(item.material_id, item.warehouse_id, roll)}
                                                                                >
                                                                                    <X className="w-2.5 h-2.5" />
                                                                                </button>
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}

                    {/* ══════════ Footer ══════════ */}
                    {state.items.length > 0 && (
                        <div className="border-t bg-white dark:bg-gray-900 px-5 py-4 space-y-3 flex-shrink-0">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center">
                                    <p className="text-[11px] text-gray-500 mb-0.5">{t('عدد المواد', 'Materials')}</p>
                                    <p className="text-lg font-bold font-mono">{computed.material_count}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center">
                                    <p className="text-[11px] text-gray-500 mb-0.5">{t('إجمالي الكمية', 'Total Qty')}</p>
                                    <p className="text-lg font-bold font-mono">
                                        {computed.total_quantity?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                                    </p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mb-0.5">{t('المبلغ الإجمالي', 'Total Amount')}</p>
                                    <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                                        {computed.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-emerald-600/60">{computed.currency}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    onClick={() => setShowClearConfirm(true)}
                                >
                                    <Trash2 className="h-4 w-4 me-1.5" />
                                    {t('إفراغ السلة', 'Clear Cart')}
                                </Button>

                                {/* Quick convert buttons */}
                                <div className="flex flex-1 gap-1.5">
                                    {CONVERT_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        return (
                                            <Tooltip key={opt.id}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className={`flex-1 gap-1.5 ${opt.color} border-current/20 hover:bg-current/5`}
                                                        onClick={() => handleConvert(opt.id)}
                                                    >
                                                        <Icon className="h-3.5 w-3.5" />
                                                        <span className="text-xs hidden sm:inline">
                                                            {isAr ? opt.labelAr : opt.labelEn}
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="text-xs">
                                                    {isAr ? opt.descAr : opt.descEn}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Clear Confirmation */}
            <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            {t('إفراغ السلة', 'Clear Cart')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                `هل تريد إفراغ السلة؟ سيتم حذف ${state.items.length} بند من ${computed.material_count} مادة.`,
                                `Clear cart? This will remove ${state.items.length} items from ${computed.material_count} materials.`
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                actions.clearCart();
                                setShowClearConfirm(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t('إفراغ السلة', 'Clear Cart')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ══════════ UnifiedTradeSheet ══════════ */}
            {tradeSheetOpen && (
                <UnifiedTradeSheet
                    open={tradeSheetOpen}
                    onOpenChange={handleTradeSheetClose}
                    mode="sales"
                    type={tradeSheetType}
                    initialData={tradeSheetInitialData}
                    onSave={handleTradeSheetSave}
                    allowTypeSwitch={true}
                />
            )}
        </TooltipProvider>
    );
}

export default CartDrawer;
