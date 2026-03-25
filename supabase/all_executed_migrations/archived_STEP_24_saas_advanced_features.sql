-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 24: الميزات المتقدمة للـ SaaS (Advanced Features)
-- Discount Coupons, Notifications, Support Tickets, etc.
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - لا تؤثر على الجداول الموجودة
-- ✅ Safe - Does not affect existing tables

-- ═══════════════════════════════════════════════════════════════
-- 1. نظام الكوبونات والخصومات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID REFERENCES tenants(id),
    
    -- ═══ التعريف ═══
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    description TEXT,
    
    -- ═══ نوع الخصم ═══
    discount_type VARCHAR(20) NOT NULL,
    -- percent: نسبة مئوية
    -- fixed: مبلغ ثابت
    -- trial_extension: تمديد الفترة التجريبية
    -- free_months: أشهر مجانية
    
    discount_value DECIMAL(10,2) NOT NULL,
    
    -- ═══ الشروط ═══
    min_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    
    -- ═══ المنتجات والباقات المستهدفة ═══
    applicable_products TEXT[] DEFAULT ARRAY['*'],
    applicable_plans TEXT[] DEFAULT ARRAY['*'],
    
    -- ═══ للوكلاء ═══
    agent_id UUID REFERENCES agents(id),
    agent_commission_percent DECIMAL(5,2),
    
    -- ═══ حدود الاستخدام ═══
    max_uses INT,
    max_uses_per_tenant INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    
    -- ═══ الصلاحية ═══
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    
    -- ═══ للمستخدمين الجدد فقط ═══
    new_tenants_only BOOLEAN DEFAULT false,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل استخدام الكوبونات
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    coupon_id UUID NOT NULL REFERENCES discount_coupons(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID, -- سيتم ربطه لاحقاً
    
    original_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) NOT NULL,
    
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. نظام الإشعارات المتقدم
-- ═══════════════════════════════════════════════════════════════

-- قوالب الإشعارات
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- ═══ النوع ═══
    notification_type VARCHAR(50) NOT NULL,
    -- welcome, trial_ending, trial_ended, payment_due, payment_received
    -- subscription_renewed, subscription_cancelled, new_feature
    -- agent_new_sale, agent_commission, agent_withdrawal
    
    -- ═══ القنوات ═══
    channels TEXT[] DEFAULT ARRAY['email'],
    -- email, sms, whatsapp, push, in_app
    
    -- ═══ المحتوى ═══
    subject_ar TEXT,
    subject_en TEXT,
    body_ar TEXT NOT NULL,
    body_en TEXT,
    
    -- ═══ متغيرات ═══
    available_variables TEXT[],
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID REFERENCES tenants(id),
    
    -- ═══ المستلم ═══
    recipient_type VARCHAR(20) NOT NULL,  -- tenant, agent, user, admin
    recipient_id UUID NOT NULL,
    recipient_email VARCHAR(200),
    recipient_phone VARCHAR(50),
    
    -- ═══ المحتوى ═══
    template_id UUID REFERENCES notification_templates(id),
    notification_type VARCHAR(50),
    
    subject TEXT,
    body TEXT NOT NULL,
    
    -- ═══ القناة ═══
    channel VARCHAR(20) NOT NULL,
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, sent, delivered, failed, read
    
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_reason TEXT,
    
    -- ═══ المرجع ═══
    reference_type VARCHAR(50),
    reference_id UUID,
    
    -- ═══ بيانات إضافية ═══
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إشعارات داخل التطبيق
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES auth.users(id),
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    notification_type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent
    
    action_url TEXT,
    action_text VARCHAR(100),
    
    icon VARCHAR(50),
    color VARCHAR(7),
    
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. نظام التذاكر والدعم الفني
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    
    tenant_id UUID REFERENCES tenants(id),
    
    -- ═══ مقدم التذكرة ═══
    requester_type VARCHAR(20) NOT NULL,  -- tenant, agent
    requester_id UUID NOT NULL,
    requester_email VARCHAR(200),
    requester_name VARCHAR(200),
    
    -- ═══ التذكرة ═══
    subject VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    
    -- ═══ التصنيف ═══
    category VARCHAR(50),
    -- billing, technical, feature_request, bug_report, general
    
    priority VARCHAR(20) DEFAULT 'normal',
    -- low, normal, high, urgent
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'open',
    -- open, in_progress, waiting_customer, resolved, closed
    
    -- ═══ المعالج ═══
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    
    -- ═══ SLA ═══
    sla_due_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- ═══ التقييم ═══
    satisfaction_rating INT CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_comment TEXT,
    
    -- ═══ مرجع ═══
    related_subscription_id UUID,
    related_invoice_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ردود التذاكر
