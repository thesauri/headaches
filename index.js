import { createTelegramClient } from "./src/telegram-client.js";
import { createPoller } from "./src/polling.js";
import { createMessageHandler } from "./src/message-handler.js";
import { createDatabase } from "./src/database.js";
import { createLogger } from "./src/logger.js";
import { loadConfig } from "./src/config.js";

const config = loadConfig();

const logger = createLogger();
const database = createDatabase(config.DATABASE_PATH, logger);
const client = createTelegramClient(config.TELEGRAM_BOT_TOKEN, logger);
const handleMessage = createMessageHandler(database, logger);
const poller = createPoller(client, handleMessage, logger);

logger.info("Bot starting");
poller.start();
