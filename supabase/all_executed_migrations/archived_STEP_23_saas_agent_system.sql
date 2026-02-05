-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 23: نظام الوكلاء والمسوقين (Agent/Reseller System)
-- Agent System Tables and Basic Setup
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ آمنة - لا تؤثر على الجداول الموجودة
-- ✅ Safe - Does not affect existing tables

-- ═══════════════════════════════════════════════════════════════
-- 1. جدول الوكلاء الرئيسي
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ التعريف ═══
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- ═══ التواصل ═══
    email VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    
    -- ═══ الموقع ═══
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- ═══ Multi-Tenant ═══
    tenant_id UUID REFERENCES tenants(id),
    
    -- ═══ المستخدم المرتبط ═══
    user_id UUID REFERENCES auth.users(id),
    
    -- ═══ نوع الوكيل ═══
    agent_type VARCHAR(20) DEFAULT 'reseller',
    -- reseller: يبيع ويحصل عمولة
    -- distributor: موزع رئيسي (عمولة أعلى)
    -- affiliate: تسويق بالعمولة فقط
    
    -- ═══ المستوى ═══
    tier VARCHAR(20) DEFAULT 'bronze',
    -- bronze: مبتدئ (15% عمولة)
    -- silver: 10+ عملاء (20% عمولة)
    -- gold: 25+ عملاء (25% عمولة)
    -- platinum: 50+ عملاء (30% عمولة)
    
    -- ═══ العمولات ═══
    commission_percent DECIMAL(5,2) DEFAULT 20,
    recurring_commission_percent DECIMAL(5,2) DEFAULT 10,
    bonus_per_tenant DECIMAL(10,2) DEFAULT 0,
    
    -- ═══ الأهداف ═══
    monthly_target_tenants INT DEFAULT 5,
    monthly_target_revenue DECIMAL(10,2) DEFAULT 1000,
    quarterly_target_tenants INT DEFAULT 15,
    yearly_target_tenants INT DEFAULT 50,
    
    -- ═══ الأرصدة ═══
    current_balance DECIMAL(10,2) DEFAULT 0,
    pending_balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_withdrawn DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- ═══ الحد الأدنى للسحب ═══
    min_withdrawal DECIMAL(10,2) DEFAULT 100,
    
    -- ═══ نسخة مجانية ═══
    free_tenant_id UUID REFERENCES tenants(id),
    free_plan_code VARCHAR(50) DEFAULT 'professional',
    
    -- ═══ رابط الإحالة ═══
    referral_code VARCHAR(50) UNIQUE,
    referral_url TEXT,
    
    -- ═══ إعدادات الإشعارات ═══
    notify_new_tenant BOOLEAN DEFAULT true,
    notify_payment BOOLEAN DEFAULT true,
    notify_commission BOOLEAN DEFAULT true,
    notification_email VARCHAR(200),
    notification_whatsapp VARCHAR(50),
    
    -- ═══ ملاحظات ═══
    internal_notes TEXT,
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: في انتظار الموافقة
    -- active: نشط
    -- suspended: موقوف
    -- terminated: منتهي
    
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    suspended_at TIMESTAMPTZ,
    suspended_reason TEXT,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_sale_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- 2. مستويات الوكلاء (Tiers)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(20) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    
    -- شروط الوصول
    min_tenants INT DEFAULT 0,
    min_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- المزايا
    commission_percent DECIMAL(5,2) NOT NULL,
    recurring_commission_percent DECIMAL(5,2) NOT NULL,
    bonus_per_tenant DECIMAL(10,2) DEFAULT 0,
    
    -- مزايا إضافية
    priority_support BOOLEAN DEFAULT false,
    dedicated_manager BOOLEAN DEFAULT false,
    custom_branding BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    
    -- العرض
    badge_color VARCHAR(7),
    icon VARCHAR(50),
    display_order INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true
);

