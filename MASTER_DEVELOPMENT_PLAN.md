# 📋 مخطط التطوير الرئيسي - TexaCore ERP
# Master Development Plan

> **آخر تحديث:** 24 يناير 2026  
> **النظام:** TexaCore ERP System  
> **الحالة:** قيد التطوير النشط  
> **Backend:** 95% مكتمل | **Frontend:** 40% مكتمل

---

# 🎯 الرؤية العامة

**نظام ERP متكامل متعدد المستأجرين (Multi-Tenant) بنموذج SaaS، يستهدف:**
- 🏭 قطاع الأقمشة والنسيج
- 💱 قطاع الصرافة
- 🏥 قطاع المشافي والرعاية الصحية

**الميزات الرئيسية:**
- 🌍 دعم 9 لغات + RTL
- 💰 30 عملة + 50 دولة
- 🔧 نظام تحكم ديناميكي في الموديولات والميزات
- 📊 محاسبة متقدمة مع 3 أنواع شجرات حسابات
- 📦 إدارة المخزون والأقمشة والكونتينرات

---

# 📊 التقدم العام

## ✅ المراحل المكتملة (100%)

### 1. البنية التحتية
- ✅ نظام Multi-Tenant كامل
- ✅ Super Admin System
- ✅ Pre-provisioned Tenants (10+ تينانت جاهز)
- ✅ Row Level Security (RLS)
- ✅ نظام المصادقة والصلاحيات

### 2. نظام SaaS الأساسي
- ✅ جدول Subscription Plans
- ✅ جدول Tenants + Companies
- ✅ نظام التسجيل الكامل (`register_new_subscriber`)
- ✅ نظام الوكلاء (Agents/Resellers)
- ✅ نظام White Label

### 3. المحاسبة (Backend)
- ✅ شجرة الحسابات (35 حقل، 9 لغات)
- ✅ القيود اليومية والأستاذ العام
- ✅ الصناديق والبنوك
- ✅ مراكز التكلفة
- ✅ السنوات والفترات المحاسبية
- ✅ أنواع شجرات الحسابات (Standard, Extended, Fabric Extended)
- ✅ نظام Templates للشجرات المحاسبية

### 4. الأقمشة (Backend)
- ✅ المواد والألوان والرولونات
- ✅ الطلبيات والحجوزات
- ✅ المخازن والحركات

### 5. الكونتينرات (Backend)
- ✅ الحاويات والشحنات
- ✅ حساب التكاليف (Landed Cost)
- ✅ المصاريف والتوزيع

### 6. الترجمة
- ✅ دعم 9 لغات (ar, en, de, tr, ru, uk, it, pl, ro)
- ✅ نظام مفاتيح الترجمة `t('key.path')`
- ✅ RTL Support كامل

### 7. نظام التحكم في الموديولات والميزات (✅ جديد!)
- ✅ جدول Modules + Features
- ✅ ربط Features بالباقات
- ✅ UI Tabs القابلة للتحكم
- ✅ نظام اللغات المتعددة (حسب الباقة)
- ✅ Backend: Functions + RLS
- ✅ Frontend: Services (modulesService, featuresService, languagesService)
- ✅ Frontend: Hooks (useModules, useFeatures, useLanguages, useAllowedTabs)

### 8. نظام العملات والدول (✅ جديد!)
- ✅ **30 عملة شائعة** بترجمات كاملة (9 لغات)
- ✅ **50 دولة** من جميع القارات
- ✅ **أسماء الدول بـ 9 لغات**
- ✅ **الإعدادات المحلية الكاملة:**
  - نظام التاريخ (Gregorian, Hijri, Mixed)
  - نظام الأرقام (Latin, Arabic, Hindi)
  - نظام الوقت (12h, 24h)
  - اتجاه النص (RTL, LTR)
  - بداية الأسبوع (Saturday, Sunday, Monday)
  - الفواصل العشرية والآلاف
- ✅ **نظام التقريب الشامل:**
  - 5 أنواع تقريب (half_up, half_down, up, down, half_even)
  - تقريب مخصص لكل نوع (ضرائب، مبالغ، أسعار، مجموع)
  - إعدادات على مستوى الدول والشركات
  - دوال مساعدة للتقريب التلقائي

---

## 🚧 قيد التطوير (50-80%)

### المحاسبة (Frontend)
- 🟡 شجرة الحسابات (80%) - يعمل، يحتاج تحسينات UI
- 🟡 القيود اليومية (70%) - الأساسيات جاهزة
- 🟡 دفتر الأستاذ (60%)
- 🟡 التقارير المحاسبية (50%)

### SaaS Management (Frontend)
- 🟡 لوحة المشتركين (40%)
- 🟡 إدارة الباقات (30%)
- 🟡 نظام الوكلاء (20%)

---

## ⏳ المخطط لها (Frontend Integration)

---

# 🗺️ خطة تطوير Frontend الشاملة

## 📅 المرحلة 1: ربط الموديولات والميزات (الأولوية القصوى) ⚡

**الهدف:** تفعيل نظام التحكم الديناميكي في الواجهة

