-- ═══════════════════════════════════════════════════════════════
-- Add confirmation fields to purchase & sales tables
-- إضافة أعمدة التأكيد لجداول المشتريات والمبيعات
-- Date: 2026-02-12
-- ═══════════════════════════════════════════════════════════════

-- Purchase Orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(30) DEFAULT 'draft';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmed_by UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Purchase Invoices
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(30) DEFAULT 'draft';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS confirmed_by UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Sales Orders (in case they don't have them)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(30) DEFAULT 'draft';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS confirmed_by UUID;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Sales Invoices
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(30) DEFAULT 'draft';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS confirmed_by UUID;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30);
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(30) DEFAULT 'draft';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS confirmed_by UUID;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Verify
SELECT 'Confirmation columns added successfully ✅' as result;
