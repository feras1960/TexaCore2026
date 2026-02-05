# 🚀 وحدة SaaS API
# SaaS Platform Module API

---

## 📋 نظرة عامة

وحدة SaaS مخصصة لإدارة المنصة وتشمل:
- المستأجرين (Tenants)
- خطط الاشتراك (Subscription Plans)
- الاشتراكات (Subscriptions)
- الشركاء/الوكلاء (Partners/Agents)
- العمولات (Commissions)
- منتجات SaaS (SaaS Products)

> ⚠️ **ملاحظة:** هذه الـ APIs متاحة فقط لـ Platform Owner و Platform Admin

---

## 🔒 صلاحيات الوصول

| الدور | الوصول |
|-------|--------|
| Platform Owner | 🔓 كامل |
| Platform Admin | 🔓 محدود (قراءة + تعديل) |
| Partner/Agent | 🔐 تينانتاته فقط |
| Tenant Owner | ⛔ غير متاح |

---

## 1️⃣ المستأجرين (Tenants)

### الجدول: `tenants`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| brand_id | uuid | معرف البراند |
| partner_id | uuid | معرف الشريك |
| code | varchar | رمز المستأجر |
| name | varchar | الاسم |
| email | varchar | البريد الإلكتروني |
| phone | varchar | الهاتف |
| country | varchar | الدولة |
| industry | varchar | القطاع |
| subscription_plan_id | uuid | خطة الاشتراك |
| subscription_status | varchar | حالة الاشتراك |
| trial_ends_at | timestamp | انتهاء الفترة التجريبية |
| is_active | boolean | نشط |
| created_at | timestamp | تاريخ الإنشاء |

### حالات الاشتراك

| الحالة | الوصف |
|--------|-------|
| `trial` | فترة تجريبية |
| `active` | نشط |
| `suspended` | معلق |
| `cancelled` | ملغي |
| `expired` | منتهي |

### 📖 GET - جلب المستأجرين (Platform Admin)

```typescript
// التحقق من الصلاحية أولاً
const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');

if (!isPlatformAdmin) {
  throw new Error('غير مصرح');
}

const { data, error } = await supabase
  .from('tenants')
  .select(`
    *,
    brand:brands(id, name, code),
    partner:partners(id, name),
    plan:subscription_plans(id, name_ar, name_en),
    companies:companies(count),
    users:user_profiles(count)
  `)
  .order('created_at', { ascending: false });
```

### فلترة المستأجرين

```typescript
// بالبراند
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('brand_id', brandId);

// بالشريك
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('partner_id', partnerId);

// بحالة الاشتراك
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('subscription_status', 'active');

// انتهت فترتهم التجريبية
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('subscription_status', 'trial')
  .lt('trial_ends_at', new Date().toISOString());
```

### 📖 GET - مستأجر واحد بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('tenants')
  .select(`
    *,
    brand:brands(*),
    partner:partners(*),
    plan:subscription_plans(*),
    companies:companies(
      id, name_ar, code, is_active
    ),
    subscriptions:tenant_subscriptions(
      id, start_date, end_date, status
    ),
    users:user_profiles(
      id, full_name, email, is_active
    )
  `)
  .eq('id', tenantId)
  .single();
```

### 📝 POST - إنشاء مستأجر جديد

```typescript
const createTenant = async (tenantData: CreateTenantInput) => {
  // 1. إنشاء المستأجر
  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      brand_id: tenantData.brand_id,
      partner_id: tenantData.partner_id,
      code: tenantData.code,
      name: tenantData.name,
      email: tenantData.email,
      phone: tenantData.phone,
      country: tenantData.country,
      industry: tenantData.industry,
      subscription_plan_id: tenantData.plan_id,
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 2. إنشاء الشركة الافتراضية
  const { data: company } = await supabase
    .from('companies')
    .insert({
      tenant_id: tenant.id,
      name_ar: tenantData.name,
      code: 'HQ',
      is_active: true
    })
    .select()
    .single();

  // 3. إنشاء اشتراك
  await supabase.from('tenant_subscriptions').insert({
    tenant_id: tenant.id,
    plan_id: tenantData.plan_id,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'trial'
  });

  // 4. تعيين الموديولات حسب الخطة
  await assignPlanModules(tenant.id, tenantData.plan_id);

  return { tenant, company };
};
```

### ✏️ PUT - تحديث مستأجر

```typescript
const { data, error } = await supabase
  .from('tenants')
  .update({
    subscription_status: 'active',
    subscription_plan_id: newPlanId
  })
  .eq('id', tenantId)
  .select()
  .single();
