# 🚀 خطة التطوير المستقبلية
# Future Development Plan

---

## 📋 نظرة عامة

| الميزة | الأولوية | التعقيد | التبعيات |
|--------|----------|---------|----------|
| 🤖 وكيل الذكاء الاصطناعي | عالية | عالي | OpenAI/Claude API |
| 🗺️ دمج خرائط Google | متوسطة | متوسط | Google Maps API |

---

# 🤖 الميزة 1: وكيل الذكاء الاصطناعي (AI Assistant)

## 1.1 نظرة عامة على النظام

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          نظام وكيل الذكاء الاصطناعي                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────┐                                                          │
│   │    المستخدم     │                                                          │
│   │   💬 "أنشئ      │                                                          │
│   │   قيد محاسبي"   │                                                          │
│   └────────┬────────┘                                                          │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                    AI Assistant Interface                        │          │
│   │   ────────────────────────────────────────────────────────────   │          │
│   │   • Chat Interface (محادثة)                                     │          │
│   │   • Voice Input (صوت) - اختياري                                 │          │
│   │   • Quick Actions (أوامر سريعة)                                 │          │
│   └────────────────────────────┬────────────────────────────────────┘          │
│                                │                                                │
│                                ▼                                                │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                    AI Processing Layer                           │          │
│   │   ────────────────────────────────────────────────────────────   │          │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │          │
│   │   │   Intent     │  │   Context    │  │   Action     │         │          │
│   │   │   Detection  │──│   Manager    │──│   Executor   │         │          │
│   │   │   (فهم)      │  │   (سياق)     │  │   (تنفيذ)    │         │          │
│   │   └──────────────┘  └──────────────┘  └──────────────┘         │          │
│   └────────────────────────────┬────────────────────────────────────┘          │
│                                │                                                │
│            ┌───────────────────┼───────────────────┐                           │
│            ▼                   ▼                   ▼                           │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                    │
│   │  OpenAI API  │    │  Claude API  │    │  Local LLM   │                    │
│   │  (GPT-4)     │    │  (Opus/Sonnet)│    │  (اختياري)   │                    │
│   └──────────────┘    └──────────────┘    └──────────────┘                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 القدرات المتاحة للمستخدمين

### أ. إدخال البيانات بالذكاء الاصطناعي

| الأمر | الوصف | المثال |
|-------|-------|--------|
| إنشاء قيد | إنشاء قيد محاسبي | "أنشئ قيد مبيعات بقيمة 5000 للعميل أحمد" |
| إنشاء فاتورة | إنشاء فاتورة جديدة | "أنشئ فاتورة مبيعات لـ 10 قطع من المنتج X" |
| تسجيل دفعة | تسجيل سند قبض/صرف | "سجل دفعة 1000 ريال من العميل محمد" |
| إضافة عميل | إنشاء عميل جديد | "أضف عميل جديد اسمه شركة النور" |
| إضافة منتج | إنشاء منتج | "أضف منتج قماش قطني سعره 50 ريال" |

### ب. التحليلات والتقارير

| الأمر | الوصف | المثال |
|-------|-------|--------|
| تحليل المبيعات | تحليل أداء المبيعات | "حلل مبيعات الشهر الماضي" |
| تقرير مالي | إنشاء تقرير | "أعطني تقرير الأرباح والخسائر" |
| مقارنة | مقارنة فترات | "قارن مبيعات هذا الشهر بالشهر السابق" |
| توقعات | توقعات مستقبلية | "توقع مبيعات الشهر القادم" |
| تنبيهات | تحليل المخاطر | "هل هناك عملاء متأخرون في الدفع؟" |

### ج. المساعدة والدعم

| الأمر | الوصف | المثال |
|-------|-------|--------|
| شرح | شرح مفهوم | "اشرح لي طريقة إقفال السنة المالية" |
| مساعدة | كيفية استخدام | "كيف أضيف حساب جديد؟" |
| بحث | البحث في البيانات | "ابحث عن فواتير العميل أحمد" |
| تصحيح | اكتشاف الأخطاء | "هل هناك أخطاء في قيود اليوم؟" |

## 1.3 هيكل قاعدة البيانات

```sql
-- ═══════════════════════════════════════════════════════════════
-- جداول نظام الذكاء الاصطناعي
-- ═══════════════════════════════════════════════════════════════

-- إعدادات AI للـ Tenant
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    -- الإعدادات العامة
    is_enabled BOOLEAN DEFAULT false,
    provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic, local
    model VARCHAR(100) DEFAULT 'gpt-4-turbo',
    
    -- حدود الاستخدام
    max_users INT, -- NULL = unlimited
    allowed_user_ids UUID[], -- NULL = all users
    monthly_token_limit BIGINT DEFAULT 1000000,
    daily_request_limit INT DEFAULT 1000,
    
    -- التخصيص
    system_prompt TEXT,
    allowed_actions TEXT[] DEFAULT ARRAY['query', 'create', 'analyze'],
    restricted_entities TEXT[], -- entities AI cannot modify
    
    -- API Keys (مشفرة)
    api_key_encrypted TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل المحادثات
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    title VARCHAR(255),
    context JSONB DEFAULT '{}', -- current context (company, date range, etc.)
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- الرسائل
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    
    -- إذا كانت الرسالة تتضمن إجراء
    action_type VARCHAR(50), -- create, update, delete, query, analyze
    action_entity VARCHAR(100), -- journal_entry, invoice, customer, etc.
    action_data JSONB,
    action_result JSONB,
    action_status VARCHAR(20), -- pending, confirmed, executed, failed
    
    -- التكلفة
    tokens_used INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الاستخدام
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    request_type VARCHAR(50),
    tokens_input INT,
    tokens_output INT,
    cost_usd DECIMAL(10,6),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- القوالب المخصصة
CREATE TABLE ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    
    category VARCHAR(50), -- accounting, sales, inventory, hr
    prompt_template TEXT NOT NULL,
    variables TEXT[], -- variables to replace
    
    is_active BOOLEAN DEFAULT true,
    usage_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 1.4 خدمة الذكاء الاصطناعي (Frontend)

```typescript
// src/services/aiService.ts

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action?: AIAction;
  timestamp: Date;
}

interface AIAction {
  type: 'create' | 'update' | 'delete' | 'query' | 'analyze';
  entity: string;
  data: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'executed' | 'failed';
  result?: unknown;
}

interface AIContext {
  tenantId: string;
  companyId: string;
  userId: string;
  language: string;
  currentPage?: string;
  selectedEntity?: { type: string; id: string };
}

export const aiService = {
  // بدء محادثة جديدة
  startConversation(context: AIContext): Promise<string>;
  
  // إرسال رسالة
  sendMessage(conversationId: string, message: string): Promise<AIMessage>;
  
  // تأكيد إجراء
  confirmAction(messageId: string): Promise<AIAction>;
  
  // إلغاء إجراء
  cancelAction(messageId: string): Promise<void>;
  
  // الحصول على سجل المحادثات
  getConversations(): Promise<Conversation[]>;
  
  // الحصول على رسائل محادثة
  getMessages(conversationId: string): Promise<AIMessage[]>;
  
  // تحليل سريع
  quickAnalysis(type: 'sales' | 'expenses' | 'cash_flow', period: string): Promise<AnalysisResult>;
  
  // اقتراحات
  getSuggestions(context: AIContext): Promise<Suggestion[]>;
};
```

## 1.5 واجهة المستخدم

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════════════════╗  │
│  ║                        🤖 المساعد الذكي                                   ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  💬 مرحباً! كيف يمكنني مساعدتك اليوم؟                                  │   │
│  │                                                                         │   │
│  │  🧑 أنشئ قيد محاسبي لمبيعات بقيمة 5000 ريال للعميل شركة النور          │   │
│  │                                                                         │   │
│  │  🤖 سأنشئ قيد المبيعات التالي:                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  📋 قيد مبيعات - شركة النور                                     │   │   │
│  │  │  ──────────────────────────────────────────────────────────────  │   │   │
│  │  │  التاريخ: 2026-01-20                                            │   │   │
│  │  │                                                                   │   │   │
│  │  │  مدين:                                                           │   │   │
│  │  │  • العملاء - شركة النور ............ 5,750 ر.س                  │   │   │
│  │  │                                                                   │   │   │
│  │  │  دائن:                                                           │   │   │
│  │  │  • إيرادات المبيعات ................ 5,000 ر.س                  │   │   │
│  │  │  • ضريبة القيمة المضافة ............ 750 ر.س                    │   │   │
│  │  │                                                                   │   │   │
│  │  │  [ ✅ تأكيد وتنفيذ ]  [ ✏️ تعديل ]  [ ❌ إلغاء ]                │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  اكتب رسالتك...                                              [🎤] [📎]  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ⚡ أوامر سريعة:                                                        │   │
│  │  [📊 تقرير المبيعات] [💰 رصيد الصندوق] [📈 تحليل سريع] [❓ مساعدة]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 1.6 نظام التحكم والصلاحيات

```typescript
// إعدادات الـ Tenant للذكاء الاصطناعي
interface AITenantSettings {
  // تفعيل/تعطيل
  enabled: boolean;
  
