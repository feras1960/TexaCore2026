# 🔐 المصادقة وإدارة الجلسات
# Authentication & Session Management

---

## 📋 نظرة عامة

نظام TexaCore يستخدم **Supabase Auth** للمصادقة، والذي يوفر:
- ✅ JWT Tokens آمنة
- ✅ تجديد تلقائي للتوكنات
- ✅ دعم المصادقة الثنائية (MFA)
- ✅ تكامل كامل مع RLS

---

## 1️⃣ تسجيل مستخدم جديد (Sign Up)

### Endpoint
```
POST /auth/v1/signup
```

### Request

```typescript
// TypeScript / Supabase Client
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  options: {
    data: {
      full_name: 'أحمد محمد',
      phone: '+966501234567'
    }
  }
});
```

### cURL

```bash
curl -X POST 'https://wzkklenfsaepegymfxfz.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "data": {
      "full_name": "أحمد محمد",
      "phone": "+966501234567"
    }
  }'
```

### Response (Success - 200)

```json
{
  "data": {
    "user": {
      "id": "d0e7f8a9-1234-5678-9abc-def012345678",
      "email": "user@example.com",
      "email_confirmed_at": null,
      "phone": "",
      "confirmed_at": null,
      "created_at": "2026-02-05T10:00:00Z",
      "updated_at": "2026-02-05T10:00:00Z",
      "user_metadata": {
        "full_name": "أحمد محمد",
        "phone": "+966501234567"
      }
    },
    "session": null
  },
  "error": null
}
```

### Response (Error - 422)

```json
{
  "data": null,
  "error": {
    "message": "User already registered",
    "status": 422
  }
}
```

### ملاحظات
- ⚠️ البريد الإلكتروني يجب أن يكون فريداً
- ⚠️ كلمة المرور يجب أن تكون 8 أحرف على الأقل
- 📧 يُرسل بريد تأكيد تلقائياً

---

## 2️⃣ تسجيل الدخول (Sign In)

### Endpoint
```
POST /auth/v1/token?grant_type=password
```

### Request

```typescript
// TypeScript / Supabase Client
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

if (error) {
  console.error('Login failed:', error.message);
  return;
}

// الوصول للتوكن
const accessToken = data.session?.access_token;
const refreshToken = data.session?.refresh_token;
```

### cURL

```bash
curl -X POST 'https://wzkklenfsaepegymfxfz.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Response (Success - 200)

```json
{
  "data": {
    "user": {
      "id": "d0e7f8a9-1234-5678-9abc-def012345678",
      "email": "user@example.com",
      "email_confirmed_at": "2026-02-01T10:00:00Z",
      "user_metadata": {
        "full_name": "أحمد محمد"
      },
      "app_metadata": {
        "tenant_id": "t-uuid",
        "company_id": "c-uuid",
        "role": "company_admin"
      }
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "v1.MjAyNi0wMi0wNVQxMDowMDowMFo...",
      "token_type": "bearer",
      "expires_in": 3600,
      "expires_at": 1738753200
    }
  },
  "error": null
}
```

### Response (Error - 400)

```json
{
  "data": null,
  "error": {
    "message": "Invalid login credentials",
    "status": 400
  }
}
```

---

## 3️⃣ تسجيل الخروج (Sign Out)

### Request

```typescript
// TypeScript / Supabase Client
const { error } = await supabase.auth.signOut();

// تسجيل خروج من كل الأجهزة
const { error } = await supabase.auth.signOut({ scope: 'global' });
```

### cURL

```bash
curl -X POST 'https://wzkklenfsaepegymfxfz.supabase.co/auth/v1/logout' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

### Response (Success - 204)

```
No Content
```

---

## 4️⃣ تجديد التوكن (Refresh Token)

### Request

```typescript
// التجديد تلقائي مع Supabase Client
// لكن يمكن استدعاؤه يدوياً:
const { data, error } = await supabase.auth.refreshSession();

// أو باستخدام refresh_token محدد
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: 'v1.MjAyNi0wMi0wNVQxMDowMDowMFo...'
});
```

### cURL

```bash
curl -X POST 'https://wzkklenfsaepegymfxfz.supabase.co/auth/v1/token?grant_type=refresh_token' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "refresh_token": "v1.MjAyNi0wMi0wNVQxMDowMDowMFo..."
  }'
```

### Response (Success - 200)

```json
{
  "data": {
    "session": {
      "access_token": "NEW_ACCESS_TOKEN",
      "refresh_token": "NEW_REFRESH_TOKEN",
      "expires_in": 3600
    }
  },
  "error": null
}
```

---

## 5️⃣ إعادة تعيين كلمة المرور

### الخطوة 1: طلب إعادة التعيين

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'https://yourapp.com/reset-password'
  }
);
```

### cURL

```bash
curl -X POST 'https://wzkklenfsaepegymfxfz.supabase.co/auth/v1/recover' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com"
  }'
