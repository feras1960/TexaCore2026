# 📖 المقدمة والإعداد
# Introduction & Setup

---

## 🌐 معلومات API الأساسية

### Base URL
```
https://wzkklenfsaepegymfxfz.supabase.co
```

### REST API Endpoint
```
https://wzkklenfsaepegymfxfz.supabase.co/rest/v1/
```

### Realtime Endpoint
```
wss://wzkklenfsaepegymfxfz.supabase.co/realtime/v1/websocket
```

### Auth Endpoint
```
https://wzkklenfsaepegymfxfz.supabase.co/auth/v1/
```

---

## 🔑 المفاتيح والتوثيق

### Anon Key (العام)
```
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```
> يُستخدم للوصول العام مع تطبيق سياسات RLS

### Service Role Key (الخادم فقط)
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
> ⚠️ **تحذير:** يتجاوز RLS - استخدمه فقط في الخادم

---

## 📋 Headers المطلوبة

### لكل طلب API:

```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
Prefer: return=representation
```

### شرح Headers:

| Header | الوصف | مطلوب |
|--------|-------|-------|
| `Authorization` | JWT Token من عملية تسجيل الدخول | ✅ نعم |
| `apikey` | Supabase Anon Key | ✅ نعم |
| `Content-Type` | نوع المحتوى (JSON) | ✅ للـ POST/PUT |
| `Prefer` | تحديد شكل الاستجابة | اختياري |

### قيم Prefer المتاحة:

```http
Prefer: return=minimal          # لا تُرجع البيانات
Prefer: return=representation   # أرجع البيانات المُنشأة/المُحدثة
Prefer: count=exact            # أرجع العدد الدقيق
Prefer: count=estimated        # أرجع تقدير العدد
```

---

## ⚡ Rate Limiting

### الحدود الافتراضية:

| النوع | الحد | الفترة |
|-------|------|--------|
| **API Requests** | 1000 | لكل دقيقة |
| **Auth Requests** | 30 | لكل ساعة |
| **Database Size** | 500MB | Free Tier |
| **File Storage** | 1GB | Free Tier |
| **Realtime Connections** | 200 | متزامن |

### معالجة تجاوز الحد:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

```typescript
// التعامل مع Rate Limiting
const response = await fetch(url, options);
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  await sleep(parseInt(retryAfter) * 1000);
  // أعد المحاولة
}
```

---

## 🛠️ إعداد Supabase Client

### التثبيت

```bash
# npm
npm install @supabase/supabase-js

# yarn
yarn add @supabase/supabase-js

# pnpm
pnpm add @supabase/supabase-js
```

### الإعداد الأساسي

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'texacore-web'
    }
  }
});
```

### إعداد مع TypeScript Types

```typescript
// استيراد الأنواع المُولدة تلقائياً
import type { Database } from './database.types';

// إنشاء client مع الأنواع
const supabase = createClient<Database>(url, key);

// الآن لديك autocomplete كامل
const { data } = await supabase
  .from('customers')  // ✅ autocomplete
  .select('id, name_ar, phone');  // ✅ type-safe
```

---

## 📊 شكل الاستجابة (Response Format)

### نجاح (Success)

```json
{
  "data": [...],
  "error": null,
  "count": 100,
  "status": 200,
  "statusText": "OK"
}
```

### خطأ (Error)

```json
{
  "data": null,
  "error": {
    "message": "Row level security violation",
    "code": "42501",
    "details": "new row violates row-level security policy",
    "hint": "Check your RLS policies"
  },
  "status": 403,
  "statusText": "Forbidden"
}
```

---

## 🔄 أنواع العمليات

### 1. SELECT (قراءة)

```typescript
// قراءة كل السجلات
const { data, error } = await supabase
  .from('customers')
  .select('*');

// قراءة مع فلترة
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('is_active', true);

// قراءة مع علاقات
const { data, error } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customer:customers(id, name_ar),
    items:sales_invoice_items(*)
  `);
```

### 2. INSERT (إنشاء)

```typescript
// إنشاء سجل واحد
const { data, error } = await supabase
  .from('customers')
  .insert({
    name_ar: 'شركة الأمل',
    name_en: 'Al-Amal Company',
    phone: '+966501234567'
  })
  .select()
  .single();

// إنشاء سجلات متعددة
const { data, error } = await supabase
  .from('customers')
  .insert([
    { name_ar: 'عميل 1' },
    { name_ar: 'عميل 2' }
  ])
  .select();
```

### 3. UPDATE (تحديث)

