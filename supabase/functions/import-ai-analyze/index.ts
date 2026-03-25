/**
 * Import AI Analyze Edge Function — V4 with Gemini AI
 * ════════════════════════════════════════════════════
 * تحليل بيانات الاستيراد باستخدام Google Gemini AI
 * مع AI Smart Mapping وتحذيرات ذكاء الأعمال
 * مع fallback للتحليل المحلي في حالة فشل AI
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIAnalysisRequest {
  job_id: string;
  entity_type: string;
  rows: Array<{
    row_number: number;
    data: Record<string, unknown>;
  }>;
  existing_data?: Array<Record<string, unknown>>;
}

interface AISuggestion {
  row_number: number;
  corrections: Array<{
    field: string;
    original: string;
    suggested: string;
    confidence: number;
    reason: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  potential_duplicates: Array<{
    existing_id: string;
    existing_name: string;
    similarity: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// Gemini AI Analysis
// ═══════════════════════════════════════════════════════════════

async function analyzeWithGemini(
  apiKey: string,
  entityType: string,
  rows: AIAnalysisRequest['rows'],
  existingRecords: Array<Record<string, unknown>>
): Promise<AISuggestion[]> {
  const entityLabel = entityType === 'customers' ? 'عملاء' :
    entityType === 'suppliers' ? 'موردين' : 'مواد/منتجات';

  const existingNames = existingRecords
    .map(r => `${r.code || ''}: ${r.name_ar || r.name || ''}`)
    .slice(0, 100)
    .join('\n');

  const rowsToAnalyze = rows.slice(0, 50);
  const rowsJson = JSON.stringify(rowsToAnalyze, null, 2);

  const prompt = `أنت محلل بيانات ERP محترف. قم بتحليل بيانات ${entityLabel} المُستوردة التالية واكشف:

1. **الأخطاء الإملائية** في الأسماء والعناوين والمدن (عربي/إنجليزي/تركي/روسي/أوكراني)
2. **التكرارات المحتملة** بمقارنة الأسماء مع السجلات الموجودة
3. **القيم الشاذة** (أسعار سالبة، أرصدة ضخمة غير منطقية، كميات سالبة)
4. **بيانات ناقصة مهمة** (هاتف/إيميل مفقود لعميل/مورد)
5. **أكواد مكررة** في البيانات المُستوردة نفسها
6. **تنسيق أرقام الهاتف** الخاطئ

## السجلات الموجودة في النظام:
${existingNames || 'لا توجد سجلات سابقة'}

## البيانات المُستوردة:
${rowsJson}

## تعليمات الإخراج:
أرجع JSON array فقط بدون أي نص إضافي. كل عنصر بالشكل:
{
  "row_number": <number>,
  "corrections": [{"field": "<field_name>", "original": "<original_value>", "suggested": "<corrected_value>", "confidence": <0-100>, "reason": "<explanation>"}],
  "warnings": [{"type": "<anomaly|incomplete|format|duplicate>", "message": "<arabic_message>", "severity": "<low|medium|high>"}],
  "potential_duplicates": [{"existing_id": "", "existing_name": "<name>", "similarity": <0-100>}]
}

أرجع فقط الصفوف التي تحتوي على مشاكل. إذا لم توجد مشاكل، أرجع مصفوفة فارغة [].
لا تُرجع الصفوف السليمة. أرجع JSON فقط بدون markdown أو backticks.`;

  // Direct REST API call to Gemini
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // استخراج JSON من الرد
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      return parsed as AISuggestion[];
    }
    return [];
  } catch (e) {
    console.error('Failed to parse Gemini response:', e, 'Raw:', cleanedText.slice(0, 500));
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// Local Analysis (Fallback)
// ═══════════════════════════════════════════════════════════════

function similarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1;

  const normalizeArabic = (s: string) => s
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ي]/g, 'ى')
    .replace(/\s+/g, ' ');

  const norm1 = normalizeArabic(str1);
  const norm2 = normalizeArabic(str2);
  if (norm1 === norm2) return 0.95;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

  const matrix: number[][] = [];
  for (let i = 0; i <= norm1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= norm2.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= norm1.length; i++) {
    for (let j = 1; j <= norm2.length; j++) {
      if (norm1[i - 1] === norm2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  const maxLen = Math.max(norm1.length, norm2.length);
  return 1 - matrix[norm1.length][norm2.length] / maxLen;
}

const SPELLING_CORRECTIONS: Record<string, string> = {
  'الرياظ': 'الرياض', 'جده': 'جدة', 'مكه': 'مكة',
  'المدينه': 'المدينة', 'القاهره': 'القاهرة',
  'الدمام': 'الدمام', 'الخبر': 'الخبر',
};

function analyzeRowLocal(
  row: AIAnalysisRequest['rows'][0],
  existingData: Array<Record<string, unknown>>,
  entityType: string
): AISuggestion {
  const corrections: AISuggestion['corrections'] = [];
  const warnings: AISuggestion['warnings'] = [];
  const potential_duplicates: AISuggestion['potential_duplicates'] = [];

  const nameField = row.data.name || row.data.name_ar;
  if (nameField && existingData.length > 0) {
    for (const existing of existingData) {
      const existingName = existing.name || existing.name_ar;
      if (existingName) {
        const sim = similarity(String(nameField), String(existingName));
        if (sim >= 0.7) {
          potential_duplicates.push({
            existing_id: String(existing.id || ''),
            existing_name: String(existingName),
            similarity: Math.round(sim * 100)
          });
        }
      }
    }
  }

  for (const [field, value] of Object.entries(row.data)) {
    if (typeof value !== 'string') continue;
    if (['city', 'address'].includes(field)) {
      for (const [wrong, correct] of Object.entries(SPELLING_CORRECTIONS)) {
        if (value.includes(wrong)) {
          corrections.push({
            field, original: value,
            suggested: value.replace(wrong, correct),
            confidence: 90,
            reason: `تصحيح إملائي: "${wrong}" → "${correct}"`
          });
        }
      }
    }
  }

  const price = Number(row.data.sale_price || row.data.price);
  if (!isNaN(price)) {
    if (price <= 0) warnings.push({ type: 'anomaly', message: 'السعر صفر أو سالب', severity: 'high' });
    else if (price < 1) warnings.push({ type: 'anomaly', message: 'السعر منخفض جداً', severity: 'medium' });
    else if (price > 1000000) warnings.push({ type: 'anomaly', message: 'السعر مرتفع جداً', severity: 'medium' });
  }

  const quantity = Number(row.data.opening_qty || row.data.quantity);
  if (!isNaN(quantity) && quantity < 0) warnings.push({ type: 'anomaly', message: 'الكمية سالبة', severity: 'high' });

  const balance = Number(row.data.opening_balance);
  if (!isNaN(balance) && Math.abs(balance) > 10000000) warnings.push({ type: 'anomaly', message: 'الرصيد الافتتاحي كبير جداً', severity: 'low' });

  if (entityType === 'customers' || entityType === 'suppliers') {
    if (!row.data.phone && !row.data.mobile && !row.data.email) {
      warnings.push({ type: 'incomplete', message: 'لا توجد معلومات اتصال (هاتف أو إيميل)', severity: 'low' });
    }
  }

  return { row_number: row.row_number, corrections, warnings, potential_duplicates };
}

// ═══════════════════════════════════════════════════════════════
// AI Smart Column Mapping
// ═══════════════════════════════════════════════════════════════

async function smartMapColumns(
  apiKey: string,
  fileHeaders: string[],
  sampleRows: Record<string, unknown>[],
  entityType: string,
  systemFields: Array<{ name: string; label_ar: string; label_en: string; required: boolean }>
): Promise<Array<{ file_column: string; system_field: string; confidence: number; reason: string }>> {
  const fieldsDesc = systemFields.map(f =>
    `- ${f.name} (${f.label_ar} / ${f.label_en})${f.required ? ' [مطلوب]' : ''}`
  ).join('\n');

  const sampleData = sampleRows.slice(0, 3).map((row, i) =>
    `صف ${i + 1}: ${JSON.stringify(row)}`
  ).join('\n');

  const prompt = `أنت خبير ERP. لديك ملف مُستورد وتريد مطابقة أعمدته مع حقول النظام.

## أعمدة الملف:
${fileHeaders.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

## عيّنة من البيانات:
${sampleData}

## حقول النظام المتاحة (${entityType}):
${fieldsDesc}

## التعليمات:
طابق كل عمود ملف مع الحقل الأنسب في النظام.
اعتبر:
- أسماء الأعمدة قد تكون بأي لغة (عربي، إنجليزي، تركي، روسي)
- انظر لمحتوى العيّنة لتحديد نوع البيانات
- "العميل" أو "الاسم" → name_ar
- "الرصيد" أو "Balance" → opening_balance
- "الكود" أو "رمز" → code
- أعمدة لا تطابق أي حقل → اتركها فارغة

## الإخراج:
أرجع JSON array فقط بدون أي نص:
[{"file_column": "اسم العمود", "system_field": "اسم_الحقل_أو_فارغ", "confidence": 0-100, "reason": "سبب المطابقة"}]

أرجع JSON فقط بدون markdown أو backticks.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    })
  });

  if (!response.ok) throw new Error(`Gemini API error ${response.status}`);
  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('Failed to parse smart map response');
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// Business Completeness Warnings
// ═══════════════════════════════════════════════════════════════

function generateBusinessWarnings(
  entityType: string,
  rows: Array<{ row_number: number; data: Record<string, unknown> }>
): { warnings: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; icon: string }>; stats: Record<string, number> } {
  const warnings: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; icon: string }> = [];
  const stats: Record<string, number> = {};

  if (entityType === 'customers' || entityType === 'suppliers') {
    const label = entityType === 'customers' ? 'عملاء' : 'موردين';
    const rowsWithBalance = rows.filter(r => {
      const bal = Number(r.data.opening_balance || r.data.balance || 0);
      return bal !== 0;
    });
    const rowsWithoutBalance = rows.length - rowsWithBalance.length;
    stats.with_balance = rowsWithBalance.length;
    stats.without_balance = rowsWithoutBalance;

    if (rowsWithoutBalance === rows.length) {
      warnings.push({
        type: 'no_opening_balance',
        message: `⚠️ جميع ${label} (${rows.length}) بدون أرصدة افتتاحية! لن يتم إنشاء قيد افتتاحي. إذا كان لديهم أرصدة سابقة، أضف عمود "الرصيد الافتتاحي" في الملف.`,
        severity: 'high',
        icon: '💰'
      });
    } else if (rowsWithoutBalance > 0) {
      warnings.push({
        type: 'partial_balance',
        message: `${rowsWithoutBalance} من ${rows.length} ${label} بدون رصيد افتتاحي. سيتم إنشاء قيد افتتاحي فقط لـ ${rowsWithBalance.length} ${label}.`,
        severity: 'medium',
        icon: '💰'
      });
    } else {
      warnings.push({
        type: 'balance_ok',
        message: `✅ جميع ${label} (${rows.length}) لديهم أرصدة افتتاحية. سيتم إنشاء قيد محاسبي تلقائياً.`,
        severity: 'low',
        icon: '✅'
      });
    }

    // Check contact info
    const noContact = rows.filter(r => !r.data.phone && !r.data.mobile && !r.data.email).length;
    if (noContact > 0) {
      warnings.push({
        type: 'no_contact',
        message: `${noContact} من ${rows.length} ${label} بدون أي معلومات اتصال (هاتف أو إيميل).`,
        severity: noContact === rows.length ? 'medium' : 'low',
        icon: '📱'
      });
    }
  }

  if (entityType === 'products') {
    // Sale price check
    const noPriceRows = rows.filter(r => !r.data.sale_price || Number(r.data.sale_price) === 0).length;
    stats.without_price = noPriceRows;
    if (noPriceRows === rows.length) {
      warnings.push({
        type: 'no_prices',
        message: `⚠️ جميع المواد (${rows.length}) بدون سعر بيع! لن تتمكن من إنشاء فواتير مبيعات. أضف عمود "سعر البيع" في الملف.`,
        severity: 'high',
        icon: '🏷️'
      });
    } else if (noPriceRows > 0) {
      warnings.push({
        type: 'partial_prices',
        message: `${noPriceRows} من ${rows.length} مادة بدون سعر بيع.`,
        severity: 'medium',
        icon: '🏷️'
      });
    }

    // Cost price check
    const noCostRows = rows.filter(r => !r.data.cost_price || Number(r.data.cost_price) === 0).length;
    stats.without_cost = noCostRows;
    if (noCostRows === rows.length) {
      warnings.push({
        type: 'no_cost',
        message: `⚠️ جميع المواد بدون سعر تكلفة! لن يتم حساب هامش الربح أو تقييم المخزون.`,
        severity: 'high',
        icon: '📊'
      });
    }

    // Opening quantity check
    const noQtyRows = rows.filter(r => !r.data.opening_qty || Number(r.data.opening_qty) === 0).length;
    stats.without_qty = noQtyRows;
    if (noQtyRows === rows.length) {
      warnings.push({
        type: 'no_quantities',
        message: `⚠️ جميع المواد بدون كميات افتتاحية! المخزون سيبدأ من صفر. إذا لديك مخزون حالي، أضف عمود "الكمية الافتتاحية".`,
        severity: 'high',
        icon: '📦'
      });
    } else if (noQtyRows > 0) {
      warnings.push({
        type: 'partial_qty',
        message: `${noQtyRows} من ${rows.length} مادة بدون كمية افتتاحية.`,
        severity: 'medium',
        icon: '📦'
      });
    }

    // Barcode check
    const noBarcodeRows = rows.filter(r => !r.data.barcode).length;
    if (noBarcodeRows > rows.length * 0.5) {
      warnings.push({
        type: 'no_barcode',
        message: `${noBarcodeRows} من ${rows.length} مادة بدون باركود. الباركود يسهّل البحث ونقاط البيع.`,
        severity: 'low',
        icon: '📋'
      });
    }
  }

  // General: check for codes
  const noCodeRows = rows.filter(r => !r.data.code).length;
  if (noCodeRows > 0) {
    warnings.push({
      type: 'auto_codes',
      message: `${noCodeRows} سجل بدون كود — سيتم توليد أكواد تلقائية.`,
      severity: 'low',
      icon: '🔢'
    });
  }

  return { warnings, stats };
}

// ═══════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const body = await req.json();
    const action = body.action || 'analyze';

    // ═══ ACTION: Smart Column Mapping ═══
    if (action === 'smart_map') {
      const { file_headers, sample_rows, entity_type, system_fields } = body;
      if (!file_headers || !entity_type || !system_fields) {
        throw new Error('Missing: file_headers, entity_type, system_fields');
      }

      const googleApiKey = Deno.env.get('GOOGLE_AI_KEY');
      let mappings: Array<{ file_column: string; system_field: string; confidence: number; reason: string }> = [];

      if (googleApiKey) {
        try {
          mappings = await smartMapColumns(googleApiKey, file_headers, sample_rows || [], entity_type, system_fields);
          console.log(`🤖 Smart mapping: ${mappings.filter(m => m.system_field).length}/${file_headers.length} mapped`);
        } catch (err) {
          console.warn('Smart mapping failed:', err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, mappings, method: mappings.length > 0 ? 'gemini' : 'none' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ═══ ACTION: Business Warnings ═══
    if (action === 'business_warnings') {
      const { entity_type, rows } = body;
      if (!entity_type || !rows) throw new Error('Missing: entity_type, rows');

      const { warnings, stats } = generateBusinessWarnings(entity_type, rows);
      return new Response(
        JSON.stringify({ success: true, warnings, stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ═══ ACTION: Full Analysis (default) ═══
    const { job_id, entity_type, rows, existing_data = [] }: AIAnalysisRequest = body;

    if (!job_id || !entity_type || !rows) {
      throw new Error('Missing required parameters');
    }

    // جلب السجلات الموجودة للمقارنة
    let existingRecords = existing_data;
    if (existingRecords.length === 0) {
      try {
        const tableName = entity_type === 'products' ? 'materials' : entity_type;
        const { data } = await supabase
          .from(tableName)
          .select('id, name_ar, code')
          .limit(1000);
        existingRecords = data || [];
      } catch (_) {
        existingRecords = [];
      }
    }

    let suggestions: AISuggestion[] = [];
    let analysisMethod = 'local';

    // ─── محاولة التحليل بالذكاء الاصطناعي (Gemini) ───
    const googleApiKey = Deno.env.get('GOOGLE_AI_KEY');
    if (googleApiKey) {
      try {
        console.log(`🤖 Starting Gemini AI analysis for ${rows.length} rows...`);
        const geminiResults = await analyzeWithGemini(googleApiKey, entity_type, rows, existingRecords);

        if (geminiResults.length > 0 || rows.length <= 5) {
          suggestions = geminiResults;
          analysisMethod = 'gemini';
          console.log(`✅ Gemini analysis complete: ${suggestions.length} rows with issues`);
        } else {
          console.log('⚠️ Gemini returned empty, supplementing with local analysis');
          throw new Error('Gemini returned empty - fallback');
        }
      } catch (aiErr) {
        console.warn('⚠️ Gemini AI failed, falling back to local:', aiErr);
        analysisMethod = 'local_fallback';
      }
    }

    // ─── Fallback: التحليل المحلي ───
    if (analysisMethod !== 'gemini') {
      for (const row of rows) {
        const suggestion = analyzeRowLocal(row, existingRecords, entity_type);
        if (suggestion.corrections.length > 0 ||
          suggestion.warnings.length > 0 ||
          suggestion.potential_duplicates.length > 0) {
          suggestions.push(suggestion);
        }
      }
    }

    // ─── تحذيرات ذكاء الأعمال ───
    const { warnings: businessWarnings, stats: businessStats } = generateBusinessWarnings(entity_type, rows);

    // ─── ملخص ───
    const summary = {
      total_corrections: suggestions.reduce((sum, s) => sum + s.corrections.length, 0),
      total_warnings: suggestions.reduce((sum, s) => sum + s.warnings.length, 0),
      potential_duplicates: suggestions.reduce((sum, s) => sum + s.potential_duplicates.length, 0),
      rows_with_issues: suggestions.length,
      analysis_method: analysisMethod,
      business_stats: businessStats,
    };

    console.log(`📊 Analysis summary (${analysisMethod}):`, JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        business_warnings: businessWarnings,
        summary,
        analysis_method: analysisMethod,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('AI Analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
