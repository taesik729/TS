-- ================================================================
-- 시스템별 사용자 권한 — 관리자(taesik729@gmail.com)가 직원별로
-- 사용 가능한 시스템을 배정하는 구조
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

-- 관리자 판별 헬퍼 (지금은 관리자가 태식님 한 명이라 이메일로 고정)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'taesik729@gmail.com';
$$;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- 사용자별로 배정된 시스템
CREATE TABLE IF NOT EXISTS user_systems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_id   UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, system_id)
);

ALTER TABLE user_systems ENABLE ROW LEVEL SECURITY;

-- 조회: 본인 배정 내역이거나 관리자
DROP POLICY IF EXISTS "user_systems select own or admin" ON user_systems;
CREATE POLICY "user_systems select own or admin" ON user_systems
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- 배정/해제(추가·수정·삭제)는 관리자만
DROP POLICY IF EXISTS "user_systems insert admin only" ON user_systems;
CREATE POLICY "user_systems insert admin only" ON user_systems
  FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "user_systems update admin only" ON user_systems;
CREATE POLICY "user_systems update admin only" ON user_systems
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "user_systems delete admin only" ON user_systems;
CREATE POLICY "user_systems delete admin only" ON user_systems
  FOR DELETE USING (is_admin());

-- 관리자가 "직원 권한 관리" 화면에서 가입자 목록을 보기 위한 RPC
-- (auth.users는 앱에서 직접 조회 불가하므로 SECURITY DEFINER로 우회, 관리자만 호출 가능하도록 내부에서 체크)
CREATE OR REPLACE FUNCTION list_app_users()
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT au.id, au.email FROM auth.users au ORDER BY au.email;
END;
$$;
GRANT EXECUTE ON FUNCTION list_app_users() TO authenticated;
