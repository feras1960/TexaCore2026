/**
 * UnifiedTradeSheet — المكوّن الموحد لإنشاء/تعديل مستندات التجارة
 *
 * ✅ يدعم تغيير نوع المستند عبر قائمة منسدلة
 * ✅ قواعد عمل حسب الصلاحيات:
 *    - عرض سعر ↔ حجز بضائع ↔ أمر بيع (تحويل حر لموظفي المبيعات)
 *    - إذن تسليم ← أمين المستودع فقط
 *    - فاتورة مبيعات ← POS مباشر أو تلقائية من التسليم أو أدمن
 * ✅ POS Mode: فاتورة + تسليم + خصم مخزون فورياً
 * ✅ يحتفظ بالبيانات المشتركة عند التبديل
 */

import React, { useState, useMemo, useCallback } from 'react';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { UnifiedDocType } from '@/features/accounting/components/unified/types';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    FileText, ShoppingCart, Truck, Receipt, Package,
    ChevronDown, Lock, ArrowRight, AlertCircle,
    Store, Zap, Shield,
} from 'lucide-react';

// ─── Document Type Definitions ──────────────────────────────────────────
type TradeType = 'quotation' | 'reservation' | 'order' | 'delivery' | 'invoice';

interface DocTypeDef {
    id: TradeType;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    /** Database table name */
    table: string;
    /** Who can create this type */
    requiredRole: 'sales' | 'warehouse' | 'admin' | 'any';
    /** Help text for restrictions */
    restrictionAr?: string;
    restrictionEn?: string;
}

const DOC_TYPES: DocTypeDef[] = [
    {
        id: 'quotation',
        labelAr: 'عرض سعر',
        labelEn: 'Quotation',
        icon: FileText,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        table: 'quotations',
        requiredRole: 'any',
    },
    {
        id: 'reservation',
        labelAr: 'حجز بضائع',
        labelEn: 'Reservation',
        icon: Package,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
        table: 'transit_reservations',
        requiredRole: 'any',
    },
    {
        id: 'order',
        labelAr: 'أمر بيع',
        labelEn: 'Sales Order',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        table: 'sales_orders',
        requiredRole: 'any',
    },
    {
        id: 'delivery',
        labelAr: 'إذن تسليم',
        labelEn: 'Delivery Note',
        icon: Truck,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        table: 'sales_deliveries',
        requiredRole: 'warehouse',
        restrictionAr: 'أمين المستودع فقط — يتطلب أمر بيع',
        restrictionEn: 'Warehouse keeper only — requires Sales Order',
    },
    {
        id: 'invoice',
        labelAr: 'فاتورة مبيعات',
        labelEn: 'Sales Invoice',
        icon: Receipt,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        table: 'sales_invoices',
        requiredRole: 'admin',
        restrictionAr: 'تُنشأ تلقائياً من التسليم — أو بيع مباشر (POS)',
        restrictionEn: 'Auto from delivery — or direct POS sale',
    },
];

// ─── Type Mapping ───────────────────────────────────────────────────────
const TYPE_TO_DOC_TYPE: Record<string, UnifiedDocType> = {
    invoice: 'trade_invoice',
    quotation: 'trade_quotation',
    request: 'trade_request',
    receipt: 'trade_receipt',
    return: 'trade_return',
    delivery: 'trade_delivery',
    reservation: 'trade_reservation',
    container: 'trade_container',
    order: 'trade_order',
};

// ─── Sales Flow Order ───────────────────────────────────────────────────
const FLOW_ORDER: TradeType[] = ['quotation', 'reservation', 'order', 'delivery', 'invoice'];

