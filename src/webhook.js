export function createWebhookHandler(client, onMessage, secretToken, logger) {
  const log = logger.child({ module: "webhook" });

  return async function handleWebhook(req, res) {
    if (secretToken) {
      const headerToken = req.get("X-Telegram-Bot-Api-Secret-Token");
      if (headerToken !== secretToken) {
        log.warn("Invalid secret token");
        res.status(401).send("Unauthorized");
        return;
      }
    }

    const update = req.body;
    log.debug({ updateId: update.update_id }, "Received webhook update");

    if (update.message) {
      log.debug({ updateId: update.update_id, chatId: update.message.chat.id }, "Processing message");
      const response = onMessage(update.message);
      if (response) {
        try {
          await client.sendMessage(update.message.chat.id, response);
        } catch (error) {
          log.error({ err: error }, "Failed to send message");
        }
      }
    }

    res.status(200).send("OK");
  };
}
