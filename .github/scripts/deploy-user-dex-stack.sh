#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-user-dex-api"

if [ "${USER_DEX_GET_LAMBDA_CHANGED}" = "true" ]; then
  CURRENT_USER_DEX_GET_KEY="${USER_DEX_GET_LAMBDA_KEY}"
else
  CURRENT_USER_DEX_GET_KEY=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Parameters[?ParameterKey=='UserDexGetCodeS3Key'].ParameterValue" --output text)
fi

if [ "${USER_DEX_PATCH_LAMBDA_CHANGED}" = "true" ]; then
  CURRENT_USER_DEX_PATCH_KEY="${USER_DEX_PATCH_LAMBDA_KEY}"
else
  CURRENT_USER_DEX_PATCH_KEY=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Parameters[?ParameterKey=='UserDexPatchCodeS3Key'].ParameterValue" --output text)
fi

echo "Deploying user dex API stack ${STACK_NAME} for commit ${GITHUB_SHA}"
aws cloudformation deploy \
  --template-file terraform/user-dex-api-stack.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    DomainName="${DOMAIN_NAME}" \
    ApiSubdomain="${API_SUBDOMAIN}" \
    HostedZoneId="${HOSTED_ZONE_ID}" \
    ApiCertificateArn="${API_CERTIFICATE_ARN}" \
    UserDexGetCodeS3Bucket="${S3_BUCKET_NAME}" \
    UserDexGetCodeS3Key="${CURRENT_USER_DEX_GET_KEY}" \
    UserDexPatchCodeS3Bucket="${S3_BUCKET_NAME}" \
    UserDexPatchCodeS3Key="${CURRENT_USER_DEX_PATCH_KEY}" \
    AllowedOrigin="${ALLOWED_ORIGIN}" \
    CognitoRegion="${COGNITO_REGION}" \
    CognitoUserPoolId="${COGNITO_USER_POOL_ID}" \
    CognitoClientId="${COGNITO_CLIENT_ID}"
