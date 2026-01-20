# No-Code Sheet Customizer System
## نظام تخصيص الشيت بدون كود

---

## 🎯 الرؤية

تمكين المستخدم من تخصيص واجهة تفاصيل المستندات (Detail Sheets) بشكل كامل دون الحاجة لأي برمجة، عبر واجهة سحب وإفلات سهلة الاستخدام.

---

## 📋 المتطلبات الوظيفية

### 1. إعادة ترتيب الحقول
- [x] سحب أي حقل لمكان آخر
- [x] تبديل موقع حقلين
- [x] نقل حقل لقسم آخر

### 2. إضافة حقول مخصصة
- [x] حقل نصي (Text)
- [x] حقل رقمي (Number)
- [x] حقل مالي (Currency)
- [x] حقل تاريخ (Date)
- [x] شارة حالة (Badge)
- [x] رابط (Link)
- [x] صورة (Image)
- [x] فاصل (Divider)
- [x] عنوان قسم (Section Header)
- [x] حقل محسوب (Computed Field)

### 3. تعدد اللغات
- [x] إضافة تسمية بأي لغة مدعومة
- [x] تسميات مختلفة لكل لغة
- [x] اللغات المدعومة: ar, en, tr, de, ru, uk, pl, ro, it

### 4. تحكم في الظهور
- [x] إخفاء حقل من العرض
- [x] إظهار حقل مخفي
- [x] شروط الظهور (مثلاً: فقط إذا الحالة = نشط)

### 5. تنسيق الحقول
- [x] عرض الحقل (نصف، كامل، ربع)
- [x] أيقونة مخصصة
- [x] لون مخصص
- [x] تنسيق العرض (format)

### 6. إدارة الأقسام
- [x] إنشاء قسم جديد
- [x] إعادة تسمية قسم
- [x] حذف قسم
- [x] دمج أقسام

### 7. الحفظ والاستعادة
- [x] حفظ التخصيصات تلقائياً
- [x] استعادة الإعدادات الافتراضية
- [x] نسخ التخصيصات لمستخدم آخر
- [x] تصدير/استيراد التخصيصات

---

## 🏗️ البنية التقنية

### هيكل الملفات

```
src/components/sheets/
├── customizer/
│   ├── SheetCustomizerContext.tsx    # Context للحالة
│   ├── SheetCustomizerProvider.tsx   # Provider الرئيسي
│   ├── CustomizerToolbar.tsx         # شريط الأدوات
│   ├── DraggableField.tsx            # حقل قابل للسحب
│   ├── DroppableZone.tsx             # منطقة الإفلات
│   ├── FieldPalette.tsx              # لوحة الحقول
│   ├── FieldEditor.tsx               # محرر الحقل
│   ├── SectionEditor.tsx             # محرر القسم
│   ├── LayoutPreview.tsx             # معاينة التخطيط
│   ├── TranslationEditor.tsx         # محرر الترجمات
│   ├── useSheetCustomizer.ts         # Hook الرئيسي
│   ├── customizer.types.ts           # الأنواع
│   └── index.ts
├── services/
│   └── customizationService.ts       # خدمة API
└── ...
```

### جداول قاعدة البيانات

