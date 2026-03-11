-- ═══════════════════════════════════════════════════════════════
-- FIX: Party Balance RPCs — Filter posted entries only
-- ═══════════════════════════════════════════════════════════════
-- المشكلة: get_party_balances_bulk و get_party_balance لا يصفّيان
-- إلا القيود المرحّلة (is_posted = true)، مما يجعل الأرصدة تشمل
-- القيود المسودة وتُظهر أرقاماً خاطئة.
--
-- الحل: إضافة فلتر is_posted = true في كلا الدالتين
-- ═══════════════════════════════════════════════════════════════

-- ── 1. get_party_balances_bulk ───────────────────────────────
-- تُستخدم في صفحة الجهات لعرض أرصدة جميع الموردين/العملاء دفعةً
CREATE OR REPLACE FUNCTION get_party_balances_bulk(
    p_company_id UUID,
    p_party_type TEXT  -- 'supplier' | 'customer'
)
RETURNS TABLE(
    party_id UUID,
    total_debit NUMERIC,
    total_credit NUMERIC,
    balance NUMERIC,
    transaction_count BIGINT,
    last_transaction_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        jel.party_id::UUID,
        SUM(jel.debit)  AS total_debit,
        SUM(jel.credit) AS total_credit,
        CASE
            WHEN p_party_type = 'supplier'
                THEN SUM(jel.credit) - SUM(jel.debit)  -- نحن مدينون لهم
            ELSE
                SUM(jel.debit) - SUM(jel.credit)         -- هم مدينون لنا
        END AS balance,
        COUNT(*) AS transaction_count,
        MAX(je.entry_date)::DATE AS last_transaction_date
    FROM journal_entry_lines jel
    INNER JOIN journal_entries je
        ON je.id = jel.entry_id
       AND je.company_id = p_company_id    -- ✅ شركة صحيحة
       AND je.is_posted   = true           -- ✅ فقط المرحَّل
       AND je.status      = 'posted'       -- ✅ تأكيد مزدوج
    WHERE
        jel.party_type = p_party_type
        AND jel.party_id IS NOT NULL
    GROUP BY jel.party_id;
$$;

-- ── 2. get_party_balance ─────────────────────────────────────
-- تُستخدم لرصيد جهة واحدة
CREATE OR REPLACE FUNCTION get_party_balance(
    p_company_id UUID,
    p_party_type TEXT,
    p_party_id   UUID
)
RETURNS TABLE(
    party_id UUID,
    total_debit NUMERIC,
    total_credit NUMERIC,
    balance NUMERIC,
    transaction_count BIGINT,
    last_transaction_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        jel.party_id::UUID,
        SUM(jel.debit)  AS total_debit,
        SUM(jel.credit) AS total_credit,
        CASE
            WHEN p_party_type = 'supplier'
                THEN SUM(jel.credit) - SUM(jel.debit)
            ELSE
                SUM(jel.debit) - SUM(jel.credit)
        END AS balance,
        COUNT(*) AS transaction_count,
        MAX(je.entry_date)::DATE AS last_transaction_date
    FROM journal_entry_lines jel
    INNER JOIN journal_entries je
        ON je.id = jel.entry_id
       AND je.company_id = p_company_id    -- ✅ شركة صحيحة
       AND je.is_posted   = true           -- ✅ فقط المرحَّل
       AND je.status      = 'posted'       -- ✅ تأكيد مزدوج
    WHERE
        jel.party_type = p_party_type
        AND jel.party_id = p_party_id
    GROUP BY jel.party_id;
$$;

-- ── Grants ───────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_party_balances_bulk(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_party_balance(UUID, TEXT, UUID)  TO authenticated;

DO $$ BEGIN
    RAISE NOTICE '✅ Party Balance RPCs patched — now filtering is_posted = true only';
END $$;
