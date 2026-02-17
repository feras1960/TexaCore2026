-- ═══════════════════════════════════════════════════════════════
-- 🔧 إصلاح ربط الكونتينر بالفواتير — حقول مباشرة بدون JOIN
-- التاريخ: 2026-02-17
-- المشكلة: حالة الكونتينر لا تظهر على الفاتورة بالقائمة
-- الحل: إضافة container_id + container_number + container_status 
--        مباشرة على purchase_transactions كحقول denormalized
--        + تريغر يحدّث container_number/status تلقائياً
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. إضافة الأعمدة (idempotent) ───
ALTER TABLE purchase_transactions 
    ADD COLUMN IF NOT EXISTS container_id uuid REFERENCES containers(id) ON DELETE SET NULL;

ALTER TABLE purchase_transactions 
    ADD COLUMN IF NOT EXISTS container_number TEXT;

ALTER TABLE purchase_transactions 
    ADD COLUMN IF NOT EXISTS container_status TEXT;

-- Index for fast container lookups
CREATE INDEX IF NOT EXISTS idx_pt_container_id 
    ON purchase_transactions(container_id) WHERE container_id IS NOT NULL;

COMMENT ON COLUMN purchase_transactions.container_id IS 'الكونتينر المرتبط بالفاتورة (FK مباشر)';
COMMENT ON COLUMN purchase_transactions.container_number IS 'رقم الكونتينر (denormalized — يُحدّث بتريغر)';
COMMENT ON COLUMN purchase_transactions.container_status IS 'حالة الكونتينر (denormalized — يُحدّث بتريغر)';

-- ─── 2. تريغر: عند ربط/تغيير container_id على الفاتورة → جلب البيانات تلقائياً ───
CREATE OR REPLACE FUNCTION sync_container_info_to_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تعيين أو تغيير container_id → أجلب container_number + status
    IF NEW.container_id IS NOT NULL AND (
        OLD.container_id IS DISTINCT FROM NEW.container_id
    ) THEN
        SELECT c.container_number, c.status
        INTO NEW.container_number, NEW.container_status
        FROM containers c
        WHERE c.id = NEW.container_id;
    END IF;

    -- عند إزالة container_id → أفرّغ الحقول
    IF NEW.container_id IS NULL AND OLD.container_id IS NOT NULL THEN
        NEW.container_number := NULL;
        NEW.container_status := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_container_info ON purchase_transactions;
CREATE TRIGGER trg_sync_container_info
    BEFORE INSERT OR UPDATE OF container_id
    ON purchase_transactions
    FOR EACH ROW
    EXECUTE FUNCTION sync_container_info_to_transaction();

-- ─── 3. تريغر عكسي: عند تغيير حالة الكونتينر → حدّث كل الفواتير المرتبطة ───
CREATE OR REPLACE FUNCTION sync_container_status_to_transactions()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تغيير status أو container_number في containers → حدّث كل الفواتير المربوطة
    IF OLD.status IS DISTINCT FROM NEW.status 
       OR OLD.container_number IS DISTINCT FROM NEW.container_number THEN
        UPDATE purchase_transactions
        SET container_status = NEW.status,
            container_number = NEW.container_number
        WHERE container_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_container_status_to_txns ON containers;
CREATE TRIGGER trg_sync_container_status_to_txns
    AFTER UPDATE OF status, container_number
    ON containers
    FOR EACH ROW
    EXECUTE FUNCTION sync_container_status_to_transactions();

-- ─── 4. Backfill: ملء البيانات للسجلات الحالية التي لديها container_id ───
UPDATE purchase_transactions pt
SET container_number = c.container_number,
    container_status = c.status
FROM containers c
WHERE pt.container_id = c.id
  AND (pt.container_number IS NULL OR pt.container_status IS NULL);

-- ─── 5. تأكيد ───
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT count(*) INTO v_count 
    FROM purchase_transactions 
    WHERE container_id IS NOT NULL;
    
    RAISE NOTICE '✅ Container link fix complete: % transactions linked to containers', v_count;
END $$;
