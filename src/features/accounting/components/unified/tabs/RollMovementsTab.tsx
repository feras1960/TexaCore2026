/**
 * RollMovementsTab — سجل حركات الرولون (Timeline كامل)
 * يبني timeline من:
 * 1. بيانات الرولون (created_at, notes) — إنشاء
 * 2. بيانات الفاتورة والتسليم (enriched from parent component)
 * 3. جدول inventory_movements (حركات المخزون للمادة)
 * 
 * البيانات المُثرَاة مخزنة مع الرولون في الكاش
 */

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Package,
    Ship,
    ShoppingCart,
    Truck,
    RefreshCw,
    Loader2,
    DollarSign,
    CheckCircle,
    MapPin,
    Sparkles,
    Clock,
    FileText,
    User,
    Building,
} from 'lucide-react';

interface RollMovementsTabProps {
    data: any;
    language?: string;
}

// Movement type config
const movementConfig: Record<string, {
    icon: any; color: string; bg: string; labelAr: string; labelEn: string; direction?: 'in' | 'out' | 'neutral';
}> = {
    roll_created:       { icon: Sparkles,       color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30',   labelAr: '🎉 إنشاء الرولون',     labelEn: '🎉 Roll Created',      direction: 'in' },
    container_receipt:  { icon: Ship,           color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', labelAr: 'استلام من كونتينر',     labelEn: 'Container Receipt',    direction: 'in' },
    goods_receipt:      { icon: Package,        color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30',     labelAr: 'استلام بضاعة',         labelEn: 'Goods Receipt',        direction: 'in' },
    purchase_receipt:   { icon: Package,        color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30',     labelAr: 'استلام مشتريات',       labelEn: 'Purchase Receipt',     direction: 'in' },
    sale:               { icon: ShoppingCart,    color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/30',     labelAr: 'فاتورة مبيعات',        labelEn: 'Sales Invoice',        direction: 'out' },
    sale_invoice:       { icon: FileText,       color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/30',     labelAr: 'فاتورة مبيعات',        labelEn: 'Sales Invoice',        direction: 'out' },
    sales_delivery:     { icon: Truck,          color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/30',     labelAr: 'تسليم للعميل',         labelEn: 'Sales Delivery',       direction: 'out' },
    delivery:           { icon: Truck,          color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/30',     labelAr: 'تسليم',                labelEn: 'Delivery',             direction: 'out' },
    internal_transfer:  { icon: ArrowRightLeft, color: 'text-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-900/30', labelAr: 'تحويل داخلي',          labelEn: 'Internal Transfer',    direction: 'neutral' },
    transfer:           { icon: ArrowRightLeft, color: 'text-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-900/30', labelAr: 'تحويل',                labelEn: 'Transfer',             direction: 'neutral' },
    adjustment:         { icon: RefreshCw,      color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30',   labelAr: 'تعديل مخزن',           labelEn: 'Adjustment',           direction: 'neutral' },
    status_change:      { icon: RefreshCw,      color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-900/30', labelAr: 'تغيير حالة',            labelEn: 'Status Change',        direction: 'neutral' },
    sold:               { icon: DollarSign,     color: 'text-green-600',   bg: 'bg-green-100 dark:bg-green-900/30',   labelAr: 'تم البيع',              labelEn: 'Sold',                 direction: 'out' },
    delivered:          { icon: CheckCircle,    color: 'text-green-600',   bg: 'bg-green-100 dark:bg-green-900/30',   labelAr: 'تم التسليم للعميل',    labelEn: 'Delivered to Customer', direction: 'out' },
    current_state:      { icon: MapPin,         color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30',     labelAr: '📍 الحالة الحالية',     labelEn: '📍 Current State',     direction: 'neutral' },
    issue:              { icon: TrendingDown,   color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/30',     labelAr: 'صرف',                  labelEn: 'Issue',                direction: 'out' },
};

const getMovCfg = (type: string) => movementConfig[type] || {
    icon: Package, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800',
    labelAr: type, labelEn: type, direction: 'neutral' as const
};

function fmtDate(d?: string, isAr = false) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function fmtDateTime(d?: string, isAr = false) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function fmtTime(d?: string, isAr = false) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString(isAr ? 'ar-u-nu-latn' : 'en-GB', {
        hour: '2-digit', minute: '2-digit',
    });
}

export function RollMovementsTab({ data, language: langProp }: RollMovementsTabProps) {
    const { language: ctxLang } = useLanguage();
    const { companyId } = useCompany();
    const lang = langProp || ctxLang;
    const isAr = lang === 'ar';

    const [dbMovements, setDbMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const roll = data || {};

    // Fetch from inventory_movements (by material_id)
    useEffect(() => {
        if (!companyId || !roll.material_id) {
            setLoading(false);
            return;
        }

        const fetchMovements = async () => {
            setLoading(true);
            try {
                const { data: invMov } = await supabase
                    .from('inventory_movements')
                    .select(`
                        *,
                        from_warehouse:warehouses!inventory_movements_from_warehouse_id_fkey(id, name_ar, name_en),
                        to_warehouse:warehouses!inventory_movements_to_warehouse_id_fkey(id, name_ar, name_en)
                    `)
                    .eq('company_id', companyId)
                    .eq('product_id', roll.material_id)
                    .order('movement_date', { ascending: false })
                    .limit(50);

                if (invMov && invMov.length > 0) {
                    // Enrich with party names (sales refs)
                    const saleRefIds = [...new Set(invMov.map((m: any) => m.reference_id).filter(Boolean))] as string[];
                    let partyMap: Record<string, string> = {};
                    let invoiceMap: Record<string, string> = {};
                    
                    if (saleRefIds.length > 0) {
                        const { data: stx } = await supabase
                            .from('sales_transactions')
                            .select('id, customer_name, invoice_no')
                            .in('id', saleRefIds);
                        stx?.forEach((s: any) => {
                            partyMap[s.id] = s.customer_name || '';
                            invoiceMap[s.id] = s.invoice_no || '';
                        });
                    }

                    setDbMovements(invMov.map((m: any) => ({
                        ...m,
                        from_warehouse_name: m.from_warehouse?.name_ar ?? m.from_warehouse?.name_en ?? null,
                        to_warehouse_name: m.to_warehouse?.name_ar ?? m.to_warehouse?.name_en ?? null,
                        party_name: partyMap[m.reference_id] || '',
                        invoice_no: invoiceMap[m.reference_id] || '',
                    })));
                }
            } catch (e) {
                console.warn('RollMovementsTab: inventory_movements query failed', e);
            }
            setLoading(false);
        };

        fetchMovements();
    }, [companyId, roll.material_id]);

    // Build complete timeline from roll data + enriched context + DB movements
    const timeline = useMemo(() => {
        const events: any[] = [];

        // ─── 1. Roll Created — from roll.created_at ───
        if (roll.created_at) {
            const grnRef = roll.notes?.match(/GRN:\s*(\S+)/)?.[1] || '';
            events.push({
                id: 'roll-created',
                type: 'roll_created',
                date: roll.created_at,
                description: isAr
                    ? `تم إنشاء رولون ${roll.roll_number || ''} بطول ${Number(roll.initial_length || 0).toFixed(1)} م`
                    : `Roll ${roll.roll_number || ''} created — ${Number(roll.initial_length || 0).toFixed(1)} m`,
                details: grnRef ? (isAr ? `مرجع الاستلام: ${grnRef}` : `GRN Ref: ${grnRef}`) : (roll.notes || null),
                quantity: roll.initial_length,
                warehouse_name: roll.warehouse_name || roll._warehouse_name || '',
            });
        }

        // ─── 2. DB movements (from inventory_movements table) ───
        dbMovements.forEach((m) => {
            events.push({
                id: m.id,
                type: m.movement_type || 'adjustment',
                date: m.movement_date || m.created_at,
                description: m.notes || '',
                quantity: m.quantity,
                from_warehouse: m.from_warehouse_name || null,
                to_warehouse: m.to_warehouse_name || null,
                reference: m.movement_number || m.reference_number || null,
                party_name: m.party_name || null,
                invoice_no: m.invoice_no || null,
                balance_after: m.balance_after,
            });
        });

        // ─── 3. Sale event (from enriched context: _invoice_no, _customer_name) ───
        if (roll.status === 'sold' || roll.status === 'delivered' || roll._delivered) {
            const hasSaleEvent = events.some(e => 
                e.type === 'sale' || e.type === 'sale_invoice' || e.type === 'sold'
            );
            if (!hasSaleEvent && roll._invoice_no) {
                events.push({
                    id: 'roll-sale',
                    type: 'sale_invoice',
                    date: roll._sale_date || roll.updated_at || roll.created_at,
                    description: isAr
                        ? `بيع عبر فاتورة ${roll._invoice_no}`
                        : `Sold via invoice ${roll._invoice_no}`,
                    quantity: roll.current_length || roll.net_length,
                    party_name: roll._customer_name || '',
                    invoice_no: roll._invoice_no,
                    branch_name: roll._branch_name || '',
                });
            }
        }

        // ─── 4. Delivery event (from enriched context) ───
        if (roll._delivered || roll.status === 'delivered') {
            const hasDeliveryEvent = events.some(e => 
                e.type === 'delivered' || e.type === 'sales_delivery' || e.type === 'delivery'
            );
            if (!hasDeliveryEvent) {
                const deliveryMethod = roll._delivery_method;
                const methodLabel = deliveryMethod === 'branch_transfer'
                    ? (isAr ? 'توصيل عبر الفرع' : 'Branch Transfer')
                    : deliveryMethod === 'direct'
                        ? (isAr ? 'تسليم مباشر' : 'Direct Delivery')
                        : '';

                events.push({
                    id: 'roll-delivered',
                    type: 'delivered',
                    date: roll._delivery_date || roll.updated_at || new Date().toISOString(),
                    description: isAr
                        ? `تم تسليم الرولون للعميل${roll._customer_name ? ` — ${roll._customer_name}` : ''}${methodLabel ? ` (${methodLabel})` : ''}`
                        : `Delivered to customer${roll._customer_name ? ` — ${roll._customer_name}` : ''}${methodLabel ? ` (${methodLabel})` : ''}`,
                    quantity: roll.current_length || roll.net_length,
                    party_name: roll._customer_name || '',
                    invoice_no: roll._invoice_no || '',
                    branch_name: roll._branch_name || '',
                });
            }
        }

        // ─── 5. Current state (always last) ───
        events.push({
            id: 'current-state',
            type: 'current_state',
            date: new Date().toISOString(),
            description: isAr
                ? `${Number(roll.current_length || 0).toFixed(1)} م متبقي • ${Number(roll.available_length || 0).toFixed(1)} م متاح`
                : `${Number(roll.current_length || 0).toFixed(1)} m remaining • ${Number(roll.available_length || 0).toFixed(1)} m available`,
            isCurrent: true,
        });

        // Sort: oldest first (chronological), current_state always last
        events.sort((a, b) => {
            if (a.isCurrent) return 1;
            if (b.isCurrent) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        return events;
    }, [roll, dbMovements, isAr]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-500">{isAr ? 'جار التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-1">
            {/* Summary bar */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isAr
                        ? `${timeline.length - 1} حدث مسجّل في سجل الرولون`
                        : `${timeline.length - 1} events in roll history`}
                </span>
                <div className="ms-auto flex items-center gap-2">
                    {roll._invoice_no && (
                        <span className="text-xs text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full font-mono">
                            📄 {roll._invoice_no}
                        </span>
                    )}
                    <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full font-mono">
                        🧵 {roll.roll_number}
                    </span>
                </div>
            </div>

            {/* Customer info bar (if available) */}
            {roll._customer_name && (
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                        {isAr ? 'العميل:' : 'Customer:'} {roll._customer_name}
                    </span>
                    {roll._branch_name && (
                        <>
                            <span className="text-indigo-300">•</span>
                            <Building className="w-3 h-3 text-indigo-400" />
                            <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                {roll._branch_name}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Timeline */}
            {timeline.map((event, idx) => {
                const cfg = getMovCfg(event.type);
                const Icon = cfg.icon;
                const isLast = idx === timeline.length - 1;
                const isIn = cfg.direction === 'in';
                const isOut = cfg.direction === 'out';
                const qty = Number(event.quantity) || 0;

                return (
                    <div key={event.id} className="relative ps-10 pb-3">
                        {/* Circle */}
                        <div className={cn(
                            'absolute start-3 top-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950',
                            event.isCurrent ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400' : cfg.bg,
                            event.isCurrent ? 'text-blue-500' : cfg.color
                        )}>
                            {event.isCurrent ? <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> : <Icon className="w-3 h-3" />}
                        </div>
                        {/* Connecting line */}
                        {!isLast && (
                            <div className="absolute start-[22px] top-9 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
                        )}

                        {/* Event Card */}
                        <div className={cn(
                            'border rounded-lg p-3 transition-shadow',
                            event.isCurrent
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                                : event.type === 'roll_created'
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-sm'
                        )}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    {/* Type badge + invoice ref */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                                            {isAr ? cfg.labelAr : cfg.labelEn}
                                        </span>
                                        {event.invoice_no && (
                                            <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                📄 {event.invoice_no}
                                            </span>
                                        )}
                                        {event.reference && !event.invoice_no && (
                                            <span className="text-xs font-mono text-gray-400">{event.reference}</span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                                        {event.description}
                                    </div>

                                    {/* Customer name */}
                                    {event.party_name && (
                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {event.party_name}
                                        </div>
                                    )}

                                    {/* Branch */}
                                    {event.branch_name && (
                                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1">
                                            <Building className="w-3 h-3" />
                                            {event.branch_name}
                                        </div>
                                    )}

                                    {/* Warehouse info */}
                                    {(event.from_warehouse || event.to_warehouse || event.warehouse_name) && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 flex-wrap">
                                            {event.from_warehouse && (
                                                <>
                                                    <span className="font-medium">{event.from_warehouse}</span>
                                                    <span className="text-gray-300">→</span>
                                                </>
                                            )}
                                            {event.to_warehouse && (
                                                <span className="font-medium text-emerald-600">{event.to_warehouse}</span>
                                            )}
                                            {!event.from_warehouse && !event.to_warehouse && event.warehouse_name && (
                                                <span className="font-medium text-emerald-600">🏭 {event.warehouse_name}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Details/notes */}
                                    {event.details && (
                                        <div className="text-xs text-gray-400 mt-0.5 italic line-clamp-2">{event.details}</div>
                                    )}
                                </div>

                                {/* Quantity + Date (right side) */}
                                <div className="text-end flex-shrink-0">
                                    {qty > 0 && !event.isCurrent && (
                                        <div className={cn(
                                            'text-sm font-bold font-mono',
                                            isIn ? 'text-emerald-600' : isOut ? 'text-rose-600' : 'text-indigo-600'
                                        )}>
                                            {isIn ? '+' : isOut ? '-' : ''}{qty.toFixed(1)} م
                                        </div>
                                    )}
                                    {event.balance_after != null && (
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            ← {Number(event.balance_after).toFixed(1)}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5 justify-end">
                                        <Clock className="w-2.5 h-2.5" />
                                        {fmtDate(event.date, isAr)}
                                    </div>
                                    {fmtTime(event.date, isAr) && (
                                        <div className="text-[9px] text-gray-300">{fmtTime(event.date, isAr)}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default RollMovementsTab;
