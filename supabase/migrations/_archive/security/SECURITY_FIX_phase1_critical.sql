-- ═══════════════════════════════════════════════════════════════════════════
-- 🔒 إصلاح أمني شامل - المرحلة 1 (نسخة مصححة v4)
-- تاريخ: 2026-02-04
-- الإصلاح: استخدام الأعمدة الصحيحة لكل جدول
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- الجزء 1: تفعيل RLS على الجداول المالية الحرجة
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. payment_receipts
ALTER TABLE IF EXISTS payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_receipts_tenant_isolation_select" ON payment_receipts;
CREATE POLICY "payment_receipts_tenant_isolation_select" ON payment_receipts
    FOR SELECT USING (
        tenant_id = get_current_user_tenant_id() 
        OR is_super_admin(auth.uid())
    );

DROP POLICY IF EXISTS "payment_receipts_tenant_isolation_insert" ON payment_receipts;
CREATE POLICY "payment_receipts_tenant_isolation_insert" ON payment_receipts
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "payment_receipts_tenant_isolation_update" ON payment_receipts;
CREATE POLICY "payment_receipts_tenant_isolation_update" ON payment_receipts
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "payment_receipts_tenant_isolation_delete" ON payment_receipts;
CREATE POLICY "payment_receipts_tenant_isolation_delete" ON payment_receipts
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 2. payment_vouchers
ALTER TABLE IF EXISTS payment_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_vouchers_tenant_isolation_select" ON payment_vouchers;
CREATE POLICY "payment_vouchers_tenant_isolation_select" ON payment_vouchers
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "payment_vouchers_tenant_isolation_insert" ON payment_vouchers;
CREATE POLICY "payment_vouchers_tenant_isolation_insert" ON payment_vouchers
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "payment_vouchers_tenant_isolation_update" ON payment_vouchers;
CREATE POLICY "payment_vouchers_tenant_isolation_update" ON payment_vouchers
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "payment_vouchers_tenant_isolation_delete" ON payment_vouchers;
CREATE POLICY "payment_vouchers_tenant_isolation_delete" ON payment_vouchers
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 3. sales_invoices
ALTER TABLE IF EXISTS sales_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_invoices_tenant_isolation_select" ON sales_invoices;
CREATE POLICY "sales_invoices_tenant_isolation_select" ON sales_invoices
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "sales_invoices_tenant_isolation_insert" ON sales_invoices;
CREATE POLICY "sales_invoices_tenant_isolation_insert" ON sales_invoices
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "sales_invoices_tenant_isolation_update" ON sales_invoices;
CREATE POLICY "sales_invoices_tenant_isolation_update" ON sales_invoices
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "sales_invoices_tenant_isolation_delete" ON sales_invoices;
CREATE POLICY "sales_invoices_tenant_isolation_delete" ON sales_invoices
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 4. sales_invoice_items
ALTER TABLE IF EXISTS sales_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_invoice_items_tenant_isolation_select" ON sales_invoice_items;
CREATE POLICY "sales_invoice_items_tenant_isolation_select" ON sales_invoice_items
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "sales_invoice_items_tenant_isolation_insert" ON sales_invoice_items;
CREATE POLICY "sales_invoice_items_tenant_isolation_insert" ON sales_invoice_items
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "sales_invoice_items_tenant_isolation_update" ON sales_invoice_items;
CREATE POLICY "sales_invoice_items_tenant_isolation_update" ON sales_invoice_items
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "sales_invoice_items_tenant_isolation_delete" ON sales_invoice_items;
CREATE POLICY "sales_invoice_items_tenant_isolation_delete" ON sales_invoice_items
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 5. exchange_rates
ALTER TABLE IF EXISTS exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_tenant_isolation_select" ON exchange_rates;
CREATE POLICY "exchange_rates_tenant_isolation_select" ON exchange_rates
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "exchange_rates_tenant_isolation_insert" ON exchange_rates;
CREATE POLICY "exchange_rates_tenant_isolation_insert" ON exchange_rates
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "exchange_rates_tenant_isolation_update" ON exchange_rates;
CREATE POLICY "exchange_rates_tenant_isolation_update" ON exchange_rates
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "exchange_rates_tenant_isolation_delete" ON exchange_rates;
CREATE POLICY "exchange_rates_tenant_isolation_delete" ON exchange_rates
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 6. account_transfers
ALTER TABLE IF EXISTS account_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_transfers_tenant_isolation_select" ON account_transfers;
CREATE POLICY "account_transfers_tenant_isolation_select" ON account_transfers
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "account_transfers_tenant_isolation_insert" ON account_transfers;
CREATE POLICY "account_transfers_tenant_isolation_insert" ON account_transfers
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "account_transfers_tenant_isolation_update" ON account_transfers;
CREATE POLICY "account_transfers_tenant_isolation_update" ON account_transfers
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "account_transfers_tenant_isolation_delete" ON account_transfers;
CREATE POLICY "account_transfers_tenant_isolation_delete" ON account_transfers
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 7. bank_account_limits
ALTER TABLE IF EXISTS bank_account_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_account_limits_tenant_isolation_select" ON bank_account_limits;
CREATE POLICY "bank_account_limits_tenant_isolation_select" ON bank_account_limits
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "bank_account_limits_tenant_isolation_insert" ON bank_account_limits;
CREATE POLICY "bank_account_limits_tenant_isolation_insert" ON bank_account_limits
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "bank_account_limits_tenant_isolation_update" ON bank_account_limits;
CREATE POLICY "bank_account_limits_tenant_isolation_update" ON bank_account_limits
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "bank_account_limits_tenant_isolation_delete" ON bank_account_limits;
CREATE POLICY "bank_account_limits_tenant_isolation_delete" ON bank_account_limits
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 8. inventory_movements
ALTER TABLE IF EXISTS inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_movements_tenant_isolation_select" ON inventory_movements;
CREATE POLICY "inventory_movements_tenant_isolation_select" ON inventory_movements
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "inventory_movements_tenant_isolation_insert" ON inventory_movements;
CREATE POLICY "inventory_movements_tenant_isolation_insert" ON inventory_movements
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "inventory_movements_tenant_isolation_update" ON inventory_movements;
CREATE POLICY "inventory_movements_tenant_isolation_update" ON inventory_movements
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id())
    WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "inventory_movements_tenant_isolation_delete" ON inventory_movements;
