# 📖 TexaCore ERP — قاموس البيانات الشامل
# Complete Data Dictionary — Production Verified
**تاريخ التوليد:** 2026-02-11 | **المصدر:** Production DB (information_schema)
**الجداول:** 221 | **الأعمدة:** 4289 | **FK:** 563 | **UNIQUE:** 147

---

## 📑 فهرس المحتويات

### Core & Auth — الجداول الأساسية والصلاحيات (21 جدول)
- `branches` — 21 عمود, 2 FK
- `companies` — 49 عمود, 1 FK
- `company_countries` — 6 عمود, 2 FK
- `company_workflow_settings` — 18 عمود, 0 FK
- `roles` — 16 عمود, 1 FK
- `super_admins` — 10 عمود, 0 FK
- `tenant_languages` — 15 عمود, 1 FK
- `tenant_modules` — 12 عمود, 1 FK
- `tenant_users` — 7 عمود, 1 FK
- `tenants` — 29 عمود, 3 FK
- `user_branch_permissions` — 11 عمود, 2 FK
- `user_feature_permissions` — 11 عمود, 6 FK
- `user_fund_permissions` — 16 عمود, 2 FK
- `user_module_permissions` — 20 عمود, 2 FK
- `user_profiles` — 21 عمود, 4 FK
- `user_resource_access` — 20 عمود, 1 FK
- `user_role_assignments` — 10 عمود, 2 FK
- `user_roles` — 12 عمود, 4 FK
- `user_table_preferences` — 8 عمود, 0 FK
- `user_warehouse_permissions` — 15 عمود, 2 FK
- `warehouse_assignments` — 11 عمود, 4 FK

### Accounting — المحاسبة (34 جدول)
- `account_invoice_items` — 20 عمود, 2 FK
- `account_invoices` — 37 عمود, 5 FK
- `account_transfers` — 12 عمود, 5 FK
- `account_types` — 17 عمود, 0 FK
- `accounting_periods` — 13 عمود, 2 FK
- `accounts` — 17 عمود, 3 FK
- `bank_account_limits` — 17 عمود, 3 FK
- `bank_integrations` — 7 عمود, 2 FK
- `budget_alerts` — 19 عمود, 4 FK
- `budget_lines` — 17 عمود, 4 FK
- `budgets` — 24 عمود, 6 FK
- `chart_of_accounts` — 36 عمود, 4 FK
- `chart_templates` — 12 عمود, 1 FK
- `coa_template_cash_accounts` — 12 عمود, 1 FK
- `coa_template_items` — 28 عمود, 1 FK
- `coa_templates` — 21 عمود, 0 FK
- `company_accounting_settings` — 32 عمود, 7 FK
- `cost_centers` — 20 عمود, 4 FK
- `exchange_rates` — 16 عمود, 2 FK
- `fiscal_years` — 13 عمود, 2 FK
- `journal_entries` — 40 عمود, 7 FK
- `journal_entry_lines` — 22 عمود, 2 FK
- `recurring_entries` — 35 عمود, 6 FK
- `recurring_entry_executions` — 12 عمود, 2 FK
- `recurring_entry_history` — 18 عمود, 5 FK
- `recurring_entry_lines` — 14 عمود, 3 FK
- `recurring_entry_templates` — 25 عمود, 2 FK
- `report_shares` — 15 عمود, 5 FK
- `report_templates` — 34 عمود, 4 FK
- `reservation_items` — 17 عمود, 1 FK
- `reservations` — 42 عمود, 6 FK
- `saved_reports` — 21 عمود, 3 FK
- `tax_payment_schedules` — 18 عمود, 4 FK
- `tax_rates` — 14 عمود, 4 FK

### Treasury — الخزينة والصناديق (8 جدول)
- `cash_accounts` — 20 عمود, 4 FK
- `cash_transactions` — 28 عمود, 7 FK
- `correspondents` — 15 عمود, 3 FK
- `currency_exchanges` — 22 عمود, 5 FK
- `funds` — 20 عمود, 4 FK
- `payment_receipts` — 18 عمود, 2 FK
- `payment_vouchers` — 24 عمود, 7 FK
- `remittances` — 43 عمود, 5 FK

### Suppliers — الموردون (2 جدول)
- `supplier_groups` — 18 عمود, 2 FK
- `suppliers` — 33 عمود, 4 FK

### Customers — العملاء (3 جدول)
- `customer_addresses` — 19 عمود, 1 FK
- `customer_groups` — 22 عمود, 3 FK
- `customers` — 38 عمود, 5 FK

### Products & UOM — المنتجات ووحدات القياس (13 جدول)
- `batches` — 13 عمود, 2 FK
- `currencies` — 23 عمود, 1 FK
- `price_list_items` — 11 عمود, 4 FK
- `price_lists` — 22 عمود, 2 FK
- `product_categories` — 16 عمود, 6 FK
- `product_customer_access` — 13 عمود, 4 FK
- `product_review_stats` — 14 عمود, 2 FK
- `product_reviews` — 22 عمود, 5 FK
- `product_uom_conversions` — 9 عمود, 1 FK
- `product_variants` — 6 عمود, 1 FK
- `products` — 52 عمود, 6 FK
- `units_of_measure` — 10 عمود, 2 FK
- `uom` — 9 عمود, 1 FK

### Sales — المبيعات (9 جدول)
- `delivery_note_items` — 25 عمود, 1 FK
- `delivery_notes` — 42 عمود, 0 FK
- `quotations` — 40 عمود, 6 FK
- `sales_deliveries` — 29 عمود, 9 FK
- `sales_delivery_items` — 9 عمود, 5 FK
- `sales_invoice_items` — 22 عمود, 1 FK
- `sales_invoices` — 47 عمود, 3 FK
- `sales_orders` — 39 عمود, 7 FK
- `sales_returns` — 19 عمود, 8 FK

### Purchases — المشتريات (8 جدول)
- `purchase_invoice_items` — 22 عمود, 4 FK
- `purchase_invoices` — 30 عمود, 3 FK
- `purchase_orders` — 21 عمود, 4 FK
- `purchase_quotations` — 22 عمود, 6 FK
- `purchase_receipt_items` — 12 عمود, 6 FK
- `purchase_receipts` — 18 عمود, 9 FK
- `purchase_requests` — 15 عمود, 5 FK
- `purchase_returns` — 17 عمود, 8 FK

### Shipments & Trade — الشحنات والتجارة (14 جدول)
- `container_cost_allocations` — 14 عمود, 3 FK
- `container_expense_allocations` — 7 عمود, 2 FK
- `container_expenses` — 40 عمود, 1 FK
- `container_items` — 36 عمود, 3 FK
- `container_quotation_items` — 18 عمود, 1 FK
- `container_quotations` — 27 عمود, 1 FK
- `container_reservations` — 41 عمود, 2 FK
- `containers` — 55 عمود, 1 FK
- `shipment_documents` — 60 عمود, 2 FK
- `shipment_items` — 36 عمود, 7 FK
- `shipments` — 27 عمود, 6 FK
- `shipments_tracking` — 10 عمود, 2 FK
- `shipping_carriers` — 31 عمود, 1 FK
- `transit_reservations` — 27 عمود, 10 FK

### Warehouse & Inventory — المستودعات والمخزون (18 جدول)
- `bin_locations` — 12 عمود, 3 FK
- `fabric_colors` — 21 عمود, 1 FK
- `fabric_groups` — 20 عمود, 2 FK
- `fabric_materials` — 48 عمود, 7 FK
- `fabric_rolls` — 33 عمود, 6 FK
- `gold_items` — 26 عمود, 4 FK
- `gold_prices` — 14 عمود, 2 FK
- `inventory_movements` — 21 عمود, 2 FK
- `retail_cuttings` — 31 عمود, 5 FK
- `sample_cutting_items` — 13 عمود, 4 FK
- `sample_cuttings` — 18 عمود, 4 FK
- `serial_number_fields` — 10 عمود, 1 FK
- `serial_numbers` — 18 عمود, 6 FK
- `stock_count_items` — 18 عمود, 6 FK
- `stock_counts` — 20 عمود, 4 FK
- `stock_ledger` — 18 عمود, 4 FK
- `warehouse_settings` — 23 عمود, 0 FK
- `warehouses` — 13 عمود, 3 FK

### SaaS Platform — منصة SaaS (34 جدول)
- `agent_bonuses` — 17 عمود, 0 FK
- `agent_commission_rules` — 6 عمود, 2 FK
- `agent_commissions` — 24 عمود, 2 FK
- `agent_events` — 8 عمود, 1 FK
- `agent_messages` — 13 عمود, 2 FK
- `agent_targets` — 18 عمود, 1 FK
- `agent_tiers` — 19 عمود, 0 FK
- `agent_withdrawals` — 29 عمود, 1 FK
- `agents` — 26 عمود, 2 FK
- `billing_invoices` — 20 عمود, 2 FK
- `billing_payments` — 15 عمود, 2 FK
- `module_features` — 13 عمود, 0 FK
- `modules` — 24 عمود, 0 FK
- `partner_allowed_products` — 9 عمود, 2 FK
- `partners` — 15 عمود, 0 FK
- `plan_module_features` — 8 عمود, 1 FK
- `plan_modules` — 8 عمود, 2 FK
- `plan_ui_tabs` — 6 عمود, 2 FK
- `saas_events` — 9 عمود, 1 FK
- `saas_payments` — 28 عمود, 4 FK
- `saas_products` — 15 عمود, 0 FK
- `saas_settings` — 19 عمود, 0 FK
- `storage_quotas` — 8 عمود, 0 FK
- `subscription_alerts` — 15 عمود, 2 FK
- `subscription_plans` — 36 عمود, 1 FK
- `subscriptions` — 21 عمود, 3 FK
- `system_modules` — 16 عمود, 0 FK
- `tenant_referrals` — 11 عمود, 2 FK
- `tenant_subscriptions` — 23 عمود, 2 FK
- `ui_tabs` — 14 عمود, 0 FK
- `white_label_configs` — 34 عمود, 1 FK
- `white_label_domains` — 17 عمود, 1 FK
- `white_label_payments` — 20 عمود, 1 FK
- `white_label_stats` — 15 عمود, 1 FK

### CRM — إدارة علاقات العملاء (4 جدول)
- `call_analyses` — 9 عمود, 1 FK
- `call_logs` — 14 عمود, 3 FK
- `contact_interactions` — 16 عمود, 4 FK
- `contacts` — 50 عمود, 6 FK

### E-Commerce — التجارة الإلكترونية (9 جدول)
- `coupon_usage` — 10 عمود, 1 FK
- `guest_checkouts` — 19 عمود, 3 FK
- `order_items` — 16 عمود, 4 FK
- `orders` — 27 عمود, 5 FK
- `promotional_discounts` — 23 عمود, 0 FK
- `qr_codes` — 8 عمود, 2 FK
- `qr_scans` — 10 عمود, 3 FK
- `shopping_cart_items` — 16 عمود, 2 FK
- `shopping_carts` — 18 عمود, 3 FK

### Workflow & Status — سير العمل (9 جدول)
- `custom_statuses` — 19 عمود, 2 FK
- `document_approval_requests` — 19 عمود, 0 FK
- `documents` — 12 عمود, 0 FK
- `status_groups` — 10 عمود, 1 FK
- `status_history` — 10 عمود, 3 FK
- `status_transitions` — 11 عمود, 3 FK
- `visibility_rules` — 14 عمود, 0 FK
- `workflow_notification_settings` — 11 عمود, 1 FK
- `workflow_scenario_toggles` — 8 عمود, 1 FK

### Security & Audit — الأمان والتدقيق (8 جدول)
- `audit_logs` — 17 عمود, 1 FK
- `mfa_company_settings` — 12 عمود, 2 FK
- `mfa_pending_otps` — 10 عمود, 0 FK
- `mfa_system_settings` — 18 عمود, 0 FK
- `mfa_user_settings` — 15 عمود, 0 FK
- `mfa_verification_log` — 9 عمود, 0 FK
- `webhook_endpoints` — 11 عمود, 1 FK
- `webhook_logs` — 13 عمود, 1 FK

### Notifications — الإشعارات (4 جدول)
- `announcements` — 21 عمود, 1 FK
- `in_app_notifications` — 16 عمود, 1 FK
- `notification_preferences` — 4 عمود, 1 FK
- `notifications` — 21 عمود, 1 FK

### Other — جداول أخرى (23 جدول)
- `business_industries` — 22 عمود, 0 FK
- `category_customer_access` — 13 عمود, 4 FK
- `changelog` — 13 عمود, 0 FK
- `commission_entries` — 19 عمود, 4 FK
- `commission_rules` — 16 عمود, 2 FK
- `countries` — 19 عمود, 0 FK
- `country_configurations` — 17 عمود, 0 FK
- `employee_commissions` — 28 عمود, 5 FK
- `employee_incentive_assignments` — 16 عمود, 3 FK
- `employee_targets` — 23 عمود, 2 FK
- `incentive_plan_tiers` — 11 عمود, 1 FK
- `incentive_plans` — 23 عمود, 2 FK
- `marketing_materials` — 16 عمود, 0 FK
- `referral_program` — 10 عمود, 0 FK
- `review_votes` — 7 عمود, 3 FK
- `reviews` — 18 عمود, 1 FK
- `support_tickets` — 24 عمود, 1 FK
- `system_languages` — 11 عمود, 0 FK
- `target_achievement_log` — 13 عمود, 1 FK
- `ticket_replies` — 10 عمود, 1 FK
- `usage_analytics` — 14 عمود, 1 FK
- `usage_stats` — 11 عمود, 1 FK
- `vendor_categories` — 9 عمود, 0 FK

---

# ════════════════════════════════════════════════════════════
# Core & Auth — الجداول الأساسية والصلاحيات
# ════════════════════════════════════════════════════════════

## `branches` — 21 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **code** | varchar(20) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **branch_type** | varchar(20) | ✓ | 'regular'::character varying |  |
| 7 | **address** | text | ✓ |  |  |
| 8 | **city** | varchar(100) | ✓ |  |  |
| 9 | **phone** | varchar(50) | ✓ |  |  |
| 10 | **is_main** | boolean | ✓ | false |  |
| 11 | **is_active** | boolean | ✓ | true |  |
| 12 | **has_multiple_funds** | boolean | ✓ | false |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 15 | **name_ar** | varchar(200) | ✓ |  |  |
| 16 | **country** | varchar(100) | ✓ |  |  |
| 17 | **manager_id** | uuid | ✓ |  |  |
| 18 | **default_warehouse_id** | uuid | ✓ |  |  |
| 19 | **default_currency** | varchar(3) | ✓ |  |  |
| 20 | **working_hours** | jsonb | ✓ | '{}'::jsonb |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `companies` — 49 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **code** | varchar(20) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **logo_url** | text | ✓ |  |  |
| 7 | **tax_number** | varchar(50) | ✓ |  |  |
| 8 | **commercial_register** | varchar(50) | ✓ |  |  |
| 9 | **country_code** | varchar(3) | ✓ | 'SA'::character varying |  |
| 10 | **city** | varchar(100) | ✓ |  |  |
| 11 | **address** | text | ✓ |  |  |
| 12 | **postal_code** | varchar(20) | ✓ |  |  |
| 13 | **phone** | varchar(50) | ✓ |  |  |
| 14 | **email** | varchar(255) | ✓ |  |  |
| 15 | **website** | varchar(255) | ✓ |  |  |
| 16 | **default_currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 17 | **fiscal_year_start_month** | integer | ✓ | 1 |  |
| 18 | **tax_system** | varchar(50) | ✓ | 'vat_sa'::character varying |  |
| 19 | **vat_rate** | numeric | ✓ | 15.00 |  |
| 20 | **enable_zatca** | boolean | ✓ | false |  |
| 21 | **zatca_settings** | jsonb | ✓ |  |  |
| 22 | **enable_zakat** | boolean | ✓ | false |  |
| 23 | **zakat_calculation_method** | varchar(20) | ✓ | 'auto'::character varying |  |
| 24 | **zakat_rate** | numeric | ✓ | 0.025 |  |
| 25 | **inventory_valuation_method** | varchar(20) | ✓ | 'weighted_average'::charact... |  |
| 26 | **created_at** | timestamptz | ✓ | now() |  |
| 27 | **updated_at** | timestamptz | ✓ | now() |  |
| 28 | **name_ar** | varchar(200) | ✓ |  |  |
| 29 | **legal_name** | varchar(300) | ✓ |  |  |
| 30 | **registration_number** | varchar(100) | ✓ |  |  |
| 31 | **country** | varchar(100) | ✓ |  |  |
| 32 | **mobile** | varchar(50) | ✓ |  |  |
| 33 | **fiscal_year_start** | integer | ✓ | 1 |  |
| 34 | **settings** | jsonb | ✓ | '{}'::jsonb |  |
| 35 | **is_active** | boolean | ✓ | true |  |
| 36 | **industry_code** | varchar(50) | ✓ |  |  |
| 37 | **coa_template_applied** | varchar(50) | ✓ |  |  |
| 38 | **chart_type** | varchar(30) | ✓ | 'simple'::character varying |  |
| 39 | **rounding_method** | varchar(10) | ✓ | 'half_up'::character varying |  |
| 40 | **tax_rounding** | integer | ✓ | 2 |  |
| 41 | **amount_rounding** | integer | ✓ | 2 |  |
| 42 | **unit_price_rounding** | integer | ✓ | 4 |  |
| 43 | **total_rounding** | integer | ✓ | 2 |  |
| 44 | **inherit_country_rounding** | boolean | ✓ | true |  |
| 45 | **business_type** | varchar(50) | ✓ | 'general'::character varying |  |
| 46 | **company_type** | varchar(20) | ✓ | 'production'::character var... |  |
| 47 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 48 | **accounting_settings** | jsonb | ✓ | '{"edit_settings": {"requir... |  |
| 49 | **integrations** | jsonb | ✓ | '{}'::jsonb |  |

---

