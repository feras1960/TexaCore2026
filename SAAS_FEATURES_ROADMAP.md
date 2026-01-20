# خارطة طريق ميزات SaaS - SaaS Features Roadmap
# قائمة شاملة بجميع الميزات المطلوبة لتطويرها

---

## 📋 جدول المحتويات

1. [الميزات الأساسية](#الميزات-الأساسية)
2. [نظام الوكلاء والمسوقين](#نظام-الوكلاء-والمسوقين)
3. [الميزات المتقدمة](#الميزات-المتقدمة)
4. [الأولوية والجدول الزمني](#الأولوية-والجدول-الزمني)

---

## 🎯 الميزات الأساسية

### 1. إدارة الاشتراكات (Subscriptions Management)
- [ ] عرض جميع الاشتراكات
- [ ] إنشاء اشتراك جديد
- [ ] تفعيل/تعطيل اشتراك
- [ ] تجديد اشتراك
- [ ] ترقية/تخفيض باقة
- [ ] إلغاء اشتراك
- [ ] تاريخ الاشتراكات
- [ ] فلاتر (نشط، منتهي، معلق)
- [ ] بحث وترتيب

**الملفات المطلوبة:**
- `src/features/saas/Subscriptions.tsx`
- `src/services/saas/subscriptionsService.ts`
- `src/components/saas/SubscriptionCard.tsx`
- `src/components/saas/SubscriptionDetailsSheet.tsx`

---

### 2. إدارة الباقات (Plans Management)
- [ ] عرض جميع الباقات
- [ ] إنشاء باقة جديدة
- [ ] تعديل باقة
- [ ] حذف باقة
- [ ] تفعيل/تعطيل باقة
- [ ] مقارنة الباقات
- [ ] عرض الميزات لكل باقة

**الملفات المطلوبة:**
- `src/features/saas/Plans.tsx`
- `src/services/saas/plansService.ts`
- `src/components/saas/PlanCard.tsx`
- `src/components/saas/PlanComparison.tsx`

---

### 3. إدارة الموديولات (Modules Management)
- [ ] عرض جميع الموديولات
- [ ] تفعيل/تعطيل موديول لـ tenant
- [ ] إضافة موديول جديد
- [ ] تعديل موديول
- [ ] حذف موديول
- [ ] عرض الموديولات المتاحة لكل باقة

**الملفات المطلوبة:**
- `src/features/saas/Modules.tsx`
- `src/services/saas/modulesService.ts`
- `src/components/saas/ModuleCard.tsx`
- `src/components/saas/ModuleToggle.tsx`

---

### 4. إدارة المدفوعات (Payments Management)
- [ ] عرض جميع المدفوعات
- [ ] تسجيل دفعة جديدة
- [ ] معالجة دفعة
- [ ] إلغاء دفعة
- [ ] استرداد دفعة
- [ ] فواتير المدفوعات
- [ ] تقارير المدفوعات

**الملفات المطلوبة:**
- `src/features/saas/Payments.tsx`
- `src/services/saas/paymentsService.ts`
- `src/components/saas/PaymentCard.tsx`
- `src/components/saas/PaymentDetailsSheet.tsx`

---

### 5. إدارة الشركات (Companies Management - SaaS Level)
- [ ] عرض جميع الشركات
- [ ] إنشاء شركة جديدة
- [ ] تعديل شركة
- [ ] حذف شركة
- [ ] تفعيل/تعطيل شركة
- [ ] عرض تفاصيل الشركة
- [ ] ربط شركة بـ tenant

**الملفات المطلوبة:**
- `src/features/saas/Companies.tsx`
- `src/services/saas/companiesService.ts`
- `src/components/saas/CompanyCard.tsx`
- `src/components/saas/CompanyDetailsSheet.tsx`

---

### 6. إدارة المستخدمين (Users Management - SaaS Level)
- [ ] عرض جميع المستخدمين
- [ ] إنشاء مستخدم جديد
- [ ] تعديل مستخدم
- [ ] حذف مستخدم
- [ ] تفعيل/تعطيل مستخدم
- [ ] إعادة تعيين كلمة المرور
- [ ] عرض صلاحيات المستخدم

**الملفات المطلوبة:**
- `src/features/saas/Users.tsx`
- `src/services/saas/usersService.ts`
- `src/components/saas/UserCard.tsx`
- `src/components/saas/UserDetailsSheet.tsx`

---

## 👥 نظام الوكلاء والمسوقين (Agent System)

### 0. نظام White Label للوكلاء ⭐ (جديد)
- [ ] عرض الوكلاء بـ White Label
- [ ] تسجيل دفعة White Label
- [ ] تفعيل White Label بعد الدفع
- [ ] إدارة الدومينات الخاصة
- [ ] إعدادات العلامة التجارية (الشعار، الألوان، المعلومات)
- [ ] عرض إحصائيات White Label
- [ ] إدارة صلاحية White Label

**المميزات:**
- ✅ دفع مبلغ واحد (مثلاً 10,000 دولار) للحصول على White Label
- ✅ دومين خاص (erp.companyname.com أو companyname.com)
- ✅ شعار وألوان مخصصة
- ✅ معلومات اتصال خاصة
- ✅ نسبة أرباح 50% (بدلاً من النسبة العادية)
- ✅ بيع النظام باسم الوكيل الخاص

**الملفات المطلوبة:**
- `src/features/saas/agents/WhiteLabel.tsx`
- `src/services/saas/whiteLabelService.ts`
- `src/components/saas/agents/WhiteLabelPaymentDialog.tsx`
- `src/components/saas/agents/WhiteLabelConfigSheet.tsx`
- `src/components/saas/agents/WhiteLabelDomainManager.tsx`
- `src/components/saas/agents/WhiteLabelBrandingEditor.tsx`

**Migration:** ✅ `STEP_25_saas_white_label_system.sql` جاهز

---

### 1. إدارة الوكلاء (Agents Management)
- [ ] عرض جميع الوكلاء
- [ ] تسجيل وكيل جديد
- [ ] الموافقة على وكيل
- [ ] تعليق/إلغاء تعليق وكيل
- [ ] عرض تفاصيل الوكيل
- [ ] عرض إحصائيات الوكيل
- [ ] عرض عملاء الوكيل

**الملفات المطلوبة:**
- `src/features/saas/agents/Agents.tsx`
- `src/services/saas/agentsService.ts`
- `src/components/saas/agents/AgentCard.tsx`
- `src/components/saas/agents/AgentDetailsSheet.tsx`
- `src/components/saas/agents/AgentStats.tsx`

**Migration:** ✅ `STEP_23_saas_agent_system.sql` جاهز

---

### 2. إدارة العمولات (Commissions Management)
- [ ] عرض جميع العمولات
- [ ] اعتماد عمولات
- [ ] رفض عمولات
- [ ] دفع عمولات
- [ ] عرض تفاصيل العمولة
- [ ] تقارير العمولات

**الملفات المطلوبة:**
- `src/features/saas/agents/Commissions.tsx`
- `src/services/saas/commissionsService.ts`
- `src/components/saas/agents/CommissionCard.tsx`
- `src/components/saas/agents/CommissionDetailsSheet.tsx`

**Migration:** ✅ `STEP_23_saas_agent_system.sql` جاهز

---

### 3. طلبات السحب (Withdrawals Management)
- [ ] عرض جميع طلبات السحب
- [ ] إنشاء طلب سحب جديد
- [ ] اعتماد طلب سحب
- [ ] رفض طلب سحب
- [ ] معالجة طلب سحب
- [ ] إكمال طلب سحب
- [ ] عرض تفاصيل طلب السحب

**الملفات المطلوبة:**
- `src/features/saas/agents/Withdrawals.tsx`
- `src/services/saas/withdrawalsService.ts`
- `src/components/saas/agents/WithdrawalCard.tsx`
- `src/components/saas/agents/WithdrawalDetailsSheet.tsx`

**Migration:** ✅ `STEP_23_saas_agent_system.sql` جاهز

---

### 4. الأهداف والإنجازات (Targets & Achievements)
- [ ] عرض أهداف الوكيل
- [ ] إنشاء هدف جديد
- [ ] تعديل هدف
- [ ] عرض الإنجازات
- [ ] عرض التقدم
- [ ] المكافآت

**الملفات المطلوبة:**
- `src/features/saas/agents/Targets.tsx`
- `src/services/saas/targetsService.ts`
- `src/components/saas/agents/TargetCard.tsx`
- `src/components/saas/agents/AchievementBadge.tsx`

**Migration:** ✅ `STEP_23_saas_agent_system.sql` جاهز

---

### 5. لوحة تحكم الوكيل (Agent Dashboard)
- [ ] إحصائيات عامة
- [ ] الرصيد الحالي والمعلق
- [ ] العملاء النشطين
- [ ] العمولات الأخيرة
- [ ] الأهداف الشهرية
- [ ] المكافآت

**الملفات المطلوبة:**
- `src/features/saas/agents/AgentDashboard.tsx`
- `src/components/saas/agents/AgentStatsCards.tsx`
- `src/components/saas/agents/AgentBalanceCard.tsx`

**Migration:** ✅ `STEP_23_saas_agent_system.sql` جاهز (Views)

---

## 🚀 الميزات المتقدمة (Advanced Features)

### 1. نظام الكوبونات والخصومات (Discount Coupons)
- [ ] عرض جميع الكوبونات
- [ ] إنشاء كوبون جديد
- [ ] تعديل كوبون
- [ ] حذف كوبون
- [ ] تفعيل/تعطيل كوبون
- [ ] تطبيق كوبون
- [ ] سجل استخدام الكوبونات

**الملفات المطلوبة:**
- `src/features/saas/coupons/Coupons.tsx`
- `src/services/saas/couponsService.ts`
- `src/components/saas/coupons/CouponCard.tsx`
- `src/components/saas/coupons/ApplyCouponDialog.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 2. نظام الإشعارات المتقدم (Advanced Notifications)
- [ ] عرض جميع الإشعارات
- [ ] إنشاء قالب إشعار جديد
- [ ] تعديل قالب إشعار
- [ ] إرسال إشعار
- [ ] عرض إشعارات داخل التطبيق
- [ ] إعدادات الإشعارات

**الملفات المطلوبة:**
- `src/features/saas/notifications/Notifications.tsx`
- `src/services/saas/notificationsService.ts`
- `src/components/saas/notifications/NotificationBell.tsx`
- `src/components/saas/notifications/NotificationDropdown.tsx`
- `src/components/saas/notifications/NotificationTemplateEditor.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 3. نظام التذاكر والدعم الفني (Support Tickets)
- [ ] عرض جميع التذاكر
- [ ] إنشاء تذكرة جديدة
- [ ] الرد على تذكرة
- [ ] إغلاق تذكرة
- [ ] تعيين تذكرة
- [ ] عرض تفاصيل التذكرة
- [ ] مرفقات التذاكر

**الملفات المطلوبة:**
- `src/features/saas/support/Tickets.tsx`
- `src/services/saas/ticketsService.ts`
- `src/components/saas/support/TicketCard.tsx`
- `src/components/saas/support/TicketDetailsSheet.tsx`
- `src/components/saas/support/TicketReplyForm.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 4. الإعلانات والتنبيهات (Announcements)
- [ ] عرض جميع الإعلانات
- [ ] إنشاء إعلان جديد
- [ ] تعديل إعلان
- [ ] حذف إعلان
- [ ] تفعيل/تعطيل إعلان
- [ ] عرض إعلان في التطبيق

**الملفات المطلوبة:**
- `src/features/saas/announcements/Announcements.tsx`
- `src/services/saas/announcementsService.ts`
- `src/components/saas/announcements/AnnouncementBanner.tsx`
- `src/components/saas/announcements/AnnouncementModal.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 5. التقييمات والمراجعات (Reviews)
- [ ] عرض جميع المراجعات
- [ ] إنشاء مراجعة جديدة
- [ ] الموافقة على مراجعة
- [ ] رفض مراجعة
- [ ] الرد على مراجعة
- [ ] عرض تقييمات مميزة

**الملفات المطلوبة:**
- `src/features/saas/reviews/Reviews.tsx`
- `src/services/saas/reviewsService.ts`
- `src/components/saas/reviews/ReviewCard.tsx`
- `src/components/saas/reviews/ReviewForm.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 6. سجل التغييرات (Changelog)
- [ ] عرض جميع التغييرات
- [ ] إنشاء تغيير جديد
- [ ] تعديل تغيير
- [ ] نشر/إلغاء نشر تغيير
- [ ] عرض التغييرات في التطبيق

**الملفات المطلوبة:**
- `src/features/saas/changelog/Changelog.tsx`
- `src/services/saas/changelogService.ts`
- `src/components/saas/changelog/ChangelogCard.tsx`
- `src/components/saas/changelog/ChangelogModal.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 7. إحصائيات الاستخدام (Usage Analytics)
- [ ] عرض إحصائيات الاستخدام
- [ ] تقارير الاستخدام
- [ ] رسوم بيانية
- [ ] تصدير التقارير

**الملفات المطلوبة:**
- `src/features/saas/analytics/Analytics.tsx`
- `src/services/saas/analyticsService.ts`
- `src/components/saas/analytics/AnalyticsChart.tsx`
- `src/components/saas/analytics/AnalyticsCard.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 8. برنامج الإحالة (Referral Program)
- [ ] عرض برنامج الإحالة
- [ ] إنشاء إحالة جديدة
- [ ] عرض الإحالات
- [ ] المكافآت

**الملفات المطلوبة:**
- `src/features/saas/referrals/Referrals.tsx`
- `src/services/saas/referralsService.ts`
- `src/components/saas/referrals/ReferralCard.tsx`
- `src/components/saas/referrals/ReferralLink.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

### 9. Webhooks للتكاملات
- [ ] عرض جميع Webhooks
- [ ] إنشاء Webhook جديد
- [ ] تعديل Webhook
- [ ] حذف Webhook
- [ ] تفعيل/تعطيل Webhook
- [ ] عرض سجل Webhooks

**الملفات المطلوبة:**
- `src/features/saas/webhooks/Webhooks.tsx`
- `src/services/saas/webhooksService.ts`
- `src/components/saas/webhooks/WebhookCard.tsx`
- `src/components/saas/webhooks/WebhookDetailsSheet.tsx`

**Migration:** ✅ `STEP_24_saas_advanced_features.sql` جاهز

---

## 📅 الأولوية والجدول الزمني

### المرحلة 1: الأساسيات (أسبوع 1-2)
1. ✅ جداول Supabase الأساسية
2. ✅ جداول Agent System
3. ✅ جداول Advanced Features
4. [ ] RLS Policies
5. [ ] Functions & Triggers
6. [ ] Services Layer الأساسية

### المرحلة 2: الميزات الأساسية (أسبوع 3-4)
1. [ ] Subscriptions Management
2. [ ] Plans Management
3. [ ] Modules Management
4. [ ] Payments Management
5. [ ] Companies Management
6. [ ] Users Management

### المرحلة 3: نظام الوكلاء (أسبوع 5-6)
1. [ ] Agents Management
2. [ ] Commissions Management
3. [ ] Withdrawals Management
4. [ ] Targets & Achievements
5. [ ] Agent Dashboard
6. [ ] **White Label System** ⭐ (جديد)
   - [ ] White Label Payments
   - [ ] White Label Activation
   - [ ] Domain Management
   - [ ] Branding Configuration
   - [ ] White Label Dashboard

### المرحلة 4: الميزات المتقدمة (أسبوع 7-8)
1. [ ] Discount Coupons
2. [ ] Advanced Notifications
3. [ ] Support Tickets
4. [ ] Announcements
5. [ ] Reviews
6. [ ] Changelog
7. [ ] Usage Analytics
8. [ ] Referral Program
9. [ ] Webhooks

---

## 📝 ملاحظات مهمة

### القواعد الإلزامية:
- ✅ استخدام `t()` للترجمة دائماً
- ✅ استخدام Services دائماً
- ✅ استخدام `useAuth` hook
- ✅ استخدام Unified Components
- ✅ استخدام NexaTable
- ✅ Error Handling
- ✅ Loading States

### الملفات المرجعية:
- `PROJECT_CONSTITUTION.md`
- `MANDATORY_RULES.md`
- `TRANSLATION_GUIDELINES.md`
- `DEVELOPMENT_RULES.md`

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
