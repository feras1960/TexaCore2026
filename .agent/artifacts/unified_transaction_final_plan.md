# 🏗️ الخطة النهائية — جدولان جديدان + أرشفة القديم

> **التاريخ**: 2026-02-15  
> **النهج**: إنشاء `sales_transactions` + `purchase_transactions` جديدة بجانب القديم  
> **الفلسفة**: لا كسر — لا حذف — إنشاء النظام الجديد بالتوازي

---

## ⚖️ الرأي النقدي الاحترافي لهذا النهج

### ✅ لماذا هذا النهج **ممتاز فعلاً**:

```
1. 🔒 أمان كامل — الجداول القديمة تبقى (أرشيف + fallback)
   → إذا حصل أي مشكل، النظام القديم جاهز

2. 🧹 نظافة — جدولان جديدان فقط (بدل 13 header + 13 items = 26 جدول)
   → purchase_transactions (أمر + فاتورة + استلام = سجل واحد)
   → sales_transactions (عرض + أمر + تسليم + فاتورة = سجل واحد)

3. ⚡ بساطة الربط — كل مرحلة تُحدّث نفس السجل
   → لا نسخ بيانات
   → لا joins معقدة
   → function واحدة لكل تحويل مرحلة

4. 📊 تقارير سهلة — SELECT * FROM purchase_transactions WHERE stage = 'invoice'
   → بدل: JOIN purchase_orders ON po.id = pi.source_order_id

5. 🔄 التراجع ممكن — إذا لم ينجح، العملاء يعودون للنظام القديم
   → الجداول القديمة لم تُحذف ولم تتأثر

6. 📱 مثالي للشركات الصغيرة والمتوسطة — بساطة بدون تعقيد
```

### ⚠️ تحذيرات يجب الانتباه لها:

```
1. "الجدول السمين" — حقول الفاتورة لن تمتلئ إلا في مرحلة الفاتورة
   → الحل: NULL مسموح — PostgreSQL يخزنه بـ 1 bit فقط
   → CHECK constraints ذكية لكل مرحلة

2. ازدواجية مؤقتة — النظامان يعملان بالتوازي
   → الحل: Frontend يوجّه للنظام الجديد، القديم أرشيف فقط

3. جدول واحد يصبح أبطأ مع النمو (100K+ سجل لكل tenant)
   → الحل: فهرسة ذكية (stage, company_id, tenant_id) + partitioning لاحقاً إن احتاج
```

### 📐 مقارنة مع الأسلوب العالمي:

```
ERPNext (Frappe): كل DocType جدول مستقل — لكن عندهم ORM يربطها = تعقيد خفي
Odoo:             account.move جدول واحد لكل العمليات المحاسبية = نفس فكرتنا!
SAP B1:           جداول منفصلة — لكن مصمم لمليارات السجلات (ليس حاجتنا)

TexaCore:         جدولان (مبيعات + مشتريات) = الحل الأمثل لـ SMB SaaS ✅
```

**الخلاصة: فكرتك ممتازة — عملية، آمنة، وسهلة الصيانة. أنصح بالتنفيذ بثقة.**

---

## 📋 الجزء 1: هيكل قاعدة البيانات

### 1.1 جدول `purchase_transactions` (دورة المشتريات الموحدة)

