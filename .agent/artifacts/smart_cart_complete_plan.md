# 🛒⭐ الخطة الشاملة: سلة التسوق الذكية + المفضلة الموسمية
## Smart Material Cart + Seasonal Favorites — Complete Implementation Plan
## ملتزمة بدستور المشروع (Constitution Compliant)

---

## 📊 ملخص المكونات الثلاثة

| المكون | الوصف | الموقع في UI |
|--------|-------|-------------|
| 🛒 **السلة الذكية** | إضافة مواد أثناء التصفح → مسودة عرض سعر | Widget عائم + Header icon + Drawer |
| ⭐ **المفضلة الموسمية** | تخصيص قائمة المواد الأكثر استخداماً حسب الموسم | صفحة مخصصة + Quick Access |
| 🔔 **مركز الإشعارات المحسّن** | رمز السلة + المفضلة في الهيدر | Header.tsx |

---

## 🏗️ الجزء 1: البنية التحتية (Backend)

### 1.1 جدول المفضلة (جديد) — `user_material_favorites`

```sql
CREATE TABLE IF NOT EXISTS user_material_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    material_id UUID NOT NULL REFERENCES fabric_materials(id) ON DELETE CASCADE,
    
    -- تصنيف موسمي
    season VARCHAR(30), -- 'spring_2026', 'summer_2026', 'winter_2026', 'all_year'
    category VARCHAR(50), -- تصنيف مخصص: 'أكثر طلباً', 'VIP عملاء', 'تصفية'
    
    -- ترتيب مخصص
    sort_order INT DEFAULT 0,
    
    -- ملاحظات المستخدم
    notes TEXT,
    
    -- إحصائيات (يتم تحديثها تلقائياً)
    usage_count INT DEFAULT 0,        -- عدد مرات الاستخدام في الفواتير
    last_used_at TIMESTAMPTZ,         -- آخر استخدام
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, material_id, season)
);

-- فهارس
CREATE INDEX idx_user_favorites_user ON user_material_favorites(user_id);
CREATE INDEX idx_user_favorites_material ON user_material_favorites(material_id);
CREATE INDEX idx_user_favorites_season ON user_material_favorites(season);

-- RLS (كل مستخدم يرى مفضلاته فقط)
ALTER TABLE user_material_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_favorites_select" ON user_material_favorites
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_favorites_insert" ON user_material_favorites
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_favorites_update" ON user_material_favorites
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "users_own_favorites_delete" ON user_material_favorites
    FOR DELETE USING (user_id = auth.uid());
```

### 1.2 البنية الموجودة (لا تحتاج تعديل) ✅

| الجدول | الاستخدام | ملاحظات |
|--------|-----------|---------|
| `quotations` | مسودة عرض السعر | `status: 'draft'` جاهز |
| `sales_invoice_items` | بنود السلة المحفوظة | `quotation_id` + `material_id` + `roll_id` + `warehouse_id` ✅ |
| `user_preferences` | تخزين حالة السلة المؤقتة | `quick_actions` أو حقل JSONB جديد |
| `fabric_materials` | بيانات المادة + السعر | `selling_price` + `unit` ✅ |
| `fabric_rolls` | بيانات الرولونات | `available_length` + `warehouse_id` ✅ |
| `warehouses` | قائمة المستودعات | ✅ |

---

## 🖥️ الجزء 2: واجهة المستخدم (Frontend)

### 2.1 هيكل الملفات الجديدة

```
src/
├── contexts/
│   └── CartContext.tsx                    ← [جديد] سياق السلة (React Context)
├── services/
│   └── quotationService.ts               ← [جديد] خدمة عروض الأسعار
│   └── favoritesService.ts               ← [جديد] خدمة المفضلة
├── hooks/
│   └── useCart.ts                         ← [جديد] هوك السلة
│   └── useFavorites.ts                   ← [جديد] هوك المفضلة
├── components/
│   └── cart/
│       ├── CartFloatingWidget.tsx         ← [جديد] Widget عائم
│       ├── CartDrawer.tsx                 ← [جديد] درج السلة
│       ├── CartItemRow.tsx               ← [جديد] صف بند السلة
│       ├── AddToCartButton.tsx           ← [جديد] زر الإضافة للسلة
│       └── AddToCartDialog.tsx           ← [جديد] نافذة تحديد الكمية
│   └── favorites/
│       ├── FavoriteButton.tsx            ← [جديد] زر المفضلة (⭐)
│       ├── FavoritesPanel.tsx            ← [جديد] لوحة المفضلة
│       └── SeasonFilter.tsx             ← [جديد] فلتر الموسم
├── components/layout/
│   └── Header.tsx                        ← [تعديل] إضافة أيقونات السلة والمفضلة
├── features/accounting/components/unified/tabs/
│   └── MaterialInventoryTab.tsx          ← [تعديل] إضافة أزرار السلة والفلاتر
```

