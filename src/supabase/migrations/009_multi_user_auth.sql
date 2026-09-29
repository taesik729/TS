-- ================================================================
-- 회원가입/로그인 도입 — 사용자별 데이터 격리
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ⚠️ 실행 전, TS Note 로그인 화면에서 taesik729@gmail.com 계정으로
--    먼저 로그인해서 그 계정이 실제로 존재하는지 확인하세요
--    (이미 태식팜 MES에 가입되어 있다면 그대로 로그인 가능합니다)
-- ================================================================

-- ── ts_notes ──────────────────────────────────────────────
ALTER TABLE ts_notes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE ts_notes SET user_id = (SELECT id FROM auth.users WHERE email = 'taesik729@gmail.com') WHERE user_id IS NULL;
ALTER TABLE ts_notes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE ts_notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE ts_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts_notes own rows" ON ts_notes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── csr_tasks ─────────────────────────────────────────────
ALTER TABLE csr_tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE csr_tasks SET user_id = (SELECT id FROM auth.users WHERE email = 'taesik729@gmail.com') WHERE user_id IS NULL;
ALTER TABLE csr_tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE csr_tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE csr_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csr_tasks own rows" ON csr_tasks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── csr_comments ──────────────────────────────────────────
ALTER TABLE csr_comments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE csr_comments SET user_id = (SELECT id FROM auth.users WHERE email = 'taesik729@gmail.com') WHERE user_id IS NULL;
ALTER TABLE csr_comments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE csr_comments ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE csr_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csr_comments own rows" ON csr_comments
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── work_logs (하루 1건 제약을 사용자별로 재정의) ──────────
ALTER TABLE work_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE work_logs SET user_id = (SELECT id FROM auth.users WHERE email = 'taesik729@gmail.com') WHERE user_id IS NULL;
ALTER TABLE work_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE work_logs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE work_logs DROP CONSTRAINT IF EXISTS work_logs_log_date_key;
ALTER TABLE work_logs ADD CONSTRAINT work_logs_log_date_user_id_key UNIQUE (log_date, user_id);
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_logs own rows" ON work_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── analysis_items ────────────────────────────────────────
ALTER TABLE analysis_items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE analysis_items SET user_id = (SELECT id FROM auth.users WHERE email = 'taesik729@gmail.com') WHERE user_id IS NULL;
ALTER TABLE analysis_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE analysis_items ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE analysis_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analysis_items own rows" ON analysis_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