```

### ✏️ PUT - تعليق/تفعيل مستأجر

```typescript
// تعليق
const suspendTenant = async (tenantId: string, reason: string) => {
  await supabase
    .from('tenants')
    .update({
      subscription_status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason
    })
    .eq('id', tenantId);

  // تعطيل كل المستخدمين
  await supabase
    .from('user_profiles')
    .update({ is_active: false })
    .eq('tenant_id', tenantId);
};

// تفعيل
const activateTenant = async (tenantId: string) => {
  await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      suspended_at: null,
      suspension_reason: null
    })
    .eq('id', tenantId);

  // إعادة تفعيل المستخدمين
  await supabase
    .from('user_profiles')
    .update({ is_active: true })
    .eq('tenant_id', tenantId);
};
```

---

## 2️⃣ خطط الاشتراك (Subscription Plans)

### الجدول: `subscription_plans`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| code | varchar | رمز الخطة |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| description | text | الوصف |
| price_monthly | decimal | السعر الشهري |
| price_yearly | decimal | السعر السنوي |
| currency | varchar | العملة |
| max_users | integer | الحد الأقصى للمستخدمين |
| max_companies | integer | الحد الأقصى للشركات |
| max_storage_gb | integer | الحد الأقصى للتخزين |
| features | jsonb | الميزات |
| is_active | boolean | نشط |

### 📖 GET - جلب الخطط

```typescript
const { data, error } = await supabase
  .from('subscription_plans')
  .select(`
    *,
    modules:plan_modules(
      module:modules(id, code, name_ar)
    ),
    tenants_count:tenants(count)
  `)
  .eq('is_active', true)
  .order('price_monthly');
```

### 📝 POST - إنشاء خطة

```typescript
const { data, error } = await supabase
  .from('subscription_plans')
  .insert({
    code: 'PRO',
    name_ar: 'الخطة الاحترافية',
    name_en: 'Pro Plan',
    price_monthly: 299,
    price_yearly: 2999,
    currency: 'SAR',
    max_users: 25,
    max_companies: 5,
    max_storage_gb: 50,
    features: {
      accounting: true,
      inventory: true,
      sales: true,
      purchases: true,
      reports: true,
      api_access: true
    }
  })
  .select()
  .single();
```

---

## 3️⃣ الشركاء/الوكلاء (Partners/Agents)

### الجدول: `partners`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| brand_id | uuid | معرف البراند |
| code | varchar | رمز الشريك |
| name | varchar | الاسم |
| email | varchar | البريد الإلكتروني |
| phone | varchar | الهاتف |
| country | varchar | الدولة |
| commission_rate | decimal | نسبة العمولة |
| is_active | boolean | نشط |

### الجدول: `agents`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| user_id | uuid | معرف المستخدم |
| code | varchar | رمز الوكيل |
| name | varchar | الاسم |
| tier_id | uuid | المستوى |
| commission_rate | decimal | نسبة العمولة |
| target_amount | decimal | الهدف |
| is_active | boolean | نشط |

### 📖 GET - جلب الشركاء

```typescript
const { data, error } = await supabase
  .from('partners')
  .select(`
    *,
    brand:brands(id, name, code),
    tenants:tenants(count),
    total_commissions:agent_commissions(amount.sum())
  `)
  .order('name');
```

### 📖 GET - جلب الوكلاء

```typescript
const { data, error } = await supabase
  .from('agents')
  .select(`
    *,
    user:user_profiles(id, full_name, email),
    tier:agent_tiers(id, name_ar, bonus_rate),
    commissions:agent_commissions(
      id, amount, status, created_at
    )
  `)
  .eq('company_id', companyId)
  .eq('is_active', true);
```

### 📝 POST - إنشاء وكيل

```typescript
const { data, error } = await supabase
  .from('agents')
  .insert({
    company_id: companyId,
    user_id: userId,
    code: 'AG001',
    name: 'أحمد الوكيل',
    tier_id: basicTierId,
    commission_rate: 5,
    target_amount: 100000
  })
  .select()
  .single();
