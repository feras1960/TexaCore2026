
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

async function checkTest004() {
    try {
        await client.connect();

        // Check Header
        const header = await client.query("SELECT id, entry_number, total_debit FROM journal_entries WHERE entry_number = 'TEST-004'");
        if (header.rows.length === 0) return console.log('TEST-004 Not Found');
        const id = header.rows[0].id;
        console.log('TEST-004 ID:', id);

        // Check Lines
        const lines = await client.query(`
        SELECT count(*) as count, sum(debit) as deb, sum(credit) as cred 
        FROM journal_entry_lines 
        WHERE entry_id = $1
    `, [id]);
        console.log('TEST-004 Lines Stats:', lines.rows[0]);

        // Fetch raw lines
        const rawLines = await client.query(`SELECT * FROM journal_entry_lines WHERE entry_id = $1`, [id]);
        console.log('TEST-004 Raw Lines:', rawLines.rows.length);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkTest004();
