# Structure-Aware Agent Instructions

Use this file as the local operating guide for automated coding agents in this
repository. The first sections are specific to `amul-notify`; the final section
is a portable structure-aware workflow that can be copied into other projects.

## Project Snapshot

- Project: `amul-notify`
- Domain: Telegram bot that monitors Amul product stock by pincode/substore,
  notifies users, and optionally supports paid auto-ordering.
- Runtime/tooling: Bun runtime, TypeScript, Telegraf, Express, Mongoose, Redis,
  Bull queues, node-cron, Zod env validation, ESLint, Prettier.
- Package manager metadata says `pnpm@10.12.1`; scripts invoke Bun.
- Source root: `src`
- Build output: `dist`
- Import alias: `@/*` maps to `src/*`.

## Commands

Prefer these commands when validating changes:

- Install dependencies: `pnpm install`
- Development server: `pnpm run dev`
- Production build: `pnpm run build`
- Production start: `pnpm start`
- Lint: `pnpm run lint`
- Format: `pnpm run prettier`
- Development seeders: `pnpm run seed:dev`
- Production seeders: `pnpm run seed:prod`
- Type check only: `pnpm exec tsc --noEmit`

Notes:

- There is no dedicated test script at the time this file was created.
- `pnpm run build` runs lint, `tsc`, then `tsc-alias`.
- `pnpm run dev` loads `.env.dev` and runs `src/server.ts` in watch mode.
- `pnpm start` loads `.env.prod` and runs `dist/server.js`.
- Do not rely on `dist` as source of truth. Edit `src`.

## Repository Map

- `src/server.ts`: process entrypoint. Connects Redis and MongoDB, initializes
  Amul sessions, configures webhook or polling mode, starts Express, and starts
  scheduled jobs.
- `src/app.ts`: Express app. Handles HTTP middleware and payment success route.
- `src/bot.ts`: Telegraf bot composition. Registers middleware, scenes,
  commands, callback actions, logger, and global bot error handler.
- `src/config.ts`: bot command lists, callback action constants, timezone,
  payment plans, and shared constants.
- `src/env.ts`: Zod environment schema and runtime env validation. Also creates
  `.env.example` if missing.
- `src/types`: shared TypeScript types, especially `context.types.ts`,
  `amul.types.ts`, and `orderApi.types.ts`.
- `src/middlewares`: Telegraf middleware for session hydration, command menu
  setup, private chat enforcement, analytics, pincode guard, admin checks, rate
  limiting, and logging.
- `src/commands`: Telegram slash command handlers.
- `src/actions`: callback query handlers for inline keyboard actions.
- `src/wizards`: Telegraf wizard scenes for multi-step user flows.
- `src/services`: business logic and persistence-facing operations.
- `src/libs`: wrappers for external APIs and library setup.
- `src/models`: Mongoose schemas/models.
- `src/jobs`: cron jobs for stock checks, payment expiry, and reports.
- `src/queues`: Bull queues, currently broadcast/send-message delivery.
- `src/utils`: cross-cutting helpers for formatting, emojis, links, Amul
  product logic, logging, cookies, auto-order checks, and async error wrapping.
- `assets`: map/boundary data.
- `docs`: static docs/map pages.

## Execution Flow

The runtime starts in `src/server.ts`:

1. Import env, bot, Redis, Express app, jobs, and startup helpers.
2. Attach Redis connect/error logs.
3. Connect to MongoDB with `env.MONGO_URI`.
4. Initialize Amul API sessions for known pincodes.
5. Run the bot in webhook mode when `env.BOT_WEBHOOK_URL` exists; otherwise
   launch Telegraf polling.
6. Start Express on `env.PORT`.
7. Log auto-order configuration state.
8. Start payment expiry job.
9. Start stock checker and activity report jobs only when
   `env.TRACKER_ENABLED` is true.

When adding startup behavior, keep failure modes explicit. A Mongo connection
failure exits the process; optional subsystems should usually log and continue
unless they are required for correctness.

## Bot Composition

`src/bot.ts` is the source of truth for Telegraf registration order.

Current middleware order:

