import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const QUOTA_LIMIT = 5000; // 5000 chars per month per company

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
    const { text_content, voice_id, company_id } = await req.json();

    if (!text_content || !voice_id || !company_id) {
      throw new Error('Missing required fields: text_content, voice_id, company_id');
    }

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API Key is not configured on the server');
    }

    // Initialize Supabase Client with Auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Verify user belongs to the company
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: profileData, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .eq('company_id', company_id)
      .single();

    if (profileError || !profileData) {
      throw new Error('User does not have access to this company');
    }

    // 2. Check Quota Usage
    const currentMonth = new Date().toISOString().substring(0, 7); // e.g., '2026-05'
    
    // We need service_role to update/check usage across the system securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let { data: usageData, error: usageError } = await supabaseAdmin
      .from('pbx_ai_usage')
      .select('characters_used')
      .eq('company_id', company_id)
      .eq('year_month', currentMonth)
      .single();

    let currentUsage = usageData?.characters_used || 0;
    const incomingChars = text_content.length;

    if (currentUsage + incomingChars > QUOTA_LIMIT) {
      throw new Error(`Quota exceeded. You have ${QUOTA_LIMIT - currentUsage} characters remaining this month.`);
    }

    // 3. Call ElevenLabs API
    console.log(`Calling ElevenLabs for Voice: ${voice_id}, text length: ${incomingChars}`);
    
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text_content,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      throw new Error(`ElevenLabs Error: ${errorText}`);
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    // 4. Upload Audio to Supabase Storage
    const fileName = `${company_id}/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('pbx_media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio to storage: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('pbx_media')
      .getPublicUrl(fileName);

    const audioUrl = publicUrlData.publicUrl;

    // 5. Update Usage Quota
    if (usageData) {
      await supabaseAdmin
        .from('pbx_ai_usage')
        .update({ characters_used: currentUsage + incomingChars, updated_at: new Date().toISOString() })
        .eq('company_id', company_id)
        .eq('year_month', currentMonth);
    } else {
      await supabaseAdmin
        .from('pbx_ai_usage')
        .insert({
          company_id: company_id,
          year_month: currentMonth,
          characters_used: incomingChars
        });
    }

    // Return success
    return new Response(JSON.stringify({ 
      success: true, 
      audioUrl: audioUrl,
      charsUsed: incomingChars,
      charsRemaining: QUOTA_LIMIT - (currentUsage + incomingChars)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
