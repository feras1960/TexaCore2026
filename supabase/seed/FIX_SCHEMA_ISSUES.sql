-- ═══════════════════════════════════════════════════════════════
-- 🔧 إصلاح المشاكل المكتشفة في قاعدة البيانات
-- FIX DISCOVERED SCHEMA ISSUES
-- Date: 2026-02-11 | Source: DATABASE_SCHEMA_REFERENCE.md
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 🔴 مشكلة 1: FK مكرر على shipments.supplier_id
-- يوجد constraintين لنفس العلاقة:
--   - shipments_supplier_id_fkey
--   - fk_shipments_supplier
-- الحل: حذف المكرر والإبقاء على الرسمي
-- ═══════════════════════════════════════════════════════════════

-- أولاً: نتحقق من وجود المشكلة
SELECT 'BEFORE FIX' AS stage, conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'shipments'::regclass 
  AND contype = 'f' 
  AND conname ILIKE '%supplier%';

-- حذف FK المكرر (نحتفظ بالاسم الرسمي shipments_supplier_id_fkey)
ALTER TABLE shipments 
  DROP CONSTRAINT IF EXISTS fk_shipments_supplier;

-- التحقق بعد الإصلاح
SELECT 'AFTER FIX' AS stage, conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'shipments'::regclass 
  AND contype = 'f' 
  AND conname ILIKE '%supplier%';


-- ═══════════════════════════════════════════════════════════════
-- 🟡 مشكلة 2: جدول uom مكرر مع units_of_measure
-- التحقق: هل جدول uom فارغ أو مستخدم؟
-- ═══════════════════════════════════════════════════════════════

-- نتحقق من المحتوى
SELECT 'uom (OLD)' AS "الجدول", COUNT(*) AS "السجلات" FROM uom
UNION ALL
SELECT 'units_of_measure (NEW)', COUNT(*) FROM units_of_measure;

-- نتحقق: هل أي كود يشير لجدول uom؟
-- إذا فارغ → آمن للحذف
-- إذا يحتوي بيانات → ننقلها أولاً

-- خطوة 1: نقل البيانات من uom إلى units_of_measure (إن وجدت)
DO $$
DECLARE
    v_uom_count INTEGER;
    v_tenant_id UUID;
BEGIN
    SELECT COUNT(*) INTO v_uom_count FROM uom;
    
    IF v_uom_count > 0 THEN
        -- نأخذ أول tenant للنقل
        SELECT id INTO v_tenant_id FROM tenants WHERE status = 'active' LIMIT 1;
        IF v_tenant_id IS NULL THEN
            SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
        END IF;
        
        -- ننقل البيانات الغير موجودة
        INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, type)
        SELECT 
            v_tenant_id, 
            u.code, 
            COALESCE(u.name_ar, u.name, u.code),
            u.name,  -- uom has no name_en, use name
            COALESCE(u.uom_type, 'quantity')
        FROM uom u
        WHERE NOT EXISTS (
            SELECT 1 FROM units_of_measure um 
            WHERE um.code = u.code AND um.tenant_id = v_tenant_id
        );
        
        RAISE NOTICE '✅ Migrated % records from uom → units_of_measure', v_uom_count;
    ELSE
        RAISE NOTICE '✅ uom table is empty — safe to ignore';
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 🟡 مشكلة 3: containers (قديم) vs shipments (جديد)
-- هنا نتحقق فقط — لا نحذف
-- ═══════════════════════════════════════════════════════════════

SELECT 'containers (OLD)' AS "النظام", COUNT(*) AS "السجلات" FROM containers
UNION ALL
SELECT 'container_items (OLD)', COUNT(*) FROM container_items
UNION ALL
SELECT 'container_expenses (OLD)', COUNT(*) FROM container_expenses
UNION ALL
SELECT '---', 0
UNION ALL
SELECT 'shipments (NEW) ✅', COUNT(*) FROM shipments
UNION ALL
SELECT 'shipment_items (NEW) ✅', COUNT(*) FROM shipment_items
UNION ALL
SELECT 'transit_reservations ✅', COUNT(*) FROM transit_reservations;

-- ✅ توصية: إذا containers فارغ → يمكن حذفه لاحقاً
-- ⚠️ إذا containers يحتوي بيانات → يجب ترحيلها أولاً


-- ═══════════════════════════════════════════════════════════════
-- 📊 ملخص — SUMMARY
-- ═══════════════════════════════════════════════════════════════
SELECT '1. FK المكرر' AS "المشكلة", 'تم الإصلاح ✅' AS "الحالة"
UNION ALL
SELECT '2. جدول uom المكرر', 'تم نقل البيانات (إن وجدت) ✅'
UNION ALL
SELECT '3. containers القديم', 'يحتاج مراجعة — تحقق من النتائج أعلاه ⚠️';
