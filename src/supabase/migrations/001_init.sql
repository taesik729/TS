-- ================================================================
-- TS 업무노트 — Supabase DB 마이그레이션
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- (태식팜과 동일 Supabase 프로젝트에 테이블만 추가)
-- ================================================================

CREATE TABLE IF NOT EXISTS ts_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  category    TEXT NOT NULL CHECK (category IN ('MES', 'SPC', 'REPORT')),
  title       TEXT NOT NULL,
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 로그인 없이 anon key로 직접 CRUD 하는 개인용 도구이므로 RLS 미사용
ALTER TABLE ts_notes DISABLE ROW LEVEL SECURITY;
