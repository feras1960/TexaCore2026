
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

async function checkBackend() {
    try {
        await client.connect();

        // 1. Check Triggers on Customers/Suppliers
        console.log('--- TRIGGERS ---');
        const triggers = await client.query(`
      SELECT event_object_table, trigger_name, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table IN ('customers', 'suppliers')
    `);
        if (triggers.rows.length === 0) console.log('No triggers found on customers/suppliers.');
        else console.log(triggers.rows.map(t => `${t.event_object_table}: ${t.trigger_name}`));

        // 2. Check COA for Receivables/Payables
        console.log('\n--- RELEVANT ACCOUNTS ---');
        const accounts = await client.query(`
      SELECT account_code, name_ar, name_en, account_type_id 
      FROM chart_of_accounts 
      WHERE name_en ILIKE '%receivable%' OR name_en ILIKE '%payable%' 
         OR name_ar ILIKE '%ذمم%' OR name_ar ILIKE '%عملاء%' OR name_ar ILIKE '%موردين%'
    `);
        console.log(accounts.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkBackend();
