# 🏗️ خطة التنفيذ الشاملة — نظام المعاملات الموحد (Unified Transactions)

> **التاريخ**: 2026-02-15  
> **الهدف**: تحويل النظام من جداول متعددة (13 جدول) إلى جدول موحد واحد مع مكونات frontend مخصصة  
> **الفلسفة**: سجل واحد يتنقل عبر المراحل — بدون نسخ بيانات

---

## 📊 الجزء 1: تحليل الوضع الحالي (AS-IS)

### 1.1 الجداول الموجودة حالياً (13 جدول مُبعثر)

| # | الجدول | نوعه | جدول البنود |
|---|--------|------|------------|
| 1 | `quotations` | عرض سعر مبيعات | `quotation_items` |
| 2 | `transit_reservations` | حجز ترانزيت | `reservation_items` |
| 3 | `sales_orders` | أمر بيع | `sales_order_items` |
| 4 | `sales_deliveries` | إذن تسليم | `delivery_note_items` |
| 5 | `sales_invoices` | فاتورة مبيعات | `sales_invoice_items` |
| 6 | `purchase_requests` | طلب شراء | `purchase_request_items` |
| 7 | `purchase_quotations` | عرض سعر شراء | `purchase_quotation_items` |
| 8 | `purchase_orders` | أمر شراء | `purchase_order_items` |
| 9 | `purchase_invoices` | فاتورة مشتريات | `purchase_invoice_items` |
| 10 | `purchase_receipts` | إذن استلام | `purchase_receipt_items` |
| 11 | `purchase_returns` | مرتجع مشتريات | `purchase_return_items` |
| 12 | `sales_returns` | مرتجع مبيعات | `sales_return_items` |
| 13 | `journal_entries` | قيد محاسبي | `journal_entry_lines` |

### 1.2 المكونات الحالية

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| `UnifiedTradeSheet` | `src/features/trade/components/UnifiedTradeSheet.tsx` | نموذج إنشاء/تعديل مستندات التجارة |
| `UnifiedAccountingSheet` | `src/features/accounting/components/unified/UnifiedAccountingSheet.tsx` | الشيت الموحد للعرض والتعديل |
| `TradeService` | `src/features/trade/services/TradeService.ts` | CRUD للمستندات — يدعم 13 نوع |
| `PurchaseAccountingService` | `src/services/purchaseAccountingService.ts` | إنشاء قيود محاسبية للمشتريات |
| `AccountingSettings` | `src/features/accounting/AccountingSettings.tsx` | إعدادات محاسبية (حسابات/ضريبة/ترقيم) |
| `StatusDropdown` | (added recently) | تغيير حالة المستند تفاعلياً |

### 1.3 إعدادات المحاسبة الحالية (`company_accounting_settings`)

```typescript
// الحقول الموجودة فعلاً:
- base_currency, decimal_places, date_format, number_format
- vat_enabled, vat_rate
- auto_post_entries, require_approval
- default_cash/bank/revenue/expense/receivable/payable_account_id
- default_purchase/cogs/sales/inventory_account_id
- default_tax_input/output_account_id
- default_fx_gain/loss_account_id
- default_freight_in/retained_earnings_account_id
- journal_entry_prefix, reset_numbering_yearly, current_entry_number
- supported_currencies, default_sales/purchase/international_currency
```

### 1.4 الخدمات المتأثرة

| الخدمة | الربط الحالي |
|--------|-------------|
| `warehouseService` | يقرأ من `purchase_invoices` |
| `receiptCompletionService` | يربط `purchase_orders` ↔ `purchase_invoices` |
| `useReceiptSources` | يجلب من `purchase_invoices` + `purchase_orders` |
| `purchaseAccountingService` | ينشئ قيود من `purchase_invoices` |
| `confirmationService` | يحدث status في `purchase_invoices` و `sales_invoices` |
| `editFlowService` | يتعامل مع `journal_entries` |
| `useSalesReports` | يقرأ من `sales_invoices` |
| `useMaterialPriceHistory` | يقرأ من `purchase_invoices` + `sales_invoices` |

---

## 🔄 الجزء 2: التصميم الجديد (TO-BE)

### 2.1 قاعدة البيانات — جدولان فقط + مساعِدات

