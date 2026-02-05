-- ═══════════════════════════════════════════════════════════════════════════
-- 📦 RLS POLICIES BACKUP
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 2026-02-05
-- Total Policies: 341
-- Database: TexaCore ERP (wzkklenfsaepegymfxfz)
-- 
-- This file contains CREATE POLICY statements for all RLS policies
-- Use this to restore policies if needed
-- 
-- To restore a specific policy:
-- 1. DROP POLICY IF EXISTS "policy_name" ON table_name;
-- 2. Run the CREATE POLICY statement
-- ═══════════════════════════════════════════════════════════════════════════

-- Policy: account_invoice_items_tenant_isolation_delete
CREATE POLICY "account_invoice_items_tenant_isolation_delete" ON public.account_invoice_items
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: account_invoice_items_tenant_isolation_insert
CREATE POLICY "account_invoice_items_tenant_isolation_insert" ON public.account_invoice_items
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: account_invoice_items_tenant_isolation_select
CREATE POLICY "account_invoice_items_tenant_isolation_select" ON public.account_invoice_items
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: account_invoice_items_tenant_isolation_update
CREATE POLICY "account_invoice_items_tenant_isolation_update" ON public.account_invoice_items
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: account_invoices_tenant_isolation_delete
CREATE POLICY "account_invoices_tenant_isolation_delete" ON public.account_invoices
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: account_invoices_tenant_isolation_insert
CREATE POLICY "account_invoices_tenant_isolation_insert" ON public.account_invoices
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: account_invoices_tenant_isolation_select
CREATE POLICY "account_invoices_tenant_isolation_select" ON public.account_invoices
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: account_invoices_tenant_isolation_update
CREATE POLICY "account_invoices_tenant_isolation_update" ON public.account_invoices
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: account_transfers_tenant_isolation_delete
CREATE POLICY "account_transfers_tenant_isolation_delete" ON public.account_transfers
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: account_transfers_tenant_isolation_insert
CREATE POLICY "account_transfers_tenant_isolation_insert" ON public.account_transfers
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: account_transfers_tenant_isolation_select
CREATE POLICY "account_transfers_tenant_isolation_select" ON public.account_transfers
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: account_transfers_tenant_isolation_update
CREATE POLICY "account_transfers_tenant_isolation_update" ON public.account_transfers
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: account_types_select
CREATE POLICY "account_types_select" ON public.account_types
    FOR SELECT TO public
    USING (true)
;

-- Policy: accounting_periods_delete
CREATE POLICY "accounting_periods_delete" ON public.accounting_periods
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: accounting_periods_insert
CREATE POLICY "accounting_periods_insert" ON public.accounting_periods
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: accounting_periods_select
CREATE POLICY "accounting_periods_select" ON public.accounting_periods
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: accounting_periods_update
CREATE POLICY "accounting_periods_update" ON public.accounting_periods
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.accounting_periods
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.accounting_periods
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.accounting_periods
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.accounting_periods
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.accounts
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.accounts
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.accounts
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.accounts
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.agent_commissions
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.agent_commissions
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.agent_commissions
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.agent_commissions
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.agent_commissions
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: agent_tiers_select
CREATE POLICY "agent_tiers_select" ON public.agent_tiers
    FOR SELECT TO public
    USING (true)
;

-- Policy: agents_delete
CREATE POLICY "agents_delete" ON public.agents
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: agents_insert
CREATE POLICY "agents_insert" ON public.agents
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: agents_select
CREATE POLICY "agents_select" ON public.agents
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: agents_update
CREATE POLICY "agents_update" ON public.agents
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.announcements
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: audit_logs_delete
CREATE POLICY "audit_logs_delete" ON public.audit_logs
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: audit_logs_insert
CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: audit_logs_select
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: audit_logs_update
CREATE POLICY "audit_logs_update" ON public.audit_logs
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: bank_account_limits_tenant_isolation_delete
CREATE POLICY "bank_account_limits_tenant_isolation_delete" ON public.bank_account_limits
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: bank_account_limits_tenant_isolation_insert
CREATE POLICY "bank_account_limits_tenant_isolation_insert" ON public.bank_account_limits
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: bank_account_limits_tenant_isolation_select
CREATE POLICY "bank_account_limits_tenant_isolation_select" ON public.bank_account_limits
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: bank_account_limits_tenant_isolation_update
CREATE POLICY "bank_account_limits_tenant_isolation_update" ON public.bank_account_limits
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.batches
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.batches
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.batches
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin() OR (tenant_id IS NULL)))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.batches
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: billing_invoices_read_own
CREATE POLICY "billing_invoices_read_own" ON public.billing_invoices
    FOR SELECT TO public
    USING ((tenant_id = get_current_tenant_id()))
