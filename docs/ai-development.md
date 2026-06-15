# AI-Driven Development Guide

This repository supports AI-assisted development through a single canonical
agent guide plus lightweight bridge files for common tools.

## Canonical Context

Use `AGENTS.md` as the source of truth for automated agents. It documents the
repository map, Telegraf registration order, command/action/wizard patterns,
env handling, data model boundaries, validation commands, and project gotchas.

Bridge files intentionally stay short:

- `.github/copilot-instructions.md` for GitHub Copilot.
- `.cursor/rules/amul-notify.mdc` for Cursor.
- `CLAUDE.md` for Claude-style agents.

If guidance changes, update `AGENTS.md` first, then update bridge files only
when their short reminders become inaccurate.

## Recommended Agent Workflow

1. Ask the agent to read `AGENTS.md`.
2. Ask it to inspect adjacent code before editing.
3. Keep the requested change scoped to the owning layer.
4. Require updates to config/registration files when behavior enters through a
   command, callback action, route, job, or env var.
5. Ask for the smallest useful validation command.
6. Ask the agent to report changed files, validation results, and any local
   runtime gaps.

## Prompt Templates

### Feature Work

```text
Read AGENTS.md first. Implement <feature> in the existing project style.
Inspect the nearest command/action/service/model files before editing. Update
registration/config/env docs as needed. Run the smallest useful validation and
summarize files changed plus remaining risk.
```

### Bug Fix

```text
Read AGENTS.md first. Investigate <bug or symptom>. Identify the owner layer,
make the minimal fix, preserve callback/env compatibility, and run validation.
Report the root cause and files changed.
```

### Code Review

```text
Review this change against AGENTS.md. Prioritize bugs, regressions, missing
guards, secret leakage, callback stability, env/schema mismatch, and missing
validation. Put findings first with file/line references.
```

### Documentation Update

```text
Read AGENTS.md and compare the docs with package.json, src/env.ts, src/bot.ts,
and src/server.ts. Update stale commands, env vars, runtime behavior, and AI
assistant guidance without changing application code.
```

## Validation Matrix

| Change type                     | Preferred validation                    |
| ------------------------------- | --------------------------------------- |
| Docs only                       | Manual review; optional formatter       |
| Type-only or narrow source edit | `pnpm exec tsc --noEmit`                |
| Command/action/middleware edit  | `pnpm run lint` and typecheck           |
| Startup, jobs, queues, env      | `pnpm run build`                        |
| Runtime integration behavior    | Build plus manual run with suitable env |

There is currently no dedicated test script.

## Safety Checks

- Do not commit `.env.dev`, `.env.prod`, tokens, cookies, payment secrets, user
  exports, phone numbers, addresses, or private operational data.
- Do not rely on `dist` as source of truth.
- Do not change existing `ACTIONS` callback strings unless compatibility is
  intentionally handled.
- Keep `sessionMiddleware` before handlers that read `ctx.user`, `ctx.amul`, or
  `ctx.trackedProducts`.
- Keep `/setpincode` before `pincodeGuard`.
- Keep recoverable background job failures logged and isolated to the affected
  user/substore.
