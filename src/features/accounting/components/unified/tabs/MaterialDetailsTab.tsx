/**
 * ════════════════════════════════════════════════════════════════
 * 📋 Material Details Tab (Merged)
 * تبويب تفاصيل المادة - يجمع المواصفات + المتغيرات + المعلومات الإضافية
 * ════════════════════════════════════════════════════════════════
 * يستخدم أقسام قابلة للطي (Collapsible) لتنظيم المحتوى
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { ChevronDown, Ruler, Layers, Info } from 'lucide-react';
import type { SheetMode } from '../types';

// Import the existing sub-components
import { MaterialSpecsTab } from './MaterialSpecsTab';
import { MaterialVariantsTab } from './MaterialVariantsTab';
import { MaterialAdditionalInfoTab } from './MaterialAdditionalInfoTab';

interface MaterialDetailsTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
    suppliers?: { id: string; name_ar: string; name_en: string; code: string }[];
}

interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: string;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children, badge }: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3",
                    "bg-gray-50 dark:bg-gray-800/50",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "transition-colors duration-150",
                    "text-start"
                )}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold text-[15px] text-gray-800 dark:text-gray-200">
                        {title}
                    </span>
                    {badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-erp-teal/10 text-erp-teal font-medium">
                            {badge}
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-gray-500 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                    )}
                />
            </button>
            {isOpen && (
                <div className="p-4">
                    {children}
                </div>
            )}
        </div>
    );
}

export function MaterialDetailsTab({ data, mode, onChange, suppliers = [] }: MaterialDetailsTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div className="space-y-3 pb-6">
            {/* Section 1: المواصفات الفنية */}
            <CollapsibleSection
                title={isAr ? 'المواصفات الفنية' : 'Technical Specifications'}
                icon={<Ruler className="w-4 h-4 text-blue-600" />}
                defaultOpen={true}
            >
                <MaterialSpecsTab data={data} mode={mode} onChange={onChange} />
            </CollapsibleSection>

            {/* Section 2: المتغيرات */}
            <CollapsibleSection
                title={isAr ? 'المتغيرات والتصاميم' : 'Variants & Designs'}
                icon={<Layers className="w-4 h-4 text-purple-600" />}
                defaultOpen={false}
            >
                <MaterialVariantsTab data={data} mode={mode} onChange={onChange} />
            </CollapsibleSection>

            {/* Section 3: معلومات إضافية */}
            <CollapsibleSection
                title={isAr ? 'معلومات إضافية' : 'Additional Information'}
                icon={<Info className="w-4 h-4 text-gray-600" />}
                defaultOpen={false}
            >
                <MaterialAdditionalInfoTab data={data} mode={mode} onChange={onChange} suppliers={suppliers} />
            </CollapsibleSection>
        </div>
    );
}
