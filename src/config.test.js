import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("parses valid environment variables", () => {
    const env = {
      TELEGRAM_BOT_TOKEN: "123:ABC",
      DATABASE_PATH: "/data/headaches.db",
    };

    const config = loadConfig(env);

    expect(config.TELEGRAM_BOT_TOKEN).toBe("123:ABC");
    expect(config.DATABASE_PATH).toBe("/data/headaches.db");
  });

  it("uses default database path when not specified", () => {
    const env = {
      TELEGRAM_BOT_TOKEN: "123:ABC",
    };

    const config = loadConfig(env);

    expect(config.DATABASE_PATH).toBe("headaches.db");
  });

  it("throws when TELEGRAM_BOT_TOKEN is missing", () => {
    const env = {};

    expect(() => loadConfig(env)).toThrow();
  });

  it("throws when TELEGRAM_BOT_TOKEN is empty", () => {
    const env = {
      TELEGRAM_BOT_TOKEN: "",
    };

    expect(() => loadConfig(env)).toThrow();
  });
});
