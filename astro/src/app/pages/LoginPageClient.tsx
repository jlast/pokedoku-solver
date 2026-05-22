import { trackEvent } from "../../../../lib/browser/analytics";
import { buildLoginUrl } from "../../lib/cognitoAuth";
import { isAuthFeatureEnabled } from "../../lib/featureFlags";
import { PokeballIcon } from "../components/shared/PokeballIcon";

type Provider = {
  id: "Google";
  enabled: boolean;
  label: string;
  description: string;
};

const PROVIDERS: Provider[] = [
  {
    id: "Google",
    enabled: true,
    label: "Continue with Google",
    description: "Secure sign-in with your Google account.",
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
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Your Personal Pokedoku Companion</h1>
        <p className="mb-0 mt-3 max-w-xl text-slate-600">Import your Pokedoku dex, track your progress, and discover smarter picks for every puzzle.</p>
        <p className="mb-0 mt-2 text-sm font-medium text-slate-700">Built for daily Pokedoku players.</p>
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
              className={`group flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                provider.enabled
                  ? "cursor-pointer border-slate-400 bg-white hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-50 hover:shadow-md"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
              }`}
              aria-label={provider.label}
            >
              <span>
                <span className="block text-base font-semibold text-slate-900">
                  {provider.id === "Google" ? (
                    <span className="inline-flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7A9.3 9.3 0 0 0 2.7 12 9.3 9.3 0 0 0 12 21.3c5.4 0 9-3.8 9-9 0-.6-.1-1.1-.2-1.6H12Z" />
                        <path fill="#34A853" d="M3.8 7.9 7 10.2C7.8 8 9.7 6.5 12 6.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 8.3 2.7 5.1 4.8 3.8 7.9Z" />
                        <path fill="#FBBC05" d="M12 21.3c2.5 0 4.7-.8 6.2-2.2l-2.9-2.3c-.8.6-1.9 1.1-3.3 1.1-3.9 0-5.3-2.6-5.5-3.9l-3.1 2.4C4.7 19.4 8.1 21.3 12 21.3Z" />
                        <path fill="#4285F4" d="M21 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.5-1.2 2.7-2.2 3.5l2.9 2.3c1.7-1.6 2.8-4 2.8-7.1Z" />
                      </svg>
                      {provider.label}
                    </span>
                  ) : (
                    provider.label
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-slate-600">{provider.description}</span>
                <span className="mt-1 block text-xs text-slate-500">We only use your account for authentication.</span>
              </span>
              <span
                className={`ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                  provider.enabled
                    ? "border-slate-300 bg-white text-slate-500 group-hover:border-slate-400 group-hover:text-slate-700"
                    : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="m13 7 6 5-6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
        <p className="mb-0 mt-4 text-center text-xs text-slate-400">More sign-in options coming soon.</p>

        <div className="mt-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-200" />
          <PokeballIcon tone="pokeball" className="h-5 w-5" />
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-5 grid items-center gap-4 md:grid-cols-5">
          <ul className="mb-0 space-y-3 text-lg text-slate-700 md:col-span-2 md:self-center">
            <li><span className="mr-2 font-semibold text-emerald-600">✓</span>Personalized picks for today&apos;s grid</li>
            <li><span className="mr-2 font-semibold text-emerald-600">✓</span>Discover missing categories</li>
            <li><span className="mr-2 font-semibold text-emerald-600">✓</span>Track your Pokédex progress</li>
          </ul>

          <div className="md:col-span-3">
            <img
              src={`${import.meta.env.BASE_URL}images/content/my_pokedex_preview.png`}
              alt="Preview of the My Pokedex page"
              className="block w-full rounded-xl"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
