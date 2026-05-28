#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${WEBSITE_STACK_NAME:-${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}}"

stack_exists() {
  aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1
}

resolve_stack_from_resource() {
  local physical_resource_id="$1"
  aws cloudformation describe-stack-resources \
    --physical-resource-id "${physical_resource_id}" \
    --query 'StackResources[0].StackName' \
    --output text 2>/dev/null || true
}

resolve_stack_name() {
  if stack_exists; then
    return 0
  fi

  if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
    local discovered_stack_name
    discovered_stack_name=$(resolve_stack_from_resource "${CLOUDFRONT_DISTRIBUTION_ID}")
    if [ -n "${discovered_stack_name}" ] && [ "${discovered_stack_name}" != "None" ]; then
      STACK_NAME="${discovered_stack_name}"
      return 0
    fi
  fi

  if [ -n "${S3_BUCKET_NAME:-}" ]; then
    local discovered_stack_name
    discovered_stack_name=$(resolve_stack_from_resource "${S3_BUCKET_NAME}")
    if [ -n "${discovered_stack_name}" ] && [ "${discovered_stack_name}" != "None" ]; then
      STACK_NAME="${discovered_stack_name}"
      return 0
    fi
  fi

  return 1
}

current_parameter() {
  local key="$1"
  aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Parameters[?ParameterKey=='${key}'].ParameterValue" \
    --output text
}

if resolve_stack_name; then
  CURRENT_DOMAIN_NAME=$(current_parameter DomainName)
  CURRENT_DAILY_CODE_BUCKET=$(current_parameter DailyPuzzleFetcherCodeS3Bucket)
  CURRENT_DAILY_CODE_KEY=$(current_parameter DailyPuzzleFetcherCodeS3Key)
  CURRENT_STATS_FUNCTION_ARN=$(current_parameter PuzzleStatisticsFunctionArn)
else
  echo "Website stack ${STACK_NAME} could not be resolved from stack name, CloudFront distribution, or S3 bucket; automatic creation is not supported by this deploy script." >&2
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
