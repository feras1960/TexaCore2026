# 📋 معيار التعديل المباشر — In-Place Edit Standard
## TexaCore ERP — معيار معماري على مستوى النظام

---

## 🎯 الفكرة الأساسية

> **بدلاً من إلغاء القيود وإنشاء قيود جديدة عند كل تعديل، يتم تعديل القيد الأصلي مباشرة في مكانه
> مع الاحتفاظ بسجل تعديلات داخلي كامل للرقابة.**

### لماذا؟
- الشركات الصغيرة والمتوسطة لا تحتاج لـ 3 قيود لكل تصحيح
- دفاتر نظيفة = تقارير أوضح = قرارات أسرع
- أسلوب مُجرّب في البرامج المحاسبية الناجحة (QuickBooks, الأنظمة القديمة الموثوقة)

---

## 📐 القواعد العامة (على مستوى النظام)

### القاعدة 1: التعديل المباشر على نفس السجل
```
عند تعديل أي مستند مرحّل (فاتورة، قيد، حركة مخزون):
  ① يُعدّل السجل الأصلي مباشرة (نفس الـ ID)
  ② يبقى التاريخ الأصلي للمستند كما هو
  ③ يُضاف تاريخ التعديل في حقل منفصل (modified_at)
  ④ يُسجّل التعديل في سجل التعديلات (edit_history JSONB)
```

### القاعدة 2: سجل التعديلات (Audit Trail)
```jsonc
// حقل edit_history (JSONB array) — يُضاف لكل جدول رئيسي
{
  "edit_history": [
    {
      "edited_at": "2026-02-18T14:30:00Z",
      "edited_by": "user-uuid",
      "edited_by_name": "أحمد محمد",
      "reason": "تصحيح سعر المادة",     // اختياري
      "changes": {
        "unit_price": { "old": 150, "new": 140 },
        "total_amount": { "old": 1500, "new": 1400 },
        "tax_amount": { "old": 225, "new": 210 }
      }
    }
  ]
}
```

### القاعدة 3: ضوابط التعديل
| الضابط | التفاصيل |
|--------|---------|
| **الفترة المقفلة** | لا يُسمح بالتعديل على فترات محاسبية مقفلة |
| **الصلاحية** | يحتاج المستخدم صلاحية `can_edit_posted` |
| **التوقيع** | يُسجّل من عدّل ومتى وماذا غيّر |
| **السبب** | اختياري — يمكن للمسؤول جعله إلزامياً |

---

## 🔧 التطبيق حسب نوع المستند

### 1. فاتورة نقطة البيع (POS) — تعديل شامل

```
المسموح: تعديل الكمية + السعر + الأصناف + المستودع
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
عند الحفظ:
  ① حساب فرق الكميات لكل صنف
     مثال: كان 10 → صار 8 = فرق -2
  ② تحديث المخزون بالفرق فقط (لا عكس كامل)
     fabric_materials.total_stock += فرق_الكمية
  ③ إعادة حساب متوسط التكلفة المرجح
  ④ تعديل بنود القيد المحاسبي مباشرة (نفس JE ID)
  ⑤ تحديث مبالغ الفاتورة
  ⑥ إضافة سجل التعديل في edit_history
```

### 2. فاتورة سير العمل (Workflow) — مُسلّمة

```
المسموح: تعديل السعر فقط (الكمية ثابتة — تم التسليم فعلياً)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
عند الحفظ:
  ① تحديث السعر في بنود الفاتورة
  ② إعادة حساب المبالغ (المجموع، الضريبة، الإجمالي)
  ③ تعديل بنود القيد المحاسبي (فرق المبلغ فقط)
  ④ تحديث متوسط التكلفة (للمشتريات — السعر الجديد)
  ⑤ المخزون لا يتأثر (الكمية لم تتغير)
  ⑥ إضافة سجل التعديل في edit_history
```

### 3. فاتورة سير العمل — مسودة/مؤكدة (غير مرحّلة)

