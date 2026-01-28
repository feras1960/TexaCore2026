# 🚀 خريطة الطريق - نظام الدفعات الكامل

## ✅ ما تم إنجازه (100%)

### المرحلة 1: اختيار العميل ✓
- [x] بحث متقدم بـ 7 حقول
- [x] قائمة منسدلة تفاعلية
- [x] عرض تفاصيل العميل
- [x] عرض الباقة والسعر
- [x] دعم RTL كامل

---

## ⏳ المراحل المتبقية

### المرحلة 2: تفاصيل الدفعة (الآن) 🎯

#### 2.1 المبلغ والعملة
```
┌─────────────────────────────────┐
│ 2. تفاصيل الدفعة              │
├─────────────────────────────────┤
│ المبلغ: [________] USD ▼       │
│                                 │
│ العملات المدعومة:              │
│ • USD (دولار أمريكي)           │
│ • EUR (يورو)                   │
│ • TRY (ليرة تركية)             │
│ • GBP (جنيه إسترليني)          │
└─────────────────────────────────┘
```

**ما يجب عمله:**
- حقل إدخال رقمي للمبلغ
- قائمة منسدلة للعملات
- التحقق من صحة المبلغ (> 0)

---

#### 2.2 تاريخ التحصيل
```
┌─────────────────────────────────┐
│ تاريخ التحصيل:                 │
│ [📅 2026-01-27] (اليوم)        │
│                                 │
│ يمكن تغيير التاريخ إذا لزم     │
└─────────────────────────────────┘
```

**ما يجب عمله:**
- Calendar picker
- افتراضي: اليوم
- يمكن اختيار تاريخ سابق/لاحق

---

### المرحلة 3: طريقة الدفع (حسب الاختيار) 💳

#### 3.1 خيار: نقدي (Cash)
```
┌─────────────────────────────────┐
│ طريقة الدفع: [💵 نقدي]        │
├─────────────────────────────────┤
│ الصندوق: [صندوق المبيعات ▼]   │
│                                 │
│ الأرصدة المتاحة:               │
│ • صندوق المبيعات: 15,000 USD   │
│ • صندوق الاستقبال: 8,500 USD   │
└─────────────────────────────────┘
```

**ما يجب عمله:**
- قائمة الصناديق النقدية (cash_boxes)
- عرض الرصيد الحالي

---

#### 3.2 خيار: حساب بنكي (Bank Transfer)
```
┌─────────────────────────────────┐
│ طريقة الدفع: [🏦 حوالة بنكية]  │
├─────────────────────────────────┤
│ الحساب البنكي:                 │
│ [Ziraat Bank - TR123... ▼]     │
│                                 │
│ اسم الحساب: [_____________]    │
│ رقم المرجع: [_____________]    │
│                                 │
│ إيصال الدفع:                   │
│ [📎 رفع صورة]                  │
│ (PNG, JPG - أقصى 2MB)          │
└─────────────────────────────────┘
```

**ما يجب عمله:**
- قائمة الحسابات البنكية (bank_accounts)
- حقول الحوالة (اسم الحساب، المرجع)
- رفع صورة الإيصال (Supabase Storage)
- ضغط الصورة قبل الرفع

---

#### 3.3 خيار: محفظة رقمية (Digital Wallet)
```
┌─────────────────────────────────┐
│ طريقة الدفع: [💳 محفظة رقمية]  │
├─────────────────────────────────┤
│ المحفظة:                        │
│ [PayPal Business ▼]            │
│                                 │
│ رقم المعاملة (اختياري):        │
│ [_____________]                 │
└─────────────────────────────────┘
```

**ما يجب عمله:**
- قائمة المحافظ الرقمية (digital_wallets)
- حقل رقم المعاملة (اختياري)

---

#### 3.4 خيار: بطاقة ائتمان (Credit Card)
```
┌─────────────────────────────────┐
│ طريقة الدفع: [💳 بطاقة ائتمان] │
├─────────────────────────────────┤
│ الحساب المرتبط:                │
│ [حساب المبيعات ▼]              │
│                                 │
│ آخر 4 أرقام (اختياري):         │
│ [****]                          │
└─────────────────────────────────┘
```

---

### المرحلة 4: الحالة والملاحظات 📝

