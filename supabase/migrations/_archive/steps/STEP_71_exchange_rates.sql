-- ═══════════════════════════════════════════════════════════════
-- STEP 71: Exchange Rates System
-- ═══════════════════════════════════════════════════════════════
-- Description: Create exchange_rates table and add rates
-- Note: Simplified version from migration 00010
-- Author: System
-- Date: 2026-01-31
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Part 1: Create Exchange Rates Table
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS exchange_rates CASCADE;

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Currencies
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    
    -- Rates
    buy_rate DECIMAL(18,8) NOT NULL,
    sell_rate DECIMAL(18,8) NOT NULL,
    mid_rate DECIMAL(18,8) GENERATED ALWAYS AS ((buy_rate + sell_rate) / 2) STORED,
    
    -- Margin
    margin_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Time Period
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    
    -- Source
    source VARCHAR(50) DEFAULT 'manual',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective ON exchange_rates(effective_from);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant ON exchange_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON exchange_rates(company_id);

COMMENT ON TABLE exchange_rates IS 'Currency exchange rates with buy/sell rates and time periods';

-- ═══════════════════════════════════════════════════════════════
-- Part 2: USD/UAH Exchange Rates
-- ═══════════════════════════════════════════════════════════════

-- USD to UAH: 42.811
INSERT INTO exchange_rates (
    tenant_id,
    company_id,
    from_currency,
    to_currency,
    buy_rate,
    sell_rate,
    effective_from,
    source,
    is_active
)
VALUES (
    '681aa0e4-7692-4337-a3e8-2c127f80e573',
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'USD',
    'UAH',
    42.811,
    42.811,
    NOW(),
    'manual',
    true
)
ON CONFLICT DO NOTHING;

-- UAH to USD: 1/42.811
INSERT INTO exchange_rates (
    tenant_id,
    company_id,
    from_currency,
    to_currency,
    buy_rate,
    sell_rate,
    effective_from,
    source,
    is_active
)
VALUES (
    '681aa0e4-7692-4337-a3e8-2c127f80e573',
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'UAH',
    'USD',
    1.0/42.811,
    1.0/42.811,
    NOW(),
    'manual',
    true
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Part 2: EUR/UAH Exchange Rates (approximate)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO exchange_rates (
    tenant_id, company_id,
    from_currency, to_currency,
    buy_rate, sell_rate,
    effective_from, source, is_active
)
VALUES (
    '681aa0e4-7692-4337-a3e8-2c127f80e573',
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'EUR', 'UAH',
    45.50, 45.50,
    NOW(), 'manual', true
),
(
    '681aa0e4-7692-4337-a3e8-2c127f80e573',
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'UAH', 'EUR',
    1.0/45.50, 1.0/45.50,
    NOW(), 'manual', true
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Part 3: GBP/UAH Exchange Rates (approximate)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO exchange_rates (
    tenant_id, company_id,
    from_currency, to_currency,
    buy_rate, sell_rate,
    effective_from, source, is_active
)
VALUES (
    '681aa0e4-7692-4337-a3e8-2c127f80e573',
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'GBP', 'UAH',
    54.20, 54.20,
    NOW(), 'manual', true
),
(
    '681aa0e4-7692-4337-a3e8-2c127f80e573',
    '1313232a-6ad3-4002-891c-a9a9e8849a93',
    'UAH', 'GBP',
    1.0/54.20, 1.0/54.20,
    NOW(), 'manual', true
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Part 4: Currency Conversion Helper Function
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(15, 2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_company_id UUID,
    p_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rate DECIMAL(18, 8);
    v_result DECIMAL(15, 2);
BEGIN
    -- Same currency
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;
    
    -- Get exchange rate (use mid_rate)
    SELECT mid_rate INTO v_rate
    FROM exchange_rates
    WHERE company_id = p_company_id
      AND from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND effective_from <= p_date
      AND (effective_to IS NULL OR effective_to >= p_date)
      AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    
    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'No exchange rate found for % to % on %', 
            p_from_currency, p_to_currency, p_date;
    END IF;
    
    v_result := ROUND(p_amount * v_rate, 2);
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION convert_currency IS 'Convert amount from one currency to another using company exchange rates';

-- ═══════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 71 completed successfully!';
    RAISE NOTICE '   - USD/UAH rate: 42.811';
    RAISE NOTICE '   - EUR/UAH rate: 45.50';
    RAISE NOTICE '   - GBP/UAH rate: 54.20';
    RAISE NOTICE '   - convert_currency() function created';
END $$;
