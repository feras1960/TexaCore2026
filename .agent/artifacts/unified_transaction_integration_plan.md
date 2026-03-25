# 🔄 خطة التكامل — تحديث المكونات الموجودة للنظام الموحد

> **التاريخ**: 2026-02-15  
> **النهج**: تحديث المكونات الموجودة بدل إنشاء مكونات جديدة  
> **الفلسفة**: أقل تغيير ممكن — أقصى توافق — بدون كسر

---

## 📐 البنية الحالية (ما لدينا)

```
صفحة القائمة                    الشيت الموحد
═══════════                    ════════════
SalesInvoicesList.tsx    →→→    UnifiedTradeSheet.tsx
PurchaseInvoicesList.tsx →→→         ↓
                               UnifiedAccountingSheet.tsx (2426 سطر)
                                    ↓
                               tradeConfigs.ts (التبويبات + الأزرار)
                                    ↓
                               types.ts (DocumentConfig, TabConfig, etc)
```

### المكونات الجديدة (Phase 3 — مكتملة ✅):
```
TransactionStageBadge      ← شارة المرحلة
TransactionStageTimeline   ← خط زمني أفقي
TransactionActionButtons   ← أزرار ديناميكية حسب المرحلة
TransactionStageHistory    ← سجل التحويلات
TransactionSummaryCard     ← بطاقة ملخص
TransactionStageStats      ← فلتر المراحل بالأعداد
```

---

## 🎯 خطة التحديث (5 مراحل)

### المرحلة 4A: تحديث `tradeConfigs.ts` — إضافة Stage Awareness

**الهدف**: جعل التبويبات والأزرار تتغير ديناميكياً حسب المرحلة

#### 1. توسيع `TabConfig` في `types.ts`:
```typescript
export interface TabConfig {
    id: string;
    labelKey: string;
    icon: string;
    component: string;
    showInModes?: SheetMode[];
    badge?: string;
    hidden?: boolean;
    // ═══ جديد: Stage Awareness ═══
    visibleInStages?: string[];    // ظاهر فقط في هذه المراحل (null = دائماً)
    editableInStages?: string[];   // قابل للتعديل فقط في هذه المراحل
    requiredInStages?: string[];   // إلزامي في هذه المراحل
}
```

#### 2. توسيع `DocumentConfig` في `types.ts`:
```typescript
export interface DocumentConfig {
    // ... الحقول الحالية ...
    // ═══ جديد ═══
    stageOrder?: string[];              // ترتيب المراحل للـ Timeline
    stageActions?: Record<string, StageActionConfig[]>;  // أزرار كل مرحلة
    editableStages?: string[];          // المراحل القابلة للتعديل
    lockedStages?: string[];            // المراحل المقفلة
}

export interface StageActionConfig {
    id: string;
    labelKey: string;
    labelAr: string;
    labelEn: string;
    icon: string;
    targetStage: string;
    variant: 'default' | 'success' | 'destructive' | 'outline';
    requiresConfirm?: boolean;
    requiresNotes?: boolean;
    requiresReason?: boolean;
}
```

#### 3. تحديث configs في `tradeConfigs.ts`:

##### المشتريات — تبويبات كل مرحلة:

| المرحلة | التبويبات الظاهرة | قابل للتعديل |
|---------|-------------------|-------------|
| `draft` | أصناف, مواد | ✅ كل شيء |
| `quotation` | أصناف, مواد, مورد, مرفقات | ✅ أصناف + مورد |
| `order` | أصناف, مواد, مورد, شحن, مرفقات | ❌ (ينتظر اعتماد) |
| `approved` | أصناف, مورد, شحن, مرفقات | ❌ |
| `receipt` | أصناف, مورد, استلام, مرفقات | ✅ استلام فقط |
| `invoice` | أصناف, مورد, سداد, مصاريف, مرفقات | ✅ سداد + مصاريف |
| `posted` | كل التبويبات + دفتر الأستاذ | ❌ |
| `partial_paid` | كل التبويبات + سداد | ✅ سداد فقط |
| `paid` | كل التبويبات | ❌ |
| `cancelled` | نشاط فقط | ❌ |

##### المبيعات — تبويبات كل مرحلة:

| المرحلة | التبويبات الظاهرة | قابل للتعديل |
|---------|-------------------|-------------|
| `draft` | أصناف, مواد | ✅ كل شيء |
| `quotation` | أصناف, مواد, عميل, مرفقات | ✅ أصناف + عميل |
| `reservation` | أصناف, عميل, مرفقات | ❌ |
| `order` | أصناف, عميل, شحن, مرفقات | ❌ |
| `delivery` | أصناف, عميل, شحن, مرفقات | ✅ شحن فقط |
| `invoice` | أصناف, عميل, سداد, مرفقات | ✅ سداد فقط |
| `posted` | كل التبويبات + دفتر الأستاذ | ❌ |
| `partial_paid` | كل التبويبات + سداد | ✅ سداد فقط |
| `paid` | كل التبويبات | ❌ |
| `cancelled` | نشاط فقط | ❌ |