```
┌─────────────────────────────────────────────────────────────────┐
│                    الجداول الأساسية                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. transactions          ← الجدول الرئيسي (header)             │
│ 2. transaction_items     ← بنود المعاملة                       │
│ 3. transaction_stage_log ← سجل تحولات المراحل                  │
│ 4. document_sequences    ← تسلسل الترقيم per-tenant            │
├─────────────────────────────────────────────────────────────────┤
│                    الجداول المساعدة (موجودة)                    │
├─────────────────────────────────────────────────────────────────┤
│ 5. journal_entries       ← القيود المحاسبية (كما هي)           │
│ 6. journal_entry_lines   ← سطور القيود (كما هي)               │
│ 7. inventory_movements   ← حركات المستودع (جديد أو تحسين)     │
│ 8. payment_allocations   ← ربط الدفعات بالمعاملات (جديد)      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 مراحل الدورة حسب النوع

```
═══════════════════════════════════════════════════════════════
              دورة المبيعات (sale)
═══════════════════════════════════════════════════════════════

  draft ──→ quotation ──→ order ──→ delivery ──→ invoice ──→ paid
  مسودة    عرض سعر      أمر بيع    تسليم       فاتورة     مدفوعة

  أرقام:   SQ-2026-001  SO-2026-001 SD-2026-001 SI-2026-001
  
  أثر مستودع:                        ✅ خصم
  أثر محاسبي:                                    ✅ قيد


═══════════════════════════════════════════════════════════════
              دورة المشتريات (purchase)
═══════════════════════════════════════════════════════════════

  draft ──→ quotation ──→ order ──→ approved ──→ receipt ──→ invoice ──→ paid
  مسودة    عرض سعر      أمر شراء   معتمد       استلام     فاتورة     مدفوعة

  أرقام:   PQ-2026-001  PO-2026-001              PR-2026-001 PI-2026-001

  أثر مستودع:                                     ✅ إضافة
  أثر محاسبي:                                                 ✅ قيد
  
  ⚡ ملاحظة: مرحلة "approved" خاصة بالمشتريات = اعتماد مدير + حجز
```

### 2.3 الأزرار حسب المرحلة (التصميم النهائي)

#### دورة المشتريات:

| المرحلة | العنوان | الحالة | الأزرار الرئيسية | الأزرار الثانوية |
|---------|---------|--------|-----------------|-----------------|
| `draft` | مسودة مشتريات | قابل للتعديل | <kbd>✓ تأكيد</kbd> | حذف |
| `quotation` | عرض سعر شراء | مقفل | <kbd>✎ تعديل</kbd> | طباعة، إرسال |
| (أثناء التعديل) | — | قابل للتعديل | <kbd>✓ تأكيد</kbd> <kbd>✕ إلغاء التعديل</kbd> | — |
| `order` | أمر شراء | مقفل | <kbd>✓ تأكيد الحجز</kbd> <kbd>📧 طلب من المورد</kbd> | 📋 معاينة القيد |
| `approved` | أمر شراء معتمد | مقفل | <kbd>📦 تسجيل استلام</kbd> | 📋 معاينة القيد |
| `receipt` | إذن استلام | مقفل | <kbd>📄 إنشاء فاتورة</kbd> | — |
| `invoice` | فاتورة مشتريات | مقفل | <kbd>📮 ترحيل</kbd> | 📋 معاينة القيد |
| `posted` | فاتورة مرحّلة | مقفل | <kbd>💰 تسجيل دفعة</kbd> | 🔍 عرض القيد |
| `partial_paid` | مدفوعة جزئياً | مقفل | <kbd>💰 تسجيل دفعة</kbd> | 🧾 كشف حساب |
| `paid` | مدفوعة | مقفل (read-only) | — | 🔍 عرض |
| `cancelled` | ملغاة | مقفل | <kbd>🔄 إعادة فتح</kbd> | — |

#### دورة المبيعات:

| المرحلة | العنوان | الأزرار الرئيسية |
|---------|---------|-----------------|
| `draft` | مسودة مبيعات | <kbd>✓ تأكيد</kbd> |
| `quotation` | عرض سعر | <kbd>✎ تعديل</kbd> / <kbd>✓ تأكيد</kbd> |
| `order` | أمر بيع | <kbd>📦 تسليم</kbd> |
| `delivery` | إذن تسليم | <kbd>📄 فوترة</kbd> |
| `invoice` | فاتورة مبيعات | <kbd>📮 ترحيل</kbd> |
| `posted` | فاتورة مرحّلة | <kbd>💰 تسجيل تحصيل</kbd> |

### 2.4 نمط التعديل (Edit Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│                     مستند مؤكد (مقفل)                        │
│                                                             │
│  ┌─────────┐                                                │
│  │ ✎ تعديل │ ← زر وحيد                                     │
│  └────┬────┘                                                │
│       ↓                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ وضع التعديل (Edit Mode)                             │    │
│  │  • كل الحقول مفتوحة للتعديل                         │    │
│  │  • AutoSave شغّال في الخلفية (مسودة تعديل)          │    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌─────────────────┐                  │    │
│  │  │ ✓ تأكيد  │  │ ✕ إلغاء التعديل │                  │    │
│  │  └──────────┘  └─────────────────┘                  │    │
│  │  يحفظ ويعود    يتجاهل التعديلات ويعود               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 الحفظ التلقائي (AutoSave)

```
┌─────────────────────────────────────────────────────────────┐
│  المستخدم يفتح المكون ← insert مباشر بحالة 'draft'         │
│  المستخدم يكتب ← debounce 3s ← update في الخلفية           │
│  المستخدم يغلق ← المسودة محفوظة في تاب "مسودة"              │
│  المستخدم يضغط "تأكيد" ← status يتغير ← المستند مؤكد       │
│                                                             │
│  مؤشرات:                                                    │
│    ⏳ "جاري الحفظ..."   أثناء الحفظ                          │
│    ✅ "تم الحفظ"        بعد الحفظ                            │
│    ⚠️ "خطأ في الحفظ"    عند فشل                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ الجزء 3: إعدادات المحاسبة الجديدة