;

-- Policy: billing_payments_tenant_isolation_delete
CREATE POLICY "billing_payments_tenant_isolation_delete" ON public.billing_payments
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: billing_payments_tenant_isolation_insert
CREATE POLICY "billing_payments_tenant_isolation_insert" ON public.billing_payments
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: billing_payments_tenant_isolation_select
CREATE POLICY "billing_payments_tenant_isolation_select" ON public.billing_payments
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: billing_payments_tenant_isolation_update
CREATE POLICY "billing_payments_tenant_isolation_update" ON public.billing_payments
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: branches_delete
CREATE POLICY "branches_delete" ON public.branches
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: branches_insert
CREATE POLICY "branches_insert" ON public.branches
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: branches_select
CREATE POLICY "branches_select" ON public.branches
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: branches_update
CREATE POLICY "branches_update" ON public.branches
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: budget_alerts_tenant_isolation
CREATE POLICY "budget_alerts_tenant_isolation" ON public.budget_alerts
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: budget_lines_tenant_isolation
CREATE POLICY "budget_lines_tenant_isolation" ON public.budget_lines
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: budgets_tenant_isolation
CREATE POLICY "budgets_tenant_isolation" ON public.budgets
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.cash_accounts
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.cash_accounts
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.cash_accounts
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.cash_accounts
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.cash_transactions
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.cash_transactions
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.cash_transactions
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.cash_transactions
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.category_customer_access
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.category_customer_access
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.category_customer_access
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.category_customer_access
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: chart_of_accounts_delete
CREATE POLICY "chart_of_accounts_delete" ON public.chart_of_accounts
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: chart_of_accounts_insert
CREATE POLICY "chart_of_accounts_insert" ON public.chart_of_accounts
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: chart_of_accounts_select
CREATE POLICY "chart_of_accounts_select" ON public.chart_of_accounts
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: chart_of_accounts_update
CREATE POLICY "chart_of_accounts_update" ON public.chart_of_accounts
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: chart_templates_select
CREATE POLICY "chart_templates_select" ON public.chart_templates
    FOR SELECT TO public
    USING (true)
;

-- Policy: companies_delete
CREATE POLICY "companies_delete" ON public.companies
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: companies_insert
CREATE POLICY "companies_insert" ON public.companies
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: companies_select
CREATE POLICY "companies_select" ON public.companies
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: companies_update
CREATE POLICY "companies_update" ON public.companies
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.container_cost_allocations
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.container_cost_allocations
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.container_cost_allocations
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.container_cost_allocations
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.container_expense_allocations
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.container_expense_allocations
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.container_expense_allocations
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin() OR (tenant_id IS NULL)))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.container_expense_allocations
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.container_expenses
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.container_expenses
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.container_expenses
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.container_expenses
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.container_items
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.container_items
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.container_items
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.container_items
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.containers
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.containers
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.containers
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.containers
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: cost_centers_delete
CREATE POLICY "cost_centers_delete" ON public.cost_centers
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: cost_centers_insert
CREATE POLICY "cost_centers_insert" ON public.cost_centers
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: cost_centers_select
CREATE POLICY "cost_centers_select" ON public.cost_centers
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: cost_centers_update
CREATE POLICY "cost_centers_update" ON public.cost_centers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: countries_admin_write
CREATE POLICY "countries_admin_write" ON public.countries
    FOR ALL TO public
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()))
;

-- Policy: countries_public_read
CREATE POLICY "countries_public_read" ON public.countries
    FOR SELECT TO public
    USING (true)
;

-- Policy: country_configurations_admin_write
CREATE POLICY "country_configurations_admin_write" ON public.country_configurations
    FOR ALL TO public
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()))
;

-- Policy: country_configurations_public_read
CREATE POLICY "country_configurations_public_read" ON public.country_configurations
    FOR SELECT TO public
    USING (true)
;

