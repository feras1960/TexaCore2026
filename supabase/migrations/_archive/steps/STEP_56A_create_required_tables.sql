-- ============================================================================
-- STEP 56A: Create ALL Missing Required Tables (SIMPLIFIED)
-- ============================================================================

-- ============================================================================
-- PART 1: tenant_users
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);

CREATE OR REPLACE FUNCTION update_tenant_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenant_users_timestamp ON tenant_users;
CREATE TRIGGER trigger_update_tenant_users_timestamp
    BEFORE UPDATE ON tenant_users
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_users_updated_at();

-- ============================================================================
-- PART 2: tenant_subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    trial_end_date DATE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    next_billing_date DATE,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT valid_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan ON tenant_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_dates ON tenant_subscriptions(start_date, end_date);

CREATE OR REPLACE FUNCTION update_tenant_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenant_subscriptions_timestamp ON tenant_subscriptions;
CREATE TRIGGER trigger_update_tenant_subscriptions_timestamp
    BEFORE UPDATE ON tenant_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_subscriptions_updated_at();

-- ============================================================================
-- PART 3: RLS Policies (Simplified)
-- ============================================================================

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant memberships" ON tenant_users;
CREATE POLICY "Users can view their tenant memberships"
    ON tenant_users FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow all for authenticated users" ON tenant_users;
CREATE POLICY "Allow all for authenticated users"
    ON tenant_users FOR ALL
    USING (auth.role() = 'authenticated');

ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant subscriptions" ON tenant_subscriptions;
CREATE POLICY "Users can view their tenant subscriptions"
    ON tenant_subscriptions FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow all for authenticated users" ON tenant_subscriptions;
CREATE POLICY "Allow all for authenticated users"
    ON tenant_subscriptions FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- PART 4: Helper Function
-- ============================================================================

CREATE OR REPLACE FUNCTION link_user_to_tenant(
    p_tenant_id UUID,
    p_user_id UUID,
    p_role VARCHAR DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    v_link_id UUID;
BEGIN
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (p_tenant_id, p_user_id, p_role)
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO v_link_id;
    
    RETURN v_link_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

DO $$
DECLARE
    v_tenant_users_count INT;
    v_subscriptions_count INT;
BEGIN
    SELECT COUNT(*) INTO v_tenant_users_count FROM tenant_users;
    SELECT COUNT(*) INTO v_subscriptions_count FROM tenant_subscriptions;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   STEP 56A - SUCCESS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'tenant_users: % rows', v_tenant_users_count;
    RAISE NOTICE 'tenant_subscriptions: % rows', v_subscriptions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run STEP_57';
    RAISE NOTICE '';
END $$;
