import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { widgetId, visitorNumber } = body;

    if (!widgetId || !visitorNumber) {
      return new Response(JSON.stringify({ error: 'widgetId and visitorNumber are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch widget config
    const { data: widget, error: widgetError } = await supabase
      .from('pbx_web_callbacks')
      .select('*')
      .eq('id', widgetId)
      .single();

    if (widgetError || !widget) {
      return new Response(JSON.stringify({ error: 'Widget not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!widget.is_active) {
      return new Response(JSON.stringify({ error: 'Widget is currently inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Validate Origin (Domain filtering)
    const origin = req.headers.get('origin') || req.headers.get('referer');
    if (widget.allowed_domains && widget.allowed_domains.length > 0) {
      let isAllowed = false;
      if (origin) {
        try {
          const originUrl = new URL(origin);
          isAllowed = widget.allowed_domains.some((d: string) => d.toLowerCase() === originUrl.hostname.toLowerCase());
        } catch(e) {
           isAllowed = false;
        }
      }
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Domain not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. Optional: Business Hours Validation (Simplistic approach)
    // In a real scenario, this would read from the company's business hours config
    const currentHour = new Date().getUTCHours() + 3; // roughly local time if Middle East
    const isOutofHours = currentHour < 8 || currentHour >= 18;

    const status = isOutofHours ? 'out_of_hours' : 'pending';

    // 4. Save Request to Database
    const { error: insertError } = await supabase
      .from('pbx_callback_requests')
      .insert({
        company_id: widget.company_id,
        callback_id: widget.id,
        visitor_number: visitorNumber,
        status: status,
        visitor_ip: req.headers.get('x-forwarded-for') || 'unknown'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (isOutofHours) {
       return new Response(JSON.stringify({ 
         success: true, 
         message: 'Out of office hours. We have received your request and will call you back during business hours.' 
       }), {
         status: 200,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }

    // 5. Trigger Asterisk (Simulated for now, would typically be via AMI or Webhook to your Asterisk Node proxy)
    // const asteriskProxyUrl = Deno.env.get('ASTERISK_PROXY_URL');
    // await fetch(`${asteriskProxyUrl}/originate`, { ... });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Request received. Calling you shortly!' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
