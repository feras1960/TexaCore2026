-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: تحسينات البنية التحتية الشاملة (8 خطوات)
-- Date: 2026-02-14
-- Status: تم تطبيقه مباشرة على قاعدة البيانات
-- ═══════════════════════════════════════════════════════════════════════════════

-- ════ 1/8: RLS لـ inventory_stock ════
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_stock_select_policy" ON inventory_stock FOR SELECT USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "inventory_stock_insert_policy" ON inventory_stock FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "inventory_stock_update_policy" ON inventory_stock FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "inventory_stock_delete_policy" ON inventory_stock FOR DELETE USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ════ 2/8: UOM → View ════
-- ALTER TABLE uom RENAME TO _deprecated_uom_table;
-- CREATE VIEW uom AS SELECT id, code, COALESCE(name_ar,name_en) AS name, name_ar, type AS uom_type, is_active, tenant_id, created_at, created_at AS updated_at FROM units_of_measure;

-- ════ 3/8: accounts → chart_of_accounts bridge ════
ALTER TABLE products ADD COLUMN IF NOT EXISTS income_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS expense_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS default_income_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS default_expense_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS default_inventory_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE sample_cuttings ADD COLUMN IF NOT EXISTS expense_chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS chart_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE funds ADD COLUMN IF NOT EXISTS chart_account_id UUID REFERENCES chart_of_accounts(id);

-- ════ 4/8: تنظيف تريغرات user_profiles (5→3) ════
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS trg_protect_user_profiles ON user_profiles;

-- ════ 5/8: توثيق coa_templates vs chart_templates ════
COMMENT ON TABLE coa_templates IS 'القوالب المحاسبية الرئيسية (BASIC/EXTENDED/FABRIC) — عالمية';
COMMENT ON TABLE chart_templates IS 'نسخ القوالب لكل مشترك (tenant) — تُنسخ تلقائياً';

-- ════ 6/8: إصلاح الشركات الصغيرة ════
-- تم عبر DO block: حذف الحسابات القليلة + create_simple_chart_of_accounts + auto_set_default_accounts

-- ════ 7/8: فهارس Composite ════
CREATE INDEX IF NOT EXISTS idx_jel_account_entry ON journal_entry_lines (account_id, entry_id) INCLUDE (debit, credit);
CREATE INDEX IF NOT EXISTS idx_je_company_date_status ON journal_entries (company_id, entry_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_je_company_number ON journal_entries (company_id, entry_number);
CREATE INDEX IF NOT EXISTS idx_coa_company_code_type ON chart_of_accounts (company_id, account_code, account_type_id);
CREATE INDEX IF NOT EXISTS idx_coa_company_level_active ON chart_of_accounts (company_id, level, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inv_movements_company_date ON inventory_movements (company_id, movement_date DESC, movement_type);
CREATE INDEX IF NOT EXISTS idx_si_company_date_status ON sales_invoices (company_id, invoice_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_pi_company_date_status ON purchase_invoices (company_id, invoice_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_so_company_date_status ON sales_orders (company_id, order_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_rolls_company_material_status ON fabric_rolls (company_id, material_id, status) WHERE status = 'available';

-- ════ 8/8: Materialized Views ════
-- mv_account_balances: أرصدة الحسابات من القيود المرحّلة
-- mv_monthly_sales: ملخص المبيعات الشهرية
-- mv_inventory_summary: ملخص المخزون
-- refresh_dashboard_views(): تحديث كل الـ MVs
