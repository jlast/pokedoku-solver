#!/usr/bin/env bash
set -euo pipefail

if [ -z "${STACK_NAME:-}" ] || [ -z "${OUTPUT_KEY:-}" ]; then
  echo "STACK_NAME and OUTPUT_KEY are required" >&2
  exit 1
fi

FUNCTION_VALUE=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='${OUTPUT_KEY}'].OutputValue" --output text)

if [ -z "${FUNCTION_VALUE}" ] || [ "${FUNCTION_VALUE}" = "None" ]; then
  echo "${OUTPUT_KEY} output not found on ${STACK_NAME}"
  exit 1
fi

RESPONSE_FILE=$(mktemp)
aws lambda invoke \
  --function-name "${FUNCTION_VALUE}" \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  --cli-read-timeout 360 \
  "${RESPONSE_FILE}"

echo "Lambda response payload:"
cat "${RESPONSE_FILE}"

if jq -e '.FunctionError' "${RESPONSE_FILE}" > /dev/null; then
  echo "Lambda invocation failed"
  rm -f "${RESPONSE_FILE}"
  exit 1
fi

rm -f "${RESPONSE_FILE}"
