# 🎯 مخطط العمل التدريجي - Frontend Integration
# Work Plan: Backend → Frontend Connection

> **تاريخ الإنشاء:** 24 يناير 2026  
> **آخر تحديث:** 24 يناير 2026 (Backend v2.0)  
> **الحالة:** Backend 100% ✅ | Phase 1 قيد التنفيذ

---

## 🆕 آخر التحديثات (24 يناير 2026)

### ✅ Backend Updates - مكتمل 100%

تم إضافة 4 أنظمة جديدة للـ Backend:

#### STEP_36: نظام الموديولات المتقدم
- ✅ جدول `modules` جديد (9 لغات)
- ✅ 18 موديول (fabric + component_lab)
- ✅ تفعيل تلقائي للموديولات

#### STEP_37: نظام صلاحيات المستخدمين
- ✅ 4 جداول (permissions, roles, assignments)
- ✅ 6 أدوار افتراضية لكل tenant
- ✅ 8 أنواع صلاحيات (view, create, edit, etc.)

#### STEP_38: دوال التحقق
- ✅ 4 دوال جاهزة
- ✅ `get_user_allowed_modules()` ← استخدمها في Frontend

#### STEP_39: RLS Policies
- ✅ 12 Policy على 5 جداول
- ✅ حماية كاملة للبيانات

---

### 🎯 المهام المحدثة (Frontend)

#### المهمة الحالية: تحديث useModules Hook ⭐⭐⭐
**الحالة:** Pending  
**الأولوية:** عالية جداً  
**المدة المقدرة:** 30 دقيقة

**التغييرات المطلوبة:**
```typescript
// ❌ قديم
const { data } = await supabase.rpc('get_tenant_available_modules', { 
    p_tenant_id: tenantId 
});

// ✅ جديد
const { data } = await supabase.rpc('get_user_allowed_modules', {
    p_user_id: userId
});
```

**الفوائد:**
- ✅ صلاحيات على مستوى المستخدم
- ✅ كل مستخدم يرى الموديولات المسموحة له فقط
- ✅ يدعم نظام الأدوار الجديد

**الملف:** `src/hooks/useModules.ts`

**الخطوات:**
1. [ ] قراءة الملف الحالي
2. [ ] استبدال الدالة
3. [ ] تحديث الـ types
4. [ ] اختبار مع Sidebar

---

## 📋 فلسفة العمل

### المبادئ الأساسية:
1. ✅ **خطوة بخطوة** - لا نقفز للأمام
2. ✅ **توثيق كل خطوة** - نكتب ما نفعل
3. ✅ **اختبار فوري** - نختبر بعد كل تغيير
4. ✅ **حفظ السياق** - نوفر في التكاليف
5. ✅ **جودة أولاً** - أفضل من سرعة بدون جودة

---

## 🗺️ الخارطة الكاملة (11 مرحلة)

```
Phase 1: ✅ Modules & Features (80% Complete)
Phase 2: ⏳ SaaS Admin Dashboard
Phase 3: ⏳ Currencies & Countries
Phase 4: ⏳ Accounting Enhancements
Phase 5: ⏳ Sales & Purchases
Phase 6: ⏳ Inventory Management
Phase 7: ⏳ Fabric & Containers
Phase 8: ⏳ Reports & Analytics
Phase 9: ⏳ White Label
Phase 10: ⏳ Testing & QA
Phase 11: ⏳ Production Deploy
```

---

## 🎯 المرحلة 1: ربط الموديولات والميزات
**المدة المقدرة:** أسبوع 1-2  
**التقدم الحالي:** 80% ✅  
**الأولوية:** 🔴 عالية جداً

### الأهداف:
- ✅ Sidebar ديناميكي يقرأ من Backend
- ⏳ أزرار Actions تظهر/تختفي حسب الباقة
- ⏳ Tabs ديناميكية حسب الصلاحيات
- ⏳ نماذج تعرض اللغات المفعلة فقط

---

### 📝 المهام التفصيلية

#### ✅ المكتمل (Done)
- [x] **إنشاء Services** (modulesService, featuresService, languagesService)
- [x] **إنشاء Hooks** (useModules, useFeatures, useLanguages, useAllowedTabs)
- [x] **تحديث Sidebar.tsx** (80% - ينقصه الترجمات)
- [x] **إضافة مفاتيح ترجمة** (ar, en)
- [x] **Loading States** في Sidebar
- [x] **Lock Indicators** للموديولات المقفلة
- [x] **Upgrade Tooltips**

---

#### 🟡 المهمة 1: إكمال ترجمات Sidebar
**الحالة:** Pending  
**المدة:** 30 دقيقة  
**الأولوية:** 🔴 عالية

