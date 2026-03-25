-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_83: القيود المتكررة (Recurring Journal Entries)
-- ═══════════════════════════════════════════════════════════════════════════
-- الوصف: نظام القيود المتكررة مع سير عمل للموافقة
-- التاريخ: 2026-01-31
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول القيود المتكررة الرئيسي (recurring_entries)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    
    -- معلومات القيد المتكرر
    code VARCHAR(50),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    
    -- التكرار
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'yearly'
    interval_value INTEGER DEFAULT 1, -- كل كم مرة (1 = كل شهر، 2 = كل شهرين)
    day_of_month INTEGER, -- 1-31 (لـ monthly)
    day_of_week INTEGER, -- 0-6 (لـ weekly)
    month_of_year INTEGER, -- 1-12 (لـ yearly)
    
    -- الفترة
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = بلا نهاية
    next_run_date DATE NOT NULL,
    last_run_date DATE,
    times_executed INTEGER DEFAULT 0,
    max_executions INTEGER, -- NULL = بلا حد
    
    -- المبلغ
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- سير العمل
    requires_approval BOOLEAN DEFAULT true,
    approver_id UUID REFERENCES user_profiles(id), -- المسؤول عن الموافقة
    auto_post BOOLEAN DEFAULT false, -- ترحيل تلقائي بعد الموافقة
    
    -- الإشعارات
    notify_days_before INTEGER DEFAULT 3, -- إشعار قبل الموعد بكم يوم
    notify_on_execution BOOLEAN DEFAULT true,
    notification_emails TEXT[], -- قائمة إيميلات للإشعار
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
    is_active BOOLEAN DEFAULT true,
    paused_at TIMESTAMPTZ,
    paused_by UUID REFERENCES user_profiles(id),
    pause_reason TEXT,
    
    -- التتبع
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- قيود
    CONSTRAINT chk_frequency CHECK (frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'yearly')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT chk_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
    CONSTRAINT chk_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_recurring_entries_tenant ON recurring_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_entries_company ON recurring_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_entries_next_run ON recurring_entries(next_run_date);
