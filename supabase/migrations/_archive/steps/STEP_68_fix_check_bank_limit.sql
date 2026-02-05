-- ═══════════════════════════════════════════════════════════════
-- STEP 68: Fix check_bank_limit Function
-- ═══════════════════════════════════════════════════════════════
-- Description: Fixes format() error with percentage sign
-- Author: System
-- Date: 2026-01-31
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_bank_limit(
    p_account_id UUID,
    p_amount DECIMAL(15, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit RECORD;
    v_new_total DECIMAL(15, 2);
    v_percentage DECIMAL(5, 2);
    v_status VARCHAR(20);
    v_message TEXT;
BEGIN
    -- Get limit info
    SELECT * INTO v_limit
    FROM bank_account_limits
    WHERE account_id = p_account_id
      AND is_active = true;
    
    -- No limit configured
    IF v_limit IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'ok',
            'has_limit', false,
            'message', 'No limit configured'
        );
    END IF;
    
    -- Calculate new total
    v_new_total := v_limit.current_year_total + p_amount;
    v_percentage := (v_new_total / v_limit.annual_limit) * 100;
    
    -- Determine status
    IF v_percentage >= 100 THEN
        v_status := 'exceeded';
        v_message := 'Annual limit exceeded! ' || v_new_total || '/' || v_limit.annual_limit || ' UAH (' || ROUND(v_percentage, 1) || '%)';
    ELSIF v_percentage >= v_limit.alert_threshold_percent THEN
        v_status := 'alert';
        v_message := 'Alert: Approaching limit! ' || v_new_total || '/' || v_limit.annual_limit || ' UAH (' || ROUND(v_percentage, 1) || '%)';
    ELSIF v_percentage >= v_limit.warning_threshold_percent THEN
        v_status := 'warning';
        v_message := 'Warning: ' || v_new_total || '/' || v_limit.annual_limit || ' UAH (' || ROUND(v_percentage, 1) || '%)';
    ELSE
        v_status := 'ok';
        v_message := 'Within limit: ' || v_new_total || '/' || v_limit.annual_limit || ' UAH (' || ROUND(v_percentage, 1) || '%)';
    END IF;
    
    RETURN jsonb_build_object(
        'status', v_status,
        'has_limit', true,
        'current_total', v_limit.current_year_total,
        'new_total', v_new_total,
        'annual_limit', v_limit.annual_limit,
        'percentage', v_percentage,
        'fop_group', v_limit.fop_group,
        'message', v_message
    );
END;
$$;

COMMENT ON FUNCTION check_bank_limit IS 'Check if a transaction would exceed FOP bank limits';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ STEP 68 completed successfully!';
    RAISE NOTICE '   - check_bank_limit() function fixed';
END $$;
