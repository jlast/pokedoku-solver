#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-puzzle-statistics"
FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='PuzzleStatisticsFunctionArn'].OutputValue" --output text)

CONFIG=$(aws s3api get-bucket-notification-configuration --bucket "${S3_BUCKET_NAME}" --output json)

echo "=== Verification Report ==="
echo "Expected Lambda ARN: ${FUNCTION_ARN}"
echo ""
echo "Current S3 Lambda configs:"
echo "${CONFIG}" | jq '.LambdaFunctionConfigurations // []'
echo ""

CONFIG_EXISTS=$(echo "${CONFIG}" | jq '
  (.LambdaFunctionConfigurations // [])
  | any(.Id == "PuzzleStatisticsOnPuzzleUpload")
')

if [ "${CONFIG_EXISTS}" = "true" ]; then
  echo "S3 notification configuration found"
  exit 0
fi

echo "S3 notification configuration not found"
exit 1
