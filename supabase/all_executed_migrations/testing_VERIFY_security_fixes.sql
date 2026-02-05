-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 إعادة المسح الأمني - التحقق من الإصلاحات
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ ملخص حالة RLS
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    '📊 إحصائيات RLS' as "التقرير",
    COUNT(*) FILTER (WHERE rowsecurity = true) as "✅ RLS مفعل",
    COUNT(*) FILTER (WHERE rowsecurity = false) as "❌ RLS معطل",
    COUNT(*) as "إجمالي الجداول",
    ROUND(100.0 * COUNT(*) FILTER (WHERE rowsecurity = true) / COUNT(*), 1) as "نسبة التأمين %"
FROM pg_tables
WHERE schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ الجداول التي لا زالت بدون RLS
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    tablename as "الجدول",
    '❌ RLS معطل' as "الحالة"
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = false
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ الجداول التي لديها RLS بدون سياسات (المحجوبة)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    t.tablename as "الجدول",
    '⚠️ RLS بدون سياسات' as "التحذير"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ عدد السياسات لكل جدول مؤمَّن
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    t.tablename as "الجدول",
    COUNT(p.policyname) as "عدد السياسات",
    CASE 
        WHEN COUNT(p.policyname) >= 4 THEN '✅ مؤمن بالكامل'
        WHEN COUNT(p.policyname) > 0 THEN '⚠️ جزئي'
        ELSE '❌ بدون سياسات'
    END as "الحالة"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
GROUP BY t.tablename
ORDER BY COUNT(p.policyname) DESC, t.tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ التحقق من الجداول التي تم إصلاحها
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    tablename as "الجدول المُصلَح",
    CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as "RLS",
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as "عدد السياسات"
FROM pg_tables t
WHERE schemaname = 'public'
    AND tablename IN (
        'payment_receipts', 'payment_vouchers', 'sales_invoices', 'sales_invoice_items',
        'exchange_rates', 'account_transfers', 'bank_account_limits', 'inventory_movements',
        'funds', 'account_invoices', 'account_invoice_items', 'billing_payments',
        'currency_exchanges', 'customer_groups', 'supplier_groups', 'recurring_entry_templates',
        'recurring_entry_executions', 'reservations', 'reservation_items',
        'subscription_plans', 'system_modules', 'countries', 'country_configurations',
        'notifications', 'in_app_notifications'
    )
ORDER BY tablename;
