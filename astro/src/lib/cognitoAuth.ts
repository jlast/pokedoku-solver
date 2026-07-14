const TOKEN_KEY = "cognito_id_token";
const ACCESS_TOKEN_KEY = "cognito_access_token";
const REFRESH_TOKEN_KEY = "cognito_refresh_token";
const EXPIRES_AT_KEY = "cognito_token_expires_at";
const LAST_REFRESH_AT_KEY = "cognito_last_refresh_at";
const STATE_KEY = "cognito_oauth_state";
const PKCE_VERIFIER_KEY = "cognito_pkce_verifier";

type ProviderName = "Google";
const REFRESH_BUFFER_MS = 60 * 1000;
const PROACTIVE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
let refreshInFlight: Promise<string | null> | null = null;

type TokenEndpointError = {
  error?: string;
};

function getRequiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env var`);
  }
  return value;
}

function getDomainUrl(): string {
  return `https://${getRequiredEnv("PUBLIC_COGNITO_DOMAIN")}`;
}

function randomState(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function randomVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(value));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

type SessionTokenPayload = {
  email?: string;
  name?: string;
  picture?: string;
  avatar_url?: string;
  preferred_username?: string;
  username?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
  "cognito:groups"?: unknown;
  "custom:isAdmin"?: unknown;
  isAdmin?: unknown;
  [key: string]: unknown;
};

const UNKNOWN_TRAINER_LABEL = "Unnamed trainer";

function getBestSessionLabel(_payload: SessionTokenPayload): string {
  return UNKNOWN_TRAINER_LABEL;
}

function getFallbackInitial(_payload: SessionTokenPayload): string {
  return "U";
}

function getBestSessionImageUrl(payload: SessionTokenPayload): string | null {
  const candidates = [
    payload.picture,
    payload.avatar_url,
    typeof payload["custom:picture"] === "string" ? payload["custom:picture"] : null,
    typeof payload["profile_image_url"] === "string" ? payload["profile_image_url"] : null,
  ];

  const firstValid = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  return firstValid ?? null;
}

function hasAdminGroup(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(
    (entry) => typeof entry === "string" && entry.trim().toLowerCase() === "admin",
  );
}

function isTruthyAdminClaim(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

function getIsAdmin(payload: SessionTokenPayload): boolean {
  return hasAdminGroup(payload["cognito:groups"])
    || isTruthyAdminClaim(payload["custom:isAdmin"])
    || isTruthyAdminClaim(payload.isAdmin);
}

export async function buildLoginUrl(provider: ProviderName): Promise<string> {
  const state = randomState();
  const verifier = randomVerifier();
  const challenge = toBase64Url(new Uint8Array(await sha256(verifier)));

  localStorage.setItem(STATE_KEY, state);
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: getRequiredEnv("PUBLIC_COGNITO_CLIENT_ID"),
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: getRequiredEnv("PUBLIC_COGNITO_REDIRECT_SIGN_IN"),
    identity_provider: provider,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  return `${getDomainUrl()}/oauth2/authorize?${params.toString()}`;
}

export function buildLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: getRequiredEnv("PUBLIC_COGNITO_CLIENT_ID"),
    logout_uri: getRequiredEnv("PUBLIC_COGNITO_REDIRECT_SIGN_OUT"),
  });

  return `${getDomainUrl()}/logout?${params.toString()}`;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(LAST_REFRESH_AT_KEY);
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
}

function persistSessionTokens(tokens: {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn: number;
}): void {
  localStorage.setItem(TOKEN_KEY, tokens.idToken);
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + tokens.expiresIn * 1000));
  localStorage.setItem(LAST_REFRESH_AT_KEY, String(Date.now()));
}

function isTokenFresh(expiresAt: number, bufferMs = 0): boolean {
  return Number.isFinite(expiresAt) && Date.now() + bufferMs < expiresAt;
}

function shouldRefreshSessionProactively(): boolean {
  const lastRefreshAt = Number(localStorage.getItem(LAST_REFRESH_AT_KEY) || "0");
  return !Number.isFinite(lastRefreshAt)
    || Date.now() - lastRefreshAt >= PROACTIVE_REFRESH_INTERVAL_MS;
}

function isInvalidRefreshTokenError(error: string | undefined): boolean {
  return error === "invalid_grant" || error === "invalid_request" || error === "unauthorized_client";
}

async function readTokenEndpointError(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return undefined;
  }

  try {
    const data = (await response.json()) as TokenEndpointError;
    return typeof data.error === "string" ? data.error : undefined;
  } catch {
    return undefined;
  }
}

