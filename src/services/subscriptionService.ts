/**
 * Subscription Service
 * خدمة إدارة الاشتراكات والتنبيهات
 * 
 * يدعم:
 * - التحقق من حالة الاشتراك
 * - إدارة التنبيهات
 * - قفل وفتح الاشتراك
 * - فترات السماح
 */

import { supabase, isSelfHosted } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// الأنواع والواجهات
// ═══════════════════════════════════════════════════════════════

export type SubscriptionStatus = 
  | 'trial' 
  | 'active' 
  | 'expired' 
  | 'grace_period' 
  | 'locked' 
  | 'cancelled';

export type AlertType = 
  | 'warning_30_days'
  | 'warning_7_days'
  | 'warning_3_days'
  | 'warning_1_day'
  | 'expired'
  | 'grace_period'
  | 'locked'
  | 'payment_reminder';

export type AccessLevel = 
  | 'full'      // وصول كامل
  | 'warning'   // وصول كامل مع تحذير
  | 'read_only' // قراءة فقط
  | 'locked';   // محظور تماماً

export interface Subscription {
  id: string;
  tenant_id: string;
  product_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  grace_period_days: number;
  locked_at?: string;
  lock_reason?: string;
  last_alert_type?: AlertType;
  last_alert_at?: string;
  payment_method?: string;
  billing_email?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  product_id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  max_users: number;
  max_companies: number;
  max_branches: number;
  storage_gb: number;
  price_monthly?: number;
  price_yearly?: number;
  currency: string;
  trial_days: number;
  features?: Record<string, any>;
}

export interface SubscriptionAlert {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  alert_type: AlertType;
  channels: string[];
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  acknowledged_at?: string;
  title?: string;
  message?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SubscriptionStatusInfo {
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
  daysRemaining: number;
  isExpired: boolean;
  isLocked: boolean;
  isInGracePeriod: boolean;
  graceDaysRemaining: number;
  accessLevel: AccessLevel;
  shouldShowWarning: boolean;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
  canAccessApp: boolean;
  redirectToBilling: boolean;
}

export interface BillingInfo {
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  tenant: {
    id: string;
    name: string;
    email: string;
  } | null;
  companies: Array<{
    id: string;
    name: string;
    is_main: boolean;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    paid_at?: string;
  }>;
  status: SubscriptionStatusInfo;
}

// ═══════════════════════════════════════════════════════════════
// خدمة الاشتراكات
// ═══════════════════════════════════════════════════════════════

export const subscriptionService = {
  /**
   * الحصول على حالة الاشتراك للمستأجر
   */
  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatusInfo> {
    // جلب الاشتراك النشط
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return {
        subscription: null,
        plan: null,
        status: 'locked',
        daysRemaining: 0,
        isExpired: true,
        isLocked: true,
        isInGracePeriod: false,
        graceDaysRemaining: 0,
        accessLevel: 'locked',
        shouldShowWarning: true,
        warningLevel: 'critical',
        canAccessApp: false,
        redirectToBilling: true,
      };
    }

    const plan = subscription.subscription_plans as SubscriptionPlan;
    const now = new Date();
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end) 
      : null;
    
    // حساب الأيام المتبقية
    const daysRemaining = periodEnd 
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const isExpired = daysRemaining < 0;
    const gracePeriodDays = subscription.grace_period_days || 7;
    
    // حساب أيام فترة السماح المتبقية
    const graceDaysRemaining = isExpired 
      ? gracePeriodDays + daysRemaining // daysRemaining سالب هنا
      : gracePeriodDays;
    
    const isInGracePeriod = isExpired && graceDaysRemaining > 0;
    const isLocked = !!subscription.locked_at || (isExpired && graceDaysRemaining <= 0);

    // تحديد مستوى الوصول
    let accessLevel: AccessLevel = 'full';
    let shouldShowWarning = false;
    let warningLevel: 'none' | 'info' | 'warning' | 'critical' = 'none';
    let canAccessApp = true;
    let redirectToBilling = false;

    if (isLocked) {
      accessLevel = 'locked';
      shouldShowWarning = true;
      warningLevel = 'critical';
      canAccessApp = false;
      redirectToBilling = true;
    } else if (isInGracePeriod) {
      accessLevel = 'read_only';
      shouldShowWarning = true;
      warningLevel = 'critical';
      canAccessApp = true;
    } else if (isExpired) {
      accessLevel = 'locked';
      shouldShowWarning = true;
      warningLevel = 'critical';
      canAccessApp = false;
      redirectToBilling = true;
    } else if (daysRemaining <= 3) {
      accessLevel = 'warning';
      shouldShowWarning = true;
      warningLevel = 'critical';
    } else if (daysRemaining <= 7) {
      accessLevel = 'warning';
      shouldShowWarning = true;
      warningLevel = 'warning';
    } else if (daysRemaining <= 30) {
      accessLevel = 'full';
      shouldShowWarning = true;
      warningLevel = 'info';
    }

    // تحديد الحالة
    let status: SubscriptionStatus = subscription.status as SubscriptionStatus;
    if (isLocked) {
      status = 'locked';
    } else if (isInGracePeriod) {
      status = 'grace_period';
    } else if (isExpired) {
      status = 'expired';
    }

