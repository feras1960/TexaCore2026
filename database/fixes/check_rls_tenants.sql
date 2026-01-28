-- فحص صلاحيات جدول tenants
-- 1. هل RLS مفعل؟
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tenants';

-- 2. ما هي السياسات (Policies) الموجودة؟
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tenants';

-- 3. اختبار بسيط - هل يمكن قراءة البيانات؟
SELECT COUNT(*) as total_tenants FROM tenants;

-- 4. اختبار مع الشرط المستخدم في الكود
SELECT COUNT(*) as filtered_tenants 
FROM tenants 
WHERE status IN ('active', 'trial', 'pending', 'suspended');

-- 5. عرض أول 3 صفوف
SELECT 
    id, 
    name, 
    code, 
    status,
    product_id
FROM tenants 
LIMIT 3;
