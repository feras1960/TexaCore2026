/**
 * Workflow Module Configurations
 * تكوينات سير العمل لكل موديول
 * 
 * كل موديول يعرّف:
 * - أنواع المستندات (docTypes)
 * - الحالات الافتراضية (defaultStatuses)
 * - أحداث الإشعارات (notificationEvents)
 * - سيناريوهات الأتمتة (automationScenarios)
 */

import {
    FileText, ShoppingCart, Truck, Receipt, Package,
    Send, Bot, Zap, Phone, UserPlus, MessageSquare,
    PhoneCall, PhoneOff, PhoneMissed, CheckCircle,
    Users, Handshake, Calendar, BarChart2, Mail,
    ClipboardList, Clock, AlertTriangle, ShoppingBag,
    Warehouse, CreditCard, Globe, ArrowUpDown,
} from 'lucide-react';
import { StatusColor } from '@/services/statusService';
import React from 'react';

// ─── Shared Types ───────────────────────────────────────────────────────
export interface DocTypeConfig {
    id: string;
    labelAr: string;
    labelEn: string;
    icon: React.ElementType;
    color: string;
}

export interface DefaultStatusConfig {
    code: string;
    nameAr: string;
    nameEn: string;
    color: StatusColor;
    isInitial?: boolean;
    isFinal?: boolean;
}

export interface NotificationEventConfig {
    id: string;
    nameAr: string;
    nameEn: string;
    docType: string;
    trigger: string;
}

