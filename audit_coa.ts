/**
 * Chart of Accounts Audit Script
 * استعلامات تدقيق الشجرة المحاسبية
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        } else if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        } else if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = supabaseUrl || line.split('=')[1].trim();
        } else if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseKey = supabaseKey || line.split('=')[1].trim();
        }
    }
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAuditQueries() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 تدقيق الشجرة المحاسبية - Chart of Accounts Audit');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // 1. Chart Templates
        console.log('1️⃣ قوالب الشجرات المحاسبية (Chart Templates)');
        console.log('─'.repeat(60));
        const { data: templates, error: templatesError } = await supabase
            .from('chart_templates')
            .select('template_code, template_name_ar, template_name_en, chart_type, include_demo_data, is_active')
            .order('chart_type');

        if (templatesError) {
            console.log('⚠️  جدول chart_templates غير موجود أو لا يمكن الوصول إليه');
        } else if (templates && templates.length > 0) {
            console.table(templates);
        } else {
            console.log('   لا توجد قوالب');
        }

        // 2. Company Chart Statistics
        console.log('\n2️⃣ إحصائيات الشجرة المحاسبية (Chart Statistics)');
        console.log('─'.repeat(60));
        const { data: companies } = await supabase
            .from('companies')
            .select('id, name_ar, chart_type, is_active')
            .eq('is_active', true)
            .limit(1)
            .single();

        if (companies) {
            console.log(`الشركة: ${companies.name_ar}`);
            console.log(`نوع الشجرة: ${companies.chart_type || 'غير محدد'}`);

            const { data: accounts } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, is_group, account_type_code')
                .eq('company_id', companies.id);

            if (accounts) {
                const stats = {
                    'إجمالي الحسابات': accounts.length,
                    'المجموعات': accounts.filter(a => a.is_group).length,
                    'الحسابات التفصيلية': accounts.filter(a => !a.is_group).length,
                    'الأصول': accounts.filter(a => a.account_type_code?.includes('ASSET')).length,
                    'الخصوم': accounts.filter(a => a.account_type_code?.includes('LIABILITY')).length,
                    'حقوق الملكية': accounts.filter(a => a.account_type_code === 'EQUITY').length,
                    'الإيرادات': accounts.filter(a => a.account_type_code === 'REVENUE').length,
                    'المصروفات': accounts.filter(a => a.account_type_code === 'EXPENSE').length,
                };
                console.table([stats]);

                // 3. Code Length Analysis
                console.log('\n3️⃣ تحليل أطوال أكواد الحسابات (Code Length Analysis)');
                console.log('─'.repeat(60));
                const lengthGroups: Record<number, { count: number; examples: string[] }> = {};
                accounts.forEach(acc => {
                    const len = acc.account_code?.length || 0;
                    if (!lengthGroups[len]) {
                        lengthGroups[len] = { count: 0, examples: [] };
                    }
                    lengthGroups[len].count++;
                    if (lengthGroups[len].examples.length < 3) {
                        lengthGroups[len].examples.push(acc.account_code || '');
                    }
                });

                Object.entries(lengthGroups).forEach(([length, data]) => {
                    const system =
                        length === '3' ? 'نظام قديم (3 أرقام)' :
                            length === '4' ? 'نظام قياسي (4 أرقام)' :
                                length === '7' ? 'نظام موسع (7 أرقام) ✅' :
                                    'غير قياسي';
                    console.log(`   ${length} أرقام: ${data.count} حساب - ${system}`);
                    console.log(`      أمثلة: ${data.examples.join(', ')}`);
                });

                // 4. Cash Accounts
                console.log('\n4️⃣ الحسابات النقدية والبنكية (Cash & Bank Accounts)');
                console.log('─'.repeat(60));
                const { data: cashAccounts } = await supabase
                    .from('chart_of_accounts')
                    .select('account_code, name_ar, is_group, current_balance')
                    .eq('company_id', companies.id)
                    .or('account_code.like.111%,account_code.like.112%')
                    .order('account_code');

                if (cashAccounts && cashAccounts.length > 0) {
                    console.table(cashAccounts);
                } else {
                    console.log('   لا توجد حسابات نقدية');
                }

                // 5. Cost Centers
                console.log('\n5️⃣ مراكز التكلفة (Cost Centers)');
                console.log('─'.repeat(60));
                const { data: costCenters } = await supabase
                    .from('cost_centers')
                    .select('code, name_ar, name_en, is_active')
                    .eq('company_id', companies.id)
                    .order('code');

                if (costCenters && costCenters.length > 0) {
                    console.table(costCenters);
                } else {
                    console.log('   لا توجد مراكز تكلفة');
                }

                // 6. Customer/Supplier Accounts (Sub-ledger check)
                console.log('\n6️⃣ حسابات العملاء والموردين (Receivables/Payables)');
                console.log('─'.repeat(60));
                const { data: subLedgers } = await supabase
                    .from('chart_of_accounts')
                    .select('account_code, name_ar, is_group')
                    .eq('company_id', companies.id)
                    .or('account_code.like.115%,account_code.like.211%')
                    .order('account_code');

                if (subLedgers && subLedgers.length > 0) {
                    console.table(subLedgers);

                    // Count customers and suppliers
                    const { count: customersCount } = await supabase
                        .from('customers')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', companies.id);

                    const { count: suppliersCount } = await supabase
                        .from('suppliers')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', companies.id);

                    console.log(`\n   عدد العملاء: ${customersCount || 0}`);
                    console.log(`   عدد الموردين: ${suppliersCount || 0}`);
                } else {
                    console.log('   لا توجد حسابات ذمم');
                }
            }
        } else {
            console.log('   لا توجد شركات نشطة');
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ اكتمل التدقيق');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ خطأ في تشغيل الاستعلامات:', error);
        process.exit(1);
    }
}

runAuditQueries();
