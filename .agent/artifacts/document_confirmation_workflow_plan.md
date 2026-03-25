# 🔄 خطة تأكيد المستندات وربطها بالمستودع والصلاحيات
## Document Confirmation, Warehouse Integration & Permission Workflow

**التاريخ**: 2026-02-11  
**الأولوية**: عالية — يربط المبيعات بالمستودع والمحاسبة

---

## 📊 النظرة العامة (The Big Picture)

```
══════════════════════════════════════════════════════════════════════════════════
  دورة حياة المستند التجاري — من الإنشاء إلى التسليم
══════════════════════════════════════════════════════════════════════════════════

  [مسودة]  ←—→  [محفوظ]  ——→  [بانتظار الموافقة]  ——→  [مؤكد]  ——→  [إذن تسليم]
   Draft         Saved        Pending Approval       Confirmed     Delivery
     ↑                              ↓                    ↓              ↓
   تعديل                     📱 إشعار للمدير      📦 إشعار لأمين    🚚 خصم من
   حر                        للمراجعة والموافقة     المستودع          المخزون
                                                                       ↓
                                                                   [مكتمل]
══════════════════════════════════════════════════════════════════════════════════
```

---

## 🎯 المراحل الخمس (5 Stages)

### المرحلة 1️⃣ — كبسة التأكيد والـ Dialog الذكي
> **الهدف**: إضافة زر "تأكيد وإرسال" في الـ UnifiedAccountingSheet

| البند | التفاصيل |
|-------|---------|
| **الملفات** | `tradeConfigs.ts`, `UnifiedAccountingSheet.tsx`, `types.ts` |
| **المكون الجديد** | `ConfirmationDialog.tsx` — Dialog بتصميم premium |
| **الشروط قبل التأكيد** | ✅ يوجد أصناف (items > 0) ، ✅ يوجد عميل ، ✅ الدفعة مدفوعة (إذا مطلوبة) |

#### تفاصيل الـ ConfirmationDialog:
```
┌─────────────────────────────────────────┐
│ ✅ تأكيد أمر البيع #SO-2024001         │
│                                         │
│ 📋 ملخص المستند:                        │
│    العميل: شركة الأمل التجارية          │
│    الأصناف: 5 منتجات                    │
│    الإجمالي: 15,000.00 USD              │
│                                         │
│ ☑️ التحققات:                            │
│    ✅ المستند يحتوي على أصناف           │
│    ✅ العميل محدد                        │
│    ✅ الدفعة مستلمة (3,000 من 15,000)   │
│    ⚠️ الدفعة الإلزامية: غير مفعلة       │
│                                         │
│ 📦 عند التأكيد سيتم:                    │
│    • تغيير الحالة إلى "مؤكد"            │
│    • إنشاء إذن تسليم للمستودع           │
│    • إشعار أمين المستودع                │
│    • قفل المستند من التعديل              │
│                                         │
│  [إلغاء]          [✅ تأكيد وإرسال]      │
└─────────────────────────────────────────┘
```

#### ماذا يحدث عند الضغط على "تأكيد":
1. تحديث `status` → `confirmed`
2. تحديث `confirmed_at` → timestamp
3. تحديث `confirmed_by` → user_id
4. إنشاء `delivery_notes` تلقائي (draft)
5. إرسال إشعار لأمين المستودع
6. تسجيل في `status_history`

---

### المرحلة 2️⃣ — نظام الموافقة (Approval Flow) - حسب الإعدادات
> **الهدف**: المدير يوافق قبل أن يقدر الموظف يأكد

```
                    إعداد: require_manager_approval = true
                    ════════════════════════════════════

  موظف يحفظ المستند ——→ 📱 إشعار للمدير ——→ المدير يراجع
                                                  ↓
                                          [يوافق ✅] أو [يرفض ❌]
                                                  ↓
                                    إشعار للموظف ——→ الموظف يأكد ويرسل
```

#### إعدادات الموافقة (جدول `company_workflow_settings`):

