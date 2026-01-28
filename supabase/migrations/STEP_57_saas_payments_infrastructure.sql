-- ============================================================================
-- STEP 57: SaaS Payments Infrastructure (SIMPLIFIED)
-- ============================================================================

-- ============================================================================
-- PART 1: Payments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS saas_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES subscription_plans(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_type VARCHAR(20) NOT NULL DEFAULT 'subscription',
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    collected_by UUID REFERENCES auth.users(id),
    collection_date TIMESTAMPTZ,
    account_id UUID,
    account_name VARCHAR(100),
    reference_number VARCHAR(100),
    period_start DATE,
    period_end DATE,
    notes TEXT,
    attachment_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON saas_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON saas_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON saas_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON saas_payments(collection_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON saas_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_number ON saas_payments(payment_number);

CREATE OR REPLACE FUNCTION update_saas_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_saas_payments_timestamp ON saas_payments;
CREATE TRIGGER trigger_update_saas_payments_timestamp
    BEFORE UPDATE ON saas_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_saas_payments_updated_at();

-- ============================================================================
-- PART 2: Payment Number Generator
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS saas_payment_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR AS $$
DECLARE
    v_number VARCHAR;
    v_year VARCHAR;
    v_month VARCHAR;
BEGIN
    v_year := TO_CHAR(NOW(), 'YY');
    v_month := TO_CHAR(NOW(), 'MM');
    v_number := 'PAY-' || v_year || v_month || '-' || LPAD(nextval('saas_payment_number_seq')::TEXT, 5, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: Statistics Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_total_revenue(
    p_currency VARCHAR DEFAULT 'USD',
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_total DECIMAL(12,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM saas_payments
    WHERE status = 'completed'
    AND currency = p_currency
    AND (p_start_date IS NULL OR collection_date >= p_start_date)
    AND (p_end_date IS NULL OR collection_date <= p_end_date);
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_monthly_revenue(
    p_months INT DEFAULT 12,
    p_currency VARCHAR DEFAULT 'USD'
)
RETURNS TABLE (
    month VARCHAR,
    revenue DECIMAL(12,2),
    payment_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(collection_date, 'YYYY-MM') as month,
        SUM(amount) as revenue,
        COUNT(*)::INT as payment_count
    FROM saas_payments
    WHERE status = 'completed'
    AND currency = p_currency
    AND collection_date >= NOW() - (p_months || ' months')::INTERVAL
    GROUP BY TO_CHAR(collection_date, 'YYYY-MM')
    ORDER BY month;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Activate Subscription on Payment
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_subscription_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.subscription_id IS NOT NULL THEN
        UPDATE tenant_subscriptions
        SET 
            status = 'active',
            updated_at = NOW()
        WHERE id = NEW.subscription_id
        AND status IN ('pending', 'paused');
        
        IF NEW.period_end IS NOT NULL THEN
            UPDATE tenant_subscriptions
            SET end_date = GREATEST(end_date, NEW.period_end)
            WHERE id = NEW.subscription_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_activate_subscription_on_payment ON saas_payments;
CREATE TRIGGER trigger_activate_subscription_on_payment
    AFTER INSERT OR UPDATE ON saas_payments
    FOR EACH ROW
    EXECUTE FUNCTION activate_subscription_on_payment();

-- ============================================================================
-- PART 5: RLS Policies (SIMPLIFIED)
-- ============================================================================

ALTER TABLE saas_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant payments" ON saas_payments;
CREATE POLICY "Users can view their tenant payments"
    ON saas_payments FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow all for authenticated" ON saas_payments;
CREATE POLICY "Allow all for authenticated"
    ON saas_payments FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- PART 6: Sample Data
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_subscription_id UUID;
    v_plan_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   Adding Sample Payments';
    RAISE NOTICE '============================================';
    
    SELECT t.id, ts.id, ts.plan_id
    INTO v_tenant_id, v_subscription_id, v_plan_id
    FROM tenants t
    LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'No tenants found - skipping sample data';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Tenant: %', v_tenant_id;
    
    INSERT INTO saas_payments (
        payment_number, tenant_id, subscription_id, plan_id,
        amount, currency, payment_type, payment_method, status,
        collection_date, account_name, reference_number,
        period_start, period_end
    ) VALUES (
        generate_payment_number(), v_tenant_id, v_subscription_id, v_plan_id,
        299.00, 'USD', 'subscription', 'bank_transfer', 'completed',
        NOW() - INTERVAL '3 months', 'Main Bank Account', 'TRF-' || LPAD(floor(random() * 10000)::TEXT, 5, '0'),
        (NOW() - INTERVAL '3 months')::DATE, (NOW() - INTERVAL '2 months')::DATE
    );
    
    INSERT INTO saas_payments (
        payment_number, tenant_id, subscription_id, plan_id,
        amount, currency, payment_type, payment_method, status,
        collection_date, account_name, reference_number,
        period_start, period_end
    ) VALUES (
        generate_payment_number(), v_tenant_id, v_subscription_id, v_plan_id,
        299.00, 'USD', 'subscription', 'cash', 'completed',
        NOW() - INTERVAL '2 months', 'Cash Register', 'CASH-' || LPAD(floor(random() * 10000)::TEXT, 5, '0'),
        (NOW() - INTERVAL '2 months')::DATE, (NOW() - INTERVAL '1 month')::DATE
    );
    
    INSERT INTO saas_payments (
        payment_number, tenant_id, subscription_id, plan_id,
        amount, currency, payment_type, payment_method, status,
        collection_date, account_name, reference_number,
        period_start, period_end
    ) VALUES (
        generate_payment_number(), v_tenant_id, v_subscription_id, v_plan_id,
        299.00, 'USD', 'subscription', 'credit_card', 'completed',
        NOW() - INTERVAL '1 month', 'Stripe Account', 'CH_' || LPAD(floor(random() * 10000)::TEXT, 5, '0'),
        (NOW() - INTERVAL '1 month')::DATE, NOW()::DATE
    );
    
    RAISE NOTICE 'Payment 1: $299 - Bank Transfer';
    RAISE NOTICE 'Payment 2: $299 - Cash';
    RAISE NOTICE 'Payment 3: $299 - Credit Card';
    RAISE NOTICE 'Total: $897';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   STEP 57 - SUCCESS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total Revenue: $%', get_total_revenue('USD');
    RAISE NOTICE '';
    RAISE NOTICE 'Next: npm run dev';
    RAISE NOTICE '';
END $$;
