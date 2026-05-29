#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-cognito-metrics"

if [ "${COGNITO_METRICS_LAMBDA_CHANGED}" = "true" ]; then
  CURRENT_COGNITO_METRICS_KEY="${COGNITO_METRICS_LAMBDA_KEY}"
else
  CURRENT_COGNITO_METRICS_KEY=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Parameters[?ParameterKey=='CognitoMetricsCodeS3Key'].ParameterValue" --output text)
fi

echo "Deploying Cognito metrics stack ${STACK_NAME} for commit ${GITHUB_SHA}"
aws cloudformation deploy \
  --template-file terraform/cognito-metrics-stack.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    CognitoMetricsCodeS3Bucket="${S3_BUCKET_NAME}" \
    CognitoMetricsCodeS3Key="${CURRENT_COGNITO_METRICS_KEY}" \
    CognitoRegion="${COGNITO_REGION}" \
    CognitoUserPoolId="${PUBLIC_COGNITO_USER_POOL_ID}" \
    MetricNamespace="${COGNITO_METRICS_NAMESPACE}" \
    DashboardName="${COGNITO_METRICS_DASHBOARD_NAME}" \
    ScheduleExpression="${COGNITO_METRICS_SCHEDULE_EXPRESSION}"
