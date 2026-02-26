# 📋 الخطة الشاملة — نظام الاستلام والمحاسبة والمخزون
**تاريخ الإنشاء:** 2026-02-20  
**آخر تحديث:** 2026-02-20 (بعد تدقيق قاعدة البيانات الفعلية)  
**الحالة:** 🔴 قيد التنفيذ  

---

## 🏛️ البنية القائمة في قاعدة البيانات (مكتشفة بالتدقيق)

### جداول نظام الاستلام:
```
containers               ← الكونتينر الرئيسي
  ↳ container_items      ← بنود الكونتينر (مواد + كميات + تكاليف)
  ↳ container_cost_allocations  ← توزيع المصاريف (جمارك، شحن، إلخ)
  ↳ v_container_cost_summary    ← View لملخص التكاليف
  
purchase_receipts        ← إذن الاستلام
  ↳ purchase_receipt_items ← بنود الإذن
    (أعمدة: quantity_received, quantity_accepted, quantity_rejected, material_id, color_id)

fabric_rolls             ← الرولونات الفعلية
  (لها: container_id, container_item_id, batch_id, material_id, cost_per_meter, 
         supplier_unit_cost, estimated_landed_cost, final_landed_cost,
         cost_status, allocated_expenses)

batches                  ← الدفعات
inventory_movements      ← حركات المخزون (فارغة حالياً!)
journal_entries          ← القيود المحاسبية
```

### الوضع الحالي في قاعدة البيانات:
| المؤشر | القيمة | التقييم |
|--------|--------|---------|
| `purchase_receipts` المكتملة | **0** | ⚠️ لم يكتمل أي استلام بعد |
| `purchase_receipts` كـ draft | **1** (للكونتينر MSKU9988776) | ⏳ |
| `inventory_movements` | **0** سجل | 🚨 فارغة تماماً |
| `fabric_rolls` | **34** رولون | ✅ موجودة |
| `cost_per_meter` في الرولونات | **0** لجميع الرولونات | 🚨 بدون تكلفة |
| قيود استلام (`goods_receipt`) | **2** قيد (منفصلة عن الإذن!) | ⚠️ |
| `container_items` مرتبطة بمادة | ✅ `material_id` موجود | ✅ |
| `fabric_rolls` مرتبطة بكونتينر | ✅ `container_id`, `container_item_id` | ✅ |
| إعدادات الحسابات الافتراضية | ✅ لجميع الشركات | ✅ |
| `container_account_id` | ✅ للكونتينر الموجود | ✅ |

---

## 🚨 المشاكل المكتشفة (مُرتبة بالأولوية)

### 🔴 حرجة — تمنع العمل الصحيح:

#### M1: `inventory_movements` فارغة تماماً
- **الوضع:** 34 رولون موجودة في `fabric_rolls` بدون أي سجل في `inventory_movements`
- **السبب:** `createInventoryMovements()` لا تُستدعى عند الاستلام الأول (من التتبع: لم يكتمل أي إذن)
- **التأثير:** صفحة "حركات المخزون" فارغة رغم وجود بضائع

#### M2: `cost_per_meter = 0` لجميع الرولونات
- **الوضع:** 34 رولون بتكلفة صفرية — بدون قيمة محاسبية
- **السبب:** عند إنشاء الرولونات، لم يُمرَّر `unit_price` من مصدر البيانات
- **التأثير:** القيود المحاسبية بمبالغ خاطئة (0)، الميزانية العمومية غير صحيحة

#### M3: قيود الاستلام منفصلة عن الإذن
- **الوضع:** قيدان `JE-GRN-20260219-*` موجودان لكن `reference_id` لا يجد `purchase_receipt`
- **السبب:** الإذن لم يكتمل أو حُذف، والقيد بقي
- **التأثير:** قيود "معلّقة" بدون مستند مرجعي

### 🟠 مهمة — تؤثر على الدقة المحاسبية:

#### M4: عدم تحديث التكلفة النهائية للرولونات بعد توزيع المصاريف
- **الوضع:** `container_items` لها `provisional_unit_cost` و`final_unit_cost` لبعض البنود، لكن `fabric_rolls.final_landed_cost = null` و`cost_status = null`  
- **السبب:** وظيفة توزيع التكاليف `container_cost_allocations` موجودة لكن لا تُزامن مع `fabric_rolls`
- **التأثير:** التكلفة الفعلية للرولون غير محسوبة

