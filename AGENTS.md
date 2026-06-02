<!-- intent-skills:start -->
## Skill Loading

Before substantial work:
- Skill check: run `npx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

---

# GlowUp Together — TanStack Start Full-Stack App

## Scaffolding Command

```bash
npx @tanstack/cli@latest create my-tanstack-app \
  --intent \
  --deployment cloudflare \
  --add-ons tanstack-query,neon,drizzle,form,sentry,store,clerk \
  --framework React \
  --no-examples \
  --non-interactive \
  --no-git \
  --target-dir .
```

## Follow-Up TanStack Intent Commands

```bash
npx @tanstack/intent@latest install   # Wired agent skill mappings
npx @tanstack/intent@latest list      # Listed all available skills
```

## Stack & Integrations

| Category | Technology | Add-on ID | Status |
|---|---|---|---|
| Framework | TanStack Start + Router | (core) | ✅ Scaffolded |
| Data Fetching | TanStack Query | `tanstack-query` | ✅ Scaffolded |
| Forms | TanStack Form | `form` | ✅ Scaffolded |
| State Management | TanStack Store | `store` | ✅ Scaffolded |

| Auth (Managed) | Clerk | `clerk` | ✅ Scaffolded |
| Database | Neon (Serverless Postgres) | `neon` | ✅ Scaffolded |
| ORM | Drizzle | `drizzle` | ✅ Scaffolded |
| Monitoring | Sentry | `sentry` | ✅ Scaffolded |
| Deployment (Primary) | Cloudflare Workers | `cloudflare` | ✅ Scaffolded |
| Deployment (Alt) | Railway | — | ✅ Config added |
| Code Review | CodeRabbit | — | ✅ `.coderabbit.yaml` |
| Styling | Tailwind CSS v4 | (bundled) | ✅ Scaffolded |
| Agent Skills | TanStack Intent | — | ✅ Installed |

## TanStack Libraries Used

- **TanStack Start** — Full-stack framework (SSR, server functions, streaming)
- **TanStack Router** — File-based routing with type-safe navigation
- **TanStack Query** — Server state management, caching, SSR integration
- **TanStack Form** — Type-safe form management with validation
- **TanStack Store** — Lightweight client-side state management
- **TanStack CLI** — Project scaffolding and add-on management
- **TanStack Intent** — Agent skill mappings for AI coding assistants

## Environment Variables

> **CRITICAL**: Never expose server-only secrets in client code. Only `VITE_`-prefixed vars are available on the client.

| Variable | Required | Client/Server | Source |
|---|---|---|---|
| `VITE_SENTRY_DSN` | For monitoring | Client + Server | Sentry Dashboard → Project → Client Keys |
| `VITE_SENTRY_ORG` | For source maps | Build-time | Sentry Dashboard → Settings → Organization |
| `VITE_SENTRY_PROJECT` | For source maps | Build-time | Sentry Dashboard → Settings → Projects |
| `SENTRY_AUTH_TOKEN` | For source maps | Build-time | Sentry Dashboard → Auth Tokens |

| `DATABASE_URL` | Yes | Server | Neon Console → Connection Details |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Client | Clerk Dashboard → API Keys |

### Setup Steps

1. Copy `.env.example` to `.env.local`
2. Fill in values from each service dashboard
3. Run database migrations: `pnpm run db:push`

## Deployment Notes

### Cloudflare Workers (Primary)

- Config: `wrangler.jsonc`
- Vite Plugin: `@cloudflare/vite-plugin` in `vite.config.ts`
- Deploy: `pnpm run deploy` (builds + `wrangler deploy`)
- Secrets: `wrangler secret put <NAME>` for each server-only env var
- Public vars go in `wrangler.jsonc` under `vars`

> **Cloudflare env gotcha**: `process.env.X` at module scope returns `undefined` in Workers. Use `import { env } from 'cloudflare:workers'` or read env inside `.handler()` / middleware `.server()`.

### Railway (Alternative)

- Config: `railway.toml` + `Dockerfile`
- To switch from Cloudflare to Railway:
  1. Remove `cloudflare()` plugin from `vite.config.ts`
  2. Use the default Nitro/Node adapter
  3. `railway login && railway init && railway up`
- Set env vars in Railway dashboard or `railway variables set KEY=value`

## Key Architectural Decisions

1. **Auth**: Clerk (managed, `src/integrations/clerk/`) handles authentication with prebuilt UI components
2. **Database**: Neon serverless Postgres via `@neondatabase/serverless` with Drizzle ORM
3. **File-based routing**: Routes in `src/routes/` auto-generate `src/routeTree.gen.ts` (never edit manually)
4. **Server functions**: Use `createServerFn` for all server-only code (DB queries, auth checks)
5. **SSR + Query**: Router-Query SSR integration via `@tanstack/react-router-ssr-query`
6. **Sentry**: Dual init — client in `src/router.tsx`, server in `instrument.server.mjs`

## Code Review — CodeRabbit

CodeRabbit is configured as external repository tooling, not an in-app SDK.

### Setup
1. Install the [CodeRabbit GitHub App](https://github.com/apps/coderabbitai) on your repository
2. The `.coderabbit.yaml` at the repo root configures review behavior
3. CodeRabbit will automatically review pull requests

### What's configured
- Assertive review profile with sequence diagrams
- Path-specific instructions for routes and DB files
- Auto-filtering of generated files (`routeTree.gen.ts`, `dist/`, `node_modules/`)

## Project Structure

```
├── .coderabbit.yaml          # CodeRabbit PR review config
├── .env.example              # Environment variable template
├── .env.local                # Local environment variables (git-ignored)
├── AGENTS.md                 # This file — project context for AI agents
├── Dockerfile                # Multi-stage build for Railway / Node.js hosting
├── README.md                 # Getting started guide
├── db/init.sql               # Neon database seed SQL
├── drizzle.config.ts         # Drizzle Kit configuration
├── instrument.server.mjs     # Sentry server-side initialization
├── neon-vite-plugin.ts       # Neon Vite plugin config
├── package.json              # Dependencies and scripts
├── railway.toml              # Railway deployment config
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite + Cloudflare + Tailwind + TanStack Start
├── wrangler.jsonc            # Cloudflare Workers config
└── src/
    ├── db.ts                 # Neon serverless client
    ├── db/
    │   ├── index.ts          # Drizzle ORM instance
    │   └── schema.ts         # Drizzle schema (todos table)
    ├── integrations/
    │   ├── clerk/            # Clerk provider + header components
    │   └── tanstack-query/   # Query provider + devtools
    ├── router.tsx            # Router factory with Query SSR integration
    ├── routes/
    │   ├── __root.tsx        # Root layout (Clerk provider, devtools)
    │   └── index.tsx         # Home page
    └── styles.css            # Global styles (Tailwind CSS v4)
