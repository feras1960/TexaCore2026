import * as React from "react"
import { CalendarIcon } from "lucide-react"
import {
    format,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    startOfYear, endOfYear,
    subWeeks, subMonths, subYears,
    startOfDay, endOfDay,
} from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage } from "@/app/providers/LanguageProvider"

// ─── Quick Date Presets ──────────────────────────────────────
interface DatePreset {
    labelAr: string;
    labelEn: string;
    range: () => DateRange;
}

const getPresets = (): DatePreset[] => {
    const now = new Date();
    return [
        {
            labelAr: 'اليوم',
            labelEn: 'Today',
            range: () => ({ from: startOfDay(now), to: endOfDay(now) }),
        },
        {
            labelAr: 'الأسبوع الحالي',
            labelEn: 'This Week',
            range: () => ({ from: startOfWeek(now, { weekStartsOn: 6 }), to: endOfDay(now) }),
        },
        {
            labelAr: 'الأسبوع الماضي',
            labelEn: 'Last Week',
            range: () => {
                const lastWeek = subWeeks(now, 1);
                return { from: startOfWeek(lastWeek, { weekStartsOn: 6 }), to: endOfWeek(lastWeek, { weekStartsOn: 6 }) };
            },
        },
        {
            labelAr: 'الشهر الحالي',
            labelEn: 'This Month',
            range: () => ({ from: startOfMonth(now), to: endOfDay(now) }),
        },
        {
            labelAr: 'الشهر الماضي',
            labelEn: 'Last Month',
            range: () => {
                const lastMonth = subMonths(now, 1);
                return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
            },
        },
        {
            labelAr: 'آخر 3 أشهر',
            labelEn: 'Last 3 Months',
            range: () => ({ from: startOfMonth(subMonths(now, 2)), to: endOfDay(now) }),
        },
        {
            labelAr: 'السنة الحالية',
            labelEn: 'This Year',
            range: () => ({ from: startOfYear(now), to: endOfDay(now) }),
        },
        {
            labelAr: 'السنة الماضية',
            labelEn: 'Last Year',
            range: () => {
                const lastYear = subYears(now, 1);
                return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
            },
        },
    ];
};

// ─── Component ───────────────────────────────────────────────
interface DateRangePickerProps {
    className?: string;
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    align?: "center" | "start" | "end";
    showPresets?: boolean;
}

export function DateRangePicker({
    className,
    date,
    setDate,
    align = "start",
    showPresets = true,
}: DateRangePickerProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const presets = React.useMemo(() => getPresets(), []);

    const handlePreset = (preset: DatePreset) => {
        setDate(preset.range());
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-auto min-w-[220px] lg:min-w-[280px] justify-start text-left font-normal h-10 text-sm border-gray-200 dark:border-gray-700",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="me-2 h-4 w-4 text-gray-400" />
                        {date?.from ? (
                            date.to ? (
                                <span className="font-tajawal">
                                    {format(date.from, "dd/MM/yyyy")} – {format(date.to, "dd/MM/yyyy")}
                                </span>
                            ) : (
                                <span className="font-tajawal">{format(date.from, "dd/MM/yyyy")}</span>
                            )
                        ) : (
                            <span className="font-tajawal">{isAr ? 'اختر الفترة' : 'Pick a date range'}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={align}>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />

                    {/* ─── Quick Presets ─── */}
                    {showPresets && (
                        <div className="border-t border-gray-100 dark:border-gray-800 p-2">
                            <p className="text-[10px] text-gray-400 font-tajawal px-1 mb-1.5">
                                {isAr ? 'اختيارات سريعة' : 'Quick Select'}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.labelEn}
                                        onClick={() => handlePreset(preset)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-tajawal transition-all",
                                            "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
                                            "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400",
                                            "border border-transparent hover:border-blue-200 dark:hover:border-blue-800",
                                        )}
                                    >
                                        {isAr ? preset.labelAr : preset.labelEn}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}
