#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-daily-puzzle"

if [ "${DAILY_LAMBDA_CHANGED}" = "true" ]; then
  DAILY_LAMBDA_KEY="${LAMBDA_KEY}"
else
  DAILY_LAMBDA_KEY=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Parameters[?ParameterKey=='DailyPuzzleFetcherCodeS3Key'].ParameterValue" --output text)
fi

PARAM_OVERRIDES="TargetBucketName=${S3_BUCKET_NAME} DailyPuzzleFetcherCodeS3Bucket=${S3_BUCKET_NAME} DailyPuzzleFetcherCodeS3Key=${DAILY_LAMBDA_KEY}"
if [ -n "${DAILY_PUZZLE_ALERT_EMAIL:-}" ]; then
  PARAM_OVERRIDES="${PARAM_OVERRIDES} DailyPuzzleAlertEmail=${DAILY_PUZZLE_ALERT_EMAIL}"
fi

echo "Deploying daily puzzle stack ${STACK_NAME} for commit ${GITHUB_SHA}"
aws cloudformation deploy \
  --template-file terraform/daily-puzzle-stack.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ${PARAM_OVERRIDES}