#### M5: `container_items.received_quantity = 0` رغم وجود إذن draft
- **الوضع:** الكونتينر MSKU9988776 له إذن draft، لكن `received_quantity = 0` في `container_items`
- **السبب:** `updateSourceDocument()` لا تُحدّث `container_items` بالكميات المستلمة
- **التأثير:** لا يمكن تتبع التقدم في استلام كل مادة داخل الكونتينر

#### M6: الكونتينر لا يُحدّث `container_items.received_rolls`
- **الوضع:** عند إدخال رولونات الاستلام، `container_items.received_rolls` يبقى = 0
- **التأثير:** فجوة بين الواقع (الرولونات في DB) والبيانات المخططة

### 🟡 متوسطة — تحسينات مطلوبة:

#### M7: `recordActivityLog` معطّل في `completeReceipt()`
- السطر 138: `// Step 8 ... (DISABLED - Table Missing)`

#### M8: `purchaseAccountingService` يقرأ من `purchase_transactions` القديمة
- يجب الترحيل إلى `purchase_invoices` الجديد

#### M9: لا توجد وظيفة للمناقلات (Transfers)
- حركة من مستودع لآخر غير مدعومة في نظام الإذن

---

## 🗺️ المراحل المجزأة

---

## ⭐ المرحلة 1: إكمال استلام حي وتسجيل المخزون
**الهدف:** إتمام الاستلام الفعلي وضمان تسجيل الحركات والتكلفة  
**الأولوية:** 🔴 حرجة أولاً  
**المدة التقديرية:** 2-3 ساعات  

### 1.1 — تشخيص لماذا inventory_movements فارغة
- فحص `createInventoryMovements()` في `receiptCompletionService.ts`
- التأكد أن الاستدعاء يصل إليها فعلاً (logging)
- التحقق من أن `movement_type = 'receipt'` يُدرج بنجاح

### 1.2 — إصلاح cost_per_meter في fabric_rolls
- فحص كيف تُنشأ الرولونات حالياً في `receiptLocalStore.ts`
- التأكد من تمرير `costPerMeter = container_items.unit_cost` عند الإنشاء
- تحديث الرولونات الـ34 الموجودة بتكلفتها الصحيحة من `container_items`

### 1.3 — اكتمال إذن الكونتينر MSKU9988776
- إكمال الإذن draft الموجود واختبار `completeReceipt()`
- التحقق من النتائج في: `inventory_movements`, `fabric_rolls`, `journal_entries`

### 1.4 — التحقق من النتائج (Verification SQL)
```sql
-- بعد الاستلام يجب أن يكون:
SELECT COUNT(*) FROM inventory_movements WHERE movement_type = 'receipt'; -- > 0
SELECT COUNT(*) FROM fabric_rolls WHERE cost_per_meter > 0;               -- > 0
SELECT COUNT(*) FROM purchase_receipts WHERE status = 'completed';        -- > 0
```

**✅ معايير نجاح المرحلة 1:**
- [ ] inventory_movements تحتوي سجلات للرولونات المستلمة
- [ ] cost_per_meter > 0 في كل الرولونات
- [ ] journal_entry مرتبط بـ purchase_receipt بشكل صحيح

---

## ⭐ المرحلة 2: إغلاق الكونتينر + الدفعة + توزيع التكاليف الفعلية
**الهدف:** عند اكتمال الاستلام — حساب التكلفة النهائية، إغلاق الكونتينر، إنشاء الدفعة، توزيعها على الرولونات، وتسجيل كل الأحداث  
**الأولوية:** 🔴 حرجة للدقة المحاسبية  
**المدة التقديرية:** 3-4 ساعات  
**القرار المعتمد:** ✅ الدفعة = الكونتينر (Batch per Container) — مع تتبع ثلاثي المستويات

---

### 🏛️ نموذج الدفعة (Batch Model)

