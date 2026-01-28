// Shared Components - Single Entry Point
// All shared components MUST be imported from here

// Tables
export { NexaTable } from './tables/NexaTable';
export type { Column, NexaTableProps } from './tables/NexaTable';
export { NexaGrid } from './tables/NexaGrid';
export type { NexaGridColumn, NexaGridProps, NexaGridStats } from './tables/NexaGrid';
export { LedgerTable } from './tables/LedgerTable';
export type { LedgerColumn, LedgerFilters, LedgerStats, LedgerTableProps, QuickFilter } from './tables/LedgerTable';

// Popups
// UnifiedSheet REMOVED - use UniversalDetailSheet from '@/components/sheets' instead
export { UnifiedModal } from './modals/UnifiedModal';

// Status
export { StatusBadge, StatusBadgeWithArrow } from './status/StatusBadge';
export { StatusSelector } from './status/StatusSelector';
export { StatusManager } from './status/StatusManager';

// Stats
export { StatCard, StatsGrid } from './stats/StatCard';
export type { StatType } from './stats/StatCard';

// Tabs
export { MainTabsBar } from './tabs/MainTabsBar';
export { DynamicTabsBar, useDynamicTabs } from './tabs/DynamicTabs';

// Actions
export { ActionButtonsBar } from './actions/ActionButtonsBar';
export { QuickActionsBar } from './actions/QuickActionsBar';

// Marker
export { ColorMarkerPalette, MARKER_COLORS, getMarkerBackgroundColor, getMarkerColor } from './ColorMarkerPalette';
export type { MarkerColorId, ColorMarkerPaletteProps } from './ColorMarkerPalette';