-- إدراج المستويات الافتراضية
INSERT INTO agent_tiers (code, name_ar, name_en, min_tenants, commission_percent, recurring_commission_percent, badge_color, display_order) VALUES
('bronze', 'برونزي', 'Bronze', 0, 15, 5, '#CD7F32', 1),
('silver', 'فضي', 'Silver', 10, 20, 10, '#C0C0C0', 2),
('gold', 'ذهبي', 'Gold', 25, 25, 12, '#FFD700', 3),
('platinum', 'بلاتيني', 'Platinum', 50, 30, 15, '#E5E4E2', 4),
('diamond', 'ماسي', 'Diamond', 100, 35, 20, '#B9F2FF', 5)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. إضافة حقول للـ Tenants
-- ═══════════════════════════════════════════════════════════════

-- التحقق من وجود جدول tenants أولاً
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        -- إضافة الحقول فقط إذا كان الجدول موجوداً
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS agent_id UUID;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50);
        
        -- إضافة Foreign Key لاحقاً بعد إنشاء جدول agents
        -- سيتم إضافتها في نهاية الملف
    ELSE
        RAISE NOTICE '⚠️ جدول tenants غير موجود - سيتم تخطي إضافة الحقول';
    END IF;
END $$;
-- direct, agent, affiliate, organic, paid_ads, social_media

-- ═══════════════════════════════════════════════════════════════
-- 4. سجل العمولات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- ═══ نوع العمولة ═══
    commission_type VARCHAR(30) NOT NULL,
    -- signup: اشتراك جديد
    -- recurring: تجديد شهري
    -- upgrade: ترقية باقة
    -- addon: موديول إضافي
    -- bonus: مكافأة
    -- referral_bonus: مكافأة إحالة
    -- tier_bonus: مكافأة ترقية مستوى
    
    -- ═══ المبالغ ═══
    base_amount DECIMAL(10,2) NOT NULL,
    commission_percent DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- ═══ الفترة ═══
    period_start DATE,
    period_end DATE,
    
    -- ═══ المرجع ═══
    reference_type VARCHAR(50),
    reference_id UUID,
    invoice_number VARCHAR(50),
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: في الانتظار
    -- approved: معتمدة
    -- paid: مدفوعة
    -- cancelled: ملغاة
    -- disputed: متنازع عليها
    
    -- ═══ الموافقة ═══
    auto_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    approval_notes TEXT,
    
    -- ═══ الدفع ═══
    paid_at TIMESTAMPTZ,
    paid_by UUID,
    payment_reference VARCHAR(100),
    withdrawal_id UUID,
    
    -- ═══ التواريخ ═══
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 5. طلبات السحب
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- ═══ المبلغ ═══
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- ═══ الرسوم ═══
    fee_amount DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    
    -- ═══ طريقة السحب ═══
    withdrawal_method VARCHAR(50) NOT NULL,
    -- bank_transfer, paypal, wise, crypto, cash
    
    -- ═══ تفاصيل البنك ═══
    bank_name VARCHAR(200),
    bank_account_name VARCHAR(200),
    bank_account_number VARCHAR(100),
    bank_iban VARCHAR(50),
    bank_swift VARCHAR(20),
    bank_country VARCHAR(100),
    
    -- ═══ تفاصيل PayPal/Wise ═══
    paypal_email VARCHAR(200),
    wise_email VARCHAR(200),
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'pending',
    -- pending: في الانتظار
    -- approved: معتمد
    -- processing: قيد التنفيذ
    -- completed: مكتمل
    -- rejected: مرفوض
    -- cancelled: ملغي
    
    -- ═══ المعالجة ═══
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    completed_at TIMESTAMPTZ,
    
    -- ═══ مرجع التحويل ═══
    transaction_id VARCHAR(200),
    transaction_proof TEXT,
    
    -- ═══ ملاحظات ═══
    agent_notes TEXT,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. الأهداف والإنجازات
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- ═══ الفترة ═══
    period_type VARCHAR(20) NOT NULL,    -- monthly, quarterly, yearly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- ═══ الأهداف ═══
    target_tenants INT DEFAULT 0,
    target_revenue DECIMAL(10,2) DEFAULT 0,
    target_commissions DECIMAL(10,2) DEFAULT 0,
    
    -- ═══ الإنجازات ═══
    achieved_tenants INT DEFAULT 0,
    achieved_revenue DECIMAL(10,2) DEFAULT 0,
    achieved_commissions DECIMAL(10,2) DEFAULT 0,
    
    -- ═══ النسب ═══
    tenants_progress DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN target_tenants > 0 
        THEN LEAST((achieved_tenants::DECIMAL / target_tenants) * 100, 100)
        ELSE 0 END
    ) STORED,
    revenue_progress DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN target_revenue > 0 
        THEN LEAST((achieved_revenue / target_revenue) * 100, 100)
        ELSE 0 END
    ) STORED,
    
    -- ═══ المكافآت ═══
    bonus_earned DECIMAL(10,2) DEFAULT 0,
    bonus_paid BOOLEAN DEFAULT false,
    
    -- ═══ الحالة ═══
    status VARCHAR(20) DEFAULT 'active',
    -- active, completed, failed
    
    UNIQUE(agent_id, period_type, period_start)
);