```
batches
├── id
├── container_id              ← 🔑 ربط مباشر بالكونتينر (المصدر)
├── supplier_id               ← المورد (للبحث بمستوى المورد)
├── material_id               ← نوع المادة (دفعة واحدة لكل مادة داخل الكونتينر)
├── warehouse_id              ← المستودع الأصلي للاستلام
├── receipt_date              ← تاريخ الاستلام الفعلي
├── batch_number              ← BATCH-MSKU9988776-A (كونتينر + مادة)
├── ─── التكاليف ───
├── supplier_unit_cost        ← سعر المورد FOB
├── freight_cost_per_unit     ← حصة الشحن/م
├── customs_cost_per_unit     ← حصة الجمارك/م
├── tax_cost_per_unit         ← حصة الضرائب/م
├── other_cost_per_unit       ← مصاريف أخرى/م
├── final_unit_cost           ← 🔑 تكلفة رأس المال النهائية/م
├── ─── الكميات ───
├── total_meters              ← إجمالي الأمتار المستلمة
├── total_rolls               ← عدد الرولونات
├── ─── الحالة ───
└── status                    ← 'provisional' | 'finalized' | 'closed'
```

### 🔗 تسلسل الربط الثلاثي:
```
المادة (fabric_materials)
  ↑
fabric_rolls.material_id + batch_id
  ↑
batches.material_id + container_id + supplier_id + warehouse_id
  ↑
containers.id

→ استعلام "تكلفة رأس المال لمادة X من المورد Y في دفعة Z":
  SELECT b.final_unit_cost, b.receipt_date, b.total_meters
  FROM batches b
  WHERE b.material_id = :mat AND b.supplier_id = :sup
  ORDER BY b.receipt_date DESC
```

---

### 2.1 — تسلسل أحداث إغلاق الكونتينر

```
[حدث 1] وصول الكونتينر         → status: 'in_transit'
         🔔 log: "وصل الكونتينر X بتاريخ Y"
         
[حدث 2] تخليص جمركي            → status: 'customs_clearance'
         🔔 log: "تم التخليص — رسوم جمارك: Z"
         
[حدث 3] بدء الاستلام           → status: 'in_receiving'
         🔔 log: "بدأ الاستلام — عدد المواد: N"
         
[حدث 4] استلام جزئي           → status: 'in_receiving' (يبقى)
         🔔 log: "استُلم X من N رولون — M% مكتمل"
         
[حدث 5] ✅ اكتمال الاستلام     → status: 'received'
         ↓
         حساب التكلفة الفعلية:
           total_landed = SUM(container_cost_allocations)
           cost per material = (unit_cost + allocated_per_unit)
         ↓
         إنشاء/تحديث الدفعات:
           batches.final_unit_cost = total_landed / total_meters
         ↓
         تحديث الرولونات:
           fabric_rolls.cost_per_meter = batches.final_unit_cost
           fabric_rolls.cost_status = 'finalized'
         ↓
         تحديث القيد المحاسبي (Phase 3)
         ↓
         🔔 log: "القيد عُدِّل — كان X صار Y"
         ↓
[حدث 6] إغلاق الكونتينر       → status: 'closed'
         🔔 log: "الكونتينر مُغلق — التكلفة النهائية: Z/م"
```

---

### 2.2 — دالة `closeContainer()` الجديدة

