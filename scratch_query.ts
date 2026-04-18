import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('fabric_materials')
        .select('id, name_ar, current_stock')
        .ilike('name_ar', '%قطن بياز - سادة - أبيض%');
        
    console.log("Material:", data);

    if (data && data.length > 0) {
        const { data: stockData } = await supabase
            .from('inventory_stock')
            .select('*')
            .eq('material_id', data[0].id);
        console.log("Stock:", stockData);
    }
}

check();
