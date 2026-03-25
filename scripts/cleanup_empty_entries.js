
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

async function cleanupAndCheck() {
    try {
        await client.connect();
        console.log('Connected to Postgres.');

        // 1. Delete entries with NO lines
        const deleteRes = await client.query(`
        DELETE FROM journal_entries 
        WHERE id NOT IN (SELECT DISTINCT entry_id FROM journal_entry_lines)
    `);
        console.log(`Deleted ${deleteRes.rowCount} empty journal entries.`);

        // 2. Verify MAN-001 still exists and has lines
        const manCheck = await client.query(`
        SELECT je.entry_number, count(l.id) as lines 
        FROM journal_entries je 
        JOIN journal_entry_lines l ON l.entry_id = je.id 
        WHERE je.entry_number = 'MAN-001'
        GROUP BY je.entry_number
    `);
        console.log('MAN-001 Check:', manCheck.rows[0] || 'Missing');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

cleanupAndCheck();
