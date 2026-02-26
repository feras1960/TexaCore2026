/**
 * fix-roll-costs.cjs
 * ══════════════════════════════════════
 * المرحلة 1 — الإصلاح الفوري للرولونات الموجودة:
 * 1. تصحيح cost_per_meter = 0 للرولونات الـ34
 * 2. ربط الرولونات بالكونتينر (container_id, container_item_id)
 * 3. تقرير النتائج
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRollCosts() {
    console.log('🔧 بدء إصلاح تكاليف الرولونات...\n');

    // ══ 1. الوضع الحالي ══
    const { data: rolls, error: rollsErr } = await supabase
        .from('fabric_rolls')
        .select('id, roll_number, material_id, cost_per_meter, container_id, container_item_id, initial_length')
        .order('created_at', { ascending: true });

    if (rollsErr) {
        console.error('❌ خطأ في جلب الرولونات:', rollsErr.message);
        return;
    }

    console.log(`📦 إجمالي الرولونات: ${rolls.length}`);
    const zeroCostRolls = rolls.filter(r => !r.cost_per_meter || r.cost_per_meter === 0);
    const noContainerRolls = rolls.filter(r => !r.container_id);
    console.log(`⚠️  رولونات بتكلفة صفرية: ${zeroCostRolls.length}`);
    console.log(`⚠️  رولونات بلا ربط كونتينر: ${noContainerRolls.length}\n`);

    // ══ 2. جلب بيانات الكونتينر والمواد ══
    const { data: containerItems, error: ciErr } = await supabase
        .from('container_items')
        .select('id, container_id, material_id, unit_cost, quantity, total_cost');

    if (ciErr) {
        console.error('❌ خطأ في جلب container_items:', ciErr.message);
        return;
    }

    const { data: containers, error: conErr } = await supabase
        .from('containers')
        .select('id, container_number, status');

    if (conErr) {
        console.error('❌ خطأ في جلب الكونتينرات:', conErr.message);
        return;
    }

    console.log(`📋 container_items المتاحة: ${containerItems.length}`);
    console.log(`📋 الكونتينرات المتاحة: ${containers.length}\n`);

    // ══ 3. بناء خريطة material → container_item ══
    // رولون يرتبط بكونتينر عبر material_id
    const materialToContainerItem = {};
    for (const ci of containerItems) {
        if (!materialToContainerItem[ci.material_id]) {
            materialToContainerItem[ci.material_id] = ci;
        }
    }

    // ══ 4. إصلاح كل رولون ══
    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const roll of rolls) {
        const ci = materialToContainerItem[roll.material_id];

        if (!ci) {
            console.log(`⏭️  الرولون ${roll.roll_number} — لا يوجد container_item لهذه المادة`);
            skipped++;
            continue;
        }

        const needsCostFix = !roll.cost_per_meter || roll.cost_per_meter === 0;
        const needsContainerFix = !roll.container_id;

        if (!needsCostFix && !needsContainerFix) {
            skipped++;
            continue;
        }

        const updateData = {};

        if (needsCostFix && ci.unit_cost > 0) {
            updateData.cost_per_meter = ci.unit_cost;
            updateData.supplier_unit_cost = ci.unit_cost;
            updateData.estimated_landed_cost = ci.unit_cost;
            updateData.cost_status = 'provisional';
        }

        if (needsContainerFix) {
            updateData.container_id = ci.container_id;
            updateData.container_item_id = ci.id;
        }

        if (Object.keys(updateData).length === 0) {
            skipped++;
            continue;
        }

        const { error } = await supabase
            .from('fabric_rolls')
            .update(updateData)
            .eq('id', roll.id);

        if (error) {
            console.error(`❌ فشل إصلاح الرولون ${roll.roll_number}:`, error.message);
            errors++;
        } else {
            const costMsg = needsCostFix ? `cost: 0 → ${ci.unit_cost}` : '';
            const containerMsg = needsContainerFix ? `container: ${ci.container_id.substring(0, 8)}...` : '';
            console.log(`✅ ${roll.roll_number} — ${[costMsg, containerMsg].filter(Boolean).join(', ')}`);
            fixed++;
        }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('📊 نتائج الإصلاح:');
    console.log(`  ✅ مُصلَح: ${fixed} رولون`);
    console.log(`  ⏭️  تجاوز: ${skipped} رولون (لا يحتاج تعديل أو لا يوجد ربط)`);
    console.log(`  ❌ أخطاء: ${errors} رولون`);

    // ══ 5. تحقق ما بعد الإصلاح ══
    console.log('\n🔍 التحقق من النتائج...');
    const { data: afterRolls } = await supabase
        .from('fabric_rolls')
        .select('id, cost_per_meter, container_id');

    const afterZero = afterRolls?.filter(r => !r.cost_per_meter || r.cost_per_meter === 0) || [];
    const afterNoContainer = afterRolls?.filter(r => !r.container_id) || [];

    console.log(`📈 بعد الإصلاح:`);
    console.log(`  - رولونات بتكلفة صفرية: ${afterZero.length} (كانت ${zeroCostRolls.length})`);
    console.log(`  - رولونات بلا كونتينر: ${afterNoContainer.length} (كانت ${noContainerRolls.length})`);

    if (afterZero.length === 0) {
        console.log('\n✅ نجاح! جميع الرولونات لديها تكلفة > 0');
    } else {
        console.log(`\n⚠️ تبقى ${afterZero.length} رولون بتكلفة صفرية — قد تكون موادها ليست في أي كونتينر`);
    }

    // ══ 6. فحص inventory_movements ══
    const { data: movements, error: movErr } = await supabase
        .from('inventory_movements')
        .select('id, movement_type, quantity, unit_cost')
        .eq('movement_type', 'receipt');

    console.log('\n📦 inventory_movements (نوع: receipt):');
    if (movErr) {
        console.log('  ❌ خطأ:', movErr.message);
    } else if (!movements || movements.length === 0) {
        console.log('  ⚠️ لا توجد حركات مخزون من نوع receipt');
        console.log('  → يجب إكمال استلام جديد لتوليد الحركات');
    } else {
        console.log(`  ✅ يوجد ${movements.length} حركة استلام`);
        movements.forEach(m => {
            console.log(`    - qty: ${m.quantity}, cost: ${m.unit_cost}`);
        });
    }
}

fixRollCosts().catch(console.error);
