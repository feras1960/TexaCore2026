-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 تحليل الأقسام المنفذة على مستوى Backend
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ جميع الجداول مجمعة حسب القسم
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📋 ALL TABLES BY MODULE' as info,
    CASE 
        -- SaaS & Multi-Tenancy
        WHEN tablename LIKE '%tenant%' OR tablename LIKE '%brand%' OR tablename LIKE '%subscription%' THEN '🏢 SaaS/Multi-Tenancy'
        
        -- Users & Auth
        WHEN tablename LIKE '%user%' OR tablename LIKE '%role%' OR tablename LIKE '%permission%' OR tablename LIKE '%mfa%' OR tablename LIKE '%auth%' THEN '👤 Users & Auth'
        
        -- Companies
        WHEN tablename LIKE '%compan%' OR tablename LIKE '%branch%' THEN '🏭 Companies'
        
        -- Accounting
        WHEN tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%ledger%' OR tablename LIKE '%fiscal%' OR tablename LIKE '%cost_center%' THEN '📊 Accounting'
        
        -- Inventory/Warehouse
        WHEN tablename LIKE '%warehouse%' OR tablename LIKE '%inventor%' OR tablename LIKE '%stock%' OR tablename LIKE '%location%' OR tablename LIKE '%roll%' OR tablename LIKE '%fabric%' OR tablename LIKE '%batch%' THEN '📦 Warehouse/Inventory'
        
        -- Products
        WHEN tablename LIKE '%product%' OR tablename LIKE '%item%' OR tablename LIKE '%categor%' OR tablename LIKE '%unit%' THEN '🏷️ Products'
        
        -- Sales
        WHEN tablename LIKE '%sale%' OR tablename LIKE '%invoice%' OR tablename LIKE '%customer%' OR tablename LIKE '%order%' OR tablename LIKE '%quotation%' THEN '💰 Sales'
        
        -- Purchases
        WHEN tablename LIKE '%purchase%' OR tablename LIKE '%supplier%' OR tablename LIKE '%vendor%' THEN '🛒 Purchases'
        
        -- HR
        WHEN tablename LIKE '%employee%' OR tablename LIKE '%payroll%' OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%salary%' THEN '👥 HR'
        
        -- Treasury/Banking
        WHEN tablename LIKE '%bank%' OR tablename LIKE '%cash%' OR tablename LIKE '%payment%' OR tablename LIKE '%receipt%' OR tablename LIKE '%treasury%' THEN '🏦 Treasury/Banking'
        
        -- Currency
        WHEN tablename LIKE '%currenc%' OR tablename LIKE '%exchange%' THEN '💱 Currency'
        
        -- Audit & Logs
        WHEN tablename LIKE '%audit%' OR tablename LIKE '%log%' OR tablename LIKE '%history%' THEN '📝 Audit/Logs'
        
        -- Settings
        WHEN tablename LIKE '%setting%' OR tablename LIKE '%config%' OR tablename LIKE '%preference%' THEN '⚙️ Settings'
        
        -- Documents
        WHEN tablename LIKE '%document%' OR tablename LIKE '%attachment%' OR tablename LIKE '%file%' THEN '📄 Documents'
        
        ELSE '📁 Other'
    END as module,
    tablename as "الجدول"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY module, tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ إحصائيات حسب القسم
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 MODULE STATS' as info,
    CASE 
        WHEN tablename LIKE '%tenant%' OR tablename LIKE '%brand%' OR tablename LIKE '%subscription%' THEN '🏢 SaaS/Multi-Tenancy'
        WHEN tablename LIKE '%user%' OR tablename LIKE '%role%' OR tablename LIKE '%permission%' OR tablename LIKE '%mfa%' OR tablename LIKE '%auth%' THEN '👤 Users & Auth'
        WHEN tablename LIKE '%compan%' OR tablename LIKE '%branch%' THEN '🏭 Companies'
        WHEN tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%ledger%' OR tablename LIKE '%fiscal%' OR tablename LIKE '%cost_center%' THEN '📊 Accounting'
        WHEN tablename LIKE '%warehouse%' OR tablename LIKE '%inventor%' OR tablename LIKE '%stock%' OR tablename LIKE '%location%' OR tablename LIKE '%roll%' OR tablename LIKE '%fabric%' OR tablename LIKE '%batch%' THEN '📦 Warehouse/Inventory'
        WHEN tablename LIKE '%product%' OR tablename LIKE '%item%' OR tablename LIKE '%categor%' OR tablename LIKE '%unit%' THEN '🏷️ Products'
        WHEN tablename LIKE '%sale%' OR tablename LIKE '%invoice%' OR tablename LIKE '%customer%' OR tablename LIKE '%order%' OR tablename LIKE '%quotation%' THEN '💰 Sales'
        WHEN tablename LIKE '%purchase%' OR tablename LIKE '%supplier%' OR tablename LIKE '%vendor%' THEN '🛒 Purchases'
        WHEN tablename LIKE '%employee%' OR tablename LIKE '%payroll%' OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%salary%' THEN '👥 HR'
        WHEN tablename LIKE '%bank%' OR tablename LIKE '%cash%' OR tablename LIKE '%payment%' OR tablename LIKE '%receipt%' OR tablename LIKE '%treasury%' THEN '🏦 Treasury/Banking'
        WHEN tablename LIKE '%currenc%' OR tablename LIKE '%exchange%' THEN '💱 Currency'
        WHEN tablename LIKE '%audit%' OR tablename LIKE '%log%' OR tablename LIKE '%history%' THEN '📝 Audit/Logs'
        WHEN tablename LIKE '%setting%' OR tablename LIKE '%config%' OR tablename LIKE '%preference%' THEN '⚙️ Settings'
        WHEN tablename LIKE '%document%' OR tablename LIKE '%attachment%' OR tablename LIKE '%file%' THEN '📄 Documents'
        ELSE '📁 Other'
    END as "القسم",
    COUNT(*) as "عدد الجداول"
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY 
    CASE 
        WHEN tablename LIKE '%tenant%' OR tablename LIKE '%brand%' OR tablename LIKE '%subscription%' THEN '🏢 SaaS/Multi-Tenancy'
        WHEN tablename LIKE '%user%' OR tablename LIKE '%role%' OR tablename LIKE '%permission%' OR tablename LIKE '%mfa%' OR tablename LIKE '%auth%' THEN '👤 Users & Auth'
        WHEN tablename LIKE '%compan%' OR tablename LIKE '%branch%' THEN '🏭 Companies'
        WHEN tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%ledger%' OR tablename LIKE '%fiscal%' OR tablename LIKE '%cost_center%' THEN '📊 Accounting'
        WHEN tablename LIKE '%warehouse%' OR tablename LIKE '%inventor%' OR tablename LIKE '%stock%' OR tablename LIKE '%location%' OR tablename LIKE '%roll%' OR tablename LIKE '%fabric%' OR tablename LIKE '%batch%' THEN '📦 Warehouse/Inventory'
        WHEN tablename LIKE '%product%' OR tablename LIKE '%item%' OR tablename LIKE '%categor%' OR tablename LIKE '%unit%' THEN '🏷️ Products'
        WHEN tablename LIKE '%sale%' OR tablename LIKE '%invoice%' OR tablename LIKE '%customer%' OR tablename LIKE '%order%' OR tablename LIKE '%quotation%' THEN '💰 Sales'
        WHEN tablename LIKE '%purchase%' OR tablename LIKE '%supplier%' OR tablename LIKE '%vendor%' THEN '🛒 Purchases'
        WHEN tablename LIKE '%employee%' OR tablename LIKE '%payroll%' OR tablename LIKE '%attendance%' OR tablename LIKE '%leave%' OR tablename LIKE '%salary%' THEN '👥 HR'
        WHEN tablename LIKE '%bank%' OR tablename LIKE '%cash%' OR tablename LIKE '%payment%' OR tablename LIKE '%receipt%' OR tablename LIKE '%treasury%' THEN '🏦 Treasury/Banking'
        WHEN tablename LIKE '%currenc%' OR tablename LIKE '%exchange%' THEN '💱 Currency'
        WHEN tablename LIKE '%audit%' OR tablename LIKE '%log%' OR tablename LIKE '%history%' THEN '📝 Audit/Logs'
        WHEN tablename LIKE '%setting%' OR tablename LIKE '%config%' OR tablename LIKE '%preference%' THEN '⚙️ Settings'
        WHEN tablename LIKE '%document%' OR tablename LIKE '%attachment%' OR tablename LIKE '%file%' THEN '📄 Documents'
        ELSE '📁 Other'
    END
ORDER BY COUNT(*) DESC;
