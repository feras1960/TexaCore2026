/**
 * ════════════════════════════════════════════════════════════════
 *  📋 EmployeeSheet — الشيت الرئيسي لبيانات الموظف
 *  مبني على نفس تصميم UnifiedAccountingSheet + شيت الجهات
 *  
 *  الهيكل:
 *    - شريط هيدر مدمج (أيقونة + اسم + كود + حالة + أزرار + إغلاق)
 *    - بطاقات ملخص (القسم، المسمى الوظيفي، تاريخ التعيين، الحالة)
 *    - تبويبات أفقية: الملف الشخصي | كشف الحساب | العقود | الإجازات | الأداء | AI
 *    - أقسام أكورديون داخل "الملف الشخصي"
 *  
 *  يدعم: create / view / edit
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Sheet, SheetContent, SheetHeader as UiSheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    User, FileText, ScrollText, Calendar, Target, Brain,
    X, Save, Pencil, RefreshCw, Printer, QrCode,
    MoreHorizontal, Loader2, Paperclip, Activity,
} from 'lucide-react';
import { getEmployee, createEmployee, updateEmployee } from '../../services/hrService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Tab imports
import EmpProfileTab from './tabs/EmpProfileTab';
import EmpLedgerTab from './tabs/EmpLedgerTab';
import EmpContractsDocsTab from './tabs/EmpContractsDocsTab';
import EmpLeavesTab from './tabs/EmpLeavesTab';
import EmpPerformanceTab from './tabs/EmpPerformanceTab';
import EmpAnalyticsTab from './tabs/EmpAnalyticsTab';
import EmpAttachmentsTab from './tabs/EmpAttachmentsTab';
import { DocumentAttachmentsTab } from '@/features/trade/components/tabs/DocumentAttachmentsTab';
import EmpActivityLogTab from './tabs/EmpActivityLogTab';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type SheetMode = 'create' | 'view' | 'edit';

export interface EmployeeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    mode: SheetMode;
    employeeId?: string | null;
    onSaved?: (employee: any) => void;
    onRefresh?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Tab configuration — 8 tabs
// ═══════════════════════════════════════════════════════════════

interface TabConfig {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    showInModes: SheetMode[];
}

const TAB_CONFIG: TabConfig[] = [
    { id: 'profile', labelAr: 'الملف الشخصي', labelEn: 'Profile', icon: User, showInModes: ['create', 'edit', 'view'] },
    { id: 'ledger', labelAr: 'كشف الحساب', labelEn: 'Ledger', icon: FileText, showInModes: ['edit', 'view'] },
    { id: 'performance', labelAr: 'الأداء والمبيعات', labelEn: 'Performance', icon: Target, showInModes: ['edit', 'view'] },
    { id: 'contracts', labelAr: 'العقود', labelEn: 'Contracts', icon: ScrollText, showInModes: ['edit', 'view'] },
    { id: 'leaves', labelAr: 'الإجازات', labelEn: 'Leaves', icon: Calendar, showInModes: ['edit', 'view'] },
    { id: 'attachments', labelAr: 'المرفقات', labelEn: 'Attachments', icon: Paperclip, showInModes: ['edit', 'view'] },
    { id: 'activity', labelAr: 'سجل النشاط', labelEn: 'Activity', icon: Activity, showInModes: ['view'] },
    { id: 'analytics', labelAr: 'تحليلات AI', labelEn: 'AI Analytics', icon: Brain, showInModes: ['view'] },
];

// ═══════════════════════════════════════════════════════════════
// Status configs
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { labelAr: string; labelEn: string; className: string }> = {
    active: { labelAr: 'نشط', labelEn: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    on_leave: { labelAr: 'في إجازة', labelEn: 'On Leave', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    suspended: { labelAr: 'معلق', labelEn: 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    terminated: { labelAr: 'منتهي', labelEn: 'Terminated', className: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' },
    resigned: { labelAr: 'مستقيل', labelEn: 'Resigned', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function EmployeeSheet({
    isOpen,
    onClose,
    mode: initialMode,
    employeeId,
    onSaved,
    onRefresh,
}: EmployeeSheetProps) {
    const { language, t } = useLanguage();
    const isRTL = language === 'ar';

    // --- State ---
    const [mode, setMode] = useState<SheetMode>(initialMode);
    const [data, setData] = useState<any>({});
    const [initialData, setInitialData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    // --- Visible tabs based on mode ---
    const visibleTabs = useMemo(
        () => TAB_CONFIG.filter(t => t.showInModes.includes(mode)),
        [mode]
    );

    // --- Load employee data ---
    const loadEmployee = useCallback(async () => {
        if (!employeeId) return;
        try {
            setLoading(true);
            const emp = await getEmployee(employeeId);
            setData(emp);
            setInitialData(emp);
        } catch (err) {
            console.error(err);
            toast.error(isRTL ? 'فشل تحميل بيانات الموظف' : 'Failed to load employee');
        } finally {
            setLoading(false);
        }
    }, [employeeId, isRTL]);

    // Reset state only when sheet opens or initialMode changes from parent
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setActiveTab('profile');
            if (initialMode === 'create') {
                setData({ employment_status: 'active', employment_type: 'full_time', gender: 'male' });
                setInitialData({});
            } else {
                loadEmployee();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialMode]);

    // --- onChange handler ---
    const handleChange = useCallback((updates: Partial<any>) => {
        setData((prev: any) => ({ ...prev, ...updates }));
    }, []);

    // --- Save ---
    const handleSave = async () => {
        try {
            setSaving(true);
            if (mode === 'create') {
                const created = await createEmployee(data);
                toast.success(isRTL ? 'تم إنشاء الموظف بنجاح ✅' : 'Employee created successfully ✅');
                onSaved?.(created);
                onClose();
            } else {
                const updated = await updateEmployee(data.id, data);
                toast.success(isRTL ? 'تم تحديث البيانات بنجاح ✅' : 'Employee updated successfully ✅');
                setMode('view');
                setData(updated);
                setInitialData(updated);
                onSaved?.(updated);
            }
        } catch (err) {
            console.error(err);
            toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // --- Cancel ---
    const handleCancel = () => {
        if (mode === 'create') {
            onClose();
        } else {
            setData(initialData);
            setMode('view');
        }
    };

    // --- Edit ---
    const handleEdit = () => setMode('edit');

    // --- Refresh ---
    const handleRefresh = () => {
        loadEmployee();
        onRefresh?.();
    };

    // --- Computed ---
    const isEditable = mode === 'create' || mode === 'edit';
    const displayName = data.full_name_ar || `${data.first_name_ar || ''} ${data.last_name_ar || ''}`.trim() || (isRTL ? 'موظف جديد' : 'New Employee');
    const displayNameEn = data.full_name_en || `${data.first_name_en || ''} ${data.last_name_en || ''}`.trim();
    const status = STATUS_CONFIG[data.employment_status || 'active'];

    // Summary cards data
    const summaryCards = useMemo(() => {
        if (mode === 'create') return [];
        return [
            {
                label: isRTL ? 'القسم' : 'Department',
                value: data.department ? (isRTL ? data.department.name_ar : (data.department.name_en || data.department.name_ar)) : '—',
                color: 'text-blue-600 dark:text-blue-400',
                bgColor: 'bg-blue-50/80 dark:bg-blue-900/20',
            },
            {
                label: isRTL ? 'المسمى الوظيفي' : 'Position',
                value: data.position ? (isRTL ? data.position.name_ar : (data.position.name_en || data.position.name_ar)) : '—',
                color: 'text-emerald-600 dark:text-emerald-400',
                bgColor: 'bg-emerald-50/80 dark:bg-emerald-900/20',
            },
            {
                label: isRTL ? 'تاريخ التعيين' : 'Hire Date',
                value: data.hire_date ? new Date(data.hire_date).toLocaleDateString() : '—',
                color: 'text-violet-600 dark:text-violet-400',
                bgColor: 'bg-violet-50/80 dark:bg-violet-900/20',
            },
        ].filter(Boolean);
    }, [data, isRTL, mode]);

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                className={cn(
                    "!w-[70vw] !max-w-[70vw] p-0 flex flex-col h-full",
                    "bg-gray-50 dark:bg-gray-900"
                )}
                side={isRTL ? 'left' : 'right'}
            >
                <div className="flex flex-col h-full w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Accessibility */}
                    <UiSheetHeader className="sr-only">
                        <SheetTitle>{displayName}</SheetTitle>
                        <SheetDescription>
                            {isRTL ? 'بيانات الموظف' : 'Employee Details'}
                        </SheetDescription>
                    </UiSheetHeader>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-erp-primary" />
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════ */}
                    {/* HEADER — Compact single row (like UnifiedSheet) */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
                        <div className="flex items-center justify-between gap-3">
                            {/* Left: Icon + Title + Code + Status */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                {/* Document Icon */}
                                <div className="w-9 h-9 rounded-lg bg-erp-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-base">👤</span>
                                </div>

                                {/* Title + Code + Status */}
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                            {displayName}
                                        </h2>

                                        {/* Status Badge */}
                                        {status && (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border",
                                                status.className
                                            )}>
                                                {isRTL ? status.labelAr : status.labelEn}
                                            </span>
                                        )}
                                    </div>

                                    {/* Code + English Name */}
                                    <div className="flex items-center gap-2">
                                        {data.employee_number && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                #{data.employee_number}
                                            </span>
                                        )}
                                        {displayNameEn && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {displayNameEn}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Action Toolbar */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {isEditable ? (
                                    <>
                                        <Button
                                            size="sm"
                                            className="h-8 px-4 text-xs gap-1.5 bg-erp-primary hover:bg-erp-primary/90 text-white font-semibold shadow-sm"
                                            onClick={handleSave}
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            {saving ? (isRTL ? 'حفظ...' : 'Saving...') : (isRTL ? '💾 حفظ' : '💾 Save')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 text-xs gap-1 text-gray-600 hover:text-red-600 hover:border-red-300"
                                            onClick={handleCancel}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            {isRTL ? 'إلغاء' : 'Cancel'}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={handleRefresh}>
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            {isRTL ? 'تحديث' : 'Update'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={handleEdit}>
                                            <Pencil className="h-3.5 w-3.5" />
                                            {isRTL ? 'تعديل' : 'Edit'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs">
                                            <Printer className="h-3.5 w-3.5" />
                                            {isRTL ? 'طباعة' : 'Print'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                            <QrCode className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                )}

                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center transition-colors shrink-0 ms-1"
                                >
                                    <span className="text-sm text-gray-600 dark:text-gray-300">✕</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════ */}
                    {/* SUMMARY CARDS (View mode only)                 */}
                    {/* ═══════════════════════════════════════════════ */}
                    {mode !== 'create' && summaryCards.length > 0 && (
                        <div className="shrink-0 grid grid-cols-3 gap-3 px-4 py-3 border-b bg-white/50 dark:bg-gray-800/50">
                            {summaryCards.map((card, i) => (
                                <div key={i} className={cn("rounded-lg px-3 py-2.5 border", card.bgColor)}>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{card.label}</p>
                                    <p className={cn("text-sm font-semibold truncate", card.color)}>{card.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════ */}
                    {/* TABS + CONTENT                                 */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="flex-1 flex flex-col overflow-hidden"
                            dir={isRTL ? 'rtl' : 'ltr'}
                        >
                            {/* Tab Bar — RTL-aware with ScrollArea dir (like SheetTabs) */}
                            <div className="shrink-0 border-b bg-white dark:bg-gray-900 px-4 z-10">
                                <ScrollArea className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                                    <TabsList className="inline-flex h-11 w-full gap-1 !justify-start bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-1">
                                        {visibleTabs.map(tab => {
                                            const Icon = tab.icon;
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <TabsTrigger
                                                    key={tab.id}
                                                    value={tab.id}
                                                    className={cn(
                                                        "gap-2 transition-all font-tajawal rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                                                        isActive
                                                            ? "bg-white dark:bg-gray-800 shadow-sm text-erp-primary font-semibold"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {isRTL ? tab.labelAr : tab.labelEn}
                                                </TabsTrigger>
                                            );
                                        })}
                                    </TabsList>
                                </ScrollArea>
                            </div>

                            {/* Tab Content — Single Scroll Protocol */}
                            <ScrollArea className="flex-1 h-full" dir={isRTL ? 'rtl' : 'ltr'}>
                                <div className="p-4">
                                    {loading ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
                                                <EmpProfileTab data={data} mode={mode} onChange={handleChange} isRTL={isRTL} />
                                            </TabsContent>
                                            <TabsContent value="ledger" className="mt-0 focus-visible:outline-none">
                                                <EmpLedgerTab data={data} isRTL={isRTL} />
                                            </TabsContent>
                                            <TabsContent value="performance" className="mt-0 focus-visible:outline-none">
                                                <EmpPerformanceTab employeeId={data.id} data={data} isRTL={isRTL} mode={mode} />
                                            </TabsContent>
                                            <TabsContent value="contracts" className="mt-0 focus-visible:outline-none">
                                                <EmpContractsDocsTab employeeId={data.id} isRTL={isRTL} mode={mode} />
                                            </TabsContent>
                                            <TabsContent value="leaves" className="mt-0 focus-visible:outline-none">
                                                <EmpLeavesTab employeeId={data.id} isRTL={isRTL} mode={mode} />
                                            </TabsContent>
                                            <TabsContent value="attachments" className="mt-0 focus-visible:outline-none">
                                                <DocumentAttachmentsTab data={data} mode={mode} docType="employee" onChange={handleChange} />
                                            </TabsContent>
                                            <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
                                                <EmpActivityLogTab employeeId={data.id} data={data} isRTL={isRTL} />
                                            </TabsContent>
                                            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
                                                <EmpAnalyticsTab data={data} isRTL={isRTL} />
                                            </TabsContent>
                                        </>
                                    )}
                                </div>
                            </ScrollArea>
                        </Tabs>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
