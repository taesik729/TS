-- ================================================================
-- TS 업무노트 — 분류 'REPORT' -> 'MMD'로 변경
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================================

UPDATE ts_notes SET category = 'MMD' WHERE category = 'REPORT';

ALTER TABLE ts_notes DROP CONSTRAINT IF EXISTS ts_notes_category_check;
ALTER TABLE ts_notes ADD CONSTRAINT ts_notes_category_check CHECK (category IN ('MES', 'SPC', 'MMD'));