### 1.1 تحديث القائمة الجانبية (Sidebar)
- [ ] استخدام `useModules()` لجلب الموديولات المتاحة
- [ ] إخفاء/إظهار الأقسام حسب صلاحيات التينانت
- [ ] إظهار علامة "Upgrade" للموديولات المقفلة
- [ ] تحديث الأيقونات والترجمات

**الملفات المتأثرة:**
- `src/components/layout/Sidebar.tsx`

### 1.2 تطبيق التحكم في الميزات (Features)
- [ ] تحديث جميع الأزرار باستخدام `useFeatures()`
- [ ] إخفاء أزرار التصدير PDF/Excel حسب الباقة
- [ ] إخفاء ميزات متقدمة (AI Analysis, Advanced Reports)
- [ ] إضافة Tooltips للميزات المقفلة

**الملفات المتأثرة:**
- `src/components/shared/actions/ActionButtonsBar.tsx`
- `src/features/accounting/components/QuickActionsBar.tsx`
- جميع الصفحات التي تحتوي أزرار

### 1.3 تطبيق التحكم في التبويبات (Tabs)
- [ ] استخدام `useAllowedTabs()` في UniversalDetailSheet
- [ ] إخفاء تبويبات غير متاحة (AI Analysis، Documents)
- [ ] تحديث NavigationTabs ديناميكياً

**الملفات المتأثرة:**
- `src/components/sheets/universal/UniversalDetailTabs.tsx`
- `src/components/shared/tabs/DynamicTabs.tsx`

### 1.4 تطبيق التحكم في اللغات (Languages)
- [ ] استخدام `useLanguages()` في النماذج متعددة اللغات
- [ ] عرض حقول فقط للغات المفعلة
- [ ] تحديث forms الحسابات والمنتجات

**الملفات المتأثرة:**
- `src/features/accounting/ChartOfAccounts/AddAccountSheet.tsx`
- `src/features/accounting/Parties.tsx`
- جميع النماذج متعددة اللغات

**المخرجات المتوقعة:**
- ✅ نظام ديناميكي كامل يعمل
- ✅ تجربة مستخدم محسنة حسب الباقة
- ✅ Upsell واضح للميزات المميزة

---

## 📅 المرحلة 2: لوحة إدارة SaaS (الأولوية: عالية جداً) 🎛️

**الهدف:** أدوات كاملة لإدارة المشتركين والباقات

### 2.1 إدارة المشتركين (Tenants Management)
- [ ] صفحة قائمة المشتركين `src/features/saas/Subscribers.tsx`
  - عرض جميع التينانتات مع الباقة والحالة
  - فلترة حسب (الباقة، الحالة، التاريخ)
  - بحث متقدم
- [ ] صفحة تفاصيل المشترك
  - معلومات التينانت والشركات
  - الاشتراك الحالي والتاريخ
  - الاستخدام (Users، Storage، Companies)
  - سجل الفواتير والدفعات
- [ ] إجراءات على المشتركين
  - تفعيل/إيقاف الاشتراك
  - ترقية/تخفيض الباقة
  - إضافة/حذف موديولات
  - إعادة تعيين كلمة المرور

**Services المطلوبة:**
- `src/services/saas/tenantsService.ts`
- `src/services/saas/subscriptionsService.ts`

### 2.2 إدارة الموديولات والميزات (Modules & Features Management)
- [ ] صفحة إدارة موديولات التينانت
  - عرض جميع الموديولات (مفعل/مقفل)
  - تفعيل/تعطيل موديول لتينانت معين
  - تعديل Features لكل موديول
- [ ] صفحة إدارة الميزات العامة
  - إضافة/تعديل/حذف ميزات جديدة
  - ربط الميزات بالباقات
  - تحديد الميزات المجانية vs المدفوعة

**Componen ts الجديدة:**
- `src/features/saas/components/TenantModulesManager.tsx`
- `src/features/saas/components/FeatureEditor.tsx`

### 2.3 إدارة اللغات (Languages Management)
- [ ] صفحة إدارة لغات التينانت
  - عرض اللغات المفعلة vs المتاحة
  - تفعيل/تعطيل لغات (مع احترام حد الباقة)
  - شراء لغات إضافية
- [ ] واجهة لإدارة اللغات على مستوى النظام
  - إضافة لغات جديدة للنظام
  - تعديل أسعار اللغات الإضافية

**Components الجديدة:**
- `src/features/saas/components/TenantLanguagesManager.tsx`
- `src/features/saas/components/SystemLanguagesManager.tsx`

### 2.4 إدارة الباقات (Plans Management)
- [ ] صفحة قائمة الباقات
  - عرض جميع الباقات (Starter، Professional، Enterprise)
  - إنشاء/تعديل/حذف باقات
- [ ] تحرير تفاصيل الباقة
  - الاسم والسعر (شهري/سنوي)
  - الحدود (Users، Companies، Storage، Languages)
  - الموديولات والميزات المتضمنة
  - UI Tabs المتاحة
