import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FileSearch } from 'lucide-react';

export interface EmptyStateProps {
    /** The main title text */
    title?: string;
    /** The subtitle or descriptive text */
    description?: string;
    /** The icon element (defaults to FileSearch) */
    icon?: ReactNode;
    /** Any action elements, like a "Clear Filters" button */
    action?: ReactNode;
    /** Additional CSS classes for the container */
    className?: string;
    /** Whether to add a subtle entry animation */
    animate?: boolean;
}

/**
 * ════════════════════════════════════════════════════════════════════
 * 🪹 EmptyState — مكون الحالة الفارغة
 * ════════════════════════════════════════════════════════════════════
 * Provides a beautiful, consistent empty state with illustrations and 
 * subtle animations for data grids, lists, and pages without content.
 */
export function EmptyState({
    title = 'لا يوجد بيانات',
    description,
    icon,
    action,
    className,
    animate = true,
}: EmptyStateProps) {
    return (
        <div 
            className={cn(
                "flex flex-col items-center justify-center p-8 sm:p-12 text-center",
                "bg-white/50 dark:bg-gray-900/10 rounded-2xl mx-auto my-4 max-w-md",
                "border border-dashed border-gray-200 dark:border-gray-800",
                animate && "animate-in fade-in zoom-in-95 duration-500",
                className
            )}
        >
            {/* Icon Wrapper with glowing subtle background */}
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30">
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-indigo-200 dark:bg-indigo-800 delay-300 duration-3000" />
                <div className="z-10 text-indigo-400 dark:text-indigo-500">
                    {icon || <FileSearch className="h-10 w-10 stroke-[1.5]" />}
                </div>
            </div>

            {/* Typography */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">
                {title}
            </h3>
            
            {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm leading-relaxed">
                    {description}
                </p>
            )}

            {/* Action Buttons */}
            {action && (
                <div className="mt-2 flex flex-col items-center gap-3">
                    {action}
                </div>
            )}
        </div>
    );
}

export default EmptyState;
