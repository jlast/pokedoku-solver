import { getPrestigeUiTone } from "../../lib/prestigeUi";
import { PokeballIcon } from "../shared/PokeballIcon";

interface PrestigeLevelSummary {
  tone: string;
  label: string;
  oddsLabel: string;
  chance: number;
}

function formatPrestigeBonus(chance: number): string {
  const baseChance = 0.01;
  const bonusPercent = ((chance - baseChance) / baseChance) * 100;

  if (Math.abs(bonusPercent) < 0.05) {
    return "+0%";
  }

  return `${bonusPercent > 0 ? "+" : ""}${Number(bonusPercent.toFixed(1)).toString()}%`;
}

function getPrestigeChanceLabel(chance: number): string | null {
  if (Math.abs(chance - 0.01) < 0.00001) {
    return null;
  }

  return `Shiny bonus: ${formatPrestigeBonus(chance)}`;
}

interface PrestigeProgressCardsProps {
  prestigeLevel: PrestigeLevelSummary;
  nextPrestigeLevel?: PrestigeLevelSummary | null;
  caughtCount: number;
  totalCount: number;
  shinyCount?: number;
  completionRate: number;
  motivatingStat?: string;
  progressValue?: number;
  isLoading?: boolean;
  viewOnlyNote?: string;
  stacked?: boolean;
  mergedStacked?: boolean;
}

export function PrestigeProgressCards({
  prestigeLevel,
  nextPrestigeLevel = null,
  caughtCount,
  totalCount,
  completionRate,
  motivatingStat,
  progressValue,
  isLoading = false,
  viewOnlyNote,
  stacked = false,
  mergedStacked = false,
}: PrestigeProgressCardsProps) {
  const prestigeUiTone = getPrestigeUiTone(prestigeLevel.tone);
  const nextPrestigeUiTone = nextPrestigeLevel ? getPrestigeUiTone(nextPrestigeLevel.tone) : null;
  const normalizedProgressValue = progressValue ?? caughtCount;
  const currentPrestigeChanceLabel = getPrestigeChanceLabel(prestigeLevel.chance);
  const nextPrestigeChanceLabel = nextPrestigeLevel ? getPrestigeChanceLabel(nextPrestigeLevel.chance) : null;

  if (stacked && mergedStacked) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className={`flex flex-1 items-start gap-3 rounded-xl border p-4 ${prestigeUiTone.bannerBg} ${prestigeUiTone.bannerBorder}`}>
          <PokeballIcon tone={prestigeLevel.tone} className="h-6 w-6 shrink-0" />
          <div className="min-w-0">
            <p className={`m-0 text-[11px] font-semibold uppercase tracking-wide ${prestigeUiTone.bannerLabelText}`}>Current Prestige</p>
            <p className={`m-0 text-base font-bold ${prestigeUiTone.bannerTitleText}`}>{prestigeLevel.label}</p>
            {currentPrestigeChanceLabel ? <p className={`m-0 text-xs font-medium ${prestigeUiTone.bannerOddsText}`}>{currentPrestigeChanceLabel}</p> : null}
            {viewOnlyNote ? <p className="mb-0 mt-2 text-xs font-semibold text-amber-700">{viewOnlyNote}</p> : null}
          </div>
        </div>

        <div className={`flex flex-1 flex-col rounded-xl border p-4 ${prestigeUiTone.completionBg} ${prestigeUiTone.completionBorder}`}>
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
                   {motivatingStat ? <p className={`m-0 mt-2 text-sm font-medium ${prestigeUiTone.completionPercentText}`}>{motivatingStat}</p> : null}
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
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${stacked ? "grid-cols-1" : nextPrestigeLevel ? "md:grid-cols-4" : "md:grid-cols-4"}`}>
      <div className={`rounded-xl border p-4 ${stacked ? "" : nextPrestigeLevel ? "md:col-span-2" : "md:col-span-3"} ${prestigeUiTone.completionBg} ${prestigeUiTone.completionBorder}`}>
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
                {motivatingStat ? <p className={`m-0 mt-2 text-sm font-medium ${prestigeUiTone.completionPercentText}`}>{motivatingStat}</p> : null}
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
          {currentPrestigeChanceLabel ? <p className={`m-0 text-xs font-medium ${prestigeUiTone.bannerOddsText}`}>{currentPrestigeChanceLabel}</p> : null}
          {viewOnlyNote ? <p className="mb-0 mt-2 text-xs font-semibold text-amber-700">{viewOnlyNote}</p> : null}
        </div>
      </div>

      {nextPrestigeLevel && nextPrestigeUiTone ? (
        <div className={`relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 ${stacked ? "" : "md:col-span-1"} ${nextPrestigeUiTone.bannerBg} ${nextPrestigeUiTone.bannerBorder}`}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-0 w-56 bg-gradient-to-l from-white/70 via-white/28 to-transparent [html[data-theme='dark']_&]:from-white/12 [html[data-theme='dark']_&]:via-white/5"
          />
          <div className="relative z-10 flex items-center gap-3">
            <PokeballIcon tone={nextPrestigeLevel.tone} className="h-6 w-6" />
            <div>
              <p className={`m-0 text-[11px] font-semibold uppercase tracking-wide ${nextPrestigeUiTone.bannerLabelText}`}>Next Prestige</p>
              <p className={`m-0 text-base font-bold ${nextPrestigeUiTone.bannerTitleText}`}>{nextPrestigeLevel.label}</p>
              {nextPrestigeChanceLabel ? <p className={`m-0 text-xs font-medium ${nextPrestigeUiTone.bannerOddsText}`}>{nextPrestigeChanceLabel}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
