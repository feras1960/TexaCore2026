# 📦 توثيق تكامل شحن العملاء — Customer Shipping Integration

> **التاريخ**: 2026-02-11  
> **الحالة**: ✅ تم التنفيذ بنجاح  
> **ملف الهجرة**: `supabase/migrations/20260211_customer_shipping.sql`  
> **المرحلة**: Phase 7 — Unified Trade Sheet V2 Plan

---

## 📋 نظرة عامة

هذا المستند يوثّق نظام شحن العملاء المتكامل مع شركات الشحن الأوكرانية (خاصة Nova Poshta) وربطها بـ n8n. النظام مصمم للعمل على مستندات B2B التجارية (عروض أسعار، أوامر بيع، فواتير، إلخ).

### الفرق بين أنظمة الشحن الموجودة

| النظام | الجدول | الاستخدام | الحالة |
|--------|--------|-----------|--------|
| **تتبع الشحنات العام** | `shipments_tracking` (STEP_2) | تتبع بسيط (provider + tracking_number + status) | ✅ موجود — لم نلمسه |
| **شحنات الطلبات E-Commerce** | `order_shipments` (STEP_55) | شحنات مرتبطة بجدول `orders` مع COD | ✅ موجود — لم نلمسه |
| **شحن العملاء B2B** ← **جديد** | `shipment_documents` + `shipping_carriers` | بوليصات الشحن (TTN) مرتبطة بالمستندات التجارية | ✅ تم إنشاؤه الآن |

---

## 🗄️ الجداول المُنشأة

### 1. `customer_addresses` — عناوين العملاء

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف الفريد |
| `tenant_id` | UUID NOT NULL | معرف المستأجر |
| `customer_id` | UUID FK → customers | معرف العميل |
| `address_type` | VARCHAR(20) | نوع العنوان: `shipping`, `billing` |
| `label` | VARCHAR(100) | تسمية العنوان (مثال: "المكتب الرئيسي") |
| `recipient_name` | VARCHAR(200) | اسم المستلم |
| `phone` | VARCHAR(50) | هاتف المستلم |
| `country` | VARCHAR(100) | الدولة |
| `city` | VARCHAR(100) | المدينة |
| `district` | VARCHAR(100) | المنطقة / الحي |
| `street` | VARCHAR(200) | الشارع |
| `building` | VARCHAR(100) | رقم المبنى |
| `floor` | VARCHAR(20) | الطابق |
| `apartment` | VARCHAR(20) | الشقة |
| `postal_code` | VARCHAR(20) | الرمز البريدي |
| `latitude` | DECIMAL(10,8) | خط العرض |
| `longitude` | DECIMAL(11,8) | خط الطول |
| `is_default` | BOOLEAN | عنوان افتراضي |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |

**مجموعة RLS**: C-Group (tenant_id فقط)  
**السياسات**: 4 سياسات CRUD — `is_platform_admin() OR tenant_id = get_user_tenant_id()`  
**Trigger**: `trg_auto_tenant_customer_addresses` → `auto_set_tenant_id()`

---

### 2. `shipping_carriers` — إعدادات شركات الشحن

