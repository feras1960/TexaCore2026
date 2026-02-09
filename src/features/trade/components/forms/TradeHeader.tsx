import React, { useEffect } from 'react';
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
import { TradeDocument } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Users, Building, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ar } from 'date-fns/locale';

interface TradeHeaderProps {
    data: Partial<TradeDocument>;
    mode: 'purchase' | 'sales';
    type: string;
    onChange: (field: keyof TradeDocument, value: any) => void;
    partyList: { id: string, name: string }[];
    warehouseList: { id: string, name: string }[];
}

export const TradeHeader: React.FC<TradeHeaderProps> = ({
    data,
    mode,
    onChange,
    partyList,
    warehouseList
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

    const partyLabel = mode === 'purchase' ? (isAr ? 'المورد' : 'Supplier') : (isAr ? 'العميل' : 'Customer');
    const refLabel = isAr ? 'الرقم المرجعي' : 'Reference #';
    const dateLabel = isAr ? 'التاريخ' : 'Date';
    const warehouseLabel = isAr ? 'المستودع' : 'Warehouse';

    return (
        <Card className="border-none shadow-sm bg-gray-50/50 dark:bg-gray-900/50 mb-4" dir={direction}>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                {/* 1. Party Selection (First in RTL) */}
                <div className="space-y-2 md:col-span-1">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {partyLabel}
                    </Label>
                    <Select
                        value={data.party_id}
                        onValueChange={(val) => onChange('party_id', val)}
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

                {/* 2. Warehouse Selection */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {warehouseLabel}
                    </Label>
                    <Select
                        value={data.warehouse_id}
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

                {/* 4. Reference Number (Disabled on Create) */}
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
                        disabled={isCreate} // Disabled on create
                        dir="ltr" // Reference numbers are usually LTR
                    />
                </div>

            </CardContent>
        </Card>
    );
};
