# 📚 TexaCore ERP - التوثيق الشامل
# Complete System Documentation

<div align="center">

![TexaCore ERP](https://img.shields.io/badge/TexaCore-ERP-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)

**نظام تخطيط موارد المؤسسات المتكامل لتجارة الأقمشة**

[العربية](#العربية) | [English](#english)

</div>

---

## 📋 فهرس المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [البنية التقنية](#2-البنية-التقنية)
3. [الأقسام الرئيسية](#3-الأقسام-الرئيسية)
4. [دليل البدء السريع](#4-دليل-البدء-السريع)
5. [الملفات التوثيقية](#5-الملفات-التوثيقية)

---

## 1. نظرة عامة

### ما هو TexaCore ERP؟

TexaCore ERP هو نظام متكامل لإدارة موارد المؤسسات مُصمم خصيصاً لتجارة الأقمشة، يعمل كمنصة SaaS متعددة المستأجرين.

### الإحصائيات الرئيسية

| البند | القيمة |
|-------|--------|
| **إجمالي الجداول** | 172 جدول |
| **الميزات** | 85+ ميزة |
| **الأقسام** | 7 أقسام رئيسية |
| **اللغات** | 9 لغات |
| **الحالة** | ✅ جاهز للإنتاج |

### المميزات الرئيسية

- 🏢 **Multi-Tenant**: عزل بيانات كامل لكل عميل
- ☁️ **SaaS Ready**: جاهز للبيع كخدمة
- 🌐 **White Label**: قابل للتخصيص بعلامات تجارية
- 📱 **Mobile Ready**: تطبيق جوال (TexaMobile)
- 🔒 **Secure**: RLS + Row Level Security
- 🌍 **Multi-Language**: 9 لغات مدعومة

---

## 2. البنية التقنية

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        TEXACORE ERP STACK                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend          │  Backend           │  Database              │
│  ─────────────     │  ────────────      │  ──────────            │
│  • React 18        │  • Supabase        │  • PostgreSQL          │
│  • TypeScript      │  • Edge Functions  │  • RLS Policies        │
│  • Vite            │  • REST API        │  • 172 Tables          │
│  • Tailwind CSS    │  • Realtime        │  • 400+ Indexes        │
│  • AG-Grid         │                    │                        │
│                                                                  │
│  Mobile            │  Auth              │  Storage               │
│  ─────────────     │  ────────────      │  ──────────            │
│  • React Native    │  • Supabase Auth   │  • Supabase Storage    │
│  • Expo            │  • JWT Tokens      │  • CDN                 │
│                    │  • Row Level Sec   │                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### هيكل قاعدة البيانات

```
172 Tables organized in:
├── 📗 Accounting (23 tables)
├── 📦 Warehouse (27 tables)
├── 💰 Sales (19 tables)
├── 🛒 Purchases (6 tables)
├── 👥 Agents (12 tables)
├── 🏢 Multi-Tenant (16 tables)
├── ☁️ SaaS Platform (24 tables)
└── 📊 Others (45 tables)
```

---

## 3. الأقسام الرئيسية

### 📗 المحاسبة (Accounting)
إدارة مالية متكاملة مع دليل حسابات شجري، قيود محاسبية مزدوجة، وتقارير مالية.

### 📦 المستودعات (Warehouse)
إدارة مخازن الأقمشة مع تتبع الرولونات، الكونتينرات، الجرد، والحجوزات.

### 💰 المبيعات (Sales)
إدارة العملاء، الطلبات، الفواتير، قوائم الأسعار، والخصومات.

### 🛒 المشتريات (Purchases)
إدارة الموردين، أوامر الشراء، وفواتير المشتريات.

### 👥 الوكلاء (Agents)
نظام وكلاء متكامل مع عمولات، أهداف، ومكافآت.

### 🏢 Multi-Tenant
بنية تعدد المستأجرين مع عزل بيانات كامل وصلاحيات متقدمة.

### ☁️ SaaS Platform
منصة SaaS متكاملة مع خطط اشتراك، فوترة، و White Label.

---

## 4. دليل البدء السريع

### المتطلبات

```bash
Node.js >= 18
npm >= 9
Supabase CLI
```

### التثبيت

```bash
# Clone the repository
git clone <repo-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

### الوصول للنظام

```
URL: http://localhost:3000
```

---

## 5. الملفات التوثيقية

| الملف | الوصف |
|-------|-------|
| [FULL_DOCUMENTATION.md](./FULL_DOCUMENTATION.md) | التوثيق الكامل |
| [FEATURE_MATRIX.md](./FEATURE_MATRIX.md) | مصفوفة الميزات |
| [DATABASE_DICTIONARY.md](./DATABASE_DICTIONARY.md) | قاموس البيانات |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | توثيق API |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | قواعد الأعمال |
| [GLOSSARY.md](./GLOSSARY.md) | قاموس المصطلحات |

---

## 📞 الدعم

للمساعدة أو الاستفسارات:
- 📧 Email: support@texacore.com
- 📱 WhatsApp: +XXX-XXX-XXXX

---

**© 2026 TexaCore ERP. All Rights Reserved.**
