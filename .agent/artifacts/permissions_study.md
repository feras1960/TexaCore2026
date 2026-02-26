# 📋 دراسة نظام الصلاحيات — تعديل المستندات المرحّلة (Phase F)

> **تاريخ: 2026-02-18**
> **الهدف:** دراسة كاملة لنظام الصلاحيات الحالي واقتراح خطة لدمج صلاحيات التعديل

---

## 📊 1. الوضع الحالي — ملخص تنفيذي

### ✅ ما هو مبني وجاهز
| المكون | الحالة | الملف |
|--------|--------|-------|
| جدول `roles` | ✅ مبني | `20260205_complete_rbac_system.sql` |
| جدول `user_roles` | ✅ مبني | نفس الملف |
| جدول `visibility_rules` | ✅ مبني | نفس الملف |
| جدول `user_resource_access` | ✅ مبني | نفس الملف |
| `rbacService.ts` (1173 سطر) | ✅ مبني | `src/services/rbacService.ts` |
| `useRBAC.ts` hook (518 سطر) | ✅ مبني | `src/hooks/useRBAC.ts` |
| `PermissionGuard` component | ✅ مبني | `src/hooks/useRBAC.ts` |
| `HiddenField` component | ✅ مبني | `src/hooks/useRBAC.ts` |
| 10 أدوار افتراضية | ✅ مسجلة | قاعدة البيانات |
| SQL Functions | ✅ مبنية | `check_user_permission()`, `check_visibility()` |

### ⚠️ ما ينقص (خاص بتعديل المستندات)
| المكون | الحالة | الملف |
|--------|--------|-------|
| صلاحية `can_edit_posted_purchases` | ❌ غير موجودة | — |
| صلاحية `can_edit_posted_sales` | ❌ غير موجودة | — |
| صلاحية `can_edit_posted_journal` | ❌ غير موجودة | — |
| صلاحية `can_edit_closed_period` | ❌ غير موجودة | — |
| فحص الصلاحيات في `inPlaceEditService` | ❌ غير مفعّل | `src/services/inPlaceEditService.ts` سطر 61 |
| فحص الصلاحيات في واجهة التعديل | ❌ غير مفعّل | — |

---

## 🏗️ 2. البنية الحالية لنظام الصلاحيات (RBAC Architecture)

### 2.1 هيكل الصلاحيات في الأدوار

الصلاحيات مخزنة كـ **JSONB** في جدول `roles` بالشكل:

```json
{
  "accounting": ["read", "write", "delete"],
  "sales": ["read", "write"],
  "inventory": ["read"]
}
```

**أنواع الصلاحيات المتاحة حالياً:**
```typescript
export type Permission = 'read' | 'write' | 'delete';
```

### 2.2 الأدوار المسجلة (10 أدوار)

| # | الكود | المستوى | الصلاحيات |
|---|-------|---------|-----------|
| 1 | `super_admin` | system | `{"all": true}` — كل شيء |
| 2 | `tenant_owner` | tenant | read/write/delete لكل الموديولات |
| 3 | `company_admin` | company | read/write/delete لأغلب الموديولات |
| 4 | `branch_manager` | branch | read/write للمبيعات والمشتريات والمحاسبة |
| 5 | `accountant` | operations | read/write/delete للمحاسبة، read/write للمشتريات |
| 6 | `cashier` | operations | read/write/delete للخزينة، read/write للمبيعات |
| 7 | `warehouse_manager` | operations | read/write/delete للمخزون والمستودعات |
| 8 | `sales_rep` | operations | read/write/delete للمبيعات |
| 9 | `purchasing_manager` | operations | read/write/delete للمشتريات |
| 10 | `viewer` | custom | read فقط لكل شيء |

### 2.3 آلية الفحص (Flow)

```
المستخدم يضغط "تعديل"
     ↓
useRBAC().hasPermission('accounting', 'write')
     ↓
يتحقق من userPermissions[module].includes(permission)
     ↓
إذا كان super_admin → يمر مباشرة (permissions.all = true)
     ↓
النتيجة: true / false
```

