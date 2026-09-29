-- ================================================================
-- 시스템(MES/SPC/MMD) 기준정보화 — 하드코딩 제거, 테이블에서 관리
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

CREATE TABLE IF NOT EXISTS systems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 로그인한 사용자라면 누구나 공유해서 읽고/추가/삭제 가능 (개인 소유 데이터 아님)
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "systems shared for authenticated users" ON systems
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

INSERT INTO systems (name, sort_order) VALUES
  ('MES', 0), ('SPC', 1), ('MMD', 2)
ON CONFLICT (name) DO NOTHING;

-- 기존에 'MES'/'SPC'/'MMD'로 고정돼있던 CHECK 제약 제거
-- (이제 systems 테이블에 등록된 값이면 뭐든 저장 가능)
ALTER TABLE ts_notes DROP CONSTRAINT IF EXISTS ts_notes_category_check;
ALTER TABLE analysis_items DROP CONSTRAINT IF EXISTS analysis_items_system_check;
