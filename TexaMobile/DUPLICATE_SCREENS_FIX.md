# ✅ إصلاح: Duplicate Screen Names Error

## **المشكلة:**
```
❌ Uncaught Error
Screen names must be unique: admin-dashboard, quick-actions, notifications, 
profile, settings, admin-dashboard, cashier-dashboard, driver-dashboard, 
warehouse-dashboard
```

## **السبب:**
كنا نضيف الـ screens مرتين:
1. مرة في `tabs.map()` (للـ screens المرئية)
2. مرة أخرى في الـ hidden screens (بما فيهم `admin-dashboard` المرئي!)

## **الحل:**

### **قبل:**
```typescript
{tabs.map((tab) => (
  <Tabs.Screen name={tab.route.split('/').pop()} /> // admin-dashboard
))}

{/* تكرار! */}
<Tabs.Screen name="admin-dashboard" options={{ href: null }} />
<Tabs.Screen name="cashier-dashboard" options={{ href: null }} />
```

### **بعد:**
```typescript
// 1. جمع كل الـ dashboards الممكنة
const allDashboards = ['admin-dashboard', 'cashier-dashboard', 'driver-dashboard', 'warehouse-dashboard'];

// 2. تحديد المرئية
const visibleScreens = tabs.map(tab => tab.route.split('/').pop());

// 3. تحديد المخفية (الغير موجودة في المرئية)
const hiddenDashboards = allDashboards.filter(d => !visibleScreens.includes(d));

return (
  <Tabs>
    {/* الشاشات المرئية */}
    {tabs.map((tab) => (
      <Tabs.Screen key={tab.id} name={tab.route.split('/').pop()} />
    ))}
    
    {/* فقط الـ dashboards المخفية */}
    {hiddenDashboards.map((dashboard) => (
      <Tabs.Screen key={`hidden-${dashboard}`} name={dashboard} options={{ href: null }} />
    ))}
  </Tabs>
);
```

---

## **النتيجة:**

```
للـ Admin:
✅ admin-dashboard (visible)
✅ quick-actions (visible)
✅ notifications (visible)
✅ profile (visible)
✅ settings (visible)
❌ cashier-dashboard (hidden - href: null)
❌ driver-dashboard (hidden - href: null)
❌ warehouse-dashboard (hidden - href: null)

= 5 tabs مرئية فقط ✨
```

---

## **المنطق:**
- إذا كان الـ dashboard في `visibleScreens` → يُعرض مرة واحدة فقط من `tabs.map()`
- إذا لم يكن في `visibleScreens` → يُخفى بـ `href: null`
- **لا تكرار!** ✅

---

**اختبر الآن:** http://localhost:8081
