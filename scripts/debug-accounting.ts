
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// manually parse .env
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return {};
        const content = fs.readFileSync(envPath, 'utf8');
        const result: Record<string, string> = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                result[match[1].trim()] = value;
            }
        });
        return result;
    } catch (e) {
        console.error('Error loading .env', e);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

// NOTE: We are using ANON key, so we can only see what RLS allows.
// However, if RLS is broken or we want to verify if RLS is the issue,
// we might need SERVICE_ROLE key (which we usually don't have in client env).
// But for debugging "why user cant see", ANON key is actually good to simulate client.
// BUT we can't "login" as the user easily here without password.
// So we will try to query tables that might be public or check metadata if possible.

// Wait, the user said "Super Admin". Usually they have bypass RLS or special role.
// If I use Anon, I likely won't see anything unless I sign in.

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
    console.log('🚀 Starting Accounting Debug...');

    // 1. Check if ANY accounts exist in the system (using a broad query if RLS allows, or just checking public info)
    console.log('\n📊 1. Global System Check');
    const { count: totalAccounts, error: countError } = await supabase.from('chart_of_accounts').select('*', { count: 'exact', head: true });

    if (countError) {
        console.log(`   ❌ Error checking chart_of_accounts: ${countError.message} (Likely RLS blocking anon)`);
    } else {
        console.log(`   ✅ Total Accounts in DB (Visible to Anon): ${totalAccounts}`);
    }

    // 2. Check Chart Templates
    console.log('\n📋 2. Checking Chart Templates');
    const { data: templates, error: tmplError } = await supabase.from('chart_templates').select('code, name, description, is_active');
    if (tmplError) {
        console.log(`   ❌ Error checking templates: ${tmplError.message}`);
    } else {
        console.log(`   ✅ Found ${templates?.length || 0} templates:`);
        templates?.forEach(t => console.log(`      - ${t.code}: ${t.name}`));
    }

    // 3. Check Account Types
    console.log('\n🗂️ 3. Checking Account Types Enum/Table');
    // There is no table for account_types usually, it's an enum or hardcoded.
    // But let's check distinct types if possible

    // 4. Check for 'feras1960@gmail.com' tenant (hard to do without admin key)
    // But we can check if we can find a user with this email in `auth.users` -> NO, cannot access auth.users via client.

    // Let's assume we can't see specific tenant data without login. 
    // But we can check if the "Structure" is correct.

    // Check if `chart_of_accounts` has RLS enabled
    // We can't check that via client API.

    console.log('\n🔍 4. Checking Accounts Service Implementation details would require reading code.');
}

runDebug();
