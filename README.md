# Amul Notify

[![Telegram](https://img.shields.io/badge/Chat-Telegram-blue?logo=telegram)](https://t.me/AmulOSSBot)
[![GitHub stars](https://img.shields.io/github/stars/SwapnilSoni1999/amul-notify?style=social)](https://github.com/SwapnilSoni1999/amul-notify)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](package.json)
![Endpoint Badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fbots.10xdev.me%2Famul-bot%2Fbadge)


Amul Notify is a Telegram bot that watches Amul product availability by
pincode/substore, lets users track products, and sends notifications when stock
changes. The bot also includes optional paid auto-ordering, admin analytics,
stock history, and an interactive map.

Links: [Try the bot](https://t.me/AmulOSSBot) |
[GitHub repository](https://github.com/SwapnilSoni1999/amul-notify) |
[Contact developer](https://t.me/SoniSins)

## Features

- Product browsing for Amul protein products by local pincode/substore.
- Stock tracking with per-minute background checks when tracking is enabled.
- Telegram notifications for tracked products and configurable tracking style.
- Favourites, tracked product views, and user settings.
- Optional auto-ordering with Amul login, address capture, Razorpay payment,
  payment expiry handling, and order-server integration.
- Admin tools for broadcast delivery, usage stats, product analytics, session
  inspection, product counts, free trials, and payment expiry.
- Express routes for Telegram webhooks and Razorpay payment callbacks.
- Redis-backed caching and Bull queue delivery for broadcast/send-message work.
- Static docs/map assets for location and boundary views.

## Bot Commands

### User Commands

| Command       | Description                                |
| ------------- | ------------------------------------------ |
| `/start`      | Start the bot and initialize the user flow |
| `/setpincode` | Set or change delivery pincode             |
| `/pincode`    | Show the current pincode/substore setting  |
| `/products`   | List Amul protein products                 |
| `/autoorder`  | View or configure auto-ordering            |
| `/settings`   | View or update notification settings       |
| `/tracked`    | List tracked products                      |
| `/favourites` | List favourite products                    |
| `/support`    | Show support information                   |
| `/map`        | Open the interactive map                   |

### Admin Commands

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `/broadcast`     | Send a message to bot users        |
| `/sessions`      | List active Amul API sessions      |
| `/stats`         | Show bot usage statistics          |
| `/analytics`     | Show product analytics             |
| `/productcount`  | Show product count by SKU          |
| `/freetrial`     | Grant auto-booking free trial      |
| `/expirepayment` | Expire auto-booking payment access |

Admin access is controlled by user records in MongoDB and seeded through the
project seeders.

## Tech Stack

- Runtime: Bun scripts with TypeScript source.
- Package manager metadata: `pnpm@10.12.1`.
- Bot framework: Telegraf.
- HTTP server: Express.
- Database: MongoDB with Mongoose.
- Cache and queueing: Redis, ioredis, Bull.
- Scheduling: node-cron.
- Validation: Zod environment schema.
- Quality: ESLint, Prettier, TypeScript strict mode, `tsc-alias`.

## Project Layout

| Path              | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `src/server.ts`   | Process startup, Mongo/Redis, bot mode, jobs  |
| `src/app.ts`      | Express app, payment routes, map/docs access  |
| `src/bot.ts`      | Telegraf middleware, scenes, commands/actions |
| `src/config.ts`   | Commands, callback constants, shared config   |
| `src/env.ts`      | Zod env schema and runtime validation         |
| `src/commands`    | Telegram slash command handlers               |
| `src/actions`     | Inline keyboard callback handlers             |
| `src/wizards`     | Multi-step Telegraf scenes                    |
| `src/middlewares` | Session, guards, analytics, logging           |
| `src/services`    | Business workflows and persistence logic      |
| `src/libs`        | External API wrappers                         |
| `src/models`      | Mongoose schemas and hydrated model types     |
| `src/jobs`        | Stock checker, payment expiry, reports        |
| `src/queues`      | Bull queues for Telegram message delivery     |
| `src/utils`       | Formatting, Telegram, cookies, stock helpers  |
| `assets` / `docs` | Boundary data and static documentation pages  |

The `@/*` import alias maps to `src/*`.

## Development

### Prerequisites

- Bun available on the machine.
- pnpm available for dependency installation and script entrypoints.
- MongoDB database.
- Redis server.
- Telegram bot token from [BotFather](https://t.me/botfather).

### Setup

```bash
git clone https://github.com/SwapnilSoni1999/amul-notify.git
cd amul-notify
pnpm install
cp .env.example .env.dev
```

Edit `.env.dev`, then run:

```bash
pnpm run dev
```

The development script loads `.env.dev` and runs `src/server.ts` in Bun watch
mode.

### Scripts

| Command                  | Description                                  |
| ------------------------ | -------------------------------------------- |
| `pnpm install`           | Install dependencies                         |
| `pnpm run dev`           | Load `.env.dev` and run the Bun watch server |
| `pnpm run build`         | Run lint, TypeScript build, then `tsc-alias` |
| `pnpm start`             | Load `.env.prod` and run `dist/server.js`    |
| `pnpm run lint`          | Run ESLint for TypeScript files              |
| `pnpm run prettier`      | Format the repository with Prettier          |
| `pnpm run seed:dev`      | Run seeders with `.env.dev`                  |
| `pnpm run seed:prod`     | Run compiled seeders with `.env.prod`        |
| `pnpm exec tsc --noEmit` | Type-check without writing build output      |

There is no dedicated test script at the moment. For documentation-only changes,
format/lint/typecheck are usually enough depending on the files touched.

## Environment

Create `.env.dev` for local development and `.env.prod` for production. Do not
commit real env files.

| Variable                  | Required | Default                       | Notes                                       |
| ------------------------- | -------- | ----------------------------- | ------------------------------------------- |
| `NODE_ENV`                | No       | `local`                       | `local`, `production`, `staging`, or `test` |
| `PORT`                    | No       | `5999`                        | Express server port                         |
| `MONGO_URI`               | Yes      |                               | MongoDB connection string                   |
| `BOT_TOKEN`               | Yes      |                               | Telegram bot token                          |
| `BOT_WEBHOOK_URL`         | No       |                               | Enables webhook mode when set               |
| `BOT_FORCE_POLLING`       | No       | `false`                       | Forces polling even with webhook URL        |
| `REDIS_HOST`              | No       | `localhost`                   | Redis host                                  |
| `REDIS_PORT`              | No       | `6379`                        | Redis port                                  |
| `REDIS_DATABASE_INDEX`    | No       | `0`                           | Redis database index                        |
| `TRACKER_ENABLED`         | No       | `true`                        | Starts stock/activity jobs when true        |
| `PAY_URL`                 | No       | `https://razorpay.me/@10xdev` | Public payment URL fallback                 |
| `ORDER_SERVER_API_URL`    | No       |                               | Required only for auto-ordering             |
| `ORDER_SERVER_API_KEY`    | No       |                               | Required only for auto-ordering             |
| `RAZORPAY_API_KEY`        | No       |                               | Required only for auto-ordering payments    |
| `RAZORPAY_API_SECRET`     | No       |                               | Required only for payment verification      |
| `RAZORPAY_REDIRECT_URL`   | No       |                               | Required only for payment links             |
| `RAZORPAY_WEBHOOK_SECRET` | No       |                               | Required only for Razorpay webhooks         |

Auto-ordering is enabled only when all required order-server and Razorpay
settings are configured. Otherwise the bot logs the missing config and continues
without that feature.

## Runtime Behavior

Startup begins in `src/server.ts`:

1. Connect Redis and MongoDB.
2. Initialize Amul API sessions for known pincodes.
3. Start Telegraf in webhook mode when `BOT_WEBHOOK_URL` is present, unless
   `BOT_FORCE_POLLING=true`.
4. Start polling mode when no webhook is configured.
5. Start Express on `PORT`.
6. Start payment expiry checks.
7. Start stock checking and activity reports when `TRACKER_ENABLED=true`.

Scheduled jobs use the `Asia/Kolkata` timezone. The stock checker and payment
expiry job run every minute; the activity report runs daily at 23:59 IST.

## Deployment

### Docker

The Dockerfile uses the official Bun image, installs dependencies, builds the
project, and starts the compiled app.

```bash
docker build -t amul-notify .
docker run -d --name amul-notify --env-file .env.prod -p 5999:5999 amul-notify
```

The current Dockerfile copies `.env.prod` during image build, so create it
locally before building or adjust the Dockerfile if you want runtime-only env
injection. Keep production env files out of source control.

### GitHub Actions

`.github/workflows/deploy.yml` runs on `main` pushes and pull requests using a
self-hosted `amul-notify-runner`. It writes `.env.prod` from repository
secrets/variables, backs up MongoDB, builds a Docker image, and restarts the
container.

## AI-Assisted Development

This repository is set up for structure-aware AI coding agents.

- `AGENTS.md` is the canonical operating guide for automated agents.
- `.github/copilot-instructions.md` points GitHub Copilot to the same rules.
- `.cursor/rules/amul-notify.mdc` points Cursor to the same rules.
- `CLAUDE.md` points Claude-style agents to the same rules.
- `docs/ai-development.md` gives human-facing prompt patterns and validation
  guidance for AI-assisted work.

When using an AI assistant, ask it to read `AGENTS.md` first, keep edits in
`src` rather than `dist`, preserve callback strings, update registration/config
files with new commands or actions, and run the smallest useful validation
command before handing work back.

## Security and Privacy

- Never commit `.env.dev`, `.env.prod`, tokens, API keys, cookies, payment
  secrets, phone numbers, addresses, or user exports.
- Treat Telegram IDs, Amul cookies, payment references, and addresses as
  sensitive data.
- Preserve Telegram webhook secret-token checks.
- Preserve Razorpay signature verification.
- Escape dynamic text rendered in Express HTML responses.
- Avoid logging full cookies or secrets.

This project is unofficial and is not affiliated with or endorsed by Amul.

## Contributing

1. Create a focused branch.
2. Read the nearest existing implementation before adding a new pattern.
3. Update command/action config and registration when changing bot behavior.
4. Update env docs/examples when adding configuration.
5. Run `pnpm exec tsc --noEmit`, `pnpm run lint`, or `pnpm run build`
   depending on the risk of the change.
6. Open a pull request with the behavior change and validation result.

## License

This project is licensed as ISC in `package.json`.
