/**
 * Template Configuration - إعدادات قوالب الاستيراد
 * =================================================
 * تعريفات القوالب والأمثلة لكل نوع من البيانات
 * يدعم 5 لغات: عربي، إنجليزي، تركي، روسي، أوكراني
 */

import type { EntityType } from '@/services/importService';

export type TemplateLang = 'ar' | 'en' | 'tr' | 'ru' | 'uk';

export interface TemplateColumn {
  field: string;
  required: boolean;
  label: Record<TemplateLang, string>;
  example: string | number;
  description: Record<TemplateLang, string>;
}

export interface TemplateConfig {
  entity_type: EntityType;
  file_name: string;
  display_name: Record<TemplateLang, string>;
  instructions: Record<TemplateLang, string[]>;
  columns: TemplateColumn[];
}

// ═══════════════════════════════════════════════════════════════
// Template Definitions
// ═══════════════════════════════════════════════════════════════

export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  customers: {
    entity_type: 'customers',
    file_name: 'customers_import_template',
    display_name: {
      ar: 'العملاء', en: 'Customers', tr: 'Müşteriler', ru: 'Клиенты', uk: 'Клієнти'
    },
    instructions: {
      ar: [
        'يرجى ملء البيانات في الأعمدة المحددة',
        'الحقول المميزة بـ * مطلوبة',
        'يجب أن يكون الكود فريداً لكل عميل',
        'الرصيد الافتتاحي اختياري (موجب للمدين، سالب للدائن)',
      ],
      en: [
        'Please fill in the data in the specified columns',
        'Fields marked with * are required',
        'Code must be unique for each customer',
        'Opening balance is optional (positive for debit, negative for credit)',
      ],
      tr: [
        'Lütfen verileri belirtilen sütunlara girin',
        '* ile işaretlenmiş alanlar zorunludur',
        'Her müşteri için kod benzersiz olmalıdır',
        'Açılış bakiyesi isteğe bağlıdır',
      ],
      ru: [
        'Пожалуйста, заполните данные в указанных столбцах',
        'Поля отмеченные * обязательны для заполнения',
        'Код должен быть уникальным для каждого клиента',
        'Начальное сальдо необязательно (положительное — дебет, отрицательное — кредит)',
      ],
      uk: [
        'Будь ласка, заповніть дані у вказаних стовпцях',
        'Поля позначені * є обов\'язковими',
        'Код має бути унікальним для кожного клієнта',
        'Початкове сальдо необов\'язкове',
      ],
    },
    columns: [
      {
        field: 'code', required: true, example: 'CUST001',
        label: { ar: 'كود العميل *', en: 'Customer Code *', tr: 'Müşteri Kodu *', ru: 'Код клиента *', uk: 'Код клієнта *' },
        description: { ar: 'كود فريد', en: 'Unique code', tr: 'Benzersiz kod', ru: 'Уникальный код', uk: 'Унікальний код' }
      },
      {
        field: 'name_ar', required: true, example: 'شركة النور للتجارة',
        label: { ar: 'الاسم (عربي) *', en: 'Name (Arabic) *', tr: 'İsim (Arapça) *', ru: 'Название (Араб.) *', uk: 'Назва (Араб.) *' },
        description: { ar: 'الاسم الرئيسي بالعربية', en: 'Primary Arabic name', tr: 'Birincil Arapça isim', ru: 'Основное арабское имя', uk: 'Основна арабська назва' }
      },
      {
        field: 'name_en', required: false, example: 'Al-Noor Trading Co',
        label: { ar: 'الاسم (إنجليزي)', en: 'Name (English)', tr: 'İsim (İngilizce)', ru: 'Название (Англ.)', uk: 'Назва (Англ.)' },
        description: { ar: 'الاسم بالإنجليزية', en: 'English name', tr: 'İngilizce isim', ru: 'Англ. название', uk: 'Англ. назва' }
      },
      {
        field: 'name_tr', required: false, example: 'Al-Noor Ticaret Şirketi',
        label: { ar: 'الاسم (تركي)', en: 'Name (Turkish)', tr: 'İsim (Türkçe)', ru: 'Название (Тур.)', uk: 'Назва (Тур.)' },
        description: { ar: 'الاسم بالتركية', en: 'Turkish name', tr: 'Türkçe isim', ru: 'Тур. название', uk: 'Тур. назва' }
      },
      {
        field: 'name_ru', required: false, example: 'Торговая компания Ан-Нур',
        label: { ar: 'الاسم (روسي)', en: 'Name (Russian)', tr: 'İsim (Rusça)', ru: 'Название (Рус.)', uk: 'Назва (Рос.)' },
        description: { ar: 'الاسم بالروسية', en: 'Russian name', tr: 'Rusça isim', ru: 'Рус. название', uk: 'Рос. назва' }
      },
      {
        field: 'name_uk', required: false, example: 'Торгова компанія Ан-Нур',
        label: { ar: 'الاسم (أوكراني)', en: 'Name (Ukrainian)', tr: 'İsim (Ukraynaca)', ru: 'Название (Укр.)', uk: 'Назва (Укр.)' },
        description: { ar: 'الاسم بالأوكرانية', en: 'Ukrainian name', tr: 'Ukraynaca isim', ru: 'Укр. название', uk: 'Укр. назва' }
      },
      {
        field: 'phone', required: false, example: '+380501234567',
        label: { ar: 'الهاتف', en: 'Phone', tr: 'Telefon', ru: 'Телефон', uk: 'Телефон' },
        description: { ar: 'رقم الهاتف', en: 'Phone number', tr: 'Telefon no', ru: 'Номер телефона', uk: 'Номер телефону' }
      },
      {
        field: 'mobile', required: false, example: '+380671234567',
        label: { ar: 'الجوال', en: 'Mobile', tr: 'Cep Tel.', ru: 'Мобильный', uk: 'Мобільний' },
        description: { ar: 'رقم الجوال', en: 'Mobile number', tr: 'Cep telefonu', ru: 'Мобильный', uk: 'Мобільний' }
      },
      {
        field: 'email', required: false, example: 'info@alnoor.com',
        label: { ar: 'البريد الإلكتروني', en: 'Email', tr: 'E-posta', ru: 'Эл. почта', uk: 'Ел. пошта' },
        description: { ar: 'بريد إلكتروني', en: 'Email address', tr: 'E-posta adresi', ru: 'Адрес эл. почты', uk: 'Адреса ел. пошти' }
      },
      {
        field: 'address', required: false, example: 'شارع الرئيسي 15',
        label: { ar: 'العنوان', en: 'Address', tr: 'Adres', ru: 'Адрес', uk: 'Адреса' },
        description: { ar: 'عنوان', en: 'Address', tr: 'Adres', ru: 'Адрес', uk: 'Адреса' }
      },
      {
        field: 'city', required: false, example: 'كييف',
        label: { ar: 'المدينة', en: 'City', tr: 'Şehir', ru: 'Город', uk: 'Місто' },
        description: { ar: 'المدينة', en: 'City', tr: 'Şehir', ru: 'Город', uk: 'Місто' }
      },
      {
        field: 'country', required: false, example: 'أوكرانيا',
        label: { ar: 'البلد', en: 'Country', tr: 'Ülke', ru: 'Страна', uk: 'Країна' },
        description: { ar: 'البلد', en: 'Country', tr: 'Ülke', ru: 'Страна', uk: 'Країна' }
      },
      {
        field: 'currency', required: false, example: 'USD',
        label: { ar: 'العملة', en: 'Currency', tr: 'Para Birimi', ru: 'Валюта', uk: 'Валюта' },
        description: { ar: 'كود العملة (USD, UAH, EUR...)', en: 'Currency code (USD, UAH, EUR...)', tr: 'Para birimi kodu', ru: 'Код валюты', uk: 'Код валюти' }
      },
      {
        field: 'tax_number', required: false, example: 'UA123456789',
        label: { ar: 'الرقم الضريبي', en: 'Tax Number', tr: 'Vergi No', ru: 'ИНН', uk: 'ІПН' },
        description: { ar: 'رقم ضريبي', en: 'Tax ID', tr: 'Vergi numarası', ru: 'ИНН', uk: 'ІПН' }
      },
      {
        field: 'credit_limit', required: false, example: 50000,
        label: { ar: 'حد الائتمان', en: 'Credit Limit', tr: 'Kredi Limiti', ru: 'Кредитный лимит', uk: 'Кредитний ліміт' },
        description: { ar: 'حد ائتمان', en: 'Credit limit', tr: 'Kredi limiti', ru: 'Кредитный лимит', uk: 'Кредитний ліміт' }
      },
      {
        field: 'opening_balance', required: false, example: 5000,
        label: { ar: 'الرصيد الافتتاحي', en: 'Opening Balance', tr: 'Açılış Bakiyesi', ru: 'Нач. сальдо', uk: 'Поч. сальдо' },
        description: { ar: 'رصيد افتتاحي', en: 'Opening balance', tr: 'Açılış bakiyesi', ru: 'Начальное сальдо', uk: 'Початкове сальдо' }
      },
      {
        field: 'notes', required: false, example: '',
        label: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' },
        description: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' }
      },
    ]
  },

  suppliers: {
    entity_type: 'suppliers',
    file_name: 'suppliers_import_template',
    display_name: {
      ar: 'الموردين', en: 'Suppliers', tr: 'Tedarikçiler', ru: 'Поставщики', uk: 'Постачальники'
    },
    instructions: {
      ar: [
        'يرجى ملء البيانات في الأعمدة المحددة',
        'الحقول المميزة بـ * مطلوبة',
        'كود المورد يجب أن يكون فريداً',
        'شروط الدفع بالأيام (30 = شهر)',
      ],
      en: [
        'Please fill in the data in the specified columns',
        'Fields marked with * are required',
        'Supplier code must be unique',
        'Payment terms in days (30 = one month)',
      ],
      tr: [
        'Lütfen verileri belirtilen sütunlara girin',
        '* ile işaretlenmiş alanlar zorunludur',
        'Tedarikçi kodu benzersiz olmalıdır',
        'Ödeme koşulları gün olarak (30 = bir ay)',
      ],
      ru: [
        'Заполните данные в указанных столбцах',
        'Поля отмеченные * обязательны',
        'Код поставщика должен быть уникальным',
        'Условия оплаты в днях (30 = месяц)',
      ],
      uk: [
        'Заповніть дані у вказаних стовпцях',
        'Поля позначені * є обов\'язковими',
        'Код постачальника має бути унікальним',
        'Умови оплати в днях (30 = місяць)',
      ],
    },
    columns: [
      {
        field: 'code', required: true, example: 'SUP001',
        label: { ar: 'كود المورد *', en: 'Supplier Code *', tr: 'Tedarikçi Kodu *', ru: 'Код поставщика *', uk: 'Код постачальника *' },
        description: { ar: 'كود فريد', en: 'Unique code', tr: 'Benzersiz kod', ru: 'Уникальный код', uk: 'Унікальний код' }
      },
      {
        field: 'name_ar', required: true, example: 'مصنع الأقمشة الحديثة',
        label: { ar: 'الاسم (عربي) *', en: 'Name (Arabic) *', tr: 'İsim (Arapça) *', ru: 'Название (Араб.) *', uk: 'Назва (Араб.) *' },
        description: { ar: 'الاسم الرئيسي بالعربية', en: 'Primary Arabic name', tr: 'Birincil Arapça isim', ru: 'Основное арабское имя', uk: 'Основна арабська назва' }
      },
      {
        field: 'name_en', required: false, example: 'Modern Fabrics Factory',
        label: { ar: 'الاسم (إنجليزي)', en: 'Name (English)', tr: 'İsim (İngilizce)', ru: 'Название (Англ.)', uk: 'Назва (Англ.)' },
        description: { ar: 'الاسم بالإنجليزية', en: 'English name', tr: 'İngilizce isim', ru: 'Англ. название', uk: 'Англ. назва' }
      },
      {
        field: 'name_tr', required: false, example: 'Modern Kumaş Fabrikası',
        label: { ar: 'الاسم (تركي)', en: 'Name (Turkish)', tr: 'İsim (Türkçe)', ru: 'Название (Тур.)', uk: 'Назва (Тур.)' },
        description: { ar: 'الاسم بالتركية', en: 'Turkish name', tr: 'Türkçe isim', ru: 'Тур. название', uk: 'Тур. назва' }
      },
      {
        field: 'name_ru', required: false, example: 'Фабрика современных тканей',
        label: { ar: 'الاسم (روسي)', en: 'Name (Russian)', tr: 'İsim (Rusça)', ru: 'Название (Рус.)', uk: 'Назва (Рос.)' },
        description: { ar: 'الاسم بالروسية', en: 'Russian name', tr: 'Rusça isim', ru: 'Рус. название', uk: 'Рос. назва' }
      },
      {
        field: 'name_uk', required: false, example: 'Фабрика сучасних тканин',
        label: { ar: 'الاسم (أوكراني)', en: 'Name (Ukrainian)', tr: 'İsim (Ukraynaca)', ru: 'Название (Укр.)', uk: 'Назва (Укр.)' },
        description: { ar: 'الاسم بالأوكرانية', en: 'Ukrainian name', tr: 'Ukraynaca isim', ru: 'Укр. название', uk: 'Укр. назва' }
      },
      {
        field: 'phone', required: false, example: '+380501111111',
        label: { ar: 'الهاتف', en: 'Phone', tr: 'Telefon', ru: 'Телефон', uk: 'Телефон' },
        description: { ar: 'رقم الهاتف', en: 'Phone', tr: 'Telefon', ru: 'Телефон', uk: 'Телефон' }
      },
      {
        field: 'email', required: false, example: 'sales@modernfabrics.com',
        label: { ar: 'البريد الإلكتروني', en: 'Email', tr: 'E-posta', ru: 'Эл. почта', uk: 'Ел. пошта' },
        description: { ar: 'بريد إلكتروني', en: 'Email', tr: 'E-posta', ru: 'Эл. почта', uk: 'Ел. пошта' }
      },
      {
        field: 'address', required: false, example: 'المنطقة الصناعية',
        label: { ar: 'العنوان', en: 'Address', tr: 'Adres', ru: 'Адрес', uk: 'Адреса' },
        description: { ar: 'عنوان', en: 'Address', tr: 'Adres', ru: 'Адрес', uk: 'Адреса' }
      },
      {
        field: 'city', required: false, example: 'دنيبرو',
        label: { ar: 'المدينة', en: 'City', tr: 'Şehir', ru: 'Город', uk: 'Місто' },
        description: { ar: 'المدينة', en: 'City', tr: 'Şehir', ru: 'Город', uk: 'Місто' }
      },
      {
        field: 'country', required: false, example: 'أوكرانيا',
        label: { ar: 'البلد', en: 'Country', tr: 'Ülke', ru: 'Страна', uk: 'Країна' },
        description: { ar: 'البلد', en: 'Country', tr: 'Ülke', ru: 'Страна', uk: 'Країна' }
      },
      {
        field: 'currency', required: false, example: 'USD',
        label: { ar: 'العملة', en: 'Currency', tr: 'Para Birimi', ru: 'Валюта', uk: 'Валюта' },
        description: { ar: 'كود العملة (USD, UAH, EUR...)', en: 'Currency code (USD, UAH, EUR...)', tr: 'Para birimi kodu', ru: 'Код валюты', uk: 'Код валюти' }
      },
      {
        field: 'tax_number', required: false, example: 'UA987654321',
        label: { ar: 'الرقم الضريبي', en: 'Tax Number', tr: 'Vergi No', ru: 'ИНН', uk: 'ІПН' },
        description: { ar: 'رقم ضريبي', en: 'Tax ID', tr: 'Vergi numarası', ru: 'ИНН', uk: 'ІПН' }
      },
      {
        field: 'payment_terms', required: false, example: 30,
        label: { ar: 'شروط الدفع (أيام)', en: 'Payment Terms (days)', tr: 'Ödeme Vadesi (gün)', ru: 'Условия оплаты (дни)', uk: 'Умови оплати (дні)' },
        description: { ar: 'أيام', en: 'Days', tr: 'Gün', ru: 'Дни', uk: 'Дні' }
      },
      {
        field: 'opening_balance', required: false, example: 10000,
        label: { ar: 'الرصيد الافتتاحي', en: 'Opening Balance', tr: 'Açılış Bakiyesi', ru: 'Нач. сальдо', uk: 'Поч. сальдо' },
        description: { ar: 'موجب = مستحق للمورد', en: 'Positive = owed to supplier', tr: 'Pozitif = borçlu', ru: 'Положительное = должны поставщику', uk: 'Додатне = борг постачальнику' }
      },
      {
        field: 'notes', required: false, example: '',
        label: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' },
        description: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' }
      },
    ]
  },

  products: {
    entity_type: 'products',
    file_name: 'products_import_template',
    display_name: {
      ar: 'المنتجات والمواد', en: 'Products & Materials', tr: 'Ürünler & Malzemeler', ru: 'Товары и материалы', uk: 'Товари та матеріали'
    },
    instructions: {
      ar: [
        'الحقول المميزة بـ * مطلوبة',
        'كود المنتج والباركود يجب أن يكونا فريدين',
        'سعر البيع مطلوب ويجب أن يكون أكبر من صفر',
        'الكمية الافتتاحية هي المخزون الحالي عند بدء الاستخدام',
      ],
      en: [
        'Fields marked with * are required',
        'Product code and barcode must be unique',
        'Sale price is required and must be > 0',
        'Opening qty is current stock when starting',
      ],
      tr: [
        '* ile işaretlenmiş alanlar zorunludur',
        'Ürün kodu ve barkod benzersiz olmalıdır',
        'Satış fiyatı zorunlu ve > 0 olmalıdır',
        'Açılış miktarı başlangıç stokudur',
      ],
      ru: [
        'Поля * обязательны',
        'Код товара и штрихкод должны быть уникальными',
        'Цена продажи обязательна и > 0',
        'Начальное кол-во — текущий остаток при запуске',
      ],
      uk: [
        'Поля * є обов\'язковими',
        'Код товару та штрихкод мають бути унікальними',
        'Ціна реалізації обов\'язкова і > 0',
        'Початкова кількість — поточний залишок',
      ],
    },
    columns: [
      {
        field: 'code', required: true, example: 'PRD001',
        label: { ar: 'كود المنتج *', en: 'Product Code *', tr: 'Ürün Kodu *', ru: 'Код товара *', uk: 'Код товару *' },
        description: { ar: 'كود فريد', en: 'Unique code', tr: 'Benzersiz kod', ru: 'Уникальный код', uk: 'Унікальний код' }
      },
      {
        field: 'name_ar', required: true, example: 'قماش قطني أبيض',
        label: { ar: 'الاسم (عربي) *', en: 'Name (Arabic) *', tr: 'İsim (Arapça) *', ru: 'Название (Араб.) *', uk: 'Назва (Араб.) *' },
        description: { ar: 'الاسم الرئيسي بالعربية', en: 'Primary Arabic name', tr: 'Birincil Arapça isim', ru: 'Основное арабское имя', uk: 'Основна арабська назва' }
      },
      {
        field: 'name_en', required: false, example: 'White Cotton Fabric',
        label: { ar: 'الاسم (إنجليزي)', en: 'Name (English)', tr: 'İsim (İngilizce)', ru: 'Название (Англ.)', uk: 'Назва (Англ.)' },
        description: { ar: 'الاسم بالإنجليزية', en: 'English name', tr: 'İngilizce isim', ru: 'Англ. название', uk: 'Англ. назва' }
      },
      {
        field: 'name_tr', required: false, example: 'Beyaz Pamuklu Kumaş',
        label: { ar: 'الاسم (تركي)', en: 'Name (Turkish)', tr: 'İsim (Türkçe)', ru: 'Название (Тур.)', uk: 'Назва (Тур.)' },
        description: { ar: 'الاسم بالتركية', en: 'Turkish name', tr: 'Türkçe isim', ru: 'Тур. название', uk: 'Тур. назва' }
      },
      {
        field: 'name_ru', required: false, example: 'Белая хлопковая ткань',
        label: { ar: 'الاسم (روسي)', en: 'Name (Russian)', tr: 'İsim (Rusça)', ru: 'Название (Рус.)', uk: 'Назва (Рос.)' },
        description: { ar: 'الاسم بالروسية', en: 'Russian name', tr: 'Rusça isim', ru: 'Рус. название', uk: 'Рос. назва' }
      },
      {
        field: 'name_uk', required: false, example: 'Біла бавовняна тканина',
        label: { ar: 'الاسم (أوكراني)', en: 'Name (Ukrainian)', tr: 'İsim (Ukraynaca)', ru: 'Название (Укр.)', uk: 'Назва (Укр.)' },
        description: { ar: 'الاسم بالأوكرانية', en: 'Ukrainian name', tr: 'Ukraynaca isim', ru: 'Укр. название', uk: 'Укр. назва' }
      },
      {
        field: 'barcode', required: false, example: '1234567890123',
        label: { ar: 'الباركود', en: 'Barcode', tr: 'Barkod', ru: 'Штрихкод', uk: 'Штрихкод' },
        description: { ar: 'باركود فريد', en: 'Unique barcode', tr: 'Benzersiz barkod', ru: 'Уникальный штрихкод', uk: 'Унікальний штрихкод' }
      },
      {
        field: 'category', required: false, example: 'أقمشة قطنية',
        label: { ar: 'التصنيف', en: 'Category', tr: 'Kategori', ru: 'Категория', uk: 'Категорія' },
        description: { ar: 'مجموعة المنتج', en: 'Product group', tr: 'Ürün grubu', ru: 'Группа товара', uk: 'Група товару' }
      },
      {
        field: 'unit', required: false, example: 'متر',
        label: { ar: 'الوحدة', en: 'Unit', tr: 'Birim', ru: 'Единица', uk: 'Одиниця' },
        description: { ar: 'وحدة القياس', en: 'Measurement unit', tr: 'Ölçü birimi', ru: 'Ед. измерения', uk: 'Од. виміру' }
      },
      {
        field: 'sale_price', required: true, example: 50,
        label: { ar: 'سعر البيع *', en: 'Sale Price *', tr: 'Satış Fiyatı *', ru: 'Цена продажи *', uk: 'Ціна продажу *' },
        description: { ar: 'سعر البيع', en: 'Sale price', tr: 'Satış fiyatı', ru: 'Цена продажи', uk: 'Ціна продажу' }
      },
      {
        field: 'cost_price', required: false, example: 35,
        label: { ar: 'سعر التكلفة', en: 'Cost Price', tr: 'Maliyet', ru: 'Себестоимость', uk: 'Собівартість' },
        description: { ar: 'سعر التكلفة', en: 'Cost price', tr: 'Maliyet fiyatı', ru: 'Себестоимость', uk: 'Собівартість' }
      },
      {
        field: 'currency', required: false, example: 'USD',
        label: { ar: 'العملة', en: 'Currency', tr: 'Para Birimi', ru: 'Валюта', uk: 'Валюта' },
        description: { ar: 'عملة الأسعار (USD, UAH, EUR...)', en: 'Price currency (USD, UAH, EUR...)', tr: 'Fiyat para birimi', ru: 'Валюта цен', uk: 'Валюта цін' }
      },
      {
        field: 'opening_qty', required: false, example: 500,
        label: { ar: 'الكمية الافتتاحية', en: 'Opening Qty', tr: 'Açılış Miktarı', ru: 'Нач. кол-во', uk: 'Поч. кількість' },
        description: { ar: 'المخزون الحالي', en: 'Current stock', tr: 'Mevcut stok', ru: 'Текущий остаток', uk: 'Поточний залишок' }
      },
      {
        field: 'min_qty', required: false, example: 50,
        label: { ar: 'الحد الأدنى', en: 'Min Qty', tr: 'Min Miktar', ru: 'Мин. кол-во', uk: 'Мін. кількість' },
        description: { ar: 'حد أدنى للإنذار', en: 'Min alert qty', tr: 'Min uyarı miktarı', ru: 'Мин. для уведомления', uk: 'Мін. для сповіщення' }
      },
      {
        field: 'warehouse_code', required: false, example: 'WH-001',
        label: { ar: 'كود المستودع', en: 'Warehouse Code', tr: 'Depo Kodu', ru: 'Код склада', uk: 'Код складу' },
        description: { ar: 'المستودع لاستلام الكمية الافتتاحية', en: 'Warehouse for opening qty', tr: 'Açılış miktarı deposu', ru: 'Склад для нач. кол-ва', uk: 'Склад для поч. кількості' }
      },
      {
        field: 'description', required: false, example: 'قماش قطني 100% عرض 150سم',
        label: { ar: 'الوصف', en: 'Description', tr: 'Açıklama', ru: 'Описание', uk: 'Опис' },
        description: { ar: 'وصف المنتج', en: 'Product description', tr: 'Ürün açıklaması', ru: 'Описание товара', uk: 'Опис товару' }
      },
      {
        field: 'notes', required: false, example: '',
        label: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' },
        description: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' }
      },
    ]
  },

  journal_entries: {
    entity_type: 'journal_entries',
    file_name: 'journal_entries_import_template',
    display_name: {
      ar: 'القيود المحاسبية', en: 'Journal Entries', tr: 'Muhasebe Kayıtları', ru: 'Бух. проводки', uk: 'Бух. проводки'
    },
    instructions: {
      ar: [
        'كل صف يمثل سطر قيد واحد',
        'القيود المتعلقة ببعضها يجب أن تحمل نفس المرجع',
        'مجموع المدين = مجموع الدائن',
        'التاريخ: YYYY-MM-DD',
      ],
      en: [
        'Each row is one journal entry line',
        'Related entries should have the same reference',
        'Total debit must equal total credit',
        'Date format: YYYY-MM-DD',
      ],
      tr: [
        'Her satır bir kayıt satırıdır',
        'İlgili kayıtlar aynı referansa sahip olmalıdır',
        'Toplam borç = toplam alacak',
        'Tarih formatı: YYYY-MM-DD',
      ],
      ru: [
        'Каждая строка — одна строка проводки',
        'Связанные проводки должны иметь один референс',
        'Итого дебет = итого кредит',
        'Формат даты: YYYY-MM-DD',
      ],
      uk: [
        'Кожен рядок — один рядок проводки',
        'Пов\'язані проводки мають мати однаковий референс',
        'Підсумок дебет = підсумок кредит',
        'Формат дати: YYYY-MM-DD',
      ],
    },
    columns: [
      {
        field: 'entry_date', required: true, example: '2024-01-15',
        label: { ar: 'التاريخ *', en: 'Date *', tr: 'Tarih *', ru: 'Дата *', uk: 'Дата *' },
        description: { ar: 'تاريخ القيد', en: 'Entry date', tr: 'Kayıt tarihi', ru: 'Дата проводки', uk: 'Дата проводки' }
      },
      {
        field: 'reference', required: true, example: 'JE-001',
        label: { ar: 'المرجع *', en: 'Reference *', tr: 'Referans *', ru: 'Референс *', uk: 'Референс *' },
        description: { ar: 'رقم مرجعي', en: 'Reference number', tr: 'Referans no', ru: 'Номер ссылки', uk: 'Номер посилання' }
      },
      {
        field: 'description', required: false, example: 'قيد فتح الصندوق',
        label: { ar: 'الوصف', en: 'Description', tr: 'Açıklama', ru: 'Описание', uk: 'Опис' },
        description: { ar: 'وصف القيد', en: 'Entry description', tr: 'Kayıt açıklaması', ru: 'Описание проводки', uk: 'Опис проводки' }
      },
      {
        field: 'account_code', required: true, example: '111',
        label: { ar: 'رقم الحساب *', en: 'Account Code *', tr: 'Hesap Kodu *', ru: 'Код счёта *', uk: 'Код рахунку *' },
        description: { ar: 'رقم الحساب', en: 'Account code', tr: 'Hesap kodu', ru: 'Код счёта', uk: 'Код рахунку' }
      },
      {
        field: 'debit', required: false, example: 50000,
        label: { ar: 'مدين', en: 'Debit', tr: 'Borç', ru: 'Дебет', uk: 'Дебет' },
        description: { ar: 'مبلغ مدين', en: 'Debit amount', tr: 'Borç tutarı', ru: 'Сумма дебета', uk: 'Сума дебету' }
      },
      {
        field: 'credit', required: false, example: 0,
        label: { ar: 'دائن', en: 'Credit', tr: 'Alacak', ru: 'Кредит', uk: 'Кредит' },
        description: { ar: 'مبلغ دائن', en: 'Credit amount', tr: 'Alacak tutarı', ru: 'Сумма кредита', uk: 'Сума кредиту' }
      },
      {
        field: 'cost_center', required: false, example: '',
        label: { ar: 'مركز التكلفة', en: 'Cost Center', tr: 'Maliyet Merkezi', ru: 'Центр затрат', uk: 'Центр витрат' },
        description: { ar: 'مركز تكلفة', en: 'Cost center', tr: 'Maliyet merkezi', ru: 'Центр затрат', uk: 'Центр витрат' }
      },
      {
        field: 'notes', required: false, example: '',
        label: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' },
        description: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' }
      },
    ]
  },

  inventory_movements: {
    entity_type: 'inventory_movements',
    file_name: 'inventory_movements_import_template',
    display_name: {
      ar: 'حركات المخزون', en: 'Inventory Movements', tr: 'Stok Hareketleri', ru: 'Движение запасов', uk: 'Рух запасів'
    },
    instructions: {
      ar: [
        'أنواع الحركة: in (إدخال), out (إخراج), adjustment (تسوية)',
        'كود المنتج وكود المستودع يجب أن يكونا موجودين',
        'الكمية موجبة دائماً',
      ],
      en: [
        'Movement types: in, out, adjustment',
        'Product code and warehouse code must exist',
        'Quantity is always positive',
      ],
      tr: [
        'Hareket türleri: in (giriş), out (çıkış), adjustment (düzeltme)',
        'Ürün ve depo kodları mevcut olmalıdır',
        'Miktar daima pozitif',
      ],
      ru: [
        'Типы: in (ввод), out (вывод), adjustment (корректировка)',
        'Код товара и код склада должны существовать',
        'Кол-во всегда положительное',
      ],
      uk: [
        'Типи: in (ввід), out (вивід), adjustment (коригування)',
        'Код товару та код складу мають існувати',
        'Кількість завжди додатна',
      ],
    },
    columns: [
      {
        field: 'movement_date', required: true, example: '2024-01-20',
        label: { ar: 'التاريخ *', en: 'Date *', tr: 'Tarih *', ru: 'Дата *', uk: 'Дата *' },
        description: { ar: 'تاريخ الحركة', en: 'Movement date', tr: 'Hareket tarihi', ru: 'Дата движения', uk: 'Дата руху' }
      },
      {
        field: 'product_code', required: true, example: 'PRD001',
        label: { ar: 'كود المنتج *', en: 'Product Code *', tr: 'Ürün Kodu *', ru: 'Код товара *', uk: 'Код товару *' },
        description: { ar: 'كود المنتج', en: 'Product code', tr: 'Ürün kodu', ru: 'Код товара', uk: 'Код товару' }
      },
      {
        field: 'warehouse_code', required: true, example: 'WH001',
        label: { ar: 'كود المستودع *', en: 'Warehouse Code *', tr: 'Depo Kodu *', ru: 'Код склада *', uk: 'Код складу *' },
        description: { ar: 'كود المستودع', en: 'Warehouse code', tr: 'Depo kodu', ru: 'Код склада', uk: 'Код складу' }
      },
      {
        field: 'movement_type', required: true, example: 'in',
        label: { ar: 'نوع الحركة *', en: 'Type *', tr: 'Tür *', ru: 'Тип *', uk: 'Тип *' },
        description: { ar: 'in / out / adjustment', en: 'in / out / adjustment', tr: 'in / out / adjustment', ru: 'in / out / adjustment', uk: 'in / out / adjustment' }
      },
      {
        field: 'quantity', required: true, example: 100,
        label: { ar: 'الكمية *', en: 'Quantity *', tr: 'Miktar *', ru: 'Кол-во *', uk: 'Кількість *' },
        description: { ar: 'كمية موجبة', en: 'Positive qty', tr: 'Pozitif miktar', ru: 'Положительное кол-во', uk: 'Додатна кількість' }
      },
      {
        field: 'unit_cost', required: false, example: 35,
        label: { ar: 'تكلفة الوحدة', en: 'Unit Cost', tr: 'Birim Maliyet', ru: 'Себест. ед.', uk: 'Собів. од.' },
        description: { ar: 'تكلفة الوحدة', en: 'Unit cost', tr: 'Birim maliyet', ru: 'Себестоимость единицы', uk: 'Собівартість одиниці' }
      },
      {
        field: 'reference', required: false, example: 'PO-001',
        label: { ar: 'المرجع', en: 'Reference', tr: 'Referans', ru: 'Референс', uk: 'Референс' },
        description: { ar: 'رقم مرجعي', en: 'Reference no', tr: 'Referans no', ru: 'Номер ссылки', uk: 'Номер посилання' }
      },
      {
        field: 'notes', required: false, example: '',
        label: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' },
        description: { ar: 'ملاحظات', en: 'Notes', tr: 'Notlar', ru: 'Заметки', uk: 'Примітки' }
      },
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

export const SUPPORTED_LANGUAGES: { code: TemplateLang; flag: string; name: string; nameEn: string }[] = [
  { code: 'ar', flag: '🇸🇦', name: 'العربية', nameEn: 'Arabic' },
  { code: 'en', flag: '🇬🇧', name: 'English', nameEn: 'English' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe', nameEn: 'Turkish' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский', nameEn: 'Russian' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська', nameEn: 'Ukrainian' },
];

export function getTemplateConfig(entityType: string): TemplateConfig | null {
  return TEMPLATE_CONFIGS[entityType] || null;
}

export function getAvailableEntityTypes(): string[] {
  return Object.keys(TEMPLATE_CONFIGS);
}