export interface AutomationScenarioConfig {
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

export interface WorkflowModuleConfig {
    moduleId: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    icon: React.ElementType;
    color: string;
    docTypes: DocTypeConfig[];
    defaultStatuses: Record<string, DefaultStatusConfig[]>;
    notificationEvents: NotificationEventConfig[];
    automationScenarios: AutomationScenarioConfig[];
}

// ═══════════════════════════════════════════════════════════════════════
// SALES MODULE
// ═══════════════════════════════════════════════════════════════════════
export const SALES_WORKFLOW_CONFIG: WorkflowModuleConfig = {
    moduleId: 'sales',
    titleAr: 'إعدادات سير عمل المبيعات',
    titleEn: 'Sales Workflow Settings',
    descriptionAr: 'تخصيص مراحل وحالات وقواعد تحويل مستندات المبيعات لتناسب أعمالك',
    descriptionEn: 'Customize stages, statuses, and transition rules for your sales documents',
    icon: ShoppingCart,
    color: 'green',
    docTypes: [
        { id: 'sales_quotation', labelAr: 'عرض السعر', labelEn: 'Quotation', icon: FileText, color: 'purple' },
        { id: 'sales_reservation', labelAr: 'حجز البضائع', labelEn: 'Reservation', icon: Package, color: 'cyan' },
        { id: 'sales_order', labelAr: 'أمر البيع', labelEn: 'Sales Order', icon: ShoppingCart, color: 'blue' },
        { id: 'sales_delivery', labelAr: 'إذن التسليم', labelEn: 'Delivery Note', icon: Truck, color: 'orange' },
        { id: 'sales_invoice', labelAr: 'فاتورة المبيعات', labelEn: 'Sales Invoice', icon: Receipt, color: 'green' },
    ],
    defaultStatuses: {
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
    },
    notificationEvents: [
        { id: 'quotation_created', nameAr: 'إنشاء عرض سعر', nameEn: 'Quotation Created', docType: 'sales_quotation', trigger: 'on_create' },
        { id: 'quotation_approved', nameAr: 'قبول عرض السعر', nameEn: 'Quotation Approved', docType: 'sales_quotation', trigger: 'on_approve' },
        { id: 'order_confirmed', nameAr: 'تأكيد أمر البيع', nameEn: 'Order Confirmed', docType: 'sales_order', trigger: 'on_confirm' },
        { id: 'delivery_shipped', nameAr: 'شحن الطلب', nameEn: 'Order Shipped', docType: 'sales_delivery', trigger: 'on_ship' },
        { id: 'delivery_completed', nameAr: 'إتمام التسليم', nameEn: 'Delivery Completed', docType: 'sales_delivery', trigger: 'on_deliver' },
        { id: 'invoice_posted', nameAr: 'اعتماد الفاتورة', nameEn: 'Invoice Posted', docType: 'sales_invoice', trigger: 'on_post' },
        { id: 'invoice_paid', nameAr: 'سداد الفاتورة', nameEn: 'Invoice Paid', docType: 'sales_invoice', trigger: 'on_pay' },
        { id: 'invoice_overdue', nameAr: 'فاتورة متأخرة', nameEn: 'Invoice Overdue', docType: 'sales_invoice', trigger: 'on_overdue' },
    ],
    automationScenarios: [
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
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// CRM / COMMUNICATIONS MODULE
// ═══════════════════════════════════════════════════════════════════════
export const CRM_WORKFLOW_CONFIG: WorkflowModuleConfig = {
    moduleId: 'crm',
    titleAr: 'إعدادات سير عمل الاتصالات و CRM',
    titleEn: 'CRM & Communications Workflow Settings',
    descriptionAr: 'إدارة مراحل جهات الاتصال والصفقات والمكالمات والمهام',
    descriptionEn: 'Manage contact, deal, call, and task workflows',
    icon: Phone,
    color: 'blue',
    docTypes: [
        { id: 'crm_contact', labelAr: 'جهة اتصال', labelEn: 'Contact', icon: UserPlus, color: 'blue' },
        { id: 'crm_deal', labelAr: 'صفقة', labelEn: 'Deal', icon: Handshake, color: 'green' },
        { id: 'crm_call', labelAr: 'مكالمة', labelEn: 'Call', icon: PhoneCall, color: 'purple' },
        { id: 'crm_task', labelAr: 'مهمة', labelEn: 'Task', icon: ClipboardList, color: 'orange' },
        { id: 'crm_campaign', labelAr: 'حملة تسويقية', labelEn: 'Campaign', icon: BarChart2, color: 'pink' },
    ],
    defaultStatuses: {
        crm_contact: [
            { code: 'new', nameAr: 'جديد', nameEn: 'New', color: 'blue', isInitial: true },
            { code: 'contacted', nameAr: 'تم الاتصال', nameEn: 'Contacted', color: 'yellow' },
            { code: 'qualified', nameAr: 'مؤهل', nameEn: 'Qualified', color: 'indigo' },
            { code: 'customer', nameAr: 'عميل', nameEn: 'Customer', color: 'green', isFinal: true },
            { code: 'lost', nameAr: 'ضائع', nameEn: 'Lost', color: 'red', isFinal: true },
        ],
        crm_deal: [
            { code: 'prospect', nameAr: 'فرصة', nameEn: 'Prospect', color: 'gray', isInitial: true },
            { code: 'proposal', nameAr: 'عرض مقدم', nameEn: 'Proposal', color: 'blue' },
            { code: 'negotiation', nameAr: 'تفاوض', nameEn: 'Negotiation', color: 'yellow' },
            { code: 'won', nameAr: 'فوز', nameEn: 'Won', color: 'green', isFinal: true },
            { code: 'lost', nameAr: 'خسارة', nameEn: 'Lost', color: 'red', isFinal: true },
        ],
        crm_call: [
            { code: 'scheduled', nameAr: 'مجدول', nameEn: 'Scheduled', color: 'blue', isInitial: true },
            { code: 'ringing', nameAr: 'يرن', nameEn: 'Ringing', color: 'yellow' },
            { code: 'in_progress', nameAr: 'جارية', nameEn: 'In Progress', color: 'indigo' },
            { code: 'completed', nameAr: 'مكتملة', nameEn: 'Completed', color: 'green', isFinal: true },
            { code: 'missed', nameAr: 'فائتة', nameEn: 'Missed', color: 'red', isFinal: true },
            { code: 'cancelled', nameAr: 'ملغية', nameEn: 'Cancelled', color: 'orange', isFinal: true },
        ],
        crm_task: [
            { code: 'todo', nameAr: 'للتنفيذ', nameEn: 'To Do', color: 'gray', isInitial: true },
            { code: 'in_progress', nameAr: 'قيد التنفيذ', nameEn: 'In Progress', color: 'blue' },
            { code: 'review', nameAr: 'للمراجعة', nameEn: 'Review', color: 'yellow' },
            { code: 'done', nameAr: 'مكتمل', nameEn: 'Done', color: 'green', isFinal: true },
            { code: 'cancelled', nameAr: 'ملغي', nameEn: 'Cancelled', color: 'red', isFinal: true },
        ],
        crm_campaign: [
            { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
            { code: 'scheduled', nameAr: 'مجدول', nameEn: 'Scheduled', color: 'blue' },
            { code: 'active', nameAr: 'نشط', nameEn: 'Active', color: 'green' },
            { code: 'paused', nameAr: 'متوقف', nameEn: 'Paused', color: 'yellow' },
            { code: 'completed', nameAr: 'مكتمل', nameEn: 'Completed', color: 'indigo', isFinal: true },
            { code: 'cancelled', nameAr: 'ملغي', nameEn: 'Cancelled', color: 'red', isFinal: true },
        ],
    },
    notificationEvents: [
        { id: 'contact_created', nameAr: 'إنشاء جهة اتصال', nameEn: 'Contact Created', docType: 'crm_contact', trigger: 'on_create' },
        { id: 'contact_qualified', nameAr: 'تأهيل جهة اتصال', nameEn: 'Contact Qualified', docType: 'crm_contact', trigger: 'on_qualify' },
        { id: 'deal_created', nameAr: 'إنشاء صفقة', nameEn: 'Deal Created', docType: 'crm_deal', trigger: 'on_create' },
        { id: 'deal_won', nameAr: 'فوز بصفقة', nameEn: 'Deal Won', docType: 'crm_deal', trigger: 'on_won' },
        { id: 'deal_lost', nameAr: 'خسارة صفقة', nameEn: 'Deal Lost', docType: 'crm_deal', trigger: 'on_lost' },
        { id: 'call_missed', nameAr: 'مكالمة فائتة', nameEn: 'Missed Call', docType: 'crm_call', trigger: 'on_missed' },
        { id: 'call_completed', nameAr: 'اكتمال مكالمة', nameEn: 'Call Completed', docType: 'crm_call', trigger: 'on_complete' },
        { id: 'task_overdue', nameAr: 'مهمة متأخرة', nameEn: 'Task Overdue', docType: 'crm_task', trigger: 'on_overdue' },
        { id: 'campaign_started', nameAr: 'بدء حملة', nameEn: 'Campaign Started', docType: 'crm_campaign', trigger: 'on_start' },
    ],
    automationScenarios: [
        {
            id: 'crm_telegram_alerts',
            nameAr: 'تنبيهات CRM عبر تلغرام',
            nameEn: 'CRM Telegram Alerts',
            descAr: 'إشعارات فورية عند تغيير حالة الصفقات والاتصالات',
            descEn: 'Instant alerts on deal/contact status changes',
            icon: Send,
            color: 'text-blue-500',
            n8nFile: 'crm-01-telegram-alerts.json',
            category: 'notification',
        },
        {
            id: 'missed_call_followup',
            nameAr: 'متابعة المكالمات الفائتة',
            nameEn: 'Missed Call Follow-up',
            descAr: 'إنشاء مهمة متابعة تلقائياً لكل مكالمة فائتة',
            descEn: 'Auto-create follow-up task for every missed call',
            icon: PhoneMissed,
            color: 'text-red-500',
            n8nFile: 'crm-02-missed-call-followup.json',
            category: 'automation',
        },
        {
            id: 'deal_pipeline_report',
            nameAr: 'تقرير خط الصفقات',
            nameEn: 'Deal Pipeline Report',
            descAr: 'ملخص أسبوعي بالصفقات الجديدة والمغلقة ومعدلات التحويل',
            descEn: 'Weekly summary of new/closed deals and conversion rates',
            icon: BarChart2,
            color: 'text-green-500',
            n8nFile: 'crm-03-pipeline-report.json',
            category: 'report',
        },
        {
            id: 'auto_contact_enrichment',
            nameAr: 'إثراء بيانات جهات الاتصال',
            nameEn: 'Auto Contact Enrichment',
            descAr: 'إثراء بيانات العميل تلقائياً من المعلومات المتاحة',
            descEn: 'Automatically enrich contact data from available sources',
            icon: UserPlus,
            color: 'text-purple-500',
            n8nFile: 'crm-04-contact-enrichment.json',
            category: 'automation',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// PURCHASES MODULE
// ═══════════════════════════════════════════════════════════════════════
export const PURCHASES_WORKFLOW_CONFIG: WorkflowModuleConfig = {
    moduleId: 'purchases',
    titleAr: 'إعدادات سير عمل المشتريات',
    titleEn: 'Purchases Workflow Settings',
    descriptionAr: 'تخصيص مراحل طلبات الشراء والاستلام والمدفوعات',
    descriptionEn: 'Customize purchase request, receipt, and payment workflows',
    icon: ShoppingBag,
    color: 'purple',
    docTypes: [
        { id: 'purchase_request', labelAr: 'طلب شراء', labelEn: 'Purchase Request', icon: ClipboardList, color: 'gray' },
        { id: 'purchase_order', labelAr: 'أمر شراء', labelEn: 'Purchase Order', icon: ShoppingBag, color: 'blue' },
        { id: 'purchase_receipt', labelAr: 'إذن استلام', labelEn: 'Receipt', icon: Package, color: 'green' },
        { id: 'purchase_invoice', labelAr: 'فاتورة مشتريات', labelEn: 'Purchase Invoice', icon: Receipt, color: 'orange' },
    ],
    defaultStatuses: {
        purchase_request: [
            { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
            { code: 'submitted', nameAr: 'مُقدم', nameEn: 'Submitted', color: 'blue' },
            { code: 'approved', nameAr: 'موافق عليه', nameEn: 'Approved', color: 'green', isFinal: true },
            { code: 'rejected', nameAr: 'مرفوض', nameEn: 'Rejected', color: 'red', isFinal: true },
        ],
        purchase_order: [
            { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
            { code: 'sent', nameAr: 'مُرسل للمورد', nameEn: 'Sent', color: 'blue' },
            { code: 'confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed', color: 'indigo' },
            { code: 'received', nameAr: 'مُستلم', nameEn: 'Received', color: 'green', isFinal: true },
            { code: 'cancelled', nameAr: 'ملغي', nameEn: 'Cancelled', color: 'red', isFinal: true },
        ],
        purchase_receipt: [
            { code: 'pending', nameAr: 'قيد الانتظار', nameEn: 'Pending', color: 'gray', isInitial: true },
            { code: 'inspecting', nameAr: 'فحص الجودة', nameEn: 'Inspecting', color: 'yellow' },
            { code: 'accepted', nameAr: 'مقبول', nameEn: 'Accepted', color: 'green', isFinal: true },
            { code: 'rejected', nameAr: 'مرفوض', nameEn: 'Rejected', color: 'red', isFinal: true },
        ],
        purchase_invoice: [
            { code: 'draft', nameAr: 'مسودة', nameEn: 'Draft', color: 'gray', isInitial: true },
            { code: 'posted', nameAr: 'مُعتمدة', nameEn: 'Posted', color: 'blue' },
            { code: 'partially_paid', nameAr: 'مدفوعة جزئياً', nameEn: 'Partially Paid', color: 'yellow' },
            { code: 'paid', nameAr: 'مدفوعة', nameEn: 'Paid', color: 'green', isFinal: true },
            { code: 'cancelled', nameAr: 'ملغية', nameEn: 'Cancelled', color: 'red', isFinal: true },
        ],
    },
    notificationEvents: [
        { id: 'pr_submitted', nameAr: 'تقديم طلب شراء', nameEn: 'PR Submitted', docType: 'purchase_request', trigger: 'on_submit' },
        { id: 'pr_approved', nameAr: 'الموافقة على طلب شراء', nameEn: 'PR Approved', docType: 'purchase_request', trigger: 'on_approve' },
        { id: 'po_confirmed', nameAr: 'تأكيد أمر شراء', nameEn: 'PO Confirmed', docType: 'purchase_order', trigger: 'on_confirm' },
        { id: 'receipt_accepted', nameAr: 'قبول الاستلام', nameEn: 'Receipt Accepted', docType: 'purchase_receipt', trigger: 'on_accept' },
        { id: 'pinv_posted', nameAr: 'اعتماد فاتورة مشتريات', nameEn: 'Invoice Posted', docType: 'purchase_invoice', trigger: 'on_post' },
        { id: 'pinv_paid', nameAr: 'سداد فاتورة مشتريات', nameEn: 'Invoice Paid', docType: 'purchase_invoice', trigger: 'on_pay' },
    ],
    automationScenarios: [
        {
            id: 'purchase_approval_alert',
            nameAr: 'تنبيه طلب موافقة على الشراء',
            nameEn: 'Purchase Approval Alert',
            descAr: 'إشعار فوري للمدير عند تقديم طلب شراء جديد',
            descEn: 'Instant alert to manager on new purchase request',
            icon: Send,
            color: 'text-blue-500',
            n8nFile: 'purchase-01-approval-alert.json',
            category: 'notification',
        },
        {
            id: 'auto_po_from_pr',
            nameAr: 'إنشاء أمر شراء تلقائي',
            nameEn: 'Auto PO from PR',
            descAr: 'إنشاء أمر شراء تلقائياً بعد الموافقة على طلب الشراء',
            descEn: 'Auto-create PO when purchase request is approved',
            icon: Zap,
            color: 'text-amber-500',
            n8nFile: 'purchase-02-auto-po.json',
            category: 'automation',
        },
        {
            id: 'purchase_weekly_report',
            nameAr: 'تقرير المشتريات الأسبوعي',
            nameEn: 'Weekly Purchases Report',
            descAr: 'ملخص أسبوعي بالمشتريات والمدفوعات المستحقة',
            descEn: 'Weekly summary of purchases and pending payments',
            icon: BarChart2,
            color: 'text-green-500',
            n8nFile: 'purchase-03-weekly-report.json',
            category: 'report',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// Registry: All modules
// ═══════════════════════════════════════════════════════════════════════
export const WORKFLOW_MODULES: Record<string, WorkflowModuleConfig> = {
    sales: SALES_WORKFLOW_CONFIG,
    crm: CRM_WORKFLOW_CONFIG,
    purchases: PURCHASES_WORKFLOW_CONFIG,
};

export function getWorkflowConfig(moduleId: string): WorkflowModuleConfig | undefined {
    return WORKFLOW_MODULES[moduleId];
}
