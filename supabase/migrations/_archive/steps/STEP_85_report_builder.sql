-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_85: منشئ التقارير الديناميكي (Dynamic Report Builder)
-- ═══════════════════════════════════════════════════════════════════════════
-- الوصف: نظام لإنشاء تقارير مخصصة بدون برمجة
-- التاريخ: 2026-01-31
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول قوالب التقارير (report_templates)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id), -- NULL = متاح لكل الشركات
    
    -- معلومات القالب
    code VARCHAR(50),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    
    -- التصنيف
    category VARCHAR(50) DEFAULT 'custom', -- 'accounting', 'inventory', 'sales', 'purchases', 'hr', 'custom'
    sub_category VARCHAR(50),
    
    -- المصدر الأساسي
    source_table VARCHAR(100) NOT NULL,
    source_schema VARCHAR(50) DEFAULT 'public',
    
    -- العلاقات (joins)
    joins JSONB DEFAULT '[]', -- [{"table": "...", "alias": "...", "type": "LEFT", "on": "..."}]
    
    -- الأعمدة المختارة
    columns JSONB NOT NULL, -- [{"source": "...", "alias": "...", "label_ar": "...", "label_en": "...", "type": "text|number|date|boolean", "format": "...", "aggregate": "SUM|COUNT|AVG|MIN|MAX", "width": 100}]
    
    -- الفلاتر الافتراضية
    default_filters JSONB DEFAULT '[]', -- [{"column": "...", "operator": "=|>|<|>=|<=|<>|LIKE|IN|BETWEEN|IS NULL", "value": "...", "is_required": true}]
    
    -- فلاتر ديناميكية (يحددها المستخدم عند التشغيل)
    dynamic_filters JSONB DEFAULT '[]', -- [{"column": "...", "label": "...", "type": "date|text|select", "default": "...", "options": [...]}]
    
    -- التجميع
    group_by JSONB DEFAULT '[]', -- ["column1", "column2"]
    having_clause JSONB, -- {"column": "...", "operator": "...", "value": "..."}
    
    -- الترتيب
    order_by JSONB DEFAULT '[]', -- [{"column": "...", "direction": "ASC|DESC"}]
    
    -- التنسيق والعرض
    layout VARCHAR(20) DEFAULT 'table', -- 'table', 'pivot', 'chart', 'cards'
    chart_config JSONB, -- {"type": "bar|line|pie|donut", "x_axis": "...", "y_axis": "...", "series": [...]}
    
    -- الصفحات
    page_size INTEGER DEFAULT 50,
    show_totals BOOLEAN DEFAULT true,
    show_row_numbers BOOLEAN DEFAULT false,
    
    -- التصدير
    export_formats JSONB DEFAULT '["excel", "pdf", "csv"]',
    
    -- الحالة
    is_system BOOLEAN DEFAULT false, -- تقارير النظام لا يمكن تعديلها
    is_public BOOLEAN DEFAULT false, -- متاح لجميع المستخدمين
    is_favorite BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- التتبع
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- الاستخدام
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON report_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_company ON report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول التقارير المحفوظة (saved_reports)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    
    -- معلومات التقرير
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    description TEXT,
    
    -- المعاملات المستخدمة
    parameters JSONB, -- الفلاتر الديناميكية المحددة
    
    -- النتيجة
    result_count INTEGER,
    result_summary JSONB, -- إجماليات وملخصات
    
    -- التصدير
    output_format VARCHAR(20), -- 'html', 'pdf', 'excel', 'csv'
    file_path TEXT, -- مسار الملف المُصدَّر
    file_size BIGINT,
    
    -- الجدولة (اختياري)
    is_scheduled BOOLEAN DEFAULT false,
    schedule_cron VARCHAR(100), -- cron expression
    schedule_recipients TEXT[], -- قائمة الإيميلات
    last_scheduled_at TIMESTAMPTZ,
    next_scheduled_at TIMESTAMPTZ,
    
    -- التتبع
    generated_by UUID REFERENCES user_profiles(id),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_saved_reports_tenant ON saved_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_template ON saved_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_date ON saved_reports(generated_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. جدول مشاركة التقارير (report_shares)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    saved_report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
    
    -- المشاركة
    shared_with_user_id UUID REFERENCES user_profiles(id),
    shared_with_role VARCHAR(50),
    
    -- الصلاحيات
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT true,
    can_reshare BOOLEAN DEFAULT false,
    
    -- التتبع
    shared_by UUID REFERENCES user_profiles(id),
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT chk_share_type CHECK (template_id IS NOT NULL OR saved_report_id IS NOT NULL)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. سياسات RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_templates_tenant_isolation ON report_templates;
CREATE POLICY report_templates_tenant_isolation ON report_templates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS saved_reports_tenant_isolation ON saved_reports;
CREATE POLICY saved_reports_tenant_isolation ON saved_reports
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS report_shares_tenant_isolation ON report_shares;
CREATE POLICY report_shares_tenant_isolation ON report_shares
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. قوالب تقارير افتراضية
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'No tenant found';
        RETURN;
    END IF;
    
    -- حذف القوالب الموجودة
    DELETE FROM report_templates WHERE tenant_id = v_tenant_id AND is_system = true;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- تقارير المحاسبة
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- 1. تقرير القيود اليومية
    INSERT INTO report_templates (
        tenant_id, code, name_ar, name_en, category, source_table,
        joins, columns, default_filters, dynamic_filters, order_by, is_system
    ) VALUES (
        v_tenant_id, 'JE001', 'تقرير القيود اليومية', 'Journal Entries Report', 'accounting', 'journal_entries',
        '[
            {"table": "journal_entry_lines", "alias": "jel", "type": "LEFT", "on": "journal_entries.id = jel.entry_id"},
            {"table": "chart_of_accounts", "alias": "coa", "type": "LEFT", "on": "jel.account_id = coa.id"}
        ]'::jsonb,
        '[
            {"source": "journal_entries.entry_date", "alias": "date", "label_ar": "التاريخ", "label_en": "Date", "type": "date"},
            {"source": "journal_entries.entry_number", "alias": "entry_no", "label_ar": "رقم القيد", "label_en": "Entry No", "type": "text"},
            {"source": "coa.name_ar", "alias": "account", "label_ar": "الحساب", "label_en": "Account", "type": "text"},
            {"source": "jel.debit", "alias": "debit", "label_ar": "مدين", "label_en": "Debit", "type": "number", "format": "currency"},
            {"source": "jel.credit", "alias": "credit", "label_ar": "دائن", "label_en": "Credit", "type": "number", "format": "currency"},
            {"source": "journal_entries.description_ar", "alias": "desc", "label_ar": "الوصف", "label_en": "Description", "type": "text"}
        ]'::jsonb,
        '[{"column": "journal_entries.is_posted", "operator": "=", "value": "true"}]'::jsonb,
        '[
            {"column": "journal_entries.entry_date", "label": "من تاريخ", "type": "date", "param": "from_date"},
            {"column": "journal_entries.entry_date", "label": "إلى تاريخ", "type": "date", "param": "to_date"},
            {"column": "coa.id", "label": "الحساب", "type": "select", "source": "chart_of_accounts", "param": "account_id"}
        ]'::jsonb,
        '[{"column": "journal_entries.entry_date", "direction": "DESC"}, {"column": "journal_entries.entry_number", "direction": "ASC"}]'::jsonb,
        true
    );
    
    -- 2. تقرير الأرصدة
    INSERT INTO report_templates (
        tenant_id, code, name_ar, name_en, category, source_table,
        columns, group_by, order_by, is_system, show_totals
    ) VALUES (
        v_tenant_id, 'BAL001', 'تقرير أرصدة الحسابات', 'Account Balances Report', 'accounting', 'chart_of_accounts',
        '[
            {"source": "chart_of_accounts.account_code", "alias": "code", "label_ar": "الكود", "label_en": "Code", "type": "text"},
            {"source": "chart_of_accounts.name_ar", "alias": "name", "label_ar": "اسم الحساب", "label_en": "Account Name", "type": "text"},
            {"source": "chart_of_accounts.opening_balance", "alias": "opening", "label_ar": "الرصيد الافتتاحي", "label_en": "Opening Balance", "type": "number", "format": "currency"},
            {"source": "chart_of_accounts.current_balance", "alias": "current", "label_ar": "الرصيد الحالي", "label_en": "Current Balance", "type": "number", "format": "currency"}
        ]'::jsonb,
        '["chart_of_accounts.id"]'::jsonb,
        '[{"column": "chart_of_accounts.account_code", "direction": "ASC"}]'::jsonb,
        true, true
    );
    
    -- 3. تقرير مراكز التكلفة
    INSERT INTO report_templates (
        tenant_id, code, name_ar, name_en, category, source_table,
        columns, order_by, is_system
    ) VALUES (
        v_tenant_id, 'CC001', 'تقرير مراكز التكلفة', 'Cost Centers Report', 'accounting', 'v_cost_center_summary',
        '[
            {"source": "v_cost_center_summary.full_code", "alias": "code", "label_ar": "الكود", "label_en": "Code", "type": "text"},
            {"source": "v_cost_center_summary.name_ar", "alias": "name", "label_ar": "مركز التكلفة", "label_en": "Cost Center", "type": "text"},
            {"source": "v_cost_center_summary.budget_limit", "alias": "budget", "label_ar": "الموازنة", "label_en": "Budget", "type": "number", "format": "currency"},
            {"source": "v_cost_center_summary.current_spending", "alias": "spent", "label_ar": "المصروف", "label_en": "Spent", "type": "number", "format": "currency"},
            {"source": "v_cost_center_summary.remaining_budget", "alias": "remaining", "label_ar": "المتبقي", "label_en": "Remaining", "type": "number", "format": "currency"},
            {"source": "v_cost_center_summary.utilization_percent", "alias": "util", "label_ar": "% الاستخدام", "label_en": "% Used", "type": "number", "format": "percent"},
            {"source": "v_cost_center_summary.budget_status", "alias": "status", "label_ar": "الحالة", "label_en": "Status", "type": "text"}
        ]'::jsonb,
        '[{"column": "v_cost_center_summary.full_code", "direction": "ASC"}]'::jsonb,
        true
    );
    
    -- 4. تقرير الموازنة vs الفعلي
    INSERT INTO report_templates (
        tenant_id, code, name_ar, name_en, category, source_table,
        joins, columns, dynamic_filters, order_by, is_system
    ) VALUES (
        v_tenant_id, 'BUD001', 'تقرير الموازنة مقابل الفعلي', 'Budget vs Actual Report', 'accounting', 'budgets',
        '[
            {"table": "budget_lines", "alias": "bl", "type": "LEFT", "on": "budgets.id = bl.budget_id"},
            {"table": "chart_of_accounts", "alias": "coa", "type": "LEFT", "on": "bl.account_id = coa.id"}
        ]'::jsonb,
        '[
            {"source": "bl.period", "alias": "period", "label_ar": "الفترة", "label_en": "Period", "type": "text"},
            {"source": "coa.name_ar", "alias": "account", "label_ar": "الحساب", "label_en": "Account", "type": "text"},
            {"source": "bl.budgeted_amount", "alias": "budgeted", "label_ar": "الموازنة", "label_en": "Budget", "type": "number", "format": "currency"},
            {"source": "bl.actual_amount", "alias": "actual", "label_ar": "الفعلي", "label_en": "Actual", "type": "number", "format": "currency"},
            {"source": "bl.variance", "alias": "variance", "label_ar": "الانحراف", "label_en": "Variance", "type": "number", "format": "currency"},
            {"source": "bl.variance_percent", "alias": "var_pct", "label_ar": "% الانحراف", "label_en": "% Variance", "type": "number", "format": "percent"}
        ]'::jsonb,
        '[
            {"column": "budgets.id", "label": "الموازنة", "type": "select", "source": "budgets", "param": "budget_id"}
        ]'::jsonb,
        '[{"column": "bl.period", "direction": "ASC"}, {"column": "coa.account_code", "direction": "ASC"}]'::jsonb,
        true
    );
    
    RAISE NOTICE 'Created 4 system report templates';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة تنفيذ التقرير (execute_report)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION execute_report(
    p_template_id UUID,
    p_parameters JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template RECORD;
    v_sql TEXT;
    v_result JSONB;
    v_count INTEGER;
BEGIN
    -- جلب القالب
    SELECT * INTO v_template FROM report_templates WHERE id = p_template_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Template not found');
    END IF;
    
    -- بناء الاستعلام
    v_sql := 'SELECT ';
    
    -- الأعمدة
    SELECT string_agg(
        (col->>'source') || ' AS ' || COALESCE(col->>'alias', 'col_' || ordinality::text),
        ', '
    ) INTO v_sql
    FROM jsonb_array_elements(v_template.columns) WITH ORDINALITY AS col(col, ordinality);
    
    v_sql := 'SELECT ' || v_sql || ' FROM ' || v_template.source_table;
    
    -- إضافة الـ joins
    IF v_template.joins IS NOT NULL AND jsonb_array_length(v_template.joins) > 0 THEN
        SELECT v_sql || ' ' || string_agg(
            COALESCE(j->>'type', 'LEFT') || ' JOIN ' || 
            (j->>'table') || 
            COALESCE(' AS ' || (j->>'alias'), '') || 
            ' ON ' || (j->>'on'),
            ' '
        )
        INTO v_sql
        FROM jsonb_array_elements(v_template.joins) AS j;
    END IF;
    
    -- تحديث عداد الاستخدام
    UPDATE report_templates
    SET use_count = use_count + 1, last_used_at = NOW()
    WHERE id = p_template_id;
    
    -- ملاحظة: التنفيذ الفعلي يحتاج أمان إضافي
    -- هذه نسخة مبسطة للتوضيح
    
    RETURN jsonb_build_object(
        'success', true,
        'template_name', v_template.name_ar,
        'sql_preview', v_sql,
        'message', 'Report execution requires frontend implementation'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة حفظ نتيجة التقرير
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION save_report_result(
    p_template_id UUID,
    p_parameters JSONB,
    p_result_count INTEGER,
    p_result_summary JSONB,
    p_output_format VARCHAR,
    p_file_path TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saved_id UUID;
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM report_templates WHERE id = p_template_id;
    
    INSERT INTO saved_reports (
        tenant_id, template_id, parameters, result_count,
        result_summary, output_format, file_path, generated_by
    ) VALUES (
        v_tenant_id, p_template_id, p_parameters, p_result_count,
        p_result_summary, p_output_format, p_file_path, p_user_id
    ) RETURNING id INTO v_saved_id;
    
    RETURN v_saved_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. دالة الحصول على التقارير المتاحة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_available_reports(
    p_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    category VARCHAR,
    description TEXT,
    is_system BOOLEAN,
    use_count INTEGER,
    last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.id, rt.code, rt.name_ar, rt.name_en,
        rt.category, rt.description, rt.is_system,
        rt.use_count, rt.last_used_at
    FROM report_templates rt
    WHERE rt.is_active = true
      AND (p_category IS NULL OR rt.category = p_category)
    ORDER BY rt.is_system DESC, rt.use_count DESC, rt.name_ar;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. تعليقات
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE report_templates IS 'قوالب التقارير - تعريف هيكل التقارير المخصصة';
COMMENT ON TABLE saved_reports IS 'التقارير المحفوظة - نتائج تنفيذ التقارير';
COMMENT ON TABLE report_shares IS 'مشاركة التقارير - إدارة صلاحيات الوصول';
COMMENT ON FUNCTION execute_report IS 'تنفيذ تقرير من قالب محدد';
COMMENT ON FUNCTION save_report_result IS 'حفظ نتيجة التقرير';
COMMENT ON FUNCTION get_available_reports IS 'الحصول على قائمة التقارير المتاحة';

-- ═══════════════════════════════════════════════════════════════════════════
-- انتهى
-- ═══════════════════════════════════════════════════════════════════════════
