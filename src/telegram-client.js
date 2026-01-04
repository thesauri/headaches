import got from "got";

export function createTelegramClient(token) {
  const apiBase = `https://api.telegram.org/bot${token}`;

  async function getUpdates(offset = 0, timeout = 30) {
    const response = await got(`${apiBase}/getUpdates`, {
      searchParams: { offset, timeout },
    }).json();
    return response.result;
  }

  async function sendMessage(chatId, text) {
    const response = await got.post(`${apiBase}/sendMessage`, {
      json: { chat_id: chatId, text },
    }).json();
    return response.result;
  }

  return { getUpdates, sendMessage };
}
