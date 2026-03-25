/**
 * ActivityTable Component
 * جدول عرض سجل الأحداث
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { AuditLog } from '@/services/systemService';
import { entityTypeLabels, actionLabels, severityLabels } from './ActivityFilters';
import { cn } from '@/lib/utils';

interface ActivityTableProps {
  logs: AuditLog[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewDetails: (log: AuditLog) => void;
}

// أيقونات الإجراءات
const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-green-600" />,
  update: <Pencil className="h-4 w-4 text-blue-600" />,
  delete: <Trash2 className="h-4 w-4 text-red-600" />,
  login: <LogIn className="h-4 w-4 text-emerald-600" />,
  logout: <LogOut className="h-4 w-4 text-gray-600" />,
  import: <Upload className="h-4 w-4 text-purple-600" />,
  export: <Download className="h-4 w-4 text-indigo-600" />,
  status_change: <RotateCcw className="h-4 w-4 text-orange-600" />,
  permission_change: <Shield className="h-4 w-4 text-yellow-600" />,
  view: <Eye className="h-4 w-4 text-gray-500" />,
};

// ألوان مستويات الخطورة
const severityColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  critical: 'bg-red-200 text-red-800 border-red-300',
};

// أيقونات مستويات الخطورة
const severityIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
  critical: <XCircle className="h-3 w-3" />,
};

// ألوان الإجراءات للـ Badge
const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 border-green-200',
  update: 'bg-blue-100 text-blue-700 border-blue-200',
  delete: 'bg-red-100 text-red-700 border-red-200',
  login: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  logout: 'bg-gray-100 text-gray-700 border-gray-200',
  import: 'bg-purple-100 text-purple-700 border-purple-200',
  export: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  status_change: 'bg-orange-100 text-orange-700 border-orange-200',
  permission_change: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  view: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function ActivityTable({
  logs,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onViewDetails
}: ActivityTableProps) {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const locale = language === 'ar' ? ar : enUS;

  const totalPages = Math.ceil(totalCount / pageSize);

  // Loading skeleton
  if (loading && logs.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!loading && logs.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <Eye className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {language === 'ar' ? 'لا توجد سجلات' : 'No logs found'}
        </h3>
        <p className="text-muted-foreground">
          {language === 'ar' 
            ? 'لا توجد أحداث تطابق معايير البحث'
            : 'No events match your search criteria'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* الجدول */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">
                {language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}
              </TableHead>
              <TableHead className="w-[120px]">
                {language === 'ar' ? 'الإجراء' : 'Action'}
              </TableHead>
              <TableHead className="w-[150px]">
                {language === 'ar' ? 'نوع البيانات' : 'Entity Type'}
              </TableHead>
              <TableHead>
                {language === 'ar' ? 'الوصف' : 'Description'}
              </TableHead>
              <TableHead className="w-[100px]">
                {language === 'ar' ? 'الخطورة' : 'Severity'}
              </TableHead>
              <TableHead className="w-[80px] text-center">
                {language === 'ar' ? 'تفاصيل' : 'Details'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow 
                key={log.id} 
                className={cn(
                  "hover:bg-muted/30 cursor-pointer transition-colors",
                  log.severity === 'error' && "bg-red-50/50",
                  log.severity === 'critical' && "bg-red-100/50",
                  log.severity === 'warning' && "bg-yellow-50/50"
                )}
                onClick={() => onViewDetails(log)}
              >
                {/* التاريخ والوقت */}
                <TableCell className="font-mono text-sm">
                  <div className="space-y-1">
                    <div>{format(new Date(log.created_at), 'yyyy/MM/dd')}</div>
                    <div className="text-muted-foreground text-xs">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </div>
                  </div>
                </TableCell>

                {/* الإجراء */}
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "gap-1.5",
                      actionColors[log.action] || 'bg-gray-100'
                    )}
                  >
                    {actionIcons[log.action] || <Eye className="h-3 w-3" />}
                    {actionLabels[log.action]?.[language] || log.action}
                  </Badge>
                </TableCell>

                {/* نوع البيانات */}
                <TableCell className="text-sm">
                  {entityTypeLabels[log.entity_type]?.[language] || log.entity_type}
                </TableCell>

                {/* الوصف */}
                <TableCell>
                  <div className="max-w-[300px]">
                    <div className="font-medium truncate">
                      {log.entity_name || '-'}
                    </div>
                    {log.entity_id && (
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        ID: {log.entity_id.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* الخطورة */}
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "gap-1",
                      severityColors[log.severity] || 'bg-gray-100'
                    )}
                  >
                    {severityIcons[log.severity]}
                    {severityLabels[log.severity]?.[language] || log.severity}
                  </Badge>
                </TableCell>

                {/* زر التفاصيل */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(log);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {language === 'ar' 
            ? `عرض ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, totalCount)} من ${totalCount} سجل`
            : `Showing ${((currentPage - 1) * pageSize) + 1} - ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} entries`
          }
        </div>
        
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            {isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          {/* Page indicator */}
          <span className="px-3 text-sm">
            {language === 'ar' 
              ? `صفحة ${currentPage} من ${totalPages}`
              : `Page ${currentPage} of ${totalPages}`
            }
          </span>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            {isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ActivityTable;
