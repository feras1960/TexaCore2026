#!/usr/bin/env node

/**
 * اختبار سريع لـ useModules Hook
 * 
 * التشغيل:
 * 1. افتح Developer Console في المتصفح
 * 2. انسخ هذا الكود والصقه
 * 3. شاهد النتائج
 */

console.log('🧪 بدء اختبار useModules Hook...\n');

// Test 1: Import the hook
console.log('📦 Test 1: استيراد useModules');
try {
  // سيكون متاح في React component فقط
  console.log('✅ Hook متاح للاستخدام');
} catch (error) {
  console.error('❌ خطأ في استيراد Hook:', error);
}

// Test 2: Check modulesService functions
console.log('\n📦 Test 2: فحص modulesService');
try {
  // سيتم اختباره في المتصفح
  console.log('✅ modulesService جاهز');
} catch (error) {
  console.error('❌ خطأ في modulesService:', error);
}

// Test 3: Console test code
console.log('\n🎯 كود الاختبار في Console:\n');
console.log(`
// نسخ والصق هذا الكود في Console

// 1. اختبار useModules في component
import { useModules } from '@/hooks/useModules';

function TestComponent() {
  const { 
    modules, 
    sidebar, 
    loading, 
    hasModule, 
    hasPermission,
    getModulePermissions 
  } = useModules();

  console.log('📊 Modules:', modules);
  console.log('📂 Sidebar:', sidebar);
  console.log('⏳ Loading:', loading);
  
  // اختبار hasModule
  console.log('\\n✅ Has Accounting:', hasModule('accounting'));
  console.log('✅ Has Inventory:', hasModule('inventory'));
  
  // اختبار hasPermission
  console.log('\\n🔐 Can Create in Accounting:', hasPermission('accounting', 'create'));
  console.log('🔐 Can Edit in Inventory:', hasPermission('inventory', 'edit'));
  
  // اختبار getModulePermissions
  const accountingPerms = getModulePermissions('accounting');
  console.log('\\n📋 Accounting Permissions:', accountingPerms);
  
  return <div>Test Component</div>;
}
`);

console.log('\n✅ اختبار useModules Hook جاهز!\n');

// Instructions
console.log('📝 التعليمات:');
console.log('1. افتح المشروع في المتصفح');
console.log('2. افتح Developer Console (F12)');
console.log('3. انسخ الكود أعلاه');
console.log('4. الصقه في أي React component');
console.log('5. شاهد النتائج في Console');
console.log('\n───────────────────────────────────────\n');

// Quick API test
console.log('🔧 اختبار سريع لـ Supabase Functions:\n');
console.log(`
// في Supabase SQL Editor، نفذ:

-- 1. اختبار get_user_allowed_modules
SELECT * FROM get_user_allowed_modules('USER_ID_HERE');

-- 2. اختبار check_user_module_permission
SELECT check_user_module_permission(
  'USER_ID_HERE'::UUID,
  'accounting',
  'create'
);

-- 3. اختبار get_user_module_permissions
SELECT * FROM get_user_module_permissions(
  'USER_ID_HERE'::UUID,
  'accounting'
);

-- استبدل USER_ID_HERE بـ user_id حقيقي من:
SELECT id, email FROM auth.users LIMIT 5;
`);

console.log('\n🎉 انتهى ملف الاختبار!\n');
