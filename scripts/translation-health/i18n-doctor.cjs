#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * 🩺 i18n Doctor — Interactive Translation Health Manager
 * ═══════════════════════════════════════════════════════════════
 * 
 * A single interactive tool that:
 *   1. Checks structure parity (all locales have same keys)
 *   2. Checks translation health (missing, empty, untranslated)
 *   3. Explains any problems found in plain language
 *   4. Offers to auto-fix issues using sync-translations.py
 * 
 * Usage:
 *   npm run i18n:doctor              # Interactive mode
 *   npm run i18n:doctor -- --check   # Check only (no prompts, CI-friendly)
 *   npm run i18n:doctor -- --fix     # Auto-fix without prompting
 *   npm run i18n:doctor -- --fix --lang de fr  # Fix specific languages
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

// ════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'src/i18n/locales');
const SYNC_SCRIPT = path.join(__dirname, 'sync-translations.py');
const REF_LANG = 'en';

// ════════════════════════════════════════════
// CLI Colors & Formatting
// ════════════════════════════════════════════
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function banner() {
  console.log('');
  console.log(`${c.cyan}${c.bold}  ╔═══════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}${c.bold}  ║         🩺 i18n Doctor — Translation Health       ║${c.reset}`);
  console.log(`${c.cyan}${c.bold}  ╚═══════════════════════════════════════════════════╝${c.reset}`);
  console.log('');
}

function sectionHeader(icon, title) {
  console.log(`${c.bold}${c.blue}  ── ${icon} ${title} ${'─'.repeat(Math.max(0, 42 - title.length))}${c.reset}`);
  console.log('');
}

function success(msg) { console.log(`  ${c.green}✅ ${msg}${c.reset}`); }
function warn(msg)    { console.log(`  ${c.yellow}⚠️  ${msg}${c.reset}`); }
function error(msg)   { console.log(`  ${c.red}❌ ${msg}${c.reset}`); }
function info(msg)    { console.log(`  ${c.cyan}ℹ️  ${msg}${c.reset}`); }
function dim(msg)     { console.log(`  ${c.dim}${msg}${c.reset}`); }

