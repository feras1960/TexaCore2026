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
   */
  async getEntityDefinitions(): Promise<EntityDefinition[]> {
    const { data, error } = await supabase
      .rpc('get_all_import_entity_definitions');

    if (error) {
      console.error('Error fetching entity definitions:', error);
      return [];
    }

    return data || [];
  },

  /**
   * الحصول على تعريف كيان معين
   */
  async getEntityDefinition(entityType: EntityType): Promise<EntityDefinition | null> {
    const { data, error } = await supabase
      .rpc('get_import_entity_definition', { p_entity_type: entityType });

    if (error) {
      console.error('Error fetching entity definition:', error);
      return null;
    }

    return data;
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
      
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      
      // تحويل إلى JSON
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      
      if (rawData.length < 2) {
        return null;
      }

      // استخراج العناوين (الصف الأول أو الثاني)
      let headerRowIndex = 0;
      const firstRow = rawData[0] as string[];
      const secondRow = rawData[1] as string[];

      // تحقق إذا كان الصف الأول أسماء تقنية (بالإنجليزية)
      if (firstRow.every(h => typeof h === 'string' && /^[a-z_]+$/.test(h))) {
        headerRowIndex = 1;
      }

      const headers = rawData[headerRowIndex] as string[];
      const dataStartIndex = headerRowIndex + 1;

      // تحويل الصفوف إلى كائنات
      const rows: Record<string, unknown>[] = [];
      for (let i = dataStartIndex; i < rawData.length; i++) {
        const row = rawData[i] as unknown[];
        if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue; // تخطي الصفوف الفارغة
        }

        const rowObj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined && row[index] !== null) {
            rowObj[String(header).trim()] = row[index];
          }
        });

        if (Object.keys(rowObj).length > 0) {
          rows.push(rowObj);
        }
      }

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
  // Import Job Management
  // ─────────────────────────────────────────────────────────────

  /**
   * إنشاء عملية استيراد جديدة
   */
  async createImportJob(
    tenantId: string,
    entityType: EntityType,
    fileName: string,
    fileSize: number,
    fileType: string
  ): Promise<ImportJob | null> {
    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        tenant_id: tenantId,
        entity_type: entityType,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating import job:', error);
      return null;
    }

    return data;
  },

  /**
   * تحديث حالة عملية الاستيراد
   */
  async updateJobStatus(
    jobId: string,
    status: ImportStatus,
    additionalData?: Partial<ImportJob>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('import_jobs')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
      return false;
    }

    return true;
  },

  /**
   * الحصول على عملية استيراد
   */
  async getImportJob(jobId: string): Promise<ImportJob | null> {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching import job:', error);
      return null;
    }

    return data;
  },

  /**
   * الحصول على صفوف عملية استيراد
   */
  async getImportRows(
    jobId: string,
    filters?: { status?: RowStatus; page?: number; limit?: number }
  ): Promise<{ rows: ImportRow[]; total: number }> {
    let query = supabase
      .from('import_rows')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('row_number', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.page !== undefined && filters?.limit) {
      const from = filters.page * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching import rows:', error);
      return { rows: [], total: 0 };
    }

    return { rows: data || [], total: count || 0 };
  },

  /**
   * حفظ صفوف الاستيراد
   */
  async saveImportRows(jobId: string, rows: Omit<ImportRow, 'id' | 'job_id'>[]): Promise<boolean> {
    const rowsToInsert = rows.map(row => ({
      ...row,
      job_id: jobId
    }));

    // إدراج بالدفعات (500 صف لكل دفعة)
    const batchSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const batch = rowsToInsert.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('import_rows')
        .insert(batch);

      if (error) {
        console.error('Error saving import rows:', error);
        return false;
      }
    }

    return true;
  },

  /**
   * الحصول على سجل عمليات الاستيراد
   */
  async getImportHistory(
    tenantId: string,
    filters?: { entity_type?: EntityType; status?: ImportStatus; limit?: number }
  ): Promise<ImportJob[]> {
    let query = supabase
      .from('import_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching import history:', error);
      return [];
    }

    return data || [];
  },

  /**
   * حذف عملية استيراد
   */
  async deleteImportJob(jobId: string): Promise<boolean> {
    const { error } = await supabase
      .from('import_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting import job:', error);
      return false;
    }

    return true;
  }
};

export default importService;
