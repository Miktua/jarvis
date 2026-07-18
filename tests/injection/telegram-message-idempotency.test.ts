import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe,expect,it } from "vitest";

const migration=readFileSync(join(process.cwd(),"supabase/migrations/20260718103649_enforce_unique_telegram_messages.sql"),"utf8").toLowerCase();
const processor=readFileSync(join(process.cwd(),"src/server/telegram/process-update.ts"),"utf8").toLowerCase();

describe("telegram message idempotency",()=>{it("deduplicates existing messages before adding a partial unique index",()=>{expect(migration).toContain("delete from public.messages duplicate");expect(migration).toContain("create unique index messages_conversation_telegram_message_id_key");expect(migration).toContain("where telegram_message_id is not null");});it("ignores a duplicate Telegram message during retries",()=>{expect(processor).toContain("on conflict(conversation_id,telegram_message_id) where telegram_message_id is not null do nothing");});});
