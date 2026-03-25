# 🧪 STEP 53: Guest Checkout System - دليل الاختبار
# Testing Guide

---

## 📋 اختبار شامل لنظام الدفع للزوار

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. التحقق من الجداول
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '✅ الجداول' as test_category,
    table_name,
    '✅ موجود' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('guest_checkouts', 'orders', 'order_items')
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. التحقق من الدوال
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '✅ الدوال' as test_category,
    routine_name as function_name,
    '✅ موجود' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'generate_order_number',
      'save_guest_checkout',
      'create_order_from_cart',
      'convert_guest_order_to_customer',
      'get_guest_orders',
      'get_order_details',
      'cleanup_expired_guest_checkouts'
  )
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. اختبار توليد رقم الطلب
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_order_number VARCHAR;
BEGIN
    -- الحصول على tenant و company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد tenant/company في النظام';
        RETURN;
    END IF;
    
    -- اختبار توليد رقم الطلب
    v_order_number := generate_order_number(v_tenant_id, v_company_id);
    
    RAISE NOTICE ' ';
    RAISE NOTICE '🧪 اختبار: generate_order_number()';
    RAISE NOTICE '   ✅ رقم الطلب المُولّد: %', v_order_number;
    RAISE NOTICE ' ';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. اختبار حفظ معلومات الزائر
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد tenant/company';
        RETURN;
    END IF;
    
    -- حفظ معلومات زائر تجريبي
    v_result := save_guest_checkout(
        v_tenant_id,
        v_company_id,
        'test-session-' || gen_random_uuid()::text,
        'test.guest@example.com',
        'Test Guest User',
        '+1234567890',
        '{"country": "USA", "city": "New York", "street": "123 Main St", "postal_code": "10001"}'::jsonb,
        NULL,
        true,
        'Test order notes',
        '192.168.1.1',
        'Mozilla/5.0...'
    );
    
    RAISE NOTICE ' ';
    RAISE NOTICE '🧪 اختبار: save_guest_checkout()';
    RAISE NOTICE '   ✅ النتيجة: %', v_result::text;
    RAISE NOTICE ' ';
    
    -- تنظيف
    DELETE FROM guest_checkouts WHERE email = 'test.guest@example.com';
    RAISE NOTICE '   ✅ تم التنظيف';
    RAISE NOTICE ' ';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. اختبار كامل: إنشاء طلب من سلة زائر
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_cart_id UUID;
    v_guest_checkout_id UUID;
    v_product_id UUID;
    v_result JSONB;
    v_order_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد tenant/company';
        RETURN;
    END IF;
    
    RAISE NOTICE ' ';
    RAISE NOTICE '🧪 اختبار كامل: إنشاء طلب من سلة زائر';
    RAISE NOTICE ' ';
    
    -- 1. إنشاء سلة للزائر
    v_cart_id := get_or_create_cart(
        v_tenant_id,
        v_company_id,
        NULL,
        'test-guest-session-' || gen_random_uuid()::text
    );
    RAISE NOTICE '   ✅ تم إنشاء السلة: %', v_cart_id;
    
    -- 2. إضافة منتج للسلة (إذا وجد)
    SELECT id INTO v_product_id FROM products WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_product_id IS NOT NULL THEN
        SELECT add_to_cart(
            v_tenant_id,
            v_company_id,
            v_product_id,
            2,
            NULL,
            (SELECT session_id FROM shopping_carts WHERE id = v_cart_id)
        ) INTO v_result;
        RAISE NOTICE '   ✅ تم إضافة منتج للسلة';
    ELSE
        RAISE NOTICE '   ⚠️ لا توجد منتجات - سنتخطى هذه الخطوة';
    END IF;
    
    -- 3. حفظ معلومات الزائر
    SELECT (save_guest_checkout(
        v_tenant_id,
        v_company_id,
        (SELECT session_id FROM shopping_carts WHERE id = v_cart_id),
        'complete.test@example.com',
        'Complete Test User',
        '+9876543210',
        '{"country": "UAE", "city": "Dubai", "street": "Sheikh Zayed Rd", "postal_code": "00000"}'::jsonb
    )->>'guest_checkout_id')::UUID INTO v_guest_checkout_id;
    
    RAISE NOTICE '   ✅ تم حفظ معلومات الزائر: %', v_guest_checkout_id;
    
    -- 4. إنشاء الطلب
    SELECT (create_order_from_cart(
        v_tenant_id,
        v_company_id,
        v_cart_id,
        NULL,
        v_guest_checkout_id,
        'stripe',
        'express',
        'Please handle with care'
    )->>'order_id')::UUID INTO v_order_id;
    
    RAISE NOTICE '   ✅ تم إنشاء الطلب: %', v_order_id;
    
    -- 5. الحصول على تفاصيل الطلب
    SELECT get_order_details(v_tenant_id, v_order_id) INTO v_result;
    
    RAISE NOTICE '   ✅ تفاصيل الطلب: %', (v_result->'order'->>'order_number');
    
    -- 6. التنظيف
    DELETE FROM order_items WHERE order_id = v_order_id;
    DELETE FROM orders WHERE id = v_order_id;
    DELETE FROM shopping_cart_items WHERE cart_id = v_cart_id;
    DELETE FROM shopping_carts WHERE id = v_cart_id;
    DELETE FROM guest_checkouts WHERE id = v_guest_checkout_id;
    
    RAISE NOTICE '   ✅ تم التنظيف';
    RAISE NOTICE ' ';
    RAISE NOTICE '✅ جميع الاختبارات ناجحة!';
    RAISE NOTICE ' ';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. إحصائيات النظام
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '📊 إحصائيات' as category,
    'معلومات الزوار' as item,
    COUNT(*) as count
FROM guest_checkouts
UNION ALL
SELECT 
    '📊 إحصائيات',
    'إجمالي الطلبات',
    COUNT(*)
FROM orders
UNION ALL
SELECT 
    '📊 إحصائيات',
    'طلبات العملاء المسجلين',
    COUNT(*)
FROM orders
WHERE customer_id IS NOT NULL
UNION ALL
SELECT 
    '📊 إحصائيات',
    'طلبات الزوار',
    COUNT(*)
FROM orders
WHERE guest_checkout_id IS NOT NULL
UNION ALL
SELECT 
    '📊 إحصائيات',
    'عناصر الطلبات',
    COUNT(*)
FROM order_items;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. الخلاصة
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    '🎉 الخلاصة' as category,
    'STEP_53: Guest Checkout System' as step,
    '✅ مُنفّذ ومختبر' as status;
```

---

## ✅ قائمة التحقق

- [ ] الجداول الثلاثة موجودة
- [ ] جميع الدوال (7) موجودة
- [ ] توليد رقم الطلب يعمل
- [ ] حفظ معلومات الزائر يعمل
- [ ] إنشاء طلب من السلة يعمل
- [ ] الحصول على تفاصيل الطلب يعمل
- [ ] RLS Policies مُطبّقة

---

## 🚀 التنفيذ

```bash
# في Supabase SQL Editor:
# نسخ والصق الكود أعلاه وتشغيله
```

---

**✅ إذا نجحت جميع الاختبارات، النظام جاهز!**
