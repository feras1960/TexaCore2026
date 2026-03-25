
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

async function updateTotals() {
    try {
        await client.connect();

        // Force update totals for MAN-001
        const res = await client.query("SELECT id FROM journal_entries WHERE entry_number = 'MAN-001'");
        if (res.rows.length === 0) return console.log('MAN-001 not found');

        const id = res.rows[0].id;
        console.log(`Updating totals for ${id}...`);

        // Explicitly sum lines
        await client.query(`
        WITH sums AS (
            SELECT 
                COALESCE(SUM(debit), 0) as d, 
                COALESCE(SUM(credit), 0) as c 
            FROM journal_entry_lines 
            WHERE entry_id = $1
        )
        UPDATE journal_entries 
        SET total_debit = sums.d, total_credit = sums.c 
        FROM sums 
        WHERE id = $1
    `, [id]);

        console.log('Totals Updated.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

updateTotals();
