-- ═══════════════════════════════════════════════════════════════
-- Migration: توحيد جدول الكونتينرات — إضافة الأعمدة الناقصة
-- Date: 2026-02-16
-- Purpose: جدول containers كان يفتقر لأعمدة الشحن التي يقرأها 
--          ContainersList. هذا يوحّد الأعمدة ليتطابق مع الواجهة.
-- ═══════════════════════════════════════════════════════════════

-- ─── أعمدة الشحن ───
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS shipment_number VARCHAR(50);

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS shipping_company VARCHAR(200);

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(200);

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS eta DATE;

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS etd DATE;

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS port_of_loading VARCHAR(200);

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS port_of_discharge VARCHAR(200);

-- ─── أعمدة التكلفة ───
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(15,2) DEFAULT 0;

-- ─── ربط الشحنة بالكونتينر (اختياري) ───
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id);

-- ─── فهرس ───
CREATE INDEX IF NOT EXISTS idx_containers_supplier ON containers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_containers_shipment_number ON containers(tenant_id, shipment_number);

COMMENT ON COLUMN public.containers.shipment_number IS 'رقم مرجعي للشحنة';
COMMENT ON COLUMN public.containers.supplier_id IS 'المورد المرتبط بالكونتينر';
COMMENT ON COLUMN public.containers.shipping_company IS 'شركة الشحن';
COMMENT ON COLUMN public.containers.vessel_name IS 'اسم السفينة';
COMMENT ON COLUMN public.containers.eta IS 'تاريخ الوصول المتوقع';
COMMENT ON COLUMN public.containers.shipment_id IS 'ربط اختياري بجدول shipments للتكلفة المفصلة';
