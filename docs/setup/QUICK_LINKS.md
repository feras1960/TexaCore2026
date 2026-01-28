# 🚀 روابط الاستعراض السريع

## 🎯 الرابط الرئيسي للاستعراض

```
http://localhost:5174/sheets-preview
```

## 📋 الروابط المباشرة لصفحات SaaS

### 1. المشتركين (Subscribers)
```
http://localhost:5174/saas/subscribers
```
اضغط على أي صف لفتح الشيت

---

### 2. الوكلاء (Agents)
```
http://localhost:5174/saas/agents
```
اضغط على أي صف لفتح الشيت

---

### 3. المدفوعات (Payments)
```
http://localhost:5174/saas/payments
```
اضغط على أي صف لفتح الشيت

---

### 4. الباقات (Packages)
```
http://localhost:5174/saas/packages
```
اضغط على أي بطاقة لفتح الشيت

---

## 🎨 مختبر المكونات

```
http://localhost:5174/component-lab
```

ابحث عن:
- **ID 23:** universal-detail-sheet

---

## ⚡ التشغيل السريع

```bash
# في Terminal:
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
npm run dev
```

ثم افتح أي رابط من الأعلى!

---

## 🔍 الاختبار

### الخطوة 1: افتح صفحة الاستعراض
```
http://localhost:5174/sheets-preview
```

### الخطوة 2: اضغط على الأزرار الزرقاء
- 🔵 "استعراض Tenant" → Variant 1 (Default)
- 🟣 "استعراض Agent" → Variant 2 (Underline)
- 🟢 "استعراض Payment" → Variant 3 (Preview)

### الخطوة 3: حدد المفضل
- إذا أعجبك Variant 1 → استخدمه كما هو
- إذا أعجبك Variant 2 → غيّر import في Subscribers

---

## 🎯 الحل السريع

إذا ما زال الشيت القديم يظهر:

### الطريقة 1: غيّر الـ Variant

في `src/features/saas/Subscribers.tsx`:

```typescript
// بدل السطر 16:
import { UniversalDetailSheet } from '@/components/sheets';

// إلى:
import { UniversalDetailSheetWithUnderlineTabs } from '@/components/sheets';

// ثم بدل السطر 213:
<UniversalDetailSheetWithUnderlineTabs
  isOpen={isDetailsOpen}
  onClose={() => {
    setIsDetailsOpen(false);
    setSelectedTenant(null);
  }}
  docType="tenant"
  data={selectedTenant}
  onRefresh={loadTenants}
/>
```

### الطريقة 2: فرض التصميم

في `src/features/saas/Subscribers.tsx` السطر 213:

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
  styleVariant="swiss"  // ✅ أضف هذا السطر
/>
```

---

## 📸 لقطات للمقارنة

### ❌ إذا رأيت هذا (خطأ):
- لون أخضر فستقي فاتح
- تصميم بسيط جداً
- بدون tabs متعددة

### ✅ يجب أن ترى هذا (صحيح):
- لون رمادي/أبيض
- Stats cards ملونة في الأعلى
- 7 tabs: نظرة عامة | الاشتراكات | الاستخدام | الوحدات | المدفوعات | دفتر الأستاذ | النشاط
- تصميم عصري

---

## 🆘 إذا لم يعمل

### 1. امسح Cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

### 2. تحقق من المتصفح:
- Ctrl+Shift+R (Hard Refresh)
- F12 → Console → ابحث عن أخطاء

### 3. تحقق من الملفات:
```bash
# التحقق من وجود الملف الجديد:
ls -la src/pages/SheetsPreview.tsx

# التحقق من Routes:
grep -n "sheets-preview" src/App.tsx
```

---

**افتح الآن:** http://localhost:5174/sheets-preview 🎉
