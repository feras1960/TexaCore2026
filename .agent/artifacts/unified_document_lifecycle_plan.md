# خطة دورة المستند الموحد — Unified Document Lifecycle

## 📊 مقارنة الأنظمة العالمية

### ERPNext — نظام الحالات الثلاث

```
    Draft (مسودة)
        ↓ [Submit = تأكيد]
    Submitted (مؤكد/معتمد)
        ↓ [Cancel = إلغاء]
    Cancelled (ملغي)
```

**كيف يعمل:**
- **Draft**: المستخدم يعمل ويحفظ (Ctrl+S). المستند قابل للتعديل بحرية
- **Submit**: المستخدم يضغط "تأكيد" — المستند يُقفل ولا يمكن تعديله. يُفعّل الآثار (مخزن/محاسبة)
- **Cancel**: إلغاء المستند المؤكد — يعكس كل الآثار
- **Amend**: لتعديل مستند مؤكد → يُلغى ويُنشأ نسخة جديدة `-1`
- **لا autosave** — الحفظ يدوي

**الأزرار في ERPNext:**
| المرحلة | الأزرار |
|---|---|
| طلب شراء (Draft) | `حفظ` + `تأكيد` |
| طلب شراء (Submitted) | `تعديل` + `إلغاء` + `إنشاء أمر شراء ←` |
| أمر شراء (Draft) | `حفظ` + `تأكيد` |
| أمر شراء (Submitted) | `استلام بضائع ←` + `إنشاء فاتورة ←` + `إلغاء` |
| فاتورة (Draft) | `حفظ` + `تأكيد` |
| فاتورة (Submitted) | `تسجيل دفعة ←` + `إلغاء` |

### Odoo — نظام شريط الحالة

```
    RFQ (مسودة)                          → جدول purchase.order
        ↓ [Confirm Order = تأكيد الطلب]
    Purchase Order (أمر شراء)            → نفس الجدول!
        ↓ [Receive Products]  
    Done (تم)
        ↓ [Create Bill = فاتورة]
    Vendor Bill (فاتورة مورد)            → جدول account.move (منفصل!)
```

**كيف يعمل:**
- RFQ و PO = **نفس المستند** — الحالة تتغير فقط
- الفاتورة = **مستند منفصل** في جدول محاسبي
- **Status Bar أفقي** يُظهر المرحلة الحالية
- **AutoDraft في POS** — يحفظ تلقائياً كمسودة

---

## 🏗️ التصميم النهائي لـ TexaCore

### المبدأ: **مزيج بين Odoo + ERPNext مع تحسينات**

```
┌──────────────────────────────────────────────────────┐
│           جدول واحد: purchase_invoices               │
│                                                      │
│   draft ─→ requested ─→ quoted ─→ ordered ─→ invoiced ─→ posted ─→ paid │
│   مسودة    طلب شراء    عرض سعر   أمر شراء   فاتورة    مرحّلة    مدفوعة  │
│                                                      │
│   ◄── حفظ تلقائي (AutoSave) ──►                     │
│   ◄── لا أثر محاسبي ──────────►  ◄── قيد معاينة ──►  │
│                                      ◄── ترحيل ──►   │
└──────────────────────────────────────────────────────┘
```

### السلوكيات الرئيسية:

#### 1. الحفظ التلقائي (AutoSave as Draft)
- عند البدء بملء البيانات → **يحفظ تلقائياً كمسودة** في الخلفية
- عند الخروج → المسودة محفوظة وموجودة في تبويب "مسودة"
- **debounce 3 ثوانٍ** بعد كل تغيير

#### 2. أزرار الإجراء حسب المرحلة:

| المرحلة (status) | العنوان | الأزرار | الأثر |
|---|---|---|---|
| **draft** (مسودة) | مسودة مشتريات | `✓ تأكيد` | يحفظ ويغير الحالة لـ requested |
| **requested** (طلب) | طلب شراء | `✎ تعديل` → ثم `✓ تأكيد` + `✕ إلغاء` | — |
| **quoted** (عرض سعر) | عرض سعر شراء | `✎ تعديل` → ثم `✓ تأكيد` + `✕ إلغاء` | — |
| **ordered** (أمر شراء) | أمر شراء | `✓ تأكيد الحجز` + `📧 طلب من المورد` + `📋 معاينة القيد` | القيد للمعاينة فقط |
| **invoiced** (فاتورة) | فاتورة مشتريات | `📮 ترحيل` + `📋 معاينة القيد` | الترحيل فقط هنا! |
| **posted** (مرحّلة) | فاتورة مرحّلة | `💰 تسجيل دفعة` | قيد محاسبي فعلي |
| **paid** (مدفوعة) | مدفوعة | `🔍 عرض` (read-only) | — |
| **cancelled** (ملغي) | ملغاة | `🔄 إعادة فتح` | — |

