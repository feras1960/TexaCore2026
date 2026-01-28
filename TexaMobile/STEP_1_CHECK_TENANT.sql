-- ========================================
-- ✅ الخطوة 1: فحص الـ Tenant (مُصحَّح)
-- انسخ هذا السطر فقط ← الصق في SQL Editor ← اضغط Run
-- ========================================

SELECT id, name, status FROM tenants WHERE status = 'active' LIMIT 5;