```typescript
// في receiptCompletionService.ts أو containerService.ts
async function closeContainer(
    containerId: string,
    companyId: string,
    tenantId: string,
    userId: string
): Promise<ContainerCloseResult> {

    // 1. فحص: هل الاستلام مكتمل؟
    const { data: container } = await supabase
        .from('containers')
        .select('*, container_items(*), container_cost_allocations(*)')
        .eq('id', containerId)
        .single();

    const allReceived = container.container_items.every(
        ci => ci.received_quantity >= ci.planned_quantity * 0.99 // 99% قبول
    );

    if (!allReceived) {
        return { success: false, error: 'الاستلام غير مكتمل' };
    }

    // 2. حساب التكلفة الفعلية لكل مادة
    const totalMeters = container.container_items.reduce(
        (s, ci) => s + (ci.received_quantity || ci.planned_quantity), 0
    );
    const totalAllocatedCosts = container.container_cost_allocations.reduce(
        (s, a) => s + (a.amount || 0), 0
    );
    const costRatio = totalMeters > 0 ? totalAllocatedCosts / totalMeters : 0;

    // 3. لكل مادة في الكونتينر → إنشاء/تحديث دفعة
    const batchIds: string[] = [];
    for (const ci of container.container_items) {
        const finalUnitCost = (ci.unit_cost || 0) + costRatio;
        const materialMeters = ci.received_quantity || ci.planned_quantity;

        // الحصص التفصيلية للتكاليف
        const freightAlloc = container.container_cost_allocations
            .find(a => a.cost_type === 'freight');
        const customsAlloc = container.container_cost_allocations
            .find(a => a.cost_type === 'customs');
        const taxAlloc = container.container_cost_allocations
            .find(a => a.cost_type === 'tax');

        const batchNumber = `BATCH-${container.container_number}-${ci.material_id.substring(0,6)}`;

        // إنشاء/تحديث الدفعة
        const { data: batch } = await supabase
            .from('batches')
            .upsert({
                tenant_id: tenantId,
                company_id: companyId,
                container_id: containerId,
                supplier_id: container.supplier_id,
                material_id: ci.material_id,
                batch_number: batchNumber,
                receipt_date: new Date().toISOString().split('T')[0],
                // ─── التكاليف التفصيلية ───
                supplier_unit_cost: ci.unit_cost || 0,
                freight_cost_per_unit: freightAlloc ? (freightAlloc.amount / totalMeters) : 0,
                customs_cost_per_unit: customsAlloc ? (customsAlloc.amount / totalMeters) : 0,
                tax_cost_per_unit: taxAlloc ? (taxAlloc.amount / totalMeters) : 0,
                final_unit_cost: finalUnitCost,
                // ─── الكميات ───
                total_meters: materialMeters,
                total_rolls: ci.received_rolls || 0,
                status: 'finalized',
            }, { onConflict: 'container_id,material_id' })
            .select('id')
            .single();

        if (batch?.id) batchIds.push(batch.id);

        // تحديث الرولونات بالتكلفة النهائية + ربط الدفعة
        await supabase
            .from('fabric_rolls')
            .update({
                cost_per_meter: finalUnitCost,
                final_landed_cost: finalUnitCost,
                supplier_unit_cost: ci.unit_cost || 0,
                allocated_expenses: costRatio,
                cost_status: 'finalized',
                batch_id: batch?.id || null,
            })
            .eq('container_item_id', ci.id);

        // تحديث container_item بالتكلفة النهائية
        await supabase
            .from('container_items')
            .update({
                final_unit_cost: finalUnitCost,
                allocated_costs: costRatio * materialMeters,
            })
            .eq('id', ci.id);
    }

    // 4. إغلاق الكونتينر
    await supabase
        .from('containers')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', containerId);

    // 5. تسجيل سجل الأحداث المفصّل
    await logContainerClosure({
        containerId,
        containerNumber: container.container_number,
        supplierId: container.supplier_id,
        totalMeters,
        totalAllocatedCosts,
        finalCostPerMeter: costRatio + (container.container_items[0]?.unit_cost || 0),
        costBreakdown: container.container_cost_allocations,
        batchIds,
        userId,
        companyId,
        tenantId,
    });

    return { success: true, batchIds };
}
```

---

### 2.3 — `logContainerClosure()` — سجل أحداث الكونتينر الكامل

```typescript
async function logContainerClosure(params) {
    const events = [
        {
            action: 'container_closed',
            description_ar: `تم إغلاق الكونتينر ${params.containerNumber} — التكلفة النهائية: ${params.finalCostPerMeter.toFixed(3)}/م`,
            metadata: {
                total_meters: params.totalMeters,
                total_allocated_costs: params.totalAllocatedCosts,
                final_cost_per_meter: params.finalCostPerMeter,
                stage: 'container_closed',
                batch_ids: params.batchIds,
            },
        },
        {
            action: 'costs_distributed',
            description_ar: `توزيع المصاريف النهائية على الدفعات`,
            metadata: {
                cost_breakdown: params.costBreakdown.map(c => ({
                    type: c.cost_type,
                    amount: c.amount,
                    per_meter: (c.amount / params.totalMeters).toFixed(4),
                    note: c.description || c.cost_type,
                })),
                stage: 'costs_finalized',
            },
        },
        {
            action: 'batches_created',
            description_ar: `تم إنشاء ${params.batchIds.length} دفعة مرتبطة بالكونتينر`,
            metadata: {
                batch_count: params.batchIds.length,
                batch_ids: params.batchIds,
                stage: 'batches_finalized',
            },
        },
    ];

    for (const event of events) {
        await supabase.from('document_activity_log').insert({
            entity_type: 'containers',
            entity_id: params.containerId,
            ...event,
            performed_by: params.userId,
            performed_at: new Date().toISOString(),
        });
    }
}
```

