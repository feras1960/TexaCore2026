/**
 * Import AI Analyze Edge Function — V3 with Gemini AI
 * ════════════════════════════════════════════════════
 * تحليل بيانات الاستيراد باستخدام Google Gemini AI
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

    const { job_id, entity_type, rows, existing_data = [] }: AIAnalysisRequest = await req.json();

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
          // Gemini returned results (or we have few rows, so empty is valid)
          suggestions = geminiResults;
          analysisMethod = 'gemini';
          console.log(`✅ Gemini analysis complete: ${suggestions.length} rows with issues`);
        } else {
          // Gemini returned empty for many rows - supplement with local analysis
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

    // ─── ملخص ───
    const summary = {
      total_corrections: suggestions.reduce((sum, s) => sum + s.corrections.length, 0),
      total_warnings: suggestions.reduce((sum, s) => sum + s.warnings.length, 0),
      potential_duplicates: suggestions.reduce((sum, s) => sum + s.potential_duplicates.length, 0),
      rows_with_issues: suggestions.length,
      analysis_method: analysisMethod,
    };

    console.log(`📊 Analysis summary (${analysisMethod}):`, JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
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
