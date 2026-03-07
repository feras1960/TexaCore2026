/**
 * Import Service - خدمة استيراد البيانات
 * ===========================================
 * خدمة شاملة لاستيراد البيانات من ملفات Excel/CSV
 * تشمل: توليد القوالب، التحقق، تحليل AI، التنفيذ
 */

import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════

export type EntityType =
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'chart_of_accounts'
  | 'journal_entries'
  | 'inventory_movements';

export type ImportStatus =
  | 'pending'
  | 'parsing'
  | 'validating'
  | 'ai_analyzing'
  | 'ready'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RowStatus =
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'imported'
  | 'skipped'
  | 'failed';

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'text';
  required: boolean;
  label_ar: string;
  label_en: string;
  max_length?: number;
  min?: number;
  max?: number;
  options?: string[];
  format?: string;
}

export interface EntityDefinition {
  entity_type: EntityType;
  target_table: string;
  display_name_ar: string;
  display_name_en: string;
  icon: string;
  fields: FieldDefinition[];
  required_fields: string[];
  unique_fields: string[] | null;
  lookup_fields: string[] | null;
}

export interface ImportJob {
  id: string;
  tenant_id: string;
  user_id: string;
  entity_type: EntityType;
  file_name: string;
  file_type: string;
  file_size: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  imported_rows: number;
  skipped_rows: number;
  failed_rows: number;
  status: ImportStatus;
  progress_percent: number;
  current_step: string;
  validation_summary: ValidationSummary;
  ai_analysis_summary?: AIAnalysisSummary;
  import_options: ImportOptions;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ImportRow {
  id: string;
  job_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  mapped_data?: Record<string, unknown>;
  cleaned_data?: Record<string, unknown>;
  status: RowStatus;
  validation_errors: ValidationError[];
  ai_suggestions?: AISuggestions;
  entity_id?: string;
}

export interface ValidationError {
  field: string;
  error: string;
  error_key: string;
  value: unknown;
}

export interface ValidationSummary {
  total_errors: number;
  errors_by_type: Record<string, number>;
  errors_by_field: Record<string, number>;
}

export interface AISuggestions {
  corrections: Array<{
    field: string;
    original: string;
    suggested: string;
    confidence: number;
    reason: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  duplicates: Array<{
    existing_id: string;
    existing_name: string;
    similarity: number;
  }>;
}

export interface AIAnalysisSummary {
  total_corrections: number;
  total_warnings: number;
  potential_duplicates: number;
  anomalies_detected: number;
}

export interface ImportOptions {
  skip_invalid_rows: boolean;
  update_existing: boolean;
  use_ai_analysis: boolean;
  column_mappings: Record<string, string>;
}

export interface ColumnMapping {
  file_column: string;
  system_field: string;
  is_mapped: boolean;
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  file_type: string;
}

// ═══════════════════════════════════════════════════════════════
// Validation Patterns
// ═══════════════════════════════════════════════════════════════

const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  code: /^[A-Za-z0-9\-_]+$/,
  date: /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}\.\d{2}\.\d{4}$/,
};

// ═══════════════════════════════════════════════════════════════
// Import Service
// ═══════════════════════════════════════════════════════════════