### 2.2 تعديلات الهيدر (`Header.tsx`)

**الحالة الحالية:**
```
[🔍 بحث] ────── [🌐 لغة] [🌙 ثيم] [🔔 إشعارات] [👤 مستخدم]
```

**الحالة الجديدة:**
```
[🔍 بحث] ────── [⭐ مفضلة] [🛒 سلة(3)] [🌐 لغة] [🌙 ثيم] [🔔 إشعارات] [👤 مستخدم]
```

**التفاصيل:**

| الأيقونة | السلوك عند النقر | Badge |
|----------|-----------------|-------|
| ⭐ `Star` | يفتح لوحة المفضلة (Popover) | عدد المفضلة النشطة |
| 🛒 `ShoppingCart` | يفتح درج السلة (Drawer) | عدد البنود في السلة |

---

## 🛒 الجزء 3: السلة الذكية (تفصيل)

### 3.1 Cart Context — State Interface

```typescript
// يلتزم بقانون الخدمات (Law 2) — لا Supabase calls في المكونات

interface CartItem {
  id: string;                    // UUID مؤقت (للتعديل/الحذف المحلي)
  material_id: string;
  material_name_ar: string;
  material_name_en: string;
  material_code: string;
  
  // الكمية
  quantity: number;              // بالوحدة (أمتار/ياردات/كغ)
  unit: string;                  // 'meter' | 'yard' | 'kg' | ...
  
  // الرولون (اختياري — يمكن كمية حرة)
  roll_id?: string;
  roll_number?: string;
  is_full_roll?: boolean;
  max_available?: number;        // الحد الأقصى المتاح
  
  // المستودع (مطلوب)
  warehouse_id: string;
  warehouse_name_ar: string;
  warehouse_name_en?: string;
  
  // السعر
  unit_price: number;
  currency: string;
  subtotal: number;              // quantity × unit_price
  
  // Metadata
  added_at: string;              // ISO date
  notes?: string;
}

interface CartState {
  items: CartItem[];
  customer_id?: string;
  customer_name?: string;
  draft_quotation_id?: string;   // إذا تم الحفظ مسبقاً
  
  // Derived (computed)
  total_items: number;
  total_quantity: number;
  total_amount: number;
  currency: string;
}

interface CartActions {
  addItem: (item: Omit<CartItem, 'id' | 'added_at' | 'subtotal'>) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCustomer: (id: string, name: string) => void;
  saveDraft: () => Promise<string>;       // → Returns quotation_id
  loadDraft: (quotationId: string) => Promise<void>;
  isInCart: (materialId: string, warehouseId: string) => boolean;
  getItemCount: () => number;
}
```

### 3.2 localStorage Persistence

```typescript
// السلة تُحفظ تلقائياً في localStorage
// مفتاح فريد لكل مستخدم + شركة
const CART_KEY = `texacore_cart_${userId}_${companyId}`;

// عند فتح التطبيق → استعادة السلة
// عند تعديل السلة → حفظ تلقائي
// عند حفظ كمسودة → مسح localStorage + حفظ بـ DB
```

