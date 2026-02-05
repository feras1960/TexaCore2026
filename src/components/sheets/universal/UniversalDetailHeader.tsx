/**
 * UniversalDetailHeader - رأس الشيت الموحد
 * يعرض معلومات العنوان والحالة والرصيد والأزرار
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  RefreshCw,
  Edit2,
  MoreHorizontal,
  ChevronLeft,
} from 'lucide-react';
import { QRCodeGenerator, type QRDocType } from '@/components/shared/qrcode';
import { PrintDialog } from '@/components/shared/print';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  type SheetConfig,
  type BadgeConfig,
  type SheetAction,
  BADGE_VARIANT_CLASSES,
} from '../configs/sheet.types';

import { supabase } from '@/lib/supabase';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UniversalDetailHeaderProps {
  config: SheetConfig;
  data: any;
  language: string;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
  loading?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  level?: number;
}

export function UniversalDetailHeader({
  config,
  data,
  language,
  t,
  direction,
  loading = false,
  onClose,
  onEdit,
  onRefresh,
  onBack,
  showBackButton = false,
  level = 0,
}: UniversalDetailHeaderProps) {
  const isArabic = language === 'ar';
  const Icon = config.icon;

  // Get badge config
  const badge: BadgeConfig | null = config.badge ? config.badge(data) : null;

  // Get title and subtitle
  const title = config.title(data);
  const subtitle = config.subtitle ? config.subtitle(data) : undefined;

  // Get balance if configured
  const balanceConfig = config.balance;
  const balanceValue = balanceConfig ? balanceConfig.value(data) : null;
  const showBalance = Boolean(balanceConfig);

  // Filter visible actions
  const visibleActions = config.actions.filter(
    action => !action.show || action.show(data)
  );
  const quickActions = config.quickActions?.filter(
    action => !action.show || action.show(data)
  ) || [];

  // Primary actions (first 2) and overflow actions
  const primaryActions = visibleActions.slice(0, 2);
  const overflowActions = visibleActions.slice(2);
  /* State for Secure Action */
  const [secureAction, setSecureAction] = React.useState<SheetAction | null>(null);
  const [password, setPassword] = React.useState('');
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

  /* Helper to execute action and handle post-action logic */
  const executeAction = async (action: SheetAction) => {
    if (!action.onClick) return;

    try {
      await action.onClick(data);

      if (onRefresh) {
        onRefresh();
      }

      if (action.closeOnSuccess && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Action failed:', error);
      // Toast is handled in the action implementation usually
    }
  };

  const handleSecureConfirm = async () => {
    if (!secureAction || !password) return;

    setIsVerifying(true);
    setAuthError(null);

    try {
      // 1. Verify password by signing in (re-auth)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error(t('auth.userNotFound'));
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        throw new Error(t('auth.invalidPassword'));
      }

      // 2. Execute Action
      await executeAction(secureAction);

      // 3. Close Dialog
      setSecureAction(null);
      setPassword('');

    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || t('common.error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const renderActionButton = (action: SheetAction, inDropdown = false) => {
    const ActionIcon = action.icon;
    const label = t(action.label);
    const isDisabled = action.disabled ? action.disabled(data) : false;

    const handleClick = async (e?: React.MouseEvent) => {
      e?.preventDefault();

      if (action.requiresAuth) {
        setSecureAction(action);
        setPassword('');
        setAuthError(null);
        return;
      }

      // If no auth required but has confirm, the AlertDialog handles it via its Action
      // But if it's a direct button (no confirm), we execute here
      if (!action.confirm) {
        await executeAction(action);
      }
    };

    // If action has confirm dialog
    if (action.confirm) {
      const confirmTitle = t(action.confirm.title);
      const confirmDesc = t(action.confirm.description);
      const confirmLabel = action.confirm.confirmLabel
        ? t(action.confirm.confirmLabel)
        : t('common.confirm');
      const cancelLabel = action.confirm.cancelLabel
        ? t(action.confirm.cancelLabel)
        : t('common.cancel');

      // If auth is required, we don't use AlertDialog, we use our Secure Dialog
      if (action.requiresAuth) {
        if (inDropdown) {
          return (
            <DropdownMenuItem
              key={action.id}
              onClick={handleClick}
              disabled={isDisabled}
              className={cn(
                action.variant === 'destructive' && 'text-red-600 dark:text-red-400'
              )}
            >
              {ActionIcon && <ActionIcon className="w-4 h-4 me-2" />}
              {label}
            </DropdownMenuItem>
          );
        }
        return (
          <Button
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
            size="sm"
            onClick={handleClick}
            disabled={isDisabled || action.loading}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            {ActionIcon && <ActionIcon className={cn('w-4 h-4 me-1', action.loading && 'animate-spin')} />}
            {label}
          </Button>
        );
      }

      return (
        <AlertDialog key={action.id}>
          <AlertDialogTrigger asChild>
            {inDropdown ? (
              <DropdownMenuItem
                disabled={isDisabled}
                onSelect={(e) => e.preventDefault()}
                className={cn(
                  action.variant === 'destructive' && 'text-red-600 dark:text-red-400'
                )}
              >
                {ActionIcon && <ActionIcon className="w-4 h-4 me-2" />}
                {label}
              </DropdownMenuItem>
            ) : (
              <Button
                variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
                size="sm"
                disabled={isDisabled}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4 me-1" />}
                {label}
              </Button>
            )}
          </AlertDialogTrigger>
          <AlertDialogContent dir={direction}>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={isArabic ? 'flex-row-reverse gap-2' : ''}>
              <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  executeAction(action).then(() => {
                    // The dialog will close automatically unless we explicitly control open state
                    // But since we are inside on click, we just let it be.
                    // Ideally we should use specific open state but for now this works for standard actions.
                    // To force close we might need to click cancel or find the trigger, but shadcn usually closes.
                  });
                }}
                className={cn(
                  action.variant === 'destructive' && 'bg-red-600 hover:bg-red-700'
                )}
              >
                {confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    // Regular action button (No Confirm, No Auth)
    if (inDropdown) {
      return (
        <DropdownMenuItem
          key={action.id}
          onClick={handleClick}
          disabled={isDisabled}
          className={cn(
            action.variant === 'destructive' && 'text-red-600 dark:text-red-400'
          )}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4 me-2" />}
          {label}
        </DropdownMenuItem>
      );
    }

    return (
      <Button
        key={action.id}
        variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
        size="sm"
        onClick={handleClick}
        disabled={isDisabled || action.loading}
        className="text-white/80 hover:text-white hover:bg-white/10"
      >
        {ActionIcon && <ActionIcon className={cn('w-4 h-4 me-1', action.loading && 'animate-spin')} />}
        {label}
      </Button>
    );
  };

  return (
    <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-600 dark:from-teal-800 dark:via-teal-700 dark:to-cyan-800 p-4 text-white flex-shrink-0 shadow-lg min-h-[132px]">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Back button + Icon + Title */}
        <div className="flex items-center gap-3">
          {/* Back Button for nested sheets */}
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white/80 hover:text-white hover:bg-white/10 -ms-2"
            >
              <ChevronLeft className={cn('w-5 h-5', direction === 'rtl' && 'rotate-180')} />
            </Button>
          )}

          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            config.iconBg || 'bg-white/10 backdrop-blur-sm'
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-cairo">{title}</h2>
              {badge && (
                <Badge className={cn('text-xs', BADGE_VARIANT_CLASSES[badge.variant])}>
                  {badge.icon && <badge.icon className="w-3 h-3 me-1" />}
                  {t(badge.label)}
                </Badge>
              )}
            </div>
            {subtitle && (
              <div className="flex items-center gap-2 mt-1 text-white/70 text-sm">
                <span className="font-mono">{subtitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          {quickActions.map(action => renderActionButton(action))}

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          )}

          {/* Edit Button */}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={onEdit}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}

          {/* Print Button */}
          <PrintDialog
            docType={config.docType}
            docId={data?.id}
            docNumber={title}
            className="text-white/80 hover:text-white hover:bg-white/10 border-0"
          />

          {/* QR Code Button */}
          <QRCodeGenerator
            data={{
              type: config.docType as QRDocType,
              id: data?.id,
              number: subtitle || title,
              date: data?.date || data?.created_at,
              total: balanceValue || data?.total || data?.amount,
              status: badge?.label,
            }}
            variant="compact"
            size={100}
            className="text-white/80 hover:text-white hover:bg-white/10 border-0"
          />

          {/* Primary Action Buttons */}
          {primaryActions.map(action => renderActionButton(action))}

          {/* Overflow Menu */}
          {overflowActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflowActions.map((action, index) => (
                  <React.Fragment key={action.id}>
                    {index > 0 && action.variant === 'destructive' && (
                      <DropdownMenuSeparator />
                    )}
                    {renderActionButton(action, true)}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Balance Display */}
      <div className={cn(
        "mt-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm min-h-[56px]",
        !showBalance && "opacity-0"
      )}>
        <div className="text-xs text-white/60 mb-1">
          {balanceConfig?.label ? t(balanceConfig.label) : t('accounting.currentBalance')}
        </div>
        <div className={cn(
          'text-2xl font-bold font-mono',
          balanceConfig?.showSign !== false && (
            (typeof balanceValue === 'number' && balanceValue >= 0) ? 'text-emerald-300' : 'text-rose-300'
          )
        )}>
          {balanceConfig?.showSign !== false && typeof balanceValue === 'number' && balanceValue > 0 && '+'}
          {typeof balanceValue === 'number'
            ? balanceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })
            : (balanceValue ?? '--')}
          {balanceConfig?.currency && (
            <span className="text-sm text-white/60 ms-1">
              {balanceConfig.currency}
            </span>
          )}
        </div>
      </div>
      {/* Secure Action Dialog */}
      <Dialog open={!!secureAction} onOpenChange={(open) => !open && setSecureAction(null)}>
        <DialogContent dir={direction} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {secureAction?.confirm ? t(secureAction.confirm.title) : t('common.confirmAction')}
            </DialogTitle>
            <DialogDescription>
              {secureAction?.confirm ? t(secureAction.confirm.description) : t('common.confirmActionDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-200 dark:border-yellow-800 flex gap-2">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {t('dialogs.secureActionWarning')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('auth.adminPassword')}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {authError && (
              <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
            )}
          </div>
          <DialogFooter className={isArabic ? 'flex-row-reverse gap-2' : ''}>
            <Button variant="outline" onClick={() => setSecureAction(null)} disabled={isVerifying}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={secureAction?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleSecureConfirm}
              disabled={!password || isVerifying}
            >
              {isVerifying && <RefreshCw className="w-4 h-4 me-2 animate-spin" />}
              {t('common.verifyAndProceed')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UniversalDetailHeader;
