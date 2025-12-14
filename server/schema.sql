-- Bill Splitter D1 Database Schema

-- Splits table
CREATE TABLE IF NOT EXISTS splits (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  split_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  split_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_split_id ON participants(split_id);
CREATE INDEX IF NOT EXISTS idx_expenses_split_id ON expenses(split_id);
CREATE INDEX IF NOT EXISTS idx_expenses_participant_id ON expenses(participant_id);
CREATE INDEX IF NOT EXISTS idx_splits_created_at ON splits(created_at);
