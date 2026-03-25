# 📋 خطة تنفيذ Frontend - دليل عملي
# Frontend Implementation Roadmap

> **آخر تحديث:** 24 يناير 2026  
> **الحالة الحالية:** Backend 95% | Frontend 40%  
> **الهدف:** Production Ready خلال 3-4 أشهر

---

## 🎯 نظرة عامة سريعة

**ما تم إنجازه في Backend:**
- ✅ 35 Migration كاملة
- ✅ نظام Multi-Tenant متكامل
- ✅ نظام التحكم بالموديولات والميزات
- ✅ 30 عملة + 50 دولة + إعدادات محلية
- ✅ نظام تقريب شامل
- ✅ 9 لغات مدعومة بالكامل

**ما يحتاج تنفيذ في Frontend:**
- 🔴 ربط الموديولات والميزات بالواجهة
- 🔴 لوحة إدارة SaaS
- 🔴 نظام العملات والدول
- 🟡 تحسينات المحاسبة
- ⚪ المبيعات والمشتريات (جاهز في Backend)
- ⚪ المخزون (جاهز في Backend)

---

## 📅 المرحلة 1: ربط الموديولات والميزات (أسبوع 1-2)

### الأهداف:
- تفعيل نظام الموديولات الديناميكي
- إخفاء/إظهار الميزات حسب الباقة
- Upsell واضح للميزات المميزة

### المهام التفصيلية:

#### اليوم 1-2: Sidebar التفاعلي
```typescript
// src/components/layout/Sidebar.tsx

import { useModules } from '@/hooks/useModules';

const { modules, loading } = useModules();

return (
  <nav>
    {modules.map(module => (
      module.is_enabled ? (
        <NavLink to={module.route}>
          {module.icon} {t(`modules.${module.code}`)}
        </NavLink>
      ) : (
        <UpgradeButton module={module} />
      )
    ))}
  </nav>
);
```

**Checklist:**
- [ ] استيراد `useModules` hook
- [ ] عرض الموديولات المفعلة فقط
- [ ] إضافة مؤشر "Upgrade" للمقفلة
- [ ] اختبار مع باقات مختلفة

---

#### اليوم 3-4: Features Control
```typescript
// في أي مكون يحتوي أزرار

import { useFeatures } from '@/hooks/useFeatures';

const { hasFeature } = useFeatures();
const canExportPDF = await hasFeature('accounting', 'export_pdf');

{canExportPDF && <ExportPDFButton />}
{!canExportPDF && <UpgradeTooltip feature="export_pdf" />}
```

**الملفات المتأثرة:**
- `src/components/shared/actions/ActionButtonsBar.tsx`
- `src/features/accounting/components/QuickActionsBar.tsx`
- `src/features/accounting/AccountingReports.tsx`
- جميع الصفحات التي تحتوي Export/Advanced features

**Checklist:**
- [ ] تحديث ActionButtonsBar
- [ ] إضافة Tooltips للميزات المقفلة
- [ ] اختبار الإخفاء/الإظهار
- [ ] إضافة Upgrade CTAs

---

#### اليوم 5-6: UI Tabs الديناميكية
```typescript
// src/components/sheets/universal/UniversalDetailTabs.tsx

import { useAllowedTabs } from '@/hooks/useAllowedTabs';

const { allowedTabs, loading } = useAllowedTabs(entityType);

const tabs = allTabs.filter(tab => allowedTabs.includes(tab.code));
```

**Checklist:**
- [ ] تطبيق في UniversalDetailSheet
- [ ] إخفاء تبويبات غير متاحة
- [ ] اختبار مع كل أنواع الكيانات
- [ ] تحديث DynamicTabs

---

#### اليوم 7: النماذج متعددة اللغات
```typescript
// src/features/accounting/ChartOfAccounts/AddAccountSheet.tsx

import { useLanguages } from '@/hooks/useLanguages';

const { activeLanguages } = useLanguages();

return (
  <Form>
    {activeLanguages.map(lang => (
      <Input 
        key={lang.code}
        name={`name_${lang.code}`}
        label={`${t('common.name')} (${lang.name})`}
        required={lang.code === 'ar' || lang.code === 'en'}
      />
    ))}
  </Form>
);
```

