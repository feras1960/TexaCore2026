-- ══════════════════════════════════════════════════════════════
-- 🔧 Fix: ربط حسابات الكونتينرات الموجودة بجدول containers
-- ══════════════════════════════════════════════════════════════
-- المشكلة: الحسابات موجودة في chart_of_accounts لكن 
--          containers.container_account_id = NULL
-- الحل: ربط كل كونتينر بحسابه الفرعي تحت 1143
-- ══════════════════════════════════════════════════════════════

-- خطوة 1: التشخيص — عرض الحالة الحالية
SELECT 
    c.id,
    c.container_number,
    c.container_account_id,
    ca.account_code AS linked_account_code,
    ca.name_ar AS linked_account_name
FROM containers c
LEFT JOIN chart_of_accounts ca ON ca.id = c.container_account_id
ORDER BY c.created_at;

-- خطوة 2: البحث عن الحسابات الموجودة في الشجرة ولكن غير مربوطة
SELECT 
    ca.id AS account_id,
    ca.account_code,
    ca.name_ar,
    ca.name_en,
    c.id AS container_id,
    c.container_number,
    c.container_account_id AS current_link
FROM chart_of_accounts ca
JOIN chart_of_accounts parent ON ca.parent_id = parent.id AND parent.account_code = '1143'
LEFT JOIN containers c ON ca.name_ar LIKE '%' || c.container_number || '%'
                       OR ca.name_en LIKE '%' || c.container_number || '%'
ORDER BY ca.account_code;

-- خطوة 3: الربط الفعلي — تحديث container_account_id
UPDATE containers c
SET container_account_id = sub.account_id
FROM (
    SELECT 
        ca.id AS account_id,
        ca.account_code,
        ca.name_ar,
        cont.id AS container_id,
        cont.container_number
    FROM chart_of_accounts ca
    JOIN chart_of_accounts parent ON ca.parent_id = parent.id 
        AND parent.account_code = '1143'
        AND parent.company_id = ca.company_id
    JOIN containers cont ON (
        ca.name_ar LIKE '%' || cont.container_number || '%'
        OR ca.name_en LIKE '%' || cont.container_number || '%'
    )
    WHERE cont.container_account_id IS NULL
) sub
WHERE c.id = sub.container_id;

-- خطوة 4: التحقق بعد الربط
SELECT 
    c.container_number,
    c.container_account_id,
    ca.account_code,
    ca.name_ar,
    CASE WHEN c.container_account_id IS NOT NULL THEN '✅ مربوط' ELSE '❌ غير مربوط' END AS status
FROM containers c
LEFT JOIN chart_of_accounts ca ON ca.id = c.container_account_id
ORDER BY c.created_at;
