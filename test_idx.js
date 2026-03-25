import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('MISSING ENV'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.rpc('execute_readonly_query', {
    p_query: "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'journal_entry_lines';"
  });
  console.log('INDEXES:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
}
run();
