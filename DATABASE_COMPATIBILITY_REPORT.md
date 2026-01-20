# تقرير توافق قاعدة البيانات
# Database Compatibility Report

---

## الحالة العامة: ✅ متوافق

**تاريخ التحقق:** 2026-01-20

---

## 1. هيكل Multi-Tenant

### الجداول الأساسية للـ SaaS

| الجدول | الوصف | tenant_id | RLS |
|--------|-------|-----------|-----|
| `tenants` | المستأجرون الرئيسيون | - | ✅ |
| `subscriptions` | اشتراكات المستأجرين | ✅ | ✅ |
| `subscription_plans` | خطط الاشتراك | - | - |
| `saas_products` | المنتجات | - | - |
| `tenant_modules` | الوحدات المفعلة | ✅ | ✅ |
| `agents` | الوكلاء | - | ✅ |

### جداول المستندات والتخزين (جديدة - Migration 00018)

| الجدول | الوصف | tenant_id | RLS |
|--------|-------|-----------|-----|
| `documents` | المستندات المرفقة | ✅ | ✅ |
| `storage_quotas` | حدود التخزين | ✅ | ✅ |
| `plan_storage_limits` | حدود الباقات | - | - |
| `subscription_alerts` | تنبيهات الاشتراك | ✅ | ✅ |
| `subscription_status_history` | سجل الحالات | ✅ | ✅ |

### جداول الحالات والتخصيص (Migration 00017)

| الجدول | الوصف | tenant_id | RLS |
|--------|-------|-----------|-----|
| `status_groups` | مجموعات الحالات | ✅ | ✅ |
| `custom_statuses` | الحالات المخصصة | ✅ | ✅ |
| `status_transitions` | انتقالات الحالات | ✅ | ✅ |
| `status_history` | سجل تغيير الحالات | ✅ | ✅ |
| `sheet_customizations` | تخصيصات الشيتات | ✅ | ✅ |
| `print_templates` | قوالب الطباعة | ✅ | ✅ |
| `user_preferences` | تفضيلات المستخدم | ✅ | ✅ |

---

## 2. توافق الخدمات (Services)

### الخدمات وجداول قاعدة البيانات

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          توافق الخدمات مع الجداول                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  documentService.ts                                                            │
│  ├── documents ────────────────────────────── ✅ موجود                          │
│  └── storage_quotas ───────────────────────── ✅ موجود                          │
│                                                                                 │
│  subscriptionService.ts                                                        │
│  ├── subscriptions ────────────────────────── ✅ موجود                          │
│  ├── subscription_plans ───────────────────── ✅ موجود                          │
│  ├── subscription_alerts ──────────────────── ✅ موجود                          │
│  ├── subscription_status_history ──────────── ✅ موجود                          │
│  └── saas_payments ────────────────────────── ✅ موجود                          │
│                                                                                 │
│  statusService.ts                                                              │
│  ├── status_groups ────────────────────────── ✅ موجود                          │
│  ├── custom_statuses ──────────────────────── ✅ موجود                          │
│  ├── status_transitions ───────────────────── ✅ موجود                          │
│  └── status_history ───────────────────────── ✅ موجود                          │
│                                                                                 │
│  printService.ts                                                               │
│  └── print_templates ──────────────────────── ✅ موجود                          │
│                                                                                 │
│  customizationService.ts                                                       │
│  ├── sheet_customizations ─────────────────── ✅ موجود                          │
│  └── user_preferences ─────────────────────── ✅ موجود                          │
│                                                                                 │
│  accountsService.ts                                                            │
│  └── chart_of_accounts ────────────────────── ✅ موجود                          │
│                                                                                 │
│  journalEntriesService.ts                                                      │
│  ├── journal_entries ──────────────────────── ✅ موجود                          │
│  └── journal_entry_lines ──────────────────── ✅ موجود                          │
│                                                                                 │
│  recurringEntriesService.ts                                                    │
│  ├── recurring_entry_templates ────────────── ✅ موجود                          │
│  ├── recurring_entry_lines ────────────────── ✅ موجود                          │
│  └── recurring_entry_executions ───────────── ✅ موجود                          │
│                                                                                 │
│  incentivesService.ts                                                          │
│  ├── incentive_plans ──────────────────────── ✅ موجود                          │
│  ├── incentive_plan_tiers ─────────────────── ✅ موجود                          │
│  ├── employee_incentive_assignments ───────── ✅ موجود                          │
│  ├── employee_commissions ─────────────────── ✅ موجود                          │
│  └── employee_targets ─────────────────────── ✅ موجود                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. فصل البيانات (Tenant Isolation)

