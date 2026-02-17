# 📋 خطة تطوير ورقة التجارة الموحدة V2 — النسخة النهائية
## Unified Trade Sheet V2 — Final Comprehensive Plan

> **التاريخ:** 2026-02-13 | **الإصدار:** 3.1 (محدّث — نظام استلام الأقمشة + صلاحيات)  
> **إجمالي المراحل:** 31 مرحلة | **مكتمل:** 21 ✅ | **متبقي:** 10 ⏳ | **الجهد المتبقي:** ~42-56 ساعة

---

## 📐 المراحل المجمّعة (16 مرحلة)

### الجولة 1 — البنية التحتية (Phases 1-4) ≈ 10-14h

| # | المرحلة | الجهد | الأولوية |
|---|---------|-------|----------|
| 1 | تحسين الهيدر + حقل مندوب المبيعات | 3-4h | 🔴 |
| 2 | التسعير الذكي + حد ائتمان العميل | 4-5h | 🔴 |
| 3 | العملة + سعر التصريف + عملة العميل الافتراضية | 3-4h | 🔴 |
| 4 | Validation الأسعار + تنبيه المخزون | 2-3h | 🔴 |

### الجولة 2 — التبويبات الجديدة (Phases 5-9) ≈ 18-25h

| # | المرحلة | الجهد | الأولوية |
|---|---------|-------|----------|
| 5 | ✅ متصفح المواد + تسعير الكميات | 6-8h | ✅ |
| 6 | سند القبض + شروط الدفع التلقائية | 4-5h | 🟡 |
| 7 | شحن العميل (بديل تبويب الكونتينرات) | 2-3h | 🟡 |
| 8 | القيد المحاسبي (read-only preview) | 2-3h | 🟡 |
| 9 | 🤖 تبويب NexaAgent — ذكاء العميل | 4-6h | 🟡 |

### الجولة 3 — التكامل النهائي (Phases 10-12) ≈ 5-8h

| # | المرحلة | الجهد | الأولوية |
|---|---------|-------|----------|
| 10 | تخصيص التبويبات حسب نوع المستند | 1-2h | 🟡 |
| 11 | نسخ المستند + سجل الأسعار التاريخي | 2-3h | 🟡 |
| 12 | المكون المشترك مبيعات/مشتريات | 2-3h | 🟡 |

---

## 🔷 المرحلة 1: تحسين الهيدر + مندوب المبيعات
**الملفات:** `UnifiedTradeSheet.tsx`, `UnifiedAccountingSheet.tsx`, `TradeHeader.tsx`

### 1A. ضغط الهيدر (من 3 أسطر إلى 1-2):
```
الحالي:    [نوع المستند ▼] | [flow] | [أزرار] | [badge]  ← 3 أسطر 
المطلوب:   [نوع ▼] [حالة] ─── spacer ─── [حفظ] [طباعة] [⋯]  ← سطر واحد
```

### 1B. حقل مندوب المبيعات في TradeHeader:
```tsx
// إضافة في TradeHeader.tsx — عمود خامس:
<Select value={data.salesperson_id} onValueChange={v => onChange('salesperson_id', v)}>
  {/* user_profiles WHERE role IN ('sales','admin') */}
</Select>
```

---

## 🔷 المرحلة 2: التسعير الذكي + حد الائتمان
**الملفات:** `hooks/useCustomerPricing.ts` (جديد), `CartItemsView.tsx`, `TradeMainTab.tsx`

### 2A. Price Resolution Cascade:
```
1️⃣ customer.price_list_id → price_list_items (أولوية قصوى)
2️⃣ customer_groups.price_list_id → price_list_items
3️⃣ price_lists.is_default = true → price_list_items
4️⃣ materials.selling_price (fallback)
→ ثم تطبيق: customer.discount_percent أو group.discount_percent
```

### 2B. Credit Limit Check:
```
عند اختيار العميل:
  balance >= credit_limit × 0.8  → ⚠️ تحذير أصفر
  balance >= credit_limit        → 🔴 منع (إلا admin)
  credit_limit = 0               → بدون حد (skip)
```

### الـ Hook:
```tsx
// hooks/useCustomerPricing.ts
export function useCustomerPricing(customerId: string) {
  // Returns: { priceListId, priceListName, discountPercent, creditStatus, defaultCurrency }
  // Fetches: customer → customer_group → price_lists → price_list_items
}

export function resolveItemPrice(productId: string, qty: number, priceListId?: string) {
  // Returns: { price, source: 'customer'|'group'|'default'|'base', listName }
}
```

---

## 🔷 المرحلة 3: العملة + سعر التصريف + عملة العميل
**الملفات:** `hooks/useCurrencyExchangeRate.ts` (جديد), `CartItemsView.tsx`, `TradeMainTab.tsx`

### 3A. عملة العميل الافتراضية:
```
عند اختيار عميل → customers.currency → تعيين عملة المستند تلقائياً
```

### 3B. جلب أسعار التصريف:
```tsx
// hooks/useCurrencyExchangeRate.ts
export function useCurrencyExchangeRate(from: string, to: string, companyId: string) {
  // Queries: exchange_rates WHERE from_currency=from AND to_currency=to
  // Returns: { rate, effectiveDate, source }
}
```

### 3C. عرض المعادل:
```
في CartItemsView: "10.00 USD ↔ 415.00 UAH (rate: 41.5)"
```

---

## 🔷 المرحلة 4: Validation الأسعار + تنبيه المخزون
**الملفات:** `utils/tradeValidation.ts` (جديد), `CartItemsView.tsx`, `SalesCycleList.tsx`

### 4A. Price Validation:
```
أي مادة بسعر = 0 → حفظ كمسودة فقط + toast تحذيري
أسطر بدون سعر → خلفية أحمر خفيف
```

### 4B. Stock Alert:
```
كمية مطلوبة > متاح في المستودع → ⚠️ badge تحذيري
خيارات: [تقليل] [مستودع آخر] [متابعة كحجز]
```

---

## 🔷 المرحلة 5: متصفح المواد + تسعير الكميات
**الملفات:** `tabs/MaterialBrowserTab.tsx` (جديد)

### 5A. واجهة المتصفح:
```
[فلاتر: مستودع|مدينة|مجموعة|لون|كود] ← يسار
[بطاقات المواد + مخزون + سعر + زر إضافة] ← يمين
[ملخص السلة الحالية] ← أسفل
```

### 5B. Quantity Breaks:
```
price_list_items.min_quantity → تلقائياً:
  qty 1-49 → 10 USD    |    qty 50-99 → 9 USD    |    qty 100+ → 8 USD
يعرض: "📊 سعر الكمية" badge
```

---

## 🔷 المرحلة 6: سند القبض + شروط الدفع
**الملفات:** `tabs/PaymentReceiptTab.tsx` (جديد)

```
reservation → تبويب "العربون" (مبلغ + طريقة دفع + صندوق)
order/invoice → تبويب "سند قبض" (دفعة + صندوق موظف + حالة سداد)
+ تاريخ الاستحقاق = تاريخ الفاتورة + payment_terms_days
```

---

## 🔷 المرحلة 7: شحن العميل
**الملفات:** `tabs/CustomerShippingTab.tsx` (جديد)

```
جلب عناوين من customer_addresses → اختيار عنوان → طريقة توصيل
افتراضي: is_default=true أو الأحدث
```

---

## 🔷 المرحلة 8: القيد المحاسبي
**الملفات:** `tabs/InvoiceJournalTab.tsx` (جديد)

```
Read-only preview: حساب | مدين | دائن | بيان
فاتورة بيع → ذمم مدينة (مدين) ↔ إيرادات (دائن)
```

---

## 🔷 المرحلة 9: 🤖 تبويب NexaAgent — ذكاء العميل
**الملفات:** `tabs/NexaAgentTab.tsx` (جديد), `hooks/useNexaAgentInsights.ts` (جديد)  
**الأولوية:** متوسطة-عالية — ميزة تنافسية فريدة

### المفهوم:
تبويب ذكاء اصطناعي يظهر عند اختيار عميل مسجّل. يعرض تحليلات وتوصيات مبنية على:
- تاريخ فواتير العميل السابقة
- محادثاته الصوتية أو الكتابية مع فريق المبيعات
- أنماط الشراء والتفضيلات

### الواجهة:
```
┌────────────────────────────────────────────────────────────┐
│ 🤖 NexaAgent — تحليلات العميل: شركة أوديسا للنسيج         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📊 ملخص الذكاء الاصطناعي                                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ هذا العميل يفضل الأقمشة القطنية بألوان داكنة.        │ │
│ │ متوسط طلبه الشهري: 150-200 متر.                      │ │
│ │ آخر شكوى: تأخر تسليم في يناير — يُنصح بأولوية شحن.  │ │
│ │ فرصة بيع: اقترح عليه القماش الجديد "تويل مخلوط"     │ │
│ │ بناءً على طلبه في محادثة 3 فبراير.                    │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ 📦 توصيات المواد                [بناءً على 23 فاتورة سابقة]│
│ ┌──────────┬──────┬──────────┬─────────┐                  │
│ │ المادة   │ مرات │ آخر سعر  │ إجراء   │                  │
│ ├──────────┼──────┼──────────┼─────────┤                  │
│ │ حموي ملون│  12  │ 8.50 USD │ [+سلة]  │                  │
│ │ قطن تويل │   8  │ 9.00 USD │ [+سلة]  │                  │
│ │ بوليستر  │   3  │ 6.00 USD │ [+سلة]  │                  │
│ └──────────┴──────┴──────────┴─────────┘                  │
│                                                            │
│ 💬 ملخص آخر المحادثات                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📞 3 فبراير — "يسأل عن أقمشة للصيف، يريد ألوان فاتحة │ │
│ │    وسعر أقل من 8 دولار للمتر"                         │ │
│ │ 💬 28 يناير — "يشكو من تأخر الشحنة الأخيرة 3 أيام"   │ │
│ │ 📞 15 يناير — "يريد عينات من القماش الجديد الهندي"     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ 📈 نمط الشراء                                             │
│ [رسم بياني: أشهر × كميات — يظهر الموسمية]                 │
│                                                            │
│ 🎯 درجة العميل: ⭐⭐⭐⭐ (VIP — 23 فاتورة، 45,000 USD)     │
│                                                            │
│ ┌──────────────────────────────────────────────┐           │
│ │ 💡 اسأل NexaAgent...                        │           │
│ │ [ما أفضل سعر لهذا العميل؟____________] [➤]  │           │
│ └──────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘
```

### البنية التقنية:
```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ NexaAgentTab │───▶│ useNexaAgent     │───▶│ Supabase Tables │
│  (UI)       │    │  Insights Hook   │    │ + Edge Function │
└─────────────┘    └──────────────────┘    └─────────────────┘
                          │                        │
                          ▼                        ▼
                   ┌──────────────┐    ┌────────────────────┐
                   │ AI Provider  │    │ sales_invoices     │
                   │ (OpenAI/     │    │ customer_notes     │
                   │  Gemini/     │    │ customer_calls     │
                   │  Local LLM)  │    │ chat_messages      │
                   └──────────────┘    └────────────────────┘
```

### مصادر البيانات:
| المصدر | الجدول | البيانات المستخرجة |
|--------|--------|-------------------|
| فواتير سابقة | `sales_invoices` + items JSON | المواد المفضلة، الكميات، الأسعار، التكرار |
| المحادثات الكتابية | `customer_messages` (جديد أو CRM) | طلبات، شكاوى، استفسارات |
| المكالمات الصوتية | `customer_calls` (جديد) | ملخص AI من تسجيل/نص المكالمة |
| ملاحظات المندوب | `customer_notes` (جديد) | ملاحظات يدوية من فريق المبيعات |

### الـ Hook:
```tsx
// hooks/useNexaAgentInsights.ts
interface NexaInsights {
  summary: string;              // ملخص AI للعميل
  recommendedProducts: Array<{
    productId: string;
    name: string;
    frequency: number;          // عدد مرات الشراء
    lastPrice: number;
    suggestedPrice: number;     // AI-suggested based on history
  }>;
  recentConversations: Array<{
    date: string;
    type: 'call' | 'chat' | 'note';
    summary: string;            // AI-generated summary
  }>;
  purchasePattern: {
    avgMonthlyQty: number;
    preferredCategories: string[];
    seasonality: Record<string, number>;  // month → qty
  };
  customerScore: {
    tier: 'VIP' | 'regular' | 'new' | 'inactive';
    totalInvoices: number;
    totalSpent: number;
    lastOrderDate: string;
  };
  opportunities: string[];     // AI-generated sales opportunities
}

export function useNexaAgentInsights(customerId: string): {
  insights: NexaInsights | null;
  loading: boolean;
  askAgent: (question: string) => Promise<string>;
}
```

### جداول جديدة مطلوبة:
```sql
-- ملاحظات المندوب على العميل
CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    user_id UUID NOT NULL,       -- المندوب
    note TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general', -- general/complaint/opportunity
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل المكالمات (اختياري — للتكامل مع VoIP)
CREATE TABLE IF NOT EXISTS customer_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    user_id UUID NOT NULL,
    call_type VARCHAR(10) DEFAULT 'outbound', -- inbound/outbound
    duration_seconds INT,
    ai_summary TEXT,             -- ملخص AI للمكالمة
    transcript TEXT,             -- نص المكالمة (اختياري)
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- كاش تحليلات NexaAgent
CREATE TABLE IF NOT EXISTS nexa_agent_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    insights_json JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    tenant_id UUID NOT NULL,
    UNIQUE(customer_id, tenant_id)
);
```

---

## 🔷 المرحلة 10: تخصيص التبويبات حسب نوع المستند
**الملف:** `tradeConfigs.ts`

```
عرض سعر:    [أصناف] [متصفح مواد] [🤖 NexaAgent] [مرفقات] [نشاط]
حجز:        [أصناف] [متصفح] [عربون] [🤖 NexaAgent] [مرفقات] [نشاط]
أمر بيع:    [أصناف] [متصفح] [سند قبض] [شحن] [🤖 NexaAgent] [مرفقات] [نشاط]
فاتورة:     [أصناف] [متصفح] [سند قبض] [قيد] [شحن] [🤖 NexaAgent] [مرفقات] [نشاط]
تسليم:      [أصناف] [قيد] [شحن] [مرفقات] [نشاط]
مرتجع:      [أصناف] [قيد] [مرفقات] [نشاط]
```

---

## ✅ المرحلة 11: نسخ المستند + سجل الأسعار (مُكتملة 2026-02-11)

### ما تم تنفيذه:

#### 1. نسخ المستند (Document Duplication)
- زر "تكرار" في القائمة المنسدلة (⋮) يعمل الآن تلقائياً للمستندات التجارية
- ينسخ: العميل + المواد + الأسعار + العملة + المستودع
- يُعيد تعيين: الرقم + التاريخ + الحالة + التأكيد
- يُحوّل الشيت لوضع `create` مباشرة
- رسالة نجاح: "📋 تم نسخ المستند — عدّل ثم احفظ"

#### 2. سجل الأسعار (Price History Popover)
- مكون جديد: `PriceHistoryPopover.tsx`
- أيقونة 📜 بجانب كل سعر وحدة في `CartItemsView`
- يبحث في 3 جداول: `sales_orders`, `sales_invoices`, `quotations`
- يفلتر حسب العميل المحدد
- يعرض آخر 5 أسعار مع:
  - تاريخ المستند
  - نوع المستند (أمر بيع / فاتورة / عرض سعر)
  - رقم المستند
  - نسبة الفرق عن السعر الحالي (↑↓)
- الضغط على أي سعر يُطبقه مباشرة على السطر

