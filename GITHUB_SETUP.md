# 🚀 إعداد GitHub - GitHub Setup Guide

## الخطوات

### 1. إنشاء Repository على GitHub

1. اذهب إلى [GitHub](https://github.com)
2. اضغط على **"New repository"** أو **"+"** → **"New repository"**
3. أدخل:
   - **Repository name**: `erpsystem-supabase` (أو أي اسم تريده)
   - **Description**: `ERP System built with React + TypeScript + Supabase`
   - **Visibility**: Private أو Public (حسب رغبتك)
   - **لا** تضع علامة على "Initialize with README" (لأننا لدينا README)
4. اضغط **"Create repository"**

### 2. ربط المشروع المحلي بـ GitHub

بعد إنشاء Repository، ستحصل على URL مثل:
- `https://github.com/username/erpsystem-supabase.git`

**في Terminal:**

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# إضافة remote
git remote add origin https://github.com/username/erpsystem-supabase.git

# أو إذا كان SSH:
# git remote add origin git@github.com:username/erpsystem-supabase.git
```

### 3. إضافة الملفات وعمل Commit

```bash
# إضافة جميع الملفات
git add .

# عمل commit أولي
git commit -m "Initial commit: ERP System with SaaS features

- Multi-tenant architecture
- Accounting module
- SaaS management system
- Agent/Reseller system
- White Label system
- Multi-language support (9 languages)
- Dark mode
- Responsive design"

# رفع إلى GitHub
git push -u origin main
```

**ملاحظة:** إذا كان اسم الفرع `master` بدلاً من `main`:
```bash
git branch -M main
git push -u origin main
```

### 4. التحقق

اذهب إلى Repository على GitHub وتحقق من:
- ✅ جميع الملفات موجودة
- ✅ README.md يظهر
- ✅ .gitignore يعمل (لا توجد node_modules)

---

## 🔐 إعداد Git (إذا لم يكن مُعداً)

```bash
# إعداد الاسم
git config --global user.name "Your Name"

# إعداد البريد الإلكتروني
git config --global user.email "your.email@example.com"

# التحقق
git config --list
```

---

## 📝 Commits القادمة

عند إضافة ميزات جديدة:

```bash
# إضافة الملفات
git add .

# Commit مع رسالة واضحة
git commit -m "Add: Feature description

- Detail 1
- Detail 2"

# Push
git push
```

---

## 🌿 Branches (اختياري)

```bash
# إنشاء branch جديد
git checkout -b feature/new-feature

# العمل على الميزة...
# ثم commit و push

# Merge إلى main
git checkout main
git merge feature/new-feature
git push
```

---

## ⚠️ ملاحظات مهمة

1. **لا ترفع `.env`** - تأكد من وجوده في `.gitignore`
2. **لا ترفع `node_modules`** - موجود في `.gitignore`
3. **لا ترفع `.vite`** - موجود في `.gitignore`
4. **تأكد من `.env.example`** - أضف مثال بدون قيم حقيقية

---

## 🔄 تحديث المشروع

```bash
# جلب التحديثات
git pull origin main

# أو من branch آخر
git pull origin branch-name
```

---

## 📚 موارد إضافية

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**آخر تحديث:** 2026-01-19
