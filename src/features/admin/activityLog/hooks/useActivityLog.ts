/**
 * useActivityLog Hook
 * Hook لإدارة بيانات سجل الأحداث
 */

import { useState, useEffect, useCallback } from 'react';
import { systemService, AuditLog, AuditLogFilters } from '@/services/systemService';

interface UseActivityLogOptions {
  initialFilters?: AuditLogFilters;
  pageSize?: number;
}

interface UseActivityLogReturn {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: AuditLogFilters;
  entityTypes: string[];
  actions: string[];
  setFilters: (filters: AuditLogFilters) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  getLogDetails: (id: string) => Promise<AuditLog | null>;
}

export function useActivityLog(options: UseActivityLogOptions = {}): UseActivityLogReturn {
  const { initialFilters = {}, pageSize = 25 } = options;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);

  // جلب أنواع الكيانات والإجراءات
  const fetchMetadata = useCallback(async () => {
    try {
      const [types, acts] = await Promise.all([
        systemService.getAuditEntityTypes(),
        systemService.getAuditActions()
      ]);
      setEntityTypes(types);
      setActions(acts);
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  }, []);

  // جلب السجلات
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      const queryFilters: AuditLogFilters = {
        ...filters,
        limit: pageSize,
        offset
      };

      const [logsData, count] = await Promise.all([
        systemService.getAuditLogs(queryFilters),
        systemService.getAuditLogsCount(filters)
      ]);

      setLogs(logsData);
      setTotalCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب السجلات');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // جلب السجلات عند تغيير الفلاتر أو الصفحة
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  const handleSetFilters = useCallback((newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // تغيير الصفحة
  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // تحديث البيانات
  const refresh = useCallback(async () => {
    await fetchLogs();
  }, [fetchLogs]);

  // جلب تفاصيل سجل معين
  const getLogDetails = useCallback(async (id: string): Promise<AuditLog | null> => {
    return systemService.getAuditLogById(id);
  }, []);

  return {
    logs,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    filters,
    entityTypes,
    actions,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    refresh,
    getLogDetails
  };
}

export default useActivityLog;
