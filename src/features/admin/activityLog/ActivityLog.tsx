/**
 * ActivityLog Page
 * صفحة سجل الأحداث الرئيسية
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Download,
  Shield,
  Activity,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';
import { useActivityLog } from './hooks/useActivityLog';
import { ActivityFilters } from './components/ActivityFilters';
import { ActivityTable } from './components/ActivityTable';
import { ActivityDetails } from './components/ActivityDetails';
import { AuditLog } from '@/services/systemService';
import { cn } from '@/lib/utils';

export function ActivityLog() {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const {
    logs,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    filters,
    entityTypes,
    actions,
    setFilters,
    setPage,
    refresh
  } = useActivityLog({ pageSize: 25 });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // فتح تفاصيل سجل
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  // إغلاق تفاصيل السجل
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedLog(null);
  };

  // تصدير السجلات (سيتم تفعيله لاحقاً)
  const handleExport = () => {
    // TODO: Implement export functionality
  };

  // إحصائيات سريعة
  const stats = {
    total: totalCount,
    today: logs.filter(l => {
      const today = new Date();
      const logDate = new Date(l.created_at);
      return logDate.toDateString() === today.toDateString();
    }).length,
    warnings: logs.filter(l => l.severity === 'warning').length,
    errors: logs.filter(l => l.severity === 'error' || l.severity === 'critical').length,
  };

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'سجل الأحداث' : 'Activity Log'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'تتبع جميع الأنشطة والتغييرات في النظام'
                : 'Track all activities and changes in the system'}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={handleExport} disabled={logs.length === 0}>
          <Download className="h-4 w-4 me-2" />
          {language === 'ar' ? 'تصدير' : 'Export'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الأحداث' : 'Total Events'}
                </p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'أحداث اليوم' : 'Today'}
                </p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تحذيرات' : 'Warnings'}
                </p>
                <p className="text-2xl font-bold">{stats.warnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'أخطاء' : 'Errors'}
                </p>
                <p className="text-2xl font-bold">{stats.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <ActivityFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refresh}
            entityTypes={entityTypes}
            actions={actions}
            loading={loading}
          />
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <ActivityTable
            logs={logs}
            loading={loading}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onViewDetails={handleViewDetails}
          />
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <ActivityDetails
        log={selectedLog}
        open={detailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  );
}

export default ActivityLog;
