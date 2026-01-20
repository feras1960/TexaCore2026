/**
 * Template Configuration - إعدادات قوالب الاستيراد
 * =================================================
 * تعريفات القوالب والأمثلة لكل نوع من البيانات
 */

import type { EntityType } from '@/services/importService';

export interface TemplateExample {
  [key: string]: string | number;
}

export interface TemplateConfig {
  entity_type: EntityType;
  file_name: string;
  sheet_name_ar: string;
  sheet_name_en: string;
  instructions_ar: string[];
  instructions_en: string[];
  examples: TemplateExample[];
}

export const TEMPLATE_CONFIGS: Record<EntityType, TemplateConfig> = {
  customers: {
    entity_type: 'customers',
    file_name: 'customers_template',
    sheet_name_ar: 'العملاء',
    sheet_name_en: 'Customers',
    instructions_ar: [
      'يرجى ملء البيانات في الأعمدة المحددة',
      'الحقول المميزة بـ * مطلوبة',
      'يجب أن يكون الكود فريداً لكل عميل',
      'الرصيد الافتتاحي اختياري (موجب للمدين، سالب للدائن)',
      'يمكن ترك الحقول الاختيارية فارغة',
    ],
    instructions_en: [
      'Please fill in the data in the specified columns',
      'Fields marked with * are required',
      'Code must be unique for each customer',
      'Opening balance is optional (positive for debit, negative for credit)',
      'Optional fields can be left empty',
    ],
    examples: [
      {
        code: 'CUST001',
        name: 'شركة النور للتجارة',
        name_en: 'Al-Noor Trading Co',
        phone: '+380501234567',
        mobile: '+380671234567',
        email: 'info@alnoor.com',
        address: 'شارع الرئيسي 15',
        city: 'كييف',
        country: 'أوكرانيا',
        tax_number: 'UA123456789',
        credit_limit: 50000,
        opening_balance: 5000,
        notes: 'عميل مميز'
      },
      {
        code: 'CUST002',
        name: 'مؤسسة الصفا',
        name_en: 'Al-Safa Est',
        phone: '+380442345678',
        email: 'contact@alsafa.ua',
        city: 'خاركيف',
        country: 'أوكرانيا',
        credit_limit: 30000,
        opening_balance: 0,
      }
    ]
  },

  suppliers: {
    entity_type: 'suppliers',
    file_name: 'suppliers_template',
    sheet_name_ar: 'الموردين',
    sheet_name_en: 'Suppliers',
    instructions_ar: [
      'يرجى ملء البيانات في الأعمدة المحددة',
      'الحقول المميزة بـ * مطلوبة',
      'يجب أن يكون الكود فريداً لكل مورد',
      'شروط الدفع بالأيام (مثال: 30 يعني شهر)',
    ],
    instructions_en: [
      'Please fill in the data in the specified columns',
      'Fields marked with * are required',
      'Code must be unique for each supplier',
      'Payment terms in days (e.g., 30 means one month)',
    ],
    examples: [
      {
        code: 'SUP001',
        name: 'مصنع الأقمشة الحديثة',
        name_en: 'Modern Fabrics Factory',
        phone: '+380501111111',
        email: 'sales@modernfabrics.com',
        address: 'المنطقة الصناعية',
        city: 'دنيبرو',
        country: 'أوكرانيا',
        tax_number: 'UA987654321',
        payment_terms: 30,
        opening_balance: -10000,
        notes: 'مورد رئيسي للأقمشة'
      }
    ]
  },

  products: {
    entity_type: 'products',
    file_name: 'products_template',
    sheet_name_ar: 'المنتجات',
    sheet_name_en: 'Products',
    instructions_ar: [
      'يرجى ملء البيانات في الأعمدة المحددة',
      'الحقول المميزة بـ * مطلوبة',
      'يجب أن يكون الكود والباركود فريدين',
      'سعر البيع مطلوب ويجب أن يكون أكبر من صفر',
      'سعر التكلفة اختياري لكن مفيد لحساب الأرباح',
    ],
    instructions_en: [
      'Please fill in the data in the specified columns',
      'Fields marked with * are required',
      'Code and barcode must be unique',
      'Sale price is required and must be greater than zero',
      'Cost price is optional but useful for profit calculation',
    ],
    examples: [
      {
        code: 'PRD001',
        name: 'قماش قطني أبيض',
        name_en: 'White Cotton Fabric',
        barcode: '1234567890123',
        category: 'أقمشة قطنية',
        unit: 'متر',
        sale_price: 50,
        cost_price: 35,
        min_price: 45,
        opening_qty: 500,
        min_qty: 50,
        max_qty: 2000,
        description: 'قماش قطني 100% عرض 150سم',
        notes: ''
      },
      {
        code: 'PRD002',
        name: 'قماش حرير أزرق',
        name_en: 'Blue Silk Fabric',
        barcode: '1234567890124',
        category: 'أقمشة حريرية',
        unit: 'متر',
        sale_price: 120,
        cost_price: 85,
        opening_qty: 200,
      }
    ]
  },

  chart_of_accounts: {
    entity_type: 'chart_of_accounts',
    file_name: 'chart_of_accounts_template',
    sheet_name_ar: 'دليل الحسابات',
    sheet_name_en: 'Chart of Accounts',
    instructions_ar: [
      'يرجى ملء البيانات في الأعمدة المحددة',
      'رقم الحساب واسم الحساب ونوع الحساب مطلوبة',
      'أنواع الحسابات: asset (أصول), liability (خصوم), equity (حقوق ملكية), revenue (إيرادات), expense (مصروفات)',
      'رقم الحساب الأب يربط الحساب بحساب رئيسي (اختياري)',
      'نوع الرصيد: debit (مدين) أو credit (دائن)',
    ],
    instructions_en: [
      'Please fill in the data in the specified columns',
      'Account code, name, and type are required',
      'Account types: asset, liability, equity, revenue, expense',
      'Parent account code links to a parent account (optional)',
      'Balance type: debit or credit',
    ],
    examples: [
      {
        account_code: '1',
        name_ar: 'الأصول',
        name_en: 'Assets',
        account_type: 'asset',
        parent_code: '',
        opening_balance: 0,
        opening_balance_type: 'debit',
        description: 'حسابات الأصول الرئيسية'
      },
      {
        account_code: '11',
        name_ar: 'الأصول المتداولة',
        name_en: 'Current Assets',
        account_type: 'asset',
        parent_code: '1',
        opening_balance: 0,
        opening_balance_type: 'debit',
      },
      {
        account_code: '111',
        name_ar: 'الصندوق',
        name_en: 'Cash',
        account_type: 'asset',
        parent_code: '11',
        opening_balance: 100000,
        opening_balance_type: 'debit',
      }
    ]
  },

  journal_entries: {
    entity_type: 'journal_entries',
    file_name: 'journal_entries_template',
    sheet_name_ar: 'القيود المحاسبية',
    sheet_name_en: 'Journal Entries',
    instructions_ar: [
      'يرجى ملء البيانات في الأعمدة المحددة',
      'كل صف يمثل سطر قيد واحد',
      'القيود المتعلقة ببعضها يجب أن تحمل نفس المرجع',
      'يجب أن يكون مجموع المدين = مجموع الدائن',
      'التاريخ بصيغة: YYYY-MM-DD',
    ],
    instructions_en: [
      'Please fill in the data in the specified columns',
      'Each row represents one journal entry line',
      'Related entries should have the same reference',
      'Total debit must equal total credit',
      'Date format: YYYY-MM-DD',
    ],
    examples: [
      {
        entry_date: '2024-01-15',
        reference: 'JE-001',
        description: 'قيد فتح الصندوق',
        account_code: '111',
        debit: 50000,
        credit: 0,
        cost_center: '',
        notes: 'رصيد افتتاحي'
      },
      {
        entry_date: '2024-01-15',
        reference: 'JE-001',
        description: 'قيد فتح الصندوق',
        account_code: '311',
        debit: 0,
        credit: 50000,
        cost_center: '',
        notes: 'رصيد افتتاحي'
      }
    ]
  },

  inventory_movements: {
    entity_type: 'inventory_movements',
    file_name: 'inventory_movements_template',
    sheet_name_ar: 'حركات المخزون',
    sheet_name_en: 'Inventory Movements',
    instructions_ar: [
      'يرجى ملء البيانات في الأعمدة المحددة',
      'أنواع الحركة: in (إدخال), out (إخراج), transfer (تحويل), adjustment (تسوية)',
      'كود المنتج وكود المستودع يجب أن يكونا موجودين مسبقاً',
      'الكمية يجب أن تكون موجبة',
    ],
    instructions_en: [
      'Please fill in the data in the specified columns',
      'Movement types: in, out, transfer, adjustment',
      'Product code and warehouse code must exist beforehand',
      'Quantity must be positive',
    ],
    examples: [
      {
        movement_date: '2024-01-20',
        product_code: 'PRD001',
        warehouse_code: 'WH001',
        movement_type: 'in',
        quantity: 100,
        unit_cost: 35,
        reference: 'PO-001',
        notes: 'استلام بضاعة'
      },
      {
        movement_date: '2024-01-21',
        product_code: 'PRD001',
        warehouse_code: 'WH001',
        movement_type: 'out',
        quantity: 20,
        unit_cost: 35,
        reference: 'SO-001',
        notes: 'مبيعات'
      }
    ]
  }
};

/**
 * الحصول على إعدادات قالب لنوع كيان معين
 */
export function getTemplateConfig(entityType: EntityType): TemplateConfig | null {
  return TEMPLATE_CONFIGS[entityType] || null;
}

/**
 * الحصول على اسم ملف القالب
 */
export function getTemplateFileName(entityType: EntityType, language: 'ar' | 'en'): string {
  const config = TEMPLATE_CONFIGS[entityType];
  if (!config) return `${entityType}_template`;
  return `${config.file_name}_${language}.xlsx`;
}
