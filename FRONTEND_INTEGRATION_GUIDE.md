# دليل ربط Frontend مع Supabase
# Frontend Integration Guide

## ✅ ما تم إنجازه

### 1. تحديث Supabase Client (`src/lib/supabase.ts`)
- ✅ إضافة Helper Functions للمulti-Tenant:
  - `getCurrentTenantId()` - الحصول على tenant_id من metadata
  - `getCurrentTenantIdAsync()` - الحصول على tenant_id من السيرفر
  - `getCurrentCompanyId()` - الحصول على company_id
  - `isSuperAdmin()` - التحقق من Super Admin

### 2. إنشاء Auth Service (`src/services/authService.ts`)
- ✅ `signInWithMetadata()` - تسجيل دخول مع تحديث metadata
- ✅ `checkSuperAdmin()` - التحقق من Super Admin
- ✅ `getCurrentUserWithMetadata()` - الحصول على المستخدم مع metadata
- ✅ `updateUserMetadata()` - تحديث metadata
- ✅ `registerNewSubscriber()` - تسجيل مشترك جديد مع تعيين tenant

### 3. تحديث useAuth Hook (`src/hooks/useAuth.ts`)
- ✅ دعم `authUser` مع `tenant_id`, `company_id`, `is_super_admin`
- ✅ تحديث `login()` ليستخدم `signInWithMetadata()`
- ✅ إضافة `tenantId`, `companyId`, `isSuperAdmin` في return

### 4. تحديث Accounts Service (`src/services/accountsService.ts`)
- ✅ استخدام `chart_of_accounts` بدلاً من `accounts`
- ✅ إضافة `tenant_id` في جميع الاستعلامات
- ✅ استخدام `getCurrentTenantIdAsync()` للحصول على tenant_id

### 5. إنشاء Journal Entries Service (`src/services/journalEntriesService.ts`)
- ✅ `getAll()` - جلب جميع القيود
- ✅ `getById()` - جلب قيد مع بنوده
- ✅ `create()` - إنشاء قيد جديد مع التحقق من التوازن
- ✅ `post()` - ترحيل القيد
- ✅ `update()` - تحديث القيد
- ✅ `delete()` - حذف القيد (فقط إذا كان draft)

---

## 📋 الخطوات التالية

### الخطوة 1: إعداد متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**كيفية الحصول على القيم:**
1. اذهب إلى Supabase Dashboard
2. Settings → API
3. انسخ `Project URL` → `VITE_SUPABASE_URL`
4. انسخ `anon public` key → `VITE_SUPABASE_ANON_KEY`

### الخطوة 2: تحديث Login Component

في `src/features/auth/Login.tsx`، استخدم `useAuth` hook:

```tsx
import { useAuth } from '@/hooks/useAuth';

function Login() {
  const { login, tenantId, companyId, isSuperAdmin } = useAuth();
  
  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    if (!result.error) {
      // بعد تسجيل الدخول، tenant_id و company_id متاحان تلقائياً
      console.log('Tenant ID:', tenantId);
      console.log('Company ID:', companyId);
      console.log('Is Super Admin:', isSuperAdmin);
    }
  };
}
```

### الخطوة 3: استخدام Journal Entries Service

في أي component للمحاسبة:

```tsx
import { journalEntriesService } from '@/services/journalEntriesService';
import { useAuth } from '@/hooks/useAuth';

function JournalEntriesPage() {
  const { companyId } = useAuth();
  
  // جلب القيود
  const loadEntries = async () => {
    if (!companyId) return;
    
    const entries = await journalEntriesService.getAll(companyId, {
      status: 'draft',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
    });
  };
  
  // إنشاء قيد جديد
  const createEntry = async () => {
    if (!companyId) return;
    
    const newEntry = await journalEntriesService.create({
      company_id: companyId,
      entry_date: '2024-01-15',
      description: 'قيد تجريبي',
      lines: [
        {
          account_id: 'account-uuid-1',
          debit: 1000,
          credit: 0,
          description: 'مدين',
        },
        {
          account_id: 'account-uuid-2',
          debit: 0,
          credit: 1000,
          description: 'دائن',
        },
      ],
    });
  };
}
```

### الخطوة 4: استخدام Accounts Service

```tsx
import { accountsService } from '@/services/accountsService';
import { useAuth } from '@/hooks/useAuth';

function ChartOfAccountsPage() {
  const { companyId } = useAuth();
  
  const loadAccounts = async () => {
    if (!companyId) return;
    
    // جلب جميع الحسابات
    const accounts = await accountsService.getAll(companyId);
    
    // جلب حسابات حسب النوع
    const assets = await accountsService.getByType(companyId, 'asset');
  };
}
```

---

## 🔒 كيف يعمل RLS (Row Level Security)

### تلقائياً:
1. عند تسجيل الدخول، يتم تحديث `user_metadata` بـ `tenant_id` و `company_id`
2. Supabase يقرأ هذه القيم من JWT token
3. RLS Policies تتحقق من `tenant_id` تلقائياً
4. المستخدم يرى فقط بيانات `tenant_id` الخاص به

### Super Admin:
- إذا كان `is_super_admin = true` في metadata، يمكنه رؤية جميع البيانات
- RLS Policies تتحقق من `is_super_admin` تلقائياً

---

## 🧪 اختبار الربط

### 1. اختبار تسجيل الدخول:
```tsx
const { login, tenantId, companyId } = useAuth();
await login('user@example.com', 'password');
console.log('Tenant ID:', tenantId); // يجب أن يكون موجود
```

### 2. اختبار جلب القيود:
```tsx
const entries = await journalEntriesService.getAll(companyId);
console.log('Entries:', entries); // يجب أن يظهر فقط قيود tenant_id الخاص بك
```

### 3. اختبار إنشاء قيد:
```tsx
const entry = await journalEntriesService.create({
  company_id: companyId,
  entry_date: new Date().toISOString().split('T')[0],
  description: 'قيد تجريبي',
  lines: [
    { account_id: 'account-1', debit: 1000, credit: 0 },
    { account_id: 'account-2', debit: 0, credit: 1000 },
  ],
});
console.log('Created Entry:', entry);
```

---

## ⚠️ ملاحظات مهمة

1. **tenant_id مطلوب**: جميع الاستعلامات تحتاج `tenant_id` - يتم الحصول عليه تلقائياً من metadata
2. **RLS يعمل تلقائياً**: لا حاجة لإضافة `.eq('tenant_id', ...)` يدوياً - RLS يضيفه تلقائياً
3. **Super Admin**: يمكنه رؤية جميع البيانات بدون قيود
4. **Error Handling**: تأكد من معالجة الأخطاء في جميع الاستعلامات

---

## 📝 الملفات المحدثة

- ✅ `src/lib/supabase.ts` - Supabase Client مع Multi-Tenant helpers
- ✅ `src/services/authService.ts` - Auth Service جديد
- ✅ `src/hooks/useAuth.ts` - useAuth hook محدث
- ✅ `src/services/accountsService.ts` - Accounts Service محدث
- ✅ `src/services/journalEntriesService.ts` - Journal Entries Service جديد

---

## 🚀 الخطوة التالية

1. إعداد `.env` file
2. تحديث Login component
3. اختبار تسجيل الدخول
4. اختبار جلب البيانات
5. اختبار إنشاء قيد جديد

**هل تريد المساعدة في أي خطوة محددة؟**