  // التحكم بالمستخدمين
  accessControl: {
    type: 'all' | 'selected' | 'roles';
    allowedUserIds?: string[];
    allowedRoles?: string[];
    maxUsers?: number;
  };
  
  // حدود الاستخدام
  limits: {
    dailyRequests: number;
    monthlyTokens: number;
    maxConversationLength: number;
  };
  
  // الإجراءات المسموحة
  allowedActions: {
    create: boolean;
    update: boolean;
    delete: boolean;
    query: boolean;
    analyze: boolean;
  };
  
  // الكيانات المحمية (لا يمكن للـ AI التعديل عليها)
  protectedEntities: string[];
  
  // التخصيص
  customization: {
    welcomeMessage?: string;
    systemPrompt?: string;
    quickActions?: QuickAction[];
  };
}
```

---

# 🗺️ الميزة 2: دمج خرائط Google

## 2.1 حالات الاستخدام

| الحالة | الوصف | الاستخدام |
|--------|-------|----------|
| 🚚 تتبع التوصيل | تتبع مندوبي التوصيل | مبيعات، لوجستيات |
| 📍 مواقع العملاء | عرض مواقع العملاء | مبيعات، خدمة عملاء |
| 🏭 مواقع الموردين | عرض مواقع الموردين | مشتريات |
| 🏢 الفروع | عرض فروع الشركة | إدارة |
| 📊 خريطة المبيعات | توزيع المبيعات جغرافياً | تحليلات |
| 🛣️ تخطيط المسارات | تخطيط مسارات التوصيل | لوجستيات |

## 2.2 هيكل قاعدة البيانات

```sql
-- ═══════════════════════════════════════════════════════════════
-- جداول نظام الخرائط
-- ═══════════════════════════════════════════════════════════════

-- إعدادات الخرائط للـ Tenant
CREATE TABLE maps_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    is_enabled BOOLEAN DEFAULT false,
    google_api_key_encrypted TEXT,
    
    -- الإعدادات الافتراضية
    default_center_lat DECIMAL(10, 8),
    default_center_lng DECIMAL(11, 8),
    default_zoom INT DEFAULT 10,
    default_map_type VARCHAR(20) DEFAULT 'roadmap',
    
    -- الميزات المفعلة
    features JSONB DEFAULT '{
        "customer_locations": true,
        "supplier_locations": true,
        "branch_locations": true,
        "delivery_tracking": false,
        "route_planning": false,
        "sales_heatmap": false
    }',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- المواقع الجغرافية
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- الكيان المرتبط
    entity_type VARCHAR(50) NOT NULL, -- customer, supplier, branch, warehouse, delivery
    entity_id UUID NOT NULL,
    
    -- الموقع
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- الإحداثيات
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- معلومات إضافية
    place_id VARCHAR(255), -- Google Place ID
    formatted_address TEXT,
    
    is_primary BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تتبع التوصيل (Delivery Tracking)
CREATE TABLE delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- المرجع
    order_id UUID,
    invoice_id UUID,
    delivery_note_id UUID,
    
    -- المندوب
    driver_id UUID REFERENCES user_profiles(id),
    vehicle_info JSONB,
    
    -- الحالة
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_transit, delivered, failed
    
    -- المواقع
    origin_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    
    -- الأوقات
    estimated_arrival TIMESTAMPTZ,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    
    -- المسار
    planned_route JSONB, -- array of coordinates
    actual_route JSONB,
    distance_km DECIMAL(10, 2),
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل تحديثات الموقع (للتتبع المباشر)
CREATE TABLE location_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID REFERENCES delivery_tracking(id) ON DELETE CASCADE,
    
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- مناطق الخدمة (Service Areas)
CREATE TABLE service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    
    -- المنطقة (GeoJSON polygon)
    boundary JSONB NOT NULL,
    
    -- إعدادات التوصيل
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    min_order_amount DECIMAL(10, 2),
    estimated_delivery_time INT, -- minutes
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الفهارس
CREATE INDEX idx_locations_entity ON locations(entity_type, entity_id);
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX idx_delivery_tracking_status ON delivery_tracking(status);
CREATE INDEX idx_location_updates_tracking ON location_updates(tracking_id, recorded_at DESC);
```

## 2.3 واجهة المستخدم

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════════════════╗  │
│  ║  🗺️ خريطة العملاء والتوصيلات                              [🔍] [⚙️]     ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                        │    │
│  │                         ┌─────────────────────┐                        │    │
│  │                         │   🏢               │                        │    │
│  │                         │   الفرع الرئيسي    │                        │    │
│  │                         └─────────────────────┘                        │    │
│  │                                                                        │    │
│  │            📍                                      📍                  │    │
│  │         عميل 1                                  عميل 3                │    │
│  │                                                                        │    │
│  │                    🚚 ──────────────▶                                  │    │
│  │                   مندوب التوصيل                                        │    │
│  │                                                                        │    │
│  │      📍                                                                │    │
│  │   عميل 2                           📍                                  │    │
│  │                                 عميل 4                                 │    │
│  │                                                                        │    │
│  │  [−] ─────────────────────────────────────────────────────────── [+]  │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌──────────────────────────────┐ ┌──────────────────────────────────────┐    │
│  │ 📊 الإحصائيات                │ │ 🚚 التوصيلات النشطة                  │    │
│  │ ─────────────────────────── │ │ ──────────────────────────────────── │    │
│  │ • العملاء: 156              │ │ 1. طلب #1234 - في الطريق 🟢        │    │
│  │ • الفروع: 3                 │ │ 2. طلب #1235 - قيد التحضير 🟡      │    │
│  │ • المناطق: 8                │ │ 3. طلب #1236 - تم التسليم ✅        │    │
│  │ • التوصيلات اليوم: 24       │ │                                      │    │
│  └──────────────────────────────┘ └──────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 🔘 العملاء  🔘 الموردين  🔘 الفروع  🔘 التوصيلات  🔘 خريطة المبيعات    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2.4 خدمة الخرائط (Frontend)

```typescript
// src/services/mapsService.ts