- [ ] مقارنة الباقات
  - جدول مقارنة شامل
  - تصدير التسعير PDF

**Components الجديدة:**
- `src/features/saas/components/PlanEditor.tsx`
- `src/features/saas/components/PlansComparison.tsx`

### 2.5 التقارير والإحصائيات (Analytics)
- [ ] لوحة معلومات SaaS
  - عدد المشتركين النشطين
  - الإيرادات الشهرية/السنوية
  - معدل النمو (Growth Rate)
  - Churn Rate
- [ ] تقارير مفصلة
  - تقرير المشتركين حسب الباقة
  - تقرير الاستخدام (Storage، Users)
  - تقرير الإيرادات
  - تقرير الوكلاء والعمولات

**Components الجديدة:**
- `src/features/saas/SaaSDashboard.tsx` (تحسين الموجود)
- `src/features/saas/Reports.tsx` (تحسين الموجود)

**المخرجات المتوقعة:**
- ✅ لوحة تحكم SaaS احترافية
- ✅ أدوات كاملة لإدارة المشتركين
- ✅ نظام تقارير شامل

---

## 📅 المرحلة 3: نظام العملات والدول (الأولوية: عالية) 🌍

**الهدف:** تفعيل نظام العملات والدول الشامل في الواجهة

### 3.1 Backend Services
- [ ] إنشاء `src/services/currenciesService.ts`
  ```typescript
  - getCurrencies(tenantId): العملات المتاحة للتينانت
  - getCurrency(code, tenantId): عملة محددة
  - getActiveCurrencies(tenantId): العملات النشطة فقط
  - updateExchangeRate(code, rate): تحديث سعر الصرف
  ```
- [ ] إنشاء `src/services/countriesService.ts`
  ```typescript
  - getAllCountries(): جميع الدول
  - getCountry(code): دولة محددة
  - getPopularCountries(): الدول الشائعة
  - getCountrySettings(code): إعدادات الدولة المحلية
  ```
- [ ] إنشاء `src/services/roundingService.ts`
  ```typescript
  - roundAmount(amount, places, method): تقريب عام
  - roundForCompany(companyId, amount, type): تقريب حسب الشركة
  - getCompanyRoundingSettings(companyId): إعدادات التقريب
  ```

### 3.2 React Hooks
- [ ] إنشاء `src/hooks/useCurrencies.ts`
  ```typescript
  - currencies: قائمة العملات
  - loading, error
  - getExchangeRate(from, to): تحويل العملات
  ```
- [ ] إنشاء `src/hooks/useCountries.ts`
  ```typescript
  - countries: قائمة الدول
  - popularCountries: الدول الشائعة
  - getCountryByCode(code)
  ```
- [ ] إنشاء `src/hooks/useRounding.ts`
  ```typescript
  - round(amount, type): تقريب تلقائي
  - roundingSettings: إعدادات الشركة الحالية
  ```

### 3.3 UI Components
- [ ] إنشاء `src/components/shared/CurrencySelector.tsx`
  - اختيار عملة من القائمة
  - بحث بالاسم أو الرمز
  - عرض السعر والرمز
  - دعم 9 لغات
- [ ] إنشاء `src/components/shared/CountrySelector.tsx`
  - اختيار دولة من القائمة
  - عرض العلم والاسم
  - فلترة حسب المنطقة
  - دعم 9 لغات
- [ ] إنشاء `src/components/shared/CurrencyConverter.tsx`
  - تحويل بين عملتين
  - عرض سعر الصرف
  - تحديث تلقائي
- [ ] إنشاء `src/components/shared/AmountDisplay.tsx`
  - عرض مبلغ مع العملة
  - تقريب تلقائي
  - تنسيق حسب الدولة

### 3.4 دمج في الإعدادات (Settings)
- [ ] صفحة إعدادات الشركة - العملات
  - العملة المحلية
  - العملة الرئيسية
  - عملات إضافية
  - إدارة أسعار الصرف
- [ ] صفحة إعدادات الشركة - الدولة والإعدادات المحلية
  - اختيار الدولة
  - نظام التاريخ (Gregorian/Hijri/Mixed)
  - نظام الأرقام (Latin/Arabic/Hindi)
  - نظام الوقت (12h/24h)
  - الفواصل العشرية والآلاف
- [ ] صفحة إعدادات الشركة - التقريب
  - طريقة التقريب (half_up، down، up، إلخ)
  - التقريب للضرائب (عدد المنازل)
  - التقريب للمبالغ
  - التقريب لأسعار الوحدات
  - التقريب للمجموع النهائي
  - وراثة إعدادات الدولة (تشغيل/إيقاف)

**الملفات الجديدة:**
- `src/features/settings/CompanyCurrencies.tsx`
- `src/features/settings/CompanyLocale.tsx`
- `src/features/settings/CompanyRounding.tsx`

### 3.5 تطبيق في النماذج والفواتير
- [ ] تحديث forms الفواتير لاستخدام `CurrencySelector`
- [ ] تطبيق التقريب التلقائي في الحسابات
- [ ] عرض المبالغ بالتنسيق الصحيح حسب الدولة
- [ ] دعم الفواتير متعددة العملات

