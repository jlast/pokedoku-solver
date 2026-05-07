# Pokedoku Details (Devvit)

Devvit app that listens to Reddit comment/post triggers, parses bracket tokens, and replies with Pokedoku helper data.

## What it supports

- `[[Pokemon]]` (example: `[[Golem]]`)
- `[[Category]]` (example: `[[Fire]]`, `[[Kanto]]`)
- `[[Category+Category]]` (example: `[[Ground+Kanto]]`)
- Mixed sequences in one message (order is preserved in the reply)
- Compact mode for 6+ bracket tokens

## Reply behavior

- Full mode (`< 6` tokens): detailed blocks for Pokemon and category stats
- Compact mode (`>= 6` tokens): one line per token
  - Category: `(Ground + Kanto)[link] - xx valid answers`
  - Pokemon: `(Golem)[link] (#076) - 🪨 Rock | ⛰️ Ground • Kanto`

## Data source and cache

- Remote-first source: `https://www.pokedoku-helper.com/data/pokemon.json`
- Cache TTL: 1 hour
- If remote fetch fails:
  - logs a warning
  - falls back to bundled local JSON (`src/generated/pokemon.local.json`)
- If both remote and local fail:
  - logs an error
  - serves stale cache if available, otherwise returns empty data

## Project structure

```text
src/
├── core/
│   └── pokemonCache.ts            # Remote-first + fallback cache loader
└── routes/
    ├── api.ts                     # Cache status/invalidate endpoints
    ├── categoryCommentBuilder.ts  # Category/filter richtext builders
    ├── pokemonCommentBuilder.ts   # Pokemon richtext builders
    └── triggers.ts                # Comment/post trigger handlers
```

## Commands

- `npm run dev` - Start Devvit playtest
- `npm run build` - Build app
- `npm run test` - Run Vitest tests
- `npm run type-check` - Run TypeScript build check
- `npm run deploy` - Type-check + lint + test + upload
- `npm run launch` - Deploy and publish app
- `npm run login` - Devvit CLI login

## Local development notes

- Ensure local fallback data exists before playtesting if you want fallback available:
  - from repo root: `pnpm sync:pokedoku-details:local-data`
- App permissions are configured in `devvit.json` (including HTTP domain allowlist).

## CI publish behavior

The deploy workflow publishes this app only when relevant files are affected.

Affected paths include:
- `apps/pokedoku-details/**`
- `packages/shared-types/**`
- `public/data/**`
- root lockfiles / root package manifest

## GitHub secret for publish

To enable Devvit publish in CI:

1. GitHub repo → `Settings` → `Secrets and variables` → `Actions`
2. Add secret: `DEVVIT_TOKEN` (or your configured auth secret name)
3. Wire it to the publish step env in workflow if needed

## Quick examples

- `[[Golem]]`
- `[[Fire]]`
- `[[Ground+Kanto]]`
- `I want to learn more about: [[Ground+Kanto]], [[Fire+Final Stage]], [[Fire]], [[Golem]], [[Kanto]]`
