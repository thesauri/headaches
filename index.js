import { createTelegramClient } from "./src/telegram-client.js";
import { createPoller } from "./src/polling.js";
import { handleMessage } from "./src/message-handler.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN environment variable is required");
  process.exit(1);
}

const client = createTelegramClient(BOT_TOKEN);
const poller = createPoller(client, handleMessage);

console.log("Bot starting...");
poller.start();
