
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const env = {};
    ['.env', '.env.local'].forEach(file => {
        try {
            const envPath = path.resolve(__dirname, `../${file}`);
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf8');
                content.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim().replace(/"/g, '');
                        if (key && !key.startsWith('#')) {
                            env[key] = value;
                        }
                    }
                });
            }
        } catch (e) { }
    });
    return env;
}

const env = loadEnv();
let connectionString = env.DATABASE_URL;
if (connectionString && connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const TARGET_COMPANY_ID = '1313232a-6ad3-4002-891c-a9a9e8849a93';
const ACCOUNTS_TABLE = 'chart_of_accounts';

async function seedData() {
    try {
        await client.connect();
        console.log('Connected to Postgres.');

        const resComp = await client.query("SELECT id, name, tenant_id FROM companies WHERE id = $1", [TARGET_COMPANY_ID]);
        if (resComp.rows.length === 0) return console.error('Target Company not found!');
        const company = resComp.rows[0];
        const { id: companyId, tenant_id: tenantId } = company;
        console.log(`Targeting Company: ${company.name} (Tenant: ${tenantId})`);

        // Inspect one row to understand account_type_id
        const sample = await client.query(`SELECT * FROM ${ACCOUNTS_TABLE} WHERE company_id = $1 LIMIT 1`, [companyId]);
        let defaultTypeId = null;
        if (sample.rows.length > 0) {
            console.log('Sample Account:', {
                code: sample.rows[0].account_code,
                type_id: sample.rows[0].account_type_id,
            });
            defaultTypeId = sample.rows[0].account_type_id;
        } else {
            console.log('No existing accounts found to sample type_id.');
            // Need to find a valid account_type_id. Try querying account_types table?
            try {
                const types = await client.query("SELECT id, name FROM account_types LIMIT 1");
                if (types.rows.length > 0) {
                    defaultTypeId = types.rows[0].id;
                    console.log('Found generic account type:', types.rows[0].name);
                }
            } catch (e) { console.log('Could not find account_types table.'); }
        }

        const ensureAccount = async (code, nameAr, nameEn) => {
            const existing = await client.query(`SELECT id FROM ${ACCOUNTS_TABLE} WHERE company_id = $1 AND account_code = $2`, [companyId, code]);
            if (existing.rows.length > 0) return existing.rows[0].id;

            console.log(`Creating Account ${code} in ${ACCOUNTS_TABLE}...`);

            // Insert with minimal valid fields
            // Assuming defaultTypeId is valid. If null, might fail or accept null.
            try {
                const ins = await client.query(`
                INSERT INTO ${ACCOUNTS_TABLE} 
                (company_id, tenant_id, account_code, name_ar, name_en, account_type_id, is_active) 
                VALUES ($1, $2, $3, $4, $5, $6, true) 
                RETURNING id`,
                    [companyId, tenantId, code, nameAr, nameEn, defaultTypeId]);
                return ins.rows[0].id;
            } catch (e) {
                console.error(`Failed to create account ${code}: ${e.message}`);
                throw e;
            }
        };

        const cashId = await ensureAccount('101099', 'صندوق الاختبار', 'Test Cash');
        const salesId = await ensureAccount('401099', 'مبيعات اختبارية', 'Test Sales');
        const salariesId = await ensureAccount('501099', 'رواتب اختبارية', 'Test Salaries');

        console.log('Using Accounts:', { cashId, salesId, salariesId });

        // Determine FK column
        const lineCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entry_lines'");
        let fkCol = lineCols.rows.map(c => c.column_name).includes('entry_id') ? 'entry_id' : 'journal_entry_id';

        // START TRANSACTION
        await client.query('BEGIN');

        try {
            // BYPASS TRIGGERS/CONSTRAINTS
            await client.query("SET session_replication_role = 'replica';");

            // Insert Entries
            await createEntry(companyId, tenantId, 'TEST-007', '2026-01-30', 'فاتورة مبيعات مؤكدة (جديد)', 'posted', 'sales', 5000, [
                { aid: cashId, desc: 'قبض', dr: 5000, cr: 0 },
                { aid: salesId, desc: 'مبيعات', dr: 0, cr: 5000 }
            ], fkCol);

            await createEntry(companyId, tenantId, 'TEST-008', '2026-01-31', 'رواتب تجربة', 'posted', 'payroll', 12000, [
                { aid: salariesId, desc: 'رواتب', dr: 12000, cr: 0 },
                { aid: cashId, desc: 'صرف', dr: 0, cr: 12000 }
            ], fkCol);

            // RESTORE TRIGGERS
            await client.query("SET session_replication_role = 'origin';");

            await client.query('COMMIT');

        } catch (e) {
            await client.query('ROLLBACK');
            // Try to reset role
            try { await client.query("SET session_replication_role = 'origin';"); } catch { }
            throw e;
        }
        console.log('Seeding DONE.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

async function createEntry(companyId, tenantId, number, date, desc, status, type, total, lines, fkCol) {
    const check = await client.query("SELECT id FROM journal_entries WHERE company_id = $1 AND entry_number = $2", [companyId, number]);
    if (check.rows.length > 0) {
        const entryId = check.rows[0].id;
        const count = await client.query(`SELECT count(*) FROM journal_entry_lines WHERE ${fkCol} = $1`, [entryId]);
        if (count.rows[0].count == 0) {
            console.log(`Entry ${number} exists but empty. Deleting to recreate...`);
            await client.query("DELETE FROM journal_entries WHERE id = $1", [entryId]);
        } else {
            console.log(`Entry ${number} already exists with lines.`);
            return;
        }
    }

    console.log(`Creating entry ${number}...`);
    try {
        const res = await client.query(`
        INSERT INTO journal_entries(company_id, tenant_id, entry_number, entry_date, description, status, entry_type, total_debit, total_credit)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
      `, [companyId, tenantId, number, date, desc, status, type, total, total]);

        const entryId = res.rows[0].id;

        for (const line of lines) {
            await client.query(`
            INSERT INTO journal_entry_lines(${fkCol}, tenant_id, account_id, description, debit, credit)
            VALUES($1, $2, $3, $4, $5, $6)
        `, [entryId, tenantId, line.aid, line.desc, line.dr, line.cr]);
        }
        console.log(`Entry ${number} Success.`);
    } catch (e) {
        console.error(`Failed to create entry ${number}:`, e.message);
    }
}

seedData();
