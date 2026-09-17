-- Keep the private student-session table inaccessible through direct table
-- access. Quiz authentication continues through the server functions.

ALTER TABLE private.student_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct student session access" ON private.student_sessions;
CREATE POLICY "No direct student session access"
  ON private.student_sessions FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);
