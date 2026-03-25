/**
 * WorkflowSettings — مكون عام لإعدادات سير العمل
 * 
 * يعمل مع أي موديول (مبيعات، CRM، مشتريات...) عبر WorkflowModuleConfig
 * 
 * ✅ مراحل (Statuses) — إضافة/تعديل/حذف/ترتيب
 * ✅ قواعد التحويل (Transitions) — من أين إلى أين مع الصلاحيات
 * ✅ إشعارات — قنوات ومستلمين لكل حدث
 * ✅ سيناريوهات الأتمتة — تفعيل/تعطيل
 * ✅ محرر مرئي تفاعلي (Visual Flow Editor)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { statusService, CustomStatus, StatusGroup, StatusTransition, STATUS_COLORS, StatusColor } from '@/services/statusService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    ArrowRight, Plus, Settings2, Trash2, GripVertical,
    Edit, Shield, Zap, Eye, Circle, CheckCircle2,
    XCircle, Clock, FileText, ShoppingCart, Truck,
    Receipt, Package, MoreVertical, ArrowDownUp,
    AlertTriangle, Palette, Bell, Mail, MessageSquare,
    Bot, ExternalLink, Play, Pause, Send, Info,
    UserCheck, Users, Lock, Unlock, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import WorkflowVisualEditor from '../components/WorkflowVisualEditor';
import { WorkflowModuleConfig, SALES_WORKFLOW_CONFIG } from '@/components/workflow/workflowConfigs';

// ─── Available Roles ────────────────────────────────────────────────────
const AVAILABLE_ROLES = [
    { id: 'admin', labelAr: 'مدير النظام', labelEn: 'Admin', icon: Shield, color: 'text-red-600' },
    { id: 'owner', labelAr: 'مالك', labelEn: 'Owner', icon: Lock, color: 'text-purple-600' },
    { id: 'manager', labelAr: 'مدير', labelEn: 'Manager', icon: UserCheck, color: 'text-blue-600' },
    { id: 'sales', labelAr: 'مبيعات', labelEn: 'Sales', icon: ShoppingCart, color: 'text-green-600' },
    { id: 'accountant', labelAr: 'محاسب', labelEn: 'Accountant', icon: Receipt, color: 'text-amber-600' },
    { id: 'warehouse', labelAr: 'مستودع', labelEn: 'Warehouse', icon: Package, color: 'text-cyan-600' },
    { id: 'user', labelAr: 'مستخدم عادي', labelEn: 'User', icon: Users, color: 'text-gray-600' },
];

// ─── Automation Scenarios (Pre-built n8n templates) ─────────────────────
interface AutomationScenario {
    id: string;
    nameAr: string;
    nameEn: string;
    descAr: string;
    descEn: string;
    icon: React.ElementType;
    color: string;
    n8nFile: string;
    category: 'notification' | 'automation' | 'report';
}

const AUTOMATION_SCENARIOS: AutomationScenario[] = [
    {
        id: 'telegram_notifications',
        nameAr: 'إشعارات تلغرام الفورية',
        nameEn: 'Telegram Instant Notifications',
        descAr: 'إرسال إشعارات فورية عند إنشاء أو تحديث المستندات',
        descEn: 'Instant notifications on document create/update',
        icon: Send,
        color: 'text-blue-500',
        n8nFile: '01-telegram-notifications.json',
        category: 'notification',
    },
    {
        id: 'daily_report',
        nameAr: 'التقرير اليومي الآلي',
        nameEn: 'Automated Daily Report',
        descAr: 'إرسال ملخص يومي بالمبيعات والمخزون عبر تلغرام',
        descEn: 'Daily sales & inventory summary via Telegram',
        icon: FileText,
        color: 'text-green-500',
        n8nFile: '02-daily-report.json',
        category: 'report',
    },
    {
        id: 'ai_assistant',
        nameAr: 'مساعد AI عبر تلغرام',
        nameEn: 'AI Telegram Assistant',
        descAr: 'مساعد ذكي يجيب على أسئلة المبيعات والمخزون',
        descEn: 'Smart assistant for sales & inventory queries',
        icon: Bot,
        color: 'text-purple-500',
        n8nFile: '03-ai-telegram-assistant.json',
        category: 'automation',
    },
    {
        id: 'sales_workflow',
        nameAr: 'أتمتة سير عمل المبيعات',
        nameEn: 'Sales Workflow Automation',
        descAr: 'إنشاء فاتورة تلقائياً عند التسليم + خصم المخزون + إشعار',
        descEn: 'Auto-create invoice on delivery + deduct stock + notify',
        icon: Zap,
        color: 'text-amber-500',
        n8nFile: '04-sales-workflow-automation.json',
        category: 'automation',
    },
];

// ─── Notification Events ────────────────────────────────────────────────
interface NotificationEvent {
    id: string;
    nameAr: string;
    nameEn: string;
    docType: string;
    trigger: string;
}

const NOTIFICATION_EVENTS: NotificationEvent[] = [
    { id: 'quotation_created', nameAr: 'إنشاء عرض سعر', nameEn: 'Quotation Created', docType: 'sales_quotation', trigger: 'on_create' },
    { id: 'quotation_approved', nameAr: 'قبول عرض السعر', nameEn: 'Quotation Approved', docType: 'sales_quotation', trigger: 'on_approve' },
    { id: 'order_confirmed', nameAr: 'تأكيد أمر البيع', nameEn: 'Order Confirmed', docType: 'sales_order', trigger: 'on_confirm' },
    { id: 'delivery_shipped', nameAr: 'شحن الطلب', nameEn: 'Order Shipped', docType: 'sales_delivery', trigger: 'on_ship' },
    { id: 'delivery_completed', nameAr: 'إتمام التسليم', nameEn: 'Delivery Completed', docType: 'sales_delivery', trigger: 'on_deliver' },
    { id: 'invoice_posted', nameAr: 'اعتماد الفاتورة', nameEn: 'Invoice Posted', docType: 'sales_invoice', trigger: 'on_post' },
    { id: 'invoice_paid', nameAr: 'سداد الفاتورة', nameEn: 'Invoice Paid', docType: 'sales_invoice', trigger: 'on_pay' },
    { id: 'invoice_overdue', nameAr: 'فاتورة متأخرة', nameEn: 'Invoice Overdue', docType: 'sales_invoice', trigger: 'on_overdue' },
];

// ─── Sales Document Types ───────────────────────────────────────────────
const SALES_DOC_TYPES = [
    { id: 'sales_quotation', labelAr: 'عرض السعر', labelEn: 'Quotation', icon: FileText, color: 'purple' },
    { id: 'sales_reservation', labelAr: 'حجز البضائع', labelEn: 'Reservation', icon: Package, color: 'cyan' },
    { id: 'sales_order', labelAr: 'أمر البيع', labelEn: 'Sales Order', icon: ShoppingCart, color: 'blue' },
    { id: 'sales_delivery', labelAr: 'إذن التسليم', labelEn: 'Delivery Note', icon: Truck, color: 'orange' },
    { id: 'sales_invoice', labelAr: 'فاتورة المبيعات', labelEn: 'Sales Invoice', icon: Receipt, color: 'green' },
];

// ─── Default Statuses for initialization ────────────────────────────────
const DEFAULT_STATUSES: Record<string, Array<{
    code: string; nameAr: string; nameEn: string; color: StatusColor;
    isInitial?: boolean; isFinal?: boolean;
}>> = {
    sales_quotation: [
        { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
        { code: 'sent', nameAr: 'مُرسل', nameEn: 'Sent', color: 'blue' },
        { code: 'approved', nameAr: 'مقبول', nameEn: 'Approved', color: 'green', isFinal: true },
        { code: 'rejected', nameAr: 'مرفوض', nameEn: 'Rejected', color: 'red', isFinal: true },
        { code: 'expired', nameAr: 'منتهي الصلاحية', nameEn: 'Expired', color: 'orange', isFinal: true },
    ],
    sales_reservation: [
        { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
        { code: 'confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed', color: 'blue' },
        { code: 'released', nameAr: 'مُفرج عنه', nameEn: 'Released', color: 'green', isFinal: true },
        { code: 'cancelled', nameAr: 'ملغي', nameEn: 'Cancelled', color: 'red', isFinal: true },
    ],
    sales_order: [
        { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
        { code: 'confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed', color: 'blue' },
        { code: 'processing', nameAr: 'قيد التنفيذ', nameEn: 'Processing', color: 'yellow' },
        { code: 'completed', nameAr: 'مكتمل', nameEn: 'Completed', color: 'green', isFinal: true },
        { code: 'cancelled', nameAr: 'ملغي', nameEn: 'Cancelled', color: 'red', isFinal: true },
    ],
    sales_delivery: [
        { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
        { code: 'picking', nameAr: 'جمع البضائع', nameEn: 'Picking', color: 'yellow' },
        { code: 'packed', nameAr: 'معبأ', nameEn: 'Packed', color: 'blue' },
        { code: 'shipped', nameAr: 'شُحن', nameEn: 'Shipped', color: 'indigo' },
        { code: 'delivered', nameAr: 'تم التسليم', nameEn: 'Delivered', color: 'green', isFinal: true },
        { code: 'cancelled', nameAr: 'ملغي', nameEn: 'Cancelled', color: 'red', isFinal: true },
    ],
    sales_invoice: [
        { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
        { code: 'posted', nameAr: 'مُعتمدة', nameEn: 'Posted', color: 'blue' },
        { code: 'partially_paid', nameAr: 'مدفوعة جزئياً', nameEn: 'Partially Paid', color: 'yellow' },
        { code: 'paid', nameAr: 'مدفوعة', nameEn: 'Paid', color: 'green', isFinal: true },
        { code: 'cancelled', nameAr: 'ملغية', nameEn: 'Cancelled', color: 'red', isFinal: true },
    ],
};

// ─── Component ──────────────────────────────────────────────────────────
// ─── Props ──────────────────────────────────────────────────────────────
interface WorkflowSettingsProps {
    config: WorkflowModuleConfig;
}

export function WorkflowSettings({ config }: WorkflowSettingsProps) {
    const { isRTL, t } = useLanguage();
    const { company, companyId } = useCompany();
    const tenantId = company?.tenant_id;

    // State
    const [activeDocType, setActiveDocType] = useState(config.docTypes[0]?.id || 'sales_quotation');
    const [statuses, setStatuses] = useState<CustomStatus[]>([]);
    const [transitions, setTransitions] = useState<StatusTransition[]>([]);
    const [loading, setLoading] = useState(true);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showTransitionDialog, setShowTransitionDialog] = useState(false);
    const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);

    // Notification & scenario toggles (persisted via localStorage for now)
    const [notifSettings, setNotifSettings] = useState<Record<string, { inApp: boolean; email: boolean; telegram: boolean }>>(() => {
        const saved = localStorage.getItem(`wf_notif_${config.moduleId}_${companyId}`);
        if (saved) return JSON.parse(saved);
        return Object.fromEntries(config.notificationEvents.map(e => [e.id, { inApp: true, email: false, telegram: false }]));
    });
    const [scenarioToggles, setScenarioToggles] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem(`wf_scenarios_${config.moduleId}_${companyId}`);
        if (saved) return JSON.parse(saved);
        return Object.fromEntries(config.automationScenarios.map(s => [s.id, false]));
    });

    // Persist notification settings
    useEffect(() => {
        localStorage.setItem(`wf_notif_${config.moduleId}_${companyId}`, JSON.stringify(notifSettings));
    }, [notifSettings, companyId, config.moduleId]);
    useEffect(() => {
        localStorage.setItem(`wf_scenarios_${config.moduleId}_${companyId}`, JSON.stringify(scenarioToggles));
    }, [scenarioToggles, companyId, config.moduleId]);

    // Status form
    const [statusForm, setStatusForm] = useState({
        code: '',
        name_ar: '',
        name_en: '',
        color: 'gray' as StatusColor,
        is_initial: false,
        is_final: false,
    });

    // Transition form
    const [transitionForm, setTransitionForm] = useState({
        from_status_id: '',
        to_status_id: '',
        allowed_roles: ['admin', 'sales'] as string[],
        requires_comment: false,
        requires_approval: false,
    });

    // Toggle notification channel
    const toggleNotif = useCallback((eventId: string, channel: 'inApp' | 'email' | 'telegram') => {
        setNotifSettings(prev => ({
            ...prev,
            [eventId]: { ...prev[eventId], [channel]: !prev[eventId]?.[channel] }
        }));
    }, []);

    // Toggle scenario
    const toggleScenario = useCallback((scenarioId: string) => {
        setScenarioToggles(prev => ({ ...prev, [scenarioId]: !prev[scenarioId] }));
        const scenario = config.automationScenarios.find(s => s.id === scenarioId);
        const newState = !scenarioToggles[scenarioId];
        toast.success(
            isRTL
                ? `${newState ? '✅ تم تفعيل' : '⏸ تم تعطيل'} ${scenario?.nameAr}`
                : `${newState ? '✅ Enabled' : '⏸ Disabled'} ${scenario?.nameEn}`
        );
    }, [scenarioToggles, isRTL, config.automationScenarios]);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statusData, transitionData] = await Promise.all([
                statusService.getStatuses(activeDocType, tenantId || companyId),
                statusService.getTransitions(activeDocType, tenantId || companyId),
            ]);
            setStatuses(statusData);
            setTransitions(transitionData);
        } catch (err) {
            console.error('Failed to load workflow data:', err);
            // Load empty — will show initialization option
            setStatuses([]);
            setTransitions([]);
        } finally {
            setLoading(false);
        }
    }, [activeDocType, companyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ─── Initialize Defaults ────────────────────────────────────────
    const handleInitializeDefaults = useCallback(async () => {
        try {
            const defaults = config.defaultStatuses[activeDocType];
            if (!defaults) return;

            // Create status group first
            const group = await statusService.createStatusGroup({
                doc_type: activeDocType,
                code: activeDocType,
                name_ar: config.docTypes.find(d => d.id === activeDocType)?.labelAr || activeDocType,
                name_en: config.docTypes.find(d => d.id === activeDocType)?.labelEn || activeDocType,
                sort_order: config.docTypes.findIndex(d => d.id === activeDocType),
                is_system: false,
                tenant_id: tenantId || companyId,
            });

            // Create statuses
            const createdStatuses: CustomStatus[] = [];
            for (let i = 0; i < defaults.length; i++) {
                const def = defaults[i];
                const status = await statusService.createStatus({
                    group_id: group.id,
                    doc_type: activeDocType,
                    code: def.code,
                    name_ar: def.nameAr,
                    name_en: def.nameEn,
                    color: def.color,
                    sort_order: i,
                    is_system: false,
                    is_initial: def.isInitial || false,
                    is_final: def.isFinal || false,
                    can_view_roles: ['admin', 'sales', 'warehouse'],
                    can_set_roles: ['admin', 'sales'],
                    auto_actions: [],
                    tenant_id: tenantId || companyId,
                });
                createdStatuses.push(status);
            }

            // Create basic transitions (sequential)
            for (let i = 0; i < createdStatuses.length - 1; i++) {
                const from = createdStatuses[i];
                const to = createdStatuses[i + 1];
                if (from.is_final) continue;
                await statusService.createTransition({
                    doc_type: activeDocType,
                    from_status_id: from.id,
                    to_status_id: to.id,
                    allowed_roles: ['admin', 'sales'],
                    requires_comment: false,
                    requires_approval: false,
                    tenant_id: tenantId || companyId,
                });
            }

            toast.success(isRTL ? 'تم تهيئة سير العمل الافتراضي' : 'Default workflow initialized');
            await loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to initialize');
        }
    }, [activeDocType, companyId, tenantId, isRTL, loadData]);

    // ─── Status CRUD ────────────────────────────────────────────────
    const handleSaveStatus = useCallback(async () => {
        try {
            if (editingStatus) {
                await statusService.updateStatus(editingStatus.id, {
                    ...statusForm,
                });
                toast.success(isRTL ? 'تم تحديث الحالة' : 'Status updated');
            } else {
                // Find group for this doc type
                const groups = await statusService.getStatusGroups(activeDocType, tenantId || companyId);
                const group = groups[0];
                if (!group) {
                    toast.error(isRTL ? 'يجب تهيئة سير العمل أولاً' : 'Initialize workflow first');
                    return;
                }
                await statusService.createStatus({
                    ...statusForm,
                    group_id: group.id,
                    doc_type: activeDocType,
                    sort_order: statuses.length,
                    is_system: false,
                    can_view_roles: ['admin', 'sales', 'warehouse'],
                    can_set_roles: ['admin', 'sales'],
                    auto_actions: [],
                    tenant_id: tenantId || companyId,
                });
                toast.success(isRTL ? 'تمت إضافة الحالة' : 'Status added');
            }
            setShowStatusDialog(false);
            setEditingStatus(null);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save status');
        }
    }, [editingStatus, statusForm, activeDocType, companyId, isRTL, statuses, loadData]);

    const handleDeleteStatus = useCallback(async (id: string) => {
        try {
            await statusService.deleteStatus(id);
            toast.success(isRTL ? 'تم حذف الحالة' : 'Status deleted');
            await loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    }, [isRTL, loadData]);

    const handleEditStatus = useCallback((status: CustomStatus) => {
        setEditingStatus(status);
        setStatusForm({
            code: status.code,
            name_ar: status.name_ar,
            name_en: status.name_en || '',
            color: (status.color || 'gray') as StatusColor,
            is_initial: status.is_initial,
            is_final: status.is_final,
        });
        setShowStatusDialog(true);
    }, []);

    // ─── Transition CRUD ────────────────────────────────────────────
    const handleSaveTransition = useCallback(async () => {
        try {
            if (transitionForm.from_status_id === transitionForm.to_status_id) {
                toast.error(isRTL ? 'لا يمكن التحويل لنفس الحالة' : 'Cannot transition to same status');
                return;
            }
            await statusService.createTransition({
                ...transitionForm,
                doc_type: activeDocType,
                tenant_id: tenantId || companyId,
            });
            toast.success(isRTL ? 'تمت إضافة قاعدة التحويل' : 'Transition rule added');
            setShowTransitionDialog(false);
            await loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    }, [transitionForm, activeDocType, companyId, isRTL, loadData]);

    const handleDeleteTransition = useCallback(async (id: string) => {
        try {
            await statusService.deleteTransition(id);
            toast.success(isRTL ? 'تم حذف قاعدة التحويل' : 'Transition deleted');
            await loadData();
        } catch (err: any) {
            toast.error(err.message);
        }
    }, [isRTL, loadData]);

    // ─── Helpers ────────────────────────────────────────────────────
    const getStatusName = (id: string) => {
        const s = statuses.find(s => s.id === id);
        return s ? (isRTL ? s.name_ar : s.name_en || s.name_ar) : '?';
    };

    const getStatusColor = (id: string) => {
        const s = statuses.find(s => s.id === id);
        return (s?.color || 'gray') as StatusColor;
    };

    const activeDocTypeDef = config.docTypes.find(d => d.id === activeDocType);
    const ModuleIcon = config.icon;

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-erp-navy dark:text-white">
                        <Settings2 className="w-6 h-6 text-indigo-600" />
                        {isRTL ? config.titleAr : config.titleEn}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {isRTL ? config.descriptionAr : config.descriptionEn}
                    </p>
                </div>
            </div>

            {/* Quick Stats Dashboard */}
            {statuses.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <Circle className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{statuses.length}</p>
                            <p className="text-[10px] text-blue-500">{isRTL ? 'مراحل' : 'Statuses'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                        <ArrowRight className="w-5 h-5 text-amber-600" />
                        <div>
                            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{transitions.length}</p>
                            <p className="text-[10px] text-amber-500">{isRTL ? 'تحويلات' : 'Transitions'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                        <div>
                            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{transitions.filter(t => t.requires_approval).length}</p>
                            <p className="text-[10px] text-purple-500">{isRTL ? 'تتطلب موافقة' : 'Need Approval'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                        <Bell className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">{Object.values(notifSettings).filter((s: any) => s.inApp || s.email || s.telegram).length}</p>
                            <p className="text-[10px] text-green-500">{isRTL ? 'إشعارات مفعلة' : 'Active Notifs'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Type Selector */}
            <div className="flex gap-2 flex-wrap">
                {config.docTypes.map(dt => {
                    const Icon = dt.icon;
                    const isActive = dt.id === activeDocType;
                    const colorConfig = STATUS_COLORS[dt.color as StatusColor] || STATUS_COLORS.gray;
                    return (
                        <Button
                            key={dt.id}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                                'gap-2 h-10 px-4 transition-all',
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : `${colorConfig.bg} ${colorConfig.text} hover:opacity-80 border-0`
                            )}
                            onClick={() => setActiveDocType(dt.id)}
                        >
                            <Icon className="w-4 h-4" />
                            {isRTL ? dt.labelAr : dt.labelEn}
                        </Button>
                    );
                })}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
                </div>
            ) : statuses.length === 0 ? (
                /* Empty State — Initialize */
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Zap className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold">
                            {isRTL ? 'لم يتم تهيئة سير العمل بعد' : 'Workflow not yet configured'}
                        </h3>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                            {isRTL
                                ? `اضغط لتهيئة مراحل ${activeDocTypeDef?.labelAr} الافتراضية. يمكنك تعديلها لاحقاً حسب أعمالك.`
                                : `Click to initialize default ${activeDocTypeDef?.labelEn} stages. You can customize them later.`}
                        </p>
                        <Button onClick={handleInitializeDefaults} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <Zap className="w-4 h-4" />
                            {isRTL ? 'تهيئة سير العمل الافتراضي' : 'Initialize Default Workflow'}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="statuses" className="space-y-4">
                    <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
                        <TabsTrigger value="statuses" className="gap-2">
                            <Circle className="w-3.5 h-3.5" />
                            {isRTL ? 'المراحل' : 'Statuses'}
                            <Badge variant="secondary" className="text-xs">{statuses.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="transitions" className="gap-2">
                            <ArrowRight className="w-3.5 h-3.5" />
                            {isRTL ? 'قواعد التحويل' : 'Transitions'}
                            <Badge variant="secondary" className="text-xs">{transitions.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="gap-2">
                            <Bell className="w-3.5 h-3.5" />
                            {isRTL ? 'الإشعارات' : 'Notifications'}
                        </TabsTrigger>
                        <TabsTrigger value="scenarios" className="gap-2">
                            <Bot className="w-3.5 h-3.5" />
                            {isRTL ? 'السيناريوهات' : 'Scenarios'}
                            <Badge variant="secondary" className="text-xs">{config.automationScenarios.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="flow" className="gap-2">
                            <Eye className="w-3.5 h-3.5" />
                            {isRTL ? 'عرض المسار' : 'Flow View'}
                        </TabsTrigger>
                    </TabsList>

                    {/* ─── Tab 1: Statuses ─── */}
                    <TabsContent value="statuses">
                        {/* Info Banner */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                                    <p className="font-bold text-sm">{isRTL ? 'ما هي المراحل؟' : 'What are Statuses?'}</p>
                                    <p>{isRTL
                                        ? 'المراحل هي الحالات التي يمر بها المستند خلال دورة حياته. مثلاً: مسودة ← مؤكد ← مُسلَّم ← مدفوع.'
                                        : 'Statuses represent the stages a document goes through. Example: Draft → Confirmed → Delivered → Paid.'}</p>
                                    <p>{isRTL
                                        ? '🟢 الحالة الابتدائية: أول حالة للمستند الجديد | 🔴 الحالة النهائية: تعني أن المستند مكتمل أو ملغي ولا يمكن تغييره.'
                                        : '🟢 Initial: first status for new docs | 🔴 Final: document is complete or cancelled, no further changes.'}</p>
                                </div>
                            </div>
                        </div>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <div>
                                    <CardTitle className="text-base">
                                        {isRTL ? `مراحل ${activeDocTypeDef?.labelAr}` : `${activeDocTypeDef?.labelEn} Statuses`}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {isRTL ? 'أضف أو عدّل المراحل وترتيبها' : 'Add, edit, or reorder statuses'}
                                    </CardDescription>
                                </div>
                                <Button size="sm" className="gap-2 bg-indigo-600" onClick={() => {
                                    setEditingStatus(null);
                                    setStatusForm({ code: '', name_ar: '', name_en: '', color: 'gray', is_initial: false, is_final: false });
                                    setShowStatusDialog(true);
                                }}>
                                    <Plus className="w-4 h-4" />
                                    {isRTL ? 'إضافة حالة' : 'Add Status'}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {statuses.map((status, idx) => {
                                    const colorConfig = STATUS_COLORS[status.color as StatusColor] || STATUS_COLORS.gray;
                                    return (
                                        <div
                                            key={status.id}
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                                colorConfig.border
                                            )}
                                        >
                                            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
                                            <span className="text-sm text-gray-400 w-6 text-center font-mono">{idx + 1}</span>
                                            <div className={cn('w-3 h-3 rounded-full shrink-0', colorConfig.bg)}
                                                style={{ boxShadow: `0 0 0 2px var(--${status.color}-200, #ccc)` }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('font-semibold text-sm', colorConfig.text)}>
                                                        {isRTL ? status.name_ar : status.name_en || status.name_ar}
                                                    </span>
                                                    <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                                                        {status.code}
                                                    </code>
                                                </div>
                                            </div>
                                            {/* Badges */}
                                            <div className="flex items-center gap-1.5">
                                                {status.is_initial && (
                                                    <Badge className="bg-green-100 text-green-700 text-[10px] border-0 gap-1">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        {isRTL ? 'ابتدائية' : 'Initial'}
                                                    </Badge>
                                                )}
                                                {status.is_final && (
                                                    <Badge className="bg-red-100 text-red-700 text-[10px] border-0 gap-1">
                                                        <XCircle className="w-2.5 h-2.5" />
                                                        {isRTL ? 'نهائية' : 'Final'}
                                                    </Badge>
                                                )}
                                                {status.is_system && (
                                                    <Badge className="bg-gray-100 text-gray-500 text-[10px] border-0 gap-1">
                                                        <Shield className="w-2.5 h-2.5" />
                                                        {isRTL ? 'نظام' : 'System'}
                                                    </Badge>
                                                )}
                                            </div>
                                            {/* Actions */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditStatus(status)} className="gap-2">
                                                        <Edit className="w-3.5 h-3.5" /> {isRTL ? 'تعديل' : 'Edit'}
                                                    </DropdownMenuItem>
                                                    {!status.is_system && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteStatus(status.id)}
                                                            className="gap-2 text-red-600"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> {isRTL ? 'حذف' : 'Delete'}
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─── Tab 2: Transitions ─── */}
                    <TabsContent value="transitions">
                        {/* Info Banner */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                    <p className="font-bold text-sm">{isRTL ? 'ما هي قواعد التحويل؟' : 'What are Transition Rules?'}</p>
                                    <p>{isRTL
                                        ? 'قواعد التحويل تحدد المسارات المسموحة بين المراحل ومن يستطيع تنفيذ كل تحويل. مثلاً: فقط المدير يمكنه تحويل الأمر من "مسودة" إلى "مؤكد".'
                                        : 'Transition rules define which paths between statuses are allowed and who can perform each transition.'}</p>
                                    <p>{isRTL
                                        ? '🔒 يتطلب موافقة: يتوقف المستند حتى يوافق المسؤول | 💬 يتطلب تعليق: لا يتم التحويل بدون سبب مكتوب.'
                                        : '🔒 Requires Approval: document pauses until authorized user approves | 💬 Requires Comment: transition needs a written reason.'}</p>
                                </div>
                            </div>
                        </div>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <div>
                                    <CardTitle className="text-base">
                                        {isRTL ? 'قواعد التحويل' : 'Transition Rules'}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {isRTL ? 'حدد مسارات التحويل المسموحة بين المراحل' : 'Define allowed transition paths between statuses'}
                                    </CardDescription>
                                </div>
                                <Button size="sm" className="gap-2 bg-indigo-600" onClick={() => {
                                    setTransitionForm({
                                        from_status_id: statuses[0]?.id || '',
                                        to_status_id: statuses[1]?.id || '',
                                        allowed_roles: ['admin', 'sales'],
                                        requires_comment: false,
                                        requires_approval: false,
                                    });
                                    setShowTransitionDialog(true);
                                }}>
                                    <Plus className="w-4 h-4" />
                                    {isRTL ? 'إضافة قاعدة' : 'Add Rule'}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {transitions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        {isRTL ? 'لا توجد قواعد تحويل — أضف قاعدة جديدة' : 'No transition rules — add a new rule'}
                                    </div>
                                ) : transitions.map(tr => {
                                    const fromColor = STATUS_COLORS[getStatusColor(tr.from_status_id)] || STATUS_COLORS.gray;
                                    const toColor = STATUS_COLORS[getStatusColor(tr.to_status_id)] || STATUS_COLORS.gray;
                                    return (
                                        <div key={tr.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            {/* From */}
                                            <Badge className={cn('text-xs border-0', fromColor.bg, fromColor.text)}>
                                                {getStatusName(tr.from_status_id)}
                                            </Badge>
                                            {/* Arrow */}
                                            <ArrowRight className={cn('w-5 h-5 text-gray-300 shrink-0', isRTL && 'rotate-180')} />
                                            {/* To */}
                                            <Badge className={cn('text-xs border-0', toColor.bg, toColor.text)}>
                                                {getStatusName(tr.to_status_id)}
                                            </Badge>
                                            {/* Roles */}
                                            <div className="flex-1 flex items-center gap-1.5 ms-2">
                                                <Shield className="w-3 h-3 text-gray-300" />
                                                <span className="text-[10px] text-gray-400">
                                                    {tr.allowed_roles?.join(', ') || 'all'}
                                                </span>
                                            </div>
                                            {/* Flags */}
                                            {tr.requires_comment && (
                                                <Badge variant="outline" className="text-[10px] gap-1">
                                                    <FileText className="w-2.5 h-2.5" />
                                                    {isRTL ? 'تعليق' : 'Comment'}
                                                </Badge>
                                            )}
                                            {tr.requires_approval && (
                                                <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-600">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    {isRTL ? 'موافقة' : 'Approval'}
                                                </Badge>
                                            )}
                                            {/* Delete */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-gray-300 hover:text-red-500"
                                                onClick={() => handleDeleteTransition(tr.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─── Tab 3: Flow View ─── */}
                    <TabsContent value="flow">
                        <WorkflowVisualEditor
                            statuses={statuses}
                            transitions={transitions}
                            isRTL={isRTL}
                            onStatusClick={(status) => {
                                setEditingStatus(status);
                                setStatusForm({
                                    code: status.code,
                                    name_ar: status.name_ar,
                                    name_en: status.name_en || '',
                                    color: (status.color as StatusColor) || 'gray',
                                    is_initial: status.is_initial || false,
                                    is_final: status.is_final || false,
                                });
                                setShowStatusDialog(true);
                            }}
                        />
                    </TabsContent>

                    {/* ─── Tab 4: Notifications ─── */}
                    <TabsContent value="notifications">
                        {/* Info Banner */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-purple-800 dark:text-purple-300 space-y-1">
                                    <p className="font-bold text-sm">{isRTL ? 'كيف تعمل الإشعارات؟' : 'How do Notifications work?'}</p>
                                    <p>{isRTL
                                        ? '1️⃣ فعّل القنوات المطلوبة لكل حدث (تطبيق / بريد / تلغرام)'
                                        : '1️⃣ Enable channels per event (App / Email / Telegram)'}</p>
                                    <p>{isRTL
                                        ? '2️⃣ حدد المستلمين: اختر الأدوار أو "العميل" ليستلم الإشعار تلقائياً'
                                        : '2️⃣ Set recipients: choose roles or "Customer" to auto-notify'}</p>
                                </div>
                            </div>
                        </div>
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-indigo-600" />
                                    {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {isRTL ? 'تحكم بالإشعارات والمستلمين لكل حدث' : 'Control notifications and recipients per event'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-0">
                                {/* Events List */}
                                <div className="divide-y">
                                    {config.notificationEvents.map(event => {
                                        const settings = notifSettings[event.id] || { inApp: true, email: false, telegram: false };
                                        const recipients: string[] = (settings as any).recipients || ['sales'];
                                        const RECIPIENT_OPTIONS = [
                                            { id: 'admin', labelAr: 'مدير', labelEn: 'Admin', icon: Shield, color: 'text-red-600' },
                                            { id: 'manager', labelAr: 'مدير عام', labelEn: 'Manager', icon: UserCheck, color: 'text-blue-600' },
                                            { id: 'sales', labelAr: 'مبيعات', labelEn: 'Sales', icon: ShoppingCart, color: 'text-green-600' },
                                            { id: 'warehouse', labelAr: 'مستودع', labelEn: 'Warehouse', icon: Package, color: 'text-cyan-600' },
                                            { id: 'accountant', labelAr: 'محاسب', labelEn: 'Accountant', icon: Receipt, color: 'text-amber-600' },
                                            { id: 'customer', labelAr: 'العميل', labelEn: 'Customer', icon: Users, color: 'text-emerald-600' },
                                        ];
                                        return (
                                            <div key={event.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                {/* Event name + channels */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-medium">{isRTL ? event.nameAr : event.nameEn}</span>
                                                        <span className="text-[10px] text-gray-400 ms-2">{event.docType}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="flex items-center gap-1" title={isRTL ? 'داخل التطبيق' : 'In-App'}>
                                                            <Bell className={cn('w-3 h-3', settings.inApp ? 'text-indigo-500' : 'text-gray-300')} />
                                                            <Switch checked={settings.inApp} onCheckedChange={() => toggleNotif(event.id, 'inApp')} />
                                                        </div>
                                                        <div className="flex items-center gap-1" title={isRTL ? 'بريد' : 'Email'}>
                                                            <Mail className={cn('w-3 h-3', settings.email ? 'text-indigo-500' : 'text-gray-300')} />
                                                            <Switch checked={settings.email} onCheckedChange={() => toggleNotif(event.id, 'email')} />
                                                        </div>
                                                        <div className="flex items-center gap-1" title="Telegram">
                                                            <MessageSquare className={cn('w-3 h-3', settings.telegram ? 'text-indigo-500' : 'text-gray-300')} />
                                                            <Switch checked={settings.telegram} onCheckedChange={() => toggleNotif(event.id, 'telegram')} />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Recipients row */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-gray-400 shrink-0">{isRTL ? 'المستلمون:' : 'To:'}</span>
                                                    {RECIPIENT_OPTIONS.map(role => {
                                                        const RIcon = role.icon;
                                                        const isSelected = recipients.includes(role.id);
                                                        return (
                                                            <button
                                                                key={role.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newR = isSelected ? recipients.filter(r => r !== role.id) : [...recipients, role.id];
                                                                    setNotifSettings(prev => ({ ...prev, [event.id]: { ...settings, recipients: newR } }));
                                                                }}
                                                                className={cn(
                                                                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                                                                    isSelected
                                                                        ? role.id === 'customer'
                                                                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/40'
                                                                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30'
                                                                        : 'bg-white border-gray-200 text-gray-300 dark:bg-gray-900 dark:border-gray-700'
                                                                )}
                                                            >
                                                                <RIcon className={cn('w-2.5 h-2.5', isSelected ? role.color : 'text-gray-300')} />
                                                                {isRTL ? role.labelAr : role.labelEn}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Customer Note */}
                                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                                    <Users className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">{isRTL ? 'إشعارات العميل' : 'Customer Notifications'}</p>
                                        <p className="mt-1">{isRTL
                                            ? 'عند اختيار "العميل"، يُرسل إشعار تلقائي للعميل المرتبط بالمستند. مثل: "شكراً لحجزك" أو "تم شحن طلبك".'
                                            : 'When "Customer" is selected, auto-notifications are sent to the document\'s customer. E.g. "Thanks for your order" or "Your order shipped".'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─── Tab 5: Automation Scenarios ─── */}
                    <TabsContent value="scenarios">
                        <div className="space-y-4">
                            {/* Info Banner */}
                            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">
                                            {isRTL ? 'سيناريوهات الأتمتة الجاهزة' : 'Pre-built Automation Scenarios'}
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {isRTL
                                                ? 'فعّل/عطّل السيناريوهات حسب حاجتك. كل سيناريو يعمل تلقائياً بمجرد تفعيله — لا يحتاج إعداد تقني.'
                                                : 'Toggle scenarios as needed. Each runs automatically once enabled — no technical setup required.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Scenario Cards */}
                            {config.automationScenarios.map(scenario => {
                                const Icon = scenario.icon;
                                const isActive = scenarioToggles[scenario.id] || false;
                                return (
                                    <Card key={scenario.id} className={cn(
                                        'transition-all',
                                        isActive ? 'border-indigo-200 dark:border-indigo-800 shadow-sm' : 'opacity-75'
                                    )}>
                                        <CardContent className="flex items-center gap-4 py-4">
                                            {/* Icon */}
                                            <div className={cn(
                                                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                                                isActive ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800'
                                            )}>
                                                <Icon className={cn('w-6 h-6', isActive ? scenario.color : 'text-gray-400')} />
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-sm">
                                                        {isRTL ? scenario.nameAr : scenario.nameEn}
                                                    </h4>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {scenario.category === 'notification' ? (isRTL ? 'إشعارات' : 'Notification') :
                                                            scenario.category === 'report' ? (isRTL ? 'تقارير' : 'Report') :
                                                                (isRTL ? 'أتمتة' : 'Automation')}
                                                    </Badge>
                                                    {isActive && (
                                                        <Badge className="bg-green-100 text-green-700 text-[10px] border-0 gap-1">
                                                            <Play className="w-2.5 h-2.5" />
                                                            {isRTL ? 'نشط' : 'Active'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {isRTL ? scenario.descAr : scenario.descEn}
                                                </p>
                                            </div>
                                            {/* Toggle Only — no n8n link */}
                                            <div className="shrink-0">
                                                <Switch
                                                    checked={isActive}
                                                    onCheckedChange={() => toggleScenario(scenario.id)}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {/* Request New Scenario */}
                            <Card className="border-dashed">
                                <CardContent className="flex items-center justify-center gap-3 py-6">
                                    <HelpCircle className="w-5 h-5 text-gray-400" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium">
                                            {isRTL ? 'تحتاج سيناريو إضافي؟' : 'Need an additional scenario?'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {isRTL
                                                ? 'تواصل مع فريق الدعم لإضافة سيناريو مخصص لاحتياجات عملك'
                                                : 'Contact support to add a custom scenario tailored to your business'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {/* ═══ Status Dialog ═══ */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>
                            {editingStatus
                                ? (isRTL ? 'تعديل الحالة' : 'Edit Status')
                                : (isRTL ? 'إضافة حالة جديدة' : 'Add New Status')}
                        </DialogTitle>
                        <DialogDescription>
                            {isRTL ? 'حدد اسم ولون وخصائص الحالة' : 'Set the name, color, and properties'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{isRTL ? 'الاسم بالعربية' : 'Arabic Name'}</Label>
                                <Input
                                    value={statusForm.name_ar}
                                    onChange={e => setStatusForm(f => ({ ...f, name_ar: e.target.value }))}
                                    dir="rtl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRTL ? 'الاسم بالإنجليزية' : 'English Name'}</Label>
                                <Input
                                    value={statusForm.name_en}
                                    onChange={e => setStatusForm(f => ({ ...f, name_en: e.target.value }))}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{isRTL ? 'الكود' : 'Code'}</Label>
                                <Input
                                    value={statusForm.code}
                                    onChange={e => setStatusForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                    dir="ltr"
                                    className="font-mono"
                                    placeholder="e.g. draft"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <Palette className="w-3.5 h-3.5" />
                                    {isRTL ? 'اللون' : 'Color'}
                                </Label>
                                <Select value={statusForm.color} onValueChange={v => setStatusForm(f => ({ ...f, color: v as StatusColor }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(STATUS_COLORS).map(c => {
                                            const cc = STATUS_COLORS[c as StatusColor];
                                            return (
                                                <SelectItem key={c} value={c}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn('w-3 h-3 rounded-full', cc.bg)} />
                                                        {c}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={statusForm.is_initial}
                                    onCheckedChange={v => setStatusForm(f => ({ ...f, is_initial: v }))}
                                />
                                <Label className="text-sm">{isRTL ? 'حالة ابتدائية' : 'Initial Status'}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={statusForm.is_final}
                                    onCheckedChange={v => setStatusForm(f => ({ ...f, is_final: v }))}
                                />
                                <Label className="text-sm">{isRTL ? 'حالة نهائية' : 'Final Status'}</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveStatus} className="bg-indigo-600 hover:bg-indigo-700">
                            {isRTL ? 'حفظ' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Transition Dialog ═══ */}
            <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
                <DialogContent className="sm:max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-indigo-600" />
                            {isRTL ? 'إضافة قاعدة تحويل' : 'Add Transition Rule'}
                        </DialogTitle>
                        <DialogDescription>
                            {isRTL ? 'حدد المسار والصلاحيات وشروط الموافقة' : 'Define the path, permissions, and approval conditions'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        {/* From → To */}
                        <div className="grid grid-cols-5 gap-2 items-end">
                            <div className="col-span-2 space-y-2">
                                <Label>{isRTL ? 'من الحالة' : 'From Status'}</Label>
                                <Select value={transitionForm.from_status_id} onValueChange={v => setTransitionForm(f => ({ ...f, from_status_id: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {statuses.filter(s => !s.is_final).map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLORS[s.color as StatusColor]?.bg || 'bg-gray-200')} />
                                                    {isRTL ? s.name_ar : s.name_en || s.name_ar}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-center pb-2">
                                <ArrowRight className={cn('w-5 h-5 text-gray-300', isRTL && 'rotate-180')} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>{isRTL ? 'إلى الحالة' : 'To Status'}</Label>
                                <Select value={transitionForm.to_status_id} onValueChange={v => setTransitionForm(f => ({ ...f, to_status_id: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {statuses.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLORS[s.color as StatusColor]?.bg || 'bg-gray-200')} />
                                                    {isRTL ? s.name_ar : s.name_en || s.name_ar}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Allowed Roles — Chips */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                                {isRTL ? 'الأدوار المسموحة بالتحويل' : 'Roles Allowed to Transition'}
                            </Label>
                            <p className="text-[11px] text-gray-400">
                                {isRTL ? 'اختر الأدوار التي يمكنها تنفيذ هذا التحويل. اضغط لتفعيل/تعطيل.' : 'Select roles that can perform this transition. Click to toggle.'}
                            </p>
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                {AVAILABLE_ROLES.map(role => {
                                    const RoleIcon = role.icon;
                                    const isSelected = transitionForm.allowed_roles.includes(role.id);
                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setTransitionForm(f => ({
                                                ...f,
                                                allowed_roles: isSelected
                                                    ? f.allowed_roles.filter(r => r !== role.id)
                                                    : [...f.allowed_roles, role.id]
                                            }))}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                                                isSelected
                                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700 shadow-sm'
                                                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700'
                                            )}
                                        >
                                            <RoleIcon className={cn('w-3 h-3', isSelected ? role.color : 'text-gray-300')} />
                                            {isRTL ? role.labelAr : role.labelEn}
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <Label className="text-sm">{isRTL ? 'يتطلب تعليق' : 'Require Comment'}</Label>
                                        <p className="text-[10px] text-gray-400">{isRTL ? 'يجب كتابة سبب عند التحويل' : 'Must write a reason for the transition'}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={transitionForm.requires_comment}
                                    onCheckedChange={v => setTransitionForm(f => ({ ...f, requires_comment: v }))}
                                />
                            </div>
                            <div className="border-t dark:border-gray-700" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-amber-500" />
                                    <div>
                                        <Label className="text-sm">{isRTL ? 'يتطلب موافقة مسؤول' : 'Require Approval'}</Label>
                                        <p className="text-[10px] text-gray-400">{isRTL ? 'المستند يتوقف حتى يوافق/يرفض المسؤول' : 'Document pauses until approved/rejected'}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={transitionForm.requires_approval}
                                    onCheckedChange={v => setTransitionForm(f => ({ ...f, requires_approval: v }))}
                                />
                            </div>
                            {/* Approval Roles — show only when requires_approval */}
                            {transitionForm.requires_approval && (
                                <div className="pt-2 ps-6 space-y-2 border-t dark:border-gray-700">
                                    <Label className="text-xs text-amber-600 flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        {isRTL ? 'من يمكنه الموافقة/الرفض؟' : 'Who can approve/reject?'}
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {AVAILABLE_ROLES.filter(r => ['admin', 'owner', 'manager'].includes(r.id)).map(role => {
                                            const RoleIcon = role.icon;
                                            const approvalRoles = (transitionForm as any).approval_roles || ['admin'];
                                            const isSelected = approvalRoles.includes(role.id);
                                            return (
                                                <button
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => setTransitionForm(f => ({
                                                        ...f,
                                                        approval_roles: isSelected
                                                            ? (f as any).approval_roles?.filter((r: string) => r !== role.id) || []
                                                            : [...((f as any).approval_roles || ['admin']), role.id]
                                                    } as any))}
                                                    className={cn(
                                                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                                                        isSelected
                                                            ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                            : 'bg-white border-gray-200 text-gray-400 dark:bg-gray-900 dark:border-gray-700'
                                                    )}
                                                >
                                                    <RoleIcon className={cn('w-2.5 h-2.5', isSelected ? role.color : 'text-gray-300')} />
                                                    {isRTL ? role.labelAr : role.labelEn}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTransitionDialog(false)}>
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSaveTransition} className="bg-indigo-600 hover:bg-indigo-700">
                            {isRTL ? 'إضافة' : 'Add'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Default Export: Sales-specific wrapper ─────────────────────────
export default function SalesWorkflowSettings() {
    return <WorkflowSettings config={SALES_WORKFLOW_CONFIG} />;
}
