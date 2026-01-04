import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHealthServer } from "./health-server.js";
import { createMockLogger } from "./test-helpers.js";

describe("createHealthServer", () => {
  let server;

  afterEach(() => {
    if (server) {
      server.close();
      server = null;
    }
  });

  it("responds 200 OK to /up", async () => {
    const healthServer = createHealthServer(0, createMockLogger());
    server = await healthServer.start();

    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/up`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("logs health check requests", async () => {
    const mockLogger = createMockLogger();
    const healthServer = createHealthServer(0, mockLogger);
    server = await healthServer.start();

    const port = server.address().port;
    await fetch(`http://localhost:${port}/up`);

    expect(mockLogger.info).toHaveBeenCalledWith("Health check requested");
  });
});
