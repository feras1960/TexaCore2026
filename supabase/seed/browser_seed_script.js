/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEMO DATA SEED SCRIPT - Browser Console
 * سكريبت إنشاء البيانات التجريبية من متصفح الويب
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * كيفية الاستخدام:
 * 1. افتح التطبيق في المتصفح وتأكد من تسجيل الدخول
 * 2. افتح Developer Tools (F12)
 * 3. اذهب إلى Console
 * 4. انسخ والصق هذا الكود
 * 5. اضغط Enter
 * 
 * العملات: UAH (غريفنا), USD (دولار), EUR (يورو)
 */

(async function seedDemoData() {
  console.log('🚀 بدء إنشاء البيانات التجريبية...');
  
  // Get Supabase client from window (loaded by the app)
  const supabase = window.__SUPABASE_CLIENT__ || 
    (await import('/src/lib/supabase.ts')).supabase;
  
  if (!supabase) {
    console.error('❌ لم يتم العثور على Supabase client');
    return;
  }

  // Get current user and session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ يجب تسجيل الدخول أولاً');
    return;
  }

  const tenant_id = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;
  const company_id = user.user_metadata?.company_id || user.app_metadata?.company_id;

  if (!tenant_id || !company_id) {
    console.error('❌ لم يتم العثور على tenant_id أو company_id');
    console.log('User metadata:', user.user_metadata);
    console.log('App metadata:', user.app_metadata);
    return;
  }

  console.log(`📋 Tenant ID: ${tenant_id}`);
  console.log(`🏢 Company ID: ${company_id}`);
  console.log(`👤 User ID: ${user.id}`);

  // ═══════════════════════════════════════════════════════════════
  // 1. Get Account Types
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📊 جاري الحصول على أنواع الحسابات...');
  
  const { data: accountTypes, error: atError } = await supabase
    .from('account_types')
    .select('id, code, name_ar');
  
  if (atError) {
    console.error('❌ خطأ في الحصول على أنواع الحسابات:', atError);
    return;
  }

  const getAccountTypeId = (code) => accountTypes?.find(t => t.code === code)?.id;
  
  const CURRENT_ASSET = getAccountTypeId('CURRENT_ASSET');
  const CURRENT_LIABILITY = getAccountTypeId('CURRENT_LIABILITY');
  const REVENUE = getAccountTypeId('REVENUE');
  const EXPENSE = getAccountTypeId('EXPENSE');

  if (!CURRENT_ASSET) {
    console.error('❌ لم يتم العثور على أنواع الحسابات المطلوبة');
    return;
  }

  console.log('✅ تم الحصول على أنواع الحسابات');

  // ═══════════════════════════════════════════════════════════════
  // 2. Create Chart of Accounts
  // ═══════════════════════════════════════════════════════════════
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

  const createdAccounts = {};
  
  for (const acc of accounts) {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .upsert({
        tenant_id,
        company_id,
        ...acc,
        is_detail: true,
        is_active: true,
      }, { onConflict: 'tenant_id,company_id,account_code' })
      .select()
      .single();
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء الحساب ${acc.account_code}:`, error.message);
    } else {
      createdAccounts[acc.account_code] = data?.id;
      console.log(`✅ ${acc.account_code} - ${acc.name_ar}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Create Cash Accounts (Funds)
  // ═══════════════════════════════════════════════════════════════
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
      .upsert({
        tenant_id,
        company_id,
        ...fund,
        is_active: true,
      }, { onConflict: 'tenant_id,company_id,code' });
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء ${fund.code}:`, error.message);
    } else {
      console.log(`✅ ${fund.code} - ${fund.name_ar} (${fund.current_balance} ${fund.currency})`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Create Customer Groups
  // ═══════════════════════════════════════════════════════════════
  console.log('\n👥 جاري إنشاء مجموعات العملاء...');

  const customerGroups = [
    { code: 'WHOLESALE', name_ar: 'تجار الجملة', name_en: 'Wholesale', discount_percent: 10, credit_limit: 100000, payment_terms_days: 30 },
    { code: 'RETAIL', name_ar: 'تجار التجزئة', name_en: 'Retail', discount_percent: 5, credit_limit: 20000, payment_terms_days: 15 },
    { code: 'VIP', name_ar: 'عملاء VIP', name_en: 'VIP Customers', discount_percent: 15, credit_limit: 200000, payment_terms_days: 45 },
  ];

  const customerGroupIds = {};

  for (const group of customerGroups) {
    const { data, error } = await supabase
      .from('customer_groups')
      .upsert({ tenant_id, ...group, is_active: true }, { onConflict: 'tenant_id,code' })
      .select()
      .single();
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء مجموعة ${group.code}:`, error.message);
    } else {
      customerGroupIds[group.code] = data?.id;
      console.log(`✅ ${group.code} - ${group.name_ar}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. Create Customers
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🧑‍💼 جاري إنشاء العملاء...');

  const customers = [
    { code: 'CUST-001', name_ar: 'شركة النسيج الذهبي', name_en: 'Golden Textile Co.', customer_type: 'company', email: 'info@goldentextile.ua', phone: '+380441234567', country: 'Ukraine', city: 'Kyiv', group_id: customerGroupIds['WHOLESALE'], currency: 'UAH', credit_limit: 150000 },
    { code: 'CUST-002', name_ar: 'مصنع الأقمشة المتحدة', name_en: 'United Fabrics', customer_type: 'company', email: 'sales@unitedfabrics.ua', phone: '+380442345678', country: 'Ukraine', city: 'Kharkiv', group_id: customerGroupIds['WHOLESALE'], currency: 'UAH', credit_limit: 200000 },
    { code: 'CUST-003', name_ar: 'محل أقمشة الزهور', name_en: 'Flowers Fabric Shop', customer_type: 'company', email: 'flowers@shop.ua', phone: '+380443456789', country: 'Ukraine', city: 'Kyiv', group_id: customerGroupIds['RETAIL'], currency: 'UAH', credit_limit: 30000 },
    { code: 'CUST-004', name_ar: 'بوتيك الأناقة', name_en: 'Elegance Boutique', customer_type: 'company', email: 'info@elegance.ua', phone: '+380444567890', country: 'Ukraine', city: 'Lviv', group_id: customerGroupIds['RETAIL'], currency: 'UAH', credit_limit: 25000 },
    { code: 'CUST-005', name_ar: 'مجموعة الأزياء الراقية', name_en: 'Premium Fashion', customer_type: 'company', email: 'vip@premium.ua', phone: '+380445678901', country: 'Ukraine', city: 'Kyiv', group_id: customerGroupIds['VIP'], currency: 'EUR', credit_limit: 100000 },
  ];

  for (const cust of customers) {
    const { error } = await supabase
      .from('customers')
      .upsert({
        tenant_id,
        company_id,
        ...cust,
        receivable_account_id: createdAccounts['1201'],
        status: 'active',
      }, { onConflict: 'tenant_id,code' });
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء العميل ${cust.code}:`, error.message);
    } else {
      console.log(`✅ ${cust.code} - ${cust.name_ar}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. Create Supplier Groups
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📦 جاري إنشاء مجموعات الموردين...');

  const supplierGroups = [
    { code: 'LOCAL', name_ar: 'موردين محليين', name_en: 'Local Suppliers', payment_terms_days: 30 },
    { code: 'IMPORT', name_ar: 'موردين استيراد', name_en: 'Import Suppliers', payment_terms_days: 60 },
  ];

  const supplierGroupIds = {};

  for (const group of supplierGroups) {
    const { data, error } = await supabase
      .from('supplier_groups')
      .upsert({ tenant_id, ...group, is_active: true }, { onConflict: 'tenant_id,code' })
      .select()
      .single();
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء مجموعة ${group.code}:`, error.message);
    } else {
      supplierGroupIds[group.code] = data?.id;
      console.log(`✅ ${group.code} - ${group.name_ar}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. Create Suppliers
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🏭 جاري إنشاء الموردين...');

  const suppliers = [
    { code: 'SUPP-001', name_ar: 'مصنع النسيج الأوكراني', name_en: 'Ukrainian Textile Mill', supplier_type: 'company', email: 'sales@utm.ua', phone: '+380441111111', country: 'Ukraine', city: 'Kharkiv', group_id: supplierGroupIds['LOCAL'], currency: 'UAH', payment_terms_days: 30 },
    { code: 'SUPP-002', name_ar: 'شركة الألياف المتقدمة', name_en: 'Advanced Fibers Co.', supplier_type: 'company', email: 'info@afc.ua', phone: '+380442222222', country: 'Ukraine', city: 'Dnipro', group_id: supplierGroupIds['LOCAL'], currency: 'UAH', payment_terms_days: 45 },
    { code: 'SUPP-003', name_ar: 'مصانع بورصة للنسيج', name_en: 'Bursa Textile Mills', supplier_type: 'company', email: 'export@btm.com.tr', phone: '+902241234567', country: 'Turkey', city: 'Bursa', group_id: supplierGroupIds['IMPORT'], currency: 'USD', payment_terms_days: 60 },
    { code: 'SUPP-004', name_ar: 'مصانع قوانغدونغ', name_en: 'Guangdong Factory', supplier_type: 'company', email: 'export@gtf.cn', phone: '+8675512345678', country: 'China', city: 'Guangzhou', group_id: supplierGroupIds['IMPORT'], currency: 'USD', payment_terms_days: 90 },
    { code: 'SUPP-005', name_ar: 'مصانع مومباي للقطن', name_en: 'Mumbai Cotton Mills', supplier_type: 'company', email: 'export@mcm.in', phone: '+912212345678', country: 'India', city: 'Mumbai', group_id: supplierGroupIds['IMPORT'], currency: 'USD', payment_terms_days: 60 },
  ];

  for (const supp of suppliers) {
    const { error } = await supabase
      .from('suppliers')
      .upsert({
        tenant_id,
        company_id,
        ...supp,
        payable_account_id: createdAccounts['2101'],
        status: 'active',
      }, { onConflict: 'tenant_id,code' });
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء المورد ${supp.code}:`, error.message);
    } else {
      console.log(`✅ ${supp.code} - ${supp.name_ar}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. Create Fabric Colors
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🎨 جاري إنشاء الألوان...');

  const colors = [
    { code: 'WHITE', name_ar: 'أبيض', name_en: 'White', hex_color: '#FFFFFF', color_family: 'neutral' },
    { code: 'BLACK', name_ar: 'أسود', name_en: 'Black', hex_color: '#000000', color_family: 'neutral' },
    { code: 'RED', name_ar: 'أحمر', name_en: 'Red', hex_color: '#FF0000', color_family: 'warm' },
    { code: 'BLUE', name_ar: 'أزرق', name_en: 'Blue', hex_color: '#0000FF', color_family: 'cool' },
    { code: 'GREEN', name_ar: 'أخضر', name_en: 'Green', hex_color: '#00FF00', color_family: 'cool' },
    { code: 'BEIGE', name_ar: 'بيج', name_en: 'Beige', hex_color: '#F5F5DC', color_family: 'neutral' },
    { code: 'NAVY', name_ar: 'كحلي', name_en: 'Navy Blue', hex_color: '#000080', color_family: 'cool' },
    { code: 'GRAY', name_ar: 'رمادي', name_en: 'Gray', hex_color: '#808080', color_family: 'neutral' },
    { code: 'BROWN', name_ar: 'بني', name_en: 'Brown', hex_color: '#8B4513', color_family: 'warm' },
    { code: 'BURGUNDY', name_ar: 'خمري', name_en: 'Burgundy', hex_color: '#800020', color_family: 'warm' },
    { code: 'CREAM', name_ar: 'كريمي', name_en: 'Cream', hex_color: '#FFFDD0', color_family: 'neutral' },
    { code: 'PINK', name_ar: 'وردي', name_en: 'Pink', hex_color: '#FFC0CB', color_family: 'warm' },
  ];

  const colorIds = {};

  for (const color of colors) {
    const { data, error } = await supabase
      .from('fabric_colors')
      .upsert({ tenant_id, ...color, is_active: true }, { onConflict: 'tenant_id,code' })
      .select()
      .single();
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء اللون ${color.code}:`, error.message);
    } else {
      colorIds[color.code] = data?.id;
      console.log(`✅ ${color.code} - ${color.name_ar} (${color.hex_color})`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. Create Fabric Groups
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📁 جاري إنشاء مجموعات الأقمشة...');

  const fabricGroups = [
    { code: 'COTTON', name_ar: 'قطن', name_en: 'Cotton', icon: '🧵', description: 'أقمشة قطنية طبيعية', display_order: 1 },
    { code: 'POLYESTER', name_ar: 'بوليستر', name_en: 'Polyester', icon: '✨', description: 'أقمشة بوليستر صناعية', display_order: 2 },
    { code: 'SILK', name_ar: 'حرير', name_en: 'Silk', icon: '🦋', description: 'أقمشة حريرية فاخرة', display_order: 3 },
    { code: 'LINEN', name_ar: 'كتان', name_en: 'Linen', icon: '🌿', description: 'أقمشة كتانية طبيعية', display_order: 4 },
    { code: 'WOOL', name_ar: 'صوف', name_en: 'Wool', icon: '🐑', description: 'أقمشة صوفية', display_order: 5 },
  ];

  const fabricGroupIds = {};

  for (const group of fabricGroups) {
    const { data, error } = await supabase
      .from('fabric_groups')
      .upsert({ tenant_id, ...group, is_active: true }, { onConflict: 'tenant_id,code' })
      .select()
      .single();
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء مجموعة ${group.code}:`, error.message);
    } else {
      fabricGroupIds[group.code] = data?.id;
      console.log(`✅ ${group.code} - ${group.name_ar} ${group.icon}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. Create Fabric Materials
  // ═══════════════════════════════════════════════════════════════
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

  const materialIds = {};

  for (const mat of materials) {
    if (!mat.group_id) {
      console.warn(`⚠️ تخطي ${mat.code} - لم يتم العثور على المجموعة`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('fabric_materials')
      .upsert({
        tenant_id,
        company_id,
        ...mat,
        unit: 'meter',
        category: 'woven',
        status: 'active',
      }, { onConflict: 'tenant_id,code' })
      .select()
      .single();
    
    if (error) {
      console.warn(`⚠️ خطأ في إنشاء المادة ${mat.code}:`, error.message);
    } else {
      materialIds[mat.code] = data?.id;
      console.log(`✅ ${mat.code} - ${mat.name_ar} (${mat.selling_price} ${mat.currency}/متر)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. Link Materials with Colors
  // ═══════════════════════════════════════════════════════════════
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

  let linkCount = 0;
  for (const link of materialColorLinks) {
    const materialId = materialIds[link.material];
    if (!materialId) continue;
    
    for (const colorCode of link.colors) {
      const colorId = colorIds[colorCode];
      if (!colorId) continue;
      
      const { error } = await supabase
        .from('fabric_material_colors')
        .upsert({
          tenant_id,
          material_id: materialId,
          color_id: colorId,
          is_available: true,
        }, { onConflict: 'material_id,color_id' });
      
      if (!error) linkCount++;
    }
  }
  console.log(`✅ تم ربط ${linkCount} لون بالأقمشة`);

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('✅ تم إنشاء البيانات التجريبية بنجاح!');
  console.log('═'.repeat(60));
  console.log('📊 الملخص:');
  console.log(`   - الحسابات المحاسبية: ${accounts.length}`);
  console.log(`   - الصناديق والبنوك: ${funds.length} (UAH, USD, EUR)`);
  console.log(`   - مجموعات العملاء: ${customerGroups.length}`);
  console.log(`   - العملاء: ${customers.length}`);
  console.log(`   - مجموعات الموردين: ${supplierGroups.length}`);
  console.log(`   - الموردين: ${suppliers.length}`);
  console.log(`   - الألوان: ${colors.length}`);
  console.log(`   - مجموعات الأقمشة: ${fabricGroups.length}`);
  console.log(`   - مواد الأقمشة: ${materials.length}`);
  console.log(`   - روابط الألوان-الأقمشة: ${linkCount}`);
  console.log('═'.repeat(60));
  console.log('🔄 قم بتحديث الصفحة لرؤية البيانات الجديدة');

})();
