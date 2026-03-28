-- ==============================================================================
-- Migration: Re-numbering existing and received rolls to comprehensive format
-- ==============================================================================

-- 1. Helper Function to generate roll_code based on English text
CREATE OR REPLACE FUNCTION pg_temp.generate_roll_code(mat_name text)
RETURNS varchar AS $$
DECLARE
    clean_txt varchar;
BEGIN
    IF mat_name IS NULL OR mat_name = '' THEN
        RETURN 'MAT';
    END IF;

    -- Keep only English alphanumeric
    clean_txt := regexp_replace(UPPER(mat_name), '[^A-Z0-9]', '', 'g');
    
    -- Extract first 4 characters max
    IF length(clean_txt) >= 2 THEN
        RETURN substring(clean_txt from 1 for 4);
    END IF;
    
    RETURN 'MAT';
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the `roll_code` of all existing fabric rolls to use English material name or code.
-- This replaces the bugged 'XX' code used previously due to Arabic string matching.
UPDATE fabric_rolls fr
SET roll_code = COALESCE(
    (SELECT COALESCE(
        NULLIF(pg_temp.generate_roll_code(fm.code), 'MAT'),
        NULLIF(pg_temp.generate_roll_code(fm.name_en), 'MAT'),
        'MAT'
    ) FROM fabric_materials fm WHERE fm.id = fr.material_id),
    'MAT'
);

-- 3. Update the global sequence trigger to use the new comprehensive YYMM numbering system.
-- This ensures that any automatically synced rolls will also get `POLY-2603001`
CREATE OR REPLACE FUNCTION set_roll_seq()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-assign roll_seq if not provided
    IF NEW.roll_seq IS NULL THEN
        SELECT COALESCE(MAX(roll_seq), 0) + 1
        INTO NEW.roll_seq
        FROM fabric_rolls
        WHERE company_id = NEW.company_id;
    END IF;

    -- 2. Auto-generate numeric smart roll_number with YYMM structure 
    -- only if it's a temporary syncing role.
    IF NEW.roll_code IS NOT NULL 
       AND NEW.roll_code != '' 
       AND (NEW.roll_number LIKE 'TEMP-%' 
            OR NEW.roll_number LIKE 'JIT-%' 
            OR NEW.roll_number LIKE 'ROLL-%') THEN
        
        -- COMPREHENSIVE NEW FORMAT: {CODE}-{YYMM}{SEQ}
        NEW.roll_number := NEW.roll_code || '-' || TO_CHAR(CURRENT_DATE, 'YYMM') || LPAD(NEW.roll_seq::TEXT, 3, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Enforce the new sequential numeric format over ALL existing rolls, rewriting their `roll_number`
-- Since the user requested "إعادة ترقيم الأرقام الموجودة", we reset all to follow the new format.
UPDATE fabric_rolls
SET roll_number = roll_code || '-' || TO_CHAR(created_at, 'YYMM') || LPAD(roll_seq::TEXT, 3, '0');

SELECT 'Migration to comprehensive sequential numbers completed successfully!' as status;
