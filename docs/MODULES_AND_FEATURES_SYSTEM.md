# 📘 نظام التحكم في الموديولات والميزات
# Modules, Features & Multi-Language Control System

> **آخر تحديث:** يناير 2026  
> **النظام:** TexaCore ERP System  
> **الإصدار:** 1.0.0

---

# 📋 جدول المحتويات

1. [نظرة عامة](#-نظرة-عامة)
2. [هيكلية الموديولات](#-هيكلية-الموديولات)
3. [نظام الميزات](#-نظام-الميزات)
4. [نظام اللغات المتعددة](#-نظام-اللغات-المتعددة)
5. [نظام التبويبات](#-نظام-التبويبات)
6. [Backend: الجداول والدوال](#-backend-الجداول-والدوال)
7. [Frontend: Services & Hooks](#-frontend-services--hooks)
8. [أمثلة الاستخدام](#-أمثلة-الاستخدام)
9. [خطة التطوير القادمة](#-خطة-التطوير-القادمة)

---

# 🎯 نظرة عامة

## الهدف من النظام

نظام متكامل للتحكم الديناميكي في:
1. ✅ **الموديولات** - إخفاء/إظهار أقسام كاملة (المحاسبة، المخزون، الأقمشة...)
2. ✅ **الميزات** - التحكم في ميزات معينة داخل كل موديول (تصدير PDF، AI، تقارير متقدمة...)
3. ✅ **اللغات** - تحديد عدد اللغات المتاحة لكل مشترك حسب باقته
4. ✅ **التبويبات** - إخفاء/إظهار تبويبات محددة في صفحات التفاصيل

---

## المميزات الرئيسية

- ⚡ **ديناميكي بالكامل** - لا يحتاج تعديل كود
- 🎯 **حسب الباقة** - كل plan له ميزات مختلفة
- 🔒 **آمن** - يعتمد على RLS في Supabase
- 🚀 **سريع** - Cache في Frontend
- 🌍 **متعدد اللغات** - يدعم 9 لغات حالياً

---

# 🗂️ هيكلية الموديولات

## الموديولات المتاحة

| الكود | الاسم العربي | الاسم الإنجليزي | الوصف |
|------|-------------|-----------------|-------|
| `accounting` | المحاسبة | Accounting | شجرة الحسابات، القيود، التقارير |
| `sales` | المبيعات | Sales | الفواتير، عروض الأسعار |
| `inventory` | المخزون | Inventory | المنتجات، المستودعات، الحركات |
| `fabric` | الأقمشة | Fabric | مواد، ألوان، رولونات |
| `containers` | الكونتينرات | Containers | شحنات، حاويات، landed cost |
| `manufacturing` | التصنيع | Manufacturing | أوامر التصنيع |

---

## كيف يعمل التحكم في الموديولات؟

### 1. مستوى الباقة (Subscription Plan)

```sql
-- في جدول subscription_plans
included_modules JSONB DEFAULT '["accounting"]'::jsonb

-- مثال:
Starter: ["accounting", "sales"]
Professional: ["accounting", "sales", "inventory"]
Enterprise: ["accounting", "sales", "inventory", "fabric", "containers"]
```

### 2. مستوى التينانت (Tenant Activation)

```sql
-- في جدول tenant_modules
{
  tenant_id: "xxx",
  module_code: "accounting",
  is_enabled: true
}
```

### 3. التحقق في Frontend

```typescript
const { hasModule } = useModules();

if (hasModule('accounting')) {
  // إظهار قسم المحاسبة
}
```

---

# ⚙️ نظام الميزات

## ما هي الميزات؟

الميزات (Features) هي وظائف أو قدرات محددة داخل موديول معين.

### أمثلة:

| الموديول | الميزة | الوصف |
|---------|--------|-------|
| `accounting` | `export_pdf` | تصدير التقارير كـ PDF |
| `accounting` | `ai_analysis` | تحليل ذكي بالـ AI |
| `accounting` | `multi_currency` | دعم العملات المتعددة |
| `sales` | `recurring_invoices` | الفواتير المتكررة |
| `inventory` | `batch_tracking` | تتبع الدفعات |

---

## هيكلية الميزات

### جدول `module_features`

```sql
module_code: 'accounting'
feature_code: 'export_pdf'
name_ar: 'تصدير PDF'
name_en: 'Export PDF'
icon: 'FileText'
is_core: false  -- هل أساسية أم إضافية؟
```

### جدول `plan_module_features`

ربط الميزات بالباقات:

```sql
plan_id: 'starter-plan-id'
module_code: 'accounting'
feature_code: 'export_pdf'
is_included: true
```

---

## التحقق من الميزات

### في Frontend:

```typescript
const { hasFeature } = useFeatures();

// تحقق من ميزة واحدة
const canExport = await hasFeature('accounting', 'export_pdf');

if (canExport) {
  // إظهار زر التصدير
}

// تحقق من عدة ميزات
const features = await hasFeatures([
  { moduleCode: 'accounting', featureCode: 'export_pdf' },
  { moduleCode: 'accounting', featureCode: 'ai_analysis' }
]);
```

### في Backend:

```sql
SELECT check_feature_access(
  p_tenant_id := 'xxx',
  p_module_code := 'accounting',
  p_feature_code := 'export_pdf'
);
-- returns: true/false
```

---

# 🌍 نظام اللغات المتعددة

## المفهوم الأساسي

بدلاً من فتح كل 9 لغات لكل مشترك:
- ✅ كل باقة لها حد أقصى من اللغات
- ✅ المشترك يختار اللغات التي يريدها فقط
- ✅ يمكن إضافة لغات إضافية بثمن

---

## هيكلية النظام

### 1. جدول `system_languages`

اللغات المتاحة في النظام:

```sql
code: 'ar', name_ar: 'العربية', name_en: 'Arabic', direction: 'rtl'
code: 'en', name_ar: 'الإنجليزية', name_en: 'English', direction: 'ltr'
... (9 لغات)
```

### 2. جدول `subscription_plans`

حدود اللغات لكل باقة:

```sql
plan_name: 'Starter', max_languages: 2
plan_name: 'Professional', max_languages: 3
plan_name: 'Enterprise', max_languages: 5
additional_language_price: 5.00  -- سعر كل لغة إضافية
```

### 3. جدول `tenant_languages`

اللغات المفعلة لكل tenant:

```sql
{
  tenant_id: 'xxx',
  language_code: 'ar',
  is_primary: true,
  is_enabled: true,
  display_order: 1
}
```

---

## كيفية الاستخدام

### في Frontend:

```typescript
const { 
  tenantLanguages, 
  limitInfo, 
  enableLanguage,
  getEnabledLanguageCodes 
} = useLanguages();

// الحصول على اللغات المفعلة
const enabledLangs = getEnabledLanguageCodes(); 
// ['ar', 'en', 'uk']

// التحقق من الحد الأقصى
console.log(limitInfo);
// { 
//   current_count: 3, 
//   max_languages: 5, 
//   can_add_more: true 
// }

// تفعيل لغة جديدة
await enableLanguage('pl'); // بولندي
```

### في إضافة حساب محاسبي:

```typescript
const { getEnabledLanguageCodes } = useLanguages();

// عرض حقول الإدخال للغات المفعلة فقط
const langs = getEnabledLanguageCodes();

<>
  {langs.map(lang => (
    <Input 
      key={lang}
      name={`name_${lang}`}
      label={t(`languages.${lang}`)}
    />
  ))}
</>
```

---

## الدوال المتاحة (Backend)

| الدالة | الوظيفة |
|-------|---------|
| `get_tenant_active_languages()` | الحصول على اللغات المفعلة |
| `check_language_limit()` | التحقق من الحد الأقصى |
| `enable_tenant_language()` | تفعيل لغة |
| `disable_tenant_language()` | تعطيل لغة |
| `set_primary_language()` | تعيين اللغة الأساسية |

---

# 📑 نظام التبويبات

## ما هو نظام التبويبات؟

التحكم في التبويبات (Tabs) التي تظهر في صفحات التفاصيل.

### مثال: صفحة تفاصيل فاتورة

```
التبويبات الأساسية (دائماً موجودة):
- Overview (نظرة عامة)
- Lines (البنود)

التبويبات الإضافية (حسب الباقة):
- Documents (المرفقات) ← Professional+
- AI Analysis (تحليل ذكي) ← Enterprise
- Notes (الملاحظات) ← Professional+
```

---

## هيكلية التبويبات

### جدول `ui_tabs`

```sql
{
  code: 'invoice_documents',
  section_code: 'invoice_details',
  name_ar: 'المرفقات',
  name_en: 'Documents',
  icon: 'Paperclip',
  order: 3,
  is_core: false,  -- غير أساسي
  required_module: 'accounting',
  required_feature: 'document_management'
}
```

### جدول `plan_ui_tabs`

```sql
{
  plan_id: 'professional-plan-id',
  tab_code: 'invoice_documents',
  is_included: true
}
```

---

## الاستخدام في Frontend

```typescript
const { tabs, hasTab } = useAllowedTabs('invoice_details');

// التبويبات المتاحة فقط
tabs.map(tab => (
  <TabTrigger value={tab.code}>
    {isRTL ? tab.name_ar : tab.name_en}
  </TabTrigger>
))

// التحقق من تبويب معين
if (hasTab('invoice_documents')) {
  <TabContent value="invoice_documents">
    <DocumentsTab />
  </TabContent>
}
```

---

# 🗃️ Backend: الجداول والدوال

## الجداول الرئيسية

| الجدول | الوصف | الملف |
|-------|-------|-------|
| `module_features` | الميزات المتاحة | STEP_32 |
| `plan_module_features` | ربط الميزات بالباقات | STEP_32 |
| `ui_tabs` | تبويبات الواجهة | STEP_32 |
| `plan_ui_tabs` | ربط التبويبات بالباقات | STEP_32 |
| `system_languages` | اللغات المتاحة | STEP_32_B |
| `tenant_languages` | اللغات المفعلة | STEP_32_B |

---

## الدوال الرئيسية

### دوال الموديولات:

```sql
get_tenant_available_modules(p_tenant_id UUID)
toggle_tenant_module(p_tenant_id UUID, p_module_code VARCHAR)
get_tenant_sidebar_structure(p_tenant_id UUID)
```

### دوال الميزات:

```sql
check_feature_access(
  p_tenant_id UUID,
  p_module_code VARCHAR,
  p_feature_code VARCHAR
)
```

### دوال التبويبات:

```sql
get_allowed_tabs(
  p_tenant_id UUID,
  p_section_code VARCHAR
)
```

### دوال اللغات:

```sql
get_tenant_active_languages(p_tenant_id UUID)
check_language_limit(p_tenant_id UUID)
enable_tenant_language(p_tenant_id UUID, p_language_code VARCHAR, p_is_primary BOOLEAN)
disable_tenant_language(p_tenant_id UUID, p_language_code VARCHAR)
set_primary_language(p_tenant_id UUID, p_language_code VARCHAR)
```

---

# 💻 Frontend: Services & Hooks

## Services

### 1. `modulesService.ts`

```typescript
export const modulesService = {
  getAvailableModules(tenantId): Promise<TenantModule[]>
  getSidebarStructure(tenantId): Promise<SidebarStructure>
  checkModuleAccess(moduleCode, tenantId): Promise<boolean>
  toggleModuleForTenant(tenantId, moduleCode): Promise<any>
  getAllSystemModules(): Promise<any[]>
}
```

### 2. `featuresService.ts`

```typescript
export const featuresService = {
  checkFeatureAccess(moduleCode, featureCode, tenantId): Promise<boolean>
  getModuleFeatures(moduleCode): Promise<ModuleFeature[]>
  getPlanFeatures(planId): Promise<any[]>
  getAllFeatures(): Promise<ModuleFeature[]>
}
```

### 3. `languagesService.ts`

```typescript
export const languagesService = {
  getSystemLanguages(): Promise<SystemLanguage[]>
  getTenantLanguages(tenantId): Promise<TenantLanguage[]>
  checkLanguageLimit(tenantId): Promise<LanguageLimitInfo>
  enableLanguage(tenantId, languageCode, isPrimary): Promise<any>
  disableLanguage(tenantId, languageCode): Promise<any>
  setPrimaryLanguage(tenantId, languageCode): Promise<any>
  getAvailableLanguagesToAdd(tenantId): Promise<SystemLanguage[]>
}
```

---

## Hooks

### 1. `useModules()`

```typescript
const { 
  modules,           // كل الموديولات
  sidebar,           // بنية القائمة الجانبية
  hasModule,         // (code) => boolean
  isModuleLocked,    // (code) => boolean
  getModule,         // (code) => TenantModule
  loading,
  refresh
} = useModules();
```

### 2. `useFeatures()`

```typescript
const { 
  hasFeature,         // (module, feature) => Promise<boolean>
  hasFeatures,        // ([...]) => Promise<{...}>
  hasFeatureSync,     // من الـ cache فقط
  clearCache,
  loading
} = useFeatures();
```

### 3. `useLanguages()`

```typescript
const { 
  systemLanguages,        // كل اللغات المتاحة
  tenantLanguages,        // اللغات المفعلة
  limitInfo,              // الحد الأقصى والمتبقي
  getPrimaryLanguage,     // () => TenantLanguage
  isLanguageEnabled,      // (code) => boolean
  getEnabledLanguageCodes, // () => string[]
  enableLanguage,         // (code, isPrimary) => Promise<boolean>
  disableLanguage,        // (code) => Promise<boolean>
  setPrimaryLanguage,     // (code) => Promise<boolean>
  loading,
  refresh
} = useLanguages();
```

### 4. `useAllowedTabs(sectionCode)`

```typescript
const { 
  tabs,        // التبويبات المسموحة
  coreTabs,    // الأساسية فقط
  extraTabs,   // الإضافية فقط
  hasTab,      // (code) => boolean
  loading
} = useAllowedTabs('invoice_details');
```

---

# 📚 أمثلة الاستخدام

## مثال 1: إخفاء موديول في Sidebar

```typescript
import { useModules } from '@/hooks/useModules';

function Sidebar() {
  const { modules } = useModules();
  
  return (
    <nav>
      {modules.map(module => (
        module.is_enabled && (
          <SidebarItem key={module.module_code} {...module} />
        )
      ))}
    </nav>
  );
}
```

---

## مثال 2: إخفاء زر التصدير حسب الميزة

```typescript
import { useFeatures } from '@/hooks/useFeatures';

function InvoiceActions() {
  const { hasFeature } = useFeatures();
  const [canExport, setCanExport] = useState(false);
  
  useEffect(() => {
    hasFeature('accounting', 'export_pdf').then(setCanExport);
  }, []);
  
  return (
    <div>
      <Button>Save</Button>
      {canExport && <Button>Export PDF</Button>}
    </div>
  );
}
```

---

## مثال 3: حقول الإدخال متعددة اللغات

```typescript
import { useLanguages } from '@/hooks/useLanguages';

function AddAccountForm() {
  const { getEnabledLanguageCodes } = useLanguages();
  const langs = getEnabledLanguageCodes();
  
  return (
    <form>
      {langs.map(lang => (
        <Input
          key={lang}
          name={`name_${lang}`}
          label={`Account Name (${lang.toUpperCase()})`}
          placeholder={t(`placeholders.enterName.${lang}`)}
        />
      ))}
    </form>
  );
}
```

---

## مثال 4: تبويبات ديناميكية

```typescript
import { useAllowedTabs } from '@/hooks/useAllowedTabs';

function InvoiceDetailsSheet() {
  const { tabs } = useAllowedTabs('invoice_details');
  
  return (
    <Tabs>
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.code} value={tab.code}>
            {isRTL ? tab.name_ar : tab.name_en}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {tabs.map(tab => (
        <TabsContent key={tab.code} value={tab.code}>
          {/* المحتوى */}
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

---

# 🚀 خطة التطوير القادمة

## المرحلة الحالية ✅

- ✅ Backend: Migrations + Functions
- ✅ Backend: Seed Data
- ✅ Frontend: Services (3 services)
- ✅ Frontend: Hooks (4 hooks)
- ✅ التوثيق

---

## المرحلة القادمة ⏳

### 1. UI Components للإدارة

- [ ] `TenantModulesManager.tsx` - إدارة الموديولات
- [ ] `LanguageSelector.tsx` - اختيار اللغات
- [ ] `PlanFeaturesViewer.tsx` - عرض ميزات الباقة

### 2. تحديث المكونات الموجودة

- [ ] تحديث `Sidebar.tsx` - استخدام `useModules`
- [ ] تحديث `UniversalDetailSheet.tsx` - استخدام `useAllowedTabs`
- [ ] تحديث `AddAccountSheet.tsx` - استخدام `useLanguages`

### 3. SaaS Admin Panel

- [ ] صفحة إدارة الميزات لكل باقة
- [ ] صفحة إدارة اللغات للتينانت
- [ ] تقارير الاستخدام

---

## المرحلة المستقبلية 🔮

### 1. Nexa Agent Integration

- [ ] ربط Nexa Agent للترجمة التلقائية
- [ ] API endpoint لترجمة البيانات
- [ ] واجهة لإدارة الترجمات الآلية

### 2. تحسينات الأداء

- [ ] Cache أفضل للميزات
- [ ] Lazy loading للموديولات
- [ ] Optimistic UI updates

### 3. Analytics

- [ ] تتبع استخدام الميزات
- [ ] تقارير الميزات الأكثر طلباً
- [ ] اقتراحات للترقية

---

# 📊 الإحصائيات الحالية

## البيانات التجريبية

| العنصر | العدد |
|-------|------|
| **Modules** | 6 موديولات |
| **Features** | 43 ميزة |
| **UI Tabs** | 27 تبويب |
| **Languages** | 9 لغات |
| **Plans** | 3 باقات |

---

# 🔒 الأمان والصلاحيات

## Row Level Security (RLS)

جميع الجداول محمية بـ RLS:

```sql
-- مثال: tenant_languages
CREATE POLICY "Users see their tenant languages"
ON tenant_languages
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);
```

---

## التحقق من الصلاحيات

```typescript
// Backend Function يتحقق من:
1. هل الموديول متضمن في الباقة؟
2. هل الموديول مفعل للتينانت؟
3. هل الميزة متضمنة في الباقة؟

// Frontend Hook يستعلم من Backend
```

---

# 📞 ملاحظات مهمة

## ⚠️ قواعد إلزامية:

1. **لا تعرض ميزة بدون التحقق منها أولاً**
2. **لا تعرض حقل لغة غير مفعلة**
3. **استخدم الـ Cache بحذر - قد تتغير الميزات**
4. **اختبر مع باقات مختلفة**

---

# 📝 سجل التغييرات

| التاريخ | التغيير |
|---------|---------|
| 2026-01-24 | إنشاء النظام الكامل |
| 2026-01-24 | Backend: STEP_32 + STEP_32_B |
| 2026-01-24 | Frontend: Services + Hooks |
| 2026-01-24 | إنشاء التوثيق |

---

> **💡 هذا النظام هو الأساس لـ SaaS قابل للتوسع - استخدمه بحكمة! 🚀**

---

**📖 للمزيد من المعلومات، راجع:**
- `docs/COMPLETE_REFERENCE_GUIDE.md`
- `MASTER_DEVELOPMENT_PLAN.md`
- `PROJECT_CONSTITUTION.md`