1. `session()` from Telegraf scenes/session.
2. `onlyPvtChat`, wrapped with `withCatchAsync`.
3. `sessionMiddleware`, wrapped with `withCatchAsync`.
4. `analyticsMiddleware`, wrapped with `withCatchAsync`.
5. `setCommands`, wrapped with `withCatchAsync`.
6. Stage middleware for wizard scenes.
7. `/start`.
8. `/setpincode`.
9. `pincodeGuard`, wrapped with `withCatchAsync`.
10. Feature commands that require pincode/substore.
11. Admin commands guarded by `isAdmin`.
12. Callback actions.
13. `loggerMiddleware`.
14. `bot.catch`.

Important middleware dependencies:

- `sessionMiddleware` must run before anything that reads `ctx.user`,
  `ctx.trackedProducts`, or `ctx.amul`.
- `setCommands` assumes `ctx.user` exists and throws if session hydration did
  not run first.
- `pincodeGuard` should stay after `/setpincode` and before commands that need
  `ctx.user.pincode`, `ctx.user.substore`, or a usable `ctx.amul`.
- Admin commands should use `withCatchAsync(isAdmin)` before the command
  handler.
- Keep `loggerMiddleware` late so command/action handlers can call `next()` to
  reach it after their work is done.

## Context Contract

Use `MyContext` from `src/types/context.types.ts` for Telegraf handlers.

The hydrated context contains:

- `ctx.user`: hydrated Mongoose user document.
- `ctx.amul`: `AmulApi` instance for the user's pincode/substore.
- `ctx.trackedProducts`: hydrated product tracking rows for the user.
- `ctx.scene` and `ctx.wizard`: Telegraf scene/wizard helpers.

Command handlers usually use `MiddlewareFn<CommandContext>`.
Callback handlers usually use `MiddlewareFn<ActionContext>`.
Generic handlers may use `MiddlewareFn<MyContext>` or a union when reused by
commands and actions.

Do not assume `ctx.from`, `ctx.chat`, `ctx.callbackQuery`, or `ctx.message`
exist unless the handler type or a runtime guard proves it. This project uses
strict TypeScript; narrow Telegraf update shapes before reading fields.

## Commands Pattern

Command files live in `src/commands/*.command.ts`.

Common conventions:

- Export a named constant with the suffix `Command`.
- Type it as `MiddlewareFn<CommandContext>` unless it must also be callable from
  an action.
- Parse command arguments from `ctx.payload`.
- Reply using HTML parse mode when sending formatted messages.
- Use centralized emoji values from `src/utils/emoji.util.ts`.
- Put reusable business behavior in `src/services`, not inside command files.
- Return early after validation failures.
- Call `next()` or `return next()` when downstream middleware, especially
  logging, should run.
- Chunk Telegram messages near the 4096 character limit when listing products
  or other large data.
- Disable link previews when product links make messages noisy.

To add a command:

1. Create `src/commands/<name>.command.ts`.
2. Export `<name>Command`.
3. Add the command to `userCommands` or `adminCommands` in `src/config.ts`.
4. Register it in `src/bot.ts`.
5. Wrap async handlers in `withCatchAsync` unless the handler already wraps
   itself.
6. Place the registration before or after `pincodeGuard` based on whether the
   command needs a pincode/substore.
7. For admin-only commands, register as
   `bot.command('<name>', withCatchAsync(isAdmin), withCatchAsync(handler))`.

## Actions Pattern

Callback actions live in `src/actions/*.action.ts`.

Common conventions:

- Define callback data in `ACTIONS` in `src/config.ts`. Do not inline callback
  strings in multiple places.
- Export a named constant with the suffix `Action`.
- Type it as `MiddlewareFn<ActionContext>`.
- Always acknowledge callback queries with `ctx.answerCbQuery(...)` unless the
  action intentionally delegates to a handler that does so.
- Use `ctx.editMessageText` or `ctx.reply` depending on whether the action
  updates an existing inline UI or starts a separate flow.
- Reuse command renderers when a command and callback need the same screen.
  Existing examples: settings and auto-order views.
- Persist user changes with `ctx.user.set(...)` for nested Mongoose paths when
  appropriate, then `await ctx.user.save()`.
- Return `next()` when later middleware should run.

To add an action:

