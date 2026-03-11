/**
 * Import Wizard Hook
 * ===================
 * منطق معالج الاستيراد
 */

import { useState, useCallback, useEffect } from 'react';
import { importService } from '@/services/importService';
import type {
  EntityType,
  EntityDefinition,
  ImportJob,
  ImportRow,
  ImportOptions,
  ParsedFile,
  ColumnMapping,
  ValidationError,
  RowStatus
} from '@/services/importService';

export type WizardStep =
  | 'select-entity'
  | 'upload'
  | 'mapping'
  | 'validation'
  | 'ai-analysis'
  | 'preview'
  | 'importing'
  | 'result';

export interface WizardState {
  currentStep: WizardStep;
  entityType: EntityType | null;
  entityDefinition: EntityDefinition | null;
  file: File | null;
  parsedFile: ParsedFile | null;
  columnMappings: ColumnMapping[];
  importJob: ImportJob | null;
  importRows: ImportRow[];
  options: ImportOptions;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

const initialOptions: ImportOptions = {
  skip_invalid_rows: true,
  update_existing: false,
  use_ai_analysis: true,
  column_mappings: {}
};

const initialState: WizardState = {
  currentStep: 'select-entity',
  entityType: null,
  entityDefinition: null,
  file: null,
  parsedFile: null,
  columnMappings: [],
  importJob: null,
  importRows: [],
  options: initialOptions,
  isLoading: false,
  error: null,
  progress: 0
};

export function useImportWizard(tenantId: string, companyId: string, defaultEntityType?: string) {
  const [state, setState] = useState<WizardState>(initialState);
  const [entityDefinitions, setEntityDefinitions] = useState<EntityDefinition[]>([]);

  // تحميل تعريفات الكيانات
  useEffect(() => {
    const loadDefinitions = async () => {
      const definitions = await importService.getEntityDefinitions();
      setEntityDefinitions(definitions);

      // إذا تم تمرير نوع افتراضي، قم بتحديده تلقائياً
      if (defaultEntityType) {
        const defaultDef = definitions.find(d => d.entity_type === defaultEntityType);
        if (defaultDef) {
          setState(prev => ({
            ...prev,
            entityType: defaultEntityType as EntityType,
            entityDefinition: defaultDef,
            currentStep: 'upload' // انتقل مباشرة لخطوة رفع الملف
          }));
        }
      }
    };
    loadDefinitions();
  }, [defaultEntityType]);

  // تحديث الحالة
  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // إعادة تعيين المعالج
  const resetWizard = useCallback(() => {
    setState(initialState);
  }, []);

  // الانتقال للخطوة التالية
  const nextStep = useCallback(() => {
    const steps: WizardStep[] = [
      'select-entity',
      'upload',
      'mapping',
      'validation',
      'ai-analysis',
      'preview',
      'importing',
      'result'
    ];
    const currentIndex = steps.indexOf(state.currentStep);

    // تخطي خطوة AI إذا لم تكن مفعلة
    let nextIndex = currentIndex + 1;
    if (steps[nextIndex] === 'ai-analysis' && !state.options.use_ai_analysis) {
      nextIndex++;
    }

    if (nextIndex < steps.length) {
      updateState({ currentStep: steps[nextIndex] });
    }
  }, [state.currentStep, state.options.use_ai_analysis, updateState]);

  // العودة للخطوة السابقة
  const prevStep = useCallback(() => {
    const steps: WizardStep[] = [
      'select-entity',
      'upload',
      'mapping',
      'validation',
      'ai-analysis',
      'preview'
    ];
    const currentIndex = steps.indexOf(state.currentStep);

    let prevIndex = currentIndex - 1;
    // تخطي خطوة AI إذا لم تكن مفعلة
    if (steps[prevIndex] === 'ai-analysis' && !state.options.use_ai_analysis) {
      prevIndex--;
    }

    if (prevIndex >= 0) {
      updateState({ currentStep: steps[prevIndex] });
    }
  }, [state.currentStep, state.options.use_ai_analysis, updateState]);

  // الانتقال لخطوة معينة
  const goToStep = useCallback((step: WizardStep) => {
    updateState({ currentStep: step });
  }, [updateState]);

  // اختيار نوع الكيان
  const selectEntityType = useCallback(async (entityType: EntityType) => {
    updateState({ isLoading: true, error: null });

    try {
      const definition = await importService.getEntityDefinition(entityType);
      if (definition) {
        updateState({
          entityType,
          entityDefinition: definition,
          isLoading: false
        });
        nextStep();
      } else {
        updateState({
          error: 'فشل في تحميل تعريف الكيان',
          isLoading: false
        });
      }
    } catch (error) {
      updateState({
        error: 'حدث خطأ أثناء تحميل تعريف الكيان',
        isLoading: false
      });
    }
  }, [updateState, nextStep]);

  // تحميل القالب
  const downloadTemplate = useCallback(async (language: 'ar' | 'en' = 'ar') => {
    if (!state.entityType) return;

    updateState({ isLoading: true });

    try {
      const blob = await importService.generateTemplate(state.entityType, language);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.entityType}_template.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.entityType, updateState]);

  // رفع الملف
  const uploadFile = useCallback(async (file: File) => {
    updateState({ isLoading: true, error: null });

    try {
      console.log(`📂 Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      const parsed = await importService.parseFile(file);

      if (!parsed) {
        updateState({
          error: `فشل في تحليل الملف. تأكد من أنه ملف Excel (.xlsx) أو CSV صالح`,
          isLoading: false
        });
        return;
      }

      if (parsed.rows.length === 0) {
        updateState({
          error: `الملف فارغ — لا توجد صفوف بيانات. Headers: ${parsed.headers?.join(', ')}`,
          isLoading: false
        });
        return;
      }

      console.log(`✅ Parsed: ${parsed.rows.length} rows, headers: ${parsed.headers.join(', ')}`);

      // === Step 1: Local fuzzy matching (instant) ===
      let mappings = state.entityDefinition
        ? importService.suggestColumnMappings(parsed.headers, state.entityDefinition)
        : [];

      // === Step 2: AI Smart Mapping (Gemini) — enhance local results ===
      if (state.entityDefinition) {
        try {
          console.log('🤖 Trying AI smart column mapping...');
          const { data: aiResult } = await supabase.functions.invoke('import-ai-analyze', {
            body: {
              action: 'smart_map',
              file_headers: parsed.headers,
              sample_rows: parsed.rows.slice(0, 3),
              entity_type: state.entityType,
              system_fields: state.entityDefinition.fields.map(f => ({
                name: f.name,
                label_ar: f.label_ar,
                label_en: f.label_en,
                required: state.entityDefinition!.required_fields.includes(f.name)
              }))
            }
          });

          if (aiResult?.success && aiResult.mappings?.length > 0) {
            console.log(`✅ AI mapped ${aiResult.mappings.filter((m: any) => m.system_field).length} columns`);

            // Merge: AI takes priority for high-confidence matches
            mappings = mappings.map(localMap => {
              const aiMap = aiResult.mappings.find((m: any) => m.file_column === localMap.file_column);
              if (aiMap?.system_field && aiMap.confidence >= 70) {
                return {
                  ...localMap,
                  system_field: aiMap.system_field,
                  is_mapped: true,
                  ai_confidence: aiMap.confidence,
                  ai_reason: aiMap.reason
                };
              }
              // Keep local mapping if AI didn't find a match or low confidence
              return {
                ...localMap,
                ai_confidence: aiMap?.confidence || 0,
                ai_reason: aiMap?.reason || ''
              };
            });
          }
        } catch (aiErr) {
          console.warn('⚠️ AI smart mapping failed, using local only:', aiErr);
        }
      }

      updateState({
        file,
        parsedFile: parsed,
        columnMappings: mappings,
        isLoading: false
      });

      nextStep();
    } catch (error: any) {
      console.error('Upload error:', error);
      updateState({
        error: `فشل في قراءة الملف: ${error?.message || 'خطأ غير معروف'}`,
        isLoading: false
      });
    }
  }, [state.entityDefinition, state.entityType, updateState, nextStep]);

  // تحديث مطابقة الأعمدة
  const updateColumnMapping = useCallback((fileColumn: string, systemField: string) => {
    updateState({
      columnMappings: state.columnMappings.map(m =>
        m.file_column === fileColumn
          ? { ...m, system_field: systemField, is_mapped: !!systemField }
          : m
      )
    });
  }, [state.columnMappings, updateState]);

  // التحقق من البيانات
  const validateData = useCallback(async () => {
    if (!state.parsedFile || !state.entityDefinition) return;

    updateState({ isLoading: true, error: null, progress: 0 });

    try {
      // إنشاء عملية استيراد (محلياً)
      const job = await importService.createImportJob(
        tenantId,
        state.entityType!,
        state.file!.name,
        state.file!.size,
        state.parsedFile.file_type
      );

      if (!job) {
        throw new Error('فشل في إنشاء عملية الاستيراد');
      }

      // بناء خريطة الأعمدة
      const columnMap: Record<string, string> = {};
      state.columnMappings
        .filter(m => m.is_mapped)
        .forEach(m => {
          columnMap[m.file_column] = m.system_field;
        });

      // تحويل ومعالجة الصفوف
      const importRows: ImportRow[] = [];
      const { fields, required_fields } = state.entityDefinition;

      for (let i = 0; i < state.parsedFile.rows.length; i++) {
        const rawRow = state.parsedFile.rows[i];

        // تطبيق مطابقة الأعمدة
        const mappedData: Record<string, unknown> = {};
        for (const [fileCol, sysField] of Object.entries(columnMap)) {
          if (rawRow[fileCol] !== undefined) {
            mappedData[sysField] = rawRow[fileCol];
          }
        }

        // التحقق من الصف
        const errors = importService.validateRow(mappedData, fields, required_fields);

        importRows.push({
          id: `row-${i + 1}`,
          job_id: job.id,
          row_number: i + 1,
          raw_data: rawRow,
          mapped_data: mappedData,
          status: errors.length > 0 ? 'invalid' : 'valid',
          validation_errors: errors
        } as ImportRow);

        // تحديث التقدم
        if (i % 100 === 0) {
          updateState({ progress: Math.round((i / state.parsedFile.rows.length) * 100) });
        }
      }

      // تحديث إحصائيات العملية محلياً
      const validCount = importRows.filter(r => r.status === 'valid').length;
      const invalidCount = importRows.filter(r => r.status === 'invalid').length;

      // تحديث الـ job محلياً (بدون DB)
      const updatedJob: ImportJob = {
        ...job,
        total_rows: importRows.length,
        valid_rows: validCount,
        invalid_rows: invalidCount,
        status: 'ready' as any,
      };

      console.log(`✅ Validation: ${validCount} valid, ${invalidCount} invalid out of ${importRows.length}`);

      // ⚠️ CRITICAL: Must set data AND step in ONE atomic update
      // If we call updateState() then nextStep() separately, React may
      // render ValidationStep BEFORE importJob/importRows are committed,
      // causing it to show null.
      updateState({
        importJob: updatedJob,
        importRows,
        options: { ...state.options, column_mappings: columnMap },
        isLoading: false,
        progress: 100,
        currentStep: 'validation'
      });
    } catch (error: any) {
      console.error('Validation error:', error);
      updateState({
        error: `فشل في التحقق من البيانات: ${error?.message || ''}`,
        isLoading: false
      });
    }
  }, [state, tenantId, updateState, nextStep]);

  // تنفيذ الاستيراد
  const executeImport = useCallback(async () => {
    if (!state.entityDefinition) return;

    updateState({
      currentStep: 'importing',
      isLoading: true,
      error: null,
      progress: 0
    });

    // تنفيذ الاستيراد مباشرة في Supabase
    await executeLocalImport();
  }, [state.entityDefinition, state.options, updateState]);

  // ─── تنفيذ الاستيراد الفعلي في Supabase ───────────────────
  const executeLocalImport = useCallback(async () => {
    try {
      // جمع الصفوف الصالحة فقط
      const validRows = state.importRows.filter(r => r.status === 'valid');

      if (validRows.length === 0) {
        updateState({
          error: 'لا توجد صفوف صالحة للاستيراد',
          isLoading: false,
          currentStep: 'validation'
        });
        return;
      }

      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      const batchSize = 50;

      // ─── تحديد الجدول المستهدف ───
      const entityType = state.entityType;

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        try {
          const rowsToInsert = batch.map(row => {
            const data = row.mapped_data || {};
            return buildInsertRow(entityType!, data, companyId, tenantId);
          }).filter(Boolean);

          if (rowsToInsert.length === 0) continue;

          const tableName = getTableName(entityType!);

          const { data: insertedData, error: insertError } = await supabase
            .from(tableName)
            .insert(rowsToInsert)
            .select('id');

          if (insertError) {
            console.error(`Import batch error:`, insertError);
            failed += batch.length;
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
          } else {
            imported += insertedData?.length || batch.length;
          }
        } catch (batchErr: any) {
          failed += batch.length;
          errors.push(`Batch error: ${batchErr?.message || 'Unknown'}`);
        }

        // تحديث التقدم
        updateState({
          progress: Math.round(((i + batch.length) / validRows.length) * 100)
        });
      }

      // ─── إنشاء قيد الأرصدة الافتتاحية ───
      let openingBalanceJournalRef = '';
      if (imported > 0 && (entityType === 'customers' || entityType === 'suppliers' || entityType === 'products')) {
        try {
          openingBalanceJournalRef = await createOpeningBalanceJournal(
            entityType,
            validRows,
            companyId,
            tenantId
          );
        } catch (obErr: any) {
          console.warn('Opening balance journal error:', obErr);
          errors.push(`تحذير: فشل إنشاء قيد الأرصدة الافتتاحية: ${obErr?.message || 'خطأ'}`);
        }
      }

      // ─── النتيجة ───
      const finalJob: ImportJob = {
        ...(state.importJob || {} as ImportJob),
        imported_rows: imported,
        failed_rows: failed,
        total_rows: state.importRows.length,
        valid_rows: validRows.length,
        invalid_rows: state.importRows.length - validRows.length,
        status: failed === 0 ? 'completed' : (imported > 0 ? 'completed' : 'failed'),
        error_message: errors.length > 0 ? errors.join('\n') : undefined,
        completed_at: new Date().toISOString(),
        ...(openingBalanceJournalRef ? { notes: `قيد افتتاحي: ${openingBalanceJournalRef}` } : {}),
      } as ImportJob;

      updateState({
        importJob: finalJob,
        currentStep: 'result',
        isLoading: false,
        progress: 100
      });
    } catch (error: any) {
      updateState({
        error: `فشل في تنفيذ الاستيراد: ${error?.message || 'خطأ غير معروف'}`,
        isLoading: false,
        currentStep: 'validation'
      });
    }
  }, [state.importJob, state.importRows, state.entityType, companyId, tenantId, updateState]);

  // رفع من Google Sheets
  const uploadGoogleSheet = useCallback(async (url: string) => {
    updateState({ isLoading: true, error: null });

    try {
      console.log(`📊 Fetching Google Sheet: ${url}`);
      const parsed = await importService.parseGoogleSheet(url);

      if (!parsed) {
        updateState({
          error: 'فشل في جلب بيانات Google Sheet. تأكد من أن الشيت مشارك كـ "أي شخص لديه الرابط"',
          isLoading: false
        });
        return;
      }

      if (parsed.rows.length === 0) {
        updateState({
          error: `الشيت فارغ — لا توجد صفوف بيانات`,
          isLoading: false
        });
        return;
      }

      console.log(`✅ Google Sheet parsed: ${parsed.rows.length} rows, headers: ${parsed.headers.join(', ')}`);

      // Same mapping logic as uploadFile
      let mappings = state.entityDefinition
        ? importService.suggestColumnMappings(parsed.headers, state.entityDefinition)
        : [];

      // AI Smart Mapping
      if (state.entityDefinition) {
        try {
          console.log('🤖 Trying AI smart column mapping...');
          const { data: aiResult } = await supabase.functions.invoke('import-ai-analyze', {
            body: {
              action: 'smart_map',
              file_headers: parsed.headers,
              sample_rows: parsed.rows.slice(0, 3),
              entity_type: state.entityType,
              system_fields: state.entityDefinition.fields.map(f => ({
                name: f.name,
                label_ar: f.label_ar,
                label_en: f.label_en,
                required: state.entityDefinition!.required_fields.includes(f.name)
              }))
            }
          });

          if (aiResult?.success && aiResult.mappings?.length > 0) {
            mappings = mappings.map(localMap => {
              const aiMap = aiResult.mappings.find((m: any) => m.file_column === localMap.file_column);
              if (aiMap?.system_field && aiMap.confidence >= 70) {
                return { ...localMap, system_field: aiMap.system_field, is_mapped: true, ai_confidence: aiMap.confidence, ai_reason: aiMap.reason };
              }
              return { ...localMap, ai_confidence: aiMap?.confidence || 0, ai_reason: aiMap?.reason || '' };
            });
          }
        } catch (aiErr) {
          console.warn('⚠️ AI smart mapping failed, using local only:', aiErr);
        }
      }

      // Create a virtual file object for the job
      const virtualFile = new File([''], 'google_sheet.csv', { type: 'text/csv' });

      updateState({
        file: virtualFile,
        parsedFile: parsed,
        columnMappings: mappings,
        isLoading: false
      });

      nextStep();
    } catch (error: any) {
      console.error('Google Sheet error:', error);
      updateState({
        error: `فشل في جلب Google Sheet: ${error?.message || 'خطأ غير معروف'}`,
        isLoading: false
      });
    }
  }, [state.entityDefinition, state.entityType, updateState, nextStep]);

  // تحديث الخيارات
  const updateOptions = useCallback((updates: Partial<ImportOptions>) => {
    updateState({
      options: { ...state.options, ...updates }
    });
  }, [state.options, updateState]);

  // تحديث صفوف الاستيراد (مثلاً لتعيين العملة الافتراضية)
  const updateImportRows = useCallback((rows: ImportRow[]) => {
    updateState({ importRows: rows });
  }, [updateState]);

  return {
    // الحالة
    state,
    entityDefinitions,

    // التنقل
    nextStep,
    prevStep,
    goToStep,
    resetWizard,

    // العمليات
    selectEntityType,
    downloadTemplate,
    uploadFile,
    uploadGoogleSheet,
    updateColumnMapping,
    updateImportRows,
    validateData,
    executeImport,
    updateOptions
  };
}

// ─── Helper Functions ──────────────────────────────────────────

import { supabase } from '@/lib/supabase';

/**
 * تحديد اسم الجدول حسب نوع الكيان
 */
function getTableName(entityType: string): string {
  switch (entityType) {
    case 'customers': return 'customers';
    case 'suppliers': return 'suppliers';
    case 'products': return 'materials';
    case 'journal_entries': return 'journal_entries';
    case 'inventory_movements': return 'stock_movements';
    default: return entityType;
  }
}

/**
 * بناء صف الإدراج حسب نوع الكيان
 */
function buildInsertRow(
  entityType: string,
  data: Record<string, unknown>,
  companyId: string,
  tenantId: string
): Record<string, unknown> | null {
  const clean = (val: unknown) => {
    if (val === undefined || val === null || val === '') return null;
    return val;
  };

  const num = (val: unknown) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  switch (entityType) {
    case 'customers':
      return {
        company_id: companyId,
        tenant_id: tenantId,
        code: clean(data.code) || `CUST-${Date.now().toString(36)}`,
        name_ar: clean(data.name_ar) || String(data.name || ''),
        name_en: clean(data.name_en),
        name_tr: clean(data.name_tr),
        name_ru: clean(data.name_ru),
        name_uk: clean(data.name_uk),
        customer_type: clean(data.customer_type) || 'company',
        phone: clean(data.phone),
        mobile: clean(data.mobile),
        email: clean(data.email),
        address: clean(data.address),
        city: clean(data.city),
        country: clean(data.country),
        tax_number: clean(data.tax_number),
        credit_limit: num(data.credit_limit),
        balance: num(data.opening_balance),
        currency: clean(data.currency) || 'USD',
        notes: clean(data.notes),
        status: 'active',
      };

    case 'suppliers':
      return {
        company_id: companyId,
        tenant_id: tenantId,
        code: clean(data.code) || `SUP-${Date.now().toString(36)}`,
        name_ar: clean(data.name_ar) || String(data.name || ''),
        name_en: clean(data.name_en),
        name_tr: clean(data.name_tr),
        name_ru: clean(data.name_ru),
        name_uk: clean(data.name_uk),
        supplier_type: clean(data.supplier_type) || 'company',
        phone: clean(data.phone),
        mobile: clean(data.mobile),
        email: clean(data.email),
        address: clean(data.address),
        city: clean(data.city),
        country: clean(data.country),
        tax_number: clean(data.tax_number),
        payment_terms_days: num(data.payment_terms),
        balance: num(data.opening_balance),
        currency: clean(data.currency) || 'USD',
        notes: clean(data.notes),
        status: 'active',
      };

    case 'products':
      return {
        company_id: companyId,
        tenant_id: tenantId,
        code: clean(data.code) || `MAT-${Date.now().toString(36)}`,
        name_ar: clean(data.name_ar) || String(data.name || ''),
        name_en: clean(data.name_en),
        name_tr: clean(data.name_tr),
        name_ru: clean(data.name_ru),
        name_uk: clean(data.name_uk),
        barcode: clean(data.barcode),
        category: clean(data.category),
        unit: clean(data.unit) || 'unit',
        sale_price: num(data.sale_price),
        cost_price: num(data.cost_price),
        min_stock: num(data.min_stock),
        notes: clean(data.notes),
        status: 'active',
      };

    default:
      return null;
  }
}

/**
 * إنشاء قيود الأرصدة الافتتاحية — قيد منفصل لكل عملة
 * لا يتم خلط العملات في قيد واحد
 */
async function createOpeningBalanceJournal(
  entityType: string,
  importRows: ImportRow[],
  companyId: string,
  tenantId: string
): Promise<string> {
  // ─── 1. البحث عن حساب الأرصدة الافتتاحية (كود 35) ───
  const { data: obAccount } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code')
    .eq('company_id', companyId)
    .eq('account_code', '35')
    .single();

  if (!obAccount) {
    console.warn('Opening balance account (35) not found, skipping journal entry');
    return '';
  }

  // عملة الشركة الأساسية
  const { data: company } = await supabase
    .from('companies')
    .select('default_currency')
    .eq('id', companyId)
    .single();
  const baseCurrency = company?.default_currency || 'USD';

  // ─── 2. تجميع السطور حسب العملة ───
  type JournalLine = {
    accountId: string;
    debit: number;
    credit: number;
    description: string;
    partyType?: string;
    partyId?: string;
  };

  const linesByCurrency: Map<string, JournalLine[]> = new Map();

  const addLine = (currency: string, line: JournalLine) => {
    if (!linesByCurrency.has(currency)) linesByCurrency.set(currency, []);
    linesByCurrency.get(currency)!.push(line);
  };

  if (entityType === 'customers') {
    const codes = importRows.map(r => r.mapped_data?.code as string).filter(Boolean);
    if (codes.length === 0) return '';

    const { data: customers } = await supabase
      .from('customers')
      .select('id, code, name_ar, balance, currency, receivable_account_id')
      .eq('company_id', companyId)
      .in('code', codes);

    if (!customers) return '';

    for (const cust of customers) {
      const balance = Number(cust.balance) || 0;
      if (balance === 0 || !cust.receivable_account_id) continue;
      const currency = cust.currency || baseCurrency;

      if (balance > 0) {
        addLine(currency, {
          accountId: cust.receivable_account_id,
          debit: Math.abs(balance), credit: 0,
          description: `رصيد افتتاحي - ${cust.name_ar} (${cust.code})`,
          partyType: 'customer', partyId: cust.id,
        });
      } else {
        addLine(currency, {
          accountId: cust.receivable_account_id,
          debit: 0, credit: Math.abs(balance),
          description: `رصيد افتتاحي (سلفة) - ${cust.name_ar} (${cust.code})`,
          partyType: 'customer', partyId: cust.id,
        });
      }
    }

  } else if (entityType === 'suppliers') {
    const codes = importRows.map(r => r.mapped_data?.code as string).filter(Boolean);
    if (codes.length === 0) return '';

    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, code, name_ar, balance, currency, payable_account_id')
      .eq('company_id', companyId)
      .in('code', codes);

    if (!suppliers) return '';

    for (const sup of suppliers) {
      const balance = Number(sup.balance) || 0;
      if (balance === 0 || !sup.payable_account_id) continue;
      const currency = sup.currency || baseCurrency;

      if (balance > 0) {
        addLine(currency, {
          accountId: sup.payable_account_id,
          debit: 0, credit: Math.abs(balance),
          description: `رصيد افتتاحي - ${sup.name_ar} (${sup.code})`,
          partyType: 'supplier', partyId: sup.id,
        });
      } else {
        addLine(currency, {
          accountId: sup.payable_account_id,
          debit: Math.abs(balance), credit: 0,
          description: `رصيد افتتاحي (سلفة) - ${sup.name_ar} (${sup.code})`,
          partyType: 'supplier', partyId: sup.id,
        });
      }
    }

  } else if (entityType === 'products') {
    const { data: invAccount } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code')
      .eq('company_id', companyId)
      .eq('account_code', '1140')
      .single();

    if (!invAccount) {
      console.warn('Inventory account (1140) not found, skipping');
      return '';
    }

    // تجميع قيمة المخزون حسب العملة
    const valuesByCurrency: Map<string, number> = new Map();
    for (const row of importRows) {
      const data = row.mapped_data || {};
      const qty = Number(data.opening_qty) || 0;
      const costPrice = Number(data.cost_price) || 0;
      const currency = String(data.currency || baseCurrency);
      const value = qty * costPrice;
      if (value > 0) {
        valuesByCurrency.set(currency, (valuesByCurrency.get(currency) || 0) + value);
      }
    }

    for (const [currency, totalValue] of valuesByCurrency) {
      addLine(currency, {
        accountId: invAccount.id,
        debit: totalValue, credit: 0,
        description: `رصيد افتتاحي مخزون - ${currency}`,
      });
    }
  }

  if (linesByCurrency.size === 0) return '';

  // ─── 3. إنشاء قيد لكل عملة ───
  const entityLabel = entityType === 'customers' ? 'عملاء' :
    entityType === 'suppliers' ? 'موردين' : 'مواد';
  const createdRefs: string[] = [];

  for (const [currency, lines] of linesByCurrency) {
    const entryRef = `OB-${entityType.toUpperCase().slice(0, 4)}-${currency}-${Date.now().toString(36).toUpperCase()}`;

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    // الطرف المقابل = حساب 35
    const obDebit = totalCredit > totalDebit ? totalCredit - totalDebit : 0;
    const obCredit = totalDebit > totalCredit ? totalDebit - totalCredit : 0;

    if (obDebit > 0 || obCredit > 0) {
      lines.push({
        accountId: obAccount.id,
        debit: obDebit, credit: obCredit,
        description: `حساب الأرصدة الافتتاحية`,
      });
    }

    const finalTotalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const finalTotalCredit = lines.reduce((s, l) => s + l.credit, 0);

    // ─── Fetch exchange rate for non-base currencies ───
    let exchangeRate = 1;
    if (currency !== baseCurrency) {
      const { data: rateRow } = await supabase
        .from('exchange_rates')
        .select('buy_rate')
        .eq('company_id', companyId)
        .eq('from_currency', currency)
        .eq('to_currency', baseCurrency)
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      if (rateRow?.buy_rate) {
        exchangeRate = rateRow.buy_rate;
      }
    }

    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        entry_number: entryRef,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'opening_balance',
        description: `قيد أرصدة افتتاحية - استيراد ${entityLabel} (${currency})`,
        currency: currency,
        exchange_rate: exchangeRate,
        total_debit: Math.round(finalTotalDebit * 100) / 100,
        total_credit: Math.round(finalTotalCredit * 100) / 100,
        status: 'posted',
        is_posted: true,
        posted_at: new Date().toISOString(),
        reference_type: 'import',
        reference_number: entryRef,
      })
      .select('id, entry_number')
      .single();

    if (jeError || !journalEntry) {
      console.error(`Failed to create journal (${currency}):`, jeError);
      throw new Error(jeError?.message || 'فشل إنشاء القيد');
    }

    const journalLines = lines.map((line, idx) => ({
      tenant_id: tenantId,
      entry_id: journalEntry.id,
      line_number: idx + 1,
      account_id: line.accountId,
      debit: Math.round(line.debit * 100) / 100,
      credit: Math.round(line.credit * 100) / 100,
      currency: currency,
      exchange_rate: exchangeRate,
      description: line.description,
      party_type: line.partyType || null,
      party_id: line.partyId || null,
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('Failed to create journal lines:', linesError);
      throw new Error(linesError.message);
    }

    console.log(`✅ Opening balance journal (${currency}): ${journalEntry.entry_number} with ${lines.length} lines, rate=${exchangeRate}`);
    createdRefs.push(journalEntry.entry_number);
  }

  return createdRefs.join(', ');
}
