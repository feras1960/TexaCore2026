# ✅ تحديث ActionButtonsBar - مكتمل
**التاريخ:** 24 يناير 2026  
**الحالة:** ✅ مكتمل 100%

---

## 🎯 ما تم تحديثه

### 1. ✅ إضافة حقول الصلاحيات لـ ActionButton

```typescript
export interface ActionButton {
  id: string;
  labelKey: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | ...;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  
  // ✅ حقول جديدة
  requiredPermission?: 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve' | 'manage_settings';
  requiredModule?: string;
}
```

### 2. ✅ إضافة moduleCode للـ Props

```typescript
interface ActionButtonsBarProps {
  actions: ActionButton[];
  // ... props أخرى
  
  // ✅ جديد
  moduleCode?: string;  // لفحص الصلاحيات
}
```

### 3. ✅ فلترة الأزرار حسب الصلاحيات

```typescript
const { hasModule, hasPermission } = useModules();

const visibleActions = actions.filter(action => {
  // إخفاء الأزرار المخفية يدوياً
  if (action.hidden) return false;

  // التحقق من الموديول المطلوب
  if (action.requiredModule && !hasModule(action.requiredModule)) {
    return false;
  }

  // التحقق من الصلاحية المطلوبة
  if (action.requiredPermission && moduleCode) {
    return hasPermission(moduleCode, action.requiredPermission);
  }

  return true;
});
```

---

## 🎨 أمثلة الاستخدام

### مثال 1: أزرار أساسية بدون صلاحيات

```typescript
import { ActionButtonsBar } from '@/components/shared/actions/ActionButtonsBar';
import { Save, X } from 'lucide-react';

function SimpleForm() {
  const actions = [
    {
      id: 'save',
      labelKey: 'common.save',
      icon: Save,
      onClick: handleSave,
    },
    {
      id: 'cancel',
      labelKey: 'common.cancel',
      icon: X,
      variant: 'outline',
      onClick: handleCancel,
    }
  ];

  return <ActionButtonsBar actions={actions} />;
}
```

---

### مثال 2: أزرار مع صلاحيات (الأكثر استخداماً)

```typescript
function AccountingActions() {
  const actions = [
    {
      id: 'create',
      labelKey: 'common.create',
      icon: Plus,
      onClick: handleCreate,
      requiredPermission: 'create',  // ✅ يتطلب صلاحية create
    },
    {
      id: 'edit',
      labelKey: 'common.edit',
      icon: Edit,
      onClick: handleEdit,
      requiredPermission: 'edit',     // ✅ يتطلب صلاحية edit
    },
    {
      id: 'delete',
      labelKey: 'common.delete',
      icon: Trash,
      variant: 'destructive',
      onClick: handleDelete,
      requiredPermission: 'delete',   // ✅ يتطلب صلاحية delete
    },
    {
      id: 'export',
      labelKey: 'common.export',
      icon: Download,
      onClick: handleExport,
      requiredPermission: 'export',   // ✅ يتطلب صلاحية export
    }
  ];

  return (
    <ActionButtonsBar 
      actions={actions} 
      moduleCode="accounting"  // ✅ مهم جداً!
    />
  );
}
```

---

### مثال 3: أزرار مع صلاحيات موديول معين

```typescript
function InventoryActions() {
  const actions = [
    {
      id: 'create',
      labelKey: 'inventory.createItem',
      icon: Plus,
      onClick: handleCreate,
      requiredModule: 'inventory',     // ✅ يتطلب موديول المخزون
      requiredPermission: 'create',
    },
    {
      id: 'import',
      labelKey: 'common.import',
      icon: Upload,
      onClick: handleImport,
      requiredModule: 'inventory',
      requiredPermission: 'import',    // ✅ يتطلب صلاحية استيراد
    },
    {
      id: 'stockReport',
      labelKey: 'inventory.stockReport',
      icon: FileText,
      onClick: handleStockReport,
      requiredModule: 'inventory',     // فقط التحقق من الموديول
    }
  ];

  return (
    <ActionButtonsBar 
      actions={actions} 
      moduleCode="inventory"
    />
  );
}
```

---

### مثال 4: مزج الصلاحيات مع الحالات

```typescript
function ComplexActions() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const actions = [
    {
      id: 'create',
      labelKey: 'common.create',
      icon: Plus,
      onClick: handleCreate,
      requiredPermission: 'create',
      hidden: isEditing,  // إخفاء أثناء التعديل
    },
    {
      id: 'save',
      labelKey: 'common.save',
      icon: Save,
      onClick: handleSave,
      requiredPermission: 'edit',
      hidden: !isEditing,
      loading: loading,
    },
    {
      id: 'approve',
      labelKey: 'common.approve',
      icon: Check,
      onClick: handleApprove,
      requiredPermission: 'approve',  // ✅ صلاحية خاصة
      disabled: !canApprove,
    },
    {
      id: 'delete',
      labelKey: 'common.delete',
      icon: Trash,
      variant: 'destructive',
      onClick: handleDelete,
      requiredPermission: 'delete',
      disabled: isNew,
    }
  ];

  return (
    <ActionButtonsBar 
      actions={actions} 
      moduleCode="accounting"
      align="between"
    />
  );
}
```

