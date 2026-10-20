-- 議題結案狀態與最新結案／重開理由；不改動既有討論狀態。
ALTER TABLE ct_issues ADD COLUMN is_closed INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1));
ALTER TABLE ct_issues ADD COLUMN closure_reason TEXT;
ALTER TABLE ct_issues ADD COLUMN closure_changed_at DATETIME;