#### 3. إصلاح زر التأكيد
- بعد حفظ فاتورة جديدة، الشيت يبقى مفتوحاً في وضع `view`
- يظهر زر "تأكيد وإرسال" فوراً بدل إغلاق الشيت

#### ملفات جديدة:
| الملف | الوصف |
|-------|-------|
| `src/features/trade/components/PriceHistoryPopover.tsx` | نافذة سجل الأسعار |

#### ملفات معدّلة:
| الملف | التعديل |
|-------|---------|
| `UnifiedAccountingSheet.tsx` | Built-in duplicate + بقاء الشيت مفتوح بعد حفظ trade docs |
| `CartItemsView.tsx` | إضافة `customerId` prop + دمج `PriceHistoryPopover` |
| `TradeMainTab.tsx` | تمرير `customerId` لـ CartItemsView |

---

## 🔷 المرحلة 12A: التبويبات الذكية حسب نوع المستند + الوضع (مبيعات/مشتريات) 🔴 عاجل
**الحالة:** 🔴 يحتاج إصلاح — التبويبات لا تعمل بشكل صحيح

### المشكلة:
حالياً `tradeConfigs.ts` يحدد التبويبات لكل نوع مستند (order, invoice, quotation...)، لكن:
1. **لا يوجد تمييز مبيعات/مشتريات** — نفس التبويبات تظهر لأمر البيع وأمر الشراء
2. `UnifiedTradeSheet` يمرر `mode="purchase"` لكن لا يتم استخدامه في `tradeConfigs`
3. بعض التبويبات تظهر فارغة لأن المكونات لا تستلم البيانات الصحيحة

### الحل:
```
══ مبيعات ═══════════════════════════════════════════
عرض سعر:    [الأصناف] [متصفح المواد] [مرفقات] [نشاط]
حجز بضاعة:  [الأصناف] [متصفح المواد] [مرفقات] [نشاط]
أمر بيع:    [الأصناف] [متصفح المواد] [سداد] [شحن العميل] [NexaAgent] [مرفقات] [نشاط]
فاتورة بيع: [الأصناف] [متصفح المواد] [سداد] [شحن العميل] [NexaAgent] [مرفقات] [نشاط]
إذن تسليم:  [الأصناف] [شحن العميل] [مرفقات] [نشاط]
مرتجع بيع:  [الأصناف] [سداد] [مرفقات] [نشاط]

══ مشتريات ══════════════════════════════════════════
طلب شراء:    [الأصناف] [متصفح المواد] [مرفقات] [نشاط]
عرض سعر:     [الأصناف] [متصفح المواد] [المورد] [مرفقات] [نشاط]
أمر شراء:    [الأصناف] [متصفح المواد] [المورد] [الشحن] [مرفقات] [نشاط]
فاتورة شراء: [الأصناف] [متصفح المواد] [المورد] [المصاريف] [مرفقات] [نشاط]
استلام بضاعة: [الأصناف] [المستودع] [مرفقات] [نشاط]
مرتجع شراء:  [الأصناف] [المورد] [مرفقات] [نشاط]
حاوية:       [المحتويات] [الشحن البحري] [المصاريف] [مرفقات] [نشاط]
```

### كيف:
1. تقسيم `tradeConfigs.ts` → تبويبات منفصلة لكل وضع (sales/purchase)
2. إضافة `tradeMode` prop لـ `UnifiedAccountingSheet` 
3. `tradeConfigs` يستقبل `mode` ويُرجع تبويبات مختلفة
4. `TradeMainTab` يكتشف الوضع ويُغيّر: عميل ↔ مورد، مستودع الشحن ↔ مستودع الاستلام

---

## 🔷 المرحلة 12B: تخصيص فاتورة المشتريات 🔴 عاجل
**الحالة:** 🔴 يحتاج تعديل — المواد تعمل بمنطق الرولونات

### المشكلة الحالية:
- عند تحديد المادة في فواتير المشتريات، النظام يطلب تحديد رولونات (rolls)
- **المطلوب:** اختيار المادة مباشرة من جدول المواد + إمكانية إضافة مواد حرة (غير مسجلة)
- فاتورة المشتريات تحتاج حقول مختلفة عن المبيعات

### التعديلات المطلوبة:
```
══ فاتورة المشتريات — الحقول المخصصة ════════════════
📦 قسم الأصناف:
  • اختيار المادة: من جدول materials (اسم + كود + مجموعة)
  • ❌ بدون رولونات — لا يتم عرض اختيار الرول
  • ✅ إضافة مادة حرة (اسم يدوي + سعر + كمية)
  • حقول السطر: المادة | الوصف | الكمية | الوحدة | السعر | الإجمالي
  • إمكانية نسخ أصناف من أمر الشراء المرتبط

💰 قسم المصاريف الإضافية:
  • مصاريف شحن
  • مصاريف جمركية
  • تأمين
  • مصاريف أخرى → تُضاف للتكلفة

📋 قسم المورد:
  • اسم المورد + رقم فاتورة المورد الأصلية
  • تاريخ فاتورة المورد
  • شروط الدفع

📄 قسم القيد المحاسبي (تلقائي):
  • مدين: حساب المشتريات / المخزون
  • دائن: حساب الموردين (ذمم دائنة)
```

### الملفات المتأثرة:
| الملف | التعديل |
|-------|---------|
| `CartItemsView.tsx` | إضافة `purchaseMode` — بدون رولونات + إضافة حرة |
| `TradeMainTab.tsx` | كشف mode وتمرير `purchaseMode` |
| `tradeConfigs.ts` | تبويبات مخصصة لفاتورة المشتريات |
| جديد: `PurchaseExpensesTab.tsx` | تبويب المصاريف الإضافية |
| جديد: `SupplierInfoTab.tsx` | تبويب معلومات المورد |

---

## 🔷 المرحلة 12 (الأصلية) — شرح: المكون المشترك مبيعات/مشتريات

### ❓ ماذا كان المقصود؟

المقصود هو أن `UnifiedTradeSheet` يعمل كمكون **واحد** لكل من المبيعات والمشتريات:

```tsx
// في صفحة المبيعات:
<UnifiedTradeSheet mode="sales" type="invoice" />

// في صفحة المشتريات (نفس المكون!):
<UnifiedTradeSheet mode="purchase" type="invoice" />
```

**الفكرة:** بدلاً من إنشاء شيت منفصل للمبيعات وشيت آخر للمشتريات:
- مكون واحد `UnifiedTradeSheet` يدعم الاتجاهين
- التبويبات تتغير ذكياً حسب `mode`
- الحقول تتغير: "عميل" ↔ "مورد"، "فاتورة بيع" ↔ "فاتورة شراء"
- **هذا موجود جزئياً** — `PurchaseCycleList` يستخدم `<UnifiedTradeSheet mode="purchase">`
- **ما ينقص:** التبويبات لا تتغير حسب المود + فاتورة المشتريات تحتاج حقول مختلفة

**⬆️ لذلك تم تقسيمها إلى 12A + 12B أعلاه**

---

## 🔷 المرحلة 13: دورة المشتريات الكاملة
**الأولوية:** 🟡 بعد 12A+12B

### المهام:
```
1. طلب شراء → عرض سعر مورد → أمر شراء → فاتورة شراء → استلام بضاعة
2. تحويل تلقائي بين المراحل (مثل دورة المبيعات)
3. ربط فاتورة الشراء بأمر الشراء (source_document_id)
4. تقرير مطابقة 3-Way: أمر شراء ↔ فاتورة ↔ استلام
5. تنبيه فروق الأسعار/الكميات بين الأمر والفاتورة
6. حساب تكلفة البضاعة الواردة (Landed Cost):
   • سعر المادة + نسبة المصاريف الإضافية
   • تحديث سعر التكلفة في جدول materials
```

---

## 🔷 المرحلة 14: تحسينات الفواتير العامة (مبيعات + مشتريات)
**الأولوية:** 🟡

### المهام:
```
1. طباعة PDF مهنية (A4) — تصميم يدعم عربي/إنجليزي
2. تصدير Excel/CSV
3. تحويل أمر بيع → فاتورة مباشرة (زر واحد)
4. إشعارات مدين/دائن
5. القيد المحاسبي التلقائي عند تأكيد الفاتورة:
   • مبيعات: مدين ذمم مدينة ← دائن إيرادات
   • مشتريات: مدين مشتريات ← دائن ذمم دائنة
6. تقسيط الفاتورة + جدول سداد
```

---

## 🔷 المرحلة 15: التقارير والتحليلات
**الأولوية:** 🟢

### المهام:
```
1. تقرير المبيعات حسب العميل / الفترة / المادة
2. تقرير المشتريات حسب المورد / الفترة / المادة  
3. تقرير أعمار الديون (مبيعات)
4. تقرير أعمار الذمم الدائنة (مشتريات)
5. تقرير الربحية حسب المادة
6. لوحة تحكم مبيعات + مشتريات مدمجة
```

---

## � المرحلة 12C: تبويب المرفقات — ملفات PDF فعلية
**الأولوية:** 🔴 تنفذ ضمن مرحلة 12

### المتطلبات:
```
📎 قيود الملفات:
  • الحد الأقصى لحجم الملف الواحد: 3 ميغابايت
  • الحد الأقصى الإجمالي لجميع المرفقات: 20 ميغابايت
  • الأنواع المسموحة: PDF فقط

📋 أنواع المرفقات:
  • عقود (Contracts)
  • تواقيع (Signatures)
  • فواتير أصلية (Original Invoices)
  • بواليص شحن (Bills of Lading)
  • شهادات منشأ (Certificates of Origin)
  • إيصالات (Receipts)
  • مستندات أخرى

🎯 الوظائف:
  • رفع PDF عبر سحب وإفلات (drag & drop)
  • عرض قائمة المرفقات مع: اسم الملف + الحجم + التاريخ + النوع
  • تحميل / حذف المرفق
  • عرض معاينة PDF داخل التطبيق (إن أمكن)
  • عداد المرفقات في badge التبويب

💾 التخزين:
  • Supabase Storage: bucket `document-attachments`
  • المسار: {tenant_id}/{doc_type}/{doc_id}/{filename}
  • RLS على مستوى bucket
```

---

## �📊 ملخص الملفات (مُحدّث)

### ملفات جديدة (16):
| # | الملف | الوصف |
|---|-------|-------|
| 1 | `hooks/useCustomerPricing.ts` | ✅ التسعير الذكي + حد الائتمان |
| 2 | `hooks/useCurrencyExchangeRate.ts` | ✅ أسعار التصريف |
| 3 | `hooks/useNexaAgentInsights.ts` | تحليلات AI للعميل |
| 4 | `utils/tradeValidation.ts` | ✅ validation الأسعار + المخزون |
| 5 | `tabs/MaterialBrowserTab.tsx` | ✅ متصفح المواد |
| 6 | `tabs/PaymentReceiptTab.tsx` | سند القبض / العربون |
| 7 | `tabs/CustomerShippingTab.tsx` | شحن العميل |
| 8 | `tabs/InvoiceJournalTab.tsx` | القيد المحاسبي |
| 9 | `tabs/NexaAgentTab.tsx` | تبويب الذكاء الاصطناعي |
| 10 | `tabs/PriceHistoryPopover.tsx` | ✅ سجل الأسعار |
| 11 | `tabs/PurchaseExpensesTab.tsx` | 🆕 مصاريف فاتورة المشتريات |
| 12 | `tabs/SupplierInfoTab.tsx` | 🆕 معلومات المورد |
| 13 | SQL: `customer_notes` | ملاحظات المندوب |
| 14 | SQL: `customer_calls` + `nexa_agent_cache` | مكالمات + كاش AI |
| 15 | SQL: purchase expenses migration | 🆕 هيكل مصاريف المشتريات |
| 16 | `utils/purchaseInvoiceUtils.ts` | 🆕 أدوات فاتورة المشتريات |

### ملفات معدّلة (9):
| # | الملف | التعديل |
|---|-------|---------|
| 1 | `UnifiedTradeSheet.tsx` | ✅ ضغط الهيدر + تمرير tradeMode |
| 2 | `UnifiedAccountingSheet.tsx` | ✅ ربط التبويبات + resolvedCompanyId |
| 3 | `TradeHeader.tsx` | ✅ مندوب مبيعات + عملة + وضع مشتريات |
| 4 | `CartItemsView.tsx` | ✅ pricing badge + 🆕 purchaseMode |
| 5 | `TradeMainTab.tsx` | ✅ customer pricing + 🆕 كشف الوضع |
| 6 | `SalesCycleList.tsx` | ✅ validation + document copy |
| 7 | `tradeConfigs.ts` | 🆕 تبويبات ذكية حسب mode + docType |
| 8 | `PurchaseCycleList.tsx` | 🆕 ربط التبويبات الجديدة |
| 9 | `ActivityTab.tsx` | ✅ بيانات فعلية من audit_logs |

---

## 🚀 ترتيب التنفيذ المُحدّث

