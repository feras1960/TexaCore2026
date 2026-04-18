/**
 * Import Wizard Hook
 * ===================
 * منطق معالج الاستيراد
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { importService } from '@/services/importService';
import { processVariantsForImport } from '../utils/variantProcessor';
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

export type WarehouseBreakdown = Record<string, { warehouse_code: string; warehouse_id?: string; warehouse_name?: string; qty: number; unit_cost: number }[]>;
export interface WarehouseInfo { id: string; code: string; name_ar: string; name_en?: string; name_ru?: string; name_uk?: string; name_tr?: string }
export interface BranchInfo { id: string; code: string; name_ar: string; name_en?: string }
export interface WarehouseResolution {
  action: 'create' | 'map';
  target?: string;          // warehouse_id to map to (when action='map')
  name_ar?: string;         // overridden display name
  branch_id?: string;       // branch to assign when creating
  warehouse_type?: string;  // 'regular' | 'offline_market' | 'van'
}

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
  // Multi-warehouse support
  warehouseBreakdown: WarehouseBreakdown;
  warehouseList: WarehouseInfo[];
  /** Names/codes found in file that have no match in system warehouses */
  missingWarehouses: string[];
  /** User decision for each missing warehouse: create new or map to existing */
  warehouseResolutions: Record<string, WarehouseResolution>;
  /** Branches available in system for warehouse creation */
  branchList: BranchInfo[];
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
  progress: 0,
  warehouseBreakdown: {},
  warehouseList: [],
  missingWarehouses: [],
  warehouseResolutions: {},
  branchList: [],
};

