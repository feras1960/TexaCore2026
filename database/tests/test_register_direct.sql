-- ═══════════════════════════════════════════════════════════════
-- 🧪 اختبار دالة register_new_subscriber مباشرة
-- ═══════════════════════════════════════════════════════════════

-- نسخ هذا الكود وشغّله في Supabase SQL Editor
-- استبدل YOUR_USER_ID بـ user_id الحقيقي من جدول auth.users

SELECT register_new_subscriber(
  'YOUR_USER_ID_HERE'::UUID,  -- ضع user_id من auth.users هنا
  'test@example.com',
  'Test User',
  'Test Company',
  '+966501234567',
  'general',  -- نوع العمل
  'SAR',      -- العملة
  'SA'        -- كود الدولة
);

-- ═══════════════════════════════════════════════════════════════
-- للحصول على user_id الخاص بك، نفّذ هذا أولاً:
-- ═══════════════════════════════════════════════════════════════

-- SELECT 
--   id AS user_id,
--   email
-- FROM auth.users
-- WHERE email = 'feras1960@gmail.com';  -- ضع إيميلك هنا

-- ═══════════════════════════════════════════════════════════════
-- النتيجة المتوقعة:
-- ═══════════════════════════════════════════════════════════════
-- {
--   "success": true,
--   "tenant_id": "xxx-xxx-xxx",
--   "company_id": "xxx-xxx-xxx",
--   "business_type": "general",
--   "message": "تم التسجيل بنجاح"
-- }