interface Location {
  id: string;
  entityType: string;
  entityId: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

interface DeliveryTracking {
  id: string;
  orderId: string;
  driverName: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed';
  currentLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  estimatedArrival: Date;
}

export const mapsService = {
  // إعدادات
  getSettings(): Promise<MapsSettings>;
  updateSettings(settings: Partial<MapsSettings>): Promise<void>;
  
  // المواقع
  getLocations(entityType?: string): Promise<Location[]>;
  addLocation(data: CreateLocationInput): Promise<Location>;
  updateLocation(id: string, data: Partial<Location>): Promise<Location>;
  geocodeAddress(address: string): Promise<GeocodeResult>;
  reverseGeocode(lat: number, lng: number): Promise<AddressResult>;
  
  // التوصيل
  getActiveDeliveries(): Promise<DeliveryTracking[]>;
  getDeliveryTracking(id: string): Promise<DeliveryTracking>;
  updateDeliveryLocation(id: string, lat: number, lng: number): Promise<void>;
  
  // المسارات
  calculateRoute(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<Route>;
  optimizeRoute(locations: LatLng[]): Promise<OptimizedRoute>;
  
  // التحليلات
  getSalesHeatmap(period: string): Promise<HeatmapData>;
  getCustomerDensity(): Promise<DensityData>;
};
```

---

# 📅 خطة التنفيذ المقترحة

## المرحلة 1: الذكاء الاصطناعي (الأساسيات)

| الخطوة | الوصف | المدة المقدرة |
|--------|-------|---------------|
| 1.1 | إنشاء جداول قاعدة البيانات | - |
| 1.2 | إنشاء Edge Function للـ AI | - |
| 1.3 | بناء واجهة المحادثة | - |
| 1.4 | دمج Intent Detection | - |
| 1.5 | تنفيذ الإجراءات الأساسية | - |

## المرحلة 2: الذكاء الاصطناعي (المتقدم)

| الخطوة | الوصف | المدة المقدرة |
|--------|-------|---------------|
| 2.1 | إضافة التحليلات | - |
| 2.2 | إضافة الاقتراحات الذكية | - |
| 2.3 | نظام التحكم بالصلاحيات | - |
| 2.4 | لوحة تحكم المدير | - |

## المرحلة 3: خرائط Google (الأساسيات)

| الخطوة | الوصف | المدة المقدرة |
|--------|-------|---------------|
| 3.1 | إنشاء جداول المواقع | - |
| 3.2 | دمج Google Maps API | - |
| 3.3 | عرض مواقع العملاء/الموردين | - |
| 3.4 | إضافة/تعديل المواقع | - |

## المرحلة 4: خرائط Google (المتقدم)

| الخطوة | الوصف | المدة المقدرة |
|--------|-------|---------------|
| 4.1 | نظام تتبع التوصيل | - |
| 4.2 | تخطيط المسارات | - |
| 4.3 | مناطق الخدمة | - |
| 4.4 | خريطة المبيعات الحرارية | - |

---

# 💰 تقدير التكاليف

## تكاليف APIs

| الخدمة | السعر التقريبي | الملاحظات |
|--------|---------------|----------|
| OpenAI GPT-4 | $0.03/1K tokens (input) | للذكاء الاصطناعي |
| OpenAI GPT-4 | $0.06/1K tokens (output) | للذكاء الاصطناعي |
| Claude Sonnet | $0.003/1K tokens (input) | بديل أرخص |
| Claude Sonnet | $0.015/1K tokens (output) | بديل أرخص |
| Google Maps | $7/1000 loads | للخرائط |
| Google Geocoding | $5/1000 requests | للعناوين |
| Google Directions | $5/1000 requests | للمسارات |

## نموذج التسعير للعملاء

| الباقة | AI | خرائط | السعر المقترح |
|--------|----|----|--------------|
| Basic | ❌ | ❌ | الباقة الأساسية |
| Professional | ✅ (محدود) | ✅ (أساسي) | +30% |
| Enterprise | ✅ (غير محدود) | ✅ (كامل) | +60% |

---

# 🔐 الأمان

## للذكاء الاصطناعي
- ✅ تشفير API Keys
- ✅ Rate Limiting
- ✅ تسجيل كل الطلبات
- ✅ مراجعة الإجراءات قبل التنفيذ
- ✅ حماية الكيانات الحساسة

## للخرائط
- ✅ تشفير API Key
- ✅ تقييد النطاق (Domain Restriction)
- ✅ حدود استخدام
- ✅ عدم تخزين بيانات حساسة

---

# 📝 ملاحظات

1. **الذكاء الاصطناعي:**
   - يُنصح بالبدء بـ Claude Sonnet لانخفاض التكلفة
   - إضافة "وضع المعاينة" قبل تنفيذ أي إجراء
   - تسجيل كل التفاعلات للتحسين المستمر

2. **الخرائط:**
   - يمكن استخدام OpenStreetMap كبديل مجاني
   - التخزين المؤقت (Caching) ضروري لتقليل التكاليف
   - النظر في Mapbox كبديل أرخص

---

---

# 🇺🇦 الميزة 3: التكاملات مع الخدمات الأوكرانية

## 3.1 الخدمات المتاحة للتكامل

### أ. أنظمة الضرائب والمالية

| الخدمة | الوصف | الأهمية |
|--------|-------|---------|
| **ДПС (DPS)** | مصلحة الضرائب الأوكرانية | 🔴 عالية |
| **Checkbox/ПРРО** | نظام الإيصالات الإلكترونية | 🔴 عالية |
| **єРахунок** | الفواتير الإلكترونية الحكومية | 🔴 عالية |
| **M.E.Doc** | برنامج التقارير الضريبية | 🟡 متوسطة |

### ب. أنظمة الدفع

| الخدمة | الوصف | الرابط |
|--------|-------|--------|
| **LiqPay** | بوابة دفع PrivatBank | liqpay.ua |
| **Fondy** | بوابة دفع شاملة | fondy.ua |
| **WayForPay** | بوابة دفع | wayforpay.com |
| **Portmone** | مدفوعات أونلاين | portmone.com.ua |
| **Monobank API** | بنك رقمي | api.monobank.ua |
| **PrivatBank API** | أكبر بنك أوكراني | api.privatbank.ua |

### ج. خدمات الشحن والتوصيل

| الخدمة | الوصف |
|--------|-------|
| **Nova Poshta** | أكبر شركة شحن | novaposhta.ua |
| **Ukrposhta** | البريد الأوكراني | ukrposhta.ua |
| **Justin** | شحن وتوصيل | justin.ua |
| **Meest** | شحن دولي | meest.com |

### د. خدمات أخرى

| الخدمة | الوصف |
|--------|-------|
| **Diia (Дія)** | الخدمات الحكومية الرقمية |
| **Prozorro** | المشتريات الحكومية |
| **OpenDataBot** | بيانات الشركات والأفراد |
| **YouControl** | التحقق من الشركات |

## 3.2 هيكل التكاملات

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        بنية التكاملات الأوكرانية                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         ERP System (Frontend)                            │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│                                        ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    Supabase Edge Functions                               │   │
│   │   ──────────────────────────────────────────────────────────────────     │   │
│   │   /functions/v1/ukraine-tax        ← ДПС / Checkbox                      │   │
│   │   /functions/v1/ukraine-payment    ← LiqPay / Fondy                      │   │
│   │   /functions/v1/ukraine-shipping   ← Nova Poshta / Ukrposhta             │   │
│   │   /functions/v1/ukraine-banking    ← Monobank / PrivatBank               │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│            ┌───────────────────────────┼───────────────────────────┐           │
│            │                           │                           │           │
│            ▼                           ▼                           ▼           │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐        │
│   │  🏛️ Tax APIs      │    │  💳 Payment APIs  │    │  📦 Shipping APIs │        │
│   │  ────────────────│    │  ────────────────│    │  ────────────────│        │
│   │  • ДПС           │    │  • LiqPay        │    │  • Nova Poshta   │        │
│   │  • Checkbox      │    │  • Fondy         │    │  • Ukrposhta     │        │
│   │  • M.E.Doc       │    │  • WayForPay     │    │  • Justin        │        │
│   └──────────────────┘    └──────────────────┘    └──────────────────┘        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 جداول قاعدة البيانات

```sql
-- ═══════════════════════════════════════════════════════════════
-- جداول التكاملات الأوكرانية
-- ═══════════════════════════════════════════════════════════════

-- إعدادات التكاملات للـ Tenant
CREATE TABLE integration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    integration_type VARCHAR(50) NOT NULL, -- tax, payment, shipping, banking
    provider VARCHAR(50) NOT NULL, -- liqpay, novaposhta, checkbox, etc.
    
    is_enabled BOOLEAN DEFAULT false,
    is_sandbox BOOLEAN DEFAULT true, -- للاختبار
    
    -- بيانات الاتصال (مشفرة)
    credentials_encrypted JSONB,
    
    -- إعدادات خاصة بالمزود
    settings JSONB DEFAULT '{}',
    
    -- Webhooks
    webhook_url TEXT,
    webhook_secret TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, integration_type, provider)
);

-- سجل المعاملات مع الخدمات الخارجية
CREATE TABLE integration_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    integration_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    
    -- المرجع الداخلي
    entity_type VARCHAR(50), -- invoice, order, shipment
    entity_id UUID,
    
    -- المرجع الخارجي
    external_id VARCHAR(255),
    external_status VARCHAR(50),
    
    -- البيانات
    request_data JSONB,
    response_data JSONB,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- الإيصالات الإلكترونية (Checkbox/ПРРО)
CREATE TABLE fiscal_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    invoice_id UUID REFERENCES sales_invoices(id),
    
    -- بيانات Checkbox
    fiscal_code VARCHAR(100),
    fiscal_number VARCHAR(50),
    qr_code TEXT,
    
    -- البيانات الضريبية
    tax_number VARCHAR(20), -- ЄДРПОУ
    cashier_name VARCHAR(100),
    shift_id VARCHAR(50),
    
    receipt_url TEXT,
    receipt_data JSONB,
    
    status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- شحنات Nova Poshta
CREATE TABLE nova_poshta_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    order_id UUID,
    invoice_id UUID,
    
    -- بيانات الشحنة
    tracking_number VARCHAR(50),
    document_number VARCHAR(50),
    
    sender_city_ref VARCHAR(50),
    sender_warehouse_ref VARCHAR(50),
    recipient_city_ref VARCHAR(50),
    recipient_warehouse_ref VARCHAR(50),
    
    weight DECIMAL(10,3),
    volume_weight DECIMAL(10,3),
    declared_value DECIMAL(15,2),
    delivery_cost DECIMAL(15,2),
    
    status VARCHAR(50),
    status_code INT,
    
    estimated_delivery DATE,
    actual_delivery DATE,
    
    raw_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3.4 Edge Functions للتكاملات

```
supabase/functions/
├── ukraine-tax/
│   └── index.ts           # ДПС, Checkbox, M.E.Doc
├── ukraine-payment/
│   └── index.ts           # LiqPay, Fondy, WayForPay
├── ukraine-shipping/
│   └── index.ts           # Nova Poshta, Ukrposhta
├── ukraine-banking/
│   └── index.ts           # Monobank, PrivatBank
└── webhooks/
    ├── liqpay-webhook.ts
    ├── novaposhta-webhook.ts
    └── checkbox-webhook.ts
```

