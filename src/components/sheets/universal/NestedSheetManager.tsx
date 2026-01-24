/**
 * NestedSheetManager - إدارة الشيتات المتداخلة
 * يعرض الشيتات المتداخلة بجانب الشيت الرئيسي
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  MotionSheet,
  MotionSheetContent,
  SPRING_PRESETS,
} from '@/components/ui/motion-sheet';
import { UniversalDetailHeader } from './UniversalDetailHeader';
import { UniversalDetailTabs } from './UniversalDetailTabs';
import { UniversalDetailContent } from './UniversalDetailContent';
import { getSheetConfig } from '../configs';
import {
  type NestedSheetState,
  type NestedSheetConfig,
} from '../configs/sheet.types';

interface NestedSheetProps {
  sheet: NestedSheetState;
  onClose: (id: string) => void;
  language: string;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
  onNestedOpen?: (config: NestedSheetConfig) => void;
  isLast: boolean;
  totalSheets: number;
}

function NestedSheet({
  sheet,
  onClose,
  language,
  t,
  direction,
  onNestedOpen,
  isLast,
  totalSheets,
}: NestedSheetProps) {
  const [activeTab, setActiveTab] = useState<string>('');
  const isRTL = direction === 'rtl';

  // Get config
  const config = sheet.config || getSheetConfig(sheet.docType);

  // Set default tab
  useEffect(() => {
    if (config) {
      setActiveTab(config.defaultTab || config.tabs[0]?.id || '');
    }
  }, [config?.docType]);

  if (!config) return null;

  // Handle close - goes back to previous sheet
  const handleClose = () => {
    onClose(sheet.id);
  };

  // Calculate width based on level and total sheets
  const getWidth = () => {
    if (totalSheets === 1) return '!w-[45%]';
    if (totalSheets === 2) return isLast ? '!w-[45%]' : '!w-[35%]';
    return isLast ? '!w-[40%]' : '!w-[30%]';
  };

  // Calculate z-index based on level
  const zIndex = 10000 + sheet.level * 10;

  return (
    <MotionSheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <MotionSheetContent
        isOpen={true}
        side={isRTL ? 'left' : 'right'}
        springConfig={SPRING_PRESETS.snappy}
        className={cn(
          'p-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden',
          getWidth()
        )}
        style={{ zIndex }}
      >
        {/* Header with back button */}
        <UniversalDetailHeader
          config={config}
          data={sheet.data}
          language={language}
          t={t}
          direction={direction}
          onClose={handleClose}
          showBackButton={true}
          onBack={handleClose}
          level={sheet.level}
        />

        {/* Tabs */}
        <div className="bg-gradient-to-br from-erp-navy via-erp-navy to-slate-800 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 pb-4">
          <UniversalDetailTabs
            tabs={config.tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            data={sheet.data}
            language={language}
            t={t}
            variant="pills"
          />
        </div>

        {/* Content */}
        <UniversalDetailContent
          config={config}
          data={sheet.data}
          activeTab={activeTab}
          language={language}
          t={t}
          direction={direction}
          onRowClick={onNestedOpen ? 
            (nestedConfig) => onNestedOpen(nestedConfig) : 
            undefined
          }
        />
      </MotionSheetContent>
    </MotionSheet>
  );
}

interface NestedSheetManagerProps {
  sheets: NestedSheetState[];
  onClose: (id: string) => void;
  language: string;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
  onNestedOpen?: (config: NestedSheetConfig) => void;
}

export function NestedSheetManager({
  sheets,
  onClose,
  language,
  t,
  direction,
  onNestedOpen,
}: NestedSheetManagerProps) {
  if (sheets.length === 0) return null;

  return (
    <>
      {sheets.map((sheet, index) => (
        <NestedSheet
          key={sheet.id}
          sheet={sheet}
          onClose={onClose}
          language={language}
          t={t}
          direction={direction}
          onNestedOpen={onNestedOpen}
          isLast={index === sheets.length - 1}
          totalSheets={sheets.length}
        />
      ))}
    </>
  );
}

export default NestedSheetManager;
