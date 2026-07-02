#!/usr/bin/env bash
set -euo pipefail

BEFORE_SHA="${GITHUB_EVENT_BEFORE:-}"
CURRENT_SHA="${GITHUB_SHA:-}"

if [ -z "${CURRENT_SHA}" ]; then
  echo "GITHUB_SHA is required" >&2
  exit 1
fi

if [ -z "${BEFORE_SHA}" ] || [ "${BEFORE_SHA}" = "0000000000000000000000000000000000000000" ]; then
  BEFORE_SHA=$(git rev-parse "${CURRENT_SHA}^" 2>/dev/null || echo "")
fi

if [ -n "${BEFORE_SHA}" ]; then
  CHANGED_FILES=$(git diff --name-only "${BEFORE_SHA}" "${CURRENT_SHA}")
else
  CHANGED_FILES=$(git show --pretty="" --name-only "${CURRENT_SHA}")
fi

echo "Changed files:"
printf '%s\n' "${CHANGED_FILES}"

CHANGED_FILES_LIST_FILE=$(mktemp)
printf '%s\n' "${CHANGED_FILES}" > "${CHANGED_FILES_LIST_FILE}"

cleanup() {
  rm -f "${CHANGED_FILES_LIST_FILE}" "${DAILY_META_FILE:-}" "${STATS_META_FILE:-}" "${USER_DEX_GET_META_FILE:-}" "${USER_DEX_PATCH_META_FILE:-}" "${USER_DEX_SHARED_GET_META_FILE:-}" "${SETTINGS_GET_META_FILE:-}" "${SETTINGS_PATCH_META_FILE:-}" "${ADMIN_BONUS_PUZZLE_POST_META_FILE:-}" "${COGNITO_METRICS_META_FILE:-}" "${DAILY_BUNDLE_FILE:-}" "${STATS_BUNDLE_FILE:-}" "${USER_DEX_GET_BUNDLE_FILE:-}" "${USER_DEX_PATCH_BUNDLE_FILE:-}" "${USER_DEX_SHARED_GET_BUNDLE_FILE:-}" "${SETTINGS_GET_BUNDLE_FILE:-}" "${SETTINGS_PATCH_BUNDLE_FILE:-}" "${ADMIN_BONUS_PUZZLE_POST_BUNDLE_FILE:-}" "${COGNITO_METRICS_BUNDLE_FILE:-}"
}
trap cleanup EXIT

changed_in_paths() {
  local pattern
  for pattern in "$@"; do
    if printf '%s\n' "${CHANGED_FILES}" | grep -E -q "${pattern}"; then
      return 0
    fi
  done
  return 1
}

images_changed=false
data_changed=false
site_changed=false
daily_lambda_changed=false
stats_lambda_changed=false
daily_stack_changed=false
stats_stack_changed=false
website_stack_changed=false
user_dex_get_lambda_changed=false
user_dex_patch_lambda_changed=false
user_dex_shared_get_lambda_changed=false
settings_get_lambda_changed=false
settings_patch_lambda_changed=false
admin_bonus_puzzle_post_lambda_changed=false
cognito_metrics_lambda_changed=false
user_dex_stack_changed=false
cognito_metrics_stack_changed=false
pokedoku_details_changed=false

if changed_in_paths '^public/images/'; then
  images_changed=true
fi

if changed_in_paths '^apps/pokedoku-details/' '^packages/shared-types/' '^public/data/' '^package.json$' '^pnpm-lock.yaml$' '^package-lock.json$'; then
  pokedoku_details_changed=true
fi

if changed_in_paths '^public/data/' '^scripts/' '^lib/shared/' '^packages/shared-types/' '^package.json$' '^pnpm-lock.yaml$' '^package-lock.json$'; then
  data_changed=true
fi

if changed_in_paths '^astro/' '^astro/src/pages/' '^astro/src/pages/pokemon/' '^src/' '^lib/browser/' '^lib/shared/' '^packages/shared-types/' '^public/' '^package.json$' '^pnpm-lock.yaml$' '^package-lock.json$'; then
  site_changed=true
fi

if changed_in_paths '^package.json$' '^pnpm-lock.yaml$' '^package-lock.json$'; then
  daily_lambda_changed=true
  stats_lambda_changed=true
  user_dex_get_lambda_changed=true
  user_dex_patch_lambda_changed=true
  user_dex_shared_get_lambda_changed=true
  settings_get_lambda_changed=true
  settings_patch_lambda_changed=true
  admin_bonus_puzzle_post_lambda_changed=true
  cognito_metrics_lambda_changed=true
elif ! changed_in_paths '^terraform/lambda/' '^lib/shared/' '^scripts/' '^packages/shared-types/' '^tsconfig' '^package.json$'; then
  daily_lambda_changed=false
  stats_lambda_changed=false
  user_dex_get_lambda_changed=false
  user_dex_patch_lambda_changed=false
  user_dex_shared_get_lambda_changed=false
  settings_get_lambda_changed=false
  settings_patch_lambda_changed=false
  admin_bonus_puzzle_post_lambda_changed=false
  cognito_metrics_lambda_changed=false
