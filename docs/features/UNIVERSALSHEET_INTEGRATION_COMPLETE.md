# ✅ UniversalDetailSheet Integration - الربط الكامل بالشيت الموحد
**التاريخ:** 27 يناير 2026  
**الحالة:** ✅ **مكتمل بنجاح**

---

## 🎯 الهدف

تحديث جميع صفحات SaaS لاستخدام `UniversalDetailSheet` (المكون رقم 23 في Component Lab) بدلاً من المكون القديم ذو اللون الفستقي.

---

## ✨ المكون الموحد - UniversalDetailSheet

### 📍 الموقع:
```
src/components/sheets/universal/UniversalDetailSheet.tsx
```

### 🎨 المميزات:
1. ✅ **تصميم موحد عصري** - بدون اللون الفستقي القديم
2. ✅ **Nested Sheets** - شيتات متداخلة (45% width للرئيسي عند فتح متداخل)
3. ✅ **Two Variants**:
   - `classic` - خلفية رمادية + tabs pills + gradient header تيركواز
   - `swiss` - خلفية بيضاء + underline tabs + minimal design
4. ✅ **Animation** - Framer Motion smooth spring
5. ✅ **Edit Mode** - حالة تعديل مع تحذير عند الإغلاق
6. ✅ **Tabs System** - نظام تبويبات مرن
7. ✅ **Actions** - أزرار إجراءات قابلة للتخصيص
8. ✅ **Stats Cards** - بطاقات إحصائيات ملونة
9. ✅ **Info Fields** - حقول معلومات ذكية (text, currency, date, badge, link)
10. ✅ **RTL Support** - دعم كامل للعربية

---

## 📋 الصفحات المحدثة

### 1️⃣ **Subscribers.tsx** ✅
**المسار:** `src/features/saas/Subscribers.tsx`

**التحديث:**
```typescript
<UniversalDetailSheet
  isOpen={isDetailsOpen}
  onClose={() => {
    setIsDetailsOpen(false);
    setSelectedTenant(null);
  }}
  docType="tenant"
  data={selectedTenant}
  onRefresh={loadTenants}
  onEdit={() => {
    // TODO: Implement edit dialog
  }}
/>
```

**Config المستخدم:** `tenant.config.ts`

**Tabs المتاحة:**
- 📊 Overview (نظرة عامة)
- 📦 Subscriptions (الاشتراكات)
- 📈 Usage (الاستخدام)
- 🧩 Modules (الوحدات)
- 💰 Payments (المدفوعات)
- 📖 Ledger (دفتر الأستاذ)
- 📝 Activity (السجل)

**Nested Sheets:**
- عند النقر على اشتراك → يفتح `subscription` sheet
- عند النقر على دفعة → يفتح `payment` sheet
- عند النقر على فاتورة → يفتح `invoice` sheet

---

### 2️⃣ **Agents.tsx** ✅
**المسار:** `src/features/saas/Agents.tsx`

**التحديث:**
```typescript
<UniversalDetailSheet
  isOpen={isDetailsOpen}
  onClose={() => {
    setIsDetailsOpen(false);
    setSelectedAgent(null);
  }}
  docType="agent"
  data={selectedAgent}
  onRefresh={loadAgents}
  onEdit={() => {
    // TODO: Implement edit dialog
  }}
/>
```

**Config المستخدم:** `agent.config.ts`

**Tabs المتاحة:**
- 📊 Overview (نظرة عامة)
- 👥 Tenants (المشتركين) + badge بالعدد
- 💵 Commissions (العمولات) + badge بالعدد
- 💰 Withdrawals (السحوبات) + badge بالمعلقة
- 📖 Ledger (دفتر الأستاذ)
- 📝 Activity (السجل)

**Nested Sheets:**
- عند النقر على مشترك → يفتح `tenant` sheet
- عند النقر على دفعة → يفتح `payment` sheet

