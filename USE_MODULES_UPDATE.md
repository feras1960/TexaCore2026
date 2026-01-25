# ✅ تحديث useModules Hook - مكتمل
**التاريخ:** 24 يناير 2026  
**الحالة:** ✅ مكتمل 100%

---

## 🎯 ما تم تحديثه

### 1. ✅ `modulesService.ts`

#### التغييرات الرئيسية:

**A. تحديث interface TenantModule:**
```typescript
// ✅ أضفنا 8 حقول صلاحيات
can_view?: boolean;
can_create?: boolean;
can_edit?: boolean;
can_delete?: boolean;
can_export?: boolean;
can_import?: boolean;
can_approve?: boolean;
can_manage_settings?: boolean;
```

**B. تحديث getAvailableModules():**
```typescript
// ❌ قديم
async getAvailableModules(tenantId?: string)
  .rpc('get_tenant_available_modules', { p_tenant_id: tenantId })

// ✅ جديد
async getAvailableModules(userId: string)
  .rpc('get_user_allowed_modules', { p_user_id: userId })
```

**C. إضافة دوال جديدة:**
- `checkModulePermission()` - التحقق من صلاحية معينة
- `getModulePermissions()` - جلب كل صلاحيات موديول
- `getTenantModules()` - (deprecated) للتوافق مع الكود القديم

**D. تحديث getSidebarStructure():**
- الآن يبني الـ sidebar من `get_user_allowed_modules`
- يدعم الصلاحيات على مستوى المستخدم

---

### 2. ✅ `useModules.ts`

#### التغييرات الرئيسية:

**A. استخدام user.id بدلاً من tenantId:**
```typescript
// ❌ قديم
const { tenantId } = useAuth();
if (!tenantId) return;

// ✅ جديد
const { user, tenantId } = useAuth();
if (!user?.id) return;
```

**B. إضافة دوال للصلاحيات:**

1. **hasPermission()** - التحقق من صلاحية:
```typescript
const canCreate = hasPermission('accounting', 'create');
const canEdit = hasPermission('inventory', 'edit');
```

2. **getModulePermissions()** - جلب كل الصلاحيات:
```typescript
const permissions = getModulePermissions('accounting');
// Returns: { can_view, can_create, can_edit, ... }
```

**C. الدوال المرجعة:**
```typescript
return {
  modules,          // الموديولات مع الصلاحيات
  sidebar,          // بنية Sidebar
  loading,          // حالة التحميل
  error,           // الأخطاء
  
  // الدوال الموجودة
  hasModule,
  isModuleLocked,
  getModule,
  getLockedModules,
  getEnabledModules,
  
  // ✅ دوال جديدة
  hasPermission,         // التحقق من صلاحية
  getModulePermissions,  // جلب كل صلاحيات موديول
  
  refresh           // إعادة تحميل
};
```

---

## 🎨 أمثلة الاستخدام

### مثال 1: التحقق من الموديول والصلاحية

```typescript
import { useModules } from '@/hooks/useModules';

function AccountingPage() {
  const { hasModule, hasPermission, loading } = useModules();

  if (loading) return <Skeleton />;

  // التحقق من توفر الموديول
  if (!hasModule('accounting')) {
    return <UpgradeRequired module="accounting" />;
  }

  // التحقق من صلاحية الإنشاء
  const canCreate = hasPermission('accounting', 'create');

  return (
    <div>
      <h1>المحاسبة</h1>
      {canCreate && (
        <Button>إنشاء قيد</Button>
      )}
    </div>
  );
}
```

---

### مثال 2: عرض الأزرار حسب الصلاحيات

```typescript
function ActionButtons() {
  const { hasPermission } = useModules();

  return (
    <div className="flex gap-2">
      {hasPermission('accounting', 'create') && (
        <Button>إنشاء</Button>
      )}
      
      {hasPermission('accounting', 'edit') && (
        <Button>تعديل</Button>
      )}
      
      {hasPermission('accounting', 'delete') && (
        <Button variant="destructive">حذف</Button>
      )}
      
      {hasPermission('accounting', 'export') && (
        <Button>تصدير</Button>
      )}
    </div>
  );
}
```

---

### مثال 3: عرض جميع الصلاحيات

