# Deprecated Components

هذه المكونات تم نقلها هنا لأنها:
- غير مستخدمة في الكود الفعلي
- تم استبدالها بمكونات أحدث
- مستخدمة فقط للعرض/التوثيق في ComponentLab

سيتم حذفها في الإصدار القادم.

## قائمة المكونات

### من shared/actions:
- `ActionButtonsBar.tsx` - غير مستخدم

### من shared/status:
- `StatusManager.tsx` - غير مستخدم
- `StatusSelector.tsx` - غير مستخدم

### من shared/tabs:
- `DynamicTabs.tsx` - غير مستخدم

### من shared/:
- `InterfaceModeToggle.tsx` - غير مستخدم
- `FormEditor.tsx` - غير مستخدم

### من ui-pro/:
- `AnimatedButton.tsx` - مستخدم فقط في DesignSystemDemo
- `AnimatedCard.tsx` - مستخدم فقط في DesignSystemDemo
- `AnimatedList.tsx` - مستخدم فقط في DesignSystemDemo
- `GlassCard.tsx` - مستخدم فقط في DesignSystemDemo
- `StatsCard.tsx` - مكرر مع StatCard (من shared/stats)

### من sheets/:
- `SimplePlanSheet.tsx` - تم استبداله بـ SaaSDetailSheet
- `SimpleSheet.tsx` - تم استبداله بـ BaseDetailSheet

## البدائل المستخدمة

- بدلاً من `SimplePlanSheet` → استخدم `SaaSDetailSheet`
- بدلاً من `StatsCard` (ui-pro) → استخدم `StatCard` (shared/stats)
- بدلاً من `SimpleSheet` → استخدم `BaseDetailSheet`

---

التاريخ: 2026-01-28
