# 🗺️ خريطة التطوير الشاملة — TexaCore ERP
> **التاريخ**: 2026-02-15 | **النسخة**: 3.2 (النهائية الشاملة)
> **آخر تحديث**: 2026-02-15T17:55
>
> **الهدف**: مرجع واحد شامل لكل محاور التطوير — بدون تضارب ولا نسيان
> **المصادر**: 32 ملف خطة وتوثيق في `.agent/artifacts/` + 11 Knowledge Items

---

## ⚠️ التغيير المعماري الجوهري (فبراير 2026)

> **قبل**: 13 جدول header + 13 جدول items = 26 جدول منفصل
> **بعد**: **جدولان موحدان** + stages
> ```
> purchase_transactions + purchase_transaction_items   ← كل دورة المشتريات
> sales_transactions   + sales_transaction_items       ← كل دورة المبيعات
> ```
> الجداول القديمة = أرشيف فقط (انظر `legacy_tables_archive_guide.md`)
>
> **⚠️ ملاحظة مهمة** (من `unified_transaction_critical_review.md`):
> - 31 ملف و 229+ مرجع لا زال يشير للجداول القديمة
> - تم إنشاء compatibility views لتقليل التأثير
> - الهجرة تدريجية (تحديث ملف بعد ملف)

---

## 📊 ملخص الحالة العامة

```
═══════════════════════════════════════════════════════════
  TexaCore ERP — Development Progress v3.2
  📅 2026-02-15 | 14 محور تطوير
═══════════════════════════════════════════════════════════

  المحاور:          14
  إجمالي المهام:    ~145+
  ✅ مكتمل:          ~55
  🟡 جاري:            5
  ⬜ متبقي:          ~85

  📍 الموقع الحالي:
  ══════════════════════════════════════
  المحور 2 → الجولة 5.5 (الاستلام المحلي)
  المحور 3 → التخطيط (دورة المشتريات v5)
  ══════════════════════════════════════

═══════════════════════════════════════════════════════════
```

---

## 🏗️ المحور 1: البنية التحتية والحفظ التلقائي ✅
> المصدر: `autosave_development_plan.md` + `unified_transaction_final_plan.md`

| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 1.1 | إعادة كتابة `useAutoSave.ts` (v2) | ✅ | تجاهل أول render + stable serializer |
| 1.2 | إصلاح `UnifiedAccountingSheet` — data merge | ✅ | merge بدل overwrite + fetchItems |
| 1.3 | إصلاح `TradeService.ts` — field mapping | ✅ | buildItemRow + إزالة tenant_id من items |
| 1.4 | اختبار تكاملي للحفظ التلقائي | ⬜ | 4 سيناريوهات مطلوبة |
| 1.5 | إنشاء الجداول الموحدة | ✅ | purchase_transactions + sales_transactions |
| 1.6 | RLS + triggers على الجداول الجديدة | ✅ | |
| 1.7 | أرشفة الجداول القديمة | ✅ | DEPRECATED comments |

---

## 🎨 المحور 2: ورقة التجارة الموحدة (UI Components)
> المصدر: `unified_trade_sheet_v2_plan.md` (2418 سطر)
> هذا أكبر محور — يشمل كل مراحل الـ UI

### الجولات 1-4 ✅ (مكتملة بالكامل — 16 مرحلة)

| الجولة | المحتوى | الحالة |
|--------|---------|--------|
| 1: البنية | هيدر + تسعير ذكي + عملات + validation | ✅ |
| 2: التبويبات | متصفح مواد + سند قبض + شحن + قيد | ✅ |
| 3: التكامل | configs + نسخ مستند + companyId | ✅ |
| 4: الذكية | mode-aware + مشتريات + مرفقات + migration | ✅ |

### الجولة 5: دورة الكونتينر الكاملة ✅

| # | المرحلة | الحالة | ملاحظات |
|---|---------|--------|---------|
| 2.17 | 13A: تبويب الدفعات+المصاريف الموحّد | ✅ | PurchaseExpensesTab |
| 2.18 | 13B-1: Migration + ربط الفواتير بالبنود | ✅ | حقول جديدة في shipment_items |
| 2.19 | 13B-2: بنود الكونتينر (3 أنماط + فلاتر) | ✅ | ShipmentItemsTab |
| 2.20 | 13B-3: سلة حجوزات الترانزيت | ✅ | TransitCartDrawer |
| 2.20+ | 14: حذف + ترحيل + إلغاء ترحيل | ✅ | Built-in في UnifiedAccountingSheet |
| 2.20++ | 15: RBAC صلاحيات المستندات التجارية | ✅ | useTradePermissions |
| 2.20+++ | 16: مصاريف الكونتينر المتقدمة | ✅ | ContainerExpensesTab (إعادة بناء كاملة) |
| 2.20++++ | 17: إعادة تصميم إنشاء الكونتينر | ✅ | ContainerMainTab + containersService |
| 2.20+++++ | 17-fix: إصلاح حفظ الكونتينر + حقل الاسم | ✅ | |

### الجولة 5.5: المشتريات المحلية والاستلام 🟡 ← 📍 هنا

