export function createPoller(client, onMessage, logger) {
  const log = logger.child({ module: "polling" });
  let offset = 0;
  let running = false;

  async function processUpdates() {
    const updates = await client.getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message) {
        log.debug({ updateId: update.update_id, chatId: update.message.chat.id }, "Processing message");
        const response = onMessage(update.message);
        if (response) {
          await client.sendMessage(update.message.chat.id, response);
        }
      }
    }
  }

  async function start() {
    log.info("Polling started");
    running = true;
    while (running) {
      try {
        await processUpdates();
      } catch (error) {
        log.error({ err: error }, "Polling error");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    log.info("Polling stopped");
  }

  function stop() {
    log.info("Stopping polling");
    running = false;
  }

  return { start, stop, processUpdates };
}
