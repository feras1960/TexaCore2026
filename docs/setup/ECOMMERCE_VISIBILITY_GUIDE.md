# 🎯 دليل التحكم في ظهور المنتجات والفئات للعملاء
# E-Commerce Visibility Control Guide

**التاريخ:** 25 يناير 2026  
**الحالة:** ✅ جاهز للتطبيق

---

## 📋 نظرة عامة

هذا النظام يسمح لك بـ:

✅ **إظهار/إخفاء فئات كاملة** لعملاء أو مجموعات معينة  
✅ **إظهار/إخفاء منتجات محددة** لعملاء أو مجموعات معينة  
✅ **منتجات خاصة VIP** - فقط لعملاء محددين  
✅ **منتجات جملة/تجزئة** - حسب نوع العميل  
✅ **التحكم بالتواريخ** - عروض محددة بوقت

---

## 🎯 الحالات الشائعة

### 1. **منتجات VIP خاصة:**
```
المطلوب: عرض منتجات فاخرة فقط لعملاء VIP
الحل:
• أضف المنتجات الفاخرة
• حدد is_visible_online = true
• أضف سجل في product_customer_access:
  - customer_group_id = 'VIP'
  - access_type = 'allow'
```

### 2. **منع التجزئة من منتجات الجملة:**
```
المطلوب: منع عملاء التجزئة من رؤية منتجات الجملة
الحل:
• أضف سجل في product_customer_access:
  - customer_group_id = 'RETAIL'
  - product_id = (منتج الجملة)
  - access_type = 'deny'
```

### 3. **فئة خاصة لعميل معين:**
```
المطلوب: فئة "عروض حصرية" لعميل واحد فقط
الحل:
• أنشئ فئة "عروض حصرية"
• أضف سجل في category_customer_access:
  - customer_id = (العميل المحدد)
  - access_type = 'allow'
```

### 4. **عروض محددة بوقت:**
```
المطلوب: منتجات خاصة لشهر رمضان
الحل:
• أضف سجل في product_customer_access:
  - customer_group_id = 'ALL_CUSTOMERS'
  - valid_from = '2026-03-01'
  - valid_to = '2026-03-30'
  - access_type = 'allow'
```

---

## 📊 الجداول الجديدة

### 1. `category_customer_access`

```sql
التحكم في إتاحة الفئات للعملاء/المجموعات

الأعمدة:
• id - معرف فريد
• tenant_id - المستأجر
• category_id - الفئة
• customer_id - عميل محدد (اختياري)
• customer_group_id - مجموعة عملاء (اختياري)
• access_type - 'allow' أو 'deny'
• valid_from - تاريخ البداية (اختياري)
• valid_to - تاريخ النهاية (اختياري)
• is_active - نشط/غير نشط

القيود:
• يجب تحديد إما customer_id أو customer_group_id (ليس الاثنين)
```

### 2. `product_customer_access`

```sql
التحكم في إتاحة المنتجات للعملاء/المجموعات

نفس الهيكل لكن مع product_id بدلاً من category_id
```

---

## 🔧 الـ Functions المتوفرة

### 1. `can_customer_access_category()`

```sql
-- التحقق من صلاحية العميل للوصول للفئة
SELECT can_customer_access_category(
    'tenant_id'::UUID,
    'customer_id'::UUID,  -- أو NULL للزوار
    'category_id'::UUID
);

-- النتيجة: true/false
```

**المنطق:**
1. تحقق من `is_visible_online` للفئة
2. إذا زائر (لا customer_id) → يرى الفئات العامة فقط
3. إذا عميل مسجل:
   - تحقق من صلاحية مباشرة للعميل
   - إذا لم توجد، تحقق من صلاحية المجموعة
   - الافتراضي: السماح

### 2. `can_customer_access_product()`

```sql
-- التحقق من صلاحية العميل للوصول للمنتج
SELECT can_customer_access_product(
    'tenant_id'::UUID,
    'customer_id'::UUID,
    'product_id'::UUID
);

-- النتيجة: true/false
```

