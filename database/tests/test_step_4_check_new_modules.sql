-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 4: التحقق من الموديولات الجديدة (fabric + component_lab)
-- ═══════════════════════════════════════════════════════════════════════════
-- نفذ هذا الاستعلام بعد نجاح الخطوة 3

SELECT 
    module_code,
    name_ar,
    name_en,
    category,
    is_active,
    is_beta
FROM modules
WHERE module_code IN ('fabric', 'component_lab');

-- ═══════════════════════════════════════════════════════════════════════════
-- المتوقع: صفين (2 rows)
-- ═══════════════════════════════════════════════════════════════════════════
-- Row 1:
--   module_code: fabric
--   name_ar: إدارة الأقمشة
--   name_en: Fabric Management
--   category: operations
--   is_active: true
--
-- Row 2:
--   module_code: component_lab
--   name_ar: مختبر المكونات
--   name_en: Component Lab
--   category: development
--   is_active: true
--   is_beta: true
--
-- ✅ إذا ظهر الصفين، انتقل للخطوة 5
