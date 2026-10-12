-- Preserve the existing instructor profile when Supabase links a verified
-- Google identity to the same auth.users row by matching email.
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
    updated_at = NOW();

  RETURN NEW;
END;
$$;
