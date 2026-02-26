/**
 * RolesManagementTab - تبويب مجموعات المستخدمين (الأدوار)
 * User Groups (Roles) Management Tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
    Shield, Plus, Edit2, Trash2, Copy, Search,
    Crown, Building2, GitBranch, UserCog, Eye,
    Loader2, Check, X, Save, RefreshCw, Zap, Lock
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logAuditEvent } from '@/features/users-permissions/components/AuditLogTab';
import {
    rbacService, Role, AVAILABLE_MODULES, Permission,
    SpecialPermissionKey, SPECIAL_PERMISSIONS_KEYS, SpecialPermissions
} from '@/services/rbacService';

// ─── Role Configuration ──────────────────────────────────────
// Platform/system roles — NEVER shown to subscribers
const HIDDEN_ROLE_CODES = ['super_admin', 'support', 'support_senior', 'tenant_admin'];

// Fix: some roles have wrong level='tenant' in DB due to migration bug
// This map corrects the display level in the frontend
const ROLE_LEVEL_FIX: Record<string, string> = {
    auditor: 'special',
    purchaser: 'operations',
    employee: 'operations',
    driver: 'operations',
    agent: 'operations',
};

// Sort priority: المالك → مالك الشركة → مدير الشركة → مدير الفرع → عمليات → مخصص
const ROLE_SORT_PRIORITY: Record<string, number> = {
    tenant: 0,      // المالك (tenant_owner)
    company: 1,     // مالك الشركة / مدير الشركة
    branch: 2,      // مدير الفرع
    operations: 3,  // محاسب / أمين صندوق / أمين مستودع...
    custom: 4,      // مخصص / مشاهد
    special: 5,     // مدقق
};

// Secondary sort within same level (by code)
const ROLE_CODE_ORDER: Record<string, number> = {
    tenant_owner: 0,
    company_owner: 1,
    company_admin: 2,
    branch_manager: 3,
    accountant: 4,
    cashier: 5,
    warehouse_keeper: 6,
    sales_rep: 7,
    purchaser: 8,
    viewer: 9,
    employee: 10,
    auditor: 11,
    driver: 12,
    agent: 13,
};

// Protected roles — can be VIEWED (click to see details) but NOT deleted
const PROTECTED_ROLE_CODES = ['tenant_owner', 'company_owner'];

// ─── Special Permissions Config ─────────────────────────────────
const SPECIAL_PERMS_CONFIG: { key: SpecialPermissionKey; labelAr: string; labelEn: string; category: string }[] = [
    { key: 'can_edit_posted_purchase', labelAr: 'تعديل فاتورة شراء مرحّلة', labelEn: 'Edit posted purchase', category: 'documents' },
    { key: 'can_edit_posted_sale', labelAr: 'تعديل فاتورة بيع مرحّلة', labelEn: 'Edit posted sale', category: 'documents' },
    { key: 'can_edit_posted_journal', labelAr: 'تعديل قيد مرحّل', labelEn: 'Edit posted journal', category: 'documents' },
    { key: 'can_delete_posted', labelAr: 'حذف مستند مرحّل', labelEn: 'Delete posted document', category: 'documents' },
    { key: 'can_unpost', labelAr: 'إلغاء ترحيل', labelEn: 'Unpost document', category: 'documents' },
    { key: 'can_edit_closed_period', labelAr: 'تعديل في فترة مقفلة', labelEn: 'Edit closed period', category: 'accounting' },
    { key: 'can_view_audit_log', labelAr: 'عرض سجل المراجعة', labelEn: 'View audit log', category: 'system' },
    { key: 'can_view_all_branches', labelAr: 'رؤية كل الفروع', labelEn: 'View all branches', category: 'system' },
    { key: 'can_manage_roles', labelAr: 'إدارة الأدوار', labelEn: 'Manage roles', category: 'system' },
    { key: 'can_approve_transactions', labelAr: 'موافقة على المعاملات', labelEn: 'Approve transactions', category: 'operations' },
    { key: 'can_view_cost_prices', labelAr: 'رؤية أسعار التكلفة', labelEn: 'View cost prices', category: 'financial' },
    { key: 'can_view_profit_margins', labelAr: 'رؤية هوامش الربح', labelEn: 'View profit margins', category: 'financial' },
    { key: 'can_export_data', labelAr: 'تصدير البيانات', labelEn: 'Export data', category: 'operations' },
    { key: 'can_manage_containers', labelAr: 'إدارة الكونتينرات', labelEn: 'Manage containers', category: 'operations' },
];

// Role level configuration
const ROLE_LEVELS = [
    { value: 'tenant', labelAr: 'المالك', labelEn: 'Owner', icon: Crown, color: 'amber' },
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
    const { authUser } = useAuth();
    const tenantId = authUser?.tenant_id;

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
        special_permissions: {} as SpecialPermissions,
    });

    // Load roles — sorted by hierarchy
    const loadRoles = useCallback(async () => {
        try {
            setLoading(true);
            const allRoles = await rbacService.getRoles(
                tenantId ? { tenant_id: tenantId } : undefined
            );

            // Step 1: Fix wrong levels from DB migration bug
            const fixedRoles = allRoles.map(r => ({
                ...r,
                level: (ROLE_LEVEL_FIX[r.code] || r.level) as typeof r.level,
            }));

            // Step 2: Hide platform roles, show everything else
            const visibleRoles = fixedRoles
                .filter(r => !HIDDEN_ROLE_CODES.includes(r.code))
                .sort((a, b) => {
                    // Sort by level priority first
                    const pa = ROLE_SORT_PRIORITY[a.level] ?? 99;
                    const pb = ROLE_SORT_PRIORITY[b.level] ?? 99;
                    if (pa !== pb) return pa - pb;
                    // Then by specific code order within same level
                    const ca = ROLE_CODE_ORDER[a.code] ?? 50;
                    const cb = ROLE_CODE_ORDER[b.code] ?? 50;
                    return ca - cb;
                });
            setRoles(visibleRoles);
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
    }, [language, toast, tenantId]);

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
            special_permissions: {},
        });
        setIsSheetOpen(true);
    };

    // Open edit sheet
    const handleEditRole = (role: Role) => {
        setEditingRole(role);

        // For protected roles (tenant_owner, company_owner): enforce FULL access
        const isProtected = PROTECTED_ROLE_CODES.includes(role.code);

        if (isProtected) {
            // All modules visible
            const allModules = AVAILABLE_MODULES.map(m => m.code);
            // All permissions: read + write + delete for every module
            const allPermissions: Record<string, string[]> = {};
            AVAILABLE_MODULES.forEach(m => {
                allPermissions[m.code] = ['read', 'write', 'delete'];
            });
            // All special permissions true
            const allSpecialPerms: SpecialPermissions = {} as SpecialPermissions;
            SPECIAL_PERMS_CONFIG.forEach(p => {
                allSpecialPerms[p.key] = true;
            });

            setFormData({
                code: role.code,
                name_ar: role.name_ar,
                name_en: role.name_en || '',
                description: role.description || '',
                level: role.level,
                permissions: allPermissions,
                visible_modules: allModules,
                special_permissions: allSpecialPerms,
            });
        } else {
            setFormData({
                code: role.code,
                name_ar: role.name_ar,
                name_en: role.name_en || '',
                description: role.description || '',
                level: role.level,
                permissions: role.permissions || {},
                visible_modules: (role as any).visible_modules || ['dashboard'],
                special_permissions: (role as any).special_permissions || {},
            });
        }

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
                    special_permissions: formData.special_permissions,
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
                    special_permissions: formData.special_permissions,
                });
            }

            toast({
                title: language === 'ar' ? 'تم الحفظ' : 'Saved',
                description: language === 'ar' ? 'تم حفظ الدور بنجاح' : 'Role saved successfully',
            });

            // Audit log
            logAuditEvent({
                action: editingRole ? 'update_role' : 'create_role',
                entity_type: 'roles',
                entity_id: editingRole?.id,
                entity_name: formData.name_ar || formData.code,
                new_values: {
                    code: formData.code,
                    modules: formData.visible_modules.length,
                    permissions: Object.keys(formData.permissions).length,
                },
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
                            {language === 'ar' ? 'مجموعات المستخدمين' : 'User Groups'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'إدارة مجموعات المستخدمين وصلاحياتهم والموديولات المرئية'
                                : 'Manage user groups, permissions, and visible modules'}
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
                                {language === 'ar' ? 'إضافة مجموعة' : 'Add Group'}
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
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium font-tajawal">
                                                            {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-xs text-gray-400">{role.code}</code>
                                                            {role.code === 'tenant_owner' && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700 font-tajawal">
                                                                    {language === 'ar' ? 'كل الشركات' : 'All Companies'}
                                                                </Badge>
                                                            )}
                                                            {role.code === 'company_owner' && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700 font-tajawal">
                                                                    {language === 'ar' ? 'الشركة المحددة' : 'Selected Company'}
                                                                </Badge>
                                                            )}
                                                        </div>
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
                                                        {/* View/Edit button — protected roles can be viewed */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditRole(role)}
                                                            title={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
                                                        >
                                                            {PROTECTED_ROLE_CODES.includes(role.code) ? (
                                                                <Eye className="w-4 h-4 text-teal-600" />
                                                            ) : (
                                                                <Edit2 className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                        {/* Copy — available for all */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDuplicateRole(role)}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        {/* Delete — NOT available for protected or system roles */}
                                                        {!PROTECTED_ROLE_CODES.includes(role.code) && !role.is_system && role.can_be_deleted && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteRole(role)}
                                                                className="text-red-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {/* Lock indicator for protected roles */}
                                                        {PROTECTED_ROLE_CODES.includes(role.code) && (
                                                            <Lock className="w-3.5 h-3.5 text-amber-500" />
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
                    {(() => {
                        const isProtectedRole = editingRole ? PROTECTED_ROLE_CODES.includes(editingRole.code) : false;
                        return (
                            <>
                                <SheetHeader>
                                    <SheetTitle className="font-tajawal">
                                        {editingRole
                                            ? (isProtectedRole
                                                ? (language === 'ar' ? 'عرض الدور' : 'View Role')
                                                : (language === 'ar' ? 'تعديل الدور' : 'Edit Role'))
                                            : (language === 'ar' ? 'إنشاء دور جديد' : 'Create New Role')}
                                    </SheetTitle>
                                    <SheetDescription className="font-tajawal">
                                        {isProtectedRole
                                            ? (language === 'ar'
                                                ? 'هذا الدور محمي — يملك صلاحيات كاملة على كل الموديولات'
                                                : 'This role is protected — it has full access to all modules')
                                            : (language === 'ar'
                                                ? 'حدد اسم الدور وصلاحياته والموديولات المرئية'
                                                : 'Set role name, permissions, and visible modules')}
                                    </SheetDescription>
                                </SheetHeader>

                                {/* Protected role info banner */}
                                {isProtectedRole && (
                                    <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-tajawal">
                                            {language === 'ar'
                                                ? '✅ كل الموديولات مفعلة • كل الصلاحيات مفعلة • كل الصلاحيات الخاصة مفعلة'
                                                : '✅ All modules enabled • All permissions granted • All special permissions active'}
                                        </span>
                                    </div>
                                )}

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
                                                            disabled={isProtectedRole}
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
                                                                        disabled={isProtectedRole}
                                                                    />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>

                                    {/* ─── Special Permissions ─────────────────────── */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            {language === 'ar' ? 'صلاحيات خاصة' : 'Special Permissions'}
                                        </h3>
                                        <p className="text-xs text-gray-400 font-tajawal">
                                            {language === 'ar'
                                                ? 'صلاحيات متقدمة للتحكم بعمليات حساسة مثل تعديل المرحّل وحذفه'
                                                : 'Advanced permissions for sensitive operations like editing posted documents'}
                                        </p>
                                        <ScrollArea className="h-56 rounded-lg border p-3">
                                            <div className="space-y-2">
                                                {SPECIAL_PERMS_CONFIG.map(perm => (
                                                    <div
                                                        key={perm.key}
                                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    >
                                                        <Label
                                                            htmlFor={`sp-${perm.key}`}
                                                            className="text-sm font-tajawal cursor-pointer flex-1"
                                                        >
                                                            {language === 'ar' ? perm.labelAr : perm.labelEn}
                                                        </Label>
                                                        <Switch
                                                            id={`sp-${perm.key}`}
                                                            checked={formData.special_permissions[perm.key] === true}
                                                            disabled={isProtectedRole}
                                                            onCheckedChange={(checked) => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    special_permissions: {
                                                                        ...prev.special_permissions,
                                                                        [perm.key]: checked,
                                                                    },
                                                                }));
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>

                                <SheetFooter className="gap-2">
                                    <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                                        {isProtectedRole
                                            ? (language === 'ar' ? 'إغلاق' : 'Close')
                                            : (language === 'ar' ? 'إلغاء' : 'Cancel')}
                                    </Button>
                                    {!isProtectedRole && (
                                        <Button onClick={handleSaveRole} disabled={saving} className="gap-2">
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            {language === 'ar' ? 'حفظ' : 'Save'}
                                        </Button>
                                    )}
                                </SheetFooter>
                            </>
                        );
                    })()}
                </SheetContent>
            </Sheet>
        </Card>
    );
}