| الإعداد | النوع | الوصف |
|--------|------|-------|
| `require_manager_approval_quotation` | boolean | عرض السعر يحتاج موافقة مدير |
| `require_manager_approval_order` | boolean | أمر البيع يحتاج موافقة مدير |
| `require_manager_approval_invoice` | boolean | الفاتورة تحتاج موافقة مدير |
| `approval_amount_threshold` | numeric | مبلغ فوقه تصير الموافقة إلزامية |
| `auto_create_delivery_on_confirm` | boolean | إنشاء إذن تسليم تلقائي عند التأكيد |
| `allow_edit_after_confirm` | boolean | السماح بالتعديل بعد التأكيد |
| `edit_after_confirm_roles` | text[] | الأدوار المسموح لها تعدل بعد التأكيد |
| `notify_warehouse_on_confirm` | boolean | إشعار أمين المستودع عند التأكيد |
| `notify_channel` | text | قناة الإشعار: 'internal' / 'telegram' / 'both' |

---

### المرحلة 3️⃣ — الصلاحيات المطلوبة (Permissions Matrix)
> **الهدف**: تجميع كل الصلاحيات الجديدة المطلوبة

#### 3.1 صلاحيات جديدة تُضاف على الأدوار:

| الصلاحية (Permission Key) | الوصف (عربي) | الوصف (English) |
|--------------------------|-------------|----------------|
| `sales.confirm` | تأكيد مستند مبيعات | Confirm sales document |
| `sales.approve` | موافقة على مستند مبيعات | Approve sales document |
| `sales.edit_confirmed` | تعديل مستند مؤكد | Edit confirmed document |
| `sales.cancel_confirmed` | إلغاء مستند مؤكد | Cancel confirmed document |
| `delivery.create` | إنشاء إذن تسليم | Create delivery note |
| `delivery.execute` | تنفيذ إذن تسليم (خصم مخزون) | Execute delivery (deduct stock) |
| `delivery.view_all` | عرض كل أذونات التسليم | View all delivery notes |
| `inventory.reserve` | حجز كمية من المخزون | Reserve inventory quantity |
| `inventory.release_reserve` | تحرير حجز من المخزون | Release reserved quantity |

#### 3.2 توزيع الصلاحيات على الأدوار:

| الصلاحية | مدير النظام | مالك | مدير شركة | مدير فرع | محاسب | أمين صندوق | أمين مستودع | مندوب مبيعات |
|----------|------------|------|----------|---------|------|-----------|------------|------------|
| `sales.confirm` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅* |
| `sales.approve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `sales.edit_confirmed` | ✅ | ✅ | ✅ | ⚙️ | ❌ | ❌ | ❌ | ❌ |
| `sales.cancel_confirmed` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `delivery.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `delivery.execute` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `delivery.view_all` | ✅ | ✅ | ✅ | ✅ | 👁️ | ❌ | ✅ | 👁️ |
| `inventory.reserve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `inventory.release_reserve` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

> ✅* = مع قيد (فقط مستنداته) | ⚙️ = حسب الإعدادات | 👁️ = قراءة فقط

---

### المرحلة 4️⃣ — إشعارات المستودع والموافقات
> **الهدف**: أمين المستودع يرى المستندات الجاهزة ويتلقى إشعارات

#### 4.1 جدول الإشعارات (`notifications`):
```sql
-- جدول الإشعارات (إذا غير موجود)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,           -- المستلم
    title_ar TEXT,
    title_en TEXT,
    body_ar TEXT,
    body_en TEXT,
    type TEXT NOT NULL,              -- 'approval_request', 'confirmation', 'delivery_ready', 'status_change'
    priority TEXT DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
    source_doc_type TEXT,            -- 'sales_order', 'invoice', 'delivery_note'
    source_doc_id UUID,
    source_doc_number TEXT,
    action_url TEXT,                 -- رابط للفتح المباشر
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID
);
```

#### 4.2 أنواع الإشعارات:

| النوع | المرسل | المستقبل | المحتوى |
|------|--------|---------|--------|
| `approval_request` | الموظف (عند الحفظ) | المدير | "أمر بيع جديد بحاجة لموافقتك - 15,000 USD" |
| `approval_granted` | المدير (عند الموافقة) | الموظف | "تمت الموافقة ✅ — يمكنك الآن تأكيد الأمر" |
| `approval_rejected` | المدير (عند الرفض) | الموظف | "تم الرفض ❌ — السبب: السعر غير مناسب" |
| `confirmation_sent` | الموظف (عند التأكيد) | أمين المستودع | "أمر بيع مؤكد جاهز للتجهيز 📦" |
| `delivery_ready` | أمين المستودع (عند التجهيز) | الموظف | "إذن التسليم جاهز 🚚" |
| `delivery_executed` | أمين المستودع (عند التنفيذ) | الموظف + المحاسب | "تم التسليم ✅ — الفاتورة جاهزة" |

---

### المرحلة 5️⃣ — تعديل المستند المؤكد (Edit After Confirm)
> **الهدف**: صلاحية تعديل محكومة بالأدوار والإعدادات

#### 5.1 قواعد التعديل:

```
                هل المستند مؤكد؟
                      ↓ نعم
           هل allow_edit_after_confirm = true?
                      ↓ نعم
            هل الـ role في edit_after_confirm_roles?
                      ↓ نعم
              هل تم إنشاء إذن تسليم؟
                 ↓ نعم         ↓ لا
          هل الإذن draft؟    ← يمكن التعديل
              ↓ نعم
        يمكن التعديل مع      ↓ لا (مُنفّذ)
        تحديث الإذن          ❌ لا يمكن التعديل
