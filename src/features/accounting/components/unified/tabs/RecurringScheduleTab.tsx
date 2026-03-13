/**
 * ════════════════════════════════════════════════════════════════
 * ⚙️ RecurringScheduleTab — تبويب الجدولة للقيود المتكررة
 * ════════════════════════════════════════════════════════════════
 * يعرض ويعدّل: التكرار، اليوم، البداية/النهاية، الإشعارات
 * ════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Calendar, RefreshCw, Bell, Shield, Clock,
    ArrowRight, Hash, Play, Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SheetMode } from '../types';

interface RecurringScheduleTabProps {
    data: any;
    mode?: SheetMode;
    onChange?: (field: string, value: any) => void;
}

const FREQUENCIES = [
    { value: 'daily', labelAr: 'يومي', labelEn: 'Daily', icon: '📅' },
    { value: 'weekly', labelAr: 'أسبوعي', labelEn: 'Weekly', icon: '📆' },
    { value: 'monthly', labelAr: 'شهري', labelEn: 'Monthly', icon: '🗓️' },
    { value: 'quarterly', labelAr: 'ربع سنوي', labelEn: 'Quarterly', icon: '📊' },
    { value: 'yearly', labelAr: 'سنوي', labelEn: 'Yearly', icon: '🎯' },
];

const DAYS_OF_WEEK = [
    { value: 0, labelAr: 'الأحد', labelEn: 'Sunday' },
    { value: 1, labelAr: 'الإثنين', labelEn: 'Monday' },
    { value: 2, labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
    { value: 3, labelAr: 'الأربعاء', labelEn: 'Wednesday' },
    { value: 4, labelAr: 'الخميس', labelEn: 'Thursday' },
    { value: 5, labelAr: 'الجمعة', labelEn: 'Friday' },
    { value: 6, labelAr: 'السبت', labelEn: 'Saturday' },
];

const MONTHS = [
    { value: 1, labelAr: 'يناير', labelEn: 'January' },
    { value: 2, labelAr: 'فبراير', labelEn: 'February' },
    { value: 3, labelAr: 'مارس', labelEn: 'March' },
    { value: 4, labelAr: 'أبريل', labelEn: 'April' },
    { value: 5, labelAr: 'مايو', labelEn: 'May' },
    { value: 6, labelAr: 'يونيو', labelEn: 'June' },
    { value: 7, labelAr: 'يوليو', labelEn: 'July' },
    { value: 8, labelAr: 'أغسطس', labelEn: 'August' },
    { value: 9, labelAr: 'سبتمبر', labelEn: 'September' },
    { value: 10, labelAr: 'أكتوبر', labelEn: 'October' },
    { value: 11, labelAr: 'نوفمبر', labelEn: 'November' },
    { value: 12, labelAr: 'ديسمبر', labelEn: 'December' },
];

export function RecurringScheduleTab({ data, mode = 'view', onChange }: RecurringScheduleTabProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isEditable = mode === 'create' || mode === 'edit';

    const frequency = data?.frequency || 'monthly';
    const status = data?.status || 'active';

    const handleChange = (field: string, value: any) => {
        onChange?.(field, value);
    };

    const formatDate = (date: string | null) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const freqLabel = useMemo(() => {
        const f = FREQUENCIES.find(f => f.value === frequency);
        return isRTL ? f?.labelAr : f?.labelEn;
    }, [frequency, isRTL]);

    return (
        <div className="space-y-5 p-1">
            {/* ═══ Status Banner ═══ */}
            {mode === 'view' && (
                <div className={cn(
                    'rounded-xl p-4 flex items-center justify-between',
                    status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : status === 'paused'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                )}>
                    <div className="flex items-center gap-3">
                        {status === 'active' ? (
                            <Play className="w-5 h-5 text-emerald-600" />
                        ) : (
                            <Pause className="w-5 h-5 text-amber-600" />
                        )}
                        <div>
                            <p className={cn(
                                'font-semibold text-sm font-tajawal',
                                status === 'active' ? 'text-emerald-700' : 'text-amber-700',
                            )}>
                                {status === 'active'
                                    ? (isRTL ? 'نشط — يعمل تلقائياً' : 'Active — Running automatically')
                                    : (isRTL ? 'متوقف مؤقتاً' : 'Paused')}
                            </p>
                            {data?.next_run_date && status === 'active' && (
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    {isRTL ? 'التنفيذ التالي:' : 'Next run:'} {formatDate(data.next_run_date)}
                                </p>
                            )}
                        </div>
                    </div>
                    <Badge variant="outline" className={cn(
                        'font-mono',
                        status === 'active' ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700',
                    )}>
                        {data?.times_executed || 0} / {data?.max_executions || '∞'}
                    </Badge>
                </div>
            )}

            {/* ═══ Frequency Selection ═══ */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white font-cairo">
                            {isRTL ? 'التكرار' : 'Frequency'}
                        </h3>
                    </div>

                    {isEditable ? (
                        <div className="grid grid-cols-5 gap-2">
                            {FREQUENCIES.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => handleChange('frequency', f.value)}
                                    className={cn(
                                        'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                                        frequency === f.value
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300',
                                    )}
                                >
                                    <span className="text-lg">{f.icon}</span>
                                    <span className={cn(
                                        'text-xs font-medium font-tajawal',
                                        frequency === f.value ? 'text-purple-700' : 'text-gray-600',
                                    )}>
                                        {isRTL ? f.labelAr : f.labelEn}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <span className="text-2xl">{FREQUENCIES.find(f => f.value === frequency)?.icon}</span>
                            <span className="text-sm font-semibold text-purple-700 font-tajawal">{freqLabel}</span>
                        </div>
                    )}

                    {/* Day Selection based on frequency */}
                    {frequency === 'weekly' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-tajawal">{isRTL ? 'يوم الأسبوع' : 'Day of Week'}</Label>
                            {isEditable ? (
                                <Select
                                    value={String(data?.day_of_week ?? 0)}
                                    onValueChange={v => handleChange('day_of_week', parseInt(v))}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DAYS_OF_WEEK.map(d => (
                                            <SelectItem key={d.value} value={String(d.value)}>
                                                {isRTL ? d.labelAr : d.labelEn}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm font-medium">
                                    {isRTL
                                        ? DAYS_OF_WEEK.find(d => d.value === data?.day_of_week)?.labelAr
                                        : DAYS_OF_WEEK.find(d => d.value === data?.day_of_week)?.labelEn}
                                </p>
                            )}
                        </div>
                    )}

                    {(frequency === 'monthly' || frequency === 'quarterly') && (
                        <div className="space-y-2">
                            <Label className="text-xs font-tajawal">{isRTL ? 'يوم الشهر' : 'Day of Month'}</Label>
                            {isEditable ? (
                                <Input
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={data?.day_of_month || 1}
                                    onChange={e => handleChange('day_of_month', parseInt(e.target.value) || 1)}
                                    className="h-9 w-24"
                                />
                            ) : (
                                <p className="text-sm font-medium font-mono">{data?.day_of_month || 1}</p>
                            )}
                        </div>
                    )}

                    {frequency === 'yearly' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs font-tajawal">{isRTL ? 'الشهر' : 'Month'}</Label>
                                {isEditable ? (
                                    <Select
                                        value={String(data?.month_of_year ?? 1)}
                                        onValueChange={v => handleChange('month_of_year', parseInt(v))}
                                    >
                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {MONTHS.map(m => (
                                                <SelectItem key={m.value} value={String(m.value)}>
                                                    {isRTL ? m.labelAr : m.labelEn}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm font-medium">
                                        {isRTL
                                            ? MONTHS.find(m => m.value === data?.month_of_year)?.labelAr
                                            : MONTHS.find(m => m.value === data?.month_of_year)?.labelEn}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-tajawal">{isRTL ? 'اليوم' : 'Day'}</Label>
                                {isEditable ? (
                                    <Input
                                        type="number"
                                        min={1}
                                        max={28}
                                        value={data?.day_of_month || 1}
                                        onChange={e => handleChange('day_of_month', parseInt(e.target.value) || 1)}
                                        className="h-9 w-24"
                                    />
                                ) : (
                                    <p className="text-sm font-medium font-mono">{data?.day_of_month || 1}</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Date Range ═══ */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white font-cairo">
                            {isRTL ? 'الفترة الزمنية' : 'Date Range'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-tajawal">{isRTL ? 'تاريخ البداية' : 'Start Date'}</Label>
                            {isEditable ? (
                                <Input
                                    type="date"
                                    value={data?.start_date || ''}
                                    onChange={e => handleChange('start_date', e.target.value)}
                                    className="h-9"
                                />
                            ) : (
                                <p className="text-sm font-medium font-mono">{formatDate(data?.start_date)}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-tajawal">
                                {isRTL ? 'تاريخ النهاية (اختياري)' : 'End Date (optional)'}
                            </Label>
                            {isEditable ? (
                                <Input
                                    type="date"
                                    value={data?.end_date || ''}
                                    onChange={e => handleChange('end_date', e.target.value || null)}
                                    className="h-9"
                                />
                            ) : (
                                <p className="text-sm font-medium font-mono">{formatDate(data?.end_date)}</p>
                            )}
                        </div>
                    </div>

                    {/* Execution limits */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1.5 font-tajawal">
                                <Hash className="w-3 h-3" />
                                {isRTL ? 'الحد الأقصى للتنفيذ' : 'Max Executions'}
                            </Label>
                            {isEditable ? (
                                <Input
                                    type="number"
                                    min={0}
                                    value={data?.max_executions || ''}
                                    onChange={e => handleChange('max_executions', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder={isRTL ? 'بلا حدود' : 'Unlimited'}
                                    className="h-9 w-32"
                                />
                            ) : (
                                <p className="text-sm font-medium font-mono">
                                    {data?.max_executions || (isRTL ? '∞ بلا حدود' : '∞ Unlimited')}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1.5 font-tajawal">
                                <Clock className="w-3 h-3" />
                                {isRTL ? 'مرات التنفيذ' : 'Times Executed'}
                            </Label>
                            <p className="text-sm font-bold font-mono text-green-600">
                                {data?.times_executed || 0}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Settings ═══ */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white font-cairo">
                            {isRTL ? 'إعدادات التنفيذ' : 'Execution Settings'}
                        </h3>
                    </div>

                    {/* Requires Approval */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-500" />
                            <div>
                                <p className="text-sm font-medium font-tajawal">
                                    {isRTL ? 'يتطلب اعتماد' : 'Requires Approval'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {isRTL ? 'يحتاج موافقة قبل التنفيذ' : 'Needs approval before execution'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={data?.requires_approval ?? true}
                            onCheckedChange={v => handleChange('requires_approval', v)}
                            disabled={!isEditable}
                        />
                    </div>

                    {/* Auto Post */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-green-500" />
                            <div>
                                <p className="text-sm font-medium font-tajawal">
                                    {isRTL ? 'ترحيل تلقائي' : 'Auto Post'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {isRTL ? 'ترحيل القيد فوراً بعد الإنشاء' : 'Post entry immediately after creation'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={data?.auto_post ?? false}
                            onCheckedChange={v => handleChange('auto_post', v)}
                            disabled={!isEditable}
                        />
                    </div>

                    {/* Notification */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium font-tajawal">
                                    {isRTL ? 'إشعار قبل التنفيذ' : 'Notify Before Execution'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {isRTL ? 'عدد أيام الإشعار المسبق' : 'Days before notification'}
                                </p>
                            </div>
                        </div>
                        {isEditable ? (
                            <Input
                                type="number"
                                min={0}
                                max={30}
                                value={data?.notify_days_before ?? 3}
                                onChange={e => handleChange('notify_days_before', parseInt(e.target.value) || 0)}
                                className="h-8 w-16 text-center"
                            />
                        ) : (
                            <Badge variant="outline" className="font-mono">
                                {data?.notify_days_before ?? 3} {isRTL ? 'أيام' : 'days'}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default RecurringScheduleTab;