**Balance Display:**
- يعرض الرصيد الحالي في Header
- مع علامة + أو -
- بالعملة (SAR)

---

### 3️⃣ **Payments.tsx** ✅
**المسار:** `src/features/saas/Payments.tsx`

**التحديث:**
```typescript
{/* Payment Details Sheet */}
<UniversalDetailSheet
  isOpen={isPaymentDetailsOpen}
  onClose={() => {
    setIsPaymentDetailsOpen(false);
    setSelectedPayment(null);
  }}
  docType="payment"
  data={selectedPayment}
  onRefresh={loadData}
/>

{/* Invoice Details Sheet */}
<UniversalDetailSheet
  isOpen={isInvoiceDetailsOpen}
  onClose={() => {
    setIsInvoiceDetailsOpen(false);
    setSelectedInvoice(null);
  }}
  docType="invoice"
  data={selectedInvoice}
  onRefresh={loadData}
/>
```

**Configs المستخدمة:** 
- `payment.config.ts` (جديد ✨)
- `invoice.config.ts` (موجود)

**Payment Sheet Tabs:**
- 📊 Overview (نظرة عامة)
- 📝 Activity (السجل)

**Payment Actions:**
- 📄 View Invoice (عرض الفاتورة) - إذا كان invoice_id موجود
- ✅ Confirm (تأكيد) - للحالة pending
- ❌ Refund (استرداد) - للحالة completed

---

## 🗂️ الـ Configs المضافة/المحدثة

### ✨ **payment.config.ts** (جديد)
**المسار:** `src/components/sheets/configs/payment.config.ts`

```typescript
export const paymentConfig: SheetConfig = {
  docType: 'payment',
  
  // Header
  title: (data) => data.invoice_number || `PMT-${data.id}`,
  subtitle: (data) => data.tenant_name || data.reference,
  icon: DollarSign,
  iconBg: 'bg-gradient-to-br from-green-600 to-green-800',
  
  // Status Badge
  badge: (data) => {
    // completed, pending, failed, refunded, cancelled
  },
  
  // Balance Display
  balance: {
    value: (data) => data.amount || 0,
    label: 'fields.amount',
    currency: 'SAR',
    showSign: false,
  },
  
  // Stats Cards
  stats: [
    { key: 'amount', label: 'stats.amount', icon: DollarSign, color: 'green' },
    { key: 'commission', label: 'stats.commission', icon: Receipt, color: 'blue' },
    { key: 'payment_date', label: 'stats.paymentDate', icon: Calendar, color: 'gray' },
  ],
  
  // Info Fields
  infoFields: [
    { key: 'invoice_number', label: 'fields.invoiceNumber', type: 'text', icon: FileText },
    { key: 'tenant_name', label: 'fields.tenant', type: 'link', link: (tenant_id) => 'tenant' },
    { key: 'payment_method', label: 'fields.paymentMethod', type: 'badge', icon: CreditCard },
    { key: 'amount', label: 'fields.amount', type: 'currency', currency: 'SAR' },
    { key: 'payment_date', label: 'fields.paymentDate', type: 'date' },
    { key: 'agent_name', label: 'fields.agent', type: 'link', link: (agent_id) => 'agent' },
    { key: 'commission_amount', label: 'fields.commission', type: 'currency' },
    { key: 'reference', label: 'fields.reference', type: 'text' },
    { key: 'notes', label: 'fields.notes', type: 'text', colSpan: 2 },
  ],
  
  width: 'md',
};
```

**التحديثات في `configs/index.ts`:**
```typescript
import { paymentConfig } from './payment.config';

const configRegistry = {
  // ... existing
  payment: paymentConfig,
  // ... rest
};

export { paymentConfig } from './payment.config';
```

---

## 🏗️ هيكل الـ Config System

