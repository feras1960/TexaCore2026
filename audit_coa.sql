-- ═══════════════════════════════════════════════════════════════════════════
-- استعلامات تدقيق الشجرة المحاسبية
-- Chart of Accounts Audit Queries
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. عرض جميع قوالب الشجرات المتاحة
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== قوالب الشجرات المحاسبية ===' as section;

SELECT 
    template_code,
    template_name_ar,
    template_name_en,
    chart_type,
    include_demo_data,
    is_active
FROM chart_templates
WHERE tenant_id = (SELECT id FROM tenants WHERE is_active = true LIMIT 1)
ORDER BY 
    CASE chart_type 
        WHEN 'simple' THEN 1
        WHEN 'extended' THEN 2
        WHEN 'fabric_extended' THEN 3
    END;

-- ═══════════════════════════════════════════════════════════════
-- 2. إحصائيات الشجرة المحاسبية للشركة النشطة
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== إحصائيات الشجرة المحاسبية ===' as section;

SELECT 
    c.name_ar as company_name,
    c.chart_type,
    COUNT(DISTINCT coa.id) as total_accounts,
    COUNT(DISTINCT CASE WHEN coa.is_group THEN coa.id END) as groups_count,
    COUNT(DISTINCT CASE WHEN NOT coa.is_group THEN coa.id END) as detail_accounts,
    COUNT(DISTINCT CASE WHEN coa.account_type_code = 'ASSET' THEN coa.id END) as assets,
    COUNT(DISTINCT CASE WHEN coa.account_type_code = 'LIABILITY' THEN coa.id END) as liabilities,
    COUNT(DISTINCT CASE WHEN coa.account_type_code = 'EQUITY' THEN coa.id END) as equity,
    COUNT(DISTINCT CASE WHEN coa.account_type_code = 'REVENUE' THEN coa.id END) as revenue,
    COUNT(DISTINCT CASE WHEN coa.account_type_code = 'EXPENSE' THEN coa.id END) as expenses
FROM companies c
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.name_ar, c.chart_type;

-- ═══════════════════════════════════════════════════════════════
-- 3. تحليل أطوال أكواد الحسابات (للتحقق من نظام الترقيم)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== تحليل أطوال أكواد الحسابات ===' as section;

SELECT 
    LENGTH(account_code) as code_length,
    COUNT(*) as count,
    CASE 
        WHEN LENGTH(account_code) = 3 THEN 'نظام قديم (3 أرقام)'
        WHEN LENGTH(account_code) = 4 THEN 'نظام قياسي (4 أرقام)'
        WHEN LENGTH(account_code) = 7 THEN 'نظام موسع (7 أرقام) ✅'
        ELSE 'غير قياسي'
    END as code_system,
    STRING_AGG(account_code || ' - ' || name_ar, ', ' ORDER BY account_code) as examples
FROM chart_of_accounts
WHERE company_id = (SELECT id FROM companies WHERE is_active = true LIMIT 1)
GROUP BY LENGTH(account_code)
ORDER BY code_length;

-- ═══════════════════════════════════════════════════════════════
-- 4. عرض الحسابات النقدية (للتحقق من الحاجة للترحيل)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== الحسابات النقدية والبنكية ===' as section;

SELECT 
    account_code,
    name_ar,
    name_en,
    is_group,
    current_balance,
    LENGTH(account_code) as code_length
FROM chart_of_accounts
WHERE company_id = (SELECT id FROM companies WHERE is_active = true LIMIT 1)
  AND (account_code LIKE '111%' OR account_code LIKE '112%')
ORDER BY account_code;

-- ═══════════════════════════════════════════════════════════════
-- 5. فحص مراكز التكلفة
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== مراكز التكلفة ===' as section;

SELECT 
    code,
    name_ar,
    name_en,
    is_active,
    (SELECT COUNT(*) FROM journal_entry_lines WHERE cost_center_id = cc.id) as usage_count
FROM cost_centers cc
WHERE company_id = (SELECT id FROM companies WHERE is_active = true LIMIT 1)
ORDER BY code;

-- ═══════════════════════════════════════════════════════════════
-- 6. عرض الشجرة الهرمية (أول 50 حساب)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== الشجرة الهرمية (عينة) ===' as section;

WITH RECURSIVE account_tree AS (
    SELECT 
        id,
        account_code,
        name_ar,
        is_group,
        parent_id,
        current_balance,
        0 as level,
        account_code::text as path
    FROM chart_of_accounts
    WHERE company_id = (SELECT id FROM companies WHERE is_active = true LIMIT 1)
      AND parent_id IS NULL
    
    UNION ALL
    
    SELECT 
        c.id,
        c.account_code,
        c.name_ar,
        c.is_group,
        c.parent_id,
        c.current_balance,
        p.level + 1,
        p.path || ' > ' || c.account_code
    FROM chart_of_accounts c
    INNER JOIN account_tree p ON c.parent_id = p.id
    WHERE p.level < 5
)
SELECT 
    REPEAT('  ', level) || account_code as hierarchy,
    name_ar,
    CASE WHEN is_group THEN 'مجموعة' ELSE 'حساب' END as type,
    current_balance
FROM account_tree
ORDER BY path
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════
-- 7. البحث عن حسابات العملاء والموردين (للتحقق من Sub-ledgers)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '=== حسابات العملاء والموردين ===' as section;

SELECT 
    account_code,
    name_ar,
    name_en,
    account_type_code,
    is_group,
    (SELECT COUNT(*) FROM customers WHERE receivable_account_id = coa.id) as customers_count,
    (SELECT COUNT(*) FROM suppliers WHERE payable_account_id = coa.id) as suppliers_count
FROM chart_of_accounts coa
WHERE company_id = (SELECT id FROM companies WHERE is_active = true LIMIT 1)
  AND (account_code LIKE '115%' OR account_code LIKE '211%')
ORDER BY account_code;
