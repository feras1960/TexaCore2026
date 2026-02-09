/**
 * DevLabNav — Shared navigation tabs for all developer lab pages
 * مكون التنقل المشترك لجميع صفحات المختبرات
 */
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    TestTube, Sheet, Eye, Database, Layers
} from 'lucide-react';

const LAB_TABS = [
    {
        id: 'component-lab',
        route: '/component-lab',
        labelAr: 'مختبر المكونات',
        labelEn: 'Component Lab',
        icon: TestTube,
        bgActive: 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-400',
    },
    {
        id: 'sheets-lab',
        route: '/sheets-lab',
        labelAr: 'مختبر الشيتات',
        labelEn: 'Sheets Lab',
        icon: Sheet,
        bgActive: 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400',
    },
    {
        id: 'sheets-preview',
        route: '/sheets-preview',
        labelAr: 'معاينة الشيتات',
        labelEn: 'Sheets Preview',
        icon: Eye,
        bgActive: 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-400',
    },
    {
        id: 'nexa-table',
        route: '/nexa-table',
        labelAr: 'الجداول',
        labelEn: 'NexaTable Demo',
        icon: Database,
        bgActive: 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-400',
    },
    {
        id: 'kanban-lab',
        route: '/kanban-lab',
        labelAr: 'لوحة كانبان',
        labelEn: 'Kanban Board',
        icon: Layers,
        bgActive: 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400',
        badge: 'NEW',
    },
];

interface DevLabNavProps {
    currentLabId: string;
}

export function DevLabNav({ currentLabId }: DevLabNavProps) {
    const navigate = useNavigate();
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';

    return (
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-700">
            {LAB_TABS.map((tab) => {
                const isActive = tab.id === currentLabId;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.route)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all border-b-2',
                            isActive
                                ? tab.bgActive
                                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {isRTL ? tab.labelAr : tab.labelEn}
                        {tab.badge && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-50 text-green-600 border-green-200">
                                {tab.badge}
                            </Badge>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
