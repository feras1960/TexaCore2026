import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { action, parameters } = payload

    console.log(`[AI Voice Webhook] Action called: ${action}`, parameters)

    // TODO: In production, verify ElevenLabs webhook signature to ensure security

    if (action === 'check_order_status') {
      const { phone_number } = parameters || {}
      
      // MOCK DATA for Demo (Replace with real Supabase query to ERP tables)
      return new Response(
        JSON.stringify({
          message: `طلبك الخاص برقم الجوال ${phone_number} قيد التوصيل وسيصلك اليوم الساعة الخامسة مساءً.`,
          status: "out_for_delivery"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_customer_balance') {
      const { customer_id } = parameters || {}
      
      // MOCK DATA for Demo
      return new Response(
        JSON.stringify({
          message: `رصيد حسابك الحالي هو خمسمائة دولار أمريكي.`,
          balance: 500
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error: any) {
    console.error("[AI Voice Webhook Error]", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
