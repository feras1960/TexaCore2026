SELECT proname, prosrc 
FROM pg_proc 
WHERE proname ILIKE '%update%invoice%payment%';