جدول مركزي لتكوين شركات الشحن لكل شركة. يحتوي على حقول خاصة بـ Nova Poshta API.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف الفريد |
| `tenant_id` | UUID NOT NULL | معرف المستأجر |
| `company_id` | UUID FK → companies | معرف الشركة |
| **معلومات الشركة** | | |
| `carrier_code` | VARCHAR(50) UNIQUE | `nova_poshta`, `ukrposhta`, `dhl`, `aramex` |
| `name_ar` | VARCHAR(200) | الاسم بالعربية |
| `name_en` | VARCHAR(200) | الاسم بالإنجليزية |
| `name_uk` | VARCHAR(200) | الاسم بالأوكرانية |
| `logo_url` | TEXT | رابط الشعار |
| **API Integration** | | |
| `api_endpoint` | TEXT | Base API URL |
| `api_key_encrypted` | TEXT | مفتاح API مشفر (Supabase Vault) |
| `api_version` | VARCHAR(20) | مثال: `v2.0` |
| **Nova Poshta Specific** | | |
| `np_sender_ref` | VARCHAR(36) | Sender counterparty Ref (UUID) |
| `np_sender_city_ref` | VARCHAR(36) | Sender city Ref |
| `np_sender_address_ref` | VARCHAR(36) | Sender warehouse/branch Ref |
| `np_sender_contact_ref` | VARCHAR(36) | Sender contact person Ref |
| `np_sender_phone` | VARCHAR(50) | هاتف المرسل |
| **Tracking** | | |
| `tracking_url_template` | TEXT | مثال: `https://novaposhta.ua/tracking?id={tracking}` |
| **n8n Integration** | | |
| `n8n_create_shipment_webhook` | TEXT | Webhook لإنشاء بوليصة |
| `n8n_track_shipment_webhook` | TEXT | Webhook لتتبع الحالة |
| `n8n_cancel_shipment_webhook` | TEXT | Webhook لإلغاء الشحنة |
| `n8n_print_label_webhook` | TEXT | Webhook لطباعة البوليصة |
| **Settings** | | |
| `default_service_type` | VARCHAR(50) | `WarehouseWarehouse`, `WarehouseDoors`, `DoorsDoors` |
| `default_cargo_type` | VARCHAR(50) | `Cargo`, `Parcel`, `Documents`, `Pallet` |
| `default_payer_type` | VARCHAR(50) | `Sender`, `Recipient`, `ThirdPerson` |
| `default_payment_method` | VARCHAR(50) | `Cash`, `NonCash` |
| `settings` | JSONB | إعدادات إضافية |

**مجموعة RLS**: D-Group (tenant_id + company_id)  
**السياسات**: 4 سياسات CRUD عبر `create_company_rls_policies()` → `check_row_access(tenant_id, company_id)`  
**Trigger**: `trg_auto_tenant_shipping_carriers` → `auto_set_tenant_id()`  
**UNIQUE**: `(tenant_id, company_id, carrier_code)`

---

### 3. `shipment_documents` — بوليصات الشحن (TTN/Waybills)

كل بوليصة شحن تم إنشاؤها عبر API شركة الشحن.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف الفريد |
| `tenant_id` | UUID NOT NULL | معرف المستأجر |
| `company_id` | UUID FK → companies | معرف الشركة |
| `carrier_id` | UUID FK → shipping_carriers | معرف شركة الشحن |
| **ربط بالمستند** | | |
| `source_table` | VARCHAR(50) | `sales_orders`, `sales_deliveries`, etc. |
| `source_id` | UUID | ID المستند المصدري |
| **البوليصة** | | |
| `carrier_code` | VARCHAR(50) | كود شركة الشحن |
| `tracking_number` | VARCHAR(100) | رقم البوليصة (TTN) |
| `carrier_ref` | VARCHAR(100) | Nova Poshta: Internet Document Ref |
| **الحالة** | | |
| `status` | VARCHAR(50) | `created`, `pending`, `in_transit`, `arrived`, `delivered`, `returned`, `cancelled` |
| `status_description` | TEXT | وصف الحالة |
| `last_status_check` | TIMESTAMPTZ | آخر فحص للحالة |
| **المرسل (Sender)** | | |
| `sender_ref` | VARCHAR(36) | Counterparty Ref |
| `sender_city_ref` / `sender_city_name` | | مدينة المرسل |
| `sender_address_ref` / `sender_address_name` | | عنوان / فرع المرسل |
| `sender_contact_ref` / `sender_contact_name` | | جهة اتصال المرسل |
| `sender_phone` | VARCHAR(50) | هاتف المرسل |
| **المستلم (Recipient)** | | |
| `recipient_ref` / `recipient_city_ref` / `recipient_city_name` | | مدينة المستلم |
| `recipient_address_ref` / `recipient_address_name` | | فرع المستلم (WarehouseWarehouse) |
| `recipient_address_street` / `recipient_building` / `recipient_flat` | | عنوان المستلم (DoorsDoors) |
| `recipient_contact_name` / `recipient_phone` | | جهة اتصال المستلم |
| **تفاصيل الشحنة** | | |
| `service_type` | VARCHAR(50) | `WarehouseWarehouse`, `WarehouseDoors`, `DoorsWarehouse`, `DoorsDoors` |
| `cargo_type` | VARCHAR(50) | `Cargo`, `Parcel`, `Documents`, `TiresWheels`, `Pallet` |
| `payer_type` | VARCHAR(50) | `Sender`, `Recipient`, `ThirdPerson` |
| `payment_method` | VARCHAR(50) | `Cash`, `NonCash` |
| `weight` | DECIMAL(10,3) | الوزن (kg) |
| `volume_general` | DECIMAL(10,4) | الحجم (m³) |
| `seats_amount` | INT | عدد القطع |
| `length` / `width` / `height` | DECIMAL(10,2) | الأبعاد (cm) |
| **المبالغ** | | |
| `declared_value` | DECIMAL(12,2) | القيمة المعلنة |
| `shipping_cost` | DECIMAL(12,2) | تكلفة الشحن |
| `cod_amount` | DECIMAL(12,2) | الدفع عند الاستلام (COD) |
| `cod_collected` | DECIMAL(12,2) | المبلغ المحصل فعلياً |
| `carrier_commission` | DECIMAL(12,2) | عمولة شركة الشحن |
| **التواريخ** | | |
| `estimated_delivery_date` | DATE | التاريخ المتوقع |
| `actual_delivery_date` | DATE | التاريخ الفعلي |
| `picked_up_at` / `delivered_at` / `returned_at` | TIMESTAMPTZ | أوقات الأحداث |
| **الطباعة** | | |
| `label_url` | TEXT | رابط PDF البوليصة |
| `barcode` | VARCHAR(100) | باركود البوليصة |
| **بيانات API** | | |
| `api_request` | JSONB | الطلب المرسل إلى API |
| `api_response` | JSONB | الرد من API |
| `status_history` | JSONB | سجل الحالات [{status, date, description}] |

