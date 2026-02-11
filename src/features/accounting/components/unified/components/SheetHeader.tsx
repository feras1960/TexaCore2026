/**
 * Sheet Header Component - رأس الشيت الموحد
 * يعرض العنوان والرصيد وشارات الحالة و QR Code
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    X,
    BookOpen,
    Wallet,
    Users,
    BookMarked,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    RefreshCw,
    FileText,
    FolderPlus,
    FolderTree,
    Edit,
    Eye,
    Plus,
    QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedDocType, SheetMode, DocumentConfig } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { QRCodeGenerator, type QRDocType } from '@/components/shared/qrcode';

// Icon mapping
const iconMap: Record<string, any> = {
    BookOpen,
    Wallet,
    Users,
    BookMarked,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    RefreshCw,
    FileText,
    FolderPlus,
    FolderTree,
};

interface SheetHeaderProps {
    config: DocumentConfig;
    data: any;
    mode: SheetMode;
    onClose: () => void;
    onModeChange?: (mode: SheetMode) => void;
    useArabicNumerals?: boolean;
}

export function SheetHeader({
    config,
    data,
    mode,
    onClose,
    onModeChange,
    useArabicNumerals = false,
}: SheetHeaderProps) {
    const { t, language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    // Get icon component
    const IconComponent = iconMap[config.icon] || FileText;

    // Get display name
    const getDisplayName = () => {
        if (!data) return t(config.titleKey);

        // Try different name fields
        if (language === 'ar' && data.nameAr) return data.nameAr;
        if (language === 'ar' && data.name_ar) return data.name_ar;
        if (language === 'en' && data.name_en) return data.name_en;
        return data.name || data.code || data.entry_number || data.reference || t(config.titleKey);
    };

    // Get code/reference
    const getCode = () => {
        return data?.code || data?.entry_number || data?.reference || '';
    };

    // Get balance/amount
    const getMainValue = () => {
        const value = data?.current_balance ?? data?.balance ?? data?.amount ?? data?.total_debit;
        if (value === undefined || value === null) return null;
        return value;
    };

    // Get mode badge
    const getModeBadge = () => {
        switch (mode) {
            case 'view':
                return { icon: Eye, label: t('modes.view') || 'عرض', color: 'bg-blue-100 text-blue-700' };
            case 'edit':
                return { icon: Edit, label: t('modes.edit') || 'تعديل', color: 'bg-yellow-100 text-yellow-700' };
            case 'create':
                return { icon: Plus, label: t('modes.create') || 'جديد', color: 'bg-green-100 text-green-700' };
        }
    };

    // Get status badge
    const getStatusBadge = () => {
        const status = data?.status || data?.is_active;
        if (status === undefined) return null;

        if (status === 'posted' || status === true) {
            return { label: t('status.posted') || 'مرحّل', color: 'bg-green-100 text-green-700 border-green-200' };
        }
        if (status === 'draft') {
            return { label: t('status.draft') || 'مسودة', color: 'bg-gray-100 text-gray-700 border-gray-200' };
        }
        if (status === 'cancelled' || status === false) {
            return { label: t('status.cancelled') || 'ملغي', color: 'bg-red-100 text-red-700 border-red-200' };
        }
        return null;
    };

    const mainValue = getMainValue();
    const modeBadge = getModeBadge();
    const statusBadge = getStatusBadge();
    const ModeBadgeIcon = modeBadge.icon;

    return (
        <div className={cn(
            "px-6 py-4 border-b bg-white dark:bg-gray-900",
            "flex items-start justify-between gap-4",
            mode === 'view' && data?.status === 'posted' && 'bg-green-50/50 dark:bg-green-900/10'
        )}>
            {/* Left Section - Icon & Info */}
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0",
                    config.iconColor
                )}>
                    <IconComponent className="w-6 h-6" />
                </div>

                {/* Info */}
                <div className="space-y-1">
                    {/* Code Badge */}
                    {getCode() && (
                        <Badge variant="outline" className="text-xs font-mono mb-1">
                            {getCode()}
                        </Badge>
                    )}

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-cairo">
                        {getDisplayName()}
                    </h2>

                    {/* Subtitle with badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-500 font-tajawal">
                            {t(config.subtitleKey)}
                        </span>

                        {/* Mode Badge */}
                        <Badge className={cn("text-xs gap-1", modeBadge.color)}>
                            <ModeBadgeIcon className="w-3 h-3" />
                            {modeBadge.label}
                        </Badge>

                        {/* Status Badge */}
                        {statusBadge && (
                            <Badge className={cn("text-xs", statusBadge.color)}>
                                {statusBadge.label}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Section - Balance & Close */}
            <div className="flex items-start gap-4">
                {/* Main Value (Balance/Amount) */}
                {mainValue !== null && (
                    <div className={cn(
                        "text-end",
                        isRTL ? "text-start" : "text-end"
                    )}>
                        <p className="text-xs text-gray-500 mb-1">
                            {t('accounting.account.balance')}
                        </p>
                        <p className={cn(
                            "text-2xl font-bold font-mono",
                            mainValue >= 0 ? "text-erp-navy dark:text-white" : "text-red-600"
                        )}>
                            {formatCurrency(mainValue, data?.currency || '', useArabicNumerals)}
                        </p>
                    </div>
                )}

                {/* QR Code */}
                {data && mode === 'view' && (
                    <div className="shrink-0">
                        <QRCodeGenerator
                            data={{
                                type: 'account' as QRDocType,
                                id: data.id || data.code || getCode(),
                                number: getCode(),
                                total: mainValue || 0,
                                currency: data.currency || '',
                                date: data.created_at || new Date().toISOString(),
                            }}
                            size={56}
                            showLabel={false}
                            showActions={false}
                            variant="inline"
                        />
                    </div>
                )}

                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}

export default SheetHeader;
