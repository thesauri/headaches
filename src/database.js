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
  // hydration is no longer asked, the column is kept for historical entries
  if (!columns.includes("hydration")) {
    db.exec("ALTER TABLE headaches ADD COLUMN hydration INTEGER");
  }
  if (!columns.includes("sensitivity")) {
    db.exec("ALTER TABLE headaches ADD COLUMN sensitivity TEXT");
  }
  // Same-day follow-ups point at the day's main entry
  if (!columns.includes("parent_id")) {
    db.exec("ALTER TABLE headaches ADD COLUMN parent_id INTEGER");
  }

  log.debug("Schema initialized");

  const insertStmt = db.prepare(
    "INSERT INTO headaches (user_id, description, parent_id) VALUES (?, ?, ?)"
  );

  const latestStmt = db.prepare(
    "SELECT id, created_at, parent_id FROM headaches WHERE user_id = ? ORDER BY id DESC LIMIT 1"
  );

  const promoteStmt = db.prepare(
    "UPDATE headaches SET parent_id = NULL WHERE id = ?"
  );

  const updateStmt = db.prepare(`
    UPDATE headaches SET
      has_headache = COALESCE(?, has_headache),
      neck_stiffness = COALESCE(?, neck_stiffness),
      screen_hours = COALESCE(?, screen_hours),
      sensitivity = COALESCE(?, sensitivity)
    WHERE id = ?
  `);

  function recordHeadache(userId, description, parentId = null) {
    const result = insertStmt.run(userId, description || null, parentId);
    log.debug({ userId, id: result.lastInsertRowid }, "Entry inserted");
    return result.lastInsertRowid;
  }

  function updateEntry(id, fields) {
    updateStmt.run(
      fields.has_headache ?? null,
      fields.neck_stiffness ?? null,
      fields.screen_hours ?? null,
      fields.sensitivity ?? null,
      id
    );
    log.debug({ id, fields }, "Entry updated");
  }

  function findLatestEntry(userId) {
    return latestStmt.get(userId) ?? null;
  }

  function promoteToEntry(id) {
    promoteStmt.run(id);
    log.debug({ id }, "Follow-up promoted to entry");
  }

  function close() {
    log.info("Closing database");
    db.close();
  }

  return {
    recordHeadache,
    updateEntry,
    findLatestEntry,
    promoteToEntry,
    close,
    db,
  };
}
