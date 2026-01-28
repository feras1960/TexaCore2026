# 💰 نظام الدفعات SaaS - التوثيق الكامل

**التاريخ:** 27 يناير 2026  
**الإصدار:** STEP 57 - Payments Infrastructure

---

## 🎯 الهدف

إنشاء نظام دفعات متكامل لتتبع **الإيرادات الفعلية** من المشتركين بناءً على **الدفعات المستلمة** وليس الاشتراكات النظرية.

---

## ✅ ما تم إنجازه

### 1️⃣ **جدول الدفعات (saas_payments)**

جدول شامل لتسجيل كل دفعة مستلمة من المشتركين.

#### **الحقول الرئيسية:**

```sql
CREATE TABLE saas_payments (
    id UUID PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE,  -- رقم الدفعة الفريد
    tenant_id UUID,                     -- المشترك
    subscription_id UUID,               -- الاشتراك
    plan_id UUID,                       -- الباقة
    
    -- المبالغ
    amount DECIMAL(12,2),               -- المبلغ
    currency VARCHAR(3),                -- العملة (USD/EUR/SAR)
    
    -- نوع الدفعة
    payment_type VARCHAR(20),           -- subscription, addon, upgrade, refund
    
    -- طريقة الدفع
    payment_method VARCHAR(30),         -- bank_transfer, cash, credit_card, stripe, etc.
    
    -- الحالة
    status VARCHAR(20),                 -- pending, completed, failed, refunded
    
    -- معلومات التحصيل
    collected_by UUID,                  -- من حصّل الدفعة
    collection_date TIMESTAMPTZ,        -- تاريخ التحصيل
    
    -- معلومات الحساب
    account_id UUID,                    -- حساب البنك/الصندوق
    account_name VARCHAR(100),          -- اسم الحساب
    reference_number VARCHAR(100),      -- رقم الإيصال/التحويل
    
    -- الفترة المغطاة
    period_start DATE,                  -- بداية الفترة
    period_end DATE,                    -- نهاية الفترة
    
    -- ملاحظات ومرفقات
    notes TEXT,
    attachment_url TEXT,
    metadata JSONB,
    
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

---

### 2️⃣ **توليد رقم الدفعة التلقائي**

```sql
-- رقم تلقائي بالصيغة: PAY-2401-00001
CREATE FUNCTION generate_payment_number()
RETURNS VARCHAR AS $$
    PAY-[YY][MM]-[XXXXX]
$$;

-- مثال:
-- PAY-2401-00001
-- PAY-2401-00002
-- PAY-2402-00001 (شهر جديد)
```

---

### 3️⃣ **دوال إحصائية (Analytics Functions)**

#### **أ. إجمالي الإيرادات**
```sql
SELECT get_total_revenue('USD') as total_revenue;
-- يعيد إجمالي الدفعات المكتملة

SELECT get_total_revenue('USD', '2024-01-01', '2024-12-31');
-- مع فترة محددة
```

#### **ب. الإيرادات الشهرية**
```sql
SELECT * FROM get_monthly_revenue(12, 'USD');
-- آخر 12 شهر
-- يعيد: month, revenue, payment_count
```

#### **ج. الإيرادات حسب المنتج**
```sql
SELECT * FROM get_revenue_by_product('USD');
-- يعيد: product_code, product_name, total_revenue, payment_count
```

#### **د. الدفعات حسب طريقة الدفع**
```sql
SELECT * FROM get_payments_by_method();
-- يعيد: payment_method, payment_count, total_amount, currency
```

#### **هـ. تاريخ دفعات المشترك**
```sql
SELECT * FROM get_tenant_payments('<tenant_id>', 50);
-- آخر 50 دفعة للمشترك
```

---

### 4️⃣ **التفعيل التلقائي للاشتراك**

```sql
CREATE TRIGGER activate_subscription_on_payment
-- عند إضافة دفعة مكتملة:
-- 1. تفعيل الاشتراك (status = active)
-- 2. تمديد تاريخ الانتهاء
```

**مثال:**
```
اشتراك → status: pending
↓
دفعة مكتملة → status: completed
↓
تلقائياً: اشتراك → status: active ✅
```

---

### 5️⃣ **سياسات الأمان (RLS)**

```sql
-- المستخدمون يرون دفعات tenants الخاصة بهم فقط
CREATE POLICY "Users can view their tenant payments"

-- الـ Admins يرون كل الدفعات
CREATE POLICY "Admins can view all payments"

