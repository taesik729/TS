-- ================================================================
-- CSR 업무 관리 — Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

CREATE TABLE IF NOT EXISTS csr_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_no             SERIAL UNIQUE,
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT '진행' CHECK (status IN ('진행', '완료')),
  assignee            TEXT,
  start_date          DATE,
  due_date            DATE,
  priority            TEXT NOT NULL DEFAULT '보통' CHECK (priority IN ('낮음', '보통', '높음')),
  progress            INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  author              TEXT,
  content             TEXT,           -- 리치텍스트(HTML), 요청사항/처리사항 구분 없이 하나로 작성
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS csr_subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES csr_tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS csr_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES csr_tasks(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE csr_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE csr_subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE csr_comments DISABLE ROW LEVEL SECURITY;

-- 본문 리치텍스트에 삽입되는 이미지 저장용 버킷 (공개 읽기)
INSERT INTO storage.buckets (id, name, public)
VALUES ('csr-attachments', 'csr-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "csr attachments public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'csr-attachments');

CREATE POLICY "csr attachments public insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'csr-attachments');
