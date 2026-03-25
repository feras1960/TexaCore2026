/**
 * Template Generator - مولّد قوالب الاستيراد
 * ==========================================
 * ينشئ ملفات Excel جاهزة للتحميل مع:
 * - ورقة البيانات (عناوين + صف مثال)
 * - ورقة التعليمات (شرح كل حقل)
 * - يدعم 5 لغات
 */

import * as XLSX from 'xlsx';
import { TEMPLATE_CONFIGS, SUPPORTED_LANGUAGES, type TemplateLang, type TemplateConfig } from './templateConfig';

/**
 * توليد ملف Excel قالب لنوع كيان بلغة محددة
 */
export function generateTemplateFile(entityType: string, lang: TemplateLang): Blob | null {
    const config = TEMPLATE_CONFIGS[entityType];
    if (!config) return null;

    const wb = XLSX.utils.book_new();

    // ─── ورقة البيانات ────────────────────────────────────────
    const headers = config.columns.map(col => col.label[lang]);
    const fieldNames = config.columns.map(col => col.field);
    const exampleRow = config.columns.map(col => col.example);

    const wsData = [
        fieldNames,  // الصف 1: أسماء الحقول التقنية (يستخدمها المعالج)
        headers,     // الصف 2: عناوين مقروءة
        exampleRow,  // الصف 3: مثال
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // تنسيق عرض الأعمدة
    ws['!cols'] = headers.map(h => ({ wch: Math.max(String(h).length + 4, 15) }));

    // تمييز الصفوف
    const dataSheetName = lang === 'ar' ? 'البيانات' :
        lang === 'tr' ? 'Veriler' :
            lang === 'ru' ? 'Данные' :
                lang === 'uk' ? 'Дані' : 'Data';

    XLSX.utils.book_append_sheet(wb, ws, dataSheetName);

    // ─── ورقة التعليمات ───────────────────────────────────────
    const instrTitle = lang === 'ar' ? 'تعليمات الاستيراد' :
        lang === 'tr' ? 'İçe Aktarma Talimatları' :
            lang === 'ru' ? 'Инструкция по импорту' :
                lang === 'uk' ? 'Інструкція з імпорту' : 'Import Instructions';

    const reqFieldsTitle = lang === 'ar' ? 'الحقول المطلوبة:' :
        lang === 'tr' ? 'Zorunlu alanlar:' :
            lang === 'ru' ? 'Обязательные поля:' :
                lang === 'uk' ? 'Обов\'язкові поля:' : 'Required fields:';

    const fieldDescTitle = lang === 'ar' ? 'شرح الحقول:' :
        lang === 'tr' ? 'Alan açıklamaları:' :
            lang === 'ru' ? 'Описание полей:' :
                lang === 'uk' ? 'Опис полів:' : 'Field descriptions:';

    const fieldHeader = lang === 'ar' ? 'الحقل' :
        lang === 'tr' ? 'Alan' :
            lang === 'ru' ? 'Поле' :
                lang === 'uk' ? 'Поле' : 'Field';

    const descHeader = lang === 'ar' ? 'الوصف' :
        lang === 'tr' ? 'Açıklama' :
            lang === 'ru' ? 'Описание' :
                lang === 'uk' ? 'Опис' : 'Description';

    const exampleHeader = lang === 'ar' ? 'مثال' :
        lang === 'tr' ? 'Örnek' :
            lang === 'ru' ? 'Пример' :
                lang === 'uk' ? 'Приклад' : 'Example';

    const instrData: (string | number)[][] = [
        [instrTitle],
        [''],
        // التعليمات
        ...config.instructions[lang].map(inst => [`• ${inst}`]),
        [''],
        // الحقول المطلوبة
        [reqFieldsTitle],
        ...config.columns
            .filter(c => c.required)
            .map(c => [`  ✱ ${c.label[lang]}`]),
        [''],
        // شرح الحقول
        [fieldDescTitle],
        [fieldHeader, descHeader, exampleHeader],
        ...config.columns.map(col => [
            col.label[lang],
            col.description[lang],
            String(col.example)
        ]),
    ];

    const instrWs = XLSX.utils.aoa_to_sheet(instrData);
    instrWs['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 25 }];

    const instrSheetName = lang === 'ar' ? 'تعليمات' :
        lang === 'tr' ? 'Talimatlar' :
            lang === 'ru' ? 'Инструкция' :
                lang === 'uk' ? 'Інструкція' : 'Instructions';

    XLSX.utils.book_append_sheet(wb, instrWs, instrSheetName);

    // ─── تصدير ────────────────────────────────────────────────
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
}

/**
 * تحميل القالب على جهاز المستخدم
 */
export function downloadTemplate(entityType: string, lang: TemplateLang): boolean {
    const config = TEMPLATE_CONFIGS[entityType];
    if (!config) return false;

    const blob = generateTemplateFile(entityType, lang);
    if (!blob) return false;

    const fileName = `${config.file_name}.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    return true;
}
