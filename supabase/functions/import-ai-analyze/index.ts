/**
 * Import AI Analyze Edge Function
 * ================================
 * تحليل بيانات الاستيراد باستخدام الذكاء الاصطناعي
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

// Simple string similarity function
function similarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  
  if (str1 === str2) return 1;
  
  // Normalize Arabic text
  const normalizeArabic = (s: string) => s
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ي]/g, 'ى')
    .replace(/\s+/g, ' ');
  
  const norm1 = normalizeArabic(str1);
  const norm2 = normalizeArabic(str2);
  
  if (norm1 === norm2) return 0.95;
  
  // Contains check
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.8;
  }
  
  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= norm1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= norm2.length; j++) {
    matrix[0][j] = j;
  }
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

// Common Arabic spelling corrections
const SPELLING_CORRECTIONS: Record<string, string> = {
  'الرياظ': 'الرياض',
  'جده': 'جدة',
  'مكه': 'مكة',
  'المدينه': 'المدينة',
  'القاهره': 'القاهرة',
  'كييف': 'كييف',
};

function analyzeRow(
  row: AIAnalysisRequest['rows'][0],
  existingData: Array<Record<string, unknown>>,
  entityType: string
): AISuggestion {
  const corrections: AISuggestion['corrections'] = [];
  const warnings: AISuggestion['warnings'] = [];
  const potential_duplicates: AISuggestion['potential_duplicates'] = [];
  
  // Check for potential duplicates
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
  
  // Check for spelling corrections in text fields
  for (const [field, value] of Object.entries(row.data)) {
    if (typeof value !== 'string') continue;
    
    // Check city/address fields for common misspellings
    if (['city', 'address'].includes(field)) {
      for (const [wrong, correct] of Object.entries(SPELLING_CORRECTIONS)) {
        if (value.includes(wrong)) {
          corrections.push({
            field,
            original: value,
            suggested: value.replace(wrong, correct),
            confidence: 90,
            reason: `تصحيح إملائي: "${wrong}" → "${correct}"`
          });
        }
      }
    }
  }
  
  // Check for anomalies in numeric fields
  const price = Number(row.data.sale_price || row.data.price);
  if (!isNaN(price)) {
    if (price <= 0) {
      warnings.push({
        type: 'anomaly',
        message: 'السعر صفر أو سالب',
        severity: 'high'
      });
    } else if (price < 1) {
      warnings.push({
        type: 'anomaly',
        message: 'السعر منخفض جداً (أقل من 1)',
        severity: 'medium'
      });
    } else if (price > 1000000) {
      warnings.push({
        type: 'anomaly',
        message: 'السعر مرتفع جداً (أكثر من مليون)',
        severity: 'medium'
      });
    }
  }
  
  const quantity = Number(row.data.opening_qty || row.data.quantity);
  if (!isNaN(quantity) && quantity < 0) {
    warnings.push({
      type: 'anomaly',
      message: 'الكمية سالبة',
      severity: 'high'
    });
  }
  
  const balance = Number(row.data.opening_balance);
  if (!isNaN(balance) && Math.abs(balance) > 10000000) {
    warnings.push({
      type: 'anomaly',
      message: 'الرصيد الافتتاحي كبير جداً',
      severity: 'low'
    });
  }
  
  // Check for missing optional but recommended fields
  if (entityType === 'customers' || entityType === 'suppliers') {
    if (!row.data.phone && !row.data.mobile && !row.data.email) {
      warnings.push({
        type: 'incomplete',
        message: 'لا توجد معلومات اتصال (هاتف أو إيميل)',
        severity: 'low'
      });
    }
  }
  
  return {
    row_number: row.row_number,
    corrections,
    warnings,
    potential_duplicates
  };
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get request body
    const { job_id, entity_type, rows, existing_data = [] }: AIAnalysisRequest = await req.json();

    if (!job_id || !entity_type || !rows) {
      throw new Error('Missing required parameters');
    }

    // Update job status
    await supabase
      .from('import_jobs')
      .update({ status: 'ai_analyzing', current_step: 'ai_analysis' })
      .eq('id', job_id);

    // If no existing data provided, try to fetch from database
    let existingRecords = existing_data;
    if (existingRecords.length === 0) {
      const { data } = await supabase
        .from(entity_type)
        .select('id, name, name_ar, code')
        .limit(1000);
      existingRecords = data || [];
    }

    // Analyze each row
    const suggestions: AISuggestion[] = [];
    
    for (const row of rows) {
      const suggestion = analyzeRow(row, existingRecords, entity_type);
      if (suggestion.corrections.length > 0 || 
          suggestion.warnings.length > 0 || 
          suggestion.potential_duplicates.length > 0) {
        suggestions.push(suggestion);
      }
    }

    // Calculate summary
    const summary = {
      total_corrections: suggestions.reduce((sum, s) => sum + s.corrections.length, 0),
      total_warnings: suggestions.reduce((sum, s) => sum + s.warnings.length, 0),
      potential_duplicates: suggestions.reduce((sum, s) => sum + s.potential_duplicates.length, 0),
      rows_with_issues: suggestions.length
    };

    // Update job with AI analysis summary
    await supabase
      .from('import_jobs')
      .update({
        status: 'ready',
        ai_analysis_summary: summary,
        ai_analysis_completed_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // Update import_rows with AI suggestions
    for (const suggestion of suggestions) {
      await supabase
        .from('import_rows')
        .update({ ai_suggestions: suggestion })
        .eq('job_id', job_id)
        .eq('row_number', suggestion.row_number);
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        summary
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