| # | المرحلة | الحالة | ملاحظات |
|---|---------|--------|---------|
| 2.21 | 13E-1: نوع الشراء محلي/دولي + Tooltips | ✅ | Toggle + عملة تلقائية + وضع المعاينة |
| 2.22 | 13E-2: إذن استلام الأقمشة (Fabric GRN) | 🟡 جزئي | ✅ شاشة + رولونات + localStorage |
| | | | 🔴 أخطاء: كميات لا تتحدث + لا receipt في DB |
| 2.22B | 13E-2B: تكامل دورة الاستلام (Workflow) | 🔴 القادم | receipt + stock movement + قيد محاسبي |
| 2.22C | 13E-2C: سياسات فروقات الاستلام | ⬜ | 3 سياسات: Bill Based/Moving Avg/Variance |
| 2.23 | 13E-3: صلاحيات الاستلام (Receipt RBAC) | ⬜ | أمين مستودع: مستودعه فقط |

### الجولة 6: الكونتينر + المحاسبة 🟠

| # | المرحلة | الحالة | الجهد | ملاحظات |
|---|---------|--------|-------|---------|
| 2.24 | 13B-4: RBAC صلاحيات الأسعار | ⬜ | 2-3h | إخفاء أسعار التكلفة عن المبيعات |
| 2.25 | 13C: مصاريف الكونتينر (متوقع+فعلي) | ✅ | — | ContainerExpensesTab V2 |
| 2.26 | 13D: توزيع المصاريف (Landed Cost UI) | ⬜ | 3-4h | CostAllocationTab — 4 طرق توزيع |
| 2.27 | 13E-4: استلام الكونتينر الدولي | ⬜ | 3-4h | استلام جماعي عند وصول الكونتينر |
| 2.28 | 13F: القيود المحاسبية للكونتينر | ⬜ | 3-4h | قيد مؤقت (شحن) + قيد نهائي (إغلاق) |

### 🆕 تبويبات الكونتينر المحدّثة (خريطة):
```
تبويبات الكونتينر (10 تبويبات):
 1. معلومات الشحنة (ContainerMainTab)     ✅
 2. الشحن البحري (TrackingTab)            ✅
 3. بنود البضائع (ShipmentItemsTab)       ✅  3 أنماط
 4. حجوزات الترانزيت (TransitCartDrawer)  ✅  السلة
 5. الدفع والمصاريف (PurchaseExpensesTab) ✅
 6. مصاريف متوقع/فعلي (ContainerExpenses) ✅  V2 مكتمل
 7. توزيع التكاليف (CostAllocationTab)    ⬜  Landed Cost
 8. القيود المحاسبية (ShipmentJournalTab)  ⬜  قيد مؤقت + نهائي
 9. المرفقات (DocumentAttachmentsTab)      ✅
10. النشاط (ActivityTab)                   ✅
```

### الجولة 7: التحسينات والتقارير 🟢
| # | المرحلة | الحالة | الجهد |
|---|---------|--------|-------|
| 2.29 | 14+: تحسينات عامة (UX + أداء) | ⬜ | 4-5h |
| 2.30 | 15: تقارير المبيعات والمشتريات | ⬜ | 6-8h |
| 2.31 | 16: NexaAgent — ذكاء العميل والمورد | 🟢 مؤجل | 4-6h |

---

## 🛒 المحور 3: دورة المشتريات v5 — المراحل + الصلاحيات
> المصدر: `purchase_cycle_master_plan.md` (v5) + `unified_transaction_masterplan.md`
> ⚡ يبني على الجدول الموحد `purchase_transactions`

### المراحل المُعتمدة:
```
draft → quotation → order → approved → receipt → invoice → posted → partial_paid → paid
                                                                            ↓
                                                                          return
```

### 3أ: البنية التحتية (DB)
| # | المهمة | الحالة |
|---|--------|--------|
| 3.2 | تحديث stage CHECK constraint | ⬜ |
| 3.3 | حقول الطلب (request_no, priority, department) | ⬜ |
| 3.5 | ordered_qty, received_qty في items | ⬜ |
| 3.6 | `is_valid_stage_transition()` function | ⬜ |
| 3.7 | `generate_stage_number()` + `document_sequences` | ⬜ |
| 3.8 | `transaction_stage_log` table | ⬜ |

### 3ب: الصلاحيات القابلة للتعديل
| # | المهمة | الحالة |
|---|--------|--------|
| 3.9 | `useTradePermissions` — 8 صلاحيات جديدة | ⬜ |
| 3.10 | إضافة دور `purchasing_employee` | ⬜ |
| 3.11 | تحديث `rbacService` — تعديل ديناميكي | ⬜ |
| 3.12 | واجهة تخصيص الصلاحيات | ⬜ |

### 3ج: القوائم
| # | المهمة | الحالة |
|---|--------|--------|
| 3.13 | تحديث PurchaseCycleList (stage filter + TransactionStageStats) | ⬜ |
| 3.14 | إنشاء `InvoicesList.tsx` المشترك | ⬜ |
| 3.15 | إضافة routes + sidebar | ⬜ |

