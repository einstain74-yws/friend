-- 본인 소유 학급만 삭제: class_sessions 삭제 → classrooms·rosters·survey_responses 등 CASCADE
CREATE OR REPLACE FUNCTION public.delete_classroom_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.session_id = p_session_id AND c.owner_id = uid
  ) THEN
    RAISE EXCEPTION 'classroom not found or not owned';
  END IF;
  DELETE FROM public.class_sessions WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_classroom_for_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_classroom_for_session(uuid) TO authenticated;
