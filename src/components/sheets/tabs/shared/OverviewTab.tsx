/**
 * OverviewTab - تبويب نظرة عامة مشترك
 * يعرض معلومات أساسية عن المستند
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Building2,
  Globe,
  CreditCard,
  Activity,
  Info,
} from 'lucide-react';
import { 
  type TabComponentProps,
  type InfoField,
  BADGE_VARIANT_CLASSES,
} from '../../configs/sheet.types';
import { getSheetConfig } from '../../configs';

// Info Field Icons Map
const FIELD_ICONS: Record<string, any> = {
  email: Mail,
  phone: Phone,
  address: MapPin,
  date: Calendar,
  user: User,
  company: Building2,
  country: Globe,
  payment: CreditCard,
  activity: Activity,
};

const resolveLabel = (label: string, _labelAr: string | undefined, t: (key: string) => string, _isArabic: boolean) => {
  // Always use translation system - label should be a translation key
  return t(label);
};

// Info Row Component
interface InfoRowProps {
  field: InfoField;
  data: any;
  language: string;
  t: (key: string) => string;
  onLinkClick?: (docType: string, id: string) => void;
}

function InfoRow({ field, data, language, t, onLinkClick }: InfoRowProps) {
  const isArabic = language === 'ar';
  const value = data[field.key];
  
  // Check if field should be hidden
  if (field.hidden && field.hidden(data)) return null;
  if (value === null || value === undefined) return null;

  const label = resolveLabel(field.label, field.labelAr, t, isArabic);
  const Icon = field.icon || FIELD_ICONS[field.type] || Info;

  // Format value based on type
  const renderValue = () => {
    // Custom format function
    if (field.format) {
      return field.format(value, data);
    }

    // Badge type
    if (field.type === 'badge' || field.badge) {
      const badgeConfig = field.badge ? field.badge(value, data) : {
        label: String(value),
        variant: 'default' as const,
      };
      if (!badgeConfig) return <span className="text-gray-400">-</span>;
      return (
        <Badge className={cn('text-xs', BADGE_VARIANT_CLASSES[badgeConfig.variant])}>
          {badgeConfig.label}
        </Badge>
      );
    }

    // Link type
    if (field.type === 'link' && field.link) {
      const linkConfig = field.link(value, data);
      if (linkConfig && onLinkClick) {
        return (
          <button
            onClick={() => onLinkClick(linkConfig.docType, linkConfig.id)}
            className="text-erp-teal hover:text-erp-teal/80 hover:underline font-medium"
          >
            {value}
          </button>
        );
      }
    }

    // Type-based rendering
    switch (field.type) {
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-erp-teal hover:underline">
            {value}
          </a>
        );
      case 'phone':
        return (
          <a href={`tel:${value}`} className="font-mono text-erp-teal hover:underline">
            {value}
          </a>
        );
      case 'currency':
        return (
          <span className="font-mono font-medium">
            {Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            {field.currency && <span className="text-gray-500 ms-1">{field.currency}</span>}
          </span>
        );
      case 'percentage':
        return <span className="font-mono font-medium">{value}%</span>;
      case 'date':
        return (
          <span className="font-mono text-sm">
            {new Date(value).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
          </span>
        );
      case 'datetime':
        return (
          <span className="font-mono text-sm">
            {new Date(value).toLocaleString(isArabic ? 'ar-SA' : 'en-US')}
          </span>
        );
      case 'number':
        return <span className="font-mono">{Number(value).toLocaleString()}</span>;
      default:
        return <span className="font-medium">{String(value)}</span>;
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0',
      field.colSpan === 2 && 'col-span-2'
    )}>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="text-sm text-gray-900 dark:text-white">
        {renderValue()}
      </div>
    </div>
  );
}

// Section Card Component
interface SectionCardProps {
  title: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, icon: Icon, children, className }: SectionCardProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4', className)}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-erp-teal" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

export function OverviewTab({ data, docType, language, t, onRowClick }: TabComponentProps) {
  const isArabic = language === 'ar';
  const config = getSheetConfig(docType);

  if (!config) {
    return (
      <div className="p-4 text-center text-gray-500">
        {t('common.noData')}
      </div>
    );
  }

  // Group info fields
  const basicFields = config.infoFields.filter(f => !f.key.includes('_') || f.key === 'created_at');
  const additionalFields = config.infoFields.filter(f => f.key.includes('_') && f.key !== 'created_at');

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Basic Info Card */}
        <SectionCard 
          title={t('sheets.basicInformation')}
          icon={Info}
        >
          <div className="space-y-1">
            {basicFields.map((field) => (
              <InfoRow
                key={field.key}
                field={field}
                data={data}
                language={language}
                t={t}
                onLinkClick={onRowClick ? (dt, id) => onRowClick({ id } as any, dt as any) : undefined}
              />
            ))}
          </div>
        </SectionCard>

        {/* Additional Info Card */}
        {additionalFields.length > 0 && (
          <SectionCard 
            title={t('sheets.additionalInformation')}
            icon={Activity}
          >
            <div className="space-y-1">
              {additionalFields.map((field) => (
                <InfoRow
                  key={field.key}
                  field={field}
                  data={data}
                  language={language}
                  t={t}
                />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Stats Summary (if available) */}
        {config.stats && config.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {config.stats.slice(0, 4).map((stat) => {
              const StatIcon = stat.icon;
              const value = stat.value(data);
              const formattedValue = stat.format ? stat.format(value, data) : value;
              
              return (
                <div 
                  key={stat.key}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    {StatIcon && <StatIcon className="w-4 h-4" />}
                    <span>{resolveLabel(stat.label, stat.labelAr, t, isArabic)}</span>
                  </div>
                  <div className={cn(
                    'text-xl font-bold font-mono',
                    stat.color === 'green' && 'text-green-600 dark:text-green-400',
                    stat.color === 'red' && 'text-red-600 dark:text-red-400',
                    stat.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                    !stat.color && 'text-gray-900 dark:text-white'
                  )}>
                    {typeof formattedValue === 'number' 
                      ? formattedValue.toLocaleString('en-US')
                      : formattedValue}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default OverviewTab;