**المخرجات المتوقعة:**
- ✅ نظام عملات ودول كامل العمل
- ✅ تحويل عملات تلقائي
- ✅ تقريب ذكي حسب الإعدادات
- ✅ دعم كامل للإعدادات المحلية

---

## 📅 المرحلة 4: معالج التسجيل الجديد (الأولوية: عالية) 🚀

**الهدف:** تجربة تسجيل سلسة واحترافية

### 4.1 UI/UX للمعالج
- [ ] إنشاء `src/features/auth/RegisterWizard.tsx`
  - Stepper Component (3 خطوات)
  - Navigation (التالي، السابق، إنهاء)
  - Progress Bar
  - حفظ تلقائي للبيانات
- [ ] Step 1: معلومات المستخدم
  - الاسم الكامل
  - البريد الإلكتروني
  - كلمة المرور
  - رقم الهاتف (اختياري)
  - التحقق من البريد
- [ ] Step 2: بيانات الشركة
  - اسم الشركة (عربي + إنجليزي)
  - شعار الشركة (رفع للـ Storage)
  - اللغة الافتراضية للمستخدم
  - الدولة (CouintrySelector)
  - العملة المحلية (CurrencySelector)
  - العملة الرئيسية (CurrencySelector)
  - عملات إضافية (Multi-select)
- [ ] Step 3: اختيار الشجرة المحاسبية
  - بطاقات للاختيار (Standard، Extended، Extended Fabric)
  - معاينة لكل نوع
  - شرح الفروقات
  - حالة خاصة: "Extended Fabric" تنشئ شركة حقيقية + شركة تجريبية

### 4.2 Backend Integration
- [ ] تحديث `register_new_subscriber` function (إذا لزم)
- [ ] إنشاء دالة رفع الشعار
  ```sql
  upload_company_logo(company_id, file_path)
  ```
- [ ] إنشاء دالة إنشاء Demo Company
  ```sql
  create_demo_company(tenant_id, base_company_id)
  ```
- [ ] ضمان تطبيق COA Template الصحيح

### 4.3 Validation & Error Handling
- [ ] التحقق من صحة البيانات في كل خطوة
- [ ] رسائل خطأ واضحة ومترجمة
- [ ] معالجة الأخطاء من Backend
- [ ] Retry mechanism عند الفشل

**المخرجات المتوقعة:**
- ✅ تجربة تسجيل احترافية
- ✅ onboarding سلس للمستخدمين الجدد
- ✅ دعم كامل للميزات الجديدة (عملات، دول، لغات)

---

## 📅 المرحلة 5: تحسينات المحاسبة (الأولوية: متوسطة-عالية) 📊

**الهدف:** تحسين تجربة المستخدم في قسم المحاسبة

### 5.1 شجرة الحسابات (Chart of Accounts)
- [ ] حل مشكلة التأخير بعد تطبيق Template
  - إضافة Loading State أفضل
  - Optimistic UI Updates
  - Retry Logic
- [ ] تحسينات UI
  - Tree View أفضل (استخدام مكتبة محسنة)
  - Drag & Drop لإعادة الترتيب
  - Bulk Operations (حذف، نقل، تعطيل متعدد)
- [ ] فلترة وبحث متقدم
  - بحث في جميع اللغات
  - فلترة حسب النوع والحالة
  - Export filtered results

**الملفات المتأثرة:**
- `src/features/accounting/ChartOfAccounts/ChartOfAccounts.tsx`
- `src/features/accounting/ChartOfAccounts/AccountTreeView.tsx`

### 5.2 القيود اليومية (Journal Entries)
- [ ] تحسين Form Editor
  - Multi-line entry بشكل أفضل
  - Auto-complete للحسابات
  - حساب تلقائي للتوازن
- [ ] Templates للقيود
  - حفظ قيود كـ Templates
  - استخدام Templates بسرعة
  - مكتبة Templates جاهزة
- [ ] Recurring Entries
  - جدولة قيود دورية
  - Auto-posting للقيود المجدولة
  - إدارة القيود المتكررة

**الملفات المتأثرة:**
- `src/features/accounting/JournalEntries.tsx`
- `src/features/accounting/components/JournalEntryForm.tsx`

### 5.3 التقارير المحاسبية (Financial Reports)
- [ ] ميزان المراجعة (Trial Balance)
  - بتاريخ محدد
  - مقارنة فترتين
  - Export PDF/Excel
- [ ] قائمة الدخل (Income Statement)
  - شهرية/ربع سنوية/سنوية
  - مقارنة بالفترة السابقة
  - Graphs & Charts
- [ ] الميزانية العمومية (Balance Sheet)
  - Assets vs Liabilities vs Equity
  - مقارنة زمنية
  - Export متعدد
- [ ] قائمة التدفقات النقدية (Cash Flow Statement)
  - Operating، Investing، Financing
  - توقعات التدفقات
  - تحليل الاتجاهات

