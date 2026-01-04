import got from "got";

export function createTelegramClient(token, logger) {
  const apiBase = `https://api.telegram.org/bot${token}`;
  const log = logger.child({ module: "telegram-client" });

  async function getUpdates(offset = 0, timeout = 30) {
    log.debug({ offset, timeout }, "Fetching updates");
    const response = await got(`${apiBase}/getUpdates`, {
      searchParams: { offset, timeout },
    }).json();
    log.debug({ count: response.result.length }, "Received updates");
    return response.result;
  }

  async function sendMessage(chatId, text) {
    log.info({ chatId }, "Sending message");
    const response = await got.post(`${apiBase}/sendMessage`, {
      json: { chat_id: chatId, text },
    }).json();
    log.debug({ messageId: response.result.message_id }, "Message sent");
    return response.result;
  }

  return { getUpdates, sendMessage };
}