### 3.1 توسيع `company_accounting_settings`

```sql
-- ═══════════════════════════════════════════════════════════
-- إضافة حقول الإعدادات الجديدة لدورة المستندات
-- ═══════════════════════════════════════════════════════════

ALTER TABLE company_accounting_settings ADD COLUMN IF NOT EXISTS

    -- ═══ إعدادات الترقيم ═══
    purchase_quotation_prefix    TEXT DEFAULT 'PQ',
    purchase_order_prefix        TEXT DEFAULT 'PO',
    purchase_receipt_prefix      TEXT DEFAULT 'PR',
    purchase_invoice_prefix      TEXT DEFAULT 'PI',
    sales_quotation_prefix       TEXT DEFAULT 'SQ',
    sales_order_prefix           TEXT DEFAULT 'SO',
    sales_delivery_prefix        TEXT DEFAULT 'SD',
    sales_invoice_prefix         TEXT DEFAULT 'SI',
    
    -- ═══ إعدادات الموافقات ═══
    purchase_require_quotation   BOOLEAN DEFAULT false,  -- هل يلزم عرض سعر قبل الأمر؟
    purchase_require_approval    BOOLEAN DEFAULT true,   -- هل أمر الشراء يحتاج اعتماد؟
    purchase_approval_threshold  DECIMAL(18,2) DEFAULT 0, -- حد الاعتماد (0 = كل المبالغ)
    purchase_auto_receipt        BOOLEAN DEFAULT false,  -- استلام تلقائي؟
    
    sales_require_quotation      BOOLEAN DEFAULT false,  -- هل يلزم عرض سعر قبل الأمر؟
    sales_require_delivery       BOOLEAN DEFAULT true,   -- هل يلزم إذن تسليم قبل الفوترة؟
    sales_auto_delivery          BOOLEAN DEFAULT false,  -- تسليم تلقائي عند الفوترة؟
    
    -- ═══ إعدادات الترحيل ═══
    posting_method               TEXT DEFAULT 'manual' CHECK (posting_method IN (
                                    'manual',        -- يدوي: المستخدم يضغط "ترحيل"
                                    'auto_invoice',  -- تلقائي: عند إنشاء الفاتورة
                                    'auto_confirm'   -- تلقائي: عند التأكيد
                                 )),
    create_cost_entry            BOOLEAN DEFAULT true,   -- إنشاء قيد تكلفة البضاعة المباعة؟
    
    -- ═══ إعدادات الاستلام ═══
    receipt_creates_invoice       BOOLEAN DEFAULT false,  -- إنشاء فاتورة تلقائياً عند الاستلام؟
    allow_over_receipt           BOOLEAN DEFAULT false,  -- السماح باستلام أكثر من المطلوب؟
    allow_over_delivery          BOOLEAN DEFAULT false,  -- السماح بتسليم أكثر من المطلوب؟
    
    -- ═══ إعدادات الدفع ═══
    default_payment_terms_days   INTEGER DEFAULT 30,
    allow_partial_payment        BOOLEAN DEFAULT true,
    auto_close_on_full_payment   BOOLEAN DEFAULT true;
```