```

---

## 4️⃣ العمولات (Commissions)

### الجدول: `agent_commissions`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| agent_id | uuid | معرف الوكيل |
| reference_type | varchar | نوع المرجع |
| reference_id | uuid | معرف المرجع |
| amount | decimal | المبلغ |
| commission_rate | decimal | النسبة |
| commission_amount | decimal | مبلغ العمولة |
| status | varchar | الحالة |
| paid_at | timestamp | تاريخ الصرف |

### 📖 GET - عمولات وكيل

```typescript
const { data, error } = await supabase
  .from('agent_commissions')
  .select(`
    *,
    agent:agents(id, name)
  `)
  .eq('agent_id', agentId)
  .order('created_at', { ascending: false });
```

### حساب العمولة

```typescript
const calculateCommission = async (
  agentId: string,
  saleAmount: number,
  referenceType: string,
  referenceId: string
) => {
  // 1. جلب بيانات الوكيل
  const { data: agent } = await supabase
    .from('agents')
    .select(`
      commission_rate,
      tier:agent_tiers(bonus_rate)
    `)
    .eq('id', agentId)
    .single();

  // 2. حساب العمولة
  const baseRate = agent.commission_rate;
  const bonusRate = agent.tier?.bonus_rate || 0;
  const totalRate = baseRate + bonusRate;
  const commissionAmount = saleAmount * (totalRate / 100);

  // 3. تسجيل العمولة
  const { data } = await supabase
    .from('agent_commissions')
    .insert({
      agent_id: agentId,
      reference_type: referenceType,
      reference_id: referenceId,
      amount: saleAmount,
      commission_rate: totalRate,
      commission_amount: commissionAmount,
      status: 'pending'
    })
    .select()
    .single();

  return data;
};
```

---

## 5️⃣ إحصائيات المنصة

### ملخص المنصة

```typescript
const getPlatformStats = async () => {
  // المستأجرين
  const { data: tenants } = await supabase
    .from('tenants')
    .select('subscription_status');

  // الاشتراكات والإيرادات
  const { data: subscriptions } = await supabase
    .from('tenant_subscriptions')
    .select(`
      status,
      plan:subscription_plans(price_monthly)
    `)
    .eq('status', 'active');

  const mrr = subscriptions.reduce((sum, s) => 
    sum + (s.plan?.price_monthly || 0), 0
  );

  return {
    total_tenants: tenants.length,
    active_tenants: tenants.filter(t => t.subscription_status === 'active').length,
    trial_tenants: tenants.filter(t => t.subscription_status === 'trial').length,
    suspended_tenants: tenants.filter(t => t.subscription_status === 'suspended').length,
    mrr,  // Monthly Recurring Revenue
    arr: mrr * 12  // Annual Recurring Revenue
  };
};
```

### مستأجرين قاربت فترتهم التجريبية

```typescript
const getExpiringTrials = async (days: number = 3) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('subscription_status', 'trial')
    .lte('trial_ends_at', expiryDate.toISOString())
    .gte('trial_ends_at', new Date().toISOString());

  return data;
};
```

---

## 6️⃣ Webhooks والإشعارات

### إرسال إشعار انتهاء الفترة التجريبية

```typescript
const sendTrialExpiryNotification = async (tenantId: string) => {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, email, trial_ends_at')
    .eq('id', tenantId)
    .single();

  // إرسال بريد إلكتروني
  await supabase.functions.invoke('send-email', {
    body: {
      to: tenant.email,
      template: 'trial_expiry',
      data: {
        tenant_name: tenant.name,
        expiry_date: tenant.trial_ends_at
      }
    }
  });

  // تسجيل الحدث
  await supabase.from('saas_events').insert({
    tenant_id: tenantId,
    event_type: 'trial_expiry_notification',
    event_data: { sent_at: new Date().toISOString() }
  });
};
```

---

## ⚠️ قواعد الأمان

### 1. التحقق من صلاحيات المنصة

```typescript
const requirePlatformAdmin = async () => {
  const { data } = await supabase.rpc('is_platform_admin');
  if (!data) {
    throw new Error('هذه العملية متاحة فقط لمدراء المنصة');
  }
};
```

### 2. الشريك يرى فقط تينانتاته

```typescript
const getPartnerTenants = async () => {
  // RLS يفلتر تلقائياً
  const { data } = await supabase
    .from('tenants')
    .select('*');
  
  return data;  // فقط تينانتات الشريك الحالي
};
```

---

**التالي:** [../05-rpc-functions.md](../05-rpc-functions.md) - الدوال المساعدة
