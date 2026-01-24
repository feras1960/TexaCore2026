#!/usr/bin/env node

/**
 * 🔍 Texa Core Translation Check Script
 * 
 * Validates all translation files and reports issues.
 * Run: npm run check:translations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SUPPORTED_LANGS = ['ar', 'en', 'de', 'tr', 'ru', 'uk', 'it', 'pl', 'ro'];

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

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

function getByPath(obj, path) {
  return path.split('.').reduce((o, p) => o?.[p], obj);
}

function checkTranslations() {
  log(colors.cyan, '\n🔍 Texa Core Translation Check\n');
  log(colors.blue, '═'.repeat(50));
  
  const langData = {};
  const langKeys = {};
  let hasErrors = false;
  
  // Load all language files
  for (const lang of SUPPORTED_LANGS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    langData[lang] = readJSON(filePath);
    
    if (!langData[lang]) {
      log(colors.red, `❌ Cannot read ${lang}.json`);
      hasErrors = true;
      continue;
    }
    
    langKeys[lang] = getAllKeys(langData[lang]);
  }
  
  // Get union of all keys
  const allKeys = new Set();
  for (const lang of SUPPORTED_LANGS) {
    if (langKeys[lang]) {
      langKeys[lang].forEach(k => allKeys.add(k));
    }
  }
  
  log(colors.green, `\n📊 Total unique keys: ${allKeys.size}\n`);
  
  // Check each language
  const issues = {};
  const placeholders = {};
  
  for (const lang of SUPPORTED_LANGS) {
    if (!langData[lang]) continue;
    
    issues[lang] = { missing: [], placeholder: [] };
    
    for (const key of allKeys) {
      const value = getByPath(langData[lang], key);
      
      if (value === undefined) {
        issues[lang].missing.push(key);
      } else if (typeof value === 'string') {
        if (value.startsWith('[') || value.startsWith('__NEEDS_TRANSLATION__')) {
          issues[lang].placeholder.push(key);
        }
      }
    }
    
    placeholders[lang] = issues[lang].placeholder.length;
  }
  
  // Report
  const langFlags = {
    ar: '🇸🇦', en: '🇬🇧', de: '🇩🇪', tr: '🇹🇷', ru: '🇷🇺',
    uk: '🇺🇦', it: '🇮🇹', pl: '🇵🇱', ro: '🇷🇴'
  };
  
  for (const lang of SUPPORTED_LANGS) {
    if (!langData[lang]) continue;
    
    const flag = langFlags[lang] || '🌐';
    const missing = issues[lang].missing.length;
    const placeholder = issues[lang].placeholder.length;
    const total = langKeys[lang].length;
    const complete = total - missing - placeholder;
    const percentage = ((complete / allKeys.size) * 100).toFixed(1);
    
    let status = '✅';
    let color = colors.green;
    
    if (missing > 0 || placeholder > 0) {
      status = '⚠️';
      color = colors.yellow;
      hasErrors = true;
    }
    
    log(color, `\n${flag} ${lang.toUpperCase()} - ${percentage}% complete ${status}`);
    log(colors.reset, `   Total: ${total} | Complete: ${complete} | Placeholders: ${placeholder} | Missing: ${missing}`);
    
    // Show first 5 placeholders if any
    if (placeholder > 0 && placeholder <= 10) {
      log(colors.yellow, `   Placeholders:`);
      issues[lang].placeholder.slice(0, 5).forEach(k => {
        log(colors.reset, `     - ${k}`);
      });
      if (placeholder > 5) {
        log(colors.reset, `     ... and ${placeholder - 5} more`);
      }
    }
  }
  
  // Summary
  log(colors.blue, '\n' + '═'.repeat(50));
  
  const totalPlaceholders = Object.values(placeholders).reduce((a, b) => a + b, 0);
  
  if (hasErrors) {
    log(colors.yellow, `\n⚠️  Total placeholders needing translation: ${totalPlaceholders}`);
    log(colors.reset, '\nRun `npm run sync:translations` to fix missing keys.');
    log(colors.reset, 'Then manually translate the placeholder values.\n');
    process.exit(1);
  } else {
    log(colors.green, '\n✅ All translations are complete!\n');
    process.exit(0);
  }
}

checkTranslations();
