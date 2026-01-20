# ERP System - Supabase Edition

نظام إدارة موارد المؤسسات (ERP) مبني على React + TypeScript + Supabase

## 🚀 المميزات

- ✅ Multi-Tenant Architecture
- ✅ Accounting Module (المحاسبة)
- ✅ SaaS Management System
- ✅ Agent/Reseller System
- ✅ White Label System
- ✅ Multi-language Support (9 لغات)
- ✅ Dark Mode
- ✅ Responsive Design

## 📋 المتطلبات

- Node.js 18+
- npm أو yarn
- حساب Supabase

## 🛠️ التثبيت

```bash
# 1. استنساخ المشروع
git clone <repository-url>
cd "erpsystem supabase"

# 2. تثبيت الحزم
npm install

# 3. إعداد Environment Variables
cp .env.example .env
# ثم عدّل .env وأضف:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. تشغيل المشروع
npm run dev
```

## 📁 هيكل المشروع

```
src/
├── app/              # App providers and configuration
├── components/       # Shared components
├── features/         # Feature modules
│   ├── accounting/   # Accounting module
│   ├── saas/         # SaaS management
│   └── ...
├── hooks/            # Custom React hooks
├── i18n/             # Translations (9 languages)
├── lib/              # Utilities
└── services/         # API services
```

## 🔐 Environment Variables

أنشئ ملف `.env` في الجذر:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📚 التوثيق

- `PROJECT_CONSTITUTION.md` - دستور المشروع
- `MANDATORY_RULES.md` - القواعد الإلزامية
- `TRANSLATION_GUIDELINES.md` - دليل الترجمة
- `DEVELOPMENT_RULES.md` - قواعد التطوير
- `TROUBLESHOOTING.md` - استكشاف الأخطاء

## 🗄️ Database Migrations

جميع migrations موجودة في `supabase/migrations/`:

- `STEP_20_*.sql` - RLS Policies
- `STEP_21_*.sql` - Verify Relationships
- `STEP_22_*.sql` - Final Verification
- `STEP_23_*.sql` - Agent System
- `STEP_24_*.sql` - Advanced Features
- `STEP_25_*.sql` - White Label System

## 🧪 التطوير

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 القواعد الإلزامية

1. **الترجمة**: استخدم `t()` دائماً - لا نصوص ثابتة
2. **Services**: استخدم Services وليس Supabase مباشرة
3. **Authentication**: استخدم `useAuth` hook
4. **Error Handling**: استخدم try/catch مع `t()` للرسائل

راجع `MANDATORY_RULES.md` للتفاصيل.

## 🌐 اللغات المدعومة

- العربية (ar)
- الإنجليزية (en)
- الروسية (ru)
- الأوكرانية (uk)
- التركية (tr)
- الألمانية (de)
- البولندية (pl)
- الرومانية (ro)
- الإيطالية (it)

## 📄 الترخيص

[أضف الترخيص هنا]

## 👥 المساهمون

[أضف أسماء المساهمين]

---

**آخر تحديث:** 2026-01-19
**الإصدار:** 1.0.0
