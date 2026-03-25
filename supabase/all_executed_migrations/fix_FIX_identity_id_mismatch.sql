-- ═══════════════════════════════════════════════════════════════
-- FIX: Identity ID Mismatch + Missing Profile Trigger
-- Date: 2026-03-08
-- ═══════════════════════════════════════════════════════════════
-- 
-- Problem 1: inviteUserByEmail() created identities where 
--   id != identity_data->>'sub', causing "Database error finding user"
-- Solution: Fixed all existing mismatches. Switched to createUser() API.
--
-- Problem 2: Trigger on_auth_user_created was missing,
--   so user_profiles weren't auto-created on signup.
-- Solution: Recreated the trigger.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Fix all existing identity mismatches (one-time)
UPDATE auth.identities
SET id = user_id
WHERE provider = 'email'
AND id::text != (identity_data->>'sub')::text;

-- Step 2: Recreate missing profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