CREATE TABLE IF NOT EXISTS ticket_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    
    -- ═══ المرسل ═══
    sender_type VARCHAR(20) NOT NULL,  -- customer, agent, support, system
    sender_id UUID,
    sender_name VARCHAR(200),
    
    message TEXT NOT NULL,
    
    -- ═══ مرفقات ═══
    attachments JSONB DEFAULT '[]',
    
    -- ═══ داخلي (للفريق فقط) ═══
    is_internal BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. الإعلانات والتنبيهات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID REFERENCES tenants(id), -- NULL = system-wide
    
    title_ar VARCHAR(200) NOT NULL,
    title_en VARCHAR(200),
    content_ar TEXT NOT NULL,
    content_en TEXT,
    
    -- ═══ النوع ═══
    announcement_type VARCHAR(50) NOT NULL,
    -- maintenance, new_feature, promotion, update, urgent
    
    -- ═══ الاستهداف ═══
    target_audience VARCHAR(20) DEFAULT 'all',
    -- all, tenants, agents, specific_plans
    target_plans TEXT[],
    target_products TEXT[],
    
    -- ═══ العرض ═══
    display_type VARCHAR(20) DEFAULT 'banner',
    -- banner, modal, toast
    
    -- ═══ الألوان ═══
    bg_color VARCHAR(7),
    text_color VARCHAR(7),
    
    -- ═══ الرابط ═══
    action_url TEXT,
    action_text VARCHAR(100),
    
    -- ═══ الصلاحية ═══
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    
    -- ═══ الإغلاق ═══
    is_dismissible BOOLEAN DEFAULT true,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 5. التقييمات والمراجعات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID, -- سيتم ربطه لاحقاً
    
    -- ═══ التقييم ═══
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    
    title VARCHAR(200),
    comment TEXT,
    
    -- ═══ الجوانب ═══
    ease_of_use_rating INT CHECK (ease_of_use_rating BETWEEN 1 AND 5),
    features_rating INT CHECK (features_rating BETWEEN 1 AND 5),
    support_rating INT CHECK (support_rating BETWEEN 1 AND 5),
    value_rating INT CHECK (value_rating BETWEEN 1 AND 5),
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, approved, rejected
    
    is_featured BOOLEAN DEFAULT false,
    
    -- ═══ الموافقة ═══
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    
    -- ═══ الرد ═══
    admin_reply TEXT,
    replied_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. سجل التغييرات (Changelog)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS changelog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    version VARCHAR(50) NOT NULL,
    release_date DATE NOT NULL,
    
    title_ar VARCHAR(200) NOT NULL,
    title_en VARCHAR(200),
    
    description_ar TEXT,
    description_en TEXT,
    
    -- ═══ التغييرات ═══
    changes JSONB NOT NULL,
    -- [
    --   {"type": "feature", "title_ar": "...", "description_ar": "..."},
    --   {"type": "improvement", "title_ar": "..."},
    --   {"type": "bugfix", "title_ar": "..."}
    -- ]
    
    -- ═══ المنتج ═══
    product_id UUID, -- سيتم ربطه لاحقاً
    
    is_major BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 7. إحصائيات الاستخدام
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- ═══ الفترة ═══
    period_date DATE NOT NULL,
    
    -- ═══ المستخدمين ═══
    active_users INT DEFAULT 0,
    total_logins INT DEFAULT 0,
    
    -- ═══ العمليات ═══
    invoices_created INT DEFAULT 0,
    products_added INT DEFAULT 0,
    customers_added INT DEFAULT 0,
    
    -- ═══ API ═══
    api_calls INT DEFAULT 0,
    
    -- ═══ التخزين ═══
    storage_used_mb INT DEFAULT 0,
    files_uploaded INT DEFAULT 0,
    
    -- ═══ تفاصيل ═══
    details JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, period_date)
);

