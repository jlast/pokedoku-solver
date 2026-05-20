import { createHash } from 'node:crypto';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://www.pokedoku-helper.com')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0] ?? 'https://www.pokedoku-helper.com';

const REGION = process.env.COGNITO_REGION ?? '';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';
const TABLE_NAME = process.env.USER_DEX_TABLE_NAME ?? '';
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

const dynamo = new DynamoDBClient({});

type JwtPayload = {
  sub?: string;
  exp?: number;
  iss?: string;
  aud?: string;
  client_id?: string;
  token_use?: string;
};

type Jwk = {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
};

type JwksResponse = {
  keys: Jwk[];
};

const jwkCache = new Map<string, { byKid: Map<string, Jwk>; fetchedAt: number }>();

function log(level: 'info' | 'warn' | 'error', message: string, details: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, message, ...details }));
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64').toString('utf8');
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64');
}

function buildCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const responseOrigin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : DEFAULT_ORIGIN;
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': responseOrigin,
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,PATCH,OPTIONS',
    vary: 'Origin',
  };
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  requestOrigin: string | null
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: buildCorsHeaders(requestOrigin),
    body: JSON.stringify(body),
  };
}

function getRequestOrigin(event: APIGatewayProxyEventV2): string | null {
  const originHeader = event.headers?.origin ?? event.headers?.Origin;
  if (!originHeader) return null;
  return originHeader.trim();
}

async function getJwk(kid: string): Promise<Jwk | null> {
  const cacheKey = `${REGION}:${USER_POOL_ID}`;
  const current = jwkCache.get(cacheKey);
  const now = Date.now();
  if (current && now - current.fetchedAt < 15 * 60_000) {
    return current.byKid.get(kid) ?? null;
  }

  const url = `${ISSUER}/.well-known/jwks.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch JWKS: ${response.status}`);
  }

  const data = (await response.json()) as JwksResponse;
  const byKid = new Map<string, Jwk>();
  for (const key of data.keys ?? []) {
    if (key.kid) byKid.set(key.kid, key);
  }

  jwkCache.set(cacheKey, { byKid, fetchedAt: now });
  return byKid.get(kid) ?? null;
}

async function verifyJwt(token: string): Promise<{ ok: true; payload: JwtPayload } | { ok: false; reason: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed_token' };

  let header: { alg?: string; kid?: string };
  let payload: JwtPayload;
  try {
    header = JSON.parse(base64UrlDecode(parts[0])) as { alg?: string; kid?: string };
    payload = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  if (header.alg !== 'RS256' || !header.kid) return { ok: false, reason: 'invalid_header' };
  if (!payload.sub || !payload.exp || !payload.iss) return { ok: false, reason: 'invalid_claims' };
  if (payload.iss !== ISSUER) return { ok: false, reason: 'invalid_issuer' };
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, reason: 'token_expired' };

  const aud = payload.aud ?? payload.client_id;
  if (aud !== CLIENT_ID) return { ok: false, reason: 'invalid_audience' };

  let jwk: Jwk | null;
  try {
    jwk = await getJwk(header.kid);
  } catch {
    return { ok: false, reason: 'jwks_fetch_failed' };
  }
  if (!jwk) return { ok: false, reason: 'unknown_kid' };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );

  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
  const signature = base64UrlToBuffer(parts[2]);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signingInput);
  if (!valid) return { ok: false, reason: 'invalid_signature' };

  return { ok: true, payload };
}

export async function authenticate(event: APIGatewayProxyEventV2): Promise<{ userId: string } | APIGatewayProxyStructuredResultV2> {
  const requestOrigin = getRequestOrigin(event);

  if (!REGION || !USER_POOL_ID || !CLIENT_ID || !TABLE_NAME) {
    return jsonResponse(500, { error: 'Server auth configuration is incomplete.' }, requestOrigin);
  }

  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Missing bearer token.' }, requestOrigin);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const verification = await verifyJwt(token);
  if (!verification.ok) {
    log('warn', 'authentication_failed', {
      reason: verification.reason,
      requestId: event.requestContext.requestId,
    });
    return jsonResponse(401, { error: 'Invalid token.' }, requestOrigin);
  }

  return { userId: verification.payload.sub as string };
}

export async function readUserDex(userId: string): Promise<number[]> {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ userId }),
      ConsistentRead: true,
    })
  );

  if (!result.Item) return [];
  const item = unmarshall(result.Item) as { caughtPokemonKeyIds?: unknown };
  if (!Array.isArray(item.caughtPokemonKeyIds)) return [];

  return item.caughtPokemonKeyIds
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0)
    .sort((a, b) => a - b);
}

export async function writeUserDex(userId: string, caughtPokemonKeyIds: number[]): Promise<void> {
  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        userId,
        caughtPokemonKeyIds,
        updatedAt: new Date().toISOString(),
      }),
    })
  );
}

export function validateCaughtPokemonKeyIds(bodyText: string | undefined | null): number[] | null {
  if (!bodyText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = (parsed as { caughtPokemonKeyIds?: unknown }).caughtPokemonKeyIds;
  if (!Array.isArray(candidate)) return null;

  const normalized = candidate
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a - b);
  if (uniqueSorted.length > 5000) return null;
  return uniqueSorted;
}

export function requestMeta(event: APIGatewayProxyEventV2): Record<string, unknown> {
  return {
    requestId: event.requestContext.requestId,
    routeKey: event.requestContext.routeKey,
    method: event.requestContext.http.method,
    path: event.rawPath,
    sourceIp: event.requestContext.http.sourceIp,
  };
}

export function logInfo(message: string, details: Record<string, unknown>): void {
  log('info', message, details);
}

export function logError(message: string, details: Record<string, unknown>): void {
  log('error', message, details);
}

export function ok(event: APIGatewayProxyEventV2, body: Record<string, unknown>): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(200, body, getRequestOrigin(event));
}

export function badRequest(event: APIGatewayProxyEventV2, error: string): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(400, { error }, getRequestOrigin(event));
}

export function internalError(event: APIGatewayProxyEventV2): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(500, { error: 'Internal server error.' }, getRequestOrigin(event));
}

export function fingerprintUser(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 12);
}