```sql
-- =====================================================
-- جدول التخصيصات الرئيسي
-- =====================================================
CREATE TABLE sheet_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- المالك (يمكن أن يكون tenant أو user)
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- نوع المستند
  doc_type VARCHAR(50) NOT NULL,
  
  -- التخطيط (JSON)
  layout JSONB NOT NULL DEFAULT '{
    "sections": [],
    "fieldOrder": [],
    "hiddenFields": [],
    "customFields": []
  }',
  
  -- إصدار التخصيص (للتراجع)
  version INTEGER DEFAULT 1,
  
  -- حالة التفعيل
  is_active BOOLEAN DEFAULT true,
  
  -- التتبع
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ضمان وحدانية التخصيص لكل مستخدم/مشترك ونوع
  UNIQUE(tenant_id, user_id, doc_type)
);

-- =====================================================
-- جدول الحقول المخصصة
-- =====================================================
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customization_id UUID REFERENCES sheet_customizations(id) ON DELETE CASCADE,
  
  -- معرف فريد للحقل
  field_key VARCHAR(100) NOT NULL,
  
  -- نوع الحقل
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN (
    'text', 'number', 'currency', 'date', 'datetime',
    'badge', 'link', 'image', 'divider', 'section',
    'computed', 'select', 'multiselect', 'checkbox'
  )),
  
  -- القيمة الافتراضية
  default_value TEXT,
  
  -- خيارات الحقل (للـ select و multiselect)
  options JSONB,
  
  -- صيغة الحساب (للحقول المحسوبة)
  formula TEXT,
  
  -- شروط الظهور
  visibility_condition JSONB,
  
  -- التنسيق
  format_options JSONB DEFAULT '{
    "width": "half",
    "icon": null,
    "color": null,
    "format": null
  }',
  
  -- الترتيب
  sort_order INTEGER DEFAULT 0,
  
  -- التتبع
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customization_id, field_key)
);

-- =====================================================
-- جدول الترجمات
-- =====================================================
CREATE TABLE field_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ربط بالحقل المخصص أو التخصيص
  custom_field_id UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
  customization_id UUID REFERENCES sheet_customizations(id) ON DELETE CASCADE,
  
  -- مفتاح الحقل (للحقول الأصلية)
  field_key VARCHAR(100),
  
  -- اللغة
  language VARCHAR(5) NOT NULL,
  
  -- الترجمة
  label TEXT NOT NULL,
  placeholder TEXT,
  help_text TEXT,
  
  -- التتبع
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ضمان وحدانية الترجمة
  UNIQUE(custom_field_id, language),
  UNIQUE(customization_id, field_key, language)
);

-- =====================================================
-- جدول سجل التغييرات (للتراجع)
-- =====================================================
CREATE TABLE customization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customization_id UUID REFERENCES sheet_customizations(id) ON DELETE CASCADE,
  
  -- البيانات قبل التغيير
  previous_layout JSONB NOT NULL,
  
  -- نوع التغيير
  change_type VARCHAR(50) NOT NULL,
  
  -- وصف التغيير
  change_description TEXT,
  
  -- من قام بالتغيير
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes للأداء
-- =====================================================
CREATE INDEX idx_customizations_tenant ON sheet_customizations(tenant_id);
CREATE INDEX idx_customizations_doc_type ON sheet_customizations(doc_type);
CREATE INDEX idx_custom_fields_customization ON custom_fields(customization_id);
CREATE INDEX idx_translations_field ON field_translations(custom_field_id);
CREATE INDEX idx_translations_customization ON field_translations(customization_id);
```

---

## 🎨 واجهة المستخدم

### 1. شريط أدوات التحرير

```
┌─────────────────────────────────────────────────────────────┐
│  ✏️ وضع التحرير  │  💾 حفظ  │  ↩️ تراجع  │  🔄 افتراضي  │  ✕  │
└─────────────────────────────────────────────────────────────┘
```

### 2. لوحة الحقول

```
┌─────────────────────────────────┐
│  ➕ إضافة حقل                   │
├─────────────────────────────────┤
│  📝 نص                          │
│  🔢 رقم                         │
│  💰 مبلغ                        │
│  📅 تاريخ                       │
│  🏷️ شارة                        │
│  🔗 رابط                        │
│  🖼️ صورة                        │
│  ➖ فاصل                        │
│  📋 قسم                         │
│  🧮 محسوب                       │
└─────────────────────────────────┘
```

### 3. محرر الحقل

```
┌─────────────────────────────────────────────────────────────┐
│  📝 محرر الحقل: [اسم الحقل]                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  🌐 الترجمات                                          │ │
│  │  ─────────────────────────────────────────────────── │ │
│  │  🇸🇦 العربية:  [الاسم التجاري                     ]  │ │
│  │  🇬🇧 English:  [Trade Name                        ]  │ │
│  │  🇹🇷 Türkçe:   [Ticari Ad                         ]  │ │
│  │  🇩🇪 Deutsch:  [Handelsname                       ]  │ │
│  │                                                       │ │
│  │  [+ إضافة لغة]                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  النوع:         [نص            ▼]                          │
│  الأيقونة:      [🏢            ▼]                          │
│  العرض:         [○ ربع  ● نصف  ○ كامل]                     │
│  مطلوب:         [✓]                                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  👁️ شروط الظهور                                       │ │
│  │  ─────────────────────────────────────────────────── │ │
│  │  ☑️ فقط إذا: [الحالة ▼] [= ▼] [نشط ▼]                 │ │
│  │                                                       │ │
│  │  [+ إضافة شرط]                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [💾 حفظ]                                    [🗑️ حذف الحقل] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Types (customizer.types.ts)

```typescript
// أنواع الحقول المتاحة
export type CustomFieldType = 
  | 'text' | 'number' | 'currency' | 'date' | 'datetime'
  | 'badge' | 'link' | 'image' | 'divider' | 'section'
  | 'computed' | 'select' | 'multiselect' | 'checkbox';

// عرض الحقل
export type FieldWidth = 'quarter' | 'half' | 'three-quarters' | 'full';

// شرط الظهور
export interface VisibilityCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';
  value: any;
  logic?: 'and' | 'or';
}

// خيارات التنسيق
export interface FormatOptions {
  width: FieldWidth;
  icon?: string;
  color?: string;
  format?: string; // للأرقام والتواريخ
  prefix?: string;
  suffix?: string;
}