// ─── Props ──────────────────────────────────────────────────────────────
interface UnifiedTradeSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'purchase' | 'sales';
    type?: 'request' | 'quotation' | 'order' | 'invoice' | 'receipt' | 'return' | 'delivery' | 'reservation' | 'container';
    initialData?: any;
    onSave?: (data: any) => Promise<void>;
    /** Allow switching document type inside the sheet */
    allowTypeSwitch?: boolean;
    /** Has a linked sales order (enables delivery) */
    linkedOrderId?: string;
    /** POS mode — direct sale from store, auto-executes delivery */
    posMode?: boolean;
    /** User role for permission checks */
    userRole?: 'sales' | 'warehouse' | 'admin';
}

// ─── Component ──────────────────────────────────────────────────────────
export const UnifiedTradeSheet: React.FC<UnifiedTradeSheetProps> = ({
    open,
    onOpenChange,
    mode,
    type = 'order',
    initialData,
    onSave,
    allowTypeSwitch = true,
    linkedOrderId,
    posMode = false,
    userRole = 'admin', // Default to admin for now until RBAC is connected
}) => {
    const { isRTL } = useLanguage();
    const [activeType, setActiveType] = useState<string>(type);

    // Reset type when prop changes
    React.useEffect(() => {
        setActiveType(type);
    }, [type]);

    // Check if user can select a specific type
    const canSelectType = useCallback((dt: DocTypeDef): { allowed: boolean; reason?: string } => {
        // Admin can do everything
        if (userRole === 'admin') return { allowed: true };

        // Delivery → warehouse only
        if (dt.id === 'delivery') {
            if (userRole !== 'warehouse') {
                return {
                    allowed: false,
                    reason: isRTL ? 'أمين المستودع فقط' : 'Warehouse keeper only'
                };
            }
            if (!linkedOrderId) {
                return {
                    allowed: false,
                    reason: isRTL ? 'يتطلب أمر بيع مرتبط' : 'Requires linked Sales Order'
                };
            }
            return { allowed: true };
        }

        // Invoice → admin or POS mode
        if (dt.id === 'invoice') {
            if (posMode) return { allowed: true };
            return {
                allowed: false,
                reason: isRTL
                    ? 'الفاتورة تُنشأ تلقائياً — أو استخدم البيع المباشر (POS)'
                    : 'Invoice is auto-generated — or use POS mode'
            };
        }

        // Quotation, reservation, order → any sales staff
        return { allowed: true };
    }, [userRole, linkedOrderId, posMode, isRTL]);

    // Determine which types can be selected based on context
    const availableTypes = useMemo(() => {
        return DOC_TYPES.map(dt => {
            const check = canSelectType(dt);
            return { ...dt, selectable: check.allowed, reason: check.reason };
        });
    }, [canSelectType]);

    const currentTypeDef = availableTypes.find(dt => dt.id === activeType) || availableTypes[0];

    // Handle type switch
    const handleTypeSwitch = useCallback((newType: string) => {
        setActiveType(newType);
    }, []);

    // Map to unified doc type
    const docType: UnifiedDocType = TYPE_TO_DOC_TYPE[activeType] || 'trade_order';

    // Is this a POS invoice?
    const isPOSInvoice = posMode && activeType === 'invoice';

    // Enhance initial data with trade-specific context
    const enhancedData = useMemo(() => ({
        ...initialData,
        type: mode,
        subType: activeType,
        status: initialData?.status || 'draft',
        // POS mode flags
        _posMode: isPOSInvoice,
        _autoDelivery: isPOSInvoice, // Auto-create delivery when saving
        _linkedOrderId: linkedOrderId,
    }), [initialData, mode, activeType, isPOSInvoice, linkedOrderId]);

    // Build the type selector header
    const isCreateMode = !initialData?.id;
    const isEditOrCreate = isCreateMode || mode === 'sales';

    const TypeSelectorHeader = allowTypeSwitch && mode === 'sales' ? (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-gray-50/80 dark:bg-gray-800/80">
            <span className="text-[10px] text-gray-400 shrink-0">
                {isRTL ? 'النوع:' : 'Type:'}
            </span>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 gap-2 px-3 border-2 transition-all hover:shadow-sm ${currentTypeDef.color}`}
                    >
                        <div className={`p-1 rounded ${currentTypeDef.bgColor}`}>
                            <currentTypeDef.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-sm">
                            {isRTL ? currentTypeDef.labelAr : currentTypeDef.labelEn}
                        </span>
                        {isPOSInvoice && (
                            <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 gap-1">
                                <Store className="w-2.5 h-2.5" /> POS
                            </Badge>
                        )}
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-72">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        {isRTL ? 'اختر نوع المستند' : 'Select Document Type'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableTypes.map(dt => {
                        const Icon = dt.icon;
                        const isActive = dt.id === activeType;
                        const isLocked = !dt.selectable;

                        return (
                            <DropdownMenuItem
                                key={dt.id}
                                onClick={() => !isLocked && handleTypeSwitch(dt.id)}
                                disabled={isLocked}
                                className={`gap-3 cursor-pointer py-3 ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <div className={`p-1.5 rounded-lg ${dt.bgColor} ${dt.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {isRTL ? dt.labelAr : dt.labelEn}
                                        </span>
                                        {isActive && (
                                            <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                                                {isRTL ? 'حالي' : 'Active'}
                                            </Badge>
                                        )}
                                        {isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                                    </div>
                                    {isLocked && dt.reason && (
                                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                            <AlertCircle className="w-2.5 h-2.5" />
                                            {dt.reason}
                                        </p>
                                    )}
                                </div>
                                {!isLocked && !isActive && (
                                    <ArrowRight className={`w-3.5 h-3.5 text-gray-300 ${isRTL ? 'rotate-180' : ''}`} />
                                )}
                            </DropdownMenuItem>
                        );
                    })}

                    {/* POS Mode separator */}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {isRTL ? 'أوضاع خاصة' : 'Special Modes'}
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => {
                            setActiveType('invoice');
                        }}
                        className="gap-3 cursor-pointer py-3"
                        disabled={userRole !== 'admin' && userRole !== 'sales'}
                    >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                            <Store className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                    {isRTL ? 'بيع مباشر (POS)' : 'Direct Sale (POS)'}
                                </span>
                                <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                                    <Zap className="w-2.5 h-2.5" />
                                </Badge>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {isRTL
                                    ? 'فاتورة + تسليم + خصم مخزون فوري'
                                    : 'Invoice + Delivery + Instant stock deduction'}
                            </p>
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* POS indicator */}
            {isPOSInvoice && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <Store className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-semibold text-amber-700">
                                    {isRTL ? 'بيع مباشر' : 'POS Mode'}
                                </span>
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs max-w-[200px]">
                                {isRTL
                                    ? 'عند الحفظ: يُنشأ إذن تسليم تلقائياً ويُخصم من مخزون المتجر فوراً'
                                    : 'On save: auto-creates delivery note and deducts from store inventory instantly'}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Flow indicator (desktop only, hidden in create mode) */}
            {!isCreateMode && (
                <div className="hidden lg:flex items-center gap-1 ms-auto text-[10px] text-gray-300">
                    {FLOW_ORDER.map((stage, i) => {
                        const def = DOC_TYPES.find(d => d.id === stage)!;
                        const isCurrentStage = stage === activeType;
                        return (
                            <React.Fragment key={stage}>
                                <span className={`${isCurrentStage ? `${def.color} font-bold` : ''}`}>
                                    {isRTL ? def.labelAr : def.labelEn}
                                </span>
                                {i < FLOW_ORDER.length - 1 && (
                                    <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    ) : null;

    return (
        <UnifiedAccountingSheet
            isOpen={open}
            onClose={() => onOpenChange(false)}
            docType={docType}
            mode={initialData?.id ? 'edit' : 'create'}
            data={enhancedData}
            onSave={onSave}
            headerExtra={TypeSelectorHeader}
            tradeMode={mode}
        />
    );
};
