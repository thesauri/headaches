import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabase } from "./database.js";
import { createMockLogger } from "./test-helpers.js";

describe("createDatabase", () => {
  let database;

  beforeEach(() => {
    database = createDatabase(":memory:", createMockLogger());
  });

  afterEach(() => {
    database.close();
  });

  it("records a headache and returns the ID", () => {
    const id = database.recordHeadache(123, "migraine");
    expect(id).toBe(1);
  });

  it("records multiple headaches with incrementing IDs", () => {
    const id1 = database.recordHeadache(123, "stress");
    const id2 = database.recordHeadache(123, "dehydration");
    const id3 = database.recordHeadache(456, "lack of sleep");

    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(id3).toBe(3);
  });

  it("stores headache data correctly", () => {
    database.recordHeadache(123, "test description");

    const row = database.db
      .prepare("SELECT * FROM headaches WHERE id = 1")
      .get();
    expect(row.user_id).toBe(123);
    expect(row.description).toBe("test description");
    expect(row.created_at).toBeTruthy();
  });

  it("allows null description", () => {
    const id = database.recordHeadache(123, null);
    expect(id).toBe(1);

    const row = database.db
      .prepare("SELECT * FROM headaches WHERE id = 1")
      .get();
    expect(row.description).toBeNull();
  });

  it("updates structured fields on an entry", () => {
    const id = database.recordHeadache(123, "test");

    database.updateEntry(id, { has_headache: 1 });
    database.updateEntry(id, { neck_stiffness: 2 });
    database.updateEntry(id, { screen_hours: 6.5 });
    database.updateEntry(id, { sensitivity: "light" });

    const row = database.db
      .prepare("SELECT * FROM headaches WHERE id = ?")
      .get(id);
    expect(row.has_headache).toBe(1);
    expect(row.neck_stiffness).toBe(2);
    expect(row.screen_hours).toBe(6.5);
    expect(row.sensitivity).toBe("light");
  });

  it("does not overwrite existing fields when updating others", () => {
    const id = database.recordHeadache(123, "test");

    database.updateEntry(id, { has_headache: 1 });
    database.updateEntry(id, { neck_stiffness: 3 });

    const row = database.db
      .prepare("SELECT * FROM headaches WHERE id = ?")
      .get(id);
    expect(row.has_headache).toBe(1);
    expect(row.neck_stiffness).toBe(3);
  });

  it("has new columns after migration", () => {
    const columns = database.db
      .pragma("table_info(headaches)")
      .map((c) => c.name);
    expect(columns).toContain("has_headache");
    expect(columns).toContain("neck_stiffness");
    expect(columns).toContain("screen_hours");
    expect(columns).toContain("hydration");
    expect(columns).toContain("sensitivity");
    expect(columns).toContain("parent_id");
  });

  it("finds the latest entry for a user", () => {
    expect(database.findLatestEntry(123)).toBeNull();

    const id = database.recordHeadache(123, "main entry");
    database.recordHeadache(456, "someone else");
    const followUpId = database.recordHeadache(123, "follow-up", id);

    const latest = database.findLatestEntry(123);
    expect(latest.id).toBe(followUpId);
    expect(latest.parent_id).toBe(id);
    expect(latest.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("promotes a follow-up to a full entry", () => {
    const id = database.recordHeadache(123, "main entry");
    const followUpId = database.recordHeadache(123, "follow-up", id);

    database.promoteToEntry(followUpId);

    expect(database.findLatestEntry(123).parent_id).toBeNull();
  });
});
