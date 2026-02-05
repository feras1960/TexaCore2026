/**
 * UsersManagementTab - تبويب إدارة المستخدمين
 * Users Management Tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    Users, Search, Edit2, UserPlus, Shield,
    Loader2, Save, RefreshCw, Building2,
    Warehouse, Wallet, GitBranch, Check, X
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { rbacService, Role, UserRole } from '@/services/rbacService';
import { supabase } from '@/lib/supabase';

// User type with roles
interface UserWithDetails {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    company_id?: string;
    branch_id?: string;
    is_active: boolean;
    roles: {
        id: string;
        code: string;
        name_ar: string;
        name_en?: string;
    }[];
}

// Resource type
interface Resource {
    id: string;
    name_ar: string;
    name_en?: string;
    code?: string;
}

export default function UsersManagementTab() {
    const { language, direction } = useLanguage();
    const { toast } = useToast();

    // State
    const [users, setUsers] = useState<UserWithDetails[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Resource[]>([]);
    const [warehouses, setWarehouses] = useState<Resource[]>([]);
    const [funds, setFunds] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        selectedRoles: [] as string[],
        selectedBranches: [] as string[],
        selectedWarehouses: [] as string[],
        selectedFunds: [] as string[],
        primaryBranch: '' as string,
    });

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Load users basic info
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select('id, email, full_name, avatar_url, company_id, branch_id, is_active')
                .order('full_name');

            if (usersError) throw usersError;

            // Load all user_roles separately
            const { data: allUserRoles } = await supabase
                .from('user_roles')
                .select('user_id, role_id')
                .eq('is_active', true);

            // Load all roles
            const { data: allRolesData } = await supabase
                .from('roles')
                .select('id, code, name_ar, name_en');

            // Create a map of roles
            const rolesMap = new Map((allRolesData || []).map(r => [r.id, r]));

            // Create a map of user -> roles
            const userRolesMap = new Map<string, any[]>();
            (allUserRoles || []).forEach(ur => {
                const role = rolesMap.get(ur.role_id);
                if (role) {
                    const existing = userRolesMap.get(ur.user_id) || [];
                    existing.push(role);
                    userRolesMap.set(ur.user_id, existing);
                }
            });

            // Transform data
            const transformedUsers = (usersData || []).map((u: any) => ({
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                avatar_url: u.avatar_url,
                company_id: u.company_id,
                branch_id: u.branch_id,
                is_active: u.is_active !== false,
                roles: userRolesMap.get(u.id) || [],
            }));

            setUsers(transformedUsers);

            // Load roles for dropdown
            const rolesData = await rbacService.getRoles();
            setRoles(rolesData);

            // Load branches
            const { data: branchesData } = await supabase
                .from('branches')
                .select('id, name_ar, name_en, code')
                .eq('is_active', true);
            setBranches(branchesData || []);

            // Load warehouses
            const { data: warehousesData } = await supabase
                .from('warehouses')
                .select('id, name_ar, name_en, code')
                .eq('is_active', true);
            setWarehouses(warehousesData || []);

            // Load funds (cash accounts)
            const { data: fundsData } = await supabase
                .from('chart_of_accounts')
                .select('id, name_ar, name_en, account_code')
                .in('account_type', ['cash', 'bank']);
            setFunds((fundsData || []).map(f => ({
                id: f.id,
                name_ar: f.name_ar,
                name_en: f.name_en,
                code: f.account_code,
            })));

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

    // Filter users by search
    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (user.full_name?.toLowerCase() || '').includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.roles.some(r => r.name_ar.includes(query) || r.code.includes(query))
        );
    });

    // Open edit sheet
    const handleEditUser = async (user: UserWithDetails) => {
        setEditingUser(user);

        // Load user's resource access
        try {
            const resources = await rbacService.getUserAccessibleResources(user.id);

            setFormData({
                selectedRoles: user.roles.map(r => r.id),
                selectedBranches: resources.branch?.map(r => r.resource_id) || [],
                selectedWarehouses: resources.warehouse?.map(r => r.resource_id) || [],
                selectedFunds: resources.cash_account?.map(r => r.resource_id) || [],
                primaryBranch: resources.branch?.find(r => r.is_primary)?.resource_id || '',
            });
        } catch (error) {
            console.error('Error loading user resources:', error);
            setFormData({
                selectedRoles: user.roles.map(r => r.id),
                selectedBranches: [],
                selectedWarehouses: [],
                selectedFunds: [],
                primaryBranch: '',
            });
        }

        setIsSheetOpen(true);
    };

    // Save user permissions
    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            setSaving(true);

            // Update roles
            // First remove all current roles
            const { error: removeError } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', editingUser.id);

            if (removeError) throw removeError;

            // Add new roles
            if (formData.selectedRoles.length > 0) {
                const { error: insertError } = await supabase
                    .from('user_roles')
                    .insert(
                        formData.selectedRoles.map(roleId => ({
                            user_id: editingUser.id,
                            role_id: roleId,
                            is_active: true,
                        }))
                    );

                if (insertError) throw insertError;
            }

            // Update resource access - branches
            await updateResourceAccess(editingUser.id, 'branch', formData.selectedBranches, formData.primaryBranch);

            // Update resource access - warehouses
            await updateResourceAccess(editingUser.id, 'warehouse', formData.selectedWarehouses);

            // Update resource access - funds
            await updateResourceAccess(editingUser.id, 'cash_account', formData.selectedFunds);

            toast({
                title: language === 'ar' ? 'تم الحفظ' : 'Saved',
                description: language === 'ar' ? 'تم تحديث صلاحيات المستخدم' : 'User permissions updated',
            });

            setIsSheetOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving user:', error);
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'فشل حفظ البيانات' : 'Failed to save data',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Helper to update resource access
    const updateResourceAccess = async (
        userId: string,
        resourceType: string,
        resourceIds: string[],
        primaryId?: string
    ) => {
        // Remove existing
        await supabase
            .from('user_resource_access')
            .delete()
            .eq('user_id', userId)
            .eq('resource_type', resourceType);

        // Add new
        if (resourceIds.length > 0) {
            await supabase
                .from('user_resource_access')
                .insert(
                    resourceIds.map(resourceId => ({
                        user_id: userId,
                        resource_type: resourceType,
                        resource_id: resourceId,
                        is_primary: resourceId === primaryId,
                        permissions: { read: true, write: true },
                    }))
                );
        }
    };

    // Toggle role
    const toggleRole = (roleId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedRoles: prev.selectedRoles.includes(roleId)
                ? prev.selectedRoles.filter(id => id !== roleId)
                : [...prev.selectedRoles, roleId],
        }));
    };

    // Toggle resource
    const toggleResource = (type: 'branches' | 'warehouses' | 'funds', resourceId: string) => {
        const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof formData;
        setFormData(prev => {
            const current = prev[key] as string[];
            return {
                ...prev,
                [key]: current.includes(resourceId)
                    ? current.filter(id => id !== resourceId)
                    : [...current, resourceId],
            };
        });
    };

    // Get user initials
    const getUserInitials = (user: UserWithDetails) => {
        if (user.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user.email.slice(0, 2).toUpperCase();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-tajawal flex items-center gap-2">
                            <Users className="w-5 h-5 text-erp-teal" />
                            {language === 'ar' ? 'إدارة المستخدمين' : 'Users Management'}
                        </CardTitle>
                        <CardDescription className="font-tajawal">
                            {language === 'ar'
                                ? 'تعيين الأدوار وربط الموارد للمستخدمين'
                                : 'Assign roles and link resources to users'}
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={language === 'ar' ? 'البحث عن مستخدم...' : 'Search users...'}
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
                                        {language === 'ar' ? 'المستخدم' : 'User'}
                                    </TableHead>
                                    <TableHead className="font-tajawal">
                                        {language === 'ar' ? 'الأدوار' : 'Roles'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-center hidden md:table-cell">
                                        {language === 'ar' ? 'الحالة' : 'Status'}
                                    </TableHead>
                                    <TableHead className="font-tajawal text-end">
                                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredUsers.map((user) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback className="bg-erp-navy text-white text-sm">
                                                            {getUserInitials(user)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium font-tajawal truncate">
                                                            {user.full_name || user.email}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.slice(0, 2).map((role) => (
                                                        <Badge key={role.id} variant="outline" className="text-xs font-tajawal">
                                                            {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                                        </Badge>
                                                    ))}
                                                    {user.roles.length > 2 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{user.roles.length - 2}
                                                        </Badge>
                                                    )}
                                                    {user.roles.length === 0 && (
                                                        <span className="text-xs text-gray-400 font-tajawal">
                                                            {language === 'ar' ? 'بدون دور' : 'No role'}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center hidden md:table-cell">
                                                {user.is_active ? (
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
                                                <div className="flex items-center justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditUser(user)}
                                                        className="gap-2"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        <span className="hidden sm:inline font-tajawal">
                                                            {language === 'ar' ? 'تعديل' : 'Edit'}
                                                        </span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Edit Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="font-tajawal">
                            {language === 'ar' ? 'تعديل صلاحيات المستخدم' : 'Edit User Permissions'}
                        </SheetTitle>
                        <SheetDescription className="font-tajawal">
                            {editingUser?.full_name || editingUser?.email}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 py-6">
                        {/* Roles */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                {language === 'ar' ? 'الأدوار' : 'Roles'}
                            </h3>
                            <ScrollArea className="h-48 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {roles.map(role => (
                                        <div
                                            key={role.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={formData.selectedRoles.includes(role.id)}
                                                onCheckedChange={() => toggleRole(role.id)}
                                            />
                                            <Label
                                                htmlFor={`role-${role.id}`}
                                                className="flex-1 cursor-pointer"
                                            >
                                                <span className="font-tajawal">
                                                    {language === 'ar' ? role.name_ar : role.name_en || role.name_ar}
                                                </span>
                                                <code className="text-xs text-gray-400 ms-2">{role.code}</code>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Branches */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <GitBranch className="w-4 h-4" />
                                {language === 'ar' ? 'الفروع' : 'Branches'}
                            </h3>
                            <ScrollArea className="h-36 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {branches.map(branch => (
                                        <div
                                            key={branch.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`branch-${branch.id}`}
                                                checked={formData.selectedBranches.includes(branch.id)}
                                                onCheckedChange={() => toggleResource('branches', branch.id)}
                                            />
                                            <Label
                                                htmlFor={`branch-${branch.id}`}
                                                className="flex-1 font-tajawal cursor-pointer"
                                            >
                                                {language === 'ar' ? branch.name_ar : branch.name_en || branch.name_ar}
                                            </Label>
                                            {formData.selectedBranches.includes(branch.id) && (
                                                <Button
                                                    variant={formData.primaryBranch === branch.id ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setFormData(prev => ({ ...prev, primaryBranch: branch.id }))}
                                                    className="text-xs"
                                                >
                                                    {language === 'ar' ? 'رئيسي' : 'Primary'}
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {branches.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4 font-tajawal">
                                            {language === 'ar' ? 'لا توجد فروع' : 'No branches'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Warehouses */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Warehouse className="w-4 h-4" />
                                {language === 'ar' ? 'المستودعات' : 'Warehouses'}
                            </h3>
                            <ScrollArea className="h-36 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {warehouses.map(warehouse => (
                                        <div
                                            key={warehouse.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`warehouse-${warehouse.id}`}
                                                checked={formData.selectedWarehouses.includes(warehouse.id)}
                                                onCheckedChange={() => toggleResource('warehouses', warehouse.id)}
                                            />
                                            <Label
                                                htmlFor={`warehouse-${warehouse.id}`}
                                                className="flex-1 font-tajawal cursor-pointer"
                                            >
                                                {language === 'ar' ? warehouse.name_ar : warehouse.name_en || warehouse.name_ar}
                                            </Label>
                                        </div>
                                    ))}
                                    {warehouses.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4 font-tajawal">
                                            {language === 'ar' ? 'لا توجد مستودعات' : 'No warehouses'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Funds */}
                        <div className="space-y-4">
                            <h3 className="font-semibold font-tajawal text-sm text-gray-500 flex items-center gap-2">
                                <Wallet className="w-4 h-4" />
                                {language === 'ar' ? 'الصناديق والبنوك' : 'Cash & Banks'}
                            </h3>
                            <ScrollArea className="h-36 rounded-lg border p-3">
                                <div className="space-y-2">
                                    {funds.map(fund => (
                                        <div
                                            key={fund.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <Checkbox
                                                id={`fund-${fund.id}`}
                                                checked={formData.selectedFunds.includes(fund.id)}
                                                onCheckedChange={() => toggleResource('funds', fund.id)}
                                            />
                                            <Label
                                                htmlFor={`fund-${fund.id}`}
                                                className="flex-1 font-tajawal cursor-pointer"
                                            >
                                                {language === 'ar' ? fund.name_ar : fund.name_en || fund.name_ar}
                                                <code className="text-xs text-gray-400 ms-2">{fund.code}</code>
                                            </Label>
                                        </div>
                                    ))}
                                    {funds.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4 font-tajawal">
                                            {language === 'ar' ? 'لا توجد صناديق' : 'No funds'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <SheetFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveUser} disabled={saving} className="gap-2">
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
