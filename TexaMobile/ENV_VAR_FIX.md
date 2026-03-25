# 🔧 إصلاح: Invalid API Key على Web

## **المشكلة:**
```
❌ Login error: Invalid API key
```

**السبب:**
- على **Web**، `Constants.expoConfig.extra` لا يعمل بشكل صحيح
- `process.env` يحتاج أن يكون أول خيار

---

## **الحل:**

### **تحديث `lib/supabase.ts`:**

```typescript
// ❌ قديم: Constants أولاً
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl 
  || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

// ✅ جديد: process.env أولاً
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL 
  || Constants.expoConfig?.extra?.supabaseUrl || '';

// Debug logging
if (typeof window !== 'undefined') {
  console.log('🔑 Supabase Config Check:');
  console.log('  URL:', SUPABASE_URL?.substring(0, 30) + '...');
  console.log('  KEY:', SUPABASE_ANON_KEY?.substring(0, 30) + '...');
}
```

---

## **لماذا هذا يعمل:**

### **Web (Browser):**
- `process.env` يُحول إلى static values عند build
- Webpack/Metro يستبدل `process.env.EXPO_PUBLIC_*` بالقيم الفعلية
- ✅ يعمل

### **Native (iOS/Android):**
- `Constants.expoConfig.extra` يعمل بشكل صحيح
- ✅ Fallback جاهز

---

## **Console Output المتوقع:**

```javascript
🔑 Supabase Config Check:
  URL: https://wzkklenfsaepegymfxfz.s...
  KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...
```

**إذا ظهر هذا:**
```javascript
❌ Supabase configuration missing!
  URL: 
  KEY: missing
```

**الحل:**
1. تأكد من `.env` موجود
2. restart server: `npx expo start --web --clear`

---

## **الترتيب الصحيح:**

```
1. process.env (Web ✅)
   ↓
2. Constants.expoConfig.extra (Native ✅)
   ↓
3. Empty string (Fallback)
```

---

**السيرفر يعمل الآن:** http://localhost:8081

**افتح المتصفح وتحقق من Console logs!** 🚀