```sql
-- ═══════════════════════════════════════════════════════════════
-- جدول المشتريات الموحد — سجل واحد يتنقل بين المراحل
-- يحل محل: purchase_requests, purchase_quotations, purchase_orders,
--          purchase_invoices, purchase_receipts (كلها في سجل واحد)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE purchase_transactions (
    -- ═══ المفاتيح الأساسية ═══
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    branch_id       UUID REFERENCES branches(id),

    -- ═══ المرحلة الحالية (القلب النابض) ═══
    stage           TEXT NOT NULL DEFAULT 'draft'
                    CHECK (stage IN (
                        'draft',           -- مسودة (AutoSave)
                        'quotation',       -- عرض سعر شراء
                        'order',           -- أمر شراء
                        'approved',        -- أمر شراء معتمد
                        'receipt',         -- تم الاستلام
                        'invoice',         -- فاتورة مشتريات
                        'posted',          -- مرحّلة (قيد محاسبي تم إنشاؤه)
                        'partial_paid',    -- مدفوعة جزئياً
                        'paid',            -- مدفوعة بالكامل
                        'cancelled'        -- ملغاة
                    )),

    -- ═══ أرقام المستند (رقم جديد لكل مرحلة) ═══
    draft_no        TEXT,                -- يبقى NULL (المسودة لا رقم لها)
    quotation_no    TEXT,                -- PQ-2026-001
    order_no        TEXT,                -- PO-2026-001
    receipt_no      TEXT,                -- PR-2026-001
    invoice_no      TEXT,                -- PI-2026-001

    -- ═══ الطرف المقابل ═══
    supplier_id     UUID REFERENCES suppliers(id),
    supplier_name   TEXT,                -- cache لتفادي join

    -- ═══ التواريخ ═══
    doc_date        DATE DEFAULT CURRENT_DATE,        -- تاريخ الإنشاء
    quotation_date  DATE,                             -- تاريخ عرض السعر
    order_date      DATE,                             -- تاريخ الأمر
    approval_date   DATE,                             -- تاريخ الاعتماد
    receipt_date    DATE,                             -- تاريخ الاستلام
    invoice_date    DATE,                             -- تاريخ الفاتورة
    due_date        DATE,                             -- تاريخ الاستحقاق

    -- ═══ الشحن والمستودع ═══
    warehouse_id    UUID REFERENCES warehouses(id),
    shipment_id     UUID,                             -- ربط بالكونتينر
    receipt_mode    TEXT DEFAULT 'direct' CHECK (receipt_mode IN ('direct', 'international')),

    -- ═══ المالية ═══
    currency        TEXT DEFAULT 'SAR',
    exchange_rate   DECIMAL(18,6) DEFAULT 1,
    subtotal        DECIMAL(18,2) DEFAULT 0,          -- مجموع البنود
    discount_amount DECIMAL(18,2) DEFAULT 0,          -- الخصم
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount      DECIMAL(18,2) DEFAULT 0,          -- الضريبة
    expenses_total  DECIMAL(18,2) DEFAULT 0,          -- مصاريف إضافية
    total_amount    DECIMAL(18,2) DEFAULT 0,          -- الإجمالي

    -- ═══ الدفعات ═══
    paid_amount     DECIMAL(18,2) DEFAULT 0,
    balance         DECIMAL(18,2) DEFAULT 0,          -- = total_amount - paid_amount
    payment_terms_days INTEGER DEFAULT 30,

    -- ═══ بيانات المورد الخارجية ═══
    supplier_invoice_number TEXT,                      -- رقم فاتورة المورد
    supplier_invoice_date   DATE,                      -- تاريخ فاتورة المورد

    -- ═══ المحاسبة ═══
    journal_entry_id UUID REFERENCES journal_entries(id), -- رابط القيد
    is_posted       BOOLEAN DEFAULT false,

    -- ═══════════════════════════════════════════════════════════
    -- 👤 تتبع المستخدمين لكل مرحلة (من أنشأ؟ من اعتمد؟ من رحّل؟)
    -- ═══════════════════════════════════════════════════════════
    
    -- المُنشئ (مسودة)
    created_by      UUID REFERENCES auth.users(id),
    created_by_name TEXT,                              -- اسم المُنشئ (cache)
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    -- مُعد عرض السعر
    quoted_by       UUID REFERENCES auth.users(id),
    quoted_by_name  TEXT,
    quoted_at       TIMESTAMPTZ,

    -- مُنشئ الأمر
    ordered_by      UUID REFERENCES auth.users(id),
    ordered_by_name TEXT,
    ordered_at      TIMESTAMPTZ,

    -- المعتمد
    approved_by     UUID REFERENCES auth.users(id),
    approved_by_name TEXT,
    approved_at     TIMESTAMPTZ,
    approval_notes  TEXT,

    -- المستلم (مشتريات فقط)
    received_by     UUID REFERENCES auth.users(id),
    received_by_name TEXT,
    received_at     TIMESTAMPTZ,

    -- مُنشئ الفاتورة
    invoiced_by     UUID REFERENCES auth.users(id),
    invoiced_by_name TEXT,
    invoiced_at     TIMESTAMPTZ,

    -- المُرحّل
    posted_by       UUID REFERENCES auth.users(id),
    posted_by_name  TEXT,
    posted_at       TIMESTAMPTZ,

    -- المُلغي (في حالة الإلغاء)
    cancelled_by    UUID REFERENCES auth.users(id),
    cancelled_by_name TEXT,
    cancelled_at    TIMESTAMPTZ,
    cancellation_reason TEXT,                          -- سبب الإلغاء (إلزامي)

    -- آخر مُعدّل
    updated_by      UUID REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- ═══ بيانات إضافية ═══
    notes           TEXT,
    supplier_notes  TEXT,
    internal_notes  TEXT,
    expenses        JSONB DEFAULT '[]',               -- مصاريف إضافية (shipping, customs, etc)
    attachments     JSONB DEFAULT '[]',               -- المرفقات
    tags            TEXT[],                            -- تصنيفات

    -- ═══ حالات مساعدة ═══
    confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'rejected')),
    is_active       BOOLEAN DEFAULT true,
    is_locked       BOOLEAN DEFAULT false,             -- مقفل بعد الترحيل

    -- ═══ 🔒 Optimistic Locking ═══
    version         INTEGER DEFAULT 1,                 -- يزداد تلقائياً مع كل UPDATE

    -- ═══ 🖨️ تتبع الطباعة ═══
    printed_count    INTEGER DEFAULT 0,                -- عدد مرات الطباعة
    last_printed_at  TIMESTAMPTZ,                      -- آخر طباعة
    last_printed_by  UUID REFERENCES auth.users(id),   -- من طبع آخر مرة

    -- ═══ ⏰ تتبع التذكيرات ═══
    reminder_count        INTEGER DEFAULT 0,           -- عدد التذكيرات المرسلة
    last_reminder_sent_at TIMESTAMPTZ,                 -- آخر تذكير

    -- ═══ 🔄 المرتجعات ═══
    original_transaction_id UUID REFERENCES purchase_transactions(id), -- ربط بالمعاملة الأصلية
    is_return       BOOLEAN DEFAULT false,             -- هل هذا مرتجع؟

    -- ═══ المصدر (للتتبع إذا تطوّر من مستند قديم) ═══
    source_type     TEXT,                              -- 'legacy_purchase_invoice', etc
    source_id       UUID                               -- ID من الجدول القديم
);

-- ═══ الفهارس الأساسية ═══
CREATE INDEX idx_pt_tenant_company ON purchase_transactions(tenant_id, company_id);
CREATE INDEX idx_pt_stage ON purchase_transactions(company_id, stage);
CREATE INDEX idx_pt_supplier ON purchase_transactions(supplier_id);
CREATE INDEX idx_pt_dates ON purchase_transactions(doc_date, invoice_date);
CREATE INDEX idx_pt_invoice_no ON purchase_transactions(invoice_no) WHERE invoice_no IS NOT NULL;
CREATE INDEX idx_pt_order_no ON purchase_transactions(order_no) WHERE order_no IS NOT NULL;
CREATE INDEX idx_pt_journal ON purchase_transactions(journal_entry_id) WHERE journal_entry_id IS NOT NULL;
```

### 1.2 جدول `purchase_transaction_items` (بنود المشتريات)

