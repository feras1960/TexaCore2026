-- ═══════════════════════════════════════════════════════════════
-- Database Trigger لإنشاء User Profile تلقائياً عند Signup
-- ═══════════════════════════════════════════════════════════════

-- Function لإنشاء user_profile تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء user_profile تلقائياً عند إنشاء مستخدم جديد
  -- لا نحتاج company_id هنا - سيتم ربطه لاحقاً
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

-- Trigger عند إنشاء مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- السماح للـ trigger بالكتابة في user_profiles
-- (SECURITY DEFINER يسمح بذلك)