### 3.3 سير العمل (Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                    CART WORKFLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📦 تصفح المواد                                               │
│    │                                                         │
│    ├→ فتح تفاصيل المادة                                       │
│    │    ├→ تبويب المخزون                                       │
│    │    │    ├→ [🛒 إضافة] بجانب صف مستودع                    │
│    │    │    │    └→ Dialog: كمية + سعر + ملاحظات               │
│    │    │    │         └→ إضافة للسلة ✅                        │
│    │    │    └→ [🛒 إضافة رولون] في Expanded row                │
│    │    │         └→ Dialog: كامل/جزئي + كمية                  │
│    │    │              └→ إضافة للسلة ✅                        │
│    │    └→ تبويب الرولونات                                     │
│    │         └→ [🛒 إضافة] بجانب كل رولون                     │
│    │                                                         │
│    ├→ ⭐ المفضلة (Quick Access)                                │
│    │    └→ نفس الأزرار + الكميات الأخيرة المستخدمة             │
│    │                                                         │
│  🛒 Widget عائم يتحدث (عتد البنود تتغير)                      │
│    │                                                         │
│  🛒 فتح درج السلة                                             │
│    ├→ مراجعة البنود                                           │
│    ├→ تعديل الكميات/الأسعار                                    │
│    ├→ اختيار العميل (اختياري)                                  │
│    ├→ [💾 حفظ كمسودة عرض سعر]                                 │
│    │    └→ quotations (status='draft') + sales_invoice_items   │
│    │                                                         │
│  📋 المبيعات → عروض الأسعار                                    │
│    └→ المسودة جاهزة → تعديل → تأكيد → أمر بيع → فاتورة       │
└─────────────────────────────────────────────────────────────┘
```

---

## ⭐ الجزء 4: المفضلة الموسمية (تفصيل)

### 4.1 مفهوم المفضلة

| الميزة | الوصف |
|--------|-------|
| **إضافة للمفضلة** | زر ⭐ بجانب كل مادة (في الجدول + في التفاصيل) |
| **تصنيف موسمي** | الربيع 2026 / الصيف 2026 / الشتاء 2026 / طوال العام |
| **تصنيف مخصص** | المستخدم يختار: "أكثر طلباً" / "VIP عملاء" / "تصفية" / مخصص |
| **ترتيب** | Drag & Drop لترتيب المفضلة |
| **جدول مخصص** | NexaTable في لوحة المفضلة مع أعمدة قابلة للتخصيص |
| **إحصائيات** | عدد مرات الاستخدام + آخر استخدام (تلقائي) |

### 4.2 واجهة لوحة المفضلة

```
┌──────────────────────────────────────────────────────────┐
│ ⭐ المفضلة                           [الموسم: صيف 2026 ▼]│
├──────────────────────────────────────────────────────────┤
│ التصنيف: [الكل] [أكثر طلباً] [VIP] [تصفية]              │
├──────────────────────────────────────────────────────────┤
│ # | المادة          | الكود    | المخزون | ✕ آخر    | 🛒 │
│ 1 | حموي ملون       | COT-100 | 250م   | 1231     | [+]│
│ 2 | قطن سوري        | COT-200 | 180م   | 12/15    | [+]│
│ 3 | حرير تركي       | SLK-001 | 90م    | 12/10    | [+]│
│ 4 | قطن مصري        | COT-300 | 500م   | 12/05    | [+]│
├──────────────────────────────────────────────────────────┤
│ [⚙️ تخصيص الأعمدة]  [📥 تصدير]  [🗑️ إدارة المفضلة]     │
└──────────────────────────────────────────────────────────┘
```

### 4.3 التكامل مع تبويب المخزون

- عند فتح المخزون، المواد المفضلة تظهر بنجمة ⭐ ملونة
- يمكن الإضافة/الإزالة من المفضلة مباشرة من أي مكان

---

## 🔔 الجزء 5: تعديلات الهيدر

### 5.1 الأيقونات الجديدة في Header.tsx

**المطلوب إضافته بين زر الثيم وزر الإشعارات:**

```tsx
{/* ⭐ Favorites Quick Access */}
<Popover>
  <Tooltip>
    <TooltipTrigger asChild>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 relative">
          <Star className="h-5 w-5 text-gray-500" />
          {favoritesCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 ...badge...">
              {favoritesCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
    </TooltipTrigger>
    <TooltipContent>{t('header.favorites')}</TooltipContent>
  </Tooltip>
  <PopoverContent>
    <FavoritesPanel />
  </PopoverContent>
</Popover>

{/* 🛒 Cart */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" className="h-10 w-10 relative"
      onClick={toggleCartDrawer}>
      <ShoppingCart className="h-5 w-5 text-gray-500" />
      {cartItemCount > 0 && (
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          className="absolute -top-0.5 -end-0.5 ...badge...">
          {cartItemCount}
        </motion.span>
      )}
    </Button>
  </TooltipTrigger>
  <TooltipContent>{t('header.cart')}</TooltipContent>
</Tooltip>
```

---

## 🌍 الجزء 6: الترجمات (Constitution Law 1)

### 6.1 مفاتيح الترجمة المطلوبة

```json
// في ar.json و en.json (و جميع اللغات الـ 9)
{
  "cart": {
    "title": "سلة المواد",
    "empty": "السلة فارغة",
    "addItem": "إضافة للسلة",
    "addFullRoll": "إضافة رولون كامل",
    "addQuantity": "إضافة كمية",
    "quantity": "الكمية",
    "unitPrice": "سعر الوحدة",
    "subtotal": "الإجمالي الفرعي",
    "totalAmount": "المبلغ الإجمالي",
    "totalItems": "إجمالي البنود",
    "selectCustomer": "اختيار العميل",
    "noCustomer": "بدون عميل (اختياري)",
    "saveDraft": "حفظ كمسودة عرض سعر",
    "clearCart": "إفراغ السلة",
    "clearCartConfirm": "هل تريد إفراغ السلة؟ سيتم حذف جميع البنود.",
    "draftSaved": "تم حفظ المسودة بنجاح",
    "draftNumber": "رقم العرض",
    "goToQuotation": "الذهاب لعرض السعر",
    "continueShopping": "متابعة التصفح",
    "removeItem": "إزالة البند",
    "editItem": "تعديل البند",
    "fromWarehouse": "من المستودع",
    "rollNumber": "رقم الرولون",
    "freeQuantity": "كمية حرة",
    "maxAvailable": "الحد الأقصى المتاح",
    "exceedsAvailable": "الكمية تتجاوز المتاح",
    "notes": "ملاحظات",
    "widget": {
      "items": "بنود",
      "view": "عرض",
      "clear": "مسح"
    },
    "errors": {
      "saveFailed": "فشل في حفظ المسودة",
      "loadFailed": "فشل في تحميل المسودة",
      "quantityExceeded": "الكمية المطلوبة تتجاوز المخزون المتاح"
    }
  },
  "favorites": {
    "title": "المفضلة",
    "addToFavorites": "إضافة للمفضلة",
    "removeFromFavorites": "إزالة من المفضلة",
    "manageFavorites": "إدارة المفضلة",
    "empty": "لا توجد مواد مفضلة",
    "season": "الموسم",
    "seasons": {
      "all_year": "طوال العام",
      "spring": "الربيع",
      "summer": "الصيف",
      "autumn": "الخريف",
      "winter": "الشتاء"
    },
    "categories": {
      "most_requested": "الأكثر طلباً",
      "vip_customers": "عملاء VIP",
      "clearance": "تصفية",
      "custom": "مخصص"
    },
    "usageCount": "مرات الاستخدام",
    "lastUsed": "آخر استخدام",
    "customizeColumns": "تخصيص الأعمدة",
    "sortOrder": "الترتيب"
  },
  "header": {
    "cart": "سلة المواد",
    "favorites": "المفضلة"
  }
}
```

---

## 📋 الجزء 7: خطة التنفيذ (بالترتيب)

### المرحلة A: تحسين تبويب المخزون (الأساس)
**الأولوية: 🔴 عالية | المدة: ~3 ساعات**

| # | المهمة | الملف |
|---|--------|-------|
| A1 | إضافة فلتر المستودع + فلتر الحالة | `MaterialInventoryTab.tsx` |
| A2 | زر "عرض المستودعات الفارغة" (toggle) | `MaterialInventoryTab.tsx` |
| A3 | خدمة جلب كل المستودعات | `warehouseService.ts` |
| A4 | Expandable rows لتفاصيل الرولونات | `MaterialInventoryTab.tsx` |

### المرحلة B: البنية الأساسية للسلة
**الأولوية: 🔴 عالية | المدة: ~4 ساعات**

| # | المهمة | الملف |
|---|--------|-------|
| B1 | `CartContext.tsx` — State + Actions + localStorage | `contexts/CartContext.tsx` |
| B2 | `quotationService.ts` — CRUD عروض الأسعار | `services/quotationService.ts` |
| B3 | ربط CartProvider بـ `App.tsx` | `App.tsx` |
| B4 | إضافة الترجمات (cart.*) | `ar.json` + `en.json` |

### المرحلة C: واجهة السلة
**الأولوية: 🔴 عالية | المدة: ~4 ساعات**

| # | المهمة | الملف |
|---|--------|-------|
| C1 | `AddToCartDialog.tsx` — نافذة الكمية والسعر | `components/cart/` |
| C2 | `CartDrawer.tsx` — درج مراجعة السلة | `components/cart/` |
| C3 | `CartFloatingWidget.tsx` — Widget عائم | `components/cart/` |
| C4 | تكامل أزرار السلة في `MaterialInventoryTab` | `MaterialInventoryTab.tsx` |
| C5 | أيقونة 🛒 في `Header.tsx` | `Header.tsx` |

### المرحلة D: المفضلة
**الأولوية: 🟡 متوسطة | المدة: ~4 ساعات**

| # | المهمة | الملف |
|---|--------|-------|
| D1 | Migration: جدول `user_material_favorites` | `supabase/migrations/` |
| D2 | `favoritesService.ts` — CRUD المفضلة | `services/favoritesService.ts` |
| D3 | `useFavorites.ts` — Hook | `hooks/useFavorites.ts` |
| D4 | `FavoriteButton.tsx` — زر ⭐ | `components/favorites/` |
| D5 | `FavoritesPanel.tsx` — لوحة المفضلة (Popover) | `components/favorites/` |
| D6 | أيقونة ⭐ في `Header.tsx` | `Header.tsx` |
| D7 | إضافة الترجمات (favorites.*) | `ar.json` + `en.json` |

### المرحلة E: التكامل والتلميع
**الأولوية: 🟢 عادية | المدة: ~3 ساعات**

| # | المهمة | الملف |
|---|--------|-------|
| E1 | حفظ المسودة (Cart → quotations + items) | `quotationService.ts` |
| E2 | تحويل المسودة لعرض سعر رسمي | `quotationService.ts` |
| E3 | عرض المسودات في صفحة المبيعات | `SalesCycleList.tsx` |
| E4 | Auto-save كل 30 ثانية (اختياري) | `CartContext.tsx` |
| E5 | إحصائيات المفضلة (usage_count) | Trigger أو update service |

---

## ✅ الالتزام بالدستور (Checklist)

| القانون | التطبيق | الحالة |
|---------|---------|--------|
| 1️⃣ Translation Law | كل النصوص عبر `t()` — مفاتيح جاهزة أعلاه | ✅ |
| 2️⃣ Services Law | لا Supabase في المكونات — خدمات منفصلة | ✅ |
| 3️⃣ Auth Law | `useAuth()` + `useCompany()` لكل service call | ✅ |
| 4️⃣ Error Handling | try/catch + `t('cart.errors.saveFailed')` | ✅ |
| 5️⃣ Keep-Mounted | Widget + Drawer يبقوان mounted | ✅ |
| 6️⃣ Typography | Cairo للعناوين + Tajawal للمحتوى + Mono للأرقام | ✅ |
| 7️⃣ Init Mode | CartDrawer: create vs edit draft | ✅ |
| 8️⃣ Permissions | RLS على المفضلة + quotations | ✅ |
| 9️⃣ Schema Verify | Resilient queries مع fallback | ✅ |
| RTL | Logical properties (`ms-`/`me-`/`start`/`end`) | ✅ |

---

## 🎯 ملخص الأولويات

```
المرحلة A: تحسين تبويب المخزون ← نبدأ هنا 🚀
    ↓
المرحلة B: بنية السلة الأساسية
    ↓
المرحلة C: واجهة السلة + Header
    ↓
المرحلة D: المفضلة
    ↓
المرحلة E: تكامل المبيعات + تلميع
```

**المدة الإجمالية المقدرة: ~18 ساعة عمل**

---

## 🏆 الميزة التنافسية النهائية

| المقارنة | Odoo | SAP B1 | TexaCore |
|----------|------|--------|----------|
| سلة من التصفح | ❌ | ❌ | ✅ |
| المفضلة الموسمية | ❌ | ❌ | ✅ |
| ربط بالرولونات | ❌ | ❌ | ✅ |
| Header Cart Icon | ❌ | ❌ | ✅ |
| Auto-save مسودة | ⚠️ جزئي | ❌ | ✅ |
| تعدد المستودعات | ✅ | ✅ | ✅ |
| 9 لغات | ⚠️ | ❌ | ✅ |
