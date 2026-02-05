import React from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type NestedSheetState } from '../configs/sheet.types';
import { getSheetConfig } from '../configs';

interface NestedSheetTabBarProps {
    sheets: NestedSheetState[];
    activeSheetId: string | null;
    onSelect: (id: string | null) => void;
    onClose: (id: string) => void;
    language: string;
    t: (key: string) => string;
}

export function NestedSheetTabBar({
    sheets,
    activeSheetId,
    onSelect,
    onClose,
    language,
    t,
}: NestedSheetTabBarProps) {
    if (sheets.length === 0) return null;

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
            {/* Main Sheet Tab (Optional - enabling "Home" navigation) */}
            <Button
                variant={activeSheetId === null ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onSelect(null)}
                className={cn(
                    "gap-2 h-8 text-xs font-medium border",
                    activeSheetId === null
                        ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                        : "border-transparent text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
            >
                <span>{t('common.main')}</span>
            </Button>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Nested Sheets Tabs */}
            {sheets.map((sheet) => {
                const config = sheet.config || getSheetConfig(sheet.docType);
                const isActive = activeSheetId === sheet.id;
                const Icon = config?.icon || FileText;
                const title = typeof config?.title === 'function' ? config.title(sheet.data) : t(config?.title as string || 'common.details');

                return (
                    <div
                        key={sheet.id}
                        className={cn(
                            "group flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer select-none",
                            isActive
                                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-foreground shadow-sm"
                                : "bg-transparent border-transparent text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        onClick={() => onSelect(sheet.id)}
                    >
                        <Icon className="w-3.5 h-3.5 opacity-70" />
                        <span className="max-w-[120px] truncate">{title}</span>
                        <span className="text-[10px] text-muted-foreground opacity-70">
                            {sheet.data.code || sheet.data.document_number || ''}
                        </span>
                        <div
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(sheet.id);
                            }}
                            className={cn(
                                "ml-1 p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100",
                                isActive && "opacity-100"
                            )}
                        >
                            <X className="w-3 h-3" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
