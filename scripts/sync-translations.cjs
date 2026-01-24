#!/usr/bin/env node

/**
 * 🌍 Texa Core Translation Synchronization Script
 * 
 * This script ensures all 9 language files have the same keys.
 * Run: npm run sync:translations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const BASE_LANG = 'en'; // English as base
const SUPPORTED_LANGS = ['ar', 'en', 'de', 'tr', 'ru', 'uk', 'it', 'pl', 'ro'];

// Colors for console output
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

// Read JSON file
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(colors.red, `Error reading ${filePath}: ${error.message}`);
    return null;
  }
}

// Write JSON file
function writeJSON(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    log(colors.red, `Error writing ${filePath}: ${error.message}`);
    return false;
  }
}

// Get all keys from an object (nested)
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

// Set value by path
function setByPath(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  if (current && typeof current === 'object') {
    current[parts[parts.length - 1]] = value;
  }
}

// Get value by path
function getByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// Sort object keys alphabetically (nested)
function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortObject(obj[key]);
  }
  return sorted;
}

// Main sync function
function syncTranslations() {
  log(colors.cyan, '\n🌍 Texa Core Translation Sync\n');
  log(colors.blue, '═'.repeat(50));
  
  // Read base language file
  const basePath = path.join(LOCALES_DIR, `${BASE_LANG}.json`);
  const baseData = readJSON(basePath);
  
  if (!baseData) {
    log(colors.red, `❌ Cannot read base language file: ${BASE_LANG}.json`);
    process.exit(1);
  }
  
  const baseKeys = getAllKeys(baseData);
  log(colors.green, `\n📊 Base language (${BASE_LANG}): ${baseKeys.length} keys\n`);
  
  let totalMissing = 0;
  let totalExtra = 0;
  let totalPlaceholders = 0;
  
  // Process each language
  for (const lang of SUPPORTED_LANGS) {
    if (lang === BASE_LANG) continue;
    
    const langPath = path.join(LOCALES_DIR, `${lang}.json`);
    let langData = readJSON(langPath);
    
    if (!langData) {
      log(colors.yellow, `⚠️  Creating new file for ${lang}`);
      langData = {};
    }
    
    const langKeys = getAllKeys(langData);
    const missingKeys = baseKeys.filter(k => !langKeys.includes(k));
    const extraKeys = langKeys.filter(k => !baseKeys.includes(k));
    
    // Find placeholder keys (values starting with [ or __ )
    const placeholderKeys = langKeys.filter(k => {
      const value = getByPath(langData, k);
      return typeof value === 'string' && (
        value.startsWith('[') || 
        value.startsWith('__NEEDS_TRANSLATION__')
      );
    });
    
    // Add missing keys with placeholder
    for (const key of missingKeys) {
      const baseValue = getByPath(baseData, key);
      const placeholder = `[${lang.toUpperCase()}] ${baseValue}`;
      setByPath(langData, key, placeholder);
    }
    
    // Remove extra keys that don't exist in base
    for (const key of extraKeys) {
      // Remove key safely
      const parts = key.split('.');
      let current = langData;
      let valid = true;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current || typeof current !== 'object' || !current[parts[i]]) {
          valid = false;
          break;
        }
        current = current[parts[i]];
      }
      if (valid && current && typeof current === 'object') {
        delete current[parts[parts.length - 1]];
      }
    }
    
    // Sort and write
    langData = sortObject(langData);
    writeJSON(langPath, langData);
    
    // Report
    const langFlag = {
      ar: '🇸🇦',
      en: '🇬🇧',
      de: '🇩🇪',
      tr: '🇹🇷',
      ru: '🇷🇺',
      uk: '🇺🇦',
      it: '🇮🇹',
      pl: '🇵🇱',
      ro: '🇷🇴',
    };
    
    const status = missingKeys.length === 0 && placeholderKeys.length === 0 
      ? '✅' 
      : placeholderKeys.length > 0 
        ? '⚠️' 
        : '🔧';
    
    log(colors.blue, `\n${langFlag[lang] || '🌐'} ${lang.toUpperCase()}`);
    log(colors.reset, `   Keys: ${langKeys.length}`);
    
    if (missingKeys.length > 0) {
      log(colors.yellow, `   Missing: ${missingKeys.length} (added with placeholder)`);
      totalMissing += missingKeys.length;
    }
    
    if (extraKeys.length > 0) {
      log(colors.red, `   Extra: ${extraKeys.length} (removed)`);
      totalExtra += extraKeys.length;
    }
    
    if (placeholderKeys.length > 0) {
      log(colors.yellow, `   Placeholders: ${placeholderKeys.length} (need translation)`);
      totalPlaceholders += placeholderKeys.length;
    }
    
    log(colors.reset, `   Status: ${status}`);
  }
  
  // Summary
  log(colors.blue, '\n' + '═'.repeat(50));
  log(colors.cyan, '\n📊 Summary:\n');
  log(colors.green, `   Base keys: ${baseKeys.length}`);
  log(colors.yellow, `   Added missing: ${totalMissing}`);
  log(colors.red, `   Removed extra: ${totalExtra}`);
  log(colors.yellow, `   Placeholders remaining: ${totalPlaceholders}`);
  
  if (totalPlaceholders > 0) {
    log(colors.yellow, `\n⚠️  There are ${totalPlaceholders} keys that need proper translation.`);
    log(colors.reset, '   Run `npm run check:translations` to see details.\n');
    process.exit(1);
  } else {
    log(colors.green, '\n✅ All translations are synchronized!\n');
    process.exit(0);
  }
}

// Run
syncTranslations();