**المنطق:**
1. تحقق من `is_visible_online` للمنتج
2. تحقق من صلاحية الفئة التابع لها
3. إذا لم تُسمح الفئة → منع المنتج
4. نفس منطق الفئات للتحقق من المنتج نفسه

### 3. `get_available_categories_for_customer()`

```sql
-- عرض جميع الفئات المتاحة للعميل
SELECT * FROM get_available_categories_for_customer(
    'tenant_id'::UUID,
    'customer_id'::UUID  -- أو NULL للزوار
);

-- النتيجة:
-- category_id, name_ar, name_en, image_url, products_count, ...
```

### 4. `get_products_for_store()` (مُحدّثة)

```sql
-- عرض المنتجات المتاحة للعميل مع التحقق التلقائي
SELECT * FROM get_products_for_store(
    'tenant_id'::UUID,
    'customer_id'::UUID,  -- أو NULL
    NULL,  -- category_id
    'قماش',  -- search_term
    NULL, NULL, NULL,  -- price filters
    'price', 'ASC',
    20, 0
);

-- الآن تُرجع فقط المنتجات المسموح بها للعميل! ✅
```

---

## 💡 أمثلة عملية

### مثال 1: إنشاء فئة VIP خاصة

```sql
-- 1. أنشئ الفئة
INSERT INTO product_categories (
    tenant_id, code, name_ar, name_en,
    is_visible_online, is_active
) VALUES (
    'your_tenant_id',
    'VIP-PRODUCTS',
    'منتجات VIP',
    'VIP Products',
    true, true
) RETURNING id;

-- 2. أضف صلاحية لمجموعة VIP فقط
INSERT INTO category_customer_access (
    tenant_id, category_id, customer_group_id,
    access_type, is_active
) VALUES (
    'your_tenant_id',
    'category_id_from_above',
    (SELECT id FROM customer_groups WHERE code = 'VIP'),
    'allow',
    true
);

-- الآن: فقط عملاء VIP يرون هذه الفئة! ✅
```

### مثال 2: منتج خاص لعميل واحد

```sql
-- منتج "عرض حصري" لعميل محدد
INSERT INTO product_customer_access (
    tenant_id, product_id, customer_id,
    access_type, notes, is_active
) VALUES (
    'your_tenant_id',
    'special_product_id',
    'specific_customer_id',
    'allow',
    'عرض حصري للعميل الذهبي',
    true
);

-- الآن: فقط هذا العميل يرى المنتج! ✅
```

### مثال 3: منع التجزئة من الجملة

```sql
-- منع جميع عملاء التجزئة من منتجات الجملة
INSERT INTO product_customer_access (
    tenant_id, product_id, customer_group_id,
    access_type, notes, is_active
)
SELECT 
    'your_tenant_id',
    p.id,
    (SELECT id FROM customer_groups WHERE code = 'RETAIL'),
    'deny',
    'منتج جملة - غير متاح للتجزئة',
    true
FROM products p
WHERE p.name_ar LIKE '%جملة%'
  OR p.category_id IN (
      SELECT id FROM product_categories 
      WHERE code = 'WHOLESALE-ONLY'
  );

-- الآن: التجزئة لا يرون منتجات الجملة! ✅
```

### مثال 4: عرض محدد بوقت

```sql
-- عرض رمضان: منتجات خاصة لشهر واحد
INSERT INTO product_customer_access (
    tenant_id, product_id, customer_group_id,
    access_type, valid_from, valid_to,
    notes, is_active
)
SELECT 
    'your_tenant_id',
    p.id,
    NULL,  -- جميع العملاء
    'allow',
    '2026-03-01',  -- بداية رمضان
    '2026-03-30',  -- نهاية رمضان
    'عرض رمضان الحصري',
    true
FROM products p
WHERE p.category_id = (
    SELECT id FROM product_categories 
    WHERE code = 'RAMADAN-SPECIAL'
);

-- الآن: هذه المنتجات تظهر فقط في رمضان! ✅
```

