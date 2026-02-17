-- ═══════════════════════════════════════════════════════════════
-- 🗄️ أرشفة الجداول القديمة — Legacy Tables Archive
-- ═══════════════════════════════════════════════════════════════
-- التاريخ: 2026-02-15
-- الغرض: تعليم الجداول القديمة كمُؤرشفة (DEPRECATED)
--         لمنع الاستخدام الخاطئ في التطوير المستقبلي
-- ═══════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════╗
-- ║ تعليقات DEPRECATED على جداول المشتريات القديمة  ║
-- ╚══════════════════════════════════════════════════╝

COMMENT ON TABLE purchase_requests IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transactions (stage=draft). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_request_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_quotations IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transactions (stage=quotation). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_quotation_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_orders IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transactions (stage=order/approved). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_order_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_invoices IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transactions (stage=invoice/posted/paid). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_invoice_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_receipts IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transactions (stage=receipt). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE purchase_receipt_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: purchase_transaction_items. لا تستخدم في الكود الجديد.';

-- ╔══════════════════════════════════════════════════╗
-- ║ تعليقات DEPRECATED على جداول المبيعات القديمة    ║
-- ╚══════════════════════════════════════════════════╝

COMMENT ON TABLE sales_quotations IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transactions (stage=quotation). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_quotation_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_orders IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transactions (stage=order). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_order_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_invoices IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transactions (stage=invoice/posted/paid). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_invoice_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transaction_items. لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_delivery_notes IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transactions (stage=delivery). لا تستخدم في الكود الجديد.';

COMMENT ON TABLE sales_delivery_note_items IS 
'⛔ DEPRECATED [2026-02-15] — مُؤرشف. البديل: sales_transaction_items. لا تستخدم في الكود الجديد.';


-- ╔══════════════════════════════════════════════════╗
-- ║ تعليقات على الجداول الجديدة (للتوثيق)           ║
-- ╚══════════════════════════════════════════════════╝

COMMENT ON TABLE purchase_transactions IS 
'✅ ACTIVE [2026-02-15] — جدول المشتريات الموحد. سجل واحد يتنقل بين المراحل: draft → quotation → order → approved → receipt → invoice → posted → paid. يحل محل: purchase_requests, purchase_quotations, purchase_orders, purchase_invoices, purchase_receipts.';

COMMENT ON TABLE purchase_transaction_items IS 
'✅ ACTIVE [2026-02-15] — بنود المشتريات الموحدة. مرتبطة بـ purchase_transactions. يحل محل كل جداول البنود القديمة.';

COMMENT ON TABLE sales_transactions IS 
'✅ ACTIVE [2026-02-15] — جدول المبيعات الموحد. سجل واحد يتنقل بين المراحل: draft → quotation → reservation → order → delivery → invoice → posted → paid. يحل محل: sales_quotations, sales_orders, sales_invoices, sales_delivery_notes.';

COMMENT ON TABLE sales_transaction_items IS 
'✅ ACTIVE [2026-02-15] — بنود المبيعات الموحدة. مرتبطة بـ sales_transactions. يحل محل كل جداول البنود القديمة.';

COMMENT ON TABLE transaction_stage_log IS 
'✅ ACTIVE [2026-02-15] — سجل تتبع تحويلات المراحل. يسجل كل تغيير مرحلة مع التاريخ والمستخدم والملاحظات.';

COMMENT ON TABLE document_sequences IS 
'✅ ACTIVE [2026-02-15] — تسلسل ترقيم المستندات. يولّد أرقام فريدة لكل نوع مستند وشركة وسنة.';


-- ╔══════════════════════════════════════════════════╗
-- ║ التحقق من نجاح التعليقات                        ║
-- ╚══════════════════════════════════════════════════╝

SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN obj_description((schemaname || '.' || tablename)::regclass) LIKE '%DEPRECATED%' THEN '⛔ ARCHIVED'
        WHEN obj_description((schemaname || '.' || tablename)::regclass) LIKE '%ACTIVE%' THEN '✅ ACTIVE'
        ELSE '❓ NO COMMENT'
    END AS status,
    LEFT(obj_description((schemaname || '.' || tablename)::regclass), 80) AS comment_preview
FROM pg_tables
WHERE schemaname = 'public'
AND (
    tablename LIKE 'purchase_%'
    OR tablename LIKE 'sales_%'
    OR tablename IN ('transaction_stage_log', 'document_sequences')
)
ORDER BY 
    CASE 
        WHEN obj_description((schemaname || '.' || tablename)::regclass) LIKE '%DEPRECATED%' THEN 2
        WHEN obj_description((schemaname || '.' || tablename)::regclass) LIKE '%ACTIVE%' THEN 1
        ELSE 3
    END,
    tablename;
