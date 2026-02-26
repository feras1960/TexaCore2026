import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase
        .from('purchase_receipts')
        .select('id, container_id, status, created_at')
        .eq('status', 'draft');

    console.log(data);
    if (error) console.error(error);
}
run();
