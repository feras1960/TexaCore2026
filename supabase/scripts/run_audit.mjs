// Quick RLS Audit Script
// Run with: node supabase/scripts/run_audit.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzkklenfsaepegymfxfz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzA1OTI0MCwiZXhwIjoyMDUyNjM1MjQwfQ.service_role_placeholder';

console.log('🔍 بدء فحص RLS السريع...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    try {
        // Query 1: Summary
        const { data: summary, error: err1 } = await supabase.rpc('get_system_summary');

        if (err1) {
            console.log('⚠️ لا يمكن تشغيل RPC، جرب الاستعلام المباشر من Supabase Dashboard');
            console.log('\n📋 انسخ هذا الاستعلام وشغله في SQL Editor:\n');
            console.log(`
SELECT 
    '📊 ملخص النظام' as report,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers;
      `);
            return;
        }

        console.log('📊 النتائج:', summary);
    } catch (e) {
        console.log('❌ خطأ:', e.message);
    }
}

runAudit();