CREATE POLICY "inventory_movements_tenant_isolation_delete" ON inventory_movements
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- الجزء 2: إضافة سياسات للجداول المحجوبة (مع الأعمدة الصحيحة)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. funds (لديه company_id و branch_id فقط، بدون tenant_id)
DROP POLICY IF EXISTS "funds_tenant_isolation_select" ON funds;
CREATE POLICY "funds_tenant_isolation_select" ON funds
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
        OR is_super_admin(auth.uid())
    );

DROP POLICY IF EXISTS "funds_tenant_isolation_insert" ON funds;
CREATE POLICY "funds_tenant_isolation_insert" ON funds
    FOR INSERT WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
    );

DROP POLICY IF EXISTS "funds_tenant_isolation_update" ON funds;
CREATE POLICY "funds_tenant_isolation_update" ON funds
    FOR UPDATE USING (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
    );

DROP POLICY IF EXISTS "funds_tenant_isolation_delete" ON funds;
CREATE POLICY "funds_tenant_isolation_delete" ON funds
    FOR DELETE USING (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
        OR is_super_admin(auth.uid())
    );

-- 2. account_invoices (لديه tenant_id)
DROP POLICY IF EXISTS "account_invoices_tenant_isolation_select" ON account_invoices;
CREATE POLICY "account_invoices_tenant_isolation_select" ON account_invoices
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "account_invoices_tenant_isolation_insert" ON account_invoices;
CREATE POLICY "account_invoices_tenant_isolation_insert" ON account_invoices
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "account_invoices_tenant_isolation_update" ON account_invoices;
CREATE POLICY "account_invoices_tenant_isolation_update" ON account_invoices
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "account_invoices_tenant_isolation_delete" ON account_invoices;
CREATE POLICY "account_invoices_tenant_isolation_delete" ON account_invoices
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 3. account_invoice_items (لديه tenant_id فقط)
DROP POLICY IF EXISTS "account_invoice_items_tenant_isolation_select" ON account_invoice_items;
CREATE POLICY "account_invoice_items_tenant_isolation_select" ON account_invoice_items
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "account_invoice_items_tenant_isolation_insert" ON account_invoice_items;
CREATE POLICY "account_invoice_items_tenant_isolation_insert" ON account_invoice_items
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "account_invoice_items_tenant_isolation_update" ON account_invoice_items;
CREATE POLICY "account_invoice_items_tenant_isolation_update" ON account_invoice_items
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "account_invoice_items_tenant_isolation_delete" ON account_invoice_items;
CREATE POLICY "account_invoice_items_tenant_isolation_delete" ON account_invoice_items
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 4. billing_payments (لديه tenant_id فقط)
DROP POLICY IF EXISTS "billing_payments_tenant_isolation_select" ON billing_payments;
CREATE POLICY "billing_payments_tenant_isolation_select" ON billing_payments
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "billing_payments_tenant_isolation_insert" ON billing_payments;
CREATE POLICY "billing_payments_tenant_isolation_insert" ON billing_payments
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "billing_payments_tenant_isolation_update" ON billing_payments;
CREATE POLICY "billing_payments_tenant_isolation_update" ON billing_payments
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "billing_payments_tenant_isolation_delete" ON billing_payments;
CREATE POLICY "billing_payments_tenant_isolation_delete" ON billing_payments
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 5. currency_exchanges (لديه company_id و branch_id فقط، بدون tenant_id)
DROP POLICY IF EXISTS "currency_exchanges_tenant_isolation_select" ON currency_exchanges;
CREATE POLICY "currency_exchanges_tenant_isolation_select" ON currency_exchanges
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
        OR is_super_admin(auth.uid())
    );

