import React, { useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Users, Building, Hash, Layers, UserCircle2, Coins, ArrowRightLeft, CalendarClock, Globe2, Truck, HelpCircle, Package, Warehouse, Store, ShoppingCart, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ar } from 'date-fns/locale';
import { CURRENCY_META } from '@/hooks/useCompanyCurrency';

/** Inline help tooltip component */
const HelpTip: React.FC<{ ar: string; en: string; isAr: boolean }> = ({ ar: arText, en: enText, isAr }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200/80 dark:bg-gray-700 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors ms-1" tabIndex={-1}>
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                <p>{isAr ? arText : enText}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

interface TradeHeaderProps {
    data: any; // Flexible — handles both TradeDocument and raw Supabase data
    mode: 'purchase' | 'sales' | 'transfer';
    type: string;
    onChange: (field: string, value: any) => void;
    partyList: { id: string, name: string }[];
    warehouseList: { id: string, name: string }[];
    salespersonList?: { id: string, name: string }[];
    /** Company base currency code, e.g. 'UAH' */
    baseCurrency?: string;
    /** Currencies supported by the company (from accounting settings) */
    supportedCurrencies?: string[];
    /** Exchange rate lookup function */
    onCurrencyChange?: (currency: string, exchangeRate: number) => void;
    /** Document view mode — when 'view', all fields are readonly */
    viewMode?: 'view' | 'edit' | 'create';
}

export const TradeHeader: React.FC<TradeHeaderProps> = ({
    data,
    mode,
    onChange,
    partyList,
    warehouseList,
    salespersonList = [],
    baseCurrency = '',
    supportedCurrencies,
    onCurrencyChange,
    viewMode = 'edit',
}) => {
    const isReadOnly = viewMode === 'view';
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';
    const isCreate = !data.id; // Check if creating new document

    // Set Default Date only if creating
    useEffect(() => {
        if (isCreate && !data.date) {
            onChange('date', new Date().toISOString());
        }
    }, [isCreate, data.date, onChange]);

    // ─── Detect multi-warehouse from items ───
    const warehouseInfo = useMemo(() => {
        const items = data.items || [];
        if (items.length === 0) return { isMulti: false, ids: new Set<string>() };

        const ids = new Set<string>();
        items.forEach((item: any) => {
            if (item.warehouse_id) ids.add(item.warehouse_id);
        });

        return {
            isMulti: ids.size > 1,
            ids,
            singleId: ids.size === 1 ? Array.from(ids)[0] : undefined,
        };
    }, [data.items]);

    // ─── Lock warehouse when items exist ───
    const hasItems = (data.items || []).length > 0;
    const isWarehouseLocked = hasItems && !isReadOnly;

    // ─── Filtered currencies based on company settings ───
    const filteredCurrencies = useMemo(() => {
        // If supportedCurrencies provided, filter CURRENCY_META to only those
        // Always include baseCurrency even if not in the list
        if (supportedCurrencies && supportedCurrencies.length > 0) {
            const allowed = new Set(supportedCurrencies);
            if (baseCurrency) allowed.add(baseCurrency);
            return Object.entries(CURRENCY_META).filter(([code]) => allowed.has(code));
        }
        // Fallback: if baseCurrency is set, show baseCurrency + USD + EUR
        if (baseCurrency) {
            const defaults = new Set([baseCurrency, 'USD', 'EUR']);
            return Object.entries(CURRENCY_META).filter(([code]) => defaults.has(code));
        }
        // Last resort: show all
        return Object.entries(CURRENCY_META);
    }, [supportedCurrencies, baseCurrency]);

    // ─── Smart currency resolution for receipt mode ───
    const resolveInternationalCurrency = useMemo(() => {
        const available = filteredCurrencies.map(([code]) => code);
        if (available.includes('USD')) return 'USD';
        if (available.includes('EUR')) return 'EUR';
        return baseCurrency || 'USD';
    }, [filteredCurrencies, baseCurrency]);

    const handleReceiptModeChange = (newMode: 'direct' | 'international') => {
        // Guard: prevent changing from international to direct if linked to a shipment
        if (newMode === 'direct' && data.shipment_id) {
            // Cannot switch to local if already linked to a container/shipment
            return;
        }

        onChange('receipt_mode', newMode);

        // Auto-set currency based on receipt mode
        const targetCurrency = newMode === 'international'
            ? resolveInternationalCurrency
            : (baseCurrency || data.currency);

        if (targetCurrency && targetCurrency !== data.currency) {
            onChange('currency', targetCurrency);
            if (onCurrencyChange) {
                onCurrencyChange(targetCurrency, 1);
            }
        }
    };

    const isTransfer = mode === 'transfer';
    const partyLabel = isTransfer
        ? (isAr ? 'إلى المستودع' : 'To Warehouse')
        : mode === 'purchase' ? (isAr ? 'المورد' : 'Supplier') : (isAr ? 'العميل' : 'Customer');
    const refLabel = isAr ? 'الرقم المرجعي' : 'Reference #';
    const dateLabel = isAr ? 'التاريخ' : 'Date';
    const warehouseLabel = isTransfer
        ? (isAr ? 'من المستودع' : 'From Warehouse')
        : (isAr ? 'المستودع' : 'Warehouse');

    // Resolve current party_id (works for both party_id and customer_id/supplier_id)
    const currentPartyId = data.party_id || data.customer_id || (data as any).supplier_id || '';

    // Resolve current warehouse_id (from data or detected from items)
    const currentWarehouseId = data.warehouse_id || warehouseInfo.singleId || '';

    // Handle party change — sync both party_id and customer_id/supplier_id
    const handlePartyChange = (val: string) => {
        onChange('party_id', val);
        if (mode === 'sales') {
            onChange('customer_id', val);
        } else {
            onChange('supplier_id' as any, val);
        }
    };

    return (
        <Card className="border-none shadow-sm bg-gray-50/50 dark:bg-gray-900/50 mb-4" dir={direction}>
            <CardContent className={cn("p-4 grid grid-cols-1 gap-4 items-end", isTransfer ? 'md:grid-cols-4' : mode === 'sales' ? 'md:grid-cols-5' : 'md:grid-cols-4')}>

                {/* 1. Party Selection (Customer/Supplier) OR Transfer: To Warehouse */}
                <div className="space-y-2 md:col-span-1">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        {isTransfer ? <Warehouse className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                        {partyLabel}
                    </Label>
                    {isTransfer ? (
                        /* Transfer mode: "To Warehouse" selector */
                        <Select
                            value={data.to_warehouse_id || ''}
                            onValueChange={(val) => {
                                onChange('to_warehouse_id', val);
                                // Find warehouse name for display
                                const wh = warehouseList.find(w => w.id === val);
                                if (wh) {
                                    onChange('party_name', wh.name);
                                }
                            }}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger className={cn("h-10 bg-white dark:bg-gray-800 text-start", isReadOnly && "opacity-70 cursor-default")}>
                                <SelectValue placeholder={isAr ? 'اختر المستودع المستلم...' : 'Select destination warehouse...'} />
                            </SelectTrigger>
                            <SelectContent align={isAr ? "end" : "start"}>
                                {warehouseList
                                    .filter(w => w.id !== (data.warehouse_id || currentWarehouseId)) // Exclude "from" warehouse
                                    .map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Select
                            value={currentPartyId}
                            onValueChange={handlePartyChange}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger className={cn("h-10 bg-white dark:bg-gray-800 text-start", isReadOnly && "opacity-70 cursor-default")}>
                                <SelectValue placeholder={isAr ? `اختر ${partyLabel}...` : `Select ${partyLabel}...`} />
                            </SelectTrigger>
                            <SelectContent align={isAr ? "end" : "start"}>
                                {partyList.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* 2. Warehouse Selection — Transfer: "From Warehouse", others: regular Warehouse */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {warehouseLabel}
                        {mode === 'purchase' && (
                            <HelpTip
                                isAr={isAr}
                                ar="المستودع الذي ستُستلم فيه البضائع. في المشتريات المحلية، يُحدد أمين المستودع المسؤول عن الاستلام"
                                en="The warehouse where goods will be received. For direct purchases, this determines which warehouse keeper handles the receipt"
                            />
                        )}
                        {isTransfer && (
                            <HelpTip
                                isAr={isAr}
                                ar="المستودع الذي سيتم نقل المواد منه. سيظهر طلب المناقلة لأمين هذا المستودع لتجهيز البضائع"
                                en="The warehouse to transfer materials FROM. The transfer request will appear to this warehouse keeper for preparation"
                            />
                        )}
                    </Label>
                    {warehouseInfo.isMulti ? (
                        /* Multi-warehouse indicator */
                        <div className="h-10 flex items-center gap-2 px-3 rounded-md border border-dashed border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-700">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {isAr ? `متعدد المستودعات (${warehouseInfo.ids.size})` : `Multiple (${warehouseInfo.ids.size} warehouses)`}
                            </span>
                        </div>
                    ) : (
                        <Select
                            value={currentWarehouseId}
                            onValueChange={(val) => {
                                onChange('warehouse_id', val);
                                if (isTransfer) {
                                    onChange('from_warehouse_id', val);
                                }
                            }}
                            disabled={isReadOnly || isWarehouseLocked}
                        >
                            <SelectTrigger className={cn("h-10 bg-white dark:bg-gray-800 text-start", (isReadOnly || isWarehouseLocked) && "opacity-70 cursor-default")}>
                                <div className="flex items-center gap-1.5 w-full">
                                    {isWarehouseLocked && <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                    <SelectValue placeholder={isAr ? (isTransfer ? 'اختر المستودع المرسل...' : 'اختر المستودع...') : (isTransfer ? 'Select source warehouse...' : 'Select Warehouse...')} />
                                </div>
                            </SelectTrigger>
                            <SelectContent align={isAr ? "end" : "start"}>
                                {warehouseList
                                    .filter(w => isTransfer ? w.id !== data.to_warehouse_id : true) // In transfer, exclude "to" warehouse
                                    .map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* 3. Date Picker (Shadcn Style) */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {dateLabel}
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full h-10 justify-start text-left font-normal bg-white dark:bg-gray-800",
                                    !data.date && "text-muted-foreground",
                                    isReadOnly && "opacity-70 cursor-default"
                                )}
                            >
                                <CalendarIcon className={cn("mr-2 h-4 w-4", isAr && "ml-2 mr-0")} />
                                {data.date ? format(new Date(data.date), "PPP", { locale: isAr ? ar : undefined }) : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={data.date ? new Date(data.date) : undefined}
                                onSelect={(d) => onChange('date', d?.toISOString())}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 4. Salesperson (Sales mode only, NOT transfer) */}
                {mode === 'sales' && (
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <UserCircle2 className="w-3.5 h-3.5" />
                            {isAr ? 'المندوب' : 'Salesperson'}
                        </Label>
                        <Select
                            value={data.salesperson_id || ''}
                            onValueChange={(val) => onChange('salesperson_id', val)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger className={cn("h-10 bg-white dark:bg-gray-800 text-start", isReadOnly && "opacity-70 cursor-default")}>
                                <SelectValue placeholder={isAr ? 'اختر المندوب...' : 'Select Salesperson...'} />
                            </SelectTrigger>
                            <SelectContent align={isAr ? 'end' : 'start'}>
                                {salespersonList.map((sp) => (
                                    <SelectItem key={sp.id} value={sp.id}>
                                        {sp.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* 5. Reference Number (Disabled on Create) */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        {refLabel}
                    </Label>
                    <Input
                        value={data.reference_number || ''}
                        onChange={(e) => onChange('reference_number', e.target.value)}
                        className={cn("h-10 font-mono bg-white dark:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400", isReadOnly && "opacity-70")}
                        placeholder={isCreate ? "AUTO-GEN" : ""}
                        disabled={isCreate || isReadOnly}
                        readOnly={isReadOnly}
                        dir="ltr"
                    />
                </div>

            </CardContent>

            {/* ═══ Row 2: Currency + Exchange Rate + Due Date + Receipt Mode (NOT for transfers) ═══ */}
            {
                !isTransfer && (
                    <CardContent className="px-4 pb-4 pt-0">
                        <div className={cn("grid grid-cols-1 gap-4 items-end", mode === 'purchase' ? 'md:grid-cols-4' : 'md:grid-cols-3')}>

                            {/* Currency Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                    <Coins className="w-3.5 h-3.5" />
                                    {isAr ? 'العملة' : 'Currency'}
                                    <HelpTip
                                        isAr={isAr}
                                        ar="عملة الفاتورة. إذا كانت مختلفة عن العملة الأساسية للشركة، سيتم تفعيل سعر الصرف تلقائياً"
                                        en="Invoice currency. If different from company base currency, exchange rate will be enabled automatically"
                                    />
                                </Label>
                                <Select
                                    value={data.currency || baseCurrency || ''}
                                    onValueChange={(val) => {
                                        onChange('currency', val);
                                        if (onCurrencyChange) {
                                            // Let the parent handle exchange rate lookup
                                            onCurrencyChange(val, 1);
                                        }
                                    }}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
                                        <SelectValue placeholder={isAr ? 'اختر العملة...' : 'Select currency...'} />
                                    </SelectTrigger>
                                    <SelectContent align={isAr ? 'end' : 'start'}>
                                        {filteredCurrencies.map(([code, meta]) => (
                                            <SelectItem key={code} value={code}>
                                                <span className="flex items-center gap-2">
                                                    <span>{meta.flag}</span>
                                                    <span className="font-mono text-xs">{code}</span>
                                                    <span className="text-gray-400">-</span>
                                                    <span className="text-xs">{isAr ? meta.nameAr : meta.nameEn}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Exchange Rate */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    {isAr ? 'سعر الصرف' : 'Exchange Rate'}
                                    <HelpTip
                                        isAr={isAr}
                                        ar="سعر صرف عملة الفاتورة مقابل العملة الأساسية للشركة. يُستخدم لحساب المبالغ في التقارير المحاسبية"
                                        en="Exchange rate of invoice currency against company base currency. Used for accounting report calculations"
                                    />
                                    {data.currency && baseCurrency && data.currency !== baseCurrency && (
                                        <span className="text-[9px] font-normal text-gray-400 ms-1">
                                            1 {data.currency} = ? {baseCurrency}
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={data.exchange_rate ?? 1}
                                    onChange={(e) => onChange('exchange_rate', parseFloat(e.target.value) || 1)}
                                    className={cn(
                                        "h-10 font-mono bg-white dark:bg-gray-800",
                                        (!data.currency || data.currency === baseCurrency || isReadOnly) && "opacity-50"
                                    )}
                                    disabled={!data.currency || data.currency === baseCurrency || isReadOnly}
                                    readOnly={isReadOnly}
                                    dir="ltr"
                                />
                            </div>

                            {/* Due Date */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                                    <HelpTip
                                        isAr={isAr}
                                        ar="تاريخ استحقاق الدفع. يُحسب تلقائياً من شروط الدفع إن وُجدت، أو يُحدد يدوياً"
                                        en="Payment due date. Automatically calculated from payment terms if set, or can be set manually"
                                    />
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            disabled={isReadOnly}
                                            className={cn(
                                                "w-full h-10 justify-start text-left font-normal bg-white dark:bg-gray-800",
                                                !data.due_date && "text-muted-foreground",
                                                isReadOnly && "opacity-70 cursor-default"
                                            )}
                                        >
                                            <CalendarClock className={cn("mr-2 h-4 w-4 text-orange-500", isAr && "ml-2 mr-0")} />
                                            {data.due_date
                                                ? format(new Date(data.due_date), "PPP", { locale: isAr ? ar : undefined })
                                                : <span className="text-xs">{isAr ? 'تحدد تلقائياً...' : 'Auto from terms...'}</span>
                                            }
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={data.due_date ? new Date(data.due_date) : undefined}
                                            onSelect={(d) => onChange('due_date', d?.toISOString())}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Receipt Mode Toggle (Purchase only) */}
                            {mode === 'purchase' && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                        <Globe2 className="w-3.5 h-3.5" />
                                        {isAr ? 'نوع الشراء' : 'Purchase Type'}
                                        <HelpTip
                                            isAr={isAr}
                                            ar="محلي: مشتريات داخلية تظهر لأمين المستودع للاستلام المباشر. دولي: مشتريات خارجية تُضاف إلى كونتينر شحن وتُستلم عند وصوله"
                                            en="Direct: Local purchases visible to warehouse keeper for immediate receipt. International: Imports added to shipping containers and received upon arrival"
                                        />
                                    </Label>
                                    <div className={cn(
                                        "h-10 flex items-center rounded-md border overflow-hidden",
                                        isReadOnly && "opacity-70"
                                    )}>
                                        <button
                                            type="button"
                                            disabled={isReadOnly || (data.receipt_mode === 'international' && data.shipment_id)}
                                            onClick={() => handleReceiptModeChange('direct')}
                                            className={cn(
                                                "flex-1 h-full flex items-center justify-center gap-1.5 text-xs font-medium transition-all",
                                                (data.receipt_mode || 'direct') === 'direct'
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50",
                                                (data.receipt_mode === 'international' && data.shipment_id) && "opacity-40 cursor-not-allowed"
                                            )}
                                            title={data.shipment_id ? (isAr ? 'مرتبطة بكونتينر - لا يمكن التبديل' : 'Linked to container - cannot switch') : ''}
                                        >
                                            <Truck className="w-3.5 h-3.5" />
                                            {isAr ? 'محلي' : 'Direct'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => handleReceiptModeChange('international')}
                                            className={cn(
                                                "flex-1 h-full flex items-center justify-center gap-1.5 text-xs font-medium transition-all",
                                                data.receipt_mode === 'international'
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"
                                            )}
                                        >
                                            <Globe2 className="w-3.5 h-3.5" />
                                            {isAr ? 'دولي' : 'International'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 🏪 Sales Mode Toggle (Sales only) — POS vs Workflow */}
                            {mode === 'sales' && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                        <Store className="w-3.5 h-3.5" />
                                        {isAr ? 'نوع البيع' : 'Sales Type'}
                                        <HelpTip
                                            isAr={isAr}
                                            ar="نقطة بيع: بيع مباشر مع خصم فوري من المخزون والدفع الفوري. سير عمل: دورة بيع كاملة (عرض سعر ← طلب ← تسليم ← فاتورة)"
                                            en="POS: Direct sale with immediate stock deduction and instant payment. Workflow: Full sales cycle (quotation → order → delivery → invoice)"
                                        />
                                    </Label>
                                    <div className={cn(
                                        "h-10 flex items-center rounded-md border overflow-hidden",
                                        isReadOnly && "opacity-70"
                                    )}>
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                onChange('is_pos', false);
                                            }}
                                            className={cn(
                                                "flex-1 h-full flex items-center justify-center gap-1.5 text-xs font-medium transition-all",
                                                !data.is_pos
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"
                                            )}
                                        >
                                            <ShoppingCart className="w-3.5 h-3.5" />
                                            {isAr ? 'سير العمل' : 'Workflow'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                onChange('is_pos', true);
                                                // POS always updates stock directly
                                                if (!data.auto_update_stock) {
                                                    onChange('auto_update_stock', true);
                                                }
                                            }}
                                            className={cn(
                                                "flex-1 h-full flex items-center justify-center gap-1.5 text-xs font-medium transition-all",
                                                data.is_pos
                                                    ? "bg-amber-500 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"
                                            )}
                                        >
                                            <Store className="w-3.5 h-3.5" />
                                            {isAr ? 'نقطة بيع' : 'POS'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 🌍 International Tax Notice */}
                            {mode === 'purchase' && data.receipt_mode === 'international' && (
                                <div className="md:col-span-4 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/60 text-xs">
                                    <Globe2 className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span className="text-amber-700 dark:text-amber-300">
                                        {isAr
                                            ? '🌍 شراء دولي — الضريبة = 0% على الفاتورة. تُحسب وتُوزع لاحقاً ضمن تكاليف الكونتينر والتخليص الجمركي.'
                                            : '🌍 International purchase — Tax = 0% on invoice. Tax is calculated and distributed later via container & customs costs.'}
                                    </span>
                                </div>
                            )}

                            {/* 📦 Direct Stock Update — تحديث المخزون المباشر */}
                            {/* Shows for: local purchases, all sales (not international purchases) */}
                            {!(mode === 'purchase' && data.receipt_mode === 'international') && (
                                <div className={cn(
                                    "flex items-center gap-4 px-3 py-2.5 rounded-lg border transition-all",
                                    data.auto_update_stock
                                        ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/60"
                                        : "border-gray-200 bg-gray-50/40 dark:bg-gray-800/30 dark:border-gray-700",
                                    mode === 'sales' ? 'md:col-span-5' : 'md:col-span-4'
                                )}>
                                    {/* Checkbox */}
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="auto-update-stock"
                                            checked={data.auto_update_stock || false}
                                            onCheckedChange={(checked) => onChange('auto_update_stock', !!checked)}
                                            disabled={isReadOnly}
                                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                        />
                                        <label
                                            htmlFor="auto-update-stock"
                                            className={cn(
                                                "text-xs font-medium cursor-pointer select-none flex items-center gap-1.5",
                                                data.auto_update_stock
                                                    ? "text-emerald-700 dark:text-emerald-300"
                                                    : "text-gray-500 dark:text-gray-400"
                                            )}
                                        >
                                            <Package className="w-3.5 h-3.5" />
                                            {isAr ? 'تحديث المخزون مباشرة عند الترحيل' : 'Update stock directly on posting'}
                                        </label>
                                        <HelpTip
                                            isAr={isAr}
                                            ar="عند التفعيل: يتم تحديث المخزون تلقائياً عند ترحيل الفاتورة بدون الحاجة لإذن استلام أو تسليم منفصل. يستخدم المستودع المحدد أعلاه. مناسب للشركات الصغيرة ونقاط البيع."
                                            en="When enabled: inventory is updated automatically upon posting, without needing a separate goods receipt or delivery note. Uses the warehouse selected above. Ideal for small businesses and POS."
                                        />
                                    </div>

                                    {/* Note: uses warehouse from header */}
                                    {data.auto_update_stock && currentWarehouseId && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                            <Warehouse className="w-3 h-3" />
                                            <span>
                                                {isAr ? '← سيُحدّث في المستودع المحدد أعلاه' : '← Will update stock in warehouse selected above'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </CardContent>
                )
            }
        </Card >
    );
};