### 3د: الشيت + الأزرار
| # | المهمة | الحالة | تقاطع |
|---|--------|--------|-------|
| 3.16 | ActionToolbar بأزرار ديناميكية لكل stage | ⬜ | ← `unified_transaction_integration_plan.md` Phase 4C |
| 3.17 | sheet tabs حسب role + stage (visibleInStages) | ⬜ | ← Phase 4A |
| 3.18 | تبويب "المورد والمالية" المُدمج | ⬜ | |
| 3.19 | مسودة القيد التلقائية + ترحيل | ⬜ | |
| 3.20 | تبويب النشاط (Activity Log — TransactionStageHistory) | ⬜ | |

### 3هـ: التحويلات + الاستلام
| # | المهمة | الحالة |
|---|--------|--------|
| 3.21 | `advance_transaction_stage()` — Stage transition service | ⬜ |
| 3.22 | الاستلام (محلي/دولي) | 🟡 |
| 3.23 | الاستلام الجزئي | ⬜ |
| 3.24 | المرتجعات (purchase_return) | ⬜ |
| 3.25 | الدفع الجزئي التلقائي | ⬜ |

### 3و: الإشعارات + التنظيف
| # | المهمة | الحالة |
|---|--------|--------|
| 3.26 | إشعارات تلقائية عند تغيير المرحلة | ⬜ |
| 3.27 | المصاريف المرتبطة (treasury) | ⬜ |
| 3.28 | إخفاء الأسعار (HiddenField) | ⬜ |
| 3.29 | اختبار شامل + تنظيف | ⬜ |

---

## 🚢 المحور 4: دورة حياة الكونتينر الكاملة (Shipments & Landed Cost)
> المصدر: `unified_trade_sheet_v2_plan.md` (الجولات 5-6) + Knowledge Item: `Shipments & Landed Cost Module`
> 🆕 **محور مستقل — كان مدمجاً جزئياً في المحور 2**

### 4أ: الحالة الحالية

| المكون | Backend | Frontend | الحالة |
|--------|:-------:|:--------:|--------|
| `shipments` (Header) | ✅ | ✅ ContainerMainTab | مكتمل |
| `shipment_items` (البنود) | ✅ | ✅ 3 أنماط عرض | مكتمل |
| `shipment_costs` (المصاريف) | ✅ | ✅ ContainerExpensesTab V2 | مكتمل |
| `transit_reservations` (الحجوزات) | ✅ | ✅ TransitCartDrawer | مكتمل |
| صفحة قائمة الكونتينرات | — | ✅ ContainersList | مكتمل |
| صلاحيات الكونتينر (RBAC) | — | ⬜ useContainerPermissions | مخطط |
| توزيع Landed Cost | ✅ `allocate_container_costs()` | ⬜ CostAllocationTab | مخطط |
| القيود المحاسبية | ✅ Triggers | ⬜ ShipmentJournalTab | مخطط |
| إغلاق الكونتينر | ✅ `finalize_container_costs()` | ⬜ زر إغلاق + تحذير | مخطط |

### 4ب: المهام المتبقية

| # | المهمة | الحالة | الجهد | المصدر |
|---|--------|--------|-------|--------|
| 4.1 | CostAllocationTab — واجهة التوزيع (4 طرق) | ⬜ | 3-4h | Phase 13D |
| 4.2 | زر إغلاق الكونتينر + تحذير + قفل | ⬜ | 1-2h | Phase 13D |
| 4.3 | ShipmentJournalTab — قيد مؤقت + نهائي | ⬜ | 3-4h | Phase 13F |
| 4.4 | useContainerPermissions.ts (RBAC) | ⬜ | 2-3h | Phase 13B-4 |
| 4.5 | استلام الكونتينر الدولي (GRN جماعي) | ⬜ | 3-4h | Phase 13E-4 |
| 4.6 | ربط الفواتير بالكونتينر (تفصيلي) | ⬜ | 2-3h | Phase 17A |
| 4.7 | حجز بنود الكونتينر (reserve items) | ⬜ | 1-2h | Phase 17B |
| 4.8 | تثبيت شركة الشحن عند أول دفعة | ⬜ | 1h | Phase 17C |

### 4ج: دورة حياة الكونتينر (Lifecycle):
```
ordered → loading → shipped/in_transit → arrived_port → customs → cleared → delivery → received
                                                                                         ↓
                                                                              is_cost_finalized = true
```

### 4د: شركات مصاريف الكونتينرات (Phase 18) 🆕
> المصدر: `unified_trade_sheet_v2_plan.md` (سطر 2190+)

| # | المهمة | الحالة | الجهد |
|---|--------|--------|-------|
| 4.9 | صفحة ContainerVendorsPage.tsx | ⬜ | 2-3h |
| 4.10 | containerVendorsService.ts (CRUD) | ⬜ | 1-2h |
| 4.11 | AddContainerVendorSheet.tsx (نموذج إضافة) | ⬜ | 1-2h |
| 4.12 | ربط شركة → حساب accounting تلقائي | ⬜ | 1h |
| 4.13 | vendor_category: shipping/customs/clearing/transport | ⬜ | 30min |
| 4.14 | الربط مع ContainerExpensesTab + ContainerMainTab | ⬜ | 1h |

---

