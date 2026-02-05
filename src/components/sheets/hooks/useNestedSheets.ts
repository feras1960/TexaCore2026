/**
 * useNestedSheets - Hook لإدارة الشيتات المتداخلة
 * يدير فتح وإغلاق الشيتات المتداخلة عند الضغط على صفوف الجداول
 */

import { useState, useCallback } from 'react';
import {
  type NestedSheetState,
  type NestedSheetConfig,
  type UseNestedSheetsReturn,
} from '../configs/sheet.types';
import { getSheetConfig } from '../configs';

// Simple UUID alternative if uuid not installed
const generateId = () => {
  return `nested-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function useNestedSheets(maxNestLevel: number = 5): UseNestedSheetsReturn {
  const [sheets, setSheets] = useState<NestedSheetState[]>([]);

  // Open a nested sheet
  const openNestedSheet = useCallback((config: NestedSheetConfig) => {
    setSheets(prev => {
      const currentLevel = prev.length;

      // Check max nesting level
      if (currentLevel >= maxNestLevel) {
        console.warn(`Max nesting level (${maxNestLevel}) reached`);
        return prev;
      }

      // Check if sheet with same data already exists
      const existingSheet = prev.find(
        s => s.docType === config.docType &&
          s.data?.id === config.data?.id
      );

      if (existingSheet) {
        // Just focus the existing sheet (move to end)
        const filtered = prev.filter(s => s.id !== existingSheet.id);
        return [...filtered, existingSheet];
      }

      // Get config for the new sheet
      const sheetConfig = getSheetConfig(config.docType);

      // Create new nested sheet
      const newSheet: NestedSheetState = {
        id: config.id || generateId(),
        docType: config.docType,
        data: config.data,
        level: currentLevel + 1,
        config: sheetConfig || undefined,
      };

      return [...prev, newSheet];
    });
  }, [maxNestLevel]);

  // Close a specific nested sheet
  const closeNestedSheet = useCallback((id: string) => {
    setSheets(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;

      // Close this sheet and all sheets after it
      return prev.slice(0, index);
    });
  }, []);

  // Close all nested sheets
  const closeAllNested = useCallback(() => {
    setSheets([]);
  }, []);

  // Get the currently active (last) nested sheet
  const activeNestedSheet = sheets.length > 0 ? sheets[sheets.length - 1] : null;

  // Check if there are any nested sheets
  const hasNestedSheets = sheets.length > 0;

  return {
    sheets,
    openNestedSheet,
    closeNestedSheet,
    closeAllNested,
    activeNestedSheet,
    hasNestedSheets,
  };
}

export default useNestedSheets;
