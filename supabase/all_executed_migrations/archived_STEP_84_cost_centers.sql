-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_84: تفعيل مراكز التكلفة (Cost Centers Activation)
-- ═══════════════════════════════════════════════════════════════════════════
-- الوصف: تفعيل مراكز التكلفة مع بيانات افتراضية وتقارير
-- التاريخ: 2026-01-31
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. إضافة أعمدة إضافية لجدول cost_centers
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة أعمدة للتوسع
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES user_profiles(id);
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS budget_limit NUMERIC(18,2);
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS current_spending NUMERIC(18,2) DEFAULT 0;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS cost_center_type VARCHAR(50) DEFAULT 'department'; -- 'department', 'project', 'branch', 'product_line'
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS full_code VARCHAR(100);
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. إدراج مراكز تكلفة افتراضية
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_admin_cc UUID;
    v_sales_cc UUID;
    v_ops_cc UUID;
BEGIN
    -- جلب أول tenant و company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE 'No tenant or company found';
        RETURN;
    END IF;
    
    -- حذف المراكز الموجودة (إن وجدت) لنفس الشركة
    DELETE FROM cost_centers WHERE company_id = v_company_id;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- مراكز المستوى الأول (الرئيسية)
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- الإدارة العامة
    INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, is_group, is_active, level, full_code, cost_center_type)
    VALUES (v_tenant_id, v_company_id, '100', 'الإدارة العامة', 'General Administration', true, true, 0, '100', 'department')
    RETURNING id INTO v_admin_cc;
    
    -- المبيعات والتسويق
    INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, is_group, is_active, level, full_code, cost_center_type)
    VALUES (v_tenant_id, v_company_id, '200', 'المبيعات والتسويق', 'Sales & Marketing', true, true, 0, '200', 'department')
    RETURNING id INTO v_sales_cc;
    
    -- التشغيل والإنتاج
    INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, is_group, is_active, level, full_code, cost_center_type)
    VALUES (v_tenant_id, v_company_id, '300', 'التشغيل والإنتاج', 'Operations & Production', true, true, 0, '300', 'department')
    RETURNING id INTO v_ops_cc;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- مراكز المستوى الثاني (الفرعية)
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- فروع الإدارة
    INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, parent_id, is_group, is_active, level, full_code, cost_center_type, budget_limit)
    VALUES 
        (v_tenant_id, v_company_id, '110', 'قسم المحاسبة', 'Accounting Department', v_admin_cc, false, true, 1, '100-110', 'department', 50000),
        (v_tenant_id, v_company_id, '120', 'قسم الموارد البشرية', 'HR Department', v_admin_cc, false, true, 1, '100-120', 'department', 30000),
        (v_tenant_id, v_company_id, '130', 'قسم تقنية المعلومات', 'IT Department', v_admin_cc, false, true, 1, '100-130', 'department', 80000),
        (v_tenant_id, v_company_id, '140', 'الإدارة التنفيذية', 'Executive Management', v_admin_cc, false, true, 1, '100-140', 'department', 100000);
    
    -- فروع المبيعات
    INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, parent_id, is_group, is_active, level, full_code, cost_center_type, budget_limit)
    VALUES 
        (v_tenant_id, v_company_id, '210', 'فريق المبيعات - جدة', 'Sales Team - Jeddah', v_sales_cc, false, true, 1, '200-210', 'branch', 200000),
        (v_tenant_id, v_company_id, '220', 'فريق المبيعات - الرياض', 'Sales Team - Riyadh', v_sales_cc, false, true, 1, '200-220', 'branch', 250000),
        (v_tenant_id, v_company_id, '230', 'فريق المبيعات - الدمام', 'Sales Team - Dammam', v_sales_cc, false, true, 1, '200-230', 'branch', 150000),
        (v_tenant_id, v_company_id, '240', 'التسويق الرقمي', 'Digital Marketing', v_sales_cc, false, true, 1, '200-240', 'department', 100000);
    
    -- فروع التشغيل
    INSERT INTO cost_centers (tenant_id, company_id, code, name_ar, name_en, parent_id, is_group, is_active, level, full_code, cost_center_type, budget_limit)
    VALUES 
        (v_tenant_id, v_company_id, '310', 'المستودع الرئيسي', 'Main Warehouse', v_ops_cc, false, true, 1, '300-310', 'department', 120000),
        (v_tenant_id, v_company_id, '320', 'المستودع الفرعي', 'Secondary Warehouse', v_ops_cc, false, true, 1, '300-320', 'department', 60000),
        (v_tenant_id, v_company_id, '330', 'قسم النقل والشحن', 'Shipping & Logistics', v_ops_cc, false, true, 1, '300-330', 'department', 180000),
        (v_tenant_id, v_company_id, '340', 'قسم الجودة', 'Quality Control', v_ops_cc, false, true, 1, '300-340', 'department', 40000);
    
    RAISE NOTICE 'Created 15 cost centers for company %', v_company_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. دالة لتحديث مصاريف مركز التكلفة من القيود
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_cost_center_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- تحديث المصاريف الحالية لمركز التكلفة
    IF NEW.cost_center_id IS NOT NULL THEN
        UPDATE cost_centers
        SET 
            current_spending = (
                SELECT COALESCE(SUM(jel.debit - jel.credit), 0)
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.entry_id = je.id
                WHERE jel.cost_center_id = NEW.cost_center_id
                  AND je.is_posted = true
                  AND EXTRACT(YEAR FROM je.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ),
            updated_at = NOW()
        WHERE id = NEW.cost_center_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- تريجر لتحديث المصاريف
DROP TRIGGER IF EXISTS trg_update_cost_center_spending ON journal_entry_lines;
CREATE TRIGGER trg_update_cost_center_spending
    AFTER INSERT OR UPDATE ON journal_entry_lines
    FOR EACH ROW 
    WHEN (NEW.cost_center_id IS NOT NULL)
    EXECUTE FUNCTION update_cost_center_spending();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. View لتقرير مراكز التكلفة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_cost_center_summary AS
SELECT 
    cc.id,
    cc.tenant_id,
    cc.company_id,
    cc.code,
    cc.full_code,
    cc.name_ar,
    cc.name_en,
    cc.cost_center_type,
    cc.level,
    cc.is_group,
    cc.is_active,
    p.name_ar as parent_name,
    cc.budget_limit,
    cc.current_spending,
    CASE 
        WHEN cc.budget_limit > 0 THEN 
            cc.budget_limit - COALESCE(cc.current_spending, 0)
        ELSE NULL
    END as remaining_budget,
    CASE 
        WHEN cc.budget_limit > 0 THEN 
            ROUND((COALESCE(cc.current_spending, 0) / cc.budget_limit) * 100, 2)
        ELSE NULL
    END as utilization_percent,
    CASE 
        WHEN cc.budget_limit > 0 AND cc.current_spending > cc.budget_limit THEN 'exceeded'
        WHEN cc.budget_limit > 0 AND cc.current_spending > cc.budget_limit * 0.9 THEN 'warning'
        WHEN cc.budget_limit > 0 AND cc.current_spending > cc.budget_limit * 0.75 THEN 'caution'
        ELSE 'ok'
    END as budget_status
FROM cost_centers cc
LEFT JOIN cost_centers p ON cc.parent_id = p.id
WHERE cc.is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة تقرير مصاريف مركز التكلفة التفصيلي
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_cost_center_expenses(
    p_cost_center_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    entry_date DATE,
    entry_number VARCHAR,
    account_name VARCHAR,
    description TEXT,
    debit NUMERIC,
    credit NUMERIC,
    running_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        je.entry_date,
        je.entry_number,
        coa.name_ar as account_name,
        jel.description,
        jel.debit,
        jel.credit,
        SUM(jel.debit - jel.credit) OVER (ORDER BY je.entry_date, je.entry_number) as running_total
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.entry_id = je.id
    JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE jel.cost_center_id = p_cost_center_id
      AND je.is_posted = true
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    ORDER BY je.entry_date, je.entry_number, jel.line_number;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة تقرير مقارنة مراكز التكلفة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_cost_centers_comparison(
    p_company_id UUID,
    p_period VARCHAR DEFAULT 'current_year' -- 'current_month', 'current_quarter', 'current_year'
)
RETURNS TABLE (
    cost_center_id UUID,
    code VARCHAR,
    name VARCHAR,
    parent_name VARCHAR,
    total_expenses NUMERIC,
    budget_limit NUMERIC,
    variance NUMERIC,
    utilization_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- تحديد الفترة
    CASE p_period
        WHEN 'current_month' THEN
            v_start_date := DATE_TRUNC('month', CURRENT_DATE);
            v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
        WHEN 'current_quarter' THEN
            v_start_date := DATE_TRUNC('quarter', CURRENT_DATE);
            v_end_date := (DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months - 1 day')::DATE;
        ELSE -- current_year
            v_start_date := DATE_TRUNC('year', CURRENT_DATE);
            v_end_date := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE;
    END CASE;
    
    RETURN QUERY
    SELECT 
        cc.id as cost_center_id,
        cc.code,
        cc.name_ar as name,
        p.name_ar as parent_name,
        COALESCE(SUM(jel.debit), 0) as total_expenses,
        cc.budget_limit,
        cc.budget_limit - COALESCE(SUM(jel.debit), 0) as variance,
        CASE 
            WHEN cc.budget_limit > 0 THEN 
                ROUND((COALESCE(SUM(jel.debit), 0) / cc.budget_limit) * 100, 2)
            ELSE 0
        END as utilization_percent
    FROM cost_centers cc
    LEFT JOIN cost_centers p ON cc.parent_id = p.id
    LEFT JOIN journal_entry_lines jel ON jel.cost_center_id = cc.id
    LEFT JOIN journal_entries je ON jel.entry_id = je.id 
        AND je.is_posted = true
        AND je.entry_date BETWEEN v_start_date AND v_end_date
    WHERE cc.company_id = p_company_id
      AND cc.is_active = true
      AND cc.is_group = false
    GROUP BY cc.id, cc.code, cc.name_ar, p.name_ar, cc.budget_limit
    ORDER BY total_expenses DESC;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. تعليقات
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON VIEW v_cost_center_summary IS 'ملخص مراكز التكلفة مع نسب الاستخدام';
COMMENT ON FUNCTION get_cost_center_expenses IS 'تفاصيل مصاريف مركز تكلفة محدد';
COMMENT ON FUNCTION get_cost_centers_comparison IS 'مقارنة مراكز التكلفة مع الموازنة';

-- ═══════════════════════════════════════════════════════════════════════════
-- انتهى
-- ═══════════════════════════════════════════════════════════════════════════
