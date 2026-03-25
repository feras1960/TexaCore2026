
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
        console.log('--- Diagnosis Report ---');

        // 1. Tenants
        const tenants = await client.query('SELECT id, name FROM tenants');
        console.log(`\nFound ${tenants.rows.length} Tenants:`);
        tenants.rows.forEach(t => console.log(` - [${t.id}] ${t.name}`));

        // 2. Companies
        const companies = await client.query('SELECT id, name, tenant_id FROM companies');
        console.log(`\nFound ${companies.rows.length} Companies:`);
        companies.rows.forEach(c => console.log(` - [${c.id}] ${c.name} (Tenant: ${c.tenant_id})`));

        // 3. User Profiles (to see who is assigned where)
        // Assuming table exists as per previous context
        try {
            const users = await client.query('SELECT id, first_name, last_name, company_id, tenant_id FROM user_profiles');
            console.log(`\nFound ${users.rows.length} User Profiles:`);
            users.rows.forEach(u => console.log(` - User [${u.id}] ${u.first_name || ''} assigned to Company: ${u.company_id}`));
        } catch (e) {
            console.log('\nCould not query user_profiles:', e.message);
        }

        // 4. Journal Entries count per company
        const entries = await client.query('SELECT company_id, COUNT(*) as count FROM journal_entries GROUP BY company_id');
        console.log(`\nJournal Entries by Company:`);
        entries.rows.forEach(e => console.log(` - Company [${e.company_id}]: ${e.count} entries`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

diagnose();
