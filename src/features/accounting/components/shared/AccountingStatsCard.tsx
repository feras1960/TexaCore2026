import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';

interface AccountingStatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
    onClick?: () => void;
    className?: string;
}

export const AccountingStatsCard: React.FC<AccountingStatsCardProps> = ({
    title,
    value,
    icon: Icon,
    description,
    trend,
    trendValue,
    variant = 'default',
    onClick,
    className
}) => {
    const { direction } = useLanguage();

    const getVariantStyles = () => {
        switch (variant) {
            case 'blue':
                return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800';
            case 'green':
                return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800';
            case 'red':
                return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800';
            case 'purple':
                return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800';
            case 'orange':
                return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800';
            default:
                return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700';
        }
    };

    const getIconStyles = () => {
        switch (variant) {
            case 'blue': return 'bg-blue-200/50 text-blue-700';
            case 'green': return 'bg-emerald-200/50 text-emerald-700';
            case 'red': return 'bg-red-200/50 text-red-700';
            case 'purple': return 'bg-purple-200/50 text-purple-700';
            case 'orange': return 'bg-orange-200/50 text-orange-700';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
        }
    };

    return (
        <Card
            className={`border shadow-sm transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold font-mono tracking-tight">{value}</h3>
                        </div>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        )}
                        {trend && trendValue && (
                            <div className={`flex items-center gap-1 text-xs mt-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="font-medium">{trendValue}</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${getIconStyles()}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
