# 🎨 Sheets Preview Guide - دليل استعراض الشيتات

## 🚀 كيفية الاستخدام

### الطريقة 1: عبر المتصفح (الأسهل) ⭐

افتح الرابط التالي في المتصفح:

```
http://localhost:5174/sheets-preview
```

**أو أثناء تشغيل المشروع:**

```bash
npm run dev
```

ثم افتح: `http://localhost:5174/sheets-preview`

---

## 📋 الـ 3 Variants المتاحة

### 1️⃣ **UniversalDetailSheet** (الافتراضي - موصى به)
- ✅ Tabs عادية (pills style)
- ✅ يدعم nested sheets
- ✅ Stats cards في الأعلى
- ✅ نظام Config متطور
- ✅ 7+ tabs
- 📍 **الموصى به للاستخدام في صفحات SaaS**

**مثال الاستخدام:**
```typescript
<UniversalDetailSheet
  isOpen={isOpen}
  onClose={onClose}
  docType="tenant"
  data={selectedTenant}
  onRefresh={loadData}
/>
```

---

### 2️⃣ **UniversalDetailSheetWithUnderlineTabs** (تصميم أنيق)
- ✅ Tabs بخط تحتي (underline style)
- ✅ نفس الميزات + تصميم مختلف
- ✅ أكثر أناقة وحداثة
- 🎨 **مثالي للصفحات الحديثة**

**مثال الاستخدام:**
```typescript
<UniversalDetailSheetWithUnderlineTabs
  isOpen={isOpen}
  onClose={onClose}
  docType="agent"
  data={selectedAgent}
/>
```

---

### 3️⃣ **UniversalDetailSheetPreview** (معاينة سريعة)
- ✅ وضع معاينة سريع
- ❌ بدون tabs (معلومات أساسية فقط)
- ⚡ **مثالي للمعاينة السريعة**

**مثال الاستخدام:**
```typescript
<UniversalDetailSheetPreview
  isOpen={isOpen}
  onClose={onClose}
  docType="payment"
  data={selectedPayment}
/>
```

---

## 🎯 أيهما تستخدم؟

| الموقف | Variant الموصى به | السبب |
|--------|-------------------|-------|
| صفحات SaaS (Subscribers, Agents, etc.) | `UniversalDetailSheet` | كامل الميزات + Nested |
| صفحات عرض بيانات معقدة | `UniversalDetailSheet` | 7+ tabs متاحة |
| صفحات حديثة ببساطة أنيقة | `WithUnderlineTabs` | تصميم Underline أنيق |
| معاينة سريعة بدون tabs | `Preview` | خفيف وسريع |

---

## 📊 المقارنة

| الميزة | Default | WithUnderlineTabs | Preview |
|--------|---------|-------------------|---------|
| **Tabs Style** | Pills | Underline | ❌ No tabs |
| **Stats Cards** | ✅ | ✅ | ✅ |
| **Info Fields** | ✅ 10 types | ✅ 10 types | ✅ Basic |
| **Nested Sheets** | ✅ | ✅ | ❌ |
| **Actions** | ✅ | ✅ | ✅ Limited |
| **RTL** | ✅ | ✅ | ✅ |
| **Animation** | ✅ Spring | ✅ Spring | ✅ Spring |
| **Config System** | ✅ | ✅ | ✅ |

---

## 🔍 كيفية الاستعراض في الصفحة

عند فتح `/sheets-preview`:

1. **اضغط على أي زر "استعراض"** في البطاقات الثلاث
2. **انتظر فتح الشيت**
3. **جرّب:**
   - التنقل بين الـ tabs
   - قراءة المعلومات
   - Stats cards في الأعلى
   - الإغلاق والفتح
4. **قارن بين الثلاثة**

---

## 🎨 مكونات الـ Universal System

### الملفات في `src/components/sheets/universal/`:

```
1. UniversalDetailSheet.tsx       → المكون الرئيسي (3 variants)
2. UniversalDetailHeader.tsx      → الـ Header (عنوان، badge، stats)
3. UniversalDetailTabs.tsx        → نظام الـ Tabs (pills & underline)
4. UniversalDetailContent.tsx     → المحتوى (info fields & custom)
5. NestedSheetManager.tsx         → إدارة الشيتات المتداخلة
```

---

## ⚙️ Configs المتاحة