---

### 2.4 — استعلام "تكلفة رأس المال بالدفعة" 

```sql
-- تقرير: سعر رأس المال لكل دفعة — بالمادة والمورد والمستودع
SELECT
    b.batch_number,
    b.receipt_date,
    fm.name_ar AS material_name,
    s.name AS supplier_name,
    w.name_ar AS warehouse_name,
    b.supplier_unit_cost    AS "سعر المورد/م",
    b.freight_cost_per_unit AS "شحن/م",
    b.customs_cost_per_unit AS "جمارك/م",
    b.tax_cost_per_unit     AS "ضرائب/م",
    b.final_unit_cost       AS "تكلفة رأس المال/م",
    b.total_meters          AS "إجمالي الأمتار",
    b.total_rolls           AS "عدد الرولونات",
    (b.final_unit_cost * b.total_meters) AS "إجمالي القيمة"
FROM batches b
LEFT JOIN fabric_materials fm ON fm.id = b.material_id
LEFT JOIN suppliers s ON s.id = b.supplier_id
LEFT JOIN warehouses w ON w.id = b.warehouse_id
WHERE b.company_id = :company_id
ORDER BY b.receipt_date DESC;
```

---

**✅ معايير نجاح المرحلة 2:**
- [ ] `containers.status = 'closed'` بعد الاستلام الكامل
- [ ] دفعة (`batch`) لكل مادة في الكونتينر بالتكلفة التفصيلية
- [ ] `fabric_rolls.cost_per_meter = batches.final_unit_cost` (التكلفة النهائية)
- [ ] `document_activity_log` يحتوي سجل إغلاق الكونتينر + توزيع المصاريف + الدفعات
- [ ] استعلام الدفعة يُرجع: تاريخ، مورد، تكلفة مفصّلة، مستودع

---

## ⭐ المرحلة 3 — 🟠 القيد المحاسبي: تعديل مباشر + سجل أحداث
**الهدف:** تعديل القيد الموجود بالأرقام الفعلية عند الاستلام، مع تسجيل ما كان وما صار  
**الأولوية:** 🟠 مهمة  
**المدة التقديرية:** 2-3 ساعات  
**القرار المعتمد:** ✅ **تعديل مباشر in-place** (لا قيود عكسية) + سجل أحداث يوثّق التغيير

---

### 🏛️ منطق القيد حسب نوع المستند

#### للفاتورة المُرحَّلة (Posted Invoice):
```
المرحلة أ — عند ترحيل الفاتورة (الوضع الحالي):
  Dr. مصاريف مشتريات / COGS (511)  ← بمبلغ الفاتورة
  Cr. ذمم دائنة - موردين (2111)    ← بمبلغ الفاتورة

المرحلة ب — عند الاستلام الفعلي (جديد):
  نُعدّل نفس القيد بدلاً من إنشاء قيد جديد:
  Dr. مخزون (1141)                  ← الكمية الفعلية × التكلفة النهائية
  Cr. ذمم دائنة - موردين (2111)    ← نفس المبلغ (مُعدَّل إذا الكمية ناقصة)

سجل الحدث:
  "القيد #X عُدِّل بناءً على الاستلام الفعلي"
  قبل:  Dr مصاريف 15,525 / Cr ذمم 15,525
  بعد:  Dr مخزون 13,200  / Cr ذمم 13,200  ← 8,000م من 10,000م مخطط
  الفارق: −2,325 (كمية غير مستلمة — تبقى في حسابات مفتوحة)
```

