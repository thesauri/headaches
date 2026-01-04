import express from "express";

export function createHealthServer(port, logger) {
  const log = logger.child({ module: "health-server" });
  const app = express();

  app.get("/up", (req, res) => {
    log.info("Health check requested");
    res.status(200).send("OK");
  });

  function start() {
    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        log.info({ port }, "Health server listening");
        resolve(server);
      });
    });
  }

  return { start, app };
}
