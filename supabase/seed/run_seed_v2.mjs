/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEMO DATA SEED SCRIPT v2 - With Schema Detection
 * سكريبت إنشاء البيانات التجريبية - مع كشف الجداول
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env file
function loadEnv() {
  try {
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
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log('🔗 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('\n📝 Usage: node supabase/seed/run_seed_v2.mjs <email> <password>');
  process.exit(1);
}

async function checkTableExists(tableName) {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(1);
    if (error && error.message.includes('Could not find')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n🚀 بدء إنشاء البيانات التجريبية...\n');

  // Login
  console.log(`📧 تسجيل الدخول: ${email}`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('❌ خطأ في تسجيل الدخول:', authError.message);
    process.exit(1);
  }

  const user = authData.user;
  console.log('✅ تم تسجيل الدخول بنجاح');

  const tenant_id = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;
  const company_id = user.user_metadata?.company_id || user.app_metadata?.company_id;

  if (!tenant_id || !company_id) {
    console.error('❌ لم يتم العثور على tenant_id أو company_id');
    process.exit(1);
  }

  console.log(`📋 Tenant ID: ${tenant_id}`);
  console.log(`🏢 Company ID: ${company_id}`);
  console.log(`👤 User ID: ${user.id}\n`);

  // ═══════════════════════════════════════════════════════════════
  // Check which tables exist
  // ═══════════════════════════════════════════════════════════════
  console.log('🔍 جاري فحص الجداول الموجودة...\n');
  
  const tables = [
    'account_types',
    'chart_of_accounts',
    'cash_accounts',
    'customer_groups',
    'customers',
    'supplier_groups',
    'suppliers',
    'fabric_colors',
    'fabric_groups',
    'fabric_materials',
    'fabric_material_colors',
    'warehouses',
  ];

  const existingTables = {};
  for (const table of tables) {
    existingTables[table] = await checkTableExists(table);
    console.log(`   ${existingTables[table] ? '✅' : '❌'} ${table}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. Get Account Types
  // ═══════════════════════════════════════════════════════════════
  let CURRENT_ASSET = null, CURRENT_LIABILITY = null, REVENUE = null, EXPENSE = null;
  
  if (existingTables['account_types']) {
    console.log('\n📊 جاري الحصول على أنواع الحسابات...');
    
    const { data: accountTypes, error: atError } = await supabase
      .from('account_types')
      .select('id, code, name_ar');
    
    if (atError) {
      console.warn('⚠️ خطأ في الحصول على أنواع الحسابات:', atError.message);
    } else {
      const getAccountTypeId = (code) => accountTypes?.find(t => t.code === code)?.id;
      CURRENT_ASSET = getAccountTypeId('CURRENT_ASSET');
      CURRENT_LIABILITY = getAccountTypeId('CURRENT_LIABILITY');
      REVENUE = getAccountTypeId('REVENUE');
      EXPENSE = getAccountTypeId('EXPENSE');
      console.log('✅ تم الحصول على أنواع الحسابات');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Create Chart of Accounts (without trigger-problematic fields)
  // ═══════════════════════════════════════════════════════════════
  const createdAccounts = {};
  
  if (existingTables['chart_of_accounts'] && CURRENT_ASSET) {
    console.log('\n📒 جاري إنشاء دليل الحسابات...');

    const accounts = [
      { account_code: '1101', name_ar: 'الصندوق الرئيسي', name_en: 'Main Cash', account_type_id: CURRENT_ASSET, is_cash_account: true, currency: 'UAH' },
      { account_code: '1102', name_ar: 'البنك - غريفنا', name_en: 'Bank - UAH', account_type_id: CURRENT_ASSET, is_bank_account: true, bank_name: 'PrivatBank', currency: 'UAH' },
      { account_code: '1103', name_ar: 'البنك - دولار', name_en: 'Bank - USD', account_type_id: CURRENT_ASSET, is_bank_account: true, bank_name: 'PrivatBank', currency: 'USD' },
      { account_code: '1104', name_ar: 'البنك - يورو', name_en: 'Bank - EUR', account_type_id: CURRENT_ASSET, is_bank_account: true, bank_name: 'Raiffeisen', currency: 'EUR' },
      { account_code: '1201', name_ar: 'الذمم المدينة', name_en: 'Accounts Receivable', account_type_id: CURRENT_ASSET, is_receivable: true, currency: 'UAH' },
      { account_code: '1301', name_ar: 'المخزون', name_en: 'Inventory', account_type_id: CURRENT_ASSET, currency: 'UAH' },
      { account_code: '2101', name_ar: 'الذمم الدائنة', name_en: 'Accounts Payable', account_type_id: CURRENT_LIABILITY, is_payable: true, currency: 'UAH' },
      { account_code: '4101', name_ar: 'إيرادات المبيعات', name_en: 'Sales Revenue', account_type_id: REVENUE, currency: 'UAH' },
      { account_code: '5101', name_ar: 'المشتريات', name_en: 'Purchases', account_type_id: EXPENSE, currency: 'UAH' },
    ];

    for (const acc of accounts) {
      // Try insert first, then upsert with different approach
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          tenant_id,
          company_id,
          ...acc,
          is_detail: true,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          // Already exists, try to get it
          const { data: existing } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('company_id', company_id)
            .eq('account_code', acc.account_code)
            .single();
          
          if (existing) {
            createdAccounts[acc.account_code] = existing.id;
            console.log(`ℹ️ ${acc.account_code} - ${acc.name_ar} (موجود مسبقاً)`);
          }
        } else {
          console.warn(`⚠️ ${acc.account_code}: ${error.message}`);
        }
      } else {
        createdAccounts[acc.account_code] = data?.id;
        console.log(`✅ ${acc.account_code} - ${acc.name_ar}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Create Cash Accounts (Funds)
  // ═══════════════════════════════════════════════════════════════
  if (existingTables['cash_accounts'] && Object.keys(createdAccounts).length > 0) {
    console.log('\n🏦 جاري إنشاء الصناديق والبنوك...');

    const funds = [
      { code: 'CASH-UAH', name_ar: 'الصندوق الرئيسي', name_en: 'Main Cash Box', account_type: 'cash', gl_account_id: createdAccounts['1101'], currency: 'UAH', current_balance: 50000 },
      { code: 'BANK-UAH', name_ar: 'PrivatBank - غريفنا', name_en: 'PrivatBank - UAH', account_type: 'bank', gl_account_id: createdAccounts['1102'], bank_name: 'PrivatBank', account_number: 'UA123456789', iban: 'UA12 3456 7890 1234', currency: 'UAH', current_balance: 250000 },
      { code: 'BANK-USD', name_ar: 'PrivatBank - دولار', name_en: 'PrivatBank - USD', account_type: 'bank', gl_account_id: createdAccounts['1103'], bank_name: 'PrivatBank', account_number: 'UA987654321', iban: 'UA98 7654 3210 9876', swift_code: 'PABORXXX', currency: 'USD', current_balance: 15000 },
      { code: 'BANK-EUR', name_ar: 'Raiffeisen - يورو', name_en: 'Raiffeisen - EUR', account_type: 'bank', gl_account_id: createdAccounts['1104'], bank_name: 'Raiffeisen Bank', account_number: 'UA111222333', iban: 'UA11 1222 3334 4455', swift_code: 'RZBRXXXX', currency: 'EUR', current_balance: 8000 },
    ];

    for (const fund of funds) {
      if (!fund.gl_account_id) {
        console.warn(`⚠️ تخطي ${fund.code} - لم يتم العثور على الحساب المرتبط`);
        continue;
      }
      
      const { error } = await supabase
        .from('cash_accounts')
        .insert({
          tenant_id,
          company_id,
          ...fund,
          is_active: true,
        });
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`ℹ️ ${fund.code} - ${fund.name_ar} (موجود مسبقاً)`);
        } else {
          console.warn(`⚠️ ${fund.code}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${fund.code} - ${fund.name_ar} (${fund.current_balance} ${fund.currency})`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Create Customer Groups
  // ═══════════════════════════════════════════════════════════════
  const customerGroupIds = {};
  
  if (existingTables['customer_groups']) {
    console.log('\n👥 جاري إنشاء مجموعات العملاء...');

    const customerGroups = [
      { code: 'WHOLESALE', name_ar: 'تجار الجملة', name_en: 'Wholesale', discount_percent: 10, credit_limit: 100000, payment_terms_days: 30 },
      { code: 'RETAIL', name_ar: 'تجار التجزئة', name_en: 'Retail', discount_percent: 5, credit_limit: 20000, payment_terms_days: 15 },
      { code: 'VIP', name_ar: 'عملاء VIP', name_en: 'VIP Customers', discount_percent: 15, credit_limit: 200000, payment_terms_days: 45 },
    ];

    for (const group of customerGroups) {
      const { data, error } = await supabase
        .from('customer_groups')
        .insert({ tenant_id, ...group, is_active: true })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const { data: existing } = await supabase
            .from('customer_groups')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('code', group.code)
            .single();
          
          if (existing) {
            customerGroupIds[group.code] = existing.id;
            console.log(`ℹ️ ${group.code} - ${group.name_ar} (موجود)`);
          }
        } else {
          console.warn(`⚠️ ${group.code}: ${error.message}`);
        }
      } else {
        customerGroupIds[group.code] = data?.id;
        console.log(`✅ ${group.code} - ${group.name_ar}`);
      }
    }
  } else {
    console.log('\n⚠️ جدول customer_groups غير موجود - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. Create Customers
  // ═══════════════════════════════════════════════════════════════
  if (existingTables['customers']) {
    console.log('\n🧑‍💼 جاري إنشاء العملاء...');

    const customers = [
      { code: 'CUST-001', name_ar: 'شركة النسيج الذهبي', name_en: 'Golden Textile Co.', customer_type: 'company', email: 'info@goldentextile.ua', phone: '+380441234567', country: 'Ukraine', city: 'Kyiv', group_id: customerGroupIds['WHOLESALE'], currency: 'UAH', credit_limit: 150000 },
      { code: 'CUST-002', name_ar: 'مصنع الأقمشة المتحدة', name_en: 'United Fabrics', customer_type: 'company', email: 'sales@unitedfabrics.ua', phone: '+380442345678', country: 'Ukraine', city: 'Kharkiv', group_id: customerGroupIds['WHOLESALE'], currency: 'UAH', credit_limit: 200000 },
      { code: 'CUST-003', name_ar: 'محل أقمشة الزهور', name_en: 'Flowers Fabric Shop', customer_type: 'company', email: 'flowers@shop.ua', phone: '+380443456789', country: 'Ukraine', city: 'Kyiv', group_id: customerGroupIds['RETAIL'], currency: 'UAH', credit_limit: 30000 },
      { code: 'CUST-004', name_ar: 'بوتيك الأناقة', name_en: 'Elegance Boutique', customer_type: 'company', email: 'info@elegance.ua', phone: '+380444567890', country: 'Ukraine', city: 'Lviv', group_id: customerGroupIds['RETAIL'], currency: 'UAH', credit_limit: 25000 },
      { code: 'CUST-005', name_ar: 'مجموعة الأزياء الراقية', name_en: 'Premium Fashion', customer_type: 'company', email: 'vip@premium.ua', phone: '+380445678901', country: 'Ukraine', city: 'Kyiv', group_id: customerGroupIds['VIP'], currency: 'EUR', credit_limit: 100000 },
    ];

    for (const cust of customers) {
      // Remove group_id if undefined
      const custData = { ...cust };
      if (!custData.group_id) delete custData.group_id;
      
      const { error } = await supabase
        .from('customers')
        .insert({
          tenant_id,
          company_id,
          ...custData,
          receivable_account_id: createdAccounts['1201'] || null,
          status: 'active',
        });
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`ℹ️ ${cust.code} - ${cust.name_ar} (موجود)`);
        } else {
          console.warn(`⚠️ ${cust.code}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${cust.code} - ${cust.name_ar}`);
      }
    }
  } else {
    console.log('\n⚠️ جدول customers غير موجود - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. Create Supplier Groups
  // ═══════════════════════════════════════════════════════════════
  const supplierGroupIds = {};
  
  if (existingTables['supplier_groups']) {
    console.log('\n📦 جاري إنشاء مجموعات الموردين...');

    const supplierGroups = [
      { code: 'LOCAL', name_ar: 'موردين محليين', name_en: 'Local Suppliers', payment_terms_days: 30 },
      { code: 'IMPORT', name_ar: 'موردين استيراد', name_en: 'Import Suppliers', payment_terms_days: 60 },
    ];

    for (const group of supplierGroups) {
      const { data, error } = await supabase
        .from('supplier_groups')
        .insert({ tenant_id, ...group, is_active: true })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const { data: existing } = await supabase
            .from('supplier_groups')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('code', group.code)
            .single();
          
          if (existing) {
            supplierGroupIds[group.code] = existing.id;
            console.log(`ℹ️ ${group.code} - ${group.name_ar} (موجود)`);
          }
        } else {
          console.warn(`⚠️ ${group.code}: ${error.message}`);
        }
      } else {
        supplierGroupIds[group.code] = data?.id;
        console.log(`✅ ${group.code} - ${group.name_ar}`);
      }
    }
  } else {
    console.log('\n⚠️ جدول supplier_groups غير موجود - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. Create Suppliers
  // ═══════════════════════════════════════════════════════════════
  if (existingTables['suppliers']) {
    console.log('\n🏭 جاري إنشاء الموردين...');

    const suppliers = [
      { code: 'SUPP-001', name_ar: 'مصنع النسيج الأوكراني', name_en: 'Ukrainian Textile Mill', supplier_type: 'company', email: 'sales@utm.ua', phone: '+380441111111', country: 'Ukraine', city: 'Kharkiv', group_id: supplierGroupIds['LOCAL'], currency: 'UAH', payment_terms_days: 30 },
      { code: 'SUPP-002', name_ar: 'شركة الألياف المتقدمة', name_en: 'Advanced Fibers Co.', supplier_type: 'company', email: 'info@afc.ua', phone: '+380442222222', country: 'Ukraine', city: 'Dnipro', group_id: supplierGroupIds['LOCAL'], currency: 'UAH', payment_terms_days: 45 },
      { code: 'SUPP-003', name_ar: 'مصانع بورصة للنسيج', name_en: 'Bursa Textile Mills', supplier_type: 'company', email: 'export@btm.com.tr', phone: '+902241234567', country: 'Turkey', city: 'Bursa', group_id: supplierGroupIds['IMPORT'], currency: 'USD', payment_terms_days: 60 },
      { code: 'SUPP-004', name_ar: 'مصانع قوانغدونغ', name_en: 'Guangdong Factory', supplier_type: 'company', email: 'export@gtf.cn', phone: '+8675512345678', country: 'China', city: 'Guangzhou', group_id: supplierGroupIds['IMPORT'], currency: 'USD', payment_terms_days: 90 },
      { code: 'SUPP-005', name_ar: 'مصانع مومباي للقطن', name_en: 'Mumbai Cotton Mills', supplier_type: 'company', email: 'export@mcm.in', phone: '+912212345678', country: 'India', city: 'Mumbai', group_id: supplierGroupIds['IMPORT'], currency: 'USD', payment_terms_days: 60 },
    ];

    for (const supp of suppliers) {
      const suppData = { ...supp };
      if (!suppData.group_id) delete suppData.group_id;
      
      const { error } = await supabase
        .from('suppliers')
        .insert({
          tenant_id,
          company_id,
          ...suppData,
          payable_account_id: createdAccounts['2101'] || null,
          status: 'active',
        });
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`ℹ️ ${supp.code} - ${supp.name_ar} (موجود)`);
        } else {
          console.warn(`⚠️ ${supp.code}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${supp.code} - ${supp.name_ar}`);
      }
    }
  } else {
    console.log('\n⚠️ جدول suppliers غير موجود - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. Create Fabric Colors (without color_family if it doesn't exist)
  // ═══════════════════════════════════════════════════════════════
  const colorIds = {};
  
  if (existingTables['fabric_colors']) {
    console.log('\n🎨 جاري إنشاء الألوان...');

    const colors = [
      { code: 'WHITE', name_ar: 'أبيض', name_en: 'White', hex_color: '#FFFFFF' },
      { code: 'BLACK', name_ar: 'أسود', name_en: 'Black', hex_color: '#000000' },
      { code: 'RED', name_ar: 'أحمر', name_en: 'Red', hex_color: '#FF0000' },
      { code: 'BLUE', name_ar: 'أزرق', name_en: 'Blue', hex_color: '#0000FF' },
      { code: 'GREEN', name_ar: 'أخضر', name_en: 'Green', hex_color: '#00FF00' },
      { code: 'BEIGE', name_ar: 'بيج', name_en: 'Beige', hex_color: '#F5F5DC' },
      { code: 'NAVY', name_ar: 'كحلي', name_en: 'Navy Blue', hex_color: '#000080' },
      { code: 'GRAY', name_ar: 'رمادي', name_en: 'Gray', hex_color: '#808080' },
      { code: 'BROWN', name_ar: 'بني', name_en: 'Brown', hex_color: '#8B4513' },
      { code: 'BURGUNDY', name_ar: 'خمري', name_en: 'Burgundy', hex_color: '#800020' },
      { code: 'CREAM', name_ar: 'كريمي', name_en: 'Cream', hex_color: '#FFFDD0' },
      { code: 'PINK', name_ar: 'وردي', name_en: 'Pink', hex_color: '#FFC0CB' },
    ];

    for (const color of colors) {
      const { data, error } = await supabase
        .from('fabric_colors')
        .insert({ tenant_id, ...color, is_active: true })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const { data: existing } = await supabase
            .from('fabric_colors')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('code', color.code)
            .single();
          
          if (existing) {
            colorIds[color.code] = existing.id;
            console.log(`ℹ️ ${color.code} - ${color.name_ar} (موجود)`);
          }
        } else {
          console.warn(`⚠️ ${color.code}: ${error.message}`);
        }
      } else {
        colorIds[color.code] = data?.id;
        console.log(`✅ ${color.code} - ${color.name_ar} (${color.hex_color})`);
      }
    }
  } else {
    console.log('\n⚠️ جدول fabric_colors غير موجود - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. Create Fabric Groups
  // ═══════════════════════════════════════════════════════════════
  const fabricGroupIds = {};
  
  if (existingTables['fabric_groups']) {
    console.log('\n📁 جاري إنشاء مجموعات الأقمشة...');

    const fabricGroups = [
      { code: 'COTTON', name_ar: 'قطن', name_en: 'Cotton', icon: '🧵', description: 'أقمشة قطنية طبيعية', display_order: 1 },
      { code: 'POLYESTER', name_ar: 'بوليستر', name_en: 'Polyester', icon: '✨', description: 'أقمشة بوليستر صناعية', display_order: 2 },
      { code: 'SILK', name_ar: 'حرير', name_en: 'Silk', icon: '🦋', description: 'أقمشة حريرية فاخرة', display_order: 3 },
      { code: 'LINEN', name_ar: 'كتان', name_en: 'Linen', icon: '🌿', description: 'أقمشة كتانية طبيعية', display_order: 4 },
      { code: 'WOOL', name_ar: 'صوف', name_en: 'Wool', icon: '🐑', description: 'أقمشة صوفية', display_order: 5 },
    ];

    for (const group of fabricGroups) {
      const { data, error } = await supabase
        .from('fabric_groups')
        .insert({ tenant_id, ...group, is_active: true })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const { data: existing } = await supabase
            .from('fabric_groups')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('code', group.code)
            .single();
          
          if (existing) {
            fabricGroupIds[group.code] = existing.id;
            console.log(`ℹ️ ${group.code} - ${group.name_ar} (موجود)`);
          }
        } else {
          console.warn(`⚠️ ${group.code}: ${error.message}`);
        }
      } else {
        fabricGroupIds[group.code] = data?.id;
        console.log(`✅ ${group.code} - ${group.name_ar} ${group.icon}`);
      }
    }
  } else {
    console.log('\n⚠️ جدول fabric_groups غير موجود - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. Create Fabric Materials
  // ═══════════════════════════════════════════════════════════════
  const materialIds = {};
  
  if (existingTables['fabric_materials'] && Object.keys(fabricGroupIds).length > 0) {
    console.log('\n🧶 جاري إنشاء مواد الأقمشة...');

    const materials = [
      { code: 'COT-100-PLAIN', name_ar: 'قطن سادة 100%', name_en: 'Plain Cotton 100%', group_id: fabricGroupIds['COTTON'], composition: '100% Cotton', default_width: 150, weight_per_meter: 0.18, purchase_price: 45, selling_price: 75, currency: 'UAH', origin_country: 'Turkey' },
      { code: 'COT-100-TWILL', name_ar: 'قطن تويل 100%', name_en: 'Cotton Twill 100%', group_id: fabricGroupIds['COTTON'], composition: '100% Cotton', default_width: 150, weight_per_meter: 0.22, purchase_price: 55, selling_price: 90, currency: 'UAH', origin_country: 'India' },
      { code: 'COT-MIX-6040', name_ar: 'قطن مخلوط 60/40', name_en: 'Cotton Blend 60/40', group_id: fabricGroupIds['COTTON'], composition: '60% Cotton, 40% Polyester', default_width: 150, weight_per_meter: 0.16, purchase_price: 35, selling_price: 55, currency: 'UAH', origin_country: 'China' },
      { code: 'POLY-SATIN', name_ar: 'بوليستر ساتان', name_en: 'Polyester Satin', group_id: fabricGroupIds['POLYESTER'], composition: '100% Polyester', default_width: 150, weight_per_meter: 0.12, purchase_price: 38, selling_price: 62, currency: 'UAH', origin_country: 'China' },
      { code: 'POLY-CREPE', name_ar: 'بوليستر كريب', name_en: 'Polyester Crepe', group_id: fabricGroupIds['POLYESTER'], composition: '100% Polyester', default_width: 145, weight_per_meter: 0.14, purchase_price: 42, selling_price: 68, currency: 'UAH', origin_country: 'Turkey' },
      { code: 'POLY-CHIFFON', name_ar: 'شيفون بوليستر', name_en: 'Polyester Chiffon', group_id: fabricGroupIds['POLYESTER'], composition: '100% Polyester', default_width: 150, weight_per_meter: 0.08, purchase_price: 30, selling_price: 50, currency: 'UAH', origin_country: 'China' },
      { code: 'SILK-NATURAL', name_ar: 'حرير طبيعي', name_en: 'Natural Silk', group_id: fabricGroupIds['SILK'], composition: '100% Silk', default_width: 140, weight_per_meter: 0.10, purchase_price: 180, selling_price: 320, currency: 'UAH', origin_country: 'China' },
      { code: 'LINEN-100', name_ar: 'كتان طبيعي 100%', name_en: '100% Natural Linen', group_id: fabricGroupIds['LINEN'], composition: '100% Linen', default_width: 150, weight_per_meter: 0.20, purchase_price: 75, selling_price: 125, currency: 'UAH', origin_country: 'Ukraine' },
    ];

    for (const mat of materials) {
      if (!mat.group_id) {
        console.warn(`⚠️ تخطي ${mat.code} - لم يتم العثور على المجموعة`);
        continue;
      }
      
      const { data, error } = await supabase
        .from('fabric_materials')
        .insert({
          tenant_id,
          company_id,
          ...mat,
          unit: 'meter',
          category: 'woven',
          status: 'active',
        })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const { data: existing } = await supabase
            .from('fabric_materials')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('code', mat.code)
            .single();
          
          if (existing) {
            materialIds[mat.code] = existing.id;
            console.log(`ℹ️ ${mat.code} - ${mat.name_ar} (موجود)`);
          }
        } else {
          console.warn(`⚠️ ${mat.code}: ${error.message}`);
        }
      } else {
        materialIds[mat.code] = data?.id;
        console.log(`✅ ${mat.code} - ${mat.name_ar} (${mat.selling_price} ${mat.currency}/متر)`);
      }
    }
  } else {
    console.log('\n⚠️ جدول fabric_materials غير موجود أو لا توجد مجموعات - تخطي');
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. Link Materials with Colors
  // ═══════════════════════════════════════════════════════════════
  let linkCount = 0;
  
  if (existingTables['fabric_material_colors'] && Object.keys(materialIds).length > 0 && Object.keys(colorIds).length > 0) {
    console.log('\n🔗 جاري ربط الأقمشة بالألوان...');

    const materialColorLinks = [
      { material: 'COT-100-PLAIN', colors: ['WHITE', 'BLACK', 'BEIGE', 'NAVY', 'GRAY', 'RED', 'BLUE'] },
      { material: 'COT-100-TWILL', colors: ['WHITE', 'BLACK', 'BEIGE', 'NAVY', 'BROWN'] },
      { material: 'COT-MIX-6040', colors: ['WHITE', 'BLACK', 'GRAY', 'NAVY', 'BEIGE'] },
      { material: 'POLY-SATIN', colors: ['WHITE', 'BLACK', 'RED', 'BLUE', 'BURGUNDY', 'NAVY', 'PINK'] },
      { material: 'POLY-CREPE', colors: ['WHITE', 'BLACK', 'BEIGE', 'NAVY', 'GRAY'] },
      { material: 'POLY-CHIFFON', colors: ['WHITE', 'BLACK', 'PINK', 'CREAM', 'BEIGE'] },
      { material: 'SILK-NATURAL', colors: ['WHITE', 'BLACK', 'RED', 'BURGUNDY', 'NAVY', 'CREAM'] },
      { material: 'LINEN-100', colors: ['WHITE', 'BEIGE', 'GRAY', 'BROWN', 'CREAM'] },
    ];

    for (const link of materialColorLinks) {
      const materialId = materialIds[link.material];
      if (!materialId) continue;
      
      for (const colorCode of link.colors) {
        const colorId = colorIds[colorCode];
        if (!colorId) continue;
        
        const { error } = await supabase
          .from('fabric_material_colors')
          .insert({
            tenant_id,
            material_id: materialId,
            color_id: colorId,
            is_available: true,
          });
        
        if (!error) {
          linkCount++;
        }
      }
    }
    console.log(`✅ تم ربط ${linkCount} لون بالأقمشة`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('✅ انتهى تنفيذ السكريبت!');
  console.log('═'.repeat(60));
  console.log('📊 الملخص:');
  console.log(`   - الحسابات المحاسبية: ${Object.keys(createdAccounts).length}`);
  console.log(`   - مجموعات العملاء: ${Object.keys(customerGroupIds).length}`);
  console.log(`   - مجموعات الموردين: ${Object.keys(supplierGroupIds).length}`);
  console.log(`   - الألوان: ${Object.keys(colorIds).length}`);
  console.log(`   - مجموعات الأقمشة: ${Object.keys(fabricGroupIds).length}`);
  console.log(`   - مواد الأقمشة: ${Object.keys(materialIds).length}`);
  console.log(`   - روابط الألوان-الأقمشة: ${linkCount}`);
  console.log('═'.repeat(60));

  // Logout
  await supabase.auth.signOut();
  console.log('\n👋 تم تسجيل الخروج');
  process.exit(0);
}

main().catch(console.error);
