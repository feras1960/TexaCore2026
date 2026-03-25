import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { LucideIcon, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface QuickAction {
  id: string;
  labelKey: string;
  icon?: LucideIcon;
  onClick: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
  triggerLabel?: string;
  triggerIcon?: LucideIcon;
  className?: string;
  variant?: 'button' | 'fab';
}

export function QuickActionsBar({
  actions,
  triggerLabel,
  triggerIcon: TriggerIcon = Plus,
  className,
  variant = 'button',
}: QuickActionsBarProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  if (actions.length === 0) return null;

  const enabledActions = actions.filter(a => !a.disabled);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'fab' ? (
          <Button
            size="icon"
            className={cn(
              'h-14 w-14 rounded-full bg-erp-teal hover:bg-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105',
              className
            )}
          >
            <TriggerIcon className="h-7 w-7" />
          </Button>
        ) : (
          <Button variant="teal" className={cn('gap-2', className)}>
            <TriggerIcon className="w-4 h-4" />
            {triggerLabel && t(triggerLabel)}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRTL ? 'end' : 'start'}
        className="w-56 font-tajawal"
      >
        <DropdownMenuLabel>{t('header.quickAdd')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {enabledActions.map((action, index) => (
          <React.Fragment key={action.id}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={action.onClick}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {action.icon && <action.icon className="w-4 h-4 text-gray-500" />}
                  <span>{t(action.labelKey)}</span>
                </div>
                {action.shortcut && (
                  <span className="text-xs text-gray-400 font-mono">
                    {action.shortcut}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