---

## 🎯 القواعد والأولويات

### ترتيب التحقق:

```
1. is_visible_online = false → منع مطلق ❌
2. صلاحية مباشرة للعميل (customer_id):
   • deny → منع ❌
   • allow → سماح ✅
3. صلاحية المجموعة (customer_group_id):
   • deny → منع ❌
   • allow → سماح ✅
4. لا توجد قيود → سماح افتراضي ✅
```

### القواعد الهامة:

1. **الصلاحية المباشرة للعميل > صلاحية المجموعة**
   - إذا كان للعميل صلاحية مباشرة، تُتجاهل صلاحية المجموعة

2. **deny > allow**
   - المنع له أولوية على السماح

3. **الفئة تتحكم في المنتجات**
   - إذا لم يُسمح بالفئة، لا يمكن الوصول لمنتجاتها
   - حتى لو كان المنتج نفسه مسموحاً

4. **الزوار (غير المسجلين)**
   - يرون فقط المنتجات/الفئات التي لا تحتوي على قيود خاصة

---

## 🧪 الاختبارات

### اختبار 1: التحقق من الصلاحيات

```sql
-- هل يمكن لهذا العميل رؤية هذا المنتج؟
SELECT 
    c.code as customer_code,
    c.name_ar as customer_name,
    cg.name_ar as group_name,
    p.name_ar as product_name,
    can_customer_access_product(
        c.tenant_id,
        c.id,
        p.id
    ) as has_access
FROM customers c
CROSS JOIN products p
LEFT JOIN customer_groups cg ON cg.id = c.group_id
WHERE c.tenant_id = 'your_tenant_id'
  AND p.tenant_id = 'your_tenant_id'
LIMIT 10;
```

### اختبار 2: عرض المنتجات حسب العميل

```sql
-- مقارنة المنتجات المرئية لعميلين مختلفين

-- عميل VIP
SELECT COUNT(*) as vip_products_count
FROM get_products_for_store(
    'tenant_id',
    (SELECT id FROM customers WHERE code = 'VIP-001'),
    NULL, NULL, NULL, NULL, NULL,
    'name', 'ASC', 1000, 0
);

-- عميل تجزئة
SELECT COUNT(*) as retail_products_count
FROM get_products_for_store(
    'tenant_id',
    (SELECT id FROM customers WHERE code = 'RETAIL-001'),
    NULL, NULL, NULL, NULL, NULL,
    'name', 'ASC', 1000, 0
);

-- يجب أن يكون VIP أكثر! ✅
```

### اختبار 3: الفئات المتاحة

```sql
-- عرض الفئات لكل نوع عميل
SELECT 
    cg.name_ar as customer_group,
    COUNT(DISTINCT cat.*) as categories_count
FROM customer_groups cg
CROSS JOIN LATERAL get_available_categories_for_customer(
    'your_tenant_id',
    (SELECT id FROM customers WHERE group_id = cg.id LIMIT 1)
) cat
WHERE cg.tenant_id = 'your_tenant_id'
GROUP BY cg.name_ar;
```

---

## ✅ Checklist التطبيق

```
□ تطبيق STEP_49 في Supabase
□ اختبار Functions الأساسية
□ تحديد الفئات الخاصة (إن وجدت)
□ تحديد المنتجات الخاصة (إن وجدت)
□ تحديد قيود المجموعات
□ اختبار مع عملاء من أنواع مختلفة
□ التحقق من عمل التواريخ (valid_from/to)
```

---

## 🎯 الخلاصة

**الآن لديك:**

✅ تحكم كامل في من يرى ماذا  
✅ منتجات خاصة VIP  
✅ فئات حصرية  
✅ عروض محددة بوقت  
✅ منع/سماح بالمجموعات  
✅ تزامن تلقائي مع المخزون

**كل شيء جاهز للتطبيق! 🚀**