```sql
-- ═══════════════════════════════════════════════════════════════
-- بنود معاملة الشراء — جدول واحد لكل البنود
-- يحل محل: purchase_order_items, purchase_invoice_items,
--          purchase_receipt_items, purchase_quotation_items, etc
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE purchase_transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES purchase_transactions(id) ON DELETE CASCADE,

    -- ═══ ترتيب البنود ═══
    line_number      INTEGER NOT NULL DEFAULT 1,

    -- ═══ المنتج/المادة ═══
    product_id       UUID,                            -- ربط مع products
    material_id      UUID,                            -- ربط مع materials (أقمشة)
    
    -- ═══ الوصف ═══
    item_code        TEXT,                            -- كود المنتج/المادة
    description      TEXT,                            -- الوصف
    description_ar   TEXT,                            -- الوصف بالعربي
    
    -- ═══ الكمية والوحدة ═══
    quantity         DECIMAL(18,4) NOT NULL DEFAULT 0,  -- الكمية المطلوبة
    received_qty     DECIMAL(18,4) DEFAULT 0,          -- الكمية المستلمة فعلياً
    returned_qty     DECIMAL(18,4) DEFAULT 0,          -- الكمية المرتجعة
    unit             TEXT DEFAULT 'piece',             -- الوحدة (meter, kg, piece, roll)

    -- ═══ التسعير ═══
    unit_price       DECIMAL(18,4) NOT NULL DEFAULT 0,
    discount_amount  DECIMAL(18,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate         DECIMAL(5,2) DEFAULT 0,
    tax_amount       DECIMAL(18,2) DEFAULT 0,
    subtotal         DECIMAL(18,2) DEFAULT 0,          -- quantity * unit_price - discount
    total            DECIMAL(18,2) DEFAULT 0,          -- subtotal + tax

    -- ═══ بيانات الأقمشة الخاصة ═══
    color_id         UUID,                             -- لون القماش
    color_name       TEXT,
    roll_id          UUID,                             -- رقم الرول
    roll_code        TEXT,
    rolls_count      INTEGER,                          -- عدد الرولات
    
    -- ═══ المستودع ═══
    warehouse_id     UUID,                             -- مستودع الاستلام (per item)

    -- ═══ التكلفة ═══
    cost_price       DECIMAL(18,4),                    -- تكلفة الشراء
    landed_cost      DECIMAL(18,4),                    -- التكلفة النهائية (بعد المصاريف)

    -- ═══ ملاحظات ═══
    notes            TEXT,

    -- ═══ التدقيق ═══
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pti_transaction ON purchase_transaction_items(transaction_id);
CREATE INDEX idx_pti_product ON purchase_transaction_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_pti_material ON purchase_transaction_items(material_id) WHERE material_id IS NOT NULL;
```

### 1.3 جدول `sales_transactions` (دورة المبيعات الموحدة)

