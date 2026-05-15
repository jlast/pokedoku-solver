import { trackEvent } from "../../../../lib/browser/analytics";
import { buildLoginUrl } from "../../lib/cognitoAuth";
import { isAuthFeatureEnabled } from "../../lib/featureFlags";

type Provider = {
  id: "Google" | "Facebook" | "Apple";
  enabled: boolean;
  label: string;
  description: string;
};

const PROVIDERS: Provider[] = [
  {
    id: "Google",
    enabled: true,
    label: "Continue with Google",
    description: "Sign in with your Google account through Cognito.",
  },
  {
    id: "Facebook",
    enabled: false,
    label: "Continue with Facebook",
    description: "Coming soon. Add Facebook Login in Cognito to enable.",
  },
  {
    id: "Apple",
    enabled: false,
    label: "Continue with Apple",
    description: "Coming soon. Add Sign in with Apple in Cognito to enable.",
  },
];

export function LoginPageClient() {
  const authEnabled =
    typeof window !== "undefined" && isAuthFeatureEnabled(window.location.search);

  if (!authEnabled) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Sign in</h1>
          <p className="mt-3 mb-0 text-slate-600">Login is not enabled yet for this environment.</p>
        </section>
      </main>
    );
  }

  const startSignIn = async (provider: Extract<Provider, { enabled: true }>['id']) => {
    trackEvent("click_sign_in", { provider: provider.toLowerCase(), from: "login_page" });
    const loginUrl = await buildLoginUrl(provider);
    window.location.assign(loginUrl);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-10">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm md:p-8">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Sign in</h1>
        <p className="mt-3 mb-0 max-w-xl text-slate-600">Choose your auth provider. Google is live now, and more providers can be added later in Cognito.</p>

        <div className="mt-6 grid gap-4">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={!provider.enabled}
              onClick={() => {
                if (provider.enabled) {
                  void startSignIn(provider.id);
                }
              }}
              className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                provider.enabled
                  ? "cursor-pointer border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
              }`}
              aria-label={provider.label}
            >
              <span>
                <span className="block text-base font-semibold text-slate-900">{provider.label}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{provider.description}</span>
              </span>

              {!provider.enabled && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">Soon</span>
              )}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