-- Policy: currencies_delete
CREATE POLICY "currencies_delete" ON public.currencies
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: currencies_insert
CREATE POLICY "currencies_insert" ON public.currencies
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: currencies_select
CREATE POLICY "currencies_select" ON public.currencies
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: currencies_update
CREATE POLICY "currencies_update" ON public.currencies
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: currency_exchanges_tenant_isolation_delete
CREATE POLICY "currency_exchanges_tenant_isolation_delete" ON public.currency_exchanges
    FOR DELETE TO public
    USING (((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.tenant_id = get_current_user_tenant_id()))) OR is_super_admin(auth.uid())))
;

-- Policy: currency_exchanges_tenant_isolation_insert
CREATE POLICY "currency_exchanges_tenant_isolation_insert" ON public.currency_exchanges
    FOR INSERT TO public
    WITH CHECK ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.tenant_id = get_current_user_tenant_id()))))
;

-- Policy: currency_exchanges_tenant_isolation_select
CREATE POLICY "currency_exchanges_tenant_isolation_select" ON public.currency_exchanges
    FOR SELECT TO public
    USING (((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.tenant_id = get_current_user_tenant_id()))) OR is_super_admin(auth.uid())))
;

-- Policy: currency_exchanges_tenant_isolation_update
CREATE POLICY "currency_exchanges_tenant_isolation_update" ON public.currency_exchanges
    FOR UPDATE TO public
    USING ((company_id IN ( SELECT companies.id
   FROM companies
  WHERE (companies.tenant_id = get_current_user_tenant_id()))))
;

-- Policy: customer_groups_delete
CREATE POLICY "customer_groups_delete" ON public.customer_groups
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: customer_groups_insert
CREATE POLICY "customer_groups_insert" ON public.customer_groups
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: customer_groups_select
CREATE POLICY "customer_groups_select" ON public.customer_groups
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: customer_groups_update
CREATE POLICY "customer_groups_update" ON public.customer_groups
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: customers_delete
CREATE POLICY "customers_delete" ON public.customers
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: customers_insert
CREATE POLICY "customers_insert" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: customers_select
CREATE POLICY "customers_select" ON public.customers
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: customers_update
CREATE POLICY "customers_update" ON public.customers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: allow_authenticated
CREATE POLICY "allow_authenticated" ON public.delivery_note_items
    FOR ALL TO authenticated
    USING (true)
;

-- Policy: allow_authenticated
CREATE POLICY "allow_authenticated" ON public.delivery_notes
    FOR ALL TO authenticated
    USING (true)
;

-- Policy: documents_tenant
CREATE POLICY "documents_tenant" ON public.documents
    FOR ALL TO public
    USING ((tenant_id = get_current_tenant_id()))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.employee_commissions
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.employee_incentive_assignments
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.employee_targets
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: exchange_rates_delete
CREATE POLICY "exchange_rates_delete" ON public.exchange_rates
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: exchange_rates_insert
CREATE POLICY "exchange_rates_insert" ON public.exchange_rates
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: exchange_rates_select
CREATE POLICY "exchange_rates_select" ON public.exchange_rates
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: exchange_rates_update
CREATE POLICY "exchange_rates_update" ON public.exchange_rates
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.fabric_colors
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.fabric_colors
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.fabric_colors
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.fabric_colors
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.fabric_groups
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.fabric_groups
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.fabric_groups
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.fabric_groups
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.fabric_materials
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.fabric_materials
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.fabric_materials
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.fabric_materials
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.fabric_rolls
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.fabric_rolls
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.fabric_rolls
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.fabric_rolls
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: fiscal_years_delete
CREATE POLICY "fiscal_years_delete" ON public.fiscal_years
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: fiscal_years_insert
CREATE POLICY "fiscal_years_insert" ON public.fiscal_years
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: fiscal_years_select
CREATE POLICY "fiscal_years_select" ON public.fiscal_years
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: fiscal_years_update
CREATE POLICY "fiscal_years_update" ON public.fiscal_years
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: funds_delete
CREATE POLICY "funds_delete" ON public.funds
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: funds_insert
CREATE POLICY "funds_insert" ON public.funds
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: funds_select
CREATE POLICY "funds_select" ON public.funds
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: funds_update
CREATE POLICY "funds_update" ON public.funds
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.guest_checkouts
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: in_app_notifications_delete
CREATE POLICY "in_app_notifications_delete" ON public.in_app_notifications
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: in_app_notifications_insert
CREATE POLICY "in_app_notifications_insert" ON public.in_app_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: in_app_notifications_select
CREATE POLICY "in_app_notifications_select" ON public.in_app_notifications
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: in_app_notifications_update
CREATE POLICY "in_app_notifications_update" ON public.in_app_notifications
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: inventory_movements_read
CREATE POLICY "inventory_movements_read" ON public.inventory_movements
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: inventory_movements_write
CREATE POLICY "inventory_movements_write" ON public.inventory_movements
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: journal_entries_delete
CREATE POLICY "journal_entries_delete" ON public.journal_entries
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: journal_entries_insert
CREATE POLICY "journal_entries_insert" ON public.journal_entries
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: journal_entries_select
CREATE POLICY "journal_entries_select" ON public.journal_entries
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: journal_entries_update
CREATE POLICY "journal_entries_update" ON public.journal_entries
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: journal_entry_lines_delete
CREATE POLICY "journal_entry_lines_delete" ON public.journal_entry_lines
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: journal_entry_lines_insert
CREATE POLICY "journal_entry_lines_insert" ON public.journal_entry_lines
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: journal_entry_lines_select
CREATE POLICY "journal_entry_lines_select" ON public.journal_entry_lines
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: journal_entry_lines_update
CREATE POLICY "journal_entry_lines_update" ON public.journal_entry_lines
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: marketing_materials_select
CREATE POLICY "marketing_materials_select" ON public.marketing_materials
    FOR SELECT TO public
    USING (true)
