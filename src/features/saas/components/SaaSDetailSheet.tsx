/**
 * SaaS Detail Sheet - شيت موحد لجميع كيانات SaaS
 * 
 * يدعم 4 أنواع:
 * - plan: الباقات (6 تبويبات)
 * - tenant: المشتركين (6 تبويبات)
 * - agent: الوكلاء (5 تبويبات)
 * - module: الموديولات (4 تبويبات)
 */

import React from 'react';
import { BaseDetailSheet } from '@/components/shared/sheets/BaseDetailSheet';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getPlanConfig } from './configs/plan.config';
import { tenantConfig } from '@/components/sheets/configs/tenant.config';
import { getAgentConfig } from './configs/agent.config';
import { getModuleConfig } from './configs/module.config';

export type SaaSDocType = 'plan' | 'tenant' | 'agent' | 'module';

export interface SaaSDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  docType: SaaSDocType;
  data: any;
  onRefresh?: () => void;
  onEdit?: () => void;
  loading?: boolean;

  // ✨ Edit Mode Props
  editMode?: 'none' | 'toggle' | 'always';
  onSave?: (data: any) => Promise<void>;
  editable?: boolean;
}

export const SaaSDetailSheet: React.FC<SaaSDetailSheetProps> = ({
  isOpen,
  onClose,
  docType,
  data,
  onRefresh,
  onEdit,
  loading,
  editMode = 'none', // ✨ Default: no editing
  onSave,
  editable = true,
}) => {
  const { t, language } = useLanguage();

  // Get config based on docType
  const getConfig = () => {
    switch (docType) {
      case 'plan':
        return getPlanConfig(t, language, data);
      case 'tenant':
        return tenantConfig as any;
      case 'agent':
        return getAgentConfig(t, language, data);
      case 'module':
        return getModuleConfig(t, language, data);
      default:
        throw new Error(`Unknown docType: ${docType}`);
    }
  };

  const config = getConfig();

  return (
    <BaseDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      config={config}
      data={data}
      onRefresh={onRefresh}
      onEdit={onEdit}
      loading={loading}
      editMode={editMode}
      onSave={onSave}
      editable={editable}
      handlers={{
        onRefresh,
        onEdit,
      }}
    />
  );
};
