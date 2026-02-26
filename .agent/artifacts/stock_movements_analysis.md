# 📊 تحليل شامل — صفحة حركات المخزون (Stock Movements)

## الوضع الحالي

### ✅ ما يعمل بشكل صحيح
| المكون | الحالة |
|--------|--------|
| `inventory_movements` table | ✅ موجود (0 صفوف حالياً) |
| `purchase_receipts` + `purchase_receipt_items` | ✅ موجود |
| `delivery_notes` + `delivery_note_items` | ✅ موجود |
| `StockMovementsPage.tsx` UI | ✅ يعمل (تبويبات: حركات + بانتظار الاستلام) |
| `MaterialReceiptDialog` | ✅ يعمل |
| `DeliveryPage.tsx` | ✅ يعمل (سندات التسليم) |

### ❌ مراجع مكسورة تحتاج تحديث

#### 1. `warehouseService.getPendingReceipts()` — يقرأ من `purchase_transactions` (القديم!)
```
السطر 931: .from('purchase_transactions') ← ❌ يجب الانتقال لـ purchase_invoices
السطر 933: select: invoice_no, doc_date ← ❌ الحقول في purchase_invoices مختلفة
السطر 936: .in('stage', [...]) ← ❌ purchase_invoices يستخدم document_stage بدل stage
```

**الحل:** تحديث الكويري لقراءة `purchase_invoices` بدل `purchase_transactions`

#### 2. `useReceiptSources.ts` — يقرأ فواتير من `purchase_transactions`
```
السطر 136: .from('purchase_transactions') ← ❌ قديم
السطر 141: .in('stage', ['invoice', 'posted', ...]) ← ❌ 
السطر 206: .from('purchase_transaction_items') ← ❌ يجب purchase_invoice_items
السطر 208: .in('transaction_id', ...) ← ❌ يجب invoice_id
```

**الحل:** تحديث كل مراجع `purchase_transactions` → `purchase_invoices`

#### 3. `StockMovementsPage.tsx` — يفتح فاتورة من `purchase_transactions`
```
السطر 107: .from('purchase_transactions') ← ❌ قديم
السطر 252: .from('purchase_transactions') ← ❌ قديم  
```

**الحل:** تحديث لفتح من `purchase_invoices`

#### 4. `useWarehouseQueries.ts` — Realtime يراقب `purchase_transactions`
```
السطر 358-363: useRealtimeInvalidation({ table: 'purchase_transactions' }) ← ❌
```

**الحل:** تغيير للمراقبة على `purchase_invoices`

#### 5. `warehouseService.createDraftReceipt()` — نوع المصدر قديم
```
السطر 1073: sourceDocumentType: '...purchase_transaction' ← ❌ يجب حذفه
```

---

## 🔗 خريطة الربط الجديدة

### المشتريات (Purchase Cycle)
```
┌─────────────────────────────────────────────────────────────────┐
│                  purchase_invoices (الجدول الموحد الجديد)        │
│  ├── document_stage: order → invoice → posted → paid            │
│  ├── invoice_number, invoice_date, supplier_id                  │
│  ├── receipt_mode: direct | international                       │
│  ├── receipt_status: pending | partial | received               │
│  ├── container_id (ربط بالكونتينر)                              │
│  └── warehouse_id                                               │
├─────────────────────────────────────────────────────────────────┤
│ purchase_invoice_items (بنود الفاتورة الموحدة)                   │
│  ├── invoice_id → purchase_invoices.id                           │
│  ├── material_id → fabric_materials.id                          │
│  ├── quantity, unit_price, total                                │
│  └── tax_rate, tax_amount                                       │
├─────────────────────────────────────────────────────────────────┤
│ purchase_receipts (إذن استلام أمين المستودع)                     │
│  ├── invoice_id → purchase_invoices.id ← ✅ يجب الربط هنا       │
│  ├── container_id → containers.id                               │
│  ├── warehouse_id, status (draft/completed)                     │
│  └── draft_data (مسودة بنود الاستلام)                           │
├─────────────────────────────────────────────────────────────────┤
│ purchase_receipt_items (بنود إذن الاستلام)                       │
│  ├── receipt_id → purchase_receipts.id                           │
│  ├── material_id, quantity_received, quantity_rejected           │
│  └── container_item_id                                          │
├─────────────────────────────────────────────────────────────────┤
│ inventory_movements (حركة مخزون نهائية)                          │
│  ├── reference_id → purchase_receipts.id                        │
│  ├── reference_type = 'goods_receipt'                            │
│  ├── movement_type = 'receipt' / 'purchase'                     │
│  └── material_id, quantity, to_warehouse_id                     │
└─────────────────────────────────────────────────────────────────┘
```

### المبيعات (Sales Cycle)
```
┌─────────────────────────────────────────────────────────────────┐
│ sales_transactions (فاتورة/عرض سعر)                              │
│  ├── customer_id, stage, total_amount                           │
│  └── is_active                                                  │
├─────────────────────────────────────────────────────────────────┤
│ delivery_notes (سند تسليم المستودع)                              │
│  ├── sales_order_id → sales_transactions.id                     │
│  ├── warehouse_id, customer_id, status                          │
│  └── driver_id, delivery_address                                │
├─────────────────────────────────────────────────────────────────┤
│ delivery_note_items (بنود التسليم)                               │
│  ├── delivery_note_id → delivery_notes.id                       │
│  ├── material_id, roll_id                                       │
│  ├── quantity_ordered, quantity_to_deliver, quantity_delivered   │
│  └── warehouse_id, location_id                                  │
├─────────────────────────────────────────────────────────────────┤
│ inventory_movements (حركة مخزون - إخراج)                         │
│  ├── reference_id → delivery_notes.id                           │
│  ├── reference_type = 'delivery_note'                           │
│  ├── movement_type = 'sale' / 'issue'                           │
│  └── material_id, quantity, from_warehouse_id                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 خطة التنفيذ (حسب الأولوية)

### المرحلة 1: إصلاح المراجع المكسورة (ضروري)
| # | الملف | المطلوب |
|---|-------|---------|
| 1 | `warehouseService.ts` → `getPendingReceipts()` | تحديث من `purchase_transactions` → `purchase_invoices` |
| 2 | `useReceiptSources.ts` | تحديث الفواتير و البنود من الجداول الجديدة |
| 3 | `StockMovementsPage.tsx` → `handleViewSourceDocument()` | تحديث فتح الفاتورة |
| 4 | `StockMovementsPage.tsx` → `handleOpenLinkedInvoice()` | تحديث البحث عن الفاتورة |
| 5 | `useWarehouseQueries.ts` | تغيير Realtime من `purchase_transactions` → `purchase_invoices` |

### المرحلة 2: ازدواجية المصادر (Dual-Source)
حيث أن `purchase_transactions` لا يزال يحتوي على 41 صفًا و `purchase_invoices` يحتوي على 2 فقط:
- **الحل:** قراءة من **كلا الجدولين** مؤقتاً
- عرض فواتير من `purchase_invoices` أولاً
- ثم الفواتير القديمة من `purchase_transactions` كـ fallback

### المرحلة 3: تحسينات مقترحة
1. إضافة `container_id` في `purchase_invoices` لربط مباشر ✅ (موجود)
2. تحسين عمود `receipt_status` في `purchase_invoices` ليتحدث تلقائياً عند إكمال الاستلام
3. إضافة كونتينرات في pending receipts
