/**
 * WorkflowCenter — مركز إدارة سير العمل الموحد
 * الصفحة الرئيسية التي تعرض جميع الموديولات وسيناريوهات الأتمتة
 * مع إمكانية فتح أي موديول وتعديل سير العمل بشكل مرئي
 */

import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
    GitBranch,
    Network,
    Settings2,
    LayoutDashboard,
    ShoppingCart,
    Users,
    ShoppingBag,
    Package,
    Zap,
    Bell,
    Bot,
    Mail,
    Send,
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    Eye,
    Edit3,
    Plus,
    Search,
    Filter,
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Workflow as WorkflowIcon,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

import { WorkflowCanvas } from './components/WorkflowCanvas';
import {
    SALES_WORKFLOW_CONFIG,
    CRM_WORKFLOW_CONFIG,
    PURCHASES_WORKFLOW_CONFIG,
} from '@/components/workflow/workflowConfigs';
import type { WorkflowModuleConfig as WMC } from '@/components/workflow/workflowConfigs';

// ========================================
// بيانات الموديولات
// ========================================

interface ModuleInfo {
    id: string;
    config: WMC;
    icon: typeof ShoppingCart;
    color: string;
    gradient: string;
    stats: {
        docTypes: number;
        statuses: number;
        transitions: number;
        scenarios: number;
        activeScenarios: number;
    };
}

const MODULES: ModuleInfo[] = [
    {
        id: 'sales',
        config: SALES_WORKFLOW_CONFIG,
        icon: ShoppingCart,
        color: 'text-emerald-600',
        gradient: 'from-emerald-500/10 to-teal-500/10',
        stats: { docTypes: 4, statuses: 20, transitions: 12, scenarios: 4, activeScenarios: 3 },
    },
    {
        id: 'crm',
        config: CRM_WORKFLOW_CONFIG,
        icon: Users,
        color: 'text-blue-600',
        gradient: 'from-blue-500/10 to-indigo-500/10',
        stats: { docTypes: 5, statuses: 18, transitions: 10, scenarios: 4, activeScenarios: 2 },
    },
    {
        id: 'purchases',
        config: PURCHASES_WORKFLOW_CONFIG,
        icon: ShoppingBag,
        color: 'text-amber-600',
        gradient: 'from-amber-500/10 to-orange-500/10',
        stats: { docTypes: 4, statuses: 16, transitions: 8, scenarios: 3, activeScenarios: 2 },
    },
];

// ========================================
// سيناريوهات الأتمتة (بيانات تجريبية)
// ========================================

interface Scenario {
    id: string;
    name: string;
    nameEn: string;
    moduleId: string;
    triggerType: string;
    triggerLabel: string;
    actionType: 'notification' | 'email' | 'webhook' | 'ai' | 'auto';
    actionLabel: string;
    isActive: boolean;
    lastTriggered?: string;
}

const SCENARIOS: Scenario[] = [
    {
        id: 's1', name: 'إشعار Telegram عند تأكيد الطلب', nameEn: 'Telegram on Order Confirm',
        moduleId: 'sales', triggerType: 'status_change', triggerLabel: 'عند التأكيد',
        actionType: 'notification', actionLabel: 'Telegram + In-App',
        isActive: true, lastTriggered: '2026-02-09T22:30:00',
    },
    {
        id: 's2', name: 'مساعد AI لتحليل العروض', nameEn: 'AI Quote Analyzer',
        moduleId: 'crm', triggerType: 'on_create', triggerLabel: 'عند إنشاء صفقة',
        actionType: 'ai', actionLabel: 'GPT-4 Analysis',
        isActive: true, lastTriggered: '2026-02-09T18:00:00',
    },
    {
        id: 's3', name: 'إنشاء فاتورة تلقائي', nameEn: 'Auto Invoice from Delivery',
        moduleId: 'sales', triggerType: 'status_change', triggerLabel: 'عند التسليم',
        actionType: 'auto', actionLabel: 'إنشاء فاتورة',
        isActive: true, lastTriggered: '2026-02-09T15:00:00',
    },
    {
        id: 's4', name: 'بريد ترحيبي لجهات الاتصال', nameEn: 'Welcome Email',
        moduleId: 'crm', triggerType: 'on_create', triggerLabel: 'عند إنشاء جهة اتصال',
        actionType: 'email', actionLabel: 'Email Template',
        isActive: false,
    },
    {
        id: 's5', name: 'إشعار تأخر التسليم', nameEn: 'Late Delivery Alert',
        moduleId: 'purchases', triggerType: 'scheduled', triggerLabel: 'يومياً',
        actionType: 'notification', actionLabel: 'Email + Telegram',
        isActive: true, lastTriggered: '2026-02-09T08:00:00',
    },
    {
        id: 's6', name: 'Webhook عند الموافقة على أمر الشراء', nameEn: 'Webhook on PO Approval',
        moduleId: 'purchases', triggerType: 'status_change', triggerLabel: 'عند الموافقة',
        actionType: 'webhook', actionLabel: 'n8n Webhook',
        isActive: true, lastTriggered: '2026-02-08T12:00:00',
    },
    {
        id: 's7', name: 'تذكير متابعة الصفقات', nameEn: 'Deal Follow-up Reminder',
        moduleId: 'crm', triggerType: 'scheduled', triggerLabel: 'كل 3 أيام',
        actionType: 'notification', actionLabel: 'In-App + Email',
        isActive: false,
    },
];

