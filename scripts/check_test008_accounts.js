
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

async function checkTest008() {
    try {
        await client.connect();

        // Get Entry ID
        const entryRes = await client.query("SELECT id FROM journal_entries WHERE entry_number = 'TEST-008'");
        if (entryRes.rows.length === 0) return console.log('TEST-008 Not Found');
        const entryId = entryRes.rows[0].id;

        // Get Lines and Account Details
        const lines = await client.query(`
        SELECT 
            l.id as line_id,
            l.description,
            l.debit,
            l.credit,
            l.account_id,
            a.account_code,
            a.name_ar,
            a.name_en
        FROM journal_entry_lines l
        LEFT JOIN chart_of_accounts a ON l.account_id = a.id
        WHERE l.entry_id = $1
    `, [entryId]);

        console.log('TEST-008 Lines:', JSON.stringify(lines.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkTest008();
