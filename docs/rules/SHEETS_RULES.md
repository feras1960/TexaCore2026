# 📄 قواعد الشيتات والحوارات - Texa Core

## ⚠️ القاعدة الأساسية

> **استخدم نظام الشيتات الموحد (Universal Sheet System) لجميع العروض التفصيلية.**
>
> **يُمنع إنشاء شيتات أو حوارات مخصصة من الصفر.**

---

## 🏗️ نظام الشيتات الموحد

### المكونات الأساسية

```
src/components/sheets/
├── universal/
│   ├── UniversalDetailSheet.tsx    # الشيت الرئيسي
│   ├── UniversalDetailHeader.tsx   # رأس الشيت
│   ├── UniversalDetailContent.tsx  # محتوى الشيت
│   ├── UniversalDetailTabs.tsx     # تبويبات الشيت
│   └── NestedSheetManager.tsx      # مدير الشيتات المتداخلة
├── configs/
│   ├── account.config.ts           # تكوين الحسابات
│   ├── customer.config.ts          # تكوين العملاء
│   └── ...                         # باقي التكوينات
├── tabs/
│   ├── shared/                     # تبويبات مشتركة
│   └── [entity]/                   # تبويبات خاصة بالكيان
└── hooks/
    └── useNestedSheets.ts          # هوك الشيتات المتداخلة
```

---

## 📋 متى تستخدم كل نوع؟

### 1. UnifiedSheet - للعروض البسيطة

```typescript
import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';

// ✅ استخدمه للنماذج البسيطة
<UnifiedSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title={t('accounting.accounts.add')}
  icon={Plus}
  size="md"
>
  <AccountForm />
</UnifiedSheet>
```

### 2. UniversalDetailSheet - للتفاصيل المعقدة

```typescript
import { UniversalDetailSheet } from '@/components/sheets/universal/UniversalDetailSheet';
import { accountConfig } from '@/components/sheets/configs/account.config';

// ✅ استخدمه للكيانات ذات التبويبات المتعددة
<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  entityType="account"
  entityId={accountId}
  config={accountConfig}
/>
```

### 3. Dialog - للتأكيدات والتنبيهات

```typescript
import { Dialog } from '@/components/ui/dialog';

// ✅ استخدمه للتأكيدات فقط
<Dialog open={showConfirm} onOpenChange={setShowConfirm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('messages.confirmDelete')}</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={handleDelete}>{t('common.delete')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🔧 إنشاء تكوين لكيان جديد

### 1. إنشاء ملف التكوين

```typescript
// src/components/sheets/configs/newEntity.config.ts
import { SheetConfig } from './sheet.types';
import { Package } from 'lucide-react';

export const newEntityConfig: SheetConfig = {
  // المعلومات الأساسية
  entityType: 'new_entity',
  icon: Package,
  
  // الحقول الرئيسية
  headerFields: {
    title: (data) => data.name,
    subtitle: (data) => data.code,
    badge: (data) => ({
      text: data.status,
      variant: data.status === 'active' ? 'success' : 'warning'
    })
  },
  
  // التبويبات
  tabs: [
    {
      id: 'overview',
      labelKey: 'common.overview',
      component: 'OverviewTab'
    },
    {
      id: 'transactions',
      labelKey: 'accounting.transactions',
      component: 'TransactionsTab'
    }
  ],
  
  // الإجراءات
  actions: [
    {
      id: 'edit',
      labelKey: 'common.edit',
      icon: 'Edit',
      handler: 'onEdit'
    },
    {
      id: 'delete',
      labelKey: 'common.delete',
      icon: 'Trash2',
      variant: 'destructive',
      handler: 'onDelete'
    }
  ]
};
```

### 2. إنشاء التبويبات الخاصة

```typescript
// src/components/sheets/tabs/newEntity/NewEntityOverviewTab.tsx
import { useLanguage } from '@/app/providers/LanguageProvider';

interface Props {
  data: NewEntity;
}

export function NewEntityOverviewTab({ data }: Props) {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-6">
      {/* المحتوى */}
    </div>
  );
}
```

---

## 📏 أحجام الشيتات المعتمدة

| الحجم | العرض | الاستخدام |
|-------|-------|-----------|
| `sm` | 400px | نماذج بسيطة |
| `md` | 500px | نماذج متوسطة |
| `lg` | 700px | تفاصيل مع تبويبات |
| `xl` | 900px | تفاصيل معقدة |
| `full` | 100% - 64px | عروض كاملة |

```typescript
<UnifiedSheet size="lg" ... />
```

---

## 🎨 قواعد التصميم

### 1. الرأس (Header)

```typescript
// ✅ يجب أن يحتوي على:
// - أيقونة الكيان
// - العنوان الرئيسي
// - العنوان الفرعي (اختياري)
// - شارة الحالة (اختياري)
// - أزرار الإجراءات

