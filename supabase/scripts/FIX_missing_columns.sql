-- =====================================================
-- FIX_missing_columns.sql
-- المرحلة 3: إضافة الأعمدة الناقصة للجداول
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================

-- =====================================================
-- القسم 1: إضافة tenant_id للجداول التي تحتوي على company_id
-- =====================================================

-- 1.1 جدول funds
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'funds' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.funds ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to funds';
    ELSE
        RAISE NOTICE 'tenant_id already exists in funds';
    END IF;
END $$;

-- 1.2 جدول product_categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'product_categories' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.product_categories ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to product_categories';
    ELSE
        RAISE NOTICE 'tenant_id already exists in product_categories';
    END IF;
END $$;

-- 1.3 جدول gold_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'gold_items' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.gold_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to gold_items';
    ELSE
        RAISE NOTICE 'tenant_id already exists in gold_items';
    END IF;
END $$;

-- 1.4 جدول gold_prices
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'gold_prices' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.gold_prices ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to gold_prices';
    ELSE
        RAISE NOTICE 'tenant_id already exists in gold_prices';
    END IF;
END $$;

-- 1.5 جدول commission_entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'commission_entries' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.commission_entries ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to commission_entries';
    ELSE
        RAISE NOTICE 'tenant_id already exists in commission_entries';
    END IF;
END $$;

-- 1.6 جدول commission_rules
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.commission_rules ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to commission_rules';
    ELSE
        RAISE NOTICE 'tenant_id already exists in commission_rules';
    END IF;
END $$;

-- 1.7 جدول correspondents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'correspondents' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.correspondents ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to correspondents';
    ELSE
        RAISE NOTICE 'tenant_id already exists in correspondents';
    END IF;
END $$;

-- 1.8 جدول remittances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'remittances' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.remittances ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to remittances';
    ELSE
        RAISE NOTICE 'tenant_id already exists in remittances';
    END IF;
END $$;

-- 1.9 جدول serial_numbers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'serial_numbers' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.serial_numbers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to serial_numbers';
    ELSE
        RAISE NOTICE 'tenant_id already exists in serial_numbers';
    END IF;
END $$;

-- 1.10 جدول mfa_company_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'mfa_company_settings' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.mfa_company_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to mfa_company_settings';
    ELSE
        RAISE NOTICE 'tenant_id already exists in mfa_company_settings';
    END IF;
END $$;

-- 1.11 جدول retail_cuttings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'retail_cuttings' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.retail_cuttings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to retail_cuttings';
    ELSE
        RAISE NOTICE 'tenant_id already exists in retail_cuttings';
    END IF;
END $$;

-- 1.12 جدول sample_cuttings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sample_cuttings' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.sample_cuttings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to sample_cuttings';
    ELSE
        RAISE NOTICE 'tenant_id already exists in sample_cuttings';
    END IF;
END $$;

-- 1.13 جدول currency_exchanges
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'currency_exchanges' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.currency_exchanges ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to currency_exchanges';
    ELSE
        RAISE NOTICE 'tenant_id already exists in currency_exchanges';
    END IF;
END $$;

-- =====================================================
-- القسم 2: إضافة tenant_id و company_id للجداول الخاصة
-- =====================================================

-- 2.1 جدول bin_locations - إضافة tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'bin_locations' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.bin_locations ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to bin_locations';
    ELSE
        RAISE NOTICE 'tenant_id already exists in bin_locations';
    END IF;
END $$;

-- 2.1 جدول bin_locations - إضافة company_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'bin_locations' AND column_name = 'company_id') THEN
        ALTER TABLE public.bin_locations ADD COLUMN company_id UUID REFERENCES public.companies(id);
        RAISE NOTICE 'Added company_id to bin_locations';
    ELSE
        RAISE NOTICE 'company_id already exists in bin_locations';
    END IF;
END $$;

-- 2.2 جدول sample_cutting_items - إضافة tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sample_cutting_items' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.sample_cutting_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to sample_cutting_items';
    ELSE
        RAISE NOTICE 'tenant_id already exists in sample_cutting_items';
    END IF;
END $$;

-- 2.2 جدول sample_cutting_items - إضافة company_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'sample_cutting_items' AND column_name = 'company_id') THEN
        ALTER TABLE public.sample_cutting_items ADD COLUMN company_id UUID REFERENCES public.companies(id);
        RAISE NOTICE 'Added company_id to sample_cutting_items';
    ELSE
        RAISE NOTICE 'company_id already exists in sample_cutting_items';
    END IF;
END $$;

-- =====================================================
-- القسم 3: تحديث السجلات الموجودة من خلال company_id
-- =====================================================

-- تحديث tenant_id للجداول التي تحتوي على company_id
UPDATE public.funds f
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE f.company_id = c.id AND f.tenant_id IS NULL;

UPDATE public.product_categories p
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE p.company_id = c.id AND p.tenant_id IS NULL;

UPDATE public.gold_items g
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE g.company_id = c.id AND g.tenant_id IS NULL;

UPDATE public.gold_prices g
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE g.company_id = c.id AND g.tenant_id IS NULL;