**الملفات الجديدة:**
- `src/features/accounting/reports/TrialBalance.tsx`
- `src/features/accounting/reports/IncomeStatement.tsx`
- `src/features/accounting/reports/BalanceSheet.tsx`
- `src/features/accounting/reports/CashFlow.tsx`

**المخرجات المتوقعة:**
- ✅ تجربة محاسبية احترافية
- ✅ سرعة وسلاسة في العمل
- ✅ تقارير شاملة واحترافية

---

## 📅 المرحلة 6: المبيعات والمشتريات (الأولوية: متوسطة) 🛒

**الهدف:** إنشاء نظام مبيعات ومشتريات كامل

### 6.1 المبيعات (Sales)
- [ ] إدارة العملاء
  - CRUD للعملاء
  - عناوين متعددة
  - جهات اتصال
  - تاريخ التعاملات
- [ ] عروض الأسعار (Quotations)
  - إنشاء عرض سعر
  - طباعة PDF احترافي
  - تحويل لفاتورة
  - متابعة الحالة
- [ ] أوامر البيع (Sales Orders)
  - إنشاء أمر بيع
  - ربط بالمخزون
  - تتبع التسليم
  - تحويل لفاتورة
- [ ] الفواتير (Invoices)
  - إنشاء فاتورة
  - دعم عملات متعددة
  - ضرائب وخصومات
  - حالات متعددة (مسودة، مرسلة، مدفوعة)
  - طباعة احترافية
- [ ] الدفعات (Payments)
  - تسجيل دفعات جزئية
  - ربط بالفواتير
  - إيصالات دفع
  - تقارير التحصيل

**Services المطلوبة:**
- `src/services/customersService.ts`
- `src/services/quotationsService.ts`
- `src/services/salesOrdersService.ts`
- `src/services/invoicesService.ts`
- `src/services/paymentsService.ts`

### 6.2 المشتريات (Purchases)
- [ ] إدارة الموردين
  - CRUD للموردين
  - شروط الدفع
  - تصنيفات
  - تقييمات
- [ ] طلبات الشراء (Purchase Requests)
  - طلب داخلي
  - موافقات متعددة
  - تحويل لأمر شراء
- [ ] أوامر الشراء (Purchase Orders)
  - إنشاء أمر شراء
  - إرسال للمورد
  - متابعة التسليم
  - استلام جزئي/كامل
- [ ] فواتير المشتريات (Purchase Invoices)
  - تسجيل الفاتورة
  - ربط بأمر الشراء
  - تطابق 3-way (PO، Receipt، Invoice)
  - جدولة الدفعات

**Services المطلوبة:**
- `src/services/suppliersService.ts`
- `src/services/purchaseRequestsService.ts`
- `src/services/purchaseOrdersService.ts`
- `src/services/purchaseInvoicesService.ts`

**المخرجات المتوقعة:**
- ✅ نظام مبيعات ومشتريات متكامل
- ✅ أتمتة العمليات
- ✅ تقارير شاملة

---

## 📅 المرحلة 7: المخزون (الأولوية: متوسطة) 📦

**الهدف:** نظام مخزون كامل مع تتبع دقيق

### 7.1 المنتجات والخدمات
- [ ] إدارة المنتجات
  - معلومات أساسية
  - أسعار متعددة (بيع، شراء، خاص)
  - صور متعددة
  - Variants (الحجم، اللون، إلخ)
  - Barcode/SKU
- [ ] التصنيفات والعلامات
  - تصنيفات هرمية
  - علامات مرنة
  - فلترة ذكية

### 7.2 المستودعات
- [ ] إدارة المستودعات
  - مستودعات متعددة
  - مواقع داخل المستودع
  - مسؤولين ومستخدمين
- [ ] حركات المخزون
  - استلام (من مشتريات)
  - صرف (للمبيعات)
  - تحويل بين مستودعات
  - تعديل يدوي
  - تتبع دقيق (Serial Numbers، Batches)

### 7.3 الجرد
- [ ] عمليات الجرد
  - جرد دوري/مستمر
  - جرد جزئي/كامل
  - Cycle Counting
  - مطابقة مع النظام
  - تعديلات تلقائية

### 7.4 تقارير المخزون
- [ ] تقارير متنوعة
  - حركة المخزون
  - المخزون الحالي
  - Aging Analysis
  - تقرير إعادة الطلب (Reorder Report)
  - Slow-moving items
  - Stock Valuation

**Services المطلوبة:**
- `src/services/productsService.ts`
- `src/services/warehousesService.ts`
- `src/services/stockMovementsService.ts`
- `src/services/inventoryReportsService.ts`

**المخرجات المتوقعة:**
- ✅ نظام مخزون دقيق
- ✅ تتبع شامل للحركات
- ✅ تقارير تحليلية

---

## 📅 المرحلة 8: الأقمشة (الأولوية: متوسطة-منخفضة) 🧵

**الهدف:** واجهة كاملة لإدارة الأقمشة

### 8.1 المواد والألوان
- [ ] إدارة المواد
  - أنواع الأقمشة
  - مواصفات فنية
  - موردين
- [ ] إدارة الألوان
  - Color Palette
  - أكواد الألوان
  - صور الألوان

