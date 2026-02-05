-- فحص العملات المكررة
SELECT code, COUNT(*) as count
FROM currencies 
GROUP BY code 
HAVING COUNT(*) > 1;

-- عدد العملات الكلي
SELECT COUNT(*) as total, COUNT(DISTINCT code) as unique_codes
FROM currencies;
