# خطة التطوير - Development Plan
# ERP System - SaaS Management vs Accounting Module

---

## 📊 الوضع الحالي (Current Status)

### ✅ ما هو موجود:

1. **قسم المحاسبة (Accounting)**:
   - ✅ Chart of Accounts
   - ✅ Journal Entries
   - ✅ General Ledger
   - ✅ Funds Management
   - ✅ Parties
   - ✅ Reports
   - ✅ Settings
   - ✅ Dashboard
   - ✅ Services: `accountsService`, `journalEntriesService`
   - ✅ Components: جميع المكونات جاهزة

2. **قاعدة البيانات (Supabase)**:
   - ✅ جدول `tenants` موجود
   - ✅ Multi-Tenant Architecture جاهز
   - ✅ RLS Policies مطبقة
   - ✅ Super Admin System جاهز

3. **Infrastructure**:
   - ✅ ComponentLab جاهز
   - ✅ Unified Components (Sheets, Modals, Tables)
   - ✅ Translation System (9 لغات)
   - ✅ Authentication System

### ❌ ما هو مفقود:

1. **قسم SaaS Management الأساسي**:
   - ❌ Subscriptions Management
   - ❌ Plans Management
   - ❌ Modules Management
   - ❌ Payment/Billing
   - ❌ Companies Management (SaaS level)
   - ❌ Users Management (SaaS level)
   - ❌ Services للـ SaaS
   - ❌ Components للـ SaaS

2. **قاعدة البيانات الأساسية**:
   - ❌ جدول `subscriptions`
   - ❌ جدول `plans`
   - ❌ جدول `modules`
   - ❌ جدول `payments`
   - ❌ جدول `subscription_modules` (Many-to-Many)

3. **الميزات المتقدمة (Advanced Features)**:
   - ✅ **جداول Agent System** (STEP_23) - جاهز
   - ✅ **جداول Advanced Features** (STEP_24) - جاهز
   - ❌ نظام الوكلاء والمسوقين (Agent System) - Frontend
   - ❌ نظام الكوبونات والخصومات (Discount Coupons)
   - ❌ نظام الإشعارات المتقدم (Advanced Notifications)
   - ❌ نظام التذاكر والدعم الفني (Support Tickets)
   - ❌ الإعلانات والتنبيهات (Announcements)
   - ❌ التقييمات والمراجعات (Reviews)
   - ❌ سجل التغييرات (Changelog)
   - ❌ إحصائيات الاستخدام (Usage Analytics)
   - ❌ برنامج الإحالة (Referral Program)
   - ❌ Webhooks للتكاملات

---

## 🎯 الخيارات (Options)

### الخيار 1: البدء بقسم SaaS Management ⭐ (موصى به)

**المميزات:**
- ✅ بناء الأساس أولاً
- ✅ يمكن اختبار النظام كاملاً
- ✅ يمكن إضافة مستخدمين وشركات حقيقية
- ✅ يمكن تفعيل/تعطيل الموديولات
- ✅ يمكن إدارة الاشتراكات والدفع

**العيوب:**
- ⚠️ قسم المحاسبة لن يكون كاملاً بعد

**الوقت المتوقع:** 2-3 أيام

---

### الخيار 2: إنهاء قسم المحاسبة أولاً

**المميزات:**
- ✅ قسم المحاسبة سيكون كاملاً
- ✅ يمكن اختبار المحاسبة بشكل كامل

**العيوب:**
- ⚠️ لا يمكن إدارة المستخدمين والشركات
- ⚠️ لا يمكن تفعيل/تعطيل الموديولات
- ⚠️ لا يمكن إدارة الاشتراكات

**الوقت المتوقع:** 1-2 أيام

---

## 💡 التوصية (Recommendation)

### **الخيار 1: البدء بقسم SaaS Management** ⭐

**السبب:**
1. **الأساس أولاً**: SaaS Management هو الأساس الذي يبني عليه كل شيء
2. **اختبار كامل**: يمكن اختبار النظام كاملاً مع مستخدمين وشركات حقيقية
3. **إدارة الموديولات**: يمكن تفعيل/تعطيل الموديولات لكل tenant
4. **إدارة الاشتراكات**: يمكن إدارة الباقات والدفع
5. **التكامل**: يمكن ربط المحاسبة مع SaaS Management