```sql
-- ═══════════════════════════════════════════════════════════════
-- جدول المبيعات الموحد — سجل واحد يتنقل بين المراحل
-- يحل محل: quotations, transit_reservations, sales_orders,
--          sales_deliveries, sales_invoices (كلها في سجل واحد)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE sales_transactions (
    -- ═══ المفاتيح الأساسية ═══
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    branch_id       UUID REFERENCES branches(id),

    -- ═══ المرحلة الحالية ═══
    stage           TEXT NOT NULL DEFAULT 'draft'
                    CHECK (stage IN (
                        'draft',           -- مسودة
                        'quotation',       -- عرض سعر
                        'reservation',     -- حجز ترانزيت
                        'order',           -- أمر بيع
                        'delivery',        -- إذن تسليم
                        'invoice',         -- فاتورة مبيعات
                        'posted',          -- مرحّلة
                        'partial_paid',    -- مدفوعة جزئياً
                        'paid',            -- مدفوعة بالكامل
                        'cancelled'        -- ملغاة
                    )),

    -- ═══ أرقام المستند ═══
    draft_no        TEXT,
    quotation_no    TEXT,                -- SQ-2026-001
    reservation_no  TEXT,                -- SR-2026-001
    order_no        TEXT,                -- SO-2026-001
    delivery_no     TEXT,                -- SD-2026-001
    invoice_no      TEXT,                -- SI-2026-001

    -- ═══ الطرف المقابل ═══
    customer_id     UUID REFERENCES customers(id),
    customer_name   TEXT,

    -- ═══ المندوب ═══
    salesperson_id  UUID REFERENCES auth.users(id),
    salesperson_name TEXT,

    -- ═══ التواريخ ═══
    doc_date        DATE DEFAULT CURRENT_DATE,
    quotation_date  DATE,
    quotation_valid_until DATE,           -- ← خاص بعرض السعر
    reservation_date DATE,                -- ← خاص بالحجز
    order_date      DATE,
    delivery_date   DATE,
    invoice_date    DATE,
    due_date        DATE,

    -- ═══ المستودع والشحن ═══
    warehouse_id    UUID REFERENCES warehouses(id),
    shipping_method TEXT,                  -- طريقة الشحن
    shipping_address TEXT,                 -- عنوان التسليم
    tracking_number TEXT,                  -- رقم التتبع

    -- ═══ المالية ═══
    currency        TEXT DEFAULT 'SAR',
    exchange_rate   DECIMAL(18,6) DEFAULT 1,
    subtotal        DECIMAL(18,2) DEFAULT 0,
    discount_amount DECIMAL(18,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount      DECIMAL(18,2) DEFAULT 0,
    total_amount    DECIMAL(18,2) DEFAULT 0,

    -- ═══ الدفعات ═══
    paid_amount     DECIMAL(18,2) DEFAULT 0,
    balance         DECIMAL(18,2) DEFAULT 0,
    payment_terms_days INTEGER DEFAULT 30,

    -- ═══ نقاط البيع (POS) ═══
    is_pos          BOOLEAN DEFAULT false,             -- هل من نقطة بيع؟
    pos_session_id  UUID,                              -- جلسة الكاشير

    -- ═══ المحاسبة ═══
    journal_entry_id UUID REFERENCES journal_entries(id),
    cost_entry_id   UUID REFERENCES journal_entries(id), -- قيد تكلفة البضاعة المباعة
    is_posted       BOOLEAN DEFAULT false,

    -- ═══════════════════════════════════════════════════════════
    -- 👤 تتبع المستخدمين لكل مرحلة
    -- ═══════════════════════════════════════════════════════════
    
    -- المُنشئ (مسودة)
    created_by      UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    -- مُعد عرض السعر
    quoted_by       UUID REFERENCES auth.users(id),
    quoted_by_name  TEXT,
    quoted_at       TIMESTAMPTZ,

    -- مُنشئ الحجز
    reserved_by     UUID REFERENCES auth.users(id),
    reserved_by_name TEXT,
    reserved_at     TIMESTAMPTZ,

    -- مُنشئ الأمر
    ordered_by      UUID REFERENCES auth.users(id),
    ordered_by_name TEXT,
    ordered_at      TIMESTAMPTZ,

    -- المسلّم (مبيعات: من سلّم البضاعة)
    delivered_by    UUID REFERENCES auth.users(id),
    delivered_by_name TEXT,
    delivered_at    TIMESTAMPTZ,

    -- مُنشئ الفاتورة
    invoiced_by     UUID REFERENCES auth.users(id),
    invoiced_by_name TEXT,
    invoiced_at     TIMESTAMPTZ,

    -- المُرحّل
    posted_by       UUID REFERENCES auth.users(id),
    posted_by_name  TEXT,
    posted_at       TIMESTAMPTZ,

    -- المُلغي
    cancelled_by    UUID REFERENCES auth.users(id),
    cancelled_by_name TEXT,
    cancelled_at    TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- آخر مُعدّل
    updated_by      UUID REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- ═══ بيانات إضافية ═══
    notes           TEXT,
    internal_notes  TEXT,
    attachments     JSONB DEFAULT '[]',
    tags            TEXT[],

    -- ═══ حالات مساعدة ═══
    confirmation_status TEXT DEFAULT 'pending',
    is_active       BOOLEAN DEFAULT true,
    is_locked       BOOLEAN DEFAULT false,

    -- ═══ 🔒 Optimistic Locking ═══
    version         INTEGER DEFAULT 1,                 -- يزداد تلقائياً مع كل UPDATE

    -- ═══ 🖨️ تتبع الطباعة ═══
    printed_count    INTEGER DEFAULT 0,                -- عدد مرات الطباعة
    last_printed_at  TIMESTAMPTZ,                      -- آخر طباعة
    last_printed_by  UUID REFERENCES auth.users(id),   -- من طبع آخر مرة

    -- ═══ ⏰ تتبع التذكيرات ═══
    reminder_count        INTEGER DEFAULT 0,           -- عدد التذكيرات المرسلة
    last_reminder_sent_at TIMESTAMPTZ,                 -- آخر تذكير

    -- ═══ 🔄 المرتجعات ═══
    original_transaction_id UUID REFERENCES sales_transactions(id), -- ربط بالمعاملة الأصلية
    is_return       BOOLEAN DEFAULT false,             -- هل هذا مرتجع؟

    -- ═══ المصدر ═══
    source_type     TEXT,
    source_id       UUID
);

-- ═══ الفهارس ═══
CREATE INDEX idx_st_tenant_company ON sales_transactions(tenant_id, company_id);
CREATE INDEX idx_st_stage ON sales_transactions(company_id, stage);
CREATE INDEX idx_st_customer ON sales_transactions(customer_id);
CREATE INDEX idx_st_salesperson ON sales_transactions(salesperson_id);
CREATE INDEX idx_st_dates ON sales_transactions(doc_date, invoice_date);
CREATE INDEX idx_st_invoice_no ON sales_transactions(invoice_no) WHERE invoice_no IS NOT NULL;
CREATE INDEX idx_st_order_no ON sales_transactions(order_no) WHERE order_no IS NOT NULL;
CREATE INDEX idx_st_pos ON sales_transactions(is_pos) WHERE is_pos = true;
```

### 1.4 جدول `sales_transaction_items` (بنود المبيعات)

```sql
CREATE TABLE sales_transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,

    line_number      INTEGER NOT NULL DEFAULT 1,

    -- ═══ المنتج/المادة ═══
    product_id       UUID,
    material_id      UUID,
    item_code        TEXT,
    description      TEXT,
    description_ar   TEXT,

    -- ═══ الكمية ═══
    quantity         DECIMAL(18,4) NOT NULL DEFAULT 0,
    delivered_qty    DECIMAL(18,4) DEFAULT 0,          -- الكمية المسلّمة
    returned_qty     DECIMAL(18,4) DEFAULT 0,          -- الكمية المرتجعة
    unit             TEXT DEFAULT 'piece',

    -- ═══ التسعير ═══
    unit_price       DECIMAL(18,4) NOT NULL DEFAULT 0,
    discount_amount  DECIMAL(18,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate         DECIMAL(5,2) DEFAULT 0,
    tax_amount       DECIMAL(18,2) DEFAULT 0,
    subtotal         DECIMAL(18,2) DEFAULT 0,
    total            DECIMAL(18,2) DEFAULT 0,

    -- ═══ بيانات الأقمشة ═══
    color_id         UUID,
    color_name       TEXT,
    roll_id          UUID,
    roll_code        TEXT,
    rolls_count      INTEGER,

    -- ═══ المستودع ═══
    warehouse_id     UUID,

    -- ═══ التكلفة (مخفية — للتقارير) ═══
    cost_price       DECIMAL(18,4),

    -- ═══ ملاحظات ═══
    notes            TEXT,

    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sti_transaction ON sales_transaction_items(transaction_id);
CREATE INDEX idx_sti_product ON sales_transaction_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_sti_material ON sales_transaction_items(material_id) WHERE material_id IS NOT NULL;
```

### 1.5 جدول `transaction_stage_log` (سجل المراحل)

