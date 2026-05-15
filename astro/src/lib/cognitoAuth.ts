const TOKEN_KEY = "cognito_id_token";
const EXPIRES_AT_KEY = "cognito_token_expires_at";
const STATE_KEY = "cognito_oauth_state";
const PKCE_VERIFIER_KEY = "cognito_pkce_verifier";

type ProviderName = "Google";

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
  return atob(normalized);
}

export async function buildLoginUrl(provider: ProviderName): Promise<string> {
  const state = randomState();
  const verifier = randomVerifier();
  const challenge = toBase64Url(new Uint8Array(await sha256(verifier)));

  localStorage.setItem(STATE_KEY, state);
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  console.log("PKCE verifier:", verifier);

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
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
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

  const data = (await response.json()) as { id_token?: string; expires_in?: number };
  const idToken = data.id_token;
  const expiresIn = Number(data.expires_in || 0);

  if (!idToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return false;
  }

  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  localStorage.setItem(TOKEN_KEY, idToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
  return true;
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

  if (!idToken || !Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    clearSession();
    return null;
  }

  return idToken;
}

export function getSessionUserLabel(): string | null {
  const token = getSessionIdToken();
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return "Signed in";
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as {
      email?: string;
      name?: string;
    };
    return payload.name || payload.email || "Signed in";
  } catch {
    return "Signed in";
  }
}
