#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}"

stack_exists() {
  aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1
}

current_parameter() {
  local key="$1"
  aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Parameters[?ParameterKey=='${key}'].ParameterValue" \
    --output text
}

if stack_exists; then
  CURRENT_DOMAIN_NAME=$(current_parameter DomainName)
  CURRENT_DAILY_CODE_BUCKET=$(current_parameter DailyPuzzleFetcherCodeS3Bucket)
  CURRENT_DAILY_CODE_KEY=$(current_parameter DailyPuzzleFetcherCodeS3Key)
  CURRENT_STATS_FUNCTION_ARN=$(current_parameter PuzzleStatisticsFunctionArn)
else
  echo "Website stack ${STACK_NAME} does not exist; automatic creation is not supported by this deploy script." >&2
  exit 1
fi

DEPLOY_DOMAIN_NAME="${DOMAIN_NAME:-${CURRENT_DOMAIN_NAME}}"
PARAM_OVERRIDES="DomainName=${DEPLOY_DOMAIN_NAME} DailyPuzzleFetcherCodeS3Bucket=${CURRENT_DAILY_CODE_BUCKET} DailyPuzzleFetcherCodeS3Key=${CURRENT_DAILY_CODE_KEY} PuzzleStatisticsFunctionArn=${CURRENT_STATS_FUNCTION_ARN}"

if [ -n "${DAILY_PUZZLE_ALERT_EMAIL:-}" ]; then
  PARAM_OVERRIDES="${PARAM_OVERRIDES} DailyPuzzleAlertEmail=${DAILY_PUZZLE_ALERT_EMAIL}"
fi

echo "Deploying website stack ${STACK_NAME} for commit ${GITHUB_SHA}"
aws cloudformation deploy \
  --template-file terraform/cloudformation.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ${PARAM_OVERRIDES}
