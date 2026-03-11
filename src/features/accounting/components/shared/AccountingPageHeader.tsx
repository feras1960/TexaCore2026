import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';

interface AccountingPageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export const AccountingPageHeader: React.FC<AccountingPageHeaderProps> = ({
    title,
    description,
    children,
    className
}) => {
    const { direction } = useLanguage();

    return (
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 ${className}`} dir={direction}>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    {children}
                </div>
            )}
        </div>
    );
};