**الملفات المطلوبة:**
```
src/i18n/locales/de.json
src/i18n/locales/tr.json
src/i18n/locales/ru.json
src/i18n/locales/uk.json
src/i18n/locales/it.json
src/i18n/locales/pl.json
src/i18n/locales/ro.json
```

**المفاتيح المطلوب إضافتها:**
```json
{
  "sidebar": {
    "upgradeRequired": "...",
    "moduleDisabled": "...",
    "upgrade": "..."
  }
}
```

**خطوات التنفيذ:**
1. فتح كل ملف لغة
2. إيجاد قسم "sidebar"
3. إضافة المفاتيح الثلاثة
4. الحفظ
5. تشغيل `npm run check:translations`

**Checklist:**
- [ ] de.json (الألمانية)
- [ ] tr.json (التركية)
- [ ] ru.json (الروسية)
- [ ] uk.json (الأوكرانية)
- [ ] it.json (الإيطالية)
- [ ] pl.json (البولندية)
- [ ] ro.json (الرومانية)

---

#### 🟡 المهمة 2: اختبار Sidebar
**الحالة:** Pending  
**المدة:** 1 ساعة  
**الأولوية:** 🔴 عالية

**سيناريوهات الاختبار:**

**Test 1: تحميل الموديولات**
```typescript
// Expected: يظهر Skeleton أثناء التحميل
// Expected: تظهر الموديولات بعد التحميل
// Expected: الترتيب حسب sort_order
```

**Test 2: باقة Starter**
```typescript
// Expected: 5 موديولات مفعلة
// Expected: 12 موديول مقفل مع Lock icon
// Expected: Tooltip "Upgrade Required" يعمل
```

**Test 3: التبديل بين اللغات**
```typescript
// Expected: ar → عرض name_ar
// Expected: en → عرض name_en
// Expected: de → عرض name_de
// ... باقي اللغات
```

**Test 4: RTL/LTR**
```typescript
// Expected: العربية → RTL (الأيقونة على اليمين)
// Expected: الإنجليزية → LTR (الأيقونة على اليسار)
```

**Test 5: Mobile Responsive**
```typescript
// Expected: Sidebar قابل للطي على الموبايل
// Expected: الأيقونات واضحة
// Expected: Tooltips تعمل
```

**Checklist:**
- [ ] Test 1: Loading State
- [ ] Test 2: Module Visibility
- [ ] Test 3: Language Switching
- [ ] Test 4: RTL Support
- [ ] Test 5: Mobile View
- [ ] Test 6: Error Handling

---

#### 🟡 المهمة 3: تحديث ActionButtonsBar
**الحالة:** Pending  
**المدة:** 2-3 ساعات  
**الأولوية:** 🔴 عالية

**الملف:** `src/components/shared/actions/ActionButtonsBar.tsx`

**الهدف:**
```typescript
// قبل (Before):
<Button onClick={exportPDF}>Export PDF</Button>
<Button onClick={exportExcel}>Export Excel</Button>

// بعد (After):
const { hasFeature } = useFeatures();

{hasFeature('export_pdf') && <Button>Export PDF</Button>}
{!hasFeature('export_pdf') && <UpgradeTooltip />}

{hasFeature('export_excel') && <Button>Export Excel</Button>}
{!hasFeature('export_excel') && <UpgradeTooltip />}
```

**خطوات التنفيذ:**
1. استيراد `useFeatures` hook
2. إضافة Checks قبل كل زر
3. إضافة `<UpgradeTooltip>` للأزرار المقفلة
4. إضافة Badge "Pro" للميزات المميزة
5. اختبار مع باقات مختلفة

**الميزات المطلوب التحقق منها:**
```typescript
// في Accounting:
- export_pdf
- export_excel
- import_excel
- advanced_reports
- multi_currency
- cost_centers

// في Inventory:
- barcode_scanner
- serial_numbers
- batch_tracking
- stock_alerts

// في Sales:
- quotes
- invoices
- credit_notes
- recurring_invoices
```

**Checklist:**
- [ ] إضافة useFeatures hook
- [ ] تحديث Export PDF Button
- [ ] تحديث Export Excel Button
- [ ] تحديث Import Button
- [ ] إضافة UpgradeTooltip component
- [ ] إضافة Pro Badges
- [ ] اختبار Starter Plan
- [ ] اختبار Professional Plan
- [ ] اختبار Enterprise Plan

---

#### 🟡 المهمة 4: تحديث Dynamic Tabs
**الحالة:** Pending  
**المدة:** 2-3 ساعات  
**الأولوية:** 🟠 متوسطة

