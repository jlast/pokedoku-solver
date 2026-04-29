#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-puzzle-statistics"

if [ "${STATS_LAMBDA_CHANGED}" = "true" ]; then
  CURRENT_STATS_LAMBDA_KEY="${STATS_LAMBDA_KEY}"
else
  CURRENT_STATS_LAMBDA_KEY=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Parameters[?ParameterKey=='PuzzleStatisticsCodeS3Key'].ParameterValue" --output text)
fi

echo "Deploying puzzle statistics stack ${STACK_NAME} for commit ${GITHUB_SHA}"
aws cloudformation deploy \
  --template-file terraform/puzzle-statistics-stack.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    TargetBucketName="${S3_BUCKET_NAME}" \
    PuzzleStatisticsCodeS3Bucket="${S3_BUCKET_NAME}" \
    PuzzleStatisticsCodeS3Key="${CURRENT_STATS_LAMBDA_KEY}" \
    PuzzleStatisticsOutputKey=data/runtime/puzzle-stats.json
