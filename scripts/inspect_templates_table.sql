-- 1. معرفة أعمدة جدول chart_templates
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'chart_templates';

-- 2. عرض محتوى الجدول (لنرى هل البيانات مخزنة كـ JSON أم ماذا)
SELECT * FROM chart_templates;