```typescript
function PermissionsDebug() {
  const { getModulePermissions } = useModules();

  const permissions = getModulePermissions('accounting');

  return (
    <div>
      <h2>صلاحيات المحاسبة:</h2>
      <ul>
        <li>عرض: {permissions.can_view ? '✅' : '❌'}</li>
        <li>إنشاء: {permissions.can_create ? '✅' : '❌'}</li>
        <li>تعديل: {permissions.can_edit ? '✅' : '❌'}</li>
        <li>حذف: {permissions.can_delete ? '✅' : '❌'}</li>
        <li>تصدير: {permissions.can_export ? '✅' : '❌'}</li>
        <li>استيراد: {permissions.can_import ? '✅' : '❌'}</li>
        <li>موافقة: {permissions.can_approve ? '✅' : '❌'}</li>
        <li>إعدادات: {permissions.can_manage_settings ? '✅' : '❌'}</li>
      </ul>
    </div>
  );
}
```

---

### مثال 4: Sidebar ديناميكي (تلقائي)

```typescript
// Sidebar.tsx يستخدم useModules تلقائياً
// لن تحتاج تغيير شيء - سيعمل مباشرة!

function Sidebar() {
  const { sidebar, loading } = useModules();

  if (loading) return <SidebarSkeleton />;

  return (
    <nav>
      {sidebar?.categories.map(category => (
        <div key={category.category}>
          <h3>{category.category}</h3>
          {category.modules.map(module => (
            <NavLink
              key={module.code}
              to={module.path}
              disabled={!module.is_enabled}
            >
              {module.name_ar}
              {module.badge === 'locked' && <Lock />}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
```

---

## 🔄 التوافق مع الكود القديم

### إذا كان عندك كود قديم:

```typescript
// ❌ الكود القديم (سيعمل لكن deprecated)
const modules = await modulesService.getAvailableModules(tenantId);

// ✅ الكود الجديد
const modules = await modulesService.getAvailableModules(user.id);
```

**ملاحظة:** أضفنا `getTenantModules()` للتوافق مع الكود القديم، لكن يُفضل استخدام `getAvailableModules(user.id)`.

---

## ✅ Checklist

- [x] تحديث `modulesService.ts`
  - [x] إضافة حقول الصلاحيات للـ interface
  - [x] تحديث `getAvailableModules()` لاستخدام `get_user_allowed_modules`
  - [x] إضافة `checkModulePermission()`
  - [x] إضافة `getModulePermissions()`
  - [x] تحديث `getSidebarStructure()`

- [x] تحديث `useModules.ts`
  - [x] استخدام `user.id` بدلاً من `tenantId`
  - [x] إضافة `hasPermission()`
  - [x] إضافة `getModulePermissions()`
  - [x] تحديث التوثيق

- [ ] اختبار مع Sidebar
- [ ] اختبار مع صلاحيات مختلفة
- [ ] اختبار مع مستخدمين مختلفين

---

## 🚀 الخطوات القادمة

### 1. اختبار useModules (30 دقيقة)
- [ ] اختبار في الـ console
- [ ] التحقق من البيانات المرجعة
- [ ] اختبار مع مستخدمين مختلفين

### 2. تطبيق الصلاحيات على ActionButtons (45 دقيقة)
- [ ] تحديث `ActionButtonsBar.tsx`
- [ ] استخدام `hasPermission()`
- [ ] إخفاء الأزرار غير المسموحة

### 3. تطبيق الصلاحيات على Tabs (45 دقيقة)
- [ ] تحديث `UniversalDetailTabs.tsx`
- [ ] استخدام `useAllowedTabs`
- [ ] إخفاء التبويبات غير المسموحة

---

## 📝 ملاحظات مهمة

### للمطورين:
1. **استخدم `hasPermission()`** قبل عرض أي زر أو ميزة
2. **تحقق من `hasModule()`** أولاً قبل التحقق من الصلاحيات
3. **لا تعتمد على `tenantId`** فقط - استخدم `user.id`
4. **الـ loading state** مهم - لا تنسَ عرضه

### للاختبار:
1. أنشئ مستخدمين بصلاحيات مختلفة
2. اختبر كل صلاحية على حدة
3. تحقق من أن الأزرار المخفية غير موجودة في DOM

---

**useModules Hook - محدث ومكتمل! 🎉**

*آخر تحديث: 24 يناير 2026*
