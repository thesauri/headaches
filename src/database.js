import Database from "better-sqlite3";

export function createDatabase(filename = "headaches.db") {
  const db = new Database(filename);

  db.exec(`
    CREATE TABLE IF NOT EXISTS headaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const insertStmt = db.prepare(
    "INSERT INTO headaches (user_id, description) VALUES (?, ?)"
  );

  function recordHeadache(userId, description) {
    const result = insertStmt.run(userId, description || null);
    return result.lastInsertRowid;
  }

  function close() {
    db.close();
  }

  return { recordHeadache, close, db };
}
