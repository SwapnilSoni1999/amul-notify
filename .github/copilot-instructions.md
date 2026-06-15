# Copilot Instructions

Read `AGENTS.md` before making or suggesting code changes. It is the canonical
operating guide for this repository.

Key reminders:

- Edit `src`, not `dist`.
- Preserve the `@/*` import alias.
- Keep Telegraf middleware, command, action, and wizard registration in
  `src/bot.ts` aligned with new behavior.
- Add new callback strings to `ACTIONS` in `src/config.ts` and keep existing
  callback payloads stable.
- Add new env vars to `src/env.ts` and `.env.example`.
- Treat Telegram IDs, cookies, phone numbers, addresses, payment IDs, and
  secrets as sensitive.
- Prefer `pnpm exec tsc --noEmit`, `pnpm run lint`, or `pnpm run build` for
  validation, depending on the change size.
