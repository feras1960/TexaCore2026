# 🖨️ Print Engine — خطة العمل الشاملة
> **Updated:** 2026-02-23 18:23
> **Build Status:** ✅ Zero TypeScript errors

---

## ✅ المراحل المكتملة (1-5)

### المرحلة 1: DB + Service + Hook ✅
- Migration SQL + 7 قوالب نظامية
- printService.ts (محرك العرض + QR + ZATCA)
- usePrintData.ts (hook البيانات)
- دعم 9 لغات

### المرحلة 2: إعدادات الطباعة ✅
- PrintSettingsTab (ترويسة + معرض القوالب + CRUD)
- تبويب 🖨️ Printing في SystemConfigPage
- Upload HTML مخصص

### المرحلة 3: محرر القوالب (Code Editor) ✅
- HTML + CSS editors (dark theme)
- Variables panel (search + group + click-to-insert)
- Live A4 preview + language switcher
- Page setup (paper, orientation, margins)
- Content toggles (QR, header, footer, stamp, signature)

### المرحلة 4: حوار الطباعة المحسّن ✅
- EnhancedPrintDialog (dropdown + button variants)
- Advanced dialog + preview window
- 9-language selector + print options

### المرحلة 5: تكامل الوحدات ✅
- ActionToolbar ← EnhancedPrintDialog (sales/purchase invoices, containers, journals)
- AccountDetailsSheetV2 ← print button (account statements)
- Payments.tsx ← EnhancedPrintDialog (payment vouchers)
- printService.ts ← .maybeSingle() fix
- IntegrationsTab ← useCompany fix (profiles 404 → resolved)

---

## 🔨 المراحل القادمة

---

### ✅ المرحلة 6: المحرر المرئي WYSIWYG (مكتملة)
> **تم:** محرر visual drag & drop مخصص (VisualTemplateEditor.tsx) — 14 نوع بلوك، بدون مكتبات خارجية

#### 6.1 تقنية المحرر
```
📦 مكتبة: GrapeJS (MIT License, 22k⭐)
   - محرر drag & drop مبني على Canvas
   - دعم RTL + تخصيص كامل
   - Export HTML + CSS نظيف
   - حجم صغير (~350KB gzipped)

بديل: Unlayer (تجاري) — أسهل لكن مدفوع
```

#### 6.2 المكونات المطلوبة
| Component | File | Description |
|-----------|------|-------------|
| VisualTemplateEditor | `src/components/shared/print/VisualTemplateEditor.tsx` | GrapeJS wrapper مع panels + blocks مخصصة |
| Custom Blocks | `src/components/shared/print/editor-blocks.ts` | بلوكات جاهزة: ترويسة، جدول بنود، QR، ختم، توقيع |
| Editor Switcher | في TemplateEditorSheet | زر تبديل بين "محرر مرئي" ↔ "محرر كود" |

#### 6.3 البلوكات المخصصة (Custom Blocks)
```
🔲 ترويسة الشركة — شعار + اسم + بيانات
🔲 بيانات العميل/المورد — اسم + هاتف + عنوان + ضريبي
🔲 معلومات المستند — رقم + تاريخ + حالة
🔲 جدول البنود — items table مع أعمدة ديناميكية
🔲 جدول القيود — journal entries table
🔲 صندوق المجاميع — subtotal + tax + discount + total
🔲 QR Code — {{QR_CODE}} placeholder
🔲 الختم والتوقيع — stamp + signature side by side
🔲 التذييل — شروط + شكر + معلومات إضافية
🔲 فاصل صفحة — page break
🔲 نص حر — free text block
```