-- ═══════════════════════════════════════════════════════════════
-- 7. المكافآت والحوافز
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ نوع المكافأة ═══
    bonus_type VARCHAR(50) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    description TEXT,
    
    -- ═══ الشروط ═══
    condition_type VARCHAR(50) NOT NULL,
    -- tenants_count: عدد العملاء
    -- revenue_amount: مبلغ الإيرادات
    -- first_sale: أول بيعة
    -- streak_days: أيام متتالية
    -- tier_upgrade: ترقية مستوى
    
    condition_value DECIMAL(10,2) NOT NULL,
    condition_period VARCHAR(20),        -- monthly, quarterly, yearly, all_time
    
    -- ═══ المكافأة ═══
    bonus_amount DECIMAL(10,2),
    bonus_percent DECIMAL(5,2),
    
    -- ═══ الصلاحية ═══
    valid_from DATE,
    valid_to DATE,
    
    -- ═══ الحدود ═══
    max_claims INT,
    max_per_agent INT DEFAULT 1,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- أمثلة على المكافآت
INSERT INTO agent_bonuses (bonus_type, name_ar, name_en, condition_type, condition_value, bonus_amount, description) VALUES
('first_sale', 'مكافأة أول بيعة', 'First Sale Bonus', 'tenants_count', 1, 50, 'مكافأة عند تسجيل أول عميل'),
('milestone_10', 'إنجاز 10 عملاء', '10 Clients Milestone', 'tenants_count', 10, 200, 'مكافأة عند الوصول لـ 10 عملاء'),
('milestone_25', 'إنجاز 25 عميل', '25 Clients Milestone', 'tenants_count', 25, 500, 'مكافأة عند الوصول لـ 25 عميل'),
('milestone_50', 'إنجاز 50 عميل', '50 Clients Milestone', 'tenants_count', 50, 1000, 'مكافأة عند الوصول لـ 50 عميل'),
('monthly_target', 'تحقيق الهدف الشهري', 'Monthly Target Achieved', 'tenants_count', 5, 100, 'مكافأة شهرية عند تحقيق الهدف')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 8. سجل أحداث الوكيل
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    event_type VARCHAR(50) NOT NULL,
    -- registered, approved, suspended, activated
    -- tenant_added, tenant_churned
    -- commission_earned, commission_paid
    -- withdrawal_requested, withdrawal_completed
    -- tier_upgraded, tier_downgraded
    -- bonus_earned, target_achieved
    -- login, password_changed
    
    event_data JSONB DEFAULT '{}',
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 9. رسائل ومحادثات الوكلاء
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- ═══ الاتجاه ═══
    direction VARCHAR(10) NOT NULL,      -- inbound (من الوكيل), outbound (للوكيل)
    
    -- ═══ المحتوى ═══
    subject VARCHAR(200),
    message TEXT NOT NULL,
    
    -- ═══ المرفقات ═══
    attachments JSONB DEFAULT '[]',
    
    -- ═══ الحالة ═══
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- ═══ الرد ═══
    reply_to_id UUID REFERENCES agent_messages(id),
    
    -- ═══ المرسل ═══
    sent_by UUID,
    sent_by_name VARCHAR(200),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 10. المواد التسويقية
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ التعريف ═══
    title_ar VARCHAR(200) NOT NULL,
    title_en VARCHAR(200),
    description TEXT,
    
    -- ═══ النوع ═══
    material_type VARCHAR(50) NOT NULL,
    -- brochure, presentation, video, banner, social_post, email_template
    
    -- ═══ الملف ═══
    file_url TEXT,
    thumbnail_url TEXT,
    file_size INT,
    file_type VARCHAR(50),
    
    -- ═══ للمنتج ═══
    product_id UUID, -- سيتم ربطه لاحقاً
    
    -- ═══ اللغة ═══
    language VARCHAR(5) DEFAULT 'ar',
    
    -- ═══ الوصول ═══
    access_level VARCHAR(20) DEFAULT 'all',
    -- all, silver+, gold+, platinum+
    
    download_count INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- Indexes (مع التحقق من وجود الجداول والأعمدة)