else
  DAILY_META_FILE=$(mktemp)
  STATS_META_FILE=$(mktemp)
  USER_DEX_GET_META_FILE=$(mktemp)
  USER_DEX_PATCH_META_FILE=$(mktemp)
  USER_DEX_SHARED_GET_META_FILE=$(mktemp)
  SETTINGS_GET_META_FILE=$(mktemp)
  SETTINGS_PATCH_META_FILE=$(mktemp)
  ADMIN_BONUS_PUZZLE_POST_META_FILE=$(mktemp)
  COGNITO_METRICS_META_FILE=$(mktemp)
  DAILY_BUNDLE_FILE=$(mktemp)
  STATS_BUNDLE_FILE=$(mktemp)
  USER_DEX_GET_BUNDLE_FILE=$(mktemp)
  USER_DEX_PATCH_BUNDLE_FILE=$(mktemp)
  USER_DEX_SHARED_GET_BUNDLE_FILE=$(mktemp)
  SETTINGS_GET_BUNDLE_FILE=$(mktemp)
  SETTINGS_PATCH_BUNDLE_FILE=$(mktemp)
  ADMIN_BONUS_PUZZLE_POST_BUNDLE_FILE=$(mktemp)
  COGNITO_METRICS_BUNDLE_FILE=$(mktemp)

  npx esbuild terraform/lambda/daily-puzzle-fetcher.ts --bundle --platform=node --target=node20 --format=cjs --external:@aws-sdk/* --outfile="${DAILY_BUNDLE_FILE}" --metafile="${DAILY_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/puzzle-statistics.ts --bundle --platform=node --target=node20 --format=cjs --external:@aws-sdk/* --outfile="${STATS_BUNDLE_FILE}" --metafile="${STATS_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/user-dex-get.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${USER_DEX_GET_BUNDLE_FILE}" --metafile="${USER_DEX_GET_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/user-dex-patch.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${USER_DEX_PATCH_BUNDLE_FILE}" --metafile="${USER_DEX_PATCH_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/user-dex-shared-get.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${USER_DEX_SHARED_GET_BUNDLE_FILE}" --metafile="${USER_DEX_SHARED_GET_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/settings-get.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${SETTINGS_GET_BUNDLE_FILE}" --metafile="${SETTINGS_GET_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/settings-patch.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${SETTINGS_PATCH_BUNDLE_FILE}" --metafile="${SETTINGS_PATCH_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/admin-bonus-puzzle-post.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${ADMIN_BONUS_PUZZLE_POST_BUNDLE_FILE}" --metafile="${ADMIN_BONUS_PUZZLE_POST_META_FILE}" --log-level=error >/dev/null
  npx esbuild terraform/lambda/cognito-user-metrics.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${COGNITO_METRICS_BUNDLE_FILE}" --metafile="${COGNITO_METRICS_META_FILE}" --log-level=error >/dev/null

  daily_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${DAILY_META_FILE}")

  stats_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${STATS_META_FILE}")

  user_dex_get_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${USER_DEX_GET_META_FILE}")

  user_dex_patch_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${USER_DEX_PATCH_META_FILE}")

  user_dex_shared_get_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${USER_DEX_SHARED_GET_META_FILE}")

  settings_get_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${SETTINGS_GET_META_FILE}")

  settings_patch_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${SETTINGS_PATCH_META_FILE}")

  admin_bonus_puzzle_post_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${ADMIN_BONUS_PUZZLE_POST_META_FILE}")

  cognito_metrics_lambda_changed=$(node -e '
const fs = require("fs");
const changed = new Set(fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/).filter(Boolean));
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const normalize = (p) => p.replace(/\\\\/g, "/").replace(/^\.\//, "");
for (const inputPath of Object.keys(meta.inputs || {})) {
  if (changed.has(normalize(inputPath))) {
    process.stdout.write("true");
    process.exit(0);
  }
}
process.stdout.write("false");
' "${CHANGED_FILES_LIST_FILE}" "${COGNITO_METRICS_META_FILE}")
fi

if changed_in_paths '^terraform/daily-puzzle-stack.yaml$'; then
  daily_stack_changed=true
fi

if changed_in_paths '^terraform/puzzle-statistics-stack.yaml$'; then
  stats_stack_changed=true
fi

if changed_in_paths '^terraform/cloudformation.yaml$'; then
  website_stack_changed=true
fi

if changed_in_paths '^terraform/user-dex-api-stack.yaml$'; then
  user_dex_stack_changed=true
fi

if changed_in_paths '^terraform/cognito-metrics-stack.yaml$'; then
  cognito_metrics_stack_changed=true
fi

if [ -z "${GITHUB_OUTPUT:-}" ]; then
  echo "GITHUB_OUTPUT is required" >&2
  exit 1
fi

echo "data_changed=${data_changed}" >> "${GITHUB_OUTPUT}"
echo "site_changed=${site_changed}" >> "${GITHUB_OUTPUT}"
echo "images_changed=${images_changed}" >> "${GITHUB_OUTPUT}"
echo "daily_lambda_changed=${daily_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "stats_lambda_changed=${stats_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "daily_stack_changed=${daily_stack_changed}" >> "${GITHUB_OUTPUT}"
echo "stats_stack_changed=${stats_stack_changed}" >> "${GITHUB_OUTPUT}"
echo "website_stack_changed=${website_stack_changed}" >> "${GITHUB_OUTPUT}"
echo "user_dex_get_lambda_changed=${user_dex_get_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "user_dex_patch_lambda_changed=${user_dex_patch_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "user_dex_shared_get_lambda_changed=${user_dex_shared_get_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "settings_get_lambda_changed=${settings_get_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "settings_patch_lambda_changed=${settings_patch_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "admin_bonus_puzzle_post_lambda_changed=${admin_bonus_puzzle_post_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "cognito_metrics_lambda_changed=${cognito_metrics_lambda_changed}" >> "${GITHUB_OUTPUT}"
echo "user_dex_stack_changed=${user_dex_stack_changed}" >> "${GITHUB_OUTPUT}"
echo "cognito_metrics_stack_changed=${cognito_metrics_stack_changed}" >> "${GITHUB_OUTPUT}"
echo "pokedoku_details_changed=${pokedoku_details_changed}" >> "${GITHUB_OUTPUT}"
