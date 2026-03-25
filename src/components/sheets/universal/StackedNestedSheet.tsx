import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UniversalDetailTabs } from './UniversalDetailTabs';
import { UniversalDetailContent } from './UniversalDetailContent';
import { getSheetConfig } from '../configs';
import { type NestedSheetState, type NestedSheetConfig } from '../configs/sheet.types';

interface StackedNestedSheetProps {
    sheet: NestedSheetState;
    onClose: (id: string) => void;
    language: string;
    t: (key: string) => string;
    direction: 'ltr' | 'rtl';
    onNestedOpen?: (config: NestedSheetConfig) => void;
}

export function StackedNestedSheet({
    sheet,
    onClose,
    language,
    t,
    direction,
    onNestedOpen,
}: StackedNestedSheetProps) {
    const [activeTab, setActiveTab] = useState<string>('');
    const config = sheet.config || getSheetConfig(sheet.docType);
    const isRTL = direction === 'rtl';

    useEffect(() => {
        if (config) {
            setActiveTab(config.defaultTab || config.tabs[0]?.id || '');
        }
    }, [config?.docType]);

    if (!config) return null;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Stacked Header - Black Bar */}
            <div className="bg-erp-navy text-white px-4 py-3 flex items-center justify-between shadow-md z-10 mx-4 mt-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/10 rounded-md">
                        {config.icon && <config.icon className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">
                            {typeof config.title === 'function' ? config.title(sheet.data) : t(config.title as string)}
                        </h3>
                        <p className="text-xs text-white/70">
                            {sheet.data.code || sheet.data.id?.substring(0, 8)}
                        </p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onClose(sheet.id)}
                    className="text-white hover:bg-white/10 hover:text-white h-8 w-8"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col mt-2">
                {/* Tabs */}
                <div className="px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mx-4 rounded-t-lg">
                    <UniversalDetailTabs
                        tabs={config.tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        data={sheet.data}
                        language={language}
                        t={t}
                        variant="underline"
                        styleVariant="classic"
                    />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 mx-4 mb-4 rounded-b-lg shadow-sm border border-t-0 border-gray-100 dark:border-gray-800">
                    <UniversalDetailContent
                        config={config}
                        data={sheet.data}
                        activeTab={activeTab}
                        language={language}
                        t={t}
                        direction={direction}
                        onRowClick={onNestedOpen ? (nestedConfig) => onNestedOpen(nestedConfig) : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