```sql
-- ═══════════════════════════════════════════════════════════════
-- سجل كل تحويل مرحلة — للتدقيق والمتابعة
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE transaction_stage_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══ نوع المعاملة ═══
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale')),
    transaction_id  UUID NOT NULL,  -- ID من purchase_transactions أو sales_transactions
    
    -- ═══ التحويل ═══
    from_stage      TEXT NOT NULL,
    to_stage        TEXT NOT NULL,
    
    -- ═══ الرقم المُولّد ═══
    generated_number TEXT,          -- الرقم الذي تم توليده لهذه المرحلة
    
    -- ═══ البيانات ═══
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',  -- بيانات إضافية (سبب الإلغاء، etc)
    
    -- ═══ من نفّذ العملية ═══
    performed_by      UUID REFERENCES auth.users(id),
    performed_by_name TEXT,           -- اسم المستخدم (cache للتقارير)
    performed_at      TIMESTAMPTZ DEFAULT NOW(),
    ip_address        TEXT,
    user_agent        TEXT            -- نوع المتصفح/الجهاز
);

CREATE INDEX idx_tsl_transaction ON transaction_stage_log(transaction_type, transaction_id);
CREATE INDEX idx_tsl_user ON transaction_stage_log(performed_by);
CREATE INDEX idx_tsl_date ON transaction_stage_log(performed_at);
```

### 1.6 جدول `document_sequences` (تسلسل الترقيم)

```sql
CREATE TABLE document_sequences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    
    doc_type        TEXT NOT NULL,       -- 'purchase', 'sale'
    stage           TEXT NOT NULL,       -- 'quotation', 'order', 'invoice'
    year            INTEGER NOT NULL,
    
    prefix          TEXT NOT NULL,       -- 'PO', 'PI', 'SQ', etc
    next_number     INTEGER DEFAULT 1,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_doc_sequence UNIQUE (tenant_id, company_id, doc_type, stage, year)
);
```

---

## 🔄 الجزء 2: مخطط المراحل وقواعد التحويل

### 2.1 دورة المشتريات

```
                     ┌──────────────────────────────────────────────────────────────────┐
                     │                     دورة المشتريات                               │
                     ├──────────────────────────────────────────────────────────────────┤
                     │                                                                  │
    AutoSave         │  draft ──→ quotation ──→ order ──→ approved ──→ receipt           │
    ═══════          │  مسودة    عرض سعر      أمر شراء   معتمد       استلام             │
  عند بدء الكتابة    │    │        PQ-xxx       PO-xxx                PR-xxx            │
  = INSERT فوري      │    │          │            │                      │               │
  بحالة draft        │    │     ┌────┘            │                      │               │
                     │    │     ↓ (اختياري)        ↓                      ↓               │
                     │    │  يمكن حذفها     ┌──────────────────────────────┐              │
                     │    │  أو تحويلها     │                              │              │
                     │    │                 ↓                              ↓              │
                     │    │           ──→ invoice ──→ posted ──→ partial ──→ paid         │
                     │    │                فاتورة    مرحّلة    دفع جزئي   مدفوعة          │
                     │    │                PI-xxx     قيد JE              بالكامل          │
                     │    │                                                               │
                     │  cancel ←── يمكن الإلغاء من أي مرحلة قبل الترحيل                   │
                     └──────────────────────────────────────────────────────────────────┘
```

### 2.2 دورة المبيعات

```
                     ┌──────────────────────────────────────────────────────────────────┐
                     │                     دورة المبيعات                                │
                     ├──────────────────────────────────────────────────────────────────┤
                     │                                                                  │
    AutoSave         │  draft → quotation → reservation → order → delivery → invoice    │
    ═══════          │  مسودة   عرض سعر     حجز         أمر بيع   تسليم     فاتورة     │
                     │           SQ-xxx     SR-xxx       SO-xxx    SD-xxx    SI-xxx      │
                     │                                     │         │         │         │
                     │                                     │    خصم مخزون   قيد JE       │
                     │                                     │                  │          │
                     │                         ──→ posted ──→ partial ──→ paid           │
                     │                              مرحّلة    دفع جزئي   مدفوعة           │
                     │                                                                  │
                     │  POS Mode: draft → invoice → posted → paid (فوري)                │
                     └──────────────────────────────────────────────────────────────────┘
```

### 2.3 الأزرار لكل مرحلة

#### المشتريات:

| المرحلة | إعدادات العرض | الأزرار |
|---------|---------------|---------|
| **draft** | كل الحقول مفتوحة · AutoSave شغال | `✓ تأكيد` · `🗑 حذف` |
| **quotation** | مقفل · عرض فقط | `✎ تعديل` · `🖨 طباعة` · `📧 إرسال` |
| (أثناء التعديل) | حقول مفتوحة · AutoSave | `✓ تأكيد` · `✕ إلغاء التعديل` |
| **order** | مقفل | `✓ اعتماد` · `📋 معاينة القيد` |
| **approved** | مقفل | `📦 تسجيل استلام` · `📧 طلب من المورد` |
| **receipt** | مقفل | `📄 إنشاء فاتورة` |
| **invoice** | مقفل | `📮 ترحيل` · `📋 معاينة القيد` |
| **posted** | مقفل + رابط القيد | `💰 تسجيل دفعة` · `🔍 عرض القيد` |
| **partial_paid** | مقفل | `💰 دفعة أخرى` · `🧾 كشف حساب` |
| **paid** | قراءة فقط | `🔍 عرض` · `🖨 طباعة` |
| **cancelled** | قراءة فقط + خلفية حمراء | `🔄 إعادة فتح` |

#### المبيعات:

| المرحلة | الأزرار |
|---------|---------|
| **draft** | `✓ تأكيد` · `🗑 حذف` |
| **quotation** | `✎ تعديل` · `📧 إرسال للعميل` |
| **reservation** | `✓ تأكيد الحجز` |
| **order** | `📦 تسليم` |
| **delivery** | `📄 فوترة` |
| **invoice** | `📮 ترحيل` |
| **posted** | `💰 تحصيل` |
| **paid** | `🔍 عرض` |

