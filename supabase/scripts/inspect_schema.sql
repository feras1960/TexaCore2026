-- التشخيص الشامل للهيكلية
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('fabric_rolls', 'purchase_invoices', 'fabric_materials', 'materials')
ORDER BY 
    table_name, column_name;

-- فحص الحسابات
SELECT * FROM chart_of_accounts WHERE account_code IN ('1400', '2100', '2108', '5108');