---

# 🔄 الميزة 4: تكامل N8N (Workflow Automation)

## 4.1 ما هو N8N؟

N8N هو أداة أتمتة سير العمل (Workflow Automation) مفتوحة المصدر تسمح بربط الأنظمة المختلفة.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              N8N Workflow Example                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│   │ فاتورة  │───▶│ إنشاء   │───▶│ إرسال   │───▶│ إنشاء   │───▶│ إشعار   │      │
│   │ جديدة   │    │ إيصال   │    │ للعميل  │    │ شحنة    │    │ Telegram │      │
│   │ (ERP)   │    │(Checkbox)│    │ (Email) │    │(NovaPoshta)│  │         │      │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│                                                                                 │
│   Trigger        Tax Node       Email Node    Shipping Node   Notify Node      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 طرق التكامل مع N8N

### الطريقة 1: Webhooks (موصى بها)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Webhook Integration                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ERP System                         N8N                        │
│   ──────────                         ───                        │
│                                                                 │
│   [حدث: فاتورة جديدة]                                          │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐    HTTP POST     ┌──────────────┐           │
│   │   Webhook    │ ───────────────▶ │   Webhook    │           │
│   │   Trigger    │                  │   Node       │           │
│   └──────────────┘                  └──────┬───────┘           │
│                                            │                    │
│                                            ▼                    │
│                                     ┌──────────────┐           │
│                                     │   Workflow   │           │
│                                     │   Execution  │           │
│                                     └──────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### الطريقة 2: API Polling

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Polling Integration                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   N8N                               ERP System                  │
│   ───                               ──────────                  │
│                                                                 │
│   ┌──────────────┐                                             │
│   │   Schedule   │  كل 5 دقائق                                 │
│   │   Trigger    │                                             │
│   └──────┬───────┘                                             │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐    GET /api/invoices   ┌──────────────┐    │
│   │   HTTP       │ ◀───────────────────── │   Supabase   │    │
│   │   Request    │                        │   API        │    │
│   └──────┬───────┘                        └──────────────┘    │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐                                             │
│   │   Process    │                                             │
│   │   New Items  │                                             │
│   └──────────────┘                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4.3 جداول N8N

```sql
-- ═══════════════════════════════════════════════════════════════
-- جداول تكامل N8N
-- ═══════════════════════════════════════════════════════════════

-- إعدادات N8N للـ Tenant
CREATE TABLE n8n_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    is_enabled BOOLEAN DEFAULT false,
    n8n_instance_url TEXT, -- https://n8n.company.com
    
    -- المصادقة
    api_key_encrypted TEXT,
    
    -- Webhook Secret
    webhook_secret TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks المسجلة
CREATE TABLE n8n_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- الحدث
    event_type VARCHAR(50) NOT NULL, -- invoice.created, order.shipped, etc.
    entity_type VARCHAR(50),
    
    -- الوجهة
    webhook_url TEXT NOT NULL,
    http_method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    
    -- الفلاتر (اختياري)
    filters JSONB, -- {"status": "confirmed", "amount_gt": 1000}
    
    is_active BOOLEAN DEFAULT true,
    
    -- الإحصائيات
    last_triggered_at TIMESTAMPTZ,
    trigger_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل تنفيذ Webhooks
CREATE TABLE n8n_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES n8n_webhooks(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50),
    entity_id UUID,
    
    -- الطلب
    request_payload JSONB,
    
    -- الاستجابة
    response_status INT,
    response_body TEXT,
    
    -- الحالة
    status VARCHAR(20), -- sent, delivered, failed
    error_message TEXT,
    
    execution_time_ms INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4.4 Workflow Examples

### مثال 1: فاتورة → إيصال ضريبي → إشعار

```yaml
# N8N Workflow: Invoice Processing
name: "معالجة الفاتورة الجديدة"
trigger: Webhook (invoice.created)

nodes:
  1. Webhook Trigger:
     - Event: invoice.created
     
  2. Checkbox - Create Receipt:
     - API: checkbox.ua
     - Action: create_receipt
     
  3. Email - Send to Customer:
     - Template: invoice_email
     - Attachments: [invoice_pdf, receipt_pdf]
     
  4. Telegram - Notify Admin:
     - Message: "فاتورة جديدة #{{invoice_number}}"
```

### مثال 2: طلب → شحنة Nova Poshta → تتبع

```yaml
# N8N Workflow: Order Shipping
name: "شحن الطلب"
trigger: Webhook (order.confirmed)

nodes:
  1. Webhook Trigger:
     - Event: order.confirmed
     
  2. Nova Poshta - Create Shipment:
     - API: novaposhta.ua
     - Action: create_internet_document
     
  3. Update Order:
     - API: Supabase
     - Action: update tracking_number
     
  4. SMS - Send Tracking:
     - Provider: TurboSMS
     - Template: tracking_sms
```

## 4.5 أين يتم إعداد N8N؟

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         خيارات استضافة N8N                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  الخيار 1: N8N Cloud (الأسهل)                                                  │
│  ───────────────────────────────                                                │
│  • استضافة مُدارة من n8n.io                                                    │
│  • بدون إعداد خادم                                                             │
│  • السعر: من $20/شهر                                                           │
│  • الرابط: https://n8n.io/cloud                                                │
│                                                                                 │
│  الخيار 2: Self-Hosted (موصى به للإنتاج)                                       │
│  ────────────────────────────────────────                                       │
│  • على خادمك الخاص (VPS/Dedicated)                                             │
│  • تحكم كامل                                                                   │
│  • مجاني (فقط تكلفة الخادم)                                                    │
│                                                                                 │
│  # Docker Compose                                                               │
│  docker run -d \                                                                │
│    --name n8n \                                                                 │
│    -p 5678:5678 \                                                              │
│    -v n8n_data:/home/node/.n8n \                                               │
│    n8nio/n8n                                                                   │
│                                                                                 │
│  الخيار 3: Railway/Render (وسط)                                                │
│  ─────────────────────────────────                                              │
│  • استضافة سهلة على PaaS                                                       │
│  • تكلفة منخفضة                                                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 📊 ملخص بنية التكاملات

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           بنية التكاملات الكاملة                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                        ┌─────────────────────┐                                  │
│                        │    ERP Frontend     │                                  │
│                        │    (React/Vite)     │                                  │
│                        └──────────┬──────────┘                                  │
│                                   │                                             │
│                                   ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         Supabase                                         │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│   │   │  Database   │  │  Auth       │  │  Storage    │  │  Edge Func  │   │   │
│   │   │  (Postgres) │  │  (JWT)      │  │  (Files)    │  │  (Deno)     │   │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘   │   │
│   └─────────────────────────────────────────────────────────────┼───────────┘   │
│                                                                 │               │
│                    ┌────────────────────────────────────────────┤               │
│                    │                                            │               │
│                    ▼                                            ▼               │
│   ┌─────────────────────────────────┐      ┌─────────────────────────────────┐ │
│   │           N8N                    │      │      External APIs              │ │
│   │   ────────────────────────────   │      │   ────────────────────────────  │ │
│   │                                  │      │                                 │ │
│   │   ┌──────┐  ┌──────┐  ┌──────┐  │      │   🇺🇦 Ukrainian Services:        │ │
│   │   │Email │  │SMS   │  │Custom│  │      │   • ДПС (Tax)                   │ │
│   │   │Node  │  │Node  │  │Node  │  │      │   • Checkbox (Receipts)         │ │
│   │   └──────┘  └──────┘  └──────┘  │      │   • LiqPay (Payments)           │ │
│   │                                  │      │   • Nova Poshta (Shipping)      │ │
│   │   ┌──────┐  ┌──────┐  ┌──────┐  │      │   • Monobank (Banking)          │ │
│   │   │Slack │  │Tele- │  │Excel │  │      │                                 │ │
│   │   │Node  │  │gram  │  │Node  │  │      │   🤖 AI Services:                │ │
│   │   └──────┘  └──────┘  └──────┘  │      │   • OpenAI                      │ │
│   │                                  │      │   • Claude                      │ │
│   └─────────────────────────────────┘      │                                 │ │
│                                            │   🗺️ Maps:                       │ │
│                                            │   • Google Maps                  │ │
│                                            └─────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 📱 الميزة 5: تكاملات الاتصالات (Telegram, WhatsApp, VoIP)

## 5.1 نظرة عامة

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          نظام الاتصالات المتكامل                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                           ERP System                                     │   │
│   └────────────────────────────────┬────────────────────────────────────────┘   │
│                                    │                                            │
│            ┌───────────────────────┼───────────────────────┐                   │
│            │                       │                       │                   │
│            ▼                       ▼                       ▼                   │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│   │    📱 Telegram    │  │   💬 WhatsApp    │  │   📞 VoIP/PBX    │            │
│   │   ──────────────  │  │   ──────────────  │  │   ──────────────  │            │
│   │                   │  │                   │  │                   │            │
│   │  • Bot API        │  │  • Business API   │  │  • Grandstream   │            │
│   │  • إشعارات        │  │  • إشعارات        │  │    UCM6xxx       │            │
│   │  • أوامر          │  │  • رسائل تلقائية  │  │  • Click-to-Call │            │
│   │  • تقارير         │  │  • دعم العملاء    │  │  • Call Logging  │            │
│   │                   │  │                   │  │  • CRM Integration│            │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 تكامل Telegram

### أ. القدرات

| الميزة | الوصف | الاستخدام |
|--------|-------|----------|
| **إشعارات** | إرسال تنبيهات للمدراء | فاتورة جديدة، تنبيه مخزون |
| **Bot Commands** | أوامر للاستعلام | `/sales today`, `/balance` |
| **تقارير** | إرسال تقارير يومية | ملخص المبيعات، الأرصدة |
| **تنبيهات** | تنبيهات فورية | دفعة مستلمة، طلب جديد |
| **موافقات** | طلب موافقة | موافقة على خصم، إرجاع |

### ب. هيكل Telegram Bot

```
┌─────────────────────────────────────────────────────────────────┐
│                     Telegram Bot Structure                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Commands Available:                                           │
│   ──────────────────                                            │
│   /start          - بدء المحادثة وربط الحساب                    │
│   /help           - قائمة الأوامر                               │
│   /sales          - مبيعات اليوم                                │
│   /sales week     - مبيعات الأسبوع                              │
│   /balance        - رصيد الصندوق                                │
│   /customers      - عدد العملاء                                 │
│   /pending        - الفواتير المعلقة                            │
│   /alerts         - التنبيهات النشطة                            │
│   /approve [id]   - الموافقة على طلب                            │
│   /reject [id]    - رفض طلب                                     │
│                                                                 │
│   Notifications:                                                │
│   ──────────────                                                │
│   🔔 فاتورة جديدة #1234 بقيمة 5,000 ر.س                        │
│   💰 تم استلام دفعة 2,000 ر.س من شركة النور                    │
│   ⚠️ تنبيه: المنتج X وصل للحد الأدنى                           │
│   ✅ تم شحن الطلب #5678                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5.3 تكامل WhatsApp Business

