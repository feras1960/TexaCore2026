# 📋 توثيق نظام إدارة التعديلات والسنوات المالية
## Edit & Fiscal Year Management System - Complete Documentation

---

## 📅 معلومات التنفيذ
- **التاريخ:** 2026-02-04
- **الوقت:** 22:25 UTC
- **الحالة:** ✅ تم التنفيذ بنجاح على Supabase
- **النسخة:** Final v1.0

---

## 🎯 نظرة عامة على النظام

نظام إدارة التعديلات والسنوات المالية يوفر:

1. **نمطين لإدارة السنوات المالية:**
   - **المستقل (Independent):** كل سنة مستقلة، يمكن التعديل بحرية
   - **المترابط (Linked):** السنوات مترابطة، التصحيح عبر قيود تسوية

2. **سجل تعديلات شامل (Audit Log)**

3. **قيود تسوية مُرتبطة بالقيود الأصلية**

---

## 🗄️ التغييرات على قاعدة البيانات

### 1️⃣ حقل جديد في جدول `companies`

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    accounting_settings JSONB DEFAULT '{
        "fiscal_year_mode": "independent",
        "edit_settings": {...},
        "closed_period_settings": {...},
        "closed_year_settings": {...},
        "notifications": {...}
    }';
```

**البنية:**
```json
{
  "fiscal_year_mode": "independent" | "linked",
  "edit_settings": {
    "allow_direct_edit_posted": true,
    "auto_repost_after_save": true,
    "require_edit_reason": true,
    "notify_on_posted_edit": false
  },
  "closed_period_settings": {
    "allow_edit_closed_period": false,
    "require_manager_approval": true
  },
  "closed_year_settings": {
    "allow_edit_closed_year": true,
    "allow_delete_closed_year": false,
    "require_adjustment_entry": false,
    "auto_link_adjustments": true
  },
  "notifications": {
    "notify_cfo_on_closed_year_edit": true,
    "notify_on_large_adjustments": true,
    "large_adjustment_threshold": 10000
  }
}
```

---

### 2️⃣ جدول جديد: `adjustment_entries`

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | UUID | المعرّف الفريد |
| `tenant_id` | UUID | معرّف المستأجر |
| `company_id` | UUID | معرّف الشركة |
| `new_entry_id` | UUID | القيد الجديد (التسوية) |
| `original_entry_id` | UUID | القيد الأصلي |
| `adjustment_type` | VARCHAR | نوع التسوية |
| `reason` | TEXT | السبب |
| `status` | VARCHAR | الحالة (pending/approved/rejected) |

**أنواع التسوية:**
- `correction` - تصحيح خطأ
- `reclassification` - إعادة تصنيف
- `reversal` - قيد عكسي
- `prior_period` - تسوية سنة سابقة

---

### 3️⃣ جدول جديد: `document_edit_history`

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | UUID | المعرّف الفريد |
| `document_type` | VARCHAR | نوع المستند |
| `document_id` | UUID | معرّف المستند |
| `edit_type` | VARCHAR | نوع التعديل |
| `old_values` | JSONB | القيم القديمة |
| `new_values` | JSONB | القيم الجديدة |
| `reason` | TEXT | سبب التعديل |
| `edited_by` | UUID | المستخدم |
| `edited_at` | TIMESTAMPTZ | وقت التعديل |

**أنواع التعديل:**
- `direct_edit` - تعديل مباشر
- `unpost_edit` - إلغاء ترحيل وتعديل
- `adjustment` - قيد تسوية
- `delete` - حذف
- `restore` - استعادة

---

### 4️⃣ الدوال المساعدة

#### `get_company_accounting_settings(company_id)`
```sql
SELECT get_company_accounting_settings('uuid-here');
-- Returns: JSONB with accounting settings
```

#### `get_fiscal_year_mode(company_id)`
```sql
SELECT get_fiscal_year_mode('uuid-here');
-- Returns: 'independent' or 'linked'
```

#### `can_edit_journal_entry(entry_id, user_id)`
```sql
SELECT can_edit_journal_entry('entry-uuid');
-- Returns: JSONB with edit permissions
```

---

### 5️⃣ حقول مُضافة لـ `company_accounting_settings`

| الحقل | النوع | القيمة الافتراضية |
|-------|------|------------------|
| `auto_post_entries` | BOOLEAN | false |
| `require_approval` | BOOLEAN | true |
| `current_entry_number` | INTEGER | 1 |
| `default_sales_currency` | VARCHAR(3) | NULL (من عملة الشركة) |
| `default_purchase_currency` | VARCHAR(3) | NULL (من عملة الشركة) |
| `vat_enabled` | BOOLEAN | true |
| `vat_rate` | NUMERIC | 15 |
| `journal_entry_prefix` | VARCHAR(10) | 'JE' |
| `reset_numbering_yearly` | BOOLEAN | true |

---

## 💻 ملفات Frontend

### 1. `src/features/accounting/AccountingSettings.tsx`

**التغييرات الرئيسية:**
- ✅ تبويب جديد "التعديلات" (Edit Rules)
- ✅ اختيار نمط السنوات المالية
- ✅ إعدادات التعديل على القيود المُرحلة
- ✅ إعدادات السنوات المُغلقة
- ✅ إعدادات الإشعارات
- ✅ دعم العملات الديناميكية (من base_currency)

### 2. `src/services/editFlowService.ts`

```typescript
// الدوال المُتاحة:
getCompanyAccountingSettings(companyId: string)
canEditJournalEntry(entryId: string)
unpostJournalEntry(entryId: string)
repostJournalEntry(entryId: string)
logDocumentEdit(params: EditLogParams)
```

### 3. `src/hooks/useEditFlow.ts`

```typescript
// الـ Hook:
const {
  isEditing,
  canEdit,
  editMode,
  showReasonDialog,
  checkEditPermission,
  startEditFlow,
  completeEditFlow,
  cancelEditFlow
} = useEditFlow(documentId, documentType);
```

---

## 📊 نظام إدارة السنوات المالية

### النظام المستقل (Independent) 🏠

```
┌─────────────────────────────────────────────────────────────┐
│                    النظام المستقل                            │
├─────────────────────────────────────────────────────────────┤
│  2024 (مُغلقة)  │  2025 (مُغلقة)  │  2026 (مفتوحة)         │
│       ↓              ↓                   ↓                  │
│  يمكن التعديل   │  يمكن التعديل   │  يمكن التعديل          │
│  (مع تحذير)     │  (مع تحذير)     │  (بحرية)               │
└─────────────────────────────────────────────────────────────┘
```

- ✅ كل سنة مُغلقة مستقلة تماماً
- ✅ التعديل لا يؤثر على الأرصدة الافتتاحية للسنوات اللاحقة
- ⚡ مُوصى به للشركات الصغيرة والمتوسطة

### النظام المترابط (Linked) 🔗

```
┌─────────────────────────────────────────────────────────────┐
│                    النظام المترابط                           │
├─────────────────────────────────────────────────────────────┤
│  2024 (مُغلقة)  →  2025 (مُغلقة)  →  2026 (مفتوحة)         │
│       🔒              🔒                   ↓                 │
│  لا يمكن التعديل │  لا يمكن التعديل │  قيد تسوية هنا        │
└─────────────────────────────────────────────────────────────┘
```

- ❌ لا يمكن التعديل على السنوات المُغلقة
- ✅ التصحيح عبر قيد تسوية في السنة الحالية
- 🏢 مُوصى به للشركات الكبيرة والمُلزمة ضريبياً

---

## 🔐 الأمان

| الميزة | الحالة |
|--------|--------|
| RLS Policies | ✅ مُفعّلة |
| عزل البيانات حسب tenant_id | ✅ |
| Audit Log لجميع التعديلات | ✅ |
| SECURITY DEFINER للدوال | ✅ |

---

## 📁 ملفات المشروع

```
erpsystem supabase/
├── src/
│   ├── features/accounting/
│   │   └── AccountingSettings.tsx     # ✅ مُعدّل
│   ├── services/
│   │   └── editFlowService.ts         # ✅ جديد
│   └── hooks/
│       └── useEditFlow.ts             # ✅ جديد
├── supabase/migrations/
│   └── 20260204_edit_fiscal_year_management.sql  # ✅
└── docs/
    ├── database/
    │   └── EDIT_FISCAL_YEAR_SUPABASE_EXECUTION.md  # ✅
    ├── design/
    │   ├── FISCAL_YEAR_MANAGEMENT_SYSTEM.md
    │   └── FINAL_REVIEW_EDIT_FISCAL_SYSTEMS.md
    └── reports/
        ├── EDIT_PERIOD_IMPACT_ANALYSIS.md
        └── EDIT_AND_AUDIT_ANALYSIS.md
