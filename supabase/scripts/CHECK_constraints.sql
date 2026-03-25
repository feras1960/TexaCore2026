-- فحص constraints على user_role_assignments
SELECT 
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_role_assignments'::regclass;

-- فحص الـ indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_role_assignments';
