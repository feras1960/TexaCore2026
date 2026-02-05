import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';

interface StatusBadgeProps {
    status: string;
    className?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, variant, customLabel }) => {
    const { t } = useLanguage();

    const getStatusConfig = (statusKey: string) => {
        const lowerStatus = statusKey?.toLowerCase();

        switch (lowerStatus) {
            case 'active':
            case 'approved':
            case 'completed':
            case 'posted':
                return { variant: 'default' as const, label: t(`common.status.${lowerStatus}`) || 'Active' };
            case 'draft':
            case 'pending':
            case 'pending_approval':
                return { variant: 'secondary' as const, label: t(`common.status.${lowerStatus}`) || 'Pending' };
            case 'rejected':
            case 'cancelled':
            case 'void':
            case 'failed':
            case 'inactive':
                return { variant: 'destructive' as const, label: t(`common.status.${lowerStatus}`) || 'Inactive' };
            case 'closed':
            case 'archived':
                return { variant: 'outline' as const, label: t(`common.status.${lowerStatus}`) || 'Closed' };
            default:
                return { variant: variant || 'outline' as const, label: customLabel || statusKey };
        }
    };

    const config = getStatusConfig(status);
    const badgeVariant = variant || config.variant;
    // Fallback to custom label or translated status or raw status
    const label = customLabel || t(`recurringEntries.status.${status}`) || t(`common.${status}`) || status;

    return (
        <Badge variant={badgeVariant} className={className}>
            {label}
        </Badge>
    );
};
