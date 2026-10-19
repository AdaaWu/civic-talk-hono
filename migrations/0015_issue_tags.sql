-- 議題標籤以 JSON 文字保存於既有 ct_issues，不新增業務表。
ALTER TABLE ct_issues ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