export function useImportWizard(tenantId: string, companyId: string, defaultEntityType?: string) {
  const [state, setState] = useState<WizardState>(initialState);
  const [entityDefinitions, setEntityDefinitions] = useState<EntityDefinition[]>([]);
  const queryClient = useQueryClient();

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
      let importRows: ImportRow[] = [];
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

      // ═══ MULTI-WAREHOUSE: Compute breakdown + smart matching ═══
      let warehouseBreakdown: WarehouseBreakdown = {};
      let warehouseList: WarehouseInfo[] = [];

      if (state.entityType === 'products') {
        // 1. Fetch all warehouses from system
        const { data: whData } = await supabase
          .from('warehouses')
          .select('id, code, name_ar, name_en, name_ru, name_uk, name_tr')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('code');
        warehouseList = (whData || []) as WarehouseInfo[];

        // 2. Smart matching function
        const resolveWarehouse = (input: string): WarehouseInfo | null => {
          if (!input) return warehouseList[0] || null; // default to first warehouse
          const normalized = input.trim().toLowerCase();

          // Try exact code match
          const byCode = warehouseList.find(w => w.code.toLowerCase() === normalized);
          if (byCode) return byCode;

          // Try exact name match (any language)
          const byName = warehouseList.find(w =>
            [w.name_ar, w.name_en, w.name_ru, w.name_uk, w.name_tr]
              .filter(Boolean)
              .some(n => n!.toLowerCase() === normalized)
          );
          if (byName) return byName;

          // Try contains/fuzzy match
          const byContains = warehouseList.find(w =>
            [w.name_ar, w.name_en, w.name_ru, w.name_uk, w.name_tr, w.code]
              .filter(Boolean)
              .some(n => n!.toLowerCase().includes(normalized) || normalized.includes(n!.toLowerCase()))
          );
          if (byContains) return byContains;

          return null; // No match
        };

        // 3. Build breakdown from import rows
        const codeGroups = new Map<string, ImportRow[]>();
        for (const row of importRows) {
          if (row.status === 'invalid') continue;
          const code = String(row.mapped_data?.code || '').trim();
          if (!code) continue;
          if (!codeGroups.has(code)) codeGroups.set(code, []);
          codeGroups.get(code)!.push(row);
        }

        // ═══ TASK 1: Track unresolved warehouse names ═══
        const missingWarehouseNames = new Set<string>();

        for (const [code, rows] of codeGroups.entries()) {
          const entries: WarehouseBreakdown[string] = [];
          for (const r of rows) {
            const d = r.mapped_data || {};
            const whInput = String(d.warehouse_code || '').trim();
            const qty = Number(d.opening_qty) || 0;
            const cost = Number(d.cost_price || d.purchase_price || 0);
            const resolved = resolveWarehouse(whInput);
            // Track unresolved warehouse names (non-empty input with no match)
            if (whInput && !resolved) {
              missingWarehouseNames.add(whInput);
            }
            entries.push({
              warehouse_code: resolved?.code || whInput || 'DEFAULT',
              warehouse_id: resolved?.id,
              warehouse_name: resolved?.name_ar || whInput,
              qty,
              unit_cost: cost,
            });
          }
          if (entries.length > 0) {
            warehouseBreakdown[code] = entries;
          }
        }

        // ═══ TASK 5: Block if opening balances but NO warehouse data at all ═══
        const hasOpeningBalances = importRows.some(r =>
          r.status === 'valid' && Number(r.mapped_data?.opening_qty || 0) > 0
        );
        if (hasOpeningBalances && warehouseList.length === 0 && missingWarehouseNames.size === 0) {
          updateState({
            importJob: { ...updatedJob, total_rows: importRows.length, valid_rows: importRows.filter(r => r.status === 'valid').length, invalid_rows: importRows.filter(r => r.status === 'invalid').length },
            importRows,
            options: { ...state.options, column_mappings: columnMap },
            isLoading: false,
            progress: 100,
            currentStep: 'validation',
            warehouseBreakdown: {},
            warehouseList: [],
            missingWarehouses: [],
            warehouseResolutions: {},
            branchList: [],
            error: 'يوجد مواد ذات أرصدة افتتاحية ولكن لا توجد مستودعات في النظام. يرجى إنشاء مستودع واحد على الأقل من إعدادات المستودعات قبل الاستيراد.',
          });
          return;
        }

        // ═══ Fetch branches for warehouse creation dialog ═══
        let branchList: BranchInfo[] = [];
        if (missingWarehouseNames.size > 0) {
          const { data: brData } = await supabase
            .from('branches')
            .select('id, code, name_ar, name_en')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('name_ar');
          branchList = (brData || []) as BranchInfo[];
        }

        console.log(`📦 Warehouse breakdown: ${Object.keys(warehouseBreakdown).length} materials across ${warehouseList.length} warehouses`);
        if (missingWarehouseNames.size > 0) {
          console.warn(`⚠️ Missing warehouses: ${[...missingWarehouseNames].join(', ')}`);
        }

        // 4. DEDUP: Merge rows with same material code into one row (total qty)
        const codeGroupsDedup = new Map<string, ImportRow[]>();
        for (const row of importRows) {
          const code = String(row.mapped_data?.code || '').trim();
          if (!code) { continue; }
          if (!codeGroupsDedup.has(code)) codeGroupsDedup.set(code, []);
          codeGroupsDedup.get(code)!.push(row);
        }

        const deduplicatedRows: ImportRow[] = [];
        for (const [code, rows] of codeGroupsDedup.entries()) {
          const primary = rows[0];
          if (rows.length > 1 && primary.mapped_data) {
            // Sum total qty from breakdown
            const bd = warehouseBreakdown[code] || [];
            const totalQty = bd.reduce((sum, e) => sum + e.qty, 0);
            primary.mapped_data.opening_qty = totalQty;
          }
          deduplicatedRows.push(primary);
        }
        // Add rows without codes (shouldn't happen, but safety)
        for (const row of importRows) {
          const code = String(row.mapped_data?.code || '').trim();
          if (!code && !deduplicatedRows.includes(row)) {
            deduplicatedRows.push(row);
          }
        }

        const dupCount = importRows.length - deduplicatedRows.length;
        if (dupCount > 0) {
          console.log(`🔀 Multi-warehouse dedup: ${importRows.length} rows → ${deduplicatedRows.length} unique materials (${dupCount} warehouse entries merged)`);
        }
        importRows = deduplicatedRows;

        // Recalculate stats after dedup
        const finalValid = importRows.filter(r => r.status === 'valid').length;
        const finalInvalid = importRows.filter(r => r.status === 'invalid').length;
        updatedJob.total_rows = importRows.length;
        updatedJob.valid_rows = finalValid;
        updatedJob.invalid_rows = finalInvalid;

        // ⚠️ Products-specific atomic update (includes warehouse conflict data)
        updateState({
          importJob: updatedJob,
          importRows,
          options: { ...state.options, column_mappings: columnMap },
          isLoading: false,
          progress: 100,
          currentStep: 'validation',
          warehouseBreakdown,
          warehouseList,
          missingWarehouses: [...missingWarehouseNames],
          warehouseResolutions: Object.fromEntries(
            [...missingWarehouseNames].map(name => [name, { action: 'create' as const, name_ar: name, warehouse_type: 'regular' }])
          ),
          branchList,
        });
        return; // ← Don't fall through to the general updateState
      }

      // ⚠️ CRITICAL: Must set data AND step in ONE atomic update (NON-products path)
      updateState({
        importJob: updatedJob,
        importRows,
        options: { ...state.options, column_mappings: columnMap },
        isLoading: false,
        progress: 100,
        currentStep: 'validation',
        warehouseBreakdown,
        warehouseList,
        missingWarehouses: [],
        warehouseResolutions: {},
        branchList: [],
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

  // ─── تحديث قرار مستودع مفقود (للواجهة) ───────────────────────────
  const updateWarehouseResolution = useCallback((warehouseName: string, resolution: Partial<WarehouseResolution>) => {
    updateState({
      warehouseResolutions: {
        ...state.warehouseResolutions,
        [warehouseName]: { ...state.warehouseResolutions[warehouseName], ...resolution },
      }
    });
  }, [state.warehouseResolutions, updateState]);

  // ─── المهمة 4: حل تعارضات المستودعات (إنشاء أو ربط) ─────────────
  const resolveWarehouseConflicts = useCallback(async () => {
    const missing = state.missingWarehouses;
    const resolutions = state.warehouseResolutions;
    if (missing.length === 0) return;

    updateState({ isLoading: true, error: null });

    try {
      const newWarehouseByName: Record<string, string> = {}; // name → warehouse_id

      // Helper: generate a short code from name
      const generateCode = (name: string, idx: number): string => {
        const prefix = name
          .replace(/[\u0600-\u06FF]/g, '') // strip Arabic
          .trim()
          .substring(0, 4)
          .toUpperCase()
          .replace(/\s+/g, '_') || 'WH';
        return `${prefix || 'WH'}-${String(idx + 1).padStart(3, '0')}`;
      };

      let idx = 0;
      for (const name of missing) {
        const res = resolutions[name];
        if (!res) continue;

        if (res.action === 'create') {
          // Check for unique code — fetch existing codes first
          const { data: existing } = await supabase
            .from('warehouses')
            .select('code')
            .eq('company_id', companyId);
          const usedCodes = new Set((existing || []).map((w: any) => w.code));
          let code = generateCode(res.name_ar || name, idx);
          // Make unique if needed
          let suffix = idx + 1;
          while (usedCodes.has(code)) { code = `WH-${String(++suffix).padStart(3, '0')}`; }

          const { data: created, error: createErr } = await supabase
            .from('warehouses')
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              branch_id: res.branch_id || null,
              code,
              name: res.name_ar || name,
              name_ar: res.name_ar || name,
              name_en: res.name_ar || name,
              warehouse_type: res.warehouse_type || 'regular',
              is_active: true,
            })
            .select('id, code, name_ar')
            .single();

          if (createErr) throw new Error(`فشل إنشاء مستودع "${name}": ${createErr.message}`);
          if (created) {
            newWarehouseByName[name] = created.id;
            console.log(`✅ Created warehouse: ${code} — ${created.name_ar} (${created.id})`);
          }

        } else if (res.action === 'map' && res.target) {
          newWarehouseByName[name] = res.target;
          console.log(`🔗 Mapped warehouse "${name}" → ${res.target}`);
        }

        idx++;
      }

      // Re-fetch updated warehouse list
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, code, name_ar, name_en, name_ru, name_uk, name_tr')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('code');
      const newWarehouseList = (whData || []) as WarehouseInfo[];
      const whById = new Map(newWarehouseList.map(w => [w.id, w]));

      // Patch warehouseBreakdown with real IDs
      const updatedBreakdown = { ...state.warehouseBreakdown };
      for (const [matCode, entries] of Object.entries(updatedBreakdown)) {
        updatedBreakdown[matCode] = entries.map(entry => {
          const whName = entry.warehouse_name || '';
          const newId = newWarehouseByName[whName] || newWarehouseByName[entry.warehouse_code];
          if (newId) {
            const whInfo = whById.get(newId);
            return {
              ...entry,
              warehouse_id: newId,
              warehouse_code: whInfo?.code || entry.warehouse_code,
              warehouse_name: whInfo?.name_ar || entry.warehouse_name,
            };
          }
          return entry;
        });
      }

      updateState({
        isLoading: false,
        missingWarehouses: [],       // Resolved!
        warehouseResolutions: {},
        warehouseList: newWarehouseList,
        warehouseBreakdown: updatedBreakdown,
        error: null,
      });

      console.log(`🎉 All warehouse conflicts resolved. ${Object.keys(newWarehouseByName).length} created/mapped.`);

    } catch (err: any) {
      console.error('resolveWarehouseConflicts error:', err);
      updateState({ isLoading: false, error: err.message });
    }
  }, [state.missingWarehouses, state.warehouseResolutions, state.warehouseBreakdown, companyId, tenantId, updateState]);

  // ═══════════════════════════════════════════════════════════════════
  // 🔄 ROLLBACK: Clean up all data inserted during a failed import
  // ═══════════════════════════════════════════════════════════════════
  const performRollback = async (tracker: {
    entityIds: string[];
    priceListItemIds: string[];
    journalEntryIds: string[];
    journalLineIds: string[];
    createdGroupIds: string[];
    tableName: string;
  }) => {
    console.log('🔄 Starting import rollback...', {
      entities: tracker.entityIds.length,
      priceItems: tracker.priceListItemIds.length,
      journals: tracker.journalEntryIds.length,
      groups: tracker.createdGroupIds.length,
    });

    const rollbackErrors: string[] = [];

    try {
      // 1. Delete price_list_items first (depends on entities)
      if (tracker.priceListItemIds.length > 0) {
        const { error } = await supabase
          .from('price_list_items')
          .delete()
          .in('id', tracker.priceListItemIds);
        if (error) rollbackErrors.push(`price_list_items: ${error.message}`);
        else console.log(`  ✅ Rolled back ${tracker.priceListItemIds.length} price_list_items`);
      }

      // 2. Delete journal_entry_lines (depends on journal_entries)
      if (tracker.journalEntryIds.length > 0) {
        const { error: linesErr } = await supabase
          .from('journal_entry_lines')
          .delete()
          .in('entry_id', tracker.journalEntryIds);
        if (linesErr) rollbackErrors.push(`journal_entry_lines: ${linesErr.message}`);

        // 3. Delete journal_entries
        const { error: jeErr } = await supabase
          .from('journal_entries')
          .delete()
          .in('id', tracker.journalEntryIds);
        if (jeErr) rollbackErrors.push(`journal_entries: ${jeErr.message}`);
        else console.log(`  ✅ Rolled back ${tracker.journalEntryIds.length} journal entries`);
      }

      // 4. Delete main entities (fabric_materials / customers / suppliers)
      if (tracker.entityIds.length > 0 && tracker.tableName) {
        // Delete in batches to avoid URL length limits
        const BATCH = 100;
        for (let i = 0; i < tracker.entityIds.length; i += BATCH) {
          const batch = tracker.entityIds.slice(i, i + BATCH);
          const { error } = await supabase
            .from(tracker.tableName)
            .delete()
            .in('id', batch);
          if (error) rollbackErrors.push(`${tracker.tableName} batch ${i}: ${error.message}`);
        }
        console.log(`  ✅ Rolled back ${tracker.entityIds.length} records from ${tracker.tableName}`);
      }

      // 5. Delete auto-created fabric_groups
      if (tracker.createdGroupIds.length > 0) {
        const { error } = await supabase
          .from('fabric_groups')
          .delete()
          .in('id', tracker.createdGroupIds);
        if (error) rollbackErrors.push(`fabric_groups: ${error.message}`);
        else console.log(`  ✅ Rolled back ${tracker.createdGroupIds.length} fabric_groups`);
      }

      if (rollbackErrors.length > 0) {
        console.error('⚠️ Rollback completed with errors:', rollbackErrors);
      } else {
        console.log('✅ Rollback completed successfully — database is clean');
      }
    } catch (err: any) {
      console.error('❌ Rollback failed:', err);
    }
  };

  // ─── تنفيذ الاستيراد الفعلي في Supabase ───────────────────
  const executeLocalImport = useCallback(async (overrideCurrency?: string) => {
    try {
      // ═══ Session Refresh — prevents auth errors during long imports ═══
      try {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          console.warn('⚠️ Session refresh failed, continuing anyway:', refreshErr.message);
        } else {
          console.log('✅ Session refreshed before import');
        }
      } catch (e) {
        console.warn('⚠️ Session refresh exception:', e);
      }

      // جمع الصفوف الصالحة فقط
      let validRows = state.importRows.filter(r => r.status === 'valid');

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

      // ═══ ROLLBACK TRACKER: Track all inserted IDs for cleanup on failure ═══
      const rollbackTracker = {
        entityIds: [] as string[],        // fabric_materials / customers / suppliers
        priceListItemIds: [] as string[],  // price_list_items
        journalEntryIds: [] as string[],   // journal_entries
        journalLineIds: [] as string[],    // journal_entry_lines
        createdGroupIds: [] as string[],   // fabric_groups auto-created
        tableName: '',                     // target table for cleanup
      };

      // ─── تحديد الجدول المستهدف ───
      const entityType = state.entityType;

      // ═══ PARALLEL: جلب عملة الشركة + العملات المعرّفة معاً ═══
      const [companyResult, currenciesResult] = await Promise.all([
        supabase.from('companies').select('default_currency').eq('id', companyId).single(),
        supabase.from('currencies').select('code'),
      ]);
      const companyCurrency = companyResult.data?.default_currency || 'USD';
      const validCurrencyCodes = new Set(
        (currenciesResult.data || []).map((c: any) => c.code?.toUpperCase())
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
        const currentMode = state.options?._variantGroupMode || 'category';
        const isVariantMode = currentMode === 'variant_design_color' || currentMode === 'variant_color_design';

        if (isVariantMode) {
          try {
             const variantResult = await processVariantsForImport(
               supabase, validRows, companyId, tenantId, 'ar', categoryTranslations
             );
             // Make them available scoped for the batch
             (state as any)._variantResult = variantResult;
          } catch (err: any) {
             console.error('Variant processor error:', err);
             errors.push(`فشل إنشاء هيكل المتغيرات: ${err.message}`);
          }
        } else {
          // Fallback legacy categories only
          const categorySet = new Set<string>();
          for (const row of validRows) {
            const d = row.mapped_data || {};
            let category = String(d.category || '').trim();
            if (!category) {
              category = suggestCategory(d);
              if (row.mapped_data) row.mapped_data.category = category;
            }
            categorySet.add(category);
          }
          for (const categoryAr of categorySet) {
            const { data: existing } = await supabase
              .from('fabric_groups').select('id').eq('company_id', companyId)
              .eq('name_ar', categoryAr).is('parent_id', null).maybeSingle();
            
            if (existing) {
              categoryGroupMap[categoryAr] = existing.id;
            } else {
              const catLangs = categoryTranslations[categoryAr] || { ar: categoryAr, en: categoryAr, tr: categoryAr, ru: categoryAr, uk: categoryAr };
              const { data: newGroup } = await supabase
                .from('fabric_groups').insert({
                  tenant_id: tenantId, company_id: companyId,
                  name_ar: catLangs.ar, name_en: catLangs.en,
                  code: `GRP-${Date.now().toString(36).toUpperCase()}`, is_active: true,
                }).select('id').single();
              if (newGroup) {
                categoryGroupMap[categoryAr] = newGroup.id;
                rollbackTracker.createdGroupIds.push(newGroup.id);
              }
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 🔀 MULTI-WAREHOUSE: Use pre-computed breakdown from validation step
      // ═══════════════════════════════════════════════════════════════════
      // ⚠️ Rows are already deduplicated in validateData (1 row per material code).
      // The warehouseBreakdown was computed BEFORE dedup when each row had its own warehouse.
      // We use state.warehouseBreakdown directly — do NOT recompute from deduplicated rows!
      const warehouseBreakdown = state.warehouseBreakdown || {};
      
      if (entityType === 'products' && Object.keys(warehouseBreakdown).length > 0) {
        console.log(`📦 Using pre-computed warehouse breakdown: ${Object.keys(warehouseBreakdown).length} materials`);
        for (const [code, entries] of Object.entries(warehouseBreakdown)) {
          console.log(`  ${code}: ${entries.map(e => `${e.warehouse_code}=${e.qty}`).join(', ')}`);
        }
      }

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        try {
          // Pre-process variants for batch if needed
          const currentMode = state.options?._variantGroupMode || 'category';
          const isVariantMode = currentMode === 'variant_design_color' || currentMode === 'variant_color_design';
          const variantResult = (state as any)._variantResult;
          
          const rowsToInsert = await Promise.all(batch.map(async row => {
            const data = row.mapped_data || {};
            const insertRow = buildInsertRow(entityType!, data, companyId, tenantId, companyCurrency);
            
            if (insertRow && entityType === 'products') {
               const category = String(data.category || '').trim();
                if (isVariantMode && variantResult) {
                 // Use the variant data stored on the row by processVariantsForImport
                 const variantId = data._variantId;
                 const parentMaterialId = data._parentMaterialId;
                 const variantData = data._variantData;
                 
                 // Assign parent and variant (NO group_id — parent material IS the top level)
                 if (parentMaterialId) insertRow.parent_material_id = parentMaterialId;
                 if (variantId) insertRow.variant_id = variantId;
                 if (variantData) insertRow.variant_data = variantData;

                  // Generate unique internal code for each child material
                  // Original CSV code/barcode preserved in custom_fields for reference
                  const origCode = String(data.code || '');
                  const origBarcode = String((data as any).barcode || '');
                  const uniqueSuffix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
                  insertRow.code = 'MAT-' + uniqueSuffix;
                  const existingCustom = (typeof insertRow.custom_fields === 'object' && insertRow.custom_fields) ? insertRow.custom_fields : {};
                  insertRow.custom_fields = {
                    ...existingCustom,
                    original_code: origCode,
                    barcode: origBarcode,
                  };

                 // Mark as a variant child (not parent)
                 insertRow.is_variant_parent = false;
                 insertRow.has_variants = false;
                 
               } else {
                 if (categoryGroupMap && categoryGroupMap[category]) {
                   insertRow.group_id = categoryGroupMap[category];
                 }
               }
            }
            return insertRow;
          }));
          
          const validRowsToInsert = rowsToInsert.filter(Boolean);
          if (validRowsToInsert.length > 0) {
          }

          if (validRowsToInsert.length === 0) continue;

          const tableName = getTableName(entityType!);

          // ═══ Insert with auth-retry ═══
          let insertResult = await supabase
            .from(tableName)
            .insert(validRowsToInsert)
            .select('id');

          // Retry once on auth errors (token may have expired during long import)
          if (insertResult.error && (
            insertResult.error.message?.includes('JWT') ||
            insertResult.error.message?.includes('token') ||
            insertResult.error.message?.includes('401') ||
            insertResult.error.message?.includes('403')
          )) {
            console.warn('🔄 Auth error during batch, refreshing session and retrying...');
            await supabase.auth.refreshSession();
            insertResult = await supabase
              .from(tableName)
              .insert(validRowsToInsert)
              .select('id');
          }

          if (insertResult.error) {
            console.error(`Import batch error:`, insertResult.error);
            failed += batch.length;
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertResult.error.message}`);
          } else {
            imported += insertResult.data?.length || batch.length;
            // Track inserted IDs for rollback
            if (insertResult.data) {
              rollbackTracker.entityIds.push(...insertResult.data.map((r: any) => r.id));
              rollbackTracker.tableName = tableName;
            }
            
            // ---> Price Lists: SKIPPED for fabric_materials <---
            // price_list_items.product_id FK references 'products' table (not fabric_materials)
            // Extended prices are saved in custom_fields: _cost_price, _wholesale_price, _half_wholesale_price, _special_price
            if (false && entityType === 'products' && insertResult.data?.length > 0 && validRowsToInsert.length === insertResult.data.length) {
              try {
                const insertedProducts = insertResult.data;
                const priceListNames = ['سعر التكلفة', 'سعر الجملة', 'سعر نصف الجملة', 'السعر الخاص'];
                const priceListCodes = ['COST_PRICE', 'WHOLESALE', 'HALF_WHOLESALE', 'SPECIAL_PRICE'];
                
                // Fetch or Create Price Lists
                let priceListsMap = (state as any)._priceListsMap;
                if (!priceListsMap) {
                  priceListsMap = {};
                  for (let plIdx = 0; plIdx < priceListNames.length; plIdx++) {
                     const plName = priceListNames[plIdx];
                     const plCode = priceListCodes[plIdx];
                     const { data: existingPl } = await supabase.from('price_lists').select('id').eq('company_id', companyId).eq('name_ar', plName).maybeSingle();
                     if (existingPl) {
                       priceListsMap[plName] = existingPl.id;
                     } else {
                       const { data: newPl } = await supabase.from('price_lists').insert({ company_id: companyId, tenant_id: tenantId, name_ar: plName, name: plName, code: plCode, is_active: true, is_default: false }).select('id').single();
                       if (newPl) priceListsMap[plName] = newPl.id;
                     }
                  }
                  (state as any)._priceListsMap = priceListsMap;
                }

                const priceListItemsToInsert: any[] = [];
                for(let idx = 0; idx < validRowsToInsert.length; idx++) {
                  const insertedId = insertedProducts[idx].id;
                  const rowData = validRowsToInsert[idx] as any;
                  const customFields = rowData.custom_fields || {};
                  
                  const costPrice = Number(customFields._cost_price || 0);
                  const wholesalePrice = Number(customFields._wholesale_price || 0);
                  const halfWholesale = Number(customFields._half_wholesale_price || 0);
                  const specialPrice = Number(customFields._special_price || 0);

                  if (costPrice > 0 && priceListsMap['سعر التكلفة']) {
                    priceListItemsToInsert.push({
                      price_list_id: priceListsMap['سعر التكلفة'],
                      product_id: insertedId,
                      price: costPrice,
                      min_quantity: 0
                    });
                  }
                  if (wholesalePrice > 0 && priceListsMap['سعر الجملة']) {
                    priceListItemsToInsert.push({
                      price_list_id: priceListsMap['سعر الجملة'],
                      product_id: insertedId,
                      price: wholesalePrice,
                      min_quantity: 0
                    });
                  }
                  if (halfWholesale > 0 && priceListsMap['سعر نصف الجملة']) {
                    priceListItemsToInsert.push({
                      price_list_id: priceListsMap['سعر نصف الجملة'],
                      product_id: insertedId,
                      price: halfWholesale,
                      min_quantity: 0
                    });
                  }
                  if (specialPrice > 0 && priceListsMap['السعر الخاص']) {
                    priceListItemsToInsert.push({
                      price_list_id: priceListsMap['السعر الخاص'],
                      product_id: insertedId,
                      price: specialPrice,
                      min_quantity: 0
                    });
                  }
                }

                if (priceListItemsToInsert.length > 0) {
                  const { data: plData, error: plError } = await supabase.from('price_list_items').insert(priceListItemsToInsert).select('id');
                  if (plError) console.error('Failed to insert price lists:', plError);
                  else if (plData) rollbackTracker.priceListItemIds.push(...plData.map((r: any) => r.id));
                }
              } catch (pricingError) {
                console.error('Pricing lists logic error:', pricingError);
              }
            }
          }
        } catch (batchErr: any) {
          failed += batch.length;
          errors.push(`Batch error: ${batchErr?.message || 'Unknown'}`);
        }

        // ═══ ROLLBACK CHECK: If ALL rows in this batch failed, rollback everything ═══
        if (failed > 0 && imported === 0) {
          console.warn('🔄 All batches failed — initiating rollback...');
          updateState({ progress: -1 }); // Signal rollback in progress
          await performRollback(rollbackTracker);
          
          const finalJob: ImportJob = {
            ...(state.importJob || {} as ImportJob),
            imported_rows: 0,
            failed_rows: failed,
            total_rows: state.importRows.length,
            valid_rows: validRows.length,
            invalid_rows: state.importRows.length - validRows.length,
            status: 'failed',
            error_message: errors.join('\n') + '\n\n✅ تم التراجع عن جميع البيانات المُدخلة تلقائياً',
            completed_at: new Date().toISOString(),
          } as ImportJob;

          updateState({
            importJob: finalJob,
            currentStep: 'result',
            isLoading: false,
            progress: 100
          });
          return;
        }

        // تحديث التقدم
        updateState({
          progress: Math.round(((i + batch.length) / validRows.length) * 100)
        });
      }

      // ═══ PARTIAL FAILURE ROLLBACK: If some batches failed, rollback everything ═══
      if (failed > 0) {
        console.warn(`🔄 Partial failure (${imported} ok, ${failed} failed) — rolling back ALL to ensure data integrity...`);
        updateState({ progress: -1 });
        await performRollback(rollbackTracker);
        
        const finalJob: ImportJob = {
          ...(state.importJob || {} as ImportJob),
          imported_rows: 0,
          failed_rows: validRows.length,
          total_rows: state.importRows.length,
          valid_rows: validRows.length,
          invalid_rows: state.importRows.length - validRows.length,
          status: 'failed',
          error_message: errors.join('\n') + `\n\n🔄 تم التراجع عن ${imported} سجل تم إدخاله لضمان سلامة البيانات. يرجى إصلاح الأخطاء وإعادة المحاولة.`,
          completed_at: new Date().toISOString(),
        } as ImportJob;

        updateState({
          importJob: finalJob,
          currentStep: 'result',
          isLoading: false,
          progress: 100
        });
        return;
      }

      // ─── إنشاء قيد الأرصدة الافتتاحية ───
      let openingBalanceJournalRef = '';
      let openingBalanceJournalIds: string[] = [];
      if (imported > 0 && (entityType === 'customers' || entityType === 'suppliers' || entityType === 'products')) {
        try {
          const result = await createOpeningBalanceJournal(
            entityType,
            validRows,
            companyId,
            tenantId
          );
          openingBalanceJournalRef = result.refs;
          openingBalanceJournalIds = result.journalIds;
        } catch (obErr: any) {
          console.warn('Opening balance journal error:', obErr);
          errors.push(`تحذير: فشل إنشاء قيد الأرصدة الافتتاحية: ${obErr?.message || 'خطأ'}`);
        }
      }

      // ─── إنشاء حركات مخزون افتتاحية للمنتجات ───
      if (imported > 0 && entityType === 'products') {
        try {
          const stockWarnings = await createOpeningStockMovements(
            validRows,
            companyId,
            tenantId,
            rollbackTracker.entityIds,
            warehouseBreakdown,  // per-warehouse quantity breakdown
            openingBalanceJournalIds[0] || undefined  // link to PROD journal entry
          );
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

      // ═══ CACHE INVALIDATION: Force clean fetch for all related data ═══
      try {
        // REMOVE inventory caches completely (not just invalidate) to force fresh fetch
        queryClient.removeQueries({ queryKey: ['inventory-preload-materials', companyId] });
        queryClient.removeQueries({ queryKey: ['inventory-preload-rolls', companyId] });
        queryClient.removeQueries({ queryKey: ['inventory-preload-stock', companyId] });
        // Remove material-inventory caches (material card per-warehouse breakdown)
        queryClient.removeQueries({ queryKey: ['material-inventory'] });
        // Invalidate other related caches
        queryClient.invalidateQueries({ queryKey: ['materials'] });
        queryClient.invalidateQueries({ queryKey: ['material-groups'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
        console.log('✅ Caches cleared after import — inventory will refetch on next visit');
      } catch (cacheErr) {
        console.warn('Cache invalidation error:', cacheErr);
      }
    } catch (error: any) {
      updateState({
        error: `فشل في تنفيذ الاستيراد: ${error?.message || 'خطأ غير معروف'}`,
        isLoading: false,
        currentStep: 'validation'
      });
    }
  }, [state.importJob, state.importRows, state.entityType, state.options, state.warehouseBreakdown, companyId, tenantId, updateState]);

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
    updateOptions,
    // Warehouse conflict resolution (Task 4)
    updateWarehouseResolution,
    resolveWarehouseConflicts,
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

    case 'products': {
      const origCode = clean(data.code) || '';
      const uniqueCode = `MAT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        company_id: companyId,
        tenant_id: tenantId,
        code: uniqueCode,
        name_ar: clean(data.name_ar) || clean(data.name_en) || clean(data.name_tr) || clean(data.name_ru) || clean(data.name_uk) || String(data.name || ''),
        name_en: clean(data.name_en) || clean(data.name_ar) || String(data.name || ''),
        name_tr: clean(data.name_tr),
        name_ru: clean(data.name_ru),
        name_uk: clean(data.name_uk),
        category: clean(data.category),
        unit: clean(data.unit) || 'meter',
        selling_price: num(data.sale_price),
        purchase_price: num(data.purchase_price) || 0,
        currency: clean(data.currency) || companyCurrency,
        min_stock: num(data.min_qty || data.min_stock),
        current_stock: num(data.opening_qty),
        notes: clean(data.notes) || clean(data.description),
        status: 'active',
        custom_fields: {
          original_code: origCode,
          barcode: data.barcode ? String(data.barcode) : '',
          _cost_price: num(data.cost_price) || 0,
          _wholesale_price: num(data.wholesale_price) || 0,
          _half_wholesale_price: num(data.half_wholesale_price) || 0,
          _special_price: num(data.special_price) || 0,
        },
        // warehouse_code is stored in mapped_data for stock creation
      };
    }

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
): Promise<{ refs: string; journalIds: string[] }> {
  // ─── 1. البحث عن حساب الأرصدة الافتتاحية (كود 35) ───
  const { data: obAccount } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code')
    .eq('company_id', companyId)
    .eq('account_code', '35')
    .maybeSingle();

  if (!obAccount) {
    console.warn('Opening balance account (35) not found, skipping journal entry');
    return { refs: '', journalIds: [] };
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
    if (codes.length === 0) return { refs: '', journalIds: [] };

    const { data: customers } = await supabase
      .from('customers')
      .select('id, code, name_ar, balance, currency, receivable_account_id')
      .eq('company_id', companyId)
      .in('code', codes);

    if (!customers) return { refs: '', journalIds: [] };

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
    if (codes.length === 0) return { refs: '', journalIds: [] };

    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, code, name_ar, balance, currency, payable_account_id')
      .eq('company_id', companyId)
      .in('code', codes);

    if (!suppliers) return { refs: '', journalIds: [] };

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
      return { refs: '', journalIds: [] };
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

  if (linesByCurrency.size === 0) return { refs: '', journalIds: [] };

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
  const createdIds: string[] = [];

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
    createdIds.push(journalEntry.id);
  }

  return { refs: createdRefs.join(', '), journalIds: createdIds };
}

/**
 * إنشاء حركات مخزون افتتاحية للمنتجات المستوردة
 * يجلب المواد المُدرجة حديثاً بالـ DB IDs ويُنشئ حركة "opening_balance" لكل مادة بـ current_stock > 0
 * يستخدم أول مستودع متاح إذا لم يُحدد في CSV
 */
async function createOpeningStockMovements(
  importRows: ImportRow[],
  companyId: string,
  tenantId: string,
  insertedIds?: string[],
  warehouseBreakdown?: Record<string, { warehouse_code: string; qty: number; unit_cost: number }[]>,
  journalEntryId?: string
): Promise<string[]> {
  const warnings: string[] = [];

  // 1. جلب المواد المُدرجة حديثاً من قاعدة البيانات بالـ DB IDs
  let dbMaterials: { id: string; code: string; name_ar: string; current_stock: number; default_warehouse_id: string | null; custom_fields: any }[] = [];

  if (insertedIds && insertedIds.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < insertedIds.length; i += batchSize) {
      const batch = insertedIds.slice(i, i + batchSize);
      const { data } = await supabase
        .from('fabric_materials')
        .select('id, code, name_ar, current_stock, default_warehouse_id, custom_fields')
        .in('id', batch);
      if (data) dbMaterials.push(...data);
    }
  }

  const materialsWithStock = dbMaterials.filter(m => (m.current_stock || 0) > 0);
  if (materialsWithStock.length === 0) {
    console.log('ℹ️ No materials with opening stock — skipping movements');
    return warnings;
  }

  // 2. جلب كل المستودعات المتاحة
  const { data: allWarehouses } = await supabase
    .from('warehouses')
    .select('id, code')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (!allWarehouses || allWarehouses.length === 0) {
    warnings.push('❌ لا توجد مستودعات — لم يتم إنشاء حركات المخزون');
    return warnings;
  }

  const warehouseByCode: Record<string, string> = {};
  allWarehouses.forEach(w => { warehouseByCode[w.code] = w.id; });
  const defaultWhId = allWarehouses[0].id;
  const defaultWhCode = allWarehouses[0].code;

  warnings.push(`ℹ️ المستودعات المتاحة: ${allWarehouses.map(w => w.code).join(', ')}`);

  // 3. إنشاء حركات المخزون — مع دعم متعدد المستودعات
  const movDate = new Date().toISOString().split('T')[0];
  const movements: any[] = [];
  let movIdx = 0;

  for (const mat of materialsWithStock) {
    // البحث عن الكود الأصلي من custom_fields
    const origCode = mat.custom_fields?.original_code || '';

    // هل يوجد تفصيل مستودعات لهذه المادة؟
    const breakdown = warehouseBreakdown?.[origCode];
    
    // Also try matching by mat.code if origCode lookup failed
    const breakdownAlt = !breakdown ? warehouseBreakdown?.[mat.code] : null;
    const finalBreakdown = breakdown || breakdownAlt;
    
    console.log(`🔍 Material ${mat.code} (orig: ${origCode}): breakdown=${finalBreakdown ? finalBreakdown.length + ' warehouses' : 'NONE (default warehouse only)'}`);
    if (!finalBreakdown && Object.keys(warehouseBreakdown || {}).length > 0) {
      console.warn(`  ⚠️ Available breakdown keys: ${Object.keys(warehouseBreakdown || {}).slice(0, 5).join(', ')}...`);
    }

    if (finalBreakdown && finalBreakdown.length > 0) {
      // ═══ حركة لكل مستودع (multi-warehouse) ═══
      let runningBalance = 0;
      for (const entry of finalBreakdown) {
        const whId = warehouseByCode[entry.warehouse_code] || defaultWhId;
        movIdx++;
        const balanceBefore = runningBalance;
        runningBalance += entry.qty;

        movements.push({
          tenant_id: tenantId,
          company_id: companyId,
          movement_number: `MOV-OB-${movDate}-${String(movIdx).padStart(4, '0')}`,
          material_id: mat.id,
          to_warehouse_id: whId,
          movement_type: 'receipt',
          quantity: entry.qty,
          unit_cost: entry.unit_cost,
          total_cost: entry.qty * entry.unit_cost,
          reference_type: 'opening_balance',
          reference_number: `OB-IMPORT-${movDate}`,
          reference_id: journalEntryId || null,
          notes: `رصيد افتتاحي — ${origCode} → ${entry.warehouse_code} (${entry.qty})`,
          movement_date: movDate,
          balance_before: balanceBefore,
          balance_after: runningBalance,
        });
      }
    } else {
      // ═══ حركة واحدة للمستودع الافتراضي ═══
      const matchRow = importRows.find(r => {
        const d = r.mapped_data || {};
        return String(d.name_ar || '').trim() === mat.name_ar?.trim();
      });
      const unitCost = Number(matchRow?.mapped_data?.cost_price || matchRow?.mapped_data?.purchase_price || 0);
      const whId = mat.default_warehouse_id || defaultWhId;
      movIdx++;

      movements.push({
        tenant_id: tenantId,
        company_id: companyId,
        movement_number: `MOV-OB-${movDate}-${String(movIdx).padStart(4, '0')}`,
        material_id: mat.id,
        to_warehouse_id: whId,
        movement_type: 'receipt',
        quantity: mat.current_stock,
        unit_cost: unitCost,
        total_cost: mat.current_stock * unitCost,
        reference_type: 'opening_balance',
        reference_number: `OB-IMPORT-${movDate}`,
        reference_id: journalEntryId || null,
        notes: `رصيد افتتاحي — استيراد: ${mat.code}`,
        movement_date: movDate,
        balance_before: 0,
        balance_after: mat.current_stock,
      });
    }
  }

  if (movements.length === 0) return warnings;

  // 4. إدراج الحركات على دفعات
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

  // 5. تحديث default_warehouse_id لأول مستودع في breakdown
  for (const mat of materialsWithStock) {
    if (mat.default_warehouse_id) continue;
    const origCode2 = mat.custom_fields?.original_code || '';
    const bd2 = warehouseBreakdown?.[origCode2] || warehouseBreakdown?.[mat.code];
    const firstWhCode = bd2?.[0]?.warehouse_code;
    const whId = firstWhCode ? (warehouseByCode[firstWhCode] || defaultWhId) : defaultWhId;
    await supabase
      .from('fabric_materials')
      .update({ default_warehouse_id: whId })
      .eq('id', mat.id);
  }

  const whCount = new Set(movements.map(m => m.to_warehouse_id)).size;
  console.log(`✅ Created ${movements.length} opening inventory movements across ${whCount} warehouse(s)`);
  warnings.push(`✅ تم إنشاء ${movements.length} حركة مخزون افتتاحية في ${whCount} مستودع`);
  return warnings;
}