UPDATE public.commission_entries ce
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE ce.company_id = c.id AND ce.tenant_id IS NULL;

UPDATE public.commission_rules cr
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE cr.company_id = c.id AND cr.tenant_id IS NULL;

UPDATE public.correspondents co
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE co.company_id = c.id AND co.tenant_id IS NULL;

UPDATE public.remittances r
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE r.company_id = c.id AND r.tenant_id IS NULL;

UPDATE public.serial_numbers s
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE s.company_id = c.id AND s.tenant_id IS NULL;

UPDATE public.mfa_company_settings m
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE m.company_id = c.id AND m.tenant_id IS NULL;

UPDATE public.retail_cuttings r
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE r.company_id = c.id AND r.tenant_id IS NULL;

UPDATE public.sample_cuttings s
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE s.company_id = c.id AND s.tenant_id IS NULL;

UPDATE public.currency_exchanges ce
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE ce.company_id = c.id AND ce.tenant_id IS NULL;

-- تحديث bin_locations من warehouse_id -> company
UPDATE public.bin_locations bl
SET company_id = w.company_id,
    tenant_id = c.tenant_id
FROM public.warehouses w
JOIN public.companies c ON w.company_id = c.id
WHERE bl.warehouse_id = w.id AND (bl.company_id IS NULL OR bl.tenant_id IS NULL);

-- تحديث sample_cutting_items من sample_cutting_id -> company
UPDATE public.sample_cutting_items sci
SET company_id = sc.company_id,
    tenant_id = sc.tenant_id
FROM public.sample_cuttings sc
WHERE sci.sample_cutting_id = sc.id AND (sci.company_id IS NULL OR sci.tenant_id IS NULL);

-- =====================================================
-- القسم 4: إنشاء التريغرات لتعيين القيم تلقائياً
-- =====================================================

-- 4.1 دالة عامة لتعيين tenant_id من company_id
CREATE OR REPLACE FUNCTION public.set_tenant_from_company()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان tenant_id فارغاً و company_id موجوداً
    IF NEW.tenant_id IS NULL AND NEW.company_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.companies
        WHERE id = NEW.company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 تريغرات للجداول التي تحتوي على company_id

-- funds
DROP TRIGGER IF EXISTS trigger_set_tenant_funds ON public.funds;
CREATE TRIGGER trigger_set_tenant_funds
    BEFORE INSERT OR UPDATE ON public.funds
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- product_categories
DROP TRIGGER IF EXISTS trigger_set_tenant_product_categories ON public.product_categories;
CREATE TRIGGER trigger_set_tenant_product_categories
    BEFORE INSERT OR UPDATE ON public.product_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- gold_items
DROP TRIGGER IF EXISTS trigger_set_tenant_gold_items ON public.gold_items;
CREATE TRIGGER trigger_set_tenant_gold_items
    BEFORE INSERT OR UPDATE ON public.gold_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- gold_prices
DROP TRIGGER IF EXISTS trigger_set_tenant_gold_prices ON public.gold_prices;
CREATE TRIGGER trigger_set_tenant_gold_prices
    BEFORE INSERT OR UPDATE ON public.gold_prices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- commission_entries
DROP TRIGGER IF EXISTS trigger_set_tenant_commission_entries ON public.commission_entries;
CREATE TRIGGER trigger_set_tenant_commission_entries
    BEFORE INSERT OR UPDATE ON public.commission_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- commission_rules
DROP TRIGGER IF EXISTS trigger_set_tenant_commission_rules ON public.commission_rules;
CREATE TRIGGER trigger_set_tenant_commission_rules
    BEFORE INSERT OR UPDATE ON public.commission_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- correspondents
DROP TRIGGER IF EXISTS trigger_set_tenant_correspondents ON public.correspondents;
CREATE TRIGGER trigger_set_tenant_correspondents
    BEFORE INSERT OR UPDATE ON public.correspondents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- remittances
DROP TRIGGER IF EXISTS trigger_set_tenant_remittances ON public.remittances;
CREATE TRIGGER trigger_set_tenant_remittances
    BEFORE INSERT OR UPDATE ON public.remittances
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- serial_numbers
DROP TRIGGER IF EXISTS trigger_set_tenant_serial_numbers ON public.serial_numbers;
CREATE TRIGGER trigger_set_tenant_serial_numbers
    BEFORE INSERT OR UPDATE ON public.serial_numbers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- mfa_company_settings
DROP TRIGGER IF EXISTS trigger_set_tenant_mfa_company_settings ON public.mfa_company_settings;
CREATE TRIGGER trigger_set_tenant_mfa_company_settings
    BEFORE INSERT OR UPDATE ON public.mfa_company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- retail_cuttings
DROP TRIGGER IF EXISTS trigger_set_tenant_retail_cuttings ON public.retail_cuttings;
CREATE TRIGGER trigger_set_tenant_retail_cuttings
    BEFORE INSERT OR UPDATE ON public.retail_cuttings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- sample_cuttings
