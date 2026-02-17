// Quick script to check chart templates and default accounts via Supabase API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzkklenfsaepegymfxfz.supabase.co';
const supabaseKey = 'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 فحص شامل: الشجرات المحاسبية والحسابات الافتراضية');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Get all companies with their chart types
    const { data: companies } = await supabase
        .from('companies')
        .select('id, name_ar, name_en, chart_type')
        .order('chart_type');

    if (!companies || companies.length === 0) {
        console.log('❌ لا توجد شركات');
        return;
    }

    console.log(`📋 عدد الشركات: ${companies.length}\n`);

    for (const company of companies) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🏢 ${company.name_ar || company.name_en || '(بدون اسم)'} — القالب: ${company.chart_type || 'غير محدد'}`);
        console.log(`${'═'.repeat(60)}`);

        // Get accounts count
        const { count: totalAccounts } = await supabase
            .from('chart_of_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id);

        const { count: detailAccounts } = await supabase
            .from('chart_of_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_detail', true);

        console.log(`   📊 الحسابات: ${totalAccounts} (${detailAccounts} تفصيلي)`);

        if (totalAccounts === 0) {
            console.log('   ⚠️  لا توجد شجرة حسابات — متجاوز');
            continue;
        }

        // Check critical accounts existence
        const criticalCodes = {
            simple: {
                cash: '1110', bank: '1120', receivable: '1130', payable: '2110',
                revenue: '4100', expense: '5600', purchase: '5200',
                tax_in: '1160', tax_out: '2130', inventory: '1140',
                fx_gain: '4500', fx_loss: '5700', freight: '5800',
                retained: '3300', cust_adv: '2150', supp_adv: '1150'
            },
            extended: {
                cash: '1111', bank: '1121', receivable: '1131', payable: '2111',
                revenue: '4110', expense: '5600', purchase: '5200',
                tax_in: '1160', tax_out: '2130', inventory: '1140',
                fx_gain: '4500', fx_loss: '5700', freight: '5800',
                retained: '3300', cust_adv: '2150', supp_adv: '1150'
            },
            fabric_extended: {
                cash: '1111', bank: '1121', receivable: '1131', payable: '2111',
                revenue: '41', expense: '57', purchase: '511',
                tax_in: '117', tax_out: '214', inventory: '114',
                fx_gain: '46', fx_loss: '591', freight: '593',
                retained: '32', cust_adv: '2150', supp_adv: '1150'
            }
        };

        const codes = criticalCodes[company.chart_type] || criticalCodes.simple;
        const allCodesToCheck = Object.values(codes);

        const { data: existingAccounts } = await supabase
            .from('chart_of_accounts')
            .select('account_code, name_ar, is_detail, is_group, is_cash_account, is_bank_account, is_receivable, is_payable')
            .eq('company_id', company.id)
            .in('account_code', allCodesToCheck);

        const existingCodes = new Set((existingAccounts || []).map(a => a.account_code));

        const labels = {
            cash: 'الصندوق', bank: 'البنك', receivable: 'الذمم المدينة', payable: 'الذمم الدائنة',
            revenue: 'المبيعات', expense: 'المصروفات', purchase: 'المشتريات',
            tax_in: 'ضريبة مدخلات', tax_out: 'ضريبة مخرجات', inventory: 'المخزون',
            fx_gain: 'أرباح عملة', fx_loss: 'خسائر عملة', freight: 'شحن',
            retained: 'أرباح محتجزة', cust_adv: 'سلف عملاء', supp_adv: 'سلف موردين'
        };

        console.log('\n   📋 حالة الحسابات الحيوية:');
        let missing = [];
        for (const [key, code] of Object.entries(codes)) {
            const exists = existingCodes.has(code);
            const account = (existingAccounts || []).find(a => a.account_code === code);
            const isDetail = account?.is_detail ? '(تفصيلي)' : account?.is_group ? '⚠️(رئيسي!)' : '';
            const icon = exists ? '✅' : '❌';
            console.log(`      ${icon} ${labels[key]}: ${code} ${isDetail}`);
            if (!exists) missing.push(`${labels[key]} (${code})`);
        }

        if (missing.length > 0) {
            console.log(`\n   ❌ مفقود (${missing.length}): ${missing.join(', ')}`);
        } else {
            console.log('\n   ✅ جميع الحسابات موجودة!');
        }

        // Check settings
        const { data: settings } = await supabase
            .from('company_accounting_settings')
            .select('*')
            .eq('company_id', company.id)
            .single();

        if (settings) {
            const fieldLabels = {
                default_cash_account_id: 'الصندوق',
                default_bank_account_id: 'البنك',
                default_receivable_account_id: 'الذمم المدينة',
                default_payable_account_id: 'الذمم الدائنة',
                default_revenue_account_id: 'المبيعات',
                default_expense_account_id: 'المصروفات',
                default_purchase_account_id: 'المشتريات',
                default_tax_input_account_id: 'ضريبة مدخلات',
                default_tax_output_account_id: 'ضريبة مخرجات',
                default_inventory_account_id: 'المخزون',
                default_fx_gain_account_id: 'أرباح عملة',
                default_fx_loss_account_id: 'خسائر عملة',
                default_freight_in_account_id: 'شحن',
                default_retained_earnings_account_id: 'أرباح محتجزة',
                default_customer_advance_account_id: 'سلف عملاء',
                default_supplier_advance_account_id: 'سلف موردين',
            };

            console.log('\n   🎯 حالة الربط في الإعدادات:');
            let setCount = 0;
            let unsetFields = [];
            for (const [field, label] of Object.entries(fieldLabels)) {
                const isSet = !!settings[field];
                if (isSet) setCount++;
                else unsetFields.push(label);
                console.log(`      ${isSet ? '✅' : '❌'} ${label}`);
            }
            console.log(`\n   📊 الملخص: ${setCount}/16 حساب مربوط`);
            if (unsetFields.length > 0) {
                console.log(`   ❌ غير مربوط: ${unsetFields.join(', ')}`);
            }
        } else {
            console.log('\n   ❌ لا توجد إعدادات محاسبية لهذه الشركة!');
        }
    }

    console.log(`\n\n${'═'.repeat(60)}`);
    console.log('✅ انتهى الفحص');
    console.log(`${'═'.repeat(60)}`);
}

main().catch(console.error);