```
المسموح: تعديل حر بالكامل (لم يحدث شيء في الدفاتر بعد)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
لا حاجة لمنطق خاص — تعديل عادي كأي مسودة
```

### 4. القيود المحاسبية اليدوية

```
المسموح: تعديل المبالغ + الحسابات + الوصف
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
عند الحفظ:
  ① تعديل بنود القيد مباشرة
  ② التحقق من توازن القيد (مدين = دائن)
  ③ إضافة سجل التعديل في edit_history
  ④ تحديث الوصف: إضافة "⚡ معدّل" + تاريخ التعديل
```

---

## 🗄️ التعديلات على قاعدة البيانات

### حقول جديدة (تُضاف للجداول الرئيسية)

```sql
-- الجداول المستهدفة:
-- purchase_transactions, sales_transactions, journal_entries

ALTER TABLE purchase_transactions
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;
```

### صلاحية التعديل (RBAC)

```
الصلاحيات المطلوبة:
  can_edit_posted_purchase  — تعديل فواتير مشتريات مرحّلة
  can_edit_posted_sales     — تعديل فواتير مبيعات مرحّلة
  can_edit_posted_journal   — تعديل قيود يدوية مرحّلة
  can_edit_closed_period    — تعديل في فترات مقفلة (مدير فقط)
```

---

## 📜 سجل النشاط — Activity Log (Timeline)

> **كل حدث مهم في دورة حياة المستند يُسجّل تلقائياً في `activity_log`
> ويُعرض كـ Timeline في واجهة المستخدم.**

### هيكل سجل النشاط

```jsonc
// حقل activity_log (JSONB array) — يُضاف لكل جدول رئيسي
{
  "activity_log": [
    {
      "event": "created",
      "at": "2026-02-15T09:30:00Z",
      "by": "user-uuid",
      "by_name": "أحمد محمد",
      "details": null
    },
    {
      "event": "confirmed",
      "at": "2026-02-15T10:00:00Z",
      "by": "user-uuid",
      "by_name": "أحمد محمد",
      "details": { "invoice_no": "PI-2026-000042" }
    },
    {
      "event": "posted",
      "at": "2026-02-16T14:00:00Z",
      "by": "user-uuid",
      "by_name": "محمد علي",
      "details": { "journal_entry_id": "je-uuid", "total": 15000 }
    },
    {
      "event": "edited",
      "at": "2026-02-18T11:30:00Z",
      "by": "user-uuid",
      "by_name": "أحمد محمد",
      "details": {
        "reason": "تصحيح سعر المادة",
        "changes": { "unit_price": { "old": 150, "new": 140 } }
      }
    },
    {
      "event": "stock_updated",
      "at": "2026-02-16T14:00:05Z",
      "by": "system",
      "by_name": "النظام",
      "details": { "warehouse": "المستودع الرئيسي", "items_count": 3 }
    },
    {
      "event": "printed",
      "at": "2026-02-17T09:00:00Z",
      "by": "user-uuid",
      "by_name": "فاطمة أحمد",
      "details": { "print_count": 1 }
    }
  ]
}
```

### أنواع الأحداث المدعومة

| الحدث | الأيقونة | اللون | الوصف |
|-------|---------|-------|-------|
| `created` | 📝 | أزرق | إنشاء المستند (مسودة) |
| `saved` | 💾 | رمادي | حفظ تعديلات على المسودة |
| `confirmed` | ✅ | أخضر | تأكيد المستند وإعطاءه رقم نهائي |
| `posted` | 📊 | بنفسجي | ترحيل القيد المحاسبي |
| `stock_updated` | 📦 | أخضر فاتح | تحديث المخزون المباشر |
| `edited` | ⚡ | برتقالي | تعديل مستند مرحّل (in-place edit) |
| `printed` | 🖨️ | رمادي فاتح | طباعة المستند |
| `paid` | 💰 | أخضر غامق | تسجيل دفعة |
| `partially_paid` | 💳 | أصفر | دفع جزئي |
| `received` | 📥 | أزرق فاتح | استلام بضاعة (مشتريات) |
| `delivered` | 📤 | أزرق فاتح | تسليم بضاعة (مبيعات) |
| `cancelled` | 🚫 | أحمر | إلغاء المستند أو القيد |
| `unposted` | ↩️ | برتقالي | إلغاء الترحيل |
| `reminder_sent` | 🔔 | أصفر | إرسال تذكير بالدفع |