### 2.4 قواعد التحويل (Transition Rules)

```sql
-- ═══════════════════════════════════════════════════════════════
-- Function: التحقق من صلاحية التحويل
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_valid_stage_transition(
    p_type TEXT,      -- 'purchase' | 'sale'
    p_from TEXT,
    p_to TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- ═══ المشتريات ═══
    IF p_type = 'purchase' THEN
        RETURN (p_from, p_to) IN (
            ('draft', 'quotation'),
            ('draft', 'order'),        -- يمكن تخطي عرض السعر
            ('draft', 'invoice'),      -- فاتورة مباشرة (محلي)
            ('quotation', 'order'),
            ('quotation', 'invoice'),  -- تخطي الأمر (مباشر)
            ('order', 'approved'),
            ('approved', 'receipt'),
            ('approved', 'invoice'),   -- تخطي الاستلام
            ('receipt', 'invoice'),
            ('invoice', 'posted'),
            ('posted', 'partial_paid'),
            ('posted', 'paid'),
            ('partial_paid', 'paid'),
            -- الإلغاء من أي مرحلة قبل الترحيل
            ('draft', 'cancelled'),
            ('quotation', 'cancelled'),
            ('order', 'cancelled'),
            ('approved', 'cancelled'),
            ('receipt', 'cancelled'),
            ('invoice', 'cancelled'),
            -- إعادة الفتح
            ('cancelled', 'draft')
        );
    END IF;

    -- ═══ المبيعات ═══
    IF p_type = 'sale' THEN
        RETURN (p_from, p_to) IN (
            ('draft', 'quotation'),
            ('draft', 'order'),
            ('draft', 'invoice'),      -- POS: فاتورة مباشرة
            ('quotation', 'reservation'),
            ('quotation', 'order'),
            ('reservation', 'order'),
            ('order', 'delivery'),
            ('order', 'invoice'),      -- تخطي التسليم
            ('delivery', 'invoice'),
            ('invoice', 'posted'),
            ('posted', 'partial_paid'),
            ('posted', 'paid'),
            ('partial_paid', 'paid'),
            -- الإلغاء
            ('draft', 'cancelled'),
            ('quotation', 'cancelled'),
            ('reservation', 'cancelled'),
            ('order', 'cancelled'),
            ('delivery', 'cancelled'),
            ('invoice', 'cancelled'),
            ('cancelled', 'draft')
        );
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 🔗 الجزء 3: الربط مع المحاسبة والمخازن

### 3.1 ربط المحاسبة (القيود)

```
┌──────────────────────────────────────────────────────────────┐
│                 متى يتم إنشاء القيد؟                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  المشتريات:                                                  │
│  stage = 'invoice' → زر "ترحيل" → stage = 'posted'          │
│  القيد:                                                      │
│    مدين: حـ/ المشتريات (default_purchase_account_id)          │
│    مدين: حـ/ ضريبة المدخلات (إن وُجد)                        │
│    دائن: حـ/ الموردين (supplier.payable_account_id أو default) │
│                                                              │
│  المبيعات:                                                    │
│  stage = 'invoice' → زر "ترحيل" → stage = 'posted'          │
│  القيد:                                                      │
│    مدين: حـ/ العملاء (customer.receivable_account_id أو default)│
│    دائن: حـ/ الإيرادات (default_revenue_account_id)           │
│    دائن: حـ/ ضريبة المخرجات (إن وُجد)                        │
│                                                              │
│  + قيد تكلفة البضاعة المباعة (اختياري):                       │
│    مدين: حـ/ تكلفة المبيعات (default_cogs_account_id)         │
│    دائن: حـ/ المخزون (default_inventory_account_id)           │
│                                                              │
│  المصدر: company_accounting_settings ← Single Source of Truth │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 ربط المخازن (المخزون)

```
┌──────────────────────────────────────────────────────────────┐
│                 متى يتم تحديث المخزون؟                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  المشتريات:                                                  │
│  stage = 'receipt' (أو عند الانتقال لها)                      │
│  ← إضافة كمية لكل بند في المستودع المحدد                     │
│  ← تحديث received_qty في purchase_transaction_items          │
│  ← إنشاء inventory_movement (type = 'goods_receipt')         │
│  ← تحديث fabric_rolls إن كان قماش                            │
│                                                              │
│  المبيعات:                                                    │
│  stage = 'delivery'                                          │
│  ← خصم كمية من المستودع لكل بند                              │
│  ← تحديث delivered_qty في sales_transaction_items            │
│  ← إنشاء inventory_movement (type = 'goods_issue')          │
│  ← تحديث fabric_rolls إن كان قماش                            │
│                                                              │
│  POS: فوري — stage يتحول مباشرة من draft → posted + paid      │
│  ← الخصم فوري                                                │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 ربط الدفعات

```
┌──────────────────────────────────────────────────────────────┐
│                 متى يتم تسجيل الدفع؟                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  بعد الترحيل (posted)                                        │
│  ← زر "تسجيل دفعة" يفتح نموذج:                              │
│     - المبلغ                                                 │
│     - حساب الدفع (نقد/بنك)                                    │
│     - التاريخ                                                │
│     - المرجع                                                 │
│  ← يُحدّث paid_amount, balance في الـ transaction            │
│  ← يُنشئ قيد دفع (journal_entry):                            │
│     مشتريات: مدين حـ/الموردين — دائن حـ/الصندوق              │
│     مبيعات:  مدين حـ/الصندوق — دائن حـ/العملاء               │
│  ← إذا balance = 0 → stage = 'paid'                         │
│  ← إذا balance > 0 → stage = 'partial_paid'                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 الجزء 4: ماذا يحصل للجداول القديمة؟

### 4.1 خطة الأرشفة

