# Jarvis — V1 Development Plan

Date: July 18, 2026  
Status: agreed product direction

## 1. Product definition

Jarvis is a universal AI interface to a private PostgreSQL database.

It does not ship with hard-coded concepts such as journals, expenses, rehabilitation, planners, or task lists. Instead, it provides:

- a Telegram bot as the only conversational interface;
- an AI agent that understands user intent;
- controlled tools for database manipulation;
- dynamically created physical PostgreSQL tables;
- a minimal web interface for authentication, bot connection, table browsing, sharing settings, and administration.

When a user needs a journal, expense tracker, or any other data structure, they ask the agent to create a suitable table.

Example:

1. The user sends: “Create an expenses table with date, amount, category, and note.”
2. The agent prepares an exact schema proposal.
3. Telegram shows the proposal with Yes and No buttons.
4. After confirmation, the backend creates a physical PostgreSQL table.
5. Later, “I spent 120 PLN on groceries today” inserts a row without another confirmation.

## 2. V1 principles

- No hard-coded business domains.
- An approved user starts with only one personal Notebook table.
- Users may create any number of additional tables.
- The agent can see the schemas of tables available to the current user.
- The agent can interact with the database only through predefined tools.
- The model never receives a raw SQL, shell, migration, or arbitrary code-execution tool.
- The backend supports full table lifecycle management from V1.
- Destructive and schema-changing actions require explicit Telegram confirmation.
- Registration is private: every new account starts in a pending state.
- The web interface exists from V1, but it contains no chat.
- Telegram is the only input/output channel for AI conversations.
- Configuration is environment-driven so the architecture remains self-hostable later.
- Preparing, packaging, documenting, or publishing the project as open source is not part of V1.

## 3. User-visible behavior

### Operations without confirmation

- List available tables.
- Describe a table.
- Read and search rows.
- Insert one or more rows.
- Update existing rows.
- Answer without using a tool.
- Ask a clarifying question.

### Operations requiring confirmation

- Create a table.
- Add, rename, remove, or change a column.
- Delete one or more rows.
- Drop a table.
- Grant, change, or revoke another user’s access.

### Permission rules

- The owner has full control over their table.
- Read access permits only reading and searching.
- Write access permits reading, inserting, and updating.
- A writer may delete rows only after confirming their own request.
- Only the owner may alter a schema, drop a table, or manage sharing.
- The model never chooses the acting user. The backend derives the actor from the verified Telegram connection or authenticated web session.

## 4. System architecture

### Telegram

- Telegram Bot API receives text, voice messages, images, documents, and confirmation callbacks.
- A webhook Route Handler validates and stores every update.
- Telegram is the only conversational client.

### Backend

- Next.js App Router with TypeScript.
- Node.js runtime.
- Vercel Functions.
- Route Handlers for Telegram webhook, callbacks, files, and retry processing.
- Server Actions or private Route Handlers for web management actions.
- Domain and database logic live outside route files.

### AI

- Vercel AI SDK on the server.
- A bounded tool-calling loop.
- Zod schemas for every tool input and output.
- Structured extraction for images and documents.
- The model/provider is selected through environment variables.

### Data

- Supabase Auth.
- Supabase Postgres.
- Supabase Storage for private images, documents, and voice files.
- System metadata in protected system tables.
- Dynamic physical tables in an unexposed user_data schema.

### Web

The web application is only a control and reading interface:

- sign up and sign in;
- pending-account screen;
- Telegram connection;
- folder/table sidebar;
- generic table viewer;
- row detail dialog;
- table sharing settings;
- small admin approval screen.

There is no web chat, AI streaming UI, chat API, or browser-side AI SDK integration.

## 5. Database separation

The database contains two distinct layers.

### System layer

System tables are created through project migrations. They are not displayed in the workspace and cannot be changed by the AI agent.

### User data layer

Every user-created logical table is a real physical PostgreSQL table in the user_data schema.

