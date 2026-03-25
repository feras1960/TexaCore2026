/**
 * Edge Function: Process Payment
 * ==============================
 * معالجة الدفعات بشكل آمن على الخادم
 * 
 * هذه الدالة تتعامل مع:
 * - تجديد الاشتراك
 * - معالجة المدفوعات
 * - تحديث حالة الاشتراك
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  action: 'renew' | 'upgrade' | 'cancel';
  subscription_id: string;
  plan_id?: string;
  months?: number;
  payment_method?: string;
  amount?: number;
}

interface PaymentResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // التحقق من وجود Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // إنشاء Supabase client مع JWT المستخدم
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Client للمستخدم (للتحقق من الصلاحيات)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Client بصلاحيات كاملة (للعمليات الحساسة)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // التحقق من المستخدم
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // قراءة البيانات
    const body: PaymentRequest = await req.json()
    const { action, subscription_id, plan_id, months = 1, payment_method, amount } = body

    // التحقق من البيانات المطلوبة
    if (!action || !subscription_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response: PaymentResponse

    switch (action) {
      case 'renew':
        response = await handleRenewal(supabaseAdmin, subscription_id, months, user.id)
        break

      case 'upgrade':
        if (!plan_id) {
          response = { success: false, error: 'Plan ID required for upgrade' }
        } else {
          response = await handleUpgrade(supabaseAdmin, subscription_id, plan_id, user.id)
        }
        break

      case 'cancel':
        response = await handleCancellation(supabaseAdmin, subscription_id, user.id)
        break

      default:
        response = { success: false, error: 'Invalid action' }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing payment:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * معالجة تجديد الاشتراك
 */
async function handleRenewal(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  months: number,
  userId: string
): Promise<PaymentResponse> {
  try {
    // الحصول على الاشتراك الحالي
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*), tenants(*)')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    // حساب التاريخ الجديد
    const currentEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end)
      : new Date()
    
    const newEnd = new Date(currentEnd)
    newEnd.setMonth(newEnd.getMonth() + months)

    // تحديث الاشتراك
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: newEnd.toISOString(),
        locked_at: null,
        lock_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      return { success: false, error: 'Failed to update subscription' }
    }

    // إنشاء سجل في جدول المدفوعات (إذا كان موجوداً)
    await supabase
      .from('saas_payments')
      .insert({
        tenant_id: subscription.tenant_id,
        subscription_id: subscriptionId,
        amount: (subscription.subscription_plans?.price_monthly || 0) * months,
        currency: subscription.subscription_plans?.currency || 'USD',
        status: 'completed',
        payment_method: 'manual',
        description: `Renewal for ${months} month(s)`,
        processed_by: userId
      })
      .then(() => {})
      .catch(() => {}) // تجاهل الخطأ إذا الجدول غير موجود

    // تسجيل في audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: subscription.tenant_id,
        user_id: userId,
        action: 'renew',
        entity_type: 'subscriptions',
        entity_id: subscriptionId,
        new_values: { months, new_period_end: newEnd.toISOString() },
        metadata: { source: 'edge_function' }
      })

    return {
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        subscription_id: subscriptionId,
        new_period_end: newEnd.toISOString(),
        months_added: months
      }
    }
  } catch (error) {
    console.error('Renewal error:', error)
    return { success: false, error: 'Renewal processing failed' }
  }
}

/**
 * معالجة ترقية الباقة
 */
async function handleUpgrade(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  newPlanId: string,
  userId: string
): Promise<PaymentResponse> {
  try {
    // الحصول على الاشتراك الحالي
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    // الحصول على الباقة الجديدة
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single()

    if (planError || !newPlan) {
      return { success: false, error: 'Plan not found' }
    }

    const oldPlanId = subscription.plan_id

    // تحديث الاشتراك
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: newPlanId,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      return { success: false, error: 'Failed to upgrade subscription' }
    }

    // تسجيل في audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: subscription.tenant_id,
        user_id: userId,
        action: 'upgrade',
        entity_type: 'subscriptions',
        entity_id: subscriptionId,
        old_values: { plan_id: oldPlanId },
        new_values: { plan_id: newPlanId },
        metadata: { source: 'edge_function' }
      })

    return {
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        subscription_id: subscriptionId,
        old_plan_id: oldPlanId,
        new_plan_id: newPlanId,
        new_plan_name: newPlan.name_ar || newPlan.name_en
      }
    }
  } catch (error) {
    console.error('Upgrade error:', error)
    return { success: false, error: 'Upgrade processing failed' }
  }
}

/**
 * معالجة إلغاء الاشتراك
 */
async function handleCancellation(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  userId: string
): Promise<PaymentResponse> {
  try {
    // الحصول على الاشتراك
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    // تحديث الاشتراك (الإلغاء في نهاية الفترة)
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      return { success: false, error: 'Failed to cancel subscription' }
    }

    // تسجيل في audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: subscription.tenant_id,
        user_id: userId,
        action: 'cancel',
        entity_type: 'subscriptions',
        entity_id: subscriptionId,
        metadata: { source: 'edge_function', cancel_at_period_end: true }
      })

    return {
      success: true,
      message: 'Subscription will be cancelled at the end of the current period',
      data: {
        subscription_id: subscriptionId,
        cancellation_date: subscription.current_period_end
      }
    }
  } catch (error) {
    console.error('Cancellation error:', error)
    return { success: false, error: 'Cancellation processing failed' }
  }
}