#### 3. نمط التعديل (مثل ERPNext):
```
مستند مؤكد (requested/quoted/ordered):
  → يعرض read-only
  → زر [✎ تعديل] يفتح التعديل
  → بعد التعديل: [✓ تأكيد] + [✕ إلغاء التعديل]
  → "تأكيد" = حفظ التغييرات
  → "إلغاء التعديل" = تراجع عن التغييرات
```

#### 4. القيد المحاسبي:
- **ordered وما قبله**: لا قيد → فقط معاينة (preview)
- **invoiced**: قيد معاينة + زر ترحيل
- **posted**: قيد محاسبي فعلي مرحّل
- **paid**: قيد + دفعة مسجلة

#### 5. رقم المستند:
- يتولد تلقائياً عند أول حفظ (AutoSave)
- الشكل: `{PREFIX}-{YYYY}-{####}`
- **PR-2026-0001** (Purchase Request)
- **PQ-2026-0001** (Purchase Quotation)  
- **PO-2026-0001** (Purchase Order)
- **PI-2026-0001** (Purchase Invoice)
- **SI-2026-0001** (Sales Invoice)
- الرقم يظهر في الـ header + QR Code

---

## 📋 خطوات التنفيذ (مرتبة حسب الأولوية)

### الخطوة 1: AutoSave ✍️
- إضافة `useAutoSave` hook
- يحفظ تلقائياً بعد 3 ثوان من آخر تغيير
- يُنشئ record جديد إذا `mode === 'create'`
- يُحدّث الـ record إذا `mode === 'edit'`
- يُظهر مؤشر "جاري الحفظ..." / "تم الحفظ ✓"

### الخطوة 2: أزرار الإجراء الديناميكية 🔘
- استبدال أزرار "حفظ/إلغاء" بأزرار ديناميكية حسب المرحلة
- زر "تأكيد" = حفظ + تغيير الحالة
- زر "تعديل" = فتح التعديل
- زر "ترحيل" = فقط في مرحلة الفاتورة

### الخطوة 3: العنوان الديناميكي 📝
- ✅ تمت — العنوان يتغير حسب `document_stage/status`

### الخطوة 4: رقم المستند + QR 🔢
- ✅ تمت جزئياً — الـ QR يعرض `invoice_number`
- يحتاج: توليد الرقم تلقائياً مع prefix

### الخطوة 5: شريط الحالة (Status Bar) 📊
- شريط أفقي مثل Odoo في أعلى الشيت
- يُظهر المراحل + المرحلة النشطة

---

## ⚙️ التفاصيل التقنية

### AutoSave Hook
```typescript
const useAutoSave = (data, docId, delay = 3000) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  useEffect(() => {
    if (!hasChanges) return;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        if (!docId) {
          // Create new draft
          const { data: newDoc } = await supabase
            .from(table).insert(data).select().single();
          setDocId(newDoc.id);
        } else {
          // Update existing
          await supabase.from(table).update(data).eq('id', docId);
        }
        setSaveStatus('saved');
      } catch { setSaveStatus('error'); }
    }, delay);
    return () => clearTimeout(timer);
  }, [data]);
  
  return { saveStatus };
};
```

### أزرار الإجراء
```typescript
const getActionButtons = (status: string, docType: string) => {
  switch (status) {
    case 'draft':
      return [{ label: 'تأكيد', action: 'confirm', variant: 'default' }];
    case 'requested':
    case 'quoted':
      return [
        { label: 'تعديل', action: 'edit', variant: 'outline' },
      ];
    case 'ordered':
      return [
        { label: 'تأكيد الحجز', action: 'confirm_reservation' },
        { label: 'طلب من المورد', action: 'request_supplier' },
        { label: 'معاينة القيد', action: 'preview_entry', variant: 'outline' },
      ];
    case 'invoiced':
      return [
        { label: 'ترحيل', action: 'post', variant: 'destructive' },
        { label: 'معاينة القيد', action: 'preview_entry', variant: 'outline' },
      ];
    case 'posted':
      return [
        { label: 'تسجيل دفعة', action: 'register_payment' },
      ];
  }
};
```
