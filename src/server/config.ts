import { z } from "zod";

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_DATA_URL: z.string().min(1),
  DATABASE_SCHEMA_URL: z.string().min(1),
  BOOTSTRAP_ADMIN_EMAILS: z.string().default(""),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  AI_MODEL: z.string().regex(/^[a-z0-9-]+\/[a-z0-9._-]+$/).default("openai/gpt-5.4"),
  TRANSCRIPTION_MODEL: z.string().regex(/^[a-z0-9-]+\/[a-z0-9._-]+$/).default("openai/whisper-1"),
  CRON_SECRET: z.string().min(24),
  ACTION_SIGNING_SECRET: z.string().min(32),
  MAX_AGENT_STEPS: positiveInt(6),
  MAX_QUERY_ROWS: positiveInt(100),
  MAX_AFFECTED_ROWS: positiveInt(100),
  DB_STATEMENT_TIMEOUT_MS: positiveInt(5000),
  MAX_TELEGRAM_UPDATE_BYTES: positiveInt(1_048_576),
  MAX_ATTACHMENT_BYTES: positiveInt(10_485_760),
});

export type Config = z.infer<typeof schema>;
let cached: Config | undefined;

export function getConfig(): Config {
  cached ??= schema.parse(process.env);
  return cached;
}

export function bootstrapAdminEmails(): Set<string> {
  return new Set(getConfig().BOOTSTRAP_ADMIN_EMAILS.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
}