## 📦 المحور 5: تبويب الاستلام والقيود
> المصدر: `grn_receipt_tab_implementation_plan.md` + `pending_receipts_redesign_plan.md` + `purchase_receipt_workflow_plan.md`

| # | المهمة | الحالة |
|---|--------|--------|
| 5.1 | ReceiptSummaryTab (ملخص الاستلام) | ⬜ |
| 5.2 | إصلاح القيد المحاسبي (account_id حقيقي) | ⬜ |
| 5.3 | تحديث كميات المستودع (fabric_rolls) | 🟡 |
| 5.4 | إخفاء المعلومات المحاسبية حسب الصلاحية | ⬜ |
| 5.5 | إعادة تصميم "استلامات معلقة" (جدولي) | ⬜ |
| 5.6 | استئناف مسودة الاستلام (localStorage + DB) | ⬜ |
| 5.7 | receiptCompletionService.ts — خدمة إكمال الاستلام | ⬜ |

---

## 🔄 المحور 6: تأكيد المستندات والموافقات
> المصدر: `document_confirmation_workflow_plan.md` + `confirmation_workflow_execution_log.md`
> ✅ Phase 1 مكتمل (Migration + confirmationService + ConfirmationDialog)

| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 6.1 | ConfirmationDialog الذكي | ✅ | Glassmorphism + تحققات |
| 6.2 | confirmationService.ts | ✅ | validate + confirm + notify |
| 6.3 | company_workflow_settings جدول | ✅ | Migration منفذ |
| 6.4 | واجهة إعدادات الوورك فلو | ⬜ | Phase 2أ |
| 6.5 | واجهة الموافقات المعلقة (للمدراء) | ⬜ | Phase 2ب |
| 6.6 | واجهة أمين المستودع (إذونات التسليم) | ⬜ | Phase 2ج |
| 6.7 | التعديل بعد التأكيد (Edit After Confirm) | ⬜ | Phase 2د |
| 6.8 | صلاحيات التأكيد (sales.confirm, etc.) | ⬜ | 9 صلاحيات جديدة |
| 6.9 | حدود مالية على الموافقات (Approval Thresholds) | ⬜ | Phase 2هـ |

---

## 📊 المحور 7: الحالات الديناميكية و Kanban
> المصدر: `dynamic_status_integration_plan.md`

| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 7.1 | StatusDropdown في كروت Kanban | ✅ | SalesInvoicesList + PurchaseInvoicesList |
| 7.2 | إصلاح Kanban — أعمدة حالات بدل أنواع | ⬜ | PurchaseCycleList: الأعمدة = stages |
| 7.3 | Kanban onCardMove → stage transition | ⬜ | سحب = تغيير stage في purchase_transactions |
| 7.4 | تعطيل السحب في وضع "الكل" | ⬜ | لأنها أنواع وليست حالات |
| 7.5 | TransactionStageStats (فلتر المراحل بأعداد) | ✅ | مكتمل كمكون |
| 7.6 | TransactionStageBadge + Timeline | ✅ | مكتمل كمكون |

---

## 🛒 المحور 8: السلة الذكية والمفضلة
> المصدر: `smart_cart_complete_plan.md` + `smart_cart_analysis.md` + `cart_to_document_system.md`

| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 8.1 | CartContext + localStorage persistence | ✅ | |
| 8.2 | CartDrawer + CartFloatingWidget | ✅ | |
| 8.3 | Cart → Document تحويل السلة لمستند | ✅ | Supabase save |
| 8.4 | أيقونة 🛒 في Header | ✅ | |
| 8.5 | جدول `user_material_favorites` + RLS | ⬜ | |
| 8.6 | favoritesService + useFavorites hook | ⬜ | |
| 8.7 | FavoriteButton (⭐) + FavoritesPanel | ⬜ | |
| 8.8 | تصنيف موسمي + ترتيب مخصص | ⬜ | |
| 8.9 | أيقونة ⭐ في Header | ⬜ | |
| 8.10 | حجوزات الترانزيت (TransitCartDrawer) | ✅ | `phase_13b3_implementation_log.md` |

---

## 🔧 المحور 9: استكمال الباك إند (Backend Completion)
> المصدر: `backend_completion_plan.md`

| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 9.1 | إصلاح FKs المفقودة (10+ FK) | ⬜ | ⚠️ مراجعة الحاجة بعد الجدول الموحد |
| 9.2 | دوال RPC: `advance_transaction_stage()` | ⬜ | نقل Business Logic من Frontend |
| 9.3 | دوال RPC: `create_transaction_journal_entry()` | ⬜ | قيد محاسبي عند الترحيل |
| 9.4 | دوال RPC: `process_inventory_movement()` | ⬜ | حركة مخزن عند الاستلام/التسليم |
| 9.5 | `update_party_balance` RPC | ⬜ | تحديث رصيد المورد/العميل |
| 9.6 | Compatibility Views (purchase_invoices_compat, etc.) | ⬜ | للخدمات القديمة |

---

## 📋 المحور 10: تبويبات تفاصيل المادة — بيانات حقيقية
> المصدر: `material_details_refactoring_plan.md`