```
═══════════════════════════════════════════════════════════
        خريطة التقدم — Unified Trade Sheet V2.6
              آخر تحديث: 2026-02-13
═══════════════════════════════════════════════════════════

══ الجولة 1: البنية التحتية ═══════════════════════════
 ① المرحلة 1: ضغط الهيدر + مندوب المبيعات        [3-4h] ✅
 ② المرحلة 2: التسعير الذكي + حد الائتمان         [4-5h] ✅
 ③ المرحلة 3: العملة + التصريف + عملة العميل       [3-4h] ✅
 ④ المرحلة 4: Validation + تنبيه المخزون           [2-3h] ✅

══ الجولة 2: التبويبات الجديدة ═════════════════════════
 ⑤ المرحلة 5: متصفح المواد + تسعير الكميات        [6-8h] ✅
 ⑥ المرحلة 6: سند القبض + شروط الدفع             [4-5h] ✅ (PaymentReceiptTab)
 ⑦ المرحلة 7: شحن العميل                          [2-3h] ✅ (CustomerShippingTab)
 ⑧ المرحلة 8: القيد المحاسبي                      [2-3h] ✅ (ضمن PaymentReceiptTab)
 ⑨ المرحلة 9: 🤖 NexaAgent — ذكاء العميل          [4-6h] 🟢 مؤجلة

══ الجولة 3: التكامل + المبيعات ════════════════════════
 ⑩ المرحلة 10: تخصيص configs                      [1-2h] ✅
 ⑪ المرحلة 11: نسخ المستند + سجل الأسعار          [2-3h] ✅
 ⑫ المرحلة 11.5: إصلاح companyId + سجل نشاط فعلي  [1h]  ✅

══ الجولة 4: التبويبات الذكية + المشتريات ══════════════
 ⑬ المرحلة 12A: التبويبات الذكية (mode-aware)      [3-4h] ✅ 2026-02-11
 ⑭ المرحلة 12B: تخصيص فاتورة المشتريات            [4-5h] ✅ 2026-02-11
 ⑮ المرحلة 12C: تبويب المرفقات PDF                 [3-4h] ✅ 2026-02-11
 ⑯ المرحلة 12D: حفظ التجارة المدمج + Migration     [2-3h] ✅ 2026-02-11

══ الجولة 5: دورة الكونتينر الكاملة ═══════════════════
 ⑰ المرحلة 13A: تبويب الدفعات+المصاريف الموحّد     [4-5h] ✅ 2026-02-11
 ⑱ المرحلة 13B-1: Migration + ربط الفواتير بالبنود  [1h]   ✅ 2026-02-11
 ⑲ المرحلة 13B-2: بنود الكونتينر (3 أنماط + فلاتر) [3-4h] ✅ 2026-02-11
 ⑳ المرحلة 13B-3: سلة حجوزات الترانزيت            [3-4h] ✅ 2026-02-11

══ الجولة 5.5: المشتريات المحلية والاستلام ═══════════ ← أنت هنا
 ㉑ المرحلة 13E-1: نوع الشراء محلي/دولي + Tooltips   [2h]  ✅ 2026-02-12
    • عمود receipt_mode (direct|international)
    • Toggle في TradeHeader (أخضر=محلي، أزرق=دولي)
    • تبديل العملة تلقائي (محلي→عملة الشركة، دولي→USD)
    • حفظ المستودع في فواتير المشتريات
    • وضع المعاينة (readonly) لجميع حقول الهيدر
    • Tooltips مساعدة (?) ثنائية اللغة
    • عرض "بانتظار الاستلام" في تبويب استلام البضائع

 ㉒ المرحلة 13E-2: إذن استلام الأقمشة (Fabric GRN)   [6-8h] 🟡 جزئي
    ✅ تم:
    • شاشة استلام مخصصة للأقمشة (MaterialReceiptDialog → GoodsReceiptItemsTab)
    • إدخال رولونات (رقم، طول، لون، جودة A/B/C/damaged)
    • تصفية المواد حسب الفاتورة المحددة (لا تعرض كل المواد)
    • قفل الفاتورة بعد بدء الإدخال (🔒 + tooltip)
    • حفظ محلي (localStorage) + مزامنة خلفية مع Supabase
    • إنشاء fabric_rolls تلقائياً عند تأكيد الاستلام
    🔴 أخطاء مكتشفة (2026-02-13):
    • ❌ بنود الفاتورة: الكميات لا تتحدث (المستلم والفرق = 0 دائماً)
      → السبب: المطابقة بـ sourceItemId فقط — أُصلح بإضافة materialId fallback
    • ❌ لا يتم إنشاء سجل purchase_receipt في قاعدة البيانات
    • ❌ حالة الفاتورة/الأمر لا تتغير إلى "مستلم" بعد الاستلام
    • ❌ لا تظهر حركة مخزون في صفحة stock_movements
    • ❌ الفاتورة تبقى في أوامر الشراء بدل الانتقال لاستلام البضائع

 ㉒B المرحلة 13E-2B: تكامل دورة الاستلام (Workflow)  [4-5h] 🔴 القادم
    • إنشاء purchase_receipt + purchase_receipt_items عند الحفظ
    • تحديث حالة المستند المصدر (PO/Invoice) → 'received'
    • إنشاء حركة مخزون (stock movement) في صفحة حركات المخزون
    • إنشاء القيد المحاسبي:
      - أمر شراء: مدين مخزون ← دائن بضاعة مستلمة غير مفوترة
      - فاتورة شراء: مدين مخزون ← دائن الموردين
      - فروقات الكميات: إنشاء قيد تعديل (زيادة/نقص + السبب)
    • إخفاء الفاتورة من "أوامر الشراء" وعرضها في "استلام بضائع"
    • ملف جديد: receiptCompletionService.ts
    
 ㉒C المرحلة 13E-2C: سياسات فروقات الاستلام (Policy) [2-3h] 🆕
    • إضافة إعدادات "سياسة الاستلام" (Receipt Policy) في إعدادات الشركة:
      1. Bill Based on Receipt: تحديث الفاتورة لتطابق المستلم (الافتراضي للأقمشة)
      2. Moving Avg Cost: الفاتورة ثابتة + تحديث متوسط التكلفة (زيادة مجانية)
      3. Variance Account: الفاتورة ثابتة + ترحيل الفرق لحساب فروقات
    • واجهة اختيار السياسة عند وجود فرق في الاستلام
    • تحديث `receiptCompletionService` لدعم السياسات الثلاث

 ㉓ المرحلة 13E-3: صلاحيات الاستلام (Receipt RBAC)   [3-4h] 🔴 القادم
    • مستخدم عادي: معاينة فقط
    • أمين مستودع: استلام (مستودعه فقط — RLS)
    • مدير: استلام (كل المستودعات)
    • إخفاء زر الاستلام للمستخدمين بدون صلاحية
    • إشعارات لأمين المستودع عند تأكيد فاتورة محلية

══ الجولة 6: الكونتينر + المحاسبة ══════════════════════
 ㉔ المرحلة 13B-4: RBAC — صلاحيات الأسعار          [2-3h] 🟠
 ㉕ المرحلة 13C: مصاريف الكونتينر (متوقع+فعلي)     [4-5h] 🟠
 ㉖ المرحلة 13D: توزيع المصاريف (Landed Cost UI)   [3-4h] 🟠
 ㉗ المرحلة 13E-4: استلام الكونتينر الدولي          [3-4h] 🟠
    • ربط الفواتير الدولية بالكونتينرات
    • إنشاء إذن استلام جماعي عند وصول الكونتينر
    • نفس شاشة استلام الأقمشة (رولونات)
 ㉘ المرحلة 13F: القيود المحاسبية للكونتينر         [3-4h] 🟠

══ الجولة 7: التحسينات والتقارير ══════════════════════
 ㉙ المرحلة 14: تحسينات عامة (UX + أداء)           [4-5h] 🟡
 ㉚ المرحلة 15: تقارير المبيعات والمشتريات          [6-8h] 🟢
 ㉛ المرحلة 16: NexaAgent — ذكاء العميل والمورد    [4-6h] 🟢

═══════════════════════════════════════════════════════════
 الإجمالي:  ✅ مكتمل: 21 مرحلة | ⏳ متبقي: 11 مرحلة
 الوقت المتبقي التقديري: ~46-62 ساعة عمل
═══════════════════════════════════════════════════════════
```

---

## ✅ ما تم إنجازه (جلسة 11-فبراير-2026):
- ✅ ملاحظات القيد (Document Notes)
- ✅ عملة المادة وسعر التصريف لكل سطر (UI)
- ✅ حفظ currency + exchange_rate في JSON
- ✅ تحويل نوع المستند مع tenant_id + created_by + numCol
- ✅ الترجمات
- ✅ **المرحلة 0 — الترحيل المحاسبي (فواتير البيع/الشراء):**
  - ترحيل تلقائي للفواتير عند التأكيد
  - إلغاء ترحيل ذكي (حذف مسودة / إلغاء مرحل)
  - دعم الضرائب في القيود (VAT Input/Output)
  - معالجة تعارض التريغرات القديمة
- 🆕 **مهمة قادمة: إعدادات الضرائب المركزية:**
  - لوحة تحكم موحدة لنسب الضرائب (مبيعات/مشتريات/خدمات)
  - ربط مرن مع شجرة الحسابات (حسابات متعددة أو موحدة)
  - دعم الضرائب المركبة أو الصفرية
- ✅ **المرحلة 1 — ضغط الهيدر:**
  - TypeSelector مضغوط (py-3→py-1.5, مع إخفاء flow في create mode)
  - الهيدر الرئيسي مضغوط (icon 48→36px, fontSize reduced, padding compressed)
  - حالة "saved" مضافة إلى badges الحالة
  - حقل مندوب المبيعات في TradeHeader (5 أعمدة في وضع المبيعات)
  - جلب المندوبين من user_profiles ديناميكياً
- ✅ **المرحلة 2 — التسعير الذكي:**
  - `useCustomerPricing.ts` — hook كامل لنظام Cascade:
    - عميل مباشر → مجموعة عميل → قائمة افتراضية → سعر المادة
    - تحليل خصومات (عميل → مجموعة)
    - حد ائتمان + رصيد متاح + تنبيه تجاوز
    - شروط دفع + تاريخ استحقاق تلقائي
    - عملة العميل تلقائية
    - دعم Quantity Breaks (min_quantity)
  - شريط معلومات customer pricing bar في TradeMainTab:
    - Badge قائمة الأسعار مع مصدرها
    - Badge الخصم مع نسبته
    - Badge حد الائتمان مع التفاصيل (hover tooltip)
    - Badge شروط الدفع
    - تحذير تجاوز حد الائتمان باللون الأحمر
    - اسم مجموعة العميل
  - ملء تلقائي للعملة وتاريخ الاستحقاق عند اختيار العميل
- ✅ **المرحلة 3 — العملة + سعر الصرف + Validation:**
  - صف ثانٍ في TradeHeader: عملة المستند + سعر الصرف + تاريخ الاستحقاق
  - Currency Select مع أعلام + أسماء + رموز (CURRENCY_META)
  - سعر الصرف تلقائي عبر `useExchangeRateLookup` عند تغيير العملة
  - حقل سعر الصرف disabled عندما العملة = عملة الشركة الأساسية
  - تاريخ الاستحقاق مع نص "تحدد تلقائياً..." كـ placeholder
  - `validateTradeDocument.ts` — validation كامل:
    - أخطاء: عميل/مورد + تاريخ + أصناف (submit) + كمية + سعر + سعر صرف
    - تنبيهات: حد ائتمان + مستودع + أصناف بسعر صفر + تاريخ استحقاق في الماضي
    - رسائل ثنائية اللغة + ملخص للـ toast
- ✅ **المرحلة 4 — التكامل مع الحفظ + DB Migration:**
  - **Migration نُفّذ بنجاح** (`20260211_add_salesperson_trade_fields.sql`) — 2026-02-11:
    - `salesperson_id UUID` → quotations, sales_orders, sales_invoices, sales_returns, sales_deliveries
    - `due_date DATE` + `payment_terms_days INT` → quotations
    - `exchange_rate DECIMAL(18,8)` → sales_returns, sales_deliveries
    - `currency VARCHAR(3)` → sales_deliveries
    - `discount_percent DECIMAL(5,2)` → quotations, sales_orders, sales_invoices
    - `price_list_id UUID` → quotations, sales_orders, sales_invoices
    - 5 Indexes: `idx_*_salesperson`
    - `NOTIFY pgrst, 'reload schema'` — PostgREST cache refreshed
    - تقرير التحقق: 11/11 أعمدة ✅
  - **Validation مدمج مع الحفظ** (`SalesCycleList.tsx`):
    - استدعاء `validateTradeDocument()` قبل الحفظ
    - أخطاء → `toast.error` + إيقاف الحفظ
    - تنبيهات → `toast.warning` (لا تمنع الحفظ)
  - **حفظ الحقول الجديدة** في `handleDocumentSave`:
    - `salesperson_id` + `due_date` + `exchange_rate`
    - `payment_terms_days` + `discount_percent` + `price_list_id`
  - **تمرير metadata التسعير** من `TradeMainTab` إلى `data`:
    - `_creditLimit`, `_balance`, `_isCreditExceeded`
    - `payment_terms_days`, `discount_percent`, `price_list_id`
  - **ربط Smart Pricing مع CartItemsView**:
    - `priceResolver` prop جديد → يطبق سعر قائمة الأسعار تلقائياً عند تغيير الكمية
    - يميّز بين `price_list` و `base_price` — لا يستبدل السعر اليدوي

---

## 📁 سجل الملفات — Phases 1→4

### ملفات جديدة:
| الملف | الغرض |
|-------|-------|
| `src/hooks/useCustomerPricing.ts` | Smart Pricing Hook — cascade logic |
| `src/features/trade/utils/validateTradeDocument.ts` | Validation engine — 10 rules |
| `supabase/migrations/20260211_add_salesperson_trade_fields.sql` | DB migration — 11 columns + 5 indexes |

### ملفات معدلة:
| الملف | التعديلات |
|-------|----------|
| `src/features/trade/components/forms/TradeHeader.tsx` | صف ثانٍ (Currency + Exchange Rate + Due Date) + مندوب |
| `src/features/accounting/components/unified/tabs/TradeMainTab.tsx` | Customer Pricing Bar + auto-fill + metadata sync + priceResolver |
| `src/features/trade/components/grids/CartItemsView.tsx` | `priceResolver` prop + smart qty pricing |
| `src/features/sales/pages/SalesCycleList.tsx` | Validation integration + 6 new fields in save payload |

### أعمدة DB الجديدة:
| الجدول | الأعمدة المضافة |
|--------|----------------|
| `quotations` | `salesperson_id`, `due_date`, `payment_terms_days`, `discount_percent`, `price_list_id` |
| `sales_orders` | `salesperson_id`, `discount_percent`, `price_list_id` |
| `sales_invoices` | `salesperson_id`, `discount_percent`, `price_list_id` |
| `sales_returns` | `salesperson_id`, `exchange_rate` |
| `sales_deliveries` | `salesperson_id`, `currency`, `exchange_rate` |

---

## ✅ المرحلة 12D — حفظ التجارة المدمج + سندات الصرف (مُكتملة 2026-02-11 18:40 UTC)

### ما تم:
- `handleTradeSave` في UnifiedAccountingSheet — حفظ مدمج لكل مستندات التجارة
- `TradeService` محسّن: create يولّد رقم تلقائي (PI-2026-xxx) + update شامل
- `PurchaseExpensesTab` أُعيد تصميمها كسندات صرف (Draft→Paid)
- Migration: أعمدة `expenses` JSONB + `expenses_total` + `attachments` + `supplier_*` على 4 جداول

### الملفات: UnifiedAccountingSheet.tsx, TradeService.ts, PurchaseExpensesTab.tsx

---

## 🔵 خطة المرحلة 13 — دورة المشتريات الكاملة

### البنية: فاتورة(+مصاريف+دفعات) → كونتينر(+مصاريف) → توزيع Landed Cost → استلام GRN

| # | المرحلة | الوقت | الأهمية |
|---|---------|-------|---------|
| 13A | حفظ فاتورة المشتريات E2E + اختبار | 2-3h | 🔴 حرج |
| 13B | سندات دفع على حساب الفاتورة | 3-4h | 🔴 حرج |
| 13C | ربط الكونتينر + مصاريفه | 4-5h | 🟠 مهم |
| 13D | توزيع المصاريف على المواد | 5-7h | 🟠 مهم |
| 13E | استلام البضاعة (GRN) | 3-4h | 🟡 متوسط |

**إجمالي: 17-23 ساعة**

---

## ✅ المرحلة 5 — متصفح المواد + تسعير الكميات (مُكتملة 2026-02-11)

### الهدف:
إنشاء تبويب "Materials Browser" داخل الـ Trade Sheet يسمح بالبحث عن المواد وإضافتها إلى السلة بذكاء، مع عرض الأسعار المحسوبة من نظام Cascade وعرض الأسعار المتدرجة (Quantity Breaks).

### المكونات الفرعية:

#### 5.1 — MaterialBrowserTab (تبويب جديد)
```
📍 موقعه: تبويب ثالث في Trade Sheet بعد "الأساسي" و "Ledger"
📦 ملف: src/features/trade/components/tabs/MaterialBrowserTab.tsx
```
- شريط بحث ذكي (اسم + كود + باركود)
- فلاتر: مجموعة المادة + اللون + المورد
- عرض Grid بالمواد مع:
  - صورة مصغرة + اسم + كود
  - سعر البيع الأساسي
  - السعر المحسوب من قائمة أسعار العميل (مُميّز)
  - الكمية المتاحة (stock)
  - زر "إضافة" → يضيف إلى CartItemsView

#### 5.2 — QuantityPricingCard (بطاقة تسعير الكميات)
```
📦 ملف: src/features/trade/components/cards/QuantityPricingCard.tsx
```
- يظهر عند اختيار مادة أو عند hover
- يعرض جدول Quantity Breaks من قائمة الأسعار:
  ```
  | الكمية   | السعر    | الخصم  |
  |----------|----------|--------|
  | 1-49     | 50.00    | 0%     |
  | 50-99    | 47.50    | 5%     |
  | 100+     | 45.00    | 10%    |
  ```
- يُميّز السطر المطابق للكمية الحالية

#### 5.3 — التعديلات على الملفات القائمة:
| الملف | التعديل |
|-------|---------|
| `UnifiedTradeSheet.tsx` أو config | إضافة تبويب "المواد" |
| `TradeMainTab.tsx` | callback لإضافة مادة من المتصفح |
| `useCustomerPricing.ts` | إضافة `getQuantityBreaks(materialId)` |

