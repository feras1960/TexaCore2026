/**
 * ════════════════════════════════════════════════════════════════
 * 📁 Add Group Dialog - حوار إضافة مجموعة مواد
 * مكوِّن بسيط لإضافة/تعديل مجموعات المواد
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    FolderPlus,
    Save,
    Loader2,
    Shirt,
    Car,
    Wrench,
    Package,
    Gem,
    Utensils,
    Building2,
    Cpu,
    Palette,
    Boxes,
    FolderTree,
    Globe,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// أنواع المواد المدعومة
// ═══════════════════════════════════════════════════════════════
const MATERIAL_CATEGORIES = [
    { value: 'fabric', labelAr: 'أقمشة', labelEn: 'Fabrics', icon: Shirt, color: '#6366f1' },
    { value: 'garment', labelAr: 'ملابس جاهزة', labelEn: 'Garments', icon: Shirt, color: '#ec4899' },
    { value: 'automotive', labelAr: 'سيارات', labelEn: 'Automotive', icon: Car, color: '#f59e0b' },
    { value: 'spare_parts', labelAr: 'قطع تبديل', labelEn: 'Spare Parts', icon: Wrench, color: '#64748b' },
    { value: 'electronics', labelAr: 'إلكترونيات', labelEn: 'Electronics', icon: Cpu, color: '#3b82f6' },
    { value: 'food', labelAr: 'مواد غذائية', labelEn: 'Food & Beverages', icon: Utensils, color: '#22c55e' },
    { value: 'construction', labelAr: 'مواد بناء', labelEn: 'Construction', icon: Building2, color: '#a855f7' },
    { value: 'jewelry', labelAr: 'ذهب ومجوهرات', labelEn: 'Jewelry', icon: Gem, color: '#eab308' },
    { value: 'cosmetics', labelAr: 'مستحضرات تجميل', labelEn: 'Cosmetics', icon: Palette, color: '#f43f5e' },
    { value: 'general', labelAr: 'بضائع عامة', labelEn: 'General Goods', icon: Boxes, color: '#0ea5e9' },
    { value: 'raw_materials', labelAr: 'مواد خام', labelEn: 'Raw Materials', icon: Package, color: '#78716c' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: Package, color: '#94a3b8' },
];

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface GroupData {
    id?: string;
    code: string;
    name_ar: string;
    name_en: string;
    description: string;
    category: string;
    parent_id: string | null;
    icon: string;
    color: string;
}

interface AddGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editGroup?: any; // If provided, editing existing group
    parentGroup?: any; // If provided, creating sub-group
    onSuccess?: () => void; // Called after successful save
}

export function AddGroupDialog({
    open,
    onOpenChange,
    editGroup,
    parentGroup,
    onSuccess,
}: AddGroupDialogProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, user } = useAuth();

    // Form state
    const [formData, setFormData] = useState<GroupData>({
        code: '',
        name_ar: '',
        name_en: '',
        description: '',
        category: 'fabric',
        parent_id: null,
        icon: '📁',
        color: '#6366f1',
    });
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingGroups, setExistingGroups] = useState<any[]>([]);

    // Languages other than Arabic and English for translations
    const otherLanguages = SUPPORTED_LANGUAGES.filter(l => l.code !== 'ar' && l.code !== 'en');

    // Load existing groups for parent selection
    useEffect(() => {
        if (open) {
            loadExistingGroups();
        }
    }, [open, companyId]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            if (editGroup) {
                setFormData({
                    id: editGroup.id,
                    code: editGroup.code || '',
                    name_ar: editGroup.name_ar || '',
                    name_en: editGroup.name_en || '',
                    description: editGroup.description || '',
                    category: editGroup.category || 'fabric',
                    parent_id: editGroup.parent_id || null,
                    icon: editGroup.icon || '📁',
                    color: editGroup.color || '#6366f1',
                });
                // Load existing translations from custom_fields
                const existingTranslations: Record<string, string> = {};
                otherLanguages.forEach(lang => {
                    const val = editGroup[`name_${lang.code}`] || editGroup.custom_fields?.[`name_${lang.code}`];
                    if (val) existingTranslations[lang.code] = val;
                });
                setTranslations(existingTranslations);
            } else {
                setFormData({
                    code: '',
                    name_ar: '',
                    name_en: '',
                    description: '',
                    category: 'fabric',
                    parent_id: parentGroup?.id || null,
                    icon: '📁',
                    color: '#6366f1',
                });
                setTranslations({});
            }
            setError(null);
        }
    }, [open, editGroup, parentGroup]);

    // Update color when category changes
    useEffect(() => {
        const cat = MATERIAL_CATEGORIES.find(c => c.value === formData.category);
        if (cat) {
            setFormData(prev => ({ ...prev, color: cat.color }));
        }
    }, [formData.category]);

    const loadExistingGroups = async () => {
        try {
            const tenantId = user?.user_metadata?.tenant_id;
            const groups = await warehouseService.getGroups(companyId || '', tenantId);
            // Filter out current group if editing (can't be parent of itself)
            setExistingGroups(
                editGroup ? groups.filter((g: any) => g.id !== editGroup.id) : groups
            );
        } catch (err) {
            console.error('Error loading groups:', err);
        }
    };

    const handleChange = (field: keyof GroupData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleSave = async () => {
        // Validation
        if (!formData.name_ar.trim()) {
            setError(language === 'ar' ? 'اسم المجموعة بالعربية مطلوب' : 'Arabic group name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const tenantId = user?.user_metadata?.tenant_id;

            // Build translations object for custom_fields
            const translationFields: Record<string, string> = {};
            Object.entries(translations).forEach(([langCode, name]) => {
                if (name.trim()) {
                    translationFields[`name_${langCode}`] = name.trim();
                }
            });

            const groupPayload: any = {
                tenant_id: tenantId,
                code: formData.code.trim() || `GRP-${Date.now().toString(36).toUpperCase()}`,
                name_ar: formData.name_ar.trim(),
                name_en: formData.name_en.trim() || '',
                description: formData.description.trim() || '',
                category: formData.category,
                parent_id: formData.parent_id || null,
                icon: formData.icon,
                color: formData.color,
                is_active: true,
            };

            // Store translations in custom_fields if any exist
            if (Object.keys(translationFields).length > 0) {
                groupPayload.custom_fields = translationFields;
            }

            let result;
            if (editGroup?.id) {
                result = await warehouseService.updateGroup(editGroup.id, groupPayload);
            } else {
                result = await warehouseService.createGroup(groupPayload);
            }

            if (result.success) {
                onOpenChange(false);
                onSuccess?.();
            } else {
                setError(result.error || (language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving group'));
            }
        } catch (err: any) {
            console.error('Error saving group:', err);
            setError(err.message || (language === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error'));
        } finally {
            setSaving(false);
        }
    };

    const isEditing = !!editGroup?.id;
    const dialogTitle = isEditing
        ? (language === 'ar' ? 'تعديل المجموعة' : 'Edit Group')
        : (language === 'ar' ? 'إضافة مجموعة جديدة' : 'Add New Group');
    const dialogDesc = isEditing
        ? (language === 'ar' ? 'تعديل بيانات مجموعة المواد' : 'Edit material group details')
        : (language === 'ar' ? 'أنشئ مجموعة جديدة لتنظيم المواد في شجرة التصنيف' : 'Create a new group to organize materials in the classification tree');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[540px]"
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <FolderPlus className="w-5 h-5 text-erp-primary" />
                        {dialogTitle}
                    </DialogTitle>
                    <DialogDescription>{dialogDesc}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* ── اسم المجموعة ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="group_name_ar" className="text-sm font-medium">
                                {language === 'ar' ? 'اسم المجموعة بالعربية' : 'Group Name (Arabic)'}
                                <span className="text-red-500 ms-1">*</span>
                            </Label>
                            <Input
                                id="group_name_ar"
                                value={formData.name_ar}
                                onChange={(e) => handleChange('name_ar', e.target.value)}
                                placeholder={language === 'ar' ? 'مثال: أقمشة قطنية' : 'E.g., Cotton Fabrics'}
                                dir="rtl"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group_name_en" className="text-sm font-medium">
                                {language === 'ar' ? 'اسم المجموعة بالإنجليزية' : 'Group Name (English)'}
                            </Label>
                            <Input
                                id="group_name_en"
                                value={formData.name_en}
                                onChange={(e) => handleChange('name_en', e.target.value)}
                                placeholder="E.g., Cotton Fabrics"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* ── الترجمات ── */}
                    {otherLanguages.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-500" />
                                {language === 'ar' ? 'الاسم باللغات الأخرى' : 'Name in Other Languages'}
                            </Label>
                            <div className="space-y-2">
                                {otherLanguages.map((lang) => (
                                    <div key={lang.code} className="flex items-center gap-3">
                                        <div className="w-24 shrink-0">
                                            <Badge variant="outline" className="w-full justify-center text-xs">
                                                {lang.nativeName}
                                            </Badge>
                                        </div>
                                        <Input
                                            value={translations[lang.code] || ''}
                                            onChange={(e) => setTranslations(prev => ({
                                                ...prev,
                                                [lang.code]: e.target.value
                                            }))}
                                            placeholder={`${language === 'ar' ? 'الاسم بـ' : 'Name in '}${lang.name}`}
                                            className="flex-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── الكود ── */}
                    <div className="space-y-2">
                        <Label htmlFor="group_code" className="text-sm font-medium">
                            {language === 'ar' ? 'كود المجموعة' : 'Group Code'}
                        </Label>
                        <Input
                            id="group_code"
                            value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                            placeholder={language === 'ar' ? 'مثال: COT (اختياري - يتم توليده تلقائياً)' : 'E.g., COT (optional - auto-generated)'}
                            className="font-mono"
                            dir="ltr"
                        />
                    </div>

                    {/* ── نوع المواد ── */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {language === 'ar' ? 'نوع المواد بداخل المجموعة' : 'Type of Materials'}
                            <span className="text-red-500 ms-1">*</span>
                        </Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {MATERIAL_CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = formData.category === cat.value;
                                return (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => handleChange('category', cat.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center",
                                            isSelected
                                                ? "border-erp-primary bg-erp-primary/5 shadow-sm scale-[1.02]"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                isSelected ? "bg-erp-primary/10" : "bg-gray-100 dark:bg-gray-700"
                                            )}
                                            style={isSelected ? { backgroundColor: `${cat.color}15` } : {}}
                                        >
                                            <Icon
                                                className="w-4 h-4"
                                                style={{ color: isSelected ? cat.color : undefined }}
                                            />
                                        </div>
                                        <span className={cn(
                                            "text-xs font-medium leading-tight",
                                            isSelected ? "text-erp-primary" : "text-gray-600 dark:text-gray-400"
                                        )}>
                                            {language === 'ar' ? cat.labelAr : cat.labelEn}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── المجموعة الأم ── */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <FolderTree className="w-4 h-4 text-gray-500" />
                            {language === 'ar' ? 'المجموعة الأم (فرعية من)' : 'Parent Group (Sub-group of)'}
                        </Label>
                        <Select
                            value={formData.parent_id || 'none'}
                            onValueChange={(value) => handleChange('parent_id', value === 'none' ? null : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'مجموعة رئيسية (بدون أم)' : 'Root group (no parent)'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        {language === 'ar' ? '— مجموعة رئيسية —' : '— Root Group —'}
                                    </span>
                                </SelectItem>
                                {existingGroups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                        <span className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="text-xs px-1.5"
                                                style={{ borderColor: group.color || '#6366f1', color: group.color || '#6366f1' }}
                                            >
                                                {group.code}
                                            </Badge>
                                            {language === 'ar' ? group.name_ar : (group.name_en || group.name_ar)}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {formData.parent_id && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                {language === 'ar'
                                    ? '✓ هذه مجموعة فرعية ستظهر تحت المجموعة الأم في الشجرة'
                                    : '✓ This sub-group will appear under the parent in the tree'}
                            </p>
                        )}
                    </div>

                    {/* ── الوصف ── */}
                    <div className="space-y-2">
                        <Label htmlFor="group_desc" className="text-sm font-medium">
                            {language === 'ar' ? 'وصف المجموعة' : 'Description'}
                        </Label>
                        <Textarea
                            id="group_desc"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder={language === 'ar'
                                ? 'وصف اختياري للمجموعة...'
                                : 'Optional group description...'}
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !formData.name_ar.trim()}
                        className="bg-erp-primary hover:bg-erp-primary/90"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                {language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 me-2" />
                                {isEditing
                                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                                    : (language === 'ar' ? 'إنشاء المجموعة' : 'Create Group')
                                }
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default AddGroupDialog;