```typescript
// تحديث سجل
const { data, error } = await supabase
  .from('customers')
  .update({ phone: '+966509876543' })
  .eq('id', 'uuid-here')
  .select()
  .single();

// تحديث متعدد
const { data, error } = await supabase
  .from('customers')
  .update({ is_active: false })
  .eq('customer_group_id', 'group-uuid');
```

### 4. DELETE (حذف)

```typescript
// حذف سجل
const { error } = await supabase
  .from('customers')
  .delete()
  .eq('id', 'uuid-here');

// ⚠️ لا يمكن حذف إذا كان هناك بيانات مرتبطة
```

### 5. UPSERT (إنشاء أو تحديث)

```typescript
const { data, error } = await supabase
  .from('customers')
  .upsert({
    id: 'uuid-here',  // إذا موجود = update، إذا لا = insert
    name_ar: 'اسم محدث',
    phone: '+966501234567'
  })
  .select()
  .single();
```

---

## 🔍 الفلترة والبحث

### عمليات المقارنة

```typescript
.eq('column', 'value')      // يساوي
.neq('column', 'value')     // لا يساوي
.gt('column', 100)          // أكبر من
.gte('column', 100)         // أكبر من أو يساوي
.lt('column', 100)          // أصغر من
.lte('column', 100)         // أصغر من أو يساوي
.like('column', '%pattern%')   // يحتوي على
.ilike('column', '%pattern%')  // يحتوي على (case insensitive)
.is('column', null)         // هو null
.in('column', [1, 2, 3])    // ضمن القائمة
.contains('column', ['a'])  // array يحتوي
.containedBy('column', ['a', 'b'])  // ضمن array
```

### أمثلة

```typescript
// بحث في الاسم
const { data } = await supabase
  .from('customers')
  .select('*')
  .ilike('name_ar', '%أحمد%');

// فلترة بالتاريخ
const { data } = await supabase
  .from('journal_entries')
  .select('*')
  .gte('entry_date', '2026-01-01')
  .lte('entry_date', '2026-12-31');

// فلترة بالحالة
const { data } = await supabase
  .from('sales_invoices')
  .select('*')
  .in('status', ['posted', 'paid']);
```

---

## 📄 الترتيب والتصفح

### الترتيب

```typescript
// ترتيب تصاعدي
.order('created_at', { ascending: true })

// ترتيب تنازلي
.order('amount', { ascending: false })

// ترتيب متعدد
.order('status', { ascending: true })
.order('created_at', { ascending: false })
```

### التصفح (Pagination)

```typescript
// Offset-based
const page = 1;
const pageSize = 20;
const { data } = await supabase
  .from('customers')
  .select('*', { count: 'exact' })
  .range((page - 1) * pageSize, page * pageSize - 1);

// Limit فقط
const { data } = await supabase
  .from('customers')
  .select('*')
  .limit(10);
```

---

## 🔗 العلاقات (Relations)

### One-to-Many

```typescript
// فاتورة مع بنودها
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    items:sales_invoice_items(
      id,
      product_id,
      quantity,
      unit_price,
      product:products(name_ar, sku)
    )
  `)
  .eq('id', 'invoice-uuid');
```

### Many-to-One

```typescript
// بنود مع الفاتورة والمنتج
const { data } = await supabase
  .from('sales_invoice_items')
  .select(`
    *,
    invoice:sales_invoices(invoice_number, invoice_date),
    product:products(name_ar, sku)
  `);
```

---

## ⚠️ ملاحظات مهمة

### 1. RLS يعمل تلقائياً
```typescript
// لا حاجة لإضافة tenant_id أو company_id في الاستعلام
// Supabase يفلتر تلقائياً بناءً على JWT token
const { data } = await supabase
  .from('customers')
  .select('*');
// ✅ يُرجع فقط عملاء شركة المستخدم الحالي
```

### 2. tenant_id و company_id يُضافان تلقائياً
```typescript
// لا حاجة لتحديدهم عند الإنشاء
const { data } = await supabase
  .from('customers')
  .insert({ name_ar: 'عميل جديد' });
// ✅ tenant_id و company_id يُضافان من JWT
```

### 3. لا يمكن تعديل tenant_id أو company_id
```typescript
// ❌ هذا سيفشل
const { error } = await supabase
  .from('customers')
  .update({ tenant_id: 'other-tenant' });
// Error: cannot change tenant_id
```

---

**التالي:** [02-authentication.md](./02-authentication.md) - المصادقة وإدارة الجلسات
