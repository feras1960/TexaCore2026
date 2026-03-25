import { createContext, useContext } from 'react';
import { type UseNestedSheetsReturn } from '../configs/sheet.types';

export const NestedSheetContext = createContext<UseNestedSheetsReturn | null>(null);

export const useNestedSheetContext = () => {
    const context = useContext(NestedSheetContext);
    if (!context) {
        throw new Error('useNestedSheetContext must be used within a NestedSheetProvider (UniversalDetailSheet)');
    }
    return context;
};
