# Image Upload — anonymous gallery

TanStack Start on **Cloudflare Workers** with **D1**, **R2**, **Drizzle**, **Better Auth** (anonymous + admin + custom image permissions), **Tailwind CSS**, **Headless UI**, and **TanStack Query**.

## Prerequisites

- Node 22+ and `pnpm`
- Cloudflare account with **D1**, **R2**, and **Workers** enabled
- Wrangler logged in (`wrangler login`) for remote DB/R2

## Wrangler bindings

Defined in `wrangler.jsonc`:

| Binding        | Purpose                          |
|----------------|----------------------------------|
| `DB`           | D1 SQLite (auth + image metadata) |
| `CDN_BUCKET`   | R2 bucket for full + placeholder WebP |
| `BETTER_AUTH_URL` | Public base URL of the app (must match browser origin for cookies) |
| `BETTER_AUTH_SECRET` | Long random secret; **use `wrangler secret`** in staging/production |

Generate types after changing bindings:

```bash
pnpm run cf-typegen
```

### R2 bucket

Create a bucket (names in `wrangler.jsonc` are examples; align with your account):

- Local / default in this repo: `image-upload-cdn-staging` (see `wrangler.jsonc`)
- Production: `image-upload-cdn`

Objects are stored under server-controlled keys `img/<ulid>/full.webp` and `img/<ulid>/placeholder.webp` (see `src/lib/r2-keys.ts`).

### Placeholder generation

Placeholders are generated at upload time on the **Worker** using **Photon** (WebAssembly) for a tiny blurred WebP stored in R2. **Cloudflare Images** could centralize resizing/variants with a paid Images subscription; this project keeps R2-only behavior and documents that tradeoff in `src/lib/photon-placeholder.ts`.

If Photon cannot initialize or decode a particular file (WASM bundling in some Worker builds, or an exotic WebP), the server **falls back** to a minimal 1×1 neutral WebP so the upload still succeeds. Layout and aspect ratio still come from stored `width` / `height` in D1, not from the placeholder bitmap.

## D1 migrations

Schema lives in `src/db/schema/`; SQL migrations are in `drizzle/`.

```bash
# Local (Miniflare)
pnpm run db:migrate:local

# Remote
pnpm run db:migrate:staging
pnpm run db:migrate:production
```

Optional: `pnpm run db:generate` to regenerate migrations from Drizzle schema (may prompt in some setups).

## Better Auth

- **Anonymous** visitors are signed in via the anonymous plugin (`src/lib/auth-factory.ts`).
- **SSR**: root route `beforeLoad` runs `ensureSessionFn()` so the first response can set session cookies without a client-side “signed in” flash.
- **Email/password** is enabled for admins (`/admin/sign-in`).
- **Admin plugin** uses extended access control with a custom `image` resource (`delete-own`, `delete-any`) in `src/lib/auth-access.ts`. Server-side delete checks are in `src/lib/permissions.ts` and `deleteImageFn` in `src/server/gallery.ts`.

### Secrets

For deployed workers, set a strong secret:

```bash
wrangler secret put BETTER_AUTH_SECRET -e staging
wrangler secret put BETTER_AUTH_SECRET -e production
```

Set `BETTER_AUTH_URL` in each environment to the real HTTPS origin users hit (see `wrangler.jsonc` `env.*.vars` placeholders).

## Create admin user

Interactive script (uses [Wrangler `getPlatformProxy`](https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy) to obtain real `DB` / env bindings):

```bash
pnpm create-admin
pnpm create-admin -- --env=staging
pnpm create-admin -- --env=production
```

**Staging / production:** stay logged into Cloudflare (`wrangler login`) so Wrangler can start a remote-binding proxy session. In `wrangler.jsonc`, the staging and production D1 entries set `"remote": true` so tooling (this script included) writes to **hosted** D1. Without that flag, Wrangler keeps D1 on **local Miniflare** (under `.wrangler/state`), and the dashboard will look empty even though the script exited successfully.

The script signs up an email/password user via Better Auth’s HTTP handler, then sets `role` to `admin` in D1. Use a unique email; reruns will fail if the user already exists.

To confirm the row exists on Cloudflare-hosted D1 (example staging):

```bash
wrangler d1 execute image-upload-db-staging --remote -e staging --command "SELECT id,email,role FROM user WHERE email='<your-email>';"
```

## Local development

```bash
pnpm install
pnpm run db:migrate:local
pnpm dev
```

Open `http://localhost:3000`. The default `BETTER_AUTH_URL` in `wrangler.jsonc` matches this port.

## Deploy

```bash
pnpm run deploy:staging
pnpm run deploy:production
```

Ensure remote migrations have been applied and R2/D1 bindings point at the correct resources for each environment.

## App routes (high level)

| Path | Description |
|------|-------------|
| `/` | Public infinite-scrolling gallery (cursor pagination by `createdAt` + ULID `id`) |
| `/profile` | Current user’s images + delete (own images only) |
| `/admin/sign-in` | Admin email/password |
| `/admin` | Admin moderation (same gallery feed + delete any, permission-checked server-side) |
| `POST /api/upload` | Multipart WebP upload (validated server-side) |
| `GET /api/media/$imageId` | Public image; `?placeholder=1` returns tiny blurred WebP |

Uploads convert to WebP in the browser first (see `src/lib/client-image.ts`); the server only accepts WebP bytes and checks magic numbers (`src/lib/webp.ts`).
