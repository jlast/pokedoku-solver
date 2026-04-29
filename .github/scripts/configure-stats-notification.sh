#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-puzzle-statistics"

FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='PuzzleStatisticsFunctionArn'].OutputValue" --output text)
if [ -z "${FUNCTION_ARN}" ] || [ "${FUNCTION_ARN}" = "None" ]; then
  echo "PuzzleStatisticsFunctionArn output not found on ${STACK_NAME}"
  exit 1
fi

echo "Target Lambda ARN: ${FUNCTION_ARN}"
echo "Checking Lambda permissions..."
aws lambda get-policy --function-name "${FUNCTION_ARN}" || echo "No policy attached yet"

CURRENT_CONFIG=$(aws s3api get-bucket-notification-configuration --bucket "${S3_BUCKET_NAME}" --output json 2>&1 || echo '{}')

UPDATED_CONFIG=$(jq -c --arg function_arn "${FUNCTION_ARN}" '
  .LambdaFunctionConfigurations = (
    ((.LambdaFunctionConfigurations // []) | map(select(.Id != "PuzzleStatisticsOnPuzzleUpload"))) +
    [{
      "Id": "PuzzleStatisticsOnPuzzleUpload",
      "LambdaFunctionArn": $function_arn,
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "data/runtime/puzzles/"},
            {"Name": "suffix", "Value": ".json"}
          ]
        }
      }
    }]
  )
' <<< "${CURRENT_CONFIG}")

REQUEST_FILE=$(mktemp)
jq -n --arg bucket "${S3_BUCKET_NAME}" --argjson config "${UPDATED_CONFIG}" '{Bucket: $bucket, NotificationConfiguration: $config}' > "${REQUEST_FILE}"

aws s3api put-bucket-notification-configuration --cli-input-json "file://${REQUEST_FILE}"

rm -f "${REQUEST_FILE}"
sleep 1
