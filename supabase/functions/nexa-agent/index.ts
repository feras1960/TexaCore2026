// ═══════════════════════════════════════════════════
// 🤖 NexaPro Agent V7 — Modular Architecture
// ═══════════════════════════════════════════════════
// Main handler only — logic split into:
//   • prompt-builder.ts — System prompt & business rules
//   • data-fetcher.ts  — Data fetching & caching
//   • sql-agent.ts     — SQL Agent & schema
// ═══════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { buildSystemPrompt, filterContextByRole } from "./prompt-builder.ts"
import { fetchCachedContext, fetchGeneralContext, fetchMaterialContext } from "./data-fetcher.ts"
import { loadSchema, buildSQLTools, buildSQLAgentPrompt, executeSQLAgentLoop } from "./sql-agent.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ═══ Model Selection ═══

function shouldUpgradeToPro(message: string): boolean {
  const patterns = [
    /تحليل (شامل|عميق|مفصل|كامل)/,
    /(قارن|مقارنة) بين/,
    /خطة (عمل|تطوير|تسويق)/,
    /توص(ية|يات) استراتيجية/,
    /(ربحية|هوامش الربح|التكلفة الواصلة).*تفصيل/,
    /تقرير (مالي|شامل)/,
    /comprehensive|detailed analysis|compare|strategy/i,
  ];
  return patterns.some(p => p.test(message));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      message, language = 'ar', context_type = 'general', context_id,
      context_data, chat_history = [], complexity = 'auto',
      company_id, stream = false, conversation_summary,
    } = await req.json()

    const apiKey = Deno.env.get("GOOGLE_AI_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_AI_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ═══ Fast Ping: keep-alive without hitting Gemini ═══
    if (message === 'ping') {
      return new Response(JSON.stringify({ response: 'pong', model_used: 'none', context_loaded: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ═══ Model Selection (3-Tier Strategy) ═══
    let selectedModel = 'gemini-3-flash-preview';
    let usedModel = 'flash';

    const simplePatterns = /^(مرحبا|اهلا|شكرا|hi|hello|كيف حالك|ما هو|شكراً|أهلاً|مرحباً|hey|thanks|thank you)$/i;
    if (complexity === 'flash-lite' || (complexity === 'auto' && simplePatterns.test(message.trim()))) {
      selectedModel = 'gemini-3.1-flash-lite-preview';
      usedModel = 'flash-lite';
    } else if (complexity === 'pro' || (complexity === 'auto' && shouldUpgradeToPro(message))) {
      selectedModel = 'gemini-3.1-pro-preview';
      usedModel = 'pro';
    }

    // ═══ Authentication ═══
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    let enrichedContext = context_data || {};
    let userRole = 'user';
    let resolvedCompanyId = '';
    let resolvedTenantId = '';
    let authenticatedUserId = '';

    // Authenticate user via JWT
    if (authHeader && supabaseUrl && supabaseAnonKey) {
      try {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          authenticatedUserId = user.id;
          userRole = user.user_metadata?.role || user.user_metadata?.system_role || 'user';
        }
      } catch { /* auth failed */ }
    }

    // Get actual role from DB (more reliable than JWT metadata)
    if (authenticatedUserId && supabaseUrl && serviceRoleKey) {
      try {
        const tempAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data: roleData } = await tempAdmin.from('user_role_assignments').select('role:roles(code)').eq('user_id', authenticatedUserId).limit(1).single();
        if (roleData?.role?.code) userRole = roleData.role.code;
      } catch { /* fallback to JWT role */ }
    }

    // Get company_id from profile
    const adminClient = (supabaseUrl && serviceRoleKey) ? createClient(supabaseUrl, serviceRoleKey) : null;
    if (authenticatedUserId && adminClient) {
      try {
        const { data: profile } = await adminClient.from('user_profiles').select('company_id, tenant_id').eq('id', authenticatedUserId).single();
        if (profile) { resolvedCompanyId = profile.company_id || ''; resolvedTenantId = profile.tenant_id || ''; }
      } catch { /* profile not found */ }
    }

    // Fallback: verify client-sent company_id
    if (!resolvedCompanyId && company_id && adminClient) {
      try {
        const { data: comp } = await adminClient.from('companies').select('id, tenant_id').eq('id', company_id).single();
        if (comp) { resolvedCompanyId = company_id; resolvedTenantId = comp.tenant_id || resolvedTenantId; }
      } catch { /* invalid company_id */ }
    }

    if (!resolvedTenantId && resolvedCompanyId && adminClient) {
      try {
        const { data: comp } = await adminClient.from('companies').select('tenant_id').eq('id', resolvedCompanyId).single();
        if (comp?.tenant_id) resolvedTenantId = comp.tenant_id;
      } catch { /* ignore */ }
    }

    console.log('[NexaPro] 🔒', resolvedCompanyId ? `✅ company=${resolvedCompanyId}` : '❌ NO COMPANY', 'tenant:', resolvedTenantId || 'NONE', 'model:', usedModel);

    // ═══ Fetch Context ═══
    if (adminClient && resolvedCompanyId) {
      if (context_type === 'general') {
        enrichedContext = await fetchCachedContext(adminClient, resolvedCompanyId);
        if (enrichedContext) {
          console.log('[NexaPro] ⚡ Using CACHED context');
        } else {
          console.log('[NexaPro] Cache miss — full fetch...');
          enrichedContext = await fetchGeneralContext(adminClient, resolvedCompanyId);
        }
      } else if (context_type === 'material' && context_id) {
        enrichedContext = await fetchMaterialContext(adminClient, context_id, resolvedCompanyId);
      }
    }

    // Fallback: try user JWT if service role returned empty
    if ((!enrichedContext?.overview && context_type === 'general') || (!enrichedContext?.material && context_type === 'material')) {
      if (authHeader && supabaseUrl && supabaseAnonKey) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
        if (context_type === 'general' && resolvedCompanyId) {
          enrichedContext = await fetchGeneralContext(userClient, resolvedCompanyId);
        } else if (context_type === 'material' && context_id && resolvedCompanyId) {
          enrichedContext = await fetchMaterialContext(userClient, context_id, resolvedCompanyId);
        }
      }
    }

    // ═══ Location ═══
    let locationInfo: { country?: string; city?: string; countryCode?: string } = {};
    if (resolvedCompanyId && adminClient) {
      try {
        const { data: companyLoc } = await adminClient.from('companies').select('country, city, country_code').eq('id', resolvedCompanyId).single();
        if (companyLoc) locationInfo = { country: companyLoc.country, city: companyLoc.city, countryCode: companyLoc.country_code };
      } catch { /* ignore */ }
    }

    // ═══ 🔒 SECURITY: Filter context by user role BEFORE Gemini sees it ═══
    enrichedContext = filterContextByRole(enrichedContext, userRole);
    console.log('[NexaPro] 🔒 Context filtered for role:', userRole);

    // ═══ Build Prompt ═══
    const systemPrompt = buildSystemPrompt(context_type, enrichedContext, language, userRole, locationInfo);

    // ═══ Chat History ═══
    const contents: any[] = [];
    if (conversation_summary) {
      contents.push({ role: 'user', parts: [{ text: `[ملخص المحادثة السابقة - للسياق فقط]:\n${conversation_summary}` }] });
      contents.push({ role: 'model', parts: [{ text: 'فهمت. سأعتمد على هذا السياق في ردي.' }] });
    }
    for (const msg of chat_history) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // ═══ SQL Agent Setup ═══
    const schemaContext = adminClient ? await loadSchema(adminClient) : '';
    const tools = buildSQLTools(schemaContext);
    const sqlAgentPrompt = buildSQLAgentPrompt(schemaContext, resolvedCompanyId, resolvedTenantId, userRole);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    let geminiBody: any = {
      system_instruction: { parts: [{ text: systemPrompt + sqlAgentPrompt }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    };
    if (tools) geminiBody.tools = tools;

    // ═══ Execute SQL Agent Loop ═══
    const result = await executeSQLAgentLoop(adminClient!, geminiBody, contents, apiUrl, resolvedCompanyId, resolvedTenantId);
    let lastParsedResult = result.response;
    geminiBody = result.geminiBody;

    // ═══ Streaming Mode ═══
    if (stream) {
      const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const streamBody = { ...geminiBody }; delete streamBody.tools;
      const streamResponse = await fetch(streamUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(streamBody) });

      if (!streamResponse.ok || !streamResponse.body) {
        return new Response(JSON.stringify({ response: language === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Error. Try again.', model_used: usedModel, context_loaded: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const encoder = new TextEncoder(); const decoder = new TextDecoder(); const reader = streamResponse.body.getReader(); let buffer = '';
      const outputStream = new ReadableStream({
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) { controller.enqueue(encoder.encode(`data: {"done":true,"model_used":"${usedModel}"}\n\n`)); controller.close(); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n'); buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try { const json = JSON.parse(line.slice(6)); const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''; if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)); } catch { /* skip */ }
              }
            }
          } catch { controller.close(); }
        },
      });

      return new Response(outputStream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }

    // ═══ Non-Streaming: Handle API errors ═══
    if (!result.ok) {
      console.error('[NexaPro] Gemini API error, status:', result.status);
      // Try Flash-Lite fallback for ANY failed model
      console.log('[NexaPro] Trying Flash-Lite fallback...');
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
      const fallbackResponse = await fetch(fallbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 8192 } }) });
      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        const text = fallbackResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return new Response(JSON.stringify({ response: text, model_used: 'flash_fallback', context_loaded: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (!lastParsedResult) {
      console.error('[NexaPro] Gemini response missing after all attempts');
    }

    let responseText = lastParsedResult?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '';

    // ═══ Server-Side Retry: if Gemini returned empty, retry once internally (much faster than client retry) ═══
    if (!responseText) {
      console.warn('[NexaPro] ⚠️ Empty response. finishReason:', lastParsedResult?.candidates?.[0]?.finishReason, '— Retrying server-side...');
      try {
        // Retry with flash-lite and simplified prompt (most reliable)
        const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;
        const retryBody = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
        };
        const retryResp = await fetch(retryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(retryBody) });
        if (retryResp.ok) {
          const retryResult = await retryResp.json();
          responseText = retryResult?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '';
          if (responseText) {
            console.log('[NexaPro] ✅ Server-side retry succeeded!');
            usedModel = 'flash-lite-retry';
          }
        }
      } catch (retryErr) {
        console.warn('[NexaPro] Server-side retry failed:', retryErr);
      }
    }

    if (!responseText) {
      console.warn('[NexaPro] ⚠️ Empty response after server retry too.');
      responseText = language === 'ar' ? 'لم أتمكن من توليد رد الآن. حاول مرة أخرى أو أعد صياغة سؤالك. 🔄' : "I couldn't generate a response right now. Please try again. 🔄";
    }

    // ═══ 📝 Audit Log ═══
    if (adminClient && resolvedCompanyId && authenticatedUserId) {
      try {
        await adminClient.from('ai_audit_log').insert({
          user_id: authenticatedUserId,
          company_id: resolvedCompanyId,
          tenant_id: resolvedTenantId,
          user_role: userRole,
          message: message?.substring(0, 500),
          response_length: responseText?.length || 0,
          model_used: usedModel,
          context_type,
        });
      } catch { /* audit log failure should never block response */ }
    }

    return new Response(JSON.stringify({ response: responseText, model_used: usedModel === 'auto' ? 'flash' : usedModel, context_loaded: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[NexaPro] Error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