The user_data schema is not exposed through the Supabase Data API. Browsers never query it directly. All access goes through the backend, which verifies:

- account status;
- actor identity;
- table ownership;
- read/write permission;
- requested operation;
- confirmation state where required;
- query limits.

This avoids generating a public REST surface and separate dynamic RLS policies for every new user table.

## 6. System tables

### profiles

- id, linked to Supabase Auth;
- display_name;
- status: pending, active, blocked;
- role: user, admin;
- created_at;
- approved_at;
- approved_by.

### bot_connections

- user_id;
- telegram_user_id;
- telegram_chat_id;
- telegram_username;
- connected_at.

telegram_user_id is unique. Telegram usernames are display-only and are never used for authorization.

### bot_link_tokens

- user_id;
- token_hash;
- expires_at;
- consumed_at;
- created_at.

### data_tables

Registry of all user-created tables:

- id;
- physical_name;
- display_name;
- description;
- owner_id;
- created_at;
- updated_at;
- deleted_at.

physical_name is generated by the backend from an internal UUID. Neither the user nor the model can set or reference it directly.

### data_table_permissions

- table_id;
- user_id;
- access: read or write;
- granted_by;
- created_at.

The owner is stored in data_tables.owner_id and is not duplicated here.

### workspace_nodes

Sidebar tree metadata:

- id;
- owner_id;
- parent_id;
- kind: folder or table;
- table_id for table nodes;
- title;
- position.

Folders organize the interface only. They are not PostgreSQL schemas.

### conversation_threads

- id;
- user_id;
- telegram_chat_id;
- created_at;
- updated_at.

### messages

- id;
- conversation_id;
- user_id;
- telegram_message_id;
- role: user, assistant, tool;
- content;
- attachment_id;
- created_at.

Only Telegram conversations are stored.

### attachments

- id;
- user_id;
- storage_path;
- media_type;
- size_bytes;
- source;
- created_at;
- deleted_at.

### pending_actions

- id;
- requested_by;
- action_type;
- frozen_payload;
- payload_hash;
- status: pending, approved, rejected, expired, executing, executed, failed;
- expires_at;
- executed_at;
- created_at.

### inbound_events

Minimal durable processing and Telegram deduplication:

- id;
- source;
- external_event_id;
- payload;
- status;
- attempts;
- last_error;
- created_at;
- processed_at.

### audit_log

- actor_id;
- action;
- table_id;
- affected_rows;
- summary;
- request_id;
- created_at.

Audit records contain operational summaries, not secrets or complete sensitive payloads.

## 7. Dynamic physical tables

Each physical table in user_data contains mandatory internal columns:

- _id: UUID primary key;
- _created_at: timestamptz;
- _updated_at: timestamptz;
- _created_by: UUID.

The user-defined columns are added after these internal columns.

Allowed V1 column types:

- text;
- long_text;
- integer;
- decimal;
- boolean;
- date;
- timestamp;
- text_array;
- json;
- attachment_reference.

This type list is intentionally finite. Each logical type maps to one controlled PostgreSQL definition in backend code.

### Initial Notebook

When an admin approves a user, the backend creates a private Notebook table with:

- title: text;
- content: long_text.

The Notebook may later be renamed or altered through the same confirmed schema tools as any other table.

## 8. Registration and admin approval

### Registration

1. A user registers through Supabase Auth.
2. A database trigger creates a profile with status pending.
3. The web app displays only the pending-account screen.
4. Every protected endpoint independently checks for active status.
5. A pending or blocked user cannot read data, connect Telegram, or invoke any management action.

### Bootstrap administrator

- Owner emails are configured through BOOTSTRAP_ADMIN_EMAILS.
- Only a verified Supabase email matching that server-side setting may become a bootstrap admin.
- Authorization never relies on editable user_metadata.
- All other users remain pending until manually approved.

### Admin screen

- List pending users.
- Approve a user.
- Block a user.

Approving a user also creates their Notebook.

## 9. Telegram connection

