/**
 * Select Entity Step - خطوة اختيار نوع البيانات
 */

import React from 'react';
import { useLanguage } from '@/hooks';
import { Card } from '@/components/ui/card';
import { Loader2, Users, Truck, Package, FileText, BookOpen, ArrowLeftRight } from 'lucide-react';
import type { EntityDefinition, EntityType } from '@/services/importService';

interface SelectEntityStepProps {
  entityDefinitions: EntityDefinition[];
  selectedType: EntityType | null;
  onSelect: (type: EntityType) => void;
  isLoading: boolean;
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  customers: <Users className="h-8 w-8" />,
  suppliers: <Truck className="h-8 w-8" />,
  products: <Package className="h-8 w-8" />,
  chart_of_accounts: <FileText className="h-8 w-8" />,
  journal_entries: <BookOpen className="h-8 w-8" />,
  inventory_movements: <ArrowLeftRight className="h-8 w-8" />,
};

export function SelectEntityStep({
  entityDefinitions,
  selectedType,
  onSelect,
  isLoading
}: SelectEntityStepProps) {
  const { t, language } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">
          {t('import.selectEntityType')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('import.selectEntityTypeDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entityDefinitions.map((entity) => (
          <Card
            key={entity.entity_type}
            className={`
              p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md
              ${selectedType === entity.entity_type ? 'border-primary bg-primary/5' : ''}
            `}
            onClick={() => onSelect(entity.entity_type)}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`
                p-3 rounded-full
                ${selectedType === entity.entity_type 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}>
                {ENTITY_ICONS[entity.entity_type] || <FileText className="h-8 w-8" />}
              </div>
              
              <div>
                <h4 className="font-medium">
                  {language === 'ar' ? entity.display_name_ar : entity.display_name_en}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {entity.fields.length} {t('import.fields')}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {entityDefinitions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t('import.noEntityTypes')}
        </div>
      )}
    </div>
  );
}