### 3.2 جدول تسلسل الترقيم

```sql
CREATE TABLE document_sequences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    company_id  UUID NOT NULL REFERENCES companies(id),
    
    doc_type    TEXT NOT NULL,        -- 'sale', 'purchase'
    stage       TEXT NOT NULL,        -- 'quotation', 'order', 'invoice', etc
    year        INTEGER NOT NULL,     -- 2026
    
    next_number INTEGER DEFAULT 1,
    prefix      TEXT,                 -- يؤخذ من الإعدادات
    
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_sequence UNIQUE (tenant_id, company_id, doc_type, stage, year)
);
```

---

## 🖥️ الجزء 4: مكونات Frontend

### 4.1 هيكل المكونات الجديد

```
src/features/trade/
├── components/
│   ├── sales/
│   │   ├── SalesTransactionSheet.tsx      ← مكون المبيعات (يُغلف UnifiedTransactionForm)
│   │   └── SalesTransactionList.tsx       ← قائمة المبيعات (تبويبات المراحل)
│   ├── purchases/
│   │   ├── PurchaseTransactionSheet.tsx   ← مكون المشتريات (يُغلف UnifiedTransactionForm)
│   │   └── PurchaseTransactionList.tsx    ← قائمة المشتريات
│   ├── shared/
│   │   ├── UnifiedTransactionForm.tsx     ← النموذج الموحد (المحرك الأساسي)
│   │   ├── StageProgressBar.tsx           ← شريط المراحل الأفقي
│   │   ├── TransactionActions.tsx         ← أزرار الإجراء الديناميكية
│   │   ├── AutoSaveIndicator.tsx          ← مؤشر الحفظ التلقائي
│   │   └── StageJournalPreview.tsx        ← معاينة القيد المحاسبي
│   ├── tabs/                              ← تبويبات النموذج
│   │   ├── InfoTab.tsx                    ← المعلومات الأساسية
│   │   ├── ItemsTab.tsx                   ← البنود (مع NexaDataTable)
│   │   ├── ShippingTab.tsx                ← الشحن والتسليم
│   │   ├── PaymentTab.tsx                 ← الدفعات
│   │   ├── AccountingTab.tsx              ← القيود المحاسبية
│   │   ├── AttachmentsTab.tsx             ← المرفقات
│   │   └── HistoryTab.tsx                 ← سجل المراحل
│   └── UnifiedTradeSheet.tsx              ← (يبقى كـ wrapper)
├── config/
│   ├── stageConfig.ts                     ← إعدادات كل مرحلة
│   └── transitionRules.ts                 ← قواعد التحول بين المراحل
├── hooks/
│   ├── useAutoSave.ts                     ← hook الحفظ التلقائي
│   ├── useStageTransition.ts              ← hook تحويل المرحلة
│   ├── useTransactionData.ts              ← hook جلب البيانات
│   └── useEditMode.ts                     ← hook وضع التعديل
├── services/
│   └── TransactionService.ts              ← خدمة جديدة (تستبدل TradeService تدريجياً)
└── types/
    └── transaction.ts                     ← أنواع المعاملة الجديدة
```

### 4.2 إعدادات المراحل (stageConfig.ts)

