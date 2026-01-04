export function createMessageHandler(database) {
  return function handleMessage(message) {
    const userId = message.from?.id;
    if (!userId) {
      return "Could not identify user";
    }

    const description = message.text?.trim();
    if (!description) {
      return "Please describe your headache";
    }

    database.recordHeadache(userId, description);

    return "Recorded ✓";
  };
}
