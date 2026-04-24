-- 문항별 답변 (MCP로 friend-sociogram 프로젝트에도 적용됨)
-- q1~q10, value는 jsonb: 배열·숫자·문자열

CREATE TABLE IF NOT EXISTS public.survey_answer_rows (
  session_id uuid NOT NULL REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  author_id text NOT NULL,
  question text NOT NULL CHECK (question IN ('q1','q2','q3','q4','q5','q6','q7','q8','q9','q10')),
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, author_id, question)
);

CREATE INDEX IF NOT EXISTS survey_answer_rows_session_idx ON public.survey_answer_rows (session_id);

ALTER TABLE public.survey_answer_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_answer_rows_anon_all" ON public.survey_answer_rows;
CREATE POLICY "survey_answer_rows_anon_all" ON public.survey_answer_rows
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
