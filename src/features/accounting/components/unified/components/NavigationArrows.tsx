/**
 * Navigation Arrows Component - أسهم التنقل
 * للتنقل بين السجلات (الحساب السابق/التالي، الفاتورة السابقة/التالية)
 */

import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavigationArrowsProps {
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    className?: string;
    size?: 'sm' | 'md';
}

export function NavigationArrows({
    onPrev,
    onNext,
    hasPrev = true,
    hasNext = true,
    className,
    size = 'sm',
}: NavigationArrowsProps) {
    const { t } = useLanguage();

    const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <TooltipProvider delayDuration={300}>
            <div className={cn(
                "flex flex-col gap-0.5 border rounded-lg p-0.5 bg-gray-50 dark:bg-gray-800",
                className
            )}>
                {/* السهم للأعلى - السجل السابق */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onPrev}
                            disabled={!hasPrev}
                            className={cn(
                                buttonSize,
                                "rounded-md transition-all text-gray-700 dark:text-gray-200",
                                hasPrev
                                    ? "hover:bg-gray-100 hover:text-erp-primary dark:hover:bg-gray-700"
                                    : "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <ChevronUp className={iconSize} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>{t('navigation.previous') || 'السابق'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* السهم للأسفل - السجل التالي */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onNext}
                            disabled={!hasNext}
                            className={cn(
                                buttonSize,
                                "rounded-md transition-all text-gray-700 dark:text-gray-200",
                                hasNext
                                    ? "hover:bg-gray-100 hover:text-erp-primary dark:hover:bg-gray-700"
                                    : "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <ChevronDown className={iconSize} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>{t('navigation.next') || 'التالي'}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}

export default NavigationArrows;