### الـ Hooks المطلوبة:

#### `useMaterialSearch(query, filters)`
```typescript
// يبحث في fabric_materials بالاسم/الكود/الباركود
// يجلب الكمية المتاحة من stock
// يطبق فلاتر المجموعة واللون
interface MaterialSearchResult {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    base_sell_price: number;
    stock_qty: number;
    group_name: string;
    thumbnail_url?: string;
}
```

#### `useQuantityBreaks(priceListId, materialId)`
```typescript
// يجلب جدول الأسعار المتدرجة
interface QuantityBreak {
    min_qty: number;
    max_qty: number | null;
    unit_price: number;
    discount_percent: number;
}
```

### التدفق:
```
1️⃣ المستخدم يفتح تبويب "المواد"
2️⃣ يبحث عن مادة → يرى النتائج مع الأسعار
3️⃣ يضغط على مادة → يرى QuantityPricingCard
4️⃣ يحدد الكمية ويضغط "إضافة"
5️⃣ المادة تُضاف إلى CartItemsView بالسعر المحسوب
6️⃣ يعود لتبويب "الأساسي" ليرى المادة في السلة
```

### تقدير الوقت: 6-8 ساعات

---

## ✅ المرحلة 5B — وورك فلو تأكيد المستندات (مُكتملة 2026-02-11)

### الهدف:
إضافة نظام تأكيد المستندات التجارية مع ربطه بالمستودعات وإنشاء إذن تسليم تلقائياً.

### ما تم تنفيذه:

#### Migration (`20260211_confirmation_workflow.sql`) — ✅ مُنفذ:
| المكون | النوع | الوصف |
|--------|-------|-------|
| `company_workflow_settings` | جدول جديد | إعدادات الوورك فلو لكل شركة |
| `document_approval_requests` | جدول جديد | طلبات الموافقة |
| أعمدة على `trade_orders` | تعديل | `confirmation_status`, `confirmed_at`, `confirmed_by`, `delivery_note_id`, `approval_status` |
| 5 RLS Policies | أمان | حماية الجداول الجديدة |
| `get_workflow_settings()` | دالة | SECURITY DEFINER لجلب الإعدادات |

#### ملفات جديدة:
| الملف | الوصف |
|-------|-------|
| `src/services/confirmationService.ts` | validation + approval + confirm + delivery note + notifications |
| `src/features/trade/components/ConfirmationDialog.tsx` | حوار تأكيد Glassmorphism |

#### ملفات معدّلة:
| الملف | التعديل |
|-------|---------|
| `configs/tradeConfigs.ts` | أضفنا action `confirm` |
| `components/ActionToolbar.tsx` | زر "تأكيد وإرسال" 🟢 + شارة "مُؤكد" ✅ |
| `UnifiedAccountingSheet.tsx` | ربط كامل: imports + state + case 'confirm' + dialog rendering |

#### تدفق العمل:
```
مستند تجاري → 🟢 "تأكيد وإرسال" → حوار التأكيد
  → [يلزم موافقة؟] → طلب موافقة → إشعار المدير → الموافقة → تأكيد
  → [لا يلزم؟] → تأكيد مباشر → إنشاء إذن تسليم → إشعار أمين المستودع
```

#### الخطوات المؤجلة لمرحلة منفصلة:
- واجهة إعدادات الوورك فلو في إدارة الشركة
- واجهة الموافقات المعلقة للمدراء
- واجهة تنفيذ التسليم لأمين المستودع
- قواعد Edit After Confirmation

---

## 📊 ملخص الحالة العامة — 2026-02-12 V3.0

| المرحلة | الوصف | الحالة |
|---------|-------|--------|
| 1 | ضغط الهيدر + مندوب المبيعات | ✅ |
| 2 | التسعير الذكي + حد الائتمان | ✅ |
| 3 | العملة + سعر الصرف + عملة العميل | ✅ |
| 4 | Validation + تنبيه المخزون + Integration | ✅ |
| 5A | متصفح المواد + تسعير الكميات | ✅ (خطة) |
| 5B | وورك فلو تأكيد المستندات | ✅ |
| 6 | سند القبض + شروط الدفع (PaymentReceiptTab) | ✅ (موجود) |
| 7 | شحن العميل (CustomerShippingTab) | ✅ |
| 8 | القيد المحاسبي (AccountingEntryTab) | ✅ (موجود) |
| 9 | 🤖 NexaAgent — ذكاء العميل + محادثة Gemini | ✅ |
| 9B | 📦 تكامل Nova Poshta API | ✅ |
| 9B+ | 💰 COD + خيارات الدفع + تعبئة تلقائية | ✅ |
| 10 | تخصيص التبويبات حسب نوع المستند | ✅ |
| 11 | نسخ المستند + سجل الأسعار | 🔲 |
| 12 | المكون المشترك مبيعات/مشتريات | 🔲 |
| 13A | 🔑 تفعيل Gemini AI (Deploy + API Key) | 🔲 |
| 13B | ⚙️ إعدادات التكاملات (IntegrationsTab) | ✅ |
| 14 | 🗑️ حذف + ✅ ترحيل + 🔄 إلغاء ترحيل | ✅ |
| 15 | 🔐 RBAC صلاحيات المستندات التجارية | ✅ |
| 16 | 💰 مصاريف الكونتينر المتقدمة | ✅ |
| 17 | 📦 إعادة تصميم إنشاء الكونتينر | ✅ |
| 17-fix | 🔧 إصلاح حفظ الكونتينر + حقل الاسم | ✅ (12 فبراير) |
| **18** | **🏢 صفحة شركات مصاريف الكونتينرات** | **📝 مخطط** |
| **19** | **🔍 متصفح المواد V2 — Pop-up + آخر أسعار** | **🔴 الجلسة القادمة** |
| **20** | **🎨 تجميع المواد بالألوان + أرصدة** | **🔴 الجلسة القادمة** |
| **21** | **💱 العملة الديناميكية (إزالة SAR + عملة المورد)** | **🟡 الجلسة 2** |
| **22** | **📋 القيد التلقائي عند الترحيل + ربط كونتينر** | **🟡 الجلسة 2** |
| **23** | **🏪 طلبات مشتريات الفروع (Backend + Frontend)** | **🟡 الجلسة 3-4** |
| **24** | **⭐ تبويب طلبات الفروع في فاتورة المدير** | **� الجلسة 4** |
| **25** | **🔒 حجز الفرع + التتبع + توزيع الاستلام** | **🟡 الجلسة 5** |

---

## 🗺️ خارطة الطريق المُحدّثة — نظام المشتريات المتقدم V2

### 🔍 نتائج التحقق من البنية الحالية (2026-02-12):

#### ✅ الفروع (branches) — الجدول موجود!
```sql
-- موجود في 00001_initial_schema.sql
CREATE TABLE branches (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_main BOOLEAN DEFAULT FALSE
    -- ⚠️ لا يوجد tenant_id! يجب إضافته
);

-- RLS موجود: المستخدم يرى فروع شركته فقط ✅
-- user_profiles.branch_id موجود ✅ (ربط المستخدم بالفرع)
-- branch_id موجود في: quotations, sales_orders, sales_invoices,
--   purchase_orders, purchase_invoices, journal_entries, warehouses ✅
```

**⚠️ ملاحظة مهمة:** جدول `branches` لا يحتوي على `tenant_id` — يجب إضافته لتوافق الـ multi-tenancy!

#### ✅ المطابقة الثلاثية — البنية موجودة جزئياً:
```
الروابط الموجودة في DB:
├── quotations.converted_to_order + quotations.order_id       ✅
├── sales_orders.quotation_id → quotations                    ✅  
├── purchase_invoices.order_id → purchase_orders              ✅
├── purchase_invoice_items.order_id → purchase_orders         ✅
├── purchase_invoice_items.received_quantity                   ✅
└── confirmationService.createDeliveryNote()                   ✅

ما ينقص:
├── ❌ لا يوجد جدول goods_receipt_notes (إذن استلام مستقل)
├── ❌ لا يوجد مقارنة تلقائية PO qty ↔ Invoice qty ↔ Received qty
└── ❌ لا يوجد تنبيه عند فروقات الأسعار PO price ↔ Invoice price
```

#### 📊 ملخص: الفرق بين الموجود والمطلوب:

| العنصر | DB | Frontend | الحالة |
|--------|:---:|:--------:|--------|
| جدول `branches` | ✅ | ❌ لا يوجد إدارة | يحتاج واجهة إدارة |
| `user_profiles.branch_id` | ✅ | ✅ جزئي | ربط المستخدم بالفرع |
| `branch_id` في كل المستندات | ✅ | ❌ غير مفعّل | حقل موجود لكن غير مستخدم |
| `tenant_id` في branches | ❌ | — | يجب إضافته |
| PO → Invoice ربط | ✅ | ❌ غير مفعّل | `purchase_invoices.order_id` موجود |
| `received_quantity` تتبع | ✅ | ❌ غير مفعّل | حقل موجود في `purchase_invoice_items` |

---

### 📌 قرارات التصميم المُتفق عليها (مُحدّث 12 فبراير):

| القرار | التفاصيل |
|--------|----------|
| **حجز الفرع** | نفس آلية حجز الزبون — **لا يحتاج دفعة** للتثبيت — فقط تثبيت الكمية |
| **آخر الأسعار** | عرض آخر 3 أسعار — تظهر **فقط للمدير** (RBAC) |
| **الألوان** | للأقمشة والألبسة حالياً. المودول جاهز لاحقاً للمقاسات والوحدات |
| **الفروع** | جدول `branches` **موجود في DB** لكن بدون واجهة إدارة — يحتاج tenant_id |
| **الصلاحيات** | مدير الفرع: طلباته + ما تحته. المدير العام + المحاسب: الكل |
| **القيد** | يُنشأ عند **الترحيل** — الترحيل = استلام الكميات الفعلية المنتجة |
| **توقيت القيد** | المواد قد تكون بالكونتينر بالطريق — القيد يسجل الذمم حتى لو لم تصل للمستودع |
| **الكونتينر** | ربط **جزئي أو كلي** — متاح من **أمر الشراء** أو **فاتورة الشراء** |
| **فرق الأمر/الفاتورة** | الأمر = كميات الإنتاج المطلوبة. الفاتورة = الكميات الفعلية المحمّلة |
| **المستودع** | مطلوب في طلبات الفروع، فلتر اختياري في متصفح المواد |
| **حدود مالية** | لاحقاً عند الاستخدام الفعلي — لا نضيفها الآن |
| **3-Way Matching** | البنية موجودة جزئياً (PO↔Invoice). يحتاج تفعيل المقارنة التلقائية |

---

### 🔴 الجلسة 1: متصفح المواد V2 (6-8 ساعات)

#### ✅ Phase 19: متصفح المواد V2 — Pop-up الإضافة السريعة + آخر الأسعار — مُكتمل 2026-02-12

| # | المهمة | الجهد | التفاصيل | الحالة |
|---|--------|-------|----------|--------|
| 19A | خدمة `useMaterialPriceHistory` | 1h | استعلام آخر 5 أسعار بيع + 3 شراء — RBAC: أسعار الشراء للمدير فقط | ✅ |
| 19B | مكون `MaterialQuickAddPopup` | 2-3h | Pop-up: اللون + آخر أسعار + كمية + سعر + مستودع + إضافة | ✅ |
| 19C | ربط Pop-up مع متصفح المواد | 1h | زر + على كل مادة → يفتح Pop-up مع سجل الأسعار | ✅ |

**الملفات المُنشأة:**
- `src/features/trade/hooks/useMaterialPriceHistory.ts` — Hook لجلب آخر الأسعار
- `src/features/trade/components/MaterialQuickAddPopup.tsx` — Pop-up الإضافة السريعة

**قرارات التصميم:**
- ⚠️ في فواتير المشتريات: لا يظهر زر "اختيار رولونات" (لأن المشتريات تستلم رولونات جديدة)
- أسعار الشراء تظهر فقط للمدير ومسؤول المشتريات (RBAC)
- Pop-up يدعم اختصارات لوحة المفاتيح (Enter = إضافة، Escape = إغلاق)
- العملة الافتراضية تم تغييرها من SAR إلى UAH

```
Pop-up الإضافة السريعة:
┌──────────────────────────────────────┐
│ 📦 قطن سادة 100% (CST-100)          │
│ 📊 الرصيد: 120م | 3 رولونات         │
│ 💰 آخر 3 أسعار بيع: (مع ↑↓ trend)   │
│   ★ $45.00 — فاتورة بيع (02/01)     │
│     $42.50 — أمر بيع (01/20)         │
│     $40.00 — عرض سعر (12/15)         │
│ 💵 أسعار الشراء: (المدير فقط)       │
│     $35.00 — فاتورة شراء (01/15)     │
│ 🏭 المستودع: [المستودع الرئيسي ▼]  │
│ 🔢 الكمية: [-][___10___][+] متر     │
│ 💵 السعر:  [__45.00__] UAH          │
│ 📊 الإجمالي: 450.00 UAH             │
│   [✅ إضافة للسلة]  [📋 اختيار رولونات]│
└──────────────────────────────────────┘
* زر "اختيار رولونات" يختفي في وضع المشتريات
```

#### Phase 20: تجميع المواد بالألوان + أرصدة

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 20A | خدمة `useMaterialColorStock` | 1h | أرصدة حسب اللون من `fabric_rolls` |
| 20B | إعادة هيكلة عرض المتصفح | 2h | أقمشة: ألوان + أمتار + رولونات. غيرها: رصيد عام |
| 20C | دعم المقاسات/الوحدات (بنية جاهزة) | 30min | `variant_type: 'color' | 'size' | 'unit'` — جاهز للتوسع |

```
المادة: قطن سادة 100%
├── 🎨 أبيض:  120م | 3 رولونات  [إضافة ➕]
├── 🎨 أحمر:   80م | 2 رولونات  [إضافة ➕]
├── 🎨 أزرق:   60م | 2 رولونات  [إضافة ➕]
└── الإجمالي: 260م | 7 رولونات
```

---

### 🟡 الجلسة 2: العملة + القيد + الكونتينر (5-7 ساعات)

#### Phase 21: العملة الديناميكية

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 21A | إزالة SAR المشفرة من كل المستندات | 1-2h | تنظيف كامل |
| 21B | عملة المورد الافتراضية | 1h | عند اختيار المورد → العملة تتغير لعملته |
| 21C | سعر الصرف التلقائي + تثبيت عند الترحيل | 1h | من `exchange_rates` + يُثبت نهائياً |

```
عملة الفاتورة (ترتيب الأولوية):
1. عملة المورد (supplier.default_currency)
2. عملة الشركة (company_settings.base_currency)
3. يمكن تغييرها يدوياً → يُحسب سعر الصرف
```

#### Phase 22: القيد التلقائي + ربط الكونتينر (مُحدّث)

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 22A | القيد التفصيلي عند الترحيل | 2-3h | 4 حسابات: مخزون + ذمم دائنة + فروقات أسعار + ضريبة |
| 22B | ربط بكونتينر من أمر الشراء أو الفاتورة | 1-2h | متاح في أي مرحلة — الكميات تتعدل عند الفاتورة |
| 22C | إنشاء `container_items` تلقائياً | 30min | عند الربط → بنود المستند تُنسخ لبنود الكونتينر |
| 22D | تفعيل مقارنة PO ↔ Invoice (3-Way أساسي) | 1h | تنبيه عند فرق الكمية أو السعر |