1. An active user opens the Connect Telegram web page.
2. The backend creates a short-lived one-time token.
3. The page displays a deep link to the Telegram bot.
4. The user opens the bot with the token.
5. The webhook links the Telegram user ID to the authenticated profile.
6. The token becomes unusable.

Only a linked, active profile may use the bot.

## 10. Agent context

For each Telegram message, the agent receives only:

- trusted system instructions;
- the current verified user context;
- the most recent 10–20 conversation messages within a token budget;
- a compact list of accessible tables;
- table descriptions and column schemas;
- the tools permitted for the current processing stage.

The agent does not receive:

- database credentials;
- physical table names;
- raw SQL;
- secret environment variables;
- unrestricted database dumps;
- data from inaccessible tables;
- arbitrary server or filesystem access.

Full table data is never placed into the prompt automatically. The agent must use read/search tools with explicit limits.

## 11. V1 tools

### Metadata tools

- list_tables
- describe_table
- list_table_permissions

### Schema tools

- propose_create_table
- execute_create_table
- propose_alter_table
- execute_alter_table
- propose_drop_table
- execute_drop_table

All execute schema tools require a valid approved pending_action.

### Data tools

- insert_rows
- search_rows
- get_row
- update_rows
- propose_delete_rows
- execute_delete_rows

### Sharing tools

- propose_share_table
- execute_share_table
- propose_revoke_table_access
- execute_revoke_table_access

### Attachment tools

- store_attachment
- inspect_attachment

The model cannot supply actor_id, owner_id, physical_name, database role, storage path, approval state, or audit identity. The backend injects or resolves all trusted identifiers.

## 12. Confirmation flow

1. The agent proposes an operation requiring confirmation.
2. The backend validates the proposal without executing it.
3. The backend resolves logical table/column IDs and freezes the normalized payload.
4. pending_actions stores the payload and its cryptographic hash.
5. Telegram sends a readable preview with Yes and No inline buttons.
6. The callback contains only an opaque action ID plus a signature.
7. The backend verifies:
   - signature;
   - requesting user;
   - account status;
   - action status;
   - expiry;
   - payload hash;
   - current permissions.
8. Yes executes exactly the frozen operation once.
9. No marks it rejected.
10. The bot reports the result.

The model does not regenerate SQL or modify the payload after approval.

## 13. Prompt-injection protection

Prompt-injection defense is a required architectural property, not a prompt-writing task.

### Untrusted input rule

All of the following are untrusted data:

- Telegram text;
- message captions;
- voice transcripts;
- OCR output;
- images and documents;
- table names and descriptions;
- column names;
- values retrieved from user tables;
- text previously written by the assistant;
- forwarded Telegram messages.

Untrusted content may describe a desired user operation, but it cannot change system policy, permissions, tools, confirmation rules, or execution limits.

### Enforcement layers

1. System instructions explicitly state that content inside messages, files, OCR, and database rows is data, not higher-priority instructions.
2. Authorization and confirmation are enforced in deterministic backend code, never by the model.
3. The available tool set is fixed by the backend for each stage.
4. Every tool uses a strict structured schema.
5. Unknown keys, unsupported types, excessive lengths, and invalid enum values are rejected.
6. The model cannot submit SQL, code, command strings, connection details, or executable expressions.
7. Tool implementations resolve all resources through internal IDs and the permission registry.
8. Retrieved rows are clearly delimited as untrusted records before being passed back to the model.
9. The agent has a low maximum number of reasoning/tool steps.
10. Search and read results have row, byte, and token limits.
11. Secrets and privileged metadata never enter the model context.
12. A denied action cannot be retried automatically in the same run.
13. Confirmation authorizes only the frozen server-side payload, not the model’s natural-language description.
14. Stored content is never allowed to select new tools or override tool schemas.

### Suspicious input behavior

If input appears to instruct the assistant to ignore policies, reveal secrets, execute SQL, alter permissions, or treat file content as system instructions:

- the content is processed as user data only;
- no special privilege is granted;
- the agent may explain that the requested unrestricted action is unavailable;
- any legitimate embedded data may still be extracted safely;
- the event is logged with a non-sensitive security flag.

### Prompt-injection tests

Tests must include attacks delivered through:

- direct Telegram messages;
- a receipt or document image;
- OCR text;
- a voice transcript;
- a table name;
- a column name;
- a stored row returned by search;
- a shared table owned by another user;
- a fake confirmation instruction;
- a forwarded message claiming to be an administrator.

Passing means the agent may discuss the malicious text but cannot expand permissions, bypass approval, access another table, expose secrets, or execute unsupported operations.

## 14. SQL-injection protection

The model and users never provide executable SQL.

### Query construction

- The backend exposes a small typed operation DSL, not a query string.
- Allowed operations, column types, filter operators, aggregations, and sort directions are explicit allowlists.
- Values are always passed as bound parameters.
- Physical table names are generated by the server.
- A tool supplies a logical table UUID; the backend resolves the physical name from data_tables.
- Column references are resolved against trusted schema metadata.
- Identifiers are quoted with an audited PostgreSQL identifier-escaping mechanism.
- Display names are never reused as SQL identifiers.
- Multi-statement input is impossible through the tool schema.
- Raw WHERE, ORDER BY, JOIN, DEFAULT, CHECK, function, cast, or expression fragments are never accepted.

### Database roles

Use separate database capabilities:

- A normal data role can select, insert, update, and delete only inside user_data.
- It cannot create, alter, or drop tables.
- A schema role can execute controlled DDL only inside user_data.
- The schema role is used only by the confirmation executor.
- Neither role can access Supabase auth internals, secrets, extensions, system catalogs beyond required metadata, or unrelated schemas.
- Browser clients receive neither role nor their credentials.

The exact role setup is created by system migrations and verified with database privilege tests.

### Execution limits

- Statement timeout.
- Maximum returned rows.
- Maximum affected rows per tool call.
- Maximum request and result size.
- Explicit transaction boundaries.
- Rollback on partial failure.
- Table-level locking only where required for schema changes.
- No arbitrary recursive queries or user-defined functions.
- No dynamic extension installation.

### Validation and testing

- Fuzz table display names, column display names, text values, arrays, and JSON.
- Include quotes, semicolons, comments, Unicode confusables, null bytes, and SQL keywords.
- Verify that malicious strings are stored or rejected as data and never executed.
- Verify that filter and sort fields cannot reference unauthorized columns.
- Verify that logical table IDs cannot be swapped to access another owner’s physical table.
- Verify that the data role cannot execute DDL.
- Verify that the schema role cannot modify system schemas.
- Run PostgreSQL/Supabase security advisors after privileged database changes.

## 15. Text, voice, and image processing

### Text

The text and limited conversation history are passed to the agent. The agent may answer, ask a question, or invoke a tool.

### Voice

1. Download the Telegram file server-side.
2. Validate media type and size.
3. Transcribe it.
4. Store the transcript as the user message.
5. Process it through the same agent and tool pipeline as text.

The transcript remains untrusted input.

### Images and documents

1. Validate type and size.
2. Store the original in private Supabase Storage.
3. Analyze it with a multimodal model.
4. Extract structured facts.
5. Compare the result with accessible table schemas.
6. Insert, ask a clarifying question, or prepare a confirmed action.

There is no hard-coded rule that a receipt belongs to an expenses table. The agent uses the user’s actual schemas and conversation context.

OCR text and visible instructions inside an image are treated as document content, never as system instructions.

## 16. Telegram webhook processing

1. Verify the Telegram webhook secret.
2. Validate update size and supported update type.
3. Resolve telegram_user_id to an active profile.
4. Store the update in inbound_events with a unique external_event_id.
5. Return HTTP 200 promptly.
6. Process after the response using Next.js after().
7. Ignore duplicate updates.
8. Retry failed or interrupted events through a small protected cron endpoint.
9. Limit retry attempts and surface permanent failures to the administrator.

