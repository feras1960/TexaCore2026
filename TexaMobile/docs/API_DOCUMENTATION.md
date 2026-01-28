# 🔌 TexaMobile - API Documentation

**توثيق واجهات برمجة التطبيقات**

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المصادقة](#المصادقة)
3. [Supabase Client](#supabase-client)
4. [Auth Functions](#auth-functions)
5. [Biometric Functions](#biometric-functions)
6. [Database Schema](#database-schema)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## 🎯 نظرة عامة

### Base Configuration

```typescript
// Environment Variables
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

// Supabase Client
import { supabase } from '@/lib/supabase';
```

### Response Format

جميع الـ Functions ترجع كائن يحتوي:
```typescript
interface Response<T> {
  data?: T;
  error?: Error | null;
}
```

---

## 🔐 المصادقة

### Sign In

```typescript
/**
 * تسجيل دخول بـ Email/Password
 * @param email - البريد الإلكتروني
 * @param password - كلمة المرور
 * @returns {Promise<Response>} - جلسة المستخدم أو خطأ
 */
export const signIn = async (
  email: string,
  password: string
): Promise<{ data?: AuthSession; error: Error | null }> => {
  // Implementation...
}

// Usage
const { data, error } = await signIn('test@texa.com', 'Test@123456');
if (error) {
  console.error('Login failed:', error.message);
} else {
  console.log('Logged in:', data?.user.email);
}
```

### Sign Out

```typescript
/**
 * تسجيل الخروج
 * @returns {Promise<Response>} - نجاح أو خطأ
 */
export const signOut = async (): Promise<{ error: Error | null }> => {
  // Implementation...
}

// Usage
const { error } = await signOut();
if (error) {
  console.error('Logout failed:', error.message);
} else {
  console.log('Logged out successfully');
}
```

### Get Current Session

```typescript
/**
 * الحصول على الجلسة الحالية
 * @returns {Promise<AuthSession | null>} - بيانات الجلسة الكاملة
 */
export const getCurrentSession = async (): Promise<AuthSession | null> => {
  // Implementation...
}

// Usage
const session = await getCurrentSession();
if (session) {
  console.log('User:', session.user.email);
  console.log('Role:', session.primaryRole);
  console.log('Tenant:', session.tenantId);
}
```

---

## 📦 Types & Interfaces

### UserRole Enum

```typescript
enum UserRole {
  ADMIN = 'admin',
  DRIVER = 'driver',
  WAREHOUSE_MANAGER = 'warehouse_manager',
  CASHIER = 'cashier',
  ACCOUNTANT = 'accountant',
  SALES = 'sales',
  HR_MANAGER = 'hr_manager',
}
```

### AuthSession Interface

```typescript
interface AuthSession {
  user: {
    id: string;
    email: string;
    phone?: string;
  };
  profile: UserProfile;
  roles: UserRoleAssignment[];
  primaryRole: UserRole;
  tenantId: string;
  companyId?: string;
}
```

### UserProfile Interface

```typescript
interface UserProfile {
  id: string;
  tenant_id: string;
  company_id?: string;
  email: string;
  full_name_ar?: string;
  full_name_en?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}
```

### UserRoleAssignment Interface

```typescript
interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role_name: UserRole;
  tenant_id: string;
  company_id?: string;
  branch_id?: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
}
```

---

## 🔑 Auth Functions

### hasRole()

```typescript
/**
 * التحقق من دور معين
 * @param session - الجلسة الحالية
 * @param role - الدور المطلوب
 * @returns {boolean} - true إذا كان لديه الدور
 */
export const hasRole = (
  session: AuthSession | null,
  role: UserRole
): boolean => {
  if (!session) return false;
  return session.roles.some(r => r.role_name === role && r.is_active);
}

// Usage
if (hasRole(session, UserRole.ADMIN)) {
  console.log('User is Admin');
}
```

### hasAnyRole()

```typescript
/**
 * التحقق من أي دور من قائمة
 * @param session - الجلسة الحالية
 * @param roles - قائمة الأدوار المطلوبة
 * @returns {boolean} - true إذا كان لديه أي دور
 */
export const hasAnyRole = (
  session: AuthSession | null,
  roles: UserRole[]
): boolean => {
  if (!session) return false;
  return session.roles.some(r => 
    roles.includes(r.role_name) && r.is_active
  );
}

// Usage
if (hasAnyRole(session, [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER])) {
  console.log('Can access inventory');
}
```

### getDashboardRoute()

```typescript
/**
 * الحصول على مسار Dashboard حسب الدور
 * @param role - دور المستخدم
 * @returns {string} - مسار Dashboard
 */
export const getDashboardRoute = (role: UserRole): string => {
  const routes: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/(tabs)/admin-dashboard',
    [UserRole.DRIVER]: '/(tabs)/driver-dashboard',
    [UserRole.WAREHOUSE_MANAGER]: '/(tabs)/warehouse-dashboard',
    [UserRole.CASHIER]: '/(tabs)/cashier-dashboard',
    [UserRole.ACCOUNTANT]: '/(tabs)/accountant-dashboard',
    [UserRole.SALES]: '/(tabs)/sales-dashboard',
    [UserRole.HR_MANAGER]: '/(tabs)/hr-dashboard',
  };
  
  return routes[role] || '/(tabs)/admin-dashboard';
}

// Usage
const route = getDashboardRoute(session.primaryRole);
router.push(route);
```

---

## 👆 Biometric Functions

### checkBiometricSupport()

```typescript
/**
 * التحقق من دعم البصمة
 * @returns {Promise<BiometricSupport>} - معلومات دعم البصمة
 */
export const checkBiometricSupport = async (): Promise<BiometricSupport> => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  return {
    compatible,      // الجهاز يدعم
    enrolled,        // مسجل بصمة/وجه
    types,           // الأنواع المدعومة
  };
}

// Usage
const support = await checkBiometricSupport();
if (support.compatible && support.enrolled) {
  console.log('Biometrics available');
  console.log('Types:', support.types); // [1] = TouchID, [2] = FaceID
}
```

### authenticateWithBiometrics()

```typescript
/**
 * المصادقة بالبصمة
 * @returns {Promise<boolean>} - نجح أم فشل
 */
export const authenticateWithBiometrics = async (): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'تسجيل الدخول بالبصمة',
    fallbackLabel: 'استخدام كلمة المرور',
    disableDeviceFallback: false,
  });
  
  return result.success;
}

// Usage
const success = await authenticateWithBiometrics();
if (success) {
  // تسجيل دخول تلقائي
  const savedEmail = await AsyncStorage.getItem('user_email');
  // ...
}
```

### BiometricSupport Interface

```typescript
interface BiometricSupport {
  compatible: boolean;
  enrolled: boolean;
  types: number[]; // [1] TouchID, [2] FaceID, [3] Iris
}
```

---

## 🗄️ Database Schema

### Tables

#### 1. tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'fabric', 'exchange', 'healthcare'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE NOT NULL,
  full_name_ar TEXT,
  full_name_en TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  role_code TEXT UNIQUE NOT NULL,
  role_name_ar TEXT NOT NULL,
  role_name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  permissions JSONB DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. user_role_assignments
```sql
CREATE TABLE user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  company_id UUID REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  
  UNIQUE(user_id, role_id, tenant_id, company_id)
);
```

### Queries

#### Get User with Roles
```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .select(`
    *,
    user_role_assignments!inner (
      id,
      role_id,
      tenant_id,
      company_id,
      is_active,
      user_roles (
        role_code,
        role_name_ar,
        role_name_en
      )
    )
  `)
  .eq('id', userId)
  .eq('user_role_assignments.is_active', true)
  .single();
```

#### Get Active Tenants
```typescript
const { data, error } = await supabase
  .from('tenants')
  .select('*')
  .eq('is_active', true)
  .order('name_ar');
```

#### Get Companies by Tenant
```typescript
const { data, error } = await supabase
  .from('companies')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .order('name_ar');
```

---

## ❌ Error Handling

### Error Types

```typescript
// Supabase Auth Errors
'Invalid login credentials'        // خطأ في البريد/كلمة المرور
'Email not confirmed'               // البريد غير مؤكد
'User not found'                    // المستخدم غير موجود
'Too many requests'                 // محاولات كثيرة

// Database Errors
'23505'  // Unique constraint violation (تكرار)
'23503'  // Foreign key violation (FK مفقود)
'42P01'  // Table does not exist (الجدول غير موجود)

// Network Errors
'NetworkError'     // لا يوجد اتصال
'TimeoutError'     // انتهى الوقت
```

### Error Mapping

```typescript
const getErrorMessage = (error: any): string => {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور خاطئة',
    'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني',
    'User not found': 'المستخدم غير موجود',
    'Too many requests': 'محاولات كثيرة، يرجى المحاولة لاحقاً',
  };
  
  return errorMessages[error.message] || 'حدث خطأ غير متوقع';
};

// Usage
const { error } = await signIn(email, password);
if (error) {
  const message = getErrorMessage(error);
  showToast('error', message);
}
```

---

## 📚 Examples

### Full Login Flow

```typescript
import { useState } from 'react';
import { signIn } from '@/lib/supabase';
import { router } from 'expo-router';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    // 1. Validate
    if (!email || !password) {
      showToast('error', 'يرجى ملء جميع الحقول');
      return;
    }
    
    // 2. Sign In
    setLoading(true);
    const { data, error } = await signIn(email, password);
    setLoading(false);
    
    // 3. Handle Response
    if (error) {
      showToast('error', getErrorMessage(error));
    } else if (data) {
      showToast('success', 'تم تسجيل الدخول بنجاح');
      router.replace(getDashboardRoute(data.primaryRole));
    }
  };
  
  return (
    <View>
      <GlassInput
        value={email}
        onChangeText={setEmail}
        placeholder="البريد الإلكتروني"
        keyboardType="email-address"
      />
      <GlassInput
        value={password}
        onChangeText={setPassword}
        placeholder="كلمة المرور"
        secureTextEntry
      />
      <GlassButton
        loading={loading}
        onPress={handleLogin}
      >
        تسجيل الدخول
      </GlassButton>
    </View>
  );
};
```

### Biometric Login Flow

```typescript
import { useEffect, useState } from 'react';
import { checkBiometricSupport, authenticateWithBiometrics } from '@/lib/biometrics';
import { signIn } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BiometricLogin = () => {
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  
  // Check support on mount
  useEffect(() => {
    checkBiometricSupport().then(support => {
      setBiometricsAvailable(support.compatible && support.enrolled);
    });
  }, []);
  
  const handleBiometricLogin = async () => {
    // 1. Authenticate
    const success = await authenticateWithBiometrics();
    if (!success) return;
    
    // 2. Get saved credentials
    const savedEmail = await AsyncStorage.getItem('user_email');
    if (!savedEmail) {
      showToast('error', 'لم يتم حفظ بيانات الدخول');
      return;
    }
    
    // 3. Auto sign in (requires saved session token)
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      showToast('error', 'يرجى تسجيل الدخول يدوياً');
    } else {
      showToast('success', 'تم تسجيل الدخول بالبصمة');
      router.replace('/dashboard');
    }
  };
  
  if (!biometricsAvailable) return null;
  
  return (
    <GlassButton
      variant="outline"
      icon={<Fingerprint />}
      onPress={handleBiometricLogin}
    >
      تسجيل الدخول بالبصمة
    </GlassButton>
  );
};
```

### Protected Route Example

```typescript
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, UserRole } from '@/lib/supabase';
import { router } from 'expo-router';

const ProtectedScreen = () => {
  const { session, loading } = useAuth();
  
  useEffect(() => {
    if (loading) return;
    
    // Redirect if not authenticated
    if (!session) {
      router.replace('/login');
      return;
    }
    
    // Redirect if no permission
    if (!hasRole(session, UserRole.ADMIN)) {
      router.replace('/unauthorized');
    }
  }, [session, loading]);
  
  if (loading) return <LoadingScreen />;
  if (!session) return null;
  
  return <AdminDashboard />;
};
```

### Fetch with Error Handling

```typescript
const fetchUserData = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching user:', error);
    
    return {
      data: null,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
};

// Usage
const { data, error } = await fetchUserData('user-id');
if (error) {
  showToast('error', 'فشل تحميل البيانات');
} else {
  console.log('User:', data);
}
```

---

## 🔄 Real-time Subscriptions (Future)

```typescript
// Subscribe to role changes
const subscribeToRoleChanges = (userId: string, callback: (roles: any[]) => void) => {
  const subscription = supabase
    .channel('role-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_role_assignments',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Role changed:', payload);
        callback(payload.new);
      }
    )
    .subscribe();
  
  return subscription;
};

// Cleanup
subscription.unsubscribe();
```

---

## 📝 Storage Keys

```typescript
export const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: 'biometric_enabled',
  USER_EMAIL: 'user_email',
  USER_ROLE: 'user_role',
  LAST_LOGIN: 'last_login',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference',
} as const;
```

---

## 🧪 Testing

### Mock Data

```typescript
// Test User
export const TEST_USER = {
  email: 'test@texa.com',
  password: 'Test@123456',
  id: 'a0bddbe7-eac5-449d-8ab9-8c2e92859043',
};

// Mock Session
export const MOCK_SESSION: AuthSession = {
  user: {
    id: TEST_USER.id,
    email: TEST_USER.email,
  },
  profile: {
    id: TEST_USER.id,
    tenant_id: 'tenant-id',
    email: TEST_USER.email,
    full_name_ar: 'مدير التجربة',
    full_name_en: 'Test Admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  roles: [
    {
      id: 'role-id',
      user_id: TEST_USER.id,
      role_id: 'admin-role-id',
      role_name: UserRole.ADMIN,
      tenant_id: 'tenant-id',
      is_active: true,
      assigned_at: new Date().toISOString(),
    },
  ],
  primaryRole: UserRole.ADMIN,
  tenantId: 'tenant-id',
};
```

---

**📚 المزيد من التوثيق:**
- [📖 التوثيق الشامل](./MOBILE_APP_DOCUMENTATION.md)
- [🏗️ المعمارية](./ARCHITECTURE.md)
- [🚀 البدء السريع](./QUICK_START.md)
