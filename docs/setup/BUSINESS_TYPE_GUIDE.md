# 📘 دليل نظام Business Type و Company Switcher

## 📋 المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الميزات الجديدة](#الميزات-الجديدة)
3. [البنية التحتية](#البنية-التحتية)
4. [كيفية الاستخدام](#كيفية-الاستخدام)
5. [أمثلة عملية](#أمثلة-عملية)
6. [الخطوات التالية (Frontend)](#الخطوات-التالية-frontend)

---

## 🎯 نظرة عامة

تم تطوير نظام **Business Type** و **Company Switcher** للسماح بـ:

1. **اختيار نوع العمل** عند التسجيل (Fabric, Exchange, Healthcare, etc.)
2. **إنشاء شركتين** للمشتركين في قطاع الأقمشة:
   - شركة **حقيقية** (Production) - للعمل الفعلي
   - شركة **تجريبية** (Testing) - للتجارب والاختبارات
3. **التنقل بين الشركات** من إعدادات المستخدم

---

## ✨ الميزات الجديدة

### 1. **حقول جديدة في جدول `companies`**

| الحقل | النوع | القيم المتاحة | الافتراضي |
|-------|------|---------------|-----------|
| `business_type` | `VARCHAR(50)` | `general`, `fabric`, `exchange`, `healthcare`, `ecommerce` | `general` |
| `company_type` | `VARCHAR(20)` | `production`, `testing` | `production` |

### 2. **دوال Backend جديدة**

#### A. `register_new_subscriber()` - محدثة ✅

```sql
register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR,
    p_user_name VARCHAR,
    p_company_name VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_business_type VARCHAR DEFAULT 'general'  -- ← جديد
)
```

**السلوك:**
- إذا كان `p_business_type = 'fabric'` → إنشاء **شركتين**:
  - `شركة ABC` (production)
  - `شركة ABC - تجريبية` (testing)
- خلاف ذلك → إنشاء شركة واحدة فقط (production)

#### B. `get_user_companies()` - جديدة 🆕

```sql
get_user_companies(p_user_id UUID DEFAULT NULL)
```

**الاستخدام:**
```sql
-- عرض شركات المستخدم الحالي
SELECT * FROM get_user_companies();

-- عرض شركات مستخدم محدد
SELECT * FROM get_user_companies('user-uuid-here');
```

**النتيجة:**
| id | code | name | business_type | company_type | is_current |
|----|------|------|---------------|--------------|------------|
| uuid | COMP-001 | شركة ABC | fabric | production | ⭐ true |
| uuid | COMP-002 | شركة ABC - تجريبية | fabric | testing | false |

#### C. `switch_user_company()` - جديدة 🆕

```sql
switch_user_company(
    p_user_id UUID,
    p_new_company_id UUID
)
```

**الاستخدام:**
```sql
-- تبديل إلى شركة أخرى
SELECT switch_user_company(
    'user-uuid-here',
    'company-uuid-here'
);
```

**النتيجة:**
```json
{
  "success": true,
  "company_id": "uuid",
  "company_name": "شركة ABC - تجريبية",
  "message": "تم تبديل الشركة بنجاح"
}
```

---

## 🏗️ البنية التحتية

### Schema Changes

```sql
-- جدول companies
ALTER TABLE companies 
    ADD COLUMN business_type VARCHAR(50) DEFAULT 'general',
    ADD COLUMN company_type VARCHAR(20) DEFAULT 'production';

-- فهارس للأداء
CREATE INDEX idx_companies_business_type ON companies(business_type);
CREATE INDEX idx_companies_company_type ON companies(company_type);
CREATE INDEX idx_companies_tenant_business ON companies(tenant_id, business_type);
```

### Security (RLS)

- ✅ `get_user_companies()` - يسمح فقط برؤية شركات المستخدم ضمن tenant الخاص به
- ✅ `switch_user_company()` - يسمح فقط بالتبديل إلى شركات ضمن tenant الخاص به
- ✅ كل الدوال تستخدم `SECURITY DEFINER` للأمان

---

## 📝 كيفية الاستخدام

### السيناريو 1: تسجيل مشترك جديد (General)

```typescript
// Frontend: Register.tsx
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: userId,
  p_user_email: 'user@example.com',
  p_user_name: 'أحمد محمد',
  p_company_name: 'شركة أحمد للتجارة',
  p_phone: '+966501234567',
  p_business_type: 'general'
});

// Result:
// ✅ Tenant created
// ✅ 1 Company created (production)
// ✅ User profile created
```

### السيناريو 2: تسجيل مشترك جديد (Fabric) ⭐

```typescript
// Frontend: Register.tsx
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: userId,
  p_user_email: 'fabric@example.com',
  p_user_name: 'محمد علي',
  p_company_name: 'شركة الأقمشة المتحدة',
  p_phone: '+966501234567',
  p_business_type: 'fabric'  // ← مهم!
});

// Result:
// ✅ Tenant created
// ✅ 2 Companies created:
//    - شركة الأقمشة المتحدة (production) ← الافتراضية
//    - شركة الأقمشة المتحدة - تجريبية (testing)
// ✅ User profile created (company_id = production company)
```

### السيناريو 3: عرض شركات المستخدم

```typescript
// Frontend: CompanySwitcher component
const { data: companies, error } = await supabase.rpc('get_user_companies');

// Result:
// [
//   { id: '...', name: 'شركة الأقمشة المتحدة', company_type: 'production', is_current: true },
//   { id: '...', name: 'شركة الأقمشة المتحدة - تجريبية', company_type: 'testing', is_current: false }
// ]
```

### السيناريو 4: تبديل الشركة

```typescript
// Frontend: CompanySwitcher component
const { data, error } = await supabase.rpc('switch_user_company', {
  p_user_id: user.id,
  p_new_company_id: testingCompanyId
});

// Result:
// { success: true, company_name: 'شركة الأقمشة المتحدة - تجريبية' }

// ثم: إعادة تحميل الصفحة أو refresh user profile
window.location.reload();
```

---

## 💡 أمثلة عملية

### Example 1: اختبار في SQL Editor

```sql
-- 1. تسجيل مستخدم جديد (Fabric)
SELECT register_new_subscriber(
    gen_random_uuid(),
    'test@fabric.com',
    'محمد الأقمشة',
    'شركة محمد للأقمشة',
    '+966501234567',
    'fabric'
);

-- 2. عرض الشركات المُنشأة
SELECT * FROM companies 
WHERE tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE email = 'test@fabric.com'
)
ORDER BY company_type DESC;

-- 3. عرض شركات المستخدم
SELECT * FROM get_user_companies(
    (SELECT id FROM user_profiles WHERE email = 'test@fabric.com')
);
```

### Example 2: Frontend Integration

```typescript
// 1. Register with business type selection
const handleRegister = async () => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password
  });

  if (authError) return;

  const { data, error } = await supabase.rpc('register_new_subscriber', {
    p_user_id: authData.user.id,
    p_user_email: formData.email,
    p_user_name: formData.fullName,
    p_company_name: formData.companyName,
    p_phone: formData.phone,
    p_business_type: formData.businessType // 'fabric', 'general', etc.
  });

  if (data?.success) {
    navigate('/dashboard');
  }
};

// 2. Company Switcher Component
const CompanySwitcher = () => {
  const [companies, setCompanies] = useState([]);
  
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase.rpc('get_user_companies');
    setCompanies(data || []);
  };

  const handleSwitch = async (companyId: string) => {
    const { data } = await supabase.rpc('switch_user_company', {
      p_user_id: user.id,
      p_new_company_id: companyId
    });

    if (data?.success) {
      window.location.reload(); // Reload to apply new company context
    }
  };

  return (
    <Select onValueChange={handleSwitch}>
      {companies.map(company => (
        <SelectItem key={company.id} value={company.id}>
          {company.name}
          {company.company_type === 'testing' && ' (تجريبية)'}
          {company.is_current && ' ⭐'}
        </SelectItem>
      ))}
    </Select>
  );
};
```

---

## 🚀 الخطوات التالية (Frontend)

### Phase 1: تحديث Register Component ✅

**الملف:** `src/features/auth/Register.tsx`

**التعديلات المطلوبة:**

1. **إضافة حقل Business Type Selector:**

```tsx
// إضافة state
const [businessType, setBusinessType] = useState('general');

// إضافة UI component
<div className="space-y-1.5">
  <Label>{t('auth.businessType')}</Label>
  <Select value={businessType} onValueChange={setBusinessType}>
    <SelectItem value="general">
      <Building className="w-4 h-4 me-2" />
      {t('auth.businessTypes.general')}
    </SelectItem>
    <SelectItem value="fabric">
      <Shirt className="w-4 h-4 me-2" />
      {t('auth.businessTypes.fabric')} ⭐
    </SelectItem>
    <SelectItem value="exchange">
      <DollarSign className="w-4 h-4 me-2" />
      {t('auth.businessTypes.exchange')}
    </SelectItem>
    <SelectItem value="healthcare">
      <Heart className="w-4 h-4 me-2" />
      {t('auth.businessTypes.healthcare')}
    </SelectItem>
    <SelectItem value="ecommerce">
      <ShoppingCart className="w-4 h-4 me-2" />
      {t('auth.businessTypes.ecommerce')}
    </SelectItem>
  </Select>
</div>
```

2. **تحديث RPC call:**

```tsx
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: userId,
  p_user_email: formData.email,
  p_user_name: formData.fullName,
  p_company_name: formData.companyName,
  p_phone: formData.phone,
  p_business_type: businessType  // ← إضافة هذا
});
```

3. **إضافة رسالة توضيحية للـ Fabric:**

```tsx
{businessType === 'fabric' && (
  <Alert className="bg-blue-50 border-blue-200">
    <Info className="w-4 h-4" />
    <AlertDescription>
      {t('auth.fabricNote')}
      {/* سيتم إنشاء شركتين: حقيقية وتجريبية */}
    </AlertDescription>
  </Alert>
)}
```

### Phase 2: إنشاء Company Switcher Component 🆕

**الملف الجديد:** `src/components/settings/CompanySwitcher.tsx`

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectItem } from '@/components/ui/select';
import { Building2, TestTube } from 'lucide-react';

export const CompanySwitcher = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase.rpc('get_user_companies');
    setCompanies(data || []);
    setLoading(false);
  };

  const handleSwitch = async (companyId: string) => {
    const { data, error } = await supabase.rpc('switch_user_company', {
      p_user_id: user.id,
      p_new_company_id: companyId
    });

    if (data?.success) {
      toast.success(t('settings.companySwitched'));
      window.location.reload();
    } else {
      toast.error(error?.message || t('errors.switchFailed'));
    }
  };

  if (loading) return <Skeleton className="h-10 w-full" />;
  if (companies.length <= 1) return null; // لا داعي للعرض إذا شركة واحدة فقط

  return (
    <div className="space-y-2">
      <Label>{t('settings.activeCompany')}</Label>
      <Select 
        value={companies.find(c => c.is_current)?.id}
        onValueChange={handleSwitch}
      >
        {companies.map(company => (
          <SelectItem key={company.id} value={company.id}>
            <div className="flex items-center gap-2">
              {company.company_type === 'production' ? (
                <Building2 className="w-4 h-4 text-teal-600" />
              ) : (
                <TestTube className="w-4 h-4 text-amber-600" />
              )}
              <span>{company.name}</span>
              {company.is_current && <span className="text-teal-600">⭐</span>}
            </div>
          </SelectItem>
        ))}
      </Select>
      <p className="text-xs text-gray-500">
        {t('settings.companySwitcherHint')}
      </p>
    </div>
  );
};
```

### Phase 3: إضافة Translations 🌐

**الملفات:** `src/i18n/locales/*.json`

```json
// ar.json
{
  "auth": {
    "businessType": "نوع العمل",
    "businessTypes": {
      "general": "عام",
      "fabric": "أقمشة",
      "exchange": "صرافة",
      "healthcare": "صحة",
      "ecommerce": "تجارة إلكترونية"
    },
    "fabricNote": "📌 سيتم إنشاء شركتين: حقيقية للعمل الفعلي، وتجريبية للاختبارات"
  },
  "settings": {
    "activeCompany": "الشركة النشطة",
    "companySwitched": "تم تبديل الشركة بنجاح",
    "companySwitcherHint": "يمكنك التبديل بين الشركة الحقيقية والتجريبية"
  }
}

// en.json
{
  "auth": {
    "businessType": "Business Type",
    "businessTypes": {
      "general": "General",
      "fabric": "Fabric",
      "exchange": "Exchange",
      "healthcare": "Healthcare",
      "ecommerce": "E-commerce"
    },
    "fabricNote": "📌 Two companies will be created: Production for real work, and Testing for experiments"
  },
  "settings": {
    "activeCompany": "Active Company",
    "companySwitched": "Company switched successfully",
    "companySwitcherHint": "You can switch between production and testing companies"
  }
}
```

### Phase 4: إضافة في Settings Page 📄

**الملف:** `src/features/accounting/AccountingSettings.tsx` (أو Settings عامة)

```tsx
import { CompanySwitcher } from '@/components/settings/CompanySwitcher';

// داخل component
<Card>
  <CardHeader>
    <CardTitle>{t('settings.companyManagement')}</CardTitle>
  </CardHeader>
  <CardContent>
    <CompanySwitcher />
  </CardContent>
</Card>
```

---

## ✅ Checklist

### Backend ✅
- [x] إضافة `business_type` و `company_type` لجدول companies
- [x] تحديث `register_new_subscriber()` لدعم business_type
- [x] إنشاء `get_user_companies()` function
- [x] إنشاء `switch_user_company()` function
- [x] إضافة indexes للأداء
- [x] اختبار SQL للتحقق

### Frontend ⏳
- [ ] تحديث `Register.tsx` (إضافة Business Type selector)
- [ ] إنشاء `CompanySwitcher.tsx` component
- [ ] إضافة translations لـ 9 لغات
- [ ] إضافة CompanySwitcher في Settings
- [ ] اختبار التسجيل بـ business_type='fabric'
- [ ] اختبار تبديل الشركات

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من تنفيذ `STEP_41_business_type_and_company_switcher.sql`
2. شغّل `test_step_41.sql` للتحقق
3. راجع هذا الملف للأمثلة

---

**تم إنشاؤه:** 2026-01-24
**الإصدار:** 1.0
**الحالة:** Backend ✅ | Frontend ⏳