1. Add a callback key to `ACTIONS` in `src/config.ts`.
2. Add any inline keyboard button using that constant.
3. Create `src/actions/<name>.action.ts`.
4. Register it in `src/bot.ts` with `bot.action(ACTIONS..., withCatchAsync(...))`.
5. Keep action payloads stable; changing callback strings can break older
   Telegram messages still visible to users.

## Wizards Pattern

Wizard scenes live in `src/wizards/*.wizard.ts`.

Common conventions:

- Export a `Scenes.WizardScene<MyContext>`.
- Use a stable scene id string, for example `change-max-notify-count`.
- Register the scene in the `Scenes.Stage` array in `src/bot.ts`.
- Validate text input with runtime guards before reading `ctx.message.text`.
- Use `ctx.wizard.next()`, `ctx.wizard.selectStep(...)`, and
  `ctx.scene.leave()` explicitly.
- Save user changes before rendering the resulting command/action screen.

## Middleware Pattern

Middleware files live in `src/middlewares/*.middleware.ts`.

Common conventions:

- Export a named `MiddlewareFn<MyContext>`.
- Return early for blocked, unauthorized, or invalid state.
- Use `next()` only after the context is ready for downstream handlers.
- Put ordering assumptions in errors, as `setCommands` does for
  `sessionMiddleware`.
- Keep stateful in-memory middleware, such as rate limiting, very explicit about
  process-local behavior. It will not be shared across multiple bot processes.

When adding middleware, update `src/bot.ts` in a position that matches its data
dependencies. For example, anything that needs `ctx.user` must run after
`sessionMiddleware`; anything that gates commands by pincode should run after
`/setpincode` is registered.

## Services, Libs, and Utils

Use these boundaries:

- Commands/actions: Telegram interaction logic, validation, and rendering.
- Services: business operations and persistence orchestration.
- Libs: external API wrappers or library-specific setup.
- Models: Mongoose schemas and inferred/hydrated types.
- Utils: small pure or cross-cutting helpers.

Keep external API details in `src/libs` or dedicated services. Avoid spreading
Amul, Razorpay, Redis, or Telegram low-level details into command files.

`AmulApi` details:

- Sessions are cached in `substoreSessions`.
- `getOrCreateAmulApi` accepts a pincode/substore-like value and returns an
  `AmulApi`, or an empty cast object when called without a value.
- `sessionMiddleware` injects saved cookies into `ctx.amul` for logged-in users.
- Stock jobs refresh stale sessions after `MAX_SESSION_OLD_DAYS`.

Auto-order details:

- Feature availability is controlled by `isAutoOrderConfigured()`.
- Required env includes order server URL/key, Razorpay key/secret, and a valid
  Razorpay redirect URL.
- User access depends on `orderSettings.permitted`, `orderSettings.enabled`,
  valid payment, login cookies, Amul user/cart ids, and address.
- Use helpers in `src/utils/autoOrder.util.ts` to build keyboards, check login,
  check config, and render overview messages.

## Data Models

Mongoose model files export inferred raw types and hydrated document types.

Current key models:

- `UserModel`: Telegram identity, admin/block flags, pincode/substore,
  notification settings, favourites, auto-order settings, phone, Amul cookies,
  Amul ids, and address.
- `ProductModel`: tracked product SKU per user and remaining notification
  count.
- `PaymentModel`: auto-booking payment state and validity.
- `ActivityModel`: per-user activity by day.
- `ProductStockHistoryModel`: latest in-stock time by SKU/substore.
- `BoundaryModel`: map/boundary data.

Model conventions:

- Use `InferSchemaType` for raw model shape when practical.
- Use `HydratedDocumentFromSchema` for hydrated document types.
- Use `model(..., '<collectionName>')` to keep collection names explicit.
- For nested Mongoose paths, prefer `doc.set('nested.path', value)` when change
  tracking may be ambiguous.
- Preserve indexes and uniqueness/sparse semantics when editing schemas.

## Env and Configuration

All runtime env must be represented in `src/env.ts`.

Rules:

- Add new env vars to the Zod schema.
- Use `z.coerce` for numeric env vars.
- Use transforms for string booleans.
- Keep defaults only when the app can safely run without an explicit value.
- If an env var is required for a feature but not the whole app, make it
  optional in `env.ts` and gate the feature with a config helper, as auto-order
  does.
