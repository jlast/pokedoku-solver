import { trackEvent } from '../../../../lib/browser/analytics';
import { ActionLink } from './shared/ActionLink';

interface PokedexPromoCardProps {
  trackingFrom: string;
}

export function PokedexPromoCard({ trackingFrom }: PokedexPromoCardProps) {
  return (
    <section className="mb-3 w-full max-w-[700px] rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-200 bg-rose-50 shadow-sm [html[data-theme='dark']_&]:border-rose-900/60 [html[data-theme='dark']_&]:bg-rose-950/30">
              <img
                src={`${import.meta.env.BASE_URL}images/content/trainer.png`}
                alt=""
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-semibold text-[var(--text-h)]">Complete your Pokedex faster</p>
              <p className="m-0 mt-1 text-sm leading-5 text-[var(--text)]">
                Hide Pokemon you already own and focus on answers that help complete your collection.
                <span className="hidden md:inline"> Save today&apos;s picks and track your progress across future puzzles.</span>
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5 text-xs text-[var(--text)]">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400">✓</span>
                  <span>Hide owned Pokemon</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400">✓</span>
                  <span>Highlight missing entries</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400">✓</span>
                  <span>Save progress across puzzles</span>
                </div>
              </div>
              <div className="mt-3 md:hidden">
                <ActionLink
                  href={`${import.meta.env.BASE_URL}login/`}
                  variant="secondary"
                  className="border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500 [html[data-theme='dark']_&]:border-rose-500 [html[data-theme='dark']_&]:bg-rose-500 [html[data-theme='dark']_&]:text-white [html[data-theme='dark']_&]:hover:border-rose-400 [html[data-theme='dark']_&]:hover:bg-rose-400"
                  onClick={() => trackEvent('click_navigate', { url: 'login/', from: trackingFrom })}
                >
                  Connect My Pokedex
                </ActionLink>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-start md:flex md:self-center md:items-end">
          <ActionLink
            href={`${import.meta.env.BASE_URL}login/`}
            variant="secondary"
            className="border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500 [html[data-theme='dark']_&]:border-rose-500 [html[data-theme='dark']_&]:bg-rose-500 [html[data-theme='dark']_&]:text-white [html[data-theme='dark']_&]:hover:border-rose-400 [html[data-theme='dark']_&]:hover:bg-rose-400"
            onClick={() => trackEvent('click_navigate', { url: 'login/', from: trackingFrom })}
          >
            Connect My Pokedex
          </ActionLink>
        </div>
      </div>
    </section>
  );
}
