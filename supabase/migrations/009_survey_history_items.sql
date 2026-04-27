-- 과거 설문 마감 스냅샷(명단+응답) — 기기 간 동기화. client_id = 앱의 history id(문자열)
CREATE TABLE IF NOT EXISTS public.survey_history_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  client_id text NOT NULL,
  title text NOT NULL,
  students jsonb NOT NULL DEFAULT '[]'::jsonb,
  responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_history_items_session_client UNIQUE (session_id, client_id)
);

CREATE INDEX IF NOT EXISTS survey_history_items_session_idx ON public.survey_history_items (session_id);

ALTER TABLE public.survey_history_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_history_items_anon_all" ON public.survey_history_items;
CREATE POLICY "survey_history_items_anon_all" ON public.survey_history_items
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "survey_history_items_authenticated_all" ON public.survey_history_items;
CREATE POLICY "survey_history_items_authenticated_all" ON public.survey_history_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
