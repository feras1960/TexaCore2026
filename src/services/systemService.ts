/**
 * System Service - خدمة النظام
 * =================================
 * خدمة للتفاعل مع دوال النظام الأساسية
 * - اختبارات فصل البيانات
 * - إحصائيات الـ tenant
 * - التحقق من حالة الاشتراك
 * - Audit Logs
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface TenantInfo {
  id: string;
  code: string;
  name: string;
  status: string;
  default_language: string;
  settings: Record<string, unknown>;
}

export interface TenantStatistics {
  companies: number;
  users: number;
  customers: number;
  suppliers: number;
  products: number;
  journal_entries: number;
  sales_invoices: number;
  documents: number;
  storage_used: number;
}

export interface SubscriptionAccess {
  access_level: 'full' | 'warning' | 'critical_warning' | 'expired' | 'locked' | 'denied';
  status?: string;
  days_remaining?: number;
  period_end?: string;
  plan_id?: string;
  reason?: string;
  locked_at?: string;
}

export interface IsolationTestResult {
  name: string;
  result: string;
  details: string;
}

export interface IsolationTestSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  status: 'PASSED' | 'WARNING' | 'FAILED';
}

export interface IsolationTestReport {
  summary: IsolationTestSummary;
  tests: IsolationTestResult[];
  timestamp: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// System Service
// ═══════════════════════════════════════════════════════════════

export const systemService = {
  /**
   * الحصول على معلومات الـ tenant الحالي
   */
  async getCurrentTenant(): Promise<TenantInfo | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_current_tenant');

      if (error) {
        console.error('Error getting current tenant:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCurrentTenant:', error);
      return null;
    }
  },

  /**
   * الحصول على إحصائيات الـ tenant
   */
  async getTenantStatistics(tenantId?: string): Promise<TenantStatistics | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_tenant_statistics', { p_tenant_id: tenantId || null });

      if (error) {
        console.error('Error getting tenant statistics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTenantStatistics:', error);
      return null;
    }
  },

  /**
   * التحقق من حالة الاشتراك والوصول
   */
  async checkSubscriptionAccess(tenantId?: string): Promise<SubscriptionAccess> {
    try {
      const { data, error } = await supabase
        .rpc('check_subscription_access', { p_tenant_id: tenantId || null });

      if (error) {
        console.error('Error checking subscription access:', error);
        return { access_level: 'denied', reason: error.message };
      }

      return data;
    } catch (error) {
      console.error('Error in checkSubscriptionAccess:', error);
      return { access_level: 'denied', reason: 'unknown_error' };
    }
  },

  /**
   * تشغيل اختبارات فصل البيانات
   */
  async runIsolationTests(): Promise<IsolationTestReport | null> {
    try {
      const { data, error } = await supabase
        .rpc('run_isolation_tests');

      if (error) {
        console.error('Error running isolation tests:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in runIsolationTests:', error);
      return null;
    }
  },

  /**
   * الحصول على سجلات Audit
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      if (filters.search) {
        query = query.or(`entity_name.ilike.%${filters.search}%,action.ilike.%${filters.search}%`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      return [];
    }
  },

  /**
   * الحصول على عدد سجلات Audit (للـ pagination)
   */
  async getAuditLogsCount(filters: Omit<AuditLogFilters, 'limit' | 'offset'> = {}): Promise<number> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true });

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      if (filters.search) {
        query = query.or(`entity_name.ilike.%${filters.search}%,action.ilike.%${filters.search}%`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error getting audit logs count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getAuditLogsCount:', error);
      return 0;
    }
  },

  /**
   * الحصول على قائمة أنواع الكيانات المتوفرة في السجل
   */
  async getAuditEntityTypes(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('entity_type')
        .not('entity_type', 'is', null);

      if (error) {
        console.error('Error getting entity types:', error);
        return [];
      }

      // استخراج القيم الفريدة
      const uniqueTypes = [...new Set(data?.map(d => d.entity_type).filter(Boolean))];
      return uniqueTypes.sort();
    } catch (error) {
      console.error('Error in getAuditEntityTypes:', error);
      return [];
    }
  },

  /**
   * الحصول على قائمة الإجراءات المتوفرة في السجل
   */
  async getAuditActions(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action')
        .not('action', 'is', null);

      if (error) {
        console.error('Error getting actions:', error);
        return [];
      }

      // استخراج القيم الفريدة
      const uniqueActions = [...new Set(data?.map(d => d.action).filter(Boolean))];
      return uniqueActions.sort();
    } catch (error) {
      console.error('Error in getAuditActions:', error);
      return [];
    }
  },

  /**
   * الحصول على سجل حدث معين مع تفاصيله
   */
  async getAuditLogById(id: string): Promise<AuditLog | null> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting audit log:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getAuditLogById:', error);
      return null;
    }
  },

  /**
   * تسجيل Audit Log يدوياً
   */
  async logAudit(
    action: string,
    entityType: string,
    entityId?: string,
    entityName?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    severity?: 'info' | 'warning' | 'error' | 'critical'
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('log_audit', {
          p_action: action,
          p_entity_type: entityType,
          p_entity_id: entityId || null,
          p_entity_name: entityName || null,
          p_old_values: oldValues || null,
          p_new_values: newValues || null,
          p_metadata: metadata || {},
          p_severity: severity || 'info'
        });

      if (error) {
        console.error('Error logging audit:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in logAudit:', error);
      return null;
    }
  },

  /**
   * تجديد الاشتراك
   */
  async renewSubscription(subscriptionId: string, months: number = 1): Promise<{
    success: boolean;
    new_period_end?: string;
    months_added?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('renew_subscription', {
          p_subscription_id: subscriptionId,
          p_months: months
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      console.error('Error in renewSubscription:', error);
      return { success: false, error: 'unknown_error' };
    }
  },

  /**
   * التحقق من صحة الإعدادات
   */
  async validateSystemConfig(): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // التحقق من tenant
      const tenant = await this.getCurrentTenant();
      if (!tenant) {
        issues.push('No tenant associated with current user');
      }

      // التحقق من الاشتراك
      const access = await this.checkSubscriptionAccess();
      if (access.access_level === 'denied') {
        issues.push('Subscription access denied');
      } else if (access.access_level === 'expired') {
        issues.push('Subscription expired');
      } else if (access.access_level === 'locked') {
        issues.push('Subscription locked');
      } else if (access.access_level === 'critical_warning') {
        warnings.push('Subscription expiring in 3 days or less');
      } else if (access.access_level === 'warning') {
        warnings.push('Subscription expiring in 7 days or less');
      }

      // تشغيل اختبارات العزل
      const testReport = await this.runIsolationTests();
      if (testReport) {
        if (testReport.summary.failed > 0) {
          issues.push(`${testReport.summary.failed} isolation tests failed`);
        }
        if (testReport.summary.warnings > 0) {
          warnings.push(`${testReport.summary.warnings} isolation test warnings`);
        }
      }

      return {
        valid: issues.length === 0,
        issues,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        issues: ['System validation failed: ' + (error as Error).message],
        warnings
      };
    }
  },

  /**
   * الحصول على معلومات النظام الشاملة
   */
  async getSystemInfo(): Promise<{
    tenant: TenantInfo | null;
    statistics: TenantStatistics | null;
    subscription: SubscriptionAccess;
    tests: IsolationTestReport | null;
  }> {
    const [tenant, statistics, subscription, tests] = await Promise.all([
      this.getCurrentTenant(),
      this.getTenantStatistics(),
      this.checkSubscriptionAccess(),
      this.runIsolationTests()
    ]);

    return {
      tenant,
      statistics,
      subscription,
      tests
    };
  }
};

export default systemService;