**الملف:** `src/components/sheets/universal/UniversalDetailTabs.tsx`

**الهدف:**
```typescript
// قبل: جميع التبويبات ظاهرة
<Tabs>
  <Tab value="overview">Overview</Tab>
  <Tab value="ledger">Ledger</Tab>
  <Tab value="documents">Documents</Tab>
  <Tab value="ai_analysis">AI Analysis</Tab>
</Tabs>

// بعد: التبويبات المسموحة فقط
const allowedTabs = useAllowedTabs('account_details');

<Tabs>
  {allowedTabs.includes('overview') && <Tab>Overview</Tab>}
  {allowedTabs.includes('ledger') && <Tab>Ledger</Tab>}
  {allowedTabs.includes('documents') && <Tab>Documents</Tab>}
  {allowedTabs.includes('ai_analysis') && <Tab>AI Analysis</Tab>}
</Tabs>
```

**الأقسام المطلوب تحديثها:**
```typescript
account_details
invoice_details
product_details
customer_details
supplier_details
journal_entry_details
payment_details
fund_details
```

**خطوات التنفيذ:**
1. استيراد `useAllowedTabs` hook
2. تمرير section_code المناسب
3. فلترة التبويبات حسب allowedTabs
4. إضافة Lock indicator للتبويبات المقفلة (optional)
5. اختبار مع كل الأقسام

**Checklist:**
- [ ] تحديث account_details tabs
- [ ] تحديث invoice_details tabs
- [ ] تحديث product_details tabs
- [ ] تحديث customer_details tabs
- [ ] اختبار مع Starter
- [ ] اختبار مع Professional
- [ ] اختبار مع Enterprise

---

#### 🟡 المهمة 5: نماذج متعددة اللغات
**الحالة:** Pending  
**المدة:** 2-3 ساعات  
**الأولوية:** 🟠 متوسطة

**الملفات المتأثرة:**
```
src/features/accounting/ChartOfAccounts/AddAccountSheet.tsx
src/features/accounting/components/JournalEntryForm.tsx
src/components/sheets/configs/*.config.ts
```

**الهدف:**
```typescript
// قبل: عرض كل 9 لغات دائماً
<Input name="name_ar" label="Arabic Name" />
<Input name="name_en" label="English Name" />
<Input name="name_de" label="German Name" />
// ... 9 حقول

// بعد: عرض اللغات المفعلة فقط
const { activeLanguages } = useLanguages();

{activeLanguages.map(lang => (
  <Input 
    key={lang.code}
    name={`name_${lang.code}`}
    label={t(`languages.${lang.code}`)}
  />
))}
```

**السيناريوهات:**
```typescript
// Starter Plan (2 languages): ar + en
→ يظهر حقلين فقط

// Professional Plan (5 languages): ar, en, de, tr, ru
→ يظهر 5 حقول

// Enterprise Plan (9 languages): all
→ يظهر 9 حقول
```

**خطوات التنفيذ:**
1. استيراد `useLanguages` hook
2. استبدال الحقول الثابتة بـ map
3. تحديث Validation schema
4. تحديث Submit handler
5. اختبار مع لغات مختلفة

**Checklist:**
- [ ] تحديث AddAccountSheet
- [ ] تحديث JournalEntryForm
- [ ] تحديث Customer/Supplier forms
- [ ] تحديث Product forms
- [ ] اختبار مع 2 لغات
- [ ] اختبار مع 5 لغات
- [ ] اختبار مع 9 لغات

---

#### 🟡 المهمة 6: اختبار شامل للمرحلة 1
**الحالة:** Pending  
**المدة:** 2 ساعات  
**الأولوية:** 🔴 عالية

**Test Suite:**

**1. Module Visibility Test**
```bash
✅ Starter Plan → 5 modules visible
✅ Professional → 12 modules visible
✅ Enterprise → 17 modules visible
```

**2. Feature Control Test**
```bash
✅ Export PDF: Starter ❌ | Pro ✅ | Enterprise ✅
✅ Excel Import: Starter ❌ | Pro ✅ | Enterprise ✅
✅ AI Analysis: Starter ❌ | Pro ❌ | Enterprise ✅
```

**3. Tabs Test**
```bash
✅ Overview tab: Always visible
✅ Documents tab: Pro+
✅ AI Analysis tab: Enterprise only
```

**4. Languages Test**
```bash
✅ Starter: 2 language fields
✅ Professional: 5 language fields
✅ Enterprise: 9 language fields
```

**5. Multi-Language UI Test**
```bash
✅ Arabic → RTL + Arabic module names
✅ English → LTR + English module names
✅ German → LTR + German module names
```

