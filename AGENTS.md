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
- Use React components for dynamic/interactive frontend behavior; do not implement dynamic UI with plain JavaScript scripts.
- Put reusable UI patterns in `astro/src/components`.
- Keep pages and components lightweight and composable.
- Do not define multiple React components in a single file.
- Treat any JSX-returning helper that is effectively a component as a component and put it in its own file.
- Use plain helper functions for local extraction only when they are not acting as hidden components.
- Preserve existing visual and structural patterns when modifying existing pages.

## Theme mode (light/dark)
- The website supports both light mode and dark mode; do not ship UI changes that only work in one mode.
- Prefer existing theme tokens (`--bg`, `--text`, `--text-h`, `--border`, `--code-bg`, `--accent-bg`, `--accent-border`) over hardcoded light/dark color classes.
- If adding or changing interactive states (selected, hover, disabled, badges, pills), verify contrast in both light and dark mode.
- Theme preference is persisted in `localStorage` under `theme-mode`; any theme-toggle behavior should remain compatible with that key.

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

# Infra and API

## User Dex API (`api.pokedoku-helper.com`)
- Infra template: `terraform/user-dex-api-stack.yaml`
- Placeholder Lambdas:
  - `terraform/lambda/user-dex-get.ts`
  - `terraform/lambda/user-dex-patch.ts`
- Authenticated API activity is tracked in DynamoDB table `UserActivity` via per-user `lastActivityAt` timestamps for active-user metrics.
- Build/package commands (root):
  - `pnpm build:user-dex-get-lambda`
  - `pnpm package:user-dex-get-lambda`
  - `pnpm build:user-dex-patch-lambda`
  - `pnpm package:user-dex-patch-lambda`
  - `pnpm package:user-dex-lambdas`

## Cognito metrics dashboard
- Infra template: `terraform/cognito-metrics-stack.yaml`
- Lambda source: `terraform/lambda/cognito-user-metrics.ts`
- Active-user metrics are derived from the `UserActivity` table, not directly from Cognito session/refresh-token activity.
- Build/package commands (root):
  - `pnpm build:cognito-user-metrics-lambda`
  - `pnpm package:cognito-user-metrics-lambda`

## Required infrastructure inputs
- CloudFormation parameters expected by `terraform/user-dex-api-stack.yaml`:
  - `DomainName` (default `pokedoku-helper.com`)
  - `ApiSubdomain` (default `api`)
  - `HostedZoneId` (Route53 hosted zone for domain)
  - `ApiCertificateArn` (ACM cert for `api.pokedoku-helper.com` in API region)
  - `UserDexGetCodeS3Bucket` / `UserDexGetCodeS3Key`
  - `UserDexPatchCodeS3Bucket` / `UserDexPatchCodeS3Key`
  - `AllowedOrigin` (default `https://www.pokedoku-helper.com`)
  - `CognitoRegion`, `CognitoUserPoolId`, `CognitoClientId`

## Frontend API configuration
- Website uses `PUBLIC_USER_DEX_API_BASE_URL` for user dex API calls.
- For production, set `PUBLIC_USER_DEX_API_BASE_URL=https://api.pokedoku-helper.com` in GitHub `production` environment vars.

## CI/CD wiring
- Infra deploy workflow: `.github/workflows/reusable-infra-deploy.yml`
- Site deploy workflow: `.github/workflows/reusable-site-deploy.yml`
- Deploy entry workflow: `.github/workflows/deploy.yml`
- Manual dashboard deploy input: `force_dashboard_deploy`
- Stack deploy script: `.github/scripts/deploy-public-api-stack.sh`
- Website stack deploy script: `.github/scripts/deploy-website-stack.sh`
- Change detection script includes website, user dex, and lambda stack changes: `.github/scripts/detect-changes.sh`
- Required GitHub environment values for infra deploy:
  - Secrets: `S3_BUCKET_NAME`, `CLOUDFORMATION_STACK_NAME`, `HOSTED_ZONE_ID`, `API_CERTIFICATE_ARN`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
  - Vars (with defaults in workflow): `DOMAIN_NAME`, `API_SUBDOMAIN`, `ALLOWED_ORIGIN`, `COGNITO_REGION`
- Required GitHub environment values for Cognito metrics deploy:
  - Vars: `PUBLIC_COGNITO_USER_POOL_ID`, `COGNITO_REGION`, `COGNITO_METRICS_NAMESPACE`, `COGNITO_METRICS_DASHBOARD_NAME`, `COGNITO_METRICS_SCHEDULE_EXPRESSION`

# Code styling
Follow existing repository style and avoid formatting churn.

## General
- Prefer TypeScript.
- Prefer small, focused functions and clear naming.
- Avoid broad refactors unrelated to the task.
- Write and maintain unit tests and integration tests
- Run lint and tests for touched areas before finishing.
- For infra changes, validate templates with `aws cloudformation validate-template` before deploy.

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
- Keep this file up to date whenever project structure, commands, workflows, or conventions change.
