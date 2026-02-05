-- ============================================================================
-- Add Missing Columns to saas_payments Table
-- ============================================================================

-- Add product_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saas_payments' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE saas_payments ADD COLUMN product_id UUID REFERENCES saas_products(id);
        CREATE INDEX idx_payments_product ON saas_payments(product_id);
    END IF;
END $$;

-- Add bank_account_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saas_payments' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE saas_payments ADD COLUMN bank_account_id UUID;
    END IF;
END $$;

-- Add wallet_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saas_payments' AND column_name = 'wallet_id'
    ) THEN
        ALTER TABLE saas_payments ADD COLUMN wallet_id UUID;
    END IF;
END $$;

-- Add receipt_url column if it doesn't exist (rename attachment_url or add new)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saas_payments' AND column_name = 'receipt_url'
    ) THEN
        ALTER TABLE saas_payments ADD COLUMN receipt_url TEXT;
    END IF;
END $$;

-- Update payment_method to support digital_wallet
COMMENT ON COLUMN saas_payments.payment_method IS 'Payment method: cash, bank_transfer, credit_card, digital_wallet, check, other';

-- Update comments
COMMENT ON TABLE saas_payments IS 'SaaS payment transactions with full accounting integration';
COMMENT ON COLUMN saas_payments.product_id IS 'Reference to the product (nexacore, texacore, etc.)';
COMMENT ON COLUMN saas_payments.account_id IS 'Reference to chart of accounts (for cash or general account)';
COMMENT ON COLUMN saas_payments.bank_account_id IS 'Reference to bank accounts table';
COMMENT ON COLUMN saas_payments.wallet_id IS 'Reference to digital wallets table';
COMMENT ON COLUMN saas_payments.receipt_url IS 'URL to uploaded payment receipt/proof';
COMMENT ON COLUMN saas_payments.reference_number IS 'Bank transfer reference or check number';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added missing columns to saas_payments table';
END $$;