##### أزرار كل مرحلة (مشتريات):
```typescript
stageActions: {
    draft:        [{ id: 'confirm', targetStage: 'quotation', variant: 'default' },
                   { id: 'skip_to_order', targetStage: 'order', variant: 'outline' },
                   { id: 'delete', variant: 'destructive' }],
    quotation:    [{ id: 'to_order', targetStage: 'order', variant: 'default' },
                   { id: 'edit', variant: 'outline' },
                   { id: 'print', variant: 'outline' }],
    order:        [{ id: 'approve', targetStage: 'approved', variant: 'success', requiresConfirm: true }],
    approved:     [{ id: 'receive', targetStage: 'receipt', variant: 'default' },
                   { id: 'to_invoice', targetStage: 'invoice', variant: 'outline' }],
    receipt:      [{ id: 'to_invoice', targetStage: 'invoice', variant: 'default' }],
    invoice:      [{ id: 'post', targetStage: 'posted', variant: 'success', requiresConfirm: true }],
    posted:       [{ id: 'pay', targetStage: 'partial_paid', variant: 'default' }],
    partial_paid: [{ id: 'pay_more', targetStage: 'paid', variant: 'default' }],
    paid:         [{ id: 'print', variant: 'outline' }],
    cancelled:    [{ id: 'reopen', targetStage: 'draft', variant: 'outline' }],
}
```

---

### المرحلة 4B: تحديث `UnifiedTradeSheet.tsx`

**التغييرات المطلوبة:**

#### 1. إضافة prop `stage` و `transactionType`:
```typescript
interface UnifiedTradeSheetProps {
    // ... الحقول الحالية ...
    // ═══ جديد ═══
    stage?: string;                    // المرحلة الحالية
    transactionType?: 'purchase' | 'sale';
    stageLogs?: TransactionStageLog[]; // سجل المراحل
    onStageAdvance?: (targetStage: string, notes?: string) => Promise<void>;
}
```

#### 2. إضافة `TransactionStageTimeline` كـ header:
```tsx
// في headerExtra — بدل Flow Indicator الحالي
const StageHeader = (
    <TransactionStageTimeline
        type={transactionType}
        currentStage={stage}
        logs={stageLogs}
    />
);
```

#### 3. تمرير `stage` إلى `UnifiedAccountingSheet`:
```tsx
<UnifiedAccountingSheet
    // ... الحالي ...
    currentStage={stage}           // جديد
    onStageAdvance={onStageAdvance} // جديد
/>
```

---

### المرحلة 4C: تحديث `UnifiedAccountingSheet.tsx`

**التغييرات المطلوبة (محدودة ومركزة):**

#### 1. إضافة props جديدة:
```typescript
currentStage?: string;
onStageAdvance?: (targetStage: string, notes?: string) => Promise<void>;
```

#### 2. فلترة التبويبات حسب المرحلة:
```typescript
// في useMemo لحساب التبويبات الظاهرة
const visibleTabs = useMemo(() => {
    if (!currentStage) return config.tabs; // fallback للسلوك القديم
    return config.tabs.filter(tab => {
        if (!tab.visibleInStages) return true; // ظاهر دائماً
        return tab.visibleInStages.includes(currentStage);
    });
}, [config.tabs, currentStage]);
```

#### 3. تحديد وضع التعديل حسب المرحلة:
```typescript
const isEditableByStage = useMemo(() => {
    if (!currentStage || !config.editableStages) return true;
    return config.editableStages.includes(currentStage);
}, [currentStage, config]);
```

#### 4. استبدال أزرار الـ footer بـ `TransactionActionButtons`:
```tsx
// في footer — إذا كان هناك stage
{currentStage && onStageAdvance ? (
    <TransactionActionButtons
        type={transactionType}
        currentStage={currentStage}
        onAdvance={onStageAdvance}
    />
) : (
    // الأزرار القديمة (save, confirm, etc) — backward compatible
    {renderLegacyActions()}
)}
```

---

### المرحلة 4D: تحديث صفحات القوائم

#### `SalesInvoicesList.tsx` — التغييرات:

1. **مصدر البيانات**: `sales_transactions` بدل `sales_invoices`
2. **التبويبات**: استبدال Tabs الثابتة بـ `TransactionStageStats`
3. **الشارة في الجدول**: `TransactionStageBadge` بدل `StatusDropdown`
4. **فتح الشيت**: تمرير `stage` و `stageLogs`