| # | التبويب | الحالة | البيانات الحالية |
|---|---------|--------|-----------------|
| 10.1 | المخزون (MaterialInventoryTab) | ⬜ | ❌ Mock بالكامل |
| 10.2 | الحركات (MaterialMovementsTab) | ⬜ | ❌ Mock بالكامل |
| 10.3 | المبيعات (MaterialSalesTab) | ⬜ | ❌ Mock |
| 10.4 | المشتريات (MaterialPurchasesTab) | ⬜ | ❌ Mock |
| 10.5 | الرولونات (MaterialRollsTab) | ⬜ | ❌ Mock (خدمة موجودة!) |
| 10.6 | المعلومات الإضافية | ⬜ | ⚠️ Mock جزئي |

> **الخدمات الموجودة أصلاً**: `warehouseService.getInventoryMovements()`, `getRolls()`, `getAll()`
> **المطلوب**: SQL functions + استبدال Mock data

---

## 🔍 المحور 11: متصفح المواد V2 + نظام المشتريات المتقدم
> المصدر: `purchase_material_browser_v2.md` + `unified_trade_sheet_v2_plan.md` (Phases 19-25)
> يشمل: Pop-up المشتريات + آخر الأسعار + الألوان + طلبات الفروع

### 11أ: البنية التحتية
| # | المهمة | الحالة | الجهد | Phase |
|---|--------|--------|-------|-------|
| 11.1 | خدمة آخر أسعار الشراء `useMaterialPriceHistory` | ⬜ | 1h | 19 |
| 11.2 | خدمة أرصدة الألوان `useMaterialColorStock` | ⬜ | 1h | 20A |
| 11.3 | إصلاح العملة الديناميكية (إزالة SAR hardcoded) | ✅ | — | 21A |
| 11.4 | عملة المورد الافتراضية عند اختياره | ⬜ | 1h | 21B |
| 11.5 | سعر الصرف التلقائي + تثبيت عند الترحيل | ⬜ | 1h | 21C |

### 11ب: Pop-up الإضافة السريعة + تجميع الألوان
| # | المهمة | الحالة | الجهد | Phase |
|---|--------|--------|-------|-------|
| 11.6 | مكون `MaterialQuickAddDialog` (الألوان + الأرصدة + آخر سعر) | ⬜ | 2h | 19 |
| 11.7 | ربط مع متصفح المواد الحالي | ⬜ | 1h | 19 |
| 11.8 | تجميع المواد حسب الألوان (بدلاً من المستودعات) | ⬜ | 2h | 20B |
| 11.9 | عرض مؤشرات الرصيد (أمتار + رولونات) | ⬜ | 1h | 20C |

### 11ج: القيد التلقائي + ربط الكونتينر
| # | المهمة | الحالة | الجهد | Phase |
|---|--------|--------|-------|-------|
| 11.10 | القيد التفصيلي عند الترحيل (4 حسابات) | ⬜ | 2-3h | 22A |
| 11.11 | ربط بكونتينر من أمر الشراء أو الفاتورة | ⬜ | 1-2h | 22B |
| 11.12 | إنشاء `container_items` تلقائياً عند الربط | ⬜ | 30min | 22C |
| 11.13 | مقارنة PO ↔ Invoice (3-Way Match أساسي) | ⬜ | 1h | 22D |

### 11د: سيناريوهات القيود المحاسبية (Phase 22):
```
السيناريو 1: المواد بالطريق (في كونتينر — لم تصل للمستودع):
  مدين: بضاعة بالطريق (GIT)  ← دائن: ذمم دائنة — المورد

السيناريو 2: المواد وصلت واستُلمت في المستودع:
  مدين: المخزون (حسب المستودع) ← دائن: ذمم دائنة — المورد

السيناريو 3: فرق بين سعر الأمر وسعر الفاتورة:
  مدين: المخزون + فروقات أسعار ← دائن: ذمم دائنة — المورد

قيد تحويلي عند وصول بضاعة الطريق:
  مدين: المخزون ← دائن: بضاعة بالطريق (GIT)
```

### 11هـ: طلبات الفروع (Branch Purchase Requests)
| # | المهمة | الحالة | الجهد | Phase |
|---|--------|--------|-------|-------|
| 11.14 | إضافة `tenant_id` لجدول `branches` | ⬜ | 30min | 23A-1 |
| 11.15 | واجهة إدارة الفروع (إعدادات الشركة) | 🟡 | 1-2h | 23A-2 |
| 11.16 | جدول `branch_requests` + `branch_request_items` + RLS | ⬜ | 1-2h | 23B-1 |
| 11.17 | `branchRequestsService.ts` (CRUD + حالات) | ⬜ | 1-2h | 23B-2 |
| 11.18 | صفحة إنشاء طلب الفرع | ⬜ | 2-3h | 24A |
| 11.19 | قائمة طلبات الفروع | ⬜ | 1-2h | 24B |
| 11.20 | تبويب "طلبات الفروع" في فاتورة المدير | ⬜ | 2-3h | 24C |
| 11.21 | آلية التجميع بالمادة + تعديل الكميات | ⬜ | 1h | 24D |
| 11.22 | حجز الفرع (بدون دفعة) + حالات تلقائية | ⬜ | 1-2h | 25A |
| 11.23 | توزيع على مستودعات الفروع عند الاستلام | ⬜ | 1h | 25B |
| 11.24 | لوحة متابعة طلبات الفرع (My Requests) | ⬜ | 1h | 25C |