```
📋 القيد التفصيلي عند ترحيل فاتورة المشتريات:

السيناريو 1: المواد بالطريق (في كونتينر — لم تصل للمستودع):
┌──────────────────────────┬────────┬────────┐
│ الحساب                   │ مدين   │ دائن   │
│──────────────────────────┼────────┼────────│
│ بضاعة بالطريق (GIT)      │ $4,500 │        │
│ ذمم دائنة — المورد       │        │ $4,500 │
└──────────────────────────┴────────┴────────┘

السيناريو 2: المواد وصلت واستُلمت في المستودع:
┌──────────────────────────┬────────┬────────┐
│ الحساب                   │ مدين   │ دائن   │
│──────────────────────────┼────────┼────────│
│ المخزون (حسب المستودع)   │ $4,500 │        │
│ ذمم دائنة — المورد       │        │ $4,500 │
└──────────────────────────┴────────┴────────┘

السيناريو 3: فرق بين سعر الأمر وسعر الفاتورة:
┌──────────────────────────┬────────┬────────┐
│ الحساب                   │ مدين   │ دائن   │
│──────────────────────────┼────────┼────────│
│ المخزون                  │ $4,300 │        │
│ فروقات أسعار الشراء      │ $200   │        │
│ ذمم دائنة — المورد       │        │ $4,500 │
└──────────────────────────┴────────┴────────┘

🔄 عند وصول بضاعة الطريق للمستودع (قيد تحويلي):
┌──────────────────────────┬────────┬────────┐
│ المخزون                  │ $4,500 │        │
│ بضاعة بالطريق (GIT)      │        │ $4,500 │
└──────────────────────────┴────────┴────────┘

📦 ربط الكونتينر (متاح في مرحلتين):
├── من أمر الشراء (PO) → ربط أولي — كميات الإنتاج المطلوبة
├── من فاتورة الشراء (Invoice) → ربط نهائي — كميات محملة فعلية
└── عند استلام الفاتورة بعد الأمر → الكميات تتعدل تلقائياً
```

---

### 🟡 الجلسة 3: إعداد الفروع + Backend (4-5 ساعات)

#### Phase 23A (جديد): تجهيز بنية الفروع

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 23A-1 | إضافة `tenant_id` لجدول `branches` | 30min | ضروري لـ multi-tenancy |
| 23A-2 | واجهة إدارة الفروع (إضافة/تعديل/حذف) | 1-2h | في إعدادات الشركة — مع تحديد الفرع الرئيسي |
| 23A-3 | ربط المستودعات بالفروع | 30min | `warehouses.branch_id` موجود — نفعّله في الواجهة |
| 23A-4 | تفعيل `branch_id` في RBAC | 1h | المستخدم يرى بيانات فرعه فقط |

#### Phase 23B: طلبات مشتريات الفروع

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 23B-1 | جدول `branch_requests` + `branch_request_items` + RLS | 1-2h | بنية DB + سياسات أمان |
| 23B-2 | خدمة `branchRequestsService.ts` (CRUD + حالات) | 1-2h | إنشاء/تعديل/حذف + تغيير حالات |

```
حالات الطلب:
draft → submitted → reserved → received
                 ↘ rejected
                 ↘ modified → reserved

نوع الطلب (request_type):
├── 'purchase' — طلب مشتريات عام
└── 'customer_order' — طلب زبون (مع اسم وهاتف الزبون)
```

---

### 🟡 الجلسة 4: طلبات الفروع — Frontend (6-8 ساعات)

#### Phase 24: واجهات طلبات الفروع

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 24A | صفحة إنشاء طلب الفرع | 2-3h | فرع + مستودع + مواد + ألوان + كميات + زبون (اختياري) |
| 24B | قائمة طلبات الفروع | 1-2h | للفرع: طلباتي. للمدير/المحاسب: الكل |
| 24C | تبويب "طلبات الفروع" في فاتورة المدير | 2-3h | عرض/فلتر/تجميع + إضافة للفاتورة |
| 24D | آلية التجميع بالمادة + تعديل الكميات | 1h | المدير يجمع ويمكنه تعديل |

```
تبويب طلبات الفروع (في فاتورة المدير):
فاتورة شراء:
├── 📦 الأصناف والتفاصيل
├── 🔍 متصفح المواد
├── 👤 المورد
├── 💰 الدفع والمصاريف
├── ⭐ طلبات الفروع  ← جديد (يظهر للمدير فقط)
├── 📎 المرفقات
└── 📜 سجل النشاط
```

---

### 🟡 الجلسة 5: الحجز والتتبع (3-4 ساعات)

#### Phase 25: حجز الفرع + التتبع

| # | المهمة | الجهد | التفاصيل |
|---|--------|-------|----------|
| 25A | حجز فرع (نفس آلية الزبون — بدون دفعة) | 1-2h | عند تأكيد الفاتورة → حالة = محجوز |
| 25B | تغيير حالات تلقائي (محجوز → مستلم) | 1h | عند الاستلام → توزيع على مستودعات الفروع |
| 25C | لوحة متابعة للفرع (My Requests Dashboard) | 1h | حالة طلباتي + الكميات المحجوزة + المستلمة |

```
حجز الفرع vs حجز الزبون:
├── 🏪 حجز فرع: نفس الآلية — بدون دفعة — فقط تثبيت الكمية
└── 👤 حجز زبون: يحتاج دفعة — يبقى كما هو
```

---

### 📋 المراحل المتبقية الأخرى (لاحقاً):

| # | المرحلة | الجهد | الأولوية |
|---|---------|-------|----------|
| 18 | 🏢 صفحة شركات مصاريف الكونتينرات | 6-8h | 🟡 |
| 11 | 📋 نسخ المستند + سجل الأسعار | 2-3h | 🔵 |
| 12 | 🔗 المكون المشترك مبيعات/مشتريات | 2-3h | 🔵 |
| 13A | 🔑 تفعيل Gemini AI | 1-2h | 🔵 |
| 17A | ربط الفواتير بالكونتينر (تفصيلي) | 2-3h | 🔵 |
| 17B | حجز بنود الكونتينر | 1-2h | 🔵 |
| 17C | تثبيت شركة الشحن عند أول دفعة | 1h | 🔵 |
| — | حدود مالية على الموافقات (Approval Thresholds) | 2-3h | 🔵 لاحقاً |
| — | تقارير المشتريات (Top suppliers, Price trends) | 3-4h | 🔵 لاحقاً |
| — | تقييم الموردين (Vendor Rating) | 2-3h | 🔵 لاحقاً |

---

## ✅ المرحلة 14 — حذف وترحيل المستندات (مُكتملة 2026-02-12)

### الهدف:
تفعيل أزرار الحذف والترحيل وإلغاء الترحيل على مستوى جميع المستندات التجارية (مبيعات + مشتريات)، مع دعم الترحيل التلقائي حسب إعدادات الشركة.

### المشكلات المُكتشفة والمُصلحة:
1. **أزرار الحذف والترحيل** كانت تتطلب `onDelete` / `onPost` كـ props — والصفحات لا تمررها
2. **مفاتيح React Query خاطئة** — الكود كان يستخدم `purchase_cycle` بدل `purchase_cycle_full` فلم يتحدث الجدول بعد الحذف
3. **الترحيل يظهر لكل المستندات** — بينما عروض الأسعار والأوامر لا يجب أن تُرحّل

### الحل المُنفذ:

#### 14.1 — حذف Built-in في `UnifiedAccountingSheet.tsx`
- حذف مباشر بدون الحاجة لـ `onDelete` prop
- يسأل المستخدم "هل أنت متأكد؟" قبل الحذف
- يحذف من الجدول الصحيح حسب `docType` + `tradeMode`
- **يُزيل المستند فوراً من الجدول** عبر `queryClient.invalidateQueries()`
- يغلق الشيت بعد الحذف

#### 14.2 — ترحيل ذكي حسب `docType`
- **يظهر فقط** لأنواع المستندات القابلة للترحيل:
  - ✅ `trade_invoice` — فاتورة بيع/شراء
  - ✅ `trade_delivery` — إذن تسليم
  - ✅ `trade_receipt` — استلام بضاعة
  - ✅ `trade_return` — مرتجع
  - ✅ `journal` — قيد محاسبي
- **لا يظهر** في عروض الأسعار، الأوامر، الحجوزات، طلبات الشراء

#### 14.3 — وضعين للترحيل حسب إعدادات الشركة
- **ترحيل يدوي** (الافتراضي): المستخدم يضغط زر "ترحيل" من القائمة
- **ترحيل تلقائي**: عند الحفظ يُرحّل المستند تلقائياً (حسب `auto_post_*` في الإعدادات)
- **تأكيد الترحيل**: `require_post_confirmation` — يسأل أو يرحّل مباشرة

#### 14.4 — إلغاء الترحيل
- يظهر فقط عندما `status === 'posted'`
- يسأل المستخدم → يعيد الحالة لـ `draft`

### الملفات المُعدلة:
| الملف | التعديل |
|-------|---------|
| `UnifiedAccountingSheet.tsx` | Built-in delete + post + unpost + auto-post + صحح query keys |
| `ActionToolbar.tsx` | ترحيل يظهر فقط لـ POSTABLE_DOC_TYPES |
| `20260212_posting_workflow.sql` | 🆕 أعمدة إعدادات الترحيل |

### إعدادات الشركة الجديدة (`company_workflow_settings`):
| العمود | النوع | الافتراضي | الوصف |
|--------|-------|-----------|-------|
| `auto_post_invoice` | BOOLEAN | false | ترحيل الفواتير تلقائياً عند الحفظ |
| `auto_post_delivery` | BOOLEAN | false | ترحيل إذن التسليم تلقائياً |
| `auto_post_receipt` | BOOLEAN | false | ترحيل استلام البضاعة تلقائياً |
| `auto_post_return` | BOOLEAN | false | ترحيل المرتجع تلقائياً |
| `require_post_confirmation` | BOOLEAN | true | سؤال تأكيد قبل الترحيل اليدوي |

### مفاتيح React Query المُصححة:
| خاطئ ❌ | صحيح ✅ |
|---------|---------|
| `purchase_cycle` | `purchase_cycle_full` |
| `sales_cycle` | `sales_cycle_full` |
| — | `purchase_invoices_dedicated` (مضاف) |

---

## ✅ المرحلة 15 — RBAC صلاحيات المستندات التجارية (مُكتملة 2026-02-12)

### الهدف:
التحكم الدقيق بما يراه ويفعله كل دور في الفواتير والمستندات التجارية — إخفاء الأعمدة الحساسة (أسعار التكلفة، هوامش الربح) وتقييد الأفعال (حذف، ترحيل، تعديل أسعار).

### البنية:

```
useRBAC.ts (الأساس — يحمل الأدوار والصلاحيات)
    └── useTradePermissions.ts (الطبقة التجارية — يحوّل الأدوار لقرارات عمل)
            ├── ActionToolbar.tsx    → يتحكم بأزرار الحذف/الترحيل
            ├── TradeItemsTable.tsx  → يخفي أعمدة الأسعار
            └── (مستقبلاً) أي مكون تجاري آخر
```

### 🔰 هرمية الأدوار (من الأعلى للأدنى):

| # | الكود | الاسم | المستوى |
|---|-------|-------|---------|
| 1 | `super_admin` | مدير المنصة (أنت) | أعلى سلطة — يرى ويفعل كل شيء |
| 2 | `tenant_owner` | صاحب المنشأة | يرى كل شيء في منشأته |
| 3 | `company_admin` | مدير الشركة | يرى كل شيء في شركته |
| 4 | `accountant` | المحاسب | يرى الأسعار والتكاليف — لا يدير الأدوار |
| 5 | `purchasing_manager` | مدير المشتريات | يرى أسعار الموردين وتكاليف الشراء |
| 6 | `sales_manager` | مدير المبيعات | يرى أسعار البيع + هوامش الربح |
| 7 | `sales_rep` | مندوب مبيعات | يرى أسعار البيع فقط |
| 8 | `warehouse_manager` | مدير المستودع | يرى الكميات — لا يرى الأسعار |
| 9 | `employee` | موظف عادي | أقل صلاحيات — يرى فقط الأساسيات |

### 📊 مصفوفة رؤية الأعمدة (Column Visibility):

| العمود | super_admin | tenant_owner | company_admin | accountant | purchasing_manager | sales_manager | sales_rep | warehouse_manager | employee |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **سعر الوحدة** `unit_price` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **سعر التكلفة** `cost_price` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **هامش الربح** `profit_margin` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **إجمالي التكلفة** `total_cost` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **الخصم** `discount` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **الضريبة** `tax` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **سعر المورد** `supplier_price` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **مصاريف الشحن** `shipping_cost` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **المصاريف الإضافية** `expenses` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **الربح الصافي** `net_profit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 🎯 مصفوفة صلاحيات الأفعال (Action Permissions):

| الفعل | super_admin | tenant_owner | company_admin | accountant | purchasing_manager | sales_manager | sales_rep | warehouse_manager | employee |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **حذف** `canDelete` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ترحيل** `canPost` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **إلغاء ترحيل** `canUnpost` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **تعديل** `canEdit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **تعديل أسعار** `canEditPrice` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **إعطاء خصم** `canApplyDiscount` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **تعديل مستند مرحّل** `canEditPosted` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **نسخ/تكرار** `canDuplicate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **طباعة** `canPrint` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **تصدير** `canExport` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **تأكيد مستند** `canConfirm` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### 📝 قواعد خاصة:
1. **الحذف ممنوع على المرحّل** — حتى المدير لا يستطيع الحذف إلا بعد إلغاء الترحيل
2. **التعديل ممنوع على المرحّل** — يجب إلغاء الترحيل أولاً (إلا المدير: `canEditPosted`)
3. **عمود الإجمالي يتبع سعر الوحدة** — إذا أُخفي السعر يُخفى الإجمالي أيضاً
4. **المحاسب يحذف ويرحّل** — لكنه لا يلغي الترحيل (يحتاج موافقة المدير)
5. **مدير المبيعات يعطي خصم** — لكن مندوب المبيعات لا يستطيع

### 🗂️ ما يُطبّق حسب نوع المستند:

| السياق | الأعمدة المخفية | الملاحظات |
|--------|-----------------|-----------|
| **فاتورة بيع** | `cost_price`, `supplier_price`, `net_profit` | المندوب يرى فقط سعر البيع |
| **فاتورة شراء** | `profit_margin`, `net_profit` | مدير المبيعات لا يحتاج رؤية تكاليف الشراء |
| **الكونتينر** | `supplier_price`, `shipping_cost`, `expenses` | مخفية عن المبيعات |
| **عرض سعر** | — | مفتوح أكثر (لا أسعار تكلفة) |
| **مرتجع** | نفس الفاتورة | يتبع قواعد الفاتورة الأصلية |

### الملفات المُنشأة والمُعدلة:
| الملف | التعديل |
|-------|---------|
| `src/hooks/useTradePermissions.ts` | 🆕 Hook جديد — يحوّل أدوار RBAC لقرارات أعمال |
| `ActionToolbar.tsx` | أزرار الحذف/الترحيل/إلغاء الترحيل تخضع للصلاحيات |
| `TradeItemsTable.tsx` | أعمدة الأسعار تخضع لصلاحيات الأعمدة |
| `UnifiedAccountingSheet.tsx` | يمرر `tradeMode` لـ ActionToolbar |

### كيفية الاستخدام في أي مكون جديد:
```tsx
import { useTradePermissions } from '@/hooks/useTradePermissions';