#### للكونتينر (لا يوجد قيد فاتورة سابق):
```
عند الاستلام:
  إنشاء قيد جديد (لا يوجد قيد سابق للكونتينر):
  Dr. مخزون (1141)                   ← التكلفة الفعلية المحسوبة
  Cr. حساب الكونتينر (11432)          ← إغلاق حساب البضاعة في الطريق
  ← لا تعديل هنا لأن لا قيد سابق
```

#### لأمر الشراء (Purchase Order):
```
عند الاستلام (GRNI Method):
  إنشاء قيد جديد:
  Dr. مخزون (1141)
  Cr. بضاعة مستلمة غير مفوترة (2108)   ← GRNI

  عند ورود الفاتورة لاحقاً:
  Dr. بضاعة مستلمة غير مفوترة (2108)  ← إغلاق GRNI
  Cr. ذمم دائنة (2111)
```

---

### 3.1 — منطق `handleAccountingEntry()` المُعدَّل

```typescript
async function handleAccountingEntry(params, receiptId, receiptNumber) {

  // 1. فحص: هل يوجد قيد مرتبط بالمستند المصدر؟
  let existingJournalEntryId: string | null = null;
  let beforeSnapshot: JournalLines[] = [];

  if (params.sourceDocumentType !== 'container') {
    // الفواتير وأوامر الشراء قد يكون لها قيد سابق
    const { data: existingDoc } = await supabase
      .from(sourceTable)
      .select('journal_entry_id')
      .eq('id', params.sourceDocumentId)
      .single();

    existingJournalEntryId = existingDoc?.journal_entry_id || null;
  }

  if (existingJournalEntryId) {
    // ══ لديه قيد موجود → تعديل مباشر ══

    // التقاط الحالة قبل التعديل (للسجل)
    const { data: beforeLines } = await supabase
      .from('journal_entry_lines')
      .select('*, chart_of_accounts(account_code, name_ar)')
      .eq('entry_id', existingJournalEntryId);
    beforeSnapshot = beforeLines || [];

    // حذف السطور القديمة وإضافة الجديدة
    await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('entry_id', existingJournalEntryId);

    // إدراج السطور الجديدة بالأرقام الفعلية
    await supabase
      .from('journal_entry_lines')
      .insert(newLines.map(line => ({ ...line, entry_id: existingJournalEntryId })));

    // تحديث مجاميع القيد الرئيسي
    await supabase
      .from('journal_entries')
      .update({
        total_debit: actualTotal,
        total_credit: actualTotal,
        description: `قيد استلام بضائع (مُعدَّل) — ${params.sourceDocumentNumber}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingJournalEntryId);

    // ══ تسجيل سجل الحدث (قبل/بعد) ══
    await logJournalModification({
      journalEntryId: existingJournalEntryId,
      receiptId,
      receiptNumber,
      sourceDocumentNumber: params.sourceDocumentNumber,
      beforeLines: beforeSnapshot,
      afterLines: newLines,
      reason: 'تعديل بناءً على الكمية الفعلية المستلمة',
      performedBy: currentUserId,
    });

    return existingJournalEntryId;

  } else {
    // ══ لا يوجد قيد → إنشاء جديد (الوضع الحالي) ══
    return await createNewJournalEntry(params, receiptId, receiptNumber, newLines);
  }
}
```

---

### 3.2 — دالة `logJournalModification()` (سجل الأحداث)

**الغرض:** توثيق التغييرات على القيد بدلاً من الاحتفاظ بنسخ متعددة

```typescript
async function logJournalModification(params: {
  journalEntryId: string;
  receiptId: string;
  receiptNumber: string;
  sourceDocumentNumber: string;
  beforeLines: any[];
  afterLines: any[];
  reason: string;
  performedBy: string | null;
}) {
  // بناء ملخص نصي للتغيير
  const beforeSummary = params.beforeLines.map(l =>
    `Dr ${l.debit > 0 ? l.chart_of_accounts?.name_ar : ''} ${l.debit} / Cr ${l.credit > 0 ? l.chart_of_accounts?.name_ar : ''} ${l.credit}`
  ).join(' | ');

  const afterSummary = params.afterLines.map(l =>
    `Dr ${l.debit > 0 ? l.account_name : ''} ${l.debit} / Cr ${l.credit > 0 ? l.account_name : ''} ${l.credit}`
  ).join(' | ');

  // تسجيل في document_activity_log
  await supabase.from('document_activity_log').insert({
    entity_type: 'journal_entries',
    entity_id: params.journalEntryId,
    action: 'journal_modified_on_receipt',
    description_ar: `القيد عُدِّل بناءً على الاستلام الفعلي — ${params.receiptNumber}`,
    description_en: `Journal entry updated based on actual receipt — ${params.receiptNumber}`,
    metadata: {
      receipt_id: params.receiptId,
      receipt_number: params.receiptNumber,
      source_document_number: params.sourceDocumentNumber,
      reason: params.reason,
      before: { lines: params.beforeLines, summary: beforeSummary },
      after: { lines: params.afterLines, summary: afterSummary },
    },
    performed_by: params.performedBy,
    performed_at: new Date().toISOString(),
  });
}
```

---

### 3.3 — حالات التعديل الممكنة

| الحالة | الإجراء |
|--------|---------|
| استلام كامل (100%) | تعديل المبلغ = مبلغ الفاتورة |
| استلام جزئي (مثلاً 80%) | تعديل المبلغ = 80% من مبلغ الفاتورة، الفارق يبقى كـ "معلّق" |
| كمية تختلف عن الفاتورة | تعديل بالكميات الفعلية، سجل الفارق |
| سعر يختلف | تعديل بالسعر الفعلي، سجل الفرق |
| استلام متعدد (partial ثم final) | التعديل الأول عند partial، التعديل النهائي عند final |

---

### 3.4 — معالجة الاستلام الجزئي للقيد

```
مثال: فاتورة 10,000م بسعر 2.5 = 25,000

