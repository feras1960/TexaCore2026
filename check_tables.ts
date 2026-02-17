
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try to load .env or .env.local
const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// Fallback to hardcoded values if env not found or empty (Attempting to read from previous context or generic placeholder, but really should rely on env)
// Based on the user's error logs, the URL is https://wzkklenfsaepegymfxfz.supabase.co
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wzkklenfsaepegymfxfz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('No Supabase key found in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking tables...');

    const tablesToCheck = ['roll_movements', 'inventory_movements', 'fabric_rolls'];

    for (const table of tablesToCheck) {
        const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`Table '${table}': Error - ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`Table '${table}': Exists (Count: ${data})`); // count is in return, but head:true returns null data usually, count property is on the response object
        }
    }
}

checkTables();