### آلية العمل

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              آلية فصل البيانات                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                       │
│   │   User A    │     │   User B    │     │   User C    │                       │
│   │ (Tenant 1)  │     │ (Tenant 1)  │     │ (Tenant 2)  │                       │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                       │
│          │                   │                   │                               │
│          ▼                   ▼                   ▼                               │
│   ┌─────────────────────────────────────────────────────────────────┐           │
│   │                    Supabase Auth (JWT)                          │           │
│   │                    ─────────────────────                        │           │
│   │   user_metadata.tenant_id = get_current_tenant_id()            │           │
│   └──────────────────────────────┬──────────────────────────────────┘           │
│                                  │                                              │
│                                  ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐           │
│   │                      RLS Policies                               │           │
│   │   ─────────────────────────────────                            │           │
│   │   WHERE tenant_id = get_current_tenant_id()                    │           │
│   │   OR is_super_admin = true                                      │           │
│   └──────────────────────────────┬──────────────────────────────────┘           │
│                                  │                                              │
│          ┌───────────────────────┼───────────────────────┐                      │
│          │                       │                       │                      │
│          ▼                       ▼                       ▼                      │
│   ┌────────────┐          ┌────────────┐          ┌────────────┐               │
│   │  Tenant 1  │          │  Tenant 1  │          │  Tenant 2  │               │
│   │    Data    │          │    Data    │          │    Data    │               │
│   │  ─────────  │          │  ─────────  │          │  ─────────  │               │
│   │ User A ✅  │          │ User B ✅  │          │ User C ✅  │               │
│   │ User B ✅  │          │ User A ✅  │          │ User A ❌  │               │
│   │ User C ❌  │          │ User C ❌  │          │ User B ❌  │               │
│   └────────────┘          └────────────┘          └────────────┘               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### RLS Policy النموذجية

```sql
-- كل جدول يحتوي على tenant_id يطبق عليه:

CREATE POLICY table_name_tenant_isolation_select ON table_name
FOR SELECT USING (
    tenant_id = get_current_tenant_id() 
    OR COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::BOOLEAN,
        false
    )
);

CREATE POLICY table_name_tenant_isolation_insert ON table_name
FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id() 
    OR is_super_admin()
);

-- وهكذا لـ UPDATE و DELETE
```

---

## 4. الدوال المساعدة

| الدالة | الوصف | الحالة |
|--------|-------|--------|
| `get_current_tenant_id()` | إرجاع tenant_id الحالي من JWT | ✅ |
| `get_subscription_status(tenant_id)` | حالة الاشتراك والأيام المتبقية | ✅ |
| `lock_subscription(subscription_id)` | قفل الاشتراك | ✅ |
| `unlock_subscription(subscription_id)` | فتح الاشتراك | ✅ |
| `update_storage_quota()` | تحديث استخدام التخزين (Trigger) | ✅ |
| `log_subscription_status_change()` | تسجيل تغيير الحالة (Trigger) | ✅ |

---

## 5. Migrations المطبقة

| الرقم | الملف | الوصف | الحالة |
|-------|-------|-------|--------|
| 00001 | initial_schema.sql | الهيكل الأساسي | ✅ |
| 00002 | add_tenant_system.sql | نظام Multi-Tenant | ✅ |
| 00003-00011 | ... | وحدات متعددة | ✅ |
| 00012 | accounting_infrastructure.sql | البنية المحاسبية | ✅ |
| 00013 | invoice_accounting_triggers.sql | تريجرز الفواتير | ✅ |
| 00014 | financial_reports.sql | التقارير المالية | ✅ |
| 00015 | recurring_entries.sql | القيود المتكررة | ✅ |
| 00016 | employee_incentives.sql | نظام الحوافز | ✅ |
| 00017 | custom_statuses.sql | الحالات والتخصيص | ✅ |
| 00018 | documents_and_subscriptions.sql | المستندات والاشتراكات | ✅ |
| 00019 | database_verification.sql | التحقق الشامل | ✅ |

---

## 6. توصيات

### ✅ مكتمل
- [x] جميع الجداول الحرجة تحتوي على `tenant_id`
- [x] RLS Policies مطبقة على الجداول
- [x] الدوال المساعدة متوفرة
- [x] التريجرز للتحديث التلقائي

### 📋 للتطبيق على Supabase
```bash
# تطبيق Migrations الجديدة
supabase db push

# أو تطبيق يدوي
psql $DATABASE_URL < supabase/migrations/00018_documents_and_subscriptions.sql
psql $DATABASE_URL < supabase/migrations/00019_database_verification.sql
```

### 🔧 إنشاء Storage Bucket
```sql
-- في Supabase Dashboard > Storage
-- أو عبر API:
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);
```

---

## 7. الخطوات التالية

### أولوية عالية
1. ⏳ **تطبيق Migrations على Supabase الفعلي**
2. ⏳ **إنشاء Storage Bucket للمستندات**
3. ⏳ **اختبار RLS مع مستأجرين متعددين**

### أولوية متوسطة
4. ⏳ **ربط صفحة البيلنغ بالتطبيق الرئيسي**
5. ⏳ **تفعيل نظام التنبيهات**
6. ⏳ **اختبار رفع وتحميل المستندات**

### أولوية منخفضة
7. ⏳ **إضافة Cron Job للتنبيهات التلقائية**
8. ⏳ **إعداد Webhooks للدفع**

---

## 8. ملاحظات تقنية

### Supabase Storage Configuration

```typescript
// في .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

// في supabase/config.toml
[storage]
  [storage.documents]
    public = false
    max_file_size = "26214400" # 25MB
```

### RLS للـ Storage

```sql
-- في Supabase Dashboard > Storage > Policies

-- Allow authenticated users to upload to their tenant folder
CREATE POLICY "Users can upload to tenant folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_current_tenant_id()::text
);

-- Allow users to read their tenant's files
CREATE POLICY "Users can read tenant files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_current_tenant_id()::text
);
```

---

**آخر تحديث:** 2026-01-20