// ========================================
// الأيقونات حسب نوع الإجراء
// ========================================

const ACTION_ICONS: Record<string, typeof Bell> = {
    notification: Bell,
    email: Mail,
    webhook: Send,
    ai: Bot,
    auto: Zap,
};

const ACTION_COLORS: Record<string, string> = {
    notification: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    email: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
    webhook: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
    ai: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
    auto: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
};

// ========================================
// المكون الرئيسي
// ========================================

export default function WorkflowCenter() {
    const { isRTL, t, language } = useLanguage();
    const { company } = useCompany();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState<'overview' | 'editor' | 'scenarios'>('overview');
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedDocTypeId, setSelectedDocTypeId] = useState<string | null>(null);
    const [scenarioFilter, setScenarioFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // ========== بناء عقد وأسهم من config ==========
    const buildFlowElements = useCallback(
        (moduleId: string, docTypeId: string): { nodes: Node[]; edges: Edge[] } => {
            const module = MODULES.find((m) => m.id === moduleId);
            if (!module) return { nodes: [], edges: [] };

            // الحالات مخزنة على مستوى الموديول: config.defaultStatuses[docTypeId]
            const statuses = module.config.defaultStatuses[docTypeId] || [];
            if (statuses.length === 0) return { nodes: [], edges: [] };

            const nodes: Node[] = statuses.map((status, i) => ({
                id: `status-${status.code}`,
                type: 'statusNode',
                position: { x: 0, y: 0 }, // ELK سيحدد
                data: {
                    type: 'status',
                    label: status.nameAr,
                    labelEn: status.nameEn,
                    code: status.code,
                    color: status.color || 'gray',
                    isInitial: status.isInitial || false,
                    isFinal: status.isFinal || false,
                    sortOrder: i + 1,
                },
            }));

            // بناء التحويلات تلقائياً: كل حالة غير نهائية → الحالة التالية
            // + أي حالة غير نهائية → حالات الإلغاء/الرفض
            const edges: Edge[] = [];
            const nonFinalStatuses = statuses.filter(s => !s.isFinal);
            const finalRejectStatuses = statuses.filter(s => s.isFinal && (s.code === 'cancelled' || s.code === 'rejected'));

            for (let i = 0; i < nonFinalStatuses.length; i++) {
                const current = nonFinalStatuses[i];
                // ربط مع الحالة التالية (إن وجدت وغير نفسها)
                const nextIdx = statuses.indexOf(current) + 1;
                if (nextIdx < statuses.length) {
                    const next = statuses[nextIdx];
                    edges.push({
                        id: `edge-${current.code}-${next.code}`,
                        source: `status-${current.code}`,
                        target: `status-${next.code}`,
                        type: 'workflowEdge',
                        data: { requiresApproval: false },
                    });
                }
                // ربط مع حالة الإلغاء/الرفض (إن لم تكن بالفعل مرتبطة)
                for (const finalStatus of finalRejectStatuses) {
                    if (current.code !== finalStatus.code && !statuses[nextIdx]?.code?.includes(finalStatus.code)) {
                        const edgeId = `edge-${current.code}-${finalStatus.code}`;
                        if (!edges.find(e => e.id === edgeId)) {
                            edges.push({
                                id: edgeId,
                                source: `status-${current.code}`,
                                target: `status-${finalStatus.code}`,
                                type: 'workflowEdge',
                                data: { requiresApproval: false },
                            });
                        }
                    }
                }
            }

            return { nodes, edges };
        },
        []
    );

    // ========== عند اختيار موديول ==========
    const handleModuleSelect = useCallback((moduleId: string) => {
        setSelectedModuleId(moduleId);
        const module = MODULES.find((m) => m.id === moduleId);
        if (module && module.config.docTypes.length > 0) {
            setSelectedDocTypeId(module.config.docTypes[0].id);
        }
        setActiveTab('editor');
    }, []);

    // ========== العودة للنظرة العامة ==========
    const handleBack = useCallback(() => {
        setSelectedModuleId(null);
        setSelectedDocTypeId(null);
        setActiveTab('overview');
    }, []);

    // ========== عناصر المحرر الحالية ==========
    const currentElements = useMemo(() => {
        if (!selectedModuleId || !selectedDocTypeId) return { nodes: [], edges: [] };
        return buildFlowElements(selectedModuleId, selectedDocTypeId);
    }, [selectedModuleId, selectedDocTypeId, buildFlowElements]);

    const selectedModule = MODULES.find((m) => m.id === selectedModuleId);

    // ========== فلترة السيناريوهات ==========
    const filteredScenarios = useMemo(() => {
        let result = SCENARIOS;
        if (scenarioFilter === 'active') result = result.filter((s) => s.isActive);
        if (scenarioFilter === 'inactive') result = result.filter((s) => !s.isActive);
        if (selectedModuleId) result = result.filter((s) => s.moduleId === selectedModuleId);
        return result;
    }, [scenarioFilter, selectedModuleId]);

    // ========== الإحصائيات الإجمالية ==========
    const totalStats = useMemo(() => ({
        modules: MODULES.length,
        docTypes: MODULES.reduce((s, m) => s + m.stats.docTypes, 0),
        scenarios: SCENARIOS.length,
        activeScenarios: SCENARIOS.filter((s) => s.isActive).length,
    }), []);

    // ========== الرندر ==========
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900">
            {/* الهيدر — Glass Gradient (Navy → Indigo) */}
            <div className="relative overflow-hidden bg-gradient-to-r from-erp-navy via-indigo-800 to-erp-navy p-6 rounded-2xl shadow-lg mb-6">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-400/15 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-400/10 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* زر الرجوع (يظهر في المحرر فقط) */}
                        {activeTab === 'editor' && selectedModuleId && (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10">
                                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                            </Button>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                                <GitBranch className="w-6 h-6 text-indigo-300" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white font-cairo">
                                    {activeTab === 'editor' && selectedModule
                                        ? `${language === 'ar' ? selectedModule.config.titleAr : selectedModule.config.titleEn}`
                                        : (language === 'ar' ? 'مركز إدارة سير العمل' : 'Workflow Center')
                                    }
                                </h1>
                                <p className="text-xs text-indigo-200/80">
                                    {activeTab === 'editor' && selectedModule
                                        ? (language === 'ar' ? selectedModule.config.descriptionAr : selectedModule.config.descriptionEn)
                                        : (language === 'ar' ? 'إدارة موحدة لجميع مسارات العمل والأتمتة' : 'Unified workflow and automation management')
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* التبويبات الرئيسية */}
                    <div className="flex items-center gap-2">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setActiveTab('overview'); setSelectedModuleId(null); }}
                                className={cn(
                                    'h-8 gap-1.5 text-xs rounded-lg text-white/80 hover:text-white hover:bg-white/10',
                                    activeTab === 'overview' && 'bg-white/20 text-white shadow-sm'
                                )}
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                {language === 'ar' ? 'نظرة عامة' : 'Overview'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setActiveTab('scenarios'); setSelectedModuleId(null); }}
                                className={cn(
                                    'h-8 gap-1.5 text-xs rounded-lg text-white/80 hover:text-white hover:bg-white/10',
                                    activeTab === 'scenarios' && 'bg-white/20 text-white shadow-sm'
                                )}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                {language === 'ar' ? 'السيناريوهات' : 'Scenarios'}
                                <Badge className="text-[9px] px-1.5 py-0 bg-white/20 text-white border-0">
                                    {totalStats.activeScenarios}
                                </Badge>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* المحتوى الرئيسي */}
            <div className="p-6">
                {/* ============ نظرة عامة ============ */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* بطاقات الإحصائيات */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="border-0 shadow-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <Network className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.modules}</p>
                                        <p className="text-xs text-gray-500">موديولات نشطة</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <Package className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.docTypes}</p>
                                        <p className="text-xs text-gray-500">أنواع مستندات</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                                        <Zap className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.scenarios}</p>
                                        <p className="text-xs text-gray-500">سيناريوهات أتمتة</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                        <Activity className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.activeScenarios}</p>
                                        <p className="text-xs text-gray-500">سيناريوهات مفعّلة</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* بطاقات الموديولات */}
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Network className="w-5 h-5 text-indigo-500" />
                                الموديولات
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {MODULES.map((module) => {
                                    const Icon = module.icon;
                                    const moduleScenarios = SCENARIOS.filter((s) => s.moduleId === module.id);
                                    const activeCount = moduleScenarios.filter((s) => s.isActive).length;

                                    return (
                                        <Card
                                            key={module.id}
                                            className={cn(
                                                'border-0 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group',
                                                'bg-gradient-to-br',
                                                module.gradient,
                                                'hover:scale-[1.02]'
                                            )}
                                            onClick={() => handleModuleSelect(module.id)}
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm flex items-center justify-center">
                                                            <Icon className={cn('w-6 h-6', module.color)} />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 dark:text-white text-base">
                                                                {language === 'ar' ? module.config.titleAr : module.config.titleEn}
                                                            </h3>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                                {language === 'ar' ? module.config.descriptionAr : module.config.descriptionEn}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        'w-8 h-8 rounded-lg bg-white/50 dark:bg-gray-700/50 flex items-center justify-center',
                                                        'group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors'
                                                    )}>
                                                        {isRTL
                                                            ? <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                                            : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                                        }
                                                    </div>
                                                </div>

                                                {/* الإحصائيات */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{module.stats.docTypes}</p>
                                                        <p className="text-[10px] text-gray-500">أنواع</p>
                                                    </div>
                                                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{module.stats.statuses}</p>
                                                        <p className="text-[10px] text-gray-500">حالة</p>
                                                    </div>
                                                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {activeCount}/{moduleScenarios.length}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">أتمتة</p>
                                                    </div>
                                                </div>

                                                {/* أنواع المستندات */}
                                                <div className="flex flex-wrap gap-1.5 mt-4">
                                                    {module.config.docTypes.slice(0, 4).map((dt) => (
                                                        <Badge
                                                            key={dt.id}
                                                            variant="outline"
                                                            className="text-[10px] bg-white/60 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                                                        >
                                                            {language === 'ar' ? dt.labelAr : dt.labelEn}
                                                        </Badge>
                                                    ))}
                                                    {module.config.docTypes.length > 4 && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            +{module.config.docTypes.length - 4}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* آخر السيناريوهات النشطة */}
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                السيناريوهات المفعّلة
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {SCENARIOS.filter((s) => s.isActive).slice(0, 4).map((scenario) => {
                                    const ActionIcon = ACTION_ICONS[scenario.actionType] || Zap;
                                    const module = MODULES.find((m) => m.id === scenario.moduleId);
                                    const ModuleIcon = module?.icon || Package;

                                    return (
                                        <Card key={scenario.id} className="border-0 shadow-sm bg-white/60 dark:bg-gray-800/60 hover:shadow-md transition-shadow">
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', ACTION_COLORS[scenario.actionType])}>
                                                    <ActionIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                                        {scenario.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[9px] gap-1 h-5">
                                                            <ModuleIcon className="w-3 h-3" />
                                                            {language === 'ar' ? module?.config.titleAr : module?.config.titleEn}
                                                        </Badge>
                                                        <span className="text-[10px] text-gray-400">{scenario.triggerLabel}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ المحرر المرئي ============ */}
                {activeTab === 'editor' && selectedModule && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* أزرار أنواع المستندات */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {selectedModule.config.docTypes.map((dt) => (
                                <Button
                                    key={dt.id}
                                    variant={selectedDocTypeId === dt.id ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedDocTypeId(dt.id)}
                                    className={cn(
                                        'h-9 gap-2 text-sm rounded-xl transition-all',
                                        selectedDocTypeId === dt.id
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                                            : 'bg-white/80 dark:bg-gray-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                    )}
                                >
                                    {language === 'ar' ? dt.labelAr : dt.labelEn}
                                </Button>
                            ))}
                        </div>

                        {/* حاوية المحرر */}
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <div className="h-[calc(100vh-280px)] min-h-[500px]">
                                {selectedDocTypeId && (
                                    <WorkflowCanvas
                                        key={`${selectedModuleId}-${selectedDocTypeId}`}
                                        initialNodes={currentElements.nodes}
                                        initialEdges={currentElements.edges}
                                        title={
                                            selectedModule.config.docTypes.find((d) => d.id === selectedDocTypeId)?.[
                                            language === 'ar' ? 'labelAr' : 'labelEn'
                                            ] || ''
                                        }
                                        layoutDirection="DOWN"
                                    />
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* ============ السيناريوهات ============ */}
                {activeTab === 'scenarios' && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        {/* فلترة */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={scenarioFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setScenarioFilter('all')}
                                    className="h-8 text-xs rounded-lg"
                                >
                                    الكل ({SCENARIOS.length})
                                </Button>
                                <Button
                                    variant={scenarioFilter === 'active' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setScenarioFilter('active')}
                                    className="h-8 text-xs rounded-lg gap-1"
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    مفعّل ({SCENARIOS.filter((s) => s.isActive).length})
                                </Button>
                                <Button
                                    variant={scenarioFilter === 'inactive' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setScenarioFilter('inactive')}
                                    className="h-8 text-xs rounded-lg gap-1"
                                >
                                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                                    معطّل ({SCENARIOS.filter((s) => !s.isActive).length})
                                </Button>
                            </div>

                            <Button size="sm" className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-3.5 h-3.5" />
                                سيناريو جديد
                            </Button>
                        </div>

                        {/* قائمة السيناريوهات */}
                        <div className="space-y-3">
                            {filteredScenarios.map((scenario) => {
                                const ActionIcon = ACTION_ICONS[scenario.actionType] || Zap;
                                const module = MODULES.find((m) => m.id === scenario.moduleId);
                                const ModuleIcon = module?.icon || Package;

                                return (
                                    <Card key={scenario.id} className={cn(
                                        'border-0 shadow-sm hover:shadow-lg transition-all duration-300',
                                        'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm',
                                        !scenario.isActive && 'opacity-60'
                                    )}>
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-5">
                                                {/* أيقونة نوع الإجراء */}
                                                <div className={cn(
                                                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                                                    ACTION_COLORS[scenario.actionType]
                                                )}>
                                                    <ActionIcon className="w-6 h-6" />
                                                </div>

                                                {/* المعلومات */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                                            {scenario.name}
                                                        </h3>
                                                        {scenario.isActive ? (
                                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                        ) : (
                                                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                                            <ModuleIcon className="w-3 h-3" />
                                                            {language === 'ar' ? module?.config.titleAr : module?.config.titleEn}
                                                        </Badge>
                                                        <span className="flex items-center gap-1">
                                                            <Play className="w-3 h-3" />
                                                            {scenario.triggerLabel}
                                                        </span>
                                                        <span>→</span>
                                                        <span className="flex items-center gap-1">
                                                            <ActionIcon className="w-3 h-3" />
                                                            {scenario.actionLabel}
                                                        </span>
                                                    </div>
                                                    {scenario.lastTriggered && (
                                                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            آخر تشغيل: {new Date(scenario.lastTriggered).toLocaleString('ar')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* التحكم */}
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <Switch
                                                        checked={scenario.isActive}
                                                        className="data-[state=checked]:bg-green-500"
                                                    />
                                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        تعديل
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