;

-- Policy: mfa_company_tenant_access
CREATE POLICY "mfa_company_tenant_access" ON public.mfa_company_settings
    FOR ALL TO public
    USING (((company_id IN ( SELECT user_profiles.company_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))) OR is_super_admin(auth.uid())))
;

-- Policy: mfa_otp_own
CREATE POLICY "mfa_otp_own" ON public.mfa_pending_otps
    FOR ALL TO public
    USING ((user_id = auth.uid()))
    WITH CHECK ((user_id = auth.uid()))
;

-- Policy: mfa_system_read
CREATE POLICY "mfa_system_read" ON public.mfa_system_settings
    FOR SELECT TO public
    USING (true)
;

-- Policy: mfa_system_write
CREATE POLICY "mfa_system_write" ON public.mfa_system_settings
    FOR ALL TO public
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()))
;

-- Policy: mfa_user_own_settings
CREATE POLICY "mfa_user_own_settings" ON public.mfa_user_settings
    FOR ALL TO public
    USING ((user_id = auth.uid()))
    WITH CHECK ((user_id = auth.uid()))
;

-- Policy: mfa_log_access
CREATE POLICY "mfa_log_access" ON public.mfa_verification_log
    FOR SELECT TO public
    USING (((user_id = auth.uid()) OR is_super_admin(auth.uid())))
;

-- Policy: Super Admin can manage features
CREATE POLICY "Super Admin can manage features" ON public.module_features
    FOR ALL TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: Authenticated users can manage modules
CREATE POLICY "Authenticated users can manage modules" ON public.modules
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: Everyone can view active modules
CREATE POLICY "Everyone can view active modules" ON public.modules
    FOR SELECT TO public
    USING ((is_active = true))
;

-- Policy: notifications_delete
CREATE POLICY "notifications_delete" ON public.notifications
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: notifications_insert
CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: notifications_select
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: notifications_update
CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.order_items
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.orders
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: payment_receipts_read
CREATE POLICY "payment_receipts_read" ON public.payment_receipts
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: payment_receipts_write
CREATE POLICY "payment_receipts_write" ON public.payment_receipts
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: payment_vouchers_read
CREATE POLICY "payment_vouchers_read" ON public.payment_vouchers
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: payment_vouchers_write
CREATE POLICY "payment_vouchers_write" ON public.payment_vouchers
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: Super Admin can manage plan features
CREATE POLICY "Super Admin can manage plan features" ON public.plan_module_features
    FOR ALL TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: Super admin full access on plan_ui_tabs
