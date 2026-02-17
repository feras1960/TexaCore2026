/**
 * 🛒 TransitCartDrawer — درج سلة حجوزات بضائع الترانزيت
 * 
 * Transit Reservation Cart Drawer
 * - Floating cart icon with item count badge
 * - Side drawer with customer selection, item list, advance payment
 * - Confirm reservation → save to container_reservations DB
 * - Auto-updates reserved_quantity on container_items
 * 
 * 📋 Unified 2026-02-17: migrated from shipments → containers
 * 
 * @module TransitCartDrawer
 * @phase 13B-3
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ShoppingCart,
    X,
    Trash2,
    User,
    CreditCard,
    Minus,
    Plus,
    Check,
    AlertTriangle,
    Package,
    DollarSign,
    FileText,
    Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { UseTransitCartReturn, TransitCartCustomer } from '../hooks/useTransitCart';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface TransitCartDrawerProps {
    cart: UseTransitCartReturn;
    shipmentNumber?: string; // kept for backward compat — now means containerNumber
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export const TransitCartDrawer: React.FC<TransitCartDrawerProps> = ({
    cart,
    shipmentNumber,
}) => {
    const { t, isRTL } = useLanguage();
    const { companyId, company } = useCompany();
    const { currencyCode: currency } = useCompanyCurrency();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [editingQty, setEditingQty] = useState<Record<string, string>>({});
    const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

    // ── Bilingual helper
    const tt = (ar: string, en: string) => isRTL ? ar : en;

    // ── Fetch customers for selection
    const { data: customers = [] } = useQuery({
        queryKey: ['customers-for-transit', companyId, customerSearch],
        queryFn: async () => {
            if (!companyId) return [];
            let query = supabase
                .from('customers')
                .select('id, code, name_ar, name_en, balance, credit_limit')
                .eq('status', 'active')
                .order('name_ar')
                .limit(20);

            if (customerSearch) {
                query = query.or(
                    `name_ar.ilike.%${customerSearch}%,name_en.ilike.%${customerSearch}%,code.ilike.%${customerSearch}%`
                );
            }
            const { data, error } = await query;
            if (error) return [];
            return (data || []).map((c: any) => ({
                id: c.id,
                name: isRTL ? c.name_ar : (c.name_en || c.name_ar),
                code: c.code,
                balance: c.balance || 0,
                creditLimit: c.credit_limit || 0,
            }));
        },
        enabled: !!companyId,
    });

    // ── Generate reservation number
    const generateReservationNumber = async (): Promise<string> => {
        const prefix = 'TR';
        const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        // Get sequence from container_reservations (unified)
        const { data: existing } = await supabase
            .from('container_reservations')
            .select('reservation_number')
            .ilike('reservation_number', `${prefix}${date}%`)
            .order('reservation_number', { ascending: false })
            .limit(1);

        let seq = 1;
        if (existing && existing.length > 0) {
            const lastNum = existing[0].reservation_number.slice(-3);
            seq = parseInt(lastNum, 10) + 1;
        }
        return `${prefix}${date}${String(seq).padStart(3, '0')}`;
    };

    // ── Submit reservation
    const handleSubmit = async () => {
        if (!cart.cart.customer) {
            toast({
                title: tt('خطأ', 'Error'),
                description: tt('يرجى اختيار العميل أولاً', 'Please select a customer first'),
                variant: 'destructive',
            });
            return;
        }

        if (cart.cart.items.length === 0) {
            toast({
                title: tt('خطأ', 'Error'),
                description: tt('السلة فارغة', 'Cart is empty'),
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const reservationNumber = await generateReservationNumber();

            // Create one reservation per cart item → container_reservations (unified)
            const reservations = cart.cart.items.map(item => ({
                tenant_id: company?.tenant_id,
                company_id: companyId,
                reservation_number: `${reservationNumber}-${item.materialCode || item.shipmentItemId.slice(0, 4)}`,
                reservation_date: new Date().toISOString().slice(0, 10),
                customer_id: cart.cart.customer!.id,
                customer_name: cart.cart.customer!.name,
                container_id: cart.cart.shipmentId, // ← was shipment_id, now container_id
                container_item_id: item.shipmentItemId, // ← was shipment_item_id
                material_id: item.materialId,
                color_id: item.colorId,
                product_id: item.productId,
                reserved_quantity: item.reservedQuantity,
                unit: item.unit,
                unit_price: item.unitPrice,
                total_amount: item.totalAmount,
                advance_amount: 0, // Distribute advance proportionally if needed
                status: 'pending',
                notes: cart.cart.notes || null,
                created_by: user?.id || null,
            }));

            const { error } = await supabase
                .from('container_reservations')
                .insert(reservations);

            if (error) throw error;

            // Update reserved_quantity on container_items (unified)
            for (const item of cart.cart.items) {
                const { error: updateError } = await supabase.rpc('increment_reserved_quantity', {
                    p_item_id: item.shipmentItemId,
                    p_quantity: item.reservedQuantity,
                });

                // Fallback: direct update if RPC doesn't exist
                if (updateError) {
                    const { data: currentItem } = await supabase
                        .from('container_items')
                        .select('reserved_quantity')
                        .eq('id', item.shipmentItemId)
                        .single();

                    if (currentItem) {
                        await supabase
                            .from('container_items')
                            .update({
                                reserved_quantity: (currentItem.reserved_quantity || 0) + item.reservedQuantity,
                            })
                            .eq('id', item.shipmentItemId);
                    }
                }
            }

            toast({
                title: tt('✅ تم الحجز', '✅ Reserved'),
                description: tt(
                    `تم حجز ${cart.itemCount} صنف للعميل ${cart.cart.customer!.name}`,
                    `${cart.itemCount} items reserved for ${cart.cart.customer!.name}`
                ),
            });

            cart.clearCart();
            cart.setIsOpen(false);
        } catch (err: any) {
            console.error('Reservation error:', err);
            toast({
                title: tt('خطأ', 'Error'),
                description: err.message || tt('حدث خطأ أثناء الحجز', 'Reservation failed'),
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Format number
    const fmt = (n: number) =>
        n?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || '0';

    // ═══════════════════════════════════════════════════════════════
    // Render — Floating Cart Button
    // ═══════════════════════════════════════════════════════════════

    const renderFloatingButton = () => {
        if (cart.itemCount === 0) return null;

        return (
            <div className="fixed bottom-6 z-50" style={{ [isRTL ? 'left' : 'right']: '24px' }}>
                <Button
                    onClick={() => cart.setIsOpen(true)}
                    size="lg"
                    className={cn(
                        "h-14 px-5 rounded-full shadow-2xl gap-3",
                        "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                        "text-white font-medium",
                        "animate-in zoom-in-50 duration-300"
                    )}
                >
                    <div className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        <Badge
                            className="absolute -top-2.5 -right-2.5 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px] bg-red-500 border-2 border-white"
                        >
                            {cart.itemCount}
                        </Badge>
                    </div>
                    <span>{fmt(cart.totalAmount)} {currency}</span>
                </Button>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // Render — Cart Drawer Content
    // ═══════════════════════════════════════════════════════════════

    return (
        <>
            {renderFloatingButton()}

            <Sheet open={cart.isOpen} onOpenChange={cart.setIsOpen}>
                <SheetContent
                    side={isRTL ? 'left' : 'right'}
                    className="w-full sm:max-w-lg flex flex-col"
                >
                    {/* ── Header ── */}
                    <SheetHeader className="pb-3">
                        <SheetTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <span>{tt('سلة حجوزات الترانزيت', 'Transit Reservations')}</span>
                            {shipmentNumber && (
                                <Badge variant="outline" className="font-mono text-xs">
                                    {shipmentNumber}
                                </Badge>
                            )}
                        </SheetTitle>
                    </SheetHeader>

                    {/* ── Scrollable Content ── */}
                    <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">

                        {/* ────── Customer Selection ────── */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold">
                                <User className="w-3.5 h-3.5" />
                                {tt('العميل', 'Customer')}
                            </Label>

                            {cart.cart.customer ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {cart.cart.customer.name}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            <span className="font-mono">{cart.cart.customer.code}</span>
                                            <span>
                                                {tt('الرصيد:', 'Balance:')} {fmt(cart.cart.customer.balance)} {currency}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0"
                                        onClick={() => cart.setCustomer(null)}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Input
                                        placeholder={tt('بحث عن عميل...', 'Search customer...')}
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        className="h-9"
                                    />
                                    {customers.length > 0 && customerSearch && (
                                        <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                                            {customers.map((c: TransitCartCustomer) => (
                                                <button
                                                    key={c.id}
                                                    className="w-full text-start px-3 py-2 hover:bg-muted/50 transition-colors text-sm border-b last:border-b-0"
                                                    onClick={() => {
                                                        cart.setCustomer(c);
                                                        setCustomerSearch('');
                                                    }}
                                                >
                                                    <span className="font-medium">{c.name}</span>
                                                    <span className="text-xs text-muted-foreground mx-2">({c.code})</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ────── Cart Items ────── */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                                    <Package className="w-3.5 h-3.5" />
                                    {tt('البنود المحجوزة', 'Reserved Items')}
                                    <Badge variant="secondary" className="text-xs">
                                        {cart.itemCount}
                                    </Badge>
                                </Label>
                                {cart.itemCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive hover:text-destructive"
                                        onClick={cart.clearCart}
                                    >
                                        <Trash2 className="w-3 h-3 mx-1" />
                                        {tt('مسح الكل', 'Clear All')}
                                    </Button>
                                )}
                            </div>

                            {cart.itemCount === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">
                                        {tt('السلة فارغة', 'Cart is empty')}
                                    </p>
                                    <p className="text-xs mt-1">
                                        {tt(
                                            'اضغط على زر "أضف للسلة" من جدول البنود',
                                            'Click "Add to Cart" from the items table'
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {cart.cart.items.map((item) => (
                                        <div
                                            key={item.shipmentItemId}
                                            className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                                        >
                                            {/* Item Header */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {item.itemDescription || item.materialCode || tt('بند', 'Item')}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        {item.colorName && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                {item.colorName}
                                                            </Badge>
                                                        )}
                                                        {item.materialCode && (
                                                            <span className="font-mono">{item.materialCode}</span>
                                                        )}
                                                        <span className="text-emerald-600">
                                                            {tt('متاح:', 'Avail:')} {fmt(item.availableQuantity)} {item.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 text-destructive/60 hover:text-destructive"
                                                    onClick={() => cart.removeItem(item.shipmentItemId)}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>

                                            {/* Quantity + Price */}
                                            <div className="flex items-center gap-2">
                                                {/* Quantity control */}
                                                <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            cart.updateQuantity(
                                                                item.shipmentItemId,
                                                                item.reservedQuantity - 1
                                                            )
                                                        }
                                                        disabled={item.reservedQuantity <= 1}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        value={editingQty[item.shipmentItemId] ?? item.reservedQuantity}
                                                        onChange={(e) => {
                                                            setEditingQty(prev => ({
                                                                ...prev,
                                                                [item.shipmentItemId]: e.target.value,
                                                            }));
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val) && val > 0) {
                                                                cart.updateQuantity(item.shipmentItemId, val);
                                                            }
                                                            setEditingQty(prev => {
                                                                const next = { ...prev };
                                                                delete next[item.shipmentItemId];
                                                                return next;
                                                            });
                                                        }}
                                                        className="h-7 w-20 text-center text-sm font-mono border-0 bg-transparent"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() =>
                                                            cart.updateQuantity(
                                                                item.shipmentItemId,
                                                                item.reservedQuantity + 1
                                                            )
                                                        }
                                                        disabled={item.reservedQuantity >= item.availableQuantity}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>

                                                <span className="text-xs text-muted-foreground">{item.unit}</span>

                                                <span className="text-xs text-muted-foreground">×</span>

                                                {/* Price */}
                                                <Input
                                                    type="number"
                                                    value={editingPrice[item.shipmentItemId] ?? item.unitPrice}
                                                    onChange={(e) => {
                                                        setEditingPrice(prev => ({
                                                            ...prev,
                                                            [item.shipmentItemId]: e.target.value,
                                                        }));
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val >= 0) {
                                                            cart.updatePrice(item.shipmentItemId, val);
                                                        }
                                                        setEditingPrice(prev => {
                                                            const next = { ...prev };
                                                            delete next[item.shipmentItemId];
                                                            return next;
                                                        });
                                                    }}
                                                    className="h-7 w-20 text-center text-sm font-mono"
                                                />

                                                {/* Total */}
                                                <div className="flex-1 text-end">
                                                    <span className="font-bold text-sm font-mono text-blue-700 dark:text-blue-400">
                                                        {fmt(item.totalAmount)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground mx-1">{currency}</span>
                                                </div>
                                            </div>

                                            {/* Quantity warning */}
                                            {item.reservedQuantity > item.availableQuantity * 0.8 && (
                                                <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {tt(
                                                        `${Math.round((item.reservedQuantity / item.availableQuantity) * 100)}% من المتاح`,
                                                        `${Math.round((item.reservedQuantity / item.availableQuantity) * 100)}% of available`
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.itemCount > 0 && (
                            <>
                                <Separator />

                                {/* ────── Advance Payment ────── */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                                        <CreditCard className="w-3.5 h-3.5" />
                                        {tt('دفعة مقدمة (اختياري)', 'Advance Payment (optional)')}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={cart.cart.advanceAmount || ''}
                                            onChange={(e) => cart.setAdvanceAmount(parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="h-9 font-mono"
                                        />
                                        <span className="text-sm text-muted-foreground shrink-0">{currency}</span>
                                    </div>
                                    {cart.cart.advanceAmount > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            {tt(
                                                `${Math.round((cart.cart.advanceAmount / cart.totalAmount) * 100)}% من الإجمالي`,
                                                `${Math.round((cart.cart.advanceAmount / cart.totalAmount) * 100)}% of total`
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ────── Notes ────── */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                                        <FileText className="w-3.5 h-3.5" />
                                        {tt('ملاحظات', 'Notes')}
                                    </Label>
                                    <Textarea
                                        value={cart.cart.notes}
                                        onChange={(e) => cart.setNotes(e.target.value)}
                                        placeholder={tt('ملاحظات إضافية للحجز...', 'Additional notes for the reservation...')}
                                        rows={2}
                                        className="text-sm resize-none"
                                    />
                                </div>

                                <Separator />

                                {/* ────── Summary ────── */}
                                <div className="space-y-2 pb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {tt('عدد البنود', 'Items')}
                                        </span>
                                        <span className="font-medium">{cart.itemCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {tt('إجمالي الكمية', 'Total Qty')}
                                        </span>
                                        <span className="font-mono font-medium">
                                            {fmt(cart.cart.items.reduce((s, i) => s + i.reservedQuantity, 0))}
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">
                                            {tt('الإجمالي المتوقع', 'Estimated Total')}
                                        </span>
                                        <span className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400">
                                            {fmt(cart.totalAmount)} <span className="text-sm">{currency}</span>
                                        </span>
                                    </div>
                                    {cart.cart.advanceAmount > 0 && (
                                        <div className="flex justify-between text-sm text-emerald-600">
                                            <span>{tt('الدفعة المقدمة', 'Advance')}</span>
                                            <span className="font-mono font-medium">
                                                -{fmt(cart.cart.advanceAmount)} {currency}
                                            </span>
                                        </div>
                                    )}
                                    {cart.cart.advanceAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {tt('المتبقي عند التسليم', 'Due on delivery')}
                                            </span>
                                            <span className="font-mono font-medium">
                                                {fmt(cart.totalAmount - cart.cart.advanceAmount)} {currency}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    {cart.itemCount > 0 && (
                        <SheetFooter className="pt-3 border-t gap-2 flex-row">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => cart.setIsOpen(false)}
                            >
                                {tt('إغلاق', 'Close')}
                            </Button>
                            <Button
                                className={cn(
                                    "flex-1 gap-2",
                                    "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                )}
                                onClick={handleSubmit}
                                disabled={isSubmitting || !cart.cart.customer}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {tt('تأكيد الحجز', 'Confirm Reservation')}
                            </Button>
                        </SheetFooter>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
};
