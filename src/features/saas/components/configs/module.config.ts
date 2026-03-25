/**
 * Module Configuration - Placeholder
 * سيتم تطويره في المرحلة 2
 */

import React from 'react';
import { BaseSheetConfig, TabComponentProps } from '@/components/shared/sheets/types';
import { Box, Info } from 'lucide-react';

const PlaceholderTab: React.FC<TabComponentProps> = () => {
  return React.createElement('div', { 
    className: 'p-4 text-center text-muted-foreground' 
  }, 'Coming soon');
};

export const getModuleConfig = (
  t: (key: string) => string,
  language: string,
  data: any
): BaseSheetConfig => {
  return {
    title: language === 'ar' ? data.name_ar : data.name_en || 'Module',
    icon: Box,
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
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
