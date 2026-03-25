/**
 * ═══════════════════════════════════════════════════════════════════
 * 💳🚚 SalesFinanceTab — تبويب المالية والتوصيل المُدمج للمبيعات
 * ═══════════════════════════════════════════════════════════════════
 * 3 أقسام Collapsible في تبويب واحد:
 *   1. 📊 القيد المحاسبي (Journal Entry Preview)
 *   2. 💳 المدفوعات والمقبوضات (PaymentReceiptTab)
 *   3. 🚚 التوصيل والشحن (CustomerShippingTab)
 * ═══════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    BookOpen,
    CreditCard,
    Truck,
    ChevronDown,
    Loader2,
    Lock,
} from 'lucide-react';
import { StageJournalPreview } from '../shared/StageJournalPreview';
import { PaymentReceiptTab } from './PaymentReceiptTab';
import { CustomerShippingTab } from './CustomerShippingTab';

// ═══ Section visibility config ═══
interface SectionVisibility {
    journal: boolean;
    payments: boolean;
    paymentsReadOnly: boolean;
    shipping: boolean;
    shippingReadOnly: boolean;
}

function getSectionVisibility(stage: string): SectionVisibility {
    const stageOrder: Record<string, number> = {
        'draft': 0,
        'quotation': 1,
        'reservation': 1,
        'order': 2,
        'confirmed': 3,
        'delivery': 3,
        'in_delivery': 3,
        'delivered': 4,
        'invoice': 4,
        'posted': 5,
        'partial_paid': 6,
        'paid': 7,
        'cancelled': -1,
        'returned': -2,
    };
    const order = stageOrder[stage] ?? 0;

    return {
        journal: true,                   // Always visible
        payments: true,                  // Always visible
        paymentsReadOnly: order >= 7,    // paid = read-only
        shipping: true,                  // Always visible
        shippingReadOnly: order >= 5,    // posted+ = read-only
    };
}

// ═══ Props ═══
interface SalesFinanceTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
    currentStage: string;
    transactionType: 'purchase' | 'sale';
    isLoading?: boolean;
    companyId?: string;
    className?: string;
}

// ═══ Component ═══
export const SalesFinanceTab: React.FC<SalesFinanceTabProps> = ({
    data,
    mode,
    onChange,
    currentStage,
    transactionType,
    isLoading = false,
    companyId,
    className,
}) => {
    const { isRTL, language } = useLanguage();
    const visibility = getSectionVisibility(currentStage);

    // ─── Totals from data ─────────────────────
    const liveTotal = useMemo(() => {
        const subtotal = Number(data?.subtotal || 0);
        const discount = Number(data?.discount_amount || 0);
        if (subtotal > 0) return subtotal - discount;
        return Number(data?.total_amount || data?.grand_total || 0);
    }, [data?.subtotal, data?.discount_amount, data?.total_amount, data?.grand_total]);

    const liveTax = useMemo(() => {
        return Number(data?.tax_amount || 0);
    }, [data?.tax_amount]);

    // ─── Section open states ────────────────
    // View mode: all closed. Edit mode: shipping + journal open
    const isEditMode = mode === 'edit' || mode === 'create';
    const [shippingOpen, setShippingOpen] = useState(isEditMode);
    const [paymentsOpen, setPaymentsOpen] = useState(false);
    const [journalOpen, setJournalOpen] = useState(isEditMode);

    // ─── Effective mode per section ─────────
    const paymentsMode = visibility.paymentsReadOnly ? 'view' : mode;
    const shippingMode = visibility.shippingReadOnly ? 'view' : mode;

    // ─── Loading ────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)} dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══════════════════════════════════════════
                 Section 1: التوصيل والشحن
                 ═══════════════════════════════════════════ */}
            {visibility.shipping && (
                <CollapsibleSection
                    open={shippingOpen}
                    onOpenChange={setShippingOpen}
                    icon={Truck}
                    title={isRTL ? 'التوصيل والشحن' : 'Shipping & Delivery'}
                    color="orange"
                    isReadOnly={visibility.shippingReadOnly}
                    isRTL={isRTL}
                    badge={
                        data?.delivery_method
                            ? <Badge variant="secondary" className="text-[10px]">
                                {data.delivery_method === 'store_pickup'
                                    ? (isRTL ? 'تسليم عبر الفرع' : 'Branch Delivery')
                                    : data.delivery_method === 'direct_delivery'
                                        ? (isRTL ? 'توصيل للعميل' : 'Customer Delivery')
                                        : data.delivery_method === 'direct_pickup'
                                            ? (isRTL ? 'تسليم مباشر' : 'Direct Pickup')
                                            : (isRTL ? 'شحن' : 'Shipping')
                                }
                            </Badge>
                            : undefined
                    }
                >
                    <CustomerShippingTab
                        data={data}
                        mode={shippingMode}
                        onChange={onChange}
                    />
                </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════
                 Section 2: المدفوعات والمقبوضات
                 ═══════════════════════════════════════════ */}
            {visibility.payments && (
                <CollapsibleSection
                    open={paymentsOpen}
                    onOpenChange={setPaymentsOpen}
                    icon={CreditCard}
                    title={isRTL ? 'المدفوعات والمقبوضات' : 'Payments & Receipts'}
                    color="teal"
                    isReadOnly={visibility.paymentsReadOnly}
                    isRTL={isRTL}
                    badge={
                        data?.paid_amount > 0
                            ? <Badge className={cn(
                                "text-[10px]",
                                data.paid_amount >= (data.total_amount || data.grand_total || 0)
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                            )}>
                                {data.paid_amount >= (data.total_amount || data.grand_total || 0)
                                    ? (isRTL ? 'مدفوع بالكامل' : 'Fully Paid')
                                    : (isRTL ? 'مدفوع جزئياً' : 'Partial')
                                }
                            </Badge>
                            : undefined
                    }
                >
                    <PaymentReceiptTab
                        data={data}
                        mode={paymentsMode}
                        onChange={onChange}
                    />
                </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════
                 Section 3: القيد المحاسبي
                 ═══════════════════════════════════════════ */}
            {visibility.journal && (
                <CollapsibleSection
                    open={journalOpen}
                    onOpenChange={setJournalOpen}
                    icon={BookOpen}
                    title={isRTL ? 'القيد المحاسبي' : 'Journal Entry'}
                    color="purple"
                    isReadOnly={true}
                    isRTL={isRTL}
                    badge={
                        data?.journal_entry_id
                            ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 text-[10px]">
                                {isRTL ? 'مُرحّل' : 'Posted'}
                            </Badge>
                            : data?.is_posted || currentStage === 'posted'
                                ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 text-[10px]">
                                    {isRTL ? 'مُرحّل' : 'Posted'}
                                </Badge>
                                : <Badge variant="outline" className="text-[10px]">
                                    {isRTL ? 'مسودة' : 'Draft'}
                                </Badge>
                    }
                >
                    <StageJournalPreview
                        stage={currentStage}
                        totalAmount={liveTotal}
                        taxAmount={liveTax}
                        discountAmount={Number(data?.discount_amount || 0)}
                        supplierName={data?.customer_name || data?.party_name || ''}
                        currency={data?.currency || ''}
                        transactionType={transactionType}
                        companyId={companyId}
                        journalEntryId={data?.journal_entry_id}
                        cogsJournalEntryId={data?.cogs_journal_entry_id}
                        partyId={data?.customer_id || data?.supplier_id || data?.party_id}
                    />
                </CollapsibleSection>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// CollapsibleSection — Sub-component
// ═══════════════════════════════════════════════════════════════

const SECTION_COLORS: Record<string, { header: string; icon: string; border: string }> = {
    purple: {
        header: 'from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/10',
        icon: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-100 dark:border-purple-800/40',
    },
    teal: {
        header: 'from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/10',
        icon: 'text-teal-600 dark:text-teal-400',
        border: 'border-teal-100 dark:border-teal-800/40',
    },
    orange: {
        header: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10',
        icon: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-100 dark:border-orange-800/40',
    },
};

interface CollapsibleSectionProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    icon: React.ElementType;
    title: string;
    color: keyof typeof SECTION_COLORS;
    isReadOnly: boolean;
    isRTL: boolean;
    badge?: React.ReactNode;
    children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    open,
    onOpenChange,
    icon: Icon,
    title,
    color,
    isReadOnly,
    isRTL,
    badge,
    children,
}) => {
    const colors = SECTION_COLORS[color] || SECTION_COLORS.purple;

    return (
        <Collapsible open={open} onOpenChange={onOpenChange}>
            <Card className={cn("shadow-sm overflow-hidden transition-all", colors.border)}>
                <CollapsibleTrigger asChild>
                    <button
                        className={cn(
                            "w-full px-4 py-3 flex items-center gap-3 cursor-pointer",
                            "bg-gradient-to-r transition-colors hover:brightness-95",
                            colors.header,
                            isRTL && "flex-row-reverse"
                        )}
                    >
                        <Icon className={cn("w-4 h-4 shrink-0", colors.icon)} />
                        <span className={cn(
                            "text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1",
                            isRTL ? "text-right" : "text-left"
                        )}>
                            {title}
                        </span>

                        {/* Badges */}
                        <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                            {isReadOnly && (
                                <Lock className="w-3 h-3 text-gray-400" />
                            )}
                            {badge}
                        </div>

                        <ChevronDown className={cn(
                            "w-4 h-4 text-gray-400 transition-transform duration-200",
                            open && "rotate-180"
                        )} />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-0">
                        {children}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
};

export default SalesFinanceTab;
