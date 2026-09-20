import { describe, it, expect, vi } from "vitest";
import { createMessageHandler } from "./message-handler.js";
import { createMockLogger } from "./test-helpers.js";

function createMockDb() {
  return {
    recordHeadache: vi.fn(() => 1),
    updateEntry: vi.fn(),
    findLatestEntry: vi.fn(() => null),
    promoteToEntry: vi.fn(),
  };
}

describe("createMessageHandler", () => {
  it("records entry and asks first follow-up question", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());

    const result = handler({
      text: "bad sleep",
      from: { id: 123 },
      chat: { id: 123 },
    });

    expect(result).toContain("Recorded ✓");
    expect(result).toContain("Headache today?");
    expect(mockDb.recordHeadache).toHaveBeenCalledWith(123, "bad sleep");
  });

  it("trims whitespace from description", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());

    handler({ text: "  stress  ", from: { id: 1 }, chat: { id: 1 } });

    expect(mockDb.recordHeadache).toHaveBeenCalledWith(1, "stress");
  });

  it("returns error when user ID is missing", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());

    const result = handler({ text: "headache", chat: { id: 123 } });

    expect(result).toBe("Could not identify user");
    expect(mockDb.recordHeadache).not.toHaveBeenCalled();
  });

  it("returns error when text is missing", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());

    const result = handler({ from: { id: 123 }, chat: { id: 123 } });

    expect(result).toBe("Please describe how you're feeling today");
    expect(mockDb.recordHeadache).not.toHaveBeenCalled();
  });

  it("returns error when text is empty", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());

    const result = handler({
      text: "   ",
      from: { id: 123 },
      chat: { id: 123 },
    });

    expect(result).toBe("Please describe how you're feeling today");
    expect(mockDb.recordHeadache).not.toHaveBeenCalled();
  });

  it("walks through the questions without a headache", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("feeling ok today"));

    const r1 = handler(msg("no"));
    expect(r1).toContain("Neck stiffness?");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { has_headache: 0 });

    const r2 = handler(msg("2"));
    expect(r2).toContain("Hours at desk/screen");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { neck_stiffness: 2 });

    const r3 = handler(msg("8"));
    expect(r3).toBe("All done ✓");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { screen_hours: 8 });
    expect(mockDb.updateEntry).toHaveBeenCalledTimes(3);
  });

  it("asks about sensitivity only when there is a headache", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("woke up with it"));

    const r1 = handler(msg("yes"));
    expect(r1).toContain("sensitivity");

    const r2 = handler(msg("Light, not sound"));
    expect(r2).toContain("Neck stiffness?");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, {
      sensitivity: "Light, not sound",
    });
  });

  it("accepts ja/nej for headache question", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("headache today"));
    const r = handler(msg("ja"));
    expect(r).toContain("sensitivity");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { has_headache: 1 });
  });

  it("retries on invalid answer", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("entry"));
    const r = handler(msg("maybe"));
    expect(r).toContain("Please answer yes or no");
    expect(r).toContain("skip");
    expect(mockDb.updateEntry).not.toHaveBeenCalled();
  });

  it("skip ends the session early", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("entry"));
    const r = handler(msg("skip"));
    expect(r).toBe("Done ✓");

    // Next message should start a new entry
    const r2 = handler(msg("new entry"));
    expect(r2).toContain("Recorded ✓");
  });

  it("skip with no active session returns nothing to skip", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());

    const r = handler({
      text: "skip",
      from: { id: 1 },
      chat: { id: 1 },
    });
    expect(r).toBe("Nothing to skip");
  });

  it("handles decimal screen hours", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("entry"));
    handler(msg("no"));
    handler(msg("1"));

    const r = handler(msg("4,5"));
    expect(r).toBe("All done ✓");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { screen_hours: 4.5 });
  });

  it("isolates sessions between users", () => {
    const mockDb = createMockDb();
    mockDb.recordHeadache = vi.fn((userId) => userId);
    const handler = createMessageHandler(mockDb, createMockLogger());

    handler({ text: "user1 entry", from: { id: 1 }, chat: { id: 1 } });
    handler({ text: "user2 entry", from: { id: 2 }, chat: { id: 2 } });

    handler({ text: "yes", from: { id: 1 }, chat: { id: 1 } });
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { has_headache: 1 });

    handler({ text: "no", from: { id: 2 }, chat: { id: 2 } });
    expect(mockDb.updateEntry).toHaveBeenCalledWith(2, { has_headache: 0 });
  });

  describe("same-day follow-ups", () => {
    const timezone = "America/Los_Angeles";
    // 2026-09-19 17:34 in Los Angeles
    const morningEntry = { id: 7, created_at: "2026-09-20 00:34:30", parent_id: null };
    const at = (iso) => Date.parse(iso) / 1000;
    const msg = (text, date) => ({ text, date, from: { id: 1 }, chat: { id: 1 } });

    it("adds a second message the same day as a follow-up without questions", () => {
      const mockDb = createMockDb();
      mockDb.findLatestEntry = vi.fn(() => morningEntry);
      const handler = createMessageHandler(mockDb, createMockLogger(), timezone);

      const r = handler(msg("still there in the evening", at("2026-09-20T04:00:00Z")));

      expect(r).toContain("Added to today's entry ✓");
      expect(r).not.toContain("Headache today?");
      expect(mockDb.recordHeadache).toHaveBeenCalledWith(1, "still there in the evening", 7);

      // No session was started, so the next message is another follow-up
      const r2 = handler(msg("gone now", at("2026-09-20T05:00:00Z")));
      expect(r2).toContain("Added to today's entry ✓");
    });

    it("attaches follow-ups to the main entry, not to earlier follow-ups", () => {
      const mockDb = createMockDb();
      mockDb.findLatestEntry = vi.fn(() => ({ id: 8, created_at: "2026-09-20 02:00:00", parent_id: 7 }));
      const handler = createMessageHandler(mockDb, createMockLogger(), timezone);

      handler(msg("another update", at("2026-09-20T04:00:00Z")));

      expect(mockDb.recordHeadache).toHaveBeenCalledWith(1, "another update", 7);
    });

    it("starts a new entry the next local day", () => {
      const mockDb = createMockDb();
      mockDb.findLatestEntry = vi.fn(() => morningEntry);
      const handler = createMessageHandler(mockDb, createMockLogger(), timezone);

      // 2026-09-20 08:00 in Los Angeles, same UTC date as the previous entry
      const r = handler(msg("slept fine", at("2026-09-20T15:00:00Z")));

      expect(r).toContain("Recorded ✓");
      expect(r).toContain("Headache today?");
      expect(mockDb.recordHeadache).toHaveBeenCalledWith(1, "slept fine");
    });

    it("new converts the latest follow-up into a full entry", () => {
      const mockDb = createMockDb();
      mockDb.findLatestEntry = vi.fn(() => ({ id: 8, created_at: "2026-09-20 02:00:00", parent_id: 7 }));
      const handler = createMessageHandler(mockDb, createMockLogger(), timezone);

      const r = handler(msg("new", at("2026-09-20T04:00:00Z")));
      expect(r).toContain("Headache today?");
      expect(mockDb.promoteToEntry).toHaveBeenCalledWith(8);
      expect(mockDb.recordHeadache).not.toHaveBeenCalled();

      handler(msg("yes", at("2026-09-20T04:01:00Z")));
      expect(mockDb.updateEntry).toHaveBeenCalledWith(8, { has_headache: 1 });
    });

    it("new with no follow-up returns nothing to convert", () => {
      const mockDb = createMockDb();
      mockDb.findLatestEntry = vi.fn(() => morningEntry);
      const handler = createMessageHandler(mockDb, createMockLogger(), timezone);

      expect(handler(msg("new", at("2026-09-20T04:00:00Z")))).toBe("Nothing to convert");
      expect(mockDb.promoteToEntry).not.toHaveBeenCalled();
    });
  });
});
