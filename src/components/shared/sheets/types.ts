/**
 * Base Detail Sheet Types
 * أنواع البيانات للشيت الأساسي
 */

import { LucideIcon } from 'lucide-react';

// ===== Stat Card =====
export interface StatCard {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  format?: (value: number | string, data?: any) => string;
}

// ===== Tab Configuration =====
export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<TabComponentProps>;
  badge?: (data: any) => number | string | null;
}

export interface TabComponentProps {
  data: any;
  language: string;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
  onRefresh?: () => void;
}

// ===== Action Button =====
export interface ActionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary';
  show?: (data: any) => boolean;
  confirm?: {
    title: string;
    description: string;
  };
  onClick: (data: any, context?: ActionContext) => void | Promise<void>;
}

export interface ActionContext {
  language: string;
  t: (key: string) => string;
  handlers?: {
    onRefresh?: () => void;
    onEdit?: (data: any) => void;
  };
}

// ===== Sheet Configuration =====
export interface BaseSheetConfig {
  // Header
  title: string | ((data: any) => string);
  subtitle?: string | ((data: any) => string);
  icon: LucideIcon;
  iconBg: string;
  badge?: (data: any) => { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' } | null;
  
  // Stats
  stats: StatCard[];
  
  // Tabs
  tabs: TabConfig[];
  defaultTab: string;
  
  // Actions
  actions: ActionConfig[];
  
  // Size
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ===== Props =====
export interface BaseDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  config: BaseSheetConfig;
  data: any;
  onRefresh?: () => void;
  onEdit?: () => void;
  loading?: boolean;
  handlers?: {
    onRefresh?: () => void;
    onEdit?: (data: any) => void;
  };
}

// ===== Size Classes =====
export const SHEET_WIDTH_CLASSES = {
  sm: 'w-[400px]',
  md: 'w-[600px]',
  lg: 'w-[800px]',
  xl: 'w-[1000px]',
  full: 'w-[50vw] max-w-[50vw]',
} as const;

// ===== Color Classes =====
export const STAT_COLOR_CLASSES = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400',
} as const;
