-- ═══════════════════════════════════════════════════════════════
-- إنشاء VIEW يدمج تفاصيل المادة مع إحصائيات الرولات
-- هذا أسهل للاستعلام من Frontend
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW materials_with_stats AS
SELECT 
    m.*,
    COALESCE(stats.rolls_count, 0) as rolls_count,
    COALESCE(stats.rolls_total_length, 0) as rolls_total_length,
    (COALESCE(m.current_stock, 0) - COALESCE(stats.rolls_total_length, 0)) as loose_stock
FROM 
    fabric_materials m
LEFT JOIN (
    SELECT 
        material_id, 
        COUNT(*) as rolls_count, 
        SUM(current_length) as rolls_total_length
    FROM 
        fabric_rolls
    WHERE 
        status = 'available'
    GROUP BY 
        material_id
) stats ON m.id = stats.material_id;

-- منح صلاحيات القراءة للـ Authenticated users
GRANT SELECT ON materials_with_stats TO authenticated;
