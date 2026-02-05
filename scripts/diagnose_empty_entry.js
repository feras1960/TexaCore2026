
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

async function diagnose() {
    try {
        await client.connect();

        // Check Header Totals
        const header = await client.query("SELECT id, entry_number, total_debit, total_credit, status FROM journal_entries WHERE entry_number = 'MAN-001'");
        if (header.rows.length === 0) {
            console.log('MAN-001 Not Found');
        } else {
            console.log('MAN-001 Header:', header.rows[0]);
        }

        // Check Lines
        if (header.rows.length > 0) {
            const lines = await client.query(`
            SELECT l.id, l.debit, l.credit, l.description, l.account_id
            FROM journal_entry_lines l
            WHERE l.entry_id = $1
        `, [header.rows[0].id]);
            console.log('MAN-001 Lines:', lines.rows);

            // Check Account linkage
            if (lines.rows.length > 0) {
                const accId = lines.rows[0].account_id;
                const acc = await client.query("SELECT id, account_code, name_ar, name_en FROM chart_of_accounts WHERE id = $1", [accId]);
                console.log('Linked Account (chart_of_accounts):', acc.rows[0]);

                // Check if 'accounts' view/table exists and has this id
                const accView = await client.query("SELECT * FROM accounts WHERE id = $1", [accId]).catch(e => ({ rows: [], error: e.message }));
                console.log('Linked Account (accounts table/view):', accView.rows.length > 0 ? accView.rows[0] : accView.error || 'Not Found');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

diagnose();
