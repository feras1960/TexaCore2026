/**
 * RolesManagementTab - تبويب إدارة الأدوار
 * Roles Management Tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
    Shield, Plus, Edit2, Trash2, Copy, Search,
    Crown, Building2, GitBranch, UserCog, Eye,
    Loader2, Check, X, Save, RefreshCw
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { rbacService, Role, AVAILABLE_MODULES, Permission } from '@/services/rbacService';
import { useRBAC } from '@/hooks/useRBAC';

// Role level configuration
const ROLE_LEVELS = [
    { value: 'tenant', labelAr: 'مستوى المستأجر', labelEn: 'Tenant Level', icon: Crown, color: 'orange' },
    { value: 'company', labelAr: 'مستوى الشركة', labelEn: 'Company Level', icon: Building2, color: 'blue' },
    { value: 'branch', labelAr: 'مستوى الفرع', labelEn: 'Branch Level', icon: GitBranch, color: 'green' },
    { value: 'operations', labelAr: 'مستوى العمليات', labelEn: 'Operations Level', icon: UserCog, color: 'purple' },
    { value: 'custom', labelAr: 'مخصص', labelEn: 'Custom', icon: Eye, color: 'gray' },
];

// Permission types
const PERMISSION_TYPES = ['read', 'write', 'delete'] as const;

export default function RolesManagementTab() {
    const { language, direction } = useLanguage();
    const { toast } = useToast();
    const { isPlatformAdmin, isTenantOwner } = useRBAC();

    // State
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name_ar: '',
        name_en: '',
        description: '',
        level: 'operations' as string,
        permissions: {} as Record<string, string[]>,
        visible_modules: ['dashboard'] as string[],
    });

    // Load roles
    const loadRoles = useCallback(async () => {
        try {
            setLoading(true);
            const data = await rbacService.getRoles();
            setRoles(data);
        } catch (error) {
            console.error('Error loading roles:', error);
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل تحميل الأدوار' : 'Failed to load roles',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [language, toast]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    // Filter roles by search
    const filteredRoles = roles.filter(role => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            role.code.toLowerCase().includes(query) ||
            role.name_ar.toLowerCase().includes(query) ||
            (role.name_en?.toLowerCase() || '').includes(query)
        );
    });

    // Open create sheet
    const handleCreateRole = () => {
        setEditingRole(null);
        setFormData({
            code: '',
            name_ar: '',
            name_en: '',
            description: '',
            level: 'operations',
            permissions: {},
            visible_modules: ['dashboard'],
        });
        setIsSheetOpen(true);
    };

    // Open edit sheet
    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setFormData({
            code: role.code,
            name_ar: role.name_ar,
            name_en: role.name_en || '',
            description: role.description || '',
            level: role.level,
            permissions: role.permissions || {},
            visible_modules: (role as any).visible_modules || ['dashboard'],
        });
        setIsSheetOpen(true);
    };

    // Duplicate role
    const handleDuplicateRole = async (role: Role) => {
        try {
            const newCode = `${role.code}_copy`;
            const newNameAr = `${role.name_ar} (نسخة)`;
            await rbacService.duplicateRole(role.id, newCode, newNameAr);
            toast({
                title: language === 'ar' ? 'تم النسخ' : 'Duplicated',
                description: language === 'ar' ? 'تم نسخ الدور بنجاح' : 'Role duplicated successfully',
            });
            loadRoles();
        } catch (error) {
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل نسخ الدور' : 'Failed to duplicate role',
                variant: 'destructive',
            });
        }
    };

    // Delete role
    const handleDeleteRole = async (role: Role) => {
        if (role.is_system || !role.can_be_deleted) {
            toast({
                title: language === 'ar' ? 'غير مسموح' : 'Not Allowed',
                description: language === 'ar' ? 'لا يمكن حذف الأدوار الثابتة' : 'System roles cannot be deleted',
                variant: 'destructive',
            });
            return;
        }

        try {
            await rbacService.deleteRole(role.id);
            toast({
                title: language === 'ar' ? 'تم الحذف' : 'Deleted',
                description: language === 'ar' ? 'تم حذف الدور بنجاح' : 'Role deleted successfully',
            });
            loadRoles();
        } catch (error) {
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل حذف الدور' : 'Failed to delete role',
                variant: 'destructive',
            });
        }
    };

    // Save role
    const handleSaveRole = async () => {
        try {
            setSaving(true);

            // Convert string[] to Permission[] for API
            const typedPermissions = Object.fromEntries(
                Object.entries(formData.permissions).map(([key, value]) => [key, value as Permission[]])
            ) as Record<string, Permission[]>;

            if (editingRole) {
                await rbacService.updateRole(editingRole.id, {
                    name_ar: formData.name_ar,
                    name_en: formData.name_en,
                    description: formData.description,
                    permissions: typedPermissions,
                });
                // Update visible modules separately
                await rbacService.updateRoleVisibleModules(editingRole.id, formData.visible_modules);
            } else {
                await rbacService.createRole({
                    code: formData.code,
                    name_ar: formData.name_ar,
                    name_en: formData.name_en,
                    level: formData.level as any,
                    permissions: typedPermissions,
                });
            }

            toast({
                title: language === 'ar' ? 'تم الحفظ' : 'Saved',
                description: language === 'ar' ? 'تم حفظ الدور بنجاح' : 'Role saved successfully',
            });

            setIsSheetOpen(false);
            loadRoles();
        } catch (error) {
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل حفظ الدور' : 'Failed to save role',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Toggle permission
    const togglePermission = (module: string, permission: string) => {
        setFormData(prev => {
            const currentPerms = prev.permissions[module] || [];
            const newPerms = currentPerms.includes(permission)
                ? currentPerms.filter(p => p !== permission)
                : [...currentPerms, permission];

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [module]: newPerms,
                },
            };
        });
    };

    // Toggle visible module
    const toggleVisibleModule = (moduleCode: string) => {
        setFormData(prev => {
            const current = prev.visible_modules;
            const newModules = current.includes(moduleCode)
                ? current.filter(m => m !== moduleCode)
                : [...current, moduleCode];

            return {
                ...prev,
                visible_modules: newModules.length > 0 ? newModules : ['dashboard'],
            };
        });
    };

    // Get role level config
    const getRoleLevelConfig = (level: string) => {
        return ROLE_LEVELS.find(l => l.value === level) || ROLE_LEVELS[4];
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-tajawal flex items-center gap-2">
                            <Shield className="w-5 h-5 text-erp-teal" />
                            {language === 'ar' ? 'إدارة الأدوار' : 'Roles Management'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'إنشاء وتعديل الأدوار وصلاحياتها'
                                : 'Create and manage roles and their permissions'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadRoles}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button onClick={handleCreateRole} className="gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {language === 'ar' ? 'إضافة دور' : 'Add Role'}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={language === 'ar' ? 'البحث عن دور...' : 'Search roles...'}
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
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'الدور' : 'Role'}
                                    </TableHead>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'المستوى' : 'Level'}
                                    </TableHead>
                                    <TableHead className="font-tajawal hidden md:table-cell">
                                        {language === 'ar' ? 'الموديولات' : 'Modules'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-center">
                                        {language === 'ar' ? 'النوع' : 'Type'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-end">
                                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredRoles.map((role) => {
                                        const levelConfig = getRoleLevelConfig(role.level);
                                        const LevelIcon = levelConfig.icon;
                                        const visibleModules = (role as any).visible_modules || [];

                                        return (
                                            <motion.tr
                                                key={role.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="group hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium font-tajawal">
                                                            {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                                        </span>
                                                        <code className="text-xs text-gray-400">{role.code}</code>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-lg bg-${levelConfig.color}-100 dark:bg-${levelConfig.color}-900/20`}>
                                                            <LevelIcon className={`w-3.5 h-3.5 text-${levelConfig.color}-600`} />
                                                        </div>
                                                        <span className="text-sm font-tajawal hidden sm:inline">
                                                            {language === 'ar' ? levelConfig.labelAr : levelConfig.labelEn}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {visibleModules.slice(0, 3).map((m: string) => (
                                                            <Badge key={m} variant="outline" className="text-xs">
                                                                {m}
                                                            </Badge>
                                                        ))}
                                                        {visibleModules.length > 3 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{visibleModules.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {role.is_system ? (
                                                        <Badge variant="secondary" className="font-tajawal">
                                                            {language === 'ar' ? 'ثابت' : 'System'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="font-tajawal">
                                                            {language === 'ar' ? 'مخصص' : 'Custom'}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditRole(role)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDuplicateRole(role)}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        {!role.is_system && role.can_be_deleted && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteRole(role)}
                                                                className="text-red-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
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
                            {editingRole
                                ? (language === 'ar' ? 'تعديل الدور' : 'Edit Role')
                                : (language === 'ar' ? 'إنشاء دور جديد' : 'Create New Role')}
                        </SheetTitle>
                        <SheetDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'حدد اسم الدور وصلاحياته والموديولات المرئية'
                                : 'Set role name, permissions, and visible modules'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 py-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500">
                                {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                            </h3>

                            {!editingRole && (
                                <div className="space-y-2">
                                    <Label className="font-tajawal">
                                        {language === 'ar' ? 'الكود' : 'Code'}
                                    </Label>
                                    <Input
                                        value={formData.code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                        placeholder="role_code"
                                        className="font-mono"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-tajawal">
                                        {language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
                                    </Label>
                                    <Input
                                        value={formData.name_ar}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                                        placeholder="اسم الدور"
                                        className="font-tajawal"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-tajawal">
                                        {language === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}
                                    </Label>
                                    <Input
                                        value={formData.name_en}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                                        placeholder="Role Name"
                                    />
                                </div>
                            </div>

                            {!editingRole && (
                                <div className="space-y-2">
                                    <Label className="font-tajawal">
                                        {language === 'ar' ? 'المستوى' : 'Level'}
                                    </Label>
                                    <Select
                                        value={formData.level}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                                    >
                                        <SelectTrigger className="font-tajawal">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLE_LEVELS.map(level => (
                                                <SelectItem key={level.value} value={level.value}>
                                                    <span className="font-tajawal">
                                                        {language === 'ar' ? level.labelAr : level.labelEn}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Visible Modules */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500">
                                {language === 'ar' ? 'الموديولات المرئية' : 'Visible Modules'}
                            </h3>
                            <p className="text-xs text-gray-400 font-tajawal">
                                {language === 'ar'
                                    ? 'اختر الموديولات التي ستظهر في الشريط الجانبي لهذا الدور'
                                    : 'Select modules that will appear in sidebar for this role'}
                            </p>
                            <ScrollArea className="h-48 rounded-lg border p-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_MODULES.map(module => (
                                        <div
                                            key={module.code}
                                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`module-${module.code}`}
                                                checked={formData.visible_modules.includes(module.code)}
                                                onCheckedChange={() => toggleVisibleModule(module.code)}
                                            />
                                            <Label
                                                htmlFor={`module-${module.code}`}
                                                className="text-sm font-tajawal cursor-pointer"
                                            >
                                                {language === 'ar' ? module.name_ar : module.name_en}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500">
                                {language === 'ar' ? 'مصفوفة الصلاحيات' : 'Permissions Matrix'}
                            </h3>
                            <ScrollArea className="h-64 rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-tajawal">
                                                {language === 'ar' ? 'الموديول' : 'Module'}
                                            </TableHead>
                                            <TableHead className="text-center">
                                                {language === 'ar' ? 'قراءة' : 'Read'}
                                            </TableHead>
                                            <TableHead className="text-center">
                                                {language === 'ar' ? 'كتابة' : 'Write'}
                                            </TableHead>
                                            <TableHead className="text-center">
                                                {language === 'ar' ? 'حذف' : 'Delete'}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {AVAILABLE_MODULES.map(module => (
                                            <TableRow key={module.code}>
                                                <TableCell className="font-tajawal text-sm">
                                                    {language === 'ar' ? module.name_ar : module.name_en}
                                                </TableCell>
                                                {PERMISSION_TYPES.map(perm => (
                                                    <TableCell key={perm} className="text-center">
                                                        <Checkbox
                                                            checked={(formData.permissions[module.code] || []).includes(perm)}
                                                            onCheckedChange={() => togglePermission(module.code, perm)}
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>

                    <SheetFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveRole} disabled={saving} className="gap-2">
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
