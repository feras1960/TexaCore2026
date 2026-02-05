
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

async function checkPartiesSchema() {
    try {
        await client.connect();

        // Check Customers Table
        console.log('--- CUSTOMERS TABLE ---');
        const customers = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'customers'
    `);
        if (customers.rows.length === 0) console.log('Table "customers" not found. Checking for "entities"...');
        else console.log(customers.rows.map(r => `${r.column_name} (${r.data_type})`));

        // Check Suppliers Table
        console.log('\n--- SUPPLIERS TABLE ---');
        const suppliers = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'suppliers'
    `);
        if (suppliers.rows.length === 0) console.log('Table "suppliers" not found.');
        else console.log(suppliers.rows.map(r => `${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkPartiesSchema();
