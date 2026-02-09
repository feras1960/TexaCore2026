-- ═══════════════════════════════════════════════════════════════
-- دالة لحساب إحصائيات الرولات لكل مادة
-- تعرض: عدد الرولات، مجموع أطوال الرولات، والكمية السائبة (غير المجرودة برولات)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_material_inventory_stats(company_id_param UUID)
RETURNS TABLE (
    material_id UUID,
    total_stock NUMERIC,
    rolls_count BIGINT,
    rolls_total_length NUMERIC,
    loose_stock NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as material_id,
        COALESCE(m.current_stock, 0) as total_stock,
        COUNT(r.id) as rolls_count,
        COALESCE(SUM(r.current_length), 0) as rolls_total_length,
        (COALESCE(m.current_stock, 0) - COALESCE(SUM(r.current_length), 0)) as loose_stock
    FROM 
        fabric_materials m
    LEFT JOIN 
        fabric_rolls r ON m.id = r.material_id AND r.status = 'available' -- فقط الرولات المتاحة
    WHERE 
        m.company_id = company_id_param
    GROUP BY 
        m.id, m.current_stock;
END;
$$;
