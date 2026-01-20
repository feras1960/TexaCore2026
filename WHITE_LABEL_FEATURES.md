# نظام White Label للوكلاء - White Label System for Agents
# ميزة متقدمة للوكلاء لبيع النظام باسمهم الخاص

---

## 🎯 نظرة عامة

نظام White Label يسمح للوكلاء بدفع مبلغ مقدم (مثلاً 10,000 دولار) للحصول على:
- ✅ دومين خاص بهم (erp.companyname.com)
- ✅ شعار وألوان مخصصة
- ✅ معلومات اتصال خاصة
- ✅ بيع النظام باسمهم الخاص
- ✅ نسبة أرباح 50% (بدلاً من النسبة العادية)

---

## 💰 نموذج التسعير

### الخيار 1: دفعة واحدة (One-Time Payment)
- **المبلغ:** 10,000 دولار (قابل للتعديل)
- **الفترة:** 12 شهر (قابل للتجديد)
- **النسبة:** 50% من الأرباح

### الخيار 2: دفع سنوي (Annual)
- **المبلغ:** 10,000 دولار/سنة
- **النسبة:** 50% من الأرباح

### الخيار 3: دفع شهري (Monthly)
- **المبلغ:** 1,000 دولار/شهر
- **النسبة:** 50% من الأرباح

---

## 📋 الميزات المتاحة

### 1. الدومين الخاص
- ✅ دومين فرعي: `erp.companyname.com`
- ✅ دومين مخصص: `companyname.com`
- ✅ SSL Certificate تلقائي
- ✅ DNS Configuration
- ✅ Domain Verification

### 2. العلامة التجارية
- ✅ شعار مخصص (Logo)
- ✅ شعار للوضع الداكن (Dark Logo)
- ✅ Favicon
- ✅ ألوان مخصصة (Primary, Secondary, Accent)
- ✅ اسم العلامة التجارية
- ✅ شعارات (Slogans)

### 3. معلومات الاتصال
- ✅ بريد إلكتروني للاتصال
- ✅ رقم هاتف
- ✅ واتساب
- ✅ بريد الدعم الفني
- ✅ عنوان المكتب

### 4. روابط التواصل الاجتماعي
- ✅ موقع الويب
- ✅ فيسبوك
- ✅ تويتر
- ✅ لينكد إن
- ✅ إنستغرام

### 5. تخصيص متقدم
- ✅ CSS مخصص
- ✅ JavaScript مخصص
- ✅ نص Footer مخصص
- ✅ اللغة الافتراضية

---

## 🗄️ الجداول في قاعدة البيانات

### 1. `agents` (محدث)
**حقول جديدة:**
- `has_white_label` - هل لديه White Label
- `white_label_status` - حالة White Label
- `white_label_payment_amount` - مبلغ الدفعة
- `white_label_commission_percent` - نسبة الأرباح (50%)
- `white_label_activated_at` - تاريخ التفعيل
- `white_label_expires_at` - تاريخ الانتهاء

### 2. `white_label_domains`
**الحقول:**
- `agent_id` - الوكيل
- `domain` - الدومين
- `domain_type` - نوع الدومين (subdomain/custom)
- `ssl_enabled` - SSL مفعل
- `dns_configured` - DNS مُكوّن
- `status` - الحالة
- `verified` - تم التحقق

### 3. `white_label_configs`
**الحقول:**
- `agent_id` - الوكيل
- `brand_name` - اسم العلامة التجارية
- `logo_url` - رابط الشعار
- `primary_color` - اللون الأساسي
- `contact_email` - بريد الاتصال
- `custom_css` - CSS مخصص
- `custom_js` - JavaScript مخصص

### 4. `white_label_payments`
**الحقول:**
- `agent_id` - الوكيل
- `amount` - المبلغ
- `payment_method` - طريقة الدفع
- `period_months` - عدد الأشهر
- `valid_from` - من تاريخ
- `valid_to` - إلى تاريخ
- `status` - الحالة

### 5. `white_label_stats`
**الحقول:**
- `agent_id` - الوكيل
- `period_date` - تاريخ الفترة
- `total_tenants` - إجمالي العملاء
- `total_revenue` - إجمالي الإيرادات
- `agent_commission` - عمولة الوكيل
- `platform_revenue` - إيرادات المنصة

---

## 🔧 Functions المتاحة

### 1. `register_white_label_payment()`
**الوظيفة:** تسجيل دفعة White Label
```sql
SELECT register_white_label_payment(
    'agent_id'::UUID,
    10000,  -- المبلغ
    'bank_transfer',  -- طريقة الدفع
    'REF-12345',  -- مرجع الدفعة
    12  -- عدد الأشهر
);
```

### 2. `activate_white_label()`
**الوظيفة:** تفعيل White Label بعد الدفع
```sql
SELECT activate_white_label(
    'agent_id'::UUID,
    'payment_id'::UUID,
    'admin_user_id'::UUID
);
```

