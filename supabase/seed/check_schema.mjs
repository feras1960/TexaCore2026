/**
 * Check actual database schema
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const email = process.argv[2];
const password = process.argv[3];

async function main() {
  // Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }
  
  console.log('✅ Logged in\n');

  // Check fabric_colors structure
  console.log('📋 Checking fabric_colors columns...');
  const { data: colorData, error: colorError } = await supabase
    .from('fabric_colors')
    .select('*')
    .limit(1);
  
  if (colorError) {
    console.log('Error:', colorError.message);
  } else if (colorData && colorData.length > 0) {
    console.log('Columns:', Object.keys(colorData[0]).join(', '));
  } else {
    console.log('Table exists but empty');
    // Try to get column info by inserting a minimal record
    const { error: insertError } = await supabase
      .from('fabric_colors')
      .insert({ code: 'TEST', name_ar: 'تجربة' });
    
    if (insertError) {
      console.log('Insert error reveals structure:', insertError.message);
    }
  }

  // Check chart_of_accounts structure
  console.log('\n📋 Checking chart_of_accounts columns...');
  const { data: accData, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .limit(1);
  
  if (accError) {
    console.log('Error:', accError.message);
  } else if (accData && accData.length > 0) {
    console.log('Columns:', Object.keys(accData[0]).join(', '));
  } else {
    console.log('Table exists but empty');
  }

  // Check cash_accounts structure  
  console.log('\n📋 Checking cash_accounts columns...');
  const { data: cashData, error: cashError } = await supabase
    .from('cash_accounts')
    .select('*')
    .limit(1);
  
  if (cashError) {
    console.log('Error:', cashError.message);
  } else if (cashData && cashData.length > 0) {
    console.log('Columns:', Object.keys(cashData[0]).join(', '));
    console.log('Sample data:', JSON.stringify(cashData[0], null, 2));
  } else {
    console.log('Table exists but empty');
  }

  // Check warehouses structure
  console.log('\n📋 Checking warehouses columns...');
  const { data: whData, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .limit(1);
  
  if (whError) {
    console.log('Error:', whError.message);
  } else if (whData && whData.length > 0) {
    console.log('Columns:', Object.keys(whData[0]).join(', '));
  } else {
    console.log('Table exists but empty');
  }

  // List all tables by checking common ones
  console.log('\n📋 Checking all tables...');
  const tablesToCheck = [
    'tenants', 'companies', 'branches', 'user_profiles',
    'account_types', 'chart_of_accounts', 'cash_accounts',
    'journal_entries', 'journal_entry_lines',
    'customer_groups', 'customers', 'customer_addresses',
    'supplier_groups', 'suppliers',
    'units_of_measure', 'price_lists',
    'warehouses', 'warehouse_locations',
    'products', 'product_categories', 'product_variants',
    'fabric_groups', 'fabric_colors', 'fabric_materials', 'fabric_material_colors', 'fabric_rolls',
    'saas_plans', 'saas_subscriptions', 'saas_modules'
  ];

  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('id').limit(1);
    const exists = !error || !error.message.includes('Could not find');
    console.log(`   ${exists ? '✅' : '❌'} ${table}`);
  }

  await supabase.auth.signOut();
}

main().catch(console.error);