### أ. القدرات

| الميزة | الوصف | الاستخدام |
|--------|-------|----------|
| **رسائل تلقائية** | إرسال للعملاء | تأكيد طلب، فاتورة |
| **إشعارات الشحن** | تتبع الشحنة | رقم التتبع، حالة التوصيل |
| **تذكيرات الدفع** | تذكير بالمستحقات | فاتورة متأخرة |
| **دعم العملاء** | محادثة مباشرة | استفسارات، شكاوى |
| **كتالوج** | عرض المنتجات | قائمة الأسعار |

### ب. خيارات التكامل

```
┌─────────────────────────────────────────────────────────────────┐
│                   WhatsApp Integration Options                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  الخيار 1: WhatsApp Business API (الرسمي)                       │
│  ─────────────────────────────────────────                       │
│  • عبر Meta Business Suite                                      │
│  • يحتاج موافقة من Meta                                         │
│  • تكلفة: ~$0.05-0.15 لكل رسالة                                │
│  • موثوق ورسمي ✅                                                │
│                                                                 │
│  الخيار 2: WhatsApp Cloud API                                   │
│  ────────────────────────────                                    │
│  • أسهل في الإعداد                                              │
│  • 1000 رسالة مجانية/شهر                                        │
│  • عبر developers.facebook.com                                  │
│                                                                 │
│  الخيار 3: مزودي الخدمة (Business Solution Providers)           │
│  ─────────────────────────────────────────────────              │
│  • Twilio WhatsApp                                              │
│  • MessageBird                                                  │
│  • 360dialog                                                    │
│  • WATI.io                                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5.4 تكامل Grandstream UCM (VoIP/PBX)

### أ. ما هو Grandstream UCM؟

```
┌─────────────────────────────────────────────────────────────────┐
│                    Grandstream UCM Series                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UCM6202 / UCM6204 / UCM6208 / UCM6510 / UCM6302 / UCM6304     │
│                                                                 │
│  نظام PBX (مقسم هاتفي) يدعم:                                    │
│  • VoIP (SIP)                                                   │
│  • تسجيل المكالمات                                              │
│  • IVR (الرد الآلي)                                             │
│  • Call Queues                                                  │
│  • REST API للتكامل                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ب. القدرات المتاحة

| الميزة | الوصف | الفائدة |
|--------|-------|--------|
| **Click-to-Call** | اتصال بنقرة من ERP | الاتصال بالعميل مباشرة |
| **Caller ID Popup** | إظهار بيانات المتصل | معرفة العميل قبل الرد |
| **Call Logging** | تسجيل المكالمات | ربط بسجل العميل |
| **Call Recording** | حفظ التسجيلات | مراجعة المحادثات |
| **IVR Integration** | ربط الرد الآلي | توجيه للقسم المناسب |
| **CDR Sync** | مزامنة سجلات المكالمات | تقارير وتحليلات |

### ج. بنية التكامل

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Grandstream UCM Integration                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────┐                      ┌─────────────────┐                 │
│   │    ERP System   │                      │  Grandstream    │                 │
│   │                 │                      │     UCM         │                 │
│   └────────┬────────┘                      └────────┬────────┘                 │
│            │                                        │                          │
│            │         REST API / WebSocket           │                          │
│            │◀──────────────────────────────────────▶│                          │
│            │                                        │                          │
│   ┌────────┴────────────────────────────────────────┴────────┐                │
│   │                                                          │                │
│   │   الوظائف المتاحة:                                        │                │
│   │   ───────────────                                         │                │
│   │                                                          │                │
│   │   1. Click-to-Call:                                      │                │
│   │      ERP ──POST /api/v1/call/originate──▶ UCM            │                │
│   │      └─▶ يتصل بالعميل تلقائياً                            │                │
│   │                                                          │                │
│   │   2. Incoming Call Popup:                                │                │
│   │      UCM ──Webhook──▶ ERP                                │                │
│   │      └─▶ يعرض بيانات العميل                               │                │
│   │                                                          │                │
│   │   3. Call Logging:                                       │                │
│   │      UCM ──CDR Event──▶ ERP                              │                │
│   │      └─▶ يسجل المكالمة في سجل العميل                      │                │
│   │                                                          │                │
│   │   4. Recording Access:                                   │                │
│   │      ERP ──GET /recording/{id}──▶ UCM                    │                │
│   │      └─▶ تشغيل التسجيل من ERP                             │                │
│   │                                                          │                │
│   └──────────────────────────────────────────────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 5.5 جداول قاعدة البيانات للاتصالات