**مجموعة RLS**: D-Group (tenant_id + company_id)  
**السياسات**: 4 سياسات CRUD عبر `create_company_rls_policies()`  
**Trigger**: `trg_auto_tenant_shipment_documents` → `auto_set_tenant_id()`

---

## 📝 الحقول المضافة على مستندات التجارة

الحقول التالية أُضيفت على **5 جداول**:
- `quotations` (عروض الأسعار)
- `sales_orders` (أوامر البيع)
- `sales_invoices` (فواتير البيع)
- `sales_deliveries` (إذونات التسليم)
- `transit_reservations` (حجوزات الترانزيت)

| العمود | النوع | الوصف |
|--------|-------|-------|
| `delivery_method` | VARCHAR(30) DEFAULT 'store_pickup' | طريقة التسليم |
| `shipping_address_id` | UUID FK → customer_addresses | العنوان المختار |
| `shipping_address` | TEXT | نص العنوان الكامل |
| `shipping_recipient` | VARCHAR(200) | اسم المستلم |
| `shipping_phone` | VARCHAR(50) | هاتف المستلم |
| `shipping_carrier` | VARCHAR(50) | كود شركة الشحن |
| `tracking_number` | VARCHAR(100) | رقم البوليصة |
| `shipping_cost` | DECIMAL(12,2) | تكلفة الشحن |
| `delivery_notes` | TEXT | ملاحظات التوصيل |

### طرق التسليم (`delivery_method`):
| القيمة | الوصف بالعربية | الوصف بالإنجليزية |
|--------|----------------|-------------------|
| `store_pickup` | استلام من الفرع / المتجر | Store / Branch Pickup |
| `direct_delivery` | توصيل مباشر | Direct Delivery |
| `carrier` | شحن عبر شركة شحن | Shipping Carrier |

---

## ⚙️ الفنكشنز (Stored Functions)

### 1. `create_shipment_document()` — إنشاء بوليصة

**الغرض**: إنشاء سجل بوليصة شحن وبناء طلب Nova Poshta API JSON.

