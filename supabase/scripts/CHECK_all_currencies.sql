-- فحص العملات الموجودة
SELECT code, name, name_ar FROM currencies ORDER BY code;

-- عدد العملات
SELECT COUNT(*) as total_currencies FROM currencies;