```sql
-- ═══════════════════════════════════════════════════════════════
-- جداول تكاملات الاتصالات
-- ═══════════════════════════════════════════════════════════════

-- إعدادات قنوات الاتصال
CREATE TABLE communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    channel_type VARCHAR(50) NOT NULL, -- telegram, whatsapp, voip, sms, email
    provider VARCHAR(50), -- grandstream, twilio, meta, etc.
    
    is_enabled BOOLEAN DEFAULT false,
    
    -- بيانات الاتصال (مشفرة)
    credentials_encrypted JSONB,
    
    -- إعدادات خاصة
    settings JSONB DEFAULT '{}',
    
    -- Webhook
    webhook_url TEXT,
    webhook_secret TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, channel_type, provider)
);

-- ربط مستخدمي Telegram
CREATE TABLE telegram_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    telegram_chat_id BIGINT NOT NULL UNIQUE,
    telegram_username VARCHAR(100),
    telegram_first_name VARCHAR(100),
    
    -- الإشعارات المفعلة
    notifications JSONB DEFAULT '{
        "new_invoice": true,
        "payment_received": true,
        "low_stock": true,
        "daily_report": false
    }',
    
    is_verified BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل رسائل Telegram/WhatsApp
CREATE TABLE message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    channel VARCHAR(20) NOT NULL, -- telegram, whatsapp, sms
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    
    -- المرسل/المستقبل
    from_identifier VARCHAR(100),
    to_identifier VARCHAR(100),
    
    -- الرسالة
    message_type VARCHAR(20), -- text, image, document, template
    content TEXT,
    template_name VARCHAR(100),
    template_params JSONB,
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    error_message TEXT,
    
    -- الربط بالكيانات
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- بيانات خارجية
    external_id VARCHAR(255),
    raw_response JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل المكالمات (VoIP)
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- معلومات المكالمة
    call_id VARCHAR(100) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    
    caller_number VARCHAR(50),
    callee_number VARCHAR(50),
    
    -- الربط بالكيانات
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    user_id UUID REFERENCES user_profiles(id),
    
    -- التوقيت
    started_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    
    -- الحالة
    status VARCHAR(20), -- ringing, answered, missed, voicemail, busy
    disposition VARCHAR(50),
    
    -- التسجيل
    recording_url TEXT,
    recording_duration_seconds INT,
    
    -- ملاحظات
    notes TEXT,
    
    -- بيانات PBX
    pbx_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- قوالب الرسائل
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    channel VARCHAR(20) NOT NULL, -- telegram, whatsapp, sms, email
    
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    
    -- المحتوى
    subject VARCHAR(255), -- للإيميل
    body TEXT NOT NULL,
    body_ar TEXT,
    
    -- المتغيرات
    variables TEXT[], -- ['customer_name', 'invoice_number', 'amount']
    
    -- للواتساب
    whatsapp_template_name VARCHAR(100),
    whatsapp_template_status VARCHAR(20), -- pending, approved, rejected
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, channel, name)
);

-- إعدادات Grandstream UCM
CREATE TABLE voip_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    -- اتصال UCM
    ucm_host VARCHAR(255) NOT NULL,
    ucm_port INT DEFAULT 8089,
    ucm_username VARCHAR(100),
    ucm_password_encrypted TEXT,
    
    -- إعدادات
    default_extension VARCHAR(20),
    click_to_call_enabled BOOLEAN DEFAULT true,
    popup_enabled BOOLEAN DEFAULT true,
    recording_enabled BOOLEAN DEFAULT false,
    
    -- Webhook لاستقبال الأحداث
    webhook_url TEXT,
    
    is_connected BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ربط الأرقام بالعملاء/الموردين
CREATE TABLE phone_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    phone_number VARCHAR(50) NOT NULL,
    
    entity_type VARCHAR(50) NOT NULL, -- customer, supplier, contact
    entity_id UUID NOT NULL,
    
    is_primary BOOLEAN DEFAULT false,
    label VARCHAR(50), -- mobile, office, home, fax
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, phone_number)
);

-- الفهارس
CREATE INDEX idx_telegram_users_chat ON telegram_users(telegram_chat_id);
CREATE INDEX idx_message_logs_channel ON message_logs(tenant_id, channel, created_at DESC);
CREATE INDEX idx_call_logs_tenant ON call_logs(tenant_id, created_at DESC);
CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_phone_mappings_number ON phone_mappings(phone_number);
```

## 5.6 Edge Functions للاتصالات

```
supabase/functions/
├── telegram/
│   ├── index.ts           # Telegram Bot Handler
│   ├── commands.ts        # معالجة الأوامر
│   └── notifications.ts   # إرسال الإشعارات
│
├── whatsapp/
│   ├── index.ts           # WhatsApp Handler
│   ├── templates.ts       # قوالب الرسائل
│   └── webhook.ts         # Webhook Handler
│
├── voip/
│   ├── index.ts           # VoIP Handler
│   ├── click-to-call.ts   # Click-to-Call
│   ├── caller-popup.ts    # Caller ID Popup
│   └── cdr-sync.ts        # Call Detail Records
│
└── notifications/
    └── index.ts           # موحد لكل القنوات
```

## 5.7 واجهة Click-to-Call

```
┌─────────────────────────────────────────────────────────────────┐
│                   بطاقة العميل مع VoIP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  👤 شركة النور للتجارة                                   │   │
│   │  ───────────────────────────────────────────────────────  │   │
│   │                                                         │   │
│   │  📱 الجوال: +380 50 123 4567      [📞 اتصال]            │   │
│   │  ☎️ المكتب: +380 44 123 4567      [📞 اتصال]            │   │
│   │                                                         │   │
│   │  ─────────────────────────────────────────────────────   │   │
│   │                                                         │   │
│   │  📋 آخر المكالمات:                                       │   │
│   │  ┌─────────────────────────────────────────────────┐    │   │
│   │  │ 📞 صادرة  │ 2026-01-20 14:30 │ 5:23 │ ▶️ تشغيل │    │   │
│   │  │ 📲 واردة │ 2026-01-19 10:15 │ 2:45 │ ▶️ تشغيل │    │   │
│   │  │ ❌ فائتة │ 2026-01-18 09:00 │ -    │          │    │   │
│   │  └─────────────────────────────────────────────────┘    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5.8 Caller ID Popup

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  📞 مكالمة واردة                              [X]       │   │
│   │  ═══════════════════════════════════════════════════════│   │
│   │                                                         │   │
│   │  👤 شركة النور للتجارة                                   │   │
│   │  📱 +380 50 123 4567                                     │   │
│   │                                                         │   │
│   │  ─────────────────────────────────────────────────────   │   │
│   │  💰 الرصيد: 15,000 ر.س (مستحق)                          │   │
│   │  📄 آخر فاتورة: #1234 - 5,000 ر.س                       │   │
│   │  📦 طلبات معلقة: 2                                       │   │
│   │  ─────────────────────────────────────────────────────   │   │
│   │                                                         │   │
│   │  [👤 فتح ملف العميل]  [📄 فاتورة جديدة]  [📝 ملاحظة]   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📋 أين يتم كل شيء؟

| التكامل | المكان | الملف/المجلد |
|---------|--------|-------------|
| **Ukrainian Tax** | Edge Functions | `supabase/functions/ukraine-tax/` |
| **Ukrainian Payment** | Edge Functions | `supabase/functions/ukraine-payment/` |
| **Ukrainian Shipping** | Edge Functions | `supabase/functions/ukraine-shipping/` |
| **N8N Webhooks** | Edge Functions | `supabase/functions/webhooks/` |
| **N8N Workflows** | N8N Instance | خارج المشروع (خادم منفصل) |
| **AI Processing** | Edge Functions | `supabase/functions/ai-assistant/` |
| **Google Maps** | Frontend | `src/components/maps/` |
| **Telegram Bot** | Edge Functions | `supabase/functions/telegram/` |
| **WhatsApp** | Edge Functions | `supabase/functions/whatsapp/` |
| **VoIP/Grandstream** | Edge Functions + Frontend | `supabase/functions/voip/` + `src/components/voip/` |
| **Google Drive (System)** | Edge Functions + Cron | `supabase/functions/backup-scheduler/` |
| **Google Drive (Tenant)** | Edge Functions + Frontend | `supabase/functions/google-drive/` + `src/features/drive/` |

---

# ☁️ الميزة 6: تكامل Google Drive (النسخ الاحتياطي والتخزين)

## 6.1 نظرة عامة على المستويين

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Google Drive Integration Levels                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    المستوى 1: على مستوى النظام (Admin)                  │   │
│   │   ═══════════════════════════════════════════════════════════════════   │   │
│   │                                                                         │   │
│   │   🔒 للمدير العام / Super Admin فقط                                     │   │
│   │                                                                         │   │
│   │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │   │
│   │   │  Full Backup  │  │ Per-Tenant    │  │  Scheduled    │              │   │
│   │   │  ────────────  │  │  Backup       │  │  Backups      │              │   │
│   │   │  كل البيانات  │  │  ────────────  │  │  ────────────  │              │   │
│   │   │  وقواعد      │  │  فصل لكل      │  │  يومي/أسبوعي  │              │   │
│   │   │  البيانات     │  │  عميل         │  │  تلقائي       │              │   │
│   │   └───────────────┘  └───────────────┘  └───────────────┘              │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    المستوى 2: على مستوى العميل (Tenant)                 │   │
│   │   ═══════════════════════════════════════════════════════════════════   │   │
│   │                                                                         │   │
│   │   👤 لكل عميل/شركة (اختياري - يفعله العميل)                             │   │
│   │                                                                         │   │
│   │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │   │
│   │   │  Image Sync   │  │  Documents    │  │  Data Export  │              │   │
│   │   │  ────────────  │  │  Backup       │  │  ────────────  │              │   │
│   │   │  مزامنة      │  │  ────────────  │  │  تصدير       │              │   │
│   │   │  الصور       │  │  نسخ المستندات │  │  بياناته     │              │   │
│   │   │  من Drive    │  │  للـ Drive    │  │  كـ Excel/CSV │              │   │
│   │   └───────────────┘  └───────────────┘  └───────────────┘              │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 المستوى 1: النسخ الاحتياطي على مستوى النظام

### أ. أنواع النسخ الاحتياطي

| النوع | المحتوى | التكرار | الحجم |
|-------|---------|---------|-------|
| **Full System Backup** | كل قاعدة البيانات | أسبوعي | كبير |
| **Incremental Backup** | التغييرات فقط | يومي | صغير |
| **Per-Tenant Backup** | بيانات عميل واحد | حسب الطلب | متوسط |
| **Storage Backup** | الملفات والمستندات | أسبوعي | كبير |

### ب. هيكل المجلدات على Google Drive (System Level)

```
📁 ERP-System-Backups/
│
├── 📁 database/
│   ├── 📁 full/
│   │   ├── backup_2026-01-20_full.sql.gz
│   │   ├── backup_2026-01-13_full.sql.gz
│   │   └── ...
│   │
│   └── 📁 incremental/
│       ├── backup_2026-01-20_incr.sql.gz
│       ├── backup_2026-01-19_incr.sql.gz
│       └── ...
│
├── 📁 tenants/
│   ├── 📁 tenant-001/
│   │   ├── 📁 database/
│   │   │   └── tenant_backup_2026-01-20.sql.gz
│   │   ├── 📁 documents/
│   │   │   └── documents_2026-01-20.zip
│   │   └── 📁 exports/
│   │       └── data_export_2026-01-20.xlsx
│   │
│   ├── 📁 tenant-002/
│   │   └── ...
│   │
│   └── 📁 tenant-003/
│       └── ...
│
├── 📁 storage/
│   └── storage_backup_2026-01-20.tar.gz
│
└── 📁 logs/
    ├── backup_log_2026-01-20.json
    └── ...
