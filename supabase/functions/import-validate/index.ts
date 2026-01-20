/**
 * Import Validate Edge Function
 * =============================
 * التحقق من صحة بيانات الاستيراد
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  job_id: string;
  rows: Array<{
    row_number: number;
    data: Record<string, unknown>;
  }>;
  entity_definition: {
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      label_ar: string;
      label_en: string;
      max_length?: number;
      min?: number;
      max?: number;
      options?: string[];
    }>;
    required_fields: string[];
    unique_fields?: string[];
  };
}

interface ValidationError {
  field: string;
  error: string;
  error_key: string;
  value: unknown;
}

interface ValidationResult {
  row_number: number;
  status: 'valid' | 'invalid';
  errors: ValidationError[];
}

// Validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

function validateRow(
  data: Record<string, unknown>,
  fields: ValidationRequest['entity_definition']['fields'],
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = data[field.name];
    const isEmpty = value === undefined || value === null || value === '';

    // Required check
    if (requiredFields.includes(field.name) && isEmpty) {
      errors.push({
        field: field.name,
        error: `${field.label_ar} مطلوب`,
        error_key: 'required',
        value
      });
      continue;
    }

    if (isEmpty) continue;

    // Type-specific validation
    switch (field.type) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({
            field: field.name,
            error: `${field.label_ar} يجب أن يكون رقماً`,
            error_key: 'invalid_number',
            value
          });
        } else {
          if (field.min !== undefined && num < field.min) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} يجب أن يكون أكبر من ${field.min}`,
              error_key: 'min_value',
              value
            });
          }
          if (field.max !== undefined && num > field.max) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} يجب أن يكون أقل من ${field.max}`,
              error_key: 'max_value',
              value
            });
          }
        }
        break;

      case 'email':
        if (!PATTERNS.email.test(String(value))) {
          errors.push({
            field: field.name,
            error: `${field.label_ar} غير صالح`,
            error_key: 'invalid_email',
            value
          });
        }
        break;

      case 'phone':
        if (!PATTERNS.phone.test(String(value))) {
          errors.push({
            field: field.name,
            error: `${field.label_ar} غير صالح`,
            error_key: 'invalid_phone',
            value
          });
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(String(value))) {
          errors.push({
            field: field.name,
            error: `${field.label_ar} قيمة غير صالحة`,
            error_key: 'invalid_option',
            value
          });
        }
        break;

      case 'string':
      case 'text':
        if (field.max_length && String(value).length > field.max_length) {
          errors.push({
            field: field.name,
            error: `${field.label_ar} تجاوز الحد الأقصى (${field.max_length})`,
            error_key: 'max_length',
            value
          });
        }
        break;
    }
  }

  return errors;
}

function findDuplicates(
  rows: ValidationRequest['rows'],
  uniqueFields: string[]
): Map<number, number[]> {
  const duplicates = new Map<number, number[]>();
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    const key = uniqueFields
      .map(f => String(row.data[f] || '').toLowerCase().trim())
      .join('|');

    if (key && !uniqueFields.every(f => !row.data[f])) {
      if (seen.has(key)) {
        const originalIndex = seen.get(key)!;
        if (!duplicates.has(originalIndex)) {
          duplicates.set(originalIndex, []);
        }
        duplicates.get(originalIndex)!.push(row.row_number);
      } else {
        seen.set(key, row.row_number);
      }
    }
  });

  return duplicates;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get request body
    const { job_id, rows, entity_definition }: ValidationRequest = await req.json();

    if (!job_id || !rows || !entity_definition) {
      throw new Error('Missing required parameters');
    }

    // Update job status
    await supabase
      .from('import_jobs')
      .update({ status: 'validating', current_step: 'validation' })
      .eq('id', job_id);

    // Validate each row
    const results: ValidationResult[] = [];
    const { fields, required_fields, unique_fields } = entity_definition;

    // Find duplicates within the file
    const duplicates = unique_fields ? findDuplicates(rows, unique_fields) : new Map();

    for (const row of rows) {
      const errors = validateRow(row.data, fields, required_fields);
      
      // Add duplicate warning if applicable
      const duplicateOf = Array.from(duplicates.entries())
        .find(([, dupes]) => dupes.includes(row.row_number));
      
      if (duplicateOf) {
        errors.push({
          field: '_duplicate',
          error: `صف مكرر مع الصف ${duplicateOf[0]}`,
          error_key: 'duplicate',
          value: null
        });
      }

      results.push({
        row_number: row.row_number,
        status: errors.length > 0 ? 'invalid' : 'valid',
        errors
      });
    }

    // Calculate summary
    const validCount = results.filter(r => r.status === 'valid').length;
    const invalidCount = results.filter(r => r.status === 'invalid').length;
    
    // Group errors by field
    const errorsByField: Record<string, number> = {};
    results.forEach(r => {
      r.errors.forEach(e => {
        errorsByField[e.field] = (errorsByField[e.field] || 0) + 1;
      });
    });

    // Update job with validation summary
    await supabase
      .from('import_jobs')
      .update({
        status: 'ready',
        valid_rows: validCount,
        invalid_rows: invalidCount,
        validation_summary: {
          total_errors: results.reduce((sum, r) => sum + r.errors.length, 0),
          errors_by_field: errorsByField,
          duplicates_found: duplicates.size
        },
        validation_completed_at: new Date().toISOString()
      })
      .eq('id', job_id);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: rows.length,
          valid: validCount,
          invalid: invalidCount,
          errors_by_field: errorsByField
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