function MyComponent() {
    const { columns, actions, isManager } = useTradePermissions({
        tradeMode: 'purchase',
        docType: 'trade_invoice',
        docStatus: 'draft',
    });

    // إخفاء عمود التكلفة
    if (!columns.cost_price) { /* لا تعرض العمود */ }

    // إخفاء زر الحذف
    if (!actions.canDelete) { /* لا تعرض الزر */ }
}
```

---

## ✅ المرحلة 9 — NexaAgent (مُكتملة 2026-02-11)

### الهدف:
تبويب ذكاء اصطناعي يعرض تحليلات العميل، تنبيهات ذكية، ومحادثة AI عبر Gemini.

### المكونات المُنفذة:

#### 9.1 — NexaAgentTab.tsx (تبويب جديد ~870 سطر)
- **نظرة عامة (Overview):**
  - 4 بطاقات KPI: الطلبات، الإيرادات، نسبة السداد، آخر طلب
  - تصنيف تلقائي: 🆕 جديد / ⭐ منتظم / 👑 VIP / 😴 خامل
  - تنبيهات ذكية (تأخر سداد، قرب حد ائتمان، عميل خامل، فرص بيع)
  - إحصائيات إضافية (حد الائتمان، المستحق، أيام السداد، المرتجعات)

- **محادثة (Chat) — عبر Gemini 2.0 Flash:**
  - `supabase.functions.invoke('nexa-agent')` → Edge Function → Gemini API
  - سياق كامل: بيانات العميل الحقيقية + تاريخ المحادثة
  - اقتراحات خصومات بناءً على تصنيف العميل
  - أسئلة مقترحة جاهزة للنقر
  - Feedback (👍/👎) + مؤشر اتصال Gemini (🟢/🟡)
  - Fallback محلي عند تعذر الاتصال

#### 9.2 — Edge Function (`supabase/functions/nexa-agent/index.ts`)
- Gemini 2.0 Flash مع System Prompt غني
- يستقبل: message, language, customer_insights, chat_history
- يرد بلغة المستخدم (AR/EN/UK/RU)
- محادثة مستمرة (chat.sendMessage مع history)

#### 9.3 — DB Migration (`20260211_company_integrations.sql`) ✅ مُنفذ
- عمود `integrations JSONB` على `companies`
- يحفظ إعدادات nova_poshta (api_key, sender_ref, ...) + AI settings

### الملفات:
| الملف | النوع |
|-------|-------|
| `src/features/trade/components/tabs/NexaAgentTab.tsx` | 🆕 جديد |
| `supabase/functions/nexa-agent/index.ts` | ✏️ معدل (Gemini 2.0 + سياق العميل) |
| `supabase/migrations/20260211_company_integrations.sql` | 🆕 مُنفذ ✅ |
| `src/features/accounting/components/unified/configs/tradeConfigs.ts` | ✏️ tab config |
| `src/features/accounting/components/unified/UnifiedAccountingSheet.tsx` | ✏️ import + case |
| `src/i18n/locales/ar.json` | ✏️ ترجمات |
| `src/i18n/locales/en.json` | ✏️ ترجمات |

### التدفق:
```
Frontend → supabase.functions.invoke('nexa-agent') → Gemini 2.0 Flash → Response
         ↓ (fallback)
    Local Pattern Matching (إذا تعذر الاتصال)
```

---

## ✅ المرحلة 9B — تكامل Nova Poshta المباشر (مُكتملة 2026-02-11)

### الهدف:
تكامل مباشر مع API نوفا بوشتا عبر Edge Function — إنشاء بوليصة، تتبع، طباعة، كل شيء من داخل الفاتورة.

### المكونات المُنفذة:

#### 9B.1 — Edge Function (`supabase/functions/nova-poshta/index.ts`) 🆕
- **Proxy لـ Nova Poshta API v2.0** — 10 أكشن:
  - `searchCities` — بحث المدن بالنص
  - `getWarehouses` — فروع NP حسب المدينة
  - `createDocument` — إنشاء بوليصة (InternetDocument)
  - `trackDocument` — تتبع حالة الشحنة
  - `getCounterparties` — جلب المرسلين/المستلمين
  - `getContactPersons` — جهات الاتصال
  - `getSenderAddresses` — عناوين المرسل
  - `getDeliveryCost` — حساب تكلفة الشحن
  - `getDocumentList` — قائمة البوالص
  - `printDocument` — طباعة PDF

#### 9B.2 — تحسين CustomerShippingTab (~1470 سطر)
- **لوحة NP المتكاملة (عند اختيار نوفا بوشتا + وجود API Key):**
  - 🟢 مؤشر اتصال NP (Connected to Nova Poshta)
  - 🏢→🏢 / 🏢→🏠 اختيار نوع التوصيل (فرع-فرع / فرع-باب)
  - 🔍 بحث المدينة (Debounced + dropdown مباشر من NP API)
  - 🏪 اختيار فرع الاستلام (Select مملوء من API)
  - 📦 تفاصيل البضاعة (عدد الطرود، الوزن، الوصف)
  - 💰 اختيار الدافع (المرسل/المستلم)
  - 📋 زر "إنشاء بوليصة Nova Poshta" (أحمر gradient)
  - ✅ عرض رقم TTN بعد الإنشاء (كبير + font-mono)
  - 🖨️ طباعة البوليصة (PDF مباشر)
  - ↗️ تتبع على موقع NP
  - 📊 حالة الشحنة (Auto-track عند فتح التبويب)
  - ⏰ تاريخ التسليم المتوقع
  - ✅ تأكيد التسليم الفعلي

- **Fallback (بدون API Key أو شركة شحن أخرى):**
  - إدخال يدوي لرقم التتبع + تكلفة الشحن
  - رابط تتبع خارجي

#### 9B.3 — تغيير اسم التبويب
- AR: "الشحن والكونتينرات" → **"التوصيل والشحن"**
- EN: "Shipping & Containers" → **"Delivery & Shipping"**

### الملفات:
| الملف | النوع |
|-------|-------|
| `supabase/functions/nova-poshta/index.ts` | 🆕 جديد |
| `supabase/functions/nova-poshta/deno.json` | 🆕 جديد |
| `src/features/trade/components/tabs/CustomerShippingTab.tsx` | ✏️ تكامل NP |
| `src/i18n/locales/ar.json` | ✏️ اسم التبويب |
| `src/i18n/locales/en.json` | ✏️ اسم التبويب |

### تدفق إنشاء البوليصة:
```
المستخدم يختار "شركة شحن" → "نوفايا بوشتا"
         ↓
يبحث عن مدينة المستلم → NP API searchSettlements
         ↓
يختار فرع الاستلام → NP API getWarehouses
         ↓
يملأ الوزن والوصف → يضغط "إنشاء بوليصة"
         ↓
Edge Function → NP API InternetDocument.save → رقم TTN
         ↓
يُحفظ TTN في الفاتورة + رابط التتبع + طباعة PDF
         ↓
Auto-tracking عند فتح التبويب → NP API getStatusDocuments
```

### هيكل إعدادات الشركة المطلوب (في `companies.integrations`):
```json
{
    "nova_poshta": {
        "api_key": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "sender_ref": "uuid-of-sender-counterparty",
        "sender_city_ref": "uuid-of-sender-city",
        "sender_address_ref": "uuid-of-sender-warehouse",
        "sender_contact_ref": "uuid-of-sender-contact",
        "sender_phone": "+380XXXXXXXXX"
    }
}
```

---

## 🔷 المرحلة 13A: تفعيل Gemini AI
**الأولوية:** 🟢 عالية — مطلوب للإنتاج
**الجهد:** 0.5h

### الخطوات:
1. **إضافة API Key:**
   ```bash
   supabase secrets set GOOGLE_AI_KEY=your-gemini-api-key
   ```

2. **Deploy Edge Function:**
   ```bash
   supabase functions deploy nexa-agent
   ```

3. **اختبار:**
   - فتح أمر بيع → تبويب "وكيل نيكسا" → محادثة
   - التأكد أن المؤشر 🟢 (Gemini Connected)

---

## 🔷 المرحلة 13B: إعدادات Nova Poshta
**الأولوية:** 🟢 عالية — مطلوب لتشغيل البوالص
**الجهد:** 2-3h

### الخطوات:
1. **صفحة إعدادات NP في الشركة:**
   - حقل API Key مع زر اختبار الاتصال
   - اختيار المرسل (Counterparty) من NP API
   - اختيار مدينة المرسل + فرع الإرسال
   - اختيار جهة الاتصال + رقم الهاتف
   - حفظ الكل في `companies.integrations.nova_poshta`

2. **Deploy Edge Function:**
   ```bash
   supabase functions deploy nova-poshta
   ```

3. **اختبار:**
   - فتح فاتورة → تبويب "التوصيل والشحن" → اختيار نوفا بوشتا
   - التأكد أن المؤشر 🟢 (Connected)
   - بحث مدينة → اختيار فرع → إنشاء بوليصة

### المتطلبات:
- ✅ Edge Function `nova-poshta` جاهزة
- ✅ واجهة `CustomerShippingTab` تدعم NP API
- ✅ عمود `integrations` في جدول `companies`
- ✅ صفحة إعدادات IntegrationsTab
- 🔲 حساب Nova Poshta مع API Key
- 🔲 Deploy Edge Function

---

## ✅ المرحلة 9B+ — تكامل الشحن الكامل (مُكتملة 2026-02-11)

### الهدف:
تعزيز تكامل Nova Poshta بخيارات الدفع الكاملة وتعبئة تلقائية من بيانات الفاتورة والعميل.

### الميزات المُنفذة:

#### 9B+.1 — خيارات الدفع الكاملة:
- **طريقة دفع الشحن** (`PaymentMethod`): نقداً (Cash) / تحويل بنكي (NonCash)
- **الدفع عند الاستلام (COD)**: مفتاح تشغيل/إيقاف مع تفعيل `BackwardDeliveryData`
- **مبلغ COD**: يُملأ تلقائياً من `total_amount`
- **من يدفع عمولة التحويل** (`RedeliveryPayer`): المستلم / المرسل
- **طريقة استلام الأموال**: تحويل بنكي (MoneyTransfer) / نقداً (Money)
- **ملخص COD**: بادج أخضر يوضح المبلغ ومن يدفع العمولة

#### 9B+.2 — تعبئة تلقائية من بيانات العميل والفاتورة:
- **اسم المستلم** ← `customer_name` / `selectedAddress.recipient_name`
- **هاتف المستلم** ← `customer_phone` / `selectedAddress.phone`
- **وصف البضاعة** ← يُبنى تلقائياً من أسماء الأصناف (`items[].material_name_ar/en`)
- **القيمة المُصرح بها** ← `total_amount` (للتأمين)
- **عدد الطرود** ← تقدير من عدد الأصناف (max 10)
- **ملخص الفاتورة** ← رقم المستند + عدد الأصناف + الإجمالي (بادج indigo)

#### 9B+.3 — خيارات NP إضافية:
- **نوع البضاعة** (`CargoType`): Cargo / Documents / TiresWheels / Pallet
- **القيمة المُصرح بها** (`Cost`): حقل قابل للتعديل للتأمين

### الملفات المُعدلة:
- `src/features/trade/components/tabs/CustomerShippingTab.tsx` (~1800 سطر)

---

## ✅ المرحلة 13B — إعدادات التكاملات (مُكتملة 2026-02-11)

### الهدف:
تبويب جديد في إعدادات النظام لإدارة تكاملات النظام الخارجية.

### المكونات المُنفذة:
- **IntegrationsTab.tsx** (~370 سطر) — قسمين:
  - 🔴 **Nova Poshta**: API Key + اختبار الاتصال + بيانات المرسل
  - 🟣 **Gemini AI**: مفتاح تشغيل/إيقاف + اختيار الموديل
  - 🔵 **تكاملات مستقبلية** (بوابات دفع, SMS, متاجر)
- **SystemConfigPage.tsx** — إضافة التبويب بأيقونة Link2
- **ar.json / en.json** — مفاتيح الترجمة
- **20260211_company_integrations.sql** — عمود `integrations` JSONB

---

## ✅ المرحلة 10 — تخصيص التبويبات حسب نوع المستند (مُكتملة 2026-02-11)

### الهدف:
كل نوع مستند (فاتورة بيع, أمر شراء, عرض سعر, مرتجع...) يعرض فقط التبويبات المناسبة له.

### التنفيذ:
- أعيد كتابة `tradeConfigs.ts` بالكامل مع:
  - `TAB` object مشترك يحدد كل تبويب
  - `TRADE_ACTIONS` و `TOTAL_STAT` مشتركة
  - كل نوع مستند يحدد `tabs` الخاصة به بشكل صريح

### خريطة التبويبات النهائية:

| التبويب | فاتورة بيع | أمر شراء | عرض سعر | مرتجع | حاوية |
|--------|-----------|-----------|---------|---------|--------|
| الأصناف | ✅ | ✅ | ✅ | ✅ | ✅ |
| متصفح المواد | ✅ | ✅ | ✅ | ✅ | ❌ |
| الشحن | ✅ | ❌ | ❌ | ❌ | ✅ (بحري) |
| السداد | ✅ | ✅ | ❌ | ✅ | ✅ |
| القيد المحاسبي | ✅ | ✅ | ❌ | ✅ | ✅ |
| NexaAgent | ✅ | ❌ | ❌ | ❌ | ❌ |
| المصاريف | ❌ | ❌ | ❌ | ❌ | ✅ |

### الملفات المُعدلة:
- `src/features/accounting/components/unified/configs/tradeConfigs.ts` — أعيد كتابته (287 سطر)

### أنواع المستندات وتبويباتها:
| المستند | التبويبات |
|---------|-----------|
| `trade_order` (أمر بيع) | الأصناف + متصفح المواد + السداد + الشحن + NexaAgent + المرفقات + النشاط |
| `trade_invoice` (فاتورة بيع) | نفس أمر البيع |
| `trade_quotation` (عرض سعر) | الأصناف + متصفح المواد + المرفقات + النشاط |
| `trade_request` (طلب شراء) | الأصناف + متصفح المواد + المرفقات + النشاط |
| `trade_receipt` (استلام بضاعة) | الأصناف + متصفح المواد + المرفقات + النشاط |
| `trade_return` (مرتجع) | الأصناف + متصفح المواد + السداد + المرفقات + النشاط |
| `trade_delivery` (إذن تسليم) | الأصناف + الشحن + المرفقات + النشاط |
| `trade_reservation` (حجز) | الأصناف + متصفح المواد + المرفقات + النشاط |
| `trade_container` (حاوية) | الأصناف + الشحن البحري + الدفع والمصاريف + بنود البضائع + المرفقات + النشاط |

---

## 🔷 الجولة 5: دورة الكونتينر الكاملة — التفاصيل

### ✅ المرحلة 13A: تبويب الدفعات والمصاريف الموحّد (مُكتملة 2026-02-11)

**الملف:** `PurchasePaymentTab.tsx` (500+ سطر)

**الأقسام الخمسة:**
1. ملخص المدفوعات (إجمالي الفاتورة، المصاريف، التكلفة الإجمالية، المدفوع، المتبقي + شريط تقدم)
2. سند صرف / دفعة للمورد → ينشئ `payment_vouchers` مباشرة
3. مصاريف إضافية (شحن/جمارك/تأمين/أخرى) مع دفع مفرد لكل مصروف
4. سجل سندات الصرف (يسحب من `payment_vouchers` المرتبطة)
5. معاينة القيد المحاسبي (مدين: مشتريات + مصاريف | دائن: ذمم دائنة + صندوق)

---

### ✅ المرحلة 13B-1: Migration — ربط الفواتير بالبنود [~1h] — مُكتمل 2026-02-11

**الهدف:** إضافة أعمدة مفقودة في `shipment_items` لربط كل بند بفاتورته ومورده.

**Migration SQL:**
```sql
-- إضافة ربط الفواتير والموردين ببنود الكونتينر
ALTER TABLE shipment_items
  ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID REFERENCES purchase_invoices(id),
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- فهرسة
CREATE INDEX IF NOT EXISTS idx_shipment_items_invoice
  ON shipment_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_supplier
  ON shipment_items(supplier_id);
