/**
 * ════════════════════════════════════════════════════════════════
 * ⚙️ Platform Settings Tab — General Platform Configuration
 * ════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Settings,
    Save,
    Palette,
    Globe,
    Type,
    Eye,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlatformSettingsTabProps {
    platform: {
        id: string;
        code: string;
        name: string;
        name_ar: string;
        description: string | null;
        domain: string | null;
        logo_url: string | null;
        primary_color: string;
        secondary_color: string | null;
        is_active: boolean;
        display_order: number;
    };
    onUpdate?: () => void;
}

export default function PlatformSettingsTab({
    platform,
    onUpdate,
}: PlatformSettingsTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [editData, setEditData] = useState({ ...platform });
    const [saving, setSaving] = useState(false);

    const updateField = (field: string, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const hasChanges = JSON.stringify(editData) !== JSON.stringify(platform);

    const saveSettings = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('saas_products')
                .update({
                    name: editData.name,
                    name_ar: editData.name_ar,
                    description: editData.description,
                    domain: editData.domain || null,
                    logo_url: editData.logo_url || null,
                    primary_color: editData.primary_color,
                    secondary_color: editData.secondary_color || null,
                    is_active: editData.is_active,
                    display_order: parseInt(String(editData.display_order)) || 0,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', platform.id);

            if (error) throw error;
            toast.success(isAr ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
            onUpdate?.();
        } catch (err: any) {
            toast.error(err.message || (isAr ? 'خطأ في الحفظ' : 'Error saving'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Save Bar */}
            {hasChanges && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                        {isAr ? 'يوجد تغييرات غير محفوظة' : 'You have unsaved changes'}
                    </span>
                    <Button
                        size="sm"
                        onClick={saveSettings}
                        disabled={saving}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
                    </Button>
                </div>
            )}

            {/* General Info */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-gray-400" />
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {isAr ? 'المعلومات الأساسية' : 'Basic Information'}
                        </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{isAr ? 'اسم المنصة (إنجليزي)' : 'Platform Name (English)'}</Label>
                            <Input
                                value={editData.name}
                                onChange={e => updateField('name', e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{isAr ? 'اسم المنصة (عربي)' : 'Platform Name (Arabic)'}</Label>
                            <Input
                                value={editData.name_ar}
                                onChange={e => updateField('name_ar', e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isAr ? 'الكود' : 'Code'}</Label>
                        <Input
                            value={editData.code}
                            disabled
                            className="h-9 text-sm font-mono bg-gray-50 dark:bg-gray-800"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                        <Textarea
                            value={editData.description || ''}
                            onChange={e => updateField('description', e.target.value)}
                            rows={3}
                            className="text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{isAr ? 'الدومين' : 'Domain'}</Label>
                            <Input
                                value={editData.domain || ''}
                                onChange={e => updateField('domain', e.target.value)}
                                placeholder="texacore.ai"
                                className="h-9 text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{isAr ? 'ترتيب العرض' : 'Display Order'}</Label>
                            <Input
                                type="number"
                                value={editData.display_order}
                                onChange={e => updateField('display_order', e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Branding */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-400" />
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {isAr ? 'الهوية البصرية' : 'Branding'}
                        </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{isAr ? 'اللون الرئيسي' : 'Primary Color'}</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={editData.primary_color}
                                    onChange={e => updateField('primary_color', e.target.value)}
                                    className="w-9 h-9 rounded-lg border cursor-pointer"
                                />
                                <Input
                                    value={editData.primary_color}
                                    onChange={e => updateField('primary_color', e.target.value)}
                                    className="h-9 text-sm font-mono flex-1"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{isAr ? 'اللون الثانوي' : 'Secondary Color'}</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={editData.secondary_color || '#ffffff'}
                                    onChange={e => updateField('secondary_color', e.target.value)}
                                    className="w-9 h-9 rounded-lg border cursor-pointer"
                                />
                                <Input
                                    value={editData.secondary_color || ''}
                                    onChange={e => updateField('secondary_color', e.target.value)}
                                    placeholder="#ffffff"
                                    className="h-9 text-sm font-mono flex-1"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{isAr ? 'رابط اللوغو' : 'Logo URL'}</Label>
                        <Input
                            value={editData.logo_url || ''}
                            onChange={e => updateField('logo_url', e.target.value)}
                            placeholder="/logos/texacore.svg"
                            className="h-9 text-sm font-mono"
                        />
                    </div>

                    {/* Preview */}
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{isAr ? 'معاينة' : 'Preview'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                                style={{ backgroundColor: editData.primary_color }}
                            >
                                {editData.name.charAt(0)}
                            </div>
                            <div>
                                <div className="text-sm font-bold" style={{ color: editData.primary_color }}>{editData.name}</div>
                                <div className="text-[11px] text-gray-500">{editData.name_ar}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-gray-400" />
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {isAr ? 'الحالة' : 'Status'}
                        </h4>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                        <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {isAr ? 'المنصة مفعّلة' : 'Platform Active'}
                            </div>
                            <div className="text-[11px] text-gray-500">
                                {isAr ? 'تعطيل المنصة سيوقف الاشتراكات الجديدة' : 'Disabling will stop new subscriptions'}
                            </div>
                        </div>
                        <Switch
                            checked={editData.is_active}
                            onCheckedChange={v => updateField('is_active', v)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