    return {
      subscription: {
        ...subscription,
        subscription_plans: undefined,
      } as Subscription,
      plan,
      status,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired,
      isLocked,
      isInGracePeriod,
      graceDaysRemaining: Math.max(0, graceDaysRemaining),
      accessLevel,
      shouldShowWarning,
      warningLevel,
      canAccessApp,
      redirectToBilling,
    };
  },

  /**
   * التحقق من إمكانية الوصول للتطبيق
   */
  async checkAccess(tenantId: string): Promise<{
    allowed: boolean;
    accessLevel: AccessLevel;
    redirectTo?: string;
    message?: string;
  }> {
    const status = await this.getSubscriptionStatus(tenantId);

    if (!status.canAccessApp) {
      return {
        allowed: false,
        accessLevel: status.accessLevel,
        redirectTo: '/billing',
        message: status.isLocked 
          ? 'subscription.locked_message' 
          : 'subscription.expired_message',
      };
    }

    return {
      allowed: true,
      accessLevel: status.accessLevel,
    };
  },

  /**
   * الحصول على معلومات صفحة البيلنغ
   */
  async getBillingInfo(tenantId: string): Promise<BillingInfo> {
    // حالة الاشتراك
    const status = await this.getSubscriptionStatus(tenantId);

    // معلومات المستأجر
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, email')
      .eq('id', tenantId)
      .single();

    // الشركات
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, is_main')
      .eq('tenant_id', tenantId)
      .order('is_main', { ascending: false });

    // الفواتير (من جدول saas_payments إذا موجود)
    let invoices: any[] = [];
    if (!isSelfHosted) {
      const { data } = await supabase
        .from('saas_payments')
        .select('id, payment_number, amount, currency, status, created_at, paid_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);
      invoices = data || [];
    }

    return {
      subscription: status.subscription,
      plan: status.plan,
      tenant,
      companies: companies || [],
      invoices: (invoices || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.payment_number,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        created_at: inv.created_at,
        paid_at: inv.paid_at,
      })),
      status,
    };
  },

  /**
   * جلب التنبيهات غير المقروءة
   */
  async getUnreadAlerts(tenantId: string): Promise<SubscriptionAlert[]> {
    const { data, error } = await supabase
      .from('subscription_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Get unread alerts error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * تحديد التنبيه كمقروء
   */
  async markAlertAsRead(alertId: string): Promise<boolean> {
    const { error } = await supabase
      .from('subscription_alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('id', alertId);

    return !error;
  },

  /**
   * تأكيد رؤية التنبيه (acknowledged)
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const { error } = await supabase
      .from('subscription_alerts')
      .update({ 
        read_at: new Date().toISOString(),
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    return !error;
  },

  /**
   * إنشاء تنبيه جديد
   */
  async createAlert(
    tenantId: string,
    alertType: AlertType,
    options?: {
      subscriptionId?: string;
      title?: string;
      message?: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
      channels?: string[];
    }
  ): Promise<SubscriptionAlert | null> {
    const { data, error } = await supabase
      .from('subscription_alerts')
      .insert({
        tenant_id: tenantId,
        subscription_id: options?.subscriptionId,
        alert_type: alertType,
        channels: options?.channels || ['in_app'],
        title: options?.title,
        message: options?.message,
        action_url: options?.actionUrl || '/billing',
        metadata: options?.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Create alert error:', error);
      return null;
    }

    return data;
  },

  /**
   * قفل الاشتراك
   */
  async lockSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'locked',
        locked_at: new Date().toISOString(),
        lock_reason: reason || 'Payment overdue',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    return !error;
  },

  /**
   * فتح الاشتراك
   */
  async unlockSubscription(
    subscriptionId: string,
    newPeriodEnd?: Date
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      status: 'active',
      locked_at: null,
      lock_reason: null,
      updated_at: new Date().toISOString(),
    };

    if (newPeriodEnd) {
      updates.current_period_end = newPeriodEnd.toISOString();
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId);

    return !error;
  },

  /**
   * تجديد الاشتراك
   */
  async renewSubscription(
    subscriptionId: string,
    months: number = 1
  ): Promise<{ success: boolean; newEndDate?: Date; error?: string }> {
    // جلب الاشتراك الحالي
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return { success: false, error: 'subscription.not_found' };
    }

    // حساب تاريخ الانتهاء الجديد
    const currentEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end)
      : new Date();
    
    const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
    newEnd.setMonth(newEnd.getMonth() + months);

    // تحديث الاشتراك
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: newEnd.toISOString(),
        locked_at: null,
        lock_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) {
      return { success: false, error: 'subscription.update_failed' };
    }

    return { success: true, newEndDate: newEnd };
  },

  /**
   * الحصول على الباقات المتاحة
   */
  async getAvailablePlans(productId?: string): Promise<SubscriptionPlan[]> {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get plans error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * ترقية الباقة
   */
  async upgradePlan(
    subscriptionId: string,
    newPlanId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: newPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      return { success: false, error: 'subscription.upgrade_failed' };
    }

    return { success: true };
  },

  /**
   * الحصول على سجل تغييرات الحالة
   */
  async getStatusHistory(subscriptionId: string): Promise<Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    reason: string | null;
    created_at: string;
  }>> {
    const { data, error } = await supabase
      .from('subscription_status_history')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Get status history error:', error);
      return [];
    }

    return data || [];
  },
};

// التصدير الافتراضي
export default subscriptionService;
