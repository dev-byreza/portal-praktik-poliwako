-- Make instructor signup durable for both confirmed and email-pending accounts.
-- The auth trigger owns profile creation; the browser only refreshes fields
-- after a session exists, so RLS cannot leave a half-created account.

CREATE OR REPLACE FUNCTION public.handle_new_instructor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_department TEXT;
  v_nip TEXT;
  v_avatar_url TEXT;
BEGIN
  IF lower(COALESCE(NEW.email, '')) NOT LIKE '%@politekniksorowako.ac.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya akun email @politekniksorowako.ac.id yang diizinkan.';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Teknik Mesin');
  v_nip := NULLIF(NEW.raw_user_meta_data->>'nip', '');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
  VALUES (NEW.id, lower(NEW.email), v_name, v_nip, v_department, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
    department = COALESCE(NULLIF(EXCLUDED.department, ''), public.profiles.department),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_instructor();

-- Repair accounts created before this migration (including accounts whose
-- browser-side profile upsert was rejected by RLS).
INSERT INTO public.profiles (id, email, name, nip, department, avatar_url)
SELECT
  u.id,
  lower(u.email),
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1)),
  NULLIF(u.raw_user_meta_data->>'nip', ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'department', ''), 'Teknik Mesin'),
  NULLIF(u.raw_user_meta_data->>'avatar_url', '')
FROM auth.users u
WHERE lower(COALESCE(u.email, '')) LIKE '%@politekniksorowako.ac.id'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
  nip = COALESCE(EXCLUDED.nip, public.profiles.nip),
  department = CASE
    WHEN EXCLUDED.department <> 'Teknik Mesin' THEN EXCLUDED.department
    ELSE public.profiles.department
  END,
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
  updated_at = NOW();

DROP POLICY IF EXISTS "Profiles insertable by owner" ON public.profiles;
CREATE POLICY "Profiles insertable by owner"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Profiles updatable by owner" ON public.profiles;
CREATE POLICY "Profiles updatable by owner"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