**Checklist:**
- [ ] Module visibility test
- [ ] Feature control test
- [ ] Dynamic tabs test
- [ ] Language fields test
- [ ] UI translation test
- [ ] RTL/LTR test
- [ ] Mobile responsive test
- [ ] Performance test (loading speed)

---

## 📊 تتبع التقدم

### المرحلة 1: الإحصائيات

| المهمة | الحالة | التقدم | الوقت المقدر |
|--------|--------|--------|--------------|
| Sidebar Translations | ⏳ Pending | 0% | 30 min |
| Test Sidebar | ⏳ Pending | 0% | 1 hour |
| ActionButtonsBar | ⏳ Pending | 0% | 2-3 hours |
| Dynamic Tabs | ⏳ Pending | 0% | 2-3 hours |
| Multi-Language Forms | ⏳ Pending | 0% | 2-3 hours |
| Final Testing | ⏳ Pending | 0% | 2 hours |

**إجمالي الوقت المقدر:** 10-12 ساعة عمل فعلي

**التقدم العام للمرحلة 1:** 80% ✅

---

## 🎯 الخطوات التالية بعد المرحلة 1

### المرحلة 2: SaaS Admin Dashboard
**المدة المقدرة:** أسبوع 3-4

**المهام الرئيسية:**
1. صفحة Agents/Resellers
2. صفحة Subscribers
3. صفحة Plans/Packages
4. صفحة Marketing/Coupons
5. صفحة Reports
6. Commission System UI

---

### المرحلة 3: نظام العملات والدول
**المدة المقدرة:** أسبوع 5

**المهام الرئيسية:**
1. إعدادات العملات
2. إعدادات الدول
3. محول العملات (Currency Converter)
4. إعدادات التقريب
5. اختبار multi-currency transactions

---

## 📝 قواعد التوثيق

### بعد كل مهمة:
1. ✅ تحديث هذا الملف (WORK_PLAN.md)
2. ✅ تحديث PHASE_1_PROGRESS.md
3. ✅ إضافة ملاحظات في MASTER_DEVELOPMENT_PLAN.md
4. ✅ كتابة أي Issues أو Bugs في ملف منفصل

### عند إكمال مرحلة:
1. ✅ إنشاء ملف PHASE_X_COMPLETED.md
2. ✅ إضافة Screenshots إن أمكن
3. ✅ كتابة Lessons Learned
4. ✅ تحديث CONTEXT_FOR_NEXT_CONVERSATION.txt

---

## 💡 نصائح للعمل الفعال

### حفظ السياق:
```
✅ استخدم ملفات الـ Context
✅ لا تكرر قراءة نفس الملفات
✅ اعتمد على التوثيق المكتوب
✅ اكتب ملخصات قصيرة
```

### توفير التكاليف:
```
✅ اعمل على مهمة واحدة في المرة
✅ اختبر بعد كل تغيير
✅ لا تقفز للمهمة التالية قبل الانتهاء
✅ استخدم TODO system
```

### الجودة أولاً:
```
✅ اكتب كود نظيف
✅ اتبع القواعد الذهبية
✅ اختبر كل سيناريو
✅ وثق كل شيء
```

---

## ✅ Checklist العام

### قبل البدء بأي مهمة:
- [ ] قراءة وصف المهمة بالكامل
- [ ] فهم الهدف والنتيجة المتوقعة
- [ ] التحقق من الملفات المتأثرة
- [ ] تحديد الوقت المتوقع

### أثناء العمل:
- [ ] اتباع خطوات التنفيذ
- [ ] اختبار بعد كل تغيير صغير
- [ ] كتابة ملاحظات إن وجدت مشاكل
- [ ] تحديث TODO items

### بعد إكمال المهمة:
- [ ] اختبار شامل
- [ ] تحديث التوثيق
- [ ] mark TODO as completed
- [ ] الانتقال للمهمة التالية

---

## 🎉 رسالة تحفيزية

**أنت على الطريق الصحيح! 🚀**

- ✅ Backend جاهز 95%
- ✅ Services & Hooks مطبقة
- ✅ Sidebar يعمل بشكل ديناميكي (80%)
- ⏳ باقي المرحلة 1: 10-12 ساعة فقط!

**خطوة بخطوة، سنصل للهدف! 💪**

---

**🔄 آخر تحديث:** 24 يناير 2026  
**📊 التقدم العام:** Backend 95% | Frontend 40%  
**🎯 المهمة الحالية:** المرحلة 1 - المهمة 1 (Sidebar Translations)  
**⏰ الوقت المتبقي للمرحلة 1:** ~10 ساعات

---

**Good luck! 🎯 بالتوفيق! 💪**