### 2.4 مكونات الحماية (Guards)

```tsx
// في أي مكون:
const { hasPermission, isAdmin } = useRBAC();

// حماية بالشرط المباشر
if (!hasPermission('accounting', 'write')) return null;

// أو باستخدام PermissionGuard
<PermissionGuard module="accounting" permission="write">
  <EditButton />
</PermissionGuard>
```

---

## ❓ 3. المشكلة: لماذا لا يكفي النظام الحالي؟

### 3.1 الصلاحيات الحالية عامة جداً

النظام الحالي يعرف فقط:
- `read` — قراءة
- `write` — كتابة/تعديل
- `delete` — حذف

**المشكلة:** لا يوجد تمييز بين:
- ✏️ تعديل مستند **مسودة** (draft) ← أي كاتب يمكنه
- ✏️ تعديل مستند **مرحّل** (posted) ← يحتاج صلاحية خاصة
- ✏️ تعديل في **فترة مقفلة** (closed period) ← يحتاج مدير فقط

### 3.2 `inPlaceEditService` لا يفحص الصلاحيات

حالياً في `checkEditEligibility`:
```typescript
export interface EditEligibilityInput {
    documentType: EditableDocumentType;
    documentId: string;
    userId: string;
    // userPermissions?: string[]; // صلاحيات المستخدم — مستقبلاً  ← هذا تعليق!
}
```

الفحص الحالي يعتمد فقط على **حالة المستند** (stage, is_posted, receipt_mode) ولا يتحقق من **دور المستخدم** أبداً.

---

## 🎯 4. المقترحات — 3 خيارات مع مقارنة

### الخيار A: توسيع Permission Type (إضافة أنواع جديدة)

**الفكرة:** إضافة أنواع صلاحيات جديدة لـ `Permission`:

```typescript
// قبل
export type Permission = 'read' | 'write' | 'delete';

// بعد
export type Permission = 'read' | 'write' | 'delete' 
    | 'edit_posted' | 'edit_closed_period';
```

ثم تخزين في الأدوار:
```json
{
  "accounting": ["read", "write", "delete", "edit_posted"],
  "purchases": ["read", "write", "edit_posted"],
  "sales": ["read", "write"]
}
```

| ✅ المزايا | ❌ العيوب |
|-----------|----------|
| بسيط ومباشر | يخلط بين أنواع مختلفة من الصلاحيات |
| يتكامل مع النظام الحالي مباشرة | لا يميز بين مشتريات ومبيعات |
| لا يحتاج migration لتغيير هيكل الجداول | صعب التوسع مستقبلاً |

---

### الخيار B: إضافة `special_permissions` JSONB منفصل ⭐ (الموصى به)

**الفكرة:** إضافة حقل `special_permissions` في جدول `roles`:

```sql
ALTER TABLE roles ADD COLUMN special_permissions JSONB DEFAULT '{}'::jsonb;
-- مثال:
-- {
--   "can_edit_posted_purchases": true,
--   "can_edit_posted_sales": true,
--   "can_edit_posted_journal": true,
--   "can_edit_closed_period": false,
--   "can_delete_posted": false,
--   "can_void_documents": true
-- }
```

ثم في `useRBAC`:
```typescript
// إضافة method جديدة
hasSpecialPermission: (permission: string) => boolean;
```

وفي `inPlaceEditService`:
```typescript
// إضافة فحص الصلاحيات
async checkEditEligibility(input: EditEligibilityInput): Promise<EditEligibilityResult> {
    // ... الفحوصات الحالية ...
    
    // فحص الصلاحيات الخاصة
    const specialPerm = `can_edit_posted_${input.documentType === 'journal_entry' ? 'journal' : input.documentType}`;
    const hasEditPostedPerm = await rbacService.checkSpecialPermission(input.userId, specialPerm);
    
    if (isPosted && !hasEditPostedPerm) {
        return { canEdit: false, reason: 'لا تملك صلاحية تعديل المستندات المرحّلة', ... };
    }
}
```

