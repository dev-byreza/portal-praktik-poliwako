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
  v_admin UUID;
  v_reset_token TEXT;
  v_added_student_id UUID := gen_random_uuid();
  v_denied_student_id UUID := gen_random_uuid();
  v_deleted_count INTEGER;
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

  IF to_regprocedure('public.student_auth_reset_password(uuid)') IS NOT NULL
    OR to_regprocedure('public.student_auth_reset_own_password(text)') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy no-token and email reset functions remain available.';
  END IF;
  IF has_function_privilege('authenticated', 'public.student_auth_issue_activation_code(uuid,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Code issuance remains available.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '', TRUE);
  PERFORM set_config('request.jwt.claims', '{}', TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.student_auth_issue_password_reset_token(v_student_id);
    RAISE EXCEPTION 'Reset token issuance without admin identity accepted.';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Hanya admin yang dapat menerbitkan token reset password.' THEN RAISE; END IF;
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.students(id, instructor_id, nim, name, class_name)
    VALUES (v_denied_student_id, v_owner, 'D' || left(replace(v_denied_student_id::TEXT, '-', ''), 12), 'Unauthorized insert fixture', '1C');
    RAISE EXCEPTION 'Non-admin student insert accepted.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  DELETE FROM public.students WHERE id = v_student_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count <> 0 THEN RAISE EXCEPTION 'Non-admin student delete accepted.'; END IF;
  BEGIN
    PERFORM public.student_auth_issue_password_reset_token(v_student_id);
    RAISE EXCEPTION 'Non-admin reset token issuance accepted.';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Hanya admin yang dapat menerbitkan token reset password.' THEN RAISE; END IF;
  END;
  RESET ROLE;

  SELECT id INTO v_admin FROM auth.users
  WHERE lower(email) = 'rezaf@politekniksorowako.ac.id' AND email_confirmed_at IS NOT NULL
  LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Confirmed admin account not found for reset test.'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin::TEXT, TRUE);
  SET LOCAL ROLE authenticated;
  IF private.is_system_admin() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Admin email was not recognized.'; END IF;
  INSERT INTO public.students(id, instructor_id, nim, name, class_name)
  VALUES (v_added_student_id, v_owner, 'A' || left(replace(v_added_student_id::TEXT, '-', ''), 12), 'Admin insert fixture', '1C');
  DELETE FROM public.students WHERE id = v_added_student_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count <> 1 THEN RAISE EXCEPTION 'Admin student delete failed.'; END IF;
  v_result := public.student_auth_issue_password_reset_token(v_student_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Admin reset token issuance failed.'; END IF;
  v_reset_token := v_result->>'token';
  RESET ROLE;

  SET LOCAL ROLE anon;
  v_result := public.student_auth_reset_password_with_token(v_nim, v_reset_token, 'Replacement-password', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Valid admin reset token was rejected.'; END IF;
  RESET ROLE;
  IF EXISTS (SELECT 1 FROM private.student_sessions WHERE student_id = v_student_id AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Reset left an old session active.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id AND extensions.crypt('Replacement-password', password_hash) <> password_hash) THEN
    RAISE EXCEPTION 'Reset password was not stored correctly.';
  END IF;

  SET LOCAL ROLE anon;
  v_result := public.student_restore_session_profile(v_first_token);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Revoked session still restores.'; END IF;
  v_result := public.student_auth_login(v_nim, 'Regression-password-1', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Old password still works.'; END IF;
  v_result := public.student_auth_login(v_nim, 'Replacement-password', v_slug, v_period_id);
  IF (v_result->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'New password login failed.'; END IF;
  RESET ROLE;
END;
$$;
SELECT 'PASS: password creation, admin-only student CRUD and reset-token issuance, token reset, and session revocation' AS result;
ROLLBACK;
