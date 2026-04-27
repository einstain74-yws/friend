-- 학급(학교·학년·반) + 세션 1:1, 교사(auth.users) 소유. 학생(anon)은 기존처럼 session UUID로만 rosters/설문 접근.
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  school_name text NOT NULL,
  grade int NOT NULL CHECK (grade >= 1 AND grade <= 12),
  class_name text NOT NULL,
  session_id uuid NOT NULL UNIQUE REFERENCES public.class_sessions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classrooms_owner_id_idx ON public.classrooms (owner_id);
CREATE INDEX IF NOT EXISTS classrooms_session_id_idx ON public.classrooms (session_id);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classrooms_select_own" ON public.classrooms;
CREATE POLICY "classrooms_select_own" ON public.classrooms
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "classrooms_insert_own" ON public.classrooms;
CREATE POLICY "classrooms_insert_own" ON public.classrooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "classrooms_update_own" ON public.classrooms;
CREATE POLICY "classrooms_update_own" ON public.classrooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "classrooms_delete_own" ON public.classrooms;
CREATE POLICY "classrooms_delete_own" ON public.classrooms
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- 트랜잭션: class_sessions + classrooms (RLS 우회, 로그인한 교사만 호출)
CREATE OR REPLACE FUNCTION public.create_classroom_for_teacher(
  p_school_name text,
  p_grade int,
  p_class_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_session uuid;
  new_classroom uuid;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_grade < 1 OR p_grade > 12 THEN
    RAISE EXCEPTION 'invalid grade';
  END IF;
  IF coalesce(trim(p_school_name), '') = '' OR coalesce(trim(p_class_name), '') = '' THEN
    RAISE EXCEPTION 'school_name and class_name required';
  END IF;

  new_session := gen_random_uuid();
  INSERT INTO public.class_sessions (id) VALUES (new_session);
  INSERT INTO public.classrooms (owner_id, school_name, grade, class_name, session_id)
  VALUES (uid, trim(p_school_name), p_grade, trim(p_class_name), new_session)
  RETURNING id INTO new_classroom;

  RETURN json_build_object('session_id', new_session, 'classroom_id', new_classroom);
END;
$$;

REVOKE ALL ON FUNCTION public.create_classroom_for_teacher(text, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_classroom_for_teacher(text, int, text) TO authenticated;
