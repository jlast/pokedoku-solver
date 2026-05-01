interface Props {
  dates: string[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function daysAgoFrom(value: string): number | null {
  const [year, month, day] = value.split("-").map(Number);
  const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const msInDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / msInDay));
}

export function HistoryTimelineCard({
  dates,
  title = "Historic appearances",
  subtitle = "Latest 5 appearances",
  emptyText = "No appearance history available.",
}: Props) {
  const timeline = dates.slice(0, 5).map((date) => ({
    date,
    label: formatDate(date),
    daysAgo: daysAgoFrom(date),
  }));

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="flex gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      </div>
      <div className="mb-3 flex text-xs text-slate-500">{subtitle}</div>
      {timeline.length > 0 ? (
        <ul className="relative m-0 list-none p-0 before:absolute before:bottom-0 before:left-[10px] before:top-0 before:w-px before:bg-slate-200">
          {timeline.map((entry, index) => (
            <li key={`${entry.date}-${index}`} className="relative grid grid-cols-[20px_1fr] items-center gap-3 pb-4 last:pb-0">
              <div className="relative flex h-full items-center justify-center">
                <span className="relative z-10 inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="m-0 text-sm font-semibold text-slate-900">{entry.label}</p>
                <p className="m-0 mt-0.5 text-xs text-slate-500">{entry.daysAgo === null ? "Unknown recency" : `${entry.daysAgo} days ago`}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </article>
  );
}
