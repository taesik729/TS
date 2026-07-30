-- ================================================================
-- CSR 업무 관리 — 작성자 컬럼 제거
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

ALTER TABLE csr_tasks DROP COLUMN IF EXISTS author;
