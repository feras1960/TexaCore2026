-- ============================================================================
-- إضافة بيانات تجريبية لاختبار SaaS Dashboard
-- ============================================================================
-- الغرض: إنشاء اشتراكات تجريبية لاختبار الرسوم البيانية
-- التاريخ: 27 يناير 2026
-- ============================================================================

-- ============================================================================
-- الخطوة 1: التحقق من وجود Tenants
-- ============================================================================

DO $$
DECLARE
    v_tenant_count INT;
BEGIN
    SELECT COUNT(*) INTO v_tenant_count FROM tenants;
    
    RAISE NOTICE '📊 عدد المشتركين الحاليين: %', v_tenant_count;
    
    IF v_tenant_count = 0 THEN
        RAISE NOTICE '⚠️  تحذير: لا يوجد مشتركين في النظام';
        RAISE NOTICE '💡 يمكنك إنشاء tenant من خلال واجهة التسجيل أو SaaS Dashboard';
    ELSE
        RAISE NOTICE '✅ يوجد % مشتركين جاهزين', v_tenant_count;
    END IF;
END $$;

-- ============================================================================
-- الخطوة 2: إضافة اشتراكات تجريبية (إذا كانت موجودة Tenants)
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_plan_id UUID;
    v_subscriptions_created INT := 0;
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   إضافة اشتراكات تجريبية';
    RAISE NOTICE '============================================';
    
    -- تحقق من وجود tenant واحد على الأقل
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ لا يوجد tenants - لا يمكن إنشاء اشتراكات';
        RAISE NOTICE '📝 قم أولاً بإنشاء tenant من خلال:';
        RAISE NOTICE '   1. صفحة التسجيل';
        RAISE NOTICE '   2. أو SaaS → Subscribers → Add Subscriber';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ تم إيجاد Tenant: %', v_tenant_id;
    RAISE NOTICE '';
    
    -- أضف اشتراكات لباقات مختلفة
    -- NexaCore - Starter
    SELECT id INTO v_plan_id FROM subscription_plans WHERE code = 'nexa-starter' LIMIT 1;
    IF v_plan_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tenant_subscriptions 
        WHERE tenant_id = v_tenant_id AND plan_id = v_plan_id
    ) THEN
        INSERT INTO tenant_subscriptions (
            tenant_id,
            plan_id,
            status,
            start_date,
            end_date,
            created_at
        ) VALUES (
            v_tenant_id,
            v_plan_id,
            'active',
            NOW() - INTERVAL '3 months',
            NOW() + INTERVAL '9 months',
            NOW() - INTERVAL '3 months'
        );
        v_subscriptions_created := v_subscriptions_created + 1;
        RAISE NOTICE '✅ اشتراك NexaCore Starter - نشط منذ 3 أشهر';
    END IF;
    
    -- للتنوع: أضف tenants إضافيين إذا أردت
    FOR r IN (
        SELECT t.id as tenant_id, sp.id as plan_id, sp.code, sp.name_en
        FROM tenants t
        CROSS JOIN subscription_plans sp
        WHERE sp.is_active = true
        AND sp.code IN ('texa-professional', 'fin-starter')
        AND NOT EXISTS (
            SELECT 1 FROM tenant_subscriptions ts
            WHERE ts.tenant_id = t.id AND ts.plan_id = sp.id
        )
        LIMIT 2
    ) LOOP
        INSERT INTO tenant_subscriptions (
            tenant_id,
            plan_id,
            status,
            start_date,
            end_date,
            created_at
        ) VALUES (
            r.tenant_id,
            r.plan_id,
            CASE 
                WHEN random() > 0.8 THEN 'cancelled'
                ELSE 'active'
            END,
            NOW() - (random() * 180 || ' days')::INTERVAL,
            NOW() + (random() * 180 || ' days')::INTERVAL,
            NOW() - (random() * 180 || ' days')::INTERVAL
        );
        v_subscriptions_created := v_subscriptions_created + 1;
        RAISE NOTICE '✅ اشتراك % - %', r.code, r.name_en;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 تم إنشاء % اشتراكات تجريبية', v_subscriptions_created;
    
    IF v_subscriptions_created = 0 THEN
        RAISE NOTICE '⏭️  الاشتراكات موجودة بالفعل أو لا توجد باقات';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   ✅ اكتمل!';
    RAISE NOTICE '============================================';
    