```typescript
export interface StageConfig {
  key: string;
  label: { ar: string; en: string };
  color: string;
  icon: string;
  
  // ما يظهر/يختفي
  tabs: {
    info: boolean;
    items: boolean;
    shipping: boolean;
    payment: boolean;
    accounting: boolean;
    attachments: boolean;
    history: boolean;
  };
  
  // الحقول الخاصة
  fields: {
    validUntil: boolean;     // صلاحية العرض
    paymentTerms: boolean;
    dueDate: boolean;
    warehouse: boolean;
    shipping: boolean;
    approver: boolean;       // المعتمد
  };
  
  // الأزرار
  primaryActions: ActionDef[];
  secondaryActions: ActionDef[];
  
  // هل النموذج قابل للتعديل؟
  editable: boolean;
  
  // هل ينشئ أثر محاسبي؟
  hasAccountingImpact: boolean;
  
  // هل ينشئ أثر مستودعي؟
  hasInventoryImpact: boolean;
}

// النتيجة: config واحد لكل مرحلة يتحكم بكل شيء
```

### 4.3 العلاقة بين المكونات

```
┌───────────────────────────────────────────────────────────────┐
│  SalesTransactionSheet / PurchaseTransactionSheet             │
│  (Wrapper — يحدد transaction_type + مراحل خاصة)              │
│                                                               │
│  ┌───────────────────────────────────────────────────────────┐│
│  │  UnifiedTransactionForm (المحرك الأساسي)                  ││
│  │                                                           ││
│  │  ┌─────────────────────────────────────────────────────┐  ││
│  │  │ StageProgressBar (شريط المراحل)                     │  ││
│  │  └─────────────────────────────────────────────────────┘  ││
│  │                                                           ││
│  │  ┌─────────────────────────────────────────────────────┐  ││
│  │  │ Header (رقم المستند + عنوان + AutoSaveIndicator)   │  ││
│  │  └─────────────────────────────────────────────────────┘  ││
│  │                                                           ││
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐      ││
│  │  │Info  │Items │Ship  │Pay   │Acct  │Files │Log   │      ││
│  │  │      │      │      │      │      │      │      │      ││
│  │  │ يظهر │ يظهر │ يخفى │ يخفى │ يخفى │ يظهر │ يخفى │      ││
│  │  │      │      │حسب   │حسب   │حسب   │      │حسب   │      ││
│  │  │      │      │config│config│config│      │config│      ││
│  │  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘      ││
│  │                                                           ││
│  │  ┌─────────────────────────────────────────────────────┐  ││
│  │  │ TransactionActions (أزرار ديناميكية حسب المرحلة)    │  ││
│  │  └─────────────────────────────────────────────────────┘  ││
│  └───────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

## 🔄 الجزء 5: استراتيجية الهجرة (Migration)

### 5.1 خطة الهجرة التدريجية (Zero-Downtime)

```
المرحلة A: إنشاء الجداول الجديدة (transactions + transaction_items)
                ↓
المرحلة B: إنشاء Functions (advance_stage, generate_number, etc)
                ↓
المرحلة C: إنشاء Views تُحاكي الجداول القديمة
           → CREATE VIEW purchase_invoices_v2 AS 
              SELECT ... FROM transactions WHERE transaction_type = 'purchase'
                ↓
المرحلة D: بناء Frontend جديد (يعمل على transactions)
                ↓
المرحلة E: تشغيل Script نقل البيانات القديمة
                ↓
المرحلة F: تحويل الخدمات القديمة تدريجياً
                ↓
المرحلة G: حذف الجداول القديمة (بعد التأكد)
```

### 5.2 Compatibility Views (للخدمات القديمة)

```sql
-- View يُحاكي purchase_invoices القديم
-- هذا يسمح للخدمات القديمة بالعمل بدون تعديل فوري
CREATE OR REPLACE VIEW purchase_invoices_compat AS
SELECT 
    t.id,
    t.tenant_id,
    t.invoice_no as invoice_number,
    t.invoice_date,
    t.party_id as supplier_id,
    t.party_name as supplier_name,
    t.warehouse_id,
    t.currency_id,
    t.exchange_rate,
    t.subtotal,
    t.tax_amount,
    t.total_amount,
    t.paid_amount,
    t.balance,
    t.current_stage as status,
    t.journal_entry_id,
    t.notes,
    t.created_at,
    t.updated_at