```
┌──────────────────────────────────────────────────────────────┐
│                  الجداول القديمة — أرشيف                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ تبقى كما هي — لا حذف، لا تعديل                          │
│  ✅ البيانات الموجودة فيها تبقى (للتقارير التاريخية)           │
│  ✅ الخدمات القديمة تبقى (كـ fallback)                       │
│                                                              │
│  ⚠️ Frontend الجديد يشير فقط للجداول الجديدة                │
│  ⚠️ لا نكتب بيانات جديدة فيها                               │
│  ⚠️ يمكن إعادة تفعيلها لاحقاً إن احتجنا                     │
│                                                              │
│  الجداول المؤرشفة (13 header + 13 items):                    │
│  ┌────────────────────┬──────────────────────┐               │
│  │ purchase_requests  │ purchase_request_items│               │
│  │ purchase_quotations│ purchase_quotation_items│              │
│  │ purchase_orders    │ purchase_order_items  │               │
│  │ purchase_invoices  │ purchase_invoice_items│               │
│  │ purchase_receipts  │ purchase_receipt_items│               │
│  │ purchase_returns   │ purchase_return_items │               │
│  │ quotations         │ quotation_items       │               │
│  │ transit_reservations│ reservation_items    │               │
│  │ sales_orders       │ sales_order_items     │               │
│  │ sales_deliveries   │ delivery_note_items   │               │
│  │ sales_invoices     │ sales_invoice_items   │               │
│  │ sales_returns      │ sales_return_items    │               │
│  └────────────────────┴──────────────────────┘               │
│                                                              │
│  الجداول التي تبقى شغالة:                                    │
│  ┌────────────────────┐                                      │
│  │ journal_entries ✅  │ ← لا تتأثر                          │
│  │ journal_entry_lines │ ← لا تتأثر                          │
│  │ containers ✅       │ ← لا تتأثر (نربطها مع الجديد)       │
│  │ suppliers ✅        │ ← لا تتأثر                          │
│  │ customers ✅        │ ← لا تتأثر                          │
│  │ warehouses ✅       │ ← لا تتأثر                          │
│  │ materials ✅        │ ← لا تتأثر                          │
│  │ fabric_rolls ✅     │ ← لا تتأثر                          │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 هل سيؤثر على الباك إند؟ — إجابة تفصيلية

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ❌ لا يتأثر أي ملف backend حالي ←                          │
│                                                              │
│  لأننا لا نحذف جداول ولا نعدل عليها.                        │
│  نُنشئ:                                                      │
│    ✅ جداول جديدة (purchase_transactions, sales_transactions) │
│    ✅ خدمات جديدة (PurchaseTransactionService, etc)          │
│    ✅ hooks جديدة (useAutoSave, useStageTransition)          │
│    ✅ مكونات جديدة (PurchaseTransactionSheet, etc)           │
│                                                              │
│  الخدمات القديمة تبقى كما هي:                                │
│    - purchaseAccountingService.ts → يبقى (يقرأ purchase_invoices)│
│    - receiptCompletionService.ts → يبقى (يكتب purchase_receipts)│
│    - TradeService.ts → يبقى (يدعم 13 نوع)                    │
│    - warehouseService.ts → يبقى                               │
│                                                              │
│  الفرونت إند:                                                │
│    - صفحات المبيعات/المشتريات → تُعدّل لتستخدم الجداول الجديدة│
│    - الشيت الموحد → يُبنى جديد (UnifiedTransactionForm)      │
│    - الصفحات القديمة → يمكن إخفاؤها أو إبقاؤها كأرشيف       │
│                                                              │
│  ⚡ المحصلة: 0 ملفات تنكسر — 100% أمان                      │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚙️ الجزء 5: Functions الخلفية (PostgreSQL)

### 5.1 Function: تحويل المرحلة

```sql
CREATE OR REPLACE FUNCTION advance_transaction_stage(
    p_type          TEXT,        -- 'purchase' | 'sale'
    p_transaction_id UUID,
    p_new_stage     TEXT,
    p_user_id       UUID,
    p_notes         TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_current_stage TEXT;
    v_company_id UUID;
    v_tenant_id UUID;
    v_generated_no TEXT;
    v_table TEXT;
    v_stage_field TEXT;
    v_number_field TEXT;
    v_date_field TEXT;
BEGIN
    -- 1. تحديد الجدول
    IF p_type = 'purchase' THEN
        v_table := 'purchase_transactions';
    ELSE
        v_table := 'sales_transactions';
    END IF;

    -- 2. قفل السجل (FOR UPDATE) لمنع التعارض
    EXECUTE format(
        'SELECT stage, company_id, tenant_id FROM %I WHERE id = $1 FOR UPDATE',
        v_table
    ) INTO v_current_stage, v_company_id, v_tenant_id
    USING p_transaction_id;

    -- 3. التحقق من صلاحية التحويل
    IF NOT is_valid_stage_transition(p_type, v_current_stage, p_new_stage) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('تحويل غير مسموح: %s → %s', v_current_stage, p_new_stage)
        );
    END IF;

    -- 4. توليد الرقم (إن لم يكن المرحلة draft أو cancelled)
    IF p_new_stage NOT IN ('draft', 'cancelled', 'partial_paid', 'paid', 'approved', 'posted') THEN
        v_generated_no := generate_stage_number(v_tenant_id, v_company_id, p_type, p_new_stage);
        
        -- تحديد حقل الرقم
        v_number_field := p_new_stage || '_no';
        v_date_field := p_new_stage || '_date';
        
        -- تحديث الرقم والتاريخ
        EXECUTE format(
            'UPDATE %I SET stage = $1, %I = $2, %I = CURRENT_DATE, updated_at = NOW() WHERE id = $3',
            v_table, v_number_field, v_date_field
        ) USING p_new_stage, v_generated_no, p_transaction_id;
    ELSE
        -- مراحل بدون رقم جديد
        EXECUTE format(
            'UPDATE %I SET stage = $1, updated_at = NOW() WHERE id = $2',
            v_table
        ) USING p_new_stage, p_transaction_id;
    END IF;

    -- 5. تسجيل في سجل المراحل
    INSERT INTO transaction_stage_log (
        transaction_type, transaction_id,
        from_stage, to_stage,
        generated_number, notes,
        performed_by
    ) VALUES (
        p_type, p_transaction_id,
        v_current_stage, p_new_stage,
        v_generated_no, p_notes,
        p_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'from_stage', v_current_stage,
        'to_stage', p_new_stage,
        'generated_number', v_generated_no
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2 Function: توليد رقم المرحلة

```sql
CREATE OR REPLACE FUNCTION generate_stage_number(
    p_tenant_id UUID,
    p_company_id UUID,
    p_doc_type TEXT,
    p_stage TEXT
) RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_next INTEGER;
BEGIN
    -- جلب أو إنشاء التسلسل
    INSERT INTO document_sequences (tenant_id, company_id, doc_type, stage, year, prefix, next_number)
    VALUES (p_tenant_id, p_company_id, p_doc_type, p_stage, v_year,
        CASE 
            WHEN p_doc_type = 'purchase' AND p_stage = 'quotation' THEN 'PQ'
            WHEN p_doc_type = 'purchase' AND p_stage = 'order' THEN 'PO'
            WHEN p_doc_type = 'purchase' AND p_stage = 'receipt' THEN 'PR'
            WHEN p_doc_type = 'purchase' AND p_stage = 'invoice' THEN 'PI'
            WHEN p_doc_type = 'sale' AND p_stage = 'quotation' THEN 'SQ'
            WHEN p_doc_type = 'sale' AND p_stage = 'reservation' THEN 'SR'
            WHEN p_doc_type = 'sale' AND p_stage = 'order' THEN 'SO'
            WHEN p_doc_type = 'sale' AND p_stage = 'delivery' THEN 'SD'
            WHEN p_doc_type = 'sale' AND p_stage = 'invoice' THEN 'SI'
            ELSE 'DOC'
        END,
        1
    )
    ON CONFLICT (tenant_id, company_id, doc_type, stage, year) DO NOTHING;

    -- جلب وزيادة الرقم (atomic)
    UPDATE document_sequences
    SET next_number = next_number + 1, updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND company_id = p_company_id
      AND doc_type = p_doc_type
      AND stage = p_stage
      AND year = v_year
    RETURNING prefix, next_number - 1 INTO v_prefix, v_next;

    RETURN v_prefix || '-' || v_year || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Triggers إلزامية

```sql
-- ═══ Auto-calculate totals ═══
CREATE OR REPLACE FUNCTION calc_transaction_totals()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_calc_totals
    BEFORE UPDATE ON purchase_transactions
    FOR EACH ROW EXECUTE FUNCTION calc_transaction_totals();

CREATE TRIGGER trg_sales_calc_totals
    BEFORE UPDATE ON sales_transactions
    FOR EACH ROW EXECUTE FUNCTION calc_transaction_totals();

-- ═══ RLS Policies ═══
ALTER TABLE purchase_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_stage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation policy pattern
CREATE POLICY "tenant_isolation" ON purchase_transactions
    USING (tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())::uuid);

