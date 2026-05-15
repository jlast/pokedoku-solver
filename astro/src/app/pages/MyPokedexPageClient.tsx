import { getSessionUserProfile } from "../../lib/cognitoAuth";

export function MyPokedexPageClient() {
  const profile = typeof window === "undefined" ? null : getSessionUserProfile();
  const userLabel = profile?.label ?? null;

  if (!userLabel) {
    return (
      <main className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="m-0 text-2xl font-semibold text-slate-900">Sign in required</h2>
        <p className="mb-0 mt-3 text-slate-600">
          Please sign in to view your personal Pokedex progress.
        </p>
        <a
          href={`${import.meta.env.BASE_URL}login/`}
          className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-slate-900 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-slate-800"
        >
          Go to Login
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="m-0 text-sm text-slate-500">Signed in as</p>
        <div className="mt-2 flex items-center gap-3">
          {profile?.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt={`${userLabel} profile`}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {profile?.fallbackInitial ?? "U"}
            </span>
          )}
          <p className="mb-0 mt-0 text-lg font-semibold text-slate-900">{userLabel}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
        <h2 className="m-0 text-xl font-semibold text-slate-900">My Pokedex</h2>
        <p className="mb-0 mt-2 text-slate-600">
          Your personal dex tracking dashboard is ready for your next update. This page is now live and connected to your account session.
        </p>
      </section>
    </main>
  );
}
