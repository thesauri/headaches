import { describe, it, expect, vi } from "vitest";
import { createPoller } from "./polling.js";
import { createMockLogger } from "./test-helpers.js";

describe("createPoller", () => {
  it("processes updates and sends responses", async () => {
    const mockClient = {
      getUpdates: vi.fn().mockResolvedValue([
        { update_id: 1, message: { chat: { id: 123 }, text: "hi" } },
        { update_id: 2, message: { chat: { id: 456 }, text: "hey" } },
      ]),
      sendMessage: vi.fn().mockResolvedValue({}),
    };
    const mockHandler = vi.fn().mockReturnValue("hello");

    const poller = createPoller(mockClient, mockHandler, createMockLogger());
    await poller.processUpdates();

    expect(mockClient.getUpdates).toHaveBeenCalledWith(0);
    expect(mockHandler).toHaveBeenCalledTimes(2);
    expect(mockClient.sendMessage).toHaveBeenCalledWith(123, "hello");
    expect(mockClient.sendMessage).toHaveBeenCalledWith(456, "hello");
  });

  it("updates offset after processing", async () => {
    const mockClient = {
      getUpdates: vi
        .fn()
        .mockResolvedValueOnce([{ update_id: 5, message: { chat: { id: 1 }, text: "x" } }])
        .mockResolvedValueOnce([]),
      sendMessage: vi.fn().mockResolvedValue({}),
    };
    const mockHandler = vi.fn().mockReturnValue("hello");

    const poller = createPoller(mockClient, mockHandler, createMockLogger());
    await poller.processUpdates();
    await poller.processUpdates();

    expect(mockClient.getUpdates).toHaveBeenNthCalledWith(1, 0);
    expect(mockClient.getUpdates).toHaveBeenNthCalledWith(2, 6);
  });

  it("skips sending when handler returns null", async () => {
    const mockClient = {
      getUpdates: vi.fn().mockResolvedValue([
        { update_id: 1, message: { chat: { id: 123 }, text: "hi" } },
      ]),
      sendMessage: vi.fn(),
    };
    const mockHandler = vi.fn().mockReturnValue(null);

    const poller = createPoller(mockClient, mockHandler, createMockLogger());
    await poller.processUpdates();

    expect(mockClient.sendMessage).not.toHaveBeenCalled();
  });

  it("ignores updates without messages", async () => {
    const mockClient = {
      getUpdates: vi.fn().mockResolvedValue([
        { update_id: 1, edited_message: { chat: { id: 123 } } },
      ]),
      sendMessage: vi.fn(),
    };
    const mockHandler = vi.fn();

    const poller = createPoller(mockClient, mockHandler, createMockLogger());
    await poller.processUpdates();

    expect(mockHandler).not.toHaveBeenCalled();
    expect(mockClient.sendMessage).not.toHaveBeenCalled();
  });
});
