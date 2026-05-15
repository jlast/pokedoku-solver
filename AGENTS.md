# Setup
This repository is a pnpm monorepo.

## Workspace packages
- Root (`.`)
- `astro` (Pokedoku Helper website)
- `apps/*` (includes `apps/pokedoku-details`)
- `packages/*` (shared packages like `@pokedoku-helper/shared-types`)

## Core projects
- **Pokedoku Helper website** (`astro`)
- **Pokedoku Details Devvit app** (`apps/pokedoku-details`)

# Pokedoku Helper website (`astro`)
Astro-based website for Pokedoku suggestions, statistics, tools, and tips.

## Stack
- Astro
- Tailwind CSS
- React (for interactive UI where needed)

## Rules
- Use Tailwind utility classes; do not introduce custom CSS unless already established in that file or feature.
- Do not add inline styles (for example, `style={...}` in JSX/TSX).
- Put reusable UI patterns in `astro/src/components`.
- Keep pages and components lightweight and composable.
- Preserve existing visual and structural patterns when modifying existing pages.

## Common commands
- Dev: `pnpm dev` (from repo root) or `pnpm --dir astro dev`
- Build: `pnpm build` (runs data fetch + Astro build)
- Preview: `pnpm preview` or `pnpm --dir astro preview`

## Auth and feature flags
- Website auth uses AWS Cognito Hosted UI with Google federation.
- Current login flow is Authorization Code + PKCE (SPA/public client; no client secret in frontend).
- Login UI is feature-flagged.
  - `PUBLIC_ENABLE_AUTH` controls default visibility.
  - `PUBLIC_ALLOW_AUTH_QUERY_OVERRIDE` controls `?auth=1` / `?auth=0` override behavior.
- Cognito-related public env vars used by website build:
  - `PUBLIC_COGNITO_REGION`
  - `PUBLIC_COGNITO_USER_POOL_ID`
  - `PUBLIC_COGNITO_CLIENT_ID` (must be a public/SPA app client)
  - `PUBLIC_COGNITO_DOMAIN` (custom domain, e.g. `auth.pokedoku-helper.com`)
  - `PUBLIC_COGNITO_REDIRECT_SIGN_IN`
  - `PUBLIC_COGNITO_REDIRECT_SIGN_OUT`
- Production deploys are built in GitHub Actions; all `PUBLIC_*` values must be set in the GitHub `production` environment variables so Astro bakes correct values at build time.

# Pokedoku Details Devvit app (`apps/pokedoku-details`)
Devvit app that replies to tokens in posts and comments such as:
- `[[Vulpix]]`
- `[[Fire]]`
- `[[Water+Kanto]]`

It uses Redis caching and realtime data from `www.pokedoku-helper.com`.

## Rules
- Keep token parsing deterministic and strict.
- Preserve compatibility with existing token formats.
- Prefer shared types from `@pokedoku-helper/shared-types` for cross-project contracts.
- Treat network and data failures as expected conditions and handle them gracefully.

## Common commands
- Dev: `pnpm dev:pokedoku-details` (root) or `pnpm --filter pokedoku-details dev`
- Type check: `pnpm --filter pokedoku-details type-check`
- Lint: `pnpm --filter pokedoku-details lint`
- Test: `pnpm --filter pokedoku-details test`
- Deploy: `pnpm --filter pokedoku-details deploy`

# Shared types (`packages/shared-types`)
- Keep shared domain models and contracts here.
- Update consumers in both website and Devvit app when shared contracts change.

# Code styling
Follow existing repository style and avoid formatting churn.

## General
- Prefer TypeScript.
- Prefer small, focused functions and clear naming.
- Avoid broad refactors unrelated to the task.
- Run lint and tests for touched areas before finishing.

## Linting source of truth
- Root and website lint config: `eslint.config.js`
- Devvit lint config: `apps/pokedoku-details/eslint.config.js`

## Formatting conventions
- In `apps/pokedoku-details`, Prettier config is defined in `apps/pokedoku-details/.prettierrc`:
  - `singleQuote: true`
  - `trailingComma: es5`
  - `quoteProps: preserve`
- In other workspaces, match existing file style and ESLint expectations.

# Agent working agreement
- Make minimal, targeted changes.
- Do not move files or rename public APIs unless required.
- Do not add new dependencies unless necessary.
- Document non-obvious decisions in PR or commit notes instead of adding excessive inline comments.
