/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 EquityPartnersPage — شركاء حقوق الملكية
 * ════════════════════════════════════════════════════════════════
 * V1 — NexaListTable pattern with Stats Cards + Share Gauge
 *   - بطاقات إحصائية (رأس المال، النسب، الرواتب)
 *   - جدول بكل الشركاء مع أرصدتهم
 *   - زر إضافة شريك + Sheet تفصيلي
 *   - شريط توازن النسب (100%)
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency, getCurrencySymbol } from '@/hooks/useCompanyCurrency';
import { useEquityPartners } from '@/hooks/useEquityPartners';
import { CreatePartnerInput, EquityPartner } from '@/services/equityPartnersService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Users, PieChart, Wallet, Banknote, Plus, MoreHorizontal,
    Eye, Edit3, UserMinus, Search, TrendingUp, CheckCircle2,
    AlertCircle, Briefcase, Phone, Mail, Hash, Percent,
    Calendar, Building2, CircleDollarSign, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
export default function EquityPartnersPage() {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: baseCurrency } = useCompanyCurrency(language as 'ar' | 'en');
    const isRTL = direction === 'rtl';

    const {
        partners, loading, stats, refresh,
        addPartner, updatePartner, deletePartner, validatePercentage,
    } = useEquityPartners();

    // ─── State ───────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<EquityPartner | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Add form state
    const [formData, setFormData] = useState<Partial<CreatePartnerInput>>({
        partner_number: '',
        name_ar: '',
        name_en: '',
        phone: '',
        email: '',
        share_percentage: 0,
        capital_amount: 0,
        has_salary: false,
        monthly_salary: 0,
        job_title: '',
    });
    const [percentageValidation, setPercentageValidation] = useState<{ valid: boolean; message: string } | null>(null);

    // ─── Format amount ──────────────────────────────────────────
    const fmtAmount = (n: number) =>
        Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const currSymbol = getCurrencySymbol(baseCurrency || 'USD');

    // ─── Filtered Partners ──────────────────────────────────────
    const filteredPartners = useMemo(() => {
        if (!searchTerm.trim()) return partners;
        const q = searchTerm.toLowerCase();
        return partners.filter(p =>
            (p.name_ar || '').toLowerCase().includes(q) ||
            (p.name_en || '').toLowerCase().includes(q) ||
            (p.partner_number || '').toLowerCase().includes(q) ||
            (p.phone || '').toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q)
        );
    }, [partners, searchTerm]);

    // ─── Handlers ───────────────────────────────────────────────
    const handleRowClick = useCallback((partner: EquityPartner) => {
        setSelectedPartner(partner);
        setIsDetailOpen(true);
    }, []);

    const handleAddPartner = useCallback(async () => {
        if (!companyId || !formData.name_ar) return;
        setSaving(true);
        try {
            const result = await addPartner({
                ...formData,
                company_id: companyId,
            } as CreatePartnerInput);
            if (result) {
                setShowAddDialog(false);
                resetForm();
            }
        } finally {
            setSaving(false);
        }
    }, [formData, companyId, addPartner]);

    const handlePercentageChange = useCallback(async (value: number) => {
        setFormData(prev => ({ ...prev, share_percentage: value }));
        if (value > 0) {
            const result = await validatePercentage(value);
            setPercentageValidation(result);
        } else {
            setPercentageValidation(null);
        }
    }, [validatePercentage]);

    const resetForm = () => {
        setFormData({
            partner_number: '',
            name_ar: '',
            name_en: '',
            phone: '',
            email: '',
            share_percentage: 0,
            capital_amount: 0,
            has_salary: false,
            monthly_salary: 0,
            job_title: '',
        });
        setPercentageValidation(null);
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 pb-6" dir={direction}>

            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight font-cairo">
                            {isRTL ? 'شركاء حقوق الملكية' : 'Equity Partners'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5 font-tajawal">
                            {isRTL ? 'إدارة حصص رأس المال والحسابات الجارية وتوزيع الأرباح' : 'Manage capital shares, current accounts & profit distribution'}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => { resetForm(); setShowAddDialog(true); }}
                    className="gap-2 px-5 h-10 text-white shadow-md bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة شريك' : 'Add Partner'}
                </Button>
            </div>

            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-1">
                {/* عدد الشركاء */}
                <Card className="bg-gradient-to-br from-violet-50 to-purple-100/50 dark:from-violet-900/20 dark:to-purple-800/10 border-violet-200 dark:border-violet-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-violet-600 dark:text-violet-400 font-tajawal">{isRTL ? 'الشركاء' : 'Partners'}</p>
                                <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 font-mono mt-1">{stats?.totalPartners || 0}</p>
                            </div>
                            <div className="p-3 bg-violet-500 rounded-xl"><Users className="w-5 h-5 text-white" /></div>
                        </div>
                    </CardContent>
                </Card>

                {/* رأس المال */}
                <Card className="bg-gradient-to-br from-emerald-50 to-green-100/50 dark:from-emerald-900/20 dark:to-green-800/10 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-tajawal">{isRTL ? 'رأس المال' : 'Total Capital'}</p>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                                    {currSymbol} {fmtAmount(stats?.totalCapital || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-500 rounded-xl"><Wallet className="w-5 h-5 text-white" /></div>
                        </div>
                    </CardContent>
                </Card>

                {/* الرواتب */}
                <Card className="bg-gradient-to-br from-amber-50 to-yellow-100/50 dark:from-amber-900/20 dark:to-yellow-800/10 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-tajawal">{isRTL ? 'رواتب شهرية' : 'Monthly Salaries'}</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono mt-1">
                                    {currSymbol} {fmtAmount(stats?.totalSalaries || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-amber-500 rounded-xl"><Banknote className="w-5 h-5 text-white" /></div>
                        </div>
                    </CardContent>
                </Card>

                {/* الحسابات الجارية */}
                <Card className="bg-gradient-to-br from-blue-50 to-sky-100/50 dark:from-blue-900/20 dark:to-sky-800/10 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-tajawal">{isRTL ? 'الجاري' : 'Current Balance'}</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono mt-1">
                                    {currSymbol} {fmtAmount(stats?.totalCurrentBalance || 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-500 rounded-xl"><CircleDollarSign className="w-5 h-5 text-white" /></div>
                        </div>
                    </CardContent>
                </Card>

                {/* توازن النسب */}
                <Card className={cn(
                    "border-2",
                    stats?.isBalanced
                        ? "bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-300 dark:from-green-900/20 dark:border-green-700"
                        : "bg-gradient-to-br from-orange-50 to-red-100/50 border-orange-300 dark:from-orange-900/20 dark:border-orange-700"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-tajawal" style={{ color: stats?.isBalanced ? '#059669' : '#ea580c' }}>
                                    {isRTL ? 'النسب' : 'Shares'}
                                </p>
                                <p className={cn("text-2xl font-bold font-mono mt-1", stats?.isBalanced ? "text-green-700" : "text-orange-700")}>
                                    {stats?.totalPercentage?.toFixed(1) || 0}%
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: stats?.isBalanced ? '#34d399' : '#fb923c' }}>
                                    {stats?.isBalanced
                                        ? (isRTL ? 'متوازن ✓' : 'Balanced ✓')
                                        : (isRTL ? `متبقي ${(100 - (stats?.totalPercentage || 0)).toFixed(1)}%` : `${(100 - (stats?.totalPercentage || 0)).toFixed(1)}% remaining`)
                                    }
                                </p>
                            </div>
                            <div className={cn("p-3 rounded-xl", stats?.isBalanced ? "bg-green-500" : "bg-orange-500")}>
                                {stats?.isBalanced ? <CheckCircle2 className="w-5 h-5 text-white" /> : <PieChart className="w-5 h-5 text-white" />}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Share Distribution Bar ─── */}
            {partners.length > 0 && (
                <div className="px-1">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                        <p className="text-xs text-gray-500 mb-3 font-tajawal">
                            {isRTL ? 'توزيع الحصص' : 'Share Distribution'}
                        </p>
                        <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex">
                            {partners.filter(p => p.status === 'active').map((p, i) => {
                                const colors = [
                                    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
                                    'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
                                ];
                                return (
                                    <div
                                        key={p.id}
                                        className={cn("h-full flex items-center justify-center transition-all", colors[i % colors.length])}
                                        style={{ width: `${p.share_percentage}%` }}
                                        title={`${p.name_ar} — ${p.share_percentage}%`}
                                    >
                                        {p.share_percentage >= 10 && (
                                            <span className="text-white text-[10px] font-bold truncate px-1">
                                                {p.name_ar?.split(' ')[0]} {p.share_percentage}%
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            {(stats?.totalPercentage || 0) < 100 && (
                                <div
                                    className="h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                                    style={{ width: `${100 - (stats?.totalPercentage || 0)}%` }}
                                >
                                    <span className="text-gray-400 text-[10px]">
                                        {(100 - (stats?.totalPercentage || 0)).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Search Bar ─── */}
            <div className="px-1">
                <div className="relative">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400", isRTL ? 'right-3' : 'left-3')} />
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={isRTL ? 'بحث بالاسم، الرقم، الهاتف...' : 'Search by name, number, phone...'}
                        className={cn("h-10 bg-white dark:bg-gray-900 border-gray-200", isRTL ? 'pr-10' : 'pl-10')}
                    />
                </div>
            </div>

            {/* ─── Partners Table ─── */}
            <div className="flex-1 min-h-0 px-1">
                <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                        </div>
                    ) : filteredPartners.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Users className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-tajawal">{isRTL ? 'لا يوجد شركاء' : 'No partners found'}</p>
                            <Button
                                variant="outline"
                                className="mt-4 gap-2"
                                onClick={() => { resetForm(); setShowAddDialog(true); }}
                            >
                                <Plus className="w-4 h-4" />
                                {isRTL ? 'إضافة أول شريك' : 'Add first partner'}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50/80 dark:bg-gray-800/50">
                                        <th className="text-start px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">#</th>
                                        <th className="text-start px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">{isRTL ? 'الشريك' : 'Partner'}</th>
                                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">{isRTL ? 'النسبة' : 'Share %'}</th>
                                        <th className="text-end px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">{isRTL ? 'رأس المال' : 'Capital'}</th>
                                        <th className="text-end px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">{isRTL ? 'الجاري' : 'Current'}</th>
                                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">{isRTL ? 'الراتب' : 'Salary'}</th>
                                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-tajawal">{isRTL ? 'الحالة' : 'Status'}</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPartners.map((partner, idx) => {
                                        const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-green-600', 'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600'];
                                        return (
                                            <tr
                                                key={partner.id}
                                                className="group border-b last:border-b-0 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 cursor-pointer transition-colors"
                                                onClick={() => handleRowClick(partner)}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-[13px] font-bold text-violet-600">{partner.partner_number}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 bg-gradient-to-br", colors[idx % colors.length])}>
                                                            {(partner.name_ar || '?').charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 font-tajawal">{partner.name_ar}</p>
                                                            {partner.name_en && <p className="text-[10px] text-gray-400 line-clamp-1">{partner.name_en}</p>}
                                                            {partner.job_title && (
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <Briefcase className="w-2.5 h-2.5 text-gray-300" />
                                                                    <span className="text-[10px] text-gray-400">{partner.job_title}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-mono font-bold text-lg text-violet-700 dark:text-violet-300">{partner.share_percentage}%</span>
                                                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${partner.share_percentage}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-end">
                                                    <span className="font-mono font-bold text-[14px] text-emerald-600 dark:text-emerald-400" dir="ltr">
                                                        {currSymbol} {fmtAmount(partner.capital_amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-end">
                                                    <span className={cn(
                                                        "font-mono font-bold text-[14px]",
                                                        (partner.current_balance || 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                                                    )} dir="ltr">
                                                        {currSymbol} {fmtAmount(partner.current_balance || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {partner.has_salary ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-mono text-sm text-amber-600 dark:text-amber-400 font-semibold" dir="ltr">
                                                                {currSymbol} {fmtAmount(partner.monthly_salary)}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400">{isRTL ? '/شهر' : '/mo'}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={cn(
                                                        "text-[10px] font-semibold",
                                                        partner.status === 'active'
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            : partner.status === 'withdrawn'
                                                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                                : "bg-gray-100 text-gray-500"
                                                    )}>
                                                        {partner.status === 'active' ? (isRTL ? 'نشط' : 'Active')
                                                            : partner.status === 'withdrawn' ? (isRTL ? 'منسحب' : 'Withdrawn')
                                                                : (isRTL ? 'غير نشط' : 'Inactive')}
                                                    </Badge>
                                                </td>
                                                <td className="px-2 py-3">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="min-w-[150px]">
                                                            <DropdownMenuLabel className="text-[11px] text-gray-400">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleRowClick(partner)} className="gap-2 cursor-pointer text-sm">
                                                                <Eye className="h-3.5 w-3.5" /> {isRTL ? 'عرض التفاصيل' : 'View Details'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                                                                <Edit3 className="h-3.5 w-3.5" /> {isRTL ? 'تعديل' : 'Edit'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-red-600" disabled>
                                                                <UserMinus className="h-3.5 w-3.5" /> {isRTL ? 'سحب الشريك' : 'Withdraw'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {/* Footer */}
                                <tfoot>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2">
                                        <td className="px-4 py-3 font-bold text-sm font-tajawal text-gray-600" colSpan={2}>
                                            {isRTL ? 'الإجمالي' : 'Total'} ({filteredPartners.length})
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono font-bold text-violet-700">{stats?.totalPercentage?.toFixed(1)}%</span>
                                        </td>
                                        <td className="px-4 py-3 text-end">
                                            <span className="font-mono font-bold text-emerald-600" dir="ltr">{currSymbol} {fmtAmount(stats?.totalCapital || 0)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-end">
                                            <span className="font-mono font-bold text-blue-600" dir="ltr">{currSymbol} {fmtAmount(stats?.totalCurrentBalance || 0)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono font-bold text-amber-600" dir="ltr">{currSymbol} {fmtAmount(stats?.totalSalaries || 0)}</span>
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════ Add Partner Dialog ═══════════════ */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto" dir={direction}>
                    <DialogHeader>
                        <DialogTitle className="font-cairo text-lg flex items-center gap-2">
                            <Plus className="w-5 h-5 text-violet-500" />
                            {isRTL ? 'إضافة شريك جديد' : 'Add New Partner'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Auto number badge */}
                        <div className="flex items-center gap-2 p-2.5 bg-violet-50 dark:bg-violet-900/15 rounded-lg border border-violet-200 dark:border-violet-800">
                            <Hash className="w-4 h-4 text-violet-500" />
                            <span className="text-xs font-tajawal text-violet-600">{isRTL ? 'الرقم تلقائي:' : 'Auto number:'}</span>
                            <Badge className="bg-violet-100 text-violet-700 font-mono text-xs px-2">
                                P-{String(partners.length + 1).padStart(3, '0')}
                            </Badge>
                            <span className="text-[10px] text-gray-400 ms-auto">{isRTL ? 'يظهر في الشجرة المحاسبية' : 'Shown in Chart of Accounts'}</span>
                        </div>

                        {/* Name AR */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-tajawal">{isRTL ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</Label>
                            <Input
                                value={formData.name_ar || ''}
                                onChange={e => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                                placeholder={isRTL ? 'اسم الشريك' : 'Partner name'}
                                className="h-9 text-sm"
                                autoFocus
                            />
                        </div>

                        {/* Name EN */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-tajawal">{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                            <Input
                                value={formData.name_en || ''}
                                onChange={e => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                                placeholder="Partner name in English"
                                className="h-9 text-sm"
                                dir="ltr"
                            />
                        </div>

                        {/* Phone + Email */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-tajawal">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                                <div className="relative">
                                    <Phone className={cn("absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400", isRTL ? 'right-2.5' : 'left-2.5')} />
                                    <Input
                                        value={formData.phone || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className={cn("h-9 text-sm", isRTL ? 'pr-8' : 'pl-8')}
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-tajawal">{isRTL ? 'البريد' : 'Email'}</Label>
                                <div className="relative">
                                    <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400", isRTL ? 'right-2.5' : 'left-2.5')} />
                                    <Input
                                        value={formData.email || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className={cn("h-9 text-sm", isRTL ? 'pr-8' : 'pl-8')}
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Share % + Capital */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-tajawal">{isRTL ? 'نسبة الحصة %' : 'Share %'}</Label>
                                <div className="relative">
                                    <Percent className={cn("absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400", isRTL ? 'right-2.5' : 'left-2.5')} />
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        value={formData.share_percentage || ''}
                                        onChange={e => handlePercentageChange(Number(e.target.value))}
                                        className={cn("h-9 text-sm font-mono", isRTL ? 'pr-8' : 'pl-8')}
                                    />
                                </div>
                                {percentageValidation && (
                                    <p className={cn("text-[11px] flex items-center gap-1", percentageValidation.valid ? 'text-green-600' : 'text-red-500')}>
                                        {percentageValidation.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                        {percentageValidation.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-tajawal">{isRTL ? 'رأس المال' : 'Capital Amount'}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={formData.capital_amount || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, capital_amount: Number(e.target.value) }))}
                                    className="h-9 text-sm font-mono"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {/* Salary Section */}
                        <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.has_salary || false}
                                    onChange={e => setFormData(prev => ({ ...prev, has_salary: e.target.checked }))}
                                    className="w-4 h-4 accent-amber-500"
                                />
                                <Label className="text-sm font-tajawal cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, has_salary: !prev.has_salary }))}>
                                    {isRTL ? '💼 يتقاضى راتب وظيفي' : '💼 Has Employment Salary'}
                                </Label>
                            </div>
                            {formData.has_salary && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-tajawal">{isRTL ? 'الراتب الشهري' : 'Monthly Salary'}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={formData.monthly_salary || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, monthly_salary: Number(e.target.value) }))}
                                            className="h-9 text-sm font-mono"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-tajawal">{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                                        <Input
                                            value={formData.job_title || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                                            placeholder={isRTL ? 'مدير عام' : 'General Manager'}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} className="font-tajawal">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleAddPartner}
                            disabled={saving || !formData.name_ar || (percentageValidation ? !percentageValidation.valid : false)}
                            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-tajawal"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isRTL ? 'إضافة الشريك' : 'Add Partner'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════════ Partner Detail Sheet ═══════════════ */}
            <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-[480px] overflow-y-auto" dir={direction}>
                    {selectedPartner && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="font-cairo text-lg flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                        {selectedPartner.name_ar?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold">{selectedPartner.name_ar}</p>
                                        {selectedPartner.name_en && <p className="text-xs text-gray-400 font-normal">{selectedPartner.name_en}</p>}
                                    </div>
                                </SheetTitle>
                            </SheetHeader>

                            <div className="space-y-5 mt-6">
                                {/* Info Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 text-center">
                                        <p className="text-[10px] text-violet-500 font-tajawal">{isRTL ? 'النسبة' : 'Share'}</p>
                                        <p className="text-3xl font-bold font-mono text-violet-700 dark:text-violet-300 mt-1">{selectedPartner.share_percentage}%</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                                        <p className="text-[10px] text-emerald-500 font-tajawal">{isRTL ? 'رأس المال' : 'Capital'}</p>
                                        <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1" dir="ltr">
                                            {currSymbol} {fmtAmount(selectedPartner.capital_amount)}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                                        <p className="text-[10px] text-blue-500 font-tajawal">{isRTL ? 'الحساب الجاري' : 'Current Account'}</p>
                                        <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300 mt-1" dir="ltr">
                                            {currSymbol} {fmtAmount(selectedPartner.current_balance || 0)}
                                        </p>
                                    </div>
                                    {selectedPartner.has_salary && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                                            <p className="text-[10px] text-amber-500 font-tajawal">{isRTL ? 'الراتب' : 'Salary'}</p>
                                            <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1" dir="ltr">
                                                {currSymbol} {fmtAmount(selectedPartner.monthly_salary)}
                                            </p>
                                            <p className="text-[9px] text-amber-400 mt-0.5">{selectedPartner.job_title || ''}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 font-tajawal">{isRTL ? 'بيانات الاتصال' : 'Contact Info'}</p>
                                    {selectedPartner.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span dir="ltr" className="font-mono">{selectedPartner.phone}</span>
                                        </div>
                                    )}
                                    {selectedPartner.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span dir="ltr">{selectedPartner.email}</span>
                                        </div>
                                    )}
                                    {selectedPartner.join_date && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{isRTL ? 'تاريخ الانضمام: ' : 'Joined: '}{selectedPartner.join_date}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {selectedPartner.notes && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 font-tajawal">{isRTL ? 'ملاحظات' : 'Notes'}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{selectedPartner.notes}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
