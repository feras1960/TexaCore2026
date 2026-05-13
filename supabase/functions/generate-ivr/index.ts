// ═══════════════════════════════════════════
// 🎤 IVR Voice Generator — ElevenLabs TTS
// Generates professional IVR greeting for Asterisk PBX
// ═══════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Arabic voice — Mazen Lawand
const VOICE_ID = 'rPNcQ53R703tTmtue1AT';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsKey) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { text, voice_id, stability, style } = await req.json();

    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: 'Text too short (min 10 chars)' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[IVR-Generator] Generating TTS: ${text.length} chars`);

    // Generate TTS
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id || VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: stability || 0.7,
          similarity_boost: 0.85,
          style: style || 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error(`[IVR-Generator] ElevenLabs error: ${ttsRes.status}`, errText);
      return new Response(JSON.stringify({ error: `TTS failed: ${ttsRes.status}`, details: errText }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    console.log(`[IVR-Generator] ✅ Generated: ${(audioBuffer.byteLength / 1024).toFixed(0)}KB`);

    // Save to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, supabaseKey);

    const fileName = `ivr/texacore-greeting-${Date.now()}.mp3`;
    const { error: uploadErr } = await client.storage
      .from('ai-reports')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[IVR-Generator] Upload error:', uploadErr.message);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/ai-reports/${fileName}`;
    console.log(`[IVR-Generator] 📁 Saved to: ${publicUrl}`);

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      size_kb: Math.round(audioBuffer.byteLength / 1024),
      text_length: text.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[IVR-Generator] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
