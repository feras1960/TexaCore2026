-- =====================================================
-- AUDIT_2_issues.sql - المشاكل والتناقضات
-- =====================================================

SELECT 
    CASE 
        WHEN issue_type = 'no_pk' THEN '🔴 بدون Primary Key'
        WHEN issue_type = 'no_created' THEN '🟡 بدون created_at'
        WHEN issue_type = 'no_updated' THEN '🟡 بدون updated_at'
        WHEN issue_type = 'no_tenant_idx' THEN '🟠 tenant_id بدون فهرس'
        WHEN issue_type = 'no_company_idx' THEN '🟠 company_id بدون فهرس'
        WHEN issue_type = 'no_indexes' THEN '🔴 بدون أي فهارس'
    END as "المشكلة",
    table_name as "الجدول"
FROM (
    -- بدون Primary Key
    SELECT 'no_pk' as issue_type, t.tablename as table_name
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc WHERE tc.table_schema = 'public' AND tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY')
    
    UNION ALL
    
    -- بدون created_at
    SELECT 'no_created', t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tablename AND c.column_name = 'created_at')
    
    UNION ALL
    
    -- بدون updated_at
    SELECT 'no_updated', t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tablename AND c.column_name = 'updated_at')
    
    UNION ALL
    
    -- tenant_id بدون فهرس
    SELECT 'no_tenant_idx', c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
      AND NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = c.table_name AND i.indexdef LIKE '%tenant_id%')
    
    UNION ALL
    
    -- company_id بدون فهرس
    SELECT 'no_company_idx', c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
      AND NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = c.table_name AND i.indexdef LIKE '%company_id%')
    
    UNION ALL
    
    -- بدون فهارس
    SELECT 'no_indexes', t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = t.tablename)
) issues
ORDER BY issue_type, table_name;
