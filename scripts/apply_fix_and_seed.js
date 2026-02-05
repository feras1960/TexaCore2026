
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

async function execute() {
    try {
        await client.connect();
        console.log('Connected to Postgres.');

        // 1. APPLY MIGRATION
        console.log('Applying Fix for chk_balanced_entry...');
        await client.query(`
        ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_balanced_entry;
        ALTER TABLE journal_entries
          ADD CONSTRAINT chk_balanced_entry 
          CHECK (status != 'posted' OR abs(total_debit - total_credit) < 0.01);
    `);
        console.log('Constraint Updated.');

        // 2. SEED MANUAL ENTRY
        const resComp = await client.query("SELECT id, name, tenant_id FROM companies WHERE id = $1", [TARGET_COMPANY_ID]);
        if (resComp.rows.length === 0) return console.error('Target Company not found!');
        const company = resComp.rows[0];
        const { id: companyId, tenant_id: tenantId } = company;

        // Fetch Accounts
        const getAcc = async (code) => {
            const res = await client.query(`SELECT id FROM ${ACCOUNTS_TABLE} WHERE company_id = $1 AND account_code = $2`, [companyId, code]);
            return res.rows[0]?.id;
        }
        const cashId = await getAcc('101099');
        const salesId = await getAcc('401099');

        if (!cashId || !salesId) return console.error('Accounts missing.');

        const lineCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entry_lines'");
        let fkCol = lineCols.rows.map(c => c.column_name).includes('entry_id') ? 'entry_id' : 'journal_entry_id';

        const number = 'MAN-001';

        // Cleanup if exists
        const existing = await client.query("SELECT id FROM journal_entries WHERE company_id = $1 AND entry_number = $2", [companyId, number]);
        if (existing.rows.length > 0) {
            const eid = existing.rows[0].id;
            await client.query(`DELETE FROM journal_entry_lines WHERE ${fkCol} = $1`, [eid]);
            await client.query("DELETE FROM journal_entries WHERE id= $1", [eid]);
            console.log('Cleaned up previous entry.');
        }

        console.log(`Creating Manual Entry ${number} (Draft)...`);
        // Insert DRAFT
        const res = await client.query(`
        INSERT INTO journal_entries(company_id, tenant_id, entry_number, entry_date, description, status, entry_type, total_debit, total_credit)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [companyId, tenantId, number, '2026-02-01', 'قيد يدوي تجريبي', 'draft', 'manual', 0, 0]);

        const entryId = res.rows[0].id;

        // Insert Lines (should pass now even if unbalanced temporarily)
        await client.query(`
        INSERT INTO journal_entry_lines(${fkCol}, tenant_id, account_id, description, debit, credit)
        VALUES($1, $2, $3, $4, $5, $6)
    `, [entryId, tenantId, cashId, 'إيداع يدوي', 1000, 0]);

        await client.query(`
        INSERT INTO journal_entry_lines(${fkCol}, tenant_id, account_id, description, debit, credit)
        VALUES($1, $2, $3, $4, $5, $6)
    `, [entryId, tenantId, salesId, 'مبيعات يدوية', 0, 1000]);

        // Update to POSTED
        console.log('Posting entry...');
        await client.query("UPDATE journal_entries SET status = 'posted' WHERE id = $1", [entryId]);

        console.log('Manual Entry Created Successfully.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

execute();
