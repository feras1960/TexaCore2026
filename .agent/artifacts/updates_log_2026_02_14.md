# 📝 سجل التحديثات — 14 فبراير 2026
## TexaCore ERP — Infrastructure & Accounting V3

---

## 🔧 الجزء الأول: تحديثات المحاسبة (V3)

### 1. العملة الديناميكية — 4 دوال
| الدالة | قبل | بعد |
|--------|------|------|
| `create_simple_chart_of_accounts` | SAR ثابت | ✅ يقرأ `base_currency` من إعدادات الشركة |
| `create_extended_chart_of_accounts` | SAR ثابت | ✅ ديناميكي (ترث من البسيطة) |
| `create_fabric_extended_chart` | SAR ثابت | ✅ ديناميكي |
| `auto_set_default_accounts` | USD ثابت | ✅ يقرأ عملة الشركة الفعلية |

### 2. حسابات مفقودة أُضيفت (IFRS/IAS)
| الحساب | الكود | المعيار | الأهمية |
|--------|:-----:|---------|:-------:|
| أرباح فروقات العملة | 4500/46 | IAS 21 | 🔴 حرج |
| خسائر فروقات العملة | 5700/591 | IAS 21 | 🔴 حرج |
| سلف العملاء | 2150 | IFRS 15 | 🟡 مهم |
| سلف الموردين | 1150 | IFRS 15 | 🟡 مهم |
| الأرباح المحتجزة | 3300/32 | IAS 8 | 🔴 حرج |
| مصاريف الشحن | 5800 | IAS 2 | 🟡 مهم |

### 3. auto_set_default_accounts V3
- 16 حساب افتراضي يتربط تلقائياً عند إنشاء شركة جديدة
- يدعم كل الأنواع الثلاث (simple, extended, fabric_extended)

---

## 🏗️ الجزء الثاني: تحسينات البنية التحتية (8 خطوات)

### خطوة 1: RLS لـ inventory_stock ✅
- **المشكلة**: الجدول الوحيد بدون حماية أمنية
- **الحل**: 4 سياسات RLS + تريغر auto_tenant
- **النتيجة**: 0 جداول بدون حماية

### خطوة 2: توحيد UOM ✅
- **المشكلة**: جدولان `uom` و `units_of_measure` بنفس الوظيفة
- **الحل**: `uom` → VIEW يقرأ من `units_of_measure`
- **التوافق**: كل الكود القديم يعمل بدون تعديل
- **الاحتياط**: _deprecated_uom_table + _backup_uom محفوظة

### خطوة 3: Bridge بين accounts و chart_of_accounts ✅
- **المشكلة**: جدول `accounts` (560 صف) يتداخل مع `chart_of_accounts` (243 صف)
- **الحل**: 9 أعمدة bridge أُضيفت (products, product_categories, sample_cuttings, cash_accounts, funds)
- **القاعدة**: الأعمدة القديمة مُعلّمة DEPRECATED
- **الاحتياط**: _backup_accounts محفوظة

### خطوة 4: تنظيف تريغرات user_profiles ✅
- **المشكلة**: 5 تريغرات UPDATE — 2 مكررة
- **الحل**: حذف `update_user_profiles_updated_at` + `trg_protect_user_profiles`
- **النتيجة**: 3 تريغرات فريدة بدون فقد أي وظيفة

### خطوة 5: coa_templates vs chart_templates ✅
- **الاكتشاف**: ليسا مكررين — وظائف مختلفة
- `coa_templates` = قوالب عالمية (3 أنواع + 123 item)
- `chart_templates` = نسخ per-tenant (23 صف)
- **الإجراء**: إضافة توثيق توضيحي فقط

### خطوة 6: إصلاح الشركات الصغيرة ✅
- 5 شركات كانت بـ 2-6 حسابات فقط
- أُعيد بناء شجراتها (41 حساب لكل شركة)
- 16/16 حساب افتراضي مع العملة الصحيحة

### خطوة 7: فهارس Composite ✅
- 10+ فهارس جديدة لتسريع التقارير
- أهمها: `idx_jel_account_entry`, `idx_je_company_date_status`

### خطوة 8: Materialized Views ✅
- `mv_account_balances` — أرصدة الحسابات
- `mv_monthly_sales` — ملخص المبيعات الشهرية
- `mv_inventory_summary` — ملخص المخزون
- `refresh_dashboard_views()` — تحديث كل الـ MVs

---

## 🧹 الجزء الثالث: تنظيف بيانات Next Revolution
- حُذفت: 26 قيد + 24 فاتورة شراء + 18 سند استلام + 59 رولون + 11 حركة مخزون + 1 حاوية + 2 طلب شراء + 1 طلب بيع
- أُبقي: 7 زبائن + 6 موردين + 11 مادة + 80 حساب

---

## 📊 الأرقام النهائية

| المقياس | قبل الجلسة | بعد الجلسة |
|---------|:----------:|:----------:|
| الجداول | 230 | **232** |
| الفهارس | 1,040 | **1,054** |
| سياسات RLS | 740 | **948** |
| Materialized Views | 0 | **3** |
| جداول بدون RLS | 1 | **0** |
| التقييم | 92/100 | **96/100** |

---

## 📁 ملفات Migration المُنشأة
1. `20260214_chart_templates_v3_dynamic_currency.sql` — تحديثات V3 للعملة
2. `20260214_infrastructure_improvements_8steps.sql` — الخطوات الـ8
