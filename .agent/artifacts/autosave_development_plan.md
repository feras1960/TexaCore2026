# 🔧 خطة تطوير الحفظ التلقائي وإدارة المستندات التجارية
> **التاريخ**: 2026-02-15
> **الهدف**: إصلاح وتنظيم كامل لتدفق إنشاء/تعديل/حفظ فواتير المبيعات والمشتريات
> **الأولوية**: الحفظ التلقائي (AutoSave) كمرحلة أولى

---

## 📊 الحالة الحالية والمشاكل المكتشفة

### الملفات المعنية:
| الملف | الدور | الحالة |
|-------|-------|--------|
| `useAutoSave.ts` | Hook الحفظ التلقائي | ✅ أُعيد كتابته (v2) |
| `TradeService.ts` | خدمة CRUD للمستندات التجارية | ✅ تم التنظيف + buildItemRow helper |
| `UnifiedAccountingSheet.tsx` | المكون الموحد للعرض/التعديل | ✅ تم إصلاح data merge + fetchItems |
| `UnifiedTradeSheet.tsx` | غلاف المكون الموحد للتجارة | ✅ سليم |
| `ActionToolbar.tsx` | شريط الأدوات والأزرار | ⚠️ يحتاج مراجعة |
| `PurchaseCycleList.tsx` | قائمة دورة المشتريات | ⚠️ يحتاج مراجعة |
| `SalesCycleList.tsx` | قائمة دورة المبيعات | ⚠️ يحتاج مراجعة |

### المشاكل المكتشفة وحالتها:

| # | المشكلة | الخطورة | الحالة |
|---|---------|---------|--------|
| 1 | `useAutoSave` كان يحفظ فوراً عند أول render (ينشئ مسودات فارغة) | 🔴 حرجة | ✅ تم الإصلاح |
| 2 | `useAutoSave` كان يقارن JSON غير مستقر (حفظ متكرر بلا تغيير) | 🟡 متوسطة | ✅ تم الإصلاح |
| 3 | `tenant_id` يُرسل في items رغم عدم وجوده في الجدول | 🔴 حرجة | ✅ تم الإصلاح |
| 4 | `initialData` useEffect يمسح items المجلوبة من DB | 🔴 حرجة | ✅ تم الإصلاح |
| 5 | Type mapping خاطئ: `purchase_quotation → purchase_invoice` | 🟡 متوسطة | ✅ تم الإصلاح |
| 6 | Items لا تُحمّل header data عند فتح المستند (warehouse, currency) | 🟡 متوسطة | ✅ تم الإصلاح |
| 7 | `party_id` mapping: الـ save يرسل `party_id` لكن DB عموده `supplier_id` | 🔴 حرجة | ✅ سليم (mapping.partyField يحوله تلقائياً) |
| 8 | `grand_total` vs `total_amount`: تضارب أسماء الأعمدة | 🟡 متوسطة | ✅ سليم (mapping.amountField يحوله) |
| 9 | Items ناقصة حقول (tax, discount, color, item_code) | 🟡 متوسطة | ✅ تم إضافتها في buildItemRow |
| 10 | أزرار ActionToolbar لا تتوافق مع مراحل الجدول الجديد | 🟡 متوسطة | ⬜ المرحلة 2 |
| 11 | RLS على `purchase_transaction_items` قد يمنع CRUD | 🟡 متوسطة | ⬜ يحتاج اختبار |

---

## 🗺️ خطة التنفيذ — 4 مراحل

### المرحلة 1: إصلاح تدفق الحفظ (الأساس) ← **الأولوية القصوى**
**الهدف**: مستند يُنشأ ← يُحفظ تلقائياً ← يُعاد فتحه بكل بياناته

#### 1.1 ✅ إعادة كتابة `useAutoSave.ts` (تم)
- [x] تجاهل أول render (لا مسودات فارغة)
- [x] Stable serializer (تجاهل volatile fields)
- [x] Guard: لا حفظ بدون party أو items
- [x] منع حفظ متزامن (isSavingRef)