```

**الحالة الحالية لجدول `shipment_items`:**
- ✅ `material_id`, `color_id`, `product_id` — المادة
- ✅ `expected_quantity`, `received_quantity` — الكميات
- ✅ `reserved_quantity`, `sold_quantity` — الحجوزات
- ✅ `unit_price`, `total_price` — سعر المورد
- ✅ `provisional_unit_cost`, `final_unit_cost` — التكاليف
- ✅ `allocated_costs` — المصاريف الموزعة
- ❌ `purchase_invoice_id` — **مفقود** → يُضاف
- ❌ `supplier_id` — **مفقود** → يُضاف

---

### ✅ المرحلة 13B-2: بنود الكونتينر — 3 أنماط عرض + فلاتر [~3-4h] — مُكتمل 2026-02-11

**الملف الجديد:** `ShipmentItemsTab.tsx`

#### أنماط العرض الثلاثة:
```
┌─────────────────────────────────────────────────────┐
│  🔀 شريط التبديل:                                   │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────┐   │
│  │ 📊 جدول  │ │ 🏢 بالمورد  │ │ 📄 بالفاتورة  │   │
│  └──────────┘ └──────────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**النمط 1 — جدول مسطح (Flat Table):**
- كل بنود الكونتينر في جدول واحد
- شريط فلاتر بالأعلى: المورد | الفاتورة | المادة | اللون | الحالة
- بحث نصي سريع
- ترتيب بأي عمود

**النمط 2 — مجمّع بالمورد (Grouped by Supplier):**
- Accordion لكل مورد
- عنوان: اسم المورد + عدد المواد + إجمالي القيمة
- محتوى: جدول مصغر بمواد المورد

**النمط 3 — مجمّع بالفاتورة (Grouped by Invoice):**
- Accordion لكل فاتورة
- عنوان: رقم الفاتورة + المورد + التاريخ + الإجمالي
- محتوى: جدول بنود الفاتورة

#### أعمدة الجدول (حسب الصلاحيات — انظر 13B-4):

| العمود | الكود | مرئي لـ |
|--------|-------|---------|
| اسم المادة | `item_description` | 🟢 الجميع |
| كود المادة | `material.code` | 🟢 الجميع |
| اللون | `color.name` | 🟢 الجميع |
| الوحدة | `unit` | 🟢 الجميع |
| الكمية المتوقعة | `expected_quantity` | 🟢 الجميع |
| الكمية المستلمة | `received_quantity` | 🟢 الجميع |
| الكمية المحجوزة | `reserved_quantity` | 🟢 الجميع |
| الكمية المتاحة | `expected - reserved - sold` | 🟢 الجميع |
| السعر للعميل (متوقع) | حساب: تكلفة + هامش | 🟡 sales + manager + admin |
| سعر المورد | `unit_price` | 🔴 manager + admin فقط |
| التكلفة المتوقعة | `provisional_unit_cost` | 🔴 manager + admin فقط |
| التكلفة الفعلية | `final_unit_cost` | 🔴 manager + admin فقط |
| المصاريف الموزعة | `allocated_costs` | 🔴 manager + admin فقط |
| Landed Cost | حساب: سعر + مصاريف | 🔴 manager + admin فقط |
| المورد | `supplier_name` | 🔴 manager + admin فقط |
| الفاتورة | `invoice_number` | 🔴 manager + admin فقط |

---

### ✅ المرحلة 13B-3: سلة حجوزات الترانزيت [~3-4h] — مُكتمل 2026-02-11

**الملف الجديد:** `TransitReservationCart.tsx`

#### سير العمل (Workflow):
```
╔═══════════════════════════════════════════════════════╗
║  سلة حجوزات الكونتينر (Transit Reservation Cart)    ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  1. اختيار العميل (بحث / القائمة المنسدلة)            ║
║     └── يظهر: الرصيد + حد الائتمان + الحجوزات السابقة ║
║                                                       ║
║  2. تحديد المواد من البنود:                            ║
║     ☑️ قماش بوليستر أحمر — الكمية المتاحة: 800م       ║
║        └── كمية الحجز: [200] م                        ║
║     ☑️ قماش كتان طبيعي — الكمية المتاحة: 500م        ║
║        └── كمية الحجز: [150] م                        ║
║                                                       ║
║  3. 🛒 السلة (Floating Drawer في الأسفل):            ║
║     ┌─────────────────────────────────────────────┐   ║
║     │ 👤 العميل: شركة النور                       │   ║
║     │ ─────────────────────────────────            │   ║
║     │ بوليستر أحمر  200م × $5.80    = $1,160      │   ║
║     │ كتان طبيعي   150م × $9.20    = $1,380      │   ║
║     │ ─────────────────────────────────            │   ║
║     │              الإجمالي المتوقع: $2,540        │   ║
║     │ ─────────────────────────────────            │   ║
║     │ □ دفعة مقدمة: [500]                         │   ║
║     │ ─────────────────────────────────            │   ║
║     │ [❌ إلغاء]           [✅ تأكيد الحجز]        │   ║
║     └─────────────────────────────────────────────┘   ║
║                                                       ║
║  4. التأكيد → ينشئ:                                   ║
║     ├── سجل transit_reservations                      ║
║     ├── يحدّث reserved_quantity (trigger تلقائي)       ║
║     ├── دفعة مقدمة → payment_receipts (اختياري)       ║
║     └── إشعار للمبيعات                                 ║
║                                                       ║
║  5. عند وصول الكونتينر:                                ║
║     ├── الحالة: pending → ready                       ║
║     ├── إشعار للعميل / المبيعات                        ║
║     └── تحويل إلى فاتورة مبيعات                        ║
╚═══════════════════════════════════════════════════════╝
```

#### الفصل عن سلة المبيعات:
```
╔════════════════════════╦════════════════════════╗
║ 🟢 سلة المبيعات       ║ 🔵 سلة الترانزيت      ║
╠════════════════════════╬════════════════════════╣
║ المصدر: مخزون حالي    ║ المصدر: بضائع بالطريق  ║
║ الجدول: sales_orders   ║ الجدول: transit_reserv. ║
║ الأسعار: نهائية مؤكدة  ║ الأسعار: تقديرية       ║
║ التسليم: فوري          ║ التسليم: عند الوصول     ║
║ الدفعة: حسب الشروط    ║ الدفعة: مقدمة اختيارية ║
║ الموقع: المبيعات       ║ الموقع: الكونتينر      ║
╚════════════════════════╩════════════════════════╝

عند وصول الكونتينر:
  transit_reservation → sales_invoice
  الدفعة المقدمة تُخصم من إجمالي الفاتورة
```

#### قاعدة البيانات (موجود ✅):
- `transit_reservations` — جدول كامل مع:
  - `customer_id, shipment_id, shipment_item_id`
  - `reserved_quantity, unit_price, total_amount`
  - `advance_amount, advance_received, advance_receipt_id`
  - `status`: pending → confirmed → ready → delivered → cancelled
  - `sales_invoice_id` — لربط بالفاتورة عند التسليم
- Trigger `trg_update_reserved_quantity` — يحدّث `shipment_items.reserved_quantity` تلقائياً
- Function `get_available_quantity_for_reservation()` — يحسب الكمية المتاحة

---

### 🔴 المرحلة 13B-4: RBAC — صلاحيات الأسعار والبيانات [~2-3h]

**الهدف:** التحكم في ما يراه كل مستخدم حسب دوره.

#### مصفوفة الصلاحيات:
```
╔══════════════════════════╦═════════╦═════════╦═══════╦════════╗
║ البيان                    ║ موظف    ║ مبيعات  ║ مدير  ║ أدمن  ║
║                          ║ employee║ sales   ║manager║ admin  ║
╠══════════════════════════╬═════════╬═════════╬═══════╬════════╣
║ اسم المادة + الكود       ║   ✅    ║   ✅    ║  ✅   ║   ✅   ║
║ اللون + الوحدة           ║   ✅    ║   ✅    ║  ✅   ║   ✅   ║
║ الكمية (متوقعة/مستلمة)   ║   ✅    ║   ✅    ║  ✅   ║   ✅   ║
║ الكمية المحجوزة/المتاحة  ║   ✅    ║   ✅    ║  ✅   ║   ✅   ║
║ السعر المتوقع للعميل     ║   ❌    ║   ✅    ║  ✅   ║   ✅   ║
║ هامش الربح المتوقع       ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ سعر المورد               ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ التكلفة المتوقعة/الفعلية  ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ المصاريف الموزعة         ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ Landed Cost              ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ اسم المورد               ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ رقم الفاتورة (مشتريات)   ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ التفاصيل المحاسبية       ║   ❌    ║   ❌    ║  ❌   ║   ✅   ║
╠══════════════════════════╬═════════╬═════════╬═══════╬════════╣
║ إنشاء حجز ترانزيت       ║   ❌    ║   ✅    ║  ✅   ║   ✅   ║
║ إلغاء حجز ترانزيت       ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ تحويل حجز → فاتورة      ║   ❌    ║   ✅    ║  ✅   ║   ✅   ║
║ تعديل المصاريف           ║   ❌    ║   ❌    ║  ✅   ║   ✅   ║
║ إغلاق الكونتينر          ║   ❌    ║   ❌    ║  ❌   ║   ✅   ║
╚══════════════════════════╩═════════╩═════════╩═══════╩════════╝
```

#### التنفيذ التقني:
```tsx
// hook جديد: useContainerPermissions.ts
const useContainerPermissions = () => {
  const { userRole } = useAuth();
  
  return {
    canSeeCostPrice:     ['manager', 'admin'].includes(userRole),
    canSeeSupplierInfo:  ['manager', 'admin'].includes(userRole),
    canSeeMargin:        ['manager', 'admin'].includes(userRole),
    canSeeClientPrice:   ['sales', 'manager', 'admin'].includes(userRole),
    canSeeAccounting:    ['admin'].includes(userRole),
    canCreateReservation:['sales', 'manager', 'admin'].includes(userRole),
    canCancelReservation:['manager', 'admin'].includes(userRole),
    canEditExpenses:     ['manager', 'admin'].includes(userRole),
    canFinalizeContainer:['admin'].includes(userRole),
  };
};
```

---

### 🟠 المرحلة 13C: مصاريف الكونتينر — متوقع + فعلي [~4-5h]

**الملف:** `ShipmentCostsTab.tsx`

**التصميم المزدوج (Expected vs Actual):**
```
╔══════════════════════════════════════════════════════════╗
║ نوع المصروف │ الشركة  │ متوقع    │ فعلي     │ الفرق   ║
╠══════════════════════════════════════════════════════════╣
║ 🚢 شحن بحري │ ساشا   │ $3,000   │ $3,200   │ +$200  ║
║ 🛃 جمارك    │ أبو حسن│ $2,500   │ (فارغ)   │ —      ║
║ 🛡️ تأمين    │ AIG    │ $800     │ $750     │ -$50   ║
║ 🚚 نقل داخلي│ الأمل  │ $500     │ (فارغ)   │ —      ║
╠══════════════════════════════════════════════════════════╣
║ الإجمالي              │ $6,800   │ $3,950   │ +$150  ║
╚══════════════════════════════════════════════════════════╝

كل سطر يحتوي:
  [حالة الفاتورة: متوقع/مُفوتر] [حالة الدفع: غير مدفوع/جزئي/مدفوع]
  [زر: تحويل متوقع→فعلي] [زر: تسجيل دفعة]
```

**مراحل وصول البضاعة (تفعّل تحويل المتوقع → الفعلي):**
1. **وصول الميناء** → تفعيل رسوم الشحن البحري
2. **الجمارك** → تفعيل رسوم الجمارك + الفحص
3. **التخليص** → تفعيل رسوم التخليص
4. **النقل** → تفعيل رسوم النقل الداخلي
5. **الاستلام** → تفعيل رسوم التخزين (إن وجدت)

---

### 🟠 المرحلة 13D: توزيع المصاريف — Landed Cost UI [~3-4h]

**الملف:** `CostAllocationTab.tsx`

**طرق التوزيع:**
- **حسب القيمة** (by_value): نسبة قيمة المادة من إجمالي البضاعة
- **حسب الكمية** (by_quantity): نسبة كمية المادة من إجمالي الكمية
- **حسب الوزن** (by_weight): نسبة وزن المادة
- **يدوي** (manual): المستخدم يوزع يدوياً

**الواجهة:**
```
┌─────────────────────────────────────────────────────┐
│ طريقة التوزيع: [حسب القيمة ▼]   [🔄 إعادة حساب]   │
├─────────────────────────────────────────────────────┤
│ المادة      │ سعر المورد │ مصاريف موزعة │ تكلفة نهائية│
│ بوليستر أحمر│ $5.00      │ $0.80        │ $5.80       │
│ كتان طبيعي  │ $8.00      │ $1.20        │ $9.20       │
├─────────────────────────────────────────────────────┤
│ [🔒 تثبيت التكاليف — إغلاق الكونتينر]              │
│ ⚠️ تحذير: لا يمكن التراجع بعد الإغلاق               │
└─────────────────────────────────────────────────────┘
```

**عند الإغلاق:**
1. `shipment_items.final_unit_cost` يتم تعبئته
2. `fabric_rolls.estimated_landed_cost` يتم تحديثه
3. `shipments.is_cost_finalized = true`
4. القيد المحاسبي النهائي يُنشأ

---

### 🟠 المرحلة 13E: القيود المحاسبية للكونتينر [~3-4h]

**الملف:** `ShipmentJournalTab.tsx`

**نوعان من القيود:**

1. **قيد مؤقت (عند الشحن):**
   - مدين: بضاعة بالطريق (Goods in Transit)
   - دائن: ذمم دائنة — مورد

2. **قيد نهائي (عند الإغلاق):**
   - مدين: المخزون (بالتكلفة النهائية)
   - دائن: بضاعة بالطريق
   - الفرق → حساب فروقات التكلفة

---

### 📋 خريطة تبويبات الكونتينر المحدّثة:

| # | التبويب | الوصف | المرحلة |
|---|---------|-------|---------|
| 1 | معلومات الشحنة | الهيدر + التواريخ + الحالة | موجود |
| 2 | الشحن البحري | المسار + التتبع + المستندات | موجود |
| 3 | **بنود البضائع** 🆕 | 3 أنماط + فلاتر + RBAC | 13B-2 |
| 4 | **حجوزات الترانزيت** 🆕 | السلة + قائمة الحجوزات | 13B-3 |
| 5 | **الدفع والمصاريف** ✅ | سندات صرف + مصاريف | 13A (مكتمل) |
| 6 | **مصاريف متوقع/فعلي** ✅ | المصاريف المزدوجة + Variance + RBAC | **16 (مكتمل)** |
| 7 | **توزيع التكاليف** 🆕 | Landed Cost Allocation | 13D |
| 8 | **القيود المحاسبية** 🆕 | قيد مؤقت + قيد نهائي | 13E |
| 9 | المرفقات | PDF uploads | موجود |
| 10 | النشاط | Activity log | موجود |

---

## ✅ المرحلة 16 — مصاريف الكونتينر المتقدمة (مُكتملة 2026-02-12)

### الهدف:
إعادة بناء تبويب مصاريف الكونتينر `ContainerExpensesTab` بالكامل مع اتصال مباشر بقاعدة البيانات، ودعم المبالغ المتوقعة والفعلية، وتتبع الفروقات، وملخص التكاليف.

### الملف المعدّل:
- `tabs/ContainerExpensesTab.tsx` — إعادة بناء كاملة (من 184 سطر → ~470 سطر)

