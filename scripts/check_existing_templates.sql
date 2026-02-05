-- عرض جميع القوالب المعرفة في جدول chart_templates
SELECT * FROM chart_templates;

-- محاولة معرفة كيف تخزن الحسابات (هل في جدول منفصل اسمه accounts؟)
-- سنبحث عن أي جدول يبدأ بـ chart_template
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'chart_template%';

-- إذا كان هناك جدول للحسابات، سنعرض عدد الحسابات في كل قالب
-- (سنعدل هذا الجزء بعد رؤية نتيجة الاستعلام الأول، لكن سأضعه هنا احتياطاً)
-- SELECT template_id, COUNT(*) FROM chart_template_accounts GROUP BY template_id;