#### 6.4 خطوات التنفيذ
```
1. [ ] تثبيت grapesjs + grapesjs-preset-webpage
2. [ ] إنشاء VisualTemplateEditor.tsx مع:
   - Canvas area (A4 proportions)
   - Blocks panel (right side)
   - Style manager (right side)
   - Layers panel (right side)
   - Device switcher (A4/A5/Label/Letter)
3. [ ] تعريف Custom Blocks (editor-blocks.ts)
4. [ ] إضافة Variable Insertion panel
5. [ ] تنفيذ Import/Export (HTML ↔ GrapeJS JSON)
6. [ ] إضافة زر تبديل في TemplateEditorSheet
7. [ ] اختبار RTL + Arabic content
```

---

### ✅ المرحلة 7: قوالب اللصاقات (مكتملة)
> **تم:** لصاقة رولون (100x70mm) + لصاقة كونتينر (A5 landscape)

- ✅ SQL templates (roll_label + container_label) في DB
- ✅ 20 متغير في VARIABLE_DOCS (roll.* + container.*)
- ✅ DOC_TITLES بـ 9 لغات
- ✅ 19 label translation في LABELS map
- ✅ _label_ shortcuts في resolveAndRender
- ✅ QR content generation لللصاقات
- ✅ fetchRollData (fabric_rolls + materials + containers + suppliers)  
- ✅ fetchContainerData (containers + suppliers + items)
- ✅ mapDocData cases لـ roll_label و container_label

#### 7.1 قالب لصاقة الرولون
```
┌──────────────────────────────────┐
│ [QR Code]   شركة TexaCore        │
│              TEXA-2026-001       │
│──────────────────────────────────│
│ المادة: قماش قطني أبيض 100%      │
│ Material: White Cotton 100%      │
│──────────────────────────────────│
│ الرولون: ROL-2026-00042          │
│ كونتينر: CNT-2026-005           │
│ فاتورة: PI-2026-0012            │
│──────────────────────────────────│
│ اللون: أبيض    الوزن: 180 GSM    │
│ العرض: 150cm   الطول: 50m        │
│ الكمية: 50 متر                   │
│──────────────────────────────────│
│ المورد: ABC Textiles Ltd         │
│ تاريخ الاستلام: 2026-02-23       │
│ الجودة: ✓ فحص                    │
│──────────────────────────────────│
│ [Barcode: ROL-2026-00042]        │
└──────────────────────────────────┘
```

#### 7.2 المتغيرات المطلوبة
```
{{roll.number}}         — رقم الرولون
{{roll.material_name}}  — اسم المادة  
{{roll.color}}          — اللون
{{roll.weight}}         — الوزن (GSM)
{{roll.width}}          — العرض
{{roll.length}}         — الطول/الكمية
{{roll.unit}}           — وحدة القياس
{{roll.quality_check}}  — حالة الفحص
{{roll.container_no}}   — رقم الكونتينر
{{roll.invoice_no}}     — رقم الفاتورة
{{roll.supplier_name}}  — اسم المورد
{{roll.receipt_date}}   — تاريخ الاستلام
{{roll.batch_no}}       — رقم الدفعة
{{roll.barcode}}        — الباركود
{{QR_CODE}}             — رمز QR
```

#### 7.3 خطوات التنفيذ
```
1. [ ] إنشاء system template: roll_label (SQL INSERT)
2. [ ] إنشاء system template: container_label
3. [ ] إضافة roll variables إلى VARIABLE_DOCS
4. [ ] إضافة زر طباعة اللصاقة في واجهة أذون الاستلام
5. [ ] تنفيذ printService.resolveRollData() 
6. [ ] دعم حجم Label مخصص (100x70mm أو A6)
7. [ ] اختبار الطباعة الفعلية
```

---

### 📌 المرحلة 8: تنظيف صفحة الإعدادات
> **الهدف:** إزالة التكرار — عدة تبويبات مُفعّلة في أماكن أخرى بالفعل