**Checklist:**
- [ ] تحديث AddAccountSheet
- [ ] تحديث forms الأطراف (Parties)
- [ ] تطبيق في forms المنتجات
- [ ] اختبار مع لغات مختلفة

---

### المخرج النهائي للمرحلة 1:
- ✅ Sidebar ديناميكي كامل
- ✅ Features control محكم
- ✅ UI Tabs متجاوبة
- ✅ نماذج متعددة اللغات

---

## 📅 المرحلة 2: لوحة إدارة SaaS (أسبوع 3-5)

### الأهداف:
- أدوات كاملة لإدارة المشتركين
- إدارة الموديولات والميزات
- إدارة اللغات
- تقارير وإحصائيات

### الأسبوع الأول (أسبوع 3):

#### اليوم 1-2: Services الأساسية
```typescript
// src/services/saas/tenantsService.ts

export const tenantsService = {
  getAllTenants: async (filters?) => {
    const query = supabase
      .from('tenants')
      .select(`
        *,
        subscription:subscriptions(*,
          plan:subscription_plans(*)
        )
      `);
    
    if (filters?.plan) query.eq('subscriptions.plan_id', filters.plan);
    if (filters?.status) query.eq('subscriptions.status', filters.status);
    
    return await query;
  },
  
  getTenantDetails: async (tenantId: string) => {
    // ... تفاصيل كاملة
  },
  
  updateTenantModules: async (tenantId, modules) => {
    // ... تحديث الموديولات
  }
};
```

**Services المطلوبة:**
- [ ] `tenantsService.ts`
- [ ] `subscriptionsService.ts`
- [ ] `modulesManagementService.ts`
- [ ] `featuresManagementService.ts`

---

#### اليوم 3-5: صفحة قائمة المشتركين
```typescript
// src/features/saas/Subscribers.tsx

const Subscribers = () => {
  const [tenants, setTenants] = useState([]);
  const [filters, setFilters] = useState({});
  
  useEffect(() => {
    loadTenants();
  }, [filters]);
  
  return (
    <Page>
      <FiltersBar />
      <TenantsList tenants={tenants} />
      <Pagination />
    </Page>
  );
};
```

**Components:**
- [ ] FiltersBar (باقة، حالة، تاريخ)
- [ ] TenantsList (جدول أو بطاقات)
- [ ] TenantCard (معلومات مختصرة + actions)
- [ ] UpgradeDialog
- [ ] SuspendDialog

---

### الأسبوع الثاني (أسبوع 4):

#### اليوم 1-3: صفحة تفاصيل المشترك
```typescript
// src/features/saas/TenantDetails.tsx

const TenantDetails = ({ tenantId }) => {
  const [tenant, setTenant] = useState(null);
  
  return (
    <Sheet>
      <TenantInfoCard />
      <SubscriptionCard />
      <UsageStatsCard />
      <CompaniesListCard />
      <InvoicesHistoryCard />
      <ActionsBar />
    </Sheet>
  );
};
```

**Components:**
- [ ] TenantInfoCard
- [ ] SubscriptionCard (مع تاريخ، باقة، حالة)
- [ ] UsageStatsCard (Users، Storage، Companies)
- [ ] CompaniesListCard
- [ ] InvoicesHistoryCard

---

#### اليوم 4-5: إدارة الموديولات
```typescript
// src/features/saas/components/TenantModulesManager.tsx

const TenantModulesManager = ({ tenantId }) => {
  const { modules } = useModules(tenantId);
  
  const toggleModule = async (moduleCode) => {
    await modulesManagementService.toggle(tenantId, moduleCode);
  };
  
  return (
    <Grid>
      {modules.map(module => (
        <ModuleCard 
          module={module}
          onToggle={() => toggleModule(module.code)}
        />
      ))}
    </Grid>
  );
};
```

**Features:**
- [ ] عرض جميع الموديولات
- [ ] تفعيل/تعطيل
- [ ] تحرير Features لكل موديول
- [ ] حفظ تلقائي