END $$;

-- ============================================================================
-- الخطوة 3: عرض الإحصائيات النهائية
-- ============================================================================

DO $$
DECLARE
    v_total_subs INT;
    v_active_subs INT;
    v_cancelled_subs INT;
    v_total_revenue NUMERIC;
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   📊 الإحصائيات النهائية';
    RAISE NOTICE '============================================';
    
    -- عدد الاشتراكات
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
    INTO v_total_subs, v_active_subs, v_cancelled_subs
    FROM tenant_subscriptions;
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 الاشتراكات:';
    RAISE NOTICE '  • إجمالي: %', v_total_subs;
    RAISE NOTICE '  • نشط: %', v_active_subs;
    RAISE NOTICE '  • ملغي: %', v_cancelled_subs;
    RAISE NOTICE '  • معدل الإلغاء: %%', 
        CASE 
            WHEN v_total_subs > 0 
            THEN ROUND((v_cancelled_subs::NUMERIC / v_total_subs) * 100, 1)
            ELSE 0 
        END;
    
    -- الإيرادات الشهرية (من الاشتراكات النشطة)
    SELECT COALESCE(SUM(sp.price_monthly), 0)
    INTO v_total_revenue
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.status = 'active';
    
    RAISE NOTICE '';
    RAISE NOTICE '💰 الإيرادات الشهرية: $%', v_total_revenue;
    
    -- توزيع الباقات
    RAISE NOTICE '';
    RAISE NOTICE '📊 توزيع الباقات:';
    FOR r IN (
        SELECT 
            sp.code,
            sp.name_en,
            COUNT(*) as sub_count,
            SUM(sp.price_monthly) as revenue
        FROM tenant_subscriptions ts
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE ts.status = 'active'
        GROUP BY sp.code, sp.name_en
        ORDER BY sub_count DESC
    ) LOOP
        RAISE NOTICE '  • % (%): % اشتراكات - $%', 
            r.name_en, r.code, r.sub_count, r.revenue;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   ✅ جاهز لاختبار Dashboard!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📍 افتح: http://localhost:5174/saas';
    RAISE NOTICE '📈 يجب أن ترى:';
    RAISE NOTICE '   ✓ الإيرادات الشهرية: $%', v_total_revenue;
    RAISE NOTICE '   ✓ المشتركين النشطين: %', v_active_subs;
    RAISE NOTICE '   ✓ معدل الإلغاء: %%', 
        CASE 
            WHEN v_total_subs > 0 
            THEN ROUND((v_cancelled_subs::NUMERIC / v_total_subs) * 100, 1)
            ELSE 0 
        END;
    RAISE NOTICE '   ✓ رسوم بيانية مع البيانات';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- ملاحظات مهمة:
-- ============================================================================
-- 
-- 1. هذا السكريبت آمن للتشغيل عدة مرات (لا يضيف duplicates)
-- 
-- 2. إذا لم يكن هناك tenants، يجب إنشاءهم أولاً:
--    - من صفحة التسجيل (/auth/register)
--    - أو من SaaS Dashboard → Subscribers → Add
-- 
-- 3. يمكنك تعديل السكريبت لإضافة المزيد من الاشتراكات
-- 
-- 4. لحذف البيانات التجريبية:
--    DELETE FROM tenant_subscriptions WHERE created_at > NOW() - INTERVAL '1 hour';
-- 
-- ============================================================================
