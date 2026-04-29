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

if changed_in_paths '^public/images/'; then
  images_changed=true
fi

if changed_in_paths '^public/data/' '^scripts/' '^lib/shared/' '^package.json$' '^package-lock.json$'; then
  data_changed=true
fi

if changed_in_paths '^astro/' '^astro/src/pages/category/' '^astro/src/pages/pokemon/' '^src/' '^lib/browser/' '^lib/shared/' '^public/' '^package.json$' '^package-lock.json$'; then
  site_changed=true
fi

if changed_in_paths '^terraform/lambda/daily-puzzle-fetcher.ts$' '^lib/puzzle-fetch-core.ts$' '^package.json$' '^package-lock.json$'; then
  daily_lambda_changed=true
fi

if changed_in_paths '^terraform/lambda/puzzle-statistics.ts$' '^lib/shared/' '^package.json$' '^package-lock.json$'; then
  stats_lambda_changed=true
fi

if changed_in_paths '^terraform/daily-puzzle-stack.yaml$'; then
  daily_stack_changed=true
fi

if changed_in_paths '^terraform/puzzle-statistics-stack.yaml$'; then
  stats_stack_changed=true
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
