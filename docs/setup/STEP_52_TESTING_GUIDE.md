# 🧪 دليل اختبار STEP_52: Shopping Cart

## 📋 التنفيذ

```sql
\i supabase/migrations/STEP_52_shopping_cart_system.sql
```

---

## ✅ الاختبارات السريعة

### 1. التحقق من الجداول
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('shopping_carts', 'shopping_cart_items');
```

### 2. التحقق من Functions
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%cart%'
ORDER BY routine_name;
```

**المتوقع:** 9 functions

---

## 🛒 اختبارات عملية

### 3. إضافة منتج للسلة (زائر)
```sql
SELECT add_to_cart(
    'YOUR_TENANT_ID'::UUID,
    'YOUR_COMPANY_ID'::UUID,
    'PRODUCT_ID'::UUID,
    2, -- quantity
    NULL, -- customer_id (زائر)
    'guest_session_12345' -- session_id
);
```

### 4. جلب السلة
```sql
SELECT * FROM get_cart(
    'YOUR_TENANT_ID'::UUID,
    NULL,
    'guest_session_12345'
);
```

### 5. ملخص السلة
```sql
SELECT get_cart_summary(
    'YOUR_TENANT_ID'::UUID,
    NULL,
    'guest_session_12345'
);
```

### 6. تحديث كمية
```sql
SELECT update_cart_item('ITEM_ID'::UUID, 5);
```

### 7. حذف من السلة
```sql
SELECT remove_from_cart('ITEM_ID'::UUID);
```

### 8. دمج السلات (عند تسجيل الدخول)
```sql
SELECT merge_carts(
    'YOUR_TENANT_ID'::UUID,
    'CUSTOMER_ID'::UUID,
    'guest_session_12345'
);
```

### 9. إفراغ السلة
```sql
SELECT clear_cart(
    'YOUR_TENANT_ID'::UUID,
    'CUSTOMER_ID'::UUID
);
```

---

## 📊 إحصائيات

```sql
-- عدد السلات النشطة
SELECT status, COUNT(*) 
FROM shopping_carts 
GROUP BY status;

-- عدد العناصر في كل سلة
SELECT 
    sc.id,
    COUNT(sci.id) as items_count,
    sc.total_amount
FROM shopping_carts sc
LEFT JOIN shopping_cart_items sci ON sci.cart_id = sc.id
WHERE sc.status = 'active'
GROUP BY sc.id, sc.total_amount;
```

---

**نفّذ وأعطني النتيجة!** ✅
