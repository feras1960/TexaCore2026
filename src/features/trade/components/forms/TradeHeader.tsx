import React, { useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Users, Building, Hash, Layers, UserCircle2, Coins, ArrowRightLeft, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ar } from 'date-fns/locale';
import { CURRENCY_META } from '@/hooks/useCompanyCurrency';

interface TradeHeaderProps {
    data: any; // Flexible — handles both TradeDocument and raw Supabase data
    mode: 'purchase' | 'sales';
    type: string;
    onChange: (field: string, value: any) => void;
    partyList: { id: string, name: string }[];
    warehouseList: { id: string, name: string }[];
    salespersonList?: { id: string, name: string }[];
    /** Company base currency code, e.g. 'UAH' */
    baseCurrency?: string;
    /** Exchange rate lookup function */
    onCurrencyChange?: (currency: string, exchangeRate: number) => void;
}

export const TradeHeader: React.FC<TradeHeaderProps> = ({
    data,
    mode,
    onChange,
    partyList,
    warehouseList,
    salespersonList = [],
    baseCurrency = '',
    onCurrencyChange,
}) => {
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

    const partyLabel = mode === 'purchase' ? (isAr ? 'المورد' : 'Supplier') : (isAr ? 'العميل' : 'Customer');
    const refLabel = isAr ? 'الرقم المرجعي' : 'Reference #';
    const dateLabel = isAr ? 'التاريخ' : 'Date';
    const warehouseLabel = isAr ? 'المستودع' : 'Warehouse';

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
            <CardContent className={cn("p-4 grid grid-cols-1 gap-4 items-end", mode === 'sales' ? 'md:grid-cols-5' : 'md:grid-cols-4')}>

                {/* 1. Party Selection (Customer/Supplier) */}
                <div className="space-y-2 md:col-span-1">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {partyLabel}
                    </Label>
                    <Select
                        value={currentPartyId}
                        onValueChange={handlePartyChange}
                    >
                        <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
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
                </div>

                {/* 2. Warehouse Selection — shows multi-warehouse badge if items span multiple warehouses */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {warehouseLabel}
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
                            onValueChange={(val) => onChange('warehouse_id', val)}
                        >
                            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
                                <SelectValue placeholder={isAr ? 'اختر المستودع...' : 'Select Warehouse...'} />
                            </SelectTrigger>
                            <SelectContent align={isAr ? "end" : "start"}>
                                {warehouseList.map((w) => (
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
                                className={cn(
                                    "w-full h-10 justify-start text-left font-normal bg-white dark:bg-gray-800",
                                    !data.date && "text-muted-foreground"
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

                {/* 4. Salesperson (Sales mode only) */}
                {mode === 'sales' && (
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <UserCircle2 className="w-3.5 h-3.5" />
                            {isAr ? 'المندوب' : 'Salesperson'}
                        </Label>
                        <Select
                            value={data.salesperson_id || ''}
                            onValueChange={(val) => onChange('salesperson_id', val)}
                        >
                            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
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
                        className="h-10 font-mono bg-white dark:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder={isCreate ? "AUTO-GEN" : ""}
                        disabled={isCreate}
                        dir="ltr"
                    />
                </div>

            </CardContent>

            {/* ═══ Row 2: Currency + Exchange Rate + Due Date ═══ */}
            <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

                    {/* Currency Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            {isAr ? 'العملة' : 'Currency'}
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
                        >
                            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 text-start">
                                <SelectValue placeholder={isAr ? 'اختر العملة...' : 'Select currency...'} />
                            </SelectTrigger>
                            <SelectContent align={isAr ? 'end' : 'start'}>
                                {Object.entries(CURRENCY_META).map(([code, meta]) => (
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
                                (!data.currency || data.currency === baseCurrency) && "opacity-50"
                            )}
                            disabled={!data.currency || data.currency === baseCurrency}
                            dir="ltr"
                        />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <CalendarClock className="w-3.5 h-3.5" />
                            {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full h-10 justify-start text-left font-normal bg-white dark:bg-gray-800",
                                        !data.due_date && "text-muted-foreground"
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

                </div>
            </CardContent>
        </Card>
    );
};