```typescript
✅ tenant.config.ts      → للمشتركين
✅ agent.config.ts       → للوكلاء
✅ payment.config.ts     → للمدفوعات
✅ invoice.config.ts     → للفواتير
✅ plan.config.ts        → للباقات
✅ subscription.config.ts → للاشتراكات
✅ module.config.ts      → للوحدات
✅ account.config.ts     → للحسابات
```

---

## 🚀 استخدام في صفحاتك

### مثال كامل:

```typescript
import { UniversalDetailSheet } from '@/components/sheets';
import { LedgerTable } from '@/components/shared/tables/LedgerTable';

export default function MyPage() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      {/* Table */}
      <LedgerTable
        data={data}
        columns={columns}
        onRowClick={(row) => {
          setSelected(row);
          setIsOpen(true);
        }}
      />

      {/* Sheet */}
      <UniversalDetailSheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSelected(null);
        }}
        docType="tenant"  // أو agent, payment, etc.
        data={selected}
        onRefresh={loadData}
      />
    </div>
  );
}
```

---

## 🎯 الفرق الرئيسي

### ❌ **القديم (UnifiedSheet - محذوف):**
```typescript
<UnifiedSheet
  isOpen={true}
  size="lg"
  icon={Building}
  title="مودا تكس"
  subtitle="T-CE6CA1948F"
  badge={{ text: 'نشط', colorClass: '...' }}
>
  <div>محتوى يدوي كامل</div>
</UnifiedSheet>
```
- 🟢 لون فستقي
- ❌ لا nested sheets
- ❌ محتوى يدوي
- ❌ لا config system

### ✅ **الجديد (UniversalDetailSheet):**
```typescript
<UniversalDetailSheet
  docType="tenant"
  data={tenant}
/>
```
- ✅ رمادي/أبيض عصري
- ✅ Nested sheets
- ✅ محتوى تلقائي من config
- ✅ Config system متطور
- ✅ 7+ tabs جاهزة

---

## 🛠️ إنشاء Config جديد

إذا أردت استخدام الشيت لنوع بيانات جديد:

```typescript
// src/components/sheets/configs/my-type.config.ts

import type { SheetConfig } from './sheet.types';
import { Building2 } from 'lucide-react';

export const myTypeConfig: SheetConfig = {
  docType: 'my-type',
  
  // Header
  title: (data) => data.name,
  subtitle: (data) => data.code,
  icon: Building2,
  
  // Status Badge
  statusBadge: (data) => ({
    text: data.status === 'active' ? 'نشط' : 'غير نشط',
    variant: data.status === 'active' ? 'success' : 'default',
  }),
  
  // Stats Cards
  stats: (data) => [
    {
      label: 'total',
      value: data.total,
      icon: 'dollar',
      variant: 'default',
    },
  ],
  
  // Info Fields
  infoFields: (data) => [
    { label: 'email', value: data.email, type: 'email' },
    { label: 'phone', value: data.phone, type: 'phone' },
  ],
  
  // Tabs
  tabs: [
    { id: 'overview', label: 'نظرة عامة', content: 'MyOverviewTab' },
  ],
  
  // Actions
  actions: (data) => [
    { id: 'edit', label: 'تعديل', variant: 'default' },
  ],
};

// تسجيل في configRegistry
export default myTypeConfig;
```

ثم في `configs/index.ts`:
```typescript
import myTypeConfig from './my-type.config';

export const configRegistry: Record<DocType, SheetConfig> = {
  // ...
  'my-type': myTypeConfig,
};
```

---

## 📝 الملاحظات

### ✅ **الآن تستخدم UniversalDetailSheet:**
- ✅ Subscribers
- ✅ Agents
- ✅ Payments
- ✅ Invoices
- ✅ Packages
- ✅ ModuleManagement

### 🟡 **معلّقة (يمكن إكمالها لاحقاً):**
- 🟡 WhiteLabel
- 🟡 Support

---

## 🎉 الخلاصة

### الطريقة الأسهل للاستعراض:
```
http://localhost:5174/sheets-preview
```

### الـ Variant الموصى به:
```typescript
<UniversalDetailSheet
  docType="tenant"
  data={data}
/>
```

### لإنشاء نوع جديد:
1. أنشئ `my-type.config.ts`
2. سجّله في `configRegistry`
3. استخدم `docType="my-type"`

---

**جرّب الآن:** افتح `/sheets-preview` في المتصفح! 🚀
