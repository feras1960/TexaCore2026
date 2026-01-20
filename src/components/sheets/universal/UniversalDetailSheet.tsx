/**
 * UniversalDetailSheet - المكون الرئيسي للشيت الموحد
 * يجمع كل المكونات ويدير الحالة والتبويبات
 */

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { UniversalDetailHeader } from './UniversalDetailHeader';
import { UniversalDetailTabs } from './UniversalDetailTabs';
import { UniversalDetailContent } from './UniversalDetailContent';
import { NestedSheetManager } from './NestedSheetManager';
import { useNestedSheets } from '../hooks/useNestedSheets';
import { getSheetConfig } from '../configs';
import {
  type SheetConfig,
  type DocType,
  type NestedSheetConfig,
  SHEET_SIZE_CLASSES,
} from '../configs/sheet.types';

// ===== Edit Mode Context =====
interface EditModeContextType {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  setIsEditing: (editing: boolean) => void;
  setHasUnsavedChanges: (changes: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  isEditing: false,
  hasUnsavedChanges: false,
  setIsEditing: () => {},
  setHasUnsavedChanges: () => {},
});

export const useEditMode = () => useContext(EditModeContext);

interface UniversalDetailSheetProps {
  // Basic Props
  isOpen: boolean;
  onClose: () => void;
  
  // Data Props - either pass docType + data, or just config + data
  docType?: DocType;
  data: any;
  config?: SheetConfig;
  
  // Optional overrides
  onEdit?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  
  // Nested sheet support
  enableNestedSheets?: boolean;
}

export function UniversalDetailSheet({
  isOpen,
  onClose,
  docType,
  data,
  config: providedConfig,
  onEdit,
  onRefresh,
  loading = false,
  enableNestedSheets = true,
}: UniversalDetailSheetProps) {
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  // Get configuration
  const config = providedConfig || (docType ? getSheetConfig(docType) : null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Nested sheets management
  const {
    sheets: nestedSheets,
    openNestedSheet,
    closeNestedSheet,
    closeAllNested,
    hasNestedSheets,
  } = useNestedSheets();

  // Set default tab when config changes
  useEffect(() => {
    if (config) {
      setActiveTab(config.defaultTab || config.tabs[0]?.id || '');
    }
  }, [config?.docType]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      closeAllNested();
      setIsEditing(false);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, closeAllNested]);

  // Handle nested sheet open
  const handleNestedOpen = useCallback((nestedConfig: NestedSheetConfig) => {
    if (enableNestedSheets) {
      openNestedSheet(nestedConfig);
    }
  }, [enableNestedSheets, openNestedSheet]);

  // Handle close attempt
  const handleCloseAttempt = useCallback(() => {
    if (isEditing || hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      closeAllNested();
      onClose();
    }
  }, [isEditing, hasUnsavedChanges, closeAllNested, onClose]);

  // Force close (after confirmation)
  const handleForceClose = useCallback(() => {
    setShowCloseConfirm(false);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    closeAllNested();
    onClose();
  }, [closeAllNested, onClose]);

  // Continue editing
  const handleContinueEditing = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  // If no config or data, don't render
  if (!config || !data) return null;

  const sheetWidth = config.width || 'lg';

  return (
    <EditModeContext.Provider value={{ isEditing, hasUnsavedChanges, setIsEditing, setHasUnsavedChanges }}>
      {/* Main Sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleCloseAttempt()}>
        <SheetContent
          side={isRTL ? 'left' : 'right'}
          className={cn(
            'p-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden rounded-s-2xl shadow-2xl',
            SHEET_SIZE_CLASSES[sheetWidth],
            // Reduce width when nested sheets are open
            hasNestedSheets && '!w-[45%]'
          )}
        >
          {/* Header */}
          <UniversalDetailHeader
            config={config}
            data={data}
            language={language}
            t={t}
            direction={direction}
            loading={loading}
            onClose={handleCloseAttempt}
            onEdit={onEdit}
            onRefresh={onRefresh}
          />

          {/* Tabs - lighter teal gradient for consistency */}
          <div className="bg-gradient-to-r from-teal-100/80 via-cyan-50 to-teal-100/80 dark:from-teal-900/40 dark:via-cyan-900/30 dark:to-teal-900/40 px-4 py-3 border-b border-teal-200/50 dark:border-teal-800/50 backdrop-blur-sm">
            <UniversalDetailTabs
              tabs={config.tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              data={data}
              language={language}
              t={t}
              variant="pills"
            />
          </div>

          {/* Content */}
          <UniversalDetailContent
            config={config}
            data={data}
            activeTab={activeTab}
            language={language}
            t={t}
            direction={direction}
            loading={loading}
            onRowClick={handleNestedOpen}
            onRefresh={onRefresh}
          />
        </SheetContent>
      </Sheet>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent dir={direction} className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              {isArabic ? '⚠️ تنبيه' : '⚠️ Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {isArabic 
                ? 'لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟'
                : 'You have unsaved changes. Do you want to exit without saving?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={cn(
            "gap-2 sm:gap-2",
            isArabic && "flex-row-reverse"
          )}>
            <Button
              variant="outline"
              onClick={handleContinueEditing}
              className="flex-1"
            >
              {isArabic ? 'متابعة العمل' : 'Continue Editing'}
            </Button>
            <AlertDialogAction
              onClick={handleForceClose}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isArabic ? 'خروج بدون حفظ' : 'Exit Without Saving'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nested Sheets */}
      {enableNestedSheets && hasNestedSheets && (
        <NestedSheetManager
          sheets={nestedSheets}
          onClose={closeNestedSheet}
          language={language}
          t={t}
          direction={direction}
          onNestedOpen={handleNestedOpen}
        />
      )}
    </EditModeContext.Provider>
  );
}