**الخطة:**
1. إنشاء جداول Supabase للـ SaaS (1-2 ساعات)
2. إنشاء Services للـ SaaS (2-3 ساعات)
3. جلب مكونات SaaS من المشروع القديم (1-2 ساعات)
4. تطوير المكونات حسب القواعد الجديدة (3-4 ساعات)
5. إضافة المكونات إلى ComponentLab (1 ساعة)
6. إضافة التبويبات الفرعية (2-3 ساعات)
7. التكامل الكامل مع Supabase (2-3 ساعات)

**المجموع:** 12-18 ساعة عمل (2-3 أيام)

---

## 📋 خطة العمل التفصيلية (Detailed Plan)

### المرحلة 1: قاعدة البيانات (Database) - 2-3 ساعات

#### 1.1 إنشاء جداول SaaS الأساسية:

```sql
-- subscriptions: الاشتراكات
-- plans: الباقات
-- modules: الموديولات
-- subscription_modules: ربط الاشتراكات بالموديولات
-- payments: المدفوعات
-- subscription_history: تاريخ الاشتراكات
```

#### 1.2 نظام الوكلاء والمسوقين (Agent System) ✅ جاهز:
- ✅ `agents` - جدول الوكلاء
- ✅ `agent_tiers` - مستويات الوكلاء
- ✅ `agent_commissions` - سجل العمولات
- ✅ `agent_withdrawals` - طلبات السحب
- ✅ `agent_targets` - الأهداف والإنجازات
- ✅ `agent_bonuses` - المكافآت والحوافز
- ✅ `agent_events` - سجل الأحداث
- ✅ `agent_messages` - الرسائل والمحادثات
- ✅ `marketing_materials` - المواد التسويقية

#### 1.3 الميزات المتقدمة ✅ جاهز:
- ✅ `discount_coupons` - الكوبونات والخصومات
- ✅ `coupon_usage` - سجل استخدام الكوبونات
- ✅ `notification_templates` - قوالب الإشعارات
- ✅ `notifications` - سجل الإشعارات
- ✅ `in_app_notifications` - إشعارات داخل التطبيق
- ✅ `support_tickets` - التذاكر والدعم الفني
- ✅ `ticket_replies` - ردود التذاكر
- ✅ `announcements` - الإعلانات والتنبيهات
- ✅ `reviews` - التقييمات والمراجعات
- ✅ `changelog` - سجل التغييرات
- ✅ `usage_analytics` - إحصائيات الاستخدام
- ✅ `referral_program` - برنامج الإحالة
- ✅ `tenant_referrals` - إحالات العملاء
- ✅ `webhook_endpoints` - Webhooks للتكاملات
- ✅ `webhook_logs` - سجل Webhooks

#### 1.4 RLS Policies:
- Policies للـ Super Admin
- Policies للـ Tenant Admin
- Policies للـ Regular Users
- Policies للـ Agents

#### 1.5 Functions & Triggers:
- `create_subscription()`
- `activate_subscription()`
- `deactivate_subscription()`
- `check_module_access()`
- `register_agent()` ✅ جاهز
- `approve_agent()` ✅ جاهز
- `agent_create_tenant()` ✅ جاهز
- `apply_coupon()` ✅ جاهز
- `send_notification()` ✅ جاهز

---

### المرحلة 2: Services Layer - 2-3 ساعات

#### 2.1 Services المطلوبة:

```typescript
// src/services/saas/
- subscriptionsService.ts
- plansService.ts
- modulesService.ts
- paymentsService.ts
- companiesService.ts (SaaS level)
- usersService.ts (SaaS level)
```

#### 2.2 Features:
- ✅ Multi-tenant support
- ✅ Super Admin access
- ✅ Error handling
- ✅ TypeScript types

---

### المرحلة 3: Components - 4-6 ساعات

#### 3.1 جلب من المشروع القديم:
- Subscriptions List
- Plans Management
- Modules Management
- Payment History
- Companies Management (SaaS)
- Users Management (SaaS)

#### 3.2 تطوير حسب القواعد الجديدة:
- ✅ استخدام `t()` للترجمة
- ✅ استخدام Services
- ✅ استخدام `useAuth`
- ✅ استخدام Unified Components
- ✅ استخدام NexaTable
- ✅ استخدام UnifiedSheet/UnifiedModal

