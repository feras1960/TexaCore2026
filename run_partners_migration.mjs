import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://hovrblftpitndqfjxnxg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdnJibGZ0cGl0bmRxZmp4bnhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzgwNTc4NCwiZXhwIjoyMDUzMzgxNzg0fQ.sSderMND0OxpGRaXQh6Bh4bMqNpjYMOvtYZMBeMHZ3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🏢 تنفيذ migration الشركاء...\n');

    const sql = readFileSync('./supabase/migrations/20260301_partners_module.sql', 'utf-8');

    // Split into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let success = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt || stmt.startsWith('--')) continue;

        // Get first meaningful line for logging
        const firstLine = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--'))?.trim() || '';
        const shortDesc = firstLine.substring(0, 80);

        try {
            const { error } = await supabase.rpc('exec_sql', { sql_text: stmt + ';' });
            if (error) {
                // Try direct query for DDL
                const { error: error2 } = await supabase.from('_exec').select().limit(0);
                console.log(`⚠️  [${i + 1}] ${shortDesc}... — يتطلب psql`);
                errors++;
            } else {
                console.log(`✅ [${i + 1}] ${shortDesc}...`);
                success++;
            }
        } catch (e) {
            console.log(`⚠️  [${i + 1}] ${shortDesc}... — ${e.message?.substring(0, 50)}`);
            errors++;
        }
    }

    console.log(`\n📊 النتيجة: ${success} نجح، ${errors} يحتاج psql`);

    if (errors > 0) {
        console.log('\n⚠️  بعض الأوامر تحتاج تنفيذ عبر SQL Editor في Supabase Dashboard');
        console.log('📋 انسخ محتوى الملف: supabase/migrations/20260301_partners_module.sql');
        console.log('🔗 وألصقه في: https://supabase.com/dashboard → SQL Editor');
    }
}

runMigration().catch(console.error);
