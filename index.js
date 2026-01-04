import { createTelegramClient } from "./src/telegram-client.js";
import { createPoller } from "./src/polling.js";
import { createMessageHandler } from "./src/message-handler.js";
import { createDatabase } from "./src/database.js";
import { createLogger } from "./src/logger.js";
import { loadConfig } from "./src/config.js";
import { createHealthServer } from "./src/health-server.js";

const config = loadConfig();

const logger = createLogger();
const database = createDatabase(config.DATABASE_PATH, logger);
const client = createTelegramClient(config.TELEGRAM_BOT_TOKEN, logger);
const handleMessage = createMessageHandler(database, logger);
const poller = createPoller(client, handleMessage, logger);
const healthServer = createHealthServer(config.PORT, logger);

logger.info("Bot starting");
healthServer.start();
poller.start();