-- Finance users يمكنهم إضافة/تعديل الدفعات
CREATE POLICY "Finance users can insert payments"
CREATE POLICY "Finance users can update payments"
```

---

### 6️⃣ **تحديث Frontend Service**

#### **قبل:**
```typescript
// ❌ كان يحسب من أسعار الباقات أو الاشتراكات
const { data } = await supabase
  .from('subscription_plans')
  .select('price_monthly');
```

#### **بعد:**
```typescript
// ✅ الآن يحسب من الدفعات الفعلية
const { data } = await supabase
  .from('saas_payments')
  .select('amount')
  .eq('status', 'completed');
```

---

## 📊 طرق الدفع المدعومة

| الطريقة | الكود | الوصف |
|---------|-------|-------|
| 🏦 تحويل بنكي | `bank_transfer` | تحويل إلى الحساب البنكي |
| 💵 نقدي | `cash` | دفع نقدي للصندوق |
| 💳 بطاقة ائتمان | `credit_card` | دفع بالبطاقة |
| 🔵 Stripe | `stripe` | عبر بوابة Stripe |
| 🅿️ PayPal | `paypal` | عبر PayPal |
| 📱 محفظة رقمية | `digital_wallet` | Apple Pay, Google Pay, إلخ |

---

## 📈 تدفق العمل (Workflow)

### **سيناريو 1: اشتراك جديد**

```
1. المشترك يسجل → tenant_subscriptions (status: pending)
   ↓
2. يدفع المبلغ → saas_payments (status: completed)
   ↓
3. Trigger تلقائي → tenant_subscriptions (status: active) ✅
   ↓
4. Dashboard يعرض الإيرادات الفعلية
```

### **سيناريو 2: تجديد الاشتراك**

```
1. المشترك يجدد → دفعة جديدة
   ↓
2. payment_type = 'subscription'
   ↓
3. period_start & period_end تحدد الفترة الجديدة
   ↓
4. Trigger يمدد end_date في tenant_subscriptions
```

### **سيناريو 3: استرجاع (Refund)**

```
1. طلب استرجاع
   ↓
2. دفعة جديدة: payment_type = 'refund'
   ↓
3. amount = -299.00 (سالب)
   ↓
4. status = 'refunded'
```

---

## 🧪 الاختبار

### **1. تشغيل Migration:**

```bash
# في Supabase SQL Editor
\i supabase/migrations/STEP_57_saas_payments_infrastructure.sql
```

**النتيجة المتوقعة:**
```
✅ جدول saas_payments تم إنشاؤه
✅ Indexes تم إنشاؤها
✅ Functions تم إنشاؤها
✅ Triggers تم إنشاؤها
✅ 3 دفعات تجريبية تم إضافتها
📊 إجمالي الإيرادات: $897
```

### **2. التحقق من البيانات:**

```sql
-- عرض جميع الدفعات
SELECT 
    payment_number,
    amount,
    currency,
    payment_method,
    status,
    collection_date
FROM saas_payments
ORDER BY collection_date DESC;

-- إجمالي الإيرادات
SELECT get_total_revenue('USD');

-- الإيرادات الشهرية
SELECT * FROM get_monthly_revenue(6, 'USD');
```

### **3. اختبار Dashboard:**

```bash
npm run dev
# افتح: http://localhost:5174/saas
```

**يجب أن ترى:**
- ✅ الإيرادات الشهرية: $897 (من الدفعات الفعلية)
- ✅ Revenue Trend Chart يعرض البيانات
- ✅ Payment Methods Chart (قادم)

---

## 🎨 Dashboard Updates

### **البطاقات الإحصائية:**

```typescript
// Monthly Revenue Card
<Card>
  <CardHeader>الإيرادات الشهرية</CardHeader>
  <CardContent>
    <div className="text-2xl">${totalRevenue}</div>
    <p>من الدفعات المكتملة</p>  ← جديد!
  </CardContent>
