/**
 * ═══════════════════════════════════════════════════════════════════
 * 🏢💰 SupplierFinanceTab — تبويب المورد والمالية المُدمج
 * ═══════════════════════════════════════════════════════════════════
 * 4 أقسام Collapsible في تبويب واحد:
 *   1. 🏢 بيانات المورد (من SupplierInfoTab)
 *   2. 📊 مسودة القيد المحاسبي (StageJournalPreview)
 *   3. 💰 المدفوعات (مستخرج من PurchasePaymentTab)
 *   4. 💸 المصاريف (من PurchaseExpensesTab)
 * 
 * ظهور الأقسام حسب المرحلة:
 *   المورد: دائماً مرئي
 *   القيد: دائماً مرئي — يتحدث لحظياً مع البنود
 *   المدفوعات: posted+
 *   المصاريف: دائماً مرئي — لتتبع المصاريف من البداية
 * ═══════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Building2,
    BookOpen,
    CreditCard,
    Receipt,
    ChevronDown,
    Loader2,
    Lock,
    Eye,
    Ship,
} from 'lucide-react';
import { SupplierInfoTab } from './SupplierInfoTab';
import { StageJournalPreview } from '../shared/StageJournalPreview';
import { PurchasePaymentTab } from './PurchasePaymentTab';
import { PurchaseExpensesTab } from './PurchaseExpensesTab';
import { ContainerInfoCard } from '../shared/ContainerInfoCard';
import { ContainerStatusStepper } from '../ContainerStatusStepper';

// ═══ Section visibility config ═══
interface SectionVisibility {
    supplier: boolean;
    supplierReadOnly: boolean;
    journal: boolean;
    payments: boolean;
    paymentsReadOnly: boolean;
    expenses: boolean;
}

function getSectionVisibility(stage: string): SectionVisibility {
    const stageOrder: Record<string, number> = {
        'draft': 0,
        'quotation': 1,
        'order': 2,
        'approved': 3,
        'invoice': 4,
        'posted': 5,
        'partial_payment': 6,
        'paid': 7,
        'cancelled': -1,
        'returned': -2,
    };
    const order = stageOrder[stage] ?? 0;

    return {
        supplier: true,
        supplierReadOnly: order >= 3, // approved+
        journal: true,               // ✅ Always show — updates live with items
        payments: order >= 5,         // posted+
        paymentsReadOnly: order >= 7, // paid = read-only
        expenses: true,              // ✅ Always show — track expenses from draft
    };
}

// ═══ Props ═══
interface SupplierFinanceTabProps {
    /** Transaction data */
    data: any;
    /** Current mode */
    mode: 'view' | 'edit' | 'create';
    /** onChange handler */
    onChange: (updates: any) => void;
    /** Current stage */
    currentStage: string;
    /** Transaction type */
    transactionType: 'purchase' | 'sale';
    /** Loading state */
    isLoading?: boolean;
    /** Company ID for fetching account defaults */
    companyId?: string;
    /** Additional className */
    className?: string;
}

