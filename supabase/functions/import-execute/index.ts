/**
 * Import Execute Edge Function
 * =============================
 * تنفيذ عملية الاستيراد وحفظ البيانات
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportOptions {
  skip_invalid_rows: boolean;
  update_existing: boolean;
  use_ai_analysis: boolean;
  column_mappings: Record<string, string>;
}

interface ImportRequest {
  job_id: string;
  options: ImportOptions;
}

interface ImportResult {
  row_number: number;
  status: 'imported' | 'updated' | 'skipped' | 'failed';
  entity_id?: string;
  error?: string;
}

// Entity type to table mapping with field transformations
const ENTITY_CONFIG: Record<string, {
  table: string;
  codeField: string;
  transform?: (data: Record<string, unknown>) => Record<string, unknown>;
}> = {
  customers: {
    table: 'customers',
    codeField: 'code'
  },
  suppliers: {
    table: 'suppliers',
    codeField: 'code'
  },
  products: {
    table: 'products',
    codeField: 'code',
    transform: (data) => ({
      ...data,
      // Ensure numeric fields
      sale_price: Number(data.sale_price) || 0,
      cost_price: data.cost_price ? Number(data.cost_price) : null,
      opening_qty: data.opening_qty ? Number(data.opening_qty) : 0,
    })
  },
  chart_of_accounts: {
    table: 'chart_of_accounts',
    codeField: 'account_code',
    transform: (data) => ({
      ...data,
      // Map fields
      account_code: data.account_code,
      name: data.name_ar || data.name,
      account_type: data.account_type,
      parent_id: null, // Will be resolved later
      opening_balance: data.opening_balance ? Number(data.opening_balance) : 0,
      opening_balance_type: data.opening_balance_type || 'debit',
    })
  },
  journal_entries: {
    table: 'journal_entry_lines',
    codeField: 'reference',
    transform: (data) => ({
      ...data,
      debit_amount: Number(data.debit) || 0,
      credit_amount: Number(data.credit) || 0,
    })
  },
  inventory_movements: {
    table: 'inventory_movements',
    codeField: 'reference'
  }
};

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // User client for authentication
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Admin client for data operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { job_id, options }: ImportRequest = await req.json();

    if (!job_id) {
      throw new Error('Missing job_id');
    }

    // Get import job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error('Import job not found');
    }

    const entityConfig = ENTITY_CONFIG[job.entity_type];
    if (!entityConfig) {
      throw new Error(`Unsupported entity type: ${job.entity_type}`);
    }

    // Update job status
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'importing', 
        current_step: 'importing',
        import_started_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // Get rows to import
    const { data: rows, error: rowsError } = await supabase
      .from('import_rows')
      .select('*')
      .eq('job_id', job_id)
      .order('row_number', { ascending: true });

    if (rowsError) {
      throw new Error('Failed to fetch import rows');
    }

    const results: ImportResult[] = [];
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const row of rows || []) {
      // Skip invalid rows if option is enabled
      if (options.skip_invalid_rows && row.status === 'invalid') {
        results.push({
          row_number: row.row_number,
          status: 'skipped',
          error: 'Invalid row skipped'
        });
        skippedCount++;
        continue;
      }

      try {
        // Apply AI corrections if available
        let dataToImport = { ...row.mapped_data };
        if (options.use_ai_analysis && row.ai_suggestions?.corrections) {
          for (const correction of row.ai_suggestions.corrections) {
            dataToImport[correction.field] = correction.suggested;
          }
        }

        // Apply transformation if defined
        if (entityConfig.transform) {
          dataToImport = entityConfig.transform(dataToImport);
        }

        // Add tenant_id
        dataToImport.tenant_id = job.tenant_id;

        // Check for existing record if update is enabled
        let existingId = null;
        if (options.update_existing && entityConfig.codeField) {
          const codeValue = dataToImport[entityConfig.codeField];
          if (codeValue) {
            const { data: existing } = await supabaseAdmin
              .from(entityConfig.table)
              .select('id')
              .eq('tenant_id', job.tenant_id)
              .eq(entityConfig.codeField, codeValue)
              .single();
            
            existingId = existing?.id;
          }
        }

        let entityId: string;

        if (existingId) {
          // Update existing record
          const { data: updated, error: updateError } = await supabaseAdmin
            .from(entityConfig.table)
            .update(dataToImport)
            .eq('id', existingId)
            .select('id')
            .single();

          if (updateError) throw updateError;
          entityId = updated.id;
          
          results.push({
            row_number: row.row_number,
            status: 'updated',
            entity_id: entityId
          });
          updatedCount++;
        } else {
          // Insert new record
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from(entityConfig.table)
            .insert(dataToImport)
            .select('id')
            .single();

          if (insertError) throw insertError;
          entityId = inserted.id;
          
          results.push({
            row_number: row.row_number,
            status: 'imported',
            entity_id: entityId
          });
          importedCount++;
        }

        // Update row status
        await supabase
          .from('import_rows')
          .update({ 
            status: existingId ? 'imported' : 'imported',
            entity_id: entityId
          })
          .eq('id', row.id);

      } catch (error) {
        results.push({
          row_number: row.row_number,
          status: 'failed',
          error: error.message
        });
        failedCount++;

        // Update row status
        await supabase
          .from('import_rows')
          .update({ 
            status: 'failed',
            import_result: { error: error.message }
          })
          .eq('id', row.id);
      }
    }

    // Update job with final stats
    const finalStatus = failedCount === 0 ? 'completed' : 
                       (importedCount + updatedCount > 0 ? 'completed' : 'failed');

    await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        imported_rows: importedCount + updatedCount,
        skipped_rows: skippedCount,
        failed_rows: failedCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // Log to audit
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        tenant_id: job.tenant_id,
        user_id: user.id,
        action: 'import',
        table_name: entityConfig.table,
        description: `Imported ${importedCount} records, updated ${updatedCount}, skipped ${skippedCount}, failed ${failedCount}`,
        changes: { 
          entity_type: job.entity_type,
          file_name: job.file_name,
          results: { imported: importedCount, updated: updatedCount, skipped: skippedCount, failed: failedCount }
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: rows?.length || 0,
          imported: importedCount,
          updated: updatedCount,
          skipped: skippedCount,
          failed: failedCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Import execution error:', error);
    
    // Try to update job status to failed
    try {
      const authHeader = req.headers.get('Authorization')!;
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { job_id } = await req.json().catch(() => ({}));
      if (job_id) {
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