// الحقل المخصص
export interface CustomField {
  id: string;
  key: string;
  type: CustomFieldType;
  defaultValue?: any;
  options?: { value: string; label: string }[]; // للـ select
  formula?: string; // للحقول المحسوبة
  visibilityConditions?: VisibilityCondition[];
  formatOptions: FormatOptions;
  sortOrder: number;
  translations: Record<string, {
    label: string;
    placeholder?: string;
    helpText?: string;
  }>;
}

// القسم
export interface CustomSection {
  id: string;
  key: string;
  title: Record<string, string>; // ترجمات العنوان
  collapsible: boolean;
  defaultCollapsed: boolean;
  fields: string[]; // مفاتيح الحقول
  sortOrder: number;
}

// التخطيط الكامل
export interface CustomLayout {
  sections: CustomSection[];
  fieldOrder: string[];
  hiddenFields: string[];
  customFields: CustomField[];
  theme?: {
    primaryColor?: string;
    accentColor?: string;
  };
}

// حالة المحرر
export interface CustomizerState {
  isEditing: boolean;
  isDirty: boolean;
  isSaving: boolean;
  selectedField: string | null;
  selectedSection: string | null;
  layout: CustomLayout;
  originalLayout: CustomLayout;
  history: CustomLayout[];
  historyIndex: number;
}

// Context type
export interface SheetCustomizerContextType {
  state: CustomizerState;
  // Actions
  toggleEditMode: () => void;
  selectField: (fieldKey: string | null) => void;
  selectSection: (sectionKey: string | null) => void;
  moveField: (fieldKey: string, targetIndex: number) => void;
  moveFieldToSection: (fieldKey: string, sectionKey: string) => void;
  addField: (field: Partial<CustomField>) => void;
  updateField: (fieldKey: string, updates: Partial<CustomField>) => void;
  removeField: (fieldKey: string) => void;
  hideField: (fieldKey: string) => void;
  showField: (fieldKey: string) => void;
  addSection: (section: Partial<CustomSection>) => void;
  updateSection: (sectionKey: string, updates: Partial<CustomSection>) => void;
  removeSection: (sectionKey: string) => void;
  updateTranslation: (fieldKey: string, language: string, label: string) => void;
  saveLayout: () => Promise<void>;
  resetToDefault: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

---

## 📦 مكتبات مطلوبة

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

---

## 🚀 خطوات التنفيذ

### المرحلة 1: البنية التحتية (أسبوع 1)
1. [ ] إنشاء جداول قاعدة البيانات
2. [ ] إنشاء customizationService.ts
3. [ ] إنشاء customizer.types.ts
4. [ ] إنشاء SheetCustomizerContext

### المرحلة 2: المكونات الأساسية (أسبوع 2)
5. [ ] إنشاء DraggableField
6. [ ] إنشاء DroppableZone
7. [ ] إنشاء FieldPalette
8. [ ] إنشاء CustomizerToolbar

### المرحلة 3: محرر الحقول (أسبوع 3)
9. [ ] إنشاء FieldEditor
10. [ ] إنشاء TranslationEditor
11. [ ] إنشاء SectionEditor
12. [ ] إنشاء LayoutPreview

### المرحلة 4: التكامل (أسبوع 4)
13. [ ] تكامل مع UniversalDetailSheet
14. [ ] إضافة للـ Component Lab
15. [ ] اختبارات شاملة
16. [ ] توثيق الاستخدام

---

## 📝 مثال استخدام

```tsx
// استخدام بسيط
<UniversalDetailSheet
  docType="tenant"
  data={tenantData}
  customizable={true}
/>

// استخدام متقدم
<SheetCustomizerProvider docType="tenant">
  <UniversalDetailSheet
    docType="tenant"
    data={tenantData}
  />
</SheetCustomizerProvider>

// استخدام Hook
function MyComponent() {
  const {
    state,
    toggleEditMode,
    addField,
    saveLayout
  } = useSheetCustomizer('tenant');

  return (
    <div>
      <button onClick={toggleEditMode}>
        {state.isEditing ? 'إنهاء التحرير' : 'تحرير'}
      </button>
      
      {state.isEditing && (
        <button onClick={() => addField({ type: 'text', key: 'custom_1' })}>
          إضافة حقل نصي
        </button>
      )}
      
      {state.isDirty && (
        <button onClick={saveLayout}>حفظ</button>
      )}
    </div>
  );
}
```

---

## 🔐 الصلاحيات

| الصلاحية | الوصف |
|---------|-------|
| `sheet.customize.own` | تخصيص الشيت لنفسه فقط |
| `sheet.customize.tenant` | تخصيص شيت لجميع مستخدمي المشترك |
| `sheet.customize.global` | تخصيص الإعدادات الافتراضية للنظام |

---

## 📅 تاريخ الإنشاء: 2026-01-20
## 👤 المسؤول: فريق التطوير
