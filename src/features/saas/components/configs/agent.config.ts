/**
 * Agent Configuration - Placeholder
 * سيتم تطويره في المرحلة 2
 */

import React from 'react';
import { BaseSheetConfig, TabComponentProps } from '@/components/shared/sheets/types';
import { UserCheck, Info } from 'lucide-react';

const PlaceholderTab: React.FC<TabComponentProps> = () => {
  return React.createElement('div', { 
    className: 'p-4 text-center text-muted-foreground' 
  }, 'Coming soon');
};

export const getAgentConfig = (
  t: (key: string) => string,
  language: string,
  data: any
): BaseSheetConfig => {
  return {
    title: data.name || 'Agent',
    icon: UserCheck,
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
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
