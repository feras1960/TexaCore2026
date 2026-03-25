-- ═══════════════════════════════════════════════════════════════
-- دالة RPC لجلب إحصائيات مجموعة من المواد دفعة واحدة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_material_inventory_stats_batch(material_ids UUID[])
RETURNS TABLE (
    material_id UUID,
    rolls_count BIGINT,
    rolls_total_length NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.material_id,
        COUNT(r.id) as rolls_count,
        COALESCE(SUM(r.current_length), 0) as rolls_total_length
    FROM 
        fabric_rolls r
    WHERE 
        r.material_id = ANY(material_ids)
        AND r.status = 'available'
    GROUP BY 
        r.material_id;
END;
$$;
