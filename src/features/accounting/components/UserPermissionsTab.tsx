/**
 * UserPermissionsTab - تبويب إدارة المستخدمين والصلاحيات
 * User & Permissions Management Tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Users, Shield, UserPlus, Search, MoreVertical, Edit2, Trash2,
    Building2, Wallet, Warehouse, GitBranch, Crown, UserCog,
    ShieldCheck, ShieldAlert, Eye, EyeOff, RefreshCw, Loader2,
    CheckCircle2, XCircle, AlertTriangle, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Types
interface Role {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    permissions: Record<string, any>;
    is_system: boolean;
}

interface UserWithRoles {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    roles: {
        role_id: string;
        role_code: string;
        role_name: string;
        is_active: boolean;
    }[];
    fund_permissions: {
        fund_account_id: string;
        fund_name: string;
        can_deposit: boolean;
        can_withdraw: boolean;
        is_primary: boolean;
    }[];
    warehouse_permissions: {
        warehouse_id: string;
        warehouse_name: string;
        is_keeper: boolean;
        can_receive: boolean;
        can_issue: boolean;
    }[];
    branch_permissions: {
        branch_id: string;
        branch_name: string;
        is_primary: boolean;
        can_manage: boolean;
    }[];
}

interface Fund {
    id: string;
    name_ar: string;
    name_en?: string;
    account_code: string;
    account_type: string;
}

interface WarehouseOption {
    id: string;
    name_ar: string;
    name_en?: string;
    code: string;
}

interface Branch {
    id: string;
    name_ar: string;
    name_en?: string;
    code: string;
}

// Role level colors and icons
const roleLevelConfig: Record<string, { color: string; icon: React.ReactNode; bgColor: string }> = {
    tenant: { color: 'text-orange-600', icon: <Crown className="w-4 h-4" />, bgColor: 'bg-orange-100' },
    company: { color: 'text-yellow-600', icon: <Building2 className="w-4 h-4" />, bgColor: 'bg-yellow-100' },
    branch: { color: 'text-green-600', icon: <GitBranch className="w-4 h-4" />, bgColor: 'bg-green-100' },
    operations: { color: 'text-blue-600', icon: <UserCog className="w-4 h-4" />, bgColor: 'bg-blue-100' },
    special: { color: 'text-purple-600', icon: <Eye className="w-4 h-4" />, bgColor: 'bg-purple-100' },
};

export default function UserPermissionsTab() {
    const { t, language, direction } = useLanguage();
    const { toast } = useToast();
    const isRTL = direction === 'rtl';

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [funds, setFunds] = useState<Fund[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Sheet
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
    const [editFormData, setEditFormData] = useState({
        selectedRoles: [] as string[],
        fundPermissions: [] as { fund_id: string; can_deposit: boolean; can_withdraw: boolean; is_primary: boolean }[],
        warehousePermissions: [] as { warehouse_id: string; is_keeper: boolean; can_receive: boolean; can_issue: boolean }[],
        branchPermissions: [] as { branch_id: string; can_manage: boolean; is_primary: boolean }[],
    });

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Load all available roles (for assignment)
            // Load roles by is_system flag or all roles as fallback
            let rolesData: any[] = [];
            try {
                // First try loading system roles or accessible roles
                const { data: systemRoles, error: rolesError } = await supabase
                    .from('roles')
                    .select('*')
                    .order('code');

                if (!rolesError && systemRoles && systemRoles.length > 0) {
                    rolesData = systemRoles;
                }
            } catch (e) {
                console.warn('Could not load roles:', e);
            }
            setRoles(rolesData);

            // Load users with their profiles
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select(`
          id,
          full_name,
          avatar_url,
          email
        `)
                .order('full_name');

            if (usersError) throw usersError;

            // Try to load user roles (table may not exist in all environments)
            let userRolesData: any[] = [];
            try {
                const { data: urData, error: urError } = await supabase
                    .from('user_roles')
                    .select('user_id, role_id');

                if (!urError && urData && urData.length > 0) {
                    // Load roles separately for lookup
                    const roleIds = [...new Set(urData.map(ur => ur.role_id))];
                    const { data: rolesLookup } = await supabase
                        .from('roles')
                        .select('id, code, name_ar, name_en')
                        .in('id', roleIds);

                    // Create lookup map
                    const rolesMap = new Map((rolesLookup || []).map(r => [r.id, r]));

                    // Combine data
                    userRolesData = urData.map(ur => ({
                        ...ur,
                        is_active: true,
                        roles: rolesMap.get(ur.role_id) || { code: '', name_ar: '', name_en: '' }
                    }));
                } else if (urError) {
                    console.warn('user_roles table may not exist:', urError.message);
                }
            } catch (e) {
                // Silently handle - user_roles table may not be created yet
                console.warn('Could not load user_roles (table may not exist yet)');
            }

            // Load funds (cash/bank accounts) - use cash_accounts table
            let fundsData: any[] = [];
            try {
                // First try cash_accounts table (proper treasury module)
                const { data: cashData, error: cashError } = await supabase
                    .from('cash_accounts')
                    .select('id, name_ar, name_en, code, account_type');

                if (!cashError && cashData && cashData.length > 0) {
                    fundsData = cashData.map(acc => ({
                        id: acc.id,
                        name_ar: acc.name_ar,
                        name_en: acc.name_en,
                        account_code: acc.code,
                        account_type: acc.account_type
                    }));
                } else {
                    // Fallback to chart_of_accounts
                    const { data, error } = await supabase
                        .from('chart_of_accounts')
                        .select('id, name_ar, name_en, account_code, is_cash_account, is_bank_account')
                        .or('is_cash_account.eq.true,is_bank_account.eq.true');
                    if (!error) {
                        fundsData = (data || []).map(acc => ({
                            ...acc,
                            account_type: acc.is_cash_account ? 'cash' : 'bank'
                        }));
                    }
                }
            } catch (e) {
                console.warn('Could not load funds:', e);
            }
            setFunds(fundsData);

            // Load warehouses
            let warehousesData: any[] = [];
            try {
                const { data, error } = await supabase
                    .from('warehouses')
                    .select('id, name_ar, name_en, code');
                if (!error) warehousesData = data || [];
            } catch (e) {
                console.warn('Could not load warehouses:', e);
            }
            setWarehouses(warehousesData);

            // Load branches
            let branchesData: any[] = [];
            try {
                const { data, error } = await supabase
                    .from('branches')
                    .select('id, name_ar, name_en, code');
                if (!error) branchesData = data || [];
            } catch (e) {
                console.warn('Could not load branches:', e);
            }
            setBranches(branchesData);

            // Combine users with their roles
            const usersWithRoles: UserWithRoles[] = (usersData || []).map(user => {
                const userRoles = userRolesData
                    .filter(ur => ur.user_id === user.id)
                    .map(ur => ({
                        role_id: ur.role_id,
                        role_code: (ur.roles as any)?.code || '',
                        role_name: (ur.roles as any)?.name_ar || '',
                        is_active: ur.is_active ?? true,
                    }));

                return {
                    ...user,
                    roles: userRoles,
                    fund_permissions: [],
                    warehouse_permissions: [],
                    branch_permissions: [],
                };
            });

            setUsers(usersWithRoles);

        } catch (error: any) {
            console.error('Error loading data:', error);
            toast({
                variant: 'destructive',
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [language, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Open edit sheet
    const handleEditUser = async (user: UserWithRoles) => {
        setSelectedUser(user);

        // Load detailed permissions
        const [fundPerms, warehousePerms, branchPerms] = await Promise.all([
            supabase.from('user_fund_permissions').select('*').eq('user_id', user.id),
            supabase.from('user_warehouse_permissions').select('*').eq('user_id', user.id),
            supabase.from('user_branch_permissions').select('*').eq('user_id', user.id),
        ]);

        setEditFormData({
            selectedRoles: user.roles.filter(r => r.is_active).map(r => r.role_id),
            fundPermissions: (fundPerms.data || []).map(fp => ({
                fund_id: fp.fund_account_id,
                can_deposit: fp.can_deposit,
                can_withdraw: fp.can_withdraw,
                is_primary: fp.is_primary,
            })),
            warehousePermissions: (warehousePerms.data || []).map(wp => ({
                warehouse_id: wp.warehouse_id,
                is_keeper: wp.is_keeper,
                can_receive: wp.can_receive,
                can_issue: wp.can_issue,
            })),
            branchPermissions: (branchPerms.data || []).map(bp => ({
                branch_id: bp.branch_id,
                can_manage: bp.can_manage,
                is_primary: bp.is_primary,
            })),
        });

        setEditSheetOpen(true);
    };

    // Save user permissions
    const handleSavePermissions = async () => {
        if (!selectedUser) return;

        try {
            setSaving(true);

            // Get tenant_id
            const { data: userData } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('id', selectedUser.id)
                .single();

            const tenantId = userData?.tenant_id;

            // Update roles
            // First, deactivate all current roles
            await supabase
                .from('user_roles')
                .update({ is_active: false })
                .eq('user_id', selectedUser.id);

            // Then, insert/activate selected roles
            for (const roleId of editFormData.selectedRoles) {
                await supabase
                    .from('user_roles')
                    .upsert({
                        user_id: selectedUser.id,
                        role_id: roleId,
                        tenant_id: tenantId,
                        is_active: true,
                    }, {
                        onConflict: 'user_id,role_id',
                    });
            }

            // Update fund permissions
            await supabase
                .from('user_fund_permissions')
                .delete()
                .eq('user_id', selectedUser.id);

            if (editFormData.fundPermissions.length > 0) {
                await supabase
                    .from('user_fund_permissions')
                    .insert(editFormData.fundPermissions.map(fp => ({
                        tenant_id: tenantId,
                        user_id: selectedUser.id,
                        fund_account_id: fp.fund_id,
                        can_view: true,
                        can_deposit: fp.can_deposit,
                        can_withdraw: fp.can_withdraw,
                        is_primary: fp.is_primary,
                    })));
            }

            // Update warehouse permissions
            await supabase
                .from('user_warehouse_permissions')
                .delete()
                .eq('user_id', selectedUser.id);

            if (editFormData.warehousePermissions.length > 0) {
                await supabase
                    .from('user_warehouse_permissions')
                    .insert(editFormData.warehousePermissions.map(wp => ({
                        tenant_id: tenantId,
                        user_id: selectedUser.id,
                        warehouse_id: wp.warehouse_id,
                        can_view: true,
                        can_receive: wp.can_receive,
                        can_issue: wp.can_issue,
                        is_keeper: wp.is_keeper,
                    })));
            }

            // Update branch permissions
            await supabase
                .from('user_branch_permissions')
                .delete()
                .eq('user_id', selectedUser.id);

            if (editFormData.branchPermissions.length > 0) {
                await supabase
                    .from('user_branch_permissions')
                    .insert(editFormData.branchPermissions.map(bp => ({
                        tenant_id: tenantId,
                        user_id: selectedUser.id,
                        branch_id: bp.branch_id,
                        can_access: true,
                        can_manage: bp.can_manage,
                        is_primary: bp.is_primary,
                    })));
            }

            toast({
                title: language === 'ar' ? 'تم الحفظ' : 'Saved',
                description: language === 'ar' ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully',
            });

            setEditSheetOpen(false);
            loadData();

        } catch (error: any) {
            console.error('Error saving permissions:', error);
            toast({
                variant: 'destructive',
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: error.message,
            });
        } finally {
            setSaving(false);
        }
    };

    // Get role level from permissions
    const getRoleLevel = (role: Role): string => {
        return role.permissions?.level || 'operations';
    };

    // Filter users by search
    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            user.full_name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.roles.some(r => r.role_name.toLowerCase().includes(query))
        );
    });

    // Toggle fund permission
    const toggleFundPermission = (fundId: string) => {
        const exists = editFormData.fundPermissions.find(fp => fp.fund_id === fundId);
        if (exists) {
            setEditFormData(prev => ({
                ...prev,
                fundPermissions: prev.fundPermissions.filter(fp => fp.fund_id !== fundId),
            }));
        } else {
            setEditFormData(prev => ({
                ...prev,
                fundPermissions: [...prev.fundPermissions, { fund_id: fundId, can_deposit: true, can_withdraw: true, is_primary: false }],
            }));
        }
    };

    // Toggle warehouse permission
    const toggleWarehousePermission = (warehouseId: string) => {
        const exists = editFormData.warehousePermissions.find(wp => wp.warehouse_id === warehouseId);
        if (exists) {
            setEditFormData(prev => ({
                ...prev,
                warehousePermissions: prev.warehousePermissions.filter(wp => wp.warehouse_id !== warehouseId),
            }));
        } else {
            setEditFormData(prev => ({
                ...prev,
                warehousePermissions: [...prev.warehousePermissions, { warehouse_id: warehouseId, is_keeper: false, can_receive: true, can_issue: true }],
            }));
        }
    };

    // Toggle branch permission
    const toggleBranchPermission = (branchId: string) => {
        const exists = editFormData.branchPermissions.find(bp => bp.branch_id === branchId);
        if (exists) {
            setEditFormData(prev => ({
                ...prev,
                branchPermissions: prev.branchPermissions.filter(bp => bp.branch_id !== branchId),
            }));
        } else {
            setEditFormData(prev => ({
                ...prev,
                branchPermissions: [...prev.branchPermissions, { branch_id: branchId, can_manage: false, is_primary: false }],
            }));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">
                        {language === 'ar' ? 'المستخدمين والصلاحيات' : 'Users & Permissions'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {language === 'ar'
                            ? 'إدارة صلاحيات المستخدمين والوصول للصناديق والمستودعات'
                            : 'Manage user permissions and access to funds and warehouses'
                        }
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder={language === 'ar' ? 'بحث عن مستخدم...' : 'Search users...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Roles Legend */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {language === 'ar' ? 'مستويات الأدوار' : 'Role Levels'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                            <Crown className="w-3 h-3 mr-1" />
                            {language === 'ar' ? 'مستأجر' : 'Tenant'}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                            <Building2 className="w-3 h-3 mr-1" />
                            {language === 'ar' ? 'شركة' : 'Company'}
                        </Badge>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            <GitBranch className="w-3 h-3 mr-1" />
                            {language === 'ar' ? 'فرع' : 'Branch'}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            <UserCog className="w-3 h-3 mr-1" />
                            {language === 'ar' ? 'عمليات' : 'Operations'}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                            <Eye className="w-3 h-3 mr-1" />
                            {language === 'ar' ? 'خاص' : 'Special'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Users List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {language === 'ar' ? 'المستخدمين' : 'Users'}
                        <Badge variant="secondary">{filteredUsers.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {language === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                                        </div>

                                        {/* User Info */}
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {user.full_name || user.email}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>

                                            {/* Roles */}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {user.roles.filter(r => r.is_active).map(role => {
                                                    const roleData = roles.find(r => r.id === role.role_id);
                                                    const level = roleData ? getRoleLevel(roleData) : 'operations';
                                                    const config = roleLevelConfig[level] || roleLevelConfig.operations;

                                                    return (
                                                        <Badge
                                                            key={role.role_id}
                                                            variant="outline"
                                                            className={`text-xs ${config.bgColor} ${config.color}`}
                                                        >
                                                            {config.icon}
                                                            <span className="mr-1">{role.role_name}</span>
                                                        </Badge>
                                                    );
                                                })}
                                                {user.roles.filter(r => r.is_active).length === 0 && (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        {language === 'ar' ? 'لا توجد أدوار' : 'No roles'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditUser(user)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        {language === 'ar' ? 'تعديل' : 'Edit'}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Sheet */}
            <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
                <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            {language === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                        </SheetTitle>
                        <SheetDescription>
                            {selectedUser?.full_name || selectedUser?.email}
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="h-[calc(100vh-200px)] mt-6">
                        <div className="space-y-6 pr-4">
                            {/* Roles Section */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    {language === 'ar' ? 'الأدوار' : 'Roles'}
                                </Label>
                                {roles.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'ar' ? 'لا توجد أدوار متاحة' : 'No roles available'}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {roles.map(role => {
                                            const level = getRoleLevel(role);
                                            const config = roleLevelConfig[level] || roleLevelConfig.operations;
                                            const isSelected = editFormData.selectedRoles.includes(role.id);

                                            return (
                                                <div
                                                    key={role.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/5'
                                                        }`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setEditFormData(prev => ({
                                                                ...prev,
                                                                selectedRoles: prev.selectedRoles.filter(id => id !== role.id),
                                                            }));
                                                        } else {
                                                            setEditFormData(prev => ({
                                                                ...prev,
                                                                selectedRoles: [...prev.selectedRoles, role.id],
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                                                            {config.icon}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{role.name_ar}</div>
                                                            <div className="text-xs text-muted-foreground">{role.name_en}</div>
                                                        </div>
                                                    </div>
                                                    <Checkbox checked={isSelected} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Funds Section */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    {language === 'ar' ? 'الصناديق والبنوك' : 'Funds & Banks'}
                                </Label>
                                {funds.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'ar' ? 'لا توجد صناديق' : 'No funds available'}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {funds.map(fund => {
                                            const isSelected = editFormData.fundPermissions.some(fp => fp.fund_id === fund.id);
                                            const permission = editFormData.fundPermissions.find(fp => fp.fund_id === fund.id);

                                            return (
                                                <div
                                                    key={fund.id}
                                                    className={`p-3 rounded-lg border ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleFundPermission(fund.id)}
                                                            />
                                                            <div>
                                                                <div className="font-medium">{fund.name_ar}</div>
                                                                <div className="text-xs text-muted-foreground">{fund.account_code}</div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary">
                                                            {fund.account_type === 'cash'
                                                                ? (language === 'ar' ? 'صندوق' : 'Cash')
                                                                : (language === 'ar' ? 'بنك' : 'Bank')
                                                            }
                                                        </Badge>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex gap-4 mt-3 pl-6">
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.can_deposit || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            fundPermissions: prev.fundPermissions.map(fp =>
                                                                                fp.fund_id === fund.id ? { ...fp, can_deposit: checked } : fp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'إيداع' : 'Deposit'}
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.can_withdraw || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            fundPermissions: prev.fundPermissions.map(fp =>
                                                                                fp.fund_id === fund.id ? { ...fp, can_withdraw: checked } : fp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'سحب' : 'Withdraw'}
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Warehouses Section */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Warehouse className="w-4 h-4" />
                                    {language === 'ar' ? 'المستودعات' : 'Warehouses'}
                                </Label>
                                {warehouses.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'ar' ? 'لا توجد مستودعات' : 'No warehouses available'}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {warehouses.map(warehouse => {
                                            const isSelected = editFormData.warehousePermissions.some(wp => wp.warehouse_id === warehouse.id);
                                            const permission = editFormData.warehousePermissions.find(wp => wp.warehouse_id === warehouse.id);

                                            return (
                                                <div
                                                    key={warehouse.id}
                                                    className={`p-3 rounded-lg border ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleWarehousePermission(warehouse.id)}
                                                            />
                                                            <div>
                                                                <div className="font-medium">{warehouse.name_ar}</div>
                                                                <div className="text-xs text-muted-foreground">{warehouse.code}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex flex-wrap gap-4 mt-3 pl-6">
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.is_keeper || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            warehousePermissions: prev.warehousePermissions.map(wp =>
                                                                                wp.warehouse_id === warehouse.id ? { ...wp, is_keeper: checked } : wp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'أمين' : 'Keeper'}
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.can_receive || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            warehousePermissions: prev.warehousePermissions.map(wp =>
                                                                                wp.warehouse_id === warehouse.id ? { ...wp, can_receive: checked } : wp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'استلام' : 'Receive'}
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.can_issue || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            warehousePermissions: prev.warehousePermissions.map(wp =>
                                                                                wp.warehouse_id === warehouse.id ? { ...wp, can_issue: checked } : wp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'صرف' : 'Issue'}
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Branches Section */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <GitBranch className="w-4 h-4" />
                                    {language === 'ar' ? 'الفروع' : 'Branches'}
                                </Label>
                                {branches.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'ar' ? 'لا توجد فروع' : 'No branches available'}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {branches.map(branch => {
                                            const isSelected = editFormData.branchPermissions.some(bp => bp.branch_id === branch.id);
                                            const permission = editFormData.branchPermissions.find(bp => bp.branch_id === branch.id);

                                            return (
                                                <div
                                                    key={branch.id}
                                                    className={`p-3 rounded-lg border ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleBranchPermission(branch.id)}
                                                            />
                                                            <div>
                                                                <div className="font-medium">{branch.name_ar}</div>
                                                                <div className="text-xs text-muted-foreground">{branch.code}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex gap-4 mt-3 pl-6">
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.can_manage || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            branchPermissions: prev.branchPermissions.map(bp =>
                                                                                bp.branch_id === branch.id ? { ...bp, can_manage: checked } : bp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'إدارة' : 'Manage'}
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Switch
                                                                    checked={permission?.is_primary || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setEditFormData(prev => ({
                                                                            ...prev,
                                                                            branchPermissions: prev.branchPermissions.map(bp =>
                                                                                bp.branch_id === branch.id ? { ...bp, is_primary: checked } : bp
                                                                            ),
                                                                        }));
                                                                    }}
                                                                />
                                                                {language === 'ar' ? 'رئيسي' : 'Primary'}
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <SheetFooter className="mt-6">
                        <Button variant="outline" onClick={() => setEditSheetOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSavePermissions} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    {language === 'ar' ? 'حفظ' : 'Save'}
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
