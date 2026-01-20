# خطة تطوير نظام SaaS - TexaCore ERP

## نظرة عامة

هذه الوثيقة تحدد خطة التطوير الشاملة لنظام SaaS وربطه مع Supabase Backend.

---

## الحالة الحالية

### ما تم إنجازه:
- ✅ بنية Multi-Tenant كاملة
- ✅ RLS Policies للعزل
- ✅ جداول SaaS (agents, tenants, white_label_domains)
- ✅ خدمات Frontend (agentsService, tenantsService, whiteLabelService)
- ✅ تبويبات SaaS مُبسطة (من 15 إلى 10)
- ✅ نظام الترجمة (9 لغات)

### ما يحتاج إكمال:
- ⏳ ربط واجهات SaaS مع الخدمات
- ⏳ نظام المدفوعات (Stripe/Paddle)
- ⏳ نظام الإشعارات
- ⏳ Dashboard SaaS مع إحصائيات حية

---

## هيكلية الخدمات

```
src/services/
├── Core Services (مكتمل)
│   ├── accountsService.ts      # شجرة الحسابات
│   ├── journalEntriesService.ts # القيود اليومية
│   ├── companiesService.ts     # الشركات
│   ├── productsService.ts      # المنتجات
│   └── warehousesService.ts    # المستودعات
│
├── SaaS Services (جديد)
│   ├── agentsService.ts        # الوكلاء ✅
│   ├── tenantsService.ts       # المشتركين ✅
│   ├── whiteLabelService.ts    # White Label ✅
│   ├── packagesService.ts      # الباقات (مطلوب)
│   ├── paymentsService.ts      # المدفوعات (مطلوب)
│   └── couponsService.ts       # القسائم (مطلوب)
│
└── Auth Services (مكتمل)
    └── authService.ts          # المصادقة
```

---

## خطة التطوير المرحلية

### المرحلة 1: الربط الأساسي (أسبوع 1)

**المهام:**
1. ربط صفحة Subscribers مع tenantsService
2. ربط صفحة Agents مع agentsService
3. ربط صفحة White Label مع whiteLabelService

**الملفات المتأثرة:**
- `src/features/saas/Subscribers.tsx`
- `src/features/saas/Agents.tsx`
- `src/features/saas/WhiteLabel.tsx`

### المرحلة 2: نظام الباقات والمدفوعات (أسبوع 2)

**المهام:**
1. إنشاء packagesService.ts
2. إنشاء paymentsService.ts
3. ربط مع Stripe/Paddle

**الجداول المطلوبة:**
```sql
-- packages table
CREATE TABLE packages (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(200),
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_users INT,
  max_companies INT,
  features JSONB,
  is_active BOOLEAN DEFAULT true
);

-- payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  payment_method VARCHAR(50),
  status VARCHAR(20),
  stripe_payment_id VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### المرحلة 3: التقارير والتحليلات (أسبوع 3)

**المهام:**
1. Dashboard SaaS مع إحصائيات حية
2. تقارير الإيرادات
3. تحليلات الاستخدام

**البيانات المطلوبة:**
- إجمالي المشتركين (نشط/معلق/تجريبي)
- إجمالي الإيرادات الشهرية/السنوية
- معدل التحويل
- نسبة الاحتفاظ بالعملاء

### المرحلة 4: نظام الإشعارات والدعم (أسبوع 4)

**المهام:**
1. نظام الإشعارات (Email, Push, In-App)
2. نظام تذاكر الدعم
3. قاعدة المعرفة

---

## أنماط الكود المُوصى بها

### استخدام Services

```typescript
// ✅ صحيح - استخدام Service
import { tenantsService } from '@/services';

const TenantsList = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const data = await tenantsService.getAll();
        setTenants(data);
      } catch (error) {
        console.error('Error loading tenants:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTenants();
  }, []);
};
```

### استخدام الترجمة

```typescript
// ✅ صحيح - مفتاح مع بادئة
const { t } = useLanguage();
<h1>{t('saas.subscribers')}</h1>

// ❌ خطأ - مفتاح بدون بادئة
<h1>{t('subscribers')}</h1>
```

---

## الجداول الموجودة في Supabase

### جداول SaaS الأساسية:

| الجدول | الوصف | الحالة |
|--------|-------|--------|
| tenants | المشتركين | ✅ موجود |
| agents | الوكلاء | ✅ موجود |
| agent_commissions | عمولات الوكلاء | ✅ موجود |
| agent_withdrawals | سحوبات الوكلاء | ✅ موجود |
| white_label_domains | نطاقات White Label | ✅ موجود |
| packages | الباقات | ⏳ مطلوب |
| payments | المدفوعات | ⏳ مطلوب |
| coupons | القسائم | ⏳ مطلوب |
| referrals | الإحالات | ⏳ مطلوب |

---

## اختبار التكامل

### اختبار الخدمات:

```typescript
// Test agentsService
describe('agentsService', () => {
  it('should get all agents', async () => {
    const agents = await agentsService.getAll();
    expect(Array.isArray(agents)).toBe(true);
  });

  it('should create agent', async () => {
    const agent = await agentsService.create({
      code: 'TEST001',
      name: 'Test Agent',
      email: 'test@example.com',
    });
    expect(agent.id).toBeDefined();
  });
});
```

---

## الأمان

### RLS Policies:

```sql
-- Super Admin يمكنه رؤية كل شيء
CREATE POLICY super_admin_all ON tenants
FOR ALL USING (is_super_admin());

-- الوكيل يرى عملاءه فقط
CREATE POLICY agent_own_tenants ON tenants
FOR SELECT USING (
  agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  )
);
```

---

## التحسينات المقترحة

### أداء:
1. استخدام React Query للـ caching
2. Pagination للقوائم الطويلة
3. Lazy loading للمكونات

### UX:
1. Skeleton loaders أثناء التحميل
2. Toast notifications للإجراءات
3. Confirmation dialogs للحذف

### أمان:
1. Rate limiting للـ API
2. Input validation
3. CSRF protection

---

## الخطوات التالية الفورية

1. **اليوم**: ربط صفحة Agents مع agentsService
2. **غداً**: ربط صفحة Subscribers مع tenantsService
3. **هذا الأسبوع**: إكمال Dashboard SaaS

---

## المراجع

- `PROJECT_CONSTITUTION.md` - دستور المشروع
- `TRANSLATION_GUIDELINES.md` - دليل الترجمة
- `supabase/migrations/` - ملفات قاعدة البيانات

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
