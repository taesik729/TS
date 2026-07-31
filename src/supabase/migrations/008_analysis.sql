-- ================================================================
-- 분석(analysis_items) — Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

CREATE TABLE IF NOT EXISTS analysis_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES analysis_items(id) ON DELETE CASCADE,
  system      TEXT CHECK (system IN ('MES', 'SPC', 'MMD')),
  work_type   TEXT CHECK (work_type IN ('개발', '분석')),
  log_date    DATE,
  title       TEXT NOT NULL,
  content     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analysis_items DISABLE ROW LEVEL SECURITY;
