-- ═══════════════════════════════════════════════════
-- 🔧 إعادة حالة الفاتورة إلى مسودة
-- نفذ هذا في Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. أولاً: تحقق من الحالة الحالية
SELECT id, stage, is_posted, posted_at, invoice_no, draft_no, customer_name, total_amount
FROM sales_transactions 
WHERE id = '0af7c63c-73e8-4495-8612-d0cdf5def18b';

-- 2. إعادة الحالة لمسودة
UPDATE sales_transactions 
SET 
    stage = 'draft',
    is_posted = false,
    posted_at = NULL
WHERE id = '0af7c63c-73e8-4495-8612-d0cdf5def18b';

-- 3. تحقق مرة أخرى
SELECT id, stage, is_posted, customer_name 
FROM sales_transactions 
WHERE id = '0af7c63c-73e8-4495-8612-d0cdf5def18b';

-- ═══════════════════════════════════════════════════
-- 🔍 فحص الأعمدة الفعلية في جدول customers
-- (لتشخيص أخطاء 400)
-- ═══════════════════════════════════════════════════

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 🔍 فحص الأعمدة الفعلية في جدول price_lists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'price_lists' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 🔍 فحص الأعمدة الفعلية في جدول customer_groups
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_groups' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 🔍 تحقق من وجود جدول sales_transaction_items
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_transaction_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;
