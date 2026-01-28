# 🔧 إصلاح مشكلة 404: register_new_subscriber not found

## 🔴 **المشكلة:**
```
POST .../rpc/register_new_subscriber → 404
Function public.register_rpc_name_here was not found in the schema cache
```

**السبب:** الدالة `register_new_subscriber` غير موجودة أو غير مفعّلة في Supabase.

---

## ✅ **الحل - خطوة بخطوة:**

### **الخطوة 1: التحقق من وجود الدالة** ✅

1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. نفّذ:

```sql
-- نسخ من: check_and_fix_register_function.sql
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'register_new_subscriber'
AND pronamespace = 'public'::regnamespace;
```

**النتائج المتوقعة:**

#### ✅ **إذا ظهرت نتيجة:**
```
function_name           | arguments                                      | is_security_definer
-----------------------|-----------------------------------------------|-------------------
register_new_subscriber | p_user_id uuid, p_user_email character varying... | t
```
→ **الدالة موجودة!** انتقل للخطوة 2

#### ❌ **إذا لم تظهر أي نتيجة:**
```
(no rows)
```
→ **الدالة غير موجودة!** انتقل للخطوة 3

---

### **الخطوة 2: التحقق من الصلاحيات** ✅

إذا كانت الدالة موجودة، نفّذ:

```sql
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'register_new_subscriber'
AND routine_schema = 'public';
```

**النتائج المتوقعة:**
```
grantee        | privilege_type
---------------|---------------
authenticated  | EXECUTE
anon          | EXECUTE
```

#### ✅ **إذا ظهرت هذه الصلاحيات:**
→ **الصلاحيات صحيحة!** انتقل للخطوة 4

#### ❌ **إذا لم تظهر `authenticated` و `anon`:**
→ نفّذ:

```sql
-- إضافة الصلاحيات المفقودة
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon;
```

---

### **الخطوة 3: إنشاء الدالة من البداية** 🚀

إذا كانت الدالة **غير موجودة**:

1. **افتح الملف:**
   ```
   supabase/migrations/STEP_41_business_type_and_company_switcher.sql
   ```

2. **انسخ محتواه كاملاً** (Ctrl+A → Ctrl+C)

3. **افتح Supabase SQL Editor**

4. **الصق المحتوى** (Ctrl+V)

5. **اضغط Run / Execute**

6. **انتظر حتى تظهر:**
   ```
   Success. No rows returned.
   ```

7. **أعد تشغيل الخطوة 1** للتحقق من إنشاء الدالة

---

### **الخطوة 4: اختبار الدالة** 🧪

نفّذ:

```sql
-- اختبار بسيط
SELECT register_new_subscriber(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::UUID,  -- استبدل بـ user_id حقيقي
  'test@example.com',
  'Test User',
  'Test Company',
  '+966501234567',
  'general',
  'SAR',
  'SA'
);
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "tenant_id": "xxx-xxx-xxx",
  "company_id": "xxx-xxx-xxx",
  "business_type": "general",
  "message": "تم التسجيل بنجاح"
}
```

---

### **الخطوة 5: إعادة المحاولة في الـ Frontend** 🎯

1. **أعد تحميل الصفحة** (Ctrl+R / Cmd+R)
2. **امسح Cache:**
   - اضغط `Cmd+Shift+Delete` (Mac)
   - اضغط `Ctrl+Shift+Delete` (Windows)
   - اختر "Cached images and files"
   - اضغط "Clear data"

3. **أعد تحميل الصفحة مرة أخرى**

4. **سجّل مستخدم جديد**

5. **افتح Console (F12)** وراقب:

```
✅ يجب أن ترى:
🔄 Starting registration...
📊 RPC Response: { data: {...}, error: null }
✅ Registration successful!
🚀 Redirecting to dashboard...
```

---

## 🔍 **التشخيص المتقدم:**

### **إذا استمرت المشكلة بعد كل الخطوات:**

#### **1. تحقق من URL الصحيح:**

افتح `src/lib/supabase.ts` وتأكد من:

```typescript
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY'
```

#### **2. تحقق من RLS Policies:**

```sql
-- في Supabase SQL Editor:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('tenants', 'companies', 'user_profiles')
ORDER BY tablename, policyname;
```

#### **3. تحقق من Logs:**

في Supabase Dashboard:
- اذهب إلى **Logs**
- اختر **Postgres Logs**
- ابحث عن أخطاء متعلقة بـ `register_new_subscriber`

---

## 📝 **ملخص الخطوات:**

```
1. ✅ تحقق من وجود الدالة (check_and_fix_register_function.sql)
   ↓
2. ❌ غير موجودة؟
   ↓
3. ✅ نفّذ STEP_41 كاملاً
   ↓
4. ✅ تحقق من الصلاحيات (GRANT EXECUTE)
   ↓
5. ✅ اختبر الدالة (RPC test)
   ↓
6. ✅ امسح Cache في المتصفح
   ↓
7. ✅ جرّب التسجيل مرة أخرى
```

---

## 🆘 **إذا احتجت مساعدة:**

**شارك معي:**
1. نتيجة الخطوة 1 (هل الدالة موجودة؟)
2. نتيجة الخطوة 2 (الصلاحيات)
3. أي أخطاء ظهرت عند تنفيذ STEP_41
4. Screenshot من Console بعد إعادة المحاولة

---

## 📁 **الملفات ذات الصلة:**

1. ✅ `check_and_fix_register_function.sql` - التحقق من الدالة
2. ✅ `supabase/migrations/STEP_41_business_type_and_company_switcher.sql` - كود الدالة الكامل
3. ✅ `test_registration_rpc.sql` - اختبار الدالة
4. ✅ `WIZARD_REDIRECT_DEBUG.md` - تشخيص مشاكل التوجيه

**ابدأ الآن بالخطوة 1!** 🚀
