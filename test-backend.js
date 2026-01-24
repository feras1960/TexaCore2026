#!/usr/bin/env node

/**
 * 🧪 Backend Testing Script
 * اختبار شامل لنظام التحكم في الموديولات والميزات
 * 
 * الاختبارات:
 * 1. اتصال Supabase
 * 2. الجداول الجديدة
 * 3. الدوال (PostgreSQL Functions)
 * 4. إدخال بيانات تجريبية
 * 5. استعلامات الاختبار
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://wzkklenfsaepegymfxfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2MDQ5NTAsImV4cCI6MjA1MjE4MDk1MH0.8vW9FgyEAZh_7qHKf7FnQXvx9tN-8YV_q7x_jPiuD_0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}## ${msg}${colors.reset}`)
};

// Test Results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

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
// Test 1: Connection Test
// ============================================
async function testConnection() {
  log.section('Test 1: Supabase Connection');
  
  try {
    const { data, error } = await supabase.from('tenants').select('count').limit(1);
    
    if (error) throw error;
    
    recordTest('Supabase Connection', true, '- Connected successfully');
    return true;
  } catch (error) {
    recordTest('Supabase Connection', false, `- ${error.message}`);
    return false;
  }
}

// ============================================
// Test 2: Check New Tables
// ============================================
async function testTables() {
  log.section('Test 2: New Tables Verification');
  
  const tables = [
    'module_features',
    'plan_module_features',
    'ui_tabs',
    'plan_ui_tabs',
    'system_languages',
    'tenant_languages'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      recordTest(`Table: ${table}`, true, `- Exists and accessible`);
    } catch (error) {
      recordTest(`Table: ${table}`, false, `- ${error.message}`);
    }
  }
}

// ============================================
// Test 3: Check System Languages Data
// ============================================
async function testSystemLanguages() {
  log.section('Test 3: System Languages Data');
  
  try {
    const { data, error } = await supabase
      .from('system_languages')
      .select('*')
      .order('code');
    
    if (error) throw error;
    
    const expectedLanguages = ['ar', 'en', 'de', 'tr', 'ru', 'uk', 'it', 'pl', 'ro'];
    const foundLanguages = data.map(lang => lang.code);
    
    log.info(`Found ${data.length} languages: ${foundLanguages.join(', ')}`);
    
    const allPresent = expectedLanguages.every(lang => foundLanguages.includes(lang));
    
    recordTest('System Languages', allPresent, `- ${data.length}/9 languages present`);
    
    // Display languages details
    console.log('\n📋 Available Languages:');
    data.forEach(lang => {
      console.log(`   ${lang.icon} ${lang.code.toUpperCase()}: ${lang.name_ar} / ${lang.name_en}`);
    });
    
    return data;
  } catch (error) {
    recordTest('System Languages', false, `- ${error.message}`);
    return [];
  }
}

// ============================================
// Test 4: Check Module Features Data
// ============================================
async function testModuleFeatures() {
  log.section('Test 4: Module Features Data');
  
  try {
    const { data, error } = await supabase
      .from('module_features')
      .select('*')
      .order('module_code, feature_code');
    
    if (error) throw error;
    
    log.info(`Found ${data.length} features`);
    
    recordTest('Module Features', data.length > 0, `- ${data.length} features loaded`);
    
    // Group by module
    const byModule = data.reduce((acc, feature) => {
      if (!acc[feature.module_code]) acc[feature.module_code] = [];
      acc[feature.module_code].push(feature);
      return acc;
    }, {});
    
    console.log('\n📋 Features by Module:');
    Object.entries(byModule).forEach(([module, features]) => {
      console.log(`   ${module}: ${features.length} features`);
    });
    
    return data;
  } catch (error) {
    recordTest('Module Features', false, `- ${error.message}`);
    return [];
  }
}

// ============================================
// Test 5: Check UI Tabs Data
// ============================================
async function testUITabs() {
  log.section('Test 5: UI Tabs Data');
  
  try {
    const { data, error } = await supabase
      .from('ui_tabs')
      .select('*')
      .order('section_code, order');
    
    if (error) throw error;
    
    log.info(`Found ${data.length} UI tabs`);
    
    recordTest('UI Tabs', data.length > 0, `- ${data.length} tabs loaded`);
    
    // Group by section
    const bySection = data.reduce((acc, tab) => {
      if (!acc[tab.section_code]) acc[tab.section_code] = [];
      acc[tab.section_code].push(tab);
      return acc;
    }, {});
    
    console.log('\n📋 Tabs by Section:');
    Object.entries(bySection).forEach(([section, tabs]) => {
      console.log(`   ${section}: ${tabs.length} tabs`);
    });
    
    return data;
  } catch (error) {
    recordTest('UI Tabs', false, `- ${error.message}`);
    return [];
  }
}

// ============================================
// Test 6: Test PostgreSQL Functions
// ============================================
async function testFunctions() {
  log.section('Test 6: PostgreSQL Functions');
  
  // First, get a tenant_id to test with
  let testTenantId = null;
  
  try {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('status', 'active')
      .limit(1);
    
    if (tenants && tenants.length > 0) {
      testTenantId = tenants[0].id;
      log.info(`Using tenant_id: ${testTenantId}`);
    }
  } catch (error) {
    log.warning('Could not find active tenant for testing');
  }
  
  // Test 6.1: get_tenant_active_languages
  if (testTenantId) {
    try {
      const { data, error } = await supabase.rpc('get_tenant_active_languages', {
        p_tenant_id: testTenantId
      });
      
      if (error) throw error;
      
      recordTest('Function: get_tenant_active_languages', true, `- Returned ${data?.length || 0} languages`);
      
      if (data && data.length > 0) {
        console.log('   Active languages:', data.map(l => l.language_code).join(', '));
      }
    } catch (error) {
      recordTest('Function: get_tenant_active_languages', false, `- ${error.message}`);
    }
  }
  
  // Test 6.2: check_language_limit
  if (testTenantId) {
    try {
      const { data, error } = await supabase.rpc('check_language_limit', {
        p_tenant_id: testTenantId
      });
      
      if (error) throw error;
      
      recordTest('Function: check_language_limit', true, 
        `- Current: ${data.current_count}/${data.max_languages}`);
      
      console.log('   Can add more:', data.can_add_more ? 'Yes' : 'No');
    } catch (error) {
      recordTest('Function: check_language_limit', false, `- ${error.message}`);
    }
  }
  
  // Test 6.3: get_tenant_available_modules
  if (testTenantId) {
    try {
      const { data, error } = await supabase.rpc('get_tenant_available_modules', {
        p_tenant_id: testTenantId
      });
      
      if (error) throw error;
      
      recordTest('Function: get_tenant_available_modules', true, 
        `- Returned ${data?.length || 0} modules`);
      
      if (data && data.length > 0) {
        console.log('   Modules:', data.map(m => m.module_code).join(', '));
        const enabled = data.filter(m => m.is_enabled).length;
        console.log('   Enabled:', `${enabled}/${data.length}`);
      }
    } catch (error) {
      recordTest('Function: get_tenant_available_modules', false, `- ${error.message}`);
    }
  }
  
  // Test 6.4: check_feature_access
  if (testTenantId) {
    try {
      const { data, error } = await supabase.rpc('check_feature_access', {
        p_tenant_id: testTenantId,
        p_module_code: 'accounting',
        p_feature_code: 'export_pdf'
      });
      
      if (error) throw error;
      
      recordTest('Function: check_feature_access', true, 
        `- Result: ${data ? 'Allowed' : 'Denied'}`);
    } catch (error) {
      recordTest('Function: check_feature_access', false, `- ${error.message}`);
    }
  }
  
  // Test 6.5: get_allowed_tabs
  if (testTenantId) {
    try {
      const { data, error } = await supabase.rpc('get_allowed_tabs', {
        p_tenant_id: testTenantId,
        p_section_code: 'invoice_details'
      });
      
      if (error) throw error;
      
      recordTest('Function: get_allowed_tabs', true, 
        `- Returned ${data?.length || 0} tabs`);
      
      if (data && data.length > 0) {
        console.log('   Tabs:', data.map(t => t.code).join(', '));
      }
    } catch (error) {
      recordTest('Function: get_allowed_tabs', false, `- ${error.message}`);
    }
  }
  
  if (!testTenantId) {
    log.warning('Skipped function tests - no active tenant found');
  }
}

// ============================================
// Test 7: Test Data Insertion (Tenant Languages)
// ============================================
async function testDataInsertion() {
  log.section('Test 7: Data Insertion Test');
  
  // Find a test tenant
  let testTenantId = null;
  
  try {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active')
      .limit(1);
    
    if (tenants && tenants.length > 0) {
      testTenantId = tenants[0].id;
      log.info(`Using tenant: ${tenants[0].name} (${testTenantId})`);
    } else {
      log.warning('No active tenant found for insertion test');
      return;
    }
  } catch (error) {
    log.error(`Failed to find tenant: ${error.message}`);
    return;
  }
  
  // Check current languages
  try {
    const { data: currentLangs } = await supabase
      .from('tenant_languages')
      .select('language_code')
      .eq('tenant_id', testTenantId);
    
    log.info(`Current languages: ${currentLangs?.length || 0}`);
    
    if (currentLangs) {
      console.log('   Codes:', currentLangs.map(l => l.language_code).join(', '));
    }
  } catch (error) {
    log.error(`Failed to check current languages: ${error.message}`);
  }
  
  // Try to enable a language using the function
  try {
    const { data, error } = await supabase.rpc('enable_tenant_language', {
      p_tenant_id: testTenantId,
      p_language_code: 'de', // German
      p_is_primary: false
    });
    
    if (error) {
      if (error.message.includes('already enabled') || error.message.includes('maximum')) {
        recordTest('Enable Language (German)', true, '- Already enabled or limit reached');
      } else {
        throw error;
      }
    } else {
      recordTest('Enable Language (German)', data.success, 
        `- ${data.success ? 'Enabled successfully' : data.error}`);
    }
  } catch (error) {
    recordTest('Enable Language (German)', false, `- ${error.message}`);
  }
}

// ============================================
// Test 8: Subscription Plans Check
// ============================================
async function testSubscriptionPlans() {
  log.section('Test 8: Subscription Plans Configuration');
  
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price');
    
    if (error) throw error;
    
    recordTest('Subscription Plans', data.length > 0, `- ${data.length} plans found`);
    
    console.log('\n📋 Plans Configuration:');
    data.forEach(plan => {
      console.log(`\n   ${plan.plan_name}:`);
      console.log(`      Max Languages: ${plan.max_languages || 'N/A'}`);
      console.log(`      Additional Lang Price: $${plan.additional_language_price || 0}`);
      console.log(`      Max Users: ${plan.max_users}`);
      console.log(`      Max Companies: ${plan.max_companies}`);
      console.log(`      Included Modules: ${JSON.stringify(plan.included_modules)}`);
    });
    
    // Check if max_languages column exists
    const hasMaxLanguages = data[0] && 'max_languages' in data[0];
    recordTest('Plans: max_languages column', hasMaxLanguages, 
      hasMaxLanguages ? '- Column exists' : '- Column missing');
    
    return data;
  } catch (error) {
    recordTest('Subscription Plans', false, `- ${error.message}`);
    return [];
  }
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  log.title('🧪 TexaCore Backend Testing Suite');
  log.info('Testing Modules, Features & Multi-Language System');
  console.log('');
  
  const startTime = Date.now();
  
  // Run all tests
  const connected = await testConnection();
  
  if (!connected) {
    log.error('Connection failed. Stopping tests.');
    return;
  }
  
  await testTables();
  await testSystemLanguages();
  await testModuleFeatures();
  await testUITabs();
  await testFunctions();
  await testDataInsertion();
  await testSubscriptionPlans();
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log.title('📊 Test Summary');
  console.log(`Total Tests:  ${results.total}`);
  console.log(`${colors.green}Passed:       ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${results.failed}${colors.reset}`);
  console.log(`Duration:     ${duration}s`);
  console.log('');
  
  if (results.failed === 0) {
    log.success('All tests passed! 🎉');
  } else {
    log.warning(`${results.failed} test(s) failed. Check details above.`);
  }
  
  // Detailed results
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`   - ${t.name}: ${t.details}`));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run tests
runAllTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