</Card>
```

### **الرسوم البيانية:**

1. **Revenue Trend** ✅ (محدّث)
   - الآن يعرض الدفعات الفعلية
   - مجمع حسب تاريخ التحصيل

2. **Payment Methods** 🆕 (جديد - قادم)
   - توزيع الدفعات حسب الطريقة
   - Pie Chart ملون

3. **Recent Payments Table** 🆕 (جديد - قادم)
   - آخر 10 دفعات
   - مع تفاصيل المشترك والباقة

---

## 📝 حالات الدفعة (Payment Status)

| الحالة | الكود | الوصف |
|--------|-------|-------|
| ⏳ معلق | `pending` | دفعة منتظرة |
| ✅ مكتمل | `completed` | دفعة محصّلة |
| ❌ فاشل | `failed` | فشل الدفع |
| 🔄 مسترجع | `refunded` | تم الاسترجاع |
| 🚫 ملغي | `cancelled` | ملغي |

---

## 💡 أمثلة عملية

### **مثال 1: إضافة دفعة يدوياً**

```sql
INSERT INTO saas_payments (
    payment_number,
    tenant_id,
    subscription_id,
    plan_id,
    amount,
    currency,
    payment_type,
    payment_method,
    status,
    collection_date,
    account_name,
    reference_number,
    period_start,
    period_end
) VALUES (
    generate_payment_number(),
    '<tenant_id>',
    '<subscription_id>',
    '<plan_id>',
    299.00,
    'USD',
    'subscription',
    'bank_transfer',
    'completed',
    NOW(),
    'Main Bank Account',
    'TRF-12345',
    NOW()::DATE,
    (NOW() + INTERVAL '1 month')::DATE
);
```

### **مثال 2: استعلام الإيرادات السنوية**

```sql
SELECT 
    TO_CHAR(collection_date, 'YYYY') as year,
    SUM(amount) as annual_revenue,
    COUNT(*) as payment_count
FROM saas_payments
WHERE status = 'completed'
AND currency = 'USD'
GROUP BY TO_CHAR(collection_date, 'YYYY')
ORDER BY year DESC;
```

### **مثال 3: أفضل المشتركين (Top Payers)**

```sql
SELECT 
    t.name as tenant_name,
    SUM(p.amount) as total_paid,
    COUNT(p.id) as payment_count
FROM tenants t
JOIN saas_payments p ON t.id = p.tenant_id
WHERE p.status = 'completed'
GROUP BY t.id, t.name
ORDER BY total_paid DESC
LIMIT 10;
```

---

## 🔮 الخطوات القادمة

### **Phase 3 - Advanced Payment Features:**

1. **Payment Methods Chart** 🆕
   - Pie chart for payment method distribution
   - مع النسب المئوية

2. **Recent Payments Table** 🆕
   - جدول آخر الدفعات
   - مع فلترة وبحث

3. **Payment Form** 🆕
   - نموذج لإضافة دفعة جديدة
   - مع اختيار المشترك والباقة

4. **Invoice Generation** 🆕
   - توليد فاتورة تلقائياً عند الدفع
   - PDF download

5. **Payment Reminders** 🆕
   - تنبيهات للدفعات المتأخرة
   - Email/SMS notifications

6. **Stripe Integration** 🆕
   - دفع أونلاين مباشر
   - Webhook handlers

---

## ✅ الخلاصة

### **قبل (❌):**
```
الإيرادات = مجموع أسعار الباقات (خاطئ)
أو
الإيرادات = الاشتراكات النشطة × السعر (نظري)
```

### **بعد (✅):**
```
الإيرادات = مجموع الدفعات المكتملة (فعلي)
✅ من جدول saas_payments
✅ فقط status = 'completed'
✅ مرتبط بالحساب البنكي/الصندوق
✅ مع تاريخ التحصيل الفعلي
```

---

## 📊 الإحصائيات

```
═══════════════════════════════════════════
   STEP 57: Payments Infrastructure
═══════════════════════════════════════════

✅ جدول saas_payments - 1 table
✅ دوال إحصائية - 5 functions
✅ Triggers - 2 triggers
✅ Policies - 4 RLS policies
✅ Frontend updates - 3 functions
✅ Sample data - 3 payments

📊 الإيرادات التجريبية: $897
💳 طرق الدفع: 3 methods
📈 الفترة: آخر 3 أشهر
```

---

**الحالة:** ✅ **مكتمل وجاهز للاستخدام**  
**التالي:** Dashboard Updates + Payment Management UI

---

# 💰 نظام دفعات احترافي جاهز! 💰

**Quick Start:**
```bash
# 1. Run migration
# في Supabase SQL Editor
\i STEP_57_saas_payments_infrastructure.sql

# 2. Test
npm run dev
# افتح: http://localhost:5174/saas

# 3. Check revenue
# يجب أن ترى: $897 من الدفعات الفعلية ✅
```