CREATE POLICY "Super admin full access on plan_ui_tabs" ON public.plan_ui_tabs
    FOR ALL TO public
    USING ((((auth.jwt() ->> 'is_super_admin'::text))::boolean = true))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.price_list_items
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.price_lists
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: product_categories_delete
CREATE POLICY "product_categories_delete" ON public.product_categories
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: product_categories_insert
CREATE POLICY "product_categories_insert" ON public.product_categories
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: product_categories_select
CREATE POLICY "product_categories_select" ON public.product_categories
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: product_categories_update
CREATE POLICY "product_categories_update" ON public.product_categories
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.product_customer_access
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.product_customer_access
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.product_customer_access
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.product_customer_access
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.product_review_stats
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.product_reviews
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.product_uom_conversions
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.product_uom_conversions
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.product_uom_conversions
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin() OR (tenant_id IS NULL)))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.product_uom_conversions
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: products_delete
CREATE POLICY "products_delete" ON public.products
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: products_insert
CREATE POLICY "products_insert" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: products_select
CREATE POLICY "products_select" ON public.products
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: products_update
CREATE POLICY "products_update" ON public.products
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: purchase_invoice_items_read
CREATE POLICY "purchase_invoice_items_read" ON public.purchase_invoice_items
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: purchase_invoice_items_write
CREATE POLICY "purchase_invoice_items_write" ON public.purchase_invoice_items
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: purchase_invoices_read
CREATE POLICY "purchase_invoices_read" ON public.purchase_invoices
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: purchase_invoices_write
CREATE POLICY "purchase_invoices_write" ON public.purchase_invoices
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: purchase_orders_read
CREATE POLICY "purchase_orders_read" ON public.purchase_orders
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: purchase_orders_write
CREATE POLICY "purchase_orders_write" ON public.purchase_orders
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: recurring_entries_tenant_isolation
CREATE POLICY "recurring_entries_tenant_isolation" ON public.recurring_entries
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: recurring_entry_executions_tenant_isolation_delete
CREATE POLICY "recurring_entry_executions_tenant_isolation_delete" ON public.recurring_entry_executions
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: recurring_entry_executions_tenant_isolation_insert
CREATE POLICY "recurring_entry_executions_tenant_isolation_insert" ON public.recurring_entry_executions
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: recurring_entry_executions_tenant_isolation_select
CREATE POLICY "recurring_entry_executions_tenant_isolation_select" ON public.recurring_entry_executions
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: recurring_entry_executions_tenant_isolation_update
CREATE POLICY "recurring_entry_executions_tenant_isolation_update" ON public.recurring_entry_executions
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: recurring_entry_history_tenant_isolation
CREATE POLICY "recurring_entry_history_tenant_isolation" ON public.recurring_entry_history
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: recurring_entry_lines_tenant_isolation
CREATE POLICY "recurring_entry_lines_tenant_isolation" ON public.recurring_entry_lines
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: recurring_entry_templates_tenant_isolation_delete
CREATE POLICY "recurring_entry_templates_tenant_isolation_delete" ON public.recurring_entry_templates
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: recurring_entry_templates_tenant_isolation_insert
CREATE POLICY "recurring_entry_templates_tenant_isolation_insert" ON public.recurring_entry_templates
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: recurring_entry_templates_tenant_isolation_select
CREATE POLICY "recurring_entry_templates_tenant_isolation_select" ON public.recurring_entry_templates
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: recurring_entry_templates_tenant_isolation_update
CREATE POLICY "recurring_entry_templates_tenant_isolation_update" ON public.recurring_entry_templates
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: report_shares_tenant_isolation
CREATE POLICY "report_shares_tenant_isolation" ON public.report_shares
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: report_templates_tenant_isolation
CREATE POLICY "report_templates_tenant_isolation" ON public.report_templates
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: reservation_items_tenant_isolation_delete
CREATE POLICY "reservation_items_tenant_isolation_delete" ON public.reservation_items
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: reservation_items_tenant_isolation_insert
CREATE POLICY "reservation_items_tenant_isolation_insert" ON public.reservation_items
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: reservation_items_tenant_isolation_select
CREATE POLICY "reservation_items_tenant_isolation_select" ON public.reservation_items
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: reservation_items_tenant_isolation_update
CREATE POLICY "reservation_items_tenant_isolation_update" ON public.reservation_items
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: reservations_tenant_isolation_delete
CREATE POLICY "reservations_tenant_isolation_delete" ON public.reservations
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: reservations_tenant_isolation_insert
CREATE POLICY "reservations_tenant_isolation_insert" ON public.reservations
    FOR INSERT TO public
    WITH CHECK ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: reservations_tenant_isolation_select
CREATE POLICY "reservations_tenant_isolation_select" ON public.reservations
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: reservations_tenant_isolation_update
CREATE POLICY "reservations_tenant_isolation_update" ON public.reservations
    FOR UPDATE TO public
    USING ((tenant_id = get_current_user_tenant_id()))
