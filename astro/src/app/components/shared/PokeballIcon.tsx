import { getPrestigeUiTone } from "../../lib/prestigeUi";

type PokeballIconProps = {
  tone?: string;
  className?: string;
};

export function PokeballIcon({ tone = "pokeball", className }: PokeballIconProps) {
  const toneClass = getPrestigeUiTone(tone).iconText;

  return (
    <svg className={`${toneClass} ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="rgb(30 41 59)" strokeWidth="1.35" />
      <path d="M3 12h18" stroke="rgb(30 41 59)" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M5.2 12a6.8 6.8 0 0 1 13.6 0" className="fill-current" />
      <path d="M5.2 12a6.8 6.8 0 0 0 13.6 0" fill={tone === "cherishball" ? "currentColor" : "white"} />
      <circle cx="12" cy="12" r="2.5" fill="white" stroke="rgb(30 41 59)" strokeWidth="1.1" />
    </svg>
  );
}
