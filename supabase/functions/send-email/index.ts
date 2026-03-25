import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function corsResponse(body: any, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            return corsResponse({ ok: false, error: 'RESEND_API_KEY not configured' }, 500)
        }

        const { to, subject, html } = await req.json()

        if (!to || !subject || !html) {
            return corsResponse({ ok: false, error: 'Missing: to, subject, html' })
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TexaCore ERP <notifications@texacore.ai>',
                to: [to],
                subject,
                html,
            }),
        })

        const result = await res.json()

        if (!res.ok) {
            console.error('[SendEmail] Error:', result)
            return corsResponse({ ok: false, error: result.message || 'Send failed' })
        }

        console.log(`[SendEmail] Sent to ${to}: ${result.id}`)
        return corsResponse({ ok: true, id: result.id })

    } catch (err) {
        console.error('[SendEmail] Error:', err)
        return corsResponse({ ok: false, error: 'Internal error' }, 500)
    }
})