```

## Available Scripts

| Script | Description |
|---|---|
| `pnpm run dev` | Start dev server on port 3000 (with Sentry + dotenv) |
| `pnpm run build` | Production build |
| `pnpm run preview` | Preview production build |
| `pnpm run test` | Run Vitest tests |
| `pnpm run deploy` | Build + deploy to Cloudflare Workers |
| `pnpm run db:generate` | Generate Drizzle migrations |
| `pnpm run db:migrate` | Run Drizzle migrations |
| `pnpm run db:push` | Push schema changes to DB |
| `pnpm run db:pull` | Pull schema from DB |
| `pnpm run db:studio` | Open Drizzle Studio |

## Known Gotchas

1. **Vite 8 + Neon plugin**: `vite-plugin-neon-new@0.8.0` declares peer dep on Vite ^6/^7. Install with `--legacy-peer-deps`. Works fine at runtime.
2. **Cloudflare Workers env**: Use `import { env } from 'cloudflare:workers'` instead of `process.env` at module scope.
3. **`routeTree.gen.ts`**: Auto-generated. Never edit manually. Regenerated on `pnpm run dev`.
4. **Isomorphic code**: All code in TanStack Start runs on both server AND client by default. Use `createServerFn` for server-only logic.

## Next Steps

- [ ] Fill in `.env.local` with actual service credentials
- [ ] Run `pnpm run dev` to start dev server (Neon will auto-create a claimable DB)
- [ ] Run `pnpm run db:push` to push Drizzle schema to Neon
- [ ] Install CodeRabbit GitHub App on your repository
- [ ] Set up Clerk application at dashboard.clerk.com
- [ ] Create Sentry project and add DSN
- [ ] Configure Cloudflare secrets: `wrangler secret put DATABASE_URL`, etc.