-- ═══════════════════════════════════════════════════════════════
-- 8. برنامج الإحالة (Referral)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referral_program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ المكافآت ═══
    referrer_reward_type VARCHAR(20) DEFAULT 'credit',
    -- credit, discount, cash, free_months
    referrer_reward_value DECIMAL(10,2) DEFAULT 50,
    
    referee_reward_type VARCHAR(20) DEFAULT 'discount',
    referee_reward_value DECIMAL(10,2) DEFAULT 20,  -- 20% خصم
    
    -- ═══ الشروط ═══
    min_subscription_months INT DEFAULT 1,
    reward_after_days INT DEFAULT 30,  -- المكافأة بعد 30 يوم
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إحالات العملاء
CREATE TABLE IF NOT EXISTS tenant_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- المُحيل
    referrer_tenant_id UUID NOT NULL REFERENCES tenants(id),
    referrer_code VARCHAR(50) NOT NULL,
    
    -- المُحال
    referee_tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- ═══ المكافآت ═══
    referrer_reward DECIMAL(10,2),
    referrer_rewarded BOOLEAN DEFAULT false,
    referrer_rewarded_at TIMESTAMPTZ,
    
    referee_reward DECIMAL(10,2),
    referee_rewarded BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة referral_code للـ tenants (مع التحقق من وجود الجدول)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_referral_code VARCHAR(50);
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_credits DECIMAL(10,2) DEFAULT 0;
    ELSE
        RAISE NOTICE '⚠️ جدول tenants غير موجود - سيتم تخطي إضافة الحقول';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. Webhooks للتكاملات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID REFERENCES tenants(id),  -- NULL = system-wide
    
    url TEXT NOT NULL,
    
    -- ═══ الأحداث ═══
    events TEXT[] NOT NULL,
    -- tenant.created, subscription.created, subscription.cancelled
    -- invoice.created, payment.received, etc.
    
    -- ═══ الأمان ═══
    secret_key VARCHAR(200),
    
    -- ═══ الحالة ═══
    is_active BOOLEAN DEFAULT true,
    
    -- ═══ إحصائيات ═══
    last_triggered_at TIMESTAMPTZ,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الـ Webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
    
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    
    -- ═══ الاستجابة ═══
    response_status INT,
    response_body TEXT,
    
    -- ═══ المحاولات ═══
    attempt INT DEFAULT 1,
    max_attempts INT DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, sent, failed, retrying
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- 10. إدراج قوالب الإشعارات الافتراضية
-- ═══════════════════════════════════════════════════════════════

INSERT INTO notification_templates (code, name_ar, name_en, notification_type, channels, subject_ar, body_ar) VALUES
('welcome', 'ترحيب', 'Welcome', 'welcome', ARRAY['email'], 
 'مرحباً بك في {{product_name}}!', 
 'مرحباً {{tenant_name}}،\n\nشكراً لتسجيلك في {{product_name}}. فترتك التجريبية تنتهي في {{trial_end_date}}.\n\nابدأ الآن!'),

('trial_ending', 'انتهاء الفترة التجريبية', 'Trial Ending', 'trial_ending', ARRAY['email'],
 'فترتك التجريبية تنتهي قريباً',
 'مرحباً {{tenant_name}}،\n\nفترتك التجريبية تنتهي في {{trial_end_date}}. اشترك الآن للاستمرار في استخدام النظام.'),

('payment_received', 'استلام دفعة', 'Payment Received', 'payment_received', ARRAY['email'],
 'تم استلام دفعتك',
 'مرحباً {{tenant_name}}،\n\nتم استلام دفعتك بمبلغ {{amount}} {{currency}}. شكراً لك!'),

('subscription_renewed', 'تجديد الاشتراك', 'Subscription Renewed', 'subscription_renewed', ARRAY['email'],
 'تم تجديد اشتراكك',
 'مرحباً {{tenant_name}}،\n\nتم تجديد اشتراكك في باقة {{plan_name}} حتى {{period_end}}.'),

