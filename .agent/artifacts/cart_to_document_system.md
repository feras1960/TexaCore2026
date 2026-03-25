# 🛒→📄 Cart-to-Document Conversion System
## توثيق منظومة تحويل السلة إلى مستندات المبيعات

> **تاريخ التنفيذ**: 2026-02-11  
> **الحالة**: ✅ مكتمل ومُختبر  
> **التوافق**: Phase 41 Unified RLS ✅ | auto_set_tenant_id Triggers ✅

---

## 📋 نظرة عامة

منظومة تحويل عناصر السلة (Cart) إلى مستندات مبيعات رسمية (عرض سعر / حجز بضائع / أمر بيع) مع حفظ تلقائي كمسودة في Supabase والتوجيه لصفحة دورة المبيعات.

### المسار الكامل (User Flow):
```
Cart → اختيار نوع المستند → UnifiedTradeSheet 
  → حفظ/إغلاق → Supabase INSERT (مسودة) 
  → تفريغ السلة → إشعار نجاح → /sales/cycle
```

---

## 🗂 الملفات المعدّلة

### 1. `src/components/cart/CartDrawer.tsx`
**التعديلات الرئيسية:**

| التعديل | التفاصيل |
|---------|----------|
| **Imports جديدة** | `supabase`, `useCompany`, `useQueryClient`, `useNavigate`, `useRef`, `useCallback` |
| **State جديد** | `isSaving` (boolean), `savedRef` (ref لمنع الحفظ المكرر) |
| **`handleConvert(target)`** | يعيّن `savedRef = false` → يفتح TradeSheet → يغلق الدرج |
| **`saveDraftToSupabase(docData?)`** | الدالة المركزية للحفظ في Supabase — تفاصيل أدناه |
| **`handleTradeSheetSave(docData?)`** | حفظ صريح → تفريغ السلة → toast ✅ → invalidate → navigate |
| **`handleTradeSheetClose(open)`** | حفظ تلقائي كمسودة عند الإغلاق بالخارج/X/Escape |

#### دالة `saveDraftToSupabase` — التفاصيل:
```typescript
// 1. يمنع الحفظ المكرر عبر savedRef
// 2. يحصل على tenant_id من supabase.auth.getUser()
// 3. يُسلسل بنود السلة كـ JSON في عمود notes
// 4. يتعامل ذكياً مع فروقات الجداول:
//    - quotations & sales_orders → يرسل currency
//    - transit_reservations → يرسل reserved_quantity, الحالة = 'pending'
// 5. يُنشئ رقم مستند فريد (QTN-XXXX / SO-XXXX / RSV-XXXX)
```

#### خريطة الجداول (TABLE_MAP):
| ConvertTarget | Supabase Table | Date Column | Num Prefix | Total Column |
|---------------|----------------|-------------|------------|-------------|
| `quotation` | `quotations` | `quotation_date` | `QTN` | `total_amount` |
| `reservation` | `transit_reservations` | `reservation_date` | `RSV` | — |
| `order` | `sales_orders` | `order_date` | `SO` | `total_amount` |

### 2. `src/features/accounting/components/unified/tabs/TradeMainTab.tsx`
**التعديلات السابقة (للاكتمال):**
- كشف تلقائي لبنود السلة عبر `isCartItems` (material_id + warehouse_id)
- عرض `CartItemsView` بدلاً من `TradeItemsGrid` عند اكتشاف بنود السلة
- تحويل البيانات من `CartItem` إلى `InvoiceLineItem`

### 3. `src/features/trade/components/grids/CartItemsView.tsx`
**مكوّن جديد تم إنشاؤه سابقاً:**
- عرض بنود الفاتورة بشكل مجمّع حسب المادة
- تحرير مباشر (كمية، سعر، خصم)
- عرض الرولونات المفضلة
- فوتر لاصق للإجماليات

---

## 🗄 تغييرات قاعدة البيانات

### السكربت: `supabase/scripts/cart_to_document_columns.sql`

