-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: إضافة الحقول الجديدة للجداول الموجودة
-- STEP 5: Add new fields to existing tables
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - إضافة حقول فقط، لا تعديل على البيانات الموجودة
-- ✅ Safe - Only adding fields, no modification to existing data

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة حقول جديدة لجدول companies
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        -- إضافة code إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'code'
        ) THEN
            ALTER TABLE companies ADD COLUMN code VARCHAR(50);
            
            -- توليد codes للبيانات الموجودة
            UPDATE companies 
            SET code = 'COMP-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
            WHERE code IS NULL;
            
            -- جعل code مطلوب
            ALTER TABLE companies ALTER COLUMN code SET NOT NULL;
            
            -- إضافة UNIQUE constraint
            CREATE UNIQUE INDEX IF NOT EXISTS companies_tenant_code_unique 
                ON companies(tenant_id, code);
            
            RAISE NOTICE '✅ تم إضافة code لجدول companies';
        END IF;
        
        -- إضافة الحقول الأخرى
        ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200),
            ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
            ADD COLUMN IF NOT EXISTS legal_name VARCHAR(300),
            ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
            ADD COLUMN IF NOT EXISTS country VARCHAR(100),
            ADD COLUMN IF NOT EXISTS city VARCHAR(100),
            ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
            ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
            ADD COLUMN IF NOT EXISTS website VARCHAR(200),
            ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD',
            ADD COLUMN IF NOT EXISTS fiscal_year_start INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        
        -- نسخ name إلى name_ar و name_en إذا كانت فارغة
        UPDATE companies 
        SET name_ar = COALESCE(name_ar, name),
            name_en = COALESCE(name_en, name)
        WHERE name_ar IS NULL OR name_en IS NULL;
        
        RAISE NOTICE '✅ تم إضافة الحقول الجديدة لجدول companies';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. إضافة حقول جديدة لجدول branches
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
        -- إضافة code إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'branches' AND column_name = 'code'
        ) THEN
            ALTER TABLE branches ADD COLUMN code VARCHAR(50);
            
            -- توليد codes للبيانات الموجودة
            UPDATE branches 
            SET code = 'BR-' || LPAD(
                ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at)::TEXT, 
                3, '0'
            )
            WHERE code IS NULL;
            
            -- جعل code مطلوب
            ALTER TABLE branches ALTER COLUMN code SET NOT NULL;
            
            -- إضافة UNIQUE constraint
            CREATE UNIQUE INDEX IF NOT EXISTS branches_tenant_company_code_unique 
                ON branches(tenant_id, company_id, code);
            
            RAISE NOTICE '✅ تم إضافة code لجدول branches';
        END IF;
        
        -- إضافة الحقول الأخرى
        ALTER TABLE branches 
            ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200),
            ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
            ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'branch',
            ADD COLUMN IF NOT EXISTS country VARCHAR(100),
            ADD COLUMN IF NOT EXISTS city VARCHAR(100),
            ADD COLUMN IF NOT EXISTS manager_id UUID,
            ADD COLUMN IF NOT EXISTS default_warehouse_id UUID,
            ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3),
            ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        
        -- نسخ name إلى name_ar و name_en
        UPDATE branches 
        SET name_ar = COALESCE(name_ar, name),
            name_en = COALESCE(name_en, name)
        WHERE name_ar IS NULL OR name_en IS NULL;
        
        RAISE NOTICE '✅ تم إضافة الحقول الجديدة لجدول branches';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. إضافة حقول جديدة لجدول currencies
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currencies') THEN
        ALTER TABLE currencies 
            ADD COLUMN IF NOT EXISTS name_ar VARCHAR(100),
            ADD COLUMN IF NOT EXISTS name_en VARCHAR(100),
            ADD COLUMN IF NOT EXISTS symbol_position VARCHAR(10) DEFAULT 'before',
            ADD COLUMN IF NOT EXISTS decimal_places INT DEFAULT 2,
            ADD COLUMN IF NOT EXISTS thousands_separator VARCHAR(1) DEFAULT ',',
            ADD COLUMN IF NOT EXISTS decimal_separator VARCHAR(1) DEFAULT '.',
            ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,8) DEFAULT 1;
        
        -- نسخ name إلى name_ar و name_en
        UPDATE currencies 
        SET name_ar = COALESCE(name_ar, name),
            name_en = COALESCE(name_en, name)
        WHERE name_ar IS NULL OR name_en IS NULL;
        
        -- نسخ rate إلى exchange_rate إذا كان موجوداً
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'currencies' AND column_name = 'rate'
        ) THEN
            UPDATE currencies 
            SET exchange_rate = rate 
            WHERE exchange_rate = 1 AND rate != 1;
        END IF;
        
        -- تحديث UNIQUE constraint
        DROP INDEX IF EXISTS currencies_code_key;
        ALTER TABLE currencies DROP CONSTRAINT IF EXISTS currencies_code_key;
        CREATE UNIQUE INDEX IF NOT EXISTS currencies_tenant_code_unique 
            ON currencies(tenant_id, code);
        
        RAISE NOTICE '✅ تم إضافة الحقول الجديدة لجدول currencies';
    END IF;
END $$;

-- ✅ تم! الآن الجداول لديها جميع الحقول الجديدة
-- ✅ Done! Tables now have all new fields
--
-- 📝 ملاحظة: البيانات الموجودة محفوظة، الحقول الجديدة لها قيم افتراضية
-- 📝 Note: Existing data is preserved, new fields have default values
