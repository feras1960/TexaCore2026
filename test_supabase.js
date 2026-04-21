const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_number, entry_date, created_at')
    .eq('entry_date', '2026-04-18')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
