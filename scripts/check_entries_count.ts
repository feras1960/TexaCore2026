
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking journal_entries...');

    // 1. Get Company ID
    const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .limit(1);

    if (companyError) {
        console.error('Error fetching companies:', companyError);
        return;
    }

    if (!companies || companies.length === 0) {
        console.log('No companies found.');
        return;
    }

    const companyId = companies[0].id;
    console.log(`Found company: ${companies[0].name} (${companyId})`);

    // 2. Count Entries
    const { count, error: countError } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

    if (countError) {
        console.error('Error counting entries:', countError);
    } else {
        console.log(`Total journal entries for this company: ${count}`);
    }

    // 3. Check Lines
    const { count: linesCount, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select('*', { count: 'exact', head: true });

    if (linesError) {
        console.error('Error counting lines:', linesError);
    } else {
        console.log(`Total journal entry lines: ${linesCount}`);
    }
}

checkData();
