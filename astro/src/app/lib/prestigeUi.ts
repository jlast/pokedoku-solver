type PrestigeUiTone = {
  iconText: string;
  bannerBg: string;
  bannerBorder: string;
  bannerLabelText: string;
  bannerTitleText: string;
  bannerOddsText: string;
  completionBg: string;
  completionBorder: string;
  completionLabelText: string;
  completionValueText: string;
  completionMetaText: string;
  completionPercentText: string;
  progressValueClass: string;
};

const DEFAULT_TONE: PrestigeUiTone = {
  iconText: "text-rose-500",
  bannerBg: "bg-rose-50",
  bannerBorder: "border-rose-200",
  bannerLabelText: "text-rose-700",
  bannerTitleText: "text-rose-900",
  bannerOddsText: "text-rose-800",
  completionBg: "bg-rose-50",
  completionBorder: "border-rose-200",
  completionLabelText: "text-rose-700",
  completionValueText: "text-rose-900",
  completionMetaText: "text-rose-800",
  completionPercentText: "text-rose-900",
  progressValueClass: "[&::-webkit-progress-value]:bg-rose-500 [&::-moz-progress-bar]:bg-rose-500",
};

const PRESTIGE_TONES: Record<string, PrestigeUiTone> = {
  pokeball: DEFAULT_TONE,
  greatball: {
    iconText: "text-blue-600",
    bannerBg: "bg-blue-50",
    bannerBorder: "border-blue-200",
    bannerLabelText: "text-blue-700",
    bannerTitleText: "text-blue-900",
    bannerOddsText: "text-blue-800",
    completionBg: "bg-blue-50",
    completionBorder: "border-blue-200",
    completionLabelText: "text-blue-700",
    completionValueText: "text-blue-900",
    completionMetaText: "text-blue-800",
    completionPercentText: "text-blue-900",
    progressValueClass: "[&::-webkit-progress-value]:bg-blue-500 [&::-moz-progress-bar]:bg-blue-500",
  },
  ultraball: {
    iconText: "text-amber-500",
    bannerBg: "bg-amber-50",
    bannerBorder: "border-amber-200",
    bannerLabelText: "text-amber-700",
    bannerTitleText: "text-amber-900",
    bannerOddsText: "text-amber-800",
    completionBg: "bg-amber-50",
    completionBorder: "border-amber-200",
    completionLabelText: "text-amber-700",
    completionValueText: "text-amber-900",
    completionMetaText: "text-amber-800",
    completionPercentText: "text-amber-900",
    progressValueClass: "[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500",
  },
  masterball: {
    iconText: "text-fuchsia-600",
    bannerBg: "bg-fuchsia-50",
    bannerBorder: "border-fuchsia-200",
    bannerLabelText: "text-fuchsia-700",
    bannerTitleText: "text-fuchsia-900",
    bannerOddsText: "text-fuchsia-800",
    completionBg: "bg-fuchsia-50",
    completionBorder: "border-fuchsia-200",
    completionLabelText: "text-fuchsia-700",
    completionValueText: "text-fuchsia-900",
    completionMetaText: "text-fuchsia-800",
    completionPercentText: "text-fuchsia-900",
    progressValueClass: "[&::-webkit-progress-value]:bg-fuchsia-500 [&::-moz-progress-bar]:bg-fuchsia-500",
  },
  premierball: {
    iconText: "text-slate-500",
    bannerBg: "bg-slate-100",
    bannerBorder: "border-slate-300",
    bannerLabelText: "text-slate-600",
    bannerTitleText: "text-slate-900",
    bannerOddsText: "text-slate-700",
    completionBg: "bg-slate-100",
    completionBorder: "border-slate-300",
    completionLabelText: "text-slate-600",
    completionValueText: "text-slate-900",
    completionMetaText: "text-slate-700",
    completionPercentText: "text-slate-900",
    progressValueClass: "[&::-webkit-progress-value]:bg-slate-500 [&::-moz-progress-bar]:bg-slate-500",
  },
  beastball: {
    iconText: "text-slate-700",
    bannerBg: "bg-slate-200",
    bannerBorder: "border-slate-400",
    bannerLabelText: "text-slate-700",
    bannerTitleText: "text-slate-950",
    bannerOddsText: "text-slate-800",
    completionBg: "bg-slate-200",
    completionBorder: "border-slate-400",
    completionLabelText: "text-slate-700",
    completionValueText: "text-slate-950",
    completionMetaText: "text-slate-800",
    completionPercentText: "text-slate-950",
    progressValueClass: "[&::-webkit-progress-value]:bg-slate-700 [&::-moz-progress-bar]:bg-slate-700",
  },
  cherishball: {
    iconText: "text-red-700",
    bannerBg: "bg-red-100",
    bannerBorder: "border-red-300",
    bannerLabelText: "text-red-800",
    bannerTitleText: "text-red-950",
    bannerOddsText: "text-red-800",
    completionBg: "bg-red-100",
    completionBorder: "border-red-300",
    completionLabelText: "text-red-800",
    completionValueText: "text-red-950",
    completionMetaText: "text-red-800",
    completionPercentText: "text-red-950",
    progressValueClass: "[&::-webkit-progress-value]:bg-red-700 [&::-moz-progress-bar]:bg-red-700",
  },
};

export function getPrestigeUiTone(tone: string): PrestigeUiTone {
  return PRESTIGE_TONES[tone] ?? DEFAULT_TONE;
}
