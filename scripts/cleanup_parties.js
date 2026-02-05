
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

async function cleanupParies() {
    try {
        await client.connect();
        console.log('Cleaning up Customers and Suppliers...');

        // Try normal delete first
        await client.query("DELETE FROM customers");
        console.log('Customers deleted.');

        await client.query("DELETE FROM suppliers");
        console.log('Suppliers deleted.');

    } catch (err) {
        console.error('Error during cleanup:', err.message);
        // If FK error, we might need cascade or warned user
        if (err.message.includes('foreign key constraint')) {
            console.log('Foreign key constraint hit. Requires manual intervention or cascading if strict.');
        }
    } finally {
        await client.end();
    }
}

cleanupParies();