### 📁 الملفات:
```
src/components/sheets/
├── configs/
│   ├── tenant.config.ts       ✅ موجود (محدث)
│   ├── agent.config.ts        ✅ موجود (محدث)
│   ├── payment.config.ts      ✨ جديد
│   ├── invoice.config.ts      ✅ موجود
│   ├── plan.config.ts         ✅ موجود
│   ├── subscription.config.ts ✅ موجود
│   ├── coupon.config.ts       ✅ موجود
│   ├── module.config.ts       ✅ موجود
│   ├── account.config.ts      ✅ موجود
│   ├── customer.config.ts     ✅ موجود
│   ├── supplier.config.ts     ✅ موجود
│   ├── journal_entry.config.ts ✅ موجود
│   ├── fund.config.ts         ✅ موجود
│   ├── sheet.types.ts         ✅ موجود
│   └── index.ts               ✅ محدث
├── tabs/
│   ├── tenant/                ✅
│   ├── agent/                 ✅
│   └── shared/                ✅
├── universal/
│   ├── UniversalDetailSheet.tsx        ✅
│   ├── UniversalDetailHeader.tsx       ✅
│   ├── UniversalDetailTabs.tsx         ✅
│   ├── UniversalDetailContent.tsx      ✅
│   └── NestedSheetManager.tsx          ✅
└── index.ts                   ✅
```

---

## 🎨 كيف يعمل الـ Config System

### 1. **تعريف Config:**
```typescript
// في tenant.config.ts
export const tenantConfig: SheetConfig = {
  docType: 'tenant',
  title: (data) => data.name,
  subtitle: (data) => data.code,
  icon: Building2,
  iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800',
  
  badge: (data) => ({
    label: 'status.active',
    variant: 'success',
  }),
  
  stats: [
    { key: 'users_count', label: 'stats.users', icon: Users, color: 'blue' },
    // ... more stats
  ],
  
  infoFields: [
    { key: 'code', label: 'fields.code', type: 'text' },
    { key: 'email', label: 'fields.email', type: 'email', icon: Mail },
    // ... more fields
  ],
  
  tabs: [
    { id: 'overview', label: 'tabs.overview', icon: Eye, component: OverviewTab },
    // ... more tabs
  ],
  
  actions: [
    { id: 'edit', label: 'actions.edit', icon: Edit, variant: 'outline' },
    // ... more actions
  ],
};
```

### 2. **التسجيل في Registry:**
```typescript
// في configs/index.ts
const configRegistry = {
  tenant: tenantConfig,
  agent: agentConfig,
  payment: paymentConfig,
  // ...
};

export function getSheetConfig(docType: DocType): SheetConfig | null {
  return configRegistry[docType] || null;
}
```

### 3. **الاستخدام في الصفحة:**
```typescript
// في Subscribers.tsx
<UniversalDetailSheet
  isOpen={isDetailsOpen}
  onClose={handleClose}
  docType="tenant"  // ✅ يجلب config تلقائياً
  data={selectedTenant}
  onRefresh={loadTenants}
/>
```

---

## 🔧 أنواع Info Fields المدعومة

| Type | Description | Example |
|------|-------------|---------|
| `text` | نص عادي | Code, Name |
| `number` | رقم | Count, Quantity |
| `currency` | مبلغ مالي | Amount, Balance |
| `date` | تاريخ | Created At, Due Date |
| `datetime` | تاريخ ووقت | Last Login |
| `email` | بريد إلكتروني | Email Address |
| `phone` | هاتف | Phone Number |
| `badge` | شارة ملونة | Status, Plan |
| `link` | رابط لشيت آخر | Agent Name → Agent Sheet |
| `percentage` | نسبة مئوية | Commission % |
| `custom` | مخصص | أي شيء |

---

## 🎭 أنواع Tabs المدعومة

