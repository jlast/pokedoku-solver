#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${CLOUDFORMATION_STACK_NAME:-pokedoku-helper}-user-dex-api"
AWS_REGION="${AWS_REGION:-us-east-1}"
TABLE_NAME="UserDexProfiles"
FULL_API_DOMAIN="${API_SUBDOMAIN}.${DOMAIN_NAME}"

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

for required_var in \
  S3_BUCKET_NAME \
  CLOUDFORMATION_STACK_NAME \
  DOMAIN_NAME \
  API_SUBDOMAIN \
  HOSTED_ZONE_ID \
  API_CERTIFICATE_ARN \
  ALLOWED_ORIGIN \
  COGNITO_REGION \
  COGNITO_USER_POOL_ID \
  COGNITO_CLIENT_ID \
  USER_DEX_GET_LAMBDA_CHANGED \
  USER_DEX_PATCH_LAMBDA_CHANGED
do
  require_var "${required_var}"
done

echo "Running preflight checks for user dex API stack"

STACK_EXISTS=true
if ! aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1; then
  STACK_EXISTS=false
fi

CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn "${API_CERTIFICATE_ARN}" \
  --region "${AWS_REGION}" \
  --query 'Certificate.Status' \
  --output text)

if [ "${CERT_STATUS}" != "ISSUED" ]; then
  echo "Certificate is not ready. Expected ISSUED, got: ${CERT_STATUS}" >&2
  exit 1
fi

CERT_DOMAINS=$(aws acm describe-certificate \
  --certificate-arn "${API_CERTIFICATE_ARN}" \
  --region "${AWS_REGION}" \
  --query "[Certificate.DomainName, Certificate.SubjectAlternativeNames[]]" \
  --output text)

if [[ " ${CERT_DOMAINS} " != *" ${FULL_API_DOMAIN} "* ]]; then
  echo "Certificate ${API_CERTIFICATE_ARN} does not include ${FULL_API_DOMAIN}" >&2
  exit 1
fi

ZONE_NAME=$(aws route53 get-hosted-zone \
  --id "${HOSTED_ZONE_ID}" \
  --query 'HostedZone.Name' \
  --output text)
echo "Resolved hosted zone: ${ZONE_NAME}"

aws cognito-idp describe-user-pool \
  --user-pool-id "${COGNITO_USER_POOL_ID}" \
  --region "${COGNITO_REGION}" \
  >/dev/null

aws cognito-idp describe-user-pool-client \
  --user-pool-id "${COGNITO_USER_POOL_ID}" \
  --client-id "${COGNITO_CLIENT_ID}" \
  --region "${COGNITO_REGION}" \
  >/dev/null

aws s3api head-bucket --bucket "${S3_BUCKET_NAME}" >/dev/null

if [ "${STACK_EXISTS}" = "false" ]; then
  if aws dynamodb describe-table --table-name "${TABLE_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
    echo "DynamoDB table ${TABLE_NAME} already exists but stack ${STACK_NAME} does not. Either import existing resources or remove table before first deploy." >&2
    exit 1
  fi

  if aws apigatewayv2 get-domain-name --domain-name "${FULL_API_DOMAIN}" --region "${AWS_REGION}" >/dev/null 2>&1; then
    echo "API Gateway custom domain ${FULL_API_DOMAIN} already exists but stack ${STACK_NAME} does not. Remove or import it before first deploy." >&2
    exit 1
  fi
fi

if [ "${USER_DEX_GET_LAMBDA_CHANGED}" = "true" ]; then
  CURRENT_USER_DEX_GET_KEY="${USER_DEX_GET_LAMBDA_KEY}"
  require_var USER_DEX_GET_LAMBDA_KEY
  aws s3api head-object --bucket "${S3_BUCKET_NAME}" --key "${CURRENT_USER_DEX_GET_KEY}" >/dev/null
else
  CURRENT_USER_DEX_GET_KEY=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Parameters[?ParameterKey=='UserDexGetCodeS3Key'].ParameterValue" --output text)
fi

if [ "${USER_DEX_PATCH_LAMBDA_CHANGED}" = "true" ]; then
  CURRENT_USER_DEX_PATCH_KEY="${USER_DEX_PATCH_LAMBDA_KEY}"
  require_var USER_DEX_PATCH_LAMBDA_KEY
  aws s3api head-object --bucket "${S3_BUCKET_NAME}" --key "${CURRENT_USER_DEX_PATCH_KEY}" >/dev/null
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
