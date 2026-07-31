-- ================================================================
-- 업무일지(work_logs) — Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

CREATE TABLE IF NOT EXISTS work_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date    DATE NOT NULL UNIQUE,
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_logs DISABLE ROW LEVEL SECURITY;