استلام أول (60%: 6,000م):
  → تعديل القيد: Dr مخزون 15,000 / Cr ذمم 15,000
  → تسجيل: "60% مستلم — المبلغ المعلّق 10,000"

استلام ثانٍ (40%: 4,000م):
  → تعديل القيد: Dr مخزون 25,000 / Cr ذمم 25,000  (مكتمل)
  → تسجيل: "اكتمل الاستلام 100%"
```

---

**✅ معايير نجاح المرحلة 3:**
- [ ] لا قيود مزدوجة لنفس المستند في أي وقت
- [ ] كل قيد يعكس الكمية الفعلية المستلمة (لا الكمية المخططة)
- [ ] `document_activity_log` يحتوي سجل "قبل/بعد" لكل تعديل
- [ ] `total_debit = total_credit` في جميع القيود
- [ ] مبالغ القيود لا تكون صفراً أبداً


---

## ⭐ المرحلة 4: الفواتير المعلقة وتحديث حالتها
**الهدف:** ضمان صحة دورة الفاتورة من الإنشاء حتى الاستلام  
**الأولوية:** 🟠 مهمة  
**المدة التقديرية:** 1-2 ساعة  

### 4.1 — إصلاح الفواتير الفارغة (total = 0)
- فاتورتان `PI-2026-497830` و`PI-2026-537326` بمبلغ 0 وبدون مورد
- التحقق من سبب الإنشاء الفارغ

### 4.2 — تحديث `receipt_status` تلقائياً
- عند اكتمال الاستلام → `purchase_invoices.receipt_status = 'received'`
- عند الاستلام الجزئي → `receipt_status = 'partial'`

### 4.3 — سير العمل الكامل للفاتورة:
```
draft → confirmed → posted → in_progress → partial/received
                      ↓
               (قيد الفاتورة)
                                   ↓
                           (قيد تسوية الاستلام)
