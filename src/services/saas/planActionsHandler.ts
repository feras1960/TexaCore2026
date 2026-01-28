/**
 * Fixed Plan Actions Handler - بدون infinite loop
 * معالج إجراءات الباقات بدون تحديث تلقائي
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Plan } from '@/services/saas/plansService';

export interface PlanActionHandlers {
  onEdit?: (plan: Plan) => void;
  onRefresh?: () => void | Promise<void>;
}

/**
 * تفعيل الباقة
 */
export async function activatePlan(planId: string, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: true })
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم تفعيل الباقة بنجاح' : 'Plan activated successfully');
    
    // التحديث بعد تأخير صغير
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error activating plan:', error);
    toast.error(language === 'ar' ? 'فشل تفعيل الباقة' : 'Failed to activate plan');
    return false;
  }
}

/**
 * تعطيل الباقة
 */
export async function deactivatePlan(planId: string, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: false })
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم تعطيل الباقة بنجاح' : 'Plan deactivated successfully');
    
    // التحديث بعد تأخير صغير
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error deactivating plan:', error);
    toast.error(language === 'ar' ? 'فشل تعطيل الباقة' : 'Failed to deactivate plan');
    return false;
  }
}

/**
 * جعل الباقة مميزة
 */
export async function setAsPopular(planId: string, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    // إزالة علامة "مميز" من جميع الباقات الأخرى أولاً
    const { error: resetError } = await supabase
      .from('subscription_plans')
      .update({ is_popular: false })
      .neq('id', planId);

    if (resetError) throw resetError;

    // جعل الباقة الحالية مميزة
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_popular: true })
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم تعيين الباقة كمميزة' : 'Plan set as popular');
    
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error setting plan as popular:', error);
    toast.error(language === 'ar' ? 'فشل تعيين الباقة كمميزة' : 'Failed to set plan as popular');
    return false;
  }
}

/**
 * إزالة علامة "مميز" من الباقة
 */
export async function removePopular(planId: string, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_popular: false })
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم إزالة علامة "مميز"' : 'Removed popular status');
    
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error removing popular status:', error);
    toast.error(language === 'ar' ? 'فشل إزالة علامة "مميز"' : 'Failed to remove popular status');
    return false;
  }
}

/**
 * نسخ الباقة (تكرار)
 */
export async function duplicatePlan(plan: Plan, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    // إنشاء نسخة من الباقة مع تعديل الاسم والكود
    const newPlan = {
      ...plan,
      id: undefined, // سيتم توليد ID جديد
      code: `${plan.code}_copy_${Date.now()}`,
      name_en: `${plan.name_en} (Copy)`,
      name_ar: `${plan.name_ar} (نسخة)`,
      is_popular: false,
      is_active: false,
      created_at: undefined,
      updated_at: undefined,
    };

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([newPlan])
      .select()
      .single();

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم نسخ الباقة بنجاح' : 'Plan duplicated successfully');
    
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return data;
  } catch (error: any) {
    console.error('Error duplicating plan:', error);
    toast.error(language === 'ar' ? 'فشل نسخ الباقة' : 'Failed to duplicate plan');
    return null;
  }
}

/**
 * أرشفة الباقة
 */
export async function archivePlan(planId: string, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ 
        is_active: false,
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم أرشفة الباقة بنجاح' : 'Plan archived successfully');
    
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error archiving plan:', error);
    toast.error(language === 'ar' ? 'فشل أرشفة الباقة' : 'Failed to archive plan');
    return false;
  }
}

/**
 * حذف الباقة (حذف نهائي)
 */
export async function deletePlan(planId: string, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    // التحقق من عدم وجود اشتراكات نشطة
    const { data: subscriptions, error: checkError } = await supabase
      .from('tenant_subscriptions')
      .select('id')
      .eq('plan_id', planId)
      .eq('status', 'active')
      .limit(1);

    if (checkError) throw checkError;

    if (subscriptions && subscriptions.length > 0) {
      toast.error(
        language === 'ar' 
          ? 'لا يمكن حذف باقة لديها اشتراكات نشطة' 
          : 'Cannot delete plan with active subscriptions'
      );
      return false;
    }

    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم حذف الباقة بنجاح' : 'Plan deleted successfully');
    
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    toast.error(language === 'ar' ? 'فشل حذف الباقة' : 'Failed to delete plan');
    return false;
  }
}

/**
 * تحديث بيانات الباقة
 */
export async function updatePlan(planId: string, updates: Partial<Plan>, language: 'ar' | 'en', handlers?: PlanActionHandlers) {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', planId);

    if (error) throw error;

    toast.success(language === 'ar' ? 'تم تحديث الباقة بنجاح' : 'Plan updated successfully');
    
    if (handlers?.onRefresh) {
      setTimeout(() => {
        handlers.onRefresh?.();
      }, 300);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error updating plan:', error);
    toast.error(language === 'ar' ? 'فشل تحديث الباقة' : 'Failed to update plan');
    return false;
  }
}