// ===== Alternative: Sheet with external tabs (underline variant) =====
export function UniversalDetailSheetWithUnderlineTabs({
  isOpen,
  onClose,
  docType,
  data,
  config: providedConfig,
  onEdit,
  onRefresh,
  loading = false,
  enableNestedSheets = true,
}: UniversalDetailSheetProps) {
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isArabic = language === 'ar';

  const config = providedConfig || (docType ? getSheetConfig(docType) : null);
  const [activeTab, setActiveTab] = useState<string>('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const {
    sheets: nestedSheets,
    openNestedSheet,
    closeNestedSheet,
    closeAllNested,
    hasNestedSheets,
  } = useNestedSheets();

  useEffect(() => {
    if (config) {
      setActiveTab(config.defaultTab || config.tabs[0]?.id || '');
    }
  }, [config?.docType]);

  useEffect(() => {
    if (!isOpen) {
      closeAllNested();
      setIsEditing(false);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, closeAllNested]);

  const handleNestedOpen = useCallback((nestedConfig: NestedSheetConfig) => {
    if (enableNestedSheets) {
      openNestedSheet(nestedConfig);
    }
  }, [enableNestedSheets, openNestedSheet]);

  // Handle close attempt
  const handleCloseAttempt = useCallback(() => {
    if (isEditing || hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      closeAllNested();
      onClose();
    }
  }, [isEditing, hasUnsavedChanges, closeAllNested, onClose]);

  // Force close (after confirmation)
  const handleForceClose = useCallback(() => {
    setShowCloseConfirm(false);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    closeAllNested();
    onClose();
  }, [closeAllNested, onClose]);

  // Continue editing
  const handleContinueEditing = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  if (!config || !data) return null;

  const sheetWidth = config.width || 'lg';

  return (
    <EditModeContext.Provider value={{ isEditing, hasUnsavedChanges, setIsEditing, setHasUnsavedChanges }}>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleCloseAttempt()}>
        <SheetContent
          side={isRTL ? 'left' : 'right'}
          className={cn(
            'p-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden rounded-s-2xl shadow-2xl',
            SHEET_SIZE_CLASSES[sheetWidth],
            hasNestedSheets && '!w-[45%]'
          )}
        >
          {/* Header */}
          <UniversalDetailHeader
            config={config}
            data={data}
            language={language}
            t={t}
            direction={direction}
            loading={loading}
            onClose={handleCloseAttempt}
            onEdit={onEdit}
            onRefresh={onRefresh}
          />

          {/* Tabs - below header with underline variant */}
          <UniversalDetailTabs
            tabs={config.tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            data={data}
            language={language}
            t={t}
            variant="underline"
          />

          {/* Content */}
          <UniversalDetailContent
            config={config}
            data={data}
            activeTab={activeTab}
            language={language}
            t={t}
            direction={direction}
            loading={loading}
            onRowClick={handleNestedOpen}
            onRefresh={onRefresh}
          />
        </SheetContent>
      </Sheet>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent dir={direction} className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              {isArabic ? '⚠️ تنبيه' : '⚠️ Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {isArabic 
                ? 'لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟'
                : 'You have unsaved changes. Do you want to exit without saving?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={cn(
            "gap-2 sm:gap-2",
            isArabic && "flex-row-reverse"
          )}>
            <Button
              variant="outline"
              onClick={handleContinueEditing}
              className="flex-1"
            >
              {isArabic ? 'متابعة العمل' : 'Continue Editing'}
            </Button>
            <AlertDialogAction
              onClick={handleForceClose}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isArabic ? 'خروج بدون حفظ' : 'Exit Without Saving'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {enableNestedSheets && hasNestedSheets && (
        <NestedSheetManager
          sheets={nestedSheets}
          onClose={closeNestedSheet}
          language={language}
          t={t}
          direction={direction}
          onNestedOpen={handleNestedOpen}
        />
      )}
    </EditModeContext.Provider>
  );
}

// ===== Preview Mode: Sheet content without overlay (for Component Lab) =====
export function UniversalDetailSheetPreview({
  docType,
  data,
  config: providedConfig,
  onEdit,
  onRefresh,
  loading = false,
  onClose,
  className,
}: {
  docType?: DocType;
  data: any;
  config?: SheetConfig;
  onEdit?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const { t, direction, language } = useLanguage();

  const config = providedConfig || (docType ? getSheetConfig(docType) : null);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    if (config) {
      setActiveTab(config.defaultTab || config.tabs[0]?.id || '');
    }
  }, [config?.docType, docType]);

  if (!config || !data) return null;

  return (
    <div className={cn(
      'h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden',
      className
    )}>
      {/* Header */}
      <UniversalDetailHeader
        config={config}
        data={data}
        language={language}
        t={t}
        direction={direction}
        loading={loading}
        onClose={onClose || (() => {})}
        onEdit={onEdit}
        onRefresh={onRefresh}
      />

      {/* Tabs - light gray background */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <UniversalDetailTabs
          tabs={config.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          data={data}
          language={language}
          t={t}
          variant="pills"
        />
      </div>

      {/* Content */}
      <UniversalDetailContent
        config={config}
        data={data}
        activeTab={activeTab}
        language={language}
        t={t}
        direction={direction}
        loading={loading}
        onRefresh={onRefresh}
      />
    </div>
  );
}

export default UniversalDetailSheet;
