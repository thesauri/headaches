import { createTelegramClient } from "./src/telegram-client.js";
import { createPoller } from "./src/polling.js";
import { createMessageHandler } from "./src/message-handler.js";
import { createDatabase } from "./src/database.js";
import { createLogger } from "./src/logger.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN environment variable is required");
  process.exit(1);
}

const logger = createLogger();
const database = createDatabase("headaches.db", logger);
const client = createTelegramClient(BOT_TOKEN, logger);
const handleMessage = createMessageHandler(database, logger);
const poller = createPoller(client, handleMessage, logger);

logger.info("Bot starting");
poller.start();
