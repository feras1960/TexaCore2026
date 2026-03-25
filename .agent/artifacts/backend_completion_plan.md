# 🔧 خطة استكمال الباك إند — TexaCore ERP
## Backend Completion Plan
### التاريخ: 14 فبراير 2026

---

## ✅ رأيي في التحليل

التحليل **دقيق بنسبة 90%** مع بعض الملاحظات المهمة:

### ما أتفق معه تماماً ✅
1. **FKs المفقودة** — هذه فعلاً أخطر نقطة هيكلية
2. **جداول Items المفقودة** — بدونها لا يمكن تتبع بنود المستندات
3. **الروابط التسلسلية** — `purchase_orders.quotation_id` و `purchase_invoices.order_id` مفقودة فعلاً
4. **Business Logic Functions** — الفرونت إند يعمل عمل الباك إند (receiptCompletionService.ts = 1046 سطر!)
5. **التوصية بعدم الاستعانة بمطور فرونت الآن** — صحيحة 100%

### ما أختلف معه أو أضيف عليه ⚠️
1. **تقييم 30% للمشتريات مبالغ فيه نحو الأسفل** — الحقيقة ~45% لأن:
   - `receiptCompletionService.ts` (8 خطوات كاملة) يعمل بنجاح (وهو Business Logic بالـ Frontend)
   - `TradeService.ts` فيه `convertDocument()` الذي يحوّل المستندات
   - `update_inventory_stock()` trigger يعمل بشكل صحيح
2. **المقترح بنقل كل الـ Business Logic للـ Database Functions** — أختلف جزئياً:
   - الأفضل: **hybrid approach** (دوال RPC للعمليات الذرية + TypeScript للتنسيق)
   - السبب: Debug وصيانة PL/pgSQL أصعب بكثير من TypeScript
3. **عدد 315 function** — كثير منها helper functions لـ RLS، الرقم الحقيقي للـ business functions ~25

---

## 🎯 الخطة المحدّثة (4 مراحل عملية)

### المرحلة ١: سلامة البيانات — FKs + روابط تسلسلية ⏱️ 2-3 ساعات
**الهدف:** ضمان Referential Integrity

| الإجراء | الحالة |
|---------|--------|
| إضافة `purchase_orders.quotation_id → purchase_quotations` | 🔴 مفقود |
| إضافة `purchase_invoices.order_id → purchase_orders` | 🔴 مفقود |
| إصلاح FK لـ `purchase_invoices.supplier_id → suppliers` | 🔴 مفقود |
| إصلاح FK لـ `purchase_invoices.branch_id → branches` | 🔴 مفقود |
| إصلاح FK لـ `purchase_invoices.journal_entry_id → journal_entries` | 🔴 مفقود |
| إصلاح FK لـ `sales_invoices.customer_id → customers` | 🔴 مفقود |
| إصلاح FK لـ `sales_invoices.journal_entry_id → journal_entries` | 🔴 مفقود |
| إصلاح FK لـ `payment_vouchers.journal_entry_id → journal_entries` | 🔴 مفقود |
| إصلاح FK لـ `payment_receipts.journal_entry_id → journal_entries` | 🔴 مفقود |
| إصلاح FK لـ `purchase_receipt_items.material_id → fabric_materials` | 🔴 مفقود |
| إضافة `purchase_receipts.journal_entry_id → journal_entries` | 🔴 مفقود |

**Script:** `Phase_1_fix_foreign_keys.sql`

### المرحلة ٢: الجداول المفقودة ⏱️ 3-4 ساعات
**الهدف:** إكمال بنود كل مستند

| الجدول | الغرض | الأولوية |
|--------|-------|----------|
| `purchase_return_items` | بنود مرتجع المشتريات | 🔴 حرج |
| `sales_return_items` | بنود مرتجع المبيعات | 🔴 حرج |
| `purchase_quotation_items` | بنود عرض سعر الشراء | 🟡 مهم |
| `purchase_request_items` | بنود طلب الشراء | 🟡 مهم |
| `quotation_items` | بنود عرض سعر المبيعات | 🟡 مهم |
| `sales_order_items` | بنود أمر البيع | 🟡 مهم |

**لكل جدول:** إنشاء + RLS + triggers (auto_set_tenant_id, enforce_brand_isolation) + indexes

**Script:** `Phase_2_missing_items_tables.sql`

### المرحلة ٣: دوال الترحيل (Business Logic) ⏱️ 5-7 أيام
**الهدف:** نقل Business Logic الحرج من Frontend إلى Backend

| الدالة | الغرض | النهج |
|--------|-------|-------|
| `post_purchase_receipt()` | ترحيل سند استلام | RPC (SECURITY DEFINER) |
| `post_purchase_invoice()` | ترحيل فاتورة مشتريات | RPC (SECURITY DEFINER) |
| `post_purchase_return()` | ترحيل مرتجع مشتريات | RPC |
| `post_sales_invoice()` | ترحيل فاتورة مبيعات | RPC |
| `post_sales_return()` | ترحيل مرتجع مبيعات | RPC |
| `convert_quotation_to_order()` | تحويل عرض سعر → أمر | RPC |
| `update_party_balance()` | تحديث رصيد المورد/العميل | RPC |

**Script:** `Phase_3_business_logic_functions.sql`

### المرحلة ٤: الاختبار والتكامل مع الفرونت ⏱️ 2-3 أيام
**الهدف:** تبسيط الفرونت إند

- استبدال `receiptCompletionService.ts` بـ `supabase.rpc('post_purchase_receipt', {...})`
- تبسيط `TradeService.ts` ليستخدم RPCs بدل عمليات متعددة
- اختبار الدورة الكاملة

---

## 📊 ترتيب الأولويات

```
المرحلة ١ (FKs)  ←── الآن (جلسة واحدة)
     ↓
المرحلة ٢ (Tables) ←── نفس الجلسة أو الجلسة التالية
     ↓
المرحلة ٣ (Functions) ←── أهم مرحلة (عدة جلسات)
     ↓
المرحلة ٤ (Integration) ←── بعد اكتمال المرحلة ٣
```