## `company_countries` — 6 عمود
**UNIQUE:** company_id, country_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **company_id** | uuid | ✗ |  | → companies.id |
| 3 | **country_code** | varchar(3) | ✗ |  | → countries.code |
| 4 | **is_primary** | boolean | ✓ | false |  |
| 5 | **created_at** | timestamptz | ✓ | now() |  |
| 6 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `company_workflow_settings` — 18 عمود
**UNIQUE:** company_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  |  |
| 4 | **require_manager_approval_quotation** | boolean | ✓ | false |  |
| 5 | **require_manager_approval_order** | boolean | ✓ | false |  |
| 6 | **require_manager_approval_invoice** | boolean | ✓ | false |  |
| 7 | **require_manager_approval_reservation** | boolean | ✓ | false |  |
| 8 | **approval_amount_threshold** | numeric | ✓ | 0 |  |
| 9 | **auto_create_delivery_on_confirm** | boolean | ✓ | true |  |
| 10 | **allow_edit_after_confirm** | boolean | ✓ | false |  |
| 11 | **edit_after_confirm_roles** | ARRAY | ✓ | ARRAY['company_admin'::text... |  |
| 12 | **notify_warehouse_on_confirm** | boolean | ✓ | true |  |
| 13 | **notify_manager_on_save** | boolean | ✓ | false |  |
| 14 | **notify_channel** | text | ✓ | 'internal'::text |  |
| 15 | **require_payment_for_confirmation** | boolean | ✓ | false |  |
| 16 | **min_payment_percent** | numeric | ✓ | 0 |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `roles` — 16 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **description** | text | ✓ |  |  |
| 7 | **is_super_admin** | boolean | ✓ | false |  |
| 8 | **is_system** | boolean | ✓ | false |  |
| 9 | **permissions** | jsonb | ✓ | '{}'::jsonb |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |
| 12 | **visible_modules** | ARRAY | ✓ | ARRAY['dashboard'::text] |  |
| 13 | **level** | text | ✓ | 'operations'::text |  |
| 14 | **can_be_deleted** | boolean | ✓ | true |  |
| 15 | **icon** | text | ✓ |  |  |
| 16 | **color** | text | ✓ |  |  |

---

## `super_admins` — 10 عمود
**UNIQUE:** user_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **email** | varchar(200) | ✗ |  |  |
| 4 | **full_name** | varchar(200) | ✓ |  |  |
| 5 | **is_active** | boolean | ✓ | true |  |
| 6 | **permissions** | jsonb | ✓ | '{}'::jsonb |  |
| 7 | **notes** | text | ✓ |  |  |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |
| 10 | **created_by** | uuid | ✓ |  |  |

---

## `tenant_languages` — 15 عمود
**UNIQUE:** tenant_id, language_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **language_code** | varchar(5) | ✗ |  |  |
| 4 | **language_name_ar** | varchar(100) | ✗ |  |  |
| 5 | **language_name_en** | varchar(100) | ✗ |  |  |
| 6 | **is_primary** | boolean | ✓ | false |  |
| 7 | **is_enabled** | boolean | ✓ | true |  |
| 8 | **display_order** | integer | ✓ | 0 |  |
| 9 | **enabled_at** | timestamptz | ✓ | now() |  |
| 10 | **enabled_by** | uuid | ✓ |  |  |
| 11 | **disabled_at** | timestamptz | ✓ |  |  |
| 12 | **disabled_by** | uuid | ✓ |  |  |
| 13 | **notes** | text | ✓ |  |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `tenant_modules` — 12 عمود
**UNIQUE:** tenant_id, module_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **module_code** | varchar(50) | ✗ |  |  |
| 4 | **source** | varchar(20) | ✓ | 'addon'::character varying |  |
| 5 | **enabled_at** | timestamptz | ✓ | now() |  |
| 6 | **enabled_by** | uuid | ✓ |  |  |
| 7 | **expires_at** | timestamptz | ✓ |  |  |
| 8 | **price_monthly** | numeric | ✓ |  |  |
| 9 | **is_active** | boolean | ✓ | true |  |
| 10 | **is_enabled** | boolean | ✓ | true |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `tenant_users` — 7 عمود
**UNIQUE:** tenant_id, user_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **user_id** | uuid | ✗ |  |  |
| 4 | **role** | varchar(50) | ✓ | 'member'::character varying |  |
| 5 | **is_active** | boolean | ✓ | true |  |
| 6 | **created_at** | timestamptz | ✓ | now() |  |
| 7 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `tenants` — 29 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name** | varchar(200) | ✗ |  |  |
| 4 | **email** | varchar(200) | ✓ |  |  |
| 5 | **phone** | varchar(50) | ✓ |  |  |
| 6 | **country** | varchar(100) | ✓ |  |  |
| 7 | **timezone** | varchar(50) | ✓ | 'UTC'::character varying |  |
| 8 | **default_language** | varchar(5) | ✓ | 'ar'::character varying |  |
| 9 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 10 | **settings** | jsonb | ✓ | '{}'::jsonb |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |
| 13 | **owner_email** | varchar(200) | ✓ |  |  |
| 14 | **owner_name** | varchar(200) | ✓ |  |  |
| 15 | **owner_phone** | varchar(50) | ✓ |  |  |
| 16 | **default_currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 17 | **users_count** | integer | ✓ | 0 |  |
| 18 | **companies_count** | integer | ✓ | 0 |  |
| 19 | **storage_used_mb** | integer | ✓ | 0 |  |
| 20 | **last_activity_at** | timestamptz | ✓ |  |  |
| 21 | **suspended_at** | timestamptz | ✓ |  |  |
| 22 | **suspended_reason** | text | ✓ |  |  |
| 23 | **agent_id** | uuid | ✓ |  | → agents.id |
| 24 | **referral_code** | varchar(50) | ✓ |  |  |
| 25 | **referral_source** | varchar(50) | ✓ |  |  |
| 26 | **tenant_referral_code** | varchar(50) | ✓ |  |  |
| 27 | **referral_credits** | numeric | ✓ | 0 |  |
| 28 | **product_id** | uuid | ✓ |  | → saas_products.id |
| 29 | **partner_id** | uuid | ✓ |  | → partners.id |

---

## `user_branch_permissions` — 11 عمود
**UNIQUE:** user_id, branch_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **user_id** | uuid | ✗ |  |  |
| 4 | **branch_id** | uuid | ✗ |  | → branches.id |
| 5 | **can_access** | boolean | ✓ | true |  |
| 6 | **can_manage** | boolean | ✓ | false |  |
| 7 | **is_primary** | boolean | ✓ | false |  |
| 8 | **assigned_at** | timestamptz | ✓ | now() |  |
| 9 | **assigned_by** | uuid | ✓ |  |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_feature_permissions` — 11 عمود
**UNIQUE:** user_id, tenant_id, company_id, module_code, feature_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 4 | **company_id** | uuid | ✗ |  | → companies.id |
| 5 | **module_code** | varchar(50) | ✗ |  | → module_features.module_code |
| 6 | **feature_code** | varchar(100) | ✗ |  | → module_features.feature_code |
| 7 | **is_enabled** | boolean | ✓ | true |  |
| 8 | **granted_by** | uuid | ✓ |  |  |
| 9 | **granted_at** | timestamptz | ✓ | now() |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_fund_permissions` — 16 عمود
**UNIQUE:** user_id, fund_account_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **user_id** | uuid | ✗ |  |  |
| 4 | **fund_account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 5 | **can_view** | boolean | ✓ | true |  |
| 6 | **can_deposit** | boolean | ✓ | false |  |
| 7 | **can_withdraw** | boolean | ✓ | false |  |
| 8 | **can_transfer** | boolean | ✓ | false |  |
| 9 | **can_close** | boolean | ✓ | false |  |
| 10 | **daily_limit** | numeric | ✓ |  |  |
| 11 | **transaction_limit** | numeric | ✓ |  |  |
| 12 | **is_primary** | boolean | ✓ | false |  |
| 13 | **assigned_at** | timestamptz | ✓ | now() |  |
| 14 | **assigned_by** | uuid | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_module_permissions` — 20 عمود
**UNIQUE:** user_id, tenant_id, company_id, module_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 4 | **company_id** | uuid | ✗ |  | → companies.id |
| 5 | **module_code** | varchar(50) | ✗ |  |  |
| 6 | **can_view** | boolean | ✓ | true |  |
| 7 | **can_create** | boolean | ✓ | false |  |
| 8 | **can_edit** | boolean | ✓ | false |  |
| 9 | **can_delete** | boolean | ✓ | false |  |
| 10 | **can_export** | boolean | ✓ | false |  |
| 11 | **can_import** | boolean | ✓ | false |  |
| 12 | **can_approve** | boolean | ✓ | false |  |
| 13 | **can_manage_settings** | boolean | ✓ | false |  |
| 14 | **granted_by** | uuid | ✓ |  |  |
| 15 | **granted_at** | timestamptz | ✓ | now() |  |
| 16 | **expires_at** | timestamptz | ✓ |  |  |
| 17 | **notes** | text | ✓ |  |  |
| 18 | **is_active** | boolean | ✓ | true |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_profiles` — 21 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ |  |  |
| 2 | **email** | varchar(255) | ✗ |  |  |
| 3 | **full_name** | varchar(255) | ✓ |  |  |
| 4 | **avatar_url** | text | ✓ |  |  |
| 5 | **role** | varchar(50) | ✓ | 'user'::character varying |  |
| 6 | **company_id** | uuid | ✓ |  | → companies.id |
| 7 | **branch_id** | uuid | ✓ |  | → branches.id |
| 8 | **phone** | varchar(50) | ✓ |  |  |
| 9 | **preferences** | jsonb | ✓ | '{}'::jsonb |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |
| 12 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 13 | **customer_id** | uuid | ✓ |  | → customers.id |
| 14 | **is_active** | boolean | ✓ | true |  |
| 15 | **is_super_admin** | boolean | ✓ | false |  |
| 16 | **is_platform_admin** | boolean | ✓ | false |  |
| 17 | **is_tenant_admin** | boolean | ✓ | false |  |
| 18 | **telegram_username** | varchar(100) | ✓ |  |  |
| 19 | **telegram_chat_id** | bigint | ✓ |  |  |
| 20 | **is_manager** | boolean | ✓ | false |  |
| 21 | **qr_access_level** | integer | ✓ | 1 |  |

---

## `user_resource_access` — 20 عمود
**UNIQUE:** user_id, resource_type, resource_id
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  | → user_profiles.id |
| 3 | **tenant_id** | uuid | ✓ |  |  |
| 4 | **company_id** | uuid | ✓ |  |  |
| 5 | **resource_type** | text | ✗ |  |  |
| 6 | **resource_id** | uuid | ✗ |  |  |
| 7 | **can_read** | boolean | ✓ | true |  |
| 8 | **can_write** | boolean | ✓ | false |  |
| 9 | **can_delete** | boolean | ✓ | false |  |
| 10 | **can_deposit** | boolean | ✓ | false |  |
| 11 | **can_withdraw** | boolean | ✓ | false |  |
| 12 | **can_receive** | boolean | ✓ | false |  |
| 13 | **can_issue** | boolean | ✓ | false |  |
| 14 | **is_keeper** | boolean | ✓ | false |  |
| 15 | **is_primary** | boolean | ✓ | false |  |
| 16 | **assigned_by** | uuid | ✓ |  |  |
| 17 | **assigned_at** | timestamptz | ✓ | now() |  |
| 18 | **notes** | text | ✓ |  |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `user_resource_access_resource_type_check`

---

## `user_role_assignments` — 10 عمود
**UNIQUE:** user_id, role_id, tenant_id, company_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **role_id** | uuid | ✗ |  |  |
| 4 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 5 | **company_id** | uuid | ✗ |  | → companies.id |
| 6 | **assigned_by** | uuid | ✓ |  |  |
| 7 | **assigned_at** | timestamptz | ✓ | now() |  |
| 8 | **is_active** | boolean | ✓ | true |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_roles` — 12 عمود
**UNIQUE:** user_id, role_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  | → user_profiles.id |
| 3 | **role_id** | uuid | ✗ |  | → roles.id |
| 4 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 5 | **company_id** | uuid | ✓ |  | → companies.id |
| 6 | **branch_id** | uuid | ✓ |  |  |
| 7 | **is_active** | boolean | ✓ | true |  |
| 8 | **assigned_by** | uuid | ✓ |  |  |
| 9 | **assigned_at** | timestamptz | ✓ | now() |  |
| 10 | **expires_at** | timestamptz | ✓ |  |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_table_preferences` — 8 عمود
**UNIQUE:** user_id, table_key

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **table_key** | varchar(100) | ✗ |  |  |
| 4 | **column_visibility** | jsonb | ✓ | '{}'::jsonb |  |
| 5 | **column_sizing** | jsonb | ✓ | '{}'::jsonb |  |
| 6 | **column_order** | ARRAY | ✓ | '{}'::text[] |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `user_warehouse_permissions` — 15 عمود
**UNIQUE:** user_id, warehouse_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **user_id** | uuid | ✗ |  |  |
| 4 | **warehouse_id** | uuid | ✗ |  | → warehouses.id |
| 5 | **can_view** | boolean | ✓ | true |  |
| 6 | **can_receive** | boolean | ✓ | false |  |
| 7 | **can_issue** | boolean | ✓ | false |  |
| 8 | **can_transfer** | boolean | ✓ | false |  |
| 9 | **can_count** | boolean | ✓ | false |  |
| 10 | **can_adjust** | boolean | ✓ | false |  |
| 11 | **is_keeper** | boolean | ✓ | false |  |
| 12 | **assigned_at** | timestamptz | ✓ | now() |  |
| 13 | **assigned_by** | uuid | ✓ |  |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `warehouse_assignments` — 11 عمود
**UNIQUE:** warehouse_id, user_id
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **warehouse_id** | uuid | ✗ |  | → warehouses.id |
| 4 | **user_id** | uuid | ✗ |  | → user_profiles.id |
| 5 | **role** | varchar(20) | ✗ |  |  |
| 6 | **is_active** | boolean | ✓ | true |  |
| 7 | **assigned_at** | timestamptz | ✓ | now() |  |
| 8 | **assigned_by** | uuid | ✓ |  | → user_profiles.id |
| 9 | **notes** | text | ✓ |  |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `warehouse_assignments_role_check`

---

# ════════════════════════════════════════════════════════════
# Accounting — المحاسبة
# ════════════════════════════════════════════════════════════

## `account_invoice_items` — 20 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **invoice_id** | uuid | ✗ |  | → account_invoices.id |
| 4 | **line_number** | integer | ✓ | 1 |  |
| 5 | **product_id** | uuid | ✓ |  |  |
| 6 | **description** | text | ✗ |  |  |
| 7 | **quantity** | numeric | ✗ | 1 |  |
| 8 | **unit** | varchar(50) | ✓ |  |  |
| 9 | **unit_price** | numeric | ✗ | 0 |  |
| 10 | **discount_type** | varchar(20) | ✓ | 'fixed'::character varying |  |
| 11 | **discount_value** | numeric | ✓ | 0 |  |
| 12 | **discount_amount** | numeric | ✓ | 0 |  |
| 13 | **tax_rate** | numeric | ✓ | 0 |  |
| 14 | **tax_amount** | numeric | ✓ | 0 |  |
| 15 | **subtotal** | numeric | ✗ | 0 |  |
| 16 | **total** | numeric | ✗ | 0 |  |
| 17 | **sub_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 18 | **notes** | text | ✓ |  |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `account_invoices` — 37 عمود
**UNIQUE:** tenant_id, company_id, invoice_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **invoice_number** | varchar(50) | ✗ |  |  |
| 6 | **invoice_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **due_date** | date | ✓ |  |  |
| 8 | **invoice_type** | varchar(30) | ✗ | 'receivable'::character var... |  |
| 9 | **account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 10 | **party_type** | varchar(20) | ✓ |  |  |
| 11 | **party_id** | uuid | ✓ |  |  |
| 12 | **party_name** | varchar(200) | ✓ |  |  |
| 13 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 14 | **exchange_rate** | numeric | ✓ | 1 |  |
| 15 | **subtotal** | numeric | ✓ | 0 |  |
| 16 | **discount_amount** | numeric | ✓ | 0 |  |
| 17 | **tax_amount** | numeric | ✓ | 0 |  |
| 18 | **total_amount** | numeric | ✗ | 0 |  |
| 19 | **paid_amount** | numeric | ✓ | 0 |  |
| 20 | **debit_amount** | numeric | ✓ | 0 |  |
| 21 | **credit_amount** | numeric | ✓ | 0 |  |
| 22 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 23 | **payment_status** | varchar(20) | ✓ | 'unpaid'::character varying |  |
| 24 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 25 | **is_posted** | boolean | ✓ | false |  |
| 26 | **posted_at** | timestamptz | ✓ |  |  |
| 27 | **posted_by** | uuid | ✓ |  |  |
| 28 | **description** | text | ✓ |  |  |
| 29 | **notes** | text | ✓ |  |  |
| 30 | **internal_notes** | text | ✓ |  |  |
| 31 | **attachment_url** | text | ✓ |  |  |
| 32 | **cancelled_at** | timestamptz | ✓ |  |  |
| 33 | **cancelled_by** | uuid | ✓ |  |  |
| 34 | **cancel_reason** | text | ✓ |  |  |
| 35 | **created_by** | uuid | ✓ |  |  |
| 36 | **created_at** | timestamptz | ✓ | now() |  |
| 37 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `account_transfers` — 12 عمود
**CHECK:** 2 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **source_account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 5 | **target_account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 6 | **transfer_type** | varchar(20) | ✗ |  |  |
| 7 | **amount** | numeric | ✓ |  |  |
| 8 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 9 | **notes** | text | ✓ |  |  |
| 10 | **created_by** | uuid | ✓ |  |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `valid_transfer_type`
- `different_accounts`

---

## `account_types` — 17 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(20) | ✗ |  |  |
| 3 | **name_ar** | varchar(100) | ✗ |  |  |
| 4 | **name_en** | varchar(100) | ✓ |  |  |
| 5 | **classification** | varchar(50) | ✗ |  |  |
| 6 | **normal_balance** | varchar(10) | ✗ |  |  |
| 7 | **display_order** | integer | ✓ | 0 |  |
| 8 | **is_system** | boolean | ✓ | true |  |
| 9 | **name_ru** | varchar(100) | ✓ |  |  |
| 10 | **name_uk** | varchar(100) | ✓ |  |  |
| 11 | **name_ro** | varchar(100) | ✓ |  |  |
| 12 | **name_pl** | varchar(100) | ✓ |  |  |
| 13 | **name_tr** | varchar(100) | ✓ |  |  |
| 14 | **name_de** | varchar(100) | ✓ |  |  |
| 15 | **name_it** | varchar(100) | ✓ |  |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `accounting_periods` — 13 عمود
**UNIQUE:** fiscal_year_id, period_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **fiscal_year_id** | uuid | ✗ |  | → fiscal_years.id |
| 5 | **name** | varchar(100) | ✗ |  |  |
| 6 | **period_number** | integer | ✗ |  |  |
| 7 | **start_date** | date | ✗ |  |  |
| 8 | **end_date** | date | ✗ |  |  |
| 9 | **is_closed** | boolean | ✓ | false |  |
| 10 | **closed_at** | timestamptz | ✓ |  |  |
| 11 | **closed_by** | uuid | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `accounts` — 17 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **code** | varchar(20) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **account_type** | USER-DEFINED | ✗ |  |  |
| 7 | **parent_id** | uuid | ✓ |  | → accounts.id |
| 8 | **level** | integer | ✓ | 1 |  |
| 9 | **is_group** | boolean | ✓ | false |  |
| 10 | **is_active** | boolean | ✓ | true |  |
| 11 | **currency_code** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 12 | **opening_balance** | numeric | ✓ | 0 |  |
| 13 | **current_balance** | numeric | ✓ | 0 |  |
| 14 | **account_category** | varchar(50) | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |
| 17 | **tenant_id** | uuid | ✓ |  | → tenants.id |

---

## `bank_account_limits` — 17 عمود
**CHECK:** 2 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 5 | **fop_group** | varchar(20) | ✓ |  |  |
| 6 | **account_type** | varchar(50) | ✓ |  |  |
| 7 | **annual_limit** | numeric | ✓ |  |  |
| 8 | **monthly_limit** | numeric | ✓ |  |  |
| 9 | **current_year_total** | numeric | ✓ | 0 |  |
| 10 | **current_month_total** | numeric | ✓ | 0 |  |
| 11 | **last_reset_date** | date | ✓ |  |  |
| 12 | **warning_threshold_percent** | integer | ✓ | 80 |  |
| 13 | **alert_threshold_percent** | integer | ✓ | 95 |  |
| 14 | **country_code** | varchar(2) | ✓ | 'UA'::character varying |  |
| 15 | **is_active** | boolean | ✓ | true |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `valid_thresholds`
- `valid_fop_group`

---

## `bank_integrations` — 7 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **bank_name** | varchar(50) | ✓ |  |  |
| 4 | **api_key** | text | ✓ |  |  |
| 5 | **account_id** | uuid | ✓ |  | → accounts.id |
| 6 | **last_sync_at** | timestamptz | ✓ |  |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |

---

## `budget_alerts` — 19 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **budget_id** | uuid | ✓ |  | → budgets.id |
| 4 | **budget_line_id** | uuid | ✓ |  | → budget_lines.id |
| 5 | **alert_type** | varchar(50) | ✗ |  |  |
| 6 | **severity** | varchar(20) | ✓ | 'warning'::character varying |  |
| 7 | **threshold_percent** | numeric | ✗ |  |  |
| 8 | **current_percent** | numeric | ✓ |  |  |
| 9 | **budgeted_amount** | numeric | ✓ |  |  |
| 10 | **actual_amount** | numeric | ✓ |  |  |
| 11 | **message_ar** | text | ✓ |  |  |
| 12 | **message_en** | text | ✓ |  |  |
| 13 | **is_active** | boolean | ✓ | true |  |
| 14 | **triggered_at** | timestamptz | ✓ | now() |  |
| 15 | **acknowledged_by** | uuid | ✓ |  | → user_profiles.id |
| 16 | **acknowledged_at** | timestamptz | ✓ |  |  |
| 17 | **acknowledgment_notes** | text | ✓ |  |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `budget_lines` — 17 عمود
**UNIQUE:** budget_id, account_id, cost_center_id, period

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **budget_id** | uuid | ✗ |  | → budgets.id |
| 4 | **account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 5 | **cost_center_id** | uuid | ✓ |  | → cost_centers.id |
| 6 | **period** | varchar(10) | ✗ |  |  |
| 7 | **period_start** | date | ✗ |  |  |
| 8 | **period_end** | date | ✗ |  |  |
| 9 | **budgeted_amount** | numeric | ✗ | 0 |  |
| 10 | **actual_amount** | numeric | ✓ | 0 |  |
| 11 | **committed_amount** | numeric | ✓ | 0 |  |
| 12 | **available_amount** | numeric | ✓ |  |  |
| 13 | **variance** | numeric | ✓ |  |  |
| 14 | **variance_percent** | numeric | ✓ |  |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `budgets` — 24 عمود
**CHECK:** 3 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **code** | varchar(50) | ✓ |  |  |
| 5 | **name_ar** | varchar(255) | ✗ |  |  |
| 6 | **name_en** | varchar(255) | ✓ |  |  |
| 7 | **description** | text | ✓ |  |  |
| 8 | **budget_type** | varchar(50) | ✗ | 'expense'::character varying |  |
| 9 | **fiscal_year_id** | uuid | ✓ |  | → fiscal_years.id |
| 10 | **start_date** | date | ✗ |  |  |
| 11 | **end_date** | date | ✗ |  |  |
| 12 | **period_type** | varchar(20) | ✓ | 'monthly'::character varying |  |
| 13 | **total_budgeted** | numeric | ✓ | 0 |  |
| 14 | **total_actual** | numeric | ✓ | 0 |  |
| 15 | **total_variance** | numeric | ✓ |  |  |
| 16 | **variance_percent** | numeric | ✓ |  |  |
| 17 | **cost_center_id** | uuid | ✓ |  | → cost_centers.id |
| 18 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 19 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 20 | **approved_by** | uuid | ✓ |  | → user_profiles.id |
| 21 | **approved_at** | timestamptz | ✓ |  |  |
| 22 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_budget_status`
- `chk_budget_dates`
- `chk_budget_type`

---

## `chart_of_accounts` — 36 عمود
**UNIQUE:** tenant_id, company_id, account_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **account_code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(200) | ✗ |  |  |
| 6 | **name_en** | varchar(200) | ✓ |  |  |
| 7 | **name_ru** | varchar(200) | ✓ |  |  |
| 8 | **name_uk** | varchar(200) | ✓ |  |  |
| 9 | **name_ro** | varchar(200) | ✓ |  |  |
| 10 | **name_pl** | varchar(200) | ✓ |  |  |
| 11 | **name_tr** | varchar(200) | ✓ |  |  |
| 12 | **name_de** | varchar(200) | ✓ |  |  |
| 13 | **name_it** | varchar(200) | ✓ |  |  |
| 14 | **account_type_id** | uuid | ✗ |  | → account_types.id |
| 15 | **parent_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 16 | **is_group** | boolean | ✓ | false |  |
| 17 | **is_detail** | boolean | ✓ | true |  |
| 18 | **level** | integer | ✓ | 1 |  |
| 19 | **full_code** | varchar(200) | ✓ |  |  |
| 20 | **currency** | varchar(3) | ✓ |  |  |
| 21 | **is_multi_currency** | boolean | ✓ | false |  |
| 22 | **is_bank_account** | boolean | ✓ | false |  |
| 23 | **bank_name** | varchar(200) | ✓ |  |  |
| 24 | **bank_account_number** | varchar(100) | ✓ |  |  |
| 25 | **is_cash_account** | boolean | ✓ | false |  |
| 26 | **is_receivable** | boolean | ✓ | false |  |
| 27 | **is_payable** | boolean | ✓ | false |  |
| 28 | **opening_balance** | numeric | ✓ | 0 |  |
| 29 | **current_balance** | numeric | ✓ | 0 |  |
| 30 | **description** | text | ✓ |  |  |
| 31 | **notes** | text | ✓ |  |  |
| 32 | **is_system** | boolean | ✓ | false |  |
| 33 | **is_active** | boolean | ✓ | true |  |
| 34 | **created_at** | timestamptz | ✓ | now() |  |
| 35 | **updated_at** | timestamptz | ✓ | now() |  |
| 36 | **external_code** | varchar(100) | ✓ |  |  |

---

## `chart_templates` — 12 عمود
**UNIQUE:** tenant_id, template_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **template_code** | varchar(50) | ✗ |  |  |
| 4 | **template_name_ar** | varchar(200) | ✗ |  |  |
| 5 | **template_name_en** | varchar(200) | ✓ |  |  |
| 6 | **description_ar** | text | ✓ |  |  |
| 7 | **description_en** | text | ✓ |  |  |
| 8 | **chart_type** | varchar(30) | ✗ |  |  |
| 9 | **include_demo_data** | boolean | ✓ | false |  |
| 10 | **is_active** | boolean | ✓ | true |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `coa_template_cash_accounts` — 12 عمود
**UNIQUE:** template_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **template_id** | uuid | ✗ |  | → coa_templates.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **account_code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(200) | ✗ |  |  |
| 6 | **name_en** | varchar(200) | ✓ |  |  |
| 7 | **account_type** | varchar(20) | ✗ |  |  |
| 8 | **currency** | varchar(3) | ✓ | 'UAH'::character varying |  |
| 9 | **opening_balance** | numeric | ✓ | 0 |  |
| 10 | **bank_name** | varchar(200) | ✓ |  |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `coa_template_items` — 28 عمود
**UNIQUE:** template_id, account_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **template_id** | uuid | ✗ |  | → coa_templates.id |
| 3 | **account_code** | varchar(50) | ✗ |  |  |
| 4 | **parent_code** | varchar(50) | ✓ |  |  |
| 5 | **account_type_code** | varchar(20) | ✗ |  |  |
| 6 | **name_ar** | varchar(200) | ✗ |  |  |
| 7 | **name_en** | varchar(200) | ✓ |  |  |
| 8 | **name_ru** | varchar(200) | ✓ |  |  |
| 9 | **name_uk** | varchar(200) | ✓ |  |  |
| 10 | **name_ro** | varchar(200) | ✓ |  |  |
| 11 | **name_pl** | varchar(200) | ✓ |  |  |
| 12 | **name_tr** | varchar(200) | ✓ |  |  |
| 13 | **name_de** | varchar(200) | ✓ |  |  |
| 14 | **name_it** | varchar(200) | ✓ |  |  |
| 15 | **is_group** | boolean | ✓ | false |  |
| 16 | **is_detail** | boolean | ✓ | true |  |
| 17 | **level** | integer | ✓ | 1 |  |
| 18 | **is_cash_account** | boolean | ✓ | false |  |
| 19 | **is_bank_account** | boolean | ✓ | false |  |
| 20 | **is_receivable** | boolean | ✓ | false |  |
| 21 | **is_payable** | boolean | ✓ | false |  |
| 22 | **is_inventory** | boolean | ✓ | false |  |
| 23 | **is_fabric_inventory** | boolean | ✓ | false |  |
| 24 | **default_currency** | varchar(3) | ✓ | 'UAH'::character varying |  |
| 25 | **opening_balance** | numeric | ✓ | 0 |  |
| 26 | **display_order** | integer | ✓ | 0 |  |
| 27 | **created_at** | timestamptz | ✓ | now() |  |
| 28 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `coa_templates` — 21 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name_ar** | varchar(200) | ✗ |  |  |
| 4 | **name_en** | varchar(200) | ✓ |  |  |
| 5 | **name_ru** | varchar(200) | ✓ |  |  |
| 6 | **name_uk** | varchar(200) | ✓ |  |  |
| 7 | **name_ro** | varchar(200) | ✓ |  |  |
| 8 | **name_pl** | varchar(200) | ✓ |  |  |
| 9 | **name_tr** | varchar(200) | ✓ |  |  |
| 10 | **name_de** | varchar(200) | ✓ |  |  |
| 11 | **name_it** | varchar(200) | ✓ |  |  |
| 12 | **description_ar** | text | ✓ |  |  |
| 13 | **description_en** | text | ✓ |  |  |
| 14 | **icon** | varchar(50) | ✓ |  |  |
| 15 | **industry_code** | varchar(50) | ✓ |  |  |
| 16 | **accounts_count** | integer | ✓ | 0 |  |
| 17 | **is_default** | boolean | ✓ | false |  |
| 18 | **is_active** | boolean | ✓ | true |  |
| 19 | **display_order** | integer | ✓ | 0 |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `company_accounting_settings` — 32 عمود
**UNIQUE:** company_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **company_id** | uuid | ✗ |  | → companies.id |
| 3 | **base_currency** | varchar(3) | ✓ | 'UAH'::character varying |  |
| 4 | **fiscal_year_start_month** | integer | ✓ | 1 |  |
| 5 | **fiscal_year_end_month** | integer | ✓ | 12 |  |
| 6 | **entry_number_prefix** | varchar(10) | ✓ |  |  |
| 7 | **entry_number_reset_yearly** | boolean | ✓ | true |  |
| 8 | **default_vat_rate** | numeric | ✓ | 20.00 |  |
| 9 | **default_income_tax_rate** | numeric | ✓ | 18.00 |  |
| 10 | **enable_vat** | boolean | ✓ | true |  |
| 11 | **default_cash_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 12 | **default_bank_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 13 | **default_revenue_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 14 | **default_expense_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 15 | **default_receivable_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 16 | **default_payable_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 17 | **decimal_places** | integer | ✓ | 2 |  |
| 18 | **date_format** | varchar(20) | ✓ | 'DD/MM/YYYY'::character var... |  |
| 19 | **number_format** | varchar(20) | ✓ | '1,234.56'::character varying |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |
| 22 | **supported_currencies** | ARRAY | ✓ | ARRAY['USD'::text] |  |
| 23 | **default_international_purchase_currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 24 | **auto_post_entries** | boolean | ✓ | false |  |
| 25 | **require_approval** | boolean | ✓ | true |  |
| 26 | **current_entry_number** | integer | ✓ | 1 |  |
| 27 | **default_sales_currency** | varchar(3) | ✓ |  |  |
| 28 | **default_purchase_currency** | varchar(3) | ✓ |  |  |
| 29 | **vat_enabled** | boolean | ✓ | true |  |
| 30 | **vat_rate** | numeric | ✓ | 15 |  |
| 31 | **journal_entry_prefix** | varchar(10) | ✓ | 'JE'::character varying |  |
| 32 | **reset_numbering_yearly** | boolean | ✓ | true |  |

---

## `cost_centers` — 20 عمود
**UNIQUE:** tenant_id, company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(200) | ✗ |  |  |
| 6 | **name_en** | varchar(200) | ✓ |  |  |
| 7 | **parent_id** | uuid | ✓ |  | → cost_centers.id |
| 8 | **is_group** | boolean | ✓ | false |  |
| 9 | **is_active** | boolean | ✓ | true |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **description** | text | ✓ |  |  |
| 12 | **manager_id** | uuid | ✓ |  | → user_profiles.id |
| 13 | **budget_limit** | numeric | ✓ |  |  |
| 14 | **current_spending** | numeric | ✓ | 0 |  |
| 15 | **cost_center_type** | varchar(50) | ✓ | 'department'::character var... |  |
| 16 | **start_date** | date | ✓ |  |  |
| 17 | **end_date** | date | ✓ |  |  |
| 18 | **level** | integer | ✓ | 0 |  |
| 19 | **full_code** | varchar(100) | ✓ |  |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `exchange_rates` — 16 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **from_currency** | varchar(3) | ✗ |  |  |
| 5 | **to_currency** | varchar(3) | ✗ |  |  |
| 6 | **buy_rate** | numeric | ✗ |  |  |
| 7 | **sell_rate** | numeric | ✗ |  |  |
| 8 | **mid_rate** | numeric | ✓ |  |  |
| 9 | **margin_percent** | numeric | ✓ | 0 |  |
| 10 | **effective_from** | timestamptz | ✗ | now() |  |
| 11 | **effective_to** | timestamptz | ✓ |  |  |
| 12 | **source** | varchar(50) | ✓ | 'manual'::character varying |  |
| 13 | **is_active** | boolean | ✓ | true |  |
| 14 | **created_by** | uuid | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `fiscal_years` — 13 عمود
**UNIQUE:** tenant_id, company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **name** | varchar(100) | ✗ |  |  |
| 5 | **code** | varchar(20) | ✗ |  |  |
| 6 | **start_date** | date | ✗ |  |  |
| 7 | **end_date** | date | ✗ |  |  |
| 8 | **is_current** | boolean | ✓ | false |  |
| 9 | **is_closed** | boolean | ✓ | false |  |
| 10 | **closed_at** | timestamptz | ✓ |  |  |
| 11 | **closed_by** | uuid | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `journal_entries` — 40 عمود
**UNIQUE:** tenant_id, entry_number
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **entry_number** | varchar(50) | ✗ |  |  |
| 6 | **entry_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **fiscal_year_id** | uuid | ✓ |  | → fiscal_years.id |
| 8 | **period_id** | uuid | ✓ |  | → accounting_periods.id |
| 9 | **entry_type** | varchar(30) | ✓ | 'manual'::character varying |  |
| 10 | **reference_type** | varchar(50) | ✓ |  |  |
| 11 | **reference_id** | uuid | ✓ |  |  |
| 12 | **reference_number** | varchar(100) | ✓ |  |  |
| 13 | **description** | text | ✗ |  |  |
| 14 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 15 | **exchange_rate** | numeric | ✓ | 1 |  |
| 16 | **total_debit** | numeric | ✓ | 0 |  |
| 17 | **total_credit** | numeric | ✓ | 0 |  |
| 18 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 19 | **is_posted** | boolean | ✓ | false |  |
| 20 | **posted_at** | timestamptz | ✓ |  |  |
| 21 | **posted_by** | uuid | ✓ |  |  |
| 22 | **is_reversed** | boolean | ✓ | false |  |
| 23 | **reversed_at** | timestamptz | ✓ |  |  |
| 24 | **reversed_by** | uuid | ✓ |  |  |
| 25 | **reversal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 26 | **original_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 27 | **notes** | text | ✓ |  |  |
| 28 | **created_by** | uuid | ✓ |  |  |
| 29 | **created_at** | timestamptz | ✓ | now() |  |
| 30 | **updated_at** | timestamptz | ✓ | now() |  |
| 31 | **description_ar** | text | ✓ |  |  |
| 32 | **description_en** | text | ✓ |  |  |
| 33 | **description_ru** | text | ✓ |  |  |
| 34 | **description_uk** | text | ✓ |  |  |
| 35 | **description_ro** | text | ✓ |  |  |
| 36 | **description_pl** | text | ✓ |  |  |
| 37 | **description_tr** | text | ✓ |  |  |
| 38 | **description_de** | text | ✓ |  |  |
| 39 | **description_it** | text | ✓ |  |  |
| 40 | **marker_color** | varchar(20) | ✓ | NULL::character varying |  |

**CHECK Constraints:**
- `chk_balanced_entry`

---

## `journal_entry_lines` — 22 عمود
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **entry_id** | uuid | ✗ |  | → journal_entries.id |
| 4 | **line_number** | integer | ✓ | 1 |  |
| 5 | **account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 6 | **debit** | numeric | ✓ | 0 |  |
| 7 | **credit** | numeric | ✓ | 0 |  |
| 8 | **currency** | varchar(3) | ✓ |  |  |
| 9 | **exchange_rate** | numeric | ✓ | 1 |  |
| 10 | **debit_fc** | numeric | ✓ | 0 |  |
| 11 | **credit_fc** | numeric | ✓ | 0 |  |
| 12 | **description** | text | ✓ |  |  |
| 13 | **cost_center_id** | uuid | ✓ |  |  |
| 14 | **party_type** | varchar(20) | ✓ |  |  |
| 15 | **party_id** | uuid | ✓ |  |  |
| 16 | **reference_type** | varchar(50) | ✓ |  |  |
| 17 | **reference_id** | uuid | ✓ |  |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **marker_color** | varchar(20) | ✓ | NULL::character varying |  |
| 20 | **marked_at** | timestamptz | ✓ |  |  |
| 21 | **marked_by** | uuid | ✓ |  |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_debit_or_credit`

---

## `recurring_entries` — 35 عمود
**CHECK:** 5 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **code** | varchar(50) | ✓ |  |  |
| 6 | **name_ar** | varchar(255) | ✗ |  |  |
| 7 | **name_en** | varchar(255) | ✓ |  |  |
| 8 | **description** | text | ✓ |  |  |
| 9 | **frequency** | varchar(20) | ✗ | 'monthly'::character varying |  |
| 10 | **interval_value** | integer | ✓ | 1 |  |
| 11 | **day_of_month** | integer | ✓ |  |  |
| 12 | **day_of_week** | integer | ✓ |  |  |
| 13 | **month_of_year** | integer | ✓ |  |  |
| 14 | **start_date** | date | ✗ |  |  |
| 15 | **end_date** | date | ✓ |  |  |
| 16 | **next_run_date** | date | ✗ |  |  |
| 17 | **last_run_date** | date | ✓ |  |  |
| 18 | **times_executed** | integer | ✓ | 0 |  |
| 19 | **max_executions** | integer | ✓ |  |  |
| 20 | **amount** | numeric | ✗ |  |  |
| 21 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 22 | **requires_approval** | boolean | ✓ | true |  |
| 23 | **approver_id** | uuid | ✓ |  | → user_profiles.id |
| 24 | **auto_post** | boolean | ✓ | false |  |
| 25 | **notify_days_before** | integer | ✓ | 3 |  |
| 26 | **notify_on_execution** | boolean | ✓ | true |  |
| 27 | **notification_emails** | ARRAY | ✓ |  |  |
| 28 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 29 | **is_active** | boolean | ✓ | true |  |
| 30 | **paused_at** | timestamptz | ✓ |  |  |
| 31 | **paused_by** | uuid | ✓ |  | → user_profiles.id |
| 32 | **pause_reason** | text | ✓ |  |  |
| 33 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 34 | **created_at** | timestamptz | ✓ | now() |  |
| 35 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_amount_positive`
- `chk_day_of_week`
- `chk_day_of_month`
- `chk_status`
- `chk_frequency`

---

## `recurring_entry_executions` — 12 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **template_id** | uuid | ✗ |  | → recurring_entry_templates.id |
| 4 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 5 | **execution_date** | date | ✗ |  |  |
| 6 | **scheduled_date** | date | ✗ |  |  |
| 7 | **status** | varchar(20) | ✗ | 'pending'::character varying |  |
| 8 | **error_message** | text | ✓ |  |  |
| 9 | **executed_by** | uuid | ✓ |  |  |
| 10 | **executed_at** | timestamptz | ✓ |  |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `recurring_entry_history` — 18 عمود
**CHECK:** 2 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **recurring_entry_id** | uuid | ✗ |  | → recurring_entries.id |
| 4 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 5 | **scheduled_date** | date | ✗ |  |  |
| 6 | **executed_at** | timestamptz | ✓ |  |  |
| 7 | **executed_by** | uuid | ✓ |  | → user_profiles.id |
| 8 | **amount** | numeric | ✓ |  |  |
| 9 | **approval_status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 10 | **approved_by** | uuid | ✓ |  | → user_profiles.id |
| 11 | **approved_at** | timestamptz | ✓ |  |  |
| 12 | **rejection_reason** | text | ✓ |  |  |
| 13 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 14 | **error_message** | text | ✓ |  |  |
| 15 | **notification_sent** | boolean | ✓ | false |  |
| 16 | **notification_sent_at** | timestamptz | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_history_status`
- `chk_approval_status`

---

## `recurring_entry_lines` — 14 عمود
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **template_id** | uuid | ✓ |  | → recurring_entry_templates.id |
| 4 | **line_number** | integer | ✓ | 1 |  |
| 5 | **account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 6 | **debit** | numeric | ✓ | 0 |  |
| 7 | **credit** | numeric | ✓ | 0 |  |
| 8 | **is_percentage** | boolean | ✓ | false |  |
| 9 | **percentage** | numeric | ✓ |  |  |
| 10 | **description** | text | ✓ |  |  |
| 11 | **cost_center_id** | uuid | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **recurring_entry_id** | uuid | ✓ |  | → recurring_entries.id |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_recurring_line_debit_or_credit`

---

## `recurring_entry_templates` — 25 عمود
**UNIQUE:** tenant_id, company_id, template_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **template_code** | varchar(50) | ✗ |  |  |
| 5 | **template_name** | varchar(200) | ✗ |  |  |
| 6 | **description** | text | ✓ |  |  |
| 7 | **frequency** | varchar(20) | ✗ |  |  |
| 8 | **day_of_week** | integer | ✓ |  |  |
| 9 | **day_of_month** | integer | ✓ |  |  |
| 10 | **month_of_year** | integer | ✓ |  |  |
| 11 | **start_date** | date | ✗ |  |  |
| 12 | **end_date** | date | ✓ |  |  |
| 13 | **next_execution_date** | date | ✓ |  |  |
| 14 | **last_execution_date** | date | ✓ |  |  |
| 15 | **execution_count** | integer | ✓ | 0 |  |
| 16 | **max_executions** | integer | ✓ |  |  |
| 17 | **total_amount** | numeric | ✗ |  |  |
| 18 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 19 | **is_active** | boolean | ✓ | true |  |
| 20 | **auto_post** | boolean | ✓ | false |  |
| 21 | **notify_on_creation** | boolean | ✓ | true |  |
| 22 | **category** | varchar(50) | ✓ |  |  |
| 23 | **created_by** | uuid | ✓ |  |  |
| 24 | **created_at** | timestamptz | ✓ | now() |  |
| 25 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `report_shares` — 15 عمود
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **template_id** | uuid | ✓ |  | → report_templates.id |
| 4 | **saved_report_id** | uuid | ✓ |  | → saved_reports.id |
| 5 | **shared_with_user_id** | uuid | ✓ |  | → user_profiles.id |
| 6 | **shared_with_role** | varchar(50) | ✓ |  |  |
| 7 | **can_view** | boolean | ✓ | true |  |
| 8 | **can_edit** | boolean | ✓ | false |  |
| 9 | **can_export** | boolean | ✓ | true |  |
| 10 | **can_reshare** | boolean | ✓ | false |  |
| 11 | **shared_by** | uuid | ✓ |  | → user_profiles.id |
| 12 | **shared_at** | timestamptz | ✓ | now() |  |
| 13 | **expires_at** | timestamptz | ✓ |  |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_share_type`

---

## `report_templates` — 34 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **code** | varchar(50) | ✓ |  |  |
| 5 | **name_ar** | varchar(255) | ✗ |  |  |
| 6 | **name_en** | varchar(255) | ✓ |  |  |
| 7 | **description** | text | ✓ |  |  |
| 8 | **category** | varchar(50) | ✓ | 'custom'::character varying |  |
| 9 | **sub_category** | varchar(50) | ✓ |  |  |
| 10 | **source_table** | varchar(100) | ✗ |  |  |
| 11 | **source_schema** | varchar(50) | ✓ | 'public'::character varying |  |
| 12 | **joins** | jsonb | ✓ | '[]'::jsonb |  |
| 13 | **columns** | jsonb | ✗ |  |  |
| 14 | **default_filters** | jsonb | ✓ | '[]'::jsonb |  |
| 15 | **dynamic_filters** | jsonb | ✓ | '[]'::jsonb |  |
| 16 | **group_by** | jsonb | ✓ | '[]'::jsonb |  |
| 17 | **having_clause** | jsonb | ✓ |  |  |
| 18 | **order_by** | jsonb | ✓ | '[]'::jsonb |  |
| 19 | **layout** | varchar(20) | ✓ | 'table'::character varying |  |
| 20 | **chart_config** | jsonb | ✓ |  |  |
| 21 | **page_size** | integer | ✓ | 50 |  |
| 22 | **show_totals** | boolean | ✓ | true |  |
| 23 | **show_row_numbers** | boolean | ✓ | false |  |
| 24 | **export_formats** | jsonb | ✓ | '["excel", "pdf", "csv"]'::... |  |
| 25 | **is_system** | boolean | ✓ | false |  |
| 26 | **is_public** | boolean | ✓ | false |  |
| 27 | **is_favorite** | boolean | ✓ | false |  |
| 28 | **is_active** | boolean | ✓ | true |  |
| 29 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 30 | **created_at** | timestamptz | ✓ | now() |  |
| 31 | **updated_by** | uuid | ✓ |  | → user_profiles.id |
| 32 | **updated_at** | timestamptz | ✓ | now() |  |
| 33 | **last_used_at** | timestamptz | ✓ |  |  |
| 34 | **use_count** | integer | ✓ | 0 |  |

---

## `reservation_items` — 17 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **reservation_id** | uuid | ✗ |  | → reservations.id |
| 4 | **line_number** | integer | ✓ | 1 |  |
| 5 | **item_type** | varchar(30) | ✓ | 'product'::character varying |  |
| 6 | **product_id** | uuid | ✓ |  |  |
| 7 | **description** | text | ✗ |  |  |
| 8 | **quantity** | numeric | ✗ | 1 |  |
| 9 | **unit** | varchar(50) | ✓ |  |  |
| 10 | **unit_price** | numeric | ✗ | 0 |  |
| 11 | **subtotal** | numeric | ✗ | 0 |  |
| 12 | **reserved_from** | date | ✓ |  |  |
| 13 | **reserved_to** | date | ✓ |  |  |
| 14 | **status** | varchar(20) | ✓ | 'reserved'::character varying |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `reservations` — 42 عمود
**UNIQUE:** tenant_id, company_id, reservation_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **reservation_number** | varchar(50) | ✗ |  |  |
| 6 | **reservation_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **reservation_type** | varchar(30) | ✗ | 'general'::character varying |  |
| 8 | **account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 9 | **party_type** | varchar(20) | ✓ | 'customer'::character varying |  |
| 10 | **party_id** | uuid | ✓ |  |  |
| 11 | **party_name** | varchar(200) | ✓ |  |  |
| 12 | **customer_id** | uuid | ✓ |  |  |
| 13 | **contact_phone** | varchar(50) | ✓ |  |  |
| 14 | **contact_email** | varchar(200) | ✓ |  |  |
| 15 | **start_date** | date | ✓ |  |  |
| 16 | **end_date** | date | ✓ |  |  |
| 17 | **start_time** | time without time zone | ✓ |  |  |
| 18 | **end_time** | time without time zone | ✓ |  |  |
| 19 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 20 | **exchange_rate** | numeric | ✓ | 1 |  |
| 21 | **estimated_amount** | numeric | ✓ | 0 |  |
| 22 | **deposit_amount** | numeric | ✓ | 0 |  |
| 23 | **deposit_paid** | numeric | ✓ | 0 |  |
| 24 | **final_amount** | numeric | ✓ | 0 |  |
| 25 | **debit_amount** | numeric | ✓ | 0 |  |
| 26 | **credit_amount** | numeric | ✓ | 0 |  |
| 27 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 28 | **invoice_id** | uuid | ✓ |  | → account_invoices.id |
| 29 | **converted_to_invoice** | boolean | ✓ | false |  |
| 30 | **converted_at** | timestamptz | ✓ |  |  |
| 31 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 32 | **is_posted** | boolean | ✓ | false |  |
| 33 | **description** | text | ✓ |  |  |
| 34 | **notes** | text | ✓ |  |  |
| 35 | **internal_notes** | text | ✓ |  |  |
| 36 | **metadata** | jsonb | ✓ | '{}'::jsonb |  |
| 37 | **cancelled_at** | timestamptz | ✓ |  |  |
| 38 | **cancelled_by** | uuid | ✓ |  |  |
| 39 | **cancel_reason** | text | ✓ |  |  |
| 40 | **created_by** | uuid | ✓ |  |  |
| 41 | **created_at** | timestamptz | ✓ | now() |  |
| 42 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `saved_reports` — 21 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **template_id** | uuid | ✗ |  | → report_templates.id |
| 4 | **name_ar** | varchar(255) | ✓ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **description** | text | ✓ |  |  |
| 7 | **parameters** | jsonb | ✓ |  |  |
| 8 | **result_count** | integer | ✓ |  |  |
| 9 | **result_summary** | jsonb | ✓ |  |  |
| 10 | **output_format** | varchar(20) | ✓ |  |  |
| 11 | **file_path** | text | ✓ |  |  |
| 12 | **file_size** | bigint | ✓ |  |  |
| 13 | **is_scheduled** | boolean | ✓ | false |  |
| 14 | **schedule_cron** | varchar(100) | ✓ |  |  |
| 15 | **schedule_recipients** | ARRAY | ✓ |  |  |
| 16 | **last_scheduled_at** | timestamptz | ✓ |  |  |
| 17 | **next_scheduled_at** | timestamptz | ✓ |  |  |
| 18 | **generated_by** | uuid | ✓ |  | → user_profiles.id |
| 19 | **generated_at** | timestamptz | ✓ | now() |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `tax_payment_schedules` — 18 عمود
**CHECK:** 2 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **tax_type** | varchar(50) | ✗ |  |  |
| 5 | **tax_name_ar** | varchar(200) | ✓ |  |  |
| 6 | **tax_name_en** | varchar(200) | ✓ |  |  |
| 7 | **frequency** | varchar(20) | ✗ |  |  |
| 8 | **payment_day** | integer | ✓ |  |  |
| 9 | **tax_rate** | numeric | ✓ |  |  |
| 10 | **expense_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 11 | **liability_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 12 | **country_code** | varchar(2) | ✓ | 'UA'::character varying |  |
| 13 | **fop_group** | varchar(20) | ✓ |  |  |
| 14 | **is_active** | boolean | ✓ | true |  |
| 15 | **effective_from** | date | ✓ |  |  |
| 16 | **effective_to** | date | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `valid_payment_day`
- `valid_frequency`

---

## `tax_rates` — 14 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(100) | ✗ |  |  |
| 6 | **name_en** | varchar(100) | ✓ |  |  |
| 7 | **rate** | numeric | ✗ |  |  |
| 8 | **tax_type** | varchar(20) | ✓ | 'vat'::character varying |  |
| 9 | **sales_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 10 | **purchase_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 11 | **is_default** | boolean | ✓ | false |  |
| 12 | **is_active** | boolean | ✓ | true |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Treasury — الخزينة والصناديق
# ════════════════════════════════════════════════════════════

## `cash_accounts` — 20 عمود
**UNIQUE:** tenant_id, company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **code** | varchar(50) | ✗ |  |  |
| 6 | **name_ar** | varchar(200) | ✗ |  |  |
| 7 | **name_en** | varchar(200) | ✓ |  |  |
| 8 | **account_type** | varchar(20) | ✗ |  |  |
| 9 | **gl_account_id** | uuid | ✗ |  | → chart_of_accounts.id |
| 10 | **bank_name** | varchar(200) | ✓ |  |  |
| 11 | **bank_branch** | varchar(200) | ✓ |  |  |
| 12 | **account_number** | varchar(100) | ✓ |  |  |
| 13 | **iban** | varchar(50) | ✓ |  |  |
| 14 | **swift_code** | varchar(20) | ✓ |  |  |
| 15 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 16 | **current_balance** | numeric | ✓ | 0 |  |
| 17 | **custodian_id** | uuid | ✓ |  |  |
| 18 | **is_active** | boolean | ✓ | true |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `cash_transactions` — 28 عمود
**UNIQUE:** tenant_id, transaction_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **transaction_number** | varchar(50) | ✗ |  |  |
| 6 | **transaction_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **transaction_type** | varchar(20) | ✗ |  |  |
| 8 | **cash_account_id** | uuid | ✗ |  | → cash_accounts.id |
| 9 | **to_cash_account_id** | uuid | ✓ |  | → cash_accounts.id |
| 10 | **amount** | numeric | ✗ |  |  |
| 11 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 12 | **exchange_rate** | numeric | ✓ | 1 |  |
| 13 | **party_type** | varchar(20) | ✓ |  |  |
| 14 | **party_id** | uuid | ✓ |  |  |
| 15 | **party_name** | varchar(200) | ✓ |  |  |
| 16 | **contra_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 17 | **payment_method** | varchar(50) | ✓ |  |  |
| 18 | **check_number** | varchar(50) | ✓ |  |  |
| 19 | **check_date** | date | ✓ |  |  |
| 20 | **reference_type** | varchar(50) | ✓ |  |  |
| 21 | **reference_id** | uuid | ✓ |  |  |
| 22 | **reference_number** | varchar(100) | ✓ |  |  |
| 23 | **description** | text | ✓ |  |  |
| 24 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 25 | **status** | varchar(20) | ✓ | 'confirmed'::character varying |  |
| 26 | **created_by** | uuid | ✓ |  |  |
| 27 | **created_at** | timestamptz | ✓ | now() |  |
| 28 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `correspondents` — 15 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **code** | varchar(20) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **country_code** | varchar(3) | ✓ |  |  |
| 7 | **phone** | varchar(50) | ✓ |  |  |
| 8 | **email** | varchar(255) | ✓ |  |  |
| 9 | **address** | text | ✓ |  |  |
| 10 | **account_id** | uuid | ✓ |  | → accounts.id |
| 11 | **commission_rate** | numeric | ✓ | 0 |  |
| 12 | **is_active** | boolean | ✓ | true |  |
| 13 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `currency_exchanges` — 22 عمود
**UNIQUE:** company_id, exchange_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **branch_id** | uuid | ✓ |  | → branches.id |
| 4 | **exchange_number** | varchar(50) | ✗ |  |  |
| 5 | **exchange_date** | date | ✗ |  |  |
| 6 | **customer_name** | varchar(255) | ✓ |  |  |
| 7 | **customer_phone** | varchar(50) | ✓ |  |  |
| 8 | **customer_id_number** | varchar(50) | ✓ |  |  |
| 9 | **from_currency** | varchar(3) | ✗ |  |  |
| 10 | **from_amount** | numeric | ✗ |  |  |
| 11 | **to_currency** | varchar(3) | ✗ |  |  |
| 12 | **to_amount** | numeric | ✗ |  |  |
| 13 | **exchange_rate** | numeric | ✗ |  |  |
| 14 | **from_fund_id** | uuid | ✓ |  | → funds.id |
| 15 | **to_fund_id** | uuid | ✓ |  | → funds.id |
| 16 | **profit** | numeric | ✓ | 0 |  |
| 17 | **status** | varchar(20) | ✓ | 'completed'::character varying |  |
| 18 | **journal_entry_id** | uuid | ✓ |  |  |
| 19 | **created_by** | uuid | ✗ |  |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `funds` — 20 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **branch_id** | uuid | ✓ |  | → branches.id |
| 4 | **code** | varchar(20) | ✗ |  |  |
| 5 | **name** | varchar(255) | ✗ |  |  |
| 6 | **name_en** | varchar(255) | ✓ |  |  |
| 7 | **fund_type** | varchar(20) | ✗ |  |  |
| 8 | **account_id** | uuid | ✓ |  | → accounts.id |
| 9 | **currency_code** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 10 | **bank_name** | varchar(255) | ✓ |  |  |
| 11 | **bank_account_number** | varchar(50) | ✓ |  |  |
| 12 | **iban** | varchar(50) | ✓ |  |  |
| 13 | **swift_code** | varchar(20) | ✓ |  |  |
| 14 | **wallet_type** | varchar(50) | ✓ |  |  |
| 15 | **wallet_id** | varchar(100) | ✓ |  |  |
| 16 | **current_balance** | numeric | ✓ | 0 |  |
| 17 | **is_active** | boolean | ✓ | true |  |
| 18 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `payment_receipts` — 18 عمود
**UNIQUE:** tenant_id, company_id, receipt_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **receipt_number** | varchar(50) | ✗ |  |  |
| 6 | **receipt_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **customer_id** | uuid | ✓ |  |  |
| 8 | **customer_name** | varchar(200) | ✓ |  |  |
| 9 | **amount** | numeric | ✗ |  |  |
| 10 | **payment_method** | varchar(50) | ✓ | 'cash'::character varying |  |
| 11 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 12 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 13 | **exchange_rate** | numeric | ✓ | 1 |  |
| 14 | **journal_entry_id** | uuid | ✓ |  |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **created_by** | uuid | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `payment_vouchers` — 24 عمود
**UNIQUE:** tenant_id, company_id, voucher_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **voucher_number** | varchar(50) | ✗ |  |  |
| 6 | **voucher_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **supplier_id** | uuid | ✓ |  | → suppliers.id |
| 8 | **supplier_name** | varchar(200) | ✓ |  |  |
| 9 | **amount** | numeric | ✗ |  |  |
| 10 | **payment_method** | varchar(50) | ✓ | 'cash'::character varying |  |
| 11 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 12 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 13 | **exchange_rate** | numeric | ✓ | 1 |  |
| 14 | **journal_entry_id** | uuid | ✓ |  |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **created_by** | uuid | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |
| 19 | **shipment_id** | uuid | ✓ |  | → shipments.id |
| 20 | **purchase_invoice_id** | uuid | ✓ |  | → purchase_invoices.id |
| 21 | **payment_number** | varchar(50) | ✓ |  |  |
| 22 | **customer_id** | uuid | ✓ |  | → customers.id |
| 23 | **sales_invoice_id** | uuid | ✓ |  | → sales_invoices.id |
| 24 | **type** | varchar(20) | ✓ | 'payment'::character varying |  |

---

## `remittances` — 43 عمود
**UNIQUE:** company_id, remittance_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **branch_id** | uuid | ✓ |  | → branches.id |
| 4 | **remittance_number** | varchar(50) | ✗ |  |  |
| 5 | **remittance_type** | varchar(20) | ✗ |  |  |
| 6 | **sender_name** | varchar(255) | ✗ |  |  |
| 7 | **sender_phone** | varchar(50) | ✓ |  |  |
| 8 | **sender_id_type** | varchar(50) | ✓ |  |  |
| 9 | **sender_id_number** | varchar(50) | ✓ |  |  |
| 10 | **sender_country** | varchar(3) | ✓ |  |  |
| 11 | **sender_address** | text | ✓ |  |  |
| 12 | **receiver_name** | varchar(255) | ✗ |  |  |
| 13 | **receiver_phone** | varchar(50) | ✓ |  |  |
| 14 | **receiver_country** | varchar(3) | ✗ |  |  |
| 15 | **receiver_city** | varchar(100) | ✓ |  |  |
| 16 | **receiver_address** | text | ✓ |  |  |
| 17 | **receiver_bank_name** | varchar(255) | ✓ |  |  |
| 18 | **receiver_bank_branch** | varchar(255) | ✓ |  |  |
| 19 | **receiver_bank_account** | varchar(50) | ✓ |  |  |
| 20 | **receiver_iban** | varchar(50) | ✓ |  |  |
| 21 | **receiver_swift** | varchar(20) | ✓ |  |  |
| 22 | **send_amount** | numeric | ✗ |  |  |
| 23 | **send_currency** | varchar(3) | ✗ |  |  |
| 24 | **receive_amount** | numeric | ✗ |  |  |
| 25 | **receive_currency** | varchar(3) | ✗ |  |  |
| 26 | **exchange_rate** | numeric | ✗ |  |  |
| 27 | **commission** | numeric | ✓ | 0 |  |
| 28 | **transfer_fee** | numeric | ✓ | 0 |  |
| 29 | **total_fees** | numeric | ✓ |  |  |
| 30 | **total_from_customer** | numeric | ✓ |  |  |
| 31 | **correspondent_id** | uuid | ✓ |  | → correspondents.id |
| 32 | **correspondent_reference** | varchar(100) | ✓ |  |  |
| 33 | **fund_id** | uuid | ✓ |  | → funds.id |
| 34 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 35 | **created_at** | timestamptz | ✓ | now() |  |
| 36 | **processed_at** | timestamptz | ✓ |  |  |
| 37 | **completed_at** | timestamptz | ✓ |  |  |
| 38 | **journal_entry_id** | uuid | ✓ |  |  |
| 39 | **agent_id** | uuid | ✓ |  |  |
| 40 | **remarks** | text | ✓ |  |  |
| 41 | **created_by** | uuid | ✗ |  |  |
| 42 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 43 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Suppliers — الموردون
# ════════════════════════════════════════════════════════════

## `supplier_groups` — 18 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **name_ru** | varchar(100) | ✓ |  |  |
| 7 | **name_uk** | varchar(100) | ✓ |  |  |
| 8 | **name_ro** | varchar(100) | ✓ |  |  |
| 9 | **name_pl** | varchar(100) | ✓ |  |  |
| 10 | **name_tr** | varchar(100) | ✓ |  |  |
| 11 | **name_de** | varchar(100) | ✓ |  |  |
| 12 | **name_it** | varchar(100) | ✓ |  |  |
| 13 | **parent_id** | uuid | ✓ |  | → supplier_groups.id |
| 14 | **payment_terms_days** | integer | ✓ | 0 |  |
| 15 | **description** | text | ✓ |  |  |
| 16 | **is_active** | boolean | ✓ | true |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `suppliers` — 33 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **supplier_type** | varchar(20) | ✓ | 'company'::character varying |  |
| 6 | **name_ar** | varchar(200) | ✗ |  |  |
| 7 | **name_en** | varchar(200) | ✓ |  |  |
| 8 | **name_ru** | varchar(200) | ✓ |  |  |
| 9 | **name_uk** | varchar(200) | ✓ |  |  |
| 10 | **name_ro** | varchar(200) | ✓ |  |  |
| 11 | **name_pl** | varchar(200) | ✓ |  |  |
| 12 | **name_tr** | varchar(200) | ✓ |  |  |
| 13 | **name_de** | varchar(200) | ✓ |  |  |
| 14 | **name_it** | varchar(200) | ✓ |  |  |
| 15 | **company_name** | varchar(200) | ✓ |  |  |
| 16 | **tax_number** | varchar(100) | ✓ |  |  |
| 17 | **email** | varchar(200) | ✓ |  |  |
| 18 | **phone** | varchar(50) | ✓ |  |  |
| 19 | **mobile** | varchar(50) | ✓ |  |  |
| 20 | **country** | varchar(100) | ✓ |  |  |
| 21 | **city** | varchar(100) | ✓ |  |  |
| 22 | **address** | text | ✓ |  |  |
| 23 | **group_id** | uuid | ✓ |  | → supplier_groups.id |
| 24 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 25 | **payment_terms_days** | integer | ✓ | 0 |  |
| 26 | **balance** | numeric | ✓ | 0 |  |
| 27 | **payable_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 28 | **notes** | text | ✓ |  |  |
| 29 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 30 | **created_at** | timestamptz | ✓ | now() |  |
| 31 | **updated_at** | timestamptz | ✓ | now() |  |
| 32 | **vendor_category** | varchar(30) | ✓ | 'goods_supplier'::character... |  |
| 33 | **vendor_category_id** | uuid | ✓ |  |  |

---

# ════════════════════════════════════════════════════════════
# Customers — العملاء
# ════════════════════════════════════════════════════════════

## `customer_addresses` — 19 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **customer_id** | uuid | ✗ |  | → customers.id |
| 4 | **address_type** | varchar(20) | ✓ | 'shipping'::character varying |  |
| 5 | **label** | varchar(100) | ✓ |  |  |
| 6 | **recipient_name** | varchar(200) | ✓ |  |  |
| 7 | **phone** | varchar(50) | ✓ |  |  |
| 8 | **country** | varchar(100) | ✓ |  |  |
| 9 | **city** | varchar(100) | ✓ |  |  |
| 10 | **district** | varchar(100) | ✓ |  |  |
| 11 | **street** | varchar(200) | ✓ |  |  |
| 12 | **building** | varchar(100) | ✓ |  |  |
| 13 | **floor** | varchar(20) | ✓ |  |  |
| 14 | **apartment** | varchar(20) | ✓ |  |  |
| 15 | **postal_code** | varchar(20) | ✓ |  |  |
| 16 | **latitude** | numeric | ✓ |  |  |
| 17 | **longitude** | numeric | ✓ |  |  |
| 18 | **is_default** | boolean | ✓ | false |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |

---

## `customer_groups` — 22 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **name_ru** | varchar(100) | ✓ |  |  |
| 7 | **name_uk** | varchar(100) | ✓ |  |  |
| 8 | **name_ro** | varchar(100) | ✓ |  |  |
| 9 | **name_pl** | varchar(100) | ✓ |  |  |
| 10 | **name_tr** | varchar(100) | ✓ |  |  |
| 11 | **name_de** | varchar(100) | ✓ |  |  |
| 12 | **name_it** | varchar(100) | ✓ |  |  |
| 13 | **parent_id** | uuid | ✓ |  | → customer_groups.id |
| 14 | **discount_percent** | numeric | ✓ | 0 |  |
| 15 | **credit_limit** | numeric | ✓ | 0 |  |
| 16 | **payment_terms_days** | integer | ✓ | 0 |  |
| 17 | **description** | text | ✓ |  |  |
| 18 | **is_active** | boolean | ✓ | true |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **company_id** | uuid | ✓ |  | → companies.id |
| 21 | **name** | varchar(200) | ✓ |  |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `customers` — 38 عمود
**UNIQUE:** auth_user_id | tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **customer_type** | varchar(20) | ✓ | 'individual'::character var... |  |
| 6 | **name_ar** | varchar(200) | ✗ |  |  |
| 7 | **name_en** | varchar(200) | ✓ |  |  |
| 8 | **name_ru** | varchar(200) | ✓ |  |  |
| 9 | **name_uk** | varchar(200) | ✓ |  |  |
| 10 | **name_ro** | varchar(200) | ✓ |  |  |
| 11 | **name_pl** | varchar(200) | ✓ |  |  |
| 12 | **name_tr** | varchar(200) | ✓ |  |  |
| 13 | **name_de** | varchar(200) | ✓ |  |  |
| 14 | **name_it** | varchar(200) | ✓ |  |  |
| 15 | **company_name** | varchar(200) | ✓ |  |  |
| 16 | **tax_number** | varchar(100) | ✓ |  |  |
| 17 | **email** | varchar(200) | ✓ |  |  |
| 18 | **phone** | varchar(50) | ✓ |  |  |
| 19 | **mobile** | varchar(50) | ✓ |  |  |
| 20 | **country** | varchar(100) | ✓ |  |  |
| 21 | **city** | varchar(100) | ✓ |  |  |
| 22 | **address** | text | ✓ |  |  |
| 23 | **group_id** | uuid | ✓ |  | → customer_groups.id |
| 24 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 25 | **credit_limit** | numeric | ✓ | 0 |  |
| 26 | **payment_terms_days** | integer | ✓ | 0 |  |
| 27 | **balance** | numeric | ✓ | 0 |  |
| 28 | **receivable_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 29 | **notes** | text | ✓ |  |  |
| 30 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 31 | **created_at** | timestamptz | ✓ | now() |  |
| 32 | **updated_at** | timestamptz | ✓ | now() |  |
| 33 | **auth_user_id** | uuid | ✓ |  |  |
| 34 | **price_list_id** | uuid | ✓ |  | → price_lists.id |
| 35 | **telegram_username** | varchar(100) | ✓ |  |  |
| 36 | **telegram_chat_id** | bigint | ✓ |  |  |
| 37 | **preferred_language** | varchar(10) | ✓ | 'ar'::character varying |  |
| 38 | **last_interaction_at** | timestamptz | ✓ |  |  |

---

# ════════════════════════════════════════════════════════════
# Products & UOM — المنتجات ووحدات القياس
# ════════════════════════════════════════════════════════════

## `batches` — 13 عمود
**UNIQUE:** company_id, batch_number, product_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **batch_number** | varchar(50) | ✗ |  |  |
| 4 | **product_id** | uuid | ✓ |  | → products.id |
| 5 | **manufacturing_date** | date | ✓ |  |  |
| 6 | **expiry_date** | date | ✓ |  |  |
| 7 | **supplier_id** | uuid | ✓ |  |  |
| 8 | **container_id** | uuid | ✓ |  |  |
| 9 | **cost_per_unit** | numeric | ✓ |  |  |
| 10 | **remarks** | text | ✓ |  |  |
| 11 | **tenant_id** | uuid | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `currencies` — 23 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **code** | varchar(3) | ✗ |  |  |
| 3 | **name** | varchar(100) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✓ |  |  |
| 5 | **symbol** | varchar(10) | ✓ |  |  |
| 6 | **decimal_places** | integer | ✓ | 2 |  |
| 7 | **is_active** | boolean | ✓ | true |  |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 10 | **name_en** | varchar(100) | ✓ |  |  |
| 11 | **symbol_position** | varchar(10) | ✓ | 'before'::character varying |  |
| 12 | **thousands_separator** | varchar(1) | ✓ | ','::character varying |  |
| 13 | **decimal_separator** | varchar(1) | ✓ | '.'::character varying |  |
| 14 | **is_base** | boolean | ✓ | false |  |
| 15 | **exchange_rate** | numeric | ✓ | 1 |  |
| 16 | **name_de** | varchar(100) | ✓ |  |  |
| 17 | **name_tr** | varchar(100) | ✓ |  |  |
| 18 | **name_ru** | varchar(100) | ✓ |  |  |
| 19 | **name_uk** | varchar(100) | ✓ |  |  |
| 20 | **name_it** | varchar(100) | ✓ |  |  |
| 21 | **name_pl** | varchar(100) | ✓ |  |  |
| 22 | **name_ro** | varchar(100) | ✓ |  |  |
| 23 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `price_list_items` — 11 عمود
**UNIQUE:** price_list_id, product_id, min_quantity

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **price_list_id** | uuid | ✗ |  | → price_lists.id |
| 5 | **product_id** | uuid | ✗ |  | → products.id |
| 6 | **price** | numeric | ✗ |  |  |
| 7 | **discount_percentage** | numeric | ✓ | 0 |  |
| 8 | **min_quantity** | numeric | ✓ | 1 |  |
| 9 | **max_quantity** | numeric | ✓ |  |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `price_lists` — 22 عمود
**UNIQUE:** tenant_id, company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **name** | varchar(200) | ✗ |  |  |
| 6 | **description** | text | ✓ |  |  |
| 7 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 8 | **is_active** | boolean | ✓ | true |  |
| 9 | **valid_from** | timestamptz | ✓ |  |  |
| 10 | **valid_to** | timestamptz | ✓ |  |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |
| 13 | **created_by** | uuid | ✓ |  |  |
| 14 | **updated_by** | uuid | ✓ |  |  |
| 15 | **name_ar** | varchar(200) | ✓ |  |  |
| 16 | **name_de** | varchar(200) | ✓ |  |  |
| 17 | **name_tr** | varchar(200) | ✓ |  |  |
| 18 | **name_ru** | varchar(200) | ✓ |  |  |
| 19 | **name_uk** | varchar(200) | ✓ |  |  |
| 20 | **name_it** | varchar(200) | ✓ |  |  |
| 21 | **name_pl** | varchar(200) | ✓ |  |  |
| 22 | **name_ro** | varchar(200) | ✓ |  |  |

---

## `product_categories` — 16 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **parent_id** | uuid | ✓ |  | → product_categories.id |
| 7 | **category_type** | varchar(50) | ✓ |  |  |
| 8 | **default_income_account_id** | uuid | ✓ |  | → accounts.id |
| 9 | **default_expense_account_id** | uuid | ✓ |  | → accounts.id |
| 10 | **default_inventory_account_id** | uuid | ✓ |  | → accounts.id |
| 11 | **is_active** | boolean | ✓ | true |  |
| 12 | **is_visible_online** | boolean | ✓ | true |  |
| 13 | **display_order** | integer | ✓ | 0 |  |
| 14 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `product_customer_access` — 13 عمود
**UNIQUE:** tenant_id, product_id, customer_group_id | tenant_id, product_id, customer_id
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **product_id** | uuid | ✗ |  | → products.id |
| 4 | **customer_id** | uuid | ✓ |  | → customers.id |
| 5 | **customer_group_id** | uuid | ✓ |  | → customer_groups.id |
| 6 | **access_type** | varchar(20) | ✓ | 'allow'::character varying |  |
| 7 | **notes** | text | ✓ |  |  |
| 8 | **valid_from** | date | ✓ |  |  |
| 9 | **valid_to** | date | ✓ |  |  |
| 10 | **is_active** | boolean | ✓ | true |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **created_by** | uuid | ✓ |  |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `product_customer_access_check`

---

## `product_review_stats` — 14 عمود
**UNIQUE:** tenant_id, product_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **product_id** | uuid | ✗ |  | → products.id |
| 4 | **total_reviews** | integer | ✓ | 0 |  |
| 5 | **average_rating** | numeric | ✓ | 0 |  |
| 6 | **rating_5_count** | integer | ✓ | 0 |  |
| 7 | **rating_4_count** | integer | ✓ | 0 |  |
| 8 | **rating_3_count** | integer | ✓ | 0 |  |
| 9 | **rating_2_count** | integer | ✓ | 0 |  |
| 10 | **rating_1_count** | integer | ✓ | 0 |  |
| 11 | **verified_reviews_count** | integer | ✓ | 0 |  |
| 12 | **verified_average_rating** | numeric | ✓ | 0 |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |

---

## `product_reviews` — 22 عمود
**UNIQUE:** tenant_id, product_id, customer_id, order_id
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **product_id** | uuid | ✗ |  | → products.id |
| 5 | **customer_id** | uuid | ✓ |  | → customers.id |
| 6 | **order_id** | uuid | ✓ |  | → orders.id |
| 7 | **rating** | integer | ✗ |  |  |
| 8 | **title** | varchar(200) | ✗ |  |  |
| 9 | **review_text** | text | ✗ |  |  |
| 10 | **images** | jsonb | ✓ | '[]'::jsonb |  |
| 11 | **status** | varchar(50) | ✓ | 'pending'::character varying |  |
| 12 | **is_verified_purchase** | boolean | ✓ | false |  |
| 13 | **helpful_count** | integer | ✓ | 0 |  |
| 14 | **not_helpful_count** | integer | ✓ | 0 |  |
| 15 | **seller_response** | text | ✓ |  |  |
| 16 | **seller_response_at** | timestamptz | ✓ |  |  |
| 17 | **is_reported** | boolean | ✓ | false |  |
| 18 | **report_reason** | text | ✓ |  |  |
| 19 | **reported_at** | timestamptz | ✓ |  |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |
| 22 | **approved_at** | timestamptz | ✓ |  |  |

**CHECK Constraints:**
- `product_reviews_rating_check`

---

## `product_uom_conversions` — 9 عمود
**UNIQUE:** product_id, from_uom, to_uom

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **product_id** | uuid | ✓ |  | → products.id |
| 3 | **from_uom** | varchar(20) | ✗ |  |  |
| 4 | **to_uom** | varchar(20) | ✗ |  |  |
| 5 | **conversion_factor** | numeric | ✗ |  |  |
| 6 | **is_informational** | boolean | ✓ | false |  |
| 7 | **tenant_id** | uuid | ✓ |  |  |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `product_variants` — 6 عمود
**UNIQUE:** tenant_id, sku

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **product_id** | uuid | ✗ |  | → products.id |
| 4 | **sku** | varchar(100) | ✗ |  |  |
| 5 | **name_ar** | varchar(300) | ✓ |  |  |
| 6 | **created_at** | timestamptz | ✓ | now() |  |

---

## `products` — 52 عمود
**UNIQUE:** company_id, sku

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **sku** | varchar(50) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **category_id** | uuid | ✓ |  | → product_categories.id |
| 7 | **product_type** | varchar(50) | ✗ | 'standard'::character varying |  |
| 8 | **base_uom** | varchar(20) | ✗ | 'PCS'::character varying |  |
| 9 | **cost_price** | numeric | ✓ | 0 |  |
| 10 | **selling_price** | numeric | ✓ | 0 |  |
| 11 | **currency_code** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 12 | **track_serial** | boolean | ✓ | false |  |
| 13 | **track_batch** | boolean | ✓ | false |  |
| 14 | **track_expiry** | boolean | ✓ | false |  |
| 15 | **is_fabric** | boolean | ✓ | false |  |
| 16 | **fabric_width** | numeric | ✓ |  |  |
| 17 | **fabric_weight_per_meter** | numeric | ✓ |  |  |
| 18 | **is_gold** | boolean | ✓ | false |  |
| 19 | **gold_karat** | integer | ✓ |  |  |
| 20 | **gold_weight_grams** | numeric | ✓ |  |  |
| 21 | **making_charge_type** | varchar(20) | ✓ |  |  |
| 22 | **making_charge** | numeric | ✓ |  |  |
| 23 | **attributes** | jsonb | ✓ | '{}'::jsonb |  |
| 24 | **income_account_id** | uuid | ✓ |  | → accounts.id |
| 25 | **expense_account_id** | uuid | ✓ |  | → accounts.id |
| 26 | **inventory_account_id** | uuid | ✓ |  | → accounts.id |
| 27 | **reorder_level** | numeric | ✓ | 0 |  |
| 28 | **minimum_stock** | numeric | ✓ | 0 |  |
| 29 | **maximum_stock** | numeric | ✓ |  |  |
| 30 | **is_active** | boolean | ✓ | true |  |
| 31 | **is_sellable** | boolean | ✓ | true |  |
| 32 | **is_purchasable** | boolean | ✓ | true |  |
| 33 | **created_at** | timestamptz | ✓ | now() |  |
| 34 | **updated_at** | timestamptz | ✓ | now() |  |
| 35 | **is_visible_online** | boolean | ✓ | true |  |
| 36 | **is_featured** | boolean | ✓ | false |  |
| 37 | **images** | jsonb | ✓ | '[]'::jsonb |  |
| 38 | **barcode** | varchar(100) | ✓ |  |  |
| 39 | **slug** | varchar(200) | ✓ |  |  |
| 40 | **default_price** | numeric | ✓ | 0 |  |
| 41 | **status** | varchar(50) | ✓ | 'active'::character varying |  |
| 42 | **brand_id** | uuid | ✓ |  |  |
| 43 | **name_ar** | varchar(200) | ✓ |  |  |
| 44 | **name_de** | varchar(200) | ✓ |  |  |
| 45 | **name_tr** | varchar(200) | ✓ |  |  |
| 46 | **name_ru** | varchar(200) | ✓ |  |  |
| 47 | **name_uk** | varchar(200) | ✓ |  |  |
| 48 | **name_it** | varchar(200) | ✓ |  |  |
| 49 | **name_pl** | varchar(200) | ✓ |  |  |
| 50 | **name_ro** | varchar(200) | ✓ |  |  |
| 51 | **description** | text | ✓ |  |  |
| 52 | **tenant_id** | uuid | ✗ |  | → tenants.id |

---

## `units_of_measure` — 10 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **type** | varchar(20) | ✓ | 'count'::character varying |  |
| 7 | **base_unit_id** | uuid | ✓ |  | → units_of_measure.id |
| 8 | **conversion_factor** | numeric | ✓ | 1 |  |
| 9 | **is_active** | boolean | ✓ | true |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |

---

## `uom` — 9 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **code** | varchar(20) | ✗ |  |  |
| 3 | **name** | varchar(100) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✓ |  |  |
| 5 | **uom_type** | varchar(20) | ✓ |  |  |
| 6 | **is_active** | boolean | ✓ | true |  |
| 7 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Sales — المبيعات
# ════════════════════════════════════════════════════════════

## `delivery_note_items` — 25 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **delivery_note_id** | uuid | ✗ |  | → delivery_notes.id |
| 4 | **line_number** | integer | ✓ | 1 |  |
| 5 | **sales_order_item_id** | uuid | ✓ |  |  |
| 6 | **product_id** | uuid | ✓ |  |  |
| 7 | **variant_id** | uuid | ✓ |  |  |
| 8 | **material_id** | uuid | ✓ |  |  |
| 9 | **color_id** | uuid | ✓ |  |  |
| 10 | **roll_id** | uuid | ✓ |  |  |
| 11 | **description** | text | ✓ |  |  |
| 12 | **quantity_ordered** | numeric | ✗ |  |  |
| 13 | **quantity_to_deliver** | numeric | ✗ |  |  |
| 14 | **quantity_delivered** | numeric | ✓ | 0 |  |
| 15 | **unit_id** | uuid | ✓ |  |  |
| 16 | **batch_id** | uuid | ✓ |  |  |
| 17 | **dye_lot** | varchar(100) | ✓ |  |  |
| 18 | **shade** | varchar(20) | ✓ |  |  |
| 19 | **warehouse_id** | uuid | ✓ |  |  |
| 20 | **location_id** | uuid | ✓ |  |  |
| 21 | **unit_cost** | numeric | ✓ | 0 |  |
| 22 | **line_total** | numeric | ✓ | 0 |  |
| 23 | **notes** | text | ✓ |  |  |
| 24 | **created_at** | timestamptz | ✓ | now() |  |
| 25 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `delivery_notes` — 42 عمود
**UNIQUE:** tenant_id, note_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  |  |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **note_number** | varchar(50) | ✗ |  |  |
| 6 | **note_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **sales_order_id** | uuid | ✓ |  |  |
| 8 | **customer_id** | uuid | ✗ |  |  |
| 9 | **customer_name** | varchar(200) | ✓ |  |  |
| 10 | **customer_phone** | varchar(50) | ✓ |  |  |
| 11 | **warehouse_id** | uuid | ✗ |  |  |
| 12 | **delivery_method** | varchar(30) | ✗ | 'to_store'::character varying |  |
| 13 | **delivery_address** | text | ✓ |  |  |
| 14 | **city** | varchar(100) | ✓ |  |  |
| 15 | **region** | varchar(100) | ✓ |  |  |
| 16 | **driver_id** | uuid | ✓ |  |  |
| 17 | **driver_name** | varchar(200) | ✓ |  |  |
| 18 | **vehicle_number** | varchar(50) | ✓ |  |  |
| 19 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 20 | **requires_approval** | boolean | ✓ | true |  |
| 21 | **approved_by** | uuid | ✓ |  |  |
| 22 | **approved_at** | timestamptz | ✓ |  |  |
| 23 | **rejection_reason** | text | ✓ |  |  |
| 24 | **expected_delivery_date** | date | ✓ |  |  |
| 25 | **shipped_at** | timestamptz | ✓ |  |  |
| 26 | **delivered_at** | timestamptz | ✓ |  |  |
| 27 | **receiver_name** | varchar(200) | ✓ |  |  |
| 28 | **receiver_signature** | text | ✓ |  |  |
| 29 | **delivery_confirmation_photo** | text | ✓ |  |  |
| 30 | **subtotal** | numeric | ✓ | 0 |  |
| 31 | **shipping_cost** | numeric | ✓ | 0 |  |
| 32 | **total_amount** | numeric | ✓ | 0 |  |
| 33 | **tracking_number** | varchar(100) | ✓ |  |  |
| 34 | **notes** | text | ✓ |  |  |
| 35 | **internal_notes** | text | ✓ |  |  |
| 36 | **custom_fields** | jsonb | ✓ | '{}'::jsonb |  |
| 37 | **cancelled_at** | timestamptz | ✓ |  |  |
| 38 | **cancelled_by** | uuid | ✓ |  |  |
| 39 | **cancel_reason** | text | ✓ |  |  |
| 40 | **created_by** | uuid | ✓ |  |  |
| 41 | **created_at** | timestamptz | ✓ | now() |  |
| 42 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `quotations` — 40 عمود
**UNIQUE:** tenant_id, quotation_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **quotation_number** | varchar(50) | ✗ |  |  |
| 6 | **quotation_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **customer_id** | uuid | ✓ |  | → customers.id |
| 8 | **customer_name** | varchar(200) | ✓ |  |  |
| 9 | **total_amount** | numeric | ✓ | 0 |  |
| 10 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 11 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |
| 14 | **notes** | text | ✓ |  |  |
| 15 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 16 | **salesperson_id** | uuid | ✓ |  |  |
| 17 | **due_date** | date | ✓ |  |  |
| 18 | **payment_terms_days** | integer | ✓ | 0 |  |
| 19 | **discount_percent** | numeric | ✓ | 0 |  |
| 20 | **price_list_id** | uuid | ✓ |  |  |
| 21 | **confirmation_status** | text | ✓ | 'draft'::text |  |
| 22 | **confirmed_at** | timestamptz | ✓ |  |  |
| 23 | **confirmed_by** | uuid | ✓ |  |  |
| 24 | **approval_status** | text | ✓ | 'none'::text |  |
| 25 | **approved_by** | uuid | ✓ |  |  |
| 26 | **approved_at** | timestamptz | ✓ |  |  |
| 27 | **approval_notes** | text | ✓ |  |  |
| 28 | **delivery_note_id** | uuid | ✓ |  |  |
| 29 | **delivery_method** | varchar(30) | ✓ | 'store_pickup'::character v... |  |
| 30 | **shipping_address_id** | uuid | ✓ |  | → customer_addresses.id |
| 31 | **shipping_address** | text | ✓ |  |  |
| 32 | **shipping_recipient** | varchar(200) | ✓ |  |  |
| 33 | **shipping_phone** | varchar(50) | ✓ |  |  |
| 34 | **shipping_carrier** | varchar(50) | ✓ |  |  |
| 35 | **tracking_number** | varchar(100) | ✓ |  |  |
| 36 | **shipping_cost** | numeric | ✓ | 0 |  |
| 37 | **delivery_notes** | text | ✓ |  |  |
| 38 | **expenses** | jsonb | ✓ | '[]'::jsonb |  |
| 39 | **expenses_total** | numeric | ✓ | 0 |  |
| 40 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |

---

## `sales_deliveries` — 29 عمود
**UNIQUE:** tenant_id, delivery_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **delivery_number** | varchar(50) | ✗ |  |  |
| 6 | **delivery_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **order_id** | uuid | ✓ |  | → sales_orders.id |
| 8 | **invoice_id** | uuid | ✓ |  | → sales_invoices.id |
| 9 | **customer_id** | uuid | ✗ |  | → customers.id |
| 10 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 11 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 12 | **driver_name** | varchar(100) | ✓ |  |  |
| 13 | **vehicle_plate** | varchar(50) | ✓ |  |  |
| 14 | **notes** | text | ✓ |  |  |
| 15 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |
| 18 | **salesperson_id** | uuid | ✓ |  |  |
| 19 | **currency** | varchar(3) | ✓ |  |  |
| 20 | **exchange_rate** | numeric | ✓ | 1 |  |
| 21 | **delivery_method** | varchar(30) | ✓ | 'store_pickup'::character v... |  |
| 22 | **shipping_address_id** | uuid | ✓ |  | → customer_addresses.id |
| 23 | **shipping_address** | text | ✓ |  |  |
| 24 | **shipping_recipient** | varchar(200) | ✓ |  |  |
| 25 | **shipping_phone** | varchar(50) | ✓ |  |  |
| 26 | **shipping_carrier** | varchar(50) | ✓ |  |  |
| 27 | **tracking_number** | varchar(100) | ✓ |  |  |
| 28 | **shipping_cost** | numeric | ✓ | 0 |  |
| 29 | **delivery_notes** | text | ✓ |  |  |

---

## `sales_delivery_items` — 9 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **delivery_id** | uuid | ✗ |  | → sales_deliveries.id |
| 4 | **product_id** | uuid | ✓ |  | → products.id |
| 5 | **variant_id** | uuid | ✓ |  | → product_variants.id |
| 6 | **quantity_delivered** | numeric | ✗ |  |  |
| 7 | **unit_id** | uuid | ✓ |  | → units_of_measure.id |
| 8 | **notes** | text | ✓ |  |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |

---

## `sales_invoice_items` — 22 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **invoice_id** | uuid | ✗ |  | → sales_invoices.id |
| 4 | **line_number** | integer | ✓ | 1 |  |
| 5 | **product_id** | uuid | ✓ |  |  |
| 6 | **variant_id** | uuid | ✓ |  |  |
| 7 | **warehouse_id** | uuid | ✓ |  |  |
| 8 | **unit_id** | uuid | ✓ |  |  |
| 9 | **description** | text | ✓ |  |  |
| 10 | **quantity** | numeric | ✗ |  |  |
| 11 | **unit_price** | numeric | ✗ |  |  |
| 12 | **discount_percent** | numeric | ✓ | 0 |  |
| 13 | **discount_amount** | numeric | ✓ | 0 |  |
| 14 | **subtotal** | numeric | ✓ |  |  |
| 15 | **tax_percent** | numeric | ✓ | 0 |  |
| 16 | **tax_amount** | numeric | ✓ | 0 |  |
| 17 | **total** | numeric | ✓ |  |  |
| 18 | **unit_cost** | numeric | ✓ | 0 |  |
| 19 | **total_cost** | numeric | ✓ | 0 |  |
| 20 | **notes** | text | ✓ |  |  |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `sales_invoices` — 47 عمود
**UNIQUE:** tenant_id, company_id, invoice_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **invoice_number** | varchar(50) | ✗ |  |  |
| 6 | **invoice_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **due_date** | date | ✓ |  |  |
| 8 | **customer_id** | uuid | ✓ |  |  |
| 9 | **customer_name** | varchar(200) | ✓ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 11 | **is_posted** | boolean | ✓ | false |  |
| 12 | **posted_at** | timestamptz | ✓ |  |  |
| 13 | **subtotal** | numeric | ✓ | 0 |  |
| 14 | **discount_amount** | numeric | ✓ | 0 |  |
| 15 | **taxable_amount** | numeric | ✓ | 0 |  |
| 16 | **tax_amount** | numeric | ✓ | 0 |  |
| 17 | **total_amount** | numeric | ✓ | 0 |  |
| 18 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 19 | **exchange_rate** | numeric | ✓ | 1 |  |
| 20 | **journal_entry_id** | uuid | ✓ |  |  |
| 21 | **notes** | text | ✓ |  |  |
| 22 | **created_by** | uuid | ✓ |  |  |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **updated_at** | timestamptz | ✓ | now() |  |
| 25 | **salesperson_id** | uuid | ✓ |  |  |
| 26 | **discount_percent** | numeric | ✓ | 0 |  |
| 27 | **price_list_id** | uuid | ✓ |  |  |
| 28 | **confirmation_status** | text | ✓ | 'draft'::text |  |
| 29 | **confirmed_at** | timestamptz | ✓ |  |  |
| 30 | **confirmed_by** | uuid | ✓ |  |  |
| 31 | **approval_status** | text | ✓ | 'none'::text |  |
| 32 | **approved_by** | uuid | ✓ |  |  |
| 33 | **approved_at** | timestamptz | ✓ |  |  |
| 34 | **approval_notes** | text | ✓ |  |  |
| 35 | **delivery_note_id** | uuid | ✓ |  |  |
| 36 | **delivery_method** | varchar(30) | ✓ | 'store_pickup'::character v... |  |
| 37 | **shipping_address_id** | uuid | ✓ |  | → customer_addresses.id |
| 38 | **shipping_address** | text | ✓ |  |  |
| 39 | **shipping_recipient** | varchar(200) | ✓ |  |  |
| 40 | **shipping_phone** | varchar(50) | ✓ |  |  |
| 41 | **shipping_carrier** | varchar(50) | ✓ |  |  |
| 42 | **tracking_number** | varchar(100) | ✓ |  |  |
| 43 | **shipping_cost** | numeric | ✓ | 0 |  |
| 44 | **delivery_notes** | text | ✓ |  |  |
| 45 | **expenses** | jsonb | ✓ | '[]'::jsonb |  |
| 46 | **expenses_total** | numeric | ✓ | 0 |  |
| 47 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |

---

## `sales_orders` — 39 عمود
**UNIQUE:** tenant_id, order_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **order_number** | varchar(50) | ✗ |  |  |
| 6 | **order_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **quotation_id** | uuid | ✓ |  | → quotations.id |
| 8 | **customer_id** | uuid | ✓ |  | → customers.id |
| 9 | **customer_name** | varchar(200) | ✓ |  |  |
| 10 | **total_amount** | numeric | ✓ | 0 |  |
| 11 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 12 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 17 | **salesperson_id** | uuid | ✓ |  |  |
| 18 | **discount_percent** | numeric | ✓ | 0 |  |
| 19 | **price_list_id** | uuid | ✓ |  |  |
| 20 | **confirmation_status** | text | ✓ | 'draft'::text |  |
| 21 | **confirmed_at** | timestamptz | ✓ |  |  |
| 22 | **confirmed_by** | uuid | ✓ |  |  |
| 23 | **approval_status** | text | ✓ | 'none'::text |  |
| 24 | **approved_by** | uuid | ✓ |  |  |
| 25 | **approved_at** | timestamptz | ✓ |  |  |
| 26 | **approval_notes** | text | ✓ |  |  |
| 27 | **delivery_note_id** | uuid | ✓ |  |  |
| 28 | **delivery_method** | varchar(30) | ✓ | 'store_pickup'::character v... |  |
| 29 | **shipping_address_id** | uuid | ✓ |  | → customer_addresses.id |
| 30 | **shipping_address** | text | ✓ |  |  |
| 31 | **shipping_recipient** | varchar(200) | ✓ |  |  |
| 32 | **shipping_phone** | varchar(50) | ✓ |  |  |
| 33 | **shipping_carrier** | varchar(50) | ✓ |  |  |
| 34 | **tracking_number** | varchar(100) | ✓ |  |  |
| 35 | **shipping_cost** | numeric | ✓ | 0 |  |
| 36 | **delivery_notes** | text | ✓ |  |  |
| 37 | **expenses** | jsonb | ✓ | '[]'::jsonb |  |
| 38 | **expenses_total** | numeric | ✓ | 0 |  |
| 39 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |

---

## `sales_returns` — 19 عمود
**UNIQUE:** tenant_id, return_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **return_number** | varchar(50) | ✗ |  |  |
| 6 | **return_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **invoice_id** | uuid | ✓ |  | → sales_invoices.id |
| 8 | **delivery_id** | uuid | ✓ |  | → sales_deliveries.id |
| 9 | **customer_id** | uuid | ✗ |  | → customers.id |
| 10 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 11 | **reason** | text | ✓ |  |  |
| 12 | **total_amount** | numeric | ✓ | 0 |  |
| 13 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 14 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 15 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |
| 18 | **salesperson_id** | uuid | ✓ |  |  |
| 19 | **exchange_rate** | numeric | ✓ | 1 |  |

---

# ════════════════════════════════════════════════════════════
# Purchases — المشتريات
# ════════════════════════════════════════════════════════════

## `purchase_invoice_items` — 22 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **invoice_id** | uuid | ✗ |  | → purchase_invoices.id |
| 4 | **line_number** | integer | ✓ |  |  |
| 5 | **product_id** | uuid | ✓ |  | → products.id |
| 6 | **variant_id** | uuid | ✓ |  |  |
| 7 | **description** | text | ✓ |  |  |
| 8 | **quantity** | numeric | ✗ |  |  |
| 9 | **unit_id** | uuid | ✓ |  |  |
| 10 | **unit_price** | numeric | ✓ | 0 |  |
| 11 | **discount_percentage** | numeric | ✓ | 0 |  |
| 12 | **discount_amount** | numeric | ✓ | 0 |  |
| 13 | **subtotal** | numeric | ✓ | 0 |  |
| 14 | **tax_percentage** | numeric | ✓ | 0 |  |
| 15 | **tax_amount** | numeric | ✓ | 0 |  |
| 16 | **total** | numeric | ✓ | 0 |  |
| 17 | **unit_cost** | numeric | ✓ |  |  |
| 18 | **total_cost** | numeric | ✓ |  |  |
| 19 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 20 | **notes** | text | ✓ |  |  |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `purchase_invoices` — 30 عمود
**UNIQUE:** tenant_id, company_id, invoice_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **invoice_number** | varchar(50) | ✗ |  |  |
| 6 | **invoice_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **due_date** | date | ✓ |  |  |
| 8 | **supplier_id** | uuid | ✓ |  |  |
| 9 | **supplier_name** | varchar(200) | ✓ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 11 | **is_posted** | boolean | ✓ | false |  |
| 12 | **posted_at** | timestamptz | ✓ |  |  |
| 13 | **subtotal** | numeric | ✓ | 0 |  |
| 14 | **discount_amount** | numeric | ✓ | 0 |  |
| 15 | **tax_amount** | numeric | ✓ | 0 |  |
| 16 | **total_amount** | numeric | ✓ | 0 |  |
| 17 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 18 | **exchange_rate** | numeric | ✓ | 1 |  |
| 19 | **journal_entry_id** | uuid | ✓ |  |  |
| 20 | **notes** | text | ✓ |  |  |
| 21 | **created_by** | uuid | ✓ |  |  |
| 22 | **created_at** | timestamptz | ✓ | now() |  |
| 23 | **updated_at** | timestamptz | ✓ | now() |  |
| 24 | **shipment_id** | uuid | ✓ |  | → shipments.id |
| 25 | **expenses** | jsonb | ✓ | '[]'::jsonb |  |
| 26 | **expenses_total** | numeric | ✓ | 0 |  |
| 27 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |
| 28 | **supplier_invoice_number** | text | ✓ |  |  |
| 29 | **supplier_invoice_date** | date | ✓ |  |  |
| 30 | **supplier_notes** | text | ✓ |  |  |

---

## `purchase_orders` — 21 عمود
**UNIQUE:** tenant_id, company_id, order_number
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **order_number** | varchar(50) | ✗ |  |  |
| 6 | **order_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **expected_delivery_date** | date | ✓ |  |  |
| 8 | **supplier_id** | uuid | ✓ |  | → suppliers.id |
| 9 | **supplier_name** | varchar(200) | ✓ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 11 | **subtotal** | numeric | ✓ | 0 |  |
| 12 | **discount_amount** | numeric | ✓ | 0 |  |
| 13 | **tax_amount** | numeric | ✓ | 0 |  |
| 14 | **total_amount** | numeric | ✓ | 0 |  |
| 15 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 16 | **exchange_rate** | numeric | ✓ | 1 |  |
| 17 | **notes** | text | ✓ |  |  |
| 18 | **terms_and_conditions** | text | ✓ |  |  |
| 19 | **created_by** | uuid | ✓ |  |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `purchase_orders_status_check`

---

## `purchase_quotations` — 22 عمود
**UNIQUE:** tenant_id, quotation_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **quotation_number** | varchar(50) | ✗ |  |  |
| 6 | **supplier_quotation_number** | varchar(100) | ✓ |  |  |
| 7 | **quotation_date** | date | ✗ | CURRENT_DATE |  |
| 8 | **supplier_id** | uuid | ✗ |  | → suppliers.id |
| 9 | **supplier_name** | varchar(200) | ✓ |  |  |
| 10 | **request_id** | uuid | ✓ |  | → purchase_requests.id |
| 11 | **valid_until** | date | ✓ |  |  |
| 12 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 13 | **exchange_rate** | numeric | ✓ | 1 |  |
| 14 | **subtotal** | numeric | ✓ | 0 |  |
| 15 | **tax_amount** | numeric | ✓ | 0 |  |
| 16 | **total_amount** | numeric | ✓ | 0 |  |
| 17 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 18 | **notes** | text | ✓ |  |  |
| 19 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |
| 20 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `purchase_receipt_items` — 12 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **receipt_id** | uuid | ✗ |  | → purchase_receipts.id |
| 4 | **product_id** | uuid | ✓ |  | → products.id |
| 5 | **variant_id** | uuid | ✓ |  | → product_variants.id |
| 6 | **shipment_item_id** | uuid | ✓ |  | → shipment_items.id |
| 7 | **quantity_received** | numeric | ✗ |  |  |
| 8 | **quantity_accepted** | numeric | ✓ | 0 |  |
| 9 | **quantity_rejected** | numeric | ✓ | 0 |  |
| 10 | **unit_id** | uuid | ✓ |  | → units_of_measure.id |
| 11 | **notes** | text | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |

---

## `purchase_receipts` — 18 عمود
**UNIQUE:** tenant_id, receipt_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **receipt_number** | varchar(50) | ✗ |  |  |
| 6 | **receipt_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **receipt_type** | varchar(20) | ✓ | 'direct'::character varying |  |
| 8 | **shipment_id** | uuid | ✓ |  | → shipments.id |
| 9 | **order_id** | uuid | ✓ |  | → purchase_orders.id |
| 10 | **invoice_id** | uuid | ✓ |  | → purchase_invoices.id |
| 11 | **supplier_id** | uuid | ✓ |  | → suppliers.id |
| 12 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 13 | **delivery_note_number** | varchar(100) | ✓ |  |  |
| 14 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `purchase_requests` — 15 عمود
**UNIQUE:** tenant_id, request_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **request_number** | varchar(50) | ✗ |  |  |
| 6 | **request_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **requested_by** | uuid | ✓ |  | → user_profiles.id |
| 8 | **department** | varchar(100) | ✓ |  |  |
| 9 | **priority** | varchar(20) | ✓ | 'normal'::character varying |  |
| 10 | **required_date** | date | ✓ |  |  |
| 11 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 12 | **notes** | text | ✓ |  |  |
| 13 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `purchase_returns` — 17 عمود
**UNIQUE:** tenant_id, return_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **return_number** | varchar(50) | ✗ |  |  |
| 6 | **return_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **receipt_id** | uuid | ✓ |  | → purchase_receipts.id |
| 8 | **invoice_id** | uuid | ✓ |  | → purchase_invoices.id |
| 9 | **supplier_id** | uuid | ✓ |  | → suppliers.id |
| 10 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 11 | **reason** | text | ✓ |  |  |
| 12 | **total_amount** | numeric | ✓ | 0 |  |
| 13 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 14 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 15 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Shipments & Trade — الشحنات والتجارة
# ════════════════════════════════════════════════════════════

## `container_cost_allocations` — 14 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **company_id** | uuid | ✓ |  |  |
| 4 | **container_id** | uuid | ✗ |  | → containers.id |
| 5 | **container_expense_id** | uuid | ✓ |  | → container_expenses.id |
| 6 | **container_item_id** | uuid | ✓ |  | → container_items.id |
| 7 | **allocation_method** | varchar(20) | ✓ |  |  |
| 8 | **allocation_basis_value** | numeric | ✓ |  |  |
| 9 | **allocation_percentage** | numeric | ✓ |  |  |
| 10 | **allocated_amount** | numeric | ✓ |  |  |
| 11 | **journal_entry_id** | uuid | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **created_by** | uuid | ✓ |  |  |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `container_expense_allocations` — 7 عمود
**UNIQUE:** expense_id, item_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **expense_id** | uuid | ✓ |  | → container_expenses.id |
| 3 | **item_id** | uuid | ✓ |  | → container_items.id |
| 4 | **allocated_amount** | numeric | ✗ |  |  |
| 5 | **tenant_id** | uuid | ✓ |  |  |
| 6 | **created_at** | timestamptz | ✓ | now() |  |
| 7 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `container_expenses` — 40 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **container_id** | uuid | ✓ |  | → containers.id |
| 3 | **expense_type** | varchar(50) | ✗ |  |  |
| 4 | **description** | varchar(255) | ✓ |  |  |
| 5 | **amount** | numeric | ✗ |  |  |
| 6 | **currency_code** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 7 | **exchange_rate** | numeric | ✓ | 1 |  |
| 8 | **amount_local** | numeric | ✓ |  |  |
| 9 | **vendor_id** | uuid | ✓ |  |  |
| 10 | **invoice_number** | varchar(100) | ✓ |  |  |
| 11 | **invoice_date** | date | ✓ |  |  |
| 12 | **is_paid** | boolean | ✓ | false |  |
| 13 | **payment_id** | uuid | ✓ |  |  |
| 14 | **allocation_method** | varchar(20) | ✓ | 'by_value'::character varying |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **tenant_id** | uuid | ✓ |  |  |
| 17 | **company_id** | uuid | ✓ |  |  |
| 18 | **expense_category** | varchar(30) | ✓ |  |  |
| 19 | **vendor_account_id** | uuid | ✓ |  |  |
| 20 | **vendor_name** | varchar(200) | ✓ |  |  |
| 21 | **expected_amount** | numeric | ✓ |  |  |
| 22 | **expected_currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 23 | **expected_exchange_rate** | numeric | ✓ | 1 |  |
| 24 | **expected_amount_in_base** | numeric | ✓ |  |  |
| 25 | **expected_notes** | text | ✓ |  |  |
| 26 | **actual_amount** | numeric | ✓ |  |  |
| 27 | **actual_currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 28 | **actual_exchange_rate** | numeric | ✓ | 1 |  |
| 29 | **actual_amount_in_base** | numeric | ✓ |  |  |
| 30 | **invoice_status** | varchar(20) | ✓ | 'expected'::character varying |  |
| 31 | **invoice_file_url** | text | ✓ |  |  |
| 32 | **payment_status** | varchar(20) | ✓ | 'unpaid'::character varying |  |
| 33 | **paid_amount** | numeric | ✓ | 0 |  |
| 34 | **paid_date** | date | ✓ |  |  |
| 35 | **payment_reference** | varchar(100) | ✓ |  |  |
| 36 | **journal_entry_id** | uuid | ✓ |  |  |
| 37 | **is_allocated** | boolean | ✓ | false |  |
| 38 | **allocation_date** | date | ✓ |  |  |
| 39 | **notes** | text | ✓ |  |  |
| 40 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `container_items` — 36 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **container_id** | uuid | ✓ |  | → containers.id |
| 3 | **product_id** | uuid | ✓ |  | → products.id |
| 4 | **color_id** | uuid | ✓ |  | → fabric_colors.id |
| 5 | **expected_quantity** | numeric | ✗ |  |  |
| 6 | **expected_rolls** | integer | ✓ |  |  |
| 7 | **received_quantity** | numeric | ✓ | 0 |  |
| 8 | **received_rolls** | integer | ✓ | 0 |  |
| 9 | **unit_cost** | numeric | ✗ |  |  |
| 10 | **total_cost** | numeric | ✓ |  |  |
| 11 | **landed_cost_per_unit** | numeric | ✓ |  |  |
| 12 | **total_landed_cost** | numeric | ✓ |  |  |
| 13 | **remarks** | text | ✓ |  |  |
| 14 | **tenant_id** | uuid | ✓ |  |  |
| 15 | **material_id** | uuid | ✓ |  |  |
| 16 | **item_description** | varchar(500) | ✓ |  |  |
| 17 | **damaged_quantity** | numeric | ✓ | 0 |  |
| 18 | **unit** | varchar(20) | ✓ | 'meter'::character varying |  |
| 19 | **weight_kg** | numeric | ✓ |  |  |
| 20 | **volume_cbm** | numeric | ✓ |  |  |
| 21 | **reserved_quantity** | numeric | ✓ | 0 |  |
| 22 | **sold_quantity** | numeric | ✓ | 0 |  |
| 23 | **available_quantity** | numeric | ✓ | 0 |  |
| 24 | **unit_price** | numeric | ✓ |  |  |
| 25 | **total_price** | numeric | ✓ |  |  |
| 26 | **provisional_unit_cost** | numeric | ✓ |  |  |
| 27 | **final_unit_cost** | numeric | ✓ |  |  |
| 28 | **allocated_costs** | numeric | ✓ | 0 |  |
| 29 | **total_provisional_cost** | numeric | ✓ |  |  |
| 30 | **total_final_cost** | numeric | ✓ |  |  |
| 31 | **cost_per_unit_allocated** | numeric | ✓ | 0 |  |
| 32 | **warehouse_id** | uuid | ✓ |  |  |
| 33 | **location_id** | uuid | ✓ |  |  |
| 34 | **notes** | text | ✓ |  |  |
| 35 | **created_at** | timestamptz | ✓ | now() |  |
| 36 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `container_quotation_items` — 18 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **quotation_id** | uuid | ✗ |  | → container_quotations.id |
| 3 | **container_item_id** | uuid | ✓ |  |  |
| 4 | **material_id** | uuid | ✓ |  |  |
| 5 | **color_id** | uuid | ✓ |  |  |
| 6 | **product_id** | uuid | ✓ |  |  |
| 7 | **item_description** | varchar(500) | ✓ |  |  |
| 8 | **quantity** | numeric | ✗ |  |  |
| 9 | **unit** | varchar(20) | ✓ | 'meter'::character varying |  |
| 10 | **unit_price** | numeric | ✓ |  |  |
| 11 | **discount_percentage** | numeric | ✓ | 0 |  |
| 12 | **discount_amount** | numeric | ✓ | 0 |  |
| 13 | **tax_percentage** | numeric | ✓ | 0 |  |
| 14 | **tax_amount** | numeric | ✓ | 0 |  |
| 15 | **total_amount** | numeric | ✓ |  |  |
| 16 | **notes** | text | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `container_quotations` — 27 عمود
**UNIQUE:** tenant_id, quotation_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **company_id** | uuid | ✓ |  |  |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **quotation_number** | varchar(50) | ✗ |  |  |
| 6 | **quotation_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **valid_until** | date | ✓ |  |  |
| 8 | **customer_id** | uuid | ✓ |  |  |
| 9 | **customer_name** | varchar(200) | ✓ |  |  |
| 10 | **customer_phone** | varchar(50) | ✓ |  |  |
| 11 | **customer_email** | varchar(200) | ✓ |  |  |
| 12 | **container_id** | uuid | ✓ |  | → containers.id |
| 13 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 14 | **converted_to_reservation** | boolean | ✓ | false |  |
| 15 | **reservation_id** | uuid | ✓ |  |  |
| 16 | **conversion_date** | date | ✓ |  |  |
| 17 | **subtotal** | numeric | ✓ | 0 |  |
| 18 | **discount_amount** | numeric | ✓ | 0 |  |
| 19 | **tax_amount** | numeric | ✓ | 0 |  |
| 20 | **total_amount** | numeric | ✓ | 0 |  |
| 21 | **notes** | text | ✓ |  |  |
| 22 | **terms_and_conditions** | text | ✓ |  |  |
| 23 | **created_by** | uuid | ✓ |  |  |
| 24 | **sent_at** | timestamptz | ✓ |  |  |
| 25 | **viewed_at** | timestamptz | ✓ |  |  |
| 26 | **created_at** | timestamptz | ✓ | now() |  |
| 27 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `container_reservations` — 41 عمود
**UNIQUE:** tenant_id, reservation_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **company_id** | uuid | ✓ |  |  |
| 4 | **branch_id** | uuid | ✓ |  |  |
| 5 | **reservation_number** | varchar(50) | ✗ |  |  |
| 6 | **reservation_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **customer_id** | uuid | ✓ |  |  |
| 8 | **customer_name** | varchar(200) | ✓ |  |  |
| 9 | **customer_phone** | varchar(50) | ✓ |  |  |
| 10 | **customer_email** | varchar(200) | ✓ |  |  |
| 11 | **container_id** | uuid | ✗ |  | → containers.id |
| 12 | **container_item_id** | uuid | ✓ |  | → container_items.id |
| 13 | **material_id** | uuid | ✓ |  |  |
| 14 | **color_id** | uuid | ✓ |  |  |
| 15 | **product_id** | uuid | ✓ |  |  |
| 16 | **item_description** | varchar(500) | ✓ |  |  |
| 17 | **reserved_quantity** | numeric | ✗ |  |  |
| 18 | **unit** | varchar(20) | ✓ | 'meter'::character varying |  |
| 19 | **unit_price** | numeric | ✓ |  |  |
| 20 | **total_amount** | numeric | ✓ |  |  |
| 21 | **advance_amount** | numeric | ✓ | 0 |  |
| 22 | **advance_percentage** | numeric | ✓ | 0 |  |
| 23 | **advance_received** | boolean | ✓ | false |  |
| 24 | **advance_receipt_id** | uuid | ✓ |  |  |
| 25 | **advance_date** | date | ✓ |  |  |
| 26 | **advance_journal_entry_id** | uuid | ✓ |  |  |
| 27 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 28 | **expected_delivery_date** | date | ✓ |  |  |
| 29 | **actual_delivery_date** | date | ✓ |  |  |
| 30 | **confirmation_date** | date | ✓ |  |  |
| 31 | **expiry_date** | date | ✓ |  |  |
| 32 | **cancellation_date** | date | ✓ |  |  |
| 33 | **cancellation_reason** | text | ✓ |  |  |
| 34 | **sales_invoice_id** | uuid | ✓ |  |  |
| 35 | **converted_to_invoice** | boolean | ✓ | false |  |
| 36 | **notes** | text | ✓ |  |  |
| 37 | **internal_notes** | text | ✓ |  |  |
| 38 | **created_by** | uuid | ✓ |  |  |
| 39 | **confirmed_by** | uuid | ✓ |  |  |
| 40 | **created_at** | timestamptz | ✓ | now() |  |
| 41 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `containers` — 55 عمود
**UNIQUE:** tenant_id, shipment_number | company_id, container_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **container_number** | varchar(50) | ✗ |  |  |
| 4 | **supplier_id** | uuid | ✓ |  |  |
| 5 | **bill_of_lading** | varchar(100) | ✓ |  |  |
| 6 | **shipping_company** | varchar(255) | ✓ |  |  |
| 7 | **vessel_name** | varchar(255) | ✓ |  |  |
| 8 | **departure_date** | date | ✓ |  |  |
| 9 | **arrival_date** | date | ✓ |  |  |
| 10 | **origin_country** | varchar(3) | ✓ |  |  |
| 11 | **destination_port** | varchar(100) | ✓ |  |  |
| 12 | **customs_declaration** | varchar(100) | ✓ |  |  |
| 13 | **customs_date** | date | ✓ |  |  |
| 14 | **customs_value** | numeric | ✓ |  |  |
| 15 | **status** | varchar(20) | ✓ | 'in_transit'::character var... |  |
| 16 | **total_expected_items** | integer | ✓ | 0 |  |
| 17 | **total_received_items** | integer | ✓ | 0 |  |
| 18 | **total_purchase_value** | numeric | ✓ | 0 |  |
| 19 | **total_landed_cost** | numeric | ✓ | 0 |  |
| 20 | **remarks** | text | ✓ |  |  |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **tenant_id** | uuid | ✓ |  |  |
| 23 | **branch_id** | uuid | ✓ |  |  |
| 24 | **origin_port** | varchar(100) | ✓ |  |  |
| 25 | **order_date** | date | ✓ |  |  |
| 26 | **shipping_date** | date | ✓ |  |  |
| 27 | **expected_arrival_date** | date | ✓ |  |  |
| 28 | **actual_arrival_date** | date | ✓ |  |  |
| 29 | **customs_clearance_date** | date | ✓ |  |  |
| 30 | **delivery_date** | date | ✓ |  |  |
| 31 | **received_date** | date | ✓ |  |  |
| 32 | **goods_currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 33 | **goods_exchange_rate** | numeric | ✓ | 1 |  |
| 34 | **base_currency** | varchar(3) | ✓ | 'SYP'::character varying |  |
| 35 | **provisional_goods_cost** | numeric | ✓ | 0 |  |
| 36 | **final_goods_cost** | numeric | ✓ | 0 |  |
| 37 | **total_expected_costs** | numeric | ✓ | 0 |  |
| 38 | **total_actual_costs** | numeric | ✓ | 0 |  |
| 39 | **cost_variance** | numeric | ✓ | 0 |  |
| 40 | **cost_allocation_method** | varchar(20) | ✓ | 'by_value'::character varying |  |
| 41 | **is_cost_finalized** | boolean | ✓ | false |  |
| 42 | **finalized_at** | timestamptz | ✓ |  |  |
| 43 | **finalized_by** | uuid | ✓ |  |  |
| 44 | **provisional_journal_entry_id** | uuid | ✓ |  |  |
| 45 | **final_journal_entry_id** | uuid | ✓ |  |  |
| 46 | **adjustment_journal_entry_id** | uuid | ✓ |  |  |
| 47 | **insurance_value** | numeric | ✓ | 0 |  |
| 48 | **insurance_company** | varchar(200) | ✓ |  |  |
| 49 | **tracking_url** | text | ✓ |  |  |
| 50 | **documents_received** | boolean | ✓ | false |  |
| 51 | **custom_fields** | jsonb | ✓ | '{}'::jsonb |  |
| 52 | **created_by** | uuid | ✓ |  |  |
| 53 | **updated_at** | timestamptz | ✓ | now() |  |
| 54 | **shipment_number** | varchar(50) | ✓ |  |  |
| 55 | **notes** | text | ✓ |  |  |

---

## `shipment_documents` — 60 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **carrier_id** | uuid | ✓ |  | → shipping_carriers.id |
| 5 | **source_table** | varchar(50) | ✗ |  |  |
| 6 | **source_id** | uuid | ✗ |  |  |
| 7 | **carrier_code** | varchar(50) | ✗ |  |  |
| 8 | **tracking_number** | varchar(100) | ✓ |  |  |
| 9 | **carrier_ref** | varchar(100) | ✓ |  |  |
| 10 | **status** | varchar(50) | ✓ | 'created'::character varying |  |
| 11 | **status_description** | text | ✓ |  |  |
| 12 | **last_status_check** | timestamptz | ✓ |  |  |
| 13 | **sender_ref** | varchar(36) | ✓ |  |  |
| 14 | **sender_city_ref** | varchar(36) | ✓ |  |  |
| 15 | **sender_city_name** | varchar(200) | ✓ |  |  |
| 16 | **sender_address_ref** | varchar(36) | ✓ |  |  |
| 17 | **sender_address_name** | varchar(300) | ✓ |  |  |
| 18 | **sender_contact_ref** | varchar(36) | ✓ |  |  |
| 19 | **sender_contact_name** | varchar(200) | ✓ |  |  |
| 20 | **sender_phone** | varchar(50) | ✓ |  |  |
| 21 | **recipient_ref** | varchar(36) | ✓ |  |  |
| 22 | **recipient_city_ref** | varchar(36) | ✓ |  |  |
| 23 | **recipient_city_name** | varchar(200) | ✓ |  |  |
| 24 | **recipient_address_ref** | varchar(36) | ✓ |  |  |
| 25 | **recipient_address_name** | varchar(300) | ✓ |  |  |
| 26 | **recipient_address_street** | text | ✓ |  |  |
| 27 | **recipient_building** | varchar(50) | ✓ |  |  |
| 28 | **recipient_flat** | varchar(50) | ✓ |  |  |
| 29 | **recipient_contact_name** | varchar(200) | ✓ |  |  |
| 30 | **recipient_phone** | varchar(50) | ✓ |  |  |
| 31 | **service_type** | varchar(50) | ✓ |  |  |
| 32 | **cargo_type** | varchar(50) | ✓ |  |  |
| 33 | **payer_type** | varchar(50) | ✓ |  |  |
| 34 | **payment_method** | varchar(50) | ✓ |  |  |
| 35 | **weight** | numeric | ✓ |  |  |
| 36 | **volume_general** | numeric | ✓ |  |  |
| 37 | **seats_amount** | integer | ✓ | 1 |  |
| 38 | **length** | numeric | ✓ |  |  |
| 39 | **width** | numeric | ✓ |  |  |
| 40 | **height** | numeric | ✓ |  |  |
| 41 | **declared_value** | numeric | ✓ |  |  |
| 42 | **shipping_cost** | numeric | ✓ |  |  |
| 43 | **cod_amount** | numeric | ✓ | 0 |  |
| 44 | **cod_collected** | numeric | ✓ |  |  |
| 45 | **carrier_commission** | numeric | ✓ |  |  |
| 46 | **estimated_delivery_date** | date | ✓ |  |  |
| 47 | **actual_delivery_date** | date | ✓ |  |  |
| 48 | **picked_up_at** | timestamptz | ✓ |  |  |
| 49 | **delivered_at** | timestamptz | ✓ |  |  |
| 50 | **returned_at** | timestamptz | ✓ |  |  |
| 51 | **label_url** | text | ✓ |  |  |
| 52 | **barcode** | varchar(100) | ✓ |  |  |
| 53 | **api_request** | jsonb | ✓ |  |  |
| 54 | **api_response** | jsonb | ✓ |  |  |
| 55 | **status_history** | jsonb | ✓ | '[]'::jsonb |  |
| 56 | **description** | text | ✓ |  |  |
| 57 | **internal_notes** | text | ✓ |  |  |
| 58 | **created_by** | uuid | ✓ |  |  |
| 59 | **created_at** | timestamptz | ✓ | now() |  |
| 60 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `shipment_items` — 36 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **shipment_id** | uuid | ✗ |  | → shipments.id |
| 4 | **product_id** | uuid | ✓ |  | → products.id |
| 5 | **material_id** | uuid | ✓ |  |  |
| 6 | **expected_quantity** | numeric | ✓ |  |  |
| 7 | **received_quantity** | numeric | ✓ | 0 |  |
| 8 | **unit_id** | uuid | ✓ |  | → units_of_measure.id |
| 9 | **unit_price** | numeric | ✓ |  |  |
| 10 | **total_price** | numeric | ✓ |  |  |
| 11 | **notes** | text | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **color_id** | uuid | ✓ |  | → fabric_colors.id |
| 14 | **item_description** | varchar(500) | ✓ |  |  |
| 15 | **expected_rolls** | integer | ✓ |  |  |
| 16 | **received_rolls** | integer | ✓ | 0 |  |
| 17 | **unit** | varchar(20) | ✓ | 'meter'::character varying |  |
| 18 | **reserved_quantity** | numeric | ✓ | 0 |  |
| 19 | **sold_quantity** | numeric | ✓ | 0 |  |
| 20 | **provisional_unit_cost** | numeric | ✓ |  |  |
| 21 | **final_unit_cost** | numeric | ✓ |  |  |
| 22 | **allocated_costs** | numeric | ✓ | 0 |  |
| 23 | **total_provisional_cost** | numeric | ✓ |  |  |
| 24 | **total_final_cost** | numeric | ✓ |  |  |
| 25 | **purchase_invoice_id** | uuid | ✓ |  | → purchase_invoices.id |
| 26 | **supplier_id** | uuid | ✓ |  | → suppliers.id |
| 27 | **supplier_name** | varchar(200) | ✓ |  |  |
| 28 | **invoice_number** | varchar(100) | ✓ |  |  |
| 29 | **material_code** | varchar(100) | ✓ |  |  |
| 30 | **color_name** | varchar(200) | ✓ |  |  |
| 31 | **weight_kg** | numeric | ✓ | 0 |  |
| 32 | **expected_sell_price** | numeric | ✓ |  |  |
| 33 | **updated_at** | timestamptz | ✓ | now() |  |
| 34 | **item_description_en** | varchar(500) | ✓ |  |  |
| 35 | **item_description_ru** | varchar(500) | ✓ |  |  |
| 36 | **item_description_uk** | varchar(500) | ✓ |  |  |

---

## `shipments` — 27 عمود
**UNIQUE:** tenant_id, shipment_number
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **shipment_number** | varchar(50) | ✗ |  |  |
| 6 | **container_number** | varchar(50) | ✓ |  |  |
| 7 | **bill_of_lading** | varchar(100) | ✓ |  |  |
| 8 | **supplier_id** | uuid | ✓ |  | → suppliers.id |
| 9 | **status** | varchar(30) | ✓ | 'ordered'::character varying |  |
| 10 | **total_goods_cost** | numeric | ✓ | 0 |  |
| 11 | **total_landed_cost** | numeric | ✓ | 0 |  |
| 12 | **notes** | text | ✓ |  |  |
| 13 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |
| 16 | **origin_country** | varchar(100) | ✓ |  |  |
| 17 | **port_of_loading** | varchar(100) | ✓ |  |  |
| 18 | **port_of_discharge** | varchar(100) | ✓ |  |  |
| 19 | **shipping_line** | varchar(100) | ✓ |  |  |
| 20 | **vessel_name** | varchar(100) | ✓ |  |  |
| 21 | **etd** | date | ✓ |  |  |
| 22 | **eta** | date | ✓ |  |  |
| 23 | **container_size** | varchar(20) | ✓ |  |  |
| 24 | **container_type** | varchar(20) | ✓ |  |  |
| 25 | **customs_declaration_number** | varchar(50) | ✓ |  |  |
| 26 | **clearance_date** | date | ✓ |  |  |
| 27 | **default_margin_percent** | numeric | ✓ | 20.00 |  |

**CHECK Constraints:**
- `shipments_status_check`

---

## `shipments_tracking` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **shipment_id** | uuid | ✓ |  | → shipments.id |
| 4 | **provider** | varchar(50) | ✓ |  |  |
| 5 | **tracking_number** | varchar(100) | ✓ |  |  |
| 6 | **current_status** | varchar(50) | ✓ |  |  |
| 7 | **status_history** | jsonb | ✓ | '[]'::jsonb |  |
| 8 | **label_url** | text | ✓ |  |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |

---

## `shipping_carriers` — 31 عمود
**UNIQUE:** tenant_id, company_id, carrier_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **carrier_code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(200) | ✓ |  |  |
| 6 | **name_en** | varchar(200) | ✓ |  |  |
| 7 | **name_uk** | varchar(200) | ✓ |  |  |
| 8 | **logo_url** | text | ✓ |  |  |
| 9 | **api_endpoint** | text | ✓ |  |  |
| 10 | **api_key_encrypted** | text | ✓ |  |  |
| 11 | **api_version** | varchar(20) | ✓ |  |  |
| 12 | **np_sender_ref** | varchar(36) | ✓ |  |  |
| 13 | **np_sender_city_ref** | varchar(36) | ✓ |  |  |
| 14 | **np_sender_address_ref** | varchar(36) | ✓ |  |  |
| 15 | **np_sender_contact_ref** | varchar(36) | ✓ |  |  |
| 16 | **np_sender_phone** | varchar(50) | ✓ |  |  |
| 17 | **tracking_url_template** | text | ✓ |  |  |
| 18 | **n8n_create_shipment_webhook** | text | ✓ |  |  |
| 19 | **n8n_track_shipment_webhook** | text | ✓ |  |  |
| 20 | **n8n_cancel_shipment_webhook** | text | ✓ |  |  |
| 21 | **n8n_print_label_webhook** | text | ✓ |  |  |
| 22 | **country** | varchar(10) | ✓ |  |  |
| 23 | **default_service_type** | varchar(50) | ✓ |  |  |
| 24 | **default_cargo_type** | varchar(50) | ✓ |  |  |
| 25 | **default_payer_type** | varchar(50) | ✓ |  |  |
| 26 | **default_payment_method** | varchar(50) | ✓ |  |  |
| 27 | **is_active** | boolean | ✓ | true |  |
| 28 | **is_default** | boolean | ✓ | false |  |
| 29 | **settings** | jsonb | ✓ | '{}'::jsonb |  |
| 30 | **created_at** | timestamptz | ✓ | now() |  |
| 31 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `transit_reservations` — 27 عمود
**UNIQUE:** tenant_id, reservation_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **branch_id** | uuid | ✓ |  | → branches.id |
| 5 | **reservation_number** | varchar(50) | ✗ |  |  |
| 6 | **reservation_date** | date | ✗ | CURRENT_DATE |  |
| 7 | **customer_id** | uuid | ✓ |  | → customers.id |
| 8 | **sales_order_id** | uuid | ✓ |  | → sales_orders.id |
| 9 | **shipment_id** | uuid | ✓ |  | → shipments.id |
| 10 | **shipment_item_id** | uuid | ✓ |  | → shipment_items.id |
| 11 | **product_id** | uuid | ✓ |  | → products.id |
| 12 | **reserved_quantity** | numeric | ✗ |  |  |
| 13 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 14 | **notes** | text | ✓ |  |  |
| 15 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |
| 18 | **currency** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 19 | **delivery_method** | varchar(30) | ✓ | 'store_pickup'::character v... |  |
| 20 | **shipping_address_id** | uuid | ✓ |  | → customer_addresses.id |
| 21 | **shipping_address** | text | ✓ |  |  |
| 22 | **shipping_recipient** | varchar(200) | ✓ |  |  |
| 23 | **shipping_phone** | varchar(50) | ✓ |  |  |
| 24 | **shipping_carrier** | varchar(50) | ✓ |  |  |
| 25 | **tracking_number** | varchar(100) | ✓ |  |  |
| 26 | **shipping_cost** | numeric | ✓ | 0 |  |
| 27 | **delivery_notes** | text | ✓ |  |  |

---

# ════════════════════════════════════════════════════════════
# Warehouse & Inventory — المستودعات والمخزون
# ════════════════════════════════════════════════════════════

## `bin_locations` — 12 عمود
**UNIQUE:** warehouse_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name** | varchar(100) | ✓ |  |  |
| 5 | **row_code** | varchar(10) | ✓ |  |  |
| 6 | **column_code** | varchar(10) | ✓ |  |  |
| 7 | **shelf_code** | varchar(10) | ✓ |  |  |
| 8 | **is_active** | boolean | ✓ | true |  |
| 9 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 10 | **company_id** | uuid | ✓ |  | → companies.id |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `fabric_colors` — 21 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **code** | varchar(20) | ✗ |  |  |
| 4 | **name** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **hex_code** | varchar(7) | ✓ |  |  |
| 7 | **image_url** | text | ✓ |  |  |
| 8 | **name_ar** | varchar(100) | ✓ |  |  |
| 9 | **name_ru** | varchar(100) | ✓ |  |  |
| 10 | **name_uk** | varchar(100) | ✓ |  |  |
| 11 | **name_ro** | varchar(100) | ✓ |  |  |
| 12 | **name_pl** | varchar(100) | ✓ |  |  |
| 13 | **name_tr** | varchar(100) | ✓ |  |  |
| 14 | **name_de** | varchar(100) | ✓ |  |  |
| 15 | **name_it** | varchar(100) | ✓ |  |  |
| 16 | **color_family** | varchar(30) | ✓ |  |  |
| 17 | **is_active** | boolean | ✓ | true |  |
| 18 | **sort_order** | integer | ✓ | 0 |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **tenant_id** | uuid | ✓ |  |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `fabric_groups` — 20 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name_ar** | varchar(200) | ✗ |  |  |
| 5 | **name_en** | varchar(200) | ✓ |  |  |
| 6 | **name_ru** | varchar(200) | ✓ |  |  |
| 7 | **name_uk** | varchar(200) | ✓ |  |  |
| 8 | **name_ro** | varchar(200) | ✓ |  |  |
| 9 | **name_pl** | varchar(200) | ✓ |  |  |
| 10 | **name_tr** | varchar(200) | ✓ |  |  |
| 11 | **name_de** | varchar(200) | ✓ |  |  |
| 12 | **name_it** | varchar(200) | ✓ |  |  |
| 13 | **parent_id** | uuid | ✓ |  | → fabric_groups.id |
| 14 | **icon** | varchar(50) | ✓ | '📁'::character varying |  |
| 15 | **description** | text | ✓ |  |  |
| 16 | **display_order** | integer | ✓ | 0 |  |
| 17 | **is_active** | boolean | ✓ | true |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |
| 20 | **company_id** | uuid | ✓ |  |  |

---

## `fabric_materials` — 48 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(200) | ✗ |  |  |
| 6 | **name_en** | varchar(200) | ✓ |  |  |
| 7 | **name_ru** | varchar(200) | ✓ |  |  |
| 8 | **name_uk** | varchar(200) | ✓ |  |  |
| 9 | **name_ro** | varchar(200) | ✓ |  |  |
| 10 | **name_pl** | varchar(200) | ✓ |  |  |
| 11 | **name_tr** | varchar(200) | ✓ |  |  |
| 12 | **name_de** | varchar(200) | ✓ |  |  |
| 13 | **name_it** | varchar(200) | ✓ |  |  |
| 14 | **group_id** | uuid | ✓ |  | → fabric_groups.id |
| 15 | **composition** | varchar(500) | ✓ |  |  |
| 16 | **category** | varchar(50) | ✓ | 'woven'::character varying |  |
| 17 | **default_width** | numeric | ✓ | 150 |  |
| 18 | **weight_per_meter** | numeric | ✓ |  |  |
| 19 | **unit** | varchar(20) | ✓ | 'meter'::character varying |  |
| 20 | **purchase_price** | numeric | ✓ | 0 |  |
| 21 | **selling_price** | numeric | ✓ | 0 |  |
| 22 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 23 | **origin_country** | varchar(100) | ✓ |  |  |
| 24 | **notes** | text | ✓ |  |  |
| 25 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 26 | **created_at** | timestamptz | ✓ | now() |  |
| 27 | **is_roll_tracked** | boolean | ✓ | false |  |
| 28 | **bulk_stock** | numeric | ✓ | 0 |  |
| 29 | **roll_stock** | numeric | ✓ | 0 |  |
| 30 | **total_stock** | numeric | ✓ |  |  |
| 31 | **min_stock_level** | numeric | ✓ | 0 |  |
| 32 | **reorder_point** | numeric | ✓ | 0 |  |
| 33 | **primary_uom** | varchar(20) | ✓ | 'meter'::character varying |  |
| 34 | **secondary_uom** | varchar(20) | ✓ | 'roll'::character varying |  |
| 35 | **uom_conversion_rate** | numeric | ✓ | 1 |  |
| 36 | **inventory_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 37 | **cogs_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 38 | **sales_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 39 | **sample_expense_account_id** | uuid | ✓ |  | → chart_of_accounts.id |
| 40 | **avg_cost_per_unit** | numeric | ✓ | 0 |  |
| 41 | **last_cost_per_unit** | numeric | ✓ | 0 |  |
| 42 | **standard_roll_length** | numeric | ✓ | 100 |  |
| 43 | **allow_negative_stock** | boolean | ✓ | false |  |
| 44 | **track_by_location** | boolean | ✓ | true |  |
| 45 | **last_inventory_date** | timestamptz | ✓ |  |  |
| 46 | **updated_at** | timestamptz | ✓ | now() |  |
| 47 | **custom_fields** | jsonb | ✓ | '{}'::jsonb |  |
| 48 | **min_stock** | numeric | ✓ | 0 |  |

---

## `fabric_rolls` — 33 عمود
**UNIQUE:** company_id, roll_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **product_id** | uuid | ✓ |  | → products.id |
| 4 | **roll_number** | varchar(50) | ✗ |  |  |
| 5 | **rfid_tag** | varchar(100) | ✓ |  |  |
| 6 | **qr_code** | text | ✓ |  |  |
| 7 | **barcode** | varchar(100) | ✓ |  |  |
| 8 | **color_id** | uuid | ✓ |  | → fabric_colors.id |
| 9 | **batch_id** | uuid | ✓ |  | → batches.id |
| 10 | **original_length** | numeric | ✗ |  |  |
| 11 | **current_length** | numeric | ✗ |  |  |
| 12 | **reserved_length** | numeric | ✓ | 0 |  |
| 13 | **available_length** | numeric | ✓ |  |  |
| 14 | **width** | numeric | ✓ |  |  |
| 15 | **weight** | numeric | ✓ |  |  |
| 16 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 17 | **bin_location_id** | uuid | ✓ |  | → bin_locations.id |
| 18 | **cost_per_meter** | numeric | ✗ |  |  |
| 19 | **total_cost** | numeric | ✓ |  |  |
| 20 | **status** | varchar(20) | ✓ | 'available'::character varying |  |
| 21 | **receipt_date** | date | ✓ |  |  |
| 22 | **last_movement_date** | timestamptz | ✓ |  |  |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **container_id** | uuid | ✓ |  |  |
| 25 | **container_item_id** | uuid | ✓ |  |  |
| 26 | **supplier_unit_cost** | numeric | ✓ |  |  |
| 27 | **estimated_landed_cost** | numeric | ✓ |  |  |
| 28 | **final_landed_cost** | numeric | ✓ |  |  |
| 29 | **cost_status** | varchar(20) | ✓ | 'estimated'::character varying |  |
| 30 | **allocated_expenses** | numeric | ✓ | 0 |  |
| 31 | **tenant_id** | uuid | ✓ |  |  |
| 32 | **material_id** | uuid | ✓ |  |  |
| 33 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `gold_items` — 26 عمود
**UNIQUE:** company_id, item_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **product_id** | uuid | ✓ |  | → products.id |
| 4 | **item_code** | varchar(50) | ✗ |  |  |
| 5 | **rfid_tag** | varchar(100) | ✓ |  |  |
| 6 | **barcode** | varchar(100) | ✓ |  |  |
| 7 | **metal_type** | varchar(20) | ✗ | 'gold'::character varying |  |
| 8 | **karat** | integer | ✓ |  |  |
| 9 | **gross_weight** | numeric | ✗ |  |  |
| 10 | **stone_weight** | numeric | ✓ | 0 |  |
| 11 | **net_metal_weight** | numeric | ✓ |  |  |
| 12 | **making_charge_type** | varchar(20) | ✓ | 'per_gram'::character varying |  |
| 13 | **making_charge_value** | numeric | ✓ | 0 |  |
| 14 | **stone_type** | varchar(100) | ✓ |  |  |
| 15 | **stone_value** | numeric | ✓ | 0 |  |
| 16 | **metal_value** | numeric | ✓ |  |  |
| 17 | **making_charge_total** | numeric | ✓ |  |  |
| 18 | **total_value** | numeric | ✓ |  |  |
| 19 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 20 | **status** | varchar(20) | ✓ | 'available'::character varying |  |
| 21 | **customer_id** | uuid | ✓ |  |  |
| 22 | **sales_invoice_id** | uuid | ✓ |  |  |
| 23 | **sold_at** | timestamptz | ✓ |  |  |
| 24 | **created_at** | timestamptz | ✓ | now() |  |
| 25 | **updated_at** | timestamptz | ✓ | now() |  |
| 26 | **tenant_id** | uuid | ✓ |  | → tenants.id |

---

## `gold_prices` — 14 عمود
**UNIQUE:** company_id, metal_type, karat, price_date

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **metal_type** | varchar(20) | ✗ | 'gold'::character varying |  |
| 4 | **karat** | integer | ✓ |  |  |
| 5 | **price_per_gram** | numeric | ✗ |  |  |
| 6 | **currency_code** | varchar(3) | ✓ | 'SAR'::character varying |  |
| 7 | **price_date** | date | ✗ |  |  |
| 8 | **price_time** | time without time zone | ✓ |  |  |
| 9 | **source** | varchar(20) | ✓ | 'manual'::character varying |  |
| 10 | **markup_percentage** | numeric | ✓ | 0 |  |
| 11 | **is_active** | boolean | ✓ | true |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `inventory_movements` — 21 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **movement_number** | varchar(50) | ✗ |  |  |
| 5 | **movement_date** | date | ✗ | CURRENT_DATE |  |
| 6 | **movement_type** | varchar(50) | ✗ |  |  |
| 7 | **product_id** | uuid | ✓ |  |  |
| 8 | **variant_id** | uuid | ✓ |  |  |
| 9 | **from_warehouse_id** | uuid | ✓ |  |  |
| 10 | **to_warehouse_id** | uuid | ✓ |  |  |
| 11 | **quantity** | numeric | ✗ |  |  |
| 12 | **unit_id** | uuid | ✓ |  |  |
| 13 | **unit_cost** | numeric | ✓ | 0 |  |
| 14 | **total_cost** | numeric | ✓ | 0 |  |
| 15 | **reference_type** | varchar(50) | ✓ |  |  |
| 16 | **reference_id** | uuid | ✓ |  |  |
| 17 | **reference_number** | varchar(50) | ✓ |  |  |
| 18 | **notes** | text | ✓ |  |  |
| 19 | **created_by** | uuid | ✓ |  |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `retail_cuttings` — 31 عمود
**UNIQUE:** company_id, invoice_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **branch_id** | uuid | ✓ |  | → branches.id |
| 4 | **invoice_number** | varchar(50) | ✗ |  |  |
| 5 | **invoice_date** | date | ✗ |  |  |
| 6 | **roll_id** | uuid | ✓ |  | → fabric_rolls.id |
| 7 | **balance_before** | numeric | ✗ |  |  |
| 8 | **sold_quantity** | numeric | ✗ |  |  |
| 9 | **balance_after** | numeric | ✗ |  |  |
| 10 | **rate_per_meter** | numeric | ✗ |  |  |
| 11 | **gross_amount** | numeric | ✓ |  |  |
| 12 | **discount_percentage** | numeric | ✓ | 0 |  |
| 13 | **discount_amount** | numeric | ✓ | 0 |  |
| 14 | **net_amount** | numeric | ✓ |  |  |
| 15 | **tax_amount** | numeric | ✓ | 0 |  |
| 16 | **total_amount** | numeric | ✓ |  |  |
| 17 | **sale_type** | varchar(20) | ✗ | 'cash'::character varying |  |
| 18 | **customer_id** | uuid | ✓ |  |  |
| 19 | **customer_name** | varchar(255) | ✓ |  |  |
| 20 | **fund_id** | uuid | ✓ |  | → funds.id |
| 21 | **cost_per_meter** | numeric | ✗ |  |  |
| 22 | **total_cost** | numeric | ✓ |  |  |
| 23 | **gross_profit** | numeric | ✓ |  |  |
| 24 | **agent_id** | uuid | ✓ |  |  |
| 25 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 26 | **journal_entry_id** | uuid | ✓ |  |  |
| 27 | **remarks** | text | ✓ |  |  |
| 28 | **created_by** | uuid | ✗ |  |  |
| 29 | **created_at** | timestamptz | ✓ | now() |  |
| 30 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 31 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `sample_cutting_items` — 13 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **sample_cutting_id** | uuid | ✓ |  | → sample_cuttings.id |
| 3 | **roll_id** | uuid | ✓ |  | → fabric_rolls.id |
| 4 | **balance_before** | numeric | ✗ |  |  |
| 5 | **cut_quantity** | numeric | ✗ |  |  |
| 6 | **balance_after** | numeric | ✗ |  |  |
| 7 | **cost_per_meter** | numeric | ✗ |  |  |
| 8 | **total_cost** | numeric | ✓ |  |  |
| 9 | **remarks** | text | ✓ |  |  |
| 10 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 11 | **company_id** | uuid | ✓ |  | → companies.id |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `sample_cuttings` — 18 عمود
**UNIQUE:** company_id, cutting_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **branch_id** | uuid | ✓ |  | → branches.id |
| 4 | **cutting_number** | varchar(50) | ✗ |  |  |
| 5 | **cutting_date** | date | ✗ |  |  |
| 6 | **purpose** | varchar(50) | ✓ | 'customer_sample'::characte... |  |
| 7 | **customer_id** | uuid | ✓ |  |  |
| 8 | **expense_account_id** | uuid | ✓ |  | → accounts.id |
| 9 | **cost_center_id** | uuid | ✓ |  |  |
| 10 | **total_meters** | numeric | ✓ | 0 |  |
| 11 | **total_cost** | numeric | ✓ | 0 |  |
| 12 | **status** | varchar(20) | ✓ | 'draft'::character varying |  |
| 13 | **journal_entry_id** | uuid | ✓ |  |  |
| 14 | **remarks** | text | ✓ |  |  |
| 15 | **created_by** | uuid | ✗ |  |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `serial_number_fields` — 10 عمود
**UNIQUE:** product_id, field_name

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **product_id** | uuid | ✓ |  | → products.id |
| 3 | **field_name** | varchar(50) | ✗ |  |  |
| 4 | **field_label** | varchar(100) | ✗ |  |  |
| 5 | **field_label_en** | varchar(100) | ✓ |  |  |
| 6 | **is_required** | boolean | ✓ | true |  |
| 7 | **is_unique** | boolean | ✓ | true |  |
| 8 | **sort_order** | integer | ✓ | 0 |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `serial_numbers` — 18 عمود
**UNIQUE:** company_id, serial_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **product_id** | uuid | ✓ |  | → products.id |
| 4 | **serial_number** | varchar(100) | ✗ |  |  |
| 5 | **additional_serials** | jsonb | ✓ | '{}'::jsonb |  |
| 6 | **rfid_tag** | varchar(100) | ✓ |  |  |
| 7 | **qr_code** | text | ✓ |  |  |
| 8 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 9 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 10 | **bin_location_id** | uuid | ✓ |  | → bin_locations.id |
| 11 | **batch_id** | uuid | ✓ |  | → batches.id |
| 12 | **purchase_rate** | numeric | ✓ |  |  |
| 13 | **customer_id** | uuid | ✓ |  |  |
| 14 | **sales_invoice_id** | uuid | ✓ |  |  |
| 15 | **warranty_expiry** | date | ✓ |  |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |
| 18 | **tenant_id** | uuid | ✓ |  | → tenants.id |

---

## `stock_count_items` — 18 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **stock_count_id** | uuid | ✗ |  | → stock_counts.id |
| 3 | **roll_id** | uuid | ✓ |  | → fabric_rolls.id |
| 4 | **product_id** | uuid | ✓ |  | → products.id |
| 5 | **material_id** | uuid | ✓ |  | → fabric_materials.id |
| 6 | **batch_id** | uuid | ✓ |  | → batches.id |
| 7 | **location_id** | uuid | ✓ |  | → bin_locations.id |
| 8 | **system_quantity** | numeric | ✗ | 0 |  |
| 9 | **actual_quantity** | numeric | ✓ |  |  |
| 10 | **variance** | numeric | ✓ |  |  |
| 11 | **unit_cost** | numeric | ✓ | 0 |  |
| 12 | **is_counted** | boolean | ✓ | false |  |
| 13 | **counted_at** | timestamptz | ✓ |  |  |
| 14 | **counted_by** | uuid | ✓ |  |  |
| 15 | **notes** | text | ✓ |  |  |
| 16 | **variance_reason** | varchar(100) | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `stock_counts` — 20 عمود
**UNIQUE:** tenant_id, count_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **count_number** | varchar(50) | ✗ |  |  |
| 5 | **warehouse_id** | uuid | ✗ |  | → warehouses.id |
| 6 | **location_id** | uuid | ✓ |  | → bin_locations.id |
| 7 | **count_date** | date | ✗ | CURRENT_DATE |  |
| 8 | **planned_date** | date | ✓ |  |  |
| 9 | **completed_date** | date | ✓ |  |  |
| 10 | **count_type** | varchar(30) | ✓ | 'full'::character varying |  |
| 11 | **status** | varchar(20) | ✓ | 'planned'::character varying |  |
| 12 | **total_items** | integer | ✓ | 0 |  |
| 13 | **counted_items** | integer | ✓ | 0 |  |
| 14 | **match_count** | integer | ✓ | 0 |  |
| 15 | **variance_count** | integer | ✓ | 0 |  |
| 16 | **notes** | text | ✓ |  |  |
| 17 | **created_by** | uuid | ✓ |  |  |
| 18 | **completed_by** | uuid | ✓ |  |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `stock_ledger` — 18 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **product_id** | uuid | ✓ |  | → products.id |
| 4 | **warehouse_id** | uuid | ✓ |  | → warehouses.id |
| 5 | **batch_id** | uuid | ✓ |  | → batches.id |
| 6 | **quantity** | numeric | ✗ |  |  |
| 7 | **valuation_rate** | numeric | ✗ |  |  |
| 8 | **stock_value** | numeric | ✗ |  |  |
| 9 | **qty_after** | numeric | ✗ |  |  |
| 10 | **value_after** | numeric | ✗ |  |  |
| 11 | **voucher_type** | varchar(50) | ✗ |  |  |
| 12 | **voucher_id** | uuid | ✗ |  |  |
| 13 | **voucher_detail_id** | uuid | ✓ |  |  |
| 14 | **posting_date** | date | ✗ |  |  |
| 15 | **posting_time** | time without time zone | ✗ |  |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **tenant_id** | uuid | ✓ |  |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `warehouse_settings` — 23 عمود
**UNIQUE:** tenant_id, company_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  |  |
| 4 | **costing_method** | varchar(20) | ✓ | 'fifo'::character varying |  |
| 5 | **require_dispatch_approval** | boolean | ✓ | true |  |
| 6 | **dispatch_approval_roles** | jsonb | ✓ | '["warehouse_manager"]'::jsonb |  |
| 7 | **default_reservation_hours** | integer | ✓ | 48 |  |
| 8 | **extended_reservation_hours** | integer | ✓ | 168 |  |
| 9 | **deposit_required_for_extended** | boolean | ✓ | true |  |
| 10 | **min_deposit_percent** | numeric | ✓ | 20 |  |
| 11 | **auto_cancel_expired_reservations** | boolean | ✓ | true |  |
| 12 | **warn_dye_lot_mismatch** | boolean | ✓ | true |  |
| 13 | **enforce_same_dye_lot** | boolean | ✓ | false |  |
| 14 | **allow_negative_stock** | boolean | ✓ | false |  |
| 15 | **low_stock_threshold_percent** | numeric | ✓ | 20 |  |
| 16 | **auto_reorder_enabled** | boolean | ✓ | false |  |
| 17 | **barcode_format** | varchar(20) | ✓ | 'CODE128'::character varying |  |
| 18 | **auto_generate_roll_barcode** | boolean | ✓ | true |  |
| 19 | **auto_generate_location_barcode** | boolean | ✓ | true |  |
| 20 | **require_location_scan_on_receive** | boolean | ✓ | false |  |
| 21 | **require_photo_on_receive** | boolean | ✓ | false |  |
| 22 | **created_at** | timestamptz | ✓ | now() |  |
| 23 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `warehouses` — 13 عمود
**UNIQUE:** company_id, code
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **branch_id** | uuid | ✗ |  | → branches.id |
| 4 | **code** | varchar(20) | ✗ |  |  |
| 5 | **name** | varchar(255) | ✗ |  |  |
| 6 | **name_en** | varchar(255) | ✓ |  |  |
| 7 | **warehouse_type** | varchar(20) | ✓ | 'regular'::character varying |  |
| 8 | **address** | text | ✓ |  |  |
| 9 | **is_active** | boolean | ✓ | true |  |
| 10 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 11 | **name_ar** | varchar(200) | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `chk_warehouse_type`

---

# ════════════════════════════════════════════════════════════
# SaaS Platform — منصة SaaS
# ════════════════════════════════════════════════════════════

## `agent_bonuses` — 17 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **bonus_type** | varchar(50) | ✗ |  |  |
| 3 | **name_ar** | varchar(200) | ✗ |  |  |
| 4 | **name_en** | varchar(200) | ✓ |  |  |
| 5 | **description** | text | ✓ |  |  |
| 6 | **condition_type** | varchar(50) | ✗ |  |  |
| 7 | **condition_value** | numeric | ✗ |  |  |
| 8 | **condition_period** | varchar(20) | ✓ |  |  |
| 9 | **bonus_amount** | numeric | ✓ |  |  |
| 10 | **bonus_percent** | numeric | ✓ |  |  |
| 11 | **valid_from** | date | ✓ |  |  |
| 12 | **valid_to** | date | ✓ |  |  |
| 13 | **max_claims** | integer | ✓ |  |  |
| 14 | **max_per_agent** | integer | ✓ | 1 |  |
| 15 | **is_active** | boolean | ✓ | true |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_commission_rules` — 6 عمود
**UNIQUE:** agent_id, rule_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **agent_id** | uuid | ✓ |  | → agents.id |
| 3 | **rule_id** | uuid | ✓ |  | → commission_rules.id |
| 4 | **custom_rate** | numeric | ✓ |  |  |
| 5 | **created_at** | timestamptz | ✓ | now() |  |
| 6 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_commissions` — 24 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **agent_id** | uuid | ✗ |  | → agents.id |
| 4 | **commission_type** | varchar(30) | ✗ |  |  |
| 5 | **base_amount** | numeric | ✗ |  |  |
| 6 | **commission_percent** | numeric | ✗ |  |  |
| 7 | **commission_amount** | numeric | ✗ |  |  |
| 8 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 9 | **period_start** | date | ✓ |  |  |
| 10 | **period_end** | date | ✓ |  |  |
| 11 | **reference_type** | varchar(50) | ✓ |  |  |
| 12 | **reference_id** | uuid | ✓ |  |  |
| 13 | **invoice_number** | varchar(50) | ✓ |  |  |
| 14 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 15 | **auto_approved** | boolean | ✓ | false |  |
| 16 | **approved_at** | timestamptz | ✓ |  |  |
| 17 | **approved_by** | uuid | ✓ |  |  |
| 18 | **approval_notes** | text | ✓ |  |  |
| 19 | **paid_at** | timestamptz | ✓ |  |  |
| 20 | **paid_by** | uuid | ✓ |  |  |
| 21 | **payment_reference** | varchar(100) | ✓ |  |  |
| 22 | **withdrawal_id** | uuid | ✓ |  |  |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_events` — 8 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **event_type** | varchar(50) | ✗ |  |  |
| 4 | **event_data** | jsonb | ✓ | '{}'::jsonb |  |
| 5 | **ip_address** | varchar(45) | ✓ |  |  |
| 6 | **user_agent** | text | ✓ |  |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_messages` — 13 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **direction** | varchar(10) | ✗ |  |  |
| 4 | **subject** | varchar(200) | ✓ |  |  |
| 5 | **message** | text | ✗ |  |  |
| 6 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |
| 7 | **is_read** | boolean | ✓ | false |  |
| 8 | **read_at** | timestamptz | ✓ |  |  |
| 9 | **reply_to_id** | uuid | ✓ |  | → agent_messages.id |
| 10 | **sent_by** | uuid | ✓ |  |  |
| 11 | **sent_by_name** | varchar(200) | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_targets` — 18 عمود
**UNIQUE:** agent_id, period_type, period_start

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **period_type** | varchar(20) | ✗ |  |  |
| 4 | **period_start** | date | ✗ |  |  |
| 5 | **period_end** | date | ✗ |  |  |
| 6 | **target_tenants** | integer | ✓ | 0 |  |
| 7 | **target_revenue** | numeric | ✓ | 0 |  |
| 8 | **target_commissions** | numeric | ✓ | 0 |  |
| 9 | **achieved_tenants** | integer | ✓ | 0 |  |
| 10 | **achieved_revenue** | numeric | ✓ | 0 |  |
| 11 | **achieved_commissions** | numeric | ✓ | 0 |  |
| 12 | **tenants_progress** | numeric | ✓ |  |  |
| 13 | **revenue_progress** | numeric | ✓ |  |  |
| 14 | **bonus_earned** | numeric | ✓ | 0 |  |
| 15 | **bonus_paid** | boolean | ✓ | false |  |
| 16 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_tiers` — 19 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(20) | ✗ |  |  |
| 3 | **name_ar** | varchar(100) | ✗ |  |  |
| 4 | **name_en** | varchar(100) | ✓ |  |  |
| 5 | **min_tenants** | integer | ✓ | 0 |  |
| 6 | **min_revenue** | numeric | ✓ | 0 |  |
| 7 | **commission_percent** | numeric | ✗ |  |  |
| 8 | **recurring_commission_percent** | numeric | ✗ |  |  |
| 9 | **bonus_per_tenant** | numeric | ✓ | 0 |  |
| 10 | **priority_support** | boolean | ✓ | false |  |
| 11 | **dedicated_manager** | boolean | ✓ | false |  |
| 12 | **custom_branding** | boolean | ✓ | false |  |
| 13 | **api_access** | boolean | ✓ | false |  |
| 14 | **badge_color** | varchar(7) | ✓ |  |  |
| 15 | **icon** | varchar(50) | ✓ |  |  |
| 16 | **display_order** | integer | ✓ | 0 |  |
| 17 | **is_active** | boolean | ✓ | true |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agent_withdrawals` — 29 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **amount** | numeric | ✗ |  |  |
| 4 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 5 | **fee_amount** | numeric | ✓ | 0 |  |
| 6 | **net_amount** | numeric | ✗ |  |  |
| 7 | **withdrawal_method** | varchar(50) | ✗ |  |  |
| 8 | **bank_name** | varchar(200) | ✓ |  |  |
| 9 | **bank_account_name** | varchar(200) | ✓ |  |  |
| 10 | **bank_account_number** | varchar(100) | ✓ |  |  |
| 11 | **bank_iban** | varchar(50) | ✓ |  |  |
| 12 | **bank_swift** | varchar(20) | ✓ |  |  |
| 13 | **bank_country** | varchar(100) | ✓ |  |  |
| 14 | **paypal_email** | varchar(200) | ✓ |  |  |
| 15 | **wise_email** | varchar(200) | ✓ |  |  |
| 16 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 17 | **requested_at** | timestamptz | ✓ | now() |  |
| 18 | **approved_at** | timestamptz | ✓ |  |  |
| 19 | **approved_by** | uuid | ✓ |  |  |
| 20 | **processed_at** | timestamptz | ✓ |  |  |
| 21 | **processed_by** | uuid | ✓ |  |  |
| 22 | **completed_at** | timestamptz | ✓ |  |  |
| 23 | **transaction_id** | varchar(200) | ✓ |  |  |
| 24 | **transaction_proof** | text | ✓ |  |  |
| 25 | **agent_notes** | text | ✓ |  |  |
| 26 | **admin_notes** | text | ✓ |  |  |
| 27 | **rejection_reason** | text | ✓ |  |  |
| 28 | **created_at** | timestamptz | ✓ | now() |  |
| 29 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `agents` — 26 عمود
**UNIQUE:** company_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **code** | varchar(20) | ✗ |  |  |
| 4 | **name** | varchar(255) | ✗ |  |  |
| 5 | **name_en** | varchar(255) | ✓ |  |  |
| 6 | **agent_type** | varchar(20) | ✓ | 'salesperson'::character va... |  |
| 7 | **phone** | varchar(50) | ✓ |  |  |
| 8 | **email** | varchar(255) | ✓ |  |  |
| 9 | **address** | text | ✓ |  |  |
| 10 | **account_id** | uuid | ✓ |  | → accounts.id |
| 11 | **user_id** | uuid | ✓ |  |  |
| 12 | **is_active** | boolean | ✓ | true |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **has_white_label** | boolean | ✓ | false |  |
| 15 | **white_label_status** | varchar(20) | ✓ | 'inactive'::character varying |  |
| 16 | **white_label_payment_amount** | numeric | ✓ | 0 |  |
| 17 | **white_label_payment_date** | timestamptz | ✓ |  |  |
| 18 | **white_label_payment_reference** | varchar(200) | ✓ |  |  |
| 19 | **white_label_commission_percent** | numeric | ✓ | 50 |  |
| 20 | **white_label_activated_at** | timestamptz | ✓ |  |  |
| 21 | **white_label_expires_at** | timestamptz | ✓ |  |  |
| 22 | **white_label_suspended_at** | timestamptz | ✓ |  |  |
| 23 | **white_label_suspended_reason** | text | ✓ |  |  |
| 24 | **white_label_approved_at** | timestamptz | ✓ |  |  |
| 25 | **white_label_approved_by** | uuid | ✓ |  |  |
| 26 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `billing_invoices` — 20 عمود
**UNIQUE:** invoice_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **subscription_id** | uuid | ✓ |  | → subscriptions.id |
| 4 | **invoice_number** | varchar(50) | ✗ |  |  |
| 5 | **invoice_date** | date | ✗ | CURRENT_DATE |  |
| 6 | **due_date** | date | ✓ |  |  |
| 7 | **period_start** | date | ✓ |  |  |
| 8 | **period_end** | date | ✓ |  |  |
| 9 | **subtotal** | numeric | ✗ |  |  |
| 10 | **discount_amount** | numeric | ✓ | 0 |  |
| 11 | **tax_amount** | numeric | ✓ | 0 |  |
| 12 | **total_amount** | numeric | ✗ |  |  |
| 13 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 14 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 15 | **paid_at** | timestamptz | ✓ |  |  |
| 16 | **paid_amount** | numeric | ✓ |  |  |
| 17 | **line_items** | jsonb | ✓ | '[]'::jsonb |  |
| 18 | **notes** | text | ✓ |  |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `billing_payments` — 15 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **invoice_id** | uuid | ✓ |  | → billing_invoices.id |
| 4 | **payment_date** | date | ✗ | CURRENT_DATE |  |
| 5 | **amount** | numeric | ✗ |  |  |
| 6 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 7 | **payment_method** | varchar(50) | ✗ |  |  |
| 8 | **transaction_id** | varchar(200) | ✓ |  |  |
| 9 | **gateway** | varchar(50) | ✓ |  |  |
| 10 | **gateway_response** | jsonb | ✓ |  |  |
| 11 | **status** | varchar(20) | ✓ | 'completed'::character varying |  |
| 12 | **notes** | text | ✓ |  |  |
| 13 | **created_by** | uuid | ✓ |  |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `module_features` — 13 عمود
**UNIQUE:** module_code, feature_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **module_code** | varchar(50) | ✗ |  |  |
| 3 | **feature_code** | varchar(100) | ✗ |  |  |
| 4 | **feature_name_ar** | varchar(200) | ✗ |  |  |
| 5 | **feature_name_en** | varchar(200) | ✓ |  |  |
| 6 | **description_ar** | text | ✓ |  |  |
| 7 | **description_en** | text | ✓ |  |  |
| 8 | **icon** | varchar(50) | ✓ |  |  |
| 9 | **category** | varchar(50) | ✓ | 'general'::character varying |  |
| 10 | **display_order** | integer | ✓ | 0 |  |
| 11 | **is_active** | boolean | ✓ | true |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `modules` — 24 عمود
**UNIQUE:** module_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **module_code** | varchar(50) | ✗ |  |  |
| 3 | **name_ar** | varchar(100) | ✗ |  |  |
| 4 | **name_en** | varchar(100) | ✗ |  |  |
| 5 | **name_de** | varchar(100) | ✓ |  |  |
| 6 | **name_tr** | varchar(100) | ✓ |  |  |
| 7 | **name_ru** | varchar(100) | ✓ |  |  |
| 8 | **name_uk** | varchar(100) | ✓ |  |  |
| 9 | **name_it** | varchar(100) | ✓ |  |  |
| 10 | **name_pl** | varchar(100) | ✓ |  |  |
| 11 | **name_ro** | varchar(100) | ✓ |  |  |
| 12 | **description_ar** | text | ✓ |  |  |
| 13 | **description_en** | text | ✓ |  |  |
| 14 | **icon** | varchar(50) | ✓ |  |  |
| 15 | **color** | varchar(50) | ✓ |  |  |
| 16 | **category** | varchar(50) | ✓ | 'general'::character varying |  |
| 17 | **display_order** | integer | ✓ | 0 |  |
| 18 | **is_active** | boolean | ✓ | true |  |
| 19 | **is_core** | boolean | ✓ | false |  |
| 20 | **is_beta** | boolean | ✓ | false |  |
| 21 | **requires_setup** | boolean | ✓ | false |  |
| 22 | **dependencies** | jsonb | ✓ | '[]'::jsonb |  |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `partner_allowed_products` — 9 عمود
**UNIQUE:** partner_id, product_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **partner_id** | uuid | ✗ |  | → partners.id |
| 3 | **product_id** | uuid | ✗ |  | → saas_products.id |
| 4 | **commission_rate** | numeric | ✓ | 0 |  |
| 5 | **can_sell** | boolean | ✓ | true |  |
| 6 | **can_support** | boolean | ✓ | false |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **created_by** | uuid | ✓ |  |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `partners` — 15 عمود
**UNIQUE:** code | email
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name** | varchar(200) | ✗ |  |  |
| 4 | **name_ar** | varchar(200) | ✓ |  |  |
| 5 | **email** | varchar(200) | ✗ |  |  |
| 6 | **phone** | varchar(50) | ✓ |  |  |
| 7 | **partner_type** | varchar(20) | ✗ | 'reseller'::character varying |  |
| 8 | **commission_rate** | numeric | ✓ | 10.00 |  |
| 9 | **country** | varchar(100) | ✓ |  |  |
| 10 | **website** | varchar(200) | ✓ |  |  |
| 11 | **logo_url** | text | ✓ |  |  |
| 12 | **settings** | jsonb | ✓ | '{}'::jsonb |  |
| 13 | **is_active** | boolean | ✓ | true |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `partners_partner_type_check`

---

## `plan_module_features` — 8 عمود
**UNIQUE:** plan_id, module_code, feature_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **plan_id** | uuid | ✗ |  | → subscription_plans.id |
| 3 | **module_code** | varchar(50) | ✗ |  |  |
| 4 | **feature_code** | varchar(100) | ✗ |  |  |
| 5 | **is_enabled** | boolean | ✓ | true |  |
| 6 | **notes** | text | ✓ |  |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `plan_modules` — 8 عمود
**UNIQUE:** plan_id, module_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **plan_id** | uuid | ✗ |  | → subscription_plans.id |
| 3 | **module_id** | uuid | ✗ |  | → system_modules.id |
| 4 | **is_enabled** | boolean | ✓ | true |  |
| 5 | **is_core** | boolean | ✓ | false |  |
| 6 | **display_order** | integer | ✓ | 0 |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `plan_ui_tabs` — 6 عمود
**UNIQUE:** plan_id, tab_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **plan_id** | uuid | ✗ |  | → subscription_plans.id |
| 3 | **tab_code** | varchar(100) | ✗ |  | → ui_tabs.tab_code |
| 4 | **is_included** | boolean | ✓ | true |  |
| 5 | **created_at** | timestamptz | ✓ | now() |  |
| 6 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `saas_events` — 9 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **event_type** | varchar(50) | ✗ |  |  |
| 4 | **event_data** | jsonb | ✓ | '{}'::jsonb |  |
| 5 | **actor_type** | varchar(20) | ✓ |  |  |
| 6 | **actor_id** | uuid | ✓ |  |  |
| 7 | **ip_address** | varchar(45) | ✓ |  |  |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `saas_payments` — 28 عمود
**UNIQUE:** payment_number
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **payment_number** | varchar(50) | ✗ |  |  |
| 3 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 4 | **subscription_id** | uuid | ✓ |  | → tenant_subscriptions.id |
| 5 | **plan_id** | uuid | ✓ |  | → subscription_plans.id |
| 6 | **amount** | numeric | ✗ |  |  |
| 7 | **currency** | varchar(3) | ✗ | 'USD'::character varying |  |
| 8 | **payment_type** | varchar(20) | ✗ | 'subscription'::character v... |  |
| 9 | **payment_method** | varchar(30) | ✗ |  |  |
| 10 | **status** | varchar(20) | ✗ | 'pending'::character varying |  |
| 11 | **collected_by** | uuid | ✓ |  |  |
| 12 | **collection_date** | timestamptz | ✓ |  |  |
| 13 | **account_id** | uuid | ✓ |  |  |
| 14 | **account_name** | varchar(100) | ✓ |  |  |
| 15 | **reference_number** | varchar(100) | ✓ |  |  |
| 16 | **period_start** | date | ✓ |  |  |
| 17 | **period_end** | date | ✓ |  |  |
| 18 | **notes** | text | ✓ |  |  |
| 19 | **attachment_url** | text | ✓ |  |  |
| 20 | **metadata** | jsonb | ✓ |  |  |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |
| 23 | **created_by** | uuid | ✓ |  |  |
| 24 | **updated_by** | uuid | ✓ |  |  |
| 25 | **product_id** | uuid | ✓ |  | → saas_products.id |
| 26 | **bank_account_id** | uuid | ✓ |  |  |
| 27 | **wallet_id** | uuid | ✓ |  |  |
| 28 | **receipt_url** | text | ✓ |  |  |

**CHECK Constraints:**
- `saas_payments_amount_check`

---

## `saas_products` — 15 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name** | varchar(100) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✓ |  |  |
| 5 | **domain** | varchar(200) | ✓ |  |  |
| 6 | **logo_url** | text | ✓ |  |  |
| 7 | **primary_color** | varchar(7) | ✓ | '#3B82F6'::character varying |  |
| 8 | **default_modules** | ARRAY | ✓ | '{}'::text[] |  |
| 9 | **description** | text | ✓ |  |  |
| 10 | **is_active** | boolean | ✓ | true |  |
| 11 | **display_order** | integer | ✓ | 0 |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |
| 14 | **secondary_color** | varchar(20) | ✓ |  |  |
| 15 | **favicon_url** | text | ✓ |  |  |

---

## `saas_settings` — 19 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **enable_alerts** | boolean | ✓ | true |  |
| 3 | **alert_days_before** | jsonb | ✓ | '[7, 3, 1]'::jsonb |  |
| 4 | **send_email_alerts** | boolean | ✓ | true |  |
| 5 | **send_sms_alerts** | boolean | ✓ | false |  |
| 6 | **default_billing_mode** | varchar(20) | ✓ | 'flexible'::character varying |  |
| 7 | **default_minimum_days** | integer | ✓ | 7 |  |
| 8 | **default_grace_period_days** | integer | ✓ | 3 |  |
| 9 | **auto_suspend_after_grace** | boolean | ✓ | true |  |
| 10 | **create_accounting_entries** | boolean | ✓ | true |  |
| 11 | **default_revenue_account_code** | varchar(20) | ✓ | '4010001'::character varying |  |
| 12 | **default_cash_account_code** | varchar(20) | ✓ | '1010001'::character varying |  |
| 13 | **default_bank_account_code** | varchar(20) | ✓ | '1020001'::character varying |  |
| 14 | **default_currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 15 | **allow_partial_payments** | boolean | ✓ | true |  |
| 16 | **allow_overpayments** | boolean | ✓ | true |  |
| 17 | **metadata** | jsonb | ✓ | '{}'::jsonb |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `storage_quotas` — 8 عمود
**UNIQUE:** tenant_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **max_storage_bytes** | bigint | ✓ | '5368709120'::bigint |  |
| 4 | **used_storage_bytes** | bigint | ✓ | 0 |  |
| 5 | **max_files_count** | integer | ✓ | 1000 |  |
| 6 | **current_files_count** | integer | ✓ | 0 |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `subscription_alerts` — 15 عمود
**CHECK:** 2 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **subscription_id** | uuid | ✗ |  | → tenant_subscriptions.id |
| 4 | **alert_type** | varchar(30) | ✗ |  |  |
| 5 | **alert_date** | date | ✗ |  |  |
| 6 | **days_remaining** | integer | ✓ |  |  |
| 7 | **amount_due** | numeric | ✓ |  |  |
| 8 | **message_ar** | text | ✓ |  |  |
| 9 | **message_en** | text | ✓ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 11 | **sent_at** | timestamptz | ✓ |  |  |
| 12 | **sent_to** | varchar(200) | ✓ |  |  |
| 13 | **metadata** | jsonb | ✓ |  |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `valid_alert_type`
- `valid_alert_status`

---

## `subscription_plans` — 36 عمود
**UNIQUE:** product_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **product_id** | uuid | ✓ |  | → saas_products.id |
| 3 | **code** | varchar(50) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **description** | text | ✓ |  |  |
| 7 | **max_users** | integer | ✓ | 5 |  |
| 8 | **max_companies** | integer | ✓ | 1 |  |
| 9 | **max_branches** | integer | ✓ | 3 |  |
| 10 | **max_warehouses** | integer | ✓ | 5 |  |
| 11 | **max_products** | integer | ✓ | 1000 |  |
| 12 | **max_invoices_monthly** | integer | ✓ | 500 |  |
| 13 | **storage_gb** | integer | ✓ | 5 |  |
| 14 | **included_modules** | ARRAY | ✓ | '{}'::text[] |  |
| 15 | **features** | jsonb | ✓ | '{}'::jsonb |  |
| 16 | **price_monthly** | numeric | ✓ |  |  |
| 17 | **price_yearly** | numeric | ✓ |  |  |
| 18 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 19 | **trial_days** | integer | ✓ | 14 |  |
| 20 | **is_popular** | boolean | ✓ | false |  |
| 21 | **display_order** | integer | ✓ | 0 |  |
| 22 | **is_active** | boolean | ✓ | true |  |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **max_languages** | integer | ✓ | 2 |  |
| 25 | **additional_language_price** | numeric | ✓ | 0 |  |
| 26 | **price_daily** | numeric | ✓ |  |  |
| 27 | **billing_mode** | varchar(20) | ✓ | 'flexible'::character varying |  |
| 28 | **minimum_days** | integer | ✓ | 7 |  |
| 29 | **grace_period_days** | integer | ✓ | 3 |  |
| 30 | **is_archived** | boolean | ✓ | false |  |
| 31 | **archived_at** | timestamptz | ✓ |  |  |
| 32 | **updated_at** | timestamptz | ✓ | now() |  |
| 33 | **max_customers** | integer | ✓ | 0 |  |
| 34 | **max_documents** | integer | ✓ | 0 |  |
| 35 | **max_images** | integer | ✓ | 0 |  |
| 36 | **max_records** | integer | ✓ | 0 |  |

---

## `subscriptions` — 21 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **product_id** | uuid | ✗ |  | → saas_products.id |
| 4 | **plan_id** | uuid | ✗ |  | → subscription_plans.id |
| 5 | **status** | varchar(20) | ✓ | 'trial'::character varying |  |
| 6 | **trial_started_at** | timestamptz | ✓ | now() |  |
| 7 | **trial_ends_at** | timestamptz | ✓ |  |  |
| 8 | **current_period_start** | timestamptz | ✓ |  |  |
| 9 | **current_period_end** | timestamptz | ✓ |  |  |
| 10 | **billing_cycle** | varchar(20) | ✓ | 'monthly'::character varying |  |
| 11 | **cancel_at_period_end** | boolean | ✓ | false |  |
| 12 | **cancelled_at** | timestamptz | ✓ |  |  |
| 13 | **cancel_reason** | text | ✓ |  |  |
| 14 | **payment_method** | varchar(50) | ✓ |  |  |
| 15 | **amount** | numeric | ✓ |  |  |
| 16 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 17 | **discount_percent** | numeric | ✓ | 0 |  |
| 18 | **discount_ends_at** | timestamptz | ✓ |  |  |
| 19 | **notes** | text | ✓ |  |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `system_modules` — 16 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name_ar** | varchar(100) | ✗ |  |  |
| 4 | **name_en** | varchar(100) | ✓ |  |  |
| 5 | **description** | text | ✓ |  |  |
| 6 | **icon** | varchar(50) | ✓ |  |  |
| 7 | **category** | varchar(50) | ✗ | 'basic'::character varying |  |
| 8 | **dependencies** | ARRAY | ✓ | '{}'::text[] |  |
| 9 | **is_core** | boolean | ✓ | false |  |
| 10 | **price_monthly** | numeric | ✓ | 0 |  |
| 11 | **price_yearly** | numeric | ✓ | 0 |  |
| 12 | **available_in_products** | ARRAY | ✓ | ARRAY['*'::text] |  |
| 13 | **display_order** | integer | ✓ | 0 |  |
| 14 | **is_active** | boolean | ✓ | true |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `tenant_referrals` — 11 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **referrer_tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **referrer_code** | varchar(50) | ✗ |  |  |
| 4 | **referee_tenant_id** | uuid | ✗ |  | → tenants.id |
| 5 | **referrer_reward** | numeric | ✓ |  |  |
| 6 | **referrer_rewarded** | boolean | ✓ | false |  |
| 7 | **referrer_rewarded_at** | timestamptz | ✓ |  |  |
| 8 | **referee_reward** | numeric | ✓ |  |  |
| 9 | **referee_rewarded** | boolean | ✓ | false |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `tenant_subscriptions` — 23 عمود
**CHECK:** 2 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **plan_id** | uuid | ✗ |  | → subscription_plans.id |
| 4 | **status** | varchar(20) | ✗ | 'pending'::character varying |  |
| 5 | **start_date** | date | ✗ | CURRENT_DATE |  |
| 6 | **end_date** | date | ✗ |  |  |
| 7 | **trial_end_date** | date | ✓ |  |  |
| 8 | **billing_cycle** | varchar(20) | ✓ | 'monthly'::character varying |  |
| 9 | **next_billing_date** | date | ✓ |  |  |
| 10 | **notes** | text | ✓ |  |  |
| 11 | **metadata** | jsonb | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |
| 14 | **created_by** | uuid | ✓ |  |  |
| 15 | **updated_by** | uuid | ✓ |  |  |
| 16 | **total_days_purchased** | integer | ✓ | 0 |  |
| 17 | **days_used** | integer | ✓ | 0 |  |
| 18 | **last_payment_date** | date | ✓ |  |  |
| 19 | **last_payment_amount** | numeric | ✓ |  |  |
| 20 | **remaining_balance** | numeric | ✓ | 0 |  |
| 21 | **grace_period_end** | date | ✓ |  |  |
| 22 | **auto_renew** | boolean | ✓ | false |  |
| 23 | **renewal_notification_sent** | boolean | ✓ | false |  |

**CHECK Constraints:**
- `valid_status`
- `valid_dates`

---

## `ui_tabs` — 14 عمود
**UNIQUE:** tab_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tab_code** | varchar(100) | ✗ |  |  |
| 3 | **module_code** | varchar(50) | ✓ |  |  |
| 4 | **section_code** | varchar(100) | ✗ |  |  |
| 5 | **tab_name_ar** | varchar(200) | ✗ |  |  |
| 6 | **tab_name_en** | varchar(200) | ✓ |  |  |
| 7 | **icon** | varchar(50) | ✓ |  |  |
| 8 | **display_order** | integer | ✓ | 0 |  |
| 9 | **required_feature_code** | varchar(100) | ✓ |  |  |
| 10 | **min_plan_level** | varchar(20) | ✓ |  |  |
| 11 | **is_active** | boolean | ✓ | true |  |
| 12 | **is_core** | boolean | ✓ | false |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `white_label_configs` — 34 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **brand_name** | varchar(200) | ✓ |  |  |
| 4 | **brand_name_en** | varchar(200) | ✓ |  |  |
| 5 | **brand_slogan_ar** | text | ✓ |  |  |
| 6 | **brand_slogan_en** | text | ✓ |  |  |
| 7 | **logo_url** | text | ✓ |  |  |
| 8 | **logo_dark_url** | text | ✓ |  |  |
| 9 | **favicon_url** | text | ✓ |  |  |
| 10 | **primary_color** | varchar(7) | ✓ | '#0A2540'::character varying |  |
| 11 | **secondary_color** | varchar(7) | ✓ | '#f59e0b'::character varying |  |
| 12 | **accent_color** | varchar(7) | ✓ |  |  |
| 13 | **background_color** | varchar(7) | ✓ | '#FFFFFF'::character varying |  |
| 14 | **contact_email** | varchar(200) | ✓ |  |  |
| 15 | **contact_phone** | varchar(50) | ✓ |  |  |
| 16 | **contact_whatsapp** | varchar(50) | ✓ |  |  |
| 17 | **support_email** | varchar(200) | ✓ |  |  |
| 18 | **support_phone** | varchar(50) | ✓ |  |  |
| 19 | **address** | text | ✓ |  |  |
| 20 | **city** | varchar(100) | ✓ |  |  |
| 21 | **country** | varchar(100) | ✓ |  |  |
| 22 | **website_url** | text | ✓ |  |  |
| 23 | **facebook_url** | text | ✓ |  |  |
| 24 | **twitter_url** | text | ✓ |  |  |
| 25 | **linkedin_url** | text | ✓ |  |  |
| 26 | **instagram_url** | text | ✓ |  |  |
| 27 | **custom_css** | text | ✓ |  |  |
| 28 | **custom_js** | text | ✓ |  |  |
| 29 | **footer_text_ar** | text | ✓ |  |  |
| 30 | **footer_text_en** | text | ✓ |  |  |
| 31 | **default_language** | varchar(5) | ✓ | 'ar'::character varying |  |
| 32 | **is_active** | boolean | ✓ | true |  |
| 33 | **created_at** | timestamptz | ✓ | now() |  |
| 34 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `white_label_domains` — 17 عمود
**UNIQUE:** domain

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **domain** | varchar(255) | ✗ |  |  |
| 4 | **domain_type** | varchar(20) | ✓ | 'subdomain'::character varying |  |
| 5 | **ssl_enabled** | boolean | ✓ | false |  |
| 6 | **ssl_certificate** | text | ✓ |  |  |
| 7 | **ssl_key** | text | ✓ |  |  |
| 8 | **ssl_expires_at** | timestamptz | ✓ |  |  |
| 9 | **dns_configured** | boolean | ✓ | false |  |
| 10 | **dns_records** | jsonb | ✓ | '[]'::jsonb |  |
| 11 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 12 | **verified** | boolean | ✓ | false |  |
| 13 | **verified_at** | timestamptz | ✓ |  |  |
| 14 | **verification_token** | varchar(100) | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |
| 17 | **activated_at** | timestamptz | ✓ |  |  |

---

## `white_label_payments` — 20 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **amount** | numeric | ✗ |  |  |
| 4 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 5 | **payment_type** | varchar(50) | ✓ | 'one_time'::character varying |  |
| 6 | **period_months** | integer | ✓ | 12 |  |
| 7 | **valid_from** | timestamptz | ✓ |  |  |
| 8 | **valid_to** | timestamptz | ✓ |  |  |
| 9 | **payment_method** | varchar(50) | ✓ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 11 | **payment_reference** | varchar(200) | ✓ |  |  |
| 12 | **transaction_id** | varchar(200) | ✓ |  |  |
| 13 | **receipt_url** | text | ✓ |  |  |
| 14 | **paid_at** | timestamptz | ✓ |  |  |
| 15 | **processed_at** | timestamptz | ✓ |  |  |
| 16 | **processed_by** | uuid | ✓ |  |  |
| 17 | **notes** | text | ✓ |  |  |
| 18 | **admin_notes** | text | ✓ |  |  |
| 19 | **created_at** | timestamptz | ✓ | now() |  |
| 20 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `white_label_stats` — 15 عمود
**UNIQUE:** agent_id, period_date

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **agent_id** | uuid | ✗ |  | → agents.id |
| 3 | **period_date** | date | ✗ |  |  |
| 4 | **total_tenants** | integer | ✓ | 0 |  |
| 5 | **new_tenants** | integer | ✓ | 0 |  |
| 6 | **active_tenants** | integer | ✓ | 0 |  |
| 7 | **total_revenue** | numeric | ✓ | 0 |  |
| 8 | **agent_commission** | numeric | ✓ | 0 |  |
| 9 | **platform_revenue** | numeric | ✓ | 0 |  |
| 10 | **website_visits** | integer | ✓ | 0 |  |
| 11 | **signup_conversions** | integer | ✓ | 0 |  |
| 12 | **conversion_rate** | numeric | ✓ | 0 |  |
| 13 | **details** | jsonb | ✓ | '{}'::jsonb |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# CRM — إدارة علاقات العملاء
# ════════════════════════════════════════════════════════════

## `call_analyses` — 9 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **call_id** | uuid | ✓ |  | → call_logs.id |
| 3 | **summary** | text | ✓ |  |  |
| 4 | **customer_mood** | varchar(50) | ✓ |  |  |
| 5 | **category** | varchar(50) | ✓ |  |  |
| 6 | **action_required** | boolean | ✓ | false |  |
| 7 | **transcript** | text | ✓ |  |  |
| 8 | **ai_model** | varchar(50) | ✓ | 'gemini-2.0-flash'::charact... |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |

---

## `call_logs` — 14 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **external_id** | varchar(100) | ✓ |  |  |
| 4 | **caller_number** | varchar(50) | ✓ |  |  |
| 5 | **receiver_number** | varchar(50) | ✓ |  |  |
| 6 | **direction** | varchar(20) | ✓ |  |  |
| 7 | **duration** | integer | ✓ |  |  |
| 8 | **status** | varchar(20) | ✓ |  |  |
| 9 | **recording_url** | text | ✓ |  |  |
| 10 | **started_at** | timestamptz | ✓ |  |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **contact_id** | uuid | ✓ |  | → contacts.id |
| 13 | **customer_id** | uuid | ✓ |  | → customers.id |
| 14 | **notes** | text | ✓ |  |  |

---

## `contact_interactions` — 16 عمود
**CHECK:** 3 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **contact_id** | uuid | ✗ |  | → contacts.id |
| 4 | **interaction_type** | varchar(30) | ✗ |  |  |
| 5 | **direction** | varchar(10) | ✓ |  |  |
| 6 | **subject** | varchar(200) | ✓ |  |  |
| 7 | **content** | text | ✓ |  |  |
| 8 | **call_log_id** | uuid | ✓ |  | → call_logs.id |
| 9 | **duration_seconds** | integer | ✓ |  |  |
| 10 | **outcome** | varchar(50) | ✓ |  |  |
| 11 | **scheduled_at** | timestamptz | ✓ |  |  |
| 12 | **completed_at** | timestamptz | ✓ |  |  |
| 13 | **reminder_at** | timestamptz | ✓ |  |  |
| 14 | **metadata** | jsonb | ✓ | '{}'::jsonb |  |
| 15 | **performed_by** | uuid | ✓ |  | → user_profiles.id |
| 16 | **created_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `contact_interactions_direction_check`
- `contact_interactions_outcome_check`
- `contact_interactions_interaction_type_check`

---

## `contacts` — 50 عمود
**CHECK:** 6 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **first_name** | varchar(100) | ✓ |  |  |
| 5 | **last_name** | varchar(100) | ✓ |  |  |
| 6 | **name_ar** | varchar(200) | ✓ |  |  |
| 7 | **name_en** | varchar(200) | ✓ |  |  |
| 8 | **name_ru** | varchar(200) | ✓ |  |  |
| 9 | **name_uk** | varchar(200) | ✓ |  |  |
| 10 | **name_ro** | varchar(200) | ✓ |  |  |
| 11 | **name_pl** | varchar(200) | ✓ |  |  |
| 12 | **name_tr** | varchar(200) | ✓ |  |  |
| 13 | **name_de** | varchar(200) | ✓ |  |  |
| 14 | **name_it** | varchar(200) | ✓ |  |  |
| 15 | **display_name** | varchar(200) | ✓ |  |  |
| 16 | **organization** | varchar(200) | ✓ |  |  |
| 17 | **job_title** | varchar(100) | ✓ |  |  |
| 18 | **email** | varchar(200) | ✓ |  |  |
| 19 | **phone** | varchar(50) | ✓ |  |  |
| 20 | **mobile** | varchar(50) | ✓ |  |  |
| 21 | **whatsapp** | varchar(50) | ✓ |  |  |
| 22 | **telegram_username** | varchar(100) | ✓ |  |  |
| 23 | **telegram_chat_id** | bigint | ✓ |  |  |
| 24 | **country** | varchar(100) | ✓ |  |  |
| 25 | **city** | varchar(100) | ✓ |  |  |
| 26 | **address** | text | ✓ |  |  |
| 27 | **source** | varchar(50) | ✗ | 'manual'::character varying |  |
| 28 | **source_details** | jsonb | ✓ | '{}'::jsonb |  |
| 29 | **contact_type** | varchar(30) | ✓ | 'lead'::character varying |  |
| 30 | **lifecycle_stage** | varchar(30) | ✓ | 'new'::character varying |  |
| 31 | **lost_reason** | varchar(200) | ✓ |  |  |
| 32 | **priority** | varchar(10) | ✓ | 'medium'::character varying |  |
| 33 | **lead_score** | integer | ✓ | 0 |  |
| 34 | **assigned_to** | uuid | ✓ |  | → user_profiles.id |
| 35 | **converted_customer_id** | uuid | ✓ |  | → customers.id |
| 36 | **converted_at** | timestamptz | ✓ |  |  |
| 37 | **converted_by** | uuid | ✓ |  | → user_profiles.id |
| 38 | **last_interaction_at** | timestamptz | ✓ |  |  |
| 39 | **last_interaction_type** | varchar(50) | ✓ |  |  |
| 40 | **interaction_count** | integer | ✓ | 0 |  |
| 41 | **last_call_at** | timestamptz | ✓ |  |  |
| 42 | **total_calls** | integer | ✓ | 0 |  |
| 43 | **tags** | jsonb | ✓ | '[]'::jsonb |  |
| 44 | **notes** | text | ✓ |  |  |
| 45 | **custom_fields** | jsonb | ✓ | '{}'::jsonb |  |
| 46 | **avatar_url** | text | ✓ |  |  |
| 47 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 48 | **created_by** | uuid | ✓ |  | → user_profiles.id |
| 49 | **created_at** | timestamptz | ✓ | now() |  |
| 50 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `contacts_status_check`
- `contacts_contact_type_check`
- `contacts_lifecycle_stage_check`
- `contacts_priority_check`
- `contacts_lead_score_check`
- `contacts_source_check`

---

# ════════════════════════════════════════════════════════════
# E-Commerce — التجارة الإلكترونية
# ════════════════════════════════════════════════════════════

## `coupon_usage` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **coupon_id** | uuid | ✗ |  |  |
| 3 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 4 | **subscription_id** | uuid | ✓ |  |  |
| 5 | **original_amount** | numeric | ✗ |  |  |
| 6 | **discount_amount** | numeric | ✗ |  |  |
| 7 | **final_amount** | numeric | ✗ |  |  |
| 8 | **used_at** | timestamptz | ✓ | now() |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `guest_checkouts` — 19 عمود
**UNIQUE:** tenant_id, session_id, email

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **session_id** | varchar(255) | ✗ |  |  |
| 5 | **email** | varchar(255) | ✗ |  |  |
| 6 | **full_name** | varchar(200) | ✗ |  |  |
| 7 | **phone** | varchar(50) | ✗ |  |  |
| 8 | **shipping_address** | jsonb | ✗ |  |  |
| 9 | **billing_address** | jsonb | ✓ |  |  |
| 10 | **same_as_shipping** | boolean | ✓ | true |  |
| 11 | **notes** | text | ✓ |  |  |
| 12 | **ip_address** | varchar(45) | ✓ |  |  |
| 13 | **user_agent** | text | ✓ |  |  |
| 14 | **status** | varchar(50) | ✓ | 'pending'::character varying |  |
| 15 | **converted_to_customer_id** | uuid | ✓ |  | → customers.id |
| 16 | **converted_at** | timestamptz | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **expires_at** | timestamptz | ✓ | (now() + '7 days'::interval) |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `order_items` — 16 عمود
**UNIQUE:** order_id, product_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **order_id** | uuid | ✗ |  | → orders.id |
| 5 | **product_id** | uuid | ✗ |  | → products.id |
| 6 | **product_name** | varchar(200) | ✗ |  |  |
| 7 | **product_sku** | varchar(100) | ✓ |  |  |
| 8 | **product_image_url** | text | ✓ |  |  |
| 9 | **quantity** | numeric | ✗ |  |  |
| 10 | **unit_price** | numeric | ✗ |  |  |
| 11 | **discount_amount** | numeric | ✓ | 0 |  |
| 12 | **tax_amount** | numeric | ✓ | 0 |  |
| 13 | **total_price** | numeric | ✗ |  |  |
| 14 | **notes** | text | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `orders` — 27 عمود
**UNIQUE:** tenant_id, company_id, order_number
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **order_number** | varchar(50) | ✗ |  |  |
| 5 | **customer_id** | uuid | ✓ |  | → customers.id |
| 6 | **guest_checkout_id** | uuid | ✓ |  | → guest_checkouts.id |
| 7 | **cart_id** | uuid | ✓ |  | → shopping_carts.id |
| 8 | **subtotal** | numeric | ✗ | 0 |  |
| 9 | **discount_amount** | numeric | ✓ | 0 |  |
| 10 | **tax_amount** | numeric | ✓ | 0 |  |
| 11 | **shipping_amount** | numeric | ✓ | 0 |  |
| 12 | **total_amount** | numeric | ✗ | 0 |  |
| 13 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 14 | **status** | varchar(50) | ✓ | 'pending'::character varying |  |
| 15 | **payment_status** | varchar(50) | ✓ | 'pending'::character varying |  |
| 16 | **payment_method** | varchar(50) | ✓ |  |  |
| 17 | **payment_transaction_id** | varchar(255) | ✓ |  |  |
| 18 | **paid_at** | timestamptz | ✓ |  |  |
| 19 | **shipping_method** | varchar(100) | ✓ |  |  |
| 20 | **tracking_number** | varchar(255) | ✓ |  |  |
| 21 | **shipped_at** | timestamptz | ✓ |  |  |
| 22 | **delivered_at** | timestamptz | ✓ |  |  |
| 23 | **customer_notes** | text | ✓ |  |  |
| 24 | **admin_notes** | text | ✓ |  |  |
| 25 | **created_at** | timestamptz | ✓ | now() |  |
| 26 | **updated_at** | timestamptz | ✓ | now() |  |
| 27 | **cancelled_at** | timestamptz | ✓ |  |  |

**CHECK Constraints:**
- `orders_check`

---

## `promotional_discounts` — 23 عمود
**UNIQUE:** code
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name_ar** | varchar(200) | ✗ |  |  |
| 4 | **name_en** | varchar(200) | ✓ |  |  |
| 5 | **name_de** | varchar(200) | ✓ |  |  |
| 6 | **name_tr** | varchar(200) | ✓ |  |  |
| 7 | **name_ru** | varchar(200) | ✓ |  |  |
| 8 | **name_uk** | varchar(200) | ✓ |  |  |
| 9 | **name_it** | varchar(200) | ✓ |  |  |
| 10 | **name_pl** | varchar(200) | ✓ |  |  |
| 11 | **name_ro** | varchar(200) | ✓ |  |  |
| 12 | **description** | text | ✓ |  |  |
| 13 | **discount_percentage** | integer | ✗ |  |  |
| 14 | **valid_from** | timestamptz | ✗ |  |  |
| 15 | **valid_to** | timestamptz | ✗ |  |  |
| 16 | **applicable_plans** | jsonb | ✓ | '[]'::jsonb |  |
| 17 | **applies_to** | varchar(20) | ✓ | 'both'::character varying |  |
| 18 | **is_active** | boolean | ✓ | true |  |
| 19 | **auto_apply** | boolean | ✓ | true |  |
| 20 | **priority** | integer | ✓ | 0 |  |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **created_by** | uuid | ✓ |  |  |
| 23 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `promotional_discounts_discount_percentage_check`

---

## `qr_codes` — 8 عمود
**UNIQUE:** tenant_id, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **code** | varchar(100) | ✗ |  |  |
| 4 | **entity_type** | varchar(50) | ✗ |  |  |
| 5 | **entity_id** | uuid | ✗ |  |  |
| 6 | **current_status** | varchar(50) | ✓ | 'active'::character varying |  |
| 7 | **generated_by** | uuid | ✓ |  | → user_profiles.id |
| 8 | **created_at** | timestamptz | ✓ | now() |  |

---

## `qr_scans` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **qr_code_id** | uuid | ✓ |  | → qr_codes.id |
| 4 | **scanned_by_telegram_id** | bigint | ✓ |  |  |
| 5 | **scanned_by_user_id** | uuid | ✓ |  | → user_profiles.id |
| 6 | **action_type** | varchar(50) | ✓ |  |  |
| 7 | **prev_status** | varchar(50) | ✓ |  |  |
| 8 | **new_status** | varchar(50) | ✓ |  |  |
| 9 | **location_data** | jsonb | ✓ |  |  |
| 10 | **scanned_at** | timestamptz | ✓ | now() |  |

---

## `shopping_cart_items` — 16 عمود
**UNIQUE:** cart_id, product_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **cart_id** | uuid | ✗ |  | → shopping_carts.id |
| 3 | **product_id** | uuid | ✗ |  | → products.id |
| 4 | **product_variant_id** | uuid | ✓ |  |  |
| 5 | **quantity** | numeric | ✗ | 1 |  |
| 6 | **unit_price** | numeric | ✗ |  |  |
| 7 | **original_price** | numeric | ✓ |  |  |
| 8 | **discount_percent** | numeric | ✓ | 0 |  |
| 9 | **discount_amount** | numeric | ✓ | 0 |  |
| 10 | **subtotal** | numeric | ✓ |  |  |
| 11 | **notes** | text | ✓ |  |  |
| 12 | **custom_options** | jsonb | ✓ | '{}'::jsonb |  |
| 13 | **price_changed** | boolean | ✓ | false |  |
| 14 | **availability_changed** | boolean | ✓ | false |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `shopping_carts` — 18 عمود
**UNIQUE:** tenant_id, customer_id, status
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✓ |  | → companies.id |
| 4 | **customer_id** | uuid | ✓ |  | → customers.id |
| 5 | **session_id** | varchar(255) | ✓ |  |  |
| 6 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 7 | **subtotal** | numeric | ✓ | 0 |  |
| 8 | **discount_amount** | numeric | ✓ | 0 |  |
| 9 | **tax_amount** | numeric | ✓ | 0 |  |
| 10 | **total_amount** | numeric | ✓ | 0 |  |
| 11 | **promo_code** | varchar(50) | ✓ |  |  |
| 12 | **promo_discount** | numeric | ✓ | 0 |  |
| 13 | **currency** | varchar(3) | ✓ | 'USD'::character varying |  |
| 14 | **expires_at** | timestamptz | ✓ |  |  |
| 15 | **abandoned_at** | timestamptz | ✓ |  |  |
| 16 | **converted_at** | timestamptz | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `shopping_carts_check`

---

# ════════════════════════════════════════════════════════════
# Workflow & Status — سير العمل
# ════════════════════════════════════════════════════════════

## `custom_statuses` — 19 عمود
**UNIQUE:** tenant_id, doc_type, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **group_id** | uuid | ✓ |  | → status_groups.id |
| 4 | **doc_type** | varchar(50) | ✗ |  |  |
| 5 | **code** | varchar(50) | ✗ |  |  |
| 6 | **name_ar** | varchar(100) | ✗ |  |  |
| 7 | **name_en** | varchar(100) | ✓ |  |  |
| 8 | **color** | varchar(20) | ✓ | 'gray'::character varying |  |
| 9 | **icon** | varchar(50) | ✓ |  |  |
| 10 | **sort_order** | integer | ✓ | 0 |  |
| 11 | **is_system** | boolean | ✓ | false |  |
| 12 | **is_initial** | boolean | ✓ | false |  |
| 13 | **is_final** | boolean | ✓ | false |  |
| 14 | **time_norm_hours** | integer | ✓ |  |  |
| 15 | **can_view_roles** | ARRAY | ✓ | ARRAY['admin'::text, 'manag... |  |
| 16 | **can_set_roles** | ARRAY | ✓ | ARRAY['admin'::text, 'manag... |  |
| 17 | **auto_actions** | jsonb | ✓ | '[]'::jsonb |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `document_approval_requests` — 19 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **company_id** | uuid | ✗ |  |  |
| 4 | **doc_type** | text | ✗ |  |  |
| 5 | **doc_id** | uuid | ✗ |  |  |
| 6 | **doc_number** | text | ✓ |  |  |
| 7 | **requested_by** | uuid | ✗ |  |  |
| 8 | **requested_at** | timestamptz | ✓ | now() |  |
| 9 | **request_notes** | text | ✓ |  |  |
| 10 | **status** | text | ✓ | 'pending'::text |  |
| 11 | **reviewed_by** | uuid | ✓ |  |  |
| 12 | **reviewed_at** | timestamptz | ✓ |  |  |
| 13 | **review_notes** | text | ✓ |  |  |
| 14 | **total_amount** | numeric | ✓ | 0 |  |
| 15 | **currency** | text | ✓ | 'USD'::text |  |
| 16 | **notification_sent** | boolean | ✓ | false |  |
| 17 | **notification_id** | uuid | ✓ |  |  |
| 18 | **created_at** | timestamptz | ✓ | now() |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `documents` — 12 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **entity_type** | varchar(50) | ✗ |  |  |
| 4 | **entity_id** | uuid | ✗ |  |  |
| 5 | **file_name** | varchar(255) | ✗ |  |  |
| 6 | **file_size** | bigint | ✗ |  |  |
| 7 | **storage_path** | text | ✗ |  |  |
| 8 | **category** | varchar(50) | ✓ |  |  |
| 9 | **uploaded_by** | uuid | ✓ |  |  |
| 10 | **is_active** | boolean | ✓ | true |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `status_groups` — 10 عمود
**UNIQUE:** tenant_id, doc_type, code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **doc_type** | varchar(50) | ✗ |  |  |
| 4 | **code** | varchar(50) | ✗ |  |  |
| 5 | **name_ar** | varchar(100) | ✗ |  |  |
| 6 | **name_en** | varchar(100) | ✓ |  |  |
| 7 | **sort_order** | integer | ✓ | 0 |  |
| 8 | **is_system** | boolean | ✓ | false |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `status_history` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **doc_type** | varchar(50) | ✗ |  |  |
| 4 | **doc_id** | uuid | ✗ |  |  |
| 5 | **from_status_id** | uuid | ✓ |  | → custom_statuses.id |
| 6 | **to_status_id** | uuid | ✗ |  | → custom_statuses.id |
| 7 | **changed_by** | uuid | ✓ |  |  |
| 8 | **comment** | text | ✓ |  |  |
| 9 | **metadata** | jsonb | ✓ | '{}'::jsonb |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |

---

## `status_transitions` — 11 عمود
**UNIQUE:** tenant_id, doc_type, from_status_id, to_status_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **doc_type** | varchar(50) | ✗ |  |  |
| 4 | **from_status_id** | uuid | ✓ |  | → custom_statuses.id |
| 5 | **to_status_id** | uuid | ✓ |  | → custom_statuses.id |
| 6 | **allowed_roles** | ARRAY | ✓ | ARRAY['admin'::text] |  |
| 7 | **requires_comment** | boolean | ✓ | false |  |
| 8 | **requires_approval** | boolean | ✓ | false |  |
| 9 | **approval_roles** | ARRAY | ✓ | ARRAY['admin'::text] |  |
| 10 | **auto_actions** | jsonb | ✓ | '[]'::jsonb |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |

---

## `visibility_rules` — 14 عمود
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **company_id** | uuid | ✓ |  |  |
| 4 | **rule_type** | text | ✗ |  |  |
| 5 | **target_name** | text | ✗ |  |  |
| 6 | **hidden_from_roles** | ARRAY | ✓ | ARRAY[]::text[] |  |
| 7 | **visible_to_roles** | ARRAY | ✓ | ARRAY[]::text[] |  |
| 8 | **mask_value** | text | ✓ |  |  |
| 9 | **is_active** | boolean | ✓ | true |  |
| 10 | **priority** | integer | ✓ | 100 |  |
| 11 | **description** | text | ✓ |  |  |
| 12 | **created_by** | uuid | ✓ |  |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `visibility_rules_rule_type_check`

---

## `workflow_notification_settings` — 11 عمود
**UNIQUE:** tenant_id, event_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **event_id** | varchar(100) | ✗ |  |  |
| 4 | **doc_type** | varchar(50) | ✗ |  |  |
| 5 | **in_app** | boolean | ✓ | true |  |
| 6 | **email** | boolean | ✓ | false |  |
| 7 | **telegram** | boolean | ✓ | false |  |
| 8 | **sms** | boolean | ✓ | false |  |
| 9 | **recipients** | jsonb | ✓ | '[]'::jsonb |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `workflow_scenario_toggles` — 8 عمود
**UNIQUE:** tenant_id, scenario_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **scenario_id** | varchar(100) | ✗ |  |  |
| 4 | **is_active** | boolean | ✓ | false |  |
| 5 | **config** | jsonb | ✓ | '{}'::jsonb |  |
| 6 | **activated_by** | uuid | ✓ |  |  |
| 7 | **created_at** | timestamptz | ✓ | now() |  |
| 8 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Security & Audit — الأمان والتدقيق
# ════════════════════════════════════════════════════════════

## `audit_logs` — 17 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **user_id** | uuid | ✓ |  |  |
| 4 | **action** | varchar(50) | ✗ |  |  |
| 5 | **entity_type** | varchar(100) | ✓ |  |  |
| 6 | **entity_id** | uuid | ✓ |  |  |
| 7 | **entity_name** | varchar(255) | ✓ |  |  |
| 8 | **old_values** | jsonb | ✓ |  |  |
| 9 | **new_values** | jsonb | ✓ |  |  |
| 10 | **changes** | jsonb | ✓ |  |  |
| 11 | **ip_address** | inet | ✓ |  |  |
| 12 | **user_agent** | text | ✓ |  |  |
| 13 | **session_id** | uuid | ✓ |  |  |
| 14 | **metadata** | jsonb | ✓ | '{}'::jsonb |  |
| 15 | **severity** | varchar(20) | ✓ | 'info'::character varying |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `mfa_company_settings` — 12 عمود
**UNIQUE:** company_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **company_id** | uuid | ✗ |  | → companies.id |
| 3 | **is_enabled** | boolean | ✓ | false |  |
| 4 | **allow_totp** | boolean | ✓ | true |  |
| 5 | **allow_email_otp** | boolean | ✓ | true |  |
| 6 | **allow_sms_otp** | boolean | ✓ | false |  |
| 7 | **enforce_for_admins** | boolean | ✓ | false |  |
| 8 | **enforce_for_all** | boolean | ✓ | false |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_by** | uuid | ✓ |  |  |
| 12 | **tenant_id** | uuid | ✓ |  | → tenants.id |

---

## `mfa_pending_otps` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **otp_hash** | text | ✗ |  |  |
| 4 | **method** | varchar(20) | ✗ |  |  |
| 5 | **attempts** | integer | ✓ | 0 |  |
| 6 | **max_attempts** | integer | ✓ | 5 |  |
| 7 | **expires_at** | timestamptz | ✗ |  |  |
| 8 | **used_at** | timestamptz | ✓ |  |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `mfa_system_settings` — 18 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **is_enabled** | boolean | ✓ | false |  |
| 3 | **allow_totp** | boolean | ✓ | true |  |
| 4 | **allow_email_otp** | boolean | ✓ | true |  |
| 5 | **allow_sms_otp** | boolean | ✓ | false |  |
| 6 | **enforce_for_admins** | boolean | ✓ | false |  |
| 7 | **enforce_for_all** | boolean | ✓ | false |  |
| 8 | **otp_expiry_seconds** | integer | ✓ | 300 |  |
| 9 | **otp_length** | integer | ✓ | 6 |  |
| 10 | **max_attempts** | integer | ✓ | 5 |  |
| 11 | **lockout_duration_minutes** | integer | ✓ | 15 |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |
| 14 | **updated_by** | uuid | ✓ |  |  |
| 15 | **require_complete_profile** | boolean | ✓ | true |  |
| 16 | **enforced_roles** | ARRAY | ✓ | ARRAY['super_admin'::text, ... |  |
| 17 | **custom_message_ar** | text | ✓ | 'لحماية بياناتك، يرجى تفعيل... |  |
| 18 | **custom_message_en** | text | ✓ | 'To protect your data, plea... |  |

---

## `mfa_user_settings` — 15 عمود
**UNIQUE:** user_id

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **is_enabled** | boolean | ✓ | false |  |
| 4 | **preferred_method** | varchar(20) | ✓ | 'totp'::character varying |  |
| 5 | **totp_secret** | text | ✓ |  |  |
| 6 | **totp_verified** | boolean | ✓ | false |  |
| 7 | **totp_enabled_at** | timestamptz | ✓ |  |  |
| 8 | **email_otp_enabled** | boolean | ✓ | false |  |
| 9 | **sms_otp_enabled** | boolean | ✓ | false |  |
| 10 | **phone_verified** | boolean | ✓ | false |  |
| 11 | **backup_codes** | ARRAY | ✓ |  |  |
| 12 | **backup_codes_generated_at** | timestamptz | ✓ |  |  |
| 13 | **last_used_at** | timestamptz | ✓ |  |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `mfa_verification_log` — 9 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **user_id** | uuid | ✗ |  |  |
| 3 | **method** | varchar(20) | ✗ |  |  |
| 4 | **is_successful** | boolean | ✗ |  |  |
| 5 | **failure_reason** | varchar(100) | ✓ |  |  |
| 6 | **ip_address** | inet | ✓ |  |  |
| 7 | **user_agent** | text | ✓ |  |  |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `webhook_endpoints` — 11 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **url** | text | ✗ |  |  |
| 4 | **events** | ARRAY | ✗ |  |  |
| 5 | **secret_key** | varchar(200) | ✓ |  |  |
| 6 | **is_active** | boolean | ✓ | true |  |
| 7 | **last_triggered_at** | timestamptz | ✓ |  |  |
| 8 | **success_count** | integer | ✓ | 0 |  |
| 9 | **failure_count** | integer | ✓ | 0 |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `webhook_logs` — 13 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **endpoint_id** | uuid | ✗ |  | → webhook_endpoints.id |
| 3 | **event_type** | varchar(100) | ✗ |  |  |
| 4 | **payload** | jsonb | ✗ |  |  |
| 5 | **response_status** | integer | ✓ |  |  |
| 6 | **response_body** | text | ✓ |  |  |
| 7 | **attempt** | integer | ✓ | 1 |  |
| 8 | **max_attempts** | integer | ✓ | 3 |  |
| 9 | **next_retry_at** | timestamptz | ✓ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **sent_at** | timestamptz | ✓ |  |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Notifications — الإشعارات
# ════════════════════════════════════════════════════════════

## `announcements` — 21 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **title_ar** | varchar(200) | ✗ |  |  |
| 4 | **title_en** | varchar(200) | ✓ |  |  |
| 5 | **content_ar** | text | ✗ |  |  |
| 6 | **content_en** | text | ✓ |  |  |
| 7 | **announcement_type** | varchar(50) | ✗ |  |  |
| 8 | **target_audience** | varchar(20) | ✓ | 'all'::character varying |  |
| 9 | **target_plans** | ARRAY | ✓ |  |  |
| 10 | **target_products** | ARRAY | ✓ |  |  |
| 11 | **display_type** | varchar(20) | ✓ | 'banner'::character varying |  |
| 12 | **bg_color** | varchar(7) | ✓ |  |  |
| 13 | **text_color** | varchar(7) | ✓ |  |  |
| 14 | **action_url** | text | ✓ |  |  |
| 15 | **action_text** | varchar(100) | ✓ |  |  |
| 16 | **starts_at** | timestamptz | ✓ | now() |  |
| 17 | **ends_at** | timestamptz | ✓ |  |  |
| 18 | **is_dismissible** | boolean | ✓ | true |  |
| 19 | **is_active** | boolean | ✓ | true |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `in_app_notifications` — 16 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **user_id** | uuid | ✓ |  |  |
| 4 | **title** | varchar(200) | ✗ |  |  |
| 5 | **message** | text | ✗ |  |  |
| 6 | **notification_type** | varchar(50) | ✓ |  |  |
| 7 | **priority** | varchar(20) | ✓ | 'normal'::character varying |  |
| 8 | **action_url** | text | ✓ |  |  |
| 9 | **action_text** | varchar(100) | ✓ |  |  |
| 10 | **icon** | varchar(50) | ✓ |  |  |
| 11 | **color** | varchar(7) | ✓ |  |  |
| 12 | **is_read** | boolean | ✓ | false |  |
| 13 | **read_at** | timestamptz | ✓ |  |  |
| 14 | **expires_at** | timestamptz | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `notification_preferences` — 4 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **user_id** | uuid | ✗ |  | → user_profiles.id |
| 2 | **channels** | jsonb | ✓ | '["telegram"]'::jsonb |  |
| 3 | **events** | jsonb | ✓ | '{}'::jsonb |  |
| 4 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `notifications` — 21 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 3 | **recipient_type** | varchar(20) | ✗ |  |  |
| 4 | **recipient_id** | uuid | ✗ |  |  |
| 5 | **recipient_email** | varchar(200) | ✓ |  |  |
| 6 | **recipient_phone** | varchar(50) | ✓ |  |  |
| 7 | **template_id** | uuid | ✓ |  |  |
| 8 | **notification_type** | varchar(50) | ✓ |  |  |
| 9 | **subject** | text | ✓ |  |  |
| 10 | **body** | text | ✗ |  |  |
| 11 | **channel** | varchar(20) | ✗ |  |  |
| 12 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 13 | **sent_at** | timestamptz | ✓ |  |  |
| 14 | **delivered_at** | timestamptz | ✓ |  |  |
| 15 | **read_at** | timestamptz | ✓ |  |  |
| 16 | **failed_reason** | text | ✓ |  |  |
| 17 | **reference_type** | varchar(50) | ✓ |  |  |
| 18 | **reference_id** | uuid | ✓ |  |  |
| 19 | **metadata** | jsonb | ✓ | '{}'::jsonb |  |
| 20 | **created_at** | timestamptz | ✓ | now() |  |
| 21 | **updated_at** | timestamptz | ✓ | now() |  |

---

# ════════════════════════════════════════════════════════════
# Other — جداول أخرى
# ════════════════════════════════════════════════════════════

## `business_industries` — 22 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(50) | ✗ |  |  |
| 3 | **name_ar** | varchar(200) | ✗ |  |  |
| 4 | **name_en** | varchar(200) | ✓ |  |  |
| 5 | **name_ru** | varchar(200) | ✓ |  |  |
| 6 | **name_uk** | varchar(200) | ✓ |  |  |
| 7 | **name_ro** | varchar(200) | ✓ |  |  |
| 8 | **name_pl** | varchar(200) | ✓ |  |  |
| 9 | **name_tr** | varchar(200) | ✓ |  |  |
| 10 | **name_de** | varchar(200) | ✓ |  |  |
| 11 | **name_it** | varchar(200) | ✓ |  |  |
| 12 | **description_ar** | text | ✓ |  |  |
| 13 | **description_en** | text | ✓ |  |  |
| 14 | **icon** | varchar(50) | ✓ |  |  |
| 15 | **default_coa_template** | varchar(50) | ✓ |  |  |
| 16 | **has_inventory** | boolean | ✓ | true |  |
| 17 | **has_manufacturing** | boolean | ✓ | false |  |
| 18 | **has_pos** | boolean | ✓ | false |  |
| 19 | **display_order** | integer | ✓ | 0 |  |
| 20 | **is_active** | boolean | ✓ | true |  |
| 21 | **created_at** | timestamptz | ✓ | now() |  |
| 22 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `category_customer_access` — 13 عمود
**UNIQUE:** tenant_id, category_id, customer_group_id | tenant_id, category_id, customer_id
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **category_id** | uuid | ✗ |  | → product_categories.id |
| 4 | **customer_id** | uuid | ✓ |  | → customers.id |
| 5 | **customer_group_id** | uuid | ✓ |  | → customer_groups.id |
| 6 | **access_type** | varchar(20) | ✓ | 'allow'::character varying |  |
| 7 | **notes** | text | ✓ |  |  |
| 8 | **valid_from** | date | ✓ |  |  |
| 9 | **valid_to** | date | ✓ |  |  |
| 10 | **is_active** | boolean | ✓ | true |  |
| 11 | **created_at** | timestamptz | ✓ | now() |  |
| 12 | **created_by** | uuid | ✓ |  |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `category_customer_access_check`

---

## `changelog` — 13 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **version** | varchar(50) | ✗ |  |  |
| 3 | **release_date** | date | ✗ |  |  |
| 4 | **title_ar** | varchar(200) | ✗ |  |  |
| 5 | **title_en** | varchar(200) | ✓ |  |  |
| 6 | **description_ar** | text | ✓ |  |  |
| 7 | **description_en** | text | ✓ |  |  |
| 8 | **changes** | jsonb | ✗ |  |  |
| 9 | **product_id** | uuid | ✓ |  |  |
| 10 | **is_major** | boolean | ✓ | false |  |
| 11 | **is_published** | boolean | ✓ | true |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `commission_entries` — 19 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **agent_id** | uuid | ✓ |  | → agents.id |
| 4 | **rule_id** | uuid | ✓ |  | → commission_rules.id |
| 5 | **reference_type** | varchar(50) | ✗ |  |  |
| 6 | **reference_id** | uuid | ✗ |  |  |
| 7 | **base_amount** | numeric | ✗ |  |  |
| 8 | **commission_rate** | numeric | ✗ |  |  |
| 9 | **commission_amount** | numeric | ✗ |  |  |
| 10 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 11 | **approved_by** | uuid | ✓ |  |  |
| 12 | **approved_at** | timestamptz | ✓ |  |  |
| 13 | **payment_id** | uuid | ✓ |  |  |
| 14 | **paid_at** | timestamptz | ✓ |  |  |
| 15 | **period_start** | date | ✓ |  |  |
| 16 | **period_end** | date | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `commission_rules` — 16 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | uuid_generate_v4() |  |
| 2 | **company_id** | uuid | ✓ |  | → companies.id |
| 3 | **name** | varchar(255) | ✗ |  |  |
| 4 | **commission_type** | varchar(20) | ✗ |  |  |
| 5 | **calculation_method** | varchar(20) | ✗ |  |  |
| 6 | **rate** | numeric | ✓ |  |  |
| 7 | **tiers** | jsonb | ✓ |  |  |
| 8 | **applies_to** | varchar(20) | ✓ | 'all'::character varying |  |
| 9 | **product_ids** | ARRAY | ✓ |  |  |
| 10 | **category_ids** | ARRAY | ✓ |  |  |
| 11 | **start_date** | date | ✓ |  |  |
| 12 | **end_date** | date | ✓ |  |  |
| 13 | **is_active** | boolean | ✓ | true |  |
| 14 | **created_at** | timestamptz | ✓ | now() |  |
| 15 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `countries` — 19 عمود
**UNIQUE:** code | iso2

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(3) | ✗ |  |  |
| 3 | **iso2** | varchar(2) | ✗ |  |  |
| 4 | **name** | varchar(100) | ✗ |  |  |
| 5 | **name_ar** | varchar(100) | ✗ |  |  |
| 6 | **name_en** | varchar(100) | ✗ |  |  |
| 7 | **phone_code** | varchar(10) | ✓ |  |  |
| 8 | **currency_code** | varchar(3) | ✓ |  |  |
| 9 | **region** | varchar(50) | ✓ |  |  |
| 10 | **region_ar** | varchar(50) | ✓ |  |  |
| 11 | **flag_emoji** | varchar(10) | ✓ |  |  |
| 12 | **is_popular** | boolean | ✓ | false |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **rounding_method** | varchar(10) | ✓ | 'half_up'::character varying |  |
| 15 | **tax_rounding** | integer | ✓ | 2 |  |
| 16 | **amount_rounding** | integer | ✓ | 2 |  |
| 17 | **unit_price_rounding** | integer | ✓ | 2 |  |
| 18 | **total_rounding** | integer | ✓ | 2 |  |
| 19 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `country_configurations` — 17 عمود
**UNIQUE:** country_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **country_code** | varchar(2) | ✗ |  |  |
| 3 | **country_name_ar** | varchar(200) | ✓ |  |  |
| 4 | **country_name_en** | varchar(200) | ✓ |  |  |
| 5 | **default_currency** | varchar(3) | ✓ |  |  |
| 6 | **has_vat** | boolean | ✓ | false |  |
| 7 | **vat_rate** | numeric | ✓ |  |  |
| 8 | **has_income_tax** | boolean | ✓ | true |  |
| 9 | **income_tax_rate** | numeric | ✓ |  |  |
| 10 | **supports_fop** | boolean | ✓ | false |  |
| 11 | **fop_groups** | jsonb | ✓ |  |  |
| 12 | **fiscal_year_start_month** | integer | ✓ | 1 |  |
| 13 | **date_format** | varchar(20) | ✓ | 'DD/MM/YYYY'::character var... |  |
| 14 | **number_format** | varchar(20) | ✓ | '1,234.56'::character varying |  |
| 15 | **is_active** | boolean | ✓ | true |  |
| 16 | **created_at** | timestamptz | ✓ | now() |  |
| 17 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `employee_commissions` — 28 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **employee_id** | uuid | ✗ |  |  |
| 5 | **assignment_id** | uuid | ✓ |  | → employee_incentive_assignments.id |
| 6 | **plan_id** | uuid | ✓ |  | → incentive_plans.id |
| 7 | **period_start** | date | ✗ |  |  |
| 8 | **period_end** | date | ✗ |  |  |
| 9 | **source_type** | varchar(50) | ✗ |  |  |
| 10 | **source_id** | uuid | ✓ |  |  |
| 11 | **source_number** | varchar(100) | ✓ |  |  |
| 12 | **base_amount** | numeric | ✗ |  |  |
| 13 | **rate_applied** | numeric | ✓ |  |  |
| 14 | **commission_amount** | numeric | ✗ |  |  |
| 15 | **tier_number** | integer | ✓ |  |  |
| 16 | **bonus_amount** | numeric | ✓ | 0 |  |
| 17 | **adjustment_amount** | numeric | ✓ | 0 |  |
| 18 | **adjustment_reason** | text | ✓ |  |  |
| 19 | **net_amount** | numeric | ✗ |  |  |
| 20 | **status** | varchar(20) | ✓ | 'calculated'::character var... |  |
| 21 | **approved_by** | uuid | ✓ |  |  |
| 22 | **approved_at** | timestamptz | ✓ |  |  |
| 23 | **paid_at** | timestamptz | ✓ |  |  |
| 24 | **payment_reference** | varchar(100) | ✓ |  |  |
| 25 | **journal_entry_id** | uuid | ✓ |  | → journal_entries.id |
| 26 | **notes** | text | ✓ |  |  |
| 27 | **created_at** | timestamptz | ✓ | now() |  |
| 28 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `employee_incentive_assignments` — 16 عمود
**UNIQUE:** tenant_id, employee_id, plan_id, start_date

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **employee_id** | uuid | ✗ |  |  |
| 5 | **plan_id** | uuid | ✗ |  | → incentive_plans.id |
| 6 | **custom_rate** | numeric | ✓ |  |  |
| 7 | **custom_cap** | numeric | ✓ |  |  |
| 8 | **target_amount** | numeric | ✓ |  |  |
| 9 | **target_units** | integer | ✓ |  |  |
| 10 | **start_date** | date | ✗ |  |  |
| 11 | **end_date** | date | ✓ |  |  |
| 12 | **is_active** | boolean | ✓ | true |  |
| 13 | **notes** | text | ✓ |  |  |
| 14 | **created_by** | uuid | ✓ |  |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `employee_targets` — 23 عمود
**UNIQUE:** tenant_id, employee_id, target_type, period_year, period_month,

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **employee_id** | uuid | ✗ |  |  |
| 5 | **target_type** | varchar(30) | ✗ |  |  |
| 6 | **period_type** | varchar(20) | ✗ | 'monthly'::character varying |  |
| 7 | **period_year** | integer | ✗ |  |  |
| 8 | **period_month** | integer | ✓ |  |  |
| 9 | **period_quarter** | integer | ✓ |  |  |
| 10 | **target_amount** | numeric | ✓ |  |  |
| 11 | **target_units** | integer | ✓ |  |  |
| 12 | **target_count** | integer | ✓ |  |  |
| 13 | **achieved_amount** | numeric | ✓ | 0 |  |
| 14 | **achieved_units** | integer | ✓ | 0 |  |
| 15 | **achieved_count** | integer | ✓ | 0 |  |
| 16 | **achievement_percentage** | numeric | ✓ | 0 |  |
| 17 | **bonus_on_achievement** | numeric | ✓ | 0 |  |
| 18 | **bonus_on_exceed** | numeric | ✓ | 0 |  |
| 19 | **status** | varchar(20) | ✓ | 'active'::character varying |  |
| 20 | **notes** | text | ✓ |  |  |
| 21 | **created_by** | uuid | ✓ |  |  |
| 22 | **created_at** | timestamptz | ✓ | now() |  |
| 23 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `incentive_plan_tiers` — 11 عمود
**UNIQUE:** plan_id, tier_number

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **plan_id** | uuid | ✗ |  | → incentive_plans.id |
| 4 | **tier_number** | integer | ✗ |  |  |
| 5 | **from_amount** | numeric | ✗ |  |  |
| 6 | **to_amount** | numeric | ✓ |  |  |
| 7 | **rate** | numeric | ✗ |  |  |
| 8 | **rate_type** | varchar(20) | ✓ | 'percentage'::character var... |  |
| 9 | **bonus_amount** | numeric | ✓ | 0 |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `incentive_plans` — 23 عمود
**UNIQUE:** tenant_id, company_id, plan_code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **company_id** | uuid | ✗ |  | → companies.id |
| 4 | **plan_code** | varchar(50) | ✗ |  |  |
| 5 | **plan_name** | varchar(200) | ✗ |  |  |
| 6 | **description** | text | ✓ |  |  |
| 7 | **plan_type** | varchar(30) | ✗ | 'commission'::character var... |  |
| 8 | **target_type** | varchar(30) | ✓ | 'sales'::character varying |  |
| 9 | **calculation_method** | varchar(30) | ✗ | 'percentage'::character var... |  |
| 10 | **base_rate** | numeric | ✓ | 0 |  |
| 11 | **min_threshold** | numeric | ✓ | 0 |  |
| 12 | **max_cap** | numeric | ✓ |  |  |
| 13 | **period_type** | varchar(20) | ✓ | 'monthly'::character varying |  |
| 14 | **effective_from** | date | ✗ |  |  |
| 15 | **effective_to** | date | ✓ |  |  |
| 16 | **is_active** | boolean | ✓ | true |  |
| 17 | **include_returns** | boolean | ✓ | false |  |
| 18 | **include_discounts** | boolean | ✓ | true |  |
| 19 | **min_collection_percent** | numeric | ✓ |  |  |
| 20 | **notes** | text | ✓ |  |  |
| 21 | **created_by** | uuid | ✓ |  |  |
| 22 | **created_at** | timestamptz | ✓ | now() |  |
| 23 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `marketing_materials` — 16 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **title_ar** | varchar(200) | ✗ |  |  |
| 3 | **title_en** | varchar(200) | ✓ |  |  |
| 4 | **description** | text | ✓ |  |  |
| 5 | **material_type** | varchar(50) | ✗ |  |  |
| 6 | **file_url** | text | ✓ |  |  |
| 7 | **thumbnail_url** | text | ✓ |  |  |
| 8 | **file_size** | integer | ✓ |  |  |
| 9 | **file_type** | varchar(50) | ✓ |  |  |
| 10 | **product_id** | uuid | ✓ |  |  |
| 11 | **language** | varchar(5) | ✓ | 'ar'::character varying |  |
| 12 | **access_level** | varchar(20) | ✓ | 'all'::character varying |  |
| 13 | **download_count** | integer | ✓ | 0 |  |
| 14 | **is_active** | boolean | ✓ | true |  |
| 15 | **created_at** | timestamptz | ✓ | now() |  |
| 16 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `referral_program` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **referrer_reward_type** | varchar(20) | ✓ | 'credit'::character varying |  |
| 3 | **referrer_reward_value** | numeric | ✓ | 50 |  |
| 4 | **referee_reward_type** | varchar(20) | ✓ | 'discount'::character varying |  |
| 5 | **referee_reward_value** | numeric | ✓ | 20 |  |
| 6 | **min_subscription_months** | integer | ✓ | 1 |  |
| 7 | **reward_after_days** | integer | ✓ | 30 |  |
| 8 | **is_active** | boolean | ✓ | true |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `review_votes` — 7 عمود
**UNIQUE:** review_id, customer_id
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **review_id** | uuid | ✗ |  | → product_reviews.id |
| 4 | **customer_id** | uuid | ✓ |  | → customers.id |
| 5 | **vote_type** | varchar(20) | ✗ |  |  |
| 6 | **created_at** | timestamptz | ✓ | now() |  |
| 7 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `review_votes_vote_type_check`

---

## `reviews` — 18 عمود
**CHECK:** 5 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **product_id** | uuid | ✓ |  |  |
| 4 | **rating** | integer | ✗ |  |  |
| 5 | **title** | varchar(200) | ✓ |  |  |
| 6 | **comment** | text | ✓ |  |  |
| 7 | **ease_of_use_rating** | integer | ✓ |  |  |
| 8 | **features_rating** | integer | ✓ |  |  |
| 9 | **support_rating** | integer | ✓ |  |  |
| 10 | **value_rating** | integer | ✓ |  |  |
| 11 | **status** | varchar(20) | ✓ | 'pending'::character varying |  |
| 12 | **is_featured** | boolean | ✓ | false |  |
| 13 | **approved_at** | timestamptz | ✓ |  |  |
| 14 | **approved_by** | uuid | ✓ |  |  |
| 15 | **admin_reply** | text | ✓ |  |  |
| 16 | **replied_at** | timestamptz | ✓ |  |  |
| 17 | **created_at** | timestamptz | ✓ | now() |  |
| 18 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `reviews_features_rating_check`
- `reviews_rating_check`
- `reviews_value_rating_check`
- `reviews_support_rating_check`
- `reviews_ease_of_use_rating_check`

---

## `support_tickets` — 24 عمود
**UNIQUE:** ticket_number
**CHECK:** 1 قيد

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **ticket_number** | varchar(50) | ✗ |  |  |
| 3 | **tenant_id** | uuid | ✓ |  | → tenants.id |
| 4 | **requester_type** | varchar(20) | ✗ |  |  |
| 5 | **requester_id** | uuid | ✗ |  |  |
| 6 | **requester_email** | varchar(200) | ✓ |  |  |
| 7 | **requester_name** | varchar(200) | ✓ |  |  |
| 8 | **subject** | varchar(300) | ✗ |  |  |
| 9 | **description** | text | ✗ |  |  |
| 10 | **category** | varchar(50) | ✓ |  |  |
| 11 | **priority** | varchar(20) | ✓ | 'normal'::character varying |  |
| 12 | **status** | varchar(20) | ✓ | 'open'::character varying |  |
| 13 | **assigned_to** | uuid | ✓ |  |  |
| 14 | **assigned_at** | timestamptz | ✓ |  |  |
| 15 | **sla_due_at** | timestamptz | ✓ |  |  |
| 16 | **first_response_at** | timestamptz | ✓ |  |  |
| 17 | **resolved_at** | timestamptz | ✓ |  |  |
| 18 | **closed_at** | timestamptz | ✓ |  |  |
| 19 | **satisfaction_rating** | integer | ✓ |  |  |
| 20 | **satisfaction_comment** | text | ✓ |  |  |
| 21 | **related_subscription_id** | uuid | ✓ |  |  |
| 22 | **related_invoice_id** | uuid | ✓ |  |  |
| 23 | **created_at** | timestamptz | ✓ | now() |  |
| 24 | **updated_at** | timestamptz | ✓ | now() |  |

**CHECK Constraints:**
- `support_tickets_satisfaction_rating_check`

---

## `system_languages` — 11 عمود
**UNIQUE:** code

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **code** | varchar(5) | ✗ |  |  |
| 3 | **name_ar** | varchar(100) | ✗ |  |  |
| 4 | **name_en** | varchar(100) | ✗ |  |  |
| 5 | **name_native** | varchar(100) | ✗ |  |  |
| 6 | **direction** | varchar(3) | ✓ | 'ltr'::character varying |  |
| 7 | **flag_emoji** | varchar(10) | ✓ |  |  |
| 8 | **is_active** | boolean | ✓ | true |  |
| 9 | **display_order** | integer | ✓ | 0 |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `target_achievement_log` — 13 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  |  |
| 3 | **target_id** | uuid | ✗ |  | → employee_targets.id |
| 4 | **source_type** | varchar(50) | ✗ |  |  |
| 5 | **source_id** | uuid | ✓ |  |  |
| 6 | **source_number** | varchar(100) | ✓ |  |  |
| 7 | **source_date** | date | ✗ |  |  |
| 8 | **amount** | numeric | ✓ | 0 |  |
| 9 | **units** | integer | ✓ | 0 |  |
| 10 | **count_value** | integer | ✓ | 0 |  |
| 11 | **notes** | text | ✓ |  |  |
| 12 | **created_at** | timestamptz | ✓ | now() |  |
| 13 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `ticket_replies` — 10 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **ticket_id** | uuid | ✗ |  | → support_tickets.id |
| 3 | **sender_type** | varchar(20) | ✗ |  |  |
| 4 | **sender_id** | uuid | ✓ |  |  |
| 5 | **sender_name** | varchar(200) | ✓ |  |  |
| 6 | **message** | text | ✗ |  |  |
| 7 | **attachments** | jsonb | ✓ | '[]'::jsonb |  |
| 8 | **is_internal** | boolean | ✓ | false |  |
| 9 | **created_at** | timestamptz | ✓ | now() |  |
| 10 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `usage_analytics` — 14 عمود
**UNIQUE:** tenant_id, period_date

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **period_date** | date | ✗ |  |  |
| 4 | **active_users** | integer | ✓ | 0 |  |
| 5 | **total_logins** | integer | ✓ | 0 |  |
| 6 | **invoices_created** | integer | ✓ | 0 |  |
| 7 | **products_added** | integer | ✓ | 0 |  |
| 8 | **customers_added** | integer | ✓ | 0 |  |
| 9 | **api_calls** | integer | ✓ | 0 |  |
| 10 | **storage_used_mb** | integer | ✓ | 0 |  |
| 11 | **files_uploaded** | integer | ✓ | 0 |  |
| 12 | **details** | jsonb | ✓ | '{}'::jsonb |  |
| 13 | **created_at** | timestamptz | ✓ | now() |  |
| 14 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `usage_stats` — 11 عمود
**UNIQUE:** tenant_id, period_start

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✗ |  | → tenants.id |
| 3 | **period_start** | date | ✗ |  |  |
| 4 | **period_end** | date | ✗ |  |  |
| 5 | **api_calls** | integer | ✓ | 0 |  |
| 6 | **storage_mb** | integer | ✓ | 0 |  |
| 7 | **users_count** | integer | ✓ | 0 |  |
| 8 | **invoices_count** | integer | ✓ | 0 |  |
| 9 | **details** | jsonb | ✓ | '{}'::jsonb |  |
| 10 | **created_at** | timestamptz | ✓ | now() |  |
| 11 | **updated_at** | timestamptz | ✓ | now() |  |

---

## `vendor_categories` — 9 عمود

| # | Column | Type | Null | Default | FK → |
|---|--------|------|------|---------|------|
| 1 | **id** | uuid | ✗ | gen_random_uuid() |  |
| 2 | **tenant_id** | uuid | ✓ |  |  |
| 3 | **code** | varchar(30) | ✗ |  |  |
| 4 | **name_ar** | varchar(100) | ✗ |  |  |
| 5 | **name_en** | varchar(100) | ✓ |  |  |
| 6 | **category_type** | varchar(30) | ✗ |  |  |
| 7 | **is_active** | boolean | ✓ | true |  |
| 8 | **created_at** | timestamptz | ✓ | now() |  |
| 9 | **updated_at** | timestamptz | ✓ | now() |  |

---