```

### الخطوة 2: تحديث كلمة المرور

```typescript
// بعد النقر على الرابط في البريد
const { data, error } = await supabase.auth.updateUser({
  password: 'NewSecurePassword123!'
});
```

---

## 6️⃣ المصادقة الثنائية (MFA)

### التحقق من إعداد MFA

```typescript
const { data, error } = await supabase.auth.mfa.listFactors();

// data.totp = قائمة عوامل TOTP المُعدة
```

### إعداد MFA جديد

```typescript
// 1. إنشاء عامل TOTP
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

// data.totp.qr_code = صورة QR للمسح
// data.totp.secret = المفتاح السري
// data.id = factor_id

// 2. التحقق من الإعداد
const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: data.id,
  code: '123456'  // الكود من تطبيق Authenticator
});
```

### تسجيل دخول مع MFA

```typescript
// 1. تسجيل الدخول العادي
const { data: signInData, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// 2. إذا كان MFA مطلوب
if (signInData?.user && !signInData?.session) {
  // الحصول على التحدي
  const { data: challengeData } = await supabase.auth.mfa.challenge({
    factorId: 'factor-uuid'
  });
  
  // 3. التحقق بالكود
  const { data: verifyData, error } = await supabase.auth.mfa.verify({
    factorId: 'factor-uuid',
    challengeId: challengeData.id,
    code: '123456'
  });
}
```

---

## 7️⃣ الحصول على الجلسة الحالية

```typescript
// الحصول على الجلسة
const { data: { session }, error } = await supabase.auth.getSession();

if (session) {
  console.log('User ID:', session.user.id);
  console.log('Access Token:', session.access_token);
  console.log('Expires At:', new Date(session.expires_at * 1000));
}

// الحصول على المستخدم فقط
const { data: { user }, error } = await supabase.auth.getUser();
```

---

## 8️⃣ الاستماع لتغييرات المصادقة

```typescript
// الاشتراك في تغييرات الحالة
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    console.log('Auth event:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        console.log('User signed in:', session?.user.email);
        break;
      case 'SIGNED_OUT':
        console.log('User signed out');
        break;
      case 'TOKEN_REFRESHED':
        console.log('Token refreshed');
        break;
      case 'PASSWORD_RECOVERY':
        console.log('Password recovery initiated');
        break;
    }
  }
);

// إلغاء الاشتراك عند عدم الحاجة
subscription.unsubscribe();
```

---

## 9️⃣ تحديث بيانات المستخدم

```typescript
// تحديث البيانات
const { data, error } = await supabase.auth.updateUser({
  email: 'newemail@example.com',  // يتطلب تأكيد
  password: 'newpassword123',
  data: {
    full_name: 'اسم جديد',
    phone: '+966509876543'
  }
});
```

---

## 🔒 JWT Token Structure

### Payload المتوقع

```json
{
  "aud": "authenticated",
  "exp": 1738753200,
  "sub": "d0e7f8a9-1234-5678-9abc-def012345678",
  "email": "user@example.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "full_name": "أحمد محمد"
  },
  "role": "authenticated"
}
```

### استخلاص البيانات من JWT

```typescript
import { jwtDecode } from 'jwt-decode';

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const decoded = jwtDecode(session.access_token);
  console.log('User ID:', decoded.sub);
  console.log('Email:', decoded.email);
  console.log('Expires:', new Date(decoded.exp * 1000));
}
```

---

## ⚠️ أخطاء المصادقة الشائعة

| الكود | الرسالة | السبب | الحل |
|-------|---------|-------|------|
| 400 | Invalid login credentials | بيانات خاطئة | تحقق من البريد وكلمة المرور |
| 400 | Email not confirmed | البريد غير مُؤكد | أكد البريد أولاً |
| 422 | User already registered | المستخدم موجود | استخدم تسجيل الدخول |
| 429 | Rate limit exceeded | طلبات كثيرة | انتظر ثم أعد المحاولة |
| 500 | Server error | خطأ في الخادم | تواصل مع الدعم |

---

## 🛡️ أفضل الممارسات

### 1. تخزين التوكنات بأمان
```typescript
// ✅ Supabase يخزن في localStorage تلقائياً
// ❌ لا تخزن في الكود أو cookies غير آمنة
```

### 2. التعامل مع انتهاء الصلاحية
```typescript
// التجديد التلقائي مُفعّل بالإعدادات الافتراضية
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true  // ✅ تجديد تلقائي
  }
});
```

### 3. التحقق من حالة المصادقة
```typescript
// في كل صفحة محمية
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    }
  };
  checkAuth();
}, []);
```

---

**التالي:** [03-user-context.md](./03-user-context.md) - سياق المستخدم والصلاحيات