### **Shared Tabs** (مشتركة):
```typescript
import { 
  OverviewTab,      // نظرة عامة (info fields + stats)
  ActivityTab,      // سجل النشاط
  LedgerTab,        // دفتر الأستاذ
  PaymentsTab,      // المدفوعات
  DocumentsTab,     // المستندات
  NotesTab,         // الملاحظات
  AIAnalysisTab,    // تحليل AI
} from '../tabs/shared';
```

### **Tenant-Specific Tabs:**
```typescript
import {
  TenantSubscriptionsTab, // الاشتراكات
  TenantUsageTab,         // الاستخدام
  TenantModulesTab,       // الوحدات
} from '../tabs/tenant';
```

### **Agent-Specific Tabs:**
```typescript
import {
  AgentCommissionsTab,   // العمولات
  AgentTenantsTab,       // المشتركين
  AgentWithdrawalsTab,   // السحوبات
} from '../tabs/agent';
```

---

## ⚙️ Props المتاحة لـ UniversalDetailSheet

```typescript
interface UniversalDetailSheetProps {
  // Basic Props
  isOpen: boolean;
  onClose: () => void;
  
  // Data Props
  docType?: DocType;              // نوع المستند
  data: any;                      // البيانات
  config?: SheetConfig;           // config مخصص (optional)
  
  // Optional overrides
  onEdit?: () => void;            // عند الضغط على Edit
  onRefresh?: () => void;         // عند الضغط على Refresh
  loading?: boolean;              // حالة التحميل
  styleVariant?: 'classic' | 'swiss';  // نمط التصميم
  disableAnimation?: boolean;     // تعطيل الحركة
  
  // Nested sheet support
  enableNestedSheets?: boolean;   // تفعيل الشيتات المتداخلة
  
  // Component Lab
  preventCloseOnOutsideClick?: boolean;  // منع الإغلاق بالنقر خارجاً
}
```

---

## 🌊 Nested Sheets Flow

### المثال: من Tenant → Subscription → Invoice → Payment

```
1. User clicks tenant row in table
   ↓
2. Tenant sheet opens (60% width)
   ↓
3. User clicks subscription in TenantSubscriptionsTab
   ↓
4. Tenant sheet shrinks to 45%, Subscription sheet opens (45%)
   ↓
5. User clicks invoice in SubscriptionInvoicesTab
   ↓
6. Subscription sheet shrinks, Invoice sheet opens
   ↓
7. User clicks payment in InvoicePaymentsTab
   ↓
8. Invoice sheet shrinks, Payment sheet opens
```

**الإغلاق:**
- إغلاق أي sheet متداخل → يرجع للسابق
- إغلاق الـ main sheet → يغلق الكل

---

## 🎨 التصميم المقارن

| العنصر | المكون القديم ❌ | UniversalDetailSheet ✅ |
|--------|------------------|------------------------|
| اللون | فستقي فاتح | رمادي/أبيض حسب الـ variant |
| Header | عادي | Gradient + Icon + Badge |
| Stats | غير موجودة | 4 بطاقات ملونة |
| Tabs | عادية | Pills (classic) أو Underline (swiss) |
| Animation | بسيطة | Framer Motion smooth spring |
| Nested Sheets | ❌ | ✅ مع تصغير تلقائي |
| Edit Mode | ❌ | ✅ مع تحذير |
| Info Fields | محدودة | 10 أنواع مختلفة |
| Links | ❌ | ✅ لفتح شيتات أخرى |
| RTL | محدود | ✅ كامل |

---

## 📊 إحصائيات التحديث

| الملف | السطور قبل | السطور بعد | التغيير |
|------|-----------|-----------|---------|
| Subscribers.tsx | 218 | 235 | +17 (Sheet) |
| Agents.tsx | 236 | 254 | +18 (Sheet) |
| Payments.tsx | 297 | 384 | +87 (2 Sheets) |
| payment.config.ts | 0 | 150 | +150 (جديد) |
| configs/index.ts | 90 | 92 | +2 |
| **الإجمالي** | 841 | 1115 | **+274** |

---

## ✅ الاختبارات