DROP TRIGGER IF EXISTS trigger_set_tenant_sample_cuttings ON public.sample_cuttings;
CREATE TRIGGER trigger_set_tenant_sample_cuttings
    BEFORE INSERT OR UPDATE ON public.sample_cuttings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- currency_exchanges
DROP TRIGGER IF EXISTS trigger_set_tenant_currency_exchanges ON public.currency_exchanges;
CREATE TRIGGER trigger_set_tenant_currency_exchanges
    BEFORE INSERT OR UPDATE ON public.currency_exchanges
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- sample_cutting_items
DROP TRIGGER IF EXISTS trigger_set_tenant_sample_cutting_items ON public.sample_cutting_items;
CREATE TRIGGER trigger_set_tenant_sample_cutting_items
    BEFORE INSERT OR UPDATE ON public.sample_cutting_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_from_company();

-- 4.3 دالة خاصة لـ bin_locations (تحديد company_id و tenant_id من warehouse_id)
CREATE OR REPLACE FUNCTION public.set_company_tenant_from_warehouse()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان company_id أو tenant_id فارغاً و warehouse_id موجوداً
    IF (NEW.company_id IS NULL OR NEW.tenant_id IS NULL) AND NEW.warehouse_id IS NOT NULL THEN
        SELECT w.company_id, c.tenant_id 
        INTO NEW.company_id, NEW.tenant_id
        FROM public.warehouses w
        JOIN public.companies c ON w.company_id = c.id
        WHERE w.id = NEW.warehouse_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- bin_locations
DROP TRIGGER IF EXISTS trigger_set_company_tenant_bin_locations ON public.bin_locations;
CREATE TRIGGER trigger_set_company_tenant_bin_locations
    BEFORE INSERT OR UPDATE ON public.bin_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_tenant_from_warehouse();

-- 4.4 دالة خاصة لـ sample_cutting_items (تحديد company_id و tenant_id من sample_cutting_id)
CREATE OR REPLACE FUNCTION public.set_company_tenant_from_sample_cutting()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان company_id أو tenant_id فارغاً و sample_cutting_id موجوداً
    IF (NEW.company_id IS NULL OR NEW.tenant_id IS NULL) AND NEW.sample_cutting_id IS NOT NULL THEN
        SELECT sc.company_id, sc.tenant_id 
        INTO NEW.company_id, NEW.tenant_id
        FROM public.sample_cuttings sc
        WHERE sc.id = NEW.sample_cutting_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- sample_cutting_items (تحديث التريغر ليستخدم الدالة الخاصة)
DROP TRIGGER IF EXISTS trigger_set_tenant_sample_cutting_items ON public.sample_cutting_items;
DROP TRIGGER IF EXISTS trigger_set_company_tenant_sample_cutting_items ON public.sample_cutting_items;
CREATE TRIGGER trigger_set_company_tenant_sample_cutting_items
    BEFORE INSERT OR UPDATE ON public.sample_cutting_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_tenant_from_sample_cutting();

-- =====================================================
-- القسم 5: إضافة الفهارس للأعمدة الجديدة
-- =====================================================

-- إنشاء فهارس tenant_id
CREATE INDEX IF NOT EXISTS idx_funds_tenant_id ON public.funds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON public.product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gold_items_tenant_id ON public.gold_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gold_prices_tenant_id ON public.gold_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_tenant_id ON public.commission_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_tenant_id ON public.commission_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_correspondents_tenant_id ON public.correspondents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remittances_tenant_id ON public.remittances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_tenant_id ON public.serial_numbers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfa_company_settings_tenant_id ON public.mfa_company_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retail_cuttings_tenant_id ON public.retail_cuttings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sample_cuttings_tenant_id ON public.sample_cuttings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_tenant_id ON public.currency_exchanges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bin_locations_tenant_id ON public.bin_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bin_locations_company_id ON public.bin_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_sample_cutting_items_tenant_id ON public.sample_cutting_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sample_cutting_items_company_id ON public.sample_cutting_items(company_id);

-- =====================================================
-- القسم 6: التحقق من النتائج
-- =====================================================

-- عرض ملخص الأعمدة المضافة
SELECT 
    t.table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'tenant_id'
    ) THEN '✓' ELSE '✗' END as has_tenant_id,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'company_id'
    ) THEN '✓' ELSE '✗' END as has_company_id
FROM (VALUES 
    ('funds'), ('product_categories'), ('gold_items'), ('gold_prices'),
    ('commission_entries'), ('commission_rules'), ('correspondents'), ('remittances'),
    ('serial_numbers'), ('mfa_company_settings'), ('retail_cuttings'), ('sample_cuttings'),
    ('currency_exchanges'), ('bin_locations'), ('sample_cutting_items')
) AS t(table_name)
ORDER BY t.table_name;

-- عرض التريغرات المنشأة
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trigger_set_%'
ORDER BY event_object_table;

-- =====================================================
-- تم الانتهاء من إضافة الأعمدة الناقصة بنجاح!
-- =====================================================
SELECT 'تم الانتهاء من إضافة الأعمدة الناقصة والتريغرات والفهارس بنجاح!' as result;
