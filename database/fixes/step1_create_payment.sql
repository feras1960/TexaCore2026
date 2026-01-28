-- ============================================================================
-- اختبار تفعيل الاشتراك - مبسط
-- ============================================================================

-- الخطوة 1: إنشاء دفعة تجريبية
INSERT INTO saas_payments (
    payment_number,
    tenant_id,
    amount,
    currency,
    payment_method,
    collection_date,
    status
) VALUES (
    'PAY-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
    'e3a8b7ef-6f27-43c1-bd3f-61d183a97a47',  -- Default Tenant
    100.00,
    'USD',
    'cash',
    CURRENT_DATE,
    'pending'
)
RETURNING 
    id as payment_id,
    payment_number,
    tenant_id,
    amount,
    currency;