FROM transactions t
WHERE t.transaction_type = 'purchase';
```

---

## 📋 الجزء 6: خطوات التنفيذ المرحلية

### المرحلة 1: قاعدة البيانات (الأساس) ⏱️ 2-3 ساعات

```
☐ 1.1  إنشاء جدول transactions
☐ 1.2  إنشاء جدول transaction_items  
☐ 1.3  إنشاء جدول transaction_stage_log
☐ 1.4  إنشاء جدول document_sequences
☐ 1.5  إنشاء Function: generate_stage_number()
☐ 1.6  إنشاء Function: is_valid_stage_transition()
☐ 1.7  إنشاء Function: advance_transaction_stage()
☐ 1.8  إنشاء Function: process_inventory_movement()
☐ 1.9  إنشاء Function: create_transaction_journal_entry()
☐ 1.10 إنشاء RLS policies
☐ 1.11 إنشاء Triggers (updated_at, auto-calc totals)
```

### المرحلة 2: إعدادات المحاسبة ⏱️ 1-2 ساعة

```
☐ 2.1  توسيع company_accounting_settings (prefixes, approvals, posting)
☐ 2.2  إضافة تبويب "إعدادات الدورة المستندية" في AccountingSettings.tsx
       ├── قسم الترقيم (prefixes لكل مرحلة)
       ├── قسم الموافقات (thresholds, required stages)
       ├── قسم الترحيل (يدوي/تلقائي, قيد التكلفة)
       └── قسم الدفع (شروط, دفع جزئي)
☐ 2.3  إنشاء hook: useTransactionSettings()
```

### المرحلة 3: الأنواع والخدمات ⏱️ 2 ساعة

```
☐ 3.1  إنشاء types/transaction.ts (Transaction, TransactionItem, Stage, etc)
☐ 3.2  إنشاء config/stageConfig.ts (configs per stage)
☐ 3.3  إنشاء config/transitionRules.ts (valid transitions)
☐ 3.4  إنشاء TransactionService.ts (CRUD + RPC calls)
☐ 3.5  إنشاء hooks:
       ├── useAutoSave.ts
       ├── useStageTransition.ts
       ├── useTransactionData.ts
       └── useEditMode.ts
```

### المرحلة 4: مكونات مشتركة ⏱️ 3-4 ساعات

```
☐ 4.1  إنشاء StageProgressBar.tsx
☐ 4.2  إنشاء TransactionActions.tsx
☐ 4.3  إنشاء AutoSaveIndicator.tsx
☐ 4.4  إنشاء StageJournalPreview.tsx
☐ 4.5  إنشاء UnifiedTransactionForm.tsx (المحرك)
☐ 4.6  إنشاء التبويبات:
       ├── InfoTab.tsx
       ├── ItemsTab.tsx (مع NexaDataTable)
       ├── ShippingTab.tsx
       ├── PaymentTab.tsx
       ├── AccountingTab.tsx
       ├── AttachmentsTab.tsx
       └── HistoryTab.tsx
```

### المرحلة 5: مكون المشتريات ⏱️ 2-3 ساعات

```
☐ 5.1  إنشاء PurchaseTransactionSheet.tsx
☐ 5.2  تحديث PurchaseInvoicesList.tsx (ربط مع transactions)
☐ 5.3  تحديث صفحة دورة المشتريات
☐ 5.4  ربط مع المستودع (receiptCompletionService)
☐ 5.5  ربط مع المحاسبة (purchaseAccountingService)
☐ 5.6  اختبار الدورة كاملة
```

### المرحلة 6: مكون المبيعات ⏱️ 2-3 ساعات

```
☐ 6.1  إنشاء SalesTransactionSheet.tsx
☐ 6.2  تحديث SalesInvoicesList.tsx (ربط مع transactions)
☐ 6.3  تحديث صفحة دورة المبيعات
☐ 6.4  ربط التسليم مع المستودع
☐ 6.5  ربط مع المحاسبة
☐ 6.6  اختبار الدورة كاملة
```

### المرحلة 7: هجرة البيانات ⏱️ 1 ساعة

```
☐ 7.1  إنشاء script نقل البيانات القديمة
☐ 7.2  إنشاء compatibility views
☐ 7.3  تحديث الخدمات القديمة تدريجياً
☐ 7.4  اختبار التوافق
```

### المرحلة 8: المرتجعات والعمليات الخاصة ⏱️ 2 ساعة

```
☐ 8.1  دعم مرتجعات المبيعات (sale_return)
☐ 8.2  دعم مرتجعات المشتريات (purchase_return)
☐ 8.3  عكس القيود والحركات
☐ 8.4  ربط نقاط البيع (POS) مع النظام الجديد
```

---

## 🔗 الجزء 7: خريطة الربط مع الموديولات

### 7.1 ربط المحاسبة

```
transactions (invoice stage)
    │
    ├──→ journal_entries (قيد إيراد/مصروف)
    │       ├── journal_entry_lines (مدين/دائن)
    │       └── يستخدم: company_accounting_settings
    │
    └──→ journal_entries (قيد تكلفة بضاعة مباعة) [اختياري]
            └── مدين: COGS / دائن: المخزون
