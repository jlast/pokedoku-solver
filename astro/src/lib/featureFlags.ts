function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value.toLowerCase() === "true";
}

const AUTH_OVERRIDE_KEY = "auth_feature_override";

export function isAuthFeatureEnabled(search: string): boolean {
  const envEnabled = envFlag(import.meta.env.PUBLIC_ENABLE_AUTH, false);
  const allowQueryOverride = envFlag(import.meta.env.PUBLIC_ALLOW_AUTH_QUERY_OVERRIDE, true);

  if (!allowQueryOverride) {
    return envEnabled;
  }

  const params = new URLSearchParams(search);
  const queryValue = params.get("auth");

  if (queryValue === "1") {
    sessionStorage.setItem(AUTH_OVERRIDE_KEY, "1");
    return true;
  }

  if (queryValue === "0") {
    sessionStorage.setItem(AUTH_OVERRIDE_KEY, "0");
    return false;
  }

  const storedOverride = sessionStorage.getItem(AUTH_OVERRIDE_KEY);
  if (storedOverride === "1") return true;
  if (storedOverride === "0") return false;

  return envEnabled;
}
