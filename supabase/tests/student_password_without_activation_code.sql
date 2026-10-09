-- Run with an administrative SQL connection. Fixtures and all changes roll back.
BEGIN;
DO $$
DECLARE
  v_student_id UUID := gen_random_uuid();
  v_unenrolled_id UUID := gen_random_uuid();
  v_nim TEXT := 'T' || left(replace(v_student_id::TEXT, '-', ''), 12);
  v_unenrolled_nim TEXT := 'T' || left(replace(v_unenrolled_id::TEXT, '-', ''), 12);
  v_period_id UUID;
  v_slug TEXT;
  v_owner UUID;
  v_result JSONB;
  v_hash TEXT;
  v_first_token TEXT;
BEGIN
  SELECT p.id, c.slug, c.instructor_id INTO v_period_id, v_slug, v_owner
  FROM public.practice_periods p JOIN public.courses c ON c.id = p.course_id
  WHERE c.status = 'PUBLISHED' LIMIT 1;
  IF v_period_id IS NULL THEN RAISE EXCEPTION 'Test requires a published course with a practice period.'; END IF;

  INSERT INTO public.students(id, instructor_id, nim, name, class_name)
  VALUES (v_student_id, v_owner, v_nim, 'Temporary password regression fixture', '1C'),
    (v_unenrolled_id, v_owner, v_unenrolled_nim, 'Temporary unenrolled fixture', '1C');
  INSERT INTO public.practice_participants(period_id, student_id) VALUES (v_period_id, v_student_id);

  -- Exercise the public entry point with the same database role as the browser.
  SET LOCAL ROLE anon;
  v_result := public.student_auth_set_password(v_nim, 'short', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Short password accepted.'; END IF;
  v_result := public.student_auth_set_password(v_nim, repeat('a', 73), v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Overlong bcrypt password accepted.'; END IF;
  v_result := public.student_auth_set_password(v_unenrolled_nim, 'Regression-password-1', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Unenrolled student accepted.'; END IF;
  v_result := public.student_auth_set_password(v_nim, 'Regression-password-1', 'unknown-regression-course', v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Wrong course accepted.'; END IF;
  v_result := public.student_auth_set_password(v_nim, 'Regression-password-1', v_slug, gen_random_uuid());
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Wrong period accepted.'; END IF;

  v_result := public.student_auth_set_password(upper(' ' || v_nim || ' '), 'Regression-password-1', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE OR coalesce(v_result->>'sessionToken', '') = '' THEN
    RAISE EXCEPTION 'Password creation without code failed.';
  END IF;
  v_first_token := v_result->>'sessionToken';
  RESET ROLE;
  SELECT password_hash INTO v_hash FROM public.students WHERE id = v_student_id;
  IF v_hash = 'Regression-password-1' OR extensions.crypt('Regression-password-1', v_hash) <> v_hash THEN
    RAISE EXCEPTION 'Password was not bcrypt hashed.';
  END IF;

  SET LOCAL ROLE anon;
  v_result := public.student_auth_set_password(v_nim, 'Replacement-password', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Existing password overwritten.'; END IF;
  v_result := public.student_auth_set_password(v_nim, 'Replacement-password', 'legacy-unused-code', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Legacy RPC overwrote password.'; END IF;
  v_result := public.student_auth_login(v_nim, 'Regression-password-1', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Login after password creation failed.'; END IF;
  RESET ROLE;

  IF has_function_privilege('anon', 'public.student_auth_reset_password(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous reset access is enabled.';
  END IF;
  IF has_function_privilege('authenticated', 'public.student_auth_issue_activation_code(uuid,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Code issuance remains available.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
  PERFORM set_config('request.jwt.claims', '{}', TRUE);
  BEGIN
    PERFORM public.student_auth_reset_password(v_student_id);
    RAISE EXCEPTION 'Reset without instructor identity accepted.';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Sesi instruktur diperlukan untuk mereset password.' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.student_auth_reset_password(v_student_id);
    RAISE EXCEPTION 'Unauthorized instructor reset accepted.';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Instruktur tidak berwenang mengelola akun mahasiswa ini.' THEN RAISE; END IF;
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', v_owner::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  v_result := public.student_auth_reset_password(v_student_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Authorized reset failed.'; END IF;
  RESET ROLE;
  IF EXISTS (SELECT 1 FROM private.student_sessions WHERE student_id = v_student_id AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Reset left an old session active.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id AND password_hash IS NOT NULL) THEN
    RAISE EXCEPTION 'Reset did not clear the password.';
  END IF;

  SET LOCAL ROLE anon;
  v_result := public.student_restore_session_profile(v_first_token);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Revoked session still restores.'; END IF;
  v_result := public.student_auth_set_password(v_nim, 'Regression-password-2', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Password recreation without code failed.'; END IF;
  v_result := public.student_auth_login(v_nim, 'Regression-password-1', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Old password still works.'; END IF;
  v_result := public.student_auth_login(v_nim, 'Regression-password-2', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'New password login failed.'; END IF;
  RESET ROLE;
END;
$$;
SELECT 'PASS: password creation, enrollment, overwrite protection, reset authorization, session revocation, and recreation without codes' AS result;
ROLLBACK;