| # | العملية | الجدول | التفاصيل |
|---|---------|--------|----------|
| 1 | ADD COLUMN | `quotations` | `notes TEXT` — لتخزين بنود السلة كـ JSON |
| 2 | ADD COLUMN | `quotations` | `currency VARCHAR(3) DEFAULT 'SAR'` |
| 3 | ADD COLUMN | `sales_orders` | `notes TEXT` |
| 4 | ADD COLUMN | `sales_orders` | `currency VARCHAR(3) DEFAULT 'SAR'` |
| 5 | ALTER COLUMN | `sales_orders` | `customer_id` → nullable (لدعم المسودات بدون عميل) |
| 6 | ADD COLUMN | `transit_reservations` | `currency VARCHAR(3) DEFAULT 'SAR'` |
| 7 | CREATE TRIGGER | `quotations` | `trg_auto_tenant_quotations` → `auto_set_tenant_id()` |
| 8 | CREATE TRIGGER | `transit_reservations` | `trg_auto_tenant_transit_reservations` → `auto_set_tenant_id()` |
| 9 | RLS UPDATE | `quotations` | حذف السياسات القديمة + تطبيق الموحّدة عبر `create_company_rls_policies()` |
| 10 | RLS UPDATE | `transit_reservations` | نفس المعالجة |

### التوافق مع معايير الأمان:
- ✅ **Unified RLS (Phase 41)**: السياسات تستخدم `check_row_access()` + `can_access_company()` + `get_user_tenant_id()`
- ✅ **D-Group Pattern**: الجداول الثلاثة فيها `tenant_id` + `company_id` → 4 سياسات منفصلة (SELECT/INSERT/UPDATE/DELETE)
- ✅ **auto_set_tenant_id Trigger**: يملأ `tenant_id` تلقائياً إذا لم يُرسل
- ✅ **Brand Isolation**: يعتمد على التريغرات الموجودة في `CREATE_protection_triggers.sql`

---

## 🔄 مسار البيانات (Data Flow)

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  CartContext  │────▶│  CartDrawer.tsx   │────▶│ UnifiedTrade    │
│  (state.items)│     │  handleConvert()  │     │ Sheet.tsx        │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                        │
                     ┌──────────────────┐               │ onSave / onClose
                     │  saveDraftTo     │◀──────────────┘
                     │  Supabase()      │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │  Supabase        │
                     │  quotations /    │
                     │  sales_orders /  │
                     │  transit_reserv. │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐     ┌──────────────────┐
                     │  invalidateQuery │────▶│ SalesCycleList   │
                     │  ['sales_cycle   │     │ يعرض المستند     │
                     │     _full']      │     │ الجديد فوراً     │
                     └──────────────────┘     └──────────────────┘
```

---

## 📦 هيكل البيانات المحفوظة

### عمود `notes` (JSON مُسلسل في TEXT):
```json
{
  "items": [
    {
      "material_id": "uuid",
      "material_code": "FAB-001",
      "material_name_ar": "قماش قطني",
      "material_name_en": "Cotton Fabric",
      "quantity": 150,
      "unit": "meter",
      "unit_price": 25.50,
      "subtotal": 3825,
      "total": 3825,
      "warehouse_id": "uuid",
      "warehouse_name_ar": "المستودع الرئيسي",
      "warehouse_name_en": "Main Warehouse",
      "preferred_rolls": [
        { "roll_id": "uuid", "roll_number": "R-001", "meters": 50 }
      ]
    }
  ],
  "_source": "cart"
}
```

---

## ✅ حالة التحقق

| الفحص | النتيجة |
|-------|---------|
| TypeScript Compilation (`tsc --noEmit`) | ✅ صفر أخطاء في الملفات المعدّلة |
| SQL Script Execution | ✅ نجح بالكامل — RLS Compliant |
| Unified RLS Compatibility | ✅ Phase 41 — D-Group Pattern |
| auto_set_tenant_id Triggers | ✅ مُفعّلة على quotations + transit_reservations |
| Dev Server Running | ✅ يعمل بدون أخطاء |

---

## 🎯 الخطوات القادمة (ليست جزء من هذا التوثيق)

1. **اختبار E2E**: إضافة بنود للسلة → تحويل → التحقق من ظهور المستند في دورة المبيعات
2. **تحسين الفاتورة**: استبدال البيانات الوهمية بديناميكية (عملاء، مستودعات حقيقية)
3. **فتح المسودة للتعديل**: عند فتح مستند مسودة من SalesCycleList، تحميل بنود `notes` وعرضها في CartItemsView
4. **POS Mode**: تفعيل البيع المباشر (فاتورة + تسليم + خصم مخزون فوري)