### الميزات:
1. **Self-Fetching Pattern** — جلب من DB مباشرة عند وجود `containerId`
2. **المبالغ المزدوجة** — Expected / Actual مع Variance تلقائي
3. **RBAC** — أعمدة المبالغ محمية عبر `useTradePermissions`
4. **11 نوع مصروف** — freight, customs, insurance, handling, transport, clearance, storage, inspection, documentation, demurrage, other
5. **حالة الدفع** — pending / partial / paid
6. **بطاقات ملخص** — قيمة البضاعة + المصاريف + Landed Cost + المدفوع/المطلوب
7. **تنبيه تجاوز** — تحذير عند تجاوز الفعلي للمتوقع

---

## ✅ المرحلة 17 — إعادة تصميم إنشاء الكونتينر (مُكتملة 2026-02-12)

### الهدف:
إصلاح مسار إنشاء الكونتينر الذي كان يفشل بخطأ `tenant_id null` وإعادة تصميم النموذج ليكون مُخصصاً للكونتينر بدلاً من استخدام نموذج الفاتورة العام.

### المشاكل المُحلّة:

| # | المشكلة | الحل |
|---|---------|------|
| 1 | خطأ `tenant_id null` عند الحفظ | مسار حفظ مخصص يجلب `tenant_id` من الجلسة |
| 2 | الحفظ في `shipments` بدلاً من `containers` | تغيير الجدول إلى `containers` |
| 3 | حقول إلزامية بلا داعٍ (مورد، مستودع، عملة) | نموذج مخصص يجعلها اختيارية |
| 4 | لا يوجد رقم متسلسل تلقائي | `getNextContainerNumber()` → `CNT-XXXX` |
| 5 | قاعدة بيانات مقروءة من `shipments` | تغيير إلى `containers` |

### الملفات المعدّلة/المضافة:

| الملف | التغيير |
|-------|---------|
| `tabs/ContainerMainTab.tsx` | **🆕 جديد** — تبويب مخصص لبيانات الكونتينر |
| `containersService.ts` | **+** `getNextContainerNumber()` + تحسين `createContainer()` |
| `UnifiedAccountingSheet.tsx` | **+** مسار حفظ خاص للكونتينر في `handleTradeSave` |
| `TradeMainTab.tsx` | ربط `ContainerMainTab` عند نوع الكونتينر |
| `ContainersList.tsx` | تحويل من `shipments` → `containers` + إزالة `saveContainerMutation` |

### مبادئ التصميم (Best Practices):

1. **الكونتينر كيان مستقل** — ليس فاتورة، له جدوله الخاص
2. **الحد الأدنى للإنشاء** = رقم الكونتينر فقط
3. **شركة الشحن اختيارية** — تُثبّت عند أول دفعة
4. **رقم مرجعي `CNT-XXXX`** — يُولّد تلقائياً عند الحفظ
5. **المورد ≠ شركة الشحن** — الموردون مرتبطون بالفواتير

### هيكل النموذج الجديد (`ContainerMainTab`):

```
Section 1: بيانات الكونتينر (Container Identity)
├── الرقم المرجعي (AUTO-GEN)
├── رقم الكونتينر (Container Number) *مطلوب*
├── رقم البوليصة (B/L)
├── بلد المنشأ
├── حجم الكونتينر (20ft/40ft/40HC/45ft)
├── نوع الكونتينر (Dry/Reefer/Open/Flat)
└── الحالة (Ordered → In Transit → At Port → Customs → Received → Closed)

Section 2: شركة الشحن (اختياري)
├── شركة الشحن / الوكيل (من قائمة الموردين)
└── خط الشحن الدولي (MSC, Maersk, etc.)

Section 3: مسار الشحن والتواريخ
├── ميناء التحميل
├── ميناء الوصول
├── اسم السفينة
├── تاريخ الإنشاء
├── ETD (موعد المغادرة)
└── ETA (موعد الوصول)

Section 4: ملاحظات
```

### مراحل مستقبلية مرتبطة:

| # | الميزة | الحالة |
|---|--------|--------|
| 17A | ربط الفواتير بالكونتينر (container ↔ purchase_invoices) | 🔲 مخطط |
| 17B | حجز بنود الكونتينر (عدم ظهورها في كونتينرات أخرى) | 🔲 مخطط |
| 17C | تثبيت شركة الشحن عند أول دفعة | 🔲 مخطط |

---

## 📝 المرحلة 18 — صفحة شركات مصاريف الكونتينرات (Container Vendors Management)

### الهدف:
إنشاء صفحة مخصصة لإدارة شركات الخدمات المرتبطة بالكونتينرات (شحن، جمركة، نقل، تأمين) مع ربطها التلقائي بالشجرة المحاسبية وعرض الكونتينرات التابعة لكل شركة.

### المشكلة الحالية:
- لإضافة شركة شحن يجب الذهاب إلى إدارة الموردين وتحديد التصنيف يدوياً
- لا يوجد ربط مباشر مع الحساب المحاسبي عند الإنشاء
- لا يمكن رؤية الكونتينرات المرتبطة بكل شركة

### الموقع المقترح:
```
/purchases/container-vendors  ← صفحة جديدة في sidebar المشتريات
```

### الهيكل المقترح:

```
صفحة: شركات مصاريف الكونتينرات
│
├── FilterBar (تصفية التصنيف):
│   [الكل] [🚢 شحن] [📋 جمركة] [🚛 نقل] [🛡️ تأمين] [أخرى]
│
├── عرض الشركات (NexaDataTable / Cards):
│   ├── اسم الشركة
│   ├── التصنيف (Badge ملون)
│   ├── الحساب المحاسبي المرتبط (payable_account_id → chart_of_accounts)
│   ├── عدد الكونتينرات المرتبطة
│   ├── إجمالي المبالغ (مدفوع / مستحق)
│   └── حالة (نشط/غير نشط)
│
├── إضافة شركة جديدة (Sheet/Dialog):
│   ├── بيانات أساسية (اسم، بريد، هاتف، بلد)
│   ├── التصنيف (shipping_company / customs_agent / transport_company / insurance_company)
│   ├── إنشاء حساب محاسبي تلقائي في الشجرة:
│   │   └── مصاريف → مصاريف الشحن → [اسم الشركة]
│   └── ملاحظات
│
└── تفاصيل الشركة (UnifiedAccountingSheet):
    ├── Tab 1: معلومات الشركة (الاسم، العنوان، التواصل)
    ├── Tab 2: الحساب المحاسبي + الرصيد (مدين/دائن)
    ├── Tab 3: الكونتينرات المرتبطة (grid)
    └── Tab 4: سجل المعاملات/الدفعات
```

### التصنيفات المدعومة:

| التصنيف | `vendor_category` | الأيقونة | اللون | الحساب المحاسبي الافتراضي |
|---------|------------------|---------|-------|---------------------------|
| شركات الشحن | `shipping_company` | 🚢 Ship | أزرق | مصاريف → شحن بحري |
| الجمركة / التخليص | `customs_agent` | 📋 FileCheck | برتقالي | مصاريف → تخليص جمركي |
| شركات النقل | `transport_company` | 🚛 Truck | أخضر | مصاريف → نقل بري |
| شركات التأمين | `insurance_company` | 🛡️ Shield | أرجواني | مصاريف → تأمين |
| أخرى | `other_service` | ⚙️ Settings | رمادي | مصاريف → أخرى |

### التكامل مع النظام:

| المكون | التكامل |
|--------|--------|
| `suppliers` table | يستخدم `vendor_category` الموجود للفلترة |
| `chart_of_accounts` | إنشاء حساب تلقائي عند تعريف شركة جديدة |
| `containers.supplier_id` | ربط الكونتينر بشركة الشحن |
| `container_expenses` | ربط المصاريف بالشركات |
| `ContainerMainTab` | نفس القائمة تظهر في dropdown شركة الشحن |
| `ContainerExpensesTab` | شركات الخدمات تظهر كخيارات عند إضافة مصروف |

### الأولوية والتسلسل:

| المرحلة | الخطوة | الوصف |
|---------|--------|--------|
| 18A | الصفحة الأساسية + الفلتر + الجدول | إنشاء `ContainerVendorsPage.tsx` مع NexaDataTable + filter bar |
| 18B | نموذج الإضافة + الربط بالشجرة | Sheet إضافة شركة مع إنشاء حساب محاسبي تلقائي |
| 18C | تفاصيل الشركة | UnifiedAccountingSheet مع tabs (معلومات + حساب + كونتينرات + معاملات) |
| 18D | الربط مع Sidebar | إضافة رابط في sidebar المشتريات |

### الملفات المتوقعة:

| الملف | الوصف |
|-------|--------|
| `features/purchases/pages/ContainerVendorsPage.tsx` | الصفحة الرئيسية |
| `services/containerVendorsService.ts` | خدمة CRUD + إنشاء حساب محاسبي |
| `features/purchases/components/AddContainerVendorSheet.tsx` | نموذج الإضافة |
| `i18n/locales/{ar,en}.json` | ترجمات |

---

## 📝 المرحلة 23A-Sheet — شيت إدارة الفروع (Branch Management Sheet)

### الهدف:
إنشاء شيت مُخصص لإدارة الفروع باستخدام المكون المشترك `UnifiedAccountingSheet`، يعرض جميع بيانات الفرع والكيانات المرتبطة به في تبويبات منظمة.

### الأولوية: 🟡 متوسطة-عالية — ضروري قبل تفعيل طلبات الفروع (Phase 23B)
### الجهد المُقدّر: 6-8 ساعات

### المشكلة الحالية:
- جدول `branches` موجود في DB لكن بدون واجهة إدارة
- لا يمكن إضافة/تعديل/حذف فروع من الواجهة
- لا يوجد ربط مرئي بين الفرع والمستودعات والصناديق والمستخدمين
- `branches` لا يحتوي على `tenant_id` (مشكلة multi-tenancy)

### البنية — مبني على `UnifiedAccountingSheet`:

```
UnifiedAccountingSheet (docType: 'branch')
│
├── Tab 1: 📋 بيانات الفرع (BranchInfoTab)
│   ├── اسم الفرع (عربي + إنجليزي)
│   ├── العنوان
│   ├── الهاتف + البريد الإلكتروني
│   ├── هل هو الفرع الرئيسي (is_main)
│   ├── المدينة / المنطقة
│   ├── الحالة (نشط / غير نشط)
│   └── ملاحظات
│
├── Tab 2: 🏭 المستودعات (BranchWarehousesTab)
│   ├── قائمة المستودعات المرتبطة بهذا الفرع (warehouses WHERE branch_id = ?)
│   ├── إضافة / فصل مستودع عن الفرع
│   ├── عرض: اسم المستودع + النوع + الحالة + عدد المواد
│   └── الانتقال السريع لتفاصيل المستودع
│
├── Tab 3: 💰 الصناديق والحسابات (BranchFundsTab)
│   ├── صناديق نقدية مرتبطة بالفرع (cash_accounts WHERE branch_id = ?)
│   ├── حسابات بنكية مرتبطة
│   ├── عرض: اسم الصندوق + الرصيد الحالي + العملة + الحالة
│   └── إضافة صندوق جديد / ربط حساب
│
├── Tab 4: 👥 المستخدمون (BranchUsersTab)
│   ├── قائمة المستخدمين المنتسبين للفرع (user_profiles WHERE branch_id = ?)
│   ├── عرض: الاسم + الدور + البريد + آخر نشاط + الحالة
│   ├── نقل مستخدم لفرع آخر
│   └── إضافة مستخدم جديد للفرع
│
├── Tab 5: 🔐 الصلاحيات (BranchPermissionsTab)
│   ├── مصفوفة صلاحيات الفرع:
│   │   ├── هل يمكن للفرع إنشاء طلبات شراء؟
│   │   ├── حد الشراء الأقصى (بدون موافقة)
│   │   ├── هل يمكن إنشاء فواتير مبيعات؟
│   │   ├── هل يمكن إجراء تحويلات بين المستودعات؟
│   │   └── صلاحيات إضافية قابلة للتخصيص
│   └── سجل التغييرات
│
├── Tab 6: 📎 المرفقات (DocumentAttachmentsTab — مكون مشترك)
└── Tab 7: 📜 سجل النشاط (ActivityTab — مكون مشترك)
```

### صفحة القائمة — `BranchManagementPage.tsx`:

```
/settings/branches  ← في إعدادات النظام (SystemConfigPage)

┌──────────────────────────────────────────────────────┐
│ 🏢 إدارة الفروع                    [+ إضافة فرع]   │
├──────────────────────────────────────────────────────┤
│ الفرع         │ المدينة │ المستودعات │ المستخدمون │ ⭐ │
│───────────────┼─────────┼────────────┼────────────┼───│
│ الفرع الرئيسي │ كييف   │ 3          │ 5          │ ⭐ │
│ فرع أوديسا    │ أوديسا │ 2          │ 3          │   │
│ فرع خاركيف    │ خاركيف │ 1          │ 2          │   │
└──────────────────────────────────────────────────────┘
```

### الملفات المتوقعة:

| الملف | الوصف |
|-------|-------|
| `features/settings/pages/BranchManagementPage.tsx` | صفحة قائمة الفروع |
| `features/settings/components/BranchInfoTab.tsx` | تبويب بيانات الفرع |
| `features/settings/components/BranchWarehousesTab.tsx` | تبويب المستودعات |
| `features/settings/components/BranchFundsTab.tsx` | تبويب الصناديق |
| `features/settings/components/BranchUsersTab.tsx` | تبويب المستخدمين |
| `features/settings/components/BranchPermissionsTab.tsx` | تبويب الصلاحيات |
| `services/branchService.ts` | خدمة CRUD + ربط الكيانات |
| `configs/branchConfigs.ts` | config للشيت (tabs + actions) |

### DB Migration المطلوب:

```sql
-- 1. إضافة tenant_id لجدول branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id UUID;
-- تعبئة من companies.tenant_id
UPDATE branches b SET tenant_id = c.tenant_id FROM companies c WHERE b.company_id = c.id;
ALTER TABLE branches ALTER COLUMN tenant_id SET NOT NULL;

-- 2. حقول إضافية
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. ربط الصناديق بالفروع (إن لم يكن موجوداً)
ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
```

### التسلسل:
| الخطوة | الوصف | الجهد |
|--------|-------|-------|
| 23A-1 | Migration (tenant_id + حقول) | 30min |
| 23A-2 | `branchConfigs.ts` + ربط مع `documentConfigs` | 30min |
| 23A-3 | `BranchInfoTab.tsx` (بيانات الفرع) | 1h |
| 23A-4 | `BranchWarehousesTab.tsx` (المستودعات) | 1-1.5h |
| 23A-5 | `BranchFundsTab.tsx` (الصناديق) | 1-1.5h |
| 23A-6 | `BranchUsersTab.tsx` (المستخدمين) | 1-1.5h |
| 23A-7 | `BranchPermissionsTab.tsx` (الصلاحيات) | 1h |
| 23A-8 | `BranchManagementPage.tsx` + Sidebar | 1h |

### الترتيب في خريطة التنفيذ:
```
══ الجلسة 1: متصفح المواد V2 ═══════════════════════
 Phase 19: Pop-up الإضافة السريعة + آخر أسعار
 Phase 20: تجميع المواد بالألوان + أرصدة

══ الجلسة 2: العملة + القيد ═════════════════════════
 Phase 21: العملة الديناميكية
 Phase 22: القيد التلقائي + ربط كونتينر

══ الجلسة 3: الفروع ════════════════════════════════
 Phase 23A-Sheet: شيت إدارة الفروع ← يجب قبل 23B
 Phase 23B: طلبات مشتريات الفروع (Backend)

══ الجلسة 4: واجهات الفروع ══════════════════════════
 Phase 24: تبويب طلبات الفروع في فاتورة المدير

══ الجلسة 5: الحجز والتتبع ═════════════════════════
 Phase 25: حجز الفرع + التتبع
```