| ✅ المزايا | ❌ العيوب |
|-----------|----------|
| فصل واضح بين صلاحيات عامة وخاصة | يحتاج migration |
| سهل الفهم والتوسع | يحتاج تحديث واجهة إدارة الأدوار |
| لا يؤثر على النظام الحالي | حقل إضافي في كل دور |
| يمكن إضافة صلاحيات جديدة بدون تغيير الكود | |
| يدعم صلاحيات مستقبلية (حذف، إلغاء، ...) | |

---

### الخيار C: استخدام `permissions` الحالي مع module خاص

**الفكرة:** إنشاء module وهمي `edit_controls`:

```json
{
  "accounting": ["read", "write"],
  "edit_controls": ["edit_posted_purchases", "edit_posted_sales", "edit_closed_period"]
}
```

| ✅ المزايا | ❌ العيوب |
|-----------|----------|
| لا يحتاج أي تعديل في البنية | يكسر المعنى الأصلي لـ Permission type |
| يعمل مباشرة مع hasPermission | `'edit_posted_purchases'` ليس من نوع `Permission` |
| | حل "hack" وليس تصميمياً |

---

## ⭐ 5. التوصية: الخيار B — `special_permissions`

### 5.1 الصلاحيات الخاصة المقترحة

| الصلاحية | الوصف | المستوى الافتراضي |
|----------|-------|-------------------|
| `can_edit_posted_purchases` | تعديل فواتير مشتريات مرحّلة | `tenant_owner`, `company_admin`, `accountant` |
| `can_edit_posted_sales` | تعديل فواتير مبيعات مرحّلة | `tenant_owner`, `company_admin`, `accountant` |
| `can_edit_posted_journal` | تعديل قيود محاسبية مرحّلة | `tenant_owner`, `company_admin`, `accountant` |
| `can_edit_closed_period` | تعديل في فترة محاسبية مقفلة | `tenant_owner` فقط |
| `can_delete_posted` | حذف مستندات مرحّلة | `tenant_owner` فقط |
| `can_void_documents` | إلغاء مستندات (void) | `tenant_owner`, `company_admin` |

### 5.2 مصفوفة الصلاحيات الافتراضية

| الدور | edit_posted_purchases | edit_posted_sales | edit_posted_journal | edit_closed_period | delete_posted | void_documents |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| `super_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tenant_owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `company_admin` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `branch_manager` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `accountant` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `cashier` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `warehouse_manager` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `sales_rep` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `purchasing_manager` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `viewer` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🔧 6. خطة التنفيذ (إذا تمت الموافقة)

### المرحلة F-1: Migration (SQL)
```sql
-- 1. إضافة عمود special_permissions
ALTER TABLE roles ADD COLUMN IF NOT EXISTS special_permissions JSONB DEFAULT '{}'::jsonb;

-- 2. تحديث الأدوار الحالية بالقيم الافتراضية
UPDATE roles SET special_permissions = '{
  "can_edit_posted_purchases": true,
  "can_edit_posted_sales": true,
  "can_edit_posted_journal": true,
  "can_edit_closed_period": true,
  "can_delete_posted": true,
  "can_void_documents": true
}'::jsonb WHERE code = 'super_admin';

-- ... وهكذا لكل دور

-- 3. إنشاء SQL function للتحقق
CREATE OR REPLACE FUNCTION check_special_permission(
    p_user_id UUID,
    p_permission VARCHAR(100)
) RETURNS BOOLEAN AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### المرحلة F-2: تحديث rbacService.ts
```typescript
// إضافة method جديدة
async checkSpecialPermission(userId: string, permission: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    for (const ur of userRoles) {
        const role = ur.role;
        if (!role) continue;
        if (role.permissions?.all === true) return true;
        if (role.special_permissions?.[permission] === true) return true;
    }
    return false;
}
```

