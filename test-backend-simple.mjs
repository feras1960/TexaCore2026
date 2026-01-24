#!/usr/bin/env node

/**
 * 🧪 Backend Testing Script (Simple)
 * اختبار شامل لنظام التحكم في الموديولات والميزات
 * 
 * الاستخدام:
 * SUPABASE_URL=xxx SUPABASE_KEY=xxx node test-backend-simple.mjs
 * 
 * أو قم بتعديل المتغيرات في الأعلى
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// قراءة ملف .env
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

try {
  const envContent = readFileSync('.env', 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      SUPABASE_ANON_KEY = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

// التحقق من وجود القيم
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.log('URL:', SUPABASE_URL ? '✅' : '❌');
  console.log('Key:', SUPABASE_ANON_KEY ? '✅' : '❌');
  process.exit(1);
}

// عرض القيم المحملة
console.log('✅ Loaded URL:', SUPABASE_URL);
console.log('✅ Loaded Key:', SUPABASE_ANON_KEY.substring(0, 30) + '...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for console
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${c.green}✅ ${msg}${c.reset}`),
  error: (msg) => console.log(`${c.red}❌ ${msg}${c.reset}`),
  warning: (msg) => console.log(`${c.yellow}⚠️  ${msg}${c.reset}`),
  info: (msg) => console.log(`${c.blue}ℹ️  ${msg}${c.reset}`),
  title: (msg) => console.log(`\n${c.bright}${c.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${c.reset}\n`),
  section: (msg) => console.log(`\n${c.bright}${c.blue}## ${msg}${c.reset}`)
};

const results = { total: 0, passed: 0, failed: 0, tests: [] };

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    log.success(`${name} ${details}`);
  } else {
    results.failed++;
    log.error(`${name} ${details}`);
  }
  results.tests.push({ name, passed, details });
}

// ============================================
// Tests
// ============================================

async function testConnection() {
  log.section('Test 1: Connection');
  try {
    const { data, error } = await supabase.from('tenants').select('count').limit(1);
    if (error) throw error;
    recordTest('Connection', true, '- Connected!');
    return true;
  } catch (error) {
    recordTest('Connection', false, `- ${error.message}`);
    return false;
  }
}

async function testTables() {
  log.section('Test 2: Tables');
  const tables = ['module_features', 'plan_module_features', 'ui_tabs', 'plan_ui_tabs', 'system_languages', 'tenant_languages'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) throw error;
      recordTest(`Table: ${table}`, true);
    } catch (error) {
      recordTest(`Table: ${table}`, false, `- ${error.message}`);
    }
  }
}

async function testSystemLanguages() {
  log.section('Test 3: System Languages');
  try {
    const { data, error } = await supabase.from('system_languages').select('*').order('code');
    if (error) throw error;
    
    recordTest('System Languages', data.length === 9, `- ${data.length}/9 languages`);
    
    console.log('\n📋 Languages:');
    data.forEach(l => console.log(`   ${l.icon} ${l.code}: ${l.name_ar} / ${l.name_en}`));
    
    return data;
  } catch (error) {
    recordTest('System Languages', false, `- ${error.message}`);
    return [];
  }
}

async function testModuleFeatures() {
  log.section('Test 4: Module Features');
  try {
    const { data, error } = await supabase.from('module_features').select('*').order('module_code');
    if (error) throw error;
    
    recordTest('Module Features', data.length > 0, `- ${data.length} features`);
    
    const byModule = data.reduce((acc, f) => {
      if (!acc[f.module_code]) acc[f.module_code] = [];
      acc[f.module_code].push(f);
      return acc;
    }, {});
    
    console.log('\n📋 Features by Module:');
    Object.entries(byModule).forEach(([mod, feats]) => {
      const core = feats.filter(f => f.is_core).length;
      console.log(`   ${mod}: ${feats.length} (${core} core, ${feats.length - core} premium)`);
    });
    
    return data;
  } catch (error) {
    recordTest('Module Features', false, `- ${error.message}`);
    return [];
  }
}

async function testUITabs() {
  log.section('Test 5: UI Tabs');
  try {
    const { data, error } = await supabase.from('ui_tabs').select('*').order('section_code');
    if (error) throw error;
    
    recordTest('UI Tabs', data.length > 0, `- ${data.length} tabs`);
    
    const bySection = data.reduce((acc, t) => {
      if (!acc[t.section_code]) acc[t.section_code] = [];
      acc[t.section_code].push(t);
      return acc;
    }, {});
    
    console.log('\n📋 Tabs by Section:');
    Object.entries(bySection).forEach(([sec, tabs]) => {
      const core = tabs.filter(t => t.is_core).length;
      console.log(`   ${sec}: ${tabs.length} (${core} core, ${tabs.length - core} premium)`);
    });
    
    return data;
  } catch (error) {
    recordTest('UI Tabs', false, `- ${error.message}`);
    return [];
  }
}

async function testFunctions() {
  log.section('Test 6: PostgreSQL Functions');
  
  // Get test tenant
  let tenantId = null;
  try {
    const { data } = await supabase.from('tenants').select('id, name').eq('status', 'active').limit(1);
    if (data && data.length > 0) {
      tenantId = data[0].id;
      log.info(`Using tenant: ${data[0].name}`);
    }
  } catch (e) {}
  
  if (!tenantId) {
    log.warning('No active tenant - skipping function tests');
    return;
  }
  
  // Test get_tenant_active_languages
  try {
    const { data, error } = await supabase.rpc('get_tenant_active_languages', { p_tenant_id: tenantId });
    if (error) throw error;
    recordTest('Func: get_tenant_active_languages', true, `- ${data?.length || 0} languages`);
    if (data?.length > 0) {
      console.log('   Languages:', data.map(l => l.language_code).join(', '));
    }
  } catch (error) {
    recordTest('Func: get_tenant_active_languages', false, `- ${error.message}`);
  }
  
  // Test check_language_limit
  try {
    const { data, error } = await supabase.rpc('check_language_limit', { p_tenant_id: tenantId });
    if (error) throw error;
    recordTest('Func: check_language_limit', true, `- ${data.current_count}/${data.max_languages}`);
    console.log('   Can add more:', data.can_add_more ? 'Yes ✅' : 'No ❌');
  } catch (error) {
    recordTest('Func: check_language_limit', false, `- ${error.message}`);
  }
  
  // Test get_tenant_available_modules
  try {
    const { data, error } = await supabase.rpc('get_tenant_available_modules', { p_tenant_id: tenantId });
    if (error) throw error;
    recordTest('Func: get_tenant_available_modules', true, `- ${data?.length || 0} modules`);
    if (data?.length > 0) {
      const enabled = data.filter(m => m.is_enabled);
      console.log('   Enabled:', enabled.map(m => m.module_code).join(', '));
    }
  } catch (error) {
    recordTest('Func: get_tenant_available_modules', false, `- ${error.message}`);
  }
  
  // Test check_feature_access
  try {
    const { data, error } = await supabase.rpc('check_feature_access', {
      p_tenant_id: tenantId,
      p_module_code: 'accounting',
      p_feature_code: 'export_pdf'
    });
    if (error) throw error;
    recordTest('Func: check_feature_access', true, `- ${data ? 'Allowed ✅' : 'Denied ❌'}`);
  } catch (error) {
    recordTest('Func: check_feature_access', false, `- ${error.message}`);
  }
  
  // Test get_allowed_tabs
  try {
    const { data, error } = await supabase.rpc('get_allowed_tabs', {
      p_tenant_id: tenantId,
      p_section_code: 'invoice_details'
    });
    if (error) throw error;
    recordTest('Func: get_allowed_tabs', true, `- ${data?.length || 0} tabs`);
  } catch (error) {
    recordTest('Func: get_allowed_tabs', false, `- ${error.message}`);
  }
}

async function testPlans() {
  log.section('Test 7: Subscription Plans');
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*').order('price_monthly');
    if (error) throw error;
    
    recordTest('Subscription Plans', data.length > 0, `- ${data.length} plans`);
    
    console.log('\n📋 Plans:');
    data.forEach(p => {
      const price = p.price_monthly || p.price_yearly || 0;
      console.log(`   ${p.name_en}: ${p.max_languages || '?'} langs, $${price}/mo`);
    });
    
    const hasMaxLangs = data[0] && 'max_languages' in data[0];
    recordTest('Plans: max_languages column', hasMaxLangs);
    
    return data;
  } catch (error) {
    recordTest('Subscription Plans', false, `- ${error.message}`);
    return [];
  }
}

// ============================================
// Main
// ============================================
async function runAllTests() {
  log.title('🧪 TexaCore Backend Testing');
  
  const startTime = Date.now();
  
  const connected = await testConnection();
  if (!connected) {
    log.error('Connection failed. Stopping.');
    return false;
  }
  
  await testTables();
  await testSystemLanguages();
  await testModuleFeatures();
  await testUITabs();
  await testFunctions();
  await testPlans();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log.title('📊 Summary');
  console.log(`Total:   ${results.total}`);
  console.log(`${c.green}Passed:  ${results.passed}${c.reset}`);
  console.log(`${c.red}Failed:  ${results.failed}${c.reset}`);
  console.log(`Time:    ${duration}s\n`);
  
  if (results.failed === 0) {
    log.success('All tests passed! 🎉\n');
  } else {
    log.warning(`${results.failed} test(s) failed.\n`);
    console.log('Failed tests:');
    results.tests.filter(t => !t.passed).forEach(t => console.log(`  - ${t.name}`));
    console.log('');
  }
  
  return results.failed === 0;
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log.error(`Fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