// ════════════════════════════════════════════
// Key Extraction Helpers
// ════════════════════════════════════════════
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj).sort()) {
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

// ════════════════════════════════════════════
// User Prompt Helper
// ════════════════════════════════════════════
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`  ${c.magenta}❓ ${question}${c.reset} `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ════════════════════════════════════════════
// Phase 1: Load & Validate JSON Files
// ════════════════════════════════════════════
function loadLocales() {
  const files = fs.readdirSync(LOCALES_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('wizard-') && !f.includes('_fixed') && !f.includes('.broken'));

  const locales = {};
  const jsonErrors = [];

  for (const file of files) {
    const lang = file.replace('.json', '');
    try {
      locales[lang] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
    } catch (e) {
      jsonErrors.push({ lang, error: e.message });
    }
  }

  return { locales, jsonErrors };
}

// ════════════════════════════════════════════
// Phase 2: Structure Check
// ════════════════════════════════════════════
function checkStructure(locales) {
  const refKeys = new Set(getAllKeys(locales[REF_LANG]));
  const results = {};

  for (const lang of Object.keys(locales).sort()) {
    if (lang === REF_LANG) continue;
    const langKeys = new Set(getAllKeys(locales[lang]));
    const missing = [...refKeys].filter(k => !langKeys.has(k));
    const extra = [...langKeys].filter(k => !refKeys.has(k));
    results[lang] = { total: langKeys.size, missing, extra };
  }

  return { refCount: refKeys.size, results };
}

// ════════════════════════════════════════════
// Phase 3: Translation Quality Check
// ════════════════════════════════════════════
function checkQuality(locales) {
  const refKeys = getAllKeys(locales[REF_LANG]);
  const results = {};

  for (const lang of Object.keys(locales).sort()) {
    if (lang === REF_LANG) continue;
    const langKeys = getAllKeys(locales[lang]);

    // Empty values
    const empty = langKeys.filter(k => {
      const val = getNestedValue(locales[lang], k);
      return val === '' || val === null;
    });

    // Untranslated (same as English, excluding brand names, URLs, etc.)
    const untranslated = langKeys.filter(k => {
      const val = getNestedValue(locales[lang], k);
      const refVal = getNestedValue(locales[REF_LANG], k);
      return typeof val === 'string' && typeof refVal === 'string'
        && val === refVal && val.length > 2;
    });

    results[lang] = { empty, untranslated };
  }

  return results;
}

// ════════════════════════════════════════════
// Diagnosis: Explain Problems
// ════════════════════════════════════════════
function diagnose(structureResults, qualityResults, jsonErrors) {
  const issues = [];

  // JSON errors
  for (const { lang, error } of jsonErrors) {
    issues.push({
      lang, severity: 'critical', type: 'json_invalid',
      title: `${lang.toUpperCase()}.json has invalid JSON syntax`,
      explanation: `The file cannot be parsed. Error: ${error}`,
      fix: `The sync script will rebuild it from en.json with proper translations.`,
    });
  }

  // Structure issues
  for (const [lang, data] of Object.entries(structureResults.results)) {
    if (data.missing.length > 0) {
      issues.push({
        lang, severity: 'high', type: 'missing_keys',
        title: `${lang.toUpperCase()} is missing ${data.missing.length} keys`,
        explanation: `These keys exist in en.json but not in ${lang}.json. This means some UI text will fall back to English or show raw key names.`,
        examples: data.missing.slice(0, 5),
        fix: `The sync script will add these keys and auto-translate them.`,
      });
    }
    if (data.extra.length > 0) {
      issues.push({
        lang, severity: 'low', type: 'extra_keys',
        title: `${lang.toUpperCase()} has ${data.extra.length} extra keys`,
        explanation: `These keys exist in ${lang}.json but NOT in en.json. They are orphaned and unused.`,
        examples: data.extra.slice(0, 5),
        fix: `The sync script will remove orphaned keys to keep files clean.`,
      });
    }
  }

  // Quality issues
  for (const [lang, data] of Object.entries(qualityResults)) {
    if (data.empty.length > 0) {
      issues.push({
        lang, severity: 'high', type: 'empty_values',
        title: `${lang.toUpperCase()} has ${data.empty.length} empty values`,
        explanation: `These keys exist but have empty ("") or null values. The UI will show blank text.`,
        examples: data.empty.slice(0, 5),
        fix: `The sync script will detect empty values and translate them.`,
      });
    }
    if (data.untranslated.length > 0) {
      const severity = data.untranslated.length > 100 ? 'medium' : 'low';
      issues.push({
        lang, severity, type: 'untranslated',
        title: `${lang.toUpperCase()} has ${data.untranslated.length} untranslated values`,
        explanation: `These keys have the same value as English — they haven't been translated yet. Some may be intentional (e.g., brand names like "KPI", "CRM").`,
        examples: data.untranslated.slice(0, 5).map(k => `${k} = "${getNestedValue({}, k) || '...'}"`),
        fix: `The sync script will translate these using Google Translate.`,
      });
    }
  }

  return issues;
}

// ════════════════════════════════════════════
// Display Results
// ════════════════════════════════════════════
function displayResults(structureResults, qualityResults, jsonErrors, issues) {
  // ─── Structure Table ───
  sectionHeader('🏗️', 'Structure Check');

  const refCount = structureResults.refCount;
  console.log(`  Reference: ${c.bold}${REF_LANG}${c.reset} (${c.cyan}${refCount}${c.reset} keys)\n`);

  console.log(`  ${c.dim}┌────────┬────────┬──────────┬──────────┬──────────────┐${c.reset}`);
  console.log(`  ${c.dim}│${c.reset} ${c.bold}Lang${c.reset}   ${c.dim}│${c.reset} ${c.bold}Keys${c.reset}   ${c.dim}│${c.reset} ${c.bold}Missing${c.reset}  ${c.dim}│${c.reset} ${c.bold}Extra${c.reset}    ${c.dim}│${c.reset} ${c.bold}Structure${c.reset}    ${c.dim}│${c.reset}`);
  console.log(`  ${c.dim}├────────┼────────┼──────────┼──────────┼──────────────┤${c.reset}`);

  for (const [lang, data] of Object.entries(structureResults.results).sort()) {
    const icon = data.missing.length === 0 && data.extra.length === 0 ? `${c.green}✅ 100%${c.reset}` : `${c.red}⚠️  ${((data.total / refCount) * 100).toFixed(0)}%${c.reset}`;
    const missingStr = data.missing.length === 0 ? `${c.green}0${c.reset}` : `${c.red}${data.missing.length}${c.reset}`;
    const extraStr = data.extra.length === 0 ? `${c.green}0${c.reset}` : `${c.yellow}${data.extra.length}${c.reset}`;
    console.log(`  ${c.dim}│${c.reset} ${lang.toUpperCase().padEnd(6)} ${c.dim}│${c.reset} ${String(data.total).padStart(6)} ${c.dim}│${c.reset} ${missingStr.padEnd(18)} ${c.dim}│${c.reset} ${extraStr.padEnd(18)} ${c.dim}│${c.reset} ${icon.padEnd(22)} ${c.dim}│${c.reset}`);
  }

  console.log(`  ${c.dim}└────────┴────────┴──────────┴──────────┴──────────────┘${c.reset}`);
  console.log('');

  // ─── Quality Table ───
  sectionHeader('🔍', 'Translation Quality');

  console.log(`  ${c.dim}┌────────┬──────────┬────────────────┬──────────────────┐${c.reset}`);
  console.log(`  ${c.dim}│${c.reset} ${c.bold}Lang${c.reset}   ${c.dim}│${c.reset} ${c.bold}Empty${c.reset}    ${c.dim}│${c.reset} ${c.bold}Untranslated${c.reset}   ${c.dim}│${c.reset} ${c.bold}Quality${c.reset}           ${c.dim}│${c.reset}`);
  console.log(`  ${c.dim}├────────┼──────────┼────────────────┼──────────────────┤${c.reset}`);

  for (const [lang, data] of Object.entries(qualityResults).sort()) {
    const st = structureResults.results[lang];
    const totalKeys = st ? st.total : 0;
    const qualityPct = totalKeys > 0 ? (((totalKeys - data.untranslated.length - data.empty.length) / refCount) * 100).toFixed(1) : '0.0';
    const qualityIcon = parseFloat(qualityPct) >= 99 ? `${c.green}🟢 ${qualityPct}%${c.reset}` :
                        parseFloat(qualityPct) >= 95 ? `${c.yellow}🟡 ${qualityPct}%${c.reset}` :
                        `${c.red}🔴 ${qualityPct}%${c.reset}`;
    const emptyStr = data.empty.length === 0 ? `${c.green}0${c.reset}` : `${c.red}${data.empty.length}${c.reset}`;
    const untransStr = data.untranslated.length === 0 ? `${c.green}0${c.reset}` : `${c.yellow}${data.untranslated.length}${c.reset}`;
    console.log(`  ${c.dim}│${c.reset} ${lang.toUpperCase().padEnd(6)} ${c.dim}│${c.reset} ${emptyStr.padEnd(18)} ${c.dim}│${c.reset} ${untransStr.padEnd(24)} ${c.dim}│${c.reset} ${qualityIcon.padEnd(27)} ${c.dim}│${c.reset}`);
  }

  console.log(`  ${c.dim}└────────┴──────────┴────────────────┴──────────────────┘${c.reset}`);
  console.log('');

  // ─── JSON Validity ───
  if (jsonErrors.length > 0) {
    sectionHeader('💥', 'JSON Errors');
    for (const { lang, error: err } of jsonErrors) {
      error(`${lang}.json — ${err}`);
    }
    console.log('');
  }

  // ─── Issues Explanation ───
  const fixable = issues.filter(i => i.severity !== 'low' || i.type !== 'untranslated');
  if (issues.length > 0) {
    sectionHeader('📋', `Diagnosis (${issues.length} issues found)`);

    const bySeverity = { critical: [], high: [], medium: [], low: [] };
    for (const issue of issues) {
      bySeverity[issue.severity].push(issue);
    }

    const severityIcons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
    const severityLabels = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };

    for (const severity of ['critical', 'high', 'medium', 'low']) {
      if (bySeverity[severity].length === 0) continue;

      console.log(`  ${severityIcons[severity]} ${c.bold}${severityLabels[severity]}${c.reset}`);
      console.log('');

      for (const issue of bySeverity[severity]) {
        console.log(`    ${c.bold}• ${issue.title}${c.reset}`);
        console.log(`      ${c.dim}${issue.explanation}${c.reset}`);
        if (issue.examples && issue.examples.length > 0) {
          console.log(`      ${c.dim}Examples: ${issue.examples.slice(0, 3).join(', ')}${c.reset}`);
        }
        console.log(`      ${c.green}Fix: ${issue.fix}${c.reset}`);
        console.log('');
      }
    }
  } else {
    sectionHeader('🎉', 'No Issues Found!');
    success('All translation files are perfectly healthy.');
    console.log('');
  }

  return issues;
}