#### 1.2 ✅ إصلاح `UnifiedAccountingSheet.tsx` — data initialization (تم)
- [x] `initialData` useEffect: merge بدل overwrite
- [x] `fetchItems`: جلب header + items معاً وتدميجهم
- [x] إصلاح type mapping (purchase_quotation, purchase_request)

#### 1.3 ✅ التحقق من `TradeService.ts` — field mapping (تم)
```
النتائج:
✅ party_id → supplier_id/customer_id عبر mapping.partyField (سليم)
✅ grand_total → total_amount عبر mapping.amountField (سليم)
✅ date → doc_date عبر mapping.dateField (سليم)
✅ أُنشئ buildItemRow helper مشترك — يتضمن كل الحقول:
   item_code, tax_rate, tax_amount, discount_amount, discount_percent,
   color_id, color_name, roll_id, roll_code
✅ لا أخطاء TypeScript جديدة
```

#### 1.4 ⬜ اختبار تكاملي
- [ ] سيناريو 1: إنشاء فاتورة شراء → إضافة مورد + مواد → انتظار auto-save → إغلاق → فتح → التأكد أن كل شيء محفوظ
- [ ] سيناريو 2: نفس الشيء لفاتورة مبيعات
- [ ] سيناريو 3: تعديل مستند موجود → إضافة/حذف بنود → auto-save → انتظار → فتح → التأكد
- [ ] سيناريو 4: التأكد أنه لا يُنشئ مسودات فارغة

---

### المرحلة 2: تنظيم ActionToolbar حسب المراحل
**الهدف**: كل مرحلة (stage) تعرض الأزرار المناسبة فقط

#### 2.1 خريطة الأزرار لكل مرحلة
```
╔═══════════════╦══════════════════════════════════════════════╗
║ المرحلة        ║ الأزرار المتاحة                              ║
╠═══════════════╬══════════════════════════════════════════════╣
║ draft          ║ [تأكيد] [حذف المسودة]                       ║
║ (إنشاء/تعديل) ║  — AutoSave يعمل في الخلفية                  ║
║                ║  — مؤشر "جاري الحفظ..." / "✓ محفوظ"         ║
╠═══════════════╬══════════════════════════════════════════════╣
║ quotation      ║ [تعديل] [طباعة] [إرسال] [تحويل لأمر]       ║
╠═══════════════╬══════════════════════════════════════════════╣
║ order          ║ [اعتماد] [تعديل] [طباعة]                    ║
╠═══════════════╬══════════════════════════════════════════════╣
║ approved       ║ [تسجيل استلام] [إنشاء فاتورة]               ║
╠═══════════════╬══════════════════════════════════════════════╣
║ receipt        ║ [إنشاء فاتورة]                               ║
╠═══════════════╬══════════════════════════════════════════════╣
║ invoice        ║ [ترحيل] [معاينة القيد] [طباعة]              ║
╠═══════════════╬══════════════════════════════════════════════╣
║ posted         ║ [تسجيل دفعة] [عرض القيد] [طباعة]            ║
╠═══════════════╬══════════════════════════════════════════════╣
║ paid           ║ [طباعة] [عرض]  — قراءة فقط                  ║
╠═══════════════╬══════════════════════════════════════════════╣
║ cancelled      ║ [إعادة فتح]  — خلفية حمراء                   ║
╚═══════════════╩══════════════════════════════════════════════╝
```

#### 2.2 الخطوات:
- [ ] إضافة prop `currentStage` لـ ActionToolbar
- [ ] إنشاء `getStageActions(stage, docType)` function
- [ ] ربط كل زر بـ `onStageAdvance` callback
- [ ] إضافة مؤشر auto-save في وضع draft

---

### المرحلة 3: ربط PurchaseCycleList و SalesCycleList بالجداول الجديدة
**الهدف**: القوائم تعرض بيانات الجداول الموحدة الجديدة

