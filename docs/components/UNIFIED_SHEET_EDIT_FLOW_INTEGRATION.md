# 🔗 تكامل UnifiedAccountingSheet مع نظام التحرير
## Edit Flow Integration Guide

---

## 📋 نظرة عامة

تم ربط `UnifiedAccountingSheet` مع نظام إدارة التعديلات والسنوات المالية ليتحقق تلقائياً من صلاحيات التحرير قبل السماح بالتعديل.

---

## 🆕 Props الجديدة

```typescript
interface UnifiedAccountingSheetProps {
    // ... existing props ...
    
    // Edit Flow Integration
    companyId?: string;              // معرّف الشركة للتحقق
    enableEditFlow?: boolean;        // تفعيل التحقق من الصلاحيات
    onUnpost?: () => Promise<void>;  // callback لإلغاء الترحيل
    onEditPermissionDenied?: (reason: string, options?: EditOption[]) => void;
    onAdjustmentRequired?: (originalEntryId: string) => void;
}

interface EditOption {
    id: string;
    label: string;
    recommended?: boolean;
    warning?: string;
    requires_permission?: boolean;
}
```

---

## 💻 طريقة الاستخدام

### مثال 1: القيود المحاسبية مع التحقق من الصلاحيات

```tsx
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';
import { useState } from 'react';

function JournalEntryView({ entry }: { entry: JournalEntry }) {
    const [showSheet, setShowSheet] = useState(false);
    const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
    const [permissionDeniedReason, setPermissionDeniedReason] = useState('');
    
    const handleSave = async (data: any) => {
        // حفظ القيد
        await journalEntriesService.update(entry.id, data);
    };
    
    const handleUnpost = async () => {
        // إلغاء ترحيل القيد قبل التحرير
        await journalEntriesService.unpost(entry.id);
    };
    
    const handleEditPermissionDenied = (reason: string, options?: EditOption[]) => {
        setPermissionDeniedReason(reason);
        // إظهار dialog للمستخدم مع الخيارات المتاحة
        showPermissionDeniedDialog(reason, options);
    };
    
    const handleAdjustmentRequired = (originalEntryId: string) => {
        // فتح نموذج إنشاء قيد تسوية
        setShowAdjustmentDialog(true);
    };
    
    return (
        <>
            <UnifiedAccountingSheet
                isOpen={showSheet}
                onClose={() => setShowSheet(false)}
                docType="journal"
                mode="view"
                data={entry}
                documentId={entry.id}
                companyId={entry.company_id}
                
                // ✅ تفعيل نظام التحرير
                enableEditFlow={true}
                
                // Callbacks
                onSave={handleSave}
                onUnpost={handleUnpost}
                onEditPermissionDenied={handleEditPermissionDenied}
                onAdjustmentRequired={handleAdjustmentRequired}
            />
            
            {/* Dialog لقيد التسوية عند الحاجة */}
            {showAdjustmentDialog && (
                <AdjustmentEntryDialog 
                    originalEntryId={entry.id}
                    onClose={() => setShowAdjustmentDialog(false)}
                />
            )}
        </>
    );
}
```

### مثال 2: الفواتير (بدون تحقق)

```tsx
<UnifiedAccountingSheet
    isOpen={showSheet}
    onClose={() => setShowSheet(false)}
    docType="receipt"
    mode="view"
    data={invoice}
    documentId={invoice.id}
    
    // ❌ لا تفعيل نظام التحرير (غير مطلوب للفواتير حالياً)
    enableEditFlow={false}
    
    onSave={handleSave}
/>
```

---

## 🔄 سير العمل (Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                    زر "تحرير" يُضغط                              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│        هل enableEditFlow = true و docType = 'journal'؟           │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
               ┌──────┴──────┐
               │   نعم       │   لا ──────────→ فتح وضع التحرير مباشرة
               └──────┬──────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           استدعاء can_edit_journal_entry() من Supabase          │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
               ┌──────┴──────┐
               │  can_edit?   │
               └──────┬──────┘
                      ▼
        ┌─────────────┴─────────────┐
        │           نعم             │
        └─────────────┬─────────────┘
                      ▼
               ┌──────┴──────┐
               │ auto_unpost? │
               └──────┬──────┘
             نعم ←────┴────→ لا
              ▼               ▼
        onUnpost()      فتح وضع التحرير
              ▼
       فتح وضع التحرير
       
        ┌─────────────┴─────────────┐
        │            لا             │
        └─────────────┬─────────────┘
                      ▼
               ┌──────┴──────┐
               │ linked_closed?│
               └──────┬──────┘
             نعم ←────┴────→ لا
              ▼               ▼
onAdjustmentRequired()  onEditPermissionDenied()
```

---

## 📊 الحالات المُدعمة

| الحالة | السلوك |
|--------|--------|
| قيد مسودة | ✅ تحرير مباشر |
| قيد مُرحل + سنة مفتوحة | ⚡ إلغاء ترحيل تلقائي → تحرير → إعادة ترحيل |
| قيد مُرحل + سنة مُغلقة (مستقل) | ⚠️ تحرير مع تحذير |
| قيد مُرحل + سنة مُغلقة (مترابط) | 🔗 قيد تسوية مطلوب |
| فترة مُغلقة | ❌ غير مسموح (يحتاج موافقة) |

---

## 📁 الملفات المُعدّلة

| الملف | التغيير |
|-------|---------|
| `UnifiedAccountingSheet.tsx` | ✅ إضافة checkEditPermission() |
| `types.ts` | ✅ إضافة EditOption و props جديدة |

---

**📅 تاريخ التوثيق:** 2026-02-04 22:30 UTC
