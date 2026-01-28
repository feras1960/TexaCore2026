/**
 * Tenant Configuration - Placeholder
 * سيتم تطويره في المرحلة 2
 */

import React from 'react';
import { BaseSheetConfig, TabComponentProps } from '@/components/shared/sheets/types';
import { Users, Info } from 'lucide-react';

// Placeholder tabs
const PlaceholderTab: React.FC<TabComponentProps> = () => {
  return React.createElement('div', { 
    className: 'p-4 text-center text-muted-foreground' 
  }, 'Coming soon');
};

export const getTenantConfig = (
  t: (key: string) => string,
  language: string,
  data: any
): BaseSheetConfig => {
  return {
    title: data.name || 'Tenant',
    icon: Users,
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    stats: [],
    tabs: [
      {
        id: 'overview',
        label: t('common.overview'),
        icon: Info,
        component: PlaceholderTab,
      },
    ],
    defaultTab: 'overview',
    actions: [],
    width: 'lg',
  };
};