export const importService = {
  // ─────────────────────────────────────────────────────────────
  // Entity Definitions
  // ─────────────────────────────────────────────────────────────

  /**
   * الحصول على تعريفات جميع الكيانات المتاحة للاستيراد
   * يستخدم التعريفات المحلية من templateConfig بدلاً من RPC
   */
  async getEntityDefinitions(): Promise<EntityDefinition[]> {
    try {
      const { TEMPLATE_CONFIGS } = await import('@/features/import/templates/templateConfig');
      return Object.values(TEMPLATE_CONFIGS).map(cfg => ({
        entity_type: cfg.entity_type,
        target_table: cfg.entity_type === 'journal_entries' ? 'journal_entries' :
          cfg.entity_type === 'inventory_movements' ? 'stock_movements' :
            cfg.entity_type,
        display_name_ar: cfg.display_name.ar,
        display_name_en: cfg.display_name.en,
        icon: cfg.entity_type === 'customers' ? 'Users' :
          cfg.entity_type === 'suppliers' ? 'Truck' :
            cfg.entity_type === 'products' ? 'Package' :
              cfg.entity_type === 'journal_entries' ? 'FileSpreadsheet' :
                'TrendingUp',
        fields: cfg.columns.map(col => ({
          name: col.field,
          type: (typeof col.example === 'number' ? 'number' : 'string') as FieldDefinition['type'],
          required: col.required,
          label_ar: col.label.ar.replace(' *', ''),
          label_en: col.label.en.replace(' *', ''),
        })),
        required_fields: cfg.columns.filter(c => c.required).map(c => c.field),
        unique_fields: cfg.columns.filter(c => c.field === 'code' || c.field === 'barcode').map(c => c.field),
        lookup_fields: null,
      }));
    } catch (err) {
      console.error('Error building entity definitions:', err);
      return [];
    }
  },

  /**
   * الحصول على تعريف كيان معين
   */
  async getEntityDefinition(entityType: EntityType): Promise<EntityDefinition | null> {
    const definitions = await this.getEntityDefinitions();
    return definitions.find(d => d.entity_type === entityType) || null;
  },

  // ─────────────────────────────────────────────────────────────
  // Template Generation
  // ─────────────────────────────────────────────────────────────

  /**
   * توليد قالب Excel لنوع كيان معين
   */
  async generateTemplate(
    entityType: EntityType,
    language: 'ar' | 'en' = 'ar'
  ): Promise<Blob | null> {
    try {
      const definition = await this.getEntityDefinition(entityType);
      if (!definition) return null;

      // إنشاء workbook جديد
      const wb = XLSX.utils.book_new();

      // إنشاء ورقة البيانات
      const headers = definition.fields.map(f =>
        language === 'ar' ? f.label_ar : f.label_en
      );

      const fieldNames = definition.fields.map(f => f.name);

      // صف المثال
      const exampleRow = this.generateExampleRow(definition.fields);

      // إنشاء البيانات
      const wsData = [
        fieldNames, // أسماء الحقول التقنية (مخفية)
        headers,    // العناوين المعروضة
        exampleRow  // مثال
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // تنسيق العرض
      const colWidths = headers.map(h => ({ wch: Math.max(h.length + 5, 15) }));
      ws['!cols'] = colWidths;

      // إضافة الورقة
      XLSX.utils.book_append_sheet(wb, ws, language === 'ar' ? 'البيانات' : 'Data');

      // إنشاء ورقة التعليمات
      const instructionsWs = this.createInstructionsSheet(definition, language);
      XLSX.utils.book_append_sheet(wb, instructionsWs, language === 'ar' ? 'تعليمات' : 'Instructions');

      // تحويل إلى Blob
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    } catch (error) {
      console.error('Error generating template:', error);
      return null;
    }
  },

  /**
   * إنشاء صف مثال
   */
  generateExampleRow(fields: FieldDefinition[]): string[] {
    return fields.map(field => {
      switch (field.type) {
        case 'string':
          if (field.name.includes('code')) return 'CODE001';
          if (field.name.includes('name')) return 'اسم مثال';
          return 'نص مثال';
        case 'number':
          if (field.name.includes('price')) return '100';
          if (field.name.includes('qty') || field.name.includes('quantity')) return '50';
          if (field.name.includes('balance')) return '1000';
          return '0';
        case 'email':
          return 'example@email.com';
        case 'phone':
          return '+380501234567';
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'select':
          return field.options?.[0] || '';
        default:
          return '';
      }
    });
  },

  /**
   * إنشاء ورقة التعليمات
   */
  createInstructionsSheet(definition: EntityDefinition, language: 'ar' | 'en'): XLSX.WorkSheet {
    const isAr = language === 'ar';
    const instructions: string[][] = [
      [isAr ? 'تعليمات الاستيراد' : 'Import Instructions'],
      [''],
      [isAr ? 'الحقول المطلوبة (مميزة بـ *)' : 'Required fields (marked with *)'],
      ...definition.fields
        .filter(f => f.required)
        .map(f => [`* ${isAr ? f.label_ar : f.label_en}`]),
      [''],
      [isAr ? 'وصف الحقول:' : 'Field descriptions:'],
      ...definition.fields.map(f => [
        `${isAr ? f.label_ar : f.label_en}${f.required ? ' *' : ''}`,
        this.getFieldDescription(f, language)
      ])
    ];

    return XLSX.utils.aoa_to_sheet(instructions);
  },

  /**
   * الحصول على وصف الحقل
   */
  getFieldDescription(field: FieldDefinition, language: 'ar' | 'en'): string {
    const isAr = language === 'ar';
    let desc = '';

    switch (field.type) {
      case 'number':
        desc = isAr ? 'رقم' : 'Number';
        if (field.min !== undefined) desc += ` (${isAr ? 'الحد الأدنى' : 'min'}: ${field.min})`;
        break;
      case 'email':
        desc = isAr ? 'بريد إلكتروني صالح' : 'Valid email address';
        break;
      case 'phone':
        desc = isAr ? 'رقم هاتف' : 'Phone number';
        break;
      case 'date':
        desc = isAr ? 'تاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)';
        break;
      case 'select':
        desc = `${isAr ? 'اختر من' : 'Choose from'}: ${field.options?.join(', ')}`;
        break;
      default:
        desc = isAr ? 'نص' : 'Text';
        if (field.max_length) desc += ` (${isAr ? 'الحد الأقصى' : 'max'}: ${field.max_length})`;
    }

    return desc;
  },

  // ─────────────────────────────────────────────────────────────
  // File Parsing
  // ─────────────────────────────────────────────────────────────

  /**
   * قراءة وتحليل ملف Excel أو CSV
   */
  async parseFile(file: File): Promise<ParsedFile | null> {
    try {
      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
      const buffer = await file.arrayBuffer();

      let wb;
      try {
        wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      } catch (xlsxErr) {
        console.error('XLSX read error:', xlsxErr);
        // Retry with different options
        wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      }

      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];

      if (!ws) {
        console.error('No worksheet found in file');
        return null;
      }

      // تحويل إلى JSON
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

      if (!rawData || rawData.length < 2) {
        console.error('File has less than 2 rows:', rawData?.length);
        return null;
      }

      // استخراج العناوين
      const firstRow = (rawData[0] as any[]).map(h => String(h || '').trim());

      // تحقق إذا كان الصف الأول أسماء تقنية (بالإنجليزية مثل code, name_ar, phone)
      const isTechnicalHeaders = firstRow.length > 0 &&
        firstRow.filter(h => h).length > 0 &&
        firstRow.filter(h => h).every(h => /^[a-z][a-z0-9_]*$/i.test(h));

      let headers: string[];
      let dataStartIndex: number;

      if (isTechnicalHeaders) {
        // الصف الأول = أسماء حقول تقنية → استخدمها كعناوين
        headers = firstRow;
        // تحقق هل الصف الثاني أيضاً عناوين (labels) وليس بيانات
        const secondRow = rawData.length > 1
          ? (rawData[1] as any[]).map(h => String(h || '').trim())
          : [];
        const secondRowIsLabels = secondRow.length > 0 &&
          secondRow.every(v => typeof v === 'string' || v === '');
        // إذا الصف الثاني يبدو وكأنه labels (وليس قيم رقمية) تخطّه
        const hasNumbers = secondRow.some(v => !isNaN(Number(v)) && Number(v) > 0);
        dataStartIndex = (secondRowIsLabels && !hasNumbers) ? 2 : 1;
      } else {
        // الصف الأول = عناوين مقروءة
        headers = firstRow;
        dataStartIndex = 1;
      }

      // تحويل الصفوف إلى كائنات
      const rows: Record<string, unknown>[] = [];
      for (let i = dataStartIndex; i < rawData.length; i++) {
        const row = rawData[i] as unknown[];
        if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue; // تخطي الصفوف الفارغة
        }

        const rowObj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined && row[index] !== null && row[index] !== '') {
            rowObj[String(header).trim()] = row[index];
          }
        });

        if (Object.keys(rowObj).length > 0) {
          rows.push(rowObj);
        }
      }

      console.log(`📊 Parsed file: ${headers.length} columns, ${rows.length} data rows, dataStart=${dataStartIndex}`);

      return {
        headers: headers.filter(h => h),
        rows,
        total_rows: rows.length,
        file_type: fileType
      };

    } catch (error) {
      console.error('Error parsing file:', error);
      return null;
    }
  },

  /**
   * اقتراح مطابقة الأعمدة تلقائياً
   */
  suggestColumnMappings(
    fileHeaders: string[],
    entityDefinition: EntityDefinition
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const systemFields = entityDefinition.fields;

    for (const header of fileHeaders) {
      const normalizedHeader = this.normalizeString(header);
      let bestMatch: { field: string; score: number } | null = null;

      for (const field of systemFields) {
        // مقارنة مع اسم الحقل
        const nameScore = this.similarityScore(normalizedHeader, this.normalizeString(field.name));
        // مقارنة مع العنوان العربي
        const arScore = this.similarityScore(normalizedHeader, this.normalizeString(field.label_ar));
        // مقارنة مع العنوان الإنجليزي
        const enScore = this.similarityScore(normalizedHeader, this.normalizeString(field.label_en));

        const maxScore = Math.max(nameScore, arScore, enScore);

        if (maxScore > 0.6 && (!bestMatch || maxScore > bestMatch.score)) {
          bestMatch = { field: field.name, score: maxScore };
        }
      }

      mappings.push({
        file_column: header,
        system_field: bestMatch?.field || '',
        is_mapped: !!bestMatch
      });
    }

    return mappings;
  },

  /**
   * تطبيع النص للمقارنة
   */
  normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[_\-\s]+/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ي]/g, 'ى');
  },

  /**
   * حساب نسبة التشابه بين نصين
   */
  similarityScore(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;
    if (longer.includes(shorter)) return shorter.length / longer.length + 0.2;

    // Levenshtein distance
    const matrix: number[][] = [];
    for (let i = 0; i <= shorter.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= longer.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= shorter.length; i++) {
      for (let j = 1; j <= longer.length; j++) {
        if (shorter[i - 1] === longer[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return 1 - matrix[shorter.length][longer.length] / longer.length;
  },

  // ─────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────

  /**
   * التحقق من صف بيانات
   */
  validateRow(
    row: Record<string, unknown>,
    fields: FieldDefinition[],
    requiredFields: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      const value = row[field.name];
      const isEmpty = value === undefined || value === null || value === '';

      // التحقق من الحقول المطلوبة
      if (requiredFields.includes(field.name) && isEmpty) {
        errors.push({
          field: field.name,
          error: `${field.label_ar} مطلوب`,
          error_key: 'required',
          value
        });
        continue;
      }

      if (isEmpty) continue;

      // التحقق من نوع البيانات
      switch (field.type) {
        case 'number':
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} يجب أن يكون رقماً`,
              error_key: 'invalid_number',
              value
            });
          } else {
            if (field.min !== undefined && num < field.min) {
              errors.push({
                field: field.name,
                error: `${field.label_ar} يجب أن يكون أكبر من ${field.min}`,
                error_key: 'min_value',
                value
              });
            }
            if (field.max !== undefined && num > field.max) {
              errors.push({
                field: field.name,
                error: `${field.label_ar} يجب أن يكون أقل من ${field.max}`,
                error_key: 'max_value',
                value
              });
            }
          }
          break;

        case 'email':
          if (!VALIDATION_PATTERNS.email.test(String(value))) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} غير صالح`,
              error_key: 'invalid_email',
              value
            });
          }
          break;

        case 'phone':
          if (!VALIDATION_PATTERNS.phone.test(String(value))) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} غير صالح`,
              error_key: 'invalid_phone',
              value
            });
          }
          break;

        case 'date':
          if (!this.isValidDate(value)) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} تاريخ غير صالح`,
              error_key: 'invalid_date',
              value
            });
          }
          break;

        case 'select':
          if (field.options && !field.options.includes(String(value))) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} قيمة غير صالحة. القيم المتاحة: ${field.options.join(', ')}`,
              error_key: 'invalid_option',
              value
            });
          }
          break;

        case 'string':
        case 'text':
          if (field.max_length && String(value).length > field.max_length) {
            errors.push({
              field: field.name,
              error: `${field.label_ar} تجاوز الحد الأقصى (${field.max_length})`,
              error_key: 'max_length',
              value
            });
          }
          break;
      }
    }

    return errors;
  },

  /**
   * التحقق من صحة التاريخ
   */
  isValidDate(value: unknown): boolean {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    if (typeof value === 'number') {
      // Excel date serial number
      const date = new Date((value - 25569) * 86400 * 1000);
      return !isNaN(date.getTime());
    }
    return false;
  },

  /**
   * الكشف عن التكرارات داخل الملف
   */
  findDuplicatesInFile(
    rows: Record<string, unknown>[],
    uniqueFields: string[]
  ): Map<number, number[]> {
    const duplicates = new Map<number, number[]>();
    const seen = new Map<string, number>();

    rows.forEach((row, index) => {
      const key = uniqueFields
        .map(f => String(row[f] || '').toLowerCase().trim())
        .join('|');

      if (key && key !== uniqueFields.map(() => '').join('|')) {
        if (seen.has(key)) {
          const originalIndex = seen.get(key)!;
          if (!duplicates.has(originalIndex)) {
            duplicates.set(originalIndex, []);
          }
          duplicates.get(originalIndex)!.push(index);
        } else {
          seen.set(key, index);
        }
      }
    });

    return duplicates;
  },

  // ─────────────────────────────────────────────────────────────
  // Import Job Management (Local - no DB table yet)
  // ─────────────────────────────────────────────────────────────

  /**
   * إنشاء عملية استيراد جديدة (محلياً)
   */
  async createImportJob(
    tenantId: string,
    entityType: EntityType,
    fileName: string,
    fileSize: number,
    fileType: string
  ): Promise<ImportJob | null> {
    // إنشاء كائن محلي بدلاً من الحفظ في قاعدة البيانات
    const localJob: ImportJob = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: '',
      entity_type: entityType,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      total_rows: 0,
      valid_rows: 0,
      invalid_rows: 0,
      imported_rows: 0,
      skipped_rows: 0,
      failed_rows: 0,
      status: 'pending' as ImportStatus,
      progress_percent: 0,
      current_step: 'upload',
      validation_summary: { total_errors: 0, errors_by_field: {}, error_samples: [] },
      import_options: { skip_duplicates: true, update_existing: false, batch_size: 500 } as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as ImportJob;

    return localJob;
  },

  /**
   * تحديث حالة عملية الاستيراد (محلياً)
   */
  async updateJobStatus(
    jobId: string,
    status: ImportStatus,
    additionalData?: Partial<ImportJob>
  ): Promise<boolean> {
    // لا يوجد جدول - نتجاهل التحديث
    return true;
  },

  /**
   * الحصول على عملية استيراد (محلياً)
   */
  async getImportJob(jobId: string): Promise<ImportJob | null> {
    return null;
  },

  /**
   * الحصول على صفوف عملية استيراد (محلياً)
   */
  async getImportRows(
    jobId: string,
    filters?: { status?: RowStatus; page?: number; limit?: number }
  ): Promise<{ rows: ImportRow[]; total: number }> {
    return { rows: [], total: 0 };
  },

  /**
   * حفظ صفوف الاستيراد (محلياً - يتجاهل)
   */
  async saveImportRows(jobId: string, rows: Omit<ImportRow, 'id' | 'job_id'>[]): Promise<boolean> {
    return true;
  },

  /**
   * الحصول على سجل عمليات الاستيراد (محلياً)
   */
  async getImportHistory(
    tenantId: string,
    filters?: { entity_type?: EntityType; status?: ImportStatus; limit?: number }
  ): Promise<ImportJob[]> {
    return [];
  },

  /**
   * حذف عملية استيراد (محلياً)
   */
  async deleteImportJob(jobId: string): Promise<boolean> {
    return true;
  }
};

export default importService;