```sql
SELECT create_shipment_document(
    p_company_id         := 'uuid-of-company',
    p_source_table       := 'sales_orders',
    p_source_id          := 'uuid-of-sales-order',
    p_carrier_code       := 'nova_poshta',
    p_recipient_name     := 'أحمد محمد',
    p_recipient_phone    := '+380991234567',
    p_recipient_city     := 'Kyiv',
    p_recipient_city_ref := 'city-ref-from-np-api',
    p_recipient_address_ref := 'warehouse-ref-from-np-api',
    p_service_type       := 'WarehouseWarehouse',
    p_cargo_type         := 'Parcel',
    p_payer_type         := 'Sender',
    p_weight             := 2.5,
    p_declared_value     := 1500.00,
    p_cod_amount         := 0,
    p_description        := 'أقمشة — 3 رولات'
);
```

**القيمة المُرجعة** (JSONB):
```json
{
    "success": true,
    "shipment_document_id": "uuid",
    "carrier_code": "nova_poshta",
    "carrier_id": "uuid",
    "api_endpoint": "https://api.novaposhta.ua/v2.0/json/",
    "n8n_webhook": "https://n8n.yourdomain.com/webhook/create-shipment",
    "np_api_request": {
        "apiKey": "__API_KEY__",
        "modelName": "InternetDocument",
        "calledMethod": "save",
        "methodProperties": {
            "PayerType": "Sender",
            "PaymentMethod": "NonCash",
            "DateTime": "11.02.2026",
            "CargoType": "Parcel",
            "Weight": "2.5",
            "SeatsAmount": "1",
            "ServiceType": "WarehouseWarehouse",
            "Description": "أقمشة — 3 رولات",
            "Cost": "1500.00",
            "Sender": "sender-ref",
            "CitySender": "sender-city-ref",
            "SenderAddress": "sender-address-ref",
            "ContactSender": "sender-contact-ref",
            "SendersPhone": "+380XXXXXXXXX",
            "RecipientCityName": "Kyiv",
            "RecipientAddressName": "warehouse-ref",
            "RecipientName": "أحمد محمد",
            "RecipientsPhone": "+380991234567",
            "VolumeGeneral": "0.001"
        }
    },
    "tracking_url_template": "https://novaposhta.ua/tracking?id={tracking}"
}
```

### 2. `process_shipment_api_response()` — معالجة رد API

**الغرض**: يُستدعى من n8n بعد إرسال الطلب لـ Nova Poshta وتلقي الرد.

```sql
SELECT process_shipment_api_response(
    p_shipment_doc_id    := 'uuid-of-shipment-document',
    p_tracking_number    := '20450000123456',
    p_carrier_ref        := 'np-internet-document-ref',
    p_estimated_delivery := '2026-02-14',
    p_shipping_cost      := 85.50,
    p_label_url          := 'https://my.novaposhta.ua/orders/printMarkings/orders/...',
    p_api_response       := '{"success": true, "data": [...]}'::jsonb,
    p_success            := true
);
```

**الإجراءات**:
- يحفظ TTN + label_url في `shipment_documents`
- يُحدّث `tracking_number` و `shipping_cost` على المستند التجاري المصدري

### 3. `update_shipment_document_status()` — تحديث حالة الشحنة

**الغرض**: يُستدعى من n8n دورياً (Cron) لتحديث حالة الشحنة.

```sql
SELECT update_shipment_document_status(
    p_shipment_doc_id     := 'uuid',
    p_new_status          := 'delivered',
    p_status_description  := 'تم التسليم بنجاح',
    p_cod_collected       := 1500.00,
    p_carrier_commission  := 45.00
);
```

---

## 🔗 تدفق العمل مع n8n (Integration Flow)