```

### 7.2 ربط المخازن

```
transactions (delivery/receipt stage)
    │
    ├──→ inventory_movements (حركة مخزن)
    │       ├── roll_id → fabric_rolls.current_length
    │       └── warehouse_id → warehouses
    │
    └──→ goods_receipts / goods_issues (النظام الحالي)
```

### 7.3 ربط الدفعات

```
transactions (invoice stage → paid)
    │
    ├──→ payment_allocations (جدول جديد)
    │       ├── payment_id → payments
    │       ├── transaction_id → transactions
    │       └── allocated_amount
    │
    └──→ journal_entries (قيد الدفع)
```

### 7.4 ربط الإعدادات

```
company_accounting_settings
    │
    ├── الترقيم (prefix per stage per type)
    ├── الموافقات (threshold, required stages)
    ├── الترحيل (manual / auto_invoice / auto_confirm)
    ├── الدفع (terms, partial, auto_close)
    └── document_sequences (per tenant, per year)
```

---

## 📌 ملاحظات تقنية مهمة

### 1. التوافق مع الشيت الموحد

`UnifiedAccountingSheet.tsx` الحالي سيبقى كـ viewer/wrapper عام.
مكونات المبيعات والمشتريات الجديدة ستكون **مكونات مستقلة** تستخدم `UnifiedTransactionForm` كمحرك أساسي.

### 2. AutoSave Strategy

```
- عند فتح "إنشاء جديد" → INSERT فوري بحالة draft
- كل تغيير → debounce 3s → UPDATE
- إغلاق بدون تأكيد → المسودة تبقى
- يمكن حذف المسودات القديمة (cleanup job)
```

### 3. الرقم المرجعي

```
- المسودة تحصل على UUID فقط (لا رقم مرئي)
- أول مرحلة مؤكدة (quotation/order) → يتولد الرقم
- كل مرحلة جديدة → رقم جديد بـ prefix مختلف
- نفس السجل = أرقام متعددة (SQ + SO + SI)
```

### 4. أمان البيانات

```
- RLS: tenant_id isolation
- Row-level locking: FOR UPDATE عند تحويل المرحلة
- Audit trail: transaction_stage_log لكل تحويل
- أمر الشراء: يحتاج role = 'purchase_manager' للاعتماد
```

---

## ⏰ الجدول الزمني المقترح

| اليوم | المرحلة | المخرج |
|-------|---------|--------|
| **1** | المرحلة 1 (DB) + المرحلة 2 (Settings) | جداول + functions + إعدادات |
| **2** | المرحلة 3 (Types) + المرحلة 4 (Components) | مكونات مشتركة + hooks |
| **3** | المرحلة 5 (Purchases) | دورة مشتريات كاملة |
| **4** | المرحلة 6 (Sales) | دورة مبيعات كاملة |
| **5** | المرحلة 7 (Migration) + المرحلة 8 (Returns) | هجرة + مرتجعات |

---

## ✅ النتيجة النهائية

```
قبل:  13 جدول × 2 (header + items) = 26 جدول
       13 نوع مستند × خدمة مستقلة = تعقيد هائل
       نسخ بيانات عند التحويل = تكرار ومشاكل

بعد:  1 جدول رئيسي + 1 جدول بنود = 2 جدول
      Function واحدة للتحويل = بساطة
      سجل واحد يتنقل = لا نسخ
      رقم مختلف لكل مرحلة = تتبع كامل
      إعدادات مركزية = تحكم كامل
```