---

### الأسبوع الثالث (أسبوع 5):

#### اليوم 1-2: إدارة اللغات
```typescript
// src/features/saas/components/TenantLanguagesManager.tsx

const TenantLanguagesManager = ({ tenantId }) => {
  const { tenant } = useTenant(tenantId);
  const { systemLanguages } = useSystemLanguages();
  const { activeLanguages } = useTenantLanguages(tenantId);
  
  const maxLanguages = tenant.subscription.plan.max_languages;
  const additionalPrice = tenant.subscription.plan.additional_language_price;
  
  return (
    <div>
      <LanguageLimitBadge current={activeLanguages.length} max={maxLanguages} />
      <LanguagesList 
        languages={systemLanguages}
        active={activeLanguages}
        onToggle={toggleLanguage}
      />
      {activeLanguages.length >= maxLanguages && (
        <UpgradeAlert price={additionalPrice} />
      )}
    </div>
  );
};
```

---

#### اليوم 3-5: Dashboard & Analytics
```typescript
// src/features/saas/SaaSDashboard.tsx

const SaaSDashboard = () => {
  const stats = useSaaSStats();
  
  return (
    <Dashboard>
      <StatCard 
        title={t('saas.activeSubscribers')}
        value={stats.activeSubscribers}
        trend="+12%"
      />
      <StatCard 
        title={t('saas.monthlyRevenue')}
        value={formatCurrency(stats.revenue)}
        trend="+8%"
      />
      <RevenueChart data={stats.revenueHistory} />
      <ChurnRateChart data={stats.churnRate} />
      <TopPlansChart data={stats.planDistribution} />
    </Dashboard>
  );
};
```

---

### المخرج النهائي للمرحلة 2:
- ✅ نظام إدارة مشتركين كامل
- ✅ أدوات تحكم شاملة
- ✅ لوحة معلومات احترافية
- ✅ تقارير مفصلة

---

## 📅 المرحلة 3: نظام العملات والدول (أسبوع 6-7)

### الأهداف:
- تفعيل نظام العملات والدول في الواجهة
- تحويل عملات تلقائي
- إعدادات محلية كاملة
- تقريب ذكي

### الأسبوع الأول (أسبوع 6):

#### اليوم 1-2: Services & Hooks
```typescript
// src/services/currenciesService.ts
export const currenciesService = {
  getCurrencies: async (tenantId: string) => {
    return await supabase
      .from('currencies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('code');
  },
  
  updateExchangeRate: async (tenantId, code, rate) => {
    // تحديث سعر الصرف
  },
  
  convert: (amount, fromCurrency, toCurrency) => {
    // تحويل بين عملتين
  }
};

// src/hooks/useCurrencies.ts
export const useCurrencies = () => {
  const { tenantId } = useAuth();
  const [currencies, setCurrencies] = useState([]);
  
  useEffect(() => {
    loadCurrencies();
  }, [tenantId]);
  
  const convert = (amount, from, to) => {
    // منطق التحويل
  };
  
  return { currencies, loading, convert };
};
```

**Services المطلوبة:**
- [ ] `currenciesService.ts`
- [ ] `countriesService.ts`
- [ ] `roundingService.ts`

**Hooks المطلوبة:**
- [ ] `useCurrencies.ts`
- [ ] `useCountries.ts`
- [ ] `useRounding.ts`

---

#### اليوم 3-5: UI Components
```typescript
// src/components/shared/CurrencySelector.tsx

const CurrencySelector = ({ value, onChange, label }) => {
  const { currencies, loading } = useCurrencies();
  const { i18n } = useTranslation();
  
  return (
    <Select
      value={value}
      onChange={onChange}
      label={label}
      loading={loading}
    >
      {currencies.map(currency => (
        <Option key={currency.code} value={currency.code}>
          {currency.symbol} - {currency[`name_${i18n.language}`]}
        </Option>
      ))}
    </Select>
  );
};
```

**Components المطلوبة:**
- [ ] `CurrencySelector.tsx`
- [ ] `CountrySelector.tsx`
- [ ] `CurrencyConverter.tsx`
- [ ] `AmountDisplay.tsx`
- [ ] `ExchangeRateDisplay.tsx`