```

### ج. جدول النسخ الاحتياطي التلقائي

```
┌─────────────────────────────────────────────────────────────────┐
│                   Backup Schedule                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   يومياً (02:00 صباحاً):                                        │
│   ─────────────────────                                         │
│   • Incremental Database Backup                                │
│   • Audit Logs Backup                                          │
│                                                                 │
│   أسبوعياً (الجمعة 03:00 صباحاً):                                │
│   ─────────────────────────────                                 │
│   • Full Database Backup                                       │
│   • Storage Files Backup                                       │
│   • Per-Tenant Separated Backups                               │
│                                                                 │
│   شهرياً (أول الشهر):                                           │
│   ──────────────────                                            │
│   • Full System Archive                                        │
│   • Cleanup old backups (>90 days)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6.3 المستوى 2: على مستوى العميل (Tenant)

### أ. الميزات المتاحة للعميل

| الميزة | الوصف | الاستخدام |
|--------|-------|----------|
| **Image Sync** | مزامنة الصور من Drive | صور المنتجات من مجلد مشترك |
| **Document Backup** | نسخ المستندات للـ Drive | حفظ العقود والفواتير |
| **Data Export** | تصدير البيانات | Excel/CSV للتقارير |
| **External Images** | ربط صور خارجية | قاعدة صور على Drive |
| **Manual Backup** | نسخ احتياطي يدوي | العميل يطلب نسخة |

### ب. واجهة المستخدم للعميل

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════════════════╗  │
│  ║  ☁️ إعدادات Google Drive                                                  ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔗 حالة الربط: ✅ متصل بحساب company@gmail.com                         │   │
│  │                                                          [🔄 إعادة ربط]  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📁 مجلد المزامنة:                                                       │   │
│  │  ─────────────────                                                       │   │
│  │  ERP-Data/MyCompany                                    [📂 تغيير]       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ⚙️ خيارات المزامنة:                                                     │   │
│  │  ──────────────────                                                      │   │
│  │                                                                         │   │
│  │  ☑️ مزامنة صور المنتجات                                                  │   │
│  │     └─ مجلد: /Products/Images                                           │   │
│  │                                                                         │   │
│  │  ☑️ نسخ المستندات احتياطياً                                              │   │
│  │     └─ مجلد: /Documents/Backup                                          │   │
│  │                                                                         │   │
│  │  ☐ تصدير التقارير تلقائياً                                               │   │
│  │     └─ مجلد: /Reports                                                   │   │
│  │                                                                         │   │
│  │  ☐ النسخ الاحتياطي التلقائي (أسبوعي)                                     │   │
│  │     └─ مجلد: /Backups                                                   │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📊 آخر نشاط:                                                            │   │
│  │  ────────────                                                            │   │
│  │  • آخر مزامنة للصور: 2026-01-20 14:30                                   │   │
│  │  • آخر نسخ احتياطي: 2026-01-19 02:00                                    │   │
│  │  • الحجم المستخدم: 2.3 GB من 15 GB                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  [💾 نسخ احتياطي الآن]  [📥 استعادة من نسخة]  [📤 تصدير البيانات]            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### ج. هيكل مجلدات العميل على Drive

```
📁 ERP-Data/
│
├── 📁 Products/
│   └── 📁 Images/
│       ├── 🖼️ product-001.jpg
│       ├── 🖼️ product-002.jpg
│       └── ...
│
├── 📁 Documents/
│   ├── 📁 Invoices/
│   │   └── 📄 invoice-1234.pdf
│   ├── 📁 Contracts/
│   │   └── 📄 contract-customer-xyz.pdf
│   └── 📁 Reports/
│       └── 📄 sales-report-jan-2026.xlsx
│
├── 📁 Backups/
│   ├── 📁 2026-01-20/
│   │   ├── customers.csv
│   │   ├── products.csv
│   │   ├── invoices.csv
│   │   └── journal_entries.csv
│   └── 📁 2026-01-13/
│       └── ...
│
└── 📁 Exports/
    ├── full_export_2026-01-20.xlsx
    └── ...
```

## 6.4 جداول قاعدة البيانات

```sql
-- ═══════════════════════════════════════════════════════════════
-- جداول تكامل Google Drive
-- ═══════════════════════════════════════════════════════════════

-- إعدادات Google Drive للنظام (Super Admin)
CREATE TABLE system_backup_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- حساب الخدمة
    service_account_email VARCHAR(255),
    service_account_key_encrypted TEXT,
    
    -- المجلد الرئيسي
    root_folder_id VARCHAR(100),
    
    -- جدول النسخ الاحتياطي
    daily_backup_enabled BOOLEAN DEFAULT true,
    daily_backup_time TIME DEFAULT '02:00',
    weekly_backup_enabled BOOLEAN DEFAULT true,
    weekly_backup_day INT DEFAULT 5, -- Friday
    weekly_backup_time TIME DEFAULT '03:00',
    
    -- الاحتفاظ
    retention_days INT DEFAULT 90,
    
    -- آخر تنفيذ
    last_daily_backup TIMESTAMPTZ,
    last_weekly_backup TIMESTAMPTZ,
    last_monthly_backup TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إعدادات Google Drive للعميل
CREATE TABLE tenant_drive_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    
    -- حالة الربط
    is_connected BOOLEAN DEFAULT false,
    
    -- بيانات OAuth
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- معلومات الحساب
    google_email VARCHAR(255),
    google_name VARCHAR(255),
    
    -- المجلدات
    root_folder_id VARCHAR(100),
    products_folder_id VARCHAR(100),
    documents_folder_id VARCHAR(100),
    backups_folder_id VARCHAR(100),
    
    -- خيارات المزامنة
    sync_product_images BOOLEAN DEFAULT false,
    sync_documents BOOLEAN DEFAULT false,
    auto_backup_enabled BOOLEAN DEFAULT false,
    auto_export_reports BOOLEAN DEFAULT false,
    
    -- الجدول
    backup_frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly
    backup_day INT DEFAULT 0, -- 0=Sunday, 1=Monday, etc.
    backup_time TIME DEFAULT '02:00',
    
    -- الإحصائيات
    storage_used_bytes BIGINT DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    last_backup_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل عمليات النسخ الاحتياطي
CREATE TABLE backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    backup_type VARCHAR(50) NOT NULL, -- full, incremental, tenant, storage
    backup_level VARCHAR(20) NOT NULL, -- system, tenant
    
    -- التفاصيل
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- الحجم
    total_size_bytes BIGINT,
    compressed_size_bytes BIGINT,
    
    -- الملفات
    files_count INT,
    drive_file_id VARCHAR(100),
    drive_file_url TEXT,
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    error_message TEXT,
    
    -- التفاصيل
    details JSONB DEFAULT '{}'
);

-- ربط الملفات بـ Google Drive
CREATE TABLE drive_file_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- الملف المحلي
    local_entity_type VARCHAR(50), -- product_image, document, export
    local_entity_id UUID,
    local_file_path TEXT,
    
    -- الملف على Drive
    drive_file_id VARCHAR(100) NOT NULL,
    drive_file_name VARCHAR(255),
    drive_folder_id VARCHAR(100),
    drive_web_view_url TEXT,
    drive_download_url TEXT,
    
    -- المزامنة
    sync_direction VARCHAR(20) DEFAULT 'upload', -- upload, download, bidirectional
    last_synced_at TIMESTAMPTZ,
    local_modified_at TIMESTAMPTZ,
    drive_modified_at TIMESTAMPTZ,
    
    -- الحجم
    file_size_bytes BIGINT,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, local_entity_type, local_entity_id)
);

-- طلبات النسخ الاحتياطي اليدوية
CREATE TABLE backup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id),
    
    backup_type VARCHAR(50) NOT NULL, -- full_data, documents, specific_tables
    tables_to_backup TEXT[], -- للنسخ الجزئي
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- النتيجة
    backup_log_id UUID REFERENCES backup_logs(id),
    download_url TEXT,
    download_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- الفهارس
CREATE INDEX idx_backup_logs_tenant ON backup_logs(tenant_id, created_at DESC);
CREATE INDEX idx_backup_logs_status ON backup_logs(status);
CREATE INDEX idx_drive_mappings_tenant ON drive_file_mappings(tenant_id);
CREATE INDEX idx_drive_mappings_entity ON drive_file_mappings(local_entity_type, local_entity_id);
```

