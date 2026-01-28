# 📱 TexaMobile

**Multi-tenant ERP Mobile Application**

<div align="center">

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

*Modern Glassmorphism Design • Multi-tenant Architecture • Role-Based Access Control*

</div>

---

## ✨ نظرة عامة

تطبيق موبايل ERP متعدد المستأجرين يخدم ثلاث قطاعات رئيسية:

- 🧵 **Fabric** - إدارة الأقمشة والمخازن
- 💱 **Exchange** - عمليات الصرافة
- 🏥 **Healthcare** - إدارة المشافي والعيادات

### 🎯 الميزات الرئيسية

- ✅ **Modern Glassmorphism UI** - تصميم عصري بتأثيرات زجاجية
- ✅ **Dark/Light Mode** - دعم تلقائي للوضعين
- ✅ **Multi-tenant** - دعم عدة مستأجرين
- ✅ **Role-Based Access Control** - صلاحيات حسب الدور
- ✅ **Biometric Authentication** - دعم البصمة والوجه
- ✅ **Offline-First** (قريباً)
- ✅ **Real-time Updates** (قريباً)
- ✅ **Multi-language** (قريباً: AR/EN)

---

## 🚀 البدء السريع

### المتطلبات

```bash
Node.js >= 18
npm or yarn
Expo CLI
```

### التثبيت

```bash
# 1. Clone Repository
git clone <repository-url>
cd TexaMobile

# 2. Install Dependencies
npm install

# 3. Configure Environment
cp .env.example .env
# عدّل .env بمعلومات Supabase الخاصة بك

# 4. Start Development Server
npx expo start --clear
```

### التشغيل

```bash
# Web (الأسرع للتطوير)
npx expo start --web

# iOS Simulator
npx expo start
# ثم اضغط: i

# Android Emulator
npx expo start
# ثم اضغط: a

# Physical Device (QR Code)
npx expo start
# امسح QR Code بكاميرا الهاتف
```

### بيانات تجريبية

```
📧 Email: test@texa.com
🔒 Password: Test@123456
```

---

## 📁 هيكل المشروع

```
TexaMobile/
├── app/                    # Expo Router Pages
│   ├── _layout.tsx        # Root Layout
│   ├── index.tsx          # Redirect Logic
│   ├── login.tsx          # Login Screen
│   └── (tabs)/            # Protected Routes
│
├── components/
│   ├── glass/             # Glass UI Components
│   └── layout/            # Layout Components
│
├── lib/
│   ├── supabase.ts        # Supabase Client
│   └── biometrics.ts      # Biometric Auth
│
├── contexts/
│   └── AuthContext.tsx    # Auth State Management
│
├── constants/
│   └── glassmorphism-theme.ts  # Design System
│
├── docs/                  # Documentation
│   ├── QUICK_START.md
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   └── MOBILE_APP_DOCUMENTATION.md
│
└── .env                   # Environment Variables
```

---

## 🎨 Design System

### Glassmorphism Components

```typescript
import {
  GlassView,
  GlassCard,
  GlassInput,
  GlassButton,
  GlassToast,
  GlassBackground,
} from '@/components/glass';

// Example
<GlassBackground>
  <GlassCard pressable onPress={handlePress}>
    <GlassInput placeholder="Email" />
    <GlassButton>Submit</GlassButton>
  </GlassCard>
</GlassBackground>
```

### Theme

- **Light Mode**: Gradient backgrounds, soft shadows
- **Dark Mode**: Dark glass, enhanced blur
- **Auto-switch**: Based on system preference

---

## 🔐 المصادقة

### Email/Password

```typescript
import { signIn, signOut } from '@/lib/supabase';

// Sign In
const { data, error } = await signIn(email, password);

// Sign Out
await signOut();
```

### Biometric (FaceID/TouchID)

```typescript
import { authenticateWithBiometrics } from '@/lib/biometrics';

const success = await authenticateWithBiometrics();
if (success) {
  // Auto login
}
```

### Role-Based Access

```typescript
import { hasRole, UserRole } from '@/lib/supabase';

if (hasRole(session, UserRole.ADMIN)) {
  // Show admin content
}
```

---

## 📊 Database Schema

```
tenants ──┬── companies
          │
          ├── user_profiles ──┬── auth.users
          │                   │
          └── user_roles ─────┴── user_role_assignments
```