### المرحلة F-3: تحديث useRBAC.ts
```typescript
// إضافة state
const [specialPermissions, setSpecialPermissions] = useState<Record<string, boolean>>({});

// إضافة method
const hasSpecialPermission = useCallback((permission: string): boolean => {
    if (userPermissions.all) return true;
    return specialPermissions[permission] === true;
}, [userPermissions, specialPermissions]);
```

### المرحلة F-4: دمج في inPlaceEditService.ts
```typescript
// تحديث EditEligibilityInput
export interface EditEligibilityInput {
    documentType: EditableDocumentType;
    documentId: string;
    userId: string;
    userSpecialPermissions?: Record<string, boolean>; // ← جديد
}

// إضافة فحص داخل checkEditEligibility
if (isPosted && !input.userSpecialPermissions?.can_edit_posted_...) {
    return { canEdit: false, reason: 'لا تملك صلاحية...', editMode: 'full', restrictions: ['no_permission'] };
}
```

### المرحلة F-5: تحديث الواجهة (UI Guard)
```tsx
// في UnifiedAccountingSheet / حيث يُستخدم زر التعديل
const { hasSpecialPermission } = useRBAC();
const canEditPosted = hasSpecialPermission('can_edit_posted_purchases');

<PermissionGuard specialPermission="can_edit_posted_purchases">
  <EditButton />
</PermissionGuard>
```

---

## 📊 7. تقدير الجهد

| المرحلة | المهمة | الوقت المقدر |
|---------|--------|-------------|
| F-1 | SQL Migration | 10 دقائق |
| F-2 | تحديث rbacService | 15 دقيقة |
| F-3 | تحديث useRBAC hook | 15 دقيقة |
| F-4 | دمج في inPlaceEditService | 20 دقيقة |
| F-5 | تحديث الواجهة | 15 دقيقة |
| | **المجموع** | **~75 دقيقة** |

---

## ⚡ 8. أسئلة مفتوحة (تحتاج قرارك)

### سؤال 1: هل نريد خيار B (special_permissions) أم خيار بديل؟
> الخيار B يضيف عمود JSONB جديد `special_permissions` في جدول `roles`. هذا يفصل الصلاحيات الخاصة عن الصلاحيات العامة (read/write/delete).

### سؤال 2: مَن يحق له تعديل المستندات المرحّلة؟
> المقترح: `tenant_owner` + `company_admin` + `accountant` + `purchasing_manager` (للمشتريات فقط)
> هل توافق على هذا التوزيع أم تريد تعديله؟

### سؤال 3: الفترات المقفلة — هل `tenant_owner` فقط أم أيضاً `company_admin`؟
> المقترح: `tenant_owner` فقط. هذا قرار حساس جداً.

### سؤال 4: هل branch_manager يحق له تعديل مبيعات مرحّلة في فرعه؟
> المقترح: نعم (branch_manager يحصل على `can_edit_posted_sales`). هل توافق؟

### سؤال 5: هل نبدأ التنفيذ الآن أم ننتظر؟
> الدراسة جاهزة والبنية التحتية موجودة. التنفيذ يحتاج ~75 دقيقة.

---

## 📌 ملاحظات مهمة

> **1. التوافق العكسي:** الحل المقترح لا يكسر أي شيء موجود. كل ما هو موجود يبقى كما هو، والصلاحيات الجديدة إضافية.

> **2. Super Admin:** يبقى يمر من كل الفحوصات تلقائياً (permissions.all = true).

> **3. الإعدادات المحاسبية:** `editFlowService.ts` يحتوي على إعدادات محاسبية (AccountingSettings) لها علاقة بالتعديل. هذه الإعدادات تعمل على مستوى الشركة وهي **مكملة** للصلاحيات — الإعدادات تقول "هل يسمح النظام بالتعديل المباشر" والصلاحيات تقول "هل هذا المستخدم مسموح له".

> **4. Activity Log:** كل تعديل على مستند مرحّل يُسجّل تلقائياً في `activity_log` و `edit_history` — هذا موجود ومبني بالفعل.
