/**
 * Warehouse Overview Tab - تبويب نظرة عامة على المستودع
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    MapPin,
    Phone,
    Mail,
    Info,
    Package,
    AlertTriangle,
    Database,
    Shield,
    GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '../utils/formatters';
import { branchesService, Branch } from '@/services/branchesService';

interface WarehouseOverviewTabProps {
    data: any;
    mode?: 'view' | 'edit' | 'create';
    onChange?: (updates: any) => void;
}

export function WarehouseOverviewTab({ data, mode = 'view', onChange }: WarehouseOverviewTabProps) {
    const { t, language } = useLanguage();
    const { companyId } = useCompany();
    const isAr = language === 'ar';
    const isEditing = mode === 'edit' || mode === 'create';

    // Load branches for selector
    const [branches, setBranches] = useState<Branch[]>([]);
    useEffect(() => {
        if (companyId) {
            branchesService.getBranches(companyId)
                .then(setBranches)
                .catch(() => setBranches([]));
        }
    }, [companyId]);

    if (!data && !isEditing) return null;

    const handleChange = (field: string, value: any) => {
        onChange?.({ [field]: value });
    };

    const currentBranch = branches.find(b => b.id === data?.branch_id);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-400" />
                            {t('warehouse.details') || 'تفاصيل المستودع'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            label={t('warehouse.code') || 'كود المستودع'}
                            value={data?.code}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('code', v)}
                            mono
                        />
                        <Field
                            label={t('warehouse.nameAr') || 'الاسم (عربي)'}
                            value={data?.name_ar}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('name_ar', v)}
                            required
                        />
                        <Field
                            label={t('warehouse.nameEn') || 'الاسم (إنجليزي)'}
                            value={data?.name_en}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('name_en', v)}
                        />

                        {isEditing ? (
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">{t('warehouse.type') || 'نوع المستودع'}</Label>
                                <Select
                                    value={data?.warehouse_type}
                                    onValueChange={(v) => handleChange('warehouse_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('warehouse.selectType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="main">{t('warehouse.types.main') || 'رئيسي'}</SelectItem>
                                        <SelectItem value="branch">{t('warehouse.types.branch') || 'فرعي'}</SelectItem>
                                        <SelectItem value="store">{t('warehouse.types.store') || 'معرض'}</SelectItem>
                                        <SelectItem value="van">{t('warehouse.types.van') || 'سيارة توزيع'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <InfoRow
                                label={t('warehouse.type') || 'نوع المستودع'}
                                value={
                                    <Badge variant="outline">
                                        {t(`warehouse.types.${data?.warehouse_type}`) || data?.warehouse_type}
                                    </Badge>
                                }
                            />
                        )}

                        {/* Branch Selector */}
                        {isEditing ? (
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500 flex items-center gap-1">
                                    <GitBranch className="w-3 h-3" />
                                    {isAr ? 'الفرع' : 'Branch'}
                                </Label>
                                <Select
                                    value={data?.branch_id || '_none'}
                                    onValueChange={(v) => handleChange('branch_id', v === '_none' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={isAr ? 'اختر الفرع' : 'Select branch'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">{isAr ? '— بدون فرع —' : '— No branch —'}</SelectItem>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {isAr ? b.name : (b.name_en || b.name)}
                                                {b.is_main ? ` ⭐` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <InfoRow
                                label={isAr ? 'الفرع' : 'Branch'}
                                value={
                                    currentBranch ? (
                                        <Badge variant="outline" className="text-xs gap-1">
                                            <GitBranch className="w-3 h-3" />
                                            {isAr ? currentBranch.name : (currentBranch.name_en || currentBranch.name)}
                                            {currentBranch.is_main && ' ⭐'}
                                        </Badge>
                                    ) : (
                                        <span className="text-gray-400">{isAr ? 'غير محدد' : 'Not assigned'}</span>
                                    )
                                }
                            />
                        )}

                        {isEditing ? (
                            <div className="flex items-center justify-between py-2 border-t mt-2">
                                <Label className="text-sm">{t('status.active') || 'نشط'}</Label>
                                <Switch
                                    checked={data?.is_active}
                                    onCheckedChange={(v) => handleChange('is_active', v)}
                                />
                            </div>
                        ) : (
                            <InfoRow
                                label={t('status.active') || 'الحالة'}
                                value={
                                    <Badge variant={data?.is_active ? "default" : "destructive"} className="text-xs">
                                        {data?.is_active ? (t('status.active') || 'نشط') : (t('status.inactive') || 'غير نشط')}
                                    </Badge>
                                }
                            />
                        )}

                        {isEditing ? (
                            <div className="flex items-center justify-between py-2 border-t">
                                <Label className="text-sm">{t('warehouse.isMain') || 'مستودع رئيسي لأسعار التكلفة'}</Label>
                                <Switch
                                    checked={data?.is_main}
                                    onCheckedChange={(v) => handleChange('is_main', v)}
                                />
                            </div>
                        ) : (
                            <InfoRow
                                label={t('warehouse.isMain') || 'مستودع رئيسي'}
                                value={
                                    data?.is_main
                                        ? <Badge variant="secondary">{t('common.yes') || 'نعم'}</Badge>
                                        : <span className="text-gray-500">{t('common.no') || 'لا'}</span>
                                }
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Contact & Location */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {t('warehouse.locationAndContact') || 'الموقع والاتصال'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            label={t('warehouse.city') || 'المدينة'}
                            value={data?.city}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('city', v)}
                        />
                        <Field
                            label={t('warehouse.address') || 'العنوان'}
                            value={data?.address}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('address', v)}
                        />
                        <Field
                            label={t('common.phone') || 'الهاتف'}
                            value={data?.phone}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('phone', v)}
                            icon={!isEditing && <Phone className="w-3 h-3 text-gray-400" />}
                            mono
                        />
                        <Field
                            label={t('common.email') || 'البريد الإلكتروني'}
                            value={data?.email}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('email', v)}
                            icon={!isEditing && <Mail className="w-3 h-3 text-gray-400" />}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Capacity & Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-400" />
                        {t('warehouse.capacityAndSettings') || 'السعة والإعدادات'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Field
                            label={t('warehouse.capacity') || 'السعة التخزينية'}
                            value={data?.capacity}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('capacity', Number(v))}
                            type="number"
                            suffix={!isEditing && '📦'}
                            mono
                        />

                        {isEditing ? (
                            <div className="flex items-center justify-between py-2">
                                <Label className="text-sm">{t('warehouse.allowsNegativeStock') || 'السماح بالسحب بالسالب'}</Label>
                                <Switch
                                    checked={data?.allows_negative_stock}
                                    onCheckedChange={(v) => handleChange('allows_negative_stock', v)}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between py-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    {t('warehouse.allowsNegativeStock') || 'السماح بالسحب بالسالب'}
                                </span>
                                <Badge variant={data?.allows_negative_stock ? "destructive" : "outline"}>
                                    {data?.allows_negative_stock ? (t('common.allowed') || 'مسموح') : (t('common.forbidden') || 'ممنوع')}
                                </Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* System Info */}
            {!isEditing && (
                <div className="flex items-center gap-4 text-xs text-gray-400 px-2">
                    <span>Created: {formatDate(data?.created_at)}</span>
                    {data?.updated_at && <span>Updated: {formatDate(data.updated_at)}</span>}
                </div>
            )}
        </div>
    );
}

// Helper Components

function InfoRow({ label, value, mono }: { label: string, value: React.ReactNode, mono?: boolean }) {
    return (
        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0 min-h-[32px]">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={cn(
                "text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2",
                mono && "font-mono"
            )}>
                {value || '-'}
            </span>
        </div>
    );
}

interface FieldProps {
    label: string;
    value: any;
    isEditing: boolean;
    onChange: (val: any) => void;
    type?: string;
    mono?: boolean;
    required?: boolean;
    icon?: React.ReactNode;
    suffix?: React.ReactNode;
}

function Field({ label, value, isEditing, onChange, type = "text", mono, required, icon, suffix }: FieldProps) {
    if (isEditing) {
        return (
            <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    type={type}
                    className="h-8 text-sm"
                />
            </div>
        );
    }

    return (
        <InfoRow
            label={label}
            value={
                <>
                    {icon}
                    {value}
                    {suffix}
                </>
            }
            mono={mono}
        />
    );
}