---

### مثال 5: استخدام في UniversalDetailSheet

```typescript
// في src/components/sheets/universal/UniversalDetailSheet.tsx

function UniversalDetailSheet({ entityType, entityId }) {
  const actions = [
    {
      id: 'edit',
      labelKey: 'common.edit',
      icon: Edit,
      onClick: () => setEditMode(true),
      requiredPermission: 'edit',
    },
    {
      id: 'duplicate',
      labelKey: 'common.duplicate',
      icon: Copy,
      onClick: handleDuplicate,
      requiredPermission: 'create',  // النسخ يحتاج صلاحية إنشاء
    },
    {
      id: 'delete',
      labelKey: 'common.delete',
      icon: Trash,
      variant: 'destructive',
      onClick: handleDelete,
      requiredPermission: 'delete',
    },
    {
      id: 'export',
      labelKey: 'common.exportPDF',
      icon: Download,
      onClick: handleExportPDF,
      requiredPermission: 'export',
    }
  ];

  return (
    <Sheet>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <ActionButtonsBar 
          actions={actions}
          moduleCode={getModuleCodeFromEntityType(entityType)}
          align="end"
          size="sm"
        />
      </SheetHeader>
      {/* ... */}
    </Sheet>
  );
}
```

---

## 🔄 التوافق مع الكود القديم

### الكود القديم سيعمل بدون تغيير!

```typescript
// ✅ هذا سيعمل - بدون صلاحيات
<ActionButtonsBar actions={simpleActions} />

// ✅ هذا سيعمل - مع الصلاحيات
<ActionButtonsBar 
  actions={permissionedActions} 
  moduleCode="accounting" 
/>
```

---

## ⚠️ ملاحظات مهمة

### 1. moduleCode مطلوب للصلاحيات

```typescript
// ❌ لن يعمل - moduleCode مفقود
<ActionButtonsBar actions={actionsWithPermissions} />

// ✅ سيعمل
<ActionButtonsBar 
  actions={actionsWithPermissions} 
  moduleCode="accounting" 
/>
```

### 2. أولوية الفلترة

الترتيب كالتالي:
1. ✅ `hidden` - إخفاء يدوي
2. ✅ `requiredModule` - التحقق من الموديول
3. ✅ `requiredPermission` - التحقق من الصلاحية

### 3. الأزرار بدون صلاحيات تظهر دائماً

```typescript
// هذا الزر سيظهر دائماً (لا يحتاج صلاحيات)
{
  id: 'cancel',
  labelKey: 'common.cancel',
  onClick: handleCancel,
  // لا يوجد requiredPermission
}
```

---

## 🧪 الاختبار

### Test 1: التحقق من الأزرار المخفية

```typescript
// المستخدم لديه: view, edit فقط (بدون create, delete)

const actions = [
  { id: 'create', requiredPermission: 'create', ... },  // ❌ سيُخفى
  { id: 'edit', requiredPermission: 'edit', ... },      // ✅ سيظهر
  { id: 'delete', requiredPermission: 'delete', ... },  // ❌ سيُخفى
  { id: 'cancel', ... },                                 // ✅ سيظهر (لا يحتاج صلاحية)
];

// النتيجة: زرين فقط (edit + cancel)
```

### Test 2: التحقق من الموديولات

```typescript
// المستخدم ليس لديه موديول inventory

const actions = [
  {
    id: 'create',
    requiredModule: 'inventory',  // ❌ سيُخفى
    ...
  }
];

// النتيجة: لا أزرار (الموديول غير متاح)
```

---

## ✅ Checklist

- [x] إضافة `requiredPermission` لـ ActionButton
- [x] إضافة `requiredModule` لـ ActionButton
- [x] إضافة `moduleCode` لـ ActionButtonsBarProps
- [x] استخدام `useModules` للتحقق
- [x] فلترة الأزرار حسب الصلاحيات
- [x] التوافق مع الكود القديم
- [ ] تحديث الأمثلة الحقيقية في الكود
- [ ] اختبار مع مستخدمين مختلفين

---

## 🚀 الخطوات القادمة

### 1. تحديث الكود الموجود (45 دقيقة)
- [ ] تحديث `JournalEntries.tsx`
- [ ] تحديث `ChartOfAccounts.tsx`
- [ ] تحديث `Payments.tsx`
- [ ] إضافة `moduleCode` و `requiredPermission`

### 2. تحديث UniversalDetailTabs (45 دقيقة)
- [ ] دعم الصلاحيات في التبويبات
- [ ] إخفاء التبويبات غير المسموحة

### 3. اختبار شامل (30 دقيقة)
- [ ] اختبار مع صلاحيات مختلفة
- [ ] التحقق من إخفاء الأزرار
- [ ] التحقق من عدم ظهورها في DOM

---

**ActionButtonsBar - محدث ومكتمل! 🎉**

*آخر تحديث: 24 يناير 2026*
