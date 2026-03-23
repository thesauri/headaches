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

  // Migration: add structured tracking fields
  const columns = db.pragma("table_info(headaches)").map((c) => c.name);
  if (!columns.includes("has_headache")) {
    db.exec("ALTER TABLE headaches ADD COLUMN has_headache INTEGER");
  }
  if (!columns.includes("neck_stiffness")) {
    db.exec("ALTER TABLE headaches ADD COLUMN neck_stiffness INTEGER");
  }
  if (!columns.includes("screen_hours")) {
    db.exec("ALTER TABLE headaches ADD COLUMN screen_hours REAL");
  }
  if (!columns.includes("hydration")) {
    db.exec("ALTER TABLE headaches ADD COLUMN hydration INTEGER");
  }

  log.debug("Schema initialized");

  const insertStmt = db.prepare(
    "INSERT INTO headaches (user_id, description) VALUES (?, ?)"
  );

  const updateStmt = db.prepare(`
    UPDATE headaches SET
      has_headache = COALESCE(?, has_headache),
      neck_stiffness = COALESCE(?, neck_stiffness),
      screen_hours = COALESCE(?, screen_hours),
      hydration = COALESCE(?, hydration)
    WHERE id = ?
  `);

  function recordHeadache(userId, description) {
    const result = insertStmt.run(userId, description || null);
    log.debug({ userId, id: result.lastInsertRowid }, "Entry inserted");
    return result.lastInsertRowid;
  }

  function updateEntry(id, fields) {
    updateStmt.run(
      fields.has_headache ?? null,
      fields.neck_stiffness ?? null,
      fields.screen_hours ?? null,
      fields.hydration ?? null,
      id
    );
    log.debug({ id, fields }, "Entry updated");
  }

  function close() {
    log.info("Closing database");
    db.close();
  }

  return { recordHeadache, updateEntry, close, db };
}
