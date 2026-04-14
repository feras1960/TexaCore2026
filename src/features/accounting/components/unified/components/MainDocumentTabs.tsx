/**
 * Main Document Tabs Component - التبويبات الرئيسية للمستندات
 * يدعم حتى 6 تبويبات مع إمكانية إغلاق التبويبات الإضافية
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    X,
    Plus,
    BookOpen,
    Wallet,
    Users,
    FileText,
    Receipt,
    CreditCard,
    ArrowRightLeft,
    BookMarked,
    Package,
    Warehouse,
    Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalizedName } from '@/lib/utils/getLocalizedName';
import type { OpenDocument, UnifiedDocType } from '../types';

// Icon mapping
const iconMap: Record<string, any> = {
    BookOpen,
    Wallet,
    Users,
    FileText,
    Receipt,
    CreditCard,
    ArrowRightLeft,
    BookMarked,
    Package,
    Warehouse,
    Layers,
    account: BookOpen,
    fund: Wallet,
    party: Users,
    journal: BookMarked,
    receipt: Receipt,
    payment: CreditCard,
    transfer: ArrowRightLeft,
    transaction: FileText,
    material: Package,
    warehouse: Warehouse,
    roll: Layers,
};

// Color mapping for doc types
const colorMap: Partial<Record<UnifiedDocType, string>> = {
    account: 'text-blue-600',
    fund: 'text-green-600',
    party: 'text-purple-600',
    journal: 'text-indigo-600',
    receipt: 'text-emerald-600',
    payment: 'text-red-600',
    transfer: 'text-orange-600',
    exchange: 'text-yellow-600',
    transaction: 'text-gray-600',
    material: 'text-teal-600',
    materialGroup: 'text-indigo-600',
    warehouse: 'text-cyan-600',
    goods_receipt: 'text-emerald-600',
    sales_delivery: 'text-rose-600',
    roll: 'text-amber-600',
};

interface MainDocumentTabsProps {
    documents: OpenDocument[];
    activeId: string;
    onTabChange: (id: string) => void;
    onTabClose: (id: string) => void;
    onAddTab?: () => void;   // زر "+" لفتح مستند جديد
    className?: string;
}

export function MainDocumentTabs({
    documents,
    activeId,
    onTabChange,
    onTabClose,
    onAddTab,
    className,
}: MainDocumentTabsProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    return (
        <div className={cn(
            "border-b bg-gray-50/50 dark:bg-gray-900/50",
            className
        )} dir={isRTL ? 'rtl' : 'ltr'}>
            <ScrollArea className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-1 px-2 py-1.5 min-w-max">
                    {documents.map((doc, index) => {
                        const isActive = doc.id === activeId;
                        const IconComponent = iconMap[doc.type] || iconMap[doc.icon || ''] || FileText;
                        const colorClass = colorMap[doc.type] || 'text-gray-600';

                        return (
                            <div
                                key={doc.id}
                                className={cn(
                                    "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg border border-b-0 cursor-pointer transition-all",
                                    isActive
                                        ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm -mb-px"
                                        : "bg-transparent border-transparent hover:bg-white/60 hover:border-gray-200/50"
                                )}
                                onClick={() => onTabChange(doc.id)}
                            >
                                {/* Icon */}
                                <IconComponent className={cn("w-4 h-4", colorClass)} />

                                {/* Title */}
                                <span className={cn(
                                    "text-sm font-medium max-w-[120px] truncate",
                                    isActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                                )}>
                                    {/* Resolve name from data dynamically for current language */}
                                    {doc.data
                                        ? (getLocalizedName(doc.data, language) || doc.title)
                                        : ((language === 'ar' && doc.titleAr) ? doc.titleAr : doc.title)
                                    }
                                </span>

                                {/* Code badge — use live data code */}
                                {(doc.data?.code || doc.code) && (
                                    <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                        {doc.data?.code || doc.code}
                                    </span>
                                )}

                                {/* Close button (only for closable tabs) */}
                                {doc.isClosable && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                            "hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTabClose(doc.id);
                                        }}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}

                    {/* ➕ Add new tab button */}
                    {onAddTab && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 p-0 ms-1 text-gray-400 hover:text-erp-teal hover:bg-erp-teal/10 rounded-full shrink-0"
                            title={language === 'ar' ? 'فتح مستند جديد' : 'Open new document'}
                            onClick={onAddTab}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

export default MainDocumentTabs;
