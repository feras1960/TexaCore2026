/**
 * Cash Journal Sheet Configuration
 * إعدادات شيت يومية الصندوق
 */

import {
    Wallet,
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

export const cashJournalConfig: SheetConfig = {
    docType: 'cash_journal',

    // Header
    title: (data) => data.voucherNo || `CSH-${data.id}`,
    subtitle: (data) => {
        const date = data.date ? new Date(data.date).toLocaleDateString('ar-SA') : '';
        return `يومية الصندوق - ${date}`;
    },
    icon: Wallet,
    iconBg: 'bg-gradient-to-br from-amber-600 to-amber-800',

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
        label: 'vouchers.totalAmount',
        labelAr: 'المبلغ الإجمالي',
        currency: 'SAR',
        showSign: false,
    },

    // Stats Cards
    stats: [
        {
            key: 'total_debit',
            label: 'fields.totalDebit',
            labelAr: 'إجمالي المدين',
            icon: CheckCircle2,
            value: (data) => data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0,
            color: 'green',
        },
        {
            key: 'total_credit',
            label: 'fields.totalCredit',
            labelAr: 'إجمالي الدائن',
            icon: XCircle,
            value: (data) => data.totalCredit || data.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0,
            color: 'red',
        },
        {
            key: 'lines_count',
            label: 'accounting.lines',
            labelAr: 'عدد البنود',
            icon: FileText,
            value: (data) => data.lines?.length || 0,
            color: 'blue',
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
            key: 'cashAccountName',
            label: 'fields.cashAccount',
            labelAr: 'حساب الصندوق',
            type: 'link',
            icon: Wallet,
            link: (_value, data) => data.cashAccountId ? { docType: 'account', id: data.cashAccountId } : null,
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
            key: 'totalDebit',
            label: 'fields.totalDebit',
            labelAr: 'إجمالي المدين',
            type: 'currency',
            currency: 'SAR',
            icon: DollarSign,
        },
        {
            key: 'totalCredit',
            label: 'fields.totalCredit',
            labelAr: 'إجمالي الدائن',
            type: 'currency',
            currency: 'SAR',
            icon: DollarSign,
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
    defaultTab: 'lines',

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
                title: 'dialogs.cancelCashJournal',
                titleAr: 'إلغاء يومية الصندوق',
                description: 'dialogs.cancelCashJournalWarning',
                descriptionAr: 'هل أنت متأكد من إلغاء يومية الصندوق؟ لا يمكن التراجع عن هذا الإجراء.',
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
                title: 'dialogs.deleteCashJournal',
                titleAr: 'حذف يومية الصندوق',
                description: 'dialogs.deleteCashJournalWarning',
                descriptionAr: 'هل أنت متأكد من حذف يومية الصندوق؟ لا يمكن التراجع عن هذا الإجراء.',
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

export default cashJournalConfig;