```

**✅ معايير نجاح المرحلة 4:**
- [ ] كل فاتورة مستلمة لها `receipt_status = 'received'` أو `'partial'`
- [ ] لا فواتير بمبلغ صفر في مراحل متقدمة

---

## ⭐ المرحلة 5: المناقلات بين المستودعات
**الهدف:** دعم نقل الرولونات/البضائع بين المستودعات مع قيد محاسبي  
**الأولوية:** 🟡 متوسطة  
**المدة التقديرية:** 3-4 ساعات  

### 5.1 — إنشاء `transferCompletionService.ts`
**المنطق:**
```typescript
// عند إكمال مناقلة:
// 1. UPDATE fabric_rolls SET warehouse_id = to_warehouse_id WHERE id IN (...)
// 2. INSERT INTO inventory_movements: movement_type = 'transfer'
//    from_warehouse_id + to_warehouse_id, quantity, unit_cost
// 3. (اختياري) قيد محاسبي:
//    Dr. مخزون المستودع المستقبِل
//    Cr. مخزون المستودع المرسِل
```

### 5.2 — القيد المحاسبي للمناقلة
```
Dr. مخزون مستودع (أ) [to_warehouse]   XXX
Cr. مخزون مستودع (ب) [from_warehouse] XXX
```
ملاحظة: إذا كان نظام محاسبي موحّد (حساب مخزون واحد) → لا قيد مطلوب

**✅ معايير نجاح المرحلة 5:**
- [ ] `fabric_rolls.warehouse_id` يتغير بعد المناقلة
- [ ] `inventory_movements` تسجّل الحركة بـ from + to
- [ ] القيد المحاسبي (إن وُجد) متوازن

---

## ⭐ المرحلة 6: إعادة تفعيل سجل النشاط + صيانة
**الهدف:** الصيانة العامة وإعادة تفعيل الوظائف المعطّلة  
**الأولوية:** 🟡 متوسطة  
**المدة التقديرية:** 1-2 ساعة  

### 6.1 — فحص وإعادة تفعيل `recordActivityLog`
- التحقق من وجود جدول `document_activity_log` في DB
- إعادة تفعيل السطر المعطّل في `completeReceipt()`

### 6.2 — تنظيف القيود المنفصلة
```sql
-- القيدان JE-GRN-20260219-* منفصلان (reference_receipt = null)
-- يجب إما ربطهما بالإذن الصحيح أو إلغاؤهما
```

### 6.3 — SQL للتحقق الدوري (Health Check)
```sql
-- يتم تشغيله دورياً للتحقق من سلامة البيانات
SELECT 
  (SELECT COUNT(*) FROM inventory_movements WHERE movement_type = 'receipt') as movements,
  (SELECT COUNT(*) FROM fabric_rolls WHERE cost_per_meter > 0) as rolls_with_cost,
  (SELECT COUNT(*) FROM purchase_receipts WHERE status = 'completed') as completed_receipts,
  (SELECT COUNT(*) FROM journal_entries je 
   WHERE reference_type = 'goods_receipt' 
   AND NOT EXISTS (SELECT 1 FROM purchase_receipts pr WHERE pr.id = je.reference_id)) as orphan_entries
```

**✅ معايير نجاح المرحلة 6:**
- [ ] Activity Log يسجّل كل عملية استلام
- [ ] لا قيود "يتيمة" منفصلة عن مستند
- [ ] Health Check يرجع قيماً طبيعية

---

## 📅 خلاصة المراحل

| # | المرحلة | الوصف | الأولوية | المدة |
|---|--------|-------|----------|-------|
| **1** | اكتمال الاستلام وتسجيل المخزون | inventory_movements + cost_per_meter + اكتمال الإذن | 🔴 حرجة | 2-3 ساعات |
| **2** | تزامن تكاليف الكونتينر بالرولونات | final_landed_cost + batch + received_quantity | 🔴 حرجة | 3-4 ساعات |
| **3** | القيد المحاسبي الصحيح | منع التكرار + ربط بالإذن + مبالغ دقيقة | 🟠 مهمة | 2-3 ساعات |
| **4** | دورة الفاتورة الكاملة | receipt_status + الفواتير الفارغة | 🟠 مهمة | 1-2 ساعة |
| **5** | المناقلات | transferCompletionService + inventory_movements | 🟡 متوسطة | 3-4 ساعات |
| **6** | صيانة وسجل النشاط | activity_log + قيود يتيمة + health check | 🟡 متوسطة | 1-2 ساعة |

**المدة الإجمالية التقديرية:** 12-18 ساعة عمل  
**الترتيب المقترح للبدء:** المرحلة 1 ← المرحلة 2 ← المرحلة 3 (بالتوازي مع 4) ← 5 ← 6