```
┌─────────────────────────────────────────────────────┐
│  الخطوة 1: المستخدم يختار "إنشاء بوليصة"          │
│  Frontend → CustomerShippingTab                      │
│  ↓ يرسل بيانات المستلم + نوع الشحن                 │
│  ↓ يستدعي create_shipment_document()                │
│  ← يستلم JSON فيه NP API request جاهز              │
├─────────────────────────────────────────────────────┤
│  الخطوة 2: Frontend يرسل إلى n8n Webhook            │
│  POST → n8n_create_shipment_webhook                  │
│  Body: { shipment_document_id, np_api_request }      │
├─────────────────────────────────────────────────────┤
│  الخطوة 3: n8n يعالج الطلب                          │
│  1. يجلب API Key المشفر من Supabase Vault            │
│  2. يستبدل __API_KEY__ في الطلب                      │
│  3. POST → api.novaposhta.ua/v2.0/json/              │
│  4. يستقبل { IntDocNumber, Ref, CostOnSite, ... }   │
├─────────────────────────────────────────────────────┤
│  الخطوة 4: n8n يحفظ النتيجة                         │
│  → يستدعي process_shipment_api_response()            │
│  → TTN يظهر في الواجهة + رابط الطباعة               │
├─────────────────────────────────────────────────────┤
│  الخطوة 5: تتبع دوري (n8n Cron — كل ساعة)          │
│  1. يجلب الشحنات المفتوحة من shipment_documents      │
│  2. يسأل NP API: getStatusDocuments                  │
│  3. يستدعي update_shipment_document_status()         │
│  4. الحالة تتحدث تلقائياً في الواجهة                │
└─────────────────────────────────────────────────────┘
```

---

## 🇺🇦 Nova Poshta API v2.0 — مرجع سريع

### Endpoint
```
POST https://api.novaposhta.ua/v2.0/json/
```