---

## 🔄 منطق التعديل الموحد — inPlaceEditService

```typescript
// الواجهة الموحدة لجميع عمليات التعديل
interface InPlaceEditInput {
  documentType: 'purchase' | 'sales' | 'journal';
  documentId: string;
  changes: Record<string, { old: any; new: any }>;
  reason?: string;
  userId: string;
}

// الخطوات:
// 1. فحص الصلاحية (can_edit_posted_*)
// 2. فحص الفترة (ليست مقفلة)
// 3. حساب الفروقات
// 4. تعديل المستند الأصلي
// 5. تعديل القيد المحاسبي (إن وجد)
// 6. تعديل المخزون (إن لزم — POS فقط)
// 7. تسجيل edit_history + activity_log
// 8. إرجاع النتيجة
```

---

## 📊 مصفوفة التعديل الشاملة

| المستند | المرحلة | الكمية | السعر | الأصناف | القيد | المخزون |
|---------|---------|--------|-------|---------|-------|---------|
| POS | مرحّلة | ✅ | ✅ | ✅ | يُعدّل | يُعدّل الفرق |
| مشتريات Workflow | مسودة/مؤكدة | ✅ | ✅ | ✅ | — | — |
| مشتريات Workflow | مُستلمة | ❌ | ✅ | ❌ | يُعدّل | تكلفة فقط |
| مشتريات Workflow | مرحّلة | ❌ | ✅ | ❌ | يُعدّل | تكلفة فقط |
| مبيعات Workflow | مسودة/مؤكدة | ✅ | ✅ | ✅ | — | — |
| مبيعات Workflow | مُسلّمة | ❌ | ✅ | ❌ | يُعدّل | — |
| مبيعات Workflow | مرحّلة | ❌ | ✅ | ❌ | يُعدّل | — |
| قيد يدوي | مرحّل | — | — | — | يُعدّل مباشرة | — |

---

## 🏗️ خطة التنفيذ

### المرحلة 1: البنية التحتية (قاعدة البيانات)
1. SQL Migration: إضافة `edit_history`, `activity_log`, `last_edited_at`, `edit_count` للجداول الثلاثة
2. إنشاء `activityLogService.ts` — خدمة سجل النشاط الموحدة
3. إنشاء `inPlaceEditService.ts` — خدمة التعديل المباشر

### المرحلة 2: سجل النشاط (التوثيق التلقائي)
4. تسجيل `created` عند إنشاء أي مستند
5. تسجيل `confirmed` عند التأكيد
6. تسجيل `posted` + `stock_updated` عند الترحيل
7. تسجيل `printed` عند الطباعة
8. تسجيل `cancelled` / `unposted` عند الإلغاء

### المرحلة 3: واجهة Timeline
9. إنشاء `ActivityTimeline.tsx` — عنصر عرض سجل النشاط
10. دمج Timeline في تبويب "سجل النشاط" في شاشة الفاتورة

### المرحلة 4: التعديل المباشر (In-Place Edit)
11. دعم التعديل المباشر في `journalEntriesService`
12. دعم التعديل المباشر في `purchaseAccountingService`
13. دعم التعديل المباشر في `salesTransactionService`
14. دعم تعديل فرق المخزون في `directStockUpdateService` (POS)

### المرحلة 5: الصلاحيات
15. إضافة صلاحيات `can_edit_posted_*` في نظام RBAC
16. فحص الصلاحيات في الواجهة والخدمات

---

## ✅ المعيار النهائي

