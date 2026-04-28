-- 로그인 교사 계정 단위 교사용 화면 PIN (반별 class_sessions.admin_password 와 별개)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_access_pin text;

COMMENT ON COLUMN public.profiles.teacher_access_pin IS 'Supabase 로그인 교사의 교우관계 분석기「교사용」진입 PIN. NULL이면 앱에서 0000과 동일.';