- Update `.env.example` when adding vars, even though `env.ts` can generate it
  if missing.

Current env keys:

- `NODE_ENV`
- `PORT`
- `MONGO_URI`
- `BOT_TOKEN`
- `BOT_WEBHOOK_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_DATABASE_INDEX`
- `TRACKER_ENABLED`
- `PAY_URL`
- `ORDER_SERVER_API_URL`
- `ORDER_SERVER_API_KEY`
- `RAZORPAY_API_KEY`
- `RAZORPAY_API_SECRET`
- `RAZORPAY_REDIRECT_URL`

## Jobs and Queues

Scheduled jobs live in `src/jobs`.

- `checker.job.ts`: runs every minute in `TIMEZONE`; checks stock by substore,
  updates caches/history, notifies users, decrements or removes tracking rows,
  and can initiate auto-order payment links.
- `paymentExpiry.job.ts`: handles paid auto-booking expiry.
- `activityReport.job.ts`: sends activity reports.

Queue logic lives in `src/queues`.

- `broadcast.queue.ts`: Bull queue for Telegram message delivery with limiter,
  Redis config, duplicate job ids by chat id, and cleanup of users who blocked
  the bot.

When touching jobs/queues:

- Respect Telegram rate limits.
- Keep retry/removal behavior deliberate.
- Preserve user cleanup behavior for Telegram 403/block errors.
- Prefer logging to `logToChannel` for operational failures that matter.
- Be careful with async callbacks inside queue completion handlers; errors
  should be caught and logged.

## TypeScript Strictness

`tsconfig.json` enables `strict`, `alwaysStrict`,
`forceConsistentCasingInFileNames`, `esModuleInterop`, and `skipLibCheck`.

Project type rules:

- Prefer explicit domain types from `src/types` and hydrated model types.
- Avoid new `any` even though ESLint currently allows it.
- Narrow `unknown` and Telegraf union updates before property access.
- Use type-only imports when they make intent clearer, but follow existing file
  style.
- Avoid non-null assertions unless the surrounding guard truly guarantees the
  value.
- Do not silence TypeScript with casts when a small helper or guard can model
  the state.
- Keep callback payload constants narrow with `as const` where useful.
- Preserve the `@/*` import alias for source imports.

## Style

Formatting is controlled by `.prettierrc`:

- No semicolons.
- Single quotes.
- No trailing commas.
- Print width 80.
- LF line endings.
- Two spaces.
- Arrow function parentheses always.

Additional style conventions:

- Use `emojis` from `src/utils/emoji.util.ts`; do not scatter literal emojis in
  new code unless matching an existing local exception.
- Use HTML parse mode consistently for formatted Telegram messages.
- Escape user-controlled HTML in Express-rendered pages.
- Keep comments sparse and useful.
- Keep logs actionable. Use `console` for local process logs and
  `logToChannel` for bot/operator-visible errors.

## Error Handling

- Wrap async Telegraf handlers with `withCatchAsync` at registration time unless
  the handler already returns a wrapped middleware.
- `withCatchAsync` handles Telegram 403 blocked-user errors by deleting the user
  and tracked products.
- `bot.catch` provides a final user-facing error reply.
- Express routes should validate query/body data before use and render clear
  failure states.
- External API failures should include enough context for operators without
  leaking secrets.
- Do not throw from background jobs for recoverable per-user/per-substore
  failures; log and continue.

## Security and Privacy

- Never commit real `.env.dev`, `.env.prod`, tokens, API keys, cookies, payment
  secrets, or user data.
- Treat Telegram ids, phone numbers, cookies, Amul ids, payment ids, and
  addresses as sensitive.
- Keep Razorpay signature verification in the payment callback path.
- Preserve webhook secret-token verification.
- Do not log full cookies or secrets.
- HTML-rendered responses must escape dynamic text.

## Adding Features

Before changing code:

1. Identify the layer that owns the behavior.
2. Read adjacent files in that layer.
3. Check `src/bot.ts` for registration/order effects.
4. Check `src/config.ts` for command/action constants.
5. Check `src/types/context.types.ts` for handler context shape.
6. Check model/service contracts if persistence changes.
7. Decide which validation command is enough for the risk.

Feature placement:

