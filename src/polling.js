export function createPoller(client, onMessage) {
  let offset = 0;
  let running = false;

  async function processUpdates() {
    const updates = await client.getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message) {
        const response = onMessage(update.message);
        if (response) {
          await client.sendMessage(update.message.chat.id, response);
        }
      }
    }
  }

  async function start() {
    running = true;
    while (running) {
      try {
        await processUpdates();
      } catch (error) {
        console.error("Polling error:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  function stop() {
    running = false;
  }

  return { start, stop, processUpdates };
}