```tsx
// قبل (حالي):
<Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsTrigger value="all">الكل</TabsTrigger>
    <TabsTrigger value="draft">مسودة</TabsTrigger>
    ...
</Tabs>

// بعد (جديد):
<TransactionStageStats
    type="sale"
    counts={stageCounts}
    activeStage={activeStage}
    onStageClick={setActiveStage}
/>
```

```tsx
// فتح الشيت — تمرير البيانات الجديدة:
<UnifiedTradeSheet
    open={isSheetOpen}
    onOpenChange={setIsSheetOpen}
    mode="sales"
    type={getDocTypeFromStage(selectedDoc?.stage)}
    initialData={selectedDoc}
    stage={selectedDoc?.stage}               // جديد
    transactionType="sale"                    // جديد
    stageLogs={selectedDoc?.stage_logs}       // جديد
    onStageAdvance={handleStageAdvance}       // جديد
    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['sales_transactions'] })}
/>
```

#### `PurchaseInvoicesList.tsx` — نفس التغييرات مع:
- `purchase_transactions` بدل `purchase_invoices`
- `type="purchase"` بدل `type="sale"`

---

### المرحلة 4E: إضافة تبويب `StageTimeline` في `tradeConfigs.ts`

```typescript
// تبويب جديد — سجل المراحل
const TAB_STAGE = {
    stageHistory: {
        id: 'stage_history',
        labelKey: 'trade.tabs.stageHistory',
        icon: 'GitBranch',
        component: 'TransactionStageHistory',
        visibleInStages: null, // ظاهر دائماً
    },
};
```

---

## 📊 ملخص التغييرات على كل ملف

| الملف | نوع التغيير | الحجم | المخاطر |
|-------|-------------|-------|---------|
| `types.ts` | إضافة حقول | صغير (~20 سطر) | ❌ لا كسر |
| `tradeConfigs.ts` | إضافة stage configs | متوسط (~150 سطر) | ❌ لا كسر |
| `UnifiedTradeSheet.tsx` | إضافة props + header | صغير (~30 سطر) | ⚠️ منخفض |
| `UnifiedAccountingSheet.tsx` | فلترة tabs + أزرار | متوسط (~60 سطر) | ⚠️ منخفض |
| `SalesInvoicesList.tsx` | تغيير مصدر + فلتر | متوسط (~80 سطر) | ⚠️ متوسط |
| `PurchaseInvoicesList.tsx` | تغيير مصدر + فلتر | متوسط (~80 سطر) | ⚠️ متوسط |

**المجموع: ~420 سطر تعديل — بدل إنشاء ملفات جديدة بالكامل**

---

## 🔄 Backward Compatibility (التوافق الخلفي)

```
كل التغييرات تعتمد على:
├── if (currentStage) → السلوك الجديد
└── else → السلوك القديم (بدون تغيير)

هذا يعني:
✅ الصفحات التي لم تُحدّث تعمل بالضبط كما كانت
✅ UnifiedAccountingSheet يعمل لكل الأنواع القديمة
✅ tradeConfigs القديمة لا تتأثر (الحقول الجديدة اختيارية)
```

---

## ⏱️ ترتيب التنفيذ

| # | المهمة | الملفات | الوقت |
|---|--------|---------|-------|
| 1 | توسيع types.ts | `types.ts` | 15 دقيقة |
| 2 | إضافة stage configs | `tradeConfigs.ts` | 45 دقيقة |
| 3 | تحديث UnifiedTradeSheet | `UnifiedTradeSheet.tsx` | 30 دقيقة |
| 4 | تحديث UnifiedAccountingSheet | `UnifiedAccountingSheet.tsx` | 45 دقيقة |
| 5 | تحديث SalesInvoicesList | `SalesInvoicesList.tsx` | 45 دقيقة |
| 6 | تحديث PurchaseInvoicesList | `PurchaseInvoicesList.tsx` | 45 دقيقة |
| 7 | اختبار + تنسيق | - | 30 دقيقة |

**المجموع: ~4 ساعات**

---

## ✅ الخلاصة

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  النهج: تحديث 6 ملفات موجودة + استخدام 6 مكونات جديدة  │
│                                                          │
│  ✅ لا ملفات جديدة كبيرة                                │
│  ✅ كل التغييرات backward compatible                     │
│  ✅ التبويبات تتغير ديناميكياً حسب المرحلة               │
│  ✅ الأزرار تتغير ديناميكياً حسب المرحلة                 │
│  ✅ الشيت الموحد يبقى واحد لكل الأنواع                  │
│  ✅ NexaDataTable + Kanban يبقيان كما هما                │
│                                                          │
│  الفرق:                                                  │
│  قبل: tabs ثابتة + أزرار ثابتة                          │
│  بعد: tabs ديناميكية + أزرار ديناميكية + timeline        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
