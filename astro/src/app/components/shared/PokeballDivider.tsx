import { PokeballIcon } from "./PokeballIcon";

type PokeballDividerProps = {
  className?: string;
  fullBleed?: boolean;
  tone?: string;
};

export function PokeballDivider({ className, fullBleed = false, tone = "pokeball" }: PokeballDividerProps) {
  return (
    <div
      className={`${fullBleed ? "relative left-1/2 w-screen -translate-x-1/2 px-4" : "w-full"} mt-4 flex items-center gap-3 ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="h-px flex-1 bg-[var(--border)]" />
      <PokeballIcon tone={tone} className="h-5 w-5 shrink-0" />
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