---

### الأسبوع الثاني (أسبوع 7):

#### اليوم 1-3: صفحات الإعدادات
```typescript
// src/features/settings/CompanyCurrencies.tsx

const CompanyCurrencies = () => {
  const { company } = useCompany();
  const { currencies } = useCurrencies();
  
  return (
    <SettingsPage>
      <Section title={t('settings.baseCurrency')}>
        <CurrencySelector 
          value={company.base_currency}
          onChange={updateBaseCurrency}
        />
      </Section>
      
      <Section title={t('settings.additionalCurrencies')}>
        <MultiCurrencySelector 
          selected={company.additional_currencies}
          onChange={updateCurrencies}
        />
      </Section>
      
      <Section title={t('settings.exchangeRates')}>
        <ExchangeRatesTable />
      </Section>
    </SettingsPage>
  );
};
```

**صفحات الإعدادات:**
- [ ] `CompanyCurrencies.tsx`
- [ ] `CompanyLocale.tsx`
- [ ] `CompanyRounding.tsx`

---

#### اليوم 4-5: التكامل مع النماذج
- [ ] تحديث forms الفواتير
- [ ] إضافة currency selector
- [ ] تطبيق التقريب التلقائي
- [ ] عرض المبالغ بالتنسيق الصحيح

---

### المخرج النهائي للمرحلة 3:
- ✅ نظام عملات كامل العمل
- ✅ إعدادات محلية شاملة
- ✅ تقريب ذكي تلقائي
- ✅ تجربة مستخدم دولية

---

## 📊 ملخص الجدول الزمني

| المرحلة | المدة | الحالة | الأولوية |
|---------|------|--------|----------|
| 1. ربط الموديولات | 1-2 أسبوع | 🔴 | عاجل جداً |
| 2. لوحة SaaS | 2-3 أسبوع | 🔴 | عاجل جداً |
| 3. العملات والدول | 1-2 أسبوع | 🔴 | عاجل جداً |
| 4. معالج التسجيل | 1 أسبوع | 🟠 | عالي |
| 5. تحسينات المحاسبة | 2-3 أسبوع | 🟠 | عالي |
| 6. المبيعات والمشتريات | 4-6 أسبوع | 🟡 | متوسط |
| 7. المخزون | 3-4 أسبوع | 🟡 | متوسط |
| 8-10. ميزات متقدمة | 5-6 أسبوع | 🟢 | منخفض |

**إجمالي الوقت المتوقع:** 3-4 أشهر للإنتاج الكامل

---

## ✅ Checklist لكل مرحلة

### قبل البدء:
- [ ] مراجعة Backend APIs
- [ ] فهم البيانات المطلوبة
- [ ] تحضير مفاتيح الترجمة
- [ ] تصميم UI/UX أولي

### أثناء التطوير:
- [ ] اتباع .cursorrules بدقة
- [ ] استخدام Services فقط
- [ ] ترجمة جميع النصوص
- [ ] RTL Support
- [ ] Mobile Responsive
- [ ] Error Handling
- [ ] Loading States

### بعد الانتهاء:
- [ ] اختبار مع بيانات حقيقية
- [ ] اختبار مع باقات مختلفة
- [ ] اختبار RTL
- [ ] اختبار Mobile
- [ ] Code Review
- [ ] Documentation

---

## 🎯 مؤشرات النجاح

### المرحلة 1-3 (MVP):
- ✅ نظام SaaS يعمل بالكامل
- ✅ Features Control محكم
- ✅ تجربة مستخدم احترافية
- ✅ دعم 9 لغات + 30 عملة + 50 دولة

### المرحلة 4-5:
- ✅ Onboarding سلس
- ✅ تجربة محاسبية محسنة
- ✅ تقارير احترافية

### المرحلة 6-11:
- ✅ نظام ERP كامل
- ✅ ميزات متخصصة
- ✅ ذكاء اصطناعي

---

**🚀 مستعد للبدء؟ ابدأ بالمرحلة 1 الآن!**
