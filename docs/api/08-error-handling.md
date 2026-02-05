# ⚠️ معالجة الأخطاء
# Error Handling

---

## 📋 نظرة عامة

هذا الملف يوثق أنواع الأخطاء المتوقعة وكيفية التعامل معها.

---

## 1️⃣ أنواع الأخطاء

### أخطاء Supabase

| الكود | الوصف | السبب المحتمل |
|-------|-------|---------------|
| 400 | Bad Request | طلب غير صحيح |
| 401 | Unauthorized | غير مصادق عليه (JWT منتهي أو غير موجود) |
| 403 | Forbidden | غير مصرح (RLS يمنع الوصول) |
| 404 | Not Found | المورد غير موجود |
| 406 | Not Acceptable | الاستجابة لا تتطابق مع Accept header |
| 409 | Conflict | تعارض (مثل duplicate key) |
| 422 | Unprocessable Entity | البيانات غير صالحة |
| 429 | Too Many Requests | تجاوز حد الطلبات |
| 500 | Internal Server Error | خطأ في الخادم |

### أخطاء PostgreSQL الشائعة

| الكود | الاسم | الوصف |
|-------|-------|-------|
| 23505 | unique_violation | انتهاك قيد الفريد |
| 23503 | foreign_key_violation | انتهاك المفتاح الأجنبي |
| 23502 | not_null_violation | انتهاك NOT NULL |
| 23514 | check_violation | انتهاك قيد CHECK |
| 42501 | insufficient_privilege | صلاحيات غير كافية |
| P0001 | raise_exception | خطأ مُثار يدوياً |

---

## 2️⃣ هيكل الخطأ

### Supabase Error

```typescript
interface SupabaseError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
}

// مثال
{
  "message": "duplicate key value violates unique constraint \"customers_code_key\"",
  "details": "Key (code)=(C001) already exists.",
  "hint": null,
  "code": "23505"
}
```

### Auth Error

```typescript
interface AuthError {
  message: string;
  status: number;
}

// مثال
{
  "message": "Invalid login credentials",
  "status": 400
}
```

---

## 3️⃣ معالجة الأخطاء الأساسية

### Helper Function

```typescript
// lib/errorHandler.ts

export interface AppError {
  code: string;
  message: string;
  messageAr: string;
  details?: string;
}

export const handleSupabaseError = (error: any): AppError => {
  // أخطاء PostgreSQL
  if (error.code) {
    switch (error.code) {
      case '23505':
        return {
          code: 'DUPLICATE_KEY',
          message: 'This record already exists',
          messageAr: 'هذا السجل موجود مسبقاً',
          details: error.details
        };
      
      case '23503':
        return {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Cannot delete: record is referenced by other data',
          messageAr: 'لا يمكن الحذف: السجل مرتبط ببيانات أخرى',
          details: error.details
        };
      
      case '23502':
        return {
          code: 'NOT_NULL_VIOLATION',
          message: 'Required field is missing',
          messageAr: 'حقل مطلوب مفقود',
          details: error.details
        };
      
      case '23514':
        return {
          code: 'CHECK_VIOLATION',
          message: 'Value does not meet requirements',
          messageAr: 'القيمة لا تستوفي الشروط',
          details: error.details
        };
      
      case '42501':
        return {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission for this operation',
          messageAr: 'لا تملك صلاحية لهذه العملية',
          details: error.details
        };
      
      case 'P0001':
        // خطأ مخصص من الـ trigger أو function
        return {
          code: 'BUSINESS_RULE_VIOLATION',
          message: error.message,
          messageAr: error.message,
          details: error.details
        };
      
      default:
        return {
          code: error.code,
          message: error.message,
          messageAr: 'حدث خطأ غير متوقع',
          details: error.details
        };
    }
  }

  // أخطاء الشبكة
  if (error.message === 'Failed to fetch') {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      messageAr: 'فشل الاتصال بالشبكة'
    };
  }

  // أخطاء المصادقة
  if (error.status === 401) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Session expired. Please login again',
      messageAr: 'انتهت الجلسة. الرجاء تسجيل الدخول مجدداً'
    };
  }

  if (error.status === 403) {
    return {
      code: 'FORBIDDEN',
      message: 'Access denied',
      messageAr: 'الوصول مرفوض'
    };
  }

  // خطأ افتراضي
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    messageAr: 'حدث خطأ غير متوقع'
  };
};
```

---

## 4️⃣ الاستخدام في الـ Services

