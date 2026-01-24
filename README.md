# TexaCore ERP System

> **جودة تستحق الثقة | Quality You Can Trust**

نظام إدارة موارد المؤسسات (ERP) متعدد المستأجرين مبني على React + TypeScript + Supabase

---

## 🚀 المميزات

- ✅ **Multi-Tenant Architecture** - كل مشترك له Tenant خاص
- ✅ **Accounting Module** - المحاسبة الكاملة
- ✅ **SaaS Management System** - إدارة المشتركين
- ✅ **Agent/Reseller System** - نظام الوكلاء
- ✅ **White Label System** - تخصيص العلامة التجارية
- ✅ **Multi-language Support** - 9 لغات مدعومة
- ✅ **Dark Mode** - الوضع الليلي
- ✅ **Responsive Design** - تصميم متجاوب

---

## 📋 المتطلبات

- Node.js 18+
- npm أو yarn
- حساب Supabase

---

## 🛠️ التثبيت

```bash
# 1. استنساخ المشروع
git clone <repository-url>
cd "erpsystem supabase"

# 2. تثبيت الحزم
npm install

# 3. إعداد Environment Variables
cp .env.example .env
# عدّل .env وأضف بيانات Supabase

# 4. تشغيل المشروع
npm run dev
```

---

## 🔐 Environment Variables

أنشئ ملف `.env` في الجذر:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📁 هيكل المشروع

```
src/
├── app/              # App providers and configuration
├── components/       # Shared components
├── features/         # Feature modules (accounting, saas, etc.)
├── hooks/            # Custom React hooks
├── i18n/             # Translations (9 languages)
├── lib/              # Utilities & Supabase Client
├── services/         # API Services
└── types/            # TypeScript Types

docs/
└── COMPLETE_REFERENCE_GUIDE.md  # 📖 المرجع الشامل

supabase/
└── migrations/       # Database Migrations
```

---

## 📚 التوثيق

| الملف | المحتوى |
|-------|---------|
| 📖 `docs/COMPLETE_REFERENCE_GUIDE.md` | **المرجع الشامل** - يحتوي على 13 قسم شامل |
| 📜 `PROJECT_CONSTITUTION.md` | دستور المشروع - القواعد الإلزامية |
| 🤖 `.cursorrules` | قواعد التصميم للـ AI |

---

## 🧪 الأوامر

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

---

## 📝 القواعد الإلزامية

### 1. الترجمة
استخدم `t()` دائماً - لا نصوص ثابتة

### 2. Services
استخدم Services وليس Supabase مباشرة

### 3. Authentication
استخدم `useAuth` hook

### 4. Error Handling
استخدم try/catch مع `t()` للرسائل

**📖 للتفاصيل:** راجع `docs/COMPLETE_REFERENCE_GUIDE.md` القسم 7

---

## 🌐 اللغات المدعومة

| اللغة | الكود |
|-------|-------|
| العربية | ar |
| الإنجليزية | en |
| الروسية | ru |
| الأوكرانية | uk |
| التركية | tr |
| الألمانية | de |
| البولندية | pl |
| الرومانية | ro |
| الإيطالية | it |

---

## 🏢 Platform Owner

| المعلومة | القيمة |
|----------|--------|
| **Super Admin** | feras1960@gmail.com |
| **Tenant** | NexRev Platform |
| **Company** | Next Revolution |

---

## 📞 معلومات الاتصال

- **Email:** feras1960@gmail.com
- **Platform:** NexRev Platform

---

**آخر تحديث:** يناير 2026  
**الإصدار:** 2.0.0
