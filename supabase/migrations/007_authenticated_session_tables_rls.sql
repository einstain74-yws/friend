-- Logged-in browsers use JWT role `authenticated`, not `anon`. Session tables (001/003) had only `anon` policies,
-- so rosters were empty without error. Mirror MVP policies for `authenticated` (session UUID = shared secret).
-- After apply: `select students from public.rosters where session_id = '<uuid>';` in SQL Editor should match app.

DROP POLICY IF EXISTS "class_sessions_authenticated_all" ON public.class_sessions;
CREATE POLICY "class_sessions_authenticated_all" ON public.class_sessions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "rosters_authenticated_all" ON public.rosters;
CREATE POLICY "rosters_authenticated_all" ON public.rosters
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "survey_responses_authenticated_all" ON public.survey_responses;
CREATE POLICY "survey_responses_authenticated_all" ON public.survey_responses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 003에서 추가된 테이블; 001만 있는 오래된 DB는 건너뜀
DO $policy$
BEGIN
  IF to_regclass('public.survey_answer_rows') IS NOT NULL THEN
    EXECUTE $sql$
      DROP POLICY IF EXISTS "survey_answer_rows_authenticated_all" ON public.survey_answer_rows;
      CREATE POLICY "survey_answer_rows_authenticated_all" ON public.survey_answer_rows
        FOR ALL TO authenticated
        USING (true)
        WITH CHECK (true);
    $sql$;
  END IF;
END
$policy$;
