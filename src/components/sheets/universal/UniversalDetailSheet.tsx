/**
 * UniversalDetailSheet - المكون الرئيسي للشيت الموحد
 * يجمع كل المكونات ويدير الحالة والتبويبات
 */

import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
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
import { NestedSheetTabBar } from './NestedSheetTabBar';
import { StackedNestedSheet } from './StackedNestedSheet';
import { useNestedSheets } from '../hooks/useNestedSheets';
import { NestedSheetManager } from './NestedSheetManager';
import { NestedSheetContext } from '../context/NestedSheetContext';
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
  setIsEditing: () => { },
  setHasUnsavedChanges: () => { },
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
  styleVariant?: 'classic' | 'swiss';
  disableAnimation?: boolean;

  // Nested sheet support
  enableNestedSheets?: boolean;

  // Prevent closing when clicking outside (useful for Component Lab)
  preventCloseOnOutsideClick?: boolean;
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
  styleVariant = 'classic',
  disableAnimation = false,
  enableNestedSheets = true,
  preventCloseOnOutsideClick = false,
}: UniversalDetailSheetProps) {
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isSwiss = styleVariant === 'swiss';

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

  // Track which sheet is currently viewed (null = main sheet)
  const [viewedSheetId, setViewedSheetId] = useState<string | null>(null);

  // Sync viewed sheet when new sheets open
  useEffect(() => {
    if (nestedSheets.length > 0) {
      // Automatically switch to the newly opened sheet
      setViewedSheetId(nestedSheets[nestedSheets.length - 1].id);
    } else {
      setViewedSheetId(null);
    }
  }, [nestedSheets.length]);

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
      setViewedSheetId(null);
    }
  }, [isOpen, closeAllNested]);

  // Handle nested sheet open
  const handleNestedOpen = useCallback((nestedConfig: NestedSheetConfig) => {
    if (enableNestedSheets) {
      openNestedSheet(nestedConfig);
      // Viewed ID update will happen in effect
    }
  }, [enableNestedSheets, openNestedSheet]);

  // Handle tab selection
  const handleTabSelect = (id: string | null) => {
    setViewedSheetId(id);
  };

  // Get current sheet to render
  const currentNestedSheet = viewedSheetId
    ? nestedSheets.find(s => s.id === viewedSheetId)
    : null;

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
      <NestedSheetContext.Provider value={{
        sheets: nestedSheets,
        openNestedSheet: handleNestedOpen, // Use the handler that checks enableNestedSheets
        closeNestedSheet,
        closeAllNested,
        hasNestedSheets,
        activeNestedSheet: nestedSheets[nestedSheets.length - 1]
      }}>
        {/* Main Sheet - استخدام Sheet العادي بدلاً من MotionSheet */}
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            if (!open && !preventCloseOnOutsideClick) {
              handleCloseAttempt();
            }
          }}
          modal={!preventCloseOnOutsideClick}
        >
          <SheetContent
            side={isRTL ? 'left' : 'right'}
            onInteractOutside={(e) => {
              if (preventCloseOnOutsideClick) {
                e.preventDefault();
              }
            }}
            className={cn(
              isSwiss
                ? 'p-0 bg-[#F7F7F7] dark:bg-[#111111] flex flex-col overflow-hidden border-l border-[#E5E5E5] dark:border-[#222222] rounded-none shadow-none h-[100dvh] min-h-[100dvh] max-h-[100dvh]'
                : 'p-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden rounded-s-2xl shadow-2xl h-[100dvh] min-h-[100dvh] max-h-[100dvh]',
              SHEET_SIZE_CLASSES[sheetWidth],
              // Reduce width when nested sheets are open NOT NEEDED ANYMORE as we use tabs
              // hasNestedSheets && '!w-[45%]'
            )}
          >
            {/* Hidden Title & Description for accessibility */}
            <SheetTitle className="sr-only">
              {typeof config.title === 'function' ? config.title(data) : config.title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t('common.details')}
            </SheetDescription>
            {/* Header */}
            {isSwiss ? (
              <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#111111]/95 backdrop-blur border-b border-[#E5E5E5] dark:border-[#222222]">
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
              </div>
            ) : (
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
            )}

            {/* Nested Sheet Tabs */}
            {enableNestedSheets && hasNestedSheets && (
              <NestedSheetTabBar
                sheets={nestedSheets}
                activeSheetId={viewedSheetId}
                onSelect={handleTabSelect}
                onClose={closeNestedSheet}
                language={language}
                t={t}
              />
            )}

            {/* Content Logic: Show Nested Sheet if active, otherwise show Main Tabs & Content */}
            {currentNestedSheet ? (
              <StackedNestedSheet
                sheet={currentNestedSheet}
                onClose={closeNestedSheet}
                language={language}
                t={t}
                direction={direction}
                onNestedOpen={handleNestedOpen}
              />
            ) : (
              <>
                {/* Tabs */}
                {isSwiss ? (
                  <div className="sticky top-[64px] z-20 bg-white dark:bg-[#111111] px-6">
                    <UniversalDetailTabs
                      tabs={config.tabs}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      data={data}
                      language={language}
                      t={t}
                      variant="underline"
                      styleVariant="swiss"
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-blue-950/50 dark:via-indigo-950/40 dark:to-blue-950/50 px-4 py-3 border-b border-blue-200/60 dark:border-blue-800/40 backdrop-blur-sm">
                    <UniversalDetailTabs
                      tabs={config.tabs}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      data={data}
                      language={language}
                      t={t}
                      variant="pills"
                      styleVariant="classic"
                    />
                  </div>
                )}

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
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Close Confirmation Dialog */}
        <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <AlertDialogContent dir={direction} className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">
                ⚠️ {t('dialogs.warning')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                {t('dialogs.unsavedChanges')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={cn(
              "gap-2 sm:gap-2",
              isRTL && "flex-row-reverse"
            )}>
              <Button
                variant="outline"
                onClick={handleContinueEditing}
                className="flex-1"
              >
                {t('dialogs.continueEditing')}
              </Button>
              <AlertDialogAction
                onClick={handleForceClose}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {t('dialogs.exitWithoutSaving')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


      </NestedSheetContext.Provider>
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
  styleVariant = 'classic',
  disableAnimation = false,
  enableNestedSheets = true,
}: UniversalDetailSheetProps) {
  const { t, direction, language } = useLanguage();
  const isRTL = direction === 'rtl';
  const isSwiss = styleVariant === 'swiss';

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
            isSwiss
              ? 'p-0 bg-[#F7F7F7] dark:bg-[#111111] flex flex-col overflow-hidden border-l border-[#E5E5E5] dark:border-[#222222] rounded-none shadow-none h-[100dvh] min-h-[100dvh] max-h-[100dvh]'
              : 'p-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden rounded-s-2xl shadow-2xl h-[100dvh] min-h-[100dvh] max-h-[100dvh]',
            SHEET_SIZE_CLASSES[sheetWidth],
            hasNestedSheets && '!w-[45%]'
          )}
        >
          {/* Hidden Title & Description for accessibility */}
          <SheetTitle className="sr-only">
            {typeof config.title === 'function' ? config.title(data) : config.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t('common.details')}
          </SheetDescription>
          {/* Header */}
          {isSwiss ? (
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#111111]/95 backdrop-blur border-b border-[#E5E5E5] dark:border-[#222222]">
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
            </div>
          ) : (
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
          )}

          {/* Tabs */}
          {isSwiss ? (
            <div className="sticky top-[64px] z-20 bg-white dark:bg-[#111111] px-6">
              <UniversalDetailTabs
                tabs={config.tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                data={data}
                language={language}
                t={t}
                variant="underline"
                styleVariant="swiss"
              />
            </div>
          ) : (
            <UniversalDetailTabs
              tabs={config.tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              data={data}
              language={language}
              t={t}
              variant="underline"
              styleVariant="classic"
            />
          )}

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
              ⚠️ {t('dialogs.warning')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {t('dialogs.unsavedChanges')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={cn(
            "gap-2 sm:gap-2",
            isRTL && "flex-row-reverse"
          )}>
            <Button
              variant="outline"
              onClick={handleContinueEditing}
              className="flex-1"
            >
              {t('dialogs.continueEditing')}
            </Button>
            <AlertDialogAction
              onClick={handleForceClose}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {t('dialogs.exitWithoutSaving')}
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
  styleVariant = 'classic',
}: {
  docType?: DocType;
  data: any;
  config?: SheetConfig;
  onEdit?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  onClose?: () => void;
  className?: string;
  styleVariant?: 'classic' | 'swiss';
}) {
  const { t, direction, language } = useLanguage();
  const isSwiss = styleVariant === 'swiss';

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
      isSwiss
        ? 'h-full bg-[#F7F7F7] dark:bg-[#111111] flex flex-col overflow-hidden'
        : 'h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden',
      className
    )}>
      {/* Header */}
      {isSwiss ? (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#111111]/95 backdrop-blur border-b border-[#E5E5E5] dark:border-[#222222]">
          <UniversalDetailHeader
            config={config}
            data={data}
            language={language}
            t={t}
            direction={direction}
            loading={loading}
            onClose={onClose || (() => { })}
            onEdit={onEdit}
            onRefresh={onRefresh}
          />
        </div>
      ) : (
        <UniversalDetailHeader
          config={config}
          data={data}
          language={language}
          t={t}
          direction={direction}
          loading={loading}
          onClose={onClose || (() => { })}
          onEdit={onEdit}
          onRefresh={onRefresh}
        />
      )}

      {/* Tabs */}
      {isSwiss ? (
        <div className="sticky top-[64px] z-20 bg-white dark:bg-[#111111] px-6">
          <UniversalDetailTabs
            tabs={config.tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            data={data}
            language={language}
            t={t}
            variant="underline"
            styleVariant="swiss"
          />
        </div>
      ) : (
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <UniversalDetailTabs
            tabs={config.tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            data={data}
            language={language}
            t={t}
            variant="pills"
            styleVariant="classic"
          />
        </div>
      )}

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
