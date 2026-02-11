/**
 * Exchange (Currency) Voucher Sheet Configuration
 * إعدادات شيت سند الصرافة
 */

import {
    Coins,
    Calendar,
    FileText,
    CheckCircle2,
    XCircle,
    Eye,
    Activity,
    Printer,
    Download,
    Copy,
    Edit,
    Trash2,
    Hash,
    Target,
    DollarSign,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { type SheetConfig } from './sheet.types';

// Import tab components
import { JournalOverviewTab } from '../tabs/journal/JournalOverviewTab';
import { JournalLinesTab } from '../tabs/journal/JournalLinesTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'posted':
            return { label: 'status.posted', variant: 'success' as const };
        case 'cancelled':
            return { label: 'status.cancelled', variant: 'error' as const };
        default:
            return { label: 'status.draft', variant: 'warning' as const };
    }
};

export const exchangeConfig: SheetConfig = {
    docType: 'exchange',

    // Header
    title: (data) => data.voucherNo || `EXC-${data.id}`,
    subtitle: (data) => {
        const date = data.date ? new Date(data.date).toLocaleDateString('ar-SA') : '';
        const currencies = data.sourceCurrency && data.targetCurrency
            ? `${data.sourceCurrency} → ${data.targetCurrency}`
            : '';
        return `${currencies} - ${date}`;
    },
    icon: Coins,
    iconBg: 'bg-gradient-to-br from-cyan-600 to-cyan-800',

    // Status Badge
    badge: (data) => {
        const info = getStatusInfo(data.status);
        return {
            label: info.label,
            variant: info.variant,
        };
    },

    // Balance Display - Total Amount
    balance: {
        value: (data) => {
            const totalDebit = data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
            return totalDebit;
        },
        label: 'vouchers.exchangeAmount',
        labelAr: 'مبلغ الصرافة',
        currency: undefined,
        showSign: false,
    },

    // Stats Cards
    stats: [
        {
            key: 'source_amount',
            label: 'vouchers.sourceAmount',
            labelAr: 'المبلغ المصدر',
            icon: DollarSign,
            value: (data) => data.sourceAmount || 0,
            color: 'red',
            format: (value, data) => `${value.toLocaleString()} ${data.sourceCurrency || ''}`,
        },
        {
            key: 'target_amount',
            label: 'vouchers.targetAmount',
            labelAr: 'المبلغ الهدف',
            icon: DollarSign,
            value: (data) => data.targetAmount || 0,
            color: 'green',
            format: (value, data) => `${value.toLocaleString()} ${data.targetCurrency || ''}`,
        },
        {
            key: 'exchange_rate',
            label: 'vouchers.exchangeRate',
            labelAr: 'سعر الصرف',
            icon: TrendingUp,
            value: (data) => data.exchangeRate || 1,
            color: 'blue',
            format: (value) => value.toFixed(4),
        },
        {
            key: 'exchange_difference',
            label: 'vouchers.exchangeDifference',
            labelAr: 'فرق العملة',
            icon: TrendingDown,
            value: (data) => data.exchangeDifference || 0,
            color: 'blue',
            format: (value) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`,
        },
    ],

    // Info Fields for Overview
    infoFields: [
        {
            key: 'voucherNo',
            label: 'fields.voucherNumber',
            labelAr: 'رقم السند',
            type: 'text',
            icon: Hash,
        },
        {
            key: 'date',
            label: 'fields.date',
            labelAr: 'التاريخ',
            type: 'date',
            icon: Calendar,
        },
        {
            key: 'sourceCurrency',
            label: 'fields.sourceCurrency',
            labelAr: 'العملة المصدر',
            type: 'text',
            icon: Coins,
        },
        {
            key: 'targetCurrency',
            label: 'fields.targetCurrency',
            labelAr: 'العملة الهدف',
            type: 'text',
            icon: Coins,
        },
        {
            key: 'sourceAmount',
            label: 'fields.sourceAmount',
            labelAr: 'المبلغ المصدر',
            type: 'currency',
            icon: DollarSign,
            format: (value, data) => `${value.toLocaleString()} ${data.sourceCurrency || ''}`,
        },
        {
            key: 'targetAmount',
            label: 'fields.targetAmount',
            labelAr: 'المبلغ الهدف',
            type: 'currency',
            icon: DollarSign,
            format: (value, data) => `${value.toLocaleString()} ${data.targetCurrency || ''}`,
        },
        {
            key: 'exchangeRate',
            label: 'fields.exchangeRate',
            labelAr: 'سعر الصرف',
            type: 'number',
            icon: TrendingUp,
            format: (value) => value.toFixed(4),
        },
        {
            key: 'exchangeDifference',
            label: 'fields.exchangeDifference',
            labelAr: 'فرق العملة',
            type: 'currency',
            currency: undefined,
            icon: TrendingDown,
            format: (value) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`,
        },
        {
            key: 'reference',
            label: 'fields.reference',
            labelAr: 'المرجع',
            type: 'text',
        },
        {
            key: 'costCenter',
            label: 'fields.costCenter',
            labelAr: 'مركز التكلفة',
            type: 'text',
            icon: Target,
        },
        {
            key: 'project',
            label: 'fields.project',
            labelAr: 'المشروع',
            type: 'text',
        },
        {
            key: 'description',
            label: 'fields.description',
            labelAr: 'البيان',
            type: 'text',
            colSpan: 2,
        },
    ],

    // Tabs Configuration
    tabs: [
        {
            id: 'overview',
            label: 'tabs.overview',
            labelAr: 'نظرة عامة',
            icon: Eye,
            component: JournalOverviewTab,
        },
        {
            id: 'lines',
            label: 'tabs.entryLines',
            labelAr: 'بنود القيد',
            icon: FileText,
            component: JournalLinesTab as any,
            badge: (data) => data.lines?.length || null,
        },
        {
            id: 'activity',
            label: 'tabs.activity',
            labelAr: 'السجل',
            icon: Activity,
            component: ActivityTab,
        },
    ],
    defaultTab: 'overview',

    // Actions
    actions: [
        {
            id: 'edit',
            label: 'actions.edit',
            labelAr: 'تعديل',
            icon: Edit,
            variant: 'outline',
            show: (data) => data.status === 'draft',
        },
        {
            id: 'post',
            label: 'actions.post',
            labelAr: 'ترحيل',
            icon: CheckCircle2,
            variant: 'default',
            show: (data) => data.status === 'draft',
        },
        {
            id: 'duplicate',
            label: 'actions.duplicate',
            labelAr: 'نسخ',
            icon: Copy,
            variant: 'outline',
        },
        {
            id: 'print',
            label: 'actions.print',
            labelAr: 'طباعة',
            icon: Printer,
            variant: 'outline',
            onClick: () => window.print(),
        },
        {
            id: 'export',
            label: 'actions.export',
            labelAr: 'تصدير',
            icon: Download,
            variant: 'outline',
        },
        {
            id: 'cancel',
            label: 'actions.cancel',
            labelAr: 'إلغاء',
            icon: XCircle,
            variant: 'destructive',
            show: (data) => data.status !== 'cancelled',
            confirm: {
                title: 'dialogs.cancelExchange',
                titleAr: 'إلغاء الصرافة',
                description: 'dialogs.cancelExchangeWarning',
                descriptionAr: 'هل أنت متأكد من إلغاء الصرافة؟ لا يمكن التراجع عن هذا الإجراء.',
                confirmLabel: 'actions.cancel',
                confirmLabelAr: 'إلغاء',
            },
        },
        {
            id: 'delete',
            label: 'actions.delete',
            labelAr: 'حذف',
            icon: Trash2,
            variant: 'destructive',
            show: (data) => data.status === 'draft',
            confirm: {
                title: 'dialogs.deleteExchange',
                titleAr: 'حذف الصرافة',
                description: 'dialogs.deleteExchangeWarning',
                descriptionAr: 'هل أنت متأكد من حذف الصرافة؟ لا يمكن التراجع عن هذا الإجراء.',
                confirmLabel: 'actions.delete',
                confirmLabelAr: 'حذف',
            },
        },
    ],

    // Quick Actions (in header)
    quickActions: [
        {
            id: 'print',
            label: 'actions.print',
            labelAr: 'طباعة',
            icon: Printer,
            variant: 'ghost',
            onClick: () => window.print(),
        },
        {
            id: 'duplicate',
            label: 'actions.duplicate',
            labelAr: 'نسخ',
            icon: Copy,
            variant: 'ghost',
        },
    ],

    // Sheet Settings
    width: 'lg',
};

export default exchangeConfig;