### 3. `add_white_label_domain()`
**الوظيفة:** إضافة دومين White Label
```sql
SELECT add_white_label_domain(
    'agent_id'::UUID,
    'erp.companyname.com',  -- الدومين
    'subdomain'  -- نوع الدومين
);
```

### 4. `verify_white_label_domain()`
**الوظيفة:** التحقق من صحة الدومين
```sql
SELECT verify_white_label_domain('domain_id'::UUID);
```

### 5. `check_white_label_validity()`
**الوظيفة:** التحقق من صلاحية White Label
```sql
SELECT check_white_label_validity('agent_id'::UUID);
```

---

## 📊 Views المتاحة

### `white_label_summary_view`
**الوظيفة:** ملخص شامل لـ White Label للوكيل
```sql
SELECT * FROM white_label_summary_view WHERE agent_id = '...';
```

**يحتوي على:**
- معلومات الوكيل
- حالة White Label
- عدد الدومينات
- إجمالي المدفوعات
- إجمالي العملاء والإيرادات

---

## 🎨 واجهة المستخدم (Frontend)

### 1. White Label Dashboard
- عرض حالة White Label
- عرض الدومينات
- عرض الإحصائيات
- عرض الإعدادات

### 2. White Label Payment
- نموذج تسجيل الدفعة
- عرض تاريخ الدفعات
- حالة الدفعات

### 3. Domain Management
- إضافة دومين جديد
- تكوين DNS
- التحقق من الدومين
- إدارة SSL

### 4. Branding Configuration
- رفع الشعار
- اختيار الألوان
- إدخال معلومات الاتصال
- تخصيص CSS/JS

---

## 🔐 الأمان والصلاحيات

### للوكلاء:
- ✅ عرض إعدادات White Label الخاصة بهم
- ✅ تعديل العلامة التجارية
- ✅ إدارة الدومينات
- ✅ عرض الإحصائيات

### للأدمن:
- ✅ تفعيل/تعطيل White Label
- ✅ الموافقة على الدفعات
- ✅ إدارة جميع White Labels
- ✅ عرض جميع الإحصائيات

---

## 📈 نموذج العمل

### للوكيل:
1. **الدفع:** يدفع 10,000 دولار
2. **الموافقة:** الأدمن يوافق على الدفعة
3. **التفعيل:** يتم تفعيل White Label
4. **التكوين:** الوكيل يضيف دومينه وإعداداته
5. **البيع:** يبدأ بيع النظام باسمه الخاص
6. **الأرباح:** يحصل على 50% من الأرباح

### للمنصة:
1. **استلام الدفعة:** 10,000 دولار
2. **تفعيل White Label:** بعد الموافقة
3. **المشاركة:** 50% من الأرباح للوكيل
4. **الدعم:** دعم فني للوكيل

---

## 💡 أمثلة الاستخدام

### مثال 1: وكيل يريد White Label
```typescript
// 1. تسجيل الدفعة
const payment = await whiteLabelService.registerPayment({
  agentId: 'agent-123',
  amount: 10000,
  paymentMethod: 'bank_transfer',
  periodMonths: 12
});

// 2. بعد الموافقة على الدفعة
await whiteLabelService.activate({
  agentId: 'agent-123',
  paymentId: payment.id,
  approvedBy: 'admin-user-id'
});

// 3. إضافة دومين
await whiteLabelService.addDomain({
  agentId: 'agent-123',
  domain: 'erp.companyname.com',
  domainType: 'subdomain'
});

// 4. تحديث العلامة التجارية
await whiteLabelService.updateBranding({
  agentId: 'agent-123',
  brandName: 'Company ERP',
  logoUrl: 'https://...',
  primaryColor: '#0A2540'
});
```

---

## 📝 Checklist للتطوير

### Backend (قاعدة البيانات):
- [x] إضافة حقول White Label لجدول `agents`
- [x] إنشاء جدول `white_label_domains`
- [x] إنشاء جدول `white_label_configs`
- [x] إنشاء جدول `white_label_payments`
- [x] إنشاء جدول `white_label_stats`
- [x] إنشاء Functions
- [x] إنشاء Views
- [ ] إضافة RLS Policies

### Frontend:
- [ ] White Label Dashboard
- [ ] White Label Payment Form
- [ ] Domain Management
- [ ] Branding Configuration
- [ ] White Label Stats
- [ ] Services Layer

---

## 🚀 الخطوات التالية

1. **تطبيق Migration:**
   - تطبيق `STEP_25_saas_white_label_system.sql` في Supabase

2. **تطوير Frontend:**
   - إنشاء Services
   - إنشاء Components
   - إضافة إلى ComponentLab

3. **التكامل:**
   - ربط مع نظام الدفع
   - ربط مع DNS Management
   - ربط مع Branding System

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
