/**
 * ════════════════════════════════════════════════════════════════
 * 🏪 BranchesManagementTab - تبويب إدارة الفروع
 * ════════════════════════════════════════════════════════════════
 * 
 * Full CRUD for branches:
 * - List all branches with stats (users, warehouses)
 * - Add/Edit/Delete branches
 * - Set main branch
 * - Assign manager
 * - Link warehouses
 * 
 * @module features/settings/components
 * @phase 23A-2
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/components/ui/use-toast';
import { branchesService, Branch, CreateBranchDTO } from '@/services/branchesService';
import {
    Building2, Plus, Edit3, Trash2, MapPin, Phone, Mail, Users,
    Warehouse, Star, Loader2, Save, ChevronRight, Search,
    CheckCircle2, XCircle, UserCircle, Globe
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function BranchesManagementTab() {
    const { language } = useLanguage();
    const { company, companyId, loading: companyLoading } = useCompany();
    const { toast } = useToast();
    const isAr = language === 'ar';

    // ─── State ──────────────────────────────────────────────────
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [saving, setSaving] = useState(false);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [form, setForm] = useState<CreateBranchDTO>({
        name: '',
        name_en: '',
        address: '',
        phone: '',
        email: '',
        city: '',
        country: '',
        is_main: false,
        is_active: true,
        manager_id: undefined,
    });

    // Company users for manager selection
    const [companyUsers, setCompanyUsers] = useState<any[]>([]);

    // ─── Load branches ──────────────────────────────────────────
    const loadBranches = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const data = await branchesService.getBranches(companyId);
            setBranches(data);
        } catch (error: any) {
            console.error('Error loading branches:', error);
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: isAr ? 'فشل تحميل الفروع' : 'Failed to load branches',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [companyId, isAr, toast]);

    const loadCompanyUsers = useCallback(async () => {
        if (!companyId) return;
        try {
            const users = await branchesService.getCompanyUsers(companyId);
            setCompanyUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }, [companyId]);

    useEffect(() => {
        loadBranches();
        loadCompanyUsers();
    }, [loadBranches, loadCompanyUsers]);

    // ─── Handlers ───────────────────────────────────────────────

    const handleAddNew = useCallback(() => {
        setEditingBranch(null);
        setForm({
            name: '',
            name_en: '',
            address: '',
            phone: '',
            email: '',
            city: '',
            country: company?.country_code || '',
            is_main: branches.length === 0, // First branch is main by default
            is_active: true,
            manager_id: undefined,
        });
        setSheetOpen(true);
    }, [branches.length, company?.country_code]);

    const handleEdit = useCallback((branch: Branch) => {
        setEditingBranch(branch);
        setForm({
            name: branch.name || '',
            name_en: branch.name_en || '',
            address: branch.address || '',
            phone: branch.phone || '',
            email: branch.email || '',
            city: branch.city || '',
            country: branch.country || '',
            is_main: branch.is_main || false,
            is_active: branch.is_active !== false,
            manager_id: branch.manager_id || undefined,
        });
        setSheetOpen(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!companyId || !form.name.trim()) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: isAr ? 'اسم الفرع مطلوب' : 'Branch name is required',
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            if (editingBranch) {
                await branchesService.updateBranch(editingBranch.id, companyId, form);
                toast({
                    title: isAr ? 'تم التحديث' : 'Updated',
                    description: isAr ? `تم تحديث فرع "${form.name}"` : `Branch "${form.name}" updated`,
                });
            } else {
                await branchesService.createBranch(companyId, form);
                toast({
                    title: isAr ? 'تم الإنشاء' : 'Created',
                    description: isAr ? `تم إنشاء فرع "${form.name}"` : `Branch "${form.name}" created`,
                });
            }
            setSheetOpen(false);
            await loadBranches();
        } catch (error: any) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: error.message || (isAr ? 'فشل حفظ الفرع' : 'Failed to save branch'),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }, [companyId, editingBranch, form, isAr, loadBranches, toast]);

    const handleDelete = useCallback(async () => {
        if (!branchToDelete) return;

        setDeleting(true);
        try {
            await branchesService.deleteBranch(branchToDelete.id);
            toast({
                title: isAr ? 'تم الحذف' : 'Deleted',
                description: isAr
                    ? `تم إلغاء تفعيل فرع "${branchToDelete.name}"`
                    : `Branch "${branchToDelete.name}" deactivated`,
            });
            setDeleteDialogOpen(false);
            setBranchToDelete(null);
            await loadBranches();
        } catch (error: any) {
            toast({
                title: isAr ? 'خطأ' : 'Error',
                description: error.message || (isAr ? 'فشل حذف الفرع' : 'Failed to delete branch'),
                variant: 'destructive',
            });
        } finally {
            setDeleting(false);
        }
    }, [branchToDelete, isAr, loadBranches, toast]);

    const updateField = useCallback((key: keyof CreateBranchDTO, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);

    // ─── Filtered branches ──────────────────────────────────────
    const filteredBranches = branches.filter(b => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            b.name?.toLowerCase().includes(s) ||
            b.name_en?.toLowerCase().includes(s) ||
            b.city?.toLowerCase().includes(s) ||
            b.phone?.includes(s)
        );
    });

    // ─── Loading State ──────────────────────────────────────────
    if (companyLoading || loading) {
        return (
            <div className="space-y-4 max-w-5xl mx-auto">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border p-6 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-5xl mx-auto">

            {/* ── Header ────────────────────────────────────────── */}
            <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-tajawal flex items-center gap-2 text-erp-navy dark:text-white">
                                <Building2 className="w-5 h-5 text-erp-teal" />
                                {isAr ? 'إدارة الفروع' : 'Branch Management'}
                            </CardTitle>
                            <CardDescription className="font-tajawal mt-1">
                                {isAr
                                    ? `${branches.length} فرع — إضافة وتعديل فروع المنشأة`
                                    : `${branches.length} branches — Add and manage company branches`}
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleAddNew}
                            className="bg-gradient-to-r from-erp-teal to-emerald-600 hover:from-erp-teal/90 hover:to-emerald-600/90 text-white font-tajawal rounded-xl shadow-lg"
                        >
                            <Plus className="w-4 h-4 me-2" />
                            {isAr ? 'فرع جديد' : 'New Branch'}
                        </Button>
                    </div>
                </CardHeader>

                {/* Search */}
                {branches.length > 3 && (
                    <CardContent className="pt-0 pb-4">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isAr ? 'بحث في الفروع...' : 'Search branches...'}
                                className="ps-10 font-tajawal"
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* ── Branches List ──────────────────────────────────── */}
            {filteredBranches.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
                    <CardContent className="py-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-tajawal text-lg">
                            {isAr ? 'لا يوجد فروع حتى الآن' : 'No branches yet'}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 font-tajawal text-sm mt-1">
                            {isAr ? 'أنشئ فرعك الأول للبدء' : 'Create your first branch to get started'}
                        </p>
                        <Button
                            onClick={handleAddNew}
                            variant="outline"
                            className="mt-4 font-tajawal"
                        >
                            <Plus className="w-4 h-4 me-2" />
                            {isAr ? 'إنشاء فرع' : 'Create Branch'}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {filteredBranches.map((branch, index) => (
                            <motion.div
                                key={branch.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className={`border transition-all hover:shadow-md cursor-pointer group ${branch.is_main
                                            ? 'border-erp-teal/30 bg-gradient-to-r from-erp-teal/5 to-transparent dark:from-erp-teal/10'
                                            : 'border-gray-200 dark:border-gray-700'
                                        } ${!branch.is_active ? 'opacity-60' : ''}`}
                                    onClick={() => handleEdit(branch)}
                                >
                                    <CardContent className="py-4 px-5">
                                        <div className="flex items-center gap-4">
                                            {/* Branch Icon */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${branch.is_main
                                                    ? 'bg-gradient-to-br from-erp-teal to-emerald-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                                }`}>
                                                <Building2 className="w-6 h-6" />
                                            </div>

                                            {/* Branch Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-tajawal font-semibold text-gray-900 dark:text-white truncate">
                                                        {isAr ? branch.name : (branch.name_en || branch.name)}
                                                    </h3>
                                                    {branch.is_main && (
                                                        <Badge className="bg-erp-teal/10 text-erp-teal border-erp-teal/20 text-xs">
                                                            <Star className="w-3 h-3 me-1" />
                                                            {isAr ? 'رئيسي' : 'Main'}
                                                        </Badge>
                                                    )}
                                                    {!branch.is_active && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <XCircle className="w-3 h-3 me-1" />
                                                            {isAr ? 'معطّل' : 'Inactive'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {branch.city && (
                                                        <span className="flex items-center gap-1 font-tajawal">
                                                            <MapPin className="w-3 h-3" />
                                                            {branch.city}
                                                        </span>
                                                    )}
                                                    {branch.phone && (
                                                        <span className="flex items-center gap-1" dir="ltr">
                                                            <Phone className="w-3 h-3" />
                                                            {branch.phone}
                                                        </span>
                                                    )}
                                                    {(branch.manager as any)?.full_name && (
                                                        <span className="flex items-center gap-1 font-tajawal">
                                                            <UserCircle className="w-3 h-3" />
                                                            {(branch.manager as any).full_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-3">
                                                <div className="text-center px-3">
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            {branch.users_count || 0}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-tajawal">
                                                        {isAr ? 'مستخدم' : 'Users'}
                                                    </span>
                                                </div>
                                                <div className="text-center px-3 border-s border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <Warehouse className="w-3.5 h-3.5" />
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            {branch.warehouses_count || 0}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-tajawal">
                                                        {isAr ? 'مستودع' : 'Warehouses'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(branch);
                                                    }}
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                {!branch.is_main && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBranchToDelete(branch);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Add/Edit Sheet ────────────────────────────────── */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side={isAr ? 'left' : 'right'} className="w-[480px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="font-tajawal flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-erp-teal" />
                            {editingBranch
                                ? (isAr ? 'تعديل الفرع' : 'Edit Branch')
                                : (isAr ? 'فرع جديد' : 'New Branch')
                            }
                        </SheetTitle>
                        <SheetDescription className="font-tajawal">
                            {isAr
                                ? 'أدخل بيانات الفرع الأساسية'
                                : 'Enter basic branch information'
                            }
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-5 py-6">
                        {/* Names */}
                        <div className="space-y-4">
                            <div>
                                <Label className="font-tajawal text-sm">
                                    {isAr ? 'اسم الفرع (عربي)' : 'Branch Name (Arabic)'} *
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    placeholder={isAr ? 'مثال: الفرع الرئيسي - كييف' : 'e.g. Main Branch - Kyiv'}
                                    className="mt-1 font-tajawal"
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <Label className="font-tajawal text-sm">
                                    {isAr ? 'اسم الفرع (إنجليزي)' : 'Branch Name (English)'}
                                </Label>
                                <Input
                                    value={form.name_en || ''}
                                    onChange={(e) => updateField('name_en', e.target.value)}
                                    placeholder="e.g. Main Branch - Kyiv"
                                    className="mt-1"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {isAr ? 'المدينة' : 'City'}
                                </Label>
                                <Input
                                    value={form.city || ''}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    placeholder={isAr ? 'كييف' : 'Kyiv'}
                                    className="mt-1 font-tajawal"
                                />
                            </div>
                            <div>
                                <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5" />
                                    {isAr ? 'الدولة' : 'Country'}
                                </Label>
                                <Input
                                    value={form.country || ''}
                                    onChange={(e) => updateField('country', e.target.value)}
                                    placeholder={isAr ? 'أوكرانيا' : 'Ukraine'}
                                    className="mt-1 font-tajawal"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {isAr ? 'العنوان' : 'Address'}
                            </Label>
                            <Input
                                value={form.address || ''}
                                onChange={(e) => updateField('address', e.target.value)}
                                placeholder={isAr ? 'العنوان الكامل' : 'Full address'}
                                className="mt-1 font-tajawal"
                            />
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" />
                                    {isAr ? 'الهاتف' : 'Phone'}
                                </Label>
                                <Input
                                    value={form.phone || ''}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="+380 XX XXX XXXX"
                                    className="mt-1"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    {isAr ? 'البريد' : 'Email'}
                                </Label>
                                <Input
                                    value={form.email || ''}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    placeholder="branch@company.com"
                                    className="mt-1"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {/* Manager */}
                        <div>
                            <Label className="font-tajawal text-sm flex items-center gap-1.5">
                                <UserCircle className="w-3.5 h-3.5" />
                                {isAr ? 'مدير الفرع' : 'Branch Manager'}
                            </Label>
                            <Select
                                value={form.manager_id || '_none'}
                                onValueChange={(v) => updateField('manager_id', v === '_none' ? undefined : v)}
                            >
                                <SelectTrigger className="mt-1 font-tajawal">
                                    <SelectValue placeholder={isAr ? 'اختر المدير' : 'Select manager'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none" className="font-tajawal">
                                        {isAr ? '— بدون مدير —' : '— No manager —'}
                                    </SelectItem>
                                    {companyUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id} className="font-tajawal">
                                            {user.full_name || user.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Switches */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <div>
                                    <Label className="font-tajawal text-sm font-medium flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        {isAr ? 'الفرع الرئيسي' : 'Main Branch'}
                                    </Label>
                                    <p className="text-xs text-gray-500 font-tajawal mt-0.5">
                                        {isAr
                                            ? 'الفرع الافتراضي للعمليات'
                                            : 'Default branch for operations'}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.is_main || false}
                                    onCheckedChange={(v) => updateField('is_main', v)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <div>
                                    <Label className="font-tajawal text-sm font-medium flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        {isAr ? 'مفعّل' : 'Active'}
                                    </Label>
                                    <p className="text-xs text-gray-500 font-tajawal mt-0.5">
                                        {isAr
                                            ? 'الفرع يظهر في العمليات'
                                            : 'Branch appears in operations'}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.is_active !== false}
                                    onCheckedChange={(v) => updateField('is_active', v)}
                                />
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="flex gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setSheetOpen(false)}
                            className="font-tajawal"
                        >
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !form.name.trim()}
                            className="bg-gradient-to-r from-erp-teal to-emerald-600 hover:from-erp-teal/90 hover:to-emerald-600/90 text-white font-tajawal flex-1"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                                    {isAr ? 'جاري الحفظ...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 me-2" />
                                    {editingBranch
                                        ? (isAr ? 'تحديث' : 'Update')
                                        : (isAr ? 'إنشاء' : 'Create')
                                    }
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Delete Confirmation ───────────────────────────── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-tajawal">
                            {isAr ? 'تأكيد إلغاء التفعيل' : 'Confirm Deactivation'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-tajawal">
                            {isAr
                                ? `هل تريد إلغاء تفعيل فرع "${branchToDelete?.name}"؟ سيبقى الفرع في النظام لكنه لن يظهر في العمليات.`
                                : `Deactivate branch "${branchToDelete?.name}"? It will remain in the system but won't appear in operations.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-tajawal">
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 font-tajawal"
                        >
                            {deleting ? (
                                <Loader2 className="w-4 h-4 animate-spin me-2" />
                            ) : (
                                <Trash2 className="w-4 h-4 me-2" />
                            )}
                            {isAr ? 'إلغاء التفعيل' : 'Deactivate'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
