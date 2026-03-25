-- 1. عرض جميع القوالب المحاسبية المتوفرة في النظام
-- 1. Show all available Chart Templates
SELECT 
    template_code, 
    template_name_ar, 
    chart_type, 
    include_demo_data 
FROM chart_templates;

-- 2. التحقق من الشجرة المطبقة على حسابك الحالي (feras1960@gmail.com)
-- 2. Check Chart Type applied to your current account
SELECT 
    c.name as company_name, 
    c.chart_type as applied_chart_type, 
    (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = c.id) as total_accounts,
    u.email
FROM companies c
JOIN user_profiles up ON c.id = up.company_id
JOIN auth.users u ON up.id = u.id
WHERE u.email = 'feras1960@gmail.com';

-- 3. التحقق من النظام الآلي (Trigger) للحسابات الجديدة
-- 3. Verify the Trigger for new companies
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'companies' 
AND trigger_name = 'on_company_created_trigger';

-- إذا ظهرت نتيجة في الاستعلام رقم 3، فهذا يعني أن النظام يعمل تلقائياً للشركات الجديدة. 