-- (نفس النمط لبقية الجداول)
```

---

## 📊 الجزء 6: ملخص تنفيذي للمراحل

### ترتيب التنفيذ المقترح:

| المرحلة | المحتوى | الوقت | المخاطر | الحالة |
|---------|---------|-------|---------|--------|
| **1** | إنشاء الجداول الـ 6 + Functions + RLS + Triggers | 2-3 ساعات | منخفضة | ✅ تم |
| **2** | إنشاء Types + StageConfig + TransitionRules | 1 ساعة | منخفضة | ✅ تم |
| **3** | إنشاء TransactionService + hooks (AutoSave, StageTransition) | 2 ساعات | منخفضة | ✅ تم |
| **4** | إنشاء مكونات مشتركة (StageBar, Actions, AutoSave) + Stage-Aware UI | 2-3 ساعات | متوسطة | ✅ تم |
| **5A** | أرشفة الجداول القديمة (DEPRECATED) + توثيق الخريطة | 30 دقيقة | منخفضة | ✅ تم |
| **5B** | ربط صفحة المشتريات بـ `purchase_transactions` | 1 ساعة | متوسطة | ✅ تم |
| **5C** | ربط صفحة المبيعات بـ `sales_transactions` | 1 ساعة | متوسطة | ✅ تم |
| **6** | ربط المحاسبة (ترحيل) + المخازن (استلام) | 2 ساعات | متوسطة | 🔵 التالي |
| **7** | ربط POS + إعدادات أمر البيع المباشر | 2 ساعات | متوسطة | ⚪ قادم |
| **8** | ربط الدفعات + إعدادات المحاسبة + اختبار شامل | 2 ساعات | منخفضة | ⚪ قادم |

**المجموع: ~17-20 ساعة عمل (3 أيام عمل)**
**تم إنجاز: ~75% من المراحل ✅**

---

## ✅ الخلاصة

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  هذا النهج يجمع كل المزايا:                                 │
│                                                              │
│  ✅ لا كسر  — الجداول القديمة لا تُمس                       │
│  ✅ لا نسخ  — سجل واحد يتنقل بين المراحل                    │
│  ✅ بسيط    — جدولان بدل 13                                  │
│  ✅ آمن     — سجل المراحل + قفل صفي + RLS                   │
│  ✅ قابل للعودة — أي مشكلة = نرجع للقديم                     │
│  ✅ سهل الصيانة — Function واحدة لكل عملية                   │
│  ✅ AutoSave — حفظ تلقائي كمسودة                             │
│  ✅ أرقام ذكية — رقم جديد لكل مرحلة                         │
│  ✅ ربط مباشر — المحاسبة والمخازن بدون تعقيد                │
│                                                              │
│  الفرق عن النهج القديم:                                      │
│  قبل: quotation → copy → order → copy → invoice = 3 سجلات   │
│  بعد: quotation → advance → order → advance → invoice = 1    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
