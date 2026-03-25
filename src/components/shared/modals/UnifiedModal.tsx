import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LucideIcon, X, Loader2 } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  // Action buttons
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive' | 'teal' | 'navy';
  isLoading?: boolean;
  isValid?: boolean;
}

export function UnifiedModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconColor = 'from-erp-navy to-erp-teal',
  size = 'md',
  showCloseButton = true,
  children,
  footer,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'teal',
  isLoading = false,
  isValid = true,
}: UnifiedModalProps) {
  const { t, direction } = useLanguage();

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'p-0 overflow-hidden',
          SIZE_CLASSES[size]
        )}
        dir={direction}
      >
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={cn('p-2.5 rounded-xl text-white shadow-lg bg-gradient-to-br', iconColor)}>
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div>
                <DialogTitle className="text-lg font-bold text-erp-navy dark:text-white font-cairo">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
            {showCloseButton && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>

        {/* Footer */}
        {(footer || onConfirm) && (
          <DialogFooter className="p-4 pt-0 gap-2">
            {footer || (
              <>
                {onCancel !== undefined && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    {cancelLabel || t('common.cancel')}
                  </Button>
                )}
                {onConfirm && (
                  <Button
                    variant={confirmVariant}
                    onClick={onConfirm}
                    disabled={isLoading || !isValid}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    {confirmLabel || t('common.save')}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
