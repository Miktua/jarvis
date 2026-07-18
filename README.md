# Jarvis V1

Jarvis is a private Telegram-first AI interface to dynamic PostgreSQL tables. The web app is deliberately limited to authentication, approval, Telegram linking, data browsing, sharing APIs, and administration. It contains no chat route or browser AI client.

## Local setup

1. Use Node.js 22 LTS and copy `.env.example` to `.env.local`.
2. Create or link a Supabase project, then apply `supabase/migrations/20260718073540_initial_jarvis_v1.sql`.
3. Create login credentials for the migration-defined `jarvis_data` and `jarvis_schema` capabilities. Set `DATABASE_DATA_URL` to the data capability and `DATABASE_SCHEMA_URL` to the schema/backend metadata capability. Do not expose either URL to the browser.
4. Keep `user_data` out of Supabase Data API exposed schemas. The default exposed schema should remain `public`.
5. Create a Telegram bot, set `TELEGRAM_BOT_USERNAME`, and configure its webhook to `/api/telegram/webhook` with the same secret as `TELEGRAM_WEBHOOK_SECRET`.
6. Add a verified owner email to `BOOTSTRAP_ADMIN_EMAILS`. On first authenticated request it is promoted server-side; editable user metadata is never trusted.
7. Run `npm run dev`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For a linked database, also run `supabase db lint`, `supabase db advisors`, and the privilege checks in `supabase/tests` before deployment.

## Security boundaries

- Model/user input is validated by strict Zod schemas and never becomes SQL.
- Physical table/column identifiers are derived from backend UUIDs.
- Data values are bound parameters; filters, operators, sorts, and types are allowlisted.
- The backend derives actors from verified Supabase or Telegram identity.
- Schema changes, drops, deletions, and sharing use hash-frozen, expiring, one-time actions.
- Telegram callback data contains only action ID and a truncated HMAC signature.
- Attachments live in a private Storage bucket; extracted content remains untrusted.
- Dynamic tables are isolated in the unexposed `user_data` schema.
