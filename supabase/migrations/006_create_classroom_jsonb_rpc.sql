-- PostgREST/Supabase JS가 3-인자 RPC를 스키마에서 못 찾는 경우가 있어, jsonb 단일 인자로 동일 동작을 제공 (005_classrooms.sql 적용 후 실행)
-- 005에 있는 create_classroom_for_teacher(text,int,text) 는 유지(호환). 앱은 create_classroom(jsonb) 를 사용합니다.

CREATE OR REPLACE FUNCTION public.create_classroom(p_payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_session uuid;
  new_classroom uuid;
  uid uuid;
  p_school text;
  p_grade int;
  p_class text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  p_school := nullif(trim(p_payload->>'school_name'), '');
  p_grade := coalesce((p_payload->>'grade')::int, 0);
  p_class := nullif(trim(p_payload->>'class_name'), '');

  IF p_school IS NULL OR p_class IS NULL THEN
    RAISE EXCEPTION 'school_name and class_name required';
  END IF;
  IF p_grade < 1 OR p_grade > 12 THEN
    RAISE EXCEPTION 'invalid grade';
  END IF;

  new_session := gen_random_uuid();
  INSERT INTO public.class_sessions (id) VALUES (new_session);
  INSERT INTO public.classrooms (owner_id, school_name, grade, class_name, session_id)
  VALUES (uid, p_school, p_grade, p_class, new_session)
  RETURNING id INTO new_classroom;

  RETURN json_build_object('session_id', new_session, 'classroom_id', new_classroom);
END;
$$;

REVOKE ALL ON FUNCTION public.create_classroom(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_classroom(jsonb) TO authenticated;