### 8.2 الرولونات (Rolls)
- [ ] إدارة الرولونات
  - تسجيل رولون جديد
  - تتبع الكمية (متر، ياردة)
  - Barcode/QR Code
  - موقع في المستودع
- [ ] حركات الرولونات
  - قص من رولون
  - دمج رولونات
  - تحويل بين مستودعات

### 8.3 الطلبيات والحجوزات
- [ ] طلبيات الأقمشة
  - طلب حسب المواصفات
  - حجز كميات
  - متابعة التسليم
- [ ] تقارير خاصة
  - تقرير المواد حسب اللون
  - تقرير الرولونات
  - تقرير القص والفاقد

**Services المطلوبة:**
- `src/services/fabric/materialsService.ts`
- `src/services/fabric/colorsService.ts`
- `src/services/fabric/rollsService.ts`
- `src/services/fabric/ordersService.ts`

**المخرجات المتوقعة:**
- ✅ نظام أقمشة احترافي
- ✅ تتبع دقيق للرولونات
- ✅ تقارير مفصلة

---

## 📅 المرحلة 9: الكونتينرات (الأولوية: منخفضة) 🚢

**الهدف:** نظام إدارة شحنات واحتساب تكاليف

### 9.1 الحاويات والشحنات
- [ ] إدارة الحاويات
  - معلومات الشحنة
  - البنود داخل الحاوية
  - تتبع الشحن
- [ ] المصاريف والتوزيع
  - تسجيل المصاريف
  - توزيع تلقائي على البنود
  - Landed Cost Calculation
- [ ] تقارير خاصة
  - تقرير التكاليف الكلية
  - تقرير الشحنات
  - تحليل المصاريف

**Services المطلوبة:**
- `src/services/containers/shipmentService.ts`
- `src/services/containers/expensesService.ts`

**المخرجات المتوقعة:**
- ✅ نظام شحن متكامل
- ✅ احتساب تكاليف دقيق

---

## 📅 المرحلة 10: الوكلاء المتقدم (الأولوية: منخفضة) 👥

**الهدف:** نظام وكلاء احترافي

### 10.1 لوحة تحكم الوكيل
- [ ] Dashboard خاص بالوكيل
  - إحصائيات الأداء
  - المشتركين الجدد
  - العمولات
  - الأهداف

### 10.2 إدارة العمولات
- [ ] حساب العمولات
  - قواعد مرنة
  - عمولات متدرجة
  - مكافآت الأداء
- [ ] سحب العمولات
  - طلبات السحب
  - موافقات
  - تحويلات

### 10.3 المواد التسويقية
- [ ] مكتبة مواد
  - Brochures
  - Landing Pages
  - Referral Links
  - Tracking Codes

**المخرجات المتوقعة:**
- ✅ نظام وكلاء كامل
- ✅ تحفيز وشفافية

---

## 📅 المرحلة 11: Nexa Agent Integration (مستقبلاً) 🤖

**الهدف:** ذكاء اصطناعي متقدم

### 11.1 الترجمة التلقائية
- [ ] Supabase Edge Function
- [ ] API Integration
- [ ] UI لإدارة الترجمات
- [ ] مراجعة وتحرير

### 11.2 تحديث أسعار الصرف
- [ ] جلب تلقائي من API خارجي
- [ ] جدولة التحديثات
- [ ] تنبيهات التغييرات الكبيرة

### 11.3 التحليل الذكي
- [ ] AI Insights للبيانات المحاسبية
- [ ] اقتراحات ذكية
- [ ] كشف الأنماط والشذوذات

**المخرجات المتوقعة:**
- ✅ نظام ذكي متقدم
- ✅ أتمتة كاملة

---

# 🗂️ هيكلية النظام

## Backend (Supabase)

```
supabase/
├── migrations/
│   ├── STEP_01 - STEP_12: الأساسيات
│   ├── STEP_13: Pre-provisioned Tenants
│   ├── STEP_23: نظام الوكلاء
│   ├── STEP_25: White Label
│   ├── STEP_28: نظام التسجيل الكامل
│   ├── STEP_29: Platform Owner
│   ├── STEP_31: Chart Templates
│   ├── STEP_32: Modules & Features System ✅
│   ├── STEP_32_B: Multi-Language System ✅
│   ├── STEP_33: إضافة 30 عملة شائعة ✅
│   ├── STEP_33_B: ترجمات العملات (9 لغات) ✅
│   ├── STEP_34: نظام الدول (50 دولة) ✅
│   ├── STEP_34_B: الإعدادات المحلية للدول ✅
│   └── STEP_35: نظام التقريب الشامل ✅
├── seed/
│   ├── 01-05: بيانات تجريبية
│   └── 06: Modules & Features Data ✅
└── functions/
    └── nexa-agent/ (مخطط مستقبلاً)
```

## Frontend (React + Vite)