// ════════════════════════════════════════════
// Fix: Run sync-translations.py
// ════════════════════════════════════════════
function runFix(langs = []) {
  sectionHeader('🔧', 'Running Auto-Fix');

  // Check Python availability
  let pythonCmd = 'python';
  try {
    execSync('python --version', { stdio: 'pipe' });
  } catch {
    try {
      execSync('python3 --version', { stdio: 'pipe' });
      pythonCmd = 'python3';
    } catch {
      error('Python is not installed. Please install Python 3 to use the auto-fix feature.');
      error('Install: https://www.python.org/downloads/');
      return false;
    }
  }

  // Check deep-translator
  try {
    execSync(`${pythonCmd} -c "import deep_translator"`, { stdio: 'pipe' });
  } catch {
    warn('deep-translator package not found. Installing...');
    try {
      execSync(`${pythonCmd} -m pip install deep-translator`, { stdio: 'inherit' });
      success('deep-translator installed successfully!');
    } catch {
      error('Failed to install deep-translator. Please run: pip install deep-translator');
      return false;
    }
  }

  // Build command
  const args = [SYNC_SCRIPT];
  if (langs.length > 0) {
    args.push('--lang', ...langs);
  }

  console.log(`  ${c.dim}Running: ${pythonCmd} ${args.join(' ')}${c.reset}`);
  console.log('');

  try {
    execSync(`${pythonCmd} ${args.join(' ')}`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    console.log('');
    success('Auto-fix completed!');
    return true;
  } catch (e) {
    console.log('');
    error(`Auto-fix failed: ${e.message}`);
    return false;
  }
}

// ════════════════════════════════════════════
// Post-Fix Verification
// ════════════════════════════════════════════
function runPostFixVerification() {
  sectionHeader('✅', 'Post-Fix Verification');
  
  const { locales, jsonErrors } = loadLocales();
  
  if (jsonErrors.length > 0) {
    error(`${jsonErrors.length} JSON files still have errors!`);
    return;
  }

  const structure = checkStructure(locales);
  const quality = checkQuality(locales);
  
  let allGood = true;
  for (const [lang, data] of Object.entries(structure.results)) {
    const q = quality[lang];
    const structOk = data.missing.length === 0 && data.extra.length === 0;
    const qualPct = ((data.total - (q ? q.untranslated.length : 0) - (q ? q.empty.length : 0)) / structure.refCount * 100).toFixed(1);
    const icon = structOk ? '✅' : '⚠️';
    console.log(`  ${icon} ${lang.toUpperCase()}: ${data.total} keys, ${qualPct}% translated`);
    if (!structOk) allGood = false;
  }

  console.log('');
  if (allGood) {
    success('All files verified — structure is 100% aligned!');
  } else {
    warn('Some issues remain. Run the doctor again for details.');
  }
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════
async function main() {
  banner();

  // Parse CLI args
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const autoFix = args.includes('--fix');
  const langIdx = args.indexOf('--lang');
  const fixLangs = langIdx !== -1 ? args.slice(langIdx + 1).filter(a => !a.startsWith('--')) : [];

  // Phase 1: Load files
  info('Loading locale files...\n');
  const { locales, jsonErrors } = loadLocales();
  
  if (!locales[REF_LANG]) {
    error(`Reference language file ${REF_LANG}.json not found!`);
    process.exit(1);
  }

  const langCount = Object.keys(locales).length;
  success(`Loaded ${langCount} locale files\n`);

  // Phase 2: Run checks
  info('Running structure check...');
  const structure = checkStructure(locales);
  success(`Structure check complete (${structure.refCount} reference keys)\n`);

  info('Running quality check...');
  const quality = checkQuality(locales);
  success('Quality check complete\n');

  // Phase 3: Diagnose
  const issues = diagnose(structure, quality, jsonErrors);

  // Phase 4: Display results
  displayResults(structure, quality, jsonErrors, issues);

  // If check-only mode, exit
  if (checkOnly) {
    const hasProblems = issues.some(i => i.severity === 'critical' || i.severity === 'high');
    process.exit(hasProblems ? 1 : 0);
  }

  // Phase 5: Fix
  const fixableIssues = issues.filter(i => i.type !== 'untranslated' || i.severity !== 'low');
  const hasFixableStructure = issues.some(i => i.type === 'missing_keys' || i.type === 'extra_keys' || i.type === 'json_invalid' || i.type === 'empty_values');
  const hasUntranslated = issues.some(i => i.type === 'untranslated');

  if (issues.length === 0) {
    console.log(`  ${c.green}${c.bold}🎉 Everything looks great! No action needed.${c.reset}\n`);
    process.exit(0);
  }

  if (autoFix) {
    // Auto-fix mode
    const fixed = runFix(fixLangs);
    if (fixed) {
      console.log('');
      runPostFixVerification();
    }
    process.exit(fixed ? 0 : 1);
  }

  // Interactive mode —  ask user
  console.log(`  ${c.bold}${c.cyan}━━━ What would you like to do? ━━━${c.reset}\n`);

  if (hasFixableStructure) {
    console.log(`  ${c.bold}[1]${c.reset} Fix structure issues (add missing keys, remove orphans)`);
  }
  if (hasUntranslated) {
    console.log(`  ${c.bold}[2]${c.reset} Fix untranslated values (auto-translate via Google Translate)`);
  }
  console.log(`  ${c.bold}[3]${c.reset} Fix ALL issues (structure + translations)`);
  console.log(`  ${c.bold}[4]${c.reset} Fix specific language(s) only`);
  console.log(`  ${c.bold}[0]${c.reset} Exit without fixing`);
  console.log('');

  const choice = await ask('Enter your choice (0-4):');

  switch (choice) {
    case '1':
    case '2':
    case '3': {
      const langsToFix = [];
      // For choices 1-3, fix all affected languages
      for (const issue of issues) {
        if (!langsToFix.includes(issue.lang)) {
          if (choice === '1' && (issue.type === 'missing_keys' || issue.type === 'extra_keys' || issue.type === 'json_invalid' || issue.type === 'empty_values')) {
            langsToFix.push(issue.lang);
          } else if (choice === '2' && issue.type === 'untranslated') {
            langsToFix.push(issue.lang);
          } else if (choice === '3') {
            langsToFix.push(issue.lang);
          }
        }
      }

      if (langsToFix.length === 0) {
        info('No languages need fixing for this option.');
        break;
      }

      console.log('');
      info(`Will fix: ${langsToFix.map(l => l.toUpperCase()).join(', ')}\n`);
      const confirm = await ask(`Proceed? (y/n)`);
      if (confirm === 'y' || confirm === 'yes') {
        console.log('');
        const fixed = runFix(langsToFix);
        if (fixed) {
          console.log('');
          runPostFixVerification();
        }
      } else {
        info('Cancelled.');
      }
      break;
    }

    case '4': {
      const langInput = await ask('Enter language codes separated by spaces (e.g., "de fr no"):');
      const selectedLangs = langInput.split(/[\s,]+/).filter(l => l.length > 0);
      if (selectedLangs.length === 0) {
        warn('No languages specified.');
        break;
      }
      console.log('');
      info(`Will fix: ${selectedLangs.map(l => l.toUpperCase()).join(', ')}\n`);
      const confirm = await ask(`Proceed? (y/n)`);
      if (confirm === 'y' || confirm === 'yes') {
        console.log('');
        const fixed = runFix(selectedLangs);
        if (fixed) {
          console.log('');
          runPostFixVerification();
        }
      } else {
        info('Cancelled.');
      }
      break;
    }

    case '0':
    default:
      info('No changes made. Goodbye! 👋');
      break;
  }

  console.log('');
}

main().catch(err => {
  error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
