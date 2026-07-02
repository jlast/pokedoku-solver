import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, getSessionUserProfile, getValidSessionIdToken } from "./cognitoAuth";

const TOKEN_KEY = "cognito_id_token";
const REFRESH_TOKEN_KEY = "cognito_refresh_token";
const EXPIRES_AT_KEY = "cognito_token_expires_at";

function createLocalStorage() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  } satisfies Storage;
}

function createUnsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), "utf8")
      .toString("base64url");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

describe("cognitoAuth refresh handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    Object.assign(import.meta.env, {
      PUBLIC_COGNITO_DOMAIN: "auth.example.com",
      PUBLIC_COGNITO_CLIENT_ID: "client-id",
    });

    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorage(),
      configurable: true,
      writable: true,
    });

    clearSession();
  });

  it("keeps the current token when refresh fails before expiry", async () => {
    localStorage.setItem(TOKEN_KEY, "current-id-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + 30_000));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(getValidSessionIdToken()).resolves.toBe("current-id-token");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("current-id-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-token");
  });

  it("does not clear session on transient refresh response failures", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-id-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() - 5_000));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("temporary upstream issue", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    await expect(getValidSessionIdToken()).resolves.toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe("expired-id-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-token");
  });

  it("clears session when the refresh token is rejected", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-id-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() - 5_000));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(getValidSessionIdToken()).resolves.toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it("reads the admin flag from Cognito group claims", () => {
    localStorage.setItem(
      TOKEN_KEY,
      createUnsignedJwt({
        sub: "user-123",
        "cognito:groups": ["admin"],
      }),
    );
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + 60_000));

    expect(getSessionUserProfile()).toMatchObject({ isAdmin: true });
  });
});
