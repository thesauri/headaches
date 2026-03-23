import { describe, it, expect, vi } from "vitest";
import { createMessageHandler } from "./message-handler.js";
import { createMockLogger } from "./test-helpers.js";

function createMockDb() {
  return {
    recordHeadache: vi.fn(() => 1),
    updateEntry: vi.fn(),
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

  it("walks through all four questions", () => {
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
    expect(r3).toContain("Hydration?");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { screen_hours: 8 });

    const r4 = handler(msg("1"));
    expect(r4).toBe("All done ✓");
    expect(mockDb.updateEntry).toHaveBeenCalledWith(1, { hydration: 1 });
  });

  it("accepts ja/nej for headache question", () => {
    const mockDb = createMockDb();
    const handler = createMessageHandler(mockDb, createMockLogger());
    const msg = (text) => ({ text, from: { id: 1 }, chat: { id: 1 } });

    handler(msg("headache today"));
    const r = handler(msg("ja"));
    expect(r).toContain("Neck stiffness?");
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
    handler(msg("yes"));
    handler(msg("1"));

    const r = handler(msg("4,5"));
    expect(r).toContain("Hydration?");
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
});