```

#### 5.2 أنواع التعديل المسموحة:

| التعديل | مسموح بعد التأكيد | مسموح بعد إذن تسليم (draft) | مسموح بعد التنفيذ |
|--------|-------------------|---------------------------|------------------|
| تعديل الكمية | ✅ (مع تحديث الإذن) | ✅ (مع تحديث الإذن) | ❌ |
| إضافة صنف | ✅ | ✅ | ❌ |
| حذف صنف | ✅ | ⚠️ (إذا لم يُجهز) | ❌ |
| تعديل السعر | ✅ | ✅ | ❌ |
| تغيير العميل | ❌ | ❌ | ❌ |
| تعديل الملاحظات | ✅ | ✅ | ✅ |
| إلغاء المستند | ✅ (يلغي الإذن أيضاً) | ✅ (يلغي الإذن) | ❌ (مرتجع فقط) |

---

## 🏗️ الملفات المطلوب إنشاؤها/تعديلها

### ملفات جديدة:
| # | الملف | الوصف |
|---|------|-------|
| 1 | `ConfirmationDialog.tsx` | Dialog تأكيد ذكي مع فحوصات |
| 2 | `confirmationService.ts` | خدمة التأكيد والموافقة |
| 3 | `notificationService.ts` | خدمة الإشعارات |
| 4 | `20260211_confirmation_workflow.sql` | Migration: إعدادات + إشعارات + أعمدة جديدة |
| 5 | `company_workflow_settings` UI | صفحة إعدادات الوورك فلو في الإعدادات |

### ملفات تُعدّل:
| # | الملف | التعديل |
|---|------|--------|
| 1 | `tradeConfigs.ts` | إضافة action: `confirm`, `approve` |
| 2 | `UnifiedAccountingSheet.tsx` | إضافة case 'confirm' + case 'approve' |
| 3 | `types.ts` | إضافة `onConfirm`, `onApprove` callbacks |
| 4 | `roles` permissions JSONB | إضافة الصلاحيات الجديدة |

---

## 📐 ترتيب التنفيذ المقترح

### ✅ الآن (المرحلة 1 + جزء من 3):
1. **ConfirmationDialog.tsx** — الـ Dialog الذكي ✨
2. **confirmationService.ts** — خدمة التأكيد  
3. **تعديل tradeConfigs + UnifiedAccountingSheet** — ربط الزر
4. **Migration**: أعمدة `confirmed_at`, `confirmed_by`, `approval_status`

### 🔜 المرحلة التالية (2 + 4):
5. **company_workflow_settings** — جدول الإعدادات
6. **نظام الموافقة** — إشعار المدير + قبول/رفض
7. **notifications** — جدول + خدمة + UI بسيط

### 📋 مستقبلاً (5):
8. **Edit After Confirm** — منطق التعديل المحكوم
9. **لوحة أمين المستودع** — طلبات التسليم الجاهزة
10. **Telegram Integration** — إشعارات خارجية

---

## ⚡ ملاحظات مهمة

### 🔐 الأمان:
- كل عملية تأكيد تتحقق من الصلاحية server-side (ليس فقط UI)
- `status_history` يسجل كل تغيير مع user_id وtimestamp
- RLS يمنع الوصول غير المصرح

### 🎨 التصميم:
- الزر يظهر فقط عندما يكون المستند في حالة `saved/draft`
- بعد التأكيد: بادج أخضر + قفل المستند + أيقونة ✅
- الـ Dialog يستخدم glassmorphism + animations

### 🔄 التوافق:
- يعمل مع النظام الحالي بدون كسر
- إعدادات الوورك فلو اختيارية (defaults معقولة)
- التأكيد بدون موافقة مدير = السلوك الافتراضي