#### 8.1 تحليل التكرار (13 تبويب حالياً)
```
✅ company      — بيانات المنشأة          ← ⚠️ مكرر: موجود في مكان آخر بالفعل
✅ branches     — الفروع                  ← يبقى (مكان وحيد)
✅ tax          — الضرائب والأنظمة         ← ⚠️ مكرر: مفعّل في مكان آخر بالفعل
✅ accounting   — المحاسبة                ← ⚠️ مكرر: الإعدادات المحاسبية موجودة في وحدة المحاسبة
✅ warehouse    — المستودعات               ← يبقى (إعدادات خاصة بالمستودع)
✅ sales        — المبيعات                 ← يبقى (workflow settings)
✅ integrations — التكاملات                ← يبقى (Nova Poshta, Gemini)
✅ print        — الطباعة                  ← يبقى (جديد)
✅ notifications— الإشعارات                ← يبقى
⚠️ roles        — إدارة الأدوار           ← ⚠️ مكرر: قسم مستخدمين وصلاحيات موجود
⚠️ users        — المستخدمين              ← ⚠️ مكرر: قسم مستخدمين وصلاحيات موجود
⚠️ resources    — صلاحيات الموارد          ← ⚠️ مكرر: موجود مع المستخدمين
⚠️ visibility   — قواعد الإخفاء           ← ⚠️ مكرر: موجود مع الصلاحيات
⚠️ modules      — الموديولات              ← فارغ (قريباً...)
```

#### 8.2 خطة التنظيف
```
التبويبات المكررة التي يجب إزالتها أو دمجها:

🗑️ إزالة:
  - company     → بيانات المنشأة موجودة في مكان آخر
  - tax         → الضرائب مفعّلة في مكان آخر  
  - accounting  → الإعدادات المحاسبية في وحدة المحاسبة
  - roles       → قسم المستخدمين والصلاحيات موجود
  - users       → قسم المستخدمين والصلاحيات موجود
  - resources   → موجود مع الصلاحيات
  - visibility  → موجود مع الصلاحيات
  - modules     → فارغ حالياً

✅ يبقى (6 تبويبات فقط):
  1. branches     — الفروع
  2. warehouse    — المستودعات
  3. sales        — المبيعات
  4. print        — الطباعة
  5. integrations — التكاملات
  6. notifications— الإشعارات

خطوات التنفيذ:
1. [ ] التحقق من كل تبويب مكرر قبل الإزالة
2. [ ] إزالة التبويبات المكررة من CONFIG_TABS
3. [ ] التأكد أن جميع الوظائف متاحة من أماكنها الأصلية
4. [ ] اختبار صفحة الإعدادات بعد التنظيف
```

---

## 📁 ملفات المشروع

### ملفات مكتملة:
| File | Status |
|------|--------|
| `supabase/migrations/20260223_print_engine.sql` | ✅ Executed |
| `src/services/printService.ts` | ✅ |
| `src/hooks/usePrintData.ts` | ✅ |
| `src/features/settings/components/PrintSettingsTab.tsx` | ✅ Resilient loading |
| `src/components/shared/print/EnhancedPrintDialog.tsx` | ✅ |
| `src/components/shared/print/index.ts` | ✅ |
| `src/features/accounting/components/unified/components/ActionToolbar.tsx` | ✅ + PrintDropdown |
| `src/features/accounting/components/AccountDetailsSheetV2.tsx` | ✅ + print button |
| `src/features/accounting/Payments.tsx` | ✅ + EnhancedPrintDialog |
| `src/features/settings/components/IntegrationsTab.tsx` | ✅ useCompany fix |

### ملفات المرحلة 6 (جديدة):
| File | Status |
|------|--------|
| `src/components/shared/print/VisualTemplateEditor.tsx` | 🔲 TODO |
| `src/components/shared/print/editor-blocks.ts` | 🔲 TODO |

---

## 🎯 ترتيب الأولويات

| # | المهمة | الأهمية | الجهد |
|---|--------|---------|-------|
| 1 | المرحلة 7: قوالب اللصاقات | 🔴 عالية | متوسط |
| 2 | المرحلة 8: تنظيف الإعدادات | 🟡 متوسطة | قليل |
| 3 | المرحلة 6: المحرر المرئي WYSIWYG | 🟡 متوسطة | عالي |