```
src/
├── features/
│   ├── accounting/    (80%)
│   ├── saas/         (30%)
│   ├── inventory/    (10%)
│   ├── sales/        (0%)
│   └── fabric/       (0%)
├── services/
│   ├── accountsService.ts
│   ├── journalEntriesService.ts
│   ├── modulesService.ts ✅
│   ├── featuresService.ts ✅
│   └── languagesService.ts ✅
├── hooks/
│   ├── useAuth.ts
│   ├── useModules.ts ✅
│   ├── useFeatures.ts ✅
│   ├── useLanguages.ts ✅
│   └── useAllowedTabs.ts ✅
└── i18n/locales/ (9 ملفات JSON)
```

---

# 📅 الخطة الزمنية (بدون تواريخ محددة)

## المرحلة 1: إكمال النظام الأساسي ⚡
**الأولوية:** عالية جداً

### 1.1 معالج التسجيل
- [ ] تصميم UI للـ Wizard (3 steps)
- [ ] تحديث `register_new_subscriber` function
- [ ] دالة إنشاء Demo Company
- [ ] رفع Logo للـ Supabase Storage
- [ ] اختبار التدفق الكامل

### 1.2 تطبيق نظام التحكم في الموديولات
- [x] Backend: Tables + Functions
- [x] Frontend: Services + Hooks
- [ ] تحديث Sidebar باستخدام `useModules`
- [ ] تطبيق `useFeatures` في الأزرار والقوائم
- [ ] تطبيق `useLanguages` في النماذج
- [ ] تطبيق `useAllowedTabs` في Detail Sheets

### 1.3 لوحة إدارة SaaS
- [ ] إدارة الموديولات لكل Tenant
- [ ] إدارة اللغات لكل Tenant
- [ ] إدارة الميزات لكل باقة
- [ ] تقارير الاستخدام

---

## المرحلة 2: إكمال المحاسبة 📊
**الأولوية:** عالية

### 2.1 تحسينات الشجرة المحاسبية
- [ ] حل مشكلة التأخير في العرض بعد تطبيق Template
- [ ] تحسين UI للشجرة
- [ ] إضافة Drag & Drop لإعادة الترتيب
- [ ] إضافة Bulk Operations

### 2.2 القيود اليومية
- [ ] تحسين Form Editor
- [ ] إضافة Templates للقيود
- [ ] إضافة Recurring Entries
- [ ] تحسين التقارير

### 2.3 التقارير المحاسبية
- [ ] ميزان المراجعة (Trial Balance)
- [ ] قائمة الدخل (Income Statement)
- [ ] الميزانية العمومية (Balance Sheet)
- [ ] التدفقات النقدية (Cash Flow)

---

## المرحلة 3: المبيعات والمشتريات 🛒
**الأولوية:** متوسطة

### 3.1 المبيعات
- [ ] إدارة العملاء (كامل)
- [ ] عروض الأسعار
- [ ] أوامر البيع
- [ ] الفواتير + الدفعات
- [ ] التقارير

### 3.2 المشتريات
- [ ] إدارة الموردين (كامل)
- [ ] طلبات الشراء
- [ ] فواتير المشتريات
- [ ] التقارير

---

## المرحلة 4: المخزون 📦
**الأولوية:** متوسطة

- [ ] إدارة المنتجات (UI)
- [ ] المستودعات
- [ ] حركات المخزون
- [ ] الجرد
- [ ] التقارير

---

## المرحلة 5: الأقمشة 🧵
**الأولوية:** متوسطة

- [ ] واجهة المواد والألوان
- [ ] إدارة الرولونات
- [ ] الطلبيات والحجوزات
- [ ] التقارير الخاصة بالأقمشة

---

## المرحلة 6: الكونتينرات 🚢
**الأولوية:** متوسطة-منخفضة

- [ ] واجهة الحاويات
- [ ] المصاريف والتوزيع
- [ ] تقارير Landed Cost

---

## المرحلة 7: نظام الوكلاء المتقدم 👥
**الأولوية:** منخفضة

- [ ] لوحة تحكم الوكيل
- [ ] تقارير العمولات
- [ ] نظام الأهداف والمكافآت
- [ ] المواد التسويقية

---

## المرحلة 8: Nexa Agent Integration 🤖
**الأولوية:** مستقبلية

- [ ] Supabase Edge Function
- [ ] API للترجمة التلقائية
- [ ] واجهة إدارة الترجمات
- [ ] تحليل ذكي للبيانات المحاسبية

---

# 🔧 القواعد التقنية الإلزامية

## 1. الترجمة (100%)
```typescript
// ❌ خطأ
<button>Save</button>

// ✅ صحيح
<button>{t('common.save')}</button>
```

## 2. Services (100%)
```typescript
// ❌ خطأ
const { data } = await supabase.from('accounts').select('*');

// ✅ صحيح
const accounts = await accountsService.getAll(companyId);
```

## 3. Authentication (100%)
```typescript
// ❌ خطأ
const tenantId = localStorage.getItem('tenant_id');

// ✅ صحيح
const { tenantId } = useAuth();
```

## 4. Features Control (100%)
```typescript
// ✅ التحقق من الميزات قبل العرض
const { hasFeature } = useFeatures();
const canExport = await hasFeature('accounting', 'export_pdf');

if (canExport) {
  <ExportButton />
}
```

