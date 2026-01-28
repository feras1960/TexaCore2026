# 🏗️ خطة إعادة هيكلة الموديولات
**التاريخ:** 24 يناير 2026

---

## 📋 المشاكل الحالية

### 1. موديولات مكررة (يجب حذفها):
- ❌ `realestate` (25) → استخدم `real_estate` (7)
- ❌ نسخة ثانية من `purchases`
- ❌ نسخة ثانية من `accounting`

### 2. موديولات إدارية متفرقة (يجب دمجها):
- `users` (المستخدمون)
- `companies` (الشركات والفروع)
- `activity_log` (سجل الأنشطة)
- `system_config` (الإعدادات)
- (غير موجود) API Access

### 3. موديولات مفقودة (يجب إضافتها):
- 🏥 Healthcare/Hospitals (المشافي)
- 👨‍⚕️ Doctors Management (إدارة الأطباء)

---

## ✅ الهيكلية الجديدة المقترحة

### المجموعة 1: Core (النظام الأساسي)
```
1. dashboard (لوحة التحكم)
2. core (النظام الأساسي)
```

### المجموعة 2: Settings (الإعدادات) ← دمج هنا
```
3. settings (الإعدادات الشاملة)
   ├─ المستخدمون والصلاحيات (users)
   ├─ الشركات والفروع (companies)
   ├─ سجل الأنشطة (activity_log)
   ├─ إعدادات النظام (system_config)
   └─ API Access (جديد)
```

### المجموعة 3: Accounting (المحاسبة)
```
4. accounting (المحاسبة الكاملة)
5. funds (إدارة الصناديق)
```

### المجموعة 4: Operations (العمليات الأساسية)
```
6. crm (إدارة العملاء)
7. sales (المبيعات)
8. purchases (المشتريات)
9. inventory (المخزون)
10. payments (المدفوعات)
```

### المجموعة 5: Specialized Modules (الموديولات المتخصصة)
```
11. real_estate (العقارات)
12. fabric (الأقمشة)
13. pos (نقاط البيع)
14. exchange (الصرافة)
15. pharmacy (الصيدلة)
16. restaurant (المطاعم)
17. gold (الذهب والمجوهرات)
18. manufacturing (التصنيع)
19. 🏥 healthcare (المشافي) ← جديد
20. 👨‍⚕️ doctors (إدارة الأطباء) ← جديد
```

### المجموعة 6: Advanced (متقدم)
```
21. hr (الموارد البشرية)
22. ai_analytics (التحليلات الذكية)
23. e-commerce (المتجر الإلكتروني)
24. saas (إدارة SaaS)
```

### المجموعة 7: Development (للتطوير)
```
25. component_lab (مختبر المكونات)
```

---

## 🗑️ موديولات للحذف

```sql
-- حذف المكررات
DELETE FROM modules WHERE module_code = 'realestate'; -- استخدم real_estate
-- (تحقق من purchases و accounting المكررة)
```

---

## ➕ موديولات للإضافة

### 1. Healthcare (المشافي)
```sql
INSERT INTO modules (
    module_code, 
    name_ar, name_en, name_de, name_tr, name_ru, name_uk, name_it, name_pl, name_ro,
    description_ar, description_en,
    icon, color, category, display_order, is_core, requires_setup
) VALUES (
    'healthcare',
    'إدارة المشافي',
    'Healthcare Management',
    'Krankenhausverwaltung',
    'Sağlık Yönetimi',
    'Управление здравоохранением',
    'Управління охороною здоров''я',
    'Gestione Sanitaria',
    'Zarządzanie Opieką Zdrowotną',
    'Gestionarea Sănătății',
    
    'نظام شامل لإدارة المشافي والمراكز الطبية',
    'Comprehensive hospital and medical center management system',
    
    'Hospital',
    'blue',
    'specialized',
    19,
    false,
    true
);
```

### 2. Doctors Management (إدارة الأطباء)
```sql
INSERT INTO modules (
    module_code, 
    name_ar, name_en, name_de, name_tr, name_ru, name_uk, name_it, name_pl, name_ro,
    description_ar, description_en,
    icon, color, category, display_order, is_core, requires_setup
) VALUES (
    'doctors',
    'إدارة الأطباء',
    'Doctors Management',
    'Ärzteverwaltung',
    'Doktor Yönetimi',
    'Управление врачами',
    'Управління лікарями',
    'Gestione Medici',
    'Zarządzanie Lekarzami',
    'Gestionarea Medicilor',
    
    'إدارة الأطباء والمواعيد والسجلات الطبية',
    'Manage doctors, appointments, and medical records',
    
    'Stethoscope',
    'teal',
    'specialized',
    20,
    false,
    true
);
```

---

## 🔄 إعادة هيكلة Settings

### إنشاء موديول Settings الموحد:
```sql
-- تحديث system_config ليكون settings شامل
UPDATE modules 
SET 
    module_code = 'settings',
    name_ar = 'الإعدادات',
    name_en = 'Settings',
    category = 'core',
    display_order = 3,
    description_ar = 'إعدادات النظام والمستخدمين والشركات',
    description_en = 'System, users, and companies settings'
WHERE module_code = 'system_config';

-- إخفاء الموديولات المدمجة (لن تظهر في Sidebar الرئيسي)
UPDATE modules 
SET is_active = false, category = 'hidden'
WHERE module_code IN ('users', 'companies', 'activity_log');
```

---

## 📊 العدد النهائي المتوقع

- الموديولات الرئيسية: **~20-22**
- بعد الحذف والدمج والإضافة
- أكثر تنظيماً وأقل ازدحاماً

---

## ⚙️ خطوات التنفيذ

### Phase 1: التنظيف (Cleanup)
1. [ ] حذف الموديولات المكررة
2. [ ] التحقق من البيانات المرتبطة

### Phase 2: الدمج (Merge)
1. [ ] إنشاء Settings موحد
2. [ ] إخفاء الموديولات المدمجة
3. [ ] تحديث الـ UI

### Phase 3: الإضافة (Add)
1. [ ] إضافة Healthcare
2. [ ] إضافة Doctors
3. [ ] تفعيلهم للـ tenants

### Phase 4: الاختبار (Testing)
1. [ ] اختبار Sidebar الجديد
2. [ ] اختبار الصلاحيات
3. [ ] اختبار الموديولات الجديدة

---

**ملاحظة:** هذه خطة مقترحة - يجب مراجعتها والموافقة عليها قبل التنفيذ!