```
┌─────────────────────────────────┐
│ 4. معلومات إضافية              │
├─────────────────────────────────┤
│ حالة الدفعة:                   │
│ [⏳ معلق / ✅ مكتمل / ❌ ملغي]  │
│                                 │
│ الملاحظات:                     │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │                             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**ما يجب عمله:**
- Select للحالة (pending, completed, cancelled)
- Textarea للملاحظات

---

### المرحلة 5: الحفظ والمعالجة 💾

#### 5.1 التحقق من البيانات
```typescript
const validatePayment = () => {
  if (!formData.tenant_id) return 'يجب اختيار عميل';
  if (!formData.amount || formData.amount <= 0) return 'المبلغ غير صحيح';
  if (!formData.payment_method) return 'يجب اختيار طريقة دفع';
  
  // تحقق حسب طريقة الدفع
  if (formData.payment_method === 'cash' && !formData.account_id) 
    return 'يجب اختيار صندوق';
  
  if (formData.payment_method === 'bank_transfer') {
    if (!formData.bank_account_id) return 'يجب اختيار حساب بنكي';
    if (!formData.reference_number) return 'يجب إدخال رقم المرجع';
  }
  
  return null; // كل شيء صحيح
};
```

---

#### 5.2 إنشاء رقم الدفعة
```sql
-- الدالة موجودة بالفعل
SELECT generate_payment_number() as payment_number;
-- النتيجة: PAY-20260127-0001
```

---

#### 5.3 رفع الإيصال (إذا وجد)
```typescript
const uploadReceipt = async (file: File) => {
  // 1. ضغط الصورة
  const compressed = await compressImage(file);
  
  // 2. رفع إلى Supabase Storage
  const path = `receipts/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('payment-receipts')
    .upload(path, compressed);
  
  // 3. الحصول على URL
  const { data: { publicUrl } } = supabase.storage
    .from('payment-receipts')
    .getPublicUrl(path);
  
  return publicUrl;
};
```

---

#### 5.4 حفظ الدفعة
```typescript
const savePayment = async () => {
  // 1. رفع الإيصال إن وجد
  let receipt_url = null;
  if (receiptFile) {
    receipt_url = await uploadReceipt(receiptFile);
  }
  
  // 2. إنشاء رقم الدفعة
  const { data: paymentNumber } = await supabase
    .rpc('generate_payment_number');
  
  // 3. حفظ الدفعة
  const { data, error } = await supabase
    .from('saas_payments')
    .insert({
      payment_number: paymentNumber,
      tenant_id: formData.tenant_id,
      product_id: selectedTenant.product_id,
      amount: formData.amount,
      currency: formData.currency,
      payment_method: formData.payment_method,
      payment_date: formData.payment_date,
      account_id: formData.account_id,
      bank_account_id: formData.bank_account_id,
      wallet_id: formData.wallet_id,
      reference_number: formData.reference_number,
      receipt_url: receipt_url,
      notes: formData.notes,
      status: formData.status,
    })
    .select()
    .single();
  
  return data;
};
```

---

### المرحلة 6: الربط بالحسابات 📊

#### 6.1 إنشاء قيد محاسبي
```typescript
const createAccountingEntry = async (payment: Payment) => {
  // تحديد الحسابات
  const debitAccount = getDebitAccount(payment.payment_method);
  const creditAccount = 'REVENUE_SAAS'; // إيرادات الساس
  
  // إنشاء القيد
  await supabase.from('journal_entries').insert({
    entry_number: `JE-${payment.payment_number}`,
    entry_date: payment.payment_date,
    description: `دفعة من ${payment.tenant.name}`,
    total_debit: payment.amount,
    total_credit: payment.amount,
    lines: [
      {
        account_id: debitAccount, // من (صندوق/بنك)
        debit: payment.amount,
        credit: 0,
      },
      {
        account_id: creditAccount, // إلى (إيرادات)
        debit: 0,
        credit: payment.amount,
      }
    ]
  });
};
```

---

#### 6.2 تحديث الحساب المالي
```typescript
// تحديث رصيد الصندوق/البنك
if (payment.payment_method === 'cash') {
  await supabase.rpc('update_cash_box_balance', {
    box_id: payment.account_id,
    amount: payment.amount,
    operation: 'add'
  });
}

if (payment.payment_method === 'bank_transfer') {
  await supabase.rpc('update_bank_balance', {
    bank_id: payment.bank_account_id,
    amount: payment.amount,
    operation: 'add'
  });
}
```

---

### المرحلة 7: تفعيل/تجديد الاشتراك 🎁

```typescript
const activateSubscription = async (payment: Payment) => {
  const tenant = selectedTenant;
  
  // 1. التحقق من الباقة
  const plan = tenant.subscription?.plan;
  if (!plan) return;
  
  // 2. حساب تاريخ الانتهاء
  const endDate = payment.amount >= plan.price_yearly 
    ? addYears(new Date(), 1)  // سنة
    : addMonths(new Date(), 1); // شهر
  
  // 3. تحديث/تفعيل الاشتراك
  await supabase
    .from('tenant_subscriptions')
    .upsert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      status: 'active',
      start_date: new Date(),
      end_date: endDate,
      last_payment_date: payment.payment_date,
      last_payment_amount: payment.amount,
    });
  
  // 4. تحديث حالة المستأجر
  await supabase
    .from('tenants')
    .update({ status: 'active' })
    .eq('id', tenant.id);
};
```

---

## 🎯 خطة التنفيذ المقترحة

### الآن (اليوم):
1. ✅ **اختيار العميل** - تم ✓
2. ⏳ **تفاصيل الدفعة** (المبلغ، العملة، التاريخ)
3. ⏳ **طريقة الدفع الأساسية** (نقدي/بنكي)

### غداً:
4. ⏳ رفع الإيصالات
5. ⏳ الربط بالحسابات
6. ⏳ تفعيل الاشتراك

---

## 📋 ملخص المهام

| المهمة | الأولوية | التقدير |
|--------|----------|----------|
| حقول المبلغ والعملة | 🔥 عالية | 10 دقائق |
| تاريخ التحصيل | 🔥 عالية | 5 دقائق |
| اختيار الصندوق/البنك | 🔥 عالية | 15 دقيقة |
| حقول الحوالة البنكية | 🟡 متوسطة | 10 دقائق |
| رفع الإيصال | 🟡 متوسطة | 20 دقيقة |
| حفظ الدفعة | 🔥 عالية | 15 دقيقة |
| القيد المحاسبي | 🟡 متوسطة | 25 دقيقة |
| تفعيل الاشتراك | 🟢 منخفضة | 15 دقيقة |

**الوقت الإجمالي المتوقع:** ~2 ساعة

---

## ❓ ما الذي تريد البدء به؟

### خيار 1: خطوة بخطوة 🐢
نبدأ بحقول المبلغ والعملة، ثم نتابع واحدة تلو الأخرى

### خيار 2: دفعة واحدة 🚀
أنفذ كل شيء دفعة واحدة وتجرب في النهاية

### خيار 3: الأساسيات أولاً ⚡
نركز على الوظائف الأساسية (نقدي فقط، بدون إيصالات)

---

**أخبرني: أي خيار تفضل؟** 🤔