# 🔧 حل مشكلة تأخير تحميل التابات والتفاصيل

> **التاريخ:** 2026-04-03  
> **الحالة:** ✅ محلول  

## المبدأ الأساسي

**DataEngine** يحمّل `inventory-preload-rolls` و `inventory-preload-materials` عند بدء التطبيق.
كل الحسابات تُجرى **محلياً** من هذه البيانات بدون أي network request إضافي.

## المشاكل المحلولة

### 1. React.lazy Spinner (TabContentRenderer.tsx)
- **السبب:** `MaterialBrowserTab`, `PurchaseMaterialBrowserTab`, `TradeMainTab` كانت lazy-loaded
- **الحل:** Eager imports + Suspense exclusion list

### 2. Stock Query في الفواتير (useMaterialSearch.ts)
- **السبب القديم:** `useCachedQuery` بـ stock query منفصل → لا يتطابق مع الكاش أو يتأخر
- **الحل الجديد:** `useMemo` يحسب stockMap من `queryClient.getQueryData(['inventory-preload-rolls', companyId])`
- **نفس الأسلوب:** `warehouseStockMap` + `fetchWarehouseStock` + `fetchRollDetails` كلها محلية

### 3. تفاصيل المخزون (InventoryPage.tsx)
- **السبب:** `fetchWarehouseData` و `fetchRollData` كانت تستدعي Supabase مباشرة
- **الحل:** محسوبة من `allRolls` (المحمّلة من DataEngine)

### 4. DataEngine Preload (warehouseModule.ts)
- **مضاف:** `material_browser_stock` ضمن preload list

## الملفات المعدلة

| الملف | التعديل |
|-------|---------|
| `TabContentRenderer.tsx` | Eager imports + Suspense exclusion |
| `useMaterialSearch.ts` | كل stock/warehouse computations محلية من cachedRolls |
| `InventoryPage.tsx` | fetchWarehouseData + fetchRollData من allRolls |
| `useInventoryPage.ts` | expose allRolls |
| `warehouseModule.ts` | Added material_browser_stock preload |

## القاعدة الذهبية

```
❌ await supabase.from('fabric_rolls').select(...)     // network request!
❌ await warehouseService.getMaterialStockByWarehouse() // network request!

✅ const cachedRolls = queryClient.getQueryData(['inventory-preload-rolls', companyId])
✅ useMemo(() => aggregate(cachedRolls), [cachedRolls])  // instant!
```

## متى تستخدم Network vs Cache

| الحالة | الأسلوب |
|--------|---------|
| عرض قائمة المواد | ✅ من الكاش (useMaterials) |
| عرض stock/رولونات | ✅ من الكاش (inventory-preload-rolls) |
| عرض تفاصيل المستودع | ✅ من الكاش (allRolls / cachedRolls) |
| تحديث بعد تغيير حقيقي (Realtime) | ✅ refetch ثم إعادة الحساب |
| بيانات لا تتغير (مجموعات) | ✅ من الكاش (SEMI_STATIC) |