---

# 📦 الجداول الرئيسية

## Core Tables
- `tenants` - المستأجرين
- `companies` - الشركات
- `user_profiles` - المستخدمين
- `subscription_plans` - الباقات
- `subscriptions` - الاشتراكات

## Modules & Features (✅ جديد)
- `module_features` - الميزات المتاحة
- `plan_module_features` - ربط الميزات بالباقات
- `ui_tabs` - تبويبات الواجهة
- `plan_ui_tabs` - ربط التبويبات بالباقات
- `system_languages` - اللغات المتاحة
- `tenant_languages` - اللغات المفعلة

## Accounting Tables
- `chart_of_accounts` - شجرة الحسابات
- `journal_entries` - القيود
- `journal_entry_lines` - سطور القيود
- `cost_centers` - مراكز التكلفة
- `fiscal_years` - السنوات المالية
- `accounting_periods` - الفترات

## Fabric Tables
- `fabric_materials` - المواد
- `fabric_colors` - الألوان
- `fabric_rolls` - الرولونات
- `fabric_orders` - الطلبيات

## Container Tables
- `shipment_containers` - الحاويات
- `container_expenses` - المصاريف
- `container_items` - البنود

---

# 🎯 الإنجازات الأخيرة (24 يناير 2026)

## ✅ نظام التحكم الكامل في الموديولات والميزات

### Backend:
1. ✅ Migration `STEP_32_modules_and_features_system.sql`
   - جدول `module_features` (43 ميزة)
   - جدول `plan_module_features` (ربط بالباقات)
   - جدول `ui_tabs` (27 تبويب)
   - 5 دوال PostgreSQL

2. ✅ Migration `STEP_32_B_multi_language_system.sql`
   - جدول `system_languages` (9 لغات)
   - جدول `tenant_languages` (اللغات المفعلة)
   - تحديث `subscription_plans` (max_languages)
   - 5 دوال للإدارة

3. ✅ Seed `06_modules_and_features_data.sql`
   - بيانات تجريبية شاملة

### Frontend:
1. ✅ Services:
   - `modulesService.ts`
   - `featuresService.ts`
   - `languagesService.ts`

2. ✅ Hooks:
   - `useModules.ts`
   - `useFeatures.ts`
   - `useLanguages.ts`
   - `useAllowedTabs.ts`

3. ✅ Documentation:
   - `docs/MODULES_AND_FEATURES_SYSTEM.md`
   - تحديث `docs/COMPLETE_REFERENCE_GUIDE.md`

---

# 🚀 التالي في الخطة

## الأولوية القصوى:
1. تطبيق Hooks في المكونات الموجودة
2. تحديث Sidebar باستخدام `useModules`
3. تطبيق `useFeatures` في الأزرار
4. تطبيق `useLanguages` في النماذج
5. إنشاء UI لإدارة اللغات في SaaS Panel

---

# 📊 الإحصائيات

| العنصر | العدد الحالي |
|--------|-------------|
| **Migrations** | 32+ ملف |
| **Services** | 15+ خدمة |
| **Hooks** | 8+ hook |
| **Features** | 70+ صفحة |
| **Tables** | 100+ جدول |
| **Languages** | 9 لغات |
| **Modules** | 6 موديولات |
| **Features** | 43 ميزة |

---

# 📝 سجل التغييرات

| التاريخ | التغيير |
|---------|---------|
| 2026-01-23 | إنشاء المخطط الرئيسي |
| 2026-01-24 | إضافة نظام الموديولات والميزات |
| 2026-01-24 | إضافة نظام اللغات المتعددة |
| 2026-01-24 | إنشاء Services & Hooks |
| 2026-01-24 | تحديث التوثيق الكامل |
| 2026-01-24 | **إضافة 30 عملة شائعة** (STEP_33) |
| 2026-01-24 | **إضافة ترجمات العملات بـ 9 لغات** (STEP_33_B) |
| 2026-01-24 | **إنشاء نظام الدول - 50 دولة** (STEP_34) |
| 2026-01-24 | **إضافة الإعدادات المحلية للدول** (STEP_34_B) |
| 2026-01-24 | **إنشاء نظام التقريب الشامل** (STEP_35) |

---

> **💡 ملاحظة:** هذا المخطط حي ويُحدث باستمرار. راجعه قبل بدء أي مهمة تطوير جديدة.

---

**📖 للمزيد:**
- [docs/COMPLETE_REFERENCE_GUIDE.md](./docs/COMPLETE_REFERENCE_GUIDE.md)
- [docs/MODULES_AND_FEATURES_SYSTEM.md](./docs/MODULES_AND_FEATURES_SYSTEM.md)
- [docs/CURRENCIES_AND_COUNTRIES_SYSTEM.md](./docs/CURRENCIES_AND_COUNTRIES_SYSTEM.md)
- [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md)

---

**🚀 جاهز للانطلاق! Backend 95% | Frontend 40% → الهدف: 100% Production Ready**
