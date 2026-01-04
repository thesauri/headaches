import { describe, it, expect } from "vitest";
import { handleMessage } from "./message-handler.js";

describe("handleMessage", () => {
  it("returns hello for any message", () => {
    const message = { text: "hi there", chat: { id: 123 } };
    expect(handleMessage(message)).toBe("hello");
  });
});
