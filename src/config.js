import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  DATABASE_PATH: z.string().default("headaches.db"),
  PORT: z.coerce.number().default(3000),
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  WEBHOOK_URL: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
});

export function loadConfig(env = process.env) {
  return envSchema.parse(env);
}
