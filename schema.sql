PRAGMA foreign_keys=ON;

-- Schema version
PRAGMA user_version = 3;

-- Users
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Categories
CREATE TABLE IF NOT EXISTS task_categories (
  category_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#64748b',
  position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_task_categories_position
  ON task_categories(position, category_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  task_id INTEGER PRIMARY KEY,
  user_id INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  priority INTEGER DEFAULT 3,
  xp_reward INTEGER DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  due_date DATE,
  due_time TIME,
  recurrence TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (category_id) REFERENCES task_categories(category_id)
);
CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_due
  ON tasks(due_date);

-- Task Completions
CREATE TABLE IF NOT EXISTS task_completions (
  completion_id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  user_id INTEGER DEFAULT 1,
  quality_rating INTEGER,
  xp_earned INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_completions_user
  ON task_completions(user_id, completed_at DESC);

-- Checklists
CREATE TABLE IF NOT EXISTS checklists (
  checklist_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checklist Items
CREATE TABLE IF NOT EXISTS checklist_items (
  item_id INTEGER PRIMARY KEY,
  checklist_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  position INTEGER,
  FOREIGN KEY (checklist_id) REFERENCES checklists(checklist_id)
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_position
  ON checklist_items(checklist_id, position);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- AI Memory
CREATE TABLE IF NOT EXISTS ai_memory (
  memory_id INTEGER PRIMARY KEY,
  content TEXT,
  meta_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