function finishLoginFromHash(hash: string): boolean {
  const hashParams = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(hashParams);
  const idToken = params.get("id_token");
  const expiresIn = Number(params.get("expires_in") || "0");
  const state = params.get("state");
  const expectedState = localStorage.getItem(STATE_KEY);

  if (!idToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return false;
  }

  if (!state || !expectedState || state !== expectedState) {
    return false;
  }

  localStorage.removeItem(STATE_KEY);
  localStorage.setItem(TOKEN_KEY, idToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
  return true;
}

async function finishLoginFromCode(code: string, state: string): Promise<boolean> {
  const expectedState = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);

  if (!state || !expectedState || state !== expectedState || !verifier) {
    return false;
  }

  const tokenUrl = `${getDomainUrl()}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getRequiredEnv("PUBLIC_COGNITO_CLIENT_ID"),
    code,
    code_verifier: verifier,
    redirect_uri: getRequiredEnv("PUBLIC_COGNITO_REDIRECT_SIGN_IN"),
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  const idToken = data.id_token;
  const expiresIn = Number(data.expires_in || 0);

  if (!idToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return false;
  }

  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  persistSessionTokens({
    idToken,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn,
  });
  return true;
}

async function refreshSessionToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const idToken = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || "0");

  if (!refreshToken) {
    if (idToken && isTokenFresh(expiresAt)) {
      return idToken;
    }
    return null;
  }

  const tokenUrl = `${getDomainUrl()}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getRequiredEnv("PUBLIC_COGNITO_CLIENT_ID"),
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const error = await readTokenEndpointError(response);
      if (isInvalidRefreshTokenError(error)) {
        clearSession();
        return null;
      }

      if (idToken && isTokenFresh(expiresAt)) {
        return idToken;
      }
      return null;
    }

    const data = (await response.json()) as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const idToken = data.id_token;
    const expiresIn = Number(data.expires_in || 0);

    if (!idToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      if (localStorage.getItem(TOKEN_KEY) && isTokenFresh(expiresAt)) {
        return localStorage.getItem(TOKEN_KEY);
      }
      return null;
    }

    persistSessionTokens({
      idToken,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn,
    });
    return idToken;
  } catch {
    if (idToken && isTokenFresh(expiresAt)) {
      return idToken;
    }
    return null;
  }
}

async function refreshSessionTokenSingleFlight(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSessionToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function finishLoginFromCallback(url: URL): Promise<boolean> {
  const hashOk = finishLoginFromHash(url.hash);
  if (hashOk) {
    return true;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";

  if (!code) {
    return false;
  }

  return finishLoginFromCode(code, state);
}

export function getSessionIdToken(): string | null {
  const idToken = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || "0");
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!idToken) {
    return null;
  }

  if (!isTokenFresh(expiresAt) && !refreshToken) {
    return null;
  }

  return idToken;
}

export async function getValidSessionIdToken(): Promise<string | null> {
  const idToken = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || "0");
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (
    idToken
    && isTokenFresh(expiresAt, REFRESH_BUFFER_MS)
    && (!refreshToken || !shouldRefreshSessionProactively())
  ) {
    return idToken;
  }

  return refreshSessionTokenSingleFlight();
}

export async function refreshSessionIfNeeded(): Promise<boolean> {
  const token = await getValidSessionIdToken();
  return Boolean(token);
}

export function getSessionUserLabel(): string | null {
  const token = getSessionIdToken();
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return UNKNOWN_TRAINER_LABEL;
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as SessionTokenPayload;
    return getBestSessionLabel(payload);
  } catch {
    return UNKNOWN_TRAINER_LABEL;
  }
}

export function getSessionUserId(): string | null {
  const token = getSessionIdToken();
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as SessionTokenPayload;
    const sub = payload.sub?.trim();
    return sub ? sub : null;
  } catch {
    return null;
  }
}

export interface SessionUserProfile {
  label: string;
  imageUrl: string | null;
  fallbackInitial: string;
  isAdmin: boolean;
}

export function getSessionUserProfile(): SessionUserProfile | null {
  const token = getSessionIdToken();
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return { label: UNKNOWN_TRAINER_LABEL, imageUrl: null, fallbackInitial: "U", isAdmin: false };
    }

    const payload = JSON.parse(decodeBase64Url(payloadPart)) as SessionTokenPayload;

      return {
        label: getBestSessionLabel(payload),
        imageUrl: getBestSessionImageUrl(payload),
        fallbackInitial: getFallbackInitial(payload),
        isAdmin: getIsAdmin(payload),
      };
  } catch {
    return { label: UNKNOWN_TRAINER_LABEL, imageUrl: null, fallbackInitial: "U", isAdmin: false };
  }
}
