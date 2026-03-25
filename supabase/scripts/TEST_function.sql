-- اختبار الدالة مع المستخدم الجديد
-- أولاً: الحصول على ID المستخدم الجديد testaco@test.com
SELECT id, email FROM auth.users WHERE email = 'testaco@test.com';

-- ثم نختبر الدالة معه (ضع الـ ID في الاستعلام التالي)
