import Database from "better-sqlite3";

export function createDatabase(filename = "headaches.db", logger) {
  const log = logger.child({ module: "database" });

  log.info({ filename }, "Opening database");
  const db = new Database(filename);

  db.exec(`
    CREATE TABLE IF NOT EXISTS headaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  log.debug("Schema initialized");

  const insertStmt = db.prepare(
    "INSERT INTO headaches (user_id, description) VALUES (?, ?)"
  );

  function recordHeadache(userId, description) {
    const result = insertStmt.run(userId, description || null);
    log.debug({ userId, id: result.lastInsertRowid }, "Headache inserted");
    return result.lastInsertRowid;
  }

  function close() {
    log.info("Closing database");
    db.close();
  }

  return { recordHeadache, close, db };
}
