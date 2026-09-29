-- ================================================================
-- 시스템 삭제 체크를 전체 사용자 기준으로 — RLS를 우회하는 집계 전용 함수
-- (실제 데이터는 반환하지 않고 "건수"만 계산하므로 다른 사용자 데이터 노출 없음)
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

CREATE OR REPLACE FUNCTION count_system_usage(system_name text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM ts_notes WHERE category = system_name) +
    (SELECT count(*) FROM analysis_items WHERE system = system_name);
$$;

GRANT EXECUTE ON FUNCTION count_system_usage(text) TO authenticated;
