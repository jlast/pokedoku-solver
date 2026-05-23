import { useEffect, useState } from "react";
import { finishLoginFromCallback } from "../../lib/cognitoAuth";
import { isAuthFeatureEnabled } from "../../lib/featureFlags";

export function AuthCallbackPage() {
  const [status, setStatus] = useState<"working" | "success" | "error">("working");

  useEffect(() => {
    const finish = async () => {
      if (!isAuthFeatureEnabled(window.location.search)) {
        setStatus("error");
        return;
      }

      const ok = await finishLoginFromCallback(new URL(window.location.href));
      setStatus(ok ? "success" : "error");

      const destination = `${import.meta.env.BASE_URL || "/"}user/`;
      window.setTimeout(() => {
        window.location.replace(destination);
      }, ok ? 250 : 1200);
    };

    void finish();
  }, []);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-4 text-center">
      {status === "working" && <p className="text-[var(--text)]">Completing sign in...</p>}
      {status === "success" && <p className="text-[var(--text)]">Signed in. Redirecting...</p>}
      {status === "error" && <p className="text-red-600">Sign in failed. Please try again.</p>}
    </main>
  );
}
