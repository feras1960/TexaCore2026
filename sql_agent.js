const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_readonly_query', {
    p_query: "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'journal_entry_lines';"
  });
  console.log(data, error);
}
run();