```

---

## ✅ قائمة التحقق النهائية

| المكون | الحالة | ملاحظات |
|--------|--------|---------|
| `companies.accounting_settings` | ✅ | JSONB مع قيم افتراضية |
| `adjustment_entries` | ✅ | جدول + RLS + Indexes |
| `document_edit_history` | ✅ | جدول + RLS + Indexes |
| `get_company_accounting_settings()` | ✅ | دالة SQL |
| `get_fiscal_year_mode()` | ✅ | دالة SQL |
| `can_edit_journal_entry()` | ✅ | دالة SQL |
| حقول `company_accounting_settings` | ✅ | 9 حقول جديدة |
| العملات الديناميكية | ✅ | من base_currency |
| Frontend UI | ✅ | تبويب التعديلات |
| Services | ✅ | editFlowService.ts |
| Hooks | ✅ | useEditFlow.ts |

---

## 🚀 الخطوات التالية (اختياري)

1. **تكامل Workflow:** ربط useEditFlow مع UnifiedAccountingSheet
2. **نموذج قيد التسوية:** واجهة إنشاء adjustment entries
3. **تقارير التعديلات:** عرض document_edit_history
4. **إشعارات CFO:** تنبيهات للتعديلات الكبيرة

---

**📅 تاريخ التوثيق:** 2026-02-04 22:25 UTC
**✍️ الحالة:** مكتمل ومُختبر
