import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@1.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, language } = await req.json()
    const apiKey = Deno.env.get("GOOGLE_AI_KEY")
    const genAI = new GoogleGenerativeAI(apiKey!)

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview-0514",
      systemInstruction: `أنت "نيكسا" (Nexa)، الوكيل الذكي لشركة "نيكست ريفوليوشن". 
      خبير في نظام Texa Core للأقمشة والمحاسبة بـ 9 لغات.
      تحدث الآن بلغة: ${language || 'العربية'}. 
      استخدم الأرقام الإنجليزية (1, 2, 3) دائماً.`
    })

    const result = await model.generateContent(message)
    const response = await result.response
    return new Response(JSON.stringify({ reply: response.text() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
