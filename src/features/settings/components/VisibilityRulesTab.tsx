/**
 * VisibilityRulesTab - تبويب قواعد الإخفاء
 * Visibility Rules Tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Eye, EyeOff, Plus, Edit2, Trash2, Search,
    Loader2, Save, RefreshCw, FileText, Layout,
    LayoutGrid, Activity, Settings2
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { rbacService, VisibilityRule, Role } from '@/services/rbacService';
import { Checkbox } from '@/components/ui/checkbox';

// Rule types
const RULE_TYPES = [
    { value: 'field', labelAr: 'حقل', labelEn: 'Field', icon: FileText },
    { value: 'page', labelAr: 'صفحة', labelEn: 'Page', icon: Layout },
    { value: 'module', labelAr: 'موديول', labelEn: 'Module', icon: LayoutGrid },
    { value: 'report', labelAr: 'تقرير', labelEn: 'Report', icon: Activity },
    { value: 'action', labelAr: 'إجراء', labelEn: 'Action', icon: Settings2 },
];

// Common field targets
const COMMON_TARGETS = {
    field: [
        { value: 'cost_price', labelAr: 'سعر التكلفة', labelEn: 'Cost Price' },
        { value: 'profit_margin', labelAr: 'هامش الربح', labelEn: 'Profit Margin' },
        { value: 'purchase_price', labelAr: 'سعر الشراء', labelEn: 'Purchase Price' },
        { value: 'supplier_info', labelAr: 'معلومات المورد', labelEn: 'Supplier Info' },
        { value: 'account_balance', labelAr: 'رصيد الحساب', labelEn: 'Account Balance' },
    ],
    page: [
        { value: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings' },
        { value: 'reports', labelAr: 'التقارير', labelEn: 'Reports' },
        { value: 'audit_log', labelAr: 'سجل المراجعة', labelEn: 'Audit Log' },
    ],
};

export default function VisibilityRulesTab() {
    const { language, direction } = useLanguage();
    const { toast } = useToast();

    // State
    const [rules, setRules] = useState<VisibilityRule[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingRule, setEditingRule] = useState<VisibilityRule | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        rule_type: 'field' as string,
        target_type: '',
        target_name: '',
        visible_to_roles: [] as string[],
        hidden_from_roles: [] as string[],
        mask_value: '',
        is_active: true,
        priority: 100,
        description: '',
    });

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            const [rulesData, rolesData] = await Promise.all([
                rbacService.getVisibilityRules(),
                rbacService.getRoles(),
            ]);

            setRules(rulesData);
            setRoles(rolesData);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [language, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter rules by search
    const filteredRules = rules.filter(rule => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            rule.target_name.toLowerCase().includes(query) ||
            rule.rule_type.toLowerCase().includes(query) ||
            (rule.description?.toLowerCase() || '').includes(query)
        );
    });

    // Reset form
    const resetForm = () => {
        setFormData({
            rule_type: 'field',
            target_type: '',
            target_name: '',
            visible_to_roles: [],
            hidden_from_roles: [],
            mask_value: '',
            is_active: true,
            priority: 100,
            description: '',
        });
    };

    // Open create sheet
    const handleCreateRule = () => {
        setEditingRule(null);
        resetForm();
        setIsSheetOpen(true);
    };

    // Open edit sheet
    const handleEditRule = (rule: VisibilityRule) => {
        setEditingRule(rule);
        setFormData({
            rule_type: rule.rule_type,
            target_type: rule.target_type,
            target_name: rule.target_name,
            visible_to_roles: rule.visible_to_roles || [],
            hidden_from_roles: rule.hidden_from_roles || [],
            mask_value: rule.mask_value || '',
            is_active: rule.is_active,
            priority: rule.priority,
            description: rule.description || '',
        });
        setIsSheetOpen(true);
    };

    // Delete rule
    const handleDeleteRule = async (rule: VisibilityRule) => {
        try {
            await rbacService.deleteVisibilityRule(rule.id);
            toast({
                title: language === 'ar' ? 'تم الحذف' : 'Deleted',
                description: language === 'ar' ? 'تم حذف القاعدة بنجاح' : 'Rule deleted successfully',
            });
            loadData();
        } catch (error) {
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل حذف القاعدة' : 'Failed to delete rule',
                variant: 'destructive',
            });
        }
    };

    // Save rule
    const handleSaveRule = async () => {
        try {
            setSaving(true);

            const ruleData = {
                rule_type: formData.rule_type as any,
                target_type: formData.target_type || formData.rule_type,
                target_name: formData.target_name,
                visible_to_roles: formData.visible_to_roles,
                hidden_from_roles: formData.hidden_from_roles,
                mask_value: formData.mask_value || null,
                is_active: formData.is_active,
                priority: formData.priority,
                description: formData.description || null,
            };

            if (editingRule) {
                await rbacService.updateVisibilityRule(editingRule.id, ruleData);
            } else {
                await rbacService.createVisibilityRule(ruleData);
            }

            toast({
                title: language === 'ar' ? 'تم الحفظ' : 'Saved',
                description: language === 'ar' ? 'تم حفظ القاعدة بنجاح' : 'Rule saved successfully',
            });

            setIsSheetOpen(false);
            loadData();
        } catch (error) {
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل حفظ القاعدة' : 'Failed to save rule',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Toggle role in list
    const toggleRoleInList = (list: 'visible_to_roles' | 'hidden_from_roles', roleCode: string) => {
        setFormData(prev => ({
            ...prev,
            [list]: prev[list].includes(roleCode)
                ? prev[list].filter(c => c !== roleCode)
                : [...prev[list], roleCode],
        }));
    };

    // Get rule type config
    const getRuleTypeConfig = (type: string) => {
        return RULE_TYPES.find(t => t.value === type) || RULE_TYPES[0];
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-tajawal flex items-center gap-2">
                            <Eye className="w-5 h-5 text-erp-teal" />
                            {language === 'ar' ? 'قواعد الإخفاء' : 'Visibility Rules'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'إخفاء الحقول والصفحات حسب الأدوار'
                                : 'Hide fields and pages based on roles'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadData}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button onClick={handleCreateRule} className="gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline font-tajawal">
                                {language === 'ar' ? 'إضافة قاعدة' : 'Add Rule'}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={language === 'ar' ? 'البحث عن قاعدة...' : 'Search rules...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-10 font-tajawal"
                    />
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : filteredRules.length === 0 ? (
                    <div className="text-center py-12">
                        <EyeOff className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-tajawal">
                            {language === 'ar' ? 'لا توجد قواعد إخفاء' : 'No visibility rules'}
                        </p>
                        <Button onClick={handleCreateRule} variant="outline" className="mt-4 gap-2 font-tajawal">
                            <Plus className="w-4 h-4" />
                            {language === 'ar' ? 'إضافة أول قاعدة' : 'Add First Rule'}
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'الهدف' : 'Target'}
                                    </TableHead>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'النوع' : 'Type'}
                                    </TableHead>
                                    <TableHead className="font-tajawal hidden md:table-cell">
                                        {language === 'ar' ? 'مخفي عن' : 'Hidden From'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-center">
                                        {language === 'ar' ? 'الحالة' : 'Status'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-end">
                                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredRules.map((rule) => {
                                        const typeConfig = getRuleTypeConfig(rule.rule_type);
                                        const TypeIcon = typeConfig.icon;

                                        return (
                                            <motion.tr
                                                key={rule.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="group hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium font-tajawal">
                                                            {rule.target_name}
                                                        </span>
                                                        {rule.description && (
                                                            <span className="text-xs text-gray-400 font-tajawal">
                                                                {rule.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <TypeIcon className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm font-tajawal">
                                                            {language === 'ar' ? typeConfig.labelAr : typeConfig.labelEn}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="flex flex-wrap gap-1">
                                                        {rule.hidden_from_roles?.slice(0, 2).map((code) => (
                                                            <Badge key={code} variant="destructive" className="text-xs">
                                                                {code}
                                                            </Badge>
                                                        ))}
                                                        {(rule.hidden_from_roles?.length || 0) > 2 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{(rule.hidden_from_roles?.length || 0) - 2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {rule.is_active ? (
                                                        <Badge className="bg-green-100 text-green-700 font-tajawal">
                                                            {language === 'ar' ? 'نشط' : 'Active'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="font-tajawal">
                                                            {language === 'ar' ? 'معطل' : 'Inactive'}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditRule(rule)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteRule(rule)}
                                                            className="text-red-500 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Edit/Create Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="font-tajawal">
                            {editingRule
                                ? (language === 'ar' ? 'تعديل القاعدة' : 'Edit Rule')
                                : (language === 'ar' ? 'إنشاء قاعدة جديدة' : 'Create New Rule')}
                        </SheetTitle>
                        <SheetDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'حدد ما يتم إخفاؤه ومن يتم إخفاؤه عنه'
                                : 'Define what to hide and from whom'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 py-6">
                        {/* Rule Type */}
                        <div className="space-y-2">
                            <Label className="font-tajawal">
                                {language === 'ar' ? 'نوع القاعدة' : 'Rule Type'}
                            </Label>
                            <Select
                                value={formData.rule_type}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, rule_type: value }))}
                            >
                                <SelectTrigger className="font-tajawal">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RULE_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <span className="font-tajawal">
                                                {language === 'ar' ? type.labelAr : type.labelEn}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Target Name */}
                        <div className="space-y-2">
                            <Label className="font-tajawal">
                                {language === 'ar' ? 'اسم الهدف' : 'Target Name'}
                            </Label>
                            <Input
                                value={formData.target_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, target_name: e.target.value }))}
                                placeholder={language === 'ar' ? 'مثال: cost_price' : 'e.g., cost_price'}
                                className="font-mono"
                            />
                            {/* Quick select for common targets */}
                            {COMMON_TARGETS[formData.rule_type as keyof typeof COMMON_TARGETS] && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {COMMON_TARGETS[formData.rule_type as keyof typeof COMMON_TARGETS].map(target => (
                                        <Button
                                            key={target.value}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setFormData(prev => ({ ...prev, target_name: target.value }))}
                                            className="text-xs font-tajawal"
                                        >
                                            {language === 'ar' ? target.labelAr : target.labelEn}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mask Value (optional) */}
                        <div className="space-y-2">
                            <Label className="font-tajawal">
                                {language === 'ar' ? 'قيمة الإخفاء (اختياري)' : 'Mask Value (optional)'}
                            </Label>
                            <Input
                                value={formData.mask_value}
                                onChange={(e) => setFormData(prev => ({ ...prev, mask_value: e.target.value }))}
                                placeholder={language === 'ar' ? 'مثال: *** أو ---' : 'e.g., *** or ---'}
                            />
                            <p className="text-xs text-gray-400 font-tajawal">
                                {language === 'ar'
                                    ? 'ما يظهر بدلاً من القيمة المخفية'
                                    : 'What appears instead of the hidden value'}
                            </p>
                        </div>

                        {/* Hidden From Roles */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <EyeOff className="w-4 h-4" />
                                {language === 'ar' ? 'مخفي عن الأدوار' : 'Hidden From Roles'}
                            </h3>
                            <ScrollArea className="h-40 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {roles.map(role => (
                                        <div
                                            key={role.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`hidden-${role.code}`}
                                                checked={formData.hidden_from_roles.includes(role.code)}
                                                onCheckedChange={() => toggleRoleInList('hidden_from_roles', role.code)}
                                            />
                                            <Label
                                                htmlFor={`hidden-${role.code}`}
                                                className="flex-1 font-tajawal cursor-pointer"
                                            >
                                                {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="font-tajawal">
                                {language === 'ar' ? 'الوصف (اختياري)' : 'Description (optional)'}
                            </Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={language === 'ar' ? 'وصف القاعدة...' : 'Rule description...'}
                                className="font-tajawal"
                            />
                        </div>

                        {/* Active Switch */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div>
                                <Label className="font-tajawal">
                                    {language === 'ar' ? 'القاعدة نشطة' : 'Rule Active'}
                                </Label>
                                <p className="text-xs text-gray-400 font-tajawal">
                                    {language === 'ar'
                                        ? 'تفعيل أو تعطيل هذه القاعدة'
                                        : 'Enable or disable this rule'}
                                </p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                        </div>
                    </div>

                    <SheetFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveRule} disabled={saving} className="gap-2">
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {language === 'ar' ? 'حفظ' : 'Save'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </Card>
    );
}
