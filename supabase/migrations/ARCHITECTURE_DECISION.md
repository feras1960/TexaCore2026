# قرار معماري: Multi-Tenant Strategy
# Architectural Decision: Multi-Tenant Strategy

## 🎯 القرار

**نستخدم Multi-Tenant Architecture مع tenant_id في كل جدول.**

---

## 📐 المعمارية المختارة

### المستوى 1: الأساس (موجود الآن)
```
┌─────────────────────────────────┐
│  tenants (جدول)                 │
│  - id                           │
│  - code                         │
│  - name                         │
└─────────────────────────────────┘
         │
         │ (tenant_id)
         ↓
┌─────────────────────────────────┐
│  companies                      │
│  customers                      │
│  products                       │
│  ... (كل الجداول)               │
│  → tenant_id UUID               │
└─────────────────────────────────┘
```

**الوظيفة:**
- عزل البيانات بين العملاء
- تطبيق RLS
- أساس لـ SaaS لاحقاً

---

### المستوى 2: SaaS Management (اختياري - لاحقاً)
```
┌─────────────────────────────────┐
│  tenants                        │
└─────────────────────────────────┘
         │
         ├──→ subscriptions
         │      ├── plan_id
         │      └── status
         │
         ├──→ subscription_plans
         │      ├── max_users
         │      ├── included_modules
         │      └── price
         │
         └──→ tenant_modules
                └── module_code
```

**الوظيفة:**
- إدارة الاشتراكات
- باقات مختلفة
- تفعيل/تعطيل موديولات

---

## 🔄 كيف يعمل النظام

### بدون SaaS (المرحلة الحالية):
```
1. User يسجل دخول
2. System يحدد tenant_id من company
3. جميع الاستعلامات تتضمن tenant_id
4. RLS يضمن عزل البيانات
```

### مع SaaS (لاحقاً):
```
1. User يسجل دخول
2. System يحدد tenant_id من company
3. System يتحقق من subscription
4. System يتحقق من plan و modules
5. System يطبق الحدود (max_users, etc.)
6. جميع الاستعلامات تتضمن tenant_id
7. RLS يضمن عزل البيانات
```

---

## 💡 الإجابة على سؤالك

### ❓ "هل نختار الطريقة لكل شركة؟"

**الجواب:** لا، **tenant_id موجود دائماً** لجميع الشركات.

**السبب:**
- tenant_id = أساسي للعزل والأمان
- لا يمكن اختيار عدم استخدامه
- كل شركة يجب أن تكون مرتبطة بـ tenant

---

### ❓ "هل الباقة تتحكم في الطريقة؟"

**الجواب:** لا، الباقة تتحكم في:
- ✅ الموديولات المفعلة
- ✅ الحدود (max_users, max_products)
- ✅ الميزات المتاحة
- ❌ **لا تتحكم في وجود tenant_id**

**tenant_id موجود دائماً بغض النظر عن الباقة.**

---

## 📊 مثال توضيحي

### شركة A - باقة Basic
```sql
tenant_id: tenant-a-uuid
subscription: Basic Plan
modules: [inventory] فقط
max_users: 5
```

**البيانات:**
```sql
companies WHERE tenant_id = 'tenant-a-uuid'
customers WHERE tenant_id = 'tenant-a-uuid'
products WHERE tenant_id = 'tenant-a-uuid'
```

---

### شركة B - باقة Pro
```sql
tenant_id: tenant-b-uuid
subscription: Pro Plan
modules: [inventory, sales, purchases]
max_users: 20
```

**البيانات:**
```sql
companies WHERE tenant_id = 'tenant-b-uuid'
customers WHERE tenant_id = 'tenant-b-uuid'
products WHERE tenant_id = 'tenant-b-uuid'
```

---

### شركة C - بدون SaaS (حالياً)
```sql
tenant_id: tenant-c-uuid
subscription: NULL (لا يوجد)
modules: جميع الموديولات (افتراضي)
max_users: لا يوجد حد
```

**البيانات:**
```sql
companies WHERE tenant_id = 'tenant-c-uuid'
customers WHERE tenant_id = 'tenant-c-uuid'
products WHERE tenant_id = 'tenant-c-uuid'
```

**ملاحظة:** حتى بدون SaaS، tenant_id موجود!

---

## 🎯 القرار النهائي

### ✅ ما نفعله الآن:
1. **tenant_id في كل جدول** ← أساسي دائماً
2. **جدول tenants** ← أساسي دائماً
3. **لا SaaS Management** ← يمكن إضافته لاحقاً

### ✅ ما يمكن إضافته لاحقاً:
1. **جداول SaaS** (subscriptions, plans, modules)
2. **إدارة الاشتراكات**
3. **الباقات والحدود**

### ❌ ما لا نفعله:
1. **اختيار tenant_id لكل شركة** ← موجود دائماً
2. **شركات بدون tenant_id** ← غير ممكن
3. **باقات بدون tenant_id** ← غير ممكن

---

## 📝 الخلاصة

| العنصر | الحالة | قابل للتغيير؟ |
|--------|--------|---------------|
| **tenant_id** | موجود دائماً | ❌ لا |
| **tenants table** | موجود دائماً | ❌ لا |
| **SaaS Management** | اختياري | ✅ نعم |
| **الباقات** | تتحكم في الموديولات | ✅ نعم |
| **الحدود** | تتحكم في max_users, etc. | ✅ نعم |

---

## ✅ التوصية النهائية

**استخدم tenant_id دائماً** - هذا أساسي للعزل والأمان.

**أضف SaaS Management لاحقاً** - فقط إذا احتجت إدارة اشتراكات وباقات.

**الباقات تتحكم في الميزات** - وليس في وجود tenant_id.

---

**tenant_id = أساسي دائماً ✅**
**SaaS = اختياري يمكن إضافته لاحقاً ✅**
