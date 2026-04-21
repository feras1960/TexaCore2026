const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://wzkklenfsaepegymfxfz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI'
);
async function run() {
  const { data, error } = await sb.rpc('get_dashboard_kpis', { p_company_id: '0994137f-e5f5-42a9-a0a6-744e0ab0427f', p_base_currency: 'USD' });
  console.log(data);
}
run();
