-- 匿名使用者回報只保存分類、描述、頁面路徑與回報時間，不保存身分或環境資訊。
CREATE TABLE IF NOT EXISTS ct_feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT    NOT NULL CHECK (category IN ('bug', 'usability', 'suggestion')),
  description TEXT    NOT NULL,
  page_path   TEXT    NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ct_feedback_created
  ON ct_feedback(created_at DESC, id DESC);
