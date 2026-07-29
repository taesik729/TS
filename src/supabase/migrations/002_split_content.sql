-- ================================================================
-- TS 업무노트 — content를 요청사항/처리사항으로 분리
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

ALTER TABLE ts_notes RENAME COLUMN content TO request_content;
ALTER TABLE ts_notes ADD COLUMN resolution_content TEXT;