// ═══ Component ═══
export const SupplierFinanceTab: React.FC<SupplierFinanceTabProps> = ({
    data,
    mode,
    onChange,
    currentStage,
    transactionType,
    isLoading = false,
    companyId,
    className,
}) => {
    const { isRTL } = useLanguage();
    const visibility = getSectionVisibility(currentStage);

    // ─── Single Source of Truth: Read totals from data (computed by TradeMainTab) ─────────
    // ⚠️ CRITICAL: Do NOT recalculate from items! TradeMainTab.handleItemsChange already
    //    computes subtotal, discount_amount, tax_amount, and grand_total from CartItemsView items.
    //    Re-computing here risks fallback to tax-inclusive values → double taxation.
    //
    //    Flow: CartItemsView → TradeMainTab.handleItemsChange → data.* → here → StageJournalPreview
    //
    //    liveTotal = NET amount (subtotal - discount), WITHOUT tax
    //    liveTax = tax amount from items
    const liveTotal = useMemo(() => {
        const subtotal = Number(data?.subtotal || 0);
        const discount = Number(data?.discount_amount || 0);
        // If subtotal is available (items have been computed), use net = subtotal - discount
        if (subtotal > 0) {
            return subtotal - discount;
        }
        // Fallback for documents without computed subtotal — use total_amount
        // (this path should rarely execute for documents with items)
        return Number(data?.total_amount || data?.grand_total || 0);
    }, [data?.subtotal, data?.discount_amount, data?.total_amount, data?.grand_total]);

    const liveTax = useMemo(() => {
        // Read directly from data.tax_amount (set by TradeMainTab.handleItemsChange)
        return Number(data?.tax_amount || 0);
    }, [data?.tax_amount]);

    // ─── Section open states ────────────────
    const [supplierOpen, setSupplierOpen] = useState(false);
    const [containerOpen, setContainerOpen] = useState(false);
    const [journalOpen, setJournalOpen] = useState(true);
    const [paymentsOpen, setPaymentsOpen] = useState(true);
    const [expensesOpen, setExpensesOpen] = useState(true);

    // ─── Effective mode per section ─────────
    const supplierMode = visibility.supplierReadOnly ? 'view' : mode;
    const paymentsMode = visibility.paymentsReadOnly ? 'view' : mode;

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
                 Section 1: بيانات المورد
                 ═══════════════════════════════════════════ */}
            {visibility.supplier && (
                <CollapsibleSection
                    open={supplierOpen}
                    onOpenChange={setSupplierOpen}
                    icon={Building2}
                    title={isRTL ? 'بيانات المورد' : 'Supplier Information'}
                    color="blue"
                    isReadOnly={visibility.supplierReadOnly}
                    isRTL={isRTL}
                    badge={
                        data?.supplier_name || data?.supplier_id
                            ? <Badge variant="secondary" className="text-[10px]">
                                {data?.supplier_name || (isRTL ? 'مُحدد' : 'Selected')}
                            </Badge>
                            : undefined
                    }
                >
                    <SupplierInfoTab
                        data={data}
                        mode={supplierMode}
                        onChange={onChange}
                    />
                </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════
                 Section 1.5: حالة الكونتينر والشحن — تفاصيل كاملة
                 ═══════════════════════════════════════════ */}
            {(data?.container_id || data?.container_number) && (
                <CollapsibleSection
                    open={containerOpen}
                    onOpenChange={setContainerOpen}
                    icon={Ship}
                    title={isRTL ? 'الكونتينر والشحن' : 'Container & Shipping'}
                    color="cyan"
                    isReadOnly={true}
                    isRTL={isRTL}
                    badge={
                        data?.container_number
                            ? <Badge variant="secondary" className="text-[10px] font-mono">
                                {data.container_number}
                            </Badge>
                            : undefined
                    }
                >
                    <div className="p-3 space-y-3">
                        {/* بطاقة الملخص */}
                        <ContainerInfoCard
                            containerId={data?.container_id}
                            containerNumber={data?.container_number}
                            containerStatus={data?.container_status}
                            onViewContainer={data?.container_id ? (id) => {
                                window.open(`/purchases/containers?id=${id}`, '_blank');
                            } : undefined}
                        />

                        {/* Stepper كامل لحالات الكونتينر */}
                        {data?.container_id && (
                            <ContainerStatusStepper
                                containerId={data.container_id}
                                currentStatus={data?.container_status || 'draft'}
                                mode="view"
                            />
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════
                 Section 2: مسودة القيد المحاسبي
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
                        supplierName={data?.supplier_name || data?.party_name || ''}
                        currency={data?.currency || ''}
                        transactionType={transactionType}
                        companyId={companyId}
                    />
                </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════
                 Section 3: المدفوعات
                 ═══════════════════════════════════════════ */}
            {visibility.payments && (
                <CollapsibleSection
                    open={paymentsOpen}
                    onOpenChange={setPaymentsOpen}
                    icon={CreditCard}
                    title={isRTL ? 'المدفوعات وسندات الصرف' : 'Payments & Vouchers'}
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
                    <PurchasePaymentTab
                        data={data}
                        mode={paymentsMode}
                        onChange={onChange}
                    />
                </CollapsibleSection>
            )}

            {/* ═══════════════════════════════════════════
                 Section 4: المصاريف الإضافية
                 ═══════════════════════════════════════════ */}
            {visibility.expenses && (
                <CollapsibleSection
                    open={expensesOpen}
                    onOpenChange={setExpensesOpen}
                    icon={Receipt}
                    title={isRTL ? 'المصاريف الإضافية' : 'Additional Expenses'}
                    color="amber"
                    isReadOnly={mode === 'view'}
                    isRTL={isRTL}
                    badge={
                        data?.expenses?.length > 0
                            ? <Badge variant="secondary" className="text-[10px]">
                                {data.expenses.length} {isRTL ? 'مصروف' : 'expenses'}
                            </Badge>
                            : undefined
                    }
                >
                    <PurchaseExpensesTab
                        data={data}
                        mode={mode}
                        onChange={onChange}
                    />
                </CollapsibleSection>
            )}

            {/* ═══ Hidden sections notice ═══ */}
            {(!visibility.journal || !visibility.payments || !visibility.expenses) && (
                <div className="px-3 py-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center flex items-center justify-center gap-1.5">
                        <Eye className="w-3 h-3" />
                        {isRTL
                            ? 'بعض الأقسام ستظهر عند التقدم في دورة المشتريات'
                            : 'Some sections will appear as the purchase cycle progresses'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// CollapsibleSection — Sub-component
// ═══════════════════════════════════════════════════════════════

const SECTION_COLORS: Record<string, { header: string; icon: string; border: string }> = {
    blue: {
        header: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10',
        icon: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-100 dark:border-blue-800/40',
    },
    cyan: {
        header: 'from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/10',
        icon: 'text-cyan-600 dark:text-cyan-400',
        border: 'border-cyan-100 dark:border-cyan-800/40',
    },
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
    amber: {
        header: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10',
        icon: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-100 dark:border-amber-800/40',
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
    const colors = SECTION_COLORS[color] || SECTION_COLORS.blue;

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

export default SupplierFinanceTab;