> **"كل تعديل على مستند مرحّل = تعديل مباشر على نفس السجل + تسجيل التغييرات في edit_history + توثيق الحدث في activity_log"**
>
> لا قيود عكسية. لا قيود جديدة. سجل واحد نظيف مع تاريخ تعديلات كامل وسجل نشاط شفاف.





```sql
-- الجداول المستهدفة:
-- purchase_transactions, sales_transactions, journal_entries

ALTER TABLE purchase_transactions
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;
```

### صلاحية التعديل (RBAC)

```
الصلاحيات المطلوبة:
  can_edit_posted_purchase  — تعديل فواتير مشتريات مرحّلة
  can_edit_posted_sales     — تعديل فواتير مبيعات مرحّلة
  can_edit_posted_journal   — تعديل قيود يدوية مرحّلة
  can_edit_closed_period    — تعديل في فترات مقفلة (مدير فقط)
```

---

## 🔄 منطق التعديل الموحد — inPlaceEditService

```typescript
// الواجهة الموحدة لجميع عمليات التعديل
interface InPlaceEditInput {
  documentType: 'purchase' | 'sales' | 'journal';
  documentId: string;
  changes: Record<string, { old: any; new: any }>;
  reason?: string;
  userId: string;
}

// الخطوات:
// 1. فحص الصلاحية (can_edit_posted_*)
// 2. فحص الفترة (ليست مقفلة)
// 3. حساب الفروقات
// 4. تعديل المستند الأصلي
// 5. تعديل القيد المحاسبي (إن وجد)
// 6. تعديل المخزون (إن لزم — POS فقط)
// 7. تسجيل edit_history
// 8. إرجاع النتيجة
```

---

## 📊 مصفوفة التعديل الشاملة

| المستند | المرحلة | الكمية | السعر | الأصناف | القيد | المخزون |
|---------|---------|--------|-------|---------|-------|---------|
| POS | مرحّلة | ✅ | ✅ | ✅ | يُعدّل | يُعدّل الفرق |
| مشتريات Workflow | مسودة/مؤكدة | ✅ | ✅ | ✅ | — | — |
| مشتريات Workflow | مُستلمة | ❌ | ✅ | ❌ | يُعدّل | تكلفة فقط |
| مشتريات Workflow | مرحّلة | ❌ | ✅ | ❌ | يُعدّل | تكلفة فقط |
| مبيعات Workflow | مسودة/مؤكدة | ✅ | ✅ | ✅ | — | — |
| مبيعات Workflow | مُسلّمة | ❌ | ✅ | ❌ | يُعدّل | — |
| مبيعات Workflow | مرحّلة | ❌ | ✅ | ❌ | يُعدّل | — |
| قيد يدوي | مرحّل | — | — | — | يُعدّل مباشرة | — |

---

## 🏗️ خطة التنفيذ

### المرحلة 1: البنية التحتية
1. إضافة حقول `edit_history`, `last_edited_at`, `edit_count` للجداول
2. إنشاء `inPlaceEditService.ts` — الخدمة الموحدة
3. إضافة صلاحيات `can_edit_posted_*` في نظام RBAC

### المرحلة 2: القيود المحاسبية
4. تعديل `journalEntriesService` — دعم التعديل المباشر مع edit_history
5. واجهة التعديل في `UnifiedAccountingSheet`

### المرحلة 3: المشتريات
6. تعديل `purchaseAccountingService` — دعم in-place edit
7. واجهة التعديل في شاشة المشتريات (سعر + كمية حسب النوع)

### المرحلة 4: المبيعات
8. تعديل `salesTransactionService` — دعم in-place edit
9. واجهة التعديل في شاشة المبيعات

### المرحلة 5: المخزون (POS)
10. تعديل `directStockUpdateService` — دعم تعديل الفرق
11. اختبار شامل لسيناريوهات POS

---

## ✅ المعيار النهائي

> **"كل تعديل على مستند مرحّل = تعديل مباشر على نفس السجل + تسجيل التغييرات في edit_history"**
>
> لا قيود عكسية. لا قيود جديدة. سجل واحد نظيف مع تاريخ تعديلات كامل.
