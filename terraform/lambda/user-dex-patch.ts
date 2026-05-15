import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';

const CORS_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://www.pokedoku-helper.com',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,PATCH,OPTIONS',
} as const;

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: true,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'user-dex-patch',
      method: event.requestContext.http.method,
      path: event.rawPath,
      message: 'empty lambda placeholder',
    }),
  };
}