This provides minimal durability without adding a VPS, message broker, or workflow platform.

## 17. Web interface

### Authentication

- Supabase Auth sign-up and sign-in.
- Pending-account screen.
- Active and blocked status checks on every protected operation.

### Main layout

Left sidebar:

- folders;
- owned tables;
- shared tables;
- table selection;
- link to Telegram connection;
- admin link for administrators.

Right content area:

- selected table name and description;
- sharing settings for the owner;
- generic table grid;
- search and pagination;
- read-only row selection.

The web interface is not used to ask the AI to create or manipulate data.

### Row dialog

Clicking a row opens a simple dialog rendered as a vertical list:

- column label;
- value;
- next column label;
- next value.

Internal metadata appears in a separate compact section.

### Sharing controls

The owner can:

- view users with access;
- grant read or write access;
- change access level;
- revoke access.

These web actions use the same deterministic permission service as Telegram actions. They require a conventional web confirmation dialog but do not invoke the AI agent.

### Admin

- list pending users;
- approve;
- block.

No additional administration features are required for V1.

## 18. Minimal API surface

- POST /api/telegram/webhook
- POST /api/telegram/link-token
- POST /api/telegram/actions/:id/approve
- POST /api/telegram/actions/:id/reject
- POST /api/cron/retry-events
- GET /api/tables
- GET /api/tables/:id
- GET /api/tables/:id/rows
- GET /api/tables/:id/permissions
- POST /api/tables/:id/permissions
- DELETE /api/tables/:id/permissions/:userId
- GET /api/admin/users
- POST /api/admin/users/:id/approve
- POST /api/admin/users/:id/block

There is no /api/chat route.

Route files validate requests and call services. They contain no model prompts, raw SQL construction, permission policy, or business logic.

## 19. Project structure

    src/
      app/
        api/
          telegram/
          tables/
          admin/
          cron/
        auth/
        pending/
        workspace/
        admin/
      components/
        data-grid/
        sidebar/
        permissions/
      server/
        agent/
        db-tools/
        sql-dsl/
        confirmations/
        telegram/
        auth/
        files/
        security/
      lib/
        supabase/
        validation/
    supabase/
      migrations/
      tests/
    tests/
      tools/
      permissions/
      injection/
      agent/
      e2e/

## 20. Environment-driven configuration

The architecture remains portable without spending V1 effort on open-source publication.

Expected environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY
- DATABASE_DATA_URL
- DATABASE_SCHEMA_URL
- BOOTSTRAP_ADMIN_EMAILS
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- AI_MODEL
- AI_GATEWAY_API_KEY or Vercel OIDC configuration
- CRON_SECRET
- ACTION_SIGNING_SECRET
- MAX_AGENT_STEPS
- MAX_QUERY_ROWS
- MAX_AFFECTED_ROWS
- DB_STATEMENT_TIMEOUT_MS

No user ID, Telegram ID, model name, database address, provider, or deployment URL is hard-coded.

V1 does not include:

- public release preparation;
- licensing work;
- public documentation;
- demo data;
- one-click deployment templates;
- public support for arbitrary hosting platforms.

## 21. Development sequence

### Phase 1 — foundation and account access

- Create the Next.js application.
- Connect Supabase Auth.
- Create pending, active, and blocked profile states.
- Implement bootstrap admin from environment configuration.
- Implement admin approve/block.
- Create the initial Notebook on approval.
- Add protected system schemas and migrations.

Done when a pending user cannot do anything and an approved user can open the workspace with one Notebook.

### Phase 2 — safe dynamic database engine

- Create data_tables and data_table_permissions.
- Create the unexposed user_data schema.
- Create separate data and schema database roles.
- Implement the typed query/DDL DSL.
- Implement identifier resolution and parameter binding.
- Implement create, alter, drop, insert, search, update, and delete.
- Implement execution limits and transactions.
- Implement pending_actions and audit_log.
- Add comprehensive SQL-injection tests before agent integration.

