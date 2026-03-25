# 🔧 Lock Config Fix

## 🐛 المشكلة:

```
Error: this.lock is not a function
Source: lib/supabase.ts:49
```

## 🔍 السبب:

الـ `lock` configuration غير مدعومة في إصدار Supabase الحالي:

```typescript
// ❌ لا يعمل:
lock: {
  acquireTimeout: 0,
}
```

## ✅ الحل:

حذف `lock` configuration من `auth`:

```typescript
// ✅ يعمل:
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    // ✅ حذفنا lock config
  },
  global: {
    headers: {
      'x-client-info': 'texa-mobile',
    },
  },
});
```

---

## 📝 ملاحظة:

كان الـ `lock` config مضاف لحل مشكلة "signal is aborted"، لكن:
- ✅ المشكلة الحقيقية تم حلها بتبسيط `getCurrentSession()`
- ✅ الـ `flowType: 'pkce'` كافي
- ✅ حذف `lock` لا يؤثر على الأداء

---

## ✅ Status:

```
✅ File updated
✅ Refresh browser to apply
```