CREATE INDEX IF NOT EXISTS idx_recurring_entries_status ON recurring_entries(status);
CREATE INDEX IF NOT EXISTS idx_recurring_entries_active ON recurring_entries(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول بنود القيد المتكرر (recurring_entry_lines)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    recurring_entry_id UUID NOT NULL REFERENCES recurring_entries(id) ON DELETE CASCADE,
    
    -- البند
    line_number INTEGER NOT NULL,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    
    -- المبالغ
    debit NUMERIC(18,2) DEFAULT 0,
    credit NUMERIC(18,2) DEFAULT 0,
    
    -- التفاصيل
    description TEXT,
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- قيود
    CONSTRAINT chk_debit_credit CHECK (debit >= 0 AND credit >= 0),
    CONSTRAINT chk_one_side CHECK (debit = 0 OR credit = 0) -- بند واحد إما مدين أو دائن
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_recurring_entry_lines_entry ON recurring_entry_lines(recurring_entry_id);
CREATE INDEX IF NOT EXISTS idx_recurring_entry_lines_account ON recurring_entry_lines(account_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. جدول سجل التنفيذ (recurring_entry_history)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_entry_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    recurring_entry_id UUID NOT NULL REFERENCES recurring_entries(id) ON DELETE CASCADE,
    
    -- القيد الفعلي المُنشأ
    journal_entry_id UUID REFERENCES journal_entries(id),
    
    -- التواريخ
    scheduled_date DATE NOT NULL, -- التاريخ المجدول
    executed_at TIMESTAMPTZ, -- تاريخ التنفيذ الفعلي
    executed_by UUID REFERENCES user_profiles(id),
    
    -- المبلغ المنفذ
    amount NUMERIC(18,2),
    
    -- حالة الموافقة
    approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'auto_approved'
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- الحالة العامة
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'skipped', 'cancelled'
    error_message TEXT,
    
    -- الإشعارات
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- قيود
    CONSTRAINT chk_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    CONSTRAINT chk_history_status CHECK (status IN ('pending', 'executed', 'failed', 'skipped', 'cancelled'))
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_recurring_entry_history_entry ON recurring_entry_history(recurring_entry_id);
CREATE INDEX IF NOT EXISTS idx_recurring_entry_history_date ON recurring_entry_history(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_recurring_entry_history_status ON recurring_entry_history(status);
CREATE INDEX IF NOT EXISTS idx_recurring_entry_history_approval ON recurring_entry_history(approval_status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. سياسات RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE recurring_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_entry_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_entries_tenant_isolation ON recurring_entries;
CREATE POLICY recurring_entries_tenant_isolation ON recurring_entries
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS recurring_entry_lines_tenant_isolation ON recurring_entry_lines;
CREATE POLICY recurring_entry_lines_tenant_isolation ON recurring_entry_lines
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS recurring_entry_history_tenant_isolation ON recurring_entry_history;
CREATE POLICY recurring_entry_history_tenant_isolation ON recurring_entry_history
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة حساب تاريخ التنفيذ التالي
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_next_run_date(
    p_current_date DATE,
    p_frequency VARCHAR,
    p_interval_value INTEGER,
    p_day_of_month INTEGER,
    p_day_of_week INTEGER,
    p_month_of_year INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_date DATE;
BEGIN
    CASE p_frequency
        WHEN 'daily' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '1 day');
            
        WHEN 'weekly' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '1 week');
            IF p_day_of_week IS NOT NULL THEN
                v_next_date := v_next_date + (p_day_of_week - EXTRACT(DOW FROM v_next_date))::INTEGER;
            END IF;
            
        WHEN 'bi_weekly' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '2 weeks');
            
        WHEN 'monthly' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '1 month');
            IF p_day_of_month IS NOT NULL THEN
                v_next_date := DATE_TRUNC('month', v_next_date) + (LEAST(p_day_of_month, EXTRACT(DAY FROM DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::INTEGER) - 1) * INTERVAL '1 day';
            END IF;
            
        WHEN 'quarterly' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '3 months');
            
        WHEN 'semi_annual' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '6 months');
            
        WHEN 'yearly' THEN
            v_next_date := p_current_date + (p_interval_value * INTERVAL '1 year');
            
        ELSE
            v_next_date := p_current_date + INTERVAL '1 month';
    END CASE;
    
    RETURN v_next_date;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة فحص وإنشاء القيود المستحقة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_due_recurring_entries(
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entry RECORD;
    v_history_id UUID;
    v_processed_count INTEGER := 0;
    v_results JSONB := '[]'::JSONB;
BEGIN
    -- البحث عن القيود المستحقة
    FOR v_entry IN
        SELECT *
        FROM recurring_entries
        WHERE is_active = true
          AND status = 'active'
          AND next_run_date <= p_as_of_date
          AND (end_date IS NULL OR end_date >= p_as_of_date)
          AND (max_executions IS NULL OR times_executed < max_executions)
    LOOP
        -- إنشاء سجل في التاريخ
        INSERT INTO recurring_entry_history (
            tenant_id, recurring_entry_id, scheduled_date, amount,
            approval_status, status
        ) VALUES (
            v_entry.tenant_id, v_entry.id, v_entry.next_run_date, v_entry.amount,
            CASE WHEN v_entry.requires_approval THEN 'pending' ELSE 'auto_approved' END,
            CASE WHEN v_entry.requires_approval THEN 'pending' ELSE 'pending' END
        ) RETURNING id INTO v_history_id;
        
        -- تحديث تاريخ التنفيذ التالي
        UPDATE recurring_entries
        SET 
            next_run_date = calculate_next_run_date(
                next_run_date, frequency, interval_value,
                day_of_month, day_of_week, month_of_year
            ),
            last_run_date = p_as_of_date,
            times_executed = times_executed + 1,
            updated_at = NOW()
        WHERE id = v_entry.id;
        
        -- إذا لا يحتاج موافقة، نفذ مباشرة
        IF NOT v_entry.requires_approval THEN
            PERFORM execute_recurring_entry(v_history_id, NULL);
        END IF;
        
        v_processed_count := v_processed_count + 1;
        v_results := v_results || jsonb_build_object(
            'entry_id', v_entry.id,
            'name', v_entry.name_ar,
            'history_id', v_history_id,
            'requires_approval', v_entry.requires_approval
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'entries', v_results
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة تنفيذ قيد متكرر (إنشاء قيد فعلي)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION execute_recurring_entry(
    p_history_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history RECORD;
    v_recurring RECORD;
    v_journal_entry_id UUID;
    v_line RECORD;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
BEGIN
    -- جلب سجل التاريخ
    SELECT * INTO v_history FROM recurring_entry_history WHERE id = p_history_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'History record not found');
    END IF;
    
    -- التحقق من الحالة
    IF v_history.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entry already processed');
    END IF;
    
    IF v_history.approval_status NOT IN ('approved', 'auto_approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entry not approved');
    END IF;
    
    -- جلب القيد المتكرر
    SELECT * INTO v_recurring FROM recurring_entries WHERE id = v_history.recurring_entry_id;
    
    -- إنشاء القيد المحاسبي الفعلي
    INSERT INTO journal_entries (
        tenant_id, company_id, branch_id,
        entry_date, description, description_ar,
        entry_type, reference_type, reference_id,
        currency, status, created_by
    ) VALUES (
        v_recurring.tenant_id, v_recurring.company_id, v_recurring.branch_id,
        v_history.scheduled_date, v_recurring.name_en, v_recurring.name_ar,
        'recurring', 'recurring_entry', v_recurring.id,
        v_recurring.currency, 'draft', p_user_id
    ) RETURNING id INTO v_journal_entry_id;
    
    -- إضافة بنود القيد
    FOR v_line IN
        SELECT * FROM recurring_entry_lines WHERE recurring_entry_id = v_recurring.id ORDER BY line_number
    LOOP
        INSERT INTO journal_entry_lines (
            tenant_id, entry_id, line_number, account_id,
            debit, credit, description, cost_center_id
        ) VALUES (
            v_recurring.tenant_id, v_journal_entry_id, v_line.line_number, v_line.account_id,
            v_line.debit, v_line.credit, v_line.description, v_line.cost_center_id
        );
        
        v_total_debit := v_total_debit + v_line.debit;
        v_total_credit := v_total_credit + v_line.credit;
    END LOOP;
    
    -- تحديث إجماليات القيد
    UPDATE journal_entries
    SET total_debit = v_total_debit, total_credit = v_total_credit
    WHERE id = v_journal_entry_id;
    
    -- ترحيل تلقائي إذا مفعّل
    IF v_recurring.auto_post THEN
        UPDATE journal_entries
        SET status = 'posted', is_posted = true, posted_at = NOW(), posted_by = p_user_id
        WHERE id = v_journal_entry_id;
    END IF;
    
    -- تحديث سجل التاريخ
    UPDATE recurring_entry_history
    SET 
        journal_entry_id = v_journal_entry_id,
        executed_at = NOW(),
        executed_by = p_user_id,
        status = 'executed'
    WHERE id = p_history_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', v_journal_entry_id,
        'total_debit', v_total_debit,
        'total_credit', v_total_credit,
        'auto_posted', v_recurring.auto_post
    );
    
EXCEPTION WHEN OTHERS THEN
    UPDATE recurring_entry_history
    SET status = 'failed', error_message = SQLERRM
    WHERE id = p_history_id;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. دالة الموافقة على قيد متكرر
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION approve_recurring_entry(
    p_history_id UUID,
    p_user_id UUID,
    p_execute_now BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history RECORD;
    v_result JSONB;
BEGIN
    -- جلب السجل
    SELECT * INTO v_history FROM recurring_entry_history WHERE id = p_history_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Record not found');
    END IF;
    
    -- التحقق من الحالة
    IF v_history.approval_status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already processed');
    END IF;
    
    -- تحديث الموافقة
    UPDATE recurring_entry_history
    SET 
        approval_status = 'approved',
        approved_by = p_user_id,
        approved_at = NOW()
    WHERE id = p_history_id;
    
    -- تنفيذ القيد إذا طُلب
    IF p_execute_now THEN
        v_result := execute_recurring_entry(p_history_id, p_user_id);
        RETURN v_result;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Approved successfully',
        'executed', false
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. دالة رفض قيد متكرر
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reject_recurring_entry(
    p_history_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE recurring_entry_history
    SET 
        approval_status = 'rejected',
        approved_by = p_user_id,
        approved_at = NOW(),
        rejection_reason = p_reason,
        status = 'cancelled'
    WHERE id = p_history_id
      AND approval_status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Record not found or already processed');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Rejected successfully');
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. دالة الحصول على القيود المستحقة للموافقة
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pending_recurring_entries(
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    history_id UUID,
    recurring_entry_id UUID,
    entry_name VARCHAR,
    scheduled_date DATE,
    amount NUMERIC,
    approval_status VARCHAR,
    days_pending INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        reh.id as history_id,
        reh.recurring_entry_id,
        re.name_ar as entry_name,
        reh.scheduled_date,
        reh.amount,
        reh.approval_status,
        (CURRENT_DATE - reh.scheduled_date)::INTEGER as days_pending,
        reh.created_at
    FROM recurring_entry_history reh
    JOIN recurring_entries re ON reh.recurring_entry_id = re.id
    WHERE reh.approval_status = 'pending'
      AND reh.status = 'pending'
      AND (p_company_id IS NULL OR re.company_id = p_company_id)
    ORDER BY reh.scheduled_date ASC;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. تعليقات
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE recurring_entries IS 'القيود المتكررة - قوالب للقيود التي تتكرر دورياً';
COMMENT ON TABLE recurring_entry_lines IS 'بنود القيد المتكرر - تفاصيل الحسابات والمبالغ';
COMMENT ON TABLE recurring_entry_history IS 'سجل تنفيذ القيود المتكررة - يتضمن حالة الموافقة والتنفيذ';

COMMENT ON FUNCTION process_due_recurring_entries IS 'فحص وإنشاء سجلات للقيود المستحقة';
COMMENT ON FUNCTION execute_recurring_entry IS 'تنفيذ قيد متكرر وإنشاء قيد محاسبي فعلي';
COMMENT ON FUNCTION approve_recurring_entry IS 'الموافقة على قيد متكرر مع خيار التنفيذ';
COMMENT ON FUNCTION reject_recurring_entry IS 'رفض قيد متكرر مع ذكر السبب';

-- ═══════════════════════════════════════════════════════════════════════════
-- انتهى
-- ═══════════════════════════════════════════════════════════════════════════
