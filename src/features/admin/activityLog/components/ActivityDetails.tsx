/**
 * ActivityDetails Component
 * عرض تفاصيل سجل حدث معين
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Upload,
  Download,
  RotateCcw,
  Shield,
  Eye,
  Clock,
  User,
  Database,
  Hash,
  FileText,
  ArrowRight,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AuditLog } from '@/services/systemService';
import { entityTypeLabels, actionLabels, severityLabels } from './ActivityFilters';
import { cn } from '@/lib/utils';

interface ActivityDetailsProps {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}

// أيقونات الإجراءات
const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-5 w-5 text-green-600" />,
  update: <Pencil className="h-5 w-5 text-blue-600" />,
  delete: <Trash2 className="h-5 w-5 text-red-600" />,
  login: <LogIn className="h-5 w-5 text-emerald-600" />,
  logout: <LogOut className="h-5 w-5 text-gray-600" />,
  import: <Upload className="h-5 w-5 text-purple-600" />,
  export: <Download className="h-5 w-5 text-indigo-600" />,
  status_change: <RotateCcw className="h-5 w-5 text-orange-600" />,
  permission_change: <Shield className="h-5 w-5 text-yellow-600" />,
  view: <Eye className="h-5 w-5 text-gray-500" />,
};

// ألوان مستويات الخطورة
const severityColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};

export function ActivityDetails({ log, open, onClose }: ActivityDetailsProps) {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  if (!log) return null;

  // عرض التغييرات
  const renderChanges = () => {
    if (!log.changes && !log.old_values && !log.new_values) {
      return (
        <p className="text-muted-foreground text-sm">
          {language === 'ar' ? 'لا توجد تغييرات مسجلة' : 'No changes recorded'}
        </p>
      );
    }

    // إذا كان هناك changes مباشرة
    if (log.changes && Object.keys(log.changes).length > 0) {
      return (
        <div className="space-y-2">
          {Object.entries(log.changes).map(([field, change]) => (
            <div key={field} className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-1">{field}</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600 line-through">
                  {JSON.stringify((change as any)?.old ?? '-')}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-green-600">
                  {JSON.stringify((change as any)?.new ?? '-')}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // مقارنة old_values و new_values
    const oldVals = log.old_values || {};
    const newVals = log.new_values || {};
    const allKeys = [...new Set([...Object.keys(oldVals), ...Object.keys(newVals)])];

    if (allKeys.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          {language === 'ar' ? 'لا توجد تغييرات مسجلة' : 'No changes recorded'}
        </p>
      );
    }

    const changedKeys = allKeys.filter(key => 
      JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key])
    );

    if (changedKeys.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          {language === 'ar' ? 'لا توجد تغييرات' : 'No changes detected'}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {changedKeys.map(key => (
          <div key={key} className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium text-sm mb-1">{key}</div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded line-through">
                {formatValue(oldVals[key])}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {formatValue(newVals[key])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // تنسيق القيمة للعرض
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side={isRTL ? 'left' : 'right'}
        className="w-full sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {actionIcons[log.action] || <Eye className="h-5 w-5" />}
            <span>
              {language === 'ar' ? 'تفاصيل الحدث' : 'Event Details'}
            </span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          <div className="space-y-6 pe-4">
            {/* معلومات أساسية */}
            <div className="space-y-4">
              {/* الإجراء والخطورة */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1.5 text-sm">
                  {actionIcons[log.action]}
                  {actionLabels[log.action]?.[language] || log.action}
                </Badge>
                <Badge className={cn("text-sm", severityColors[log.severity])}>
                  {severityLabels[log.severity]?.[language] || log.severity}
                </Badge>
              </div>

              {/* التاريخ والوقت */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">
                  {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', {
                    locale: language === 'ar' ? ar : undefined
                  })}
                </span>
              </div>
            </div>

            <Separator />

            {/* معلومات الكيان */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                {language === 'ar' ? 'معلومات البيانات' : 'Entity Information'}
              </h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'النوع:' : 'Type:'}
                  </span>
                  <p className="font-medium">
                    {entityTypeLabels[log.entity_type]?.[language] || log.entity_type}
                  </p>
                </div>

                {log.entity_name && (
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'الاسم:' : 'Name:'}
                    </span>
                    <p className="font-medium">{log.entity_name}</p>
                  </div>
                )}
              </div>

              {log.entity_id && (
                <div className="text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {language === 'ar' ? 'المعرّف:' : 'ID:'}
                  </span>
                  <p className="font-mono text-xs bg-muted/50 p-2 rounded mt-1 break-all">
                    {log.entity_id}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* التغييرات */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {language === 'ar' ? 'التغييرات' : 'Changes'}
              </h3>
              {renderChanges()}
            </div>

            {/* البيانات الوصفية */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium">
                    {language === 'ar' ? 'بيانات إضافية' : 'Metadata'}
                  </h3>
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-[200px]">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {/* معلومات المستخدم */}
            {log.user_id && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {language === 'ar' ? 'معلومات المستخدم' : 'User Information'}
                  </h3>
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'معرّف المستخدم:' : 'User ID:'}
                    </span>
                    <p className="font-mono text-xs bg-muted/50 p-2 rounded mt-1 break-all">
                      {log.user_id}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default ActivityDetails;