DROP POLICY IF EXISTS "currency_exchanges_tenant_isolation_insert" ON currency_exchanges;
CREATE POLICY "currency_exchanges_tenant_isolation_insert" ON currency_exchanges
    FOR INSERT WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
    );

DROP POLICY IF EXISTS "currency_exchanges_tenant_isolation_update" ON currency_exchanges;
CREATE POLICY "currency_exchanges_tenant_isolation_update" ON currency_exchanges
    FOR UPDATE USING (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
    );

DROP POLICY IF EXISTS "currency_exchanges_tenant_isolation_delete" ON currency_exchanges;
CREATE POLICY "currency_exchanges_tenant_isolation_delete" ON currency_exchanges
    FOR DELETE USING (
        company_id IN (SELECT id FROM companies WHERE tenant_id = get_current_user_tenant_id())
        OR is_super_admin(auth.uid())
    );

-- 6. customer_groups (لديه company_id و tenant_id)
DROP POLICY IF EXISTS "customer_groups_tenant_isolation_select" ON customer_groups;
CREATE POLICY "customer_groups_tenant_isolation_select" ON customer_groups
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "customer_groups_tenant_isolation_insert" ON customer_groups;
CREATE POLICY "customer_groups_tenant_isolation_insert" ON customer_groups
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "customer_groups_tenant_isolation_update" ON customer_groups;
CREATE POLICY "customer_groups_tenant_isolation_update" ON customer_groups
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "customer_groups_tenant_isolation_delete" ON customer_groups;
CREATE POLICY "customer_groups_tenant_isolation_delete" ON customer_groups
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 7. supplier_groups (لديه tenant_id فقط)
DROP POLICY IF EXISTS "supplier_groups_tenant_isolation_select" ON supplier_groups;
CREATE POLICY "supplier_groups_tenant_isolation_select" ON supplier_groups
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "supplier_groups_tenant_isolation_insert" ON supplier_groups;
CREATE POLICY "supplier_groups_tenant_isolation_insert" ON supplier_groups
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "supplier_groups_tenant_isolation_update" ON supplier_groups;
CREATE POLICY "supplier_groups_tenant_isolation_update" ON supplier_groups
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "supplier_groups_tenant_isolation_delete" ON supplier_groups;
CREATE POLICY "supplier_groups_tenant_isolation_delete" ON supplier_groups
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 8. recurring_entry_templates (لديه tenant_id و company_id)
DROP POLICY IF EXISTS "recurring_entry_templates_tenant_isolation_select" ON recurring_entry_templates;
CREATE POLICY "recurring_entry_templates_tenant_isolation_select" ON recurring_entry_templates
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "recurring_entry_templates_tenant_isolation_insert" ON recurring_entry_templates;
CREATE POLICY "recurring_entry_templates_tenant_isolation_insert" ON recurring_entry_templates
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "recurring_entry_templates_tenant_isolation_update" ON recurring_entry_templates;
CREATE POLICY "recurring_entry_templates_tenant_isolation_update" ON recurring_entry_templates
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "recurring_entry_templates_tenant_isolation_delete" ON recurring_entry_templates;
CREATE POLICY "recurring_entry_templates_tenant_isolation_delete" ON recurring_entry_templates
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 9. recurring_entry_executions (لديه tenant_id فقط)
DROP POLICY IF EXISTS "recurring_entry_executions_tenant_isolation_select" ON recurring_entry_executions;
CREATE POLICY "recurring_entry_executions_tenant_isolation_select" ON recurring_entry_executions
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "recurring_entry_executions_tenant_isolation_insert" ON recurring_entry_executions;
CREATE POLICY "recurring_entry_executions_tenant_isolation_insert" ON recurring_entry_executions
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "recurring_entry_executions_tenant_isolation_update" ON recurring_entry_executions;
CREATE POLICY "recurring_entry_executions_tenant_isolation_update" ON recurring_entry_executions
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "recurring_entry_executions_tenant_isolation_delete" ON recurring_entry_executions;
CREATE POLICY "recurring_entry_executions_tenant_isolation_delete" ON recurring_entry_executions
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 10. reservations (لديه tenant_id, company_id, branch_id)
DROP POLICY IF EXISTS "reservations_tenant_isolation_select" ON reservations;
CREATE POLICY "reservations_tenant_isolation_select" ON reservations
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "reservations_tenant_isolation_insert" ON reservations;
CREATE POLICY "reservations_tenant_isolation_insert" ON reservations
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "reservations_tenant_isolation_update" ON reservations;
CREATE POLICY "reservations_tenant_isolation_update" ON reservations
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "reservations_tenant_isolation_delete" ON reservations;
CREATE POLICY "reservations_tenant_isolation_delete" ON reservations
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 11. reservation_items (لديه tenant_id فقط)
DROP POLICY IF EXISTS "reservation_items_tenant_isolation_select" ON reservation_items;
CREATE POLICY "reservation_items_tenant_isolation_select" ON reservation_items
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "reservation_items_tenant_isolation_insert" ON reservation_items;
CREATE POLICY "reservation_items_tenant_isolation_insert" ON reservation_items
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "reservation_items_tenant_isolation_update" ON reservation_items;
CREATE POLICY "reservation_items_tenant_isolation_update" ON reservation_items
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "reservation_items_tenant_isolation_delete" ON reservation_items;
CREATE POLICY "reservation_items_tenant_isolation_delete" ON reservation_items
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- الجزء 3: سياسات للجداول المرجعية
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. subscription_plans
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_public_read" ON subscription_plans;
CREATE POLICY "subscription_plans_public_read" ON subscription_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_plans_admin_write" ON subscription_plans;
CREATE POLICY "subscription_plans_admin_write" ON subscription_plans
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 2. system_modules
ALTER TABLE IF EXISTS system_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_modules_public_read" ON system_modules;
CREATE POLICY "system_modules_public_read" ON system_modules
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_modules_admin_write" ON system_modules;
CREATE POLICY "system_modules_admin_write" ON system_modules
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 3. countries
ALTER TABLE IF EXISTS countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "countries_public_read" ON countries;
CREATE POLICY "countries_public_read" ON countries
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "countries_admin_write" ON countries;
CREATE POLICY "countries_admin_write" ON countries
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 4. country_configurations
ALTER TABLE IF EXISTS country_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "country_configurations_public_read" ON country_configurations;
CREATE POLICY "country_configurations_public_read" ON country_configurations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "country_configurations_admin_write" ON country_configurations;
CREATE POLICY "country_configurations_admin_write" ON country_configurations
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- الجزء 4: سياسات الإشعارات
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. notifications
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_tenant_isolation_select" ON notifications;
CREATE POLICY "notifications_tenant_isolation_select" ON notifications
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications_tenant_isolation_insert" ON notifications;
CREATE POLICY "notifications_tenant_isolation_insert" ON notifications
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "notifications_tenant_isolation_update" ON notifications;
CREATE POLICY "notifications_tenant_isolation_update" ON notifications
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "notifications_tenant_isolation_delete" ON notifications;
CREATE POLICY "notifications_tenant_isolation_delete" ON notifications
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- 2. in_app_notifications
ALTER TABLE IF EXISTS in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "in_app_notifications_tenant_isolation_select" ON in_app_notifications;
CREATE POLICY "in_app_notifications_tenant_isolation_select" ON in_app_notifications
    FOR SELECT USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "in_app_notifications_tenant_isolation_insert" ON in_app_notifications;
CREATE POLICY "in_app_notifications_tenant_isolation_insert" ON in_app_notifications
    FOR INSERT WITH CHECK (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "in_app_notifications_tenant_isolation_update" ON in_app_notifications;
CREATE POLICY "in_app_notifications_tenant_isolation_update" ON in_app_notifications
    FOR UPDATE USING (tenant_id = get_current_user_tenant_id());

DROP POLICY IF EXISTS "in_app_notifications_tenant_isolation_delete" ON in_app_notifications;
CREATE POLICY "in_app_notifications_tenant_isolation_delete" ON in_app_notifications
    FOR DELETE USING (tenant_id = get_current_user_tenant_id() OR is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- رسالة النجاح
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ تم تطبيق الإصلاحات الأمنية بنجاح!';
    RAISE NOTICE '📊 الجداول المالية: 8 جداول مؤمنة';
    RAISE NOTICE '📊 الجداول المحجوبة: 11 جدول أضيفت لها سياسات';
    RAISE NOTICE '📊 الجداول المرجعية: 4 جداول للقراءة فقط';
    RAISE NOTICE '📊 الإشعارات: 2 جدول مؤمن';
END $$;