### الحصول على API Key
1. تسجيل حساب في [my.novaposhta.ua](https://my.novaposhta.ua)
2. Settings → API Keys → Generate

### أهم Methods المستخدمة:

| Model | Method | الغرض |
|-------|--------|-------|
| `InternetDocument` | `save` | إنشاء بوليصة (TTN) |
| `InternetDocument` | `delete` | حذف بوليصة |
| `InternetDocument` | `getStatusDocuments` | تتبع حالة الشحنة |
| `InternetDocument` | `printMarkings` | طباعة البوليصة (PDF) |
| `Address` | `getCities` | البحث عن المدن |
| `Address` | `getWarehouses` | البحث عن الفروع |
| `Counterparty` | `getCounterparties` | بيانات المرسل/المستلم |
| `Counterparty` | `getCounterpartyContactPersons` | جهات الاتصال |

### أنواع الخدمة (ServiceType):
| القيمة | الوصف |
|--------|-------|
| `WarehouseWarehouse` | من فرع إلى فرع |
| `WarehouseDoors` | من فرع إلى العنوان |
| `DoorsWarehouse` | من العنوان إلى فرع |
| `DoorsDoors` | من العنوان إلى العنوان |

### أنواع البضائع (CargoType):
| القيمة | الوصف |
|--------|-------|
| `Cargo` | بضائع كبيرة |
| `Parcel` | طرود |
| `Documents` | مستندات |
| `TiresWheels` | إطارات |
| `Pallet` | بالتة |

### الدافع (PayerType):
| القيمة | الوصف |
|--------|-------|
| `Sender` | المرسل يدفع |
| `Recipient` | المستلم يدفع |
| `ThirdPerson` | طرف ثالث |

### حقول 2024 الجديدة:
- `customerNumber` — رقم العميل (اختياري)
- `packingType` — نوع التغليف (اختياري)
- `EORI` — للشحن الدولي
- `RegistrationAddress` — عنوان التسجيل للشحن الدولي

---

## 🛡️ الأمان والسياسات

### مجموعات RLS:

| الجدول | المجموعة | نمط السياسة |
|--------|----------|-------------|
| `customer_addresses` | **C-Group** | `is_platform_admin() OR tenant_id = get_user_tenant_id()` |
| `shipping_carriers` | **D-Group** | `is_platform_admin() OR check_row_access(tenant_id, company_id)` |
| `shipment_documents` | **D-Group** | `is_platform_admin() OR check_row_access(tenant_id, company_id)` |

### Triggers:
| Trigger | الجدول | الفنكشن |
|---------|--------|---------|
| `trg_auto_tenant_customer_addresses` | `customer_addresses` | `auto_set_tenant_id()` |
| `trg_auto_tenant_shipping_carriers` | `shipping_carriers` | `auto_set_tenant_id()` |
| `trg_auto_tenant_shipment_documents` | `shipment_documents` | `auto_set_tenant_id()` |

### Indexes:
| Index | الجدول | الأعمدة |
|-------|--------|---------|
| `idx_customer_addresses_customer` | `customer_addresses` | `customer_id` |
| `idx_customer_addresses_default` | `customer_addresses` | `customer_id, is_default` (WHERE is_default) |
| `idx_shipping_carriers_company` | `shipping_carriers` | `company_id` |
| `idx_shipping_carriers_code` | `shipping_carriers` | `tenant_id, carrier_code, is_active` |
| `idx_shipment_docs_source` | `shipment_documents` | `source_table, source_id` |
| `idx_shipment_docs_tracking` | `shipment_documents` | `tracking_number` (WHERE NOT NULL) |
| `idx_shipment_docs_carrier` | `shipment_documents` | `carrier_code, status` |
| `idx_shipment_docs_company` | `shipment_documents` | `company_id, created_at DESC` |
| `idx_shipment_docs_status` | `shipment_documents` | `tenant_id, status` (WHERE NOT delivered/cancelled) |
| `idx_quotations_delivery_method` | `quotations` | `delivery_method` |
| `idx_sales_orders_delivery_method` | `sales_orders` | `delivery_method` |
| `idx_sales_orders_tracking` | `sales_orders` | `tracking_number` (WHERE NOT NULL) |
| `idx_sales_deliveries_tracking` | `sales_deliveries` | `tracking_number` (WHERE NOT NULL) |

---

## 🚀 خطوات التشغيل التالية

### 1. تسجيل شركة الشحن في الجدول
```sql
INSERT INTO shipping_carriers (
    company_id,
    carrier_code, name_ar, name_en, name_uk,
    api_endpoint, api_key_encrypted, api_version,
    np_sender_ref, np_sender_city_ref, np_sender_address_ref,
    np_sender_contact_ref, np_sender_phone,
    tracking_url_template,
    n8n_create_shipment_webhook,
    n8n_track_shipment_webhook,
    default_service_type, default_cargo_type, default_payer_type,
    is_default
) VALUES (
    'your-company-uuid',
    'nova_poshta', 'نوفايا بوشتا', 'Nova Poshta', 'Нова Пошта',
    'https://api.novaposhta.ua/v2.0/json/',
    'your-encrypted-api-key',  -- استخدم Supabase Vault
    'v2.0',
    'sender-counterparty-ref',  -- من NP API: Counterparty.getCounterparties
    'sender-city-ref',          -- من NP API: Address.getCities
    'sender-warehouse-ref',     -- من NP API: Address.getWarehouses
    'sender-contact-ref',       -- من NP API: Counterparty.getCounterpartyContactPersons
    '+380XXXXXXXXX',
    'https://novaposhta.ua/tracking/international/en?id={tracking}',
    'https://your-n8n.com/webhook/create-shipment',
    'https://your-n8n.com/webhook/track-shipment',
    'WarehouseWarehouse', 'Parcel', 'Sender',
    true
);
```

### 2. إعداد n8n Workflow
- **Trigger**: Webhook node
- **Action 1**: HTTP Request → Nova Poshta API
- **Action 2**: Supabase node → `process_shipment_api_response()`

### 3. إعداد n8n Cron للتتبع
- **Trigger**: Cron (كل ساعة)
- **Action 1**: Supabase query → شحنات مفتوحة
- **Action 2**: HTTP Request → NP `getStatusDocuments`
- **Action 3**: Supabase → `update_shipment_document_status()`

---

## 📁 الملفات ذات الصلة

| الملف | الوصف |
|-------|-------|
| `supabase/migrations/20260211_customer_shipping.sql` | سكربت الهجرة (تم تنفيذه ✅) |
| `src/features/trade/components/tabs/CustomerShippingTab.tsx` | واجهة شحن العميل |
| `src/features/accounting/components/unified/UnifiedAccountingSheet.tsx` | يعرض CustomerShippingTab |
| `src/features/accounting/components/unified/configs/tradeConfigs.ts` | تهيئة التاب |
| `supabase/scripts/STEP_2_COMMUNICATIONS_AND_SHIPMENTS_SCHEMA.sql` | جدول shipments_tracking العام |
| `supabase/all_executed_migrations/archived_STEP_55_advanced_order_management.sql` | جدول order_shipments (E-Commerce) |