;

-- Policy: tenant_isolation
CREATE POLICY "tenant_isolation" ON public.review_votes
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: roles_read
CREATE POLICY "roles_read" ON public.roles
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: roles_write
CREATE POLICY "roles_write" ON public.roles
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: Allow all for authenticated
CREATE POLICY "Allow all for authenticated" ON public.saas_payments
    FOR ALL TO public
    USING ((auth.role() = 'authenticated'::text))
;

-- Policy: Users can view their tenant payments
CREATE POLICY "Users can view their tenant payments" ON public.saas_payments
    FOR SELECT TO public
    USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM tenant_users
  WHERE (tenant_users.user_id = auth.uid()))))
;

-- Policy: saas_products_read
CREATE POLICY "saas_products_read" ON public.saas_products
    FOR SELECT TO public
    USING (true)
;

-- Policy: saas_products_write
CREATE POLICY "saas_products_write" ON public.saas_products
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: sales_invoice_items_read
CREATE POLICY "sales_invoice_items_read" ON public.sales_invoice_items
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: sales_invoice_items_write
CREATE POLICY "sales_invoice_items_write" ON public.sales_invoice_items
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: sales_invoices_read
CREATE POLICY "sales_invoices_read" ON public.sales_invoices
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: sales_invoices_write
CREATE POLICY "sales_invoices_write" ON public.sales_invoices
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: saved_reports_tenant_isolation
CREATE POLICY "saved_reports_tenant_isolation" ON public.saved_reports
    FOR ALL TO public
    USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid))
;

-- Policy: Anyone can manage own cart items
CREATE POLICY "Anyone can manage own cart items" ON public.shopping_cart_items
    FOR ALL TO public
    USING ((cart_id IN ( SELECT shopping_carts.id
   FROM shopping_carts
  WHERE ((shopping_carts.tenant_id = get_current_user_tenant_id()) OR (shopping_carts.session_id IS NOT NULL)))))
;

-- Policy: Admins see all carts
CREATE POLICY "Admins see all carts" ON public.shopping_carts
    FOR SELECT TO authenticated
    USING (((tenant_id = get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND ((user_profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying, 'accountant'::character varying, 'super_admin'::character varying])::text[])))))))
;

-- Policy: Anyone can manage own cart
CREATE POLICY "Anyone can manage own cart" ON public.shopping_carts
    FOR ALL TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR (session_id IS NOT NULL)))
;

-- Policy: stock_count_items_access
CREATE POLICY "stock_count_items_access" ON public.stock_count_items
    FOR ALL TO public
    USING ((auth.role() = 'authenticated'::text))
;

-- Policy: stock_counts_access
CREATE POLICY "stock_counts_access" ON public.stock_counts
    FOR ALL TO public
    USING ((auth.role() = 'authenticated'::text))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.stock_ledger
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.stock_ledger
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.stock_ledger
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin() OR (tenant_id IS NULL)))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.stock_ledger
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: quotas_read
CREATE POLICY "quotas_read" ON public.storage_quotas
    FOR SELECT TO public
    USING ((tenant_id = get_current_tenant_id()))
;

-- Policy: subscription_plans_read
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
    FOR SELECT TO public
    USING (true)
;