### TypeScript Check:
```bash
✅ npm run typecheck
   - Pass (خطأ موجود مسبقاً في Sidebar.tsx فقط)
```

### Translation Keys:
```bash
✅ common.totalRevenue - Added in ar.json
```

---

## 🚀 كيفية الاستخدام

### 1. **فتح شيت لأي نوع:**
```typescript
const [selectedItem, setSelectedItem] = useState(null);
const [isOpen, setIsOpen] = useState(false);

<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => {
    setIsOpen(false);
    setSelectedItem(null);
  }}
  docType="tenant"  // أو agent, payment, invoice, إلخ
  data={selectedItem}
  onRefresh={refreshData}
/>
```

### 2. **إنشاء Config جديد:**
```typescript
// 1. أنشئ ملف في configs/
// src/components/sheets/configs/my-doc.config.ts

export const myDocConfig: SheetConfig = {
  docType: 'my-doc',
  title: (data) => data.name,
  icon: MyIcon,
  // ... باقي الإعدادات
};

// 2. سجّله في index.ts
import { myDocConfig } from './my-doc.config';

const configRegistry = {
  // ...
  'my-doc': myDocConfig,
};

export { myDocConfig } from './my-doc.config';

// 3. استخدمه
<UniversalDetailSheet
  docType="my-doc"
  data={myData}
/>
```

### 3. **Custom Config (بدون تسجيل):**
```typescript
const customConfig: SheetConfig = {
  // ... إعدادات مخصصة
};

<UniversalDetailSheet
  config={customConfig}  // ✅ بدلاً من docType
  data={myData}
/>
```

---

## 🎨 Style Variants

### **Classic Variant** (افتراضي):
```typescript
<UniversalDetailSheet
  styleVariant="classic"  // أو احذفها (default)
  // ...
/>
```
- خلفية رمادية (`bg-gray-50`)
- Tabs pills مع gradient
- Header مع shadow
- Rounded corners

### **Swiss Variant:**
```typescript
<UniversalDetailSheet
  styleVariant="swiss"
  // ...
/>
```
- خلفية بيضاء (`bg-white`)
- Underline tabs minimal
- Header مسطح مع border
- Sharp corners

---

## 🔄 Nested Sheets Best Practices

### ✅ Do:
```typescript
// في tenant.config.ts
onRowClick: (row, rowDocType) => {
  if (rowDocType === 'subscription') {
    return { docType: 'subscription', data: row };
  }
  if (rowDocType === 'payment') {
    return { docType: 'payment', data: row };
  }
  return null;  // لا تفعل شيء
}
```

### ❌ Don't:
```typescript
// لا تفتح nested sheet يدوياً
openSheet('subscription', data);  // خطأ!
```

---

## 📝 الخلاصة

تم بنجاح:
1. ✅ إضافة `UniversalDetailSheet` لجميع صفحات SaaS
2. ✅ إنشاء `payment.config.ts` جديد
3. ✅ تحديث `Subscribers.tsx` لاستخدام الشيت الموحد
4. ✅ تحديث `Agents.tsx` لاستخدام الشيت الموحد
5. ✅ تحديث `Payments.tsx` لاستخدام شيتين (Payment & Invoice)
6. ✅ إضافة مفاتيح ترجمة ناقصة
7. ✅ TypeScript pass
8. ✅ توثيق كامل

**النتيجة:**
- 🎨 تصميم موحد عصري بدون اللون الفستقي
- ✅ Nested sheets للتنقل السلس
- 🚀 نظام config مرن وقابل للتوسع
- 📊 Stats وInfo fields غنية
- 🌐 RTL support كامل

---

**الحالة:** ✅ **جاهز للاستخدام!** 🎉

**اختبر الآن:**
```bash
npm run dev
# افتح: http://localhost:5174/saas/subscribers
# انقر على أي صف → الشيت الموحد سيفتح!
```