### Key Tables

- `tenants` - المستأجرون (Fabric, Exchange, Healthcare)
- `companies` - الشركات التابعة
- `user_profiles` - بيانات المستخدمين
- `user_roles` - تعريف الأدوار
- `user_role_assignments` - ربط المستخدمين بالأدوار

---

## 🛠️ التقنيات المستخدمة

### Frontend
- **React Native** - UI Framework
- **Expo SDK 52** - Development Platform
- **TypeScript** - Type Safety
- **Expo Router** - File-based Routing
- **Reanimated v4.1** - Smooth Animations
- **expo-blur** - Glass Blur Effect

### Backend
- **Supabase** - BaaS (Backend as a Service)
- **PostgreSQL** - Database
- **Supabase Auth** - Authentication
- **Row Level Security (RLS)** - Security

### State Management
- **React Context** - Global State
- **React Hooks** - Local State
- **React Query** (future) - Server State

---

## 📚 التوثيق

### وثائق شاملة

- 📖 [**التوثيق الشامل**](./docs/MOBILE_APP_DOCUMENTATION.md) - 500+ سطر
- 🚀 [**دليل البدء السريع**](./docs/QUICK_START.md)
- 🏗️ [**البنية المعمارية**](./docs/ARCHITECTURE.md)
- 🔌 [**توثيق API**](./docs/API_DOCUMENTATION.md)
- 📝 [**سجل التغييرات**](./docs/CHANGELOG.md)

---

## 🧪 الاختبار

```bash
# Unit Tests (future)
npm run test

# E2E Tests (future)
npm run test:e2e

# Type Check
npm run typecheck

# Lint
npm run lint
```

---

## 📦 البناء والنشر

### Development Build

```bash
npx expo build:ios
npx expo build:android
```

### Production Build (EAS)

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Both
eas build --platform all
```

### OTA Updates

```bash
# Publish update
eas update --branch production --message "Bug fixes"
```

---

## 🎯 الحالة الحالية

### ✅ مكتمل (MVP v1.0.0)

- ✅ Glassmorphism Design System
- ✅ Login Screen with Animations
- ✅ Supabase Integration
- ✅ Role-Based Access Control
- ✅ Auth Context & State Management
- ✅ Web Platform Support
- ✅ Mock Dashboard Screens
- ✅ Database Setup with Test User

### 🚧 قيد التطوير

- ⏳ Admin Dashboard - Full UI
- ⏳ Biometric Login - Functional
- ⏳ Multi-language Support (AR/EN)
- ⏳ Data Tables & Forms
- ⏳ Charts & Statistics

### 🔮 المستقبل

- 📅 Offline Mode (SQLite/Realm)
- 📅 Push Notifications
- 📅 Camera & Barcode Scanner
- 📅 File Upload (Images/PDFs)
- 📅 Real-time Updates (Supabase Realtime)
- 📅 Core Modules (Fabric, Exchange, Healthcare)

---

## 🐛 حل المشاكل

### Port Conflict
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
npx expo start --clear
```

### Cache Issues
```bash
# Clear Metro cache
npx expo start --clear

# Or full reset
rm -rf node_modules
npm install
```

### Environment Variables
```bash
# تأكد من استخدام EXPO_PUBLIC_ prefix
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 🤝 المساهمة

هذا مشروع خاص لـ **Next Revolution Company**.

### Development Guidelines

1. اتبع Clean Architecture principles
2. استخدم TypeScript بدقة
3. اكتب كود قابل للصيانة
4. أضف تعليقات للكود المعقد
5. حدّث التوثيق عند إضافة ميزات

---

## 📄 الترخيص

**Private Project** - جميع الحقوق محفوظة لـ Next Revolution Company.

---

## 👥 الفريق

**Developer:** Next Revolution Company  
**Project:** TexaMobile - Multi-tenant ERP  
**Version:** 1.0.0 (MVP)  
**Date:** يناير 2026

---

## 📞 الدعم

للمساعدة والأسئلة:
- راجع [التوثيق](./docs/MOBILE_APP_DOCUMENTATION.md)
- افتح Issue في Repository الداخلي
- تواصل مع الفريق التقني

---

<div align="center">

**Built with ❤️ using React Native + Expo + Supabase**

*Modern • Secure • Scalable*

</div>
