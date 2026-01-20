/**
 * Interface Mode Provider
 * مزود وضع الواجهة (لايت/احترافي)
 * 
 * Manages the interface mode switching between Lite and Professional views
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interface modes
export type InterfaceMode = 'lite' | 'professional';

// Feature flags based on interface mode
export interface ModeFeatures {
  // Tabs
  showAIAnalysisTab: boolean;
  showReservationsTab: boolean;
  showDocumentsTab: boolean;
  showNotesTab: boolean;
  
  // Actions
  showAdvancedActions: boolean;
  showBulkActions: boolean;
  showExportOptions: boolean;
  showKeyboardShortcuts: boolean;
  
  // Display
  showStatCards: boolean;
  showCharts: boolean;
  showDetailedInfo: boolean;
  showQRCode: boolean;
  
  // Editing
  showNoCodeEditor: boolean;
  showCustomFields: boolean;
  showTemplateEditor: boolean;
  
  // Navigation
  showQuickNavigation: boolean;
  showRecentDocuments: boolean;
  showFavorites: boolean;
}

// Default features for each mode
const LITE_FEATURES: ModeFeatures = {
  // Tabs
  showAIAnalysisTab: false,
  showReservationsTab: false,
  showDocumentsTab: true,
  showNotesTab: true,
  
  // Actions
  showAdvancedActions: false,
  showBulkActions: false,
  showExportOptions: false,
  showKeyboardShortcuts: false,
  
  // Display
  showStatCards: true,
  showCharts: false,
  showDetailedInfo: false,
  showQRCode: true,
  
  // Editing
  showNoCodeEditor: false,
  showCustomFields: false,
  showTemplateEditor: false,
  
  // Navigation
  showQuickNavigation: false,
  showRecentDocuments: true,
  showFavorites: true,
};

const PROFESSIONAL_FEATURES: ModeFeatures = {
  // Tabs
  showAIAnalysisTab: true,
  showReservationsTab: true,
  showDocumentsTab: true,
  showNotesTab: true,
  
  // Actions
  showAdvancedActions: true,
  showBulkActions: true,
  showExportOptions: true,
  showKeyboardShortcuts: true,
  
  // Display
  showStatCards: true,
  showCharts: true,
  showDetailedInfo: true,
  showQRCode: true,
  
  // Editing
  showNoCodeEditor: true,
  showCustomFields: true,
  showTemplateEditor: true,
  
  // Navigation
  showQuickNavigation: true,
  showRecentDocuments: true,
  showFavorites: true,
};

// Context type
interface InterfaceModeContextType {
  mode: InterfaceMode;
  setMode: (mode: InterfaceMode) => void;
  toggleMode: () => void;
  features: ModeFeatures;
  isLite: boolean;
  isProfessional: boolean;
  hasFeature: (feature: keyof ModeFeatures) => boolean;
}

// Create context
const InterfaceModeContext = createContext<InterfaceModeContextType | undefined>(undefined);

// Storage key
const STORAGE_KEY = 'erp-interface-mode';

// Provider props
interface InterfaceModeProviderProps {
  children: ReactNode;
  defaultMode?: InterfaceMode;
}

// Provider component
export function InterfaceModeProvider({
  children,
  defaultMode = 'professional',
}: InterfaceModeProviderProps) {
  // Initialize mode from localStorage or default
  const [mode, setModeState] = useState<InterfaceMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'lite' || stored === 'professional') {
        return stored;
      }
    }
    return defaultMode;
  });

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Set mode handler
  const setMode = (newMode: InterfaceMode) => {
    setModeState(newMode);
  };

  // Toggle mode handler
  const toggleMode = () => {
    setModeState(current => current === 'lite' ? 'professional' : 'lite');
  };

  // Get features for current mode
  const features = mode === 'lite' ? LITE_FEATURES : PROFESSIONAL_FEATURES;

  // Check if a specific feature is enabled
  const hasFeature = (feature: keyof ModeFeatures): boolean => {
    return features[feature];
  };

  // Context value
  const value: InterfaceModeContextType = {
    mode,
    setMode,
    toggleMode,
    features,
    isLite: mode === 'lite',
    isProfessional: mode === 'professional',
    hasFeature,
  };

  return (
    <InterfaceModeContext.Provider value={value}>
      {children}
    </InterfaceModeContext.Provider>
  );
}

// Hook to use interface mode
export function useInterfaceMode() {
  const context = useContext(InterfaceModeContext);
  if (context === undefined) {
    throw new Error('useInterfaceMode must be used within an InterfaceModeProvider');
  }
  return context;
}

// Note: ModeFeatures is already exported as an interface above
