# 🏗️ E-Commerce Unified Architecture
# البنية الموحدة للمتجر الإلكتروني

**التاريخ:** 2 مارس 2026  
**الحالة:** ✅ موحّد ومعتمد

---

## ⚠️ تصحيح مهم

**STEP 48-52** (يناير 2026) ليس للمتجر الإلكتروني!
- يعمل على جدول `products` القديم (فارغ)
- مصمم لنظام السلة الداخلي لـ ERP
- **مؤرشف في** `_archive/steps/`
- بعض functions قابلة للاستخدام مستقبلاً (register_customer, B2B access)

---

## القرارات المعتمدة

### ✅ المتجر الإلكتروني (27 فبراير):
- `ecommerce_stores` — إعدادات المتجر
- `ecommerce_categories` — الفئات (شجرية)
- `ecommerce_products` → `fabric_materials` — **الطبقة الحيرية** (أسعار حية من ERP!)
- `ecommerce_orders` + `ecommerce_order_items` — الطلبات
- `store_banners` — البانرات والسلايدر
- `store_blog_posts` + `store_blog_comments` — المدونة
- `ecommerce_wishlists` — المفضلة
- `newsletter_subscribers` — النشرة البريدية

### ✅ المحتوى والصفحات (1 مارس):
- `website_sites` — المواقع (landing, store, blog)
- `website_pages` — الصفحات (32 صفحة) — **المعتمد**
- `website_sections` — أقسام المحتوى الديناميكية

### ⛔ ملغى:
- ~~`store_pages`~~ → DEPRECATED (استخدم `website_pages`)

### ⚠️ مؤرشف (ERP داخلي):
- ~~`products`~~ → فارغ (لا يُستخدم)
- ~~`shopping_carts`~~ → فارغ (نظام داخلي)
- ~~`get_products_for_store()`~~ → يقرأ من `products` القديم
- ~~`add_to_cart()`~~ → مربوط بـ `products` القديم

---

## RPCs المعتمدة

| Function | الوظيفة |
|----------|---------|
| `get_ecommerce_products()` | جلب منتجات المتجر + أسعار حية |
| `generate_order_number()` | توليد رقم طلب TXO-XXXXX |

## Migration Log
- `ecommerce_foundation.sql` — الطبقة الحيرية (27 فبراير)
- `ecommerce_features.sql` — الميزات (27 فبراير)
- `ecommerce_orders.sql` — الطلبات (27 فبراير)
- `20260301_website_manager.sql` — إدارة المحتوى (1 مارس)
- `20260302_consolidate_pages.sql` — توحيد الصفحات (2 مارس)

## التوثيق الشامل
See: unified_ecommerce_architecture.md (artifact)