-- Policy: subscription_plans_write
CREATE POLICY "subscription_plans_write" ON public.subscription_plans
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: subscriptions_read_own
CREATE POLICY "subscriptions_read_own" ON public.subscriptions
    FOR SELECT TO public
    USING ((tenant_id = get_current_tenant_id()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.subscriptions
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.subscriptions
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.subscriptions
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.subscriptions
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: supplier_groups_delete
CREATE POLICY "supplier_groups_delete" ON public.supplier_groups
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: supplier_groups_insert
CREATE POLICY "supplier_groups_insert" ON public.supplier_groups
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: supplier_groups_select
CREATE POLICY "supplier_groups_select" ON public.supplier_groups
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: supplier_groups_update
CREATE POLICY "supplier_groups_update" ON public.supplier_groups
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: suppliers_delete
CREATE POLICY "suppliers_delete" ON public.suppliers
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: suppliers_insert
CREATE POLICY "suppliers_insert" ON public.suppliers
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: suppliers_select
CREATE POLICY "suppliers_select" ON public.suppliers
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: suppliers_update
CREATE POLICY "suppliers_update" ON public.suppliers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: Super Admin can manage system languages
CREATE POLICY "Super Admin can manage system languages" ON public.system_languages
    FOR ALL TO public
    USING (COALESCE((((auth.jwt() -> 'user_metadata'::text) ->> 'is_super_admin'::text))::boolean, false))
;

-- Policy: system_modules_read
CREATE POLICY "system_modules_read" ON public.system_modules
    FOR SELECT TO public
    USING (true)
;

-- Policy: system_modules_write
CREATE POLICY "system_modules_write" ON public.system_modules
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.tax_rates
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.tax_rates
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.tax_rates
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.tax_rates
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: Users can view their tenant languages
CREATE POLICY "Users can view their tenant languages" ON public.tenant_languages
    FOR SELECT TO public
    USING (((tenant_id = get_current_tenant_id()) OR COALESCE((((auth.jwt() -> 'user_metadata'::text) ->> 'is_super_admin'::text))::boolean, false)))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.tenant_modules
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.tenant_modules
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.tenant_modules
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.tenant_modules
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_modules_read_own
CREATE POLICY "tenant_modules_read_own" ON public.tenant_modules
    FOR SELECT TO public
    USING ((tenant_id = get_current_tenant_id()))
;

-- Policy: Allow all for authenticated users
CREATE POLICY "Allow all for authenticated users" ON public.tenant_subscriptions
    FOR ALL TO public
    USING ((auth.role() = 'authenticated'::text))
;

-- Policy: tenant_subscriptions_delete_admin
CREATE POLICY "tenant_subscriptions_delete_admin" ON public.tenant_subscriptions
    FOR DELETE TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: tenant_subscriptions_insert_admin
CREATE POLICY "tenant_subscriptions_insert_admin" ON public.tenant_subscriptions
    FOR INSERT TO public
    WITH CHECK (is_super_admin(auth.uid()))
;

-- Policy: tenant_subscriptions_select_policy
CREATE POLICY "tenant_subscriptions_select_policy" ON public.tenant_subscriptions
    FOR SELECT TO public
    USING ((is_super_admin(auth.uid()) OR (tenant_id IN ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))))
;

-- Policy: tenant_subscriptions_update_admin
CREATE POLICY "tenant_subscriptions_update_admin" ON public.tenant_subscriptions
    FOR UPDATE TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: Users can view their tenant memberships
CREATE POLICY "Users can view their tenant memberships" ON public.tenant_users
    FOR SELECT TO public
    USING ((user_id = auth.uid()))
;

-- Policy: tenant_users_delete_super_admin
CREATE POLICY "tenant_users_delete_super_admin" ON public.tenant_users
    FOR DELETE TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: tenant_users_insert_super_admin
CREATE POLICY "tenant_users_insert_super_admin" ON public.tenant_users
    FOR INSERT TO public
    WITH CHECK (is_super_admin(auth.uid()))
;

-- Policy: tenant_users_select_own
CREATE POLICY "tenant_users_select_own" ON public.tenant_users
    FOR SELECT TO public
    USING ((user_id = auth.uid()))
;

-- Policy: tenant_users_update_super_admin
CREATE POLICY "tenant_users_update_super_admin" ON public.tenant_users
    FOR UPDATE TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: tenants_read
CREATE POLICY "tenants_read" ON public.tenants
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: tenants_write
CREATE POLICY "tenants_write" ON public.tenants
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: Super Admin can manage ui tabs
CREATE POLICY "Super Admin can manage ui tabs" ON public.ui_tabs
    FOR ALL TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.uom
    FOR DELETE TO public
    USING (((tenant_id IS NULL) OR (tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.uom
    FOR INSERT TO public
    WITH CHECK (((tenant_id IS NULL) OR (tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.uom
    FOR SELECT TO public
    USING (((tenant_id IS NULL) OR (tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.uom
    FOR UPDATE TO public
    USING (((tenant_id IS NULL) OR (tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: user_branch_perms_tenant
CREATE POLICY "user_branch_perms_tenant" ON public.user_branch_permissions
    FOR ALL TO public
    USING (((tenant_id = get_current_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: Users can manage feature permissions in their tenant
CREATE POLICY "Users can manage feature permissions in their tenant" ON public.user_feature_permissions
    FOR ALL TO public
    USING ((tenant_id IN ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))))
;

-- Policy: Users can view own feature permissions
CREATE POLICY "Users can view own feature permissions" ON public.user_feature_permissions
    FOR SELECT TO public
    USING ((user_id = auth.uid()))
;

-- Policy: user_fund_perms_tenant
CREATE POLICY "user_fund_perms_tenant" ON public.user_fund_permissions
    FOR ALL TO public
    USING (((tenant_id = get_current_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: Users can manage permissions in their company
CREATE POLICY "Users can manage permissions in their company" ON public.user_module_permissions
    FOR ALL TO public
    USING ((tenant_id IN ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))))
;

-- Policy: Users can view own permissions
CREATE POLICY "Users can view own permissions" ON public.user_module_permissions
    FOR SELECT TO public
    USING ((user_id = auth.uid()))
;

-- Policy: user_profiles_delete
CREATE POLICY "user_profiles_delete" ON public.user_profiles
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: user_profiles_insert
CREATE POLICY "user_profiles_insert" ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: user_profiles_select
CREATE POLICY "user_profiles_select" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: user_profiles_update
CREATE POLICY "user_profiles_update" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

-- Policy: user_resource_access_read
CREATE POLICY "user_resource_access_read" ON public.user_resource_access
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: user_resource_access_write
CREATE POLICY "user_resource_access_write" ON public.user_resource_access
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: Users can view role assignments in their tenant
CREATE POLICY "Users can view role assignments in their tenant" ON public.user_role_assignments
    FOR SELECT TO public
    USING ((tenant_id IN ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))))
;

-- Policy: user_role_assignments_delete_admin
CREATE POLICY "user_role_assignments_delete_admin" ON public.user_role_assignments
    FOR DELETE TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: user_role_assignments_insert_admin
CREATE POLICY "user_role_assignments_insert_admin" ON public.user_role_assignments
    FOR INSERT TO public
    WITH CHECK (is_super_admin(auth.uid()))
;

-- Policy: user_role_assignments_select_own
CREATE POLICY "user_role_assignments_select_own" ON public.user_role_assignments
    FOR SELECT TO public
    USING (((user_id = auth.uid()) OR is_super_admin(auth.uid())))
;

-- Policy: user_role_assignments_update_admin
CREATE POLICY "user_role_assignments_update_admin" ON public.user_role_assignments
    FOR UPDATE TO public
    USING (is_super_admin(auth.uid()))
;

-- Policy: user_roles_read
CREATE POLICY "user_roles_read" ON public.user_roles
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: user_roles_write
CREATE POLICY "user_roles_write" ON public.user_roles
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: user_warehouse_perms_tenant
CREATE POLICY "user_warehouse_perms_tenant" ON public.user_warehouse_permissions
    FOR ALL TO public
    USING (((tenant_id = get_current_tenant_id()) OR is_super_admin(auth.uid())))
;

-- Policy: visibility_rules_read
CREATE POLICY "visibility_rules_read" ON public.visibility_rules
    FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: visibility_rules_write
CREATE POLICY "visibility_rules_write" ON public.visibility_rules
    FOR ALL TO public
    USING ((auth.uid() IS NOT NULL))
;

-- Policy: tenant_isolation_delete
CREATE POLICY "tenant_isolation_delete" ON public.warehouse_assignments
    FOR DELETE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_insert
CREATE POLICY "tenant_isolation_insert" ON public.warehouse_assignments
    FOR INSERT TO public
    WITH CHECK (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_select
CREATE POLICY "tenant_isolation_select" ON public.warehouse_assignments
    FOR SELECT TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: tenant_isolation_update
CREATE POLICY "tenant_isolation_update" ON public.warehouse_assignments
    FOR UPDATE TO public
    USING (((tenant_id = get_current_user_tenant_id()) OR public.is_super_admin()))
;

-- Policy: allow_authenticated
CREATE POLICY "allow_authenticated" ON public.warehouse_settings
    FOR ALL TO authenticated
    USING (true)
;

-- Policy: warehouses_delete
CREATE POLICY "warehouses_delete" ON public.warehouses
    FOR DELETE TO authenticated
    USING (true)
;

-- Policy: warehouses_insert
CREATE POLICY "warehouses_insert" ON public.warehouses
    FOR INSERT TO authenticated
    WITH CHECK (true)
;

-- Policy: warehouses_select
CREATE POLICY "warehouses_select" ON public.warehouses
    FOR SELECT TO authenticated
    USING (true)
;

-- Policy: warehouses_update
CREATE POLICY "warehouses_update" ON public.warehouses
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true)
;

