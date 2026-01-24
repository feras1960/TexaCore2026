# 💻 معايير كتابة الكود - Texa Core

## ⚠️ القواعد الأساسية

> **هذه المعايير إلزامية ويجب اتباعها في كل الكود الجديد.**

---

## 📁 هيكل الملفات

### تسمية الملفات

```
✅ صحيح:
- AccountDetails.tsx        (PascalCase للمكونات)
- useAccountData.ts         (camelCase مع use للـ hooks)
- accountsService.ts        (camelCase للخدمات)
- account.config.ts         (kebab-case للتكوينات)
- TRANSLATION_RULES.md      (UPPER_SNAKE_CASE للتوثيق)

❌ خطأ:
- account-details.tsx
- AccountData.ts            (hook بدون use)
- Accounts_Service.ts
```

### تنظيم الملف

```typescript
// 1. الاستيرادات - مرتبة حسب النوع
// المكتبات الخارجية أولاً
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ثم المكتبات المحلية
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/providers/LanguageProvider';

// ثم الأنواع
import type { Account } from '@/types';

// 2. الأنواع والواجهات
interface AccountCardProps {
  account: Account;
  onEdit?: (id: string) => void;
}

// 3. الثوابت
const ANIMATION_DURATION = 0.3;

// 4. المكون الرئيسي
export function AccountCard({ account, onEdit }: AccountCardProps) {
  // ...
}

// 5. المكونات الفرعية (إن وجدت)
function AccountHeader() {
  // ...
}

// 6. التصدير الافتراضي (إن وجد)
export default AccountCard;
```

---

## 🔷 TypeScript

### الأنواع الصريحة

```typescript
// ✅ صحيح - أنواع صريحة
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

function getUserById(id: string): Promise<User | null> {
  // ...
}

// ❌ خطأ - any
function getUser(id: any): any {
  // ...
}
```

### استخدام Union Types

```typescript
// ✅ صحيح
type Status = 'active' | 'inactive' | 'pending';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: Size;
}

// ❌ خطأ
interface ButtonProps {
  variant: string;  // غير محدد
}
```

### Generics

```typescript
// ✅ صحيح - استخدام Generics للمكونات القابلة لإعادة الاستخدام
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

function Table<T extends Record<string, any>>({ data, columns }: TableProps<T>) {
  // ...
}
```

---

## ⚛️ React

### Function Components

```typescript
// ✅ صحيح - Function Component مع TypeScript
interface Props {
  title: string;
  onClose: () => void;
}

export function MyComponent({ title, onClose }: Props) {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={onClose}>{t('common.close')}</Button>
    </div>
  );
}

// ❌ خطأ - Class Component
class MyComponent extends React.Component {
  // لا نستخدم Class Components
}
```

### Hooks

```typescript
// ✅ ترتيب الـ Hooks
function MyComponent() {
  // 1. Context hooks أولاً
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // 2. State hooks
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  
  // 3. Refs
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 4. Custom hooks
  const { data: accounts } = useAccounts();
  
  // 5. Memoization
  const filteredData = useMemo(() => {
    return data?.filter(item => item.active);
  }, [data]);
  
  // 6. Callbacks
  const handleSubmit = useCallback(() => {
    // ...
  }, []);
  
  // 7. Effects
  useEffect(() => {
    // ...
  }, []);
  
  return (/* ... */);
}
```

### Custom Hooks

```typescript
// ✅ صحيح - Custom Hook
// src/hooks/useAccountData.ts
export function useAccountData(accountId: string) {
  const [data, setData] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await accountsService.getById(accountId);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [accountId]);
  
  return { data, loading, error };
}
```

---

## 🎨 Styling

### Tailwind CSS

```typescript
// ✅ صحيح - استخدام Tailwind
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
  <span className="text-sm font-medium text-gray-700">
    {t('common.name')}
  </span>
</div>

// ✅ صحيح - RTL Support
<div className="me-4 ms-2 ps-4 pe-4 text-start">

// ❌ خطأ - inline styles
<div style={{ marginRight: '16px' }}>

// ❌ خطأ - CSS modules
import styles from './Component.module.css';
```

### استخدام cn() للـ classes الشرطية

```typescript
import { cn } from '@/lib/utils';

// ✅ صحيح
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)}>

// ❌ خطأ - Template literals
<div className={`base ${isActive ? 'active' : ''}`}>
```

---

## 🔄 State Management

### Local State

```typescript
// ✅ للـ state البسيط
const [isOpen, setIsOpen] = useState(false);

// ✅ للـ state المعقد - استخدم useReducer
const [state, dispatch] = useReducer(reducer, initialState);
```

### Server State (React Query)

```typescript
// ✅ صحيح - استخدام React Query
import { useQuery, useMutation } from '@tanstack/react-query';

function AccountsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsService.getAll
  });
  
  const deleteMutation = useMutation({
    mutationFn: accountsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      toast.success(t('messages.deleted'));
    }
  });
  
  // ...
}
```

---

## 📝 التعليقات

### متى تكتب تعليق

```typescript
// ✅ لشرح "لماذا" وليس "ماذا"
// نستخدم setTimeout هنا لأن الـ DOM يحتاج وقت للتحديث
setTimeout(() => inputRef.current?.focus(), 100);

// ✅ للتحذيرات المهمة
// ⚠️ لا تغير هذا الترتيب - يؤثر على حساب الضريبة
const total = subtotal + tax + shipping;

// ❌ تعليق غير مفيد
// زيادة العداد
counter++;
```

### JSDoc للـ Functions العامة

```typescript
/**
 * حساب إجمالي الفاتورة مع الضريبة
 * @param items - عناصر الفاتورة
 * @param taxRate - نسبة الضريبة (افتراضي 15%)
 * @returns الإجمالي شامل الضريبة
 */
export function calculateInvoiceTotal(
  items: InvoiceItem[],
  taxRate: number = 0.15
): number {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  return subtotal * (1 + taxRate);
}
```

---

## 🔒 الأمان

### لا تخزن بيانات حساسة في الكود

```typescript
// ❌ ممنوع
const API_KEY = 'sk-1234567890';
const DB_PASSWORD = 'secret123';

// ✅ صحيح - استخدم environment variables
const API_KEY = import.meta.env.VITE_API_KEY;
```

### التحقق من المدخلات

```typescript
// ✅ صحيح
function processUserInput(input: string) {
  const sanitized = DOMPurify.sanitize(input);
  // ...
}
```

---

## ⚡ الأداء

### تجنب إعادة الرندر غير الضرورية

```typescript
// ✅ استخدم useMemo للحسابات المكلفة
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// ✅ استخدم useCallback للـ functions
const handleClick = useCallback((id: string) => {
  // ...
}, [dependency]);

// ✅ استخدم React.memo للمكونات النقية
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  // ...
});
```

### Lazy Loading

```typescript
// ✅ للصفحات والمكونات الكبيرة
const AccountingPage = lazy(() => import('@/features/accounting/Accounting'));

// في Router
<Suspense fallback={<PageLoader />}>
  <AccountingPage />
</Suspense>
```

---

## 📋 قائمة فحص قبل Commit

- [ ] لا توجد أخطاء TypeScript (`npm run type-check`)
- [ ] لا توجد أخطاء ESLint (`npm run lint`)
- [ ] جميع النصوص تستخدم `t('key')`
- [ ] الأنواع صريحة ولا توجد `any`
- [ ] الـ hooks مرتبة بشكل صحيح
- [ ] لا توجد console.log متروكة
- [ ] الكود مقروء ومنظم
- [ ] التعليقات مفيدة (إن وجدت)

---

## 📚 المراجع

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
