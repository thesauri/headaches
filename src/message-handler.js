export function createMessageHandler(database, logger) {
  const log = logger.child({ module: "message-handler" });

  return function handleMessage(message) {
    const userId = message.from?.id;
    if (!userId) {
      log.warn({ message }, "Message missing user ID");
      return "Could not identify user";
    }

    const description = message.text?.trim();
    if (!description) {
      log.warn({ userId }, "Message missing text");
      return "Please describe your headache";
    }

    const id = database.recordHeadache(userId, description);
    log.info({ userId, headacheId: id }, "Headache recorded");

    return "Recorded ✓";
  };
}
