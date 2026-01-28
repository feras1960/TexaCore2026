/**
 * BaseDetailSheet - المكون الأساسي للشيتات الموحدة
 * 
 * مكون ثابت وآمن بدون مشاكل التركيز أو التجميد
 * يستخدم Sheet من shadcn/ui (لا يستخدم MotionSheet)
 * 
 * الميزات:
 * - Header مع Icon و Badge
 * - Stats Cards قابلة للتخصيص
 * - Tabs نظيفة وسريعة
 * - Actions مع Confirm Dialog
 * - RTL Support
 * - No Animation Issues
 * - No Focus Loop
 * - ✨ Edit Mode Support (Toggle/Always/None)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, Loader2, Edit, Save, XCircle } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import {
  BaseDetailSheetProps,
  SHEET_WIDTH_CLASSES,
  STAT_COLOR_CLASSES,
  ActionConfig,
} from './types';
import { useEditMode } from './hooks/useEditMode';
import { toast } from 'sonner';

export const BaseDetailSheet: React.FC<BaseDetailSheetProps> = ({
  isOpen,
  onClose,
  config,
  data,
  onRefresh,
  onEdit,
  loading = false,
  handlers,
  editMode = 'none', // ✨ Default: no editing
  onSave,
  editable = true,
}) => {
  const { t, language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState(config.defaultTab);
  const [confirmAction, setConfirmAction] = useState<ActionConfig | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // ✨ Edit Mode Hook
  const editHook = useEditMode({
    initialData: data,
    onSave: async (editedData) => {
      if (onSave) {
        await onSave(editedData);
        toast.success(t('common.saved'));
        if (onRefresh) onRefresh();
      }
    },
    onCancel: () => {
      toast.info(t('common.cancelled'));
    },
    validateAll: config.editConfig?.validation,
  });

  // Determine if we're in edit mode
  const isEditingMode = editMode === 'always' || (editMode === 'toggle' && editHook.isEditing);
  
  // Show edit button?
  const showEditButton = editMode === 'toggle' && config.editConfig?.enabled && editable;

  // Reset edit state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      editHook.cancelEdit();
    }
  }, [isOpen]);

  // Resolve title and subtitle
  const title = typeof config.title === 'function' 
    ? config.title(data) 
    : config.title;
  
  const subtitle = config.subtitle 
    ? (typeof config.subtitle === 'function' ? config.subtitle(data) : config.subtitle)
    : undefined;

  // Resolve badge
  const badge = config.badge ? config.badge(data) : null;

  // Width class
  const widthClass = SHEET_WIDTH_CLASSES[config.width || 'lg'];

  // Filtered actions
  const visibleActions = useMemo(() => {
    return config.actions.filter(action => 
      !action.show || action.show(data)
    );
  }, [config.actions, data]);

  // Handle action click
  const handleActionClick = async (action: ActionConfig) => {
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      await executeAction(action);
    }
  };

  // Execute action
  const executeAction = async (action: ActionConfig) => {
    try {
      setIsActionLoading(true);
      await action.onClick(data, {
        language,
        t,
        handlers: {
          onRefresh,
          onEdit,
        },
      });
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
    } finally {
      setIsActionLoading(false);
      setConfirmAction(null);
    }
  };

  // Get badge variant class
  const getBadgeVariant = (variant: string) => {
    const variants = {
      success: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      default: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return variants[variant as keyof typeof variants] || variants.default;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side={direction === 'rtl' ? 'left' : 'right'}
          className={cn(
            'overflow-hidden p-0 flex flex-col !max-w-none',
            widthClass
          )}
        >
          {/* Hidden accessibility elements */}
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            {subtitle || title}
          </SheetDescription>

          {/* Header */}
          <SheetHeader className={cn(
            "border-b border-border/50 p-6 pb-4 space-y-4 shrink-0",
            direction === 'rtl' ? 'text-right' : 'text-left'
          )}>
            {/* Close Button */}
            <div className={cn(
              "flex items-center justify-between",
              direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
            )}>
              <div className={cn(
                'flex items-center gap-3',
                config.iconBg,
                'p-2 rounded-lg'
              )}>
                <config.icon className="h-5 w-5 text-white" />
              </div>
              
              {/* ✨ Edit/Save Buttons + Close */}
              <div className="flex items-center gap-2">
                {showEditButton && !editHook.isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={editHook.startEdit}
                    className="h-8"
                  >
                    <Edit className="w-3.5 h-3.5 me-1.5" />
                    {t('common.edit')}
                  </Button>
                )}
                
                {showEditButton && editHook.isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={editHook.cancelEdit}
                      disabled={editHook.isSaving}
                      className="h-8"
                    >
                      <XCircle className="w-3.5 h-3.5 me-1.5" />
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={editHook.saveEdit}
                      disabled={editHook.isSaving || !editHook.isDirty}
                      className="h-8"
                    >
                      {editHook.isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 me-1.5" />
                      )}
                      {t('common.save')}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Title & Badge */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">
                  {title}
                </h2>
                {badge && (
                  <Badge 
                    variant="outline"
                    className={getBadgeVariant(badge.variant)}
                  >
                    {badge.label}
                  </Badge>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Stats */}
            {config.stats.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {config.stats.map((stat) => {
                  const StatIcon = stat.icon;
                  const displayValue = stat.format 
                    ? stat.format(stat.value, data)
                    : stat.value;

                  return (
                    <div
                      key={stat.key}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg bg-muted/30 border border-border/50",
                        direction === 'rtl' ? 'text-right' : 'text-left'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-full mb-2',
                        STAT_COLOR_CLASSES[stat.color]
                      )}>
                        <StatIcon className="h-4 w-4" />
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        {displayValue}
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SheetHeader>

          {/* Tabs */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Tabs List */}
              <div className="border-b border-border/50 px-6 shrink-0">
                <TabsList className="h-auto p-0 bg-transparent w-full justify-start gap-4">
                  {config.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const badgeValue = tab.badge ? tab.badge(data) : null;

                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-3"
                      >
                        <TabIcon className="h-4 w-4 me-2" />
                        {tab.label}
                        {badgeValue && (
                          <Badge 
                            variant="secondary" 
                            className="ms-2 h-5 min-w-5 px-1.5"
                          >
                            {badgeValue}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {config.tabs.map((tab) => (
                  <TabsContent 
                    key={tab.id} 
                    value={tab.id}
                    className="mt-0 h-full p-6"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <tab.component
                        data={isEditingMode ? editHook.editedData : data}
                        language={language}
                        t={t}
                        direction={direction}
                        onRefresh={onRefresh}
                        isEditing={isEditingMode}
                        onUpdate={editHook.updateField}
                        errors={editHook.errors}
                      />
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>

          {/* Actions Footer */}
          {visibleActions.length > 0 && (
            <>
              <Separator />
              <div className={cn(
                "p-6 shrink-0 bg-muted/20",
                direction === 'rtl' ? 'text-right' : 'text-left'
              )}>
                <div className={cn(
                  "flex flex-wrap gap-2",
                  direction === 'rtl' ? 'justify-end' : 'justify-start'
                )}>
                  {visibleActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant={action.variant || 'outline'}
                        size="sm"
                        onClick={() => handleActionClick(action)}
                        disabled={isActionLoading}
                        className="flex items-center gap-2"
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ActionIcon className="h-4 w-4" />
                        )}
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <AlertDialog 
        open={!!confirmAction} 
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirm?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