Done when all physical table operations work through the tool layer and no raw user/model string can become executable SQL.

### Phase 3 — minimal web control interface

- Implement Auth and pending screens.
- Implement the folder/table sidebar.
- Implement the generic read-only table grid.
- Implement the row dialog.
- Implement sharing settings.
- Implement the admin approval screen.
- Implement Telegram link-token generation.

Done when an approved user can connect Telegram and inspect all accessible data without a specialized UI.

### Phase 4 — Telegram text agent

- Create the bot and webhook.
- Link Telegram identities.
- Store limited conversation history.
- Provide accessible schema context.
- Add bounded agent tool calling.
- Add text responses and clarification behavior.
- Add Telegram confirmation buttons.
- Add inbound event deduplication and retry.
- Add prompt-injection tests before enabling schema tools.

Done when a Telegram user can create a table after confirmation, then insert, search, and update its rows.

### Phase 5 — voice and images

- Add secure file downloading.
- Add private Storage.
- Add voice transcription.
- Add multimodal image/document analysis.
- Add structured extraction.
- Pass all extracted data through the same validation, permission, confirmation, and injection-defense layers.

Done when voice and images safely produce the same operations as text.

### Phase 6 — reliability and security verification

- Complete permission matrix tests.
- Complete prompt-injection and SQL-injection suites.
- Add rate limits.
- Add statement and result limits.
- Add security event flags.
- Verify action signatures, expiry, and one-time execution.
- Run dependency, secret, and database security checks.
- Verify recovery of failed Telegram events.

Done when the full V1 security and reliability acceptance criteria pass.

## 22. Required tests

### Authorization

- Pending and blocked users cannot use Telegram or protected web APIs.
- A read user cannot insert, update, delete, alter, drop, or share.
- A write user can insert/update but must confirm deletion.
- Only the owner can alter, drop, or share a table.
- A user cannot confirm another user’s action.
- The model cannot override actor_id or owner_id.

### Confirmation

- Repeated Yes clicks execute only once.
- Expired actions do not execute.
- A modified payload fails hash validation.
- Permissions are checked again at execution time.
- A rejected action is not automatically retried.

### SQL injection

- Malicious names and values cannot escape their identifier/value positions.
- Unsupported operators and expressions are rejected.
- Logical IDs cannot address another physical table.
- The normal data role cannot execute DDL.
- The schema role cannot alter system schemas.

### Prompt injection

- Instructions in text, voice, OCR, images, stored rows, names, and descriptions cannot alter policy.
- Retrieved malicious content cannot trigger a tool by itself.
- Fake admin and fake confirmation messages have no effect.
- No prompt can expose secrets or inaccessible schemas.

### Telegram reliability

- Duplicate updates do not create duplicate rows.
- Failed processing can be retried.
- Oversized or unsupported files are rejected safely.
- Conversation history remains bounded.

### Web

- The web client never receives privileged database credentials.
- Shared tables appear according to read/write permissions.
- Table and row views cannot cross permission boundaries.
- No chat components, chat route, or browser AI client are shipped.

## 23. V1 acceptance criteria

V1 is complete when an approved user can:

1. Sign in through Supabase Auth.
2. Connect their Telegram account.
3. Talk to the agent only through Telegram.
4. Create real PostgreSQL tables after confirmation.
5. Alter schemas after confirmation.
6. Insert, search, and update rows without confirmation.
7. Delete rows and tables only after confirmation.
8. Share a table with read or write access.
9. Browse all accessible tables through the generic web viewer.
10. Send text, voice messages, images, and documents.
11. Continue a conversation with a limited recent-message context.

The release is not acceptable unless:

- prompt-injection tests pass;
- SQL-injection tests pass;
- permissions cannot be bypassed;
- confirmations execute only frozen, one-time payloads;
- the model has no raw SQL, shell, secret, or unrestricted database access;
- the web application contains no conversational AI interface.

