import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { LucideIcon, Loader2 } from 'lucide-react';

export interface ActionButton {
  id: string;
  labelKey: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'teal' | 'navy';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
}

interface ActionButtonsBarProps {
  actions: ActionButton[];
  className?: string;
  align?: 'start' | 'center' | 'end' | 'between';
  size?: 'sm' | 'default' | 'lg';
}

export function ActionButtonsBar({
  actions,
  className,
  align = 'end',
  size = 'default',
}: ActionButtonsBarProps) {
  const { t } = useLanguage();

  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  const visibleActions = actions.filter(a => !a.hidden);

  if (visibleActions.length === 0) return null;

  return (
    <motion.div 
      className={cn('flex items-center gap-2 flex-wrap', alignClasses[align], className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {visibleActions.map((action, index) => {
        const Icon = action.icon;
        
        return (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant={action.variant || 'default'}
              size={size}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : Icon ? (
                <Icon className="w-4 h-4 me-2" />
              ) : null}
              {t(action.labelKey)}
            </Button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