-- ═══════════════════════════════════════════════════════════════

-- Indexes لجدول agents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') THEN
        -- التحقق من وجود الأعمدة قبل إنشاء Indexes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'code') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(code);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'email') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'referral_code') THEN
            CREATE INDEX IF NOT EXISTS idx_agents_referral_code ON agents(referral_code);
        END IF;
    END IF;
END $$;

-- Indexes لجدول agent_commissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_commissions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_commissions' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_id ON agent_commissions(agent_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_commissions' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_commissions_tenant_id ON agent_commissions(tenant_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_commissions' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON agent_commissions(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_commissions' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_commissions_created_at ON agent_commissions(created_at);
        END IF;
    END IF;
END $$;

-- Indexes لجدول agent_withdrawals
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_withdrawals') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_withdrawals' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_agent_id ON agent_withdrawals(agent_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_withdrawals' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_status ON agent_withdrawals(status);
        END IF;
    END IF;
END $$;

-- Indexes لجدول agent_targets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_targets') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_targets' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_targets_agent_id ON agent_targets(agent_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_targets' AND column_name = 'period_type') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_targets' AND column_name = 'period_start') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_targets_period ON agent_targets(period_type, period_start);
        END IF;
    END IF;
END $$;

-- Indexes لجدول agent_events
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_events') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_events' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON agent_events(agent_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_events' AND column_name = 'event_type') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON agent_events(event_type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_events' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events(created_at);
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- إضافة Foreign Keys و Indexes للـ Tenants
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        -- إضافة Foreign Key لـ agent_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') THEN
            -- حذف Foreign Key القديم إن وجد
            ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_agent_id_fkey;
            -- إضافة Foreign Key جديد
            ALTER TABLE tenants ADD CONSTRAINT tenants_agent_id_fkey 
                FOREIGN KEY (agent_id) REFERENCES agents(id);
        END IF;
        
        -- إنشاء Indexes (مع التحقق من وجود الأعمدة)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'agent_id') THEN
            CREATE INDEX IF NOT EXISTS idx_tenants_agent_id ON tenants(agent_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'referral_code') THEN
            CREATE INDEX IF NOT EXISTS idx_tenants_referral_code ON tenants(referral_code);
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies (سيتم إضافتها في ملف منفصل)
-- ═══════════════════════════════════════════════════════════════

-- سيتم إضافة RLS Policies في STEP_25