### 11و: أفكار مشتريات أخرى
| # | المهمة | الحالة | الجهد | Phase |
|---|--------|--------|-------|-------|
| 11.25 | نسخ المستند + سجل الأسعار | ⬜ | 2-3h | 11 |
| 11.26 | المكون المشترك مبيعات/مشتريات | ⬜ | 2-3h | 12 |
| 11.27 | تفعيل Gemini AI (Deploy + API Key) | ⬜ | 1-2h | 13A |
| 11.28 | تقارير المشتريات (Top suppliers, Price trends) | ⬜ | 3-4h | — |
| 11.29 | تقييم الموردين (Vendor Rating) | ⬜ | 2-3h | — |

---

## 🚚 المحور 12: شحن العملاء وتكامل نوفايا بوشتا
> المصدر: `customer_shipping_integration_docs.md`

### 12أ: البنية التحتية (DB) ✅ مكتملة
| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 12.1 | جدول `customer_addresses` + RLS | ✅ | عناوين شحن/فوترة |
| 12.2 | جدول `shipping_carriers` + RLS | ✅ | إعدادات NovaPoshta + n8n webhooks |
| 12.3 | جدول `shipment_documents` (TTN/Waybills) + RLS | ✅ | بوليصات شحن |
| 12.4 | حقول الشحن على 5 جداول | ✅ | delivery_method, tracking_number, shipping_cost |
| 12.5 | `create_shipment_document()` function | ✅ | JSON جاهز لـ NP API |
| 12.6 | `process_shipment_api_response()` function | ✅ | معالجة رد API |
| 12.7 | `update_shipment_document_status()` function | ✅ | تتبع دوري |

### 12ب: التكامل مع n8n + Frontend ⬜
| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 12.8 | إعداد n8n Workflow: إنشاء بوليصة | ⬜ | Webhook → NP API → Supabase |
| 12.9 | إعداد n8n Cron: تتبع الشحنات | ⬜ | كل ساعة → getStatusDocuments |
| 12.10 | تسجيل شركة الشحن في DB | ⬜ | INSERT into shipping_carriers |
| 12.11 | CustomerShippingTab — واجهة شحن العميل | 🟡 | موجود جزئياً |
| 12.12 | NP City/Warehouse Search (autocomplete) | ⬜ | بحث مدن + فروع NP |
| 12.13 | طباعة بوليصة PDF | ⬜ | label_url من NP API |
| 12.14 | تتبع الشحنة بـ tracking_number | ⬜ | عرض حالة الشحن في الواجهة |

---

## 🛍️ المحور 13: دورة المبيعات الكاملة (Sales Cycle)
> المصدر: `unified_document_lifecycle_analysis.md` + `unified_transaction_masterplan.md`

### مراحل دورة المبيعات:
```
draft → quotation → order → delivery → invoice → posted → partial_paid → paid
مسودة    عرض سعر    أمر بيع   تسليم     فاتورة    مرحّلة    مدفوعة جزئياً   مدفوعة

أرقام:   SQ-2026-001  SO-2026-001  SD-2026-001  SI-2026-001
أثر مخزن:                            ✅ خصم
أثر محاسبي:                                       ✅ قيد
```

### 13أ: صفحة قائمة المبيعات
| # | المهمة | الحالة |
|---|--------|--------|
| 13.1 | تحديث SalesInvoicesList → `sales_transactions` | ⬜ |
| 13.2 | TransactionStageStats (فلتر المراحل) | ⬜ |
| 13.3 | TransactionStageBadge في الجدول | ⬜ |

### 13ب: الشيت + الأزرار الديناميكية
| # | المهمة | الحالة | تقاطع |
|---|--------|--------|-------|
| 13.4 | SalesTransactionSheet.tsx (wrapper) | ⬜ | يُغلف UnifiedTransactionForm |
| 13.5 | StageProgressBar.tsx (شريط أفقي) | ⬜ | مشترك مع المشتريات |
| 13.6 | TransactionActions (أزرار حسب stage) | ⬜ | مشترك |
| 13.7 | AutoSaveIndicator.tsx | ⬜ | مشترك |
| 13.8 | StageJournalPreview (معاينة القيد) | ⬜ | |

### 13ج: العمليات
| # | المهمة | الحالة | ملاحظات |
|---|--------|--------|---------|
| 13.9 | التسليم + خصم المخزون | 🟡 | جزئياً عبر confirmationService |
| 13.10 | فوترة + ترحيل + قيد محاسبي | ⬜ | |
| 13.11 | تسجيل تحصيل (دفعات العملاء) | ⬜ | |
| 13.12 | مرتجعات المبيعات (sale_return) | ⬜ | عكس القيود + إرجاع المخزون |
| 13.13 | تكامل الشحن (Nova Poshta) مع فواتير المبيعات | ⬜ | ← **المحور 12** |
| 13.14 | POS (فاتورة + تسليم + باركود) | ⬜ | نقطة البيع |

---

