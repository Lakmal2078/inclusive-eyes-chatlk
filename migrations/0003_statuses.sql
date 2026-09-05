CREATE TABLE IF NOT EXISTS statuses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_type TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS status_views (
  id TEXT PRIMARY KEY,
  status_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  viewed_at INTEGER NOT NULL,
  FOREIGN KEY(status_id) REFERENCES statuses(id) ON DELETE CASCADE,
  FOREIGN KEY(viewer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(status_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_statuses_expiry ON statuses(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_views_status ON status_views(status_id);
