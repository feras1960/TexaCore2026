import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔄 Starting daily subscription check...')
    console.log('Time:', new Date().toISOString())

    // تشغيل فحص الاشتراكات المنتهية
    const { data, error } = await supabase
      .rpc('check_expired_subscriptions')

    if (error) {
      console.error('❌ Error checking subscriptions:', error)
      throw error
    }

    console.log('✅ Check completed successfully')
    console.log('Found expired/suspended subscriptions:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('Details:', data)
    }

    // إرجاع النتيجة
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        expired_count: data?.length || 0,
        data: data
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )

  } catch (error: any) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})
