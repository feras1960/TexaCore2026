-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 تحليل نظام البراندات/المنتجات في SaaS
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ فحص جداول الاشتراكات والباقات
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE '%subscription%' OR tablename LIKE '%plan%' OR tablename LIKE '%product%' OR tablename LIKE '%saas%')
ORDER BY tablename;

-- 2️⃣ هيكل subscription_plans
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- 3️⃣ البيانات في subscription_plans
SELECT * FROM subscription_plans LIMIT 10;

-- 4️⃣ هل tenants مرتبط بـ product أو plan؟
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tenants'
AND (column_name LIKE '%product%' OR column_name LIKE '%plan%' OR column_name LIKE '%brand%');

-- 5️⃣ عرض tenants مع المنتج
SELECT id, name, code, product_id, status FROM tenants LIMIT 10;
