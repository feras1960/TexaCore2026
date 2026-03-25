-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 AUDIT & ROLLBACK: Identify and remove yesterday's policies
-- مراجعة وتراجع: معرفة وحذف سياسات البارحة
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Identify policies created yesterday (by name pattern)
-- ═══════════════════════════════════════════════════════════════════════════

-- السياسات التي أنشأناها لها أنماط معينة:
-- Pattern 1: tablename_read, tablename_write
-- Pattern 2: auth_read, auth_all
-- Pattern 3: coa_read, je_read, etc.

SELECT 
    '⚠️ السياسات التي سيتم حذفها (من البارحة):' as warning;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN policyname LIKE '%_read' THEN '🔵 READ policy'
        WHEN policyname LIKE '%_write' THEN '🟠 WRITE policy'
        WHEN policyname LIKE 'auth_%' THEN '🟡 AUTH policy'
        WHEN policyname LIKE 'temp_%' THEN '🟣 TEMP policy'
        ELSE '⚪ OTHER'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    -- Patterns from yesterday's scripts
    policyname LIKE '%_read'
    OR policyname LIKE '%_write'
    OR policyname LIKE 'auth_%'
    OR policyname LIKE 'temp_%'
    OR policyname LIKE 'coa_%'
    OR policyname LIKE 'je_%'
    OR policyname LIKE 'jel_%'
    OR policyname LIKE 'fy_%'
    OR policyname LIKE 'cc_%'
    OR policyname LIKE 'customers_%'
    OR policyname LIKE 'suppliers_%'
    OR policyname LIKE 'products_%'
    OR policyname LIKE 'warehouses_%'
    OR policyname LIKE 'inv_mov_%'
    OR policyname LIKE 'sales_inv_%'
    OR policyname LIKE 'purch_inv_%'
    OR policyname LIKE 'pay_rec_%'
    OR policyname LIKE 'pay_vouch_%'
    OR policyname LIKE 'exch_%'
    OR policyname LIKE 'curr_%'
    OR policyname LIKE 'funds_%'
    OR policyname LIKE 'branches_%'
)
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Count policies to be removed
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 إحصائيات:' as info,
    COUNT(*) as policies_to_remove
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    policyname LIKE '%_read'
    OR policyname LIKE '%_write'
    OR policyname LIKE 'auth_%'
    OR policyname LIKE 'temp_%'
    OR policyname LIKE 'coa_%'
    OR policyname LIKE 'je_%'
    OR policyname LIKE 'jel_%'
    OR policyname LIKE 'fy_%'
    OR policyname LIKE 'cc_%'
    OR policyname LIKE 'customers_%'
    OR policyname LIKE 'suppliers_%'
    OR policyname LIKE 'products_%'
    OR policyname LIKE 'warehouses_%'
    OR policyname LIKE 'inv_mov_%'
    OR policyname LIKE 'sales_inv_%'
    OR policyname LIKE 'purch_inv_%'
    OR policyname LIKE 'pay_rec_%'
    OR policyname LIKE 'pay_vouch_%'
    OR policyname LIKE 'exch_%'
    OR policyname LIKE 'curr_%'
    OR policyname LIKE 'funds_%'
    OR policyname LIKE 'branches_%'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ STOP HERE FIRST! Review the above results before proceeding!
-- ⚠️ توقف هنا أولاً! راجع النتائج أعلاه قبل المتابعة!
-- ═══════════════════════════════════════════════════════════════════════════

-- If you want to DELETE these policies, uncomment and run STEP 3 below:

/*
-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: DELETE yesterday's policies (UNCOMMENT TO EXECUTE)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    pol RECORD;
    deleted_count INT := 0;
BEGIN
    FOR pol IN 
        SELECT tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND (
            policyname LIKE '%_read'
            OR policyname LIKE '%_write'
            OR policyname LIKE 'auth_%'
            OR policyname LIKE 'temp_%'
            OR policyname LIKE 'coa_%'
            OR policyname LIKE 'je_%'
            OR policyname LIKE 'jel_%'
            OR policyname LIKE 'fy_%'
            OR policyname LIKE 'cc_%'
            OR policyname LIKE 'customers_%'
            OR policyname LIKE 'suppliers_%'
            OR policyname LIKE 'products_%'
            OR policyname LIKE 'warehouses_%'
            OR policyname LIKE 'inv_mov_%'
            OR policyname LIKE 'sales_inv_%'
            OR policyname LIKE 'purch_inv_%'
            OR policyname LIKE 'pay_rec_%'
            OR policyname LIKE 'pay_vouch_%'
            OR policyname LIKE 'exch_%'
            OR policyname LIKE 'curr_%'
            OR policyname LIKE 'funds_%'
            OR policyname LIKE 'branches_%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'Deleted: % on %', pol.policyname, pol.tablename;
    END LOOP;
    
    RAISE NOTICE '✅ Total deleted: %', deleted_count;
END $$;

-- Reload schema
NOTIFY pgrst, 'reload schema';

SELECT '✅ ROLLBACK COMPLETE! Deleted yesterday policies.' as status;
*/
