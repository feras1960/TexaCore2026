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
  const executeImport = useCallback(async (overrideCurrency?: string) => {
    if (!state.entityDefinition) return;

    updateState({
      currentStep: 'importing',
      isLoading: true,
      error: null,
      progress: 0
    });

    // تنفيذ الاستيراد مباشرة في Supabase
    await executeLocalImport(overrideCurrency);
  }, [state.entityDefinition, state.options, updateState]);

  // ─── تنفيذ الاستيراد الفعلي في Supabase ───────────────────
  const executeLocalImport = useCallback(async (overrideCurrency?: string) => {
    try {
      // جمع الصفوف الصالحة فقط
      const validRows = state.importRows.filter(r => r.status === 'valid');

      // ─── Force-apply override currency to ALL rows ───
      if (overrideCurrency) {
        for (const row of validRows) {
          if (row.mapped_data) {
            row.mapped_data.currency = overrideCurrency;
          }
        }
        console.log(`💱 Currency override applied: ${overrideCurrency} to ${validRows.length} rows`);
      }

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

      // جلب عملة الشركة الافتراضية + العملات المعرّفة
      const { data: companyData } = await supabase
        .from('companies')
        .select('default_currency')
        .eq('id', companyId)
        .single();
      const companyCurrency = companyData?.default_currency || 'USD';

      // جلب العملات المعرّفة في النظام
      const { data: definedCurrencies } = await supabase
        .from('currencies')
        .select('code');
      const validCurrencyCodes = new Set(
        (definedCurrencies || []).map((c: any) => c.code?.toUpperCase())
      );
      validCurrencyCodes.add(companyCurrency.toUpperCase());

      const importCurrencies = new Set(
        validRows
          .map(r => String(r.mapped_data?.currency || '').toUpperCase())
          .filter(c => c && c !== companyCurrency.toUpperCase())
      );
      const unknownCurrencies = [...importCurrencies].filter(c => !validCurrencyCodes.has(c));
      if (unknownCurrencies.length > 0) {
        errors.push(`⚠️ عملات غير معرّفة في النظام: ${unknownCurrencies.join(', ')} — يرجى إضافتها في إعدادات العملات أو استخدام العملة المحلية (${companyCurrency})`);
      }

      // ─── Auto-create groups for products (المادة → التصميم) ───
      const groupIdMap: Record<string, string> = {}; // "category|designName" → group_id
      const categoryGroupMap: Record<string, string> = {}; // category → group_id

      // Multi-language design detection maps (used by both group creation and row insertion)
      const designWordsMap: Record<string, { ar: string; en: string; tr: string; ru: string; uk: string }> = {
        'سادة':    { ar: 'سادة', en: 'Plain', tr: 'Düz', ru: 'Гладкий', uk: 'Гладкий' },
        'plain':   { ar: 'سادة', en: 'Plain', tr: 'Düz', ru: 'Гладкий', uk: 'Гладкий' },
        'düz':     { ar: 'سادة', en: 'Plain', tr: 'Düz', ru: 'Гладкий', uk: 'Гладкий' },
        'гладкий': { ar: 'سادة', en: 'Plain', tr: 'Düz', ru: 'Гладкий', uk: 'Гладкий' },
        'مقلم':    { ar: 'مقلم', en: 'Striped', tr: 'Çizgili', ru: 'Полосатый', uk: 'Смугастий' },
        'striped': { ar: 'مقلم', en: 'Striped', tr: 'Çizgili', ru: 'Полосатый', uk: 'Смугастий' },
        'çizgili': { ar: 'مقلم', en: 'Striped', tr: 'Çizgili', ru: 'Полосатый', uk: 'Смугастий' },
        'полосатый': { ar: 'مقلم', en: 'Striped', tr: 'Çizgili', ru: 'Полосатый', uk: 'Смугастий' },
        'مورد':    { ar: 'مورد', en: 'Floral', tr: 'Çiçekli', ru: 'Цветочный', uk: 'Квітковий' },
        'floral':  { ar: 'مورد', en: 'Floral', tr: 'Çiçekli', ru: 'Цветочный', uk: 'Квітковий' },
        'مربعات':  { ar: 'مربعات', en: 'Checkered', tr: 'Ekose', ru: 'Клетчатый', uk: 'Картатий' },
        'checkered': { ar: 'مربعات', en: 'Checkered', tr: 'Ekose', ru: 'Клетчатый', uk: 'Картатий' },
        'مطرز':    { ar: 'مطرز', en: 'Embroidered', tr: 'İşlemeli', ru: 'Вышитый', uk: 'Вишитий' },
        'embroidered': { ar: 'مطرز', en: 'Embroidered', tr: 'İşlemeli', ru: 'Вышитый', uk: 'Вишитий' },
        'جاكار':   { ar: 'جاكار', en: 'Jacquard', tr: 'Jakar', ru: 'Жаккардовый', uk: 'Жакардовий' },
        'jacquard': { ar: 'جاكار', en: 'Jacquard', tr: 'Jakar', ru: 'Жаккардовый', uk: 'Жакардовий' },
        'مطبوع':   { ar: 'مطبوع', en: 'Printed', tr: 'Baskılı', ru: 'Печатный', uk: 'Друкований' },
        'printed':  { ar: 'مطبوع', en: 'Printed', tr: 'Baskılı', ru: 'Печатный', uk: 'Друкований' },
        'تويل':    { ar: 'تويل', en: 'Twill', tr: 'Dimi', ru: 'Твиловый', uk: 'Твіловий' },
        'twill':   { ar: 'تويل', en: 'Twill', tr: 'Dimi', ru: 'Твиловый', uk: 'Твіловий' },
        'منقوش':   { ar: 'منقوش', en: 'Dotted', tr: 'Noktalı', ru: 'Точечный', uk: 'Крапковий' },
      };

      // Code-based fallback map
      const codeDesignNames: Record<string, { ar: string; en: string; tr: string; ru: string; uk: string }> = {
        'PL': { ar: 'سادة', en: 'Plain', tr: 'Düz', ru: 'Гладкий', uk: 'Гладкий' },
        'ST': { ar: 'مقلم', en: 'Striped', tr: 'Çizgili', ru: 'Полосатый', uk: 'Смугастий' },
        'FL': { ar: 'مورد', en: 'Floral', tr: 'Çiçekli', ru: 'Цветочный', uk: 'Квітковий' },
        'CH': { ar: 'مربعات', en: 'Checkered', tr: 'Ekose', ru: 'Клетчатый', uk: 'Картатий' },
        'EM': { ar: 'مطرز', en: 'Embroidered', tr: 'İşlemeli', ru: 'Вышитый', uk: 'Вишитий' },
        'JQ': { ar: 'جاكار', en: 'Jacquard', tr: 'Jakar', ru: 'Жаккардовый', uk: 'Жакардовий' },
        'PR': { ar: 'مطبوع', en: 'Printed', tr: 'Baskılı', ru: 'Печатный', uk: 'Друкований' },
        'TW': { ar: 'تويل', en: 'Twill', tr: 'Dimi', ru: 'Твиловый', uk: 'Твіловий' },
      };

      // Helper to extract design from material data
      const extractDesignKey = (data: Record<string, unknown>): string => {
        // 1. PRIMARY: Name-based detection (any language)
        const nameFields = ['name_ar', 'name_en', 'name_tr', 'name_ru', 'name_uk', 'name'];
        const allNames = nameFields.map(f => String(data[f] || '').toLowerCase()).join(' ');
        
        for (const [word, info] of Object.entries(designWordsMap)) {
          if (allNames.includes(word.toLowerCase())) {
            return info.ar; // Use Arabic as unique key
          }
        }

        // 2. FALLBACK: Code-based detection (FAB-{TYPE}-{DESIGN}-{COLOR})
        const code = String(data.code || '');
        const parts = code.split('-');
        const designCode = parts.length >= 3 ? parts[2] : '';
        if (designCode && codeDesignNames[designCode]) {
          return codeDesignNames[designCode].ar;
        }

        return '';
      };

      if (entityType === 'products') {
        // ─── Smart auto-categorization from material names (9 languages) ───
        type LangNames = { ar: string; en: string; tr: string; ru: string; uk: string; de: string; it: string; ro: string; pl: string };
        const categoryTranslations: Record<string, LangNames> = {
          'أقمشة بوليستر': { ar: 'أقمشة بوليستر', en: 'Polyester Fabrics', tr: 'Polyester Kumaşlar', ru: 'Полиэстеровые ткани', uk: 'Поліестерові тканини', de: 'Polyesterstoffe', it: 'Tessuti in poliestere', ro: 'Țesături poliester', pl: 'Tkaniny poliestrowe' },
          'أقمشة قطنية': { ar: 'أقمشة قطنية', en: 'Cotton Fabrics', tr: 'Pamuklu Kumaşlar', ru: 'Хлопковые ткани', uk: 'Бавовняні тканини', de: 'Baumwollstoffe', it: 'Tessuti di cotone', ro: 'Țesături de bumbac', pl: 'Tkaniny bawełniane' },
          'أقمشة حريرية': { ar: 'أقمشة حريرية', en: 'Silk Fabrics', tr: 'İpek Kumaşlar', ru: 'Шёлковые ткани', uk: 'Шовкові тканини', de: 'Seidenstoffe', it: 'Tessuti di seta', ro: 'Țesături de mătase', pl: 'Tkaniny jedwabne' },
          'أقمشة كتانية': { ar: 'أقمشة كتانية', en: 'Linen Fabrics', tr: 'Keten Kumaşlar', ru: 'Льняные ткани', uk: 'Лляні тканини', de: 'Leinenstoffe', it: 'Tessuti di lino', ro: 'Țesături de in', pl: 'Tkaniny lniane' },
          'أقمشة صوفية': { ar: 'أقمشة صوفية', en: 'Wool Fabrics', tr: 'Yün Kumaşlar', ru: 'Шерстяные ткани', uk: 'Вовняні тканини', de: 'Wollstoffe', it: 'Tessuti di lana', ro: 'Țesături de lână', pl: 'Tkaniny wełniane' },
          'أقمشة نايلون': { ar: 'أقمشة نايلون', en: 'Nylon Fabrics', tr: 'Naylon Kumaşlar', ru: 'Нейлоновые ткани', uk: 'Нейлонові тканини', de: 'Nylonstoffe', it: 'Tessuti di nylon', ro: 'Țesături de nailon', pl: 'Tkaniny nylonowe' },
          'أقمشة ساتان': { ar: 'أقمشة ساتان', en: 'Satin Fabrics', tr: 'Saten Kumaşlar', ru: 'Атласные ткани', uk: 'Атласні тканини', de: 'Satinstoffe', it: 'Tessuti in raso', ro: 'Țesături de satin', pl: 'Tkaniny satynowe' },
          'أقمشة شيفون': { ar: 'أقمشة شيفون', en: 'Chiffon Fabrics', tr: 'Şifon Kumaşlar', ru: 'Шифоновые ткани', uk: 'Шифонові тканини', de: 'Chiffonstoffe', it: 'Tessuti chiffon', ro: 'Țesături de șifon', pl: 'Tkaniny szyfonowe' },
          'أقمشة دانتيل': { ar: 'أقمشة دانتيل', en: 'Lace Fabrics', tr: 'Dantel Kumaşlar', ru: 'Кружевные ткани', uk: 'Мереживні тканини', de: 'Spitzenstoffe', it: 'Tessuti in pizzo', ro: 'Țesături de dantelă', pl: 'Tkaniny koronkowe' },
          'أقمشة مخمل': { ar: 'أقمشة مخمل', en: 'Velvet Fabrics', tr: 'Kadife Kumaşlar', ru: 'Бархатные ткани', uk: 'Оксамитові тканини', de: 'Samtstoffe', it: 'Tessuti di velluto', ro: 'Țesături de catifea', pl: 'Tkaniny aksamitne' },
          'أقمشة صناعية': { ar: 'أقمشة صناعية', en: 'Synthetic Fabrics', tr: 'Sentetik Kumaşlar', ru: 'Синтетические ткани', uk: 'Синтетичні тканини', de: 'Synthetische Stoffe', it: 'Tessuti sintetici', ro: 'Țesături sintetice', pl: 'Tkaniny syntetyczne' },
          'أقمشة أخرى': { ar: 'أقمشة أخرى', en: 'Other Fabrics', tr: 'Diğer Kumaşlar', ru: 'Другие ткани', uk: 'Інші тканини', de: 'Andere Stoffe', it: 'Altri tessuti', ro: 'Alte țesături', pl: 'Inne tkaniny' },
        };

        const materialTypeWords: Record<string, string> = {
          // Arabic
          'بوليستر': 'أقمشة بوليستر', 'قطن': 'أقمشة قطنية', 'حرير': 'أقمشة حريرية',
          'كتان': 'أقمشة كتانية', 'صوف': 'أقمشة صوفية', 'نايلون': 'أقمشة نايلون',
          'ساتان': 'أقمشة ساتان', 'شيفون': 'أقمشة شيفون', 'دانتيل': 'أقمشة دانتيل', 'مخمل': 'أقمشة مخمل',
          // English
          'polyester': 'أقمشة بوليستر', 'cotton': 'أقمشة قطنية', 'silk': 'أقمشة حريرية',
          'linen': 'أقمشة كتانية', 'wool': 'أقمشة صوفية', 'nylon': 'أقمشة نايلون',
          'satin': 'أقمشة ساتان', 'chiffon': 'أقمشة شيفون', 'lace': 'أقمشة دانتيل', 'velvet': 'أقمشة مخمل',
          // Turkish (unique words only - shared words already covered above)
          'pamuk': 'أقمشة قطنية', 'ipek': 'أقمشة حريرية',
          'keten': 'أقمشة كتانية', 'yün': 'أقمشة صوفية', 'naylon': 'أقمشة نايلون',
          'saten': 'أقمشة ساتان', 'şifon': 'أقمشة شيفون', 'dantel': 'أقمشة دانتيل', 'kadife': 'أقمشة مخمل',
          // Russian
          'полиэстер': 'أقمشة بوليستر', 'хлопок': 'أقمشة قطنية', 'шёлк': 'أقمشة حريرية', 'шелк': 'أقمشة حريرية',
          'лён': 'أقمشة كتانية', 'лен': 'أقمشة كتانية', 'шерсть': 'أقمشة صوفية', 'нейлон': 'أقمشة نايلون',
          'атлас': 'أقمشة ساتان', 'шифон': 'أقمشة شيفون', 'кружево': 'أقمشة دانتيل', 'бархат': 'أقمشة مخمل',
          // Ukrainian
          'поліестер': 'أقمشة بوليستر', 'бавовна': 'أقمشة قطنية', 'шовк': 'أقمشة حريرية',
          'льон': 'أقمشة كتانية', 'вовна': 'أقمشة صوفية',
          'оксамит': 'أقمشة مخمل', 'мереживо': 'أقمشة دانتيل',
        };

        // Suggest category from material name when category is empty
        const suggestCategory = (data: Record<string, unknown>): string => {
          const nameFields = ['name_ar', 'name_en', 'name_tr', 'name_ru', 'name_uk', 'name'];
          const allNames = nameFields.map(f => String(data[f] || '').toLowerCase()).join(' ');
          
          for (const [word, catKey] of Object.entries(materialTypeWords)) {
            if (allNames.includes(word.toLowerCase())) {
              return catKey; // Returns Arabic key like 'أقمشة بوليستر'
            }
          }
          return 'أقمشة أخرى'; // Default: "Other Fabrics"
        };

        // Collect unique categories and designs from import data
        const categorySet = new Set<string>();
        const designSet = new Map<string, Set<string>>(); // category → Set<designKey>
        const designInfoMap = new Map<string, { ar: string; en: string; tr: string; ru: string; uk: string }>();
        
        for (const row of validRows) {
          const d = row.mapped_data || {};
          let category = String(d.category || '').trim();
          
          // Auto-suggest category from material name when missing
          if (!category) {
            category = suggestCategory(d);
            // Write back to mapped_data so it's used during insertion
            if (row.mapped_data) {
              row.mapped_data.category = category;
            }
            console.log(`🤖 Auto-categorized "${d.name_ar || d.name_en}" → ${category}`);
          }
          
          categorySet.add(category);
          if (!designSet.has(category)) {
            designSet.set(category, new Set());
          }
          
          const designKey = extractDesignKey(d);
          if (designKey) {
            designSet.get(category)!.add(designKey);
            // Find matching info
            const info = Object.values(designWordsMap).find(v => v.ar === designKey);
            if (info) designInfoMap.set(designKey, info);
          }
        }

        // Create Level 1 groups (categories)
        for (const categoryAr of categorySet) {
          // Check if group already exists by name (only root groups)
          const { data: existing } = await supabase
            .from('fabric_groups')
            .select('id')
            .eq('company_id', companyId)
            .eq('name_ar', categoryAr)
            .is('parent_id', null)
            .maybeSingle();
          
          if (existing) {
            categoryGroupMap[categoryAr] = existing.id;
          } else {
            // Get all language translations for this category
            const catLangs = categoryTranslations[categoryAr] || {
              ar: categoryAr, en: categoryAr, tr: categoryAr, ru: categoryAr, uk: categoryAr,
              de: categoryAr, it: categoryAr, ro: categoryAr, pl: categoryAr,
            };
            const { data: newGroup } = await supabase
              .from('fabric_groups')
              .insert({
                tenant_id: tenantId,
                company_id: companyId,
                name_ar: catLangs.ar,
                name_en: catLangs.en,
                name_tr: catLangs.tr,
                name_ru: catLangs.ru,
                name_uk: catLangs.uk,
                name_de: catLangs.de,
                name_it: catLangs.it,
                name_ro: catLangs.ro,
                name_pl: catLangs.pl,
                code: `GRP-${categoryAr.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
                is_active: true,
              })
              .select('id')
              .single();
            if (newGroup) {
              categoryGroupMap[categoryAr] = newGroup.id;
            }
          }
        }

        // Create Level 2 groups (designs) under each category
        for (const [categoryAr, designKeys] of designSet) {
          const parentId = categoryGroupMap[categoryAr];
          if (!parentId) continue;
          
          for (const designKey of designKeys) {
            const designInfo = designInfoMap.get(designKey) || { ar: designKey, en: designKey, tr: designKey, ru: designKey, uk: designKey };
            const groupKey = `${categoryAr}|${designKey}`;
            
            // Check if sub-group already exists
            const { data: existing } = await supabase
              .from('fabric_groups')
              .select('id')
              .eq('company_id', companyId)
              .eq('parent_id', parentId)
              .eq('name_ar', designInfo.ar)
              .maybeSingle();
            
            if (existing) {
              groupIdMap[groupKey] = existing.id;
            } else {
              const { data: newGroup } = await supabase
                .from('fabric_groups')
                .insert({
                  tenant_id: tenantId,
                  company_id: companyId,
                  parent_id: parentId,
                  name_ar: designInfo.ar,
                  name_en: designInfo.en,
                  name_tr: designInfo.tr,
                  name_ru: designInfo.ru,
                  name_uk: designInfo.uk,
                  code: `GRP-${designInfo.en.slice(0, 2).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
                  is_active: true,
                })
                .select('id')
                .single();
              if (newGroup) {
                groupIdMap[groupKey] = newGroup.id;
              }
            }
          }
        }
        
        if (Object.keys(groupIdMap).length > 0) {
          console.log(`✅ Auto-created ${Object.keys(categoryGroupMap).length} category groups + ${Object.keys(groupIdMap).length} design groups`);
        }
      }

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        try {
          const rowsToInsert = batch.map(row => {
            const data = row.mapped_data || {};
            const insertRow = buildInsertRow(entityType!, data, companyId, tenantId, companyCurrency);
            // Assign group_id for products based on auto-created groups (name-based)
            if (insertRow && entityType === 'products' && Object.keys(groupIdMap).length > 0) {
              const category = String(data.category || '').trim();
              // Try name-based design extraction first
              const nameFields = ['name_ar', 'name_en', 'name_tr', 'name_ru', 'name_uk', 'name'];
              const allNames = nameFields.map(f => String(data[f] || '').toLowerCase()).join(' ');
              let designKey = '';
              for (const [word, info] of Object.entries(designWordsMap || {})) {
                if (allNames.includes(word.toLowerCase())) {
                  designKey = (info as any).ar;
                  break;
                }
              }
              // Fallback: code-based
              if (!designKey) {
                const code = String(data.code || '');
                const parts = code.split('-');
                const dc = parts.length >= 3 ? parts[2] : '';
                if (dc && codeDesignNames[dc]) designKey = codeDesignNames[dc].ar;
              }
              const key = `${category}|${designKey}`;
              if (groupIdMap[key]) {
                insertRow.group_id = groupIdMap[key];
              } else if (categoryGroupMap && categoryGroupMap[category]) {
                // At least assign the category group
                insertRow.group_id = categoryGroupMap[category];
              }
            }
            return insertRow;
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

      // ─── إنشاء حركات مخزون افتتاحية للمنتجات ───
      if (imported > 0 && entityType === 'products') {
        try {
          const stockWarnings = await createOpeningStockMovements(validRows, companyId, tenantId);
          if (stockWarnings?.length > 0) {
            errors.push(...stockWarnings);
          }
          console.log('✅ Opening stock movements created');
        } catch (smErr: any) {
          console.warn('Opening stock movements error:', smErr);
          errors.push(`تحذير: فشل إنشاء حركات المخزون الافتتاحية: ${smErr?.message || 'خطأ'}`);
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
    case 'products': return 'fabric_materials';
    case 'chart_of_accounts': return 'chart_of_accounts';
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
  tenantId: string,
  companyCurrency: string = 'USD'
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
        currency: clean(data.currency) || companyCurrency,
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
        currency: clean(data.currency) || companyCurrency,
        notes: clean(data.notes),
        status: 'active',
      };

    case 'products':
      return {
        company_id: companyId,
        tenant_id: tenantId,
        code: clean(data.code) || `MAT-${Date.now().toString(36)}`,
        name_ar: clean(data.name_ar) || clean(data.name_en) || clean(data.name_tr) || clean(data.name_ru) || clean(data.name_uk) || String(data.name || ''),
        name_en: clean(data.name_en) || clean(data.name_ar) || String(data.name || ''),
        name_tr: clean(data.name_tr),
        name_ru: clean(data.name_ru),
        name_uk: clean(data.name_uk),
        category: clean(data.category),
        unit: clean(data.unit) || 'meter',
        selling_price: num(data.sale_price),
        purchase_price: num(data.cost_price),
        currency: clean(data.currency) || companyCurrency,
        min_stock: num(data.min_qty || data.min_stock),
        current_stock: num(data.opening_qty),
        notes: clean(data.notes) || clean(data.description),
        status: 'active',
        custom_fields: data.barcode ? { barcode: String(data.barcode) } : {},
        // warehouse_code is stored in mapped_data for stock creation
      };

    case 'chart_of_accounts':
      return {
        company_id: companyId,
        tenant_id: tenantId,
        account_code: clean(data.account_code) || `ACC-${Date.now().toString(36)}`,
        name_ar: clean(data.name_ar) || clean(data.name_en) || clean(data.name_ru) || '',
        name_en: clean(data.name_en) || clean(data.name_ar) || '',
        name_tr: clean(data.name_tr),
        name_ru: clean(data.name_ru),
        name_uk: clean(data.name_uk),
        name_ro: clean(data.name_ro),
        name_pl: clean(data.name_pl),
        name_de: clean(data.name_de),
        name_it: clean(data.name_it),
        currency: clean(data.currency) || companyCurrency,
        opening_balance: num(data.opening_balance),
        current_balance: num(data.opening_balance),
        description: clean(data.description),
        is_group: false,
        is_detail: true,
        is_active: true,
        parent_id: clean(data._parent_id) || null,
        account_type_id: clean(data._account_type_id) || null,
        level: num(data._level) || 2,
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
    .maybeSingle();

  if (!obAccount) {
    console.warn('Opening balance account (35) not found, skipping journal entry');
    return '';
  }

  // عملة الشركة الأساسية + إعدادات المحاسبة
  const { data: company } = await supabase
    .from('companies')
    .select('default_currency, accounting_settings')
    .eq('id', companyId)
    .single();
  const baseCurrency = company?.default_currency || 'USD';
  const accountingSettings = (company?.accounting_settings as any)?.default_accounts || {};

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
    // البحث عن حساب المخزون — أولاً من إعدادات المحاسبة، ثم fallback بالكود
    let invAccount: { id: string; account_code: string } | null = null;

    // 1. محاولة من إعدادات المحاسبة (accounting_settings.default_accounts.inventory_account_id)
    if (accountingSettings.inventory_account_id) {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('id', accountingSettings.inventory_account_id)
        .maybeSingle();
      if (data) {
        invAccount = data;
        console.log(`✅ Using inventory account from settings: ${data.account_code}`);
      }
    }

    // 2. Fallback — بحث بالكود
    if (!invAccount) {
      const inventoryAccountCodes = ['1142', '1141', '114', '1140'];
      for (const accCode of inventoryAccountCodes) {
        const { data } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code')
          .eq('company_id', companyId)
          .eq('account_code', accCode)
          .maybeSingle();
        if (data) {
          invAccount = data;
          break;
        }
      }
    }

    if (!invAccount) {
      console.warn('Inventory account not found, skipping journal');
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
  // Translation maps for entity labels
  const entityLabels: Record<string, Record<string, string>> = {
    customers: {
      ar: 'عملاء', en: 'Customers', tr: 'Müşteriler',
      ru: 'Клиенты', uk: 'Клієнти', de: 'Kunden',
      it: 'Clienti', ro: 'Clienți', pl: 'Klienci',
    },
    suppliers: {
      ar: 'موردين', en: 'Suppliers', tr: 'Tedarikçiler',
      ru: 'Поставщики', uk: 'Постачальники', de: 'Lieferanten',
      it: 'Fornitori', ro: 'Furnizori', pl: 'Dostawcy',
    },
    products: {
      ar: 'مواد', en: 'Materials', tr: 'Malzemeler',
      ru: 'Материалы', uk: 'Матеріали', de: 'Materialien',
      it: 'Materiali', ro: 'Materiale', pl: 'Materiały',
    },
  };
  const labels = entityLabels[entityType] || entityLabels.products;

  const descTemplates: Record<string, (label: string, cur: string) => string> = {
    ar: (l, c) => `قيد أرصدة افتتاحية - استيراد ${l} (${c})`,
    en: (l, c) => `Opening Balance - ${l} Import (${c})`,
    tr: (l, c) => `Açılış Bakiyesi - ${l} İthalat (${c})`,
    ru: (l, c) => `Начальное сальдо - Импорт ${l} (${c})`,
    uk: (l, c) => `Початкове сальдо - Імпорт ${l} (${c})`,
    de: (l, c) => `Eröffnungssaldo - ${l} Import (${c})`,
    it: (l, c) => `Saldo di apertura - Importazione ${l} (${c})`,
    ro: (l, c) => `Sold de deschidere - Import ${l} (${c})`,
    pl: (l, c) => `Saldo otwarcia - Import ${l} (${c})`,
  };

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
      // Try direct: USD→UAH
      const { data: directRate } = await supabase
        .from('exchange_rates')
        .select('buy_rate')
        .eq('company_id', companyId)
        .eq('from_currency', currency)
        .eq('to_currency', baseCurrency)
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (directRate?.buy_rate) {
        exchangeRate = directRate.buy_rate;
      } else {
        // Try reverse: UAH→USD then invert (1/rate)
        const { data: reverseRate } = await supabase
          .from('exchange_rates')
          .select('buy_rate')
          .eq('company_id', companyId)
          .eq('from_currency', baseCurrency)
          .eq('to_currency', currency)
          .eq('is_active', true)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (reverseRate?.buy_rate && reverseRate.buy_rate > 0) {
          exchangeRate = Math.round((1 / reverseRate.buy_rate) * 10000) / 10000;
          console.log(`💱 Exchange rate ${currency}→${baseCurrency}: ${exchangeRate} (inverted from ${reverseRate.buy_rate})`);
        }
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
        description: descTemplates.ar(labels.ar, currency),
        description_ar: descTemplates.ar(labels.ar, currency),
        description_en: descTemplates.en(labels.en, currency),
        description_tr: descTemplates.tr(labels.tr, currency),
        description_ru: descTemplates.ru(labels.ru, currency),
        description_uk: descTemplates.uk(labels.uk, currency),
        description_de: descTemplates.de(labels.de, currency),
        description_it: descTemplates.it(labels.it, currency),
        description_ro: descTemplates.ro(labels.ro, currency),
        description_pl: descTemplates.pl(labels.pl, currency),
        currency: currency,
        exchange_rate: exchangeRate,
        // ═══ القاعدة المحاسبية المُؤكّدة من post_journal_entry RPC ═══
        // الـ RPC يعمل: current_balance += (debit - credit) مباشرة
        // لذلك total_debit/total_credit يجب أن تكون بالعملة المحلية
        total_debit: Math.round(finalTotalDebit * exchangeRate * 100) / 100,
        total_credit: Math.round(finalTotalCredit * exchangeRate * 100) / 100,
        // ═══ draft أولاً — ثم ترحيل عبر RPC ═══
        status: 'draft',
        is_posted: false,
        reference_type: 'import',
        reference_number: entryRef,
      })
      .select('id, entry_number')
      .single();

    if (jeError || !journalEntry) {
      console.error(`Failed to create journal (${currency}):`, jeError);
      throw new Error(jeError?.message || 'فشل إنشاء القيد');
    }

    // ═══ القاعدة المحاسبية المُؤكّدة ═══
    // post_journal_entry يعمل: current_balance += (debit - credit)
    // لذلك:
    //   debit/credit     = المبلغ بالعملة المحلية (مضروب × سعر الصرف)
    //   debit_fc/credit_fc = المبلغ بالعملة الأصلية (للعرض)
    const journalLines = lines.map((line, idx) => {
      const fcDebit = Math.round(line.debit * 100) / 100;
      const fcCredit = Math.round(line.credit * 100) / 100;
      const localDebit = Math.round(fcDebit * exchangeRate * 100) / 100;
      const localCredit = Math.round(fcCredit * exchangeRate * 100) / 100;

      return {
        tenant_id: tenantId,
        entry_id: journalEntry.id,
        line_number: idx + 1,
        account_id: line.accountId,
        debit: localDebit,
        credit: localCredit,
        debit_fc: fcDebit,
        credit_fc: fcCredit,
        currency: currency,
        exchange_rate: exchangeRate,
        description: line.description,
        party_type: line.partyType || null,
        party_id: line.partyId || null,
      };
    });

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('Failed to create journal lines:', linesError);
      throw new Error(linesError.message);
    }

    // ═══ ترحيل فعلي عبر RPC — يُحدّث أرصدة الحسابات ═══
    const { error: postError } = await supabase.rpc('post_journal_entry', {
      p_entry_id: journalEntry.id,
      p_user_id: null,
    });
    if (postError) {
      console.warn(`⚠️ Auto-post failed for ${journalEntry.entry_number}: ${postError.message}`);
    }

    console.log(`✅ Opening balance journal (${currency}): ${journalEntry.entry_number} with ${lines.length} lines, rate=${exchangeRate} — POSTED`);
    createdRefs.push(journalEntry.entry_number);
  }

  return createdRefs.join(', ');
}

/**
 * إنشاء حركات مخزون افتتاحية للمنتجات المستوردة
 * يبحث عن المواد المُدرجة بالكود ويُنشئ حركة "opening_balance" لكل مادة بكمية > 0
 * يرجع قائمة بالتحذيرات (المستودع الافتراضي، العملة غير محددة، إلخ)
 */
async function createOpeningStockMovements(
  importRows: ImportRow[],
  companyId: string,
  tenantId: string
): Promise<string[]> {
  const warnings: string[] = [];
  // 1. جمع الصفوف التي لها كمية افتتاحية
  const rowsWithQty = importRows.filter(r => {
    const data = r.mapped_data || {};
    const qty = Number(data.opening_qty);
    return r.status === 'valid' && qty > 0;
  });

  if (rowsWithQty.length === 0) {
    console.log('ℹ️ No opening quantities to create stock movements for');
    return warnings;
  }

  // تحقق: هل هناك صفوف بدون كود مستودع؟
  const rowsWithoutWH = rowsWithQty.filter(r => !r.mapped_data?.warehouse_code);
  if (rowsWithoutWH.length > 0) {
    warnings.push(`⚠️ ${rowsWithoutWH.length} مادة بدون تحديد مستودع — سيتم استخدام المستودع الافتراضي`);
  }

  // 2. جلب المستودعات حسب الكود
  const warehouseCodes = [...new Set(rowsWithQty.map(r => String(r.mapped_data?.warehouse_code || 'WH-001')))];
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, code')
    .eq('company_id', companyId)
    .in('code', warehouseCodes);

  const warehouseMap: Record<string, string> = {};
  warehouses?.forEach(w => { warehouseMap[w.code] = w.id; });

  // إذا لم يتم العثور على أي مستودع، استخدم أول مستودع متاح
  if (Object.keys(warehouseMap).length === 0) {
    const { data: defaultWh } = await supabase
      .from('warehouses')
      .select('id, code')
      .eq('company_id', companyId)
      .limit(1)
      .single();

    if (defaultWh) {
      warehouseMap[defaultWh.code] = defaultWh.id;
      warehouseCodes.forEach(code => { warehouseMap[code] = defaultWh.id; });
      warnings.push(`⚠️ المستودعات المحددة غير موجودة — تم استخدام المستودع: ${defaultWh.code}`);
    } else {
      console.warn('⚠️ No warehouses found — cannot create stock movements');
      warnings.push('❌ لا توجد مستودعات — لم يتم إنشاء حركات المخزون');
      return warnings;
    }
  }

  // 3. جلب IDs المواد المُدرجة بالكود
  const materialCodes = rowsWithQty.map(r => String(r.mapped_data?.code || ''));
  const { data: materials } = await supabase
    .from('fabric_materials')
    .select('id, code')
    .eq('company_id', companyId)
    .in('code', materialCodes);

  const materialMap: Record<string, string> = {};
  materials?.forEach(m => { materialMap[m.code] = m.id; });

  // 4. إنشاء حركات المخزون
  const movements = rowsWithQty
    .map(row => {
      const data = row.mapped_data || {};
      const code = String(data.code || '');
      const materialId = materialMap[code];
      const whCode = String(data.warehouse_code || warehouseCodes[0] || 'WH-001');
      const warehouseId = warehouseMap[whCode] || Object.values(warehouseMap)[0];

      if (!materialId || !warehouseId) return null;

      const movDate = new Date().toISOString().split('T')[0];
      const movNum = `MOV-OB-${movDate}-${String(row.row_number).padStart(4, '0')}`;

      return {
        tenant_id: tenantId,
        company_id: companyId,
        movement_number: movNum,
        material_id: materialId,
        to_warehouse_id: warehouseId,
        movement_type: 'in',
        quantity: Number(data.opening_qty),
        unit_cost: Number(data.cost_price || data.sale_price || 0),
        total_cost: Number(data.opening_qty) * Number(data.cost_price || data.sale_price || 0),
        reference_type: 'opening_balance',
        reference_number: `OB-IMPORT-${movDate}`,
        notes: `رصيد افتتاحي — استيراد: ${code}`,
        movement_date: movDate,
      };
    })
    .filter(Boolean);

  if (movements.length === 0) return warnings;

  // 5. إدراج حركات المخزون على دفعات
  const batchSize = 50;
  for (let i = 0; i < movements.length; i += batchSize) {
    const batch = movements.slice(i, i + batchSize);
    const { error } = await supabase
      .from('inventory_movements')
      .insert(batch);

    if (error) {
      console.error('Inventory movement batch error:', error);
      throw new Error(`فشل إنشاء حركات المخزون: ${error.message}`);
    }
  }

  console.log(`✅ Created ${movements.length} opening inventory movements`);
  warnings.push(`✅ تم إنشاء ${movements.length} حركة مخزون افتتاحية`);
  return warnings;
}