- New slash command: `src/commands`, plus `src/config.ts` and `src/bot.ts`.
- New inline callback: `src/actions`, plus `ACTIONS` and `src/bot.ts`.
- New multi-step flow: `src/wizards`, plus stage registration.
- New business operation: `src/services`.
- New external API client: `src/libs` or dedicated service.
- New database collection: `src/models`, plus service usage.
- New scheduled behavior: `src/jobs`, started from `src/server.ts` if needed.
- New Telegram broadcast flow: consider `src/queues/broadcast.queue.ts`.
- New reusable formatting/link/check helper: `src/utils`.
- New env: `src/env.ts` and `.env.example`.

Validation expectations:

- For type-only or narrow backend changes, run `pnpm exec tsc --noEmit`.
- For command/action/middleware changes, run `pnpm run lint` when practical.
- For broader changes, run `pnpm run build`.
- If validation cannot run because env/services are missing, report that
  explicitly.

## Project-Specific Gotchas

- `src/commands/index.ts` is currently empty; do not assume command exports are
  centralized.
- `userCommands` currently contains `settings` twice. Avoid adding additional
  duplicates unless intentionally cleaning this up.
- `rateLimit.middleware.ts` exists but is not currently registered in
  `src/bot.ts`.
- `getOrCreateAmulApi` returns `{}` cast as `AmulApi` when called without an
  argument; callers should not use methods on that fallback unless a pincode or
  substore has been set.
- `ACTIONS` callback strings can outlive deployments because old Telegram
  messages remain clickable.
- The stock checker relies on Redis cache and MongoDB state; local validation
  may not exercise its runtime behavior.
- Docker uses Bun directly even though package metadata references pnpm.

## Reusable Structure-Aware Agent Protocol

Use this section as a project-agnostic agent profile in other repositories.

### Mission

Act as a structure-aware coding agent. Before editing, learn the repository's
shape, commands, type system, runtime boundaries, and naming patterns. Make
changes that fit the existing system instead of introducing a competing style.

### Discovery Checklist

For any new project, inspect:

1. Root files: package/build config, lockfiles, README, env examples, lint and
   formatter config, Docker/deploy config, CI workflows.
2. Source map: entrypoints, app composition, routes/commands/actions, services,
   models, types, utilities, jobs, queues, middleware, tests.
3. Runtime commands: install, dev, test, typecheck, lint, build, seed, start.
4. Type strictness: TypeScript compiler flags or equivalent language settings.
5. Naming conventions: suffixes, file layout, export style, import aliases.
6. Error handling: global wrappers, middleware, logging, retry behavior.
7. Data boundaries: schema/model definitions, DTOs, validators, API clients.
8. Security boundaries: env validation, auth middleware, secret handling,
   webhook verification, payment/callback verification.
9. Existing gotchas: empty barrels, duplicated config, unregistered modules,
   generated directories, stale docs, missing tests.

### Change Protocol

1. Read the nearest existing implementation before adding a new one.
2. Put code in the layer that already owns similar behavior.
3. Update registration/config files in the same change.
4. Reuse existing helpers before adding new abstractions.
5. Keep public callback/action/route/command identifiers stable.
6. Preserve strict typing and add guards at runtime boundaries.
7. Add or update env schemas/examples with new configuration.
8. Validate with the smallest command that gives real signal, then escalate to
   build/test for broader changes.
9. Report what changed, how it was validated, and any remaining risk.

### Layering Template

Adapt these layer names to each project:

- Entry point: process boot, server startup, job startup.
- Composition: app/router/bot/store wiring and middleware order.
- Interface handlers: routes, commands, actions, controllers, UI event handlers.
- Middleware/guards: auth, session, rate limits, analytics, validation.
- Services/use-cases: business workflows and persistence orchestration.
- Data access/models: schemas, repositories, migrations.
- External clients/libs: API wrappers and SDK setup.
- Jobs/queues/workers: scheduled and asynchronous work.
- Types/contracts: shared interfaces, DTOs, schemas.
- Utils: small pure helpers and formatting.

### Output Standard

Every agent change should leave the project in a state where a maintainer can
answer:

- Where does the new behavior enter the system?
- What existing pattern does it follow?
- What config/registration was updated?
- What type/runtime boundary validates inputs?
- What command was run to verify it?
- What could not be verified locally?
