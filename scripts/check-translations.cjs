/**
 * ═══════════════════════════════════════════════════════
 * 🌐 Translation Keys Checker
 * ═══════════════════════════════════════════════════════
 * يتحقق أن كل المفاتيح في en.json موجودة في ru.json و uk.json
 * يشغّل بأمر: node scripts/check-translations.js
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const refLang = 'en'; // اللغة المرجعية
const checkLangs = ['ru', 'uk', 'ar']; // اللغات المراد فحصها

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

// تحميل الملفات
const files = {};
[refLang, ...checkLangs].forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  try {
    files[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`❌ لا يمكن قراءة ${lang}.json`);
  }
});

const refKeys = getAllKeys(files[refLang]);
console.log(`\n📊 ملخص الترجمات:`);
console.log(`   المرجع (${refLang}): ${refKeys.length} مفتاح\n`);

let hasErrors = false;

checkLangs.forEach(lang => {
  if (!files[lang]) return;

  const langKeys = getAllKeys(files[lang]);
  const missing = refKeys.filter(k => !langKeys.includes(k));
  const extra = langKeys.filter(k => !refKeys.includes(k));

  // فحص الترجمات الفارغة
  const empty = langKeys.filter(k => {
    const val = getNestedValue(files[lang], k);
    return val === '' || val === null;
  });

  // فحص الترجمات المتروكة بالإنجليزية
  const untranslated = langKeys.filter(k => {
    const val = getNestedValue(files[lang], k);
    const refVal = getNestedValue(files[refLang], k);
    return typeof val === 'string' && typeof refVal === 'string'
      && val === refVal && lang !== 'en' && val.length > 2;
  });

  const status = missing.length === 0 ? '✅' : '⚠️';
  console.log(`${status} ${lang}.json: ${langKeys.length} مفتاح`);

  if (missing.length > 0) {
    hasErrors = true;
    console.log(`   ❌ مفاتيح ناقصة: ${missing.length}`);
    missing.slice(0, 15).forEach(k => console.log(`      - ${k}`));
    if (missing.length > 15) console.log(`      ... و ${missing.length - 15} مفتاح آخر`);
  }

  if (empty.length > 0) {
    console.log(`   ⚠️  قيم فارغة: ${empty.length}`);
    empty.slice(0, 5).forEach(k => console.log(`      - ${k}`));
  }

  if (untranslated.length > 0) {
    console.log(`   🔤 غير مترجم (نفس الإنجليزية): ${untranslated.length}`);
    untranslated.slice(0, 10).forEach(k => console.log(`      - ${k} = "${getNestedValue(files[lang], k)}"`));
    if (untranslated.length > 10) console.log(`      ... و ${untranslated.length - 10} مفتاح آخر`);
  }

  if (extra.length > 0) {
    console.log(`   ℹ️  مفاتيح إضافية (غير موجودة في ${refLang}): ${extra.length}`);
  }

  console.log('');
});

// فحص صحة JSON
console.log('🔍 فحص صحة ملفات JSON:');
[refLang, ...checkLangs].forEach(lang => {
  try {
    JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8'));
    console.log(`   ✅ ${lang}.json — صالح`);
  } catch (e) {
    hasErrors = true;
    console.log(`   ❌ ${lang}.json — خطأ: ${e.message}`);
  }
});

console.log(hasErrors ? '\n⚠️  يوجد مشاكل يجب حلها!' : '\n🎉 كل شيء ممتاز!');
process.exit(hasErrors ? 1 : 0);
