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
    const {
      message,
      language,
      customer_name,
      customer_insights,
      chat_history,
      document_type,
    } = await req.json()

    const apiKey = Deno.env.get("GOOGLE_AI_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_AI_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // ═══ Build rich system prompt with customer context ═══
    const insightBlock = customer_insights ? `
## بيانات العميل الحقيقية:
- الاسم: ${customer_name || 'غير محدد'}
- إجمالي الطلبات: ${customer_insights.total_orders || 0}
- إجمالي الإيرادات: ${customer_insights.total_revenue?.toLocaleString() || 0}
- متوسط قيمة الطلب: ${customer_insights.avg_order_value?.toLocaleString() || 0}
- تاريخ آخر طلب: ${customer_insights.last_order_date || 'لا يوجد'}
- أيام منذ آخر طلب: ${customer_insights.days_since_last_order || 'غير معروف'}
- نسبة السداد: ${customer_insights.payment_rate || 0}%
- اتجاه الطلبات: ${customer_insights.order_trend || 'مستقر'}
- تصنيف العميل: ${customer_insights.customer_tier || 'جديد'}
- الرصيد المستحق: ${customer_insights.outstanding_balance?.toLocaleString() || 0}
- حد الائتمان: ${customer_insights.credit_limit?.toLocaleString() || 'غير محدد'}
- متوسط أيام السداد: ${customer_insights.avg_payment_days || 0}
- نسبة المرتجعات: ${customer_insights.return_rate || 0}%
- نوع المستند الحالي: ${document_type || 'طلب تجاري'}
` : '';

    const systemPrompt = `أنت "وكيل نيكسا" (NexaAgent) 🤖 — المساعد الذكي في نظام TexaCore ERP لإدارة تجارة الأقمشة.

## دورك:
- تحليل أداء العملاء وتقديم رؤى ذكية بناءً على البيانات الحقيقية
- اقتراح خصومات مناسبة مع تبرير واضح
- تحذير من مخاطر (تأخر سداد، اقتراب حد ائتمان)
- اقتراح فرص بيع متقاطع
- الإجابة على أي استفسار عن العميل

## قواعد الرد:
1. تحدث بلغة: ${language === 'ar' ? 'العربية' : language === 'uk' ? 'الأوكرانية' : language === 'ru' ? 'الروسية' : 'الإنجليزية'}
2. استخدم الأرقام الإنجليزية (1, 2, 3) دائماً
3. كن مختصراً ومباشراً — لا تزيد عن 200 كلمة
4. استخدم الإيموجي لتوضيح النقاط (📊 💰 ⚠️ ✅ 🏷️)
5. استخدم **bold** للأرقام والقيم المهمة
6. إذا سُئلت عن خصم، قدم نسبة محددة مع تبرير
7. إذا لم تكن لديك بيانات كافية، قل ذلك بصراحة
8. ركز على تقديم قيمة عملية للبائع

${insightBlock}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    })

    // ═══ Build chat history for context continuity ═══
    const history = (chat_history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(message)
    const response = await result.response

    return new Response(JSON.stringify({ response: response.text() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('NexaAgent error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