```typescript
// services/customersService.ts

import { supabase } from '@/lib/supabase';
import { handleSupabaseError, AppError } from '@/lib/errorHandler';

export class CustomerServiceError extends Error {
  public appError: AppError;
  
  constructor(appError: AppError) {
    super(appError.message);
    this.appError = appError;
    this.name = 'CustomerServiceError';
  }
}

export const customersService = {
  async create(customer: CreateCustomerInput) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) {
      throw new CustomerServiceError(handleSupabaseError(error));
    }

    return data;
  },

  async update(id: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new CustomerServiceError(handleSupabaseError(error));
    }

    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      const appError = handleSupabaseError(error);
      
      // تخصيص رسالة الحذف
      if (appError.code === 'FOREIGN_KEY_VIOLATION') {
        appError.messageAr = 'لا يمكن حذف العميل لأنه مرتبط بفواتير';
      }
      
      throw new CustomerServiceError(appError);
    }
  }
};
```

---

## 5️⃣ الاستخدام في Components

```tsx
import { useState } from 'react';
import { customersService, CustomerServiceError } from '@/services/customersService';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

export function CreateCustomerForm() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateCustomerInput) => {
    setLoading(true);
    
    try {
      const customer = await customersService.create(data);
      toast.success(isArabic ? 'تم إنشاء العميل بنجاح' : 'Customer created successfully');
      return customer;
    } catch (error) {
      if (error instanceof CustomerServiceError) {
        const message = isArabic ? error.appError.messageAr : error.appError.message;
        toast.error(message);
        
        // معالجة خاصة لأنواع معينة
        if (error.appError.code === 'DUPLICATE_KEY') {
          // تركيز على حقل الرمز
          setFieldError('code', message);
        }
      } else {
        toast.error(isArabic ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // ...
}
```

---

## 6️⃣ معالجة أخطاء RLS

```typescript
// عندما RLS يمنع الوصول، Supabase يعيد مصفوفة فارغة وليس خطأ
// لذلك نحتاج فحص إضافي

export const getCustomerById = async (id: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // PGRST116 = single() لم يجد سجل
    if (error.code === 'PGRST116') {
      throw new CustomerServiceError({
        code: 'NOT_FOUND',
        message: 'Customer not found or you do not have access',
        messageAr: 'العميل غير موجود أو لا تملك صلاحية الوصول'
      });
    }
    throw new CustomerServiceError(handleSupabaseError(error));
  }

  return data;
};
```

---

## 7️⃣ معالجة أخطاء المصادقة

```typescript
// hooks/useAuth.ts

import { supabase } from '@/lib/supabase';

export const handleAuthError = (error: any): AppError => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('invalid login credentials')) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      code: 'EMAIL_NOT_CONFIRMED',
      message: 'Please confirm your email first',
      messageAr: 'الرجاء تأكيد بريدك الإلكتروني أولاً'
    };
  }

  if (message.includes('user already registered')) {
    return {
      code: 'USER_EXISTS',
      message: 'This email is already registered',
      messageAr: 'هذا البريد الإلكتروني مسجل مسبقاً'
    };
  }

  if (message.includes('password') && message.includes('weak')) {
    return {
      code: 'WEAK_PASSWORD',
      message: 'Password is too weak',
      messageAr: 'كلمة المرور ضعيفة جداً'
    };
  }

  if (message.includes('session_not_found') || message.includes('jwt expired')) {
    return {
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired',
      messageAr: 'انتهت جلستك'
    };
  }

  return {
    code: 'AUTH_ERROR',
    message: error.message,
    messageAr: 'خطأ في المصادقة'
  };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw handleAuthError(error);
  }

  return data;
};
```

---

## 8️⃣ Error Boundary

```tsx
// components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // إرسال للـ logging service
    // logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-xl font-semibold text-red-600">
            حدث خطأ غير متوقع
          </h2>
          <p className="text-gray-600">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 9️⃣ Network Error Handling

```typescript
// lib/apiClient.ts

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // إعادة المحاولة فقط لأخطاء الشبكة
    if (
      retries > 0 && 
      (error.message === 'Failed to fetch' || error.code === 'NETWORK_ERROR')
    ) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

// الاستخدام
const data = await withRetry(() => 
  supabase.from('customers').select('*')
);
```

---

## 🔟 Global Error Handler

```typescript
// main.tsx أو App.tsx

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function GlobalErrorHandler({ children }) {
  useEffect(() => {
    // معالجة انتهاء الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
        
        if (event === 'SIGNED_OUT') {
          // إعادة التوجيه لصفحة الدخول
          window.location.href = '/login';
        }
      }
    );

    // معالجة الأخطاء غير الملتقطة
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      // يمكن إظهار toast أو إرسال للـ logging
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return children;
}
```

---

**التالي:** [types/](./types/) - TypeScript Types
