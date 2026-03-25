-- =====================================================
-- FIX_duplicate_currencies.sql
-- إزالة العملات المكررة من جدول currencies
-- =====================================================

-- 1. عرض العملات المكررة
SELECT code, COUNT(*) as count
FROM currencies 
GROUP BY code 
HAVING COUNT(*) > 1;

-- 2. حذف المكررات (احتفاظ بالأول)
DELETE FROM currencies a
USING currencies b
WHERE a.id > b.id AND a.code = b.code;

-- 3. إضافة قيد UNIQUE على code لمنع التكرار
ALTER TABLE currencies 
ADD CONSTRAINT currencies_code_unique UNIQUE (code);

-- 4. التحقق
SELECT COUNT(*) as total_currencies FROM currencies;
SELECT '✅ تم إزالة العملات المكررة!' as result;
