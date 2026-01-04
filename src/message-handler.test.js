import { describe, it, expect, vi } from "vitest";
import { createMessageHandler } from "./message-handler.js";

describe("createMessageHandler", () => {
  it("records headache and returns confirmation", () => {
    const mockDb = { recordHeadache: vi.fn() };
    const handler = createMessageHandler(mockDb);

    const message = { text: "bad sleep", from: { id: 123 }, chat: { id: 123 } };
    const result = handler(message);

    expect(result).toBe("Recorded ✓");
    expect(mockDb.recordHeadache).toHaveBeenCalledWith(123, "bad sleep");
  });

  it("trims whitespace from description", () => {
    const mockDb = { recordHeadache: vi.fn() };
    const handler = createMessageHandler(mockDb);

    const message = { text: "  stress  ", from: { id: 1 }, chat: { id: 1 } };
    handler(message);

    expect(mockDb.recordHeadache).toHaveBeenCalledWith(1, "stress");
  });

  it("returns error when user ID is missing", () => {
    const mockDb = { recordHeadache: vi.fn() };
    const handler = createMessageHandler(mockDb);

    const message = { text: "headache", chat: { id: 123 } };
    const result = handler(message);

    expect(result).toBe("Could not identify user");
    expect(mockDb.recordHeadache).not.toHaveBeenCalled();
  });

  it("returns error when text is missing", () => {
    const mockDb = { recordHeadache: vi.fn() };
    const handler = createMessageHandler(mockDb);

    const message = { from: { id: 123 }, chat: { id: 123 } };
    const result = handler(message);

    expect(result).toBe("Please describe your headache");
    expect(mockDb.recordHeadache).not.toHaveBeenCalled();
  });

  it("returns error when text is empty", () => {
    const mockDb = { recordHeadache: vi.fn() };
    const handler = createMessageHandler(mockDb);

    const message = { text: "   ", from: { id: 123 }, chat: { id: 123 } };
    const result = handler(message);

    expect(result).toBe("Please describe your headache");
    expect(mockDb.recordHeadache).not.toHaveBeenCalled();
  });
});
