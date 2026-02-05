
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
    console.error('Found keys:', Object.keys(env));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
    console.log('🚀 Starting SaaS Infrastructure Verification...');
    console.log('=============================================');

    try {
        // 1. Check Tables Existence & Basic Counts
        console.log('\n📊 1. Checking Core Tables...');
        const tables = [
            'tenants',
            'subscription_plans',
            'tenant_subscriptions',
            'saas_payments',
            'subscription_alerts',
            'saas_settings',
            'journal_entries',
            'system_modules'
        ];

        for (const table of tables) {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.error(`   ❌ Table '${table}': Error - ${error.message} (Code: ${error.code})`);
            } else {
                console.log(`   ✅ Table '${table}': Found ${count} records`);
            }
        }

        // 2. Check SaaS Settings
        console.log('\n⚙️ 2. Verifying SaaS Settings...');
        const { data: settings, error: settingsError } = await supabase.from('saas_settings').select('*').limit(1);
        if (settingsError) console.error('   ❌ Error fetching settings:', settingsError.message);
        else if (!settings || settings.length === 0) console.warn('   ⚠️ No SaaS Settings found (using defaults?)');
        else {
            console.log('   ✅ Settings found:', JSON.stringify(settings[0], null, 2));
        }

        // 3. Check Subscription Plans Integrity
        console.log('\n📦 3. Verifying Subscription Plans...');
        const { data: plans, error: plansError } = await supabase.from('subscription_plans').select('code, name_en, price_monthly, price_daily, billing_mode, is_active');

        if (plansError) {
            console.error('   ❌ Error fetching plans:', plansError.message);
        } else if (plans) {
            plans.forEach((plan: any) => {
                const issues: string[] = [];
                if (!plan.price_monthly && !plan.price_daily) issues.push('No price defined');
                if (issues.length > 0) console.warn(`   ⚠️ Plan '${plan.code}': ${issues.join(', ')}`);
                else console.log(`   ✅ Plan '${plan.code}': OK (Mode: ${plan.billing_mode})`);
            });
        }

        // 4. Data Integrity: Payments vs Accounting
        console.log('\n💰 4. Checking Payments & Accounting Integration...');
        const { data: payments, error: paymentsError } = await supabase
            .from('saas_payments')
            .select('id, payment_number, status, amount, created_at, subscription_id')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(5);

        if (paymentsError) {
            console.error('   ❌ Error fetching payments:', paymentsError.message);
        } else if (payments && payments.length > 0) {
            for (const payment of payments) {
                const { data: entries } = await supabase
                    .from('journal_entries')
                    .select('id, entry_number, total_debit, status')
                    .eq('reference_id', payment.id)
                    .eq('reference_type', 'saas_payment');

                const hasEntry = entries && entries.length > 0;
                const entryStatus = hasEntry ? `✅ Linked to JE: ${(entries[0] as any).entry_number}` : '⚠️ No Accounting Entry Found';

                console.log(`   Payment ${(payment as any).payment_number} ($${(payment as any).amount}): ${entryStatus}`);

                if (hasEntry) {
                    const { data: lines } = await supabase.from('journal_entry_lines').select('line_number, account_id, debit, credit').eq('entry_id', (entries![0] as any).id);
                    if (lines) {
                        lines.forEach((line: any) => {
                            const type = line.debit > 0 ? `Debit ($${line.debit})` : `Credit ($${line.credit})`;
                            console.log(`      -> Line ${line.line_number}: ${type} -> Account ${line.account_id}`);
                        });
                    }
                }

                if ((payment as any).subscription_id) {
                    const { data: sub } = await supabase.from('tenant_subscriptions').select('id, status').eq('id', (payment as any).subscription_id).single();
                    if (sub) console.log(`      -> Subscription: ${(sub as any).status}`);
                    else console.log(`      -> ❌ Linked Subscription ID not found!`);
                } else {
                    console.log(`      -> ⚠️ No Subscription Linked`);
                }
            }
        } else {
            console.log('   ℹ️ No completed payments found to verify.');
        }

        // 5. Subscription Health
        console.log('\nheartbeat 5. Checking Subscription Health...');
        const { data: activeSubs, error: subsError } = await supabase
            .from('tenant_subscriptions')
            .select('id, end_date, tenant_id, status')
            .eq('status', 'active');

        if (subsError) {
            console.error('   ❌ Error fetching subscriptions:', subsError.message);
        } else if (activeSubs) {
            const today = new Date();
            let expiredActiveCount = 0;
            activeSubs.forEach((sub: any) => {
                if (new Date(sub.end_date) < today) {
                    expiredActiveCount++;
                    console.warn(`   ⚠️ Subscription ${sub.id} is 'active' but ended on ${sub.end_date}`);
                }
            });
            if (expiredActiveCount === 0) console.log(`   ✅ All ${activeSubs.length} active subscriptions have valid dates.`);
        }

        // 6. Check Modules
        console.log('\n🧩 6. Verifying Modules...');
        const { count: modulesCount, error: modError } = await supabase.from('system_modules').select('*', { count: 'exact', head: true });

        if (modError) console.error('   ❌ Error fetching modules:', modError.message);
        else console.log(`   ✅ Modules Count: ${modulesCount}`);

        console.log('\n=============================================');
        console.log('✅ Verification Action Completed.');

    } catch (err) {
        console.error('❌ Unexpected Error during verification:', err);
    }
}

runVerification();
