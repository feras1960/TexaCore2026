-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_82: نظام الموازنة (Budget System)
-- ═══════════════════════════════════════════════════════════════════════════
-- الوصف: إنشاء نظام موازنة متكامل للتخطيط المالي ومقارنة الفعلي بالمخطط
-- التاريخ: 2026-01-31
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول الموازنات الرئيسية (budgets)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- معلومات الموازنة
    code VARCHAR(50),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    
    -- نوع الموازنة
    budget_type VARCHAR(50) NOT NULL DEFAULT 'expense', -- 'revenue', 'expense', 'capital', 'cash_flow', 'comprehensive'
    
    -- الفترة الزمنية
    fiscal_year_id UUID REFERENCES fiscal_years(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
    
    -- الإجماليات
    total_budgeted NUMERIC(18,2) DEFAULT 0,
    total_actual NUMERIC(18,2) DEFAULT 0,
    total_variance NUMERIC(18,2) GENERATED ALWAYS AS (total_actual - total_budgeted) STORED,
    variance_percent NUMERIC(8,2),
    
    -- مركز التكلفة (اختياري)
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- العملة
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- الحالة والموافقة
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'active', 'closed', 'cancelled'
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- التتبع
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- قيود
    CONSTRAINT chk_budget_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_budget_type CHECK (budget_type IN ('revenue', 'expense', 'capital', 'cash_flow', 'comprehensive')),
    CONSTRAINT chk_budget_status CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'closed', 'cancelled'))
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_company ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول بنود الموازنة (budget_lines)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    
    -- الحساب
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    
    -- مركز التكلفة (للتفصيل)
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- الفترة
    period VARCHAR(10) NOT NULL, -- '2026-01', '2026-Q1', '2026'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- المبالغ
    budgeted_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    actual_amount NUMERIC(18,2) DEFAULT 0,
    committed_amount NUMERIC(18,2) DEFAULT 0, -- المبالغ المرتبطة (أوامر شراء غير منفذة)
    available_amount NUMERIC(18,2) GENERATED ALWAYS AS (budgeted_amount - actual_amount - committed_amount) STORED,
    
    -- الانحراف
    variance NUMERIC(18,2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
    variance_percent NUMERIC(8,2),
    
    -- ملاحظات
    notes TEXT,
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- منع التكرار
    CONSTRAINT uq_budget_line UNIQUE (budget_id, account_id, cost_center_id, period)
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON budget_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_period ON budget_lines(period);
CREATE INDEX IF NOT EXISTS idx_budget_lines_cost_center ON budget_lines(cost_center_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. جدول تنبيهات الموازنة (budget_alerts)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    budget_line_id UUID REFERENCES budget_lines(id) ON DELETE CASCADE,
    
    -- نوع التنبيه
    alert_type VARCHAR(50) NOT NULL, -- 'warning_50', 'warning_75', 'warning_90', 'exceeded', 'critical_120'
    severity VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'danger', 'critical'
    
    -- العتبة
    threshold_percent NUMERIC(5,2) NOT NULL,
    current_percent NUMERIC(8,2),
    
    -- المبالغ عند التنبيه
    budgeted_amount NUMERIC(18,2),
    actual_amount NUMERIC(18,2),
    
    -- الرسالة
    message_ar TEXT,
    message_en TEXT,
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- الإقرار
    acknowledged_by UUID REFERENCES user_profiles(id),
    acknowledged_at TIMESTAMPTZ,
    acknowledgment_notes TEXT,
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_line ON budget_alerts(budget_line_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_active ON budget_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_type ON budget_alerts(alert_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. سياسات RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- تفعيل RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- سياسات budgets
DROP POLICY IF EXISTS budgets_tenant_isolation ON budgets;
CREATE POLICY budgets_tenant_isolation ON budgets
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- سياسات budget_lines
DROP POLICY IF EXISTS budget_lines_tenant_isolation ON budget_lines;
CREATE POLICY budget_lines_tenant_isolation ON budget_lines
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- سياسات budget_alerts
DROP POLICY IF EXISTS budget_alerts_tenant_isolation ON budget_alerts;
CREATE POLICY budget_alerts_tenant_isolation ON budget_alerts
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دوال مساعدة
-- ═══════════════════════════════════════════════════════════════════════════

-- دالة لتحديث الإجماليات في الموازنة الرئيسية
CREATE OR REPLACE FUNCTION update_budget_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE budgets
    SET 
        total_budgeted = (
            SELECT COALESCE(SUM(budgeted_amount), 0) 
            FROM budget_lines 
            WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
        ),
        total_actual = (
            SELECT COALESCE(SUM(actual_amount), 0) 
            FROM budget_lines 
            WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- تريجر لتحديث الإجماليات
DROP TRIGGER IF EXISTS trg_update_budget_totals ON budget_lines;
CREATE TRIGGER trg_update_budget_totals
    AFTER INSERT OR UPDATE OR DELETE ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION update_budget_totals();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة فحص تجاوز الموازنة وإنشاء تنبيهات
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_budget_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_percent NUMERIC;
    v_budget RECORD;
    v_alert_type VARCHAR(50);
    v_severity VARCHAR(20);
    v_message_ar TEXT;
    v_message_en TEXT;
BEGIN
    -- حساب النسبة المئوية
    IF NEW.budgeted_amount > 0 THEN
        v_percent := (NEW.actual_amount / NEW.budgeted_amount) * 100;
    ELSE
        v_percent := 0;
    END IF;
    
    -- تحديث نسبة الانحراف
    NEW.variance_percent := v_percent - 100;
    
    -- جلب معلومات الموازنة
    SELECT * INTO v_budget FROM budgets WHERE id = NEW.budget_id;
    
    -- تحديد نوع التنبيه حسب النسبة
    IF v_percent >= 120 THEN
        v_alert_type := 'critical_120';
        v_severity := 'critical';
        v_message_ar := 'تجاوز حرج! النسبة ' || ROUND(v_percent, 1) || '%';
        v_message_en := 'Critical! ' || ROUND(v_percent, 1) || '% of budget used';
    ELSIF v_percent >= 100 THEN
        v_alert_type := 'exceeded';
        v_severity := 'danger';
        v_message_ar := 'تم تجاوز الموازنة! النسبة ' || ROUND(v_percent, 1) || '%';
        v_message_en := 'Budget exceeded! ' || ROUND(v_percent, 1) || '% used';
    ELSIF v_percent >= 90 THEN
        v_alert_type := 'warning_90';
        v_severity := 'warning';
        v_message_ar := 'تحذير: تم استخدام ' || ROUND(v_percent, 1) || '% من الموازنة';
        v_message_en := 'Warning: ' || ROUND(v_percent, 1) || '% of budget used';
    ELSIF v_percent >= 75 THEN
        v_alert_type := 'warning_75';
        v_severity := 'info';
        v_message_ar := 'تنبيه: تم استخدام ' || ROUND(v_percent, 1) || '% من الموازنة';
        v_message_en := 'Notice: ' || ROUND(v_percent, 1) || '% of budget used';
    ELSE
        -- لا حاجة لتنبيه
        RETURN NEW;
    END IF;
    
    -- إلغاء التنبيهات السابقة من نفس النوع
    UPDATE budget_alerts 
    SET is_active = false 
    WHERE budget_line_id = NEW.id 
      AND alert_type = v_alert_type
      AND is_active = true;
    
    -- إدراج تنبيه جديد
    INSERT INTO budget_alerts (
        tenant_id, budget_id, budget_line_id,
        alert_type, severity, threshold_percent, current_percent,
        budgeted_amount, actual_amount,
        message_ar, message_en
    ) VALUES (
        NEW.tenant_id, NEW.budget_id, NEW.id,
        v_alert_type, v_severity, 
        CASE v_alert_type 
            WHEN 'warning_75' THEN 75
            WHEN 'warning_90' THEN 90
            WHEN 'exceeded' THEN 100
            WHEN 'critical_120' THEN 120
        END,
        v_percent,
        NEW.budgeted_amount, NEW.actual_amount,
        v_message_ar, v_message_en
    );
    
    RETURN NEW;
END;
$$;

-- تريجر لفحص العتبات
DROP TRIGGER IF EXISTS trg_check_budget_threshold ON budget_lines;
CREATE TRIGGER trg_check_budget_threshold
    BEFORE INSERT OR UPDATE OF actual_amount ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION check_budget_threshold();

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة تحديث الفعلي من القيود المحاسبية
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_budget_actuals_from_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_period VARCHAR(10);
    v_account_id UUID;
    v_amount NUMERIC;
BEGIN
    -- فقط للقيود المرحلة
    IF NEW.is_posted = true AND (OLD IS NULL OR OLD.is_posted = false) THEN
        -- تحديث كل بند في القيد
        FOR v_account_id, v_amount IN
            SELECT account_id, (debit - credit) as amount
            FROM journal_entry_lines
            WHERE entry_id = NEW.id
        LOOP
            v_period := TO_CHAR(NEW.entry_date, 'YYYY-MM');
            
            -- تحديث budget_lines إذا وجدت
            UPDATE budget_lines bl
            SET 
                actual_amount = actual_amount + v_amount,
                updated_at = NOW()
            FROM budgets b
            WHERE bl.budget_id = b.id
              AND bl.account_id = v_account_id
              AND bl.period = v_period
              AND b.status = 'active'
              AND b.company_id = NEW.company_id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- تريجر لربط القيود بالموازنة
DROP TRIGGER IF EXISTS trg_update_budget_from_journal ON journal_entries;
CREATE TRIGGER trg_update_budget_from_journal
    AFTER UPDATE OF is_posted ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_budget_actuals_from_journal();

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. دالة لإنشاء موازنة جديدة مع بنود
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_budget_with_lines(
    p_tenant_id UUID,
    p_company_id UUID,
    p_name_ar VARCHAR,
    p_name_en VARCHAR,
    p_budget_type VARCHAR,
    p_start_date DATE,
    p_end_date DATE,
    p_account_ids UUID[],
    p_amounts NUMERIC[],
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_budget_id UUID;
    v_period VARCHAR(10);
    v_current_date DATE;
    v_i INTEGER;
BEGIN
    -- إنشاء الموازنة الرئيسية
    INSERT INTO budgets (
        tenant_id, company_id, name_ar, name_en,
        budget_type, start_date, end_date,
        created_by
    ) VALUES (
        p_tenant_id, p_company_id, p_name_ar, p_name_en,
        p_budget_type, p_start_date, p_end_date,
        p_user_id
    ) RETURNING id INTO v_budget_id;
    
    -- إنشاء بنود لكل شهر وكل حساب
    v_current_date := DATE_TRUNC('month', p_start_date);
    
    WHILE v_current_date <= p_end_date LOOP
        v_period := TO_CHAR(v_current_date, 'YYYY-MM');
        
        FOR v_i IN 1..array_length(p_account_ids, 1) LOOP
            INSERT INTO budget_lines (
                tenant_id, budget_id, account_id,
                period, period_start, period_end,
                budgeted_amount
            ) VALUES (
                p_tenant_id, v_budget_id, p_account_ids[v_i],
                v_period, v_current_date, (v_current_date + INTERVAL '1 month - 1 day')::DATE,
                COALESCE(p_amounts[v_i], 0)
            );
        END LOOP;
        
        v_current_date := v_current_date + INTERVAL '1 month';
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'budget_id', v_budget_id,
        'message_ar', 'تم إنشاء الموازنة بنجاح',
        'message_en', 'Budget created successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. دالة لتقرير مقارنة الموازنة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_budget_vs_actual_report(
    p_budget_id UUID
)
RETURNS TABLE (
    account_code VARCHAR,
    account_name VARCHAR,
    period VARCHAR,
    budgeted NUMERIC,
    actual NUMERIC,
    variance NUMERIC,
    variance_percent NUMERIC,
    status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.account_code,
        coa.name_ar as account_name,
        bl.period,
        bl.budgeted_amount as budgeted,
        bl.actual_amount as actual,
        bl.variance,
        bl.variance_percent,
        CASE 
            WHEN bl.actual_amount >= bl.budgeted_amount * 1.2 THEN 'critical'
            WHEN bl.actual_amount >= bl.budgeted_amount THEN 'exceeded'
            WHEN bl.actual_amount >= bl.budgeted_amount * 0.9 THEN 'warning'
            ELSE 'ok'
        END as status
    FROM budget_lines bl
    JOIN chart_of_accounts coa ON bl.account_id = coa.id
    WHERE bl.budget_id = p_budget_id
    ORDER BY coa.account_code, bl.period;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. تعليقات للجداول
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE budgets IS 'الموازنات الرئيسية - Budget headers for financial planning';
COMMENT ON TABLE budget_lines IS 'بنود الموازنة التفصيلية - Detailed budget lines per account and period';
COMMENT ON TABLE budget_alerts IS 'تنبيهات تجاوز الموازنة - Budget threshold alerts and notifications';

COMMENT ON FUNCTION update_budget_totals IS 'تحديث إجماليات الموازنة تلقائياً عند تغيير البنود';
COMMENT ON FUNCTION check_budget_threshold IS 'فحص تجاوز عتبات الموازنة وإنشاء تنبيهات';
COMMENT ON FUNCTION update_budget_actuals_from_journal IS 'تحديث المبالغ الفعلية من القيود المرحلة';
COMMENT ON FUNCTION create_budget_with_lines IS 'إنشاء موازنة كاملة مع بنودها';
COMMENT ON FUNCTION get_budget_vs_actual_report IS 'تقرير مقارنة الموازنة بالفعلي';

-- ═══════════════════════════════════════════════════════════════════════════
-- انتهى
-- ═══════════════════════════════════════════════════════════════════════════
