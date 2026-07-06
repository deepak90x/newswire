import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const db = new DatabaseSync(path.join(root, "newswire.db"));

db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY,
    guid TEXT UNIQUE NOT NULL,
    feed TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT,
    published TEXT,
    content TEXT,
    summary TEXT,
    score INTEGER,
    topic TEXT,
    duplicate_of INTEGER REFERENCES articles(id),
    processed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_articles_processed ON articles(processed);
  CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
`);

export const insertArticle = db.prepare(`
  INSERT OR IGNORE INTO articles (guid, feed, title, link, published, content)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export const unprocessed = db.prepare(`
  SELECT id, title, content, feed FROM articles
  WHERE processed = 0 ORDER BY published DESC LIMIT ?
`);

export const saveResult = db.prepare(`
  UPDATE articles SET summary = ?, score = ?, topic = ?, processed = 1 WHERE id = ?
`);

export const markProcessed = db.prepare("UPDATE articles SET processed = 1 WHERE id = ?");

export const recentOriginals = db.prepare(`
  SELECT id, title FROM articles
  WHERE duplicate_of IS NULL AND id != ? AND created_at > datetime('now', ?)
`);

export const markDuplicate = db.prepare("UPDATE articles SET duplicate_of = ? WHERE id = ?");
