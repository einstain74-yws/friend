-- 교사용 화면 진입 비밀번호(세션 UUID 보안 전제) — 기기 간 동기화
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS admin_password text;