#### 3.1 الخطوات:
- [ ] تحديث query في PurchaseCycleList ليقرأ من `purchase_transactions` فقط
- [ ] تحديث query في SalesCycleList ليقرأ من `sales_transactions` فقط
- [ ] إزالة المنطق المعقد لجلب من جداول متعددة (purchase_orders + purchase_invoices + ...)
- [ ] فلترة بالـ stage بدل نوع الجدول (activeTab → stage filter)
- [ ] تحديث `handleRowClick` لتمرير `stage` و `initialData` بشكل صحيح
- [ ] تبسيط `getSheetDocType` — كل المستندات الآن `trade_invoice` مع stage مختلف

---

### المرحلة 4: تنظيف الكود القديم
**الهدف**: إزالة dead code والتبسيط

#### 4.1 الخطوات:
- [ ] إزالة الـ mapping المتكرر (`tradeTypeMap`) — يُعرّف مرة واحدة ويُستخدم في كل مكان
- [ ] توحيد naming convention: `total_amount` vs `grand_total` (اختيار واحد فقط)
- [ ] إنشاء `TradeDocumentTypes.ts` — ملف واحد لكل الأنواع والتعريفات
- [ ] تنقية console.log statements (إبقاء المفيد فقط)
- [ ] مراجعة RLS policies على الجداول الجديدة
- [ ] التأكد من عدم وجود orphaned items

---

## 📐 الثوابت التقنية (قرارات مهمة)

### 1. مصدر الحقيقة (Source of Truth)
```
الجدول الجديد هو المصدر الوحيد:
- purchase_transactions + purchase_transaction_items
- sales_transactions + sales_transaction_items
- الجداول القديمة = أرشيف فقط (لا قراءة ولا كتابة)
```

### 2. قاعدة field mapping (لمنع التضارب)
```
UI Layer (data state)     →    DB Layer (TradeService)
─────────────────────           ──────────────────────
party_id                  →    supplier_id / customer_id (حسب mode)
grand_total               →    total_amount
tax_total                 →    tax_amount
date                      →    doc_date
items                     →    purchase_transaction_items / sales_transaction_items
```

### 3. قاعدة الأوضاع (Modes)
```
create  = مستند جديد (لم يُحفظ بعد)
         → AutoSave ينشئ record بـ stage='draft' عند أول تغيير حقيقي
         → بعد أول حفظ، يتحول لـ edit

edit    = مستند موجود قيد التعديل
         → AutoSave يحدّث الـ record
         → أزرار: [تأكيد] [إلغاء]

view    = مستند موجود للعرض فقط
         → AutoSave مُعطّل
         → أزرار تعتمد على stage
```

### 4. قاعدة الـ items table
```
- لا tenant_id في جداول items (العزل عبر FK → header → tenant_id)
- Delete + Re-insert عند التحديث (أبسط وأنظف)
- foreignKey = 'transaction_id' لجداول purchase/sales_transaction_items
```

---

## 🔍 نقاط الفحص (Checkpoints)

### قبل بدء أي مرحلة:
1. ✅ هل TypeScript يُجمّع بدون أخطاء؟
2. ✅ هل الصفحة تُحمّل بدون أخطاء console؟

### بعد كل مرحلة:
1. ✅ إنشاء مسودة → يحفظ auto-save (مع party أو items)
2. ✅ إغلاق وفتح → البيانات كلها موجودة (header + items)
3. ✅ تعديل → auto-save يحدّث (لا duplicates)
4. ❌ لا مسودات فارغة في قاعدة البيانات
5. ❌ لا أخطاء في الـ console

---

## ⏱️ ترتيب التنفيذ الآن

الإصلاحات التي تمت:
1. ✅ `useAutoSave.ts` — إعادة كتابة كاملة
2. ✅ `UnifiedAccountingSheet.tsx` — data merge + fetchItems
3. ✅ `TradeService.ts` — إزالة tenant_id من items
4. ✅ Type mapping fixes

**المطلوب الآن (المرحلة 1.3):**
→ فحص field mapping في `TradeService.createTradeDocument` و `updateTradeDocument`
→ التأكد أن `party_id` → `supplier_id` / `customer_id`
→ التأكد أن `grand_total` → `total_amount`
→ اختبار تكاملي
