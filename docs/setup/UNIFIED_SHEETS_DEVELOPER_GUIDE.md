# 📘 نظام Sheets الموحد - دليل المطور السريع

## 🎯 ما هو هذا النظام؟

نظام **BaseDetailSheet** هو نظام موحد ومستقر لإنشاء شيتات تفاصيل قابلة للتخصيص في التطبيق. تم تصميمه ليكون:
- ✅ **ثابت**: بدون focus loops أو freezing
- ✅ **قابل للتخصيص**: config-driven system
- ✅ **آمن**: لا يستخدم MotionSheet
- ✅ **قابل للتوسع**: سهل إضافة modules جديدة

---

## 🏗️ الهيكل الأساسي

```
BaseDetailSheet (Foundation)
    ↓
SaaSDetailSheet (SaaS Module)
    ↓ 
Configs (plan, tenant, agent, module)
    ↓
Tabs (6 tabs for plans, etc.)
```

---

## 🚀 كيفية إضافة مكون جديد؟

### الخطوة 1: إنشاء Configuration File

```typescript
// src/features/YOUR_MODULE/components/configs/YOUR_DOCTYPE.config.ts

import { BaseSheetConfig } from '@/components/shared/sheets/types';
import { YourIcon } from 'lucide-react';

export const getYourDocTypeConfig = (
  t: (key: string) => string,
  language: string,
  data: any
): BaseSheetConfig => {
  return {
    // Header
    title: (data) => data.name,
    subtitle: 'Your subtitle here',
    icon: YourIcon,
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    badge: (data) => ({
      label: data.is_active ? t('common.active') : t('common.inactive'),
      variant: data.is_active ? 'success' : 'error'
    }),

    // Stats (up to 3)
    stats: [
      {
        key: 'stat1',
        label: t('your.stat.label'),
        value: data.stat_value,
        icon: YourIcon,
        color: 'blue',
      },
      // ... more stats
    ],

    // Tabs
    tabs: [
      {
        id: 'overview',
        label: t('common.overview'),
        icon: InfoIcon,
        component: YourOverviewTab,
      },
      // ... more tabs
    ],
    defaultTab: 'overview',

    // Actions
    actions: [
      {
        id: 'edit',
        label: t('common.edit'),
        icon: EditIcon,
        variant: 'default',
        onClick: async (data, context) => {
          context?.handlers?.onEdit?.(data);
        },
      },
      // ... more actions
    ],

    width: 'lg', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  };
};
```

### الخطوة 2: إنشاء Tab Components

```typescript
// src/features/YOUR_MODULE/components/tabs/YOUR_DOCTYPE/YourTab.tsx

import React from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';

export const YourTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t,
  onRefresh 
}) => {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {t('your.section.title')}
        </h3>
        {/* Your content here */}
      </Card>
    </div>
  );
};
```

### الخطوة 3: إنشاء Module Detail Sheet

```typescript
// src/features/YOUR_MODULE/components/YourModuleDetailSheet.tsx

import React from 'react';
import { BaseDetailSheet } from '@/components/shared/sheets/BaseDetailSheet';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { getYourDocTypeConfig } from './configs/YOUR_DOCTYPE.config';

export type YourDocType = 'type1' | 'type2';

export interface YourModuleDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  docType: YourDocType;
  data: any;
  onRefresh?: () => void;
  onEdit?: () => void;
}

export const YourModuleDetailSheet: React.FC<YourModuleDetailSheetProps> = ({
  isOpen,
  onClose,
  docType,
  data,
  onRefresh,
  onEdit,
}) => {
  const { t, language } = useLanguage();

  const getConfig = () => {
    switch (docType) {
      case 'type1':
        return getYourDocTypeConfig(t, language, data);
      // ... more types
      default:
        throw new Error(`Unknown docType: ${docType}`);
    }
  };

  const config = getConfig();

  return (
    <BaseDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      config={config}
      data={data}
      onRefresh={onRefresh}
      onEdit={onEdit}
      handlers={{
        onRefresh,
        onEdit,
      }}
    />
  );
};
```

### الخطوة 4: الاستخدام في الصفحة

```typescript
// src/features/YOUR_MODULE/YourPage.tsx

import { YourModuleDetailSheet } from './components/YourModuleDetailSheet';

export default function YourPage() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleRowClick = (item: any) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  return (
    <>
      {/* Your table/list component */}
      
      {selectedItem && (
        <YourModuleDetailSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedItem(null);
          }}
          docType="type1"
          data={selectedItem}
          onRefresh={loadData}
          onEdit={() => {/* handle edit */}}
        />
      )}
    </>
  );
}
```

---

## 💡 Best Practices

### 1. Stats
- استخدم حتى 3 إحصائيات فقط
- اختر ألوان مناسبة: `'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'`
- استخدم `format` function لتنسيق القيم

### 2. Tabs
- احرص على أن يكون لكل tab `icon` واضح
- استخدم `badge` لعرض أعداد (مثل: عدد العناصر)
- اجعل كل tab component منفصل في ملف خاص

### 3. Actions
- استخدم `show` function لإخفاء/إظهار الأزرار بناءً على الحالة
- استخدم `confirm` لحذف أو تعطيل
- استخدم `variant` المناسب:
  - `'default'` - للإجراءات الأساسية
  - `'outline'` - للإجراءات الثانوية
  - `'destructive'` - للحذف
  - `'ghost'` - للإجراءات الخفيفة

### 4. Loading & Error States
- احرص على وجود loading state في كل tab يحمّل بيانات
- استخدم `toast` من `sonner` لعرض الأخطاء

### 5. RTL Support
- استخدم `me-*` بدلاً من `mr-*`
- استخدم `ms-*` بدلاً من `ml-*`
- استخدم `start` و `end` بدلاً من `left` و `right`
- استخدم `text-start` بدلاً من `text-left`

---

## 🔥 مثال حقيقي: SaaS Module

راجع هذه الملفات كمرجع:
- `src/features/saas/components/SaaSDetailSheet.tsx`
- `src/features/saas/components/configs/plan.config.ts`
- `src/features/saas/components/tabs/plan/*.tsx`

---

## 🐛 Troubleshooting

### المشكلة: Focus Loop
- **السبب**: استخدام MotionSheet أو مكونات animation معقدة
- **الحل**: استخدم `BaseDetailSheet` الذي يستخدم `Sheet` من shadcn/ui

### المشكلة: Infinite Re-renders
- **السبب**: handlers غير مُـmemoized
- **الحل**: استخدم `useCallback` للـ handlers:
  ```typescript
  const loadData = useCallback(async () => {
    // load data
  }, []);
  ```

### المشكلة: Translations Missing
- **السبب**: نسيت إضافة مفتاح في جميع اللغات
- **الحل**: أضف المفتاح في جميع الملفات الـ 9

---

## 📚 المراجع

- `src/components/shared/sheets/BaseDetailSheet.tsx` - المكون الأساسي
- `src/components/shared/sheets/types.ts` - الأنواع
- `UNIFIED_SHEETS_SYSTEM_COMPLETE.md` - التوثيق الكامل

---

**Happy Coding! 🚀**