---

### المرحلة 4: ComponentLab - 1 ساعة

#### 4.1 إضافة المكونات:
- إضافة جميع مكونات SaaS إلى ComponentLab
- إضافة أمثلة للاستخدام
- إضافة Documentation

---

### المرحلة 5: التبويبات الفرعية - 2-3 ساعات

#### 5.1 التبويبات المطلوبة:

```
SaaS Management
├── Dashboard
├── Subscriptions
│   ├── Active Subscriptions
│   ├── Expired Subscriptions
│   ├── Pending Subscriptions
│   └── Subscription History
├── Plans
│   ├── All Plans
│   ├── Create Plan
│   └── Plan Details
├── Modules
│   ├── All Modules
│   ├── Module Permissions
│   └── Module Settings
├── Payments
│   ├── Payment History
│   ├── Pending Payments
│   └── Payment Methods
├── Companies
│   ├── All Companies
│   ├── Create Company
│   └── Company Details
└── Users
    ├── All Users
    ├── Create User
    └── User Details
```

---

### المرحلة 6: التكامل الكامل - 2-3 ساعات

#### 6.1 التكامل مع Supabase:
- ✅ Multi-tenant isolation
- ✅ RLS Policies
- ✅ Super Admin access
- ✅ Tenant Admin access
- ✅ Regular User access

#### 6.2 Features:
- ✅ Module activation/deactivation
- ✅ Subscription management
- ✅ Payment processing
- ✅ Company management
- ✅ User management

---

## 🎨 التصميم (Design)

### 1. Layout:
- استخدام نفس Layout المستخدم في المحاسبة
- استخدام MainTabsBar للتبويبات
- استخدام Unified Components

### 2. Tables:
- استخدام NexaTable
- Sorting, Filtering, Pagination
- Row selection
- Actions column

### 3. Forms:
- استخدام UnifiedSheet للـ Forms
- Validation
- Error handling
- Success messages

### 4. Modals:
- استخدام UnifiedModal
- Confirmation dialogs
- Info dialogs
- Error dialogs

---

## 📝 Checklist

### قبل البدء:
- [ ] قراءة `PROJECT_CONSTITUTION.md`
- [ ] قراءة `MANDATORY_RULES.md`
- [ ] قراءة `TRANSLATION_GUIDELINES.md`
- [ ] قراءة `DEVELOPMENT_RULES.md`

### أثناء التطوير:
- [ ] استخدام `t()` لكل نص
- [ ] إضافة المفاتيح في جميع ملفات اللغات (9 ملفات)
- [ ] استخدام Services دائماً
- [ ] استخدام `useAuth` hook
- [ ] استخدام Unified Components
- [ ] استخدام NexaTable
- [ ] Error handling
- [ ] Loading states

### بعد التطوير:
- [ ] اختبار مع تغيير اللغة
- [ ] اختبار Multi-tenant isolation
- [ ] اختبار RLS Policies
- [ ] اختبار Super Admin access
- [ ] اختبار Tenant Admin access
- [ ] اختبار Regular User access
- [ ] إضافة المكونات إلى ComponentLab

---

## 🚀 البدء (Getting Started)

### الخطوة 1: إنشاء Migration File

```bash
# في supabase/migrations/
STEP_23_create_saas_tables.sql
```

### الخطوة 2: إنشاء Services

```bash
# في src/services/saas/
mkdir -p src/services/saas
```

### الخطوة 3: إنشاء Components

```bash
# في src/features/saas/
mkdir -p src/features/saas
```

---

## 📚 المراجع

- `PROJECT_CONSTITUTION.md`
- `MANDATORY_RULES.md`
- `TRANSLATION_GUIDELINES.md`
- `DEVELOPMENT_RULES.md`
- `FRONTEND_INTEGRATION_GUIDE.md`

---

## ⏱️ الجدول الزمني (Timeline)

### اليوم 1:
- ✅ إنشاء جداول Supabase
- ✅ إنشاء Services
- ✅ إنشاء Types/Interfaces

### اليوم 2:
- ✅ جلب مكونات من المشروع القديم
- ✅ تطوير المكونات
- ✅ إضافة التبويبات

### اليوم 3:
- ✅ التكامل الكامل
- ✅ الاختبار
- ✅ إضافة إلى ComponentLab

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
