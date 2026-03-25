-- اختبار بسيط جداً
SELECT 
    id,
    email
FROM auth.users
WHERE id = '65a5c73b-bb93-4c84-8ba8-155079b8736c'::UUID;

-- إذا ظهرت النتيجة، الـ UUID صحيح ✅
-- إذا لم تظهر، الـ UUID خطأ ❌