## 🎁 المحور 14: ميزات إضافية ومستقبلية
> المصدر: `next_phases_roadmap.md` + `unified_document_lifecycle_plan.md`

| # | المهمة | الحالة |
|---|--------|--------|
| 14.1 | شريط الحالة الأفقي (Status Bar مثل Odoo) | ⬜ |
| 14.2 | طباعة PDF مهنية (A4) — عربي/إنجليزي | ⬜ |
| 14.3 | تقسيط الفاتورة + جدول سداد | ⬜ |
| 14.4 | رقم المستند + QR تلقائي (PREFIX-YYYY-####) | 🟡 جزئي |
| 14.5 | إشعارات Telegram (عبر n8n) | ⬜ |
| 14.6 | دعم الباركود في TexaMobile | ⬜ |
| 14.7 | إعدادات دورة المستندات في AccountingSettings | ⬜ |
| 14.8 | payment_allocations جدول (ربط الدفعات) | ⬜ |

---

## 👤 مصفوفة الأدوار (purchase_cycle_master_plan v5)

```
┌──────────────────────┬──────────────────────────────────────────────────────┐
│ مدير المشتريات       │ 🛒 يرى الأسعار + يُنشئ أوامر + يعتمد                │
│                      │ ❌ لا يرى: المورد · المالية · القيد · المدفوعات      │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ موظف المشتريات       │ 📝 يُنشئ: طلبات + عروض أسعار فقط                    │
│                      │ ❌ لا يُنشئ أوامر شراء · لا يرى المالية              │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ المحاسب              │ 👁️ يطّلع على كل شيء · يُنشئ فواتير · يرحّل · يدفع │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ أمين المستودع        │ 📦 استلام + تسليم + جرد · لا أسعار · لا مالية      │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ المدير               │ 👑 كل الصلاحيات + تعديل صلاحيات المجموعات           │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ مدير الفرع           │ 🏪 طلباته + ما تحته · لا يرى فروع أخرى             │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 🎯 ترتيب التنفيذ — خطة العمل

### 📍 الآن: إكمال دورة المشتريات + الاستلام 🔴
> الأولوية القصوى | الجهد: ~35-45 ساعة

```
1. إكمال GRN workflow (2.22B + 5.1-5.7)
   ← إنشاء receipt + stock_movements + قيد محاسبي حقيقي
   ← receiptCompletionService.ts

2. سياسات فروقات الاستلام (2.22C)
   ← 3 سياسات: Bill Based/Moving Avg/Variance Account

3. قاعدة البيانات (3.2-3.8)
   ← stage CHECK + is_valid_stage_transition + document_sequences

4. الصلاحيات (3.9-3.12 + 6.8)
   ← 8 صلاحيات مشتريات + 9 صلاحيات تأكيد + purchasing_employee

5. ActionToolbar + Stage transitions (3.16 + 3.21)
   ← أزرار ديناميكية + advance_stage()
```

### التالي: القوائم + التأكيد + الكونتينر 🟡
> الجهد: ~30-40 ساعة

```
6. PurchaseCycleList من purchase_transactions (3.13-3.15)
7. تأكيد المستندات + Approval Flow (6.4-6.7)
8. Kanban stage-based (7.2-7.4)
9. الدفع الجزئي (3.25)
10. Landed Cost UI + إغلاق الكونتينر (4.1-4.3)
11. استلام الكونتينر الدولي (4.5)
12. شركات مصاريف الكونتينرات (4.9-4.14)
```

### لاحقاً — المرحلة 3: المشتريات المتقدمة + المبيعات 🟡
> الجهد: ~40-50 ساعة

```
13. القيد التلقائي + ربط الكونتينر (11.10-11.13)
14. متصفح المواد V2 + Pop-up + ألوان (11.1-11.9)
15. طلبات الفروع (11.14-11.24)
16. SalesTransactionSheet + SalesList (13.1-13.8)
17. التسليم + الفوترة + الترحيل (13.9-13.11)
18. تكامل Nova Poshta + n8n (12.8-12.14)
```

### لاحقاً — المرحلة 4: التحسينات 🟢
```
19. تبويبات تفاصيل المادة — بيانات حقيقية (10.1-10.6)
20. Backend RPC functions (9.2-9.6)
21. السلة: المفضلة الموسمية (8.5-8.9)
22. 3-Way Match: مقارنة PO ↔ Invoice ↔ GRN (11.13)
23. تقارير المشتريات + تقييم الموردين (11.28-11.29)
24. المكون المشترك مبيعات/مشتريات (11.26)
25. POS — نقطة البيع (13.14)
26. طباعة PDF + QR (14.2 + 14.4)
27. NexaAgent (2.31) + Telegram (14.5)
28. مرتجعات مشتريات/مبيعات (3.24 + 13.12)
```

---

## 📁 فهرس الخطط الفرعية (32 ملف في `.agent/artifacts/`)

### 📐 خطط معمارية
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 1 | `unified_transaction_final_plan.md` | هيكل DB الموحد (purchase/sales_transactions) | م1, م3 |
| 2 | `unified_transaction_masterplan.md` | خطة 8 مراحل: DB → Settings → Types → Components → Purchase → Sales → Migration → Returns | م3, م13 |
| 3 | `unified_transaction_critical_review.md` | مراجعة نقدية: مخاطر + مقارنة Odoo/ERPNext + نهج مختلط | م1 |
| 4 | `unified_transaction_integration_plan.md` | تحديث 6 ملفات: types.ts + tradeConfigs + Sheet + List | م3, م7 |
| 5 | `unified_document_lifecycle_analysis.md` | Odoo-style: مستند واحد بحالات + Status Bar | م3, م13 |
| 6 | `unified_document_lifecycle_plan.md` | مقارنة ERPNext/Odoo + تصميم TexaCore | م3, م13 |
| 7 | `legacy_tables_archive_guide.md` | خريطة القديم→الجديد + compatibility views | م1 |

### 🛒 خطط المشتريات + الكونتينرات
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 8 | `purchase_cycle_master_plan.md` | المراحل + الأزرار + الصلاحيات v5 | م3 |
| 9 | `unified_trade_sheet_v2_plan.md` | ⭐ **الملف الأكبر** — 31 مرحلة (الجولات 1-7) + كونتينرات + طلبات فروع | م2, م4, م11 |
| 10 | `purchase_material_browser_v2.md` | متصفح V2 + Pop-up + ألوان + طلبات فروع | م11 |
| 11 | `purchase_receipt_workflow_plan.md` | سير عمل استلام الأقمشة + صلاحيات | م5 |
| 12 | `autosave_development_plan.md` | الحفظ التلقائي + field mapping | م1 |

### 📋 تأكيد وموافقات
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 13 | `document_confirmation_workflow_plan.md` | 5 مراحل تأكيد + approval + notify | م6 |
| 14 | `confirmation_workflow_execution_log.md` | سجل تنفيذ Phase 1 (DB + Frontend) | م6 |

### 📦 الاستلام
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 15 | `grn_receipt_tab_implementation_plan.md` | تبويب الاستلام + قيد + مخزون | م5 |
| 16 | `pending_receipts_redesign_plan.md` | إعادة تصميم الاستلامات المعلقة | م5 |

### 🚚 الشحن
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 17 | `customer_shipping_integration_docs.md` | Nova Poshta + n8n + 3 جداول + 3 functions | م12 |

### 🔄 الحالات والكانبان
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 18 | `dynamic_status_integration_plan.md` | Kanban + StatusDropdown | م7 |

### 🛒 السلة والمفضلة
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 19 | `smart_cart_complete_plan.md` | السلة الذكية + المفضلة الموسمية | م8 |
| 20 | `smart_cart_analysis.md` | تحليل السلة | م8 |
| 21 | `cart_to_document_system.md` | تحويل السلة لمستند | م8 |
| 22 | `phase_13b3_implementation_log.md` | حجوزات الترانزيت (TransitCartDrawer) | م8 |

### 🔧 الباك إند
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 23 | `backend_completion_plan.md` | FKs + RPC functions | م9 |

### 📊 التبويبات والبيانات
| # | الملف | المحتوى | ربط |
|---|-------|---------|-----|
| 24 | `material_details_refactoring_plan.md` | Mock → Real (6 تبويبات) | م10 |

### 📄 توثيق وسجلات
| # | الملف | المحتوى |
|---|-------|---------|
| 25 | `purchase_sales_implementation_summary.md` | ملخص التنفيذ |
| 26 | `next_phases_roadmap.md` | خريطة المراحل القادمة |
| 27 | `updates_log_2026_02_14.md` | سجل تحديثات البنية التحتية |
| 28 | `FULL_PROJECT_AUDIT_2026_02_11.md` | تدقيق شامل |
| 29 | `accounting_foundation_audit_report.md` | تدقيق المحاسبة |
| 30 | `DATABASE_SCHEMA_REFERENCE.md` | مرجع قاعدة البيانات |
| 31 | `DATA_DICTIONARY_COMPLETE.md` | قاموس البيانات الكامل |

---

## ⚙️ قواعد العمل

1. **الجدول الموحد هو المصدر**: كل شيء يمر عبر `purchase_transactions` + `sales_transactions`
2. **Stage بدل DocType**: الفلترة بـ `WHERE stage = 'order'` بدل جداول منفصلة
3. **دورة المشتريات أولاً**: نكمل المشتريات 100% ثم ننتقل للمبيعات
4. **المبيعات تستفيد من المشتريات**: نفس المكونات المشتركة (StageProgressBar, ActionButtons, etc.)
5. **الكونتينر = كيان مستقل**: له جدوله الخاص (`shipments`) وليس ضمن purchase_transactions
6. **Nova Poshta = جزء من دورة المبيعات**: تكامل الشحن عند مرحلة delivery في sales_transactions
7. **الصلاحيات = defaults + تخصيص**: قابلة للتعديل من إعدادات المجموعة
8. **تحديث هذا الملف أولاً**: عند إكمال أي مهمة، حدّث الحالة هنا
9. **Mock → Real**: قبل أي ميزة جديدة، أولوية لاستبدال البيانات الوهمية
10. **الكونتينر والمشتريات مترابطان**: ربط الفواتير بالكونتينر + الاستلام الدولي يمر عبر الكونتينر