<UniversalDetailHeader
  icon={User}
  title={data.name}
  subtitle={data.email}
  badge={{ text: data.status, variant: 'success' }}
  actions={[
    { icon: Edit, label: t('common.edit'), onClick: handleEdit }
  ]}
/>
```

### 2. التبويبات

```typescript
// ✅ ترتيب التبويبات المعتمد:
// 1. نظرة عامة (Overview) - دائماً أولاً
// 2. التفاصيل الخاصة بالكيان
// 3. المعاملات/الحركات
// 4. المستندات
// 5. النشاط/السجل
// 6. التحليل الذكي (AI)

const tabs = [
  { id: 'overview', labelKey: 'common.overview' },
  { id: 'details', labelKey: 'common.details' },
  { id: 'transactions', labelKey: 'accounting.transactions' },
  { id: 'documents', labelKey: 'common.documents' },
  { id: 'activity', labelKey: 'common.activity' },
  { id: 'ai', labelKey: 'ai.analysis' }
];
```

### 3. الفوتر (Footer)

```typescript
// ✅ يجب أن يحتوي على:
// - زر الإغلاق (دائماً)
// - زر الحفظ (عند التعديل)
// - أزرار إضافية حسب الحاجة

<SheetFooter>
  <Button variant="outline" onClick={onClose}>
    {t('common.close')}
  </Button>
  <Button onClick={onSave}>
    {t('common.save')}
  </Button>
</SheetFooter>
```

---

## 🔄 الشيتات المتداخلة (Nested Sheets)

### الاستخدام

```typescript
import { useNestedSheets } from '@/components/sheets/hooks/useNestedSheets';

function MyComponent() {
  const { openSheet, closeSheet } = useNestedSheets();
  
  const handleOpenAccount = (accountId: string) => {
    openSheet({
      entityType: 'account',
      entityId: accountId,
      level: 1 // مستوى التداخل
    });
  };
  
  return (
    <Button onClick={() => handleOpenAccount('123')}>
      {t('common.viewDetails')}
    </Button>
  );
}
```

### قواعد التداخل

1. **الحد الأقصى:** 3 مستويات متداخلة
2. **التنقل:** يمكن العودة للمستوى السابق
3. **الإغلاق:** إغلاق الأب يغلق جميع الأبناء

---

## 🚫 الممنوعات

### 1. إنشاء شيت من الصفر

```typescript
// ❌ ممنوع
const MyCustomSheet = () => {
  return (
    <div className="fixed inset-0 bg-black/50">
      <div className="absolute right-0 h-full w-[500px] bg-white">
        ...
      </div>
    </div>
  );
};

// ✅ صحيح - استخدم المكون المعتمد
<UnifiedSheet isOpen={...} onClose={...}>
  ...
</UnifiedSheet>
```

### 2. تكرار منطق الشيتات

```typescript
// ❌ ممنوع - نسخ كود من شيت آخر
// كل شيت يجب أن يستخدم نظام التكوين

// ✅ صحيح - استخدم التكوين
import { accountConfig } from '@/components/sheets/configs/account.config';
```

### 3. شيتات بدون إمكانية إغلاق

```typescript
// ❌ ممنوع - يجب دائماً توفير طريقة للإغلاق
<Sheet open={true}>  // لا يوجد onOpenChange

// ✅ صحيح
<Sheet open={isOpen} onOpenChange={setIsOpen}>
```

---

## 📋 قائمة فحص

- [ ] استخدام المكون المعتمد (UnifiedSheet أو UniversalDetailSheet)
- [ ] جميع النصوص تستخدم `t('key')`
- [ ] الحجم مناسب للمحتوى
- [ ] وجود زر إغلاق
- [ ] دعم لوحة المفاتيح (Esc للإغلاق)
- [ ] الحركات سلسة (Framer Motion)
- [ ] دعم RTL

---

## 📚 المراجع

- `src/components/sheets/universal/UniversalDetailSheet.tsx`
- `src/components/shared/sheets/UnifiedSheet.tsx`
- `docs/COMPLETE_REFERENCE_GUIDE.md`
