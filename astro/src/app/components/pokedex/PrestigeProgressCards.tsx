import { getPrestigeUiTone } from "../../lib/prestigeUi";
import { PokeballIcon } from "../shared/PokeballIcon";

interface PrestigeLevelSummary {
  tone: string;
  label: string;
  oddsLabel: string;
}

interface PrestigeProgressCardsProps {
  prestigeLevel: PrestigeLevelSummary;
  caughtCount: number;
  totalCount: number;
  shinyCount: number;
  completionRate: number;
  progressValue?: number;
  isLoading?: boolean;
  viewOnlyNote?: string;
  stacked?: boolean;
}

export function PrestigeProgressCards({
  prestigeLevel,
  caughtCount,
  totalCount,
  shinyCount,
  completionRate,
  progressValue,
  isLoading = false,
  viewOnlyNote,
  stacked = false,
}: PrestigeProgressCardsProps) {
  const prestigeUiTone = getPrestigeUiTone(prestigeLevel.tone);
  const normalizedProgressValue = progressValue ?? caughtCount;

  return (
    <div className={`grid gap-4 ${stacked ? "grid-cols-1" : "md:grid-cols-4"}`}>
      <div className={`rounded-xl border p-4 ${stacked ? "" : "md:col-span-3"} ${prestigeUiTone.completionBg} ${prestigeUiTone.completionBorder}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`m-0 text-sm ${prestigeUiTone.completionLabelText}`}>Completion</p>
            {isLoading ? (
              <>
                <span className="mt-1 block h-7 w-24 animate-pulse rounded bg-[var(--code-bg)]" aria-hidden="true" />
                <span className="mt-2 block h-3 w-16 animate-pulse rounded bg-[var(--code-bg)]" aria-hidden="true" />
              </>
            ) : (
              <>
                <p className={`m-0 text-2xl font-bold ${prestigeUiTone.completionValueText}`}>{caughtCount} / {totalCount}</p>
                <p className={`m-0 mt-1 text-xs font-semibold ${prestigeUiTone.completionValueText}`}>Shinies: {shinyCount}</p>
              </>
            )}
          </div>
          {isLoading ? (
            <span className="block h-5 w-10 animate-pulse rounded bg-[var(--code-bg)]" aria-hidden="true" />
          ) : (
            <p className={`m-0 text-sm font-semibold ${prestigeUiTone.completionPercentText}`}>{completionRate.toFixed(1)}%</p>
          )}
        </div>
        {isLoading ? (
          <span className="mt-3 block h-2 w-full animate-pulse rounded-full bg-[var(--code-bg)]" aria-hidden="true" />
        ) : (
          <progress className={`mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--bg)]/70 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${prestigeUiTone.progressValueClass}`} max={Math.max(totalCount, 1)} value={normalizedProgressValue} />
        )}
      </div>

      <div className={`flex items-center gap-3 rounded-xl border p-3 ${stacked ? "" : "md:col-span-1"} ${prestigeUiTone.bannerBg} ${prestigeUiTone.bannerBorder}`}>
        <PokeballIcon tone={prestigeLevel.tone} className="h-6 w-6" />
        <div>
          <p className={`m-0 text-[11px] font-semibold uppercase tracking-wide ${prestigeUiTone.bannerLabelText}`}>Current Prestige</p>
          <p className={`m-0 text-base font-bold ${prestigeUiTone.bannerTitleText}`}>{prestigeLevel.label}</p>
          <p className={`m-0 text-xs font-medium ${prestigeUiTone.bannerOddsText}`}>Shiny odds: {prestigeLevel.oddsLabel}</p>
          {viewOnlyNote ? <p className="mb-0 mt-2 text-xs font-semibold text-amber-700">{viewOnlyNote}</p> : null}
        </div>
      </div>
    </div>
  );
}
