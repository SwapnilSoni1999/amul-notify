# Claude Instructions

Read `AGENTS.md` before making changes. That file is the source of truth for
repository structure, command/action patterns, env handling, validation, and
security boundaries.

For this project:

- Keep implementation changes in `src`.
- Use existing Telegraf, Mongoose, Redis, Bull, and service patterns.
- Update `src/config.ts` and `src/bot.ts` when adding commands or actions.
- Update `src/env.ts` and `.env.example` when adding runtime configuration.
- Avoid logging or committing secrets, cookies, Telegram IDs, phone numbers,
  payment details, or addresses.
- Report which validation command was run and what could not be verified.
