-- 교실 세션·명단·설문 응답 (클라이언트 anon 키 + RLS — 세션 UUID 비밀을 전제로 한 MVP)
-- Supabase SQL Editor에서 한 번에 실행하거나 supabase db push 로 적용

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rosters (
  session_id uuid NOT NULL REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  students jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (session_id)
);

CREATE TABLE IF NOT EXISTS public.survey_responses (
  session_id uuid NOT NULL REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  author_id text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, author_id)
);

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_sessions_anon_all" ON public.class_sessions;
CREATE POLICY "class_sessions_anon_all" ON public.class_sessions
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "rosters_anon_all" ON public.rosters;
CREATE POLICY "rosters_anon_all" ON public.rosters
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "survey_responses_anon_all" ON public.survey_responses;
CREATE POLICY "survey_responses_anon_all" ON public.survey_responses
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
