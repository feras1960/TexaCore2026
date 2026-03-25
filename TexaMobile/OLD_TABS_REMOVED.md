# ✅ إصلاح: إزالة التبويبات القديمة

## **المشكلة:**
- ❌ ظهور 3 تبويبات رمادية (▼) غير مستخدمة
- ❌ عرض جميع الـ dashboards حتى لو لم يكن المستخدم له صلاحية

## **السبب:**
Expo Router يعرض **جميع** الملفات في `app/(tabs)/` تلقائياً حتى لو لم تكن مضافة في `tabs` config.

## **الحل:**
إضافة `href: null` للشاشات الغير مرئية لإخفائها من Tab Bar:

```typescript
// إخفاء الشاشات الغير مستخدمة
<Tabs.Screen
  name="admin-dashboard"
  options={{
    href: visibleScreens.includes('admin-dashboard') ? undefined : null,
  }}
/>
<Tabs.Screen
  name="cashier-dashboard"
  options={{
    href: visibleScreens.includes('cashier-dashboard') ? undefined : null,
  }}
/>
// ... إلخ
```

## **النتيجة:**
✅ فقط 5 تبويبات مرئية (حسب دور المستخدم)
✅ لا توجد تبويبات رمادية
✅ نظيف ومرتب

---

**اختبر الآن:** http://localhost:8081