('agent_new_sale', 'بيعة جديدة للوكيل', 'Agent New Sale', 'agent_new_sale', ARRAY['email', 'whatsapp'],
 'مبروك! عميل جديد 🎉',
 'مرحباً {{agent_name}}،\n\nتم تسجيل عميل جديد: {{tenant_name}}\nعمولتك: {{commission}} {{currency}}'),

('agent_commission_approved', 'اعتماد العمولة', 'Commission Approved', 'agent_commission', ARRAY['email'],
 'تم اعتماد عمولاتك',
 'مرحباً {{agent_name}}،\n\nتم اعتماد عمولات بقيمة {{amount}} {{currency}}. رصيدك الحالي: {{balance}} {{currency}}')

ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Indexes (مع التحقق من وجود الجداول والأعمدة)
-- ═══════════════════════════════════════════════════════════════

-- Indexes لجدول discount_coupons
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discount_coupons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discount_coupons' AND column_name = 'code') THEN
            CREATE INDEX IF NOT EXISTS idx_discount_coupons_code ON discount_coupons(code);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discount_coupons' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_discount_coupons_tenant_id ON discount_coupons(tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discount_coupons' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_discount_coupons_agent_id ON discount_coupons(agent_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول coupon_usage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coupon_usage') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupon_usage' AND column_name = 'coupon_id') THEN
            CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupon_usage' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_coupon_usage_tenant_id ON coupon_usage(tenant_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_type')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        END IF;
    END IF;
END $$;

-- Indexes لجدول in_app_notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'in_app_notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'in_app_notifications' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_in_app_notifications_tenant_id ON in_app_notifications(tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'in_app_notifications' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'in_app_notifications' AND column_name = 'is_read') THEN
            CREATE INDEX IF NOT EXISTS idx_in_app_notifications_is_read ON in_app_notifications(is_read);
        END IF;
    END IF;
END $$;

-- Indexes لجدول support_tickets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'ticket_number') THEN
            CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'requester_type')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'requester_id') THEN
            CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON support_tickets(requester_type, requester_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول ticket_replies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_replies') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ticket_replies' AND column_name = 'ticket_id') THEN
            CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول announcements
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON announcements(tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'is_active') THEN
            CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'starts_at') THEN
            CREATE INDEX IF NOT EXISTS idx_announcements_starts_at ON announcements(starts_at);
        END IF;
    END IF;
END $$;

-- Indexes لجدول reviews
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_reviews_tenant_id ON reviews(tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'rating') THEN
            CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
        END IF;
    END IF;
END $$;

-- Indexes لجدول changelog
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'changelog') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'changelog' AND column_name = 'version') THEN
            CREATE INDEX IF NOT EXISTS idx_changelog_version ON changelog(version);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'changelog' AND column_name = 'release_date') THEN
            CREATE INDEX IF NOT EXISTS idx_changelog_release_date ON changelog(release_date);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'changelog' AND column_name = 'is_published') THEN
            CREATE INDEX IF NOT EXISTS idx_changelog_is_published ON changelog(is_published);
        END IF;
    END IF;
END $$;

-- Indexes لجدول usage_analytics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_analytics') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_analytics' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_usage_analytics_tenant_id ON usage_analytics(tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_analytics' AND column_name = 'period_date') THEN
            CREATE INDEX IF NOT EXISTS idx_usage_analytics_period_date ON usage_analytics(period_date);
        END IF;
    END IF;
END $$;

-- Indexes لجدول tenant_referrals
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_referrals') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_referrals' AND column_name = 'referrer_tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_tenant_referrals_referrer ON tenant_referrals(referrer_tenant_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_referrals' AND column_name = 'referee_tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_tenant_referrals_referee ON tenant_referrals(referee_tenant_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول webhook_endpoints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_endpoints') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'webhook_endpoints' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant_id ON webhook_endpoints(tenant_id);
        END IF;
    END IF;
END $$;

-- Indexes لجدول webhook_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'webhook_logs' AND column_name = 'endpoint_id') THEN
            CREATE INDEX IF NOT EXISTS idx_webhook_logs_endpoint_id ON webhook_logs(endpoint_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'webhook_logs' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies (سيتم إضافتها في ملف منفصل)
-- ═══════════════════════════════════════════════════════════════

-- سيتم إضافة RLS Policies في STEP_25
