# 📚 توثيق API لنظام TexaCore ERP
# TexaCore ERP API Documentation

**الإصدار:** 2.0  
**تاريخ التحديث:** 5 فبراير 2026  
**Base URL:** `https://wzkklenfsaepegymfxfz.supabase.co`

---

## 🎯 نظرة عامة

TexaCore ERP هو نظام إدارة موارد المؤسسات متعدد المستأجرين (Multi-Tenant) مبني على:
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Security:** Row Level Security (RLS) - 740 سياسة أمان
- **Database:** 196 جدول مع عزل كامل

### 🏗️ هيكل العزل (5 مستويات)

```
Platform Owner (مالك المنصة)
    └── Partner/Brand (الوكيل/البراند)
        └── Tenant (المستأجر)
            └── Company (الشركة)
                └── User (المستخدم)
```

### 🏷️ البراندات المتاحة

| البراند | الوصف | التخصص |
|---------|-------|--------|
| **TexaCore** | تجارة الأقمشة | Fabric Trading |
| **FinCore** | المحاسبة والمالية | Finance & Accounting |
| **MedCore** | القطاع الطبي | Healthcare |
| **FleetCore** | إدارة الأساطيل | Fleet Management |
| **ERPCore** | ERP عام | General ERP |
| **NexaCore** | التقنية والبرمجيات | Tech & Software |

---

## 📁 هيكل التوثيق

| الملف | المحتوى |
|-------|---------|
| [01-introduction.md](./01-introduction.md) | المقدمة والإعداد الأساسي |
| [02-authentication.md](./02-authentication.md) | المصادقة وإدارة الجلسات |
| [03-user-context.md](./03-user-context.md) | سياق المستخدم والصلاحيات |
| [04-modules/](./04-modules/) | APIs حسب الوحدات |
| [05-rpc-functions.md](./05-rpc-functions.md) | الدوال المساعدة (RPC) |
| [06-query-patterns.md](./06-query-patterns.md) | أنماط الاستعلام الشائعة |
| [07-examples.md](./07-examples.md) | أمثلة عملية كاملة |
| [08-error-handling.md](./08-error-handling.md) | معالجة الأخطاء |
| [types/](./types/) | TypeScript Types |

---

## 🚀 البدء السريع

### 1. تثبيت Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. إعداد الاتصال

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wzkklenfsaepegymfxfz.supabase.co',
  'YOUR_ANON_KEY'
);
```

### 3. تسجيل الدخول

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

### 4. استعلام البيانات

```typescript
// RLS يفلتر تلقائياً حسب tenant_id و company_id
const { data, error } = await supabase
  .from('customers')
  .select('*');
```

---

## 🔐 الأمان

### Row Level Security (RLS)

كل استعلام يمر عبر سياسات RLS التي تضمن:
- ✅ المستخدم يرى فقط بيانات شركته
- ✅ لا يمكن الوصول لبيانات مستأجر آخر
- ✅ الحماية على مستوى قاعدة البيانات

### Headers المطلوبة

```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

---

## 📊 الوحدات الرئيسية

| الوحدة | الجداول الرئيسية | الحالة |
|--------|------------------|--------|
| **المحاسبة** | chart_of_accounts, journal_entries | ✅ |
| **المبيعات** | sales_invoices, customers | ✅ |
| **المشتريات** | purchase_invoices, suppliers | ✅ |
| **المخزون** | products, warehouses, inventory_movements | ✅ |
| **الخزينة** | funds, fund_transactions | ✅ |
| **الشحنات** | containers, container_items | ✅ |
| **RBAC** | roles, user_roles, permissions | ✅ |
| **SaaS** | tenants, subscriptions, partners | ✅ |

---

## 🔗 روابط مفيدة

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [TypeScript Supabase](https://supabase.com/docs/reference/javascript/typescript-support)

---

**© 2026 TexaCore ERP**