## 6.5 Edge Functions للـ Google Drive

```
supabase/functions/
├── google-drive/
│   ├── index.ts              # Main handler
│   ├── auth.ts               # OAuth handling
│   ├── upload.ts             # Upload files
│   ├── download.ts           # Download files
│   ├── sync.ts               # Sync logic
│   └── backup.ts             # Backup logic
│
├── backup-scheduler/
│   ├── index.ts              # Cron job handler
│   ├── daily.ts              # Daily backup
│   ├── weekly.ts             # Weekly backup
│   └── tenant-backup.ts      # Per-tenant backup
│
└── restore/
    └── index.ts              # Restore from backup
```

## 6.6 سيناريوهات الاستخدام

### سيناريو 1: مزامنة صور المنتجات

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   العميل لديه 500 صورة منتج على Google Drive                    │
│                                                                 │
│   1. يربط حسابه بـ Google Drive ✅                              │
│   2. يحدد مجلد الصور: /Products/Images                         │
│   3. يفعل "مزامنة صور المنتجات"                                 │
│   4. النظام يقرأ الصور ويربطها بالمنتجات                        │
│                                                                 │
│   النتيجة:                                                      │
│   ─────────                                                     │
│   • الصور تُعرض في ERP من Google Drive مباشرة                  │
│   • لا تُخزن في Supabase Storage (توفير مساحة)                 │
│   • أي تحديث على Drive يظهر تلقائياً                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### سيناريو 2: النسخ الاحتياطي التلقائي للعميل

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   كل يوم أحد الساعة 2 صباحاً:                                   │
│                                                                 │
│   1. Edge Function تبدأ                                        │
│   2. تجمع بيانات العميل:                                        │
│      • العملاء (CSV)                                           │
│      • المنتجات (CSV)                                          │
│      • الفواتير (CSV)                                          │
│      • القيود المحاسبية (CSV)                                   │
│   3. تضغط الملفات (ZIP)                                        │
│   4. ترفع للـ Drive: /Backups/2026-01-20/                      │
│   5. ترسل إشعار للعميل ✅                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### سيناريو 3: استعادة البيانات

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   العميل يريد استعادة بيانات من نسخة قديمة:                     │
│                                                                 │
│   1. يختار النسخة: 2026-01-15                                  │
│   2. يختار ما يريد استعادته:                                    │
│      ☑️ العملاء                                                 │
│      ☐ المنتجات                                                 │
│      ☑️ الفواتير                                                │
│   3. يضغط "استعادة"                                            │
│   4. النظام ينشئ نسخة احتياطية للبيانات الحالية (حماية)         │
│   5. يستعيد البيانات المحددة                                    │
│   6. يُعلم العميل بالنتيجة                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6.7 الأمان

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Measures                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔐 على مستوى النظام:                                          │
│   ─────────────────────                                         │
│   • Service Account مع صلاحيات محدودة                          │
│   • مفاتيح مشفرة في قاعدة البيانات                              │
│   • مجلدات مفصولة لكل عميل                                     │
│   • لا يمكن لعميل الوصول لبيانات آخر                           │
│                                                                 │
│   🔐 على مستوى العميل:                                          │
│   ─────────────────────                                         │
│   • OAuth 2.0 (العميل يسمح بالوصول)                            │
│   • Refresh Tokens مشفرة                                       │
│   • Scopes محدودة (drive.file فقط)                             │
│   • العميل يمكنه إلغاء الوصول أي وقت                           │
│                                                                 │
│   🔐 النسخ الاحتياطية:                                          │
│   ─────────────────────                                         │
│   • مشفرة قبل الرفع (AES-256)                                  │
│   • مضغوطة (GZIP)                                              │
│   • Retention policy (90 يوم)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 🏗️ ملخص بنية التكاملات الكاملة

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           البنية الشاملة للتكاملات                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                         ┌─────────────────────┐                                 │
│                         │    ERP Frontend     │                                 │
│                         │    (React/Vite)     │                                 │
│                         └──────────┬──────────┘                                 │
│                                    │                                            │
│                                    ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         Supabase                                         │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│   │   │  Database   │  │    Auth     │  │   Storage   │  │  Edge Func  │   │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘   │   │
│   └─────────────────────────────────────────────────────────────┼───────────┘   │
│                                                                 │               │
│   ┌─────────────────────────────────────────────────────────────┼───────────┐   │
│   │                        Edge Functions                       │           │   │
│   │   ════════════════════════════════════════════════════════════════════  │   │
│   │                                                                         │   │
│   │   🇺🇦 Ukrainian         🔄 Automation       📱 Communication            │   │
│   │   ─────────────         ──────────────      ────────────────            │   │
│   │   • ukraine-tax/        • webhooks/         • telegram/                 │   │
│   │   • ukraine-payment/    • n8n-trigger/      • whatsapp/                 │   │
│   │   • ukraine-shipping/                       • voip/                     │   │
│   │   • ukraine-banking/                        • notifications/            │   │
│   │                                                                         │   │
│   │   🤖 AI                 🗺️ Maps                                         │   │
│   │   ────                  ─────                                           │   │
│   │   • ai-assistant/       (Frontend)                                      │   │
│   │   • ai-analysis/                                                        │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│            ┌───────────────────────┼───────────────────────┐                   │
│            │                       │                       │                   │
│            ▼                       ▼                       ▼                   │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│   │  🇺🇦 Ukrainian    │  │  🔄 N8N Server   │  │  📱 Communication │            │
│   │     Services     │  │  (Self-hosted)   │  │     Services     │            │
│   │  ──────────────  │  │  ──────────────  │  │  ──────────────  │            │
│   │  • ДПС           │  │  • Workflows     │  │  • Telegram API  │            │
│   │  • Checkbox      │  │  • Schedules     │  │  • WhatsApp API  │            │
│   │  • LiqPay        │  │  • Triggers      │  │  • Grandstream   │            │
│   │  • Nova Poshta   │  │                  │  │    UCM API       │            │
│   │  • Monobank      │  │                  │  │                  │            │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                 │
│            ┌───────────────────────────────────────────────┐                   │
│            │                                               │                   │
│            ▼                                               ▼                   │
│   ┌──────────────────┐                          ┌──────────────────┐          │
│   │  🤖 AI Services   │                          │  🗺️ Maps Services │          │
│   │  ──────────────  │                          │  ──────────────  │          │
│   │  • OpenAI        │                          │  • Google Maps   │          │
│   │  • Claude        │                          │  • Geocoding     │          │
│   │  • Local LLM     │                          │  • Directions    │          │
│   └──────────────────┘                          └──────────────────┘          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ✅ قائمة التكاملات الجاهزة للتطوير

| # | التكامل | الفئة | الأولوية | الحالة |
|---|---------|-------|----------|--------|
| 1 | 🤖 AI Assistant | ذكاء اصطناعي | عالية | 📋 مخطط |
| 2 | 🗺️ Google Maps | خرائط | متوسطة | 📋 مخطط |
| 3 | 🇺🇦 Checkbox/ПРРО | ضرائب أوكرانية | عالية | 📋 مخطط |
| 4 | 🇺🇦 LiqPay | دفع أوكراني | عالية | 📋 مخطط |
| 5 | 🇺🇦 Nova Poshta | شحن أوكراني | متوسطة | 📋 مخطط |
| 6 | 🇺🇦 Monobank | بنوك أوكرانية | منخفضة | 📋 مخطط |
| 7 | 🔄 N8N | أتمتة | متوسطة | 📋 مخطط |
| 8 | 📱 Telegram Bot | اتصالات | متوسطة | 📋 مخطط |
| 9 | 💬 WhatsApp Business | اتصالات | متوسطة | 📋 مخطط |
| 10 | 📞 Grandstream UCM | VoIP | منخفضة | 📋 مخطط |
| 11 | ☁️ Google Drive (System) | نسخ احتياطي | عالية | 📋 مخطط |
| 12 | ☁️ Google Drive (Tenant) | تخزين/مزامنة | متوسطة | 📋 مخطط |

---

**تاريخ الإنشاء:** 2026-01-20
**آخر تحديث:** 2026-01-20
