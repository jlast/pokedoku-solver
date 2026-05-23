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
  bannerBg: "bg-rose-50 [html[data-theme='dark']_&]:bg-rose-950/35",
  bannerBorder: "border-rose-200 [html[data-theme='dark']_&]:border-rose-800/60",
  bannerLabelText: "text-rose-700 [html[data-theme='dark']_&]:text-rose-300",
  bannerTitleText: "text-rose-900 [html[data-theme='dark']_&]:text-rose-100",
  bannerOddsText: "text-rose-800 [html[data-theme='dark']_&]:text-rose-200",
  completionBg: "bg-rose-50 [html[data-theme='dark']_&]:bg-rose-950/35",
  completionBorder: "border-rose-200 [html[data-theme='dark']_&]:border-rose-800/60",
  completionLabelText: "text-rose-700 [html[data-theme='dark']_&]:text-rose-300",
  completionValueText: "text-rose-900 [html[data-theme='dark']_&]:text-rose-100",
  completionMetaText: "text-rose-800",
  completionPercentText: "text-rose-900 [html[data-theme='dark']_&]:text-rose-100",
  progressValueClass: "[&::-webkit-progress-value]:bg-rose-500 [&::-moz-progress-bar]:bg-rose-500",
};

const PRESTIGE_TONES: Record<string, PrestigeUiTone> = {
  pokeball: DEFAULT_TONE,
  greatball: {
    iconText: "text-blue-600",
    bannerBg: "bg-blue-50 [html[data-theme='dark']_&]:bg-blue-950/35",
    bannerBorder: "border-blue-200 [html[data-theme='dark']_&]:border-blue-800/60",
    bannerLabelText: "text-blue-700 [html[data-theme='dark']_&]:text-blue-300",
    bannerTitleText: "text-blue-900 [html[data-theme='dark']_&]:text-blue-100",
    bannerOddsText: "text-blue-800 [html[data-theme='dark']_&]:text-blue-200",
    completionBg: "bg-blue-50 [html[data-theme='dark']_&]:bg-blue-950/35",
    completionBorder: "border-blue-200 [html[data-theme='dark']_&]:border-blue-800/60",
    completionLabelText: "text-blue-700 [html[data-theme='dark']_&]:text-blue-300",
    completionValueText: "text-blue-900 [html[data-theme='dark']_&]:text-blue-100",
    completionMetaText: "text-blue-800",
    completionPercentText: "text-blue-900 [html[data-theme='dark']_&]:text-blue-100",
    progressValueClass: "[&::-webkit-progress-value]:bg-blue-500 [&::-moz-progress-bar]:bg-blue-500",
  },
  ultraball: {
    iconText: "text-amber-500",
    bannerBg: "bg-amber-50 [html[data-theme='dark']_&]:bg-amber-950/30",
    bannerBorder: "border-amber-200 [html[data-theme='dark']_&]:border-amber-800/60",
    bannerLabelText: "text-amber-700 [html[data-theme='dark']_&]:text-amber-300",
    bannerTitleText: "text-amber-900 [html[data-theme='dark']_&]:text-amber-100",
    bannerOddsText: "text-amber-800 [html[data-theme='dark']_&]:text-amber-200",
    completionBg: "bg-amber-50 [html[data-theme='dark']_&]:bg-amber-950/30",
    completionBorder: "border-amber-200 [html[data-theme='dark']_&]:border-amber-800/60",
    completionLabelText: "text-amber-700 [html[data-theme='dark']_&]:text-amber-300",
    completionValueText: "text-amber-900 [html[data-theme='dark']_&]:text-amber-100",
    completionMetaText: "text-amber-800",
    completionPercentText: "text-amber-900 [html[data-theme='dark']_&]:text-amber-100",
    progressValueClass: "[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500",
  },
  masterball: {
    iconText: "text-fuchsia-600",
    bannerBg: "bg-fuchsia-50 [html[data-theme='dark']_&]:bg-fuchsia-950/30",
    bannerBorder: "border-fuchsia-200 [html[data-theme='dark']_&]:border-fuchsia-800/60",
    bannerLabelText: "text-fuchsia-700 [html[data-theme='dark']_&]:text-fuchsia-300",
    bannerTitleText: "text-fuchsia-900 [html[data-theme='dark']_&]:text-fuchsia-100",
    bannerOddsText: "text-fuchsia-800 [html[data-theme='dark']_&]:text-fuchsia-200",
    completionBg: "bg-fuchsia-50 [html[data-theme='dark']_&]:bg-fuchsia-950/30",
    completionBorder: "border-fuchsia-200 [html[data-theme='dark']_&]:border-fuchsia-800/60",
    completionLabelText: "text-fuchsia-700 [html[data-theme='dark']_&]:text-fuchsia-300",
    completionValueText: "text-fuchsia-900 [html[data-theme='dark']_&]:text-fuchsia-100",
    completionMetaText: "text-fuchsia-800",
    completionPercentText: "text-fuchsia-900 [html[data-theme='dark']_&]:text-fuchsia-100",
    progressValueClass: "[&::-webkit-progress-value]:bg-fuchsia-500 [&::-moz-progress-bar]:bg-fuchsia-500",
  },
  premierball: {
    iconText: "text-slate-500",
    bannerBg: "bg-slate-100 [html[data-theme='dark']_&]:bg-slate-900/65",
    bannerBorder: "border-slate-300 [html[data-theme='dark']_&]:border-slate-700",
    bannerLabelText: "text-slate-600 [html[data-theme='dark']_&]:text-slate-300",
    bannerTitleText: "text-slate-900 [html[data-theme='dark']_&]:text-slate-100",
    bannerOddsText: "text-slate-700 [html[data-theme='dark']_&]:text-slate-200",
    completionBg: "bg-slate-100 [html[data-theme='dark']_&]:bg-slate-900/65",
    completionBorder: "border-slate-300 [html[data-theme='dark']_&]:border-slate-700",
    completionLabelText: "text-slate-600 [html[data-theme='dark']_&]:text-slate-300",
    completionValueText: "text-slate-900 [html[data-theme='dark']_&]:text-slate-100",
    completionMetaText: "text-slate-700",
    completionPercentText: "text-slate-900 [html[data-theme='dark']_&]:text-slate-100",
    progressValueClass: "[&::-webkit-progress-value]:bg-slate-500 [&::-moz-progress-bar]:bg-slate-500",
  },
  beastball: {
    iconText: "text-slate-700",
    bannerBg: "bg-slate-200 [html[data-theme='dark']_&]:bg-slate-900/80",
    bannerBorder: "border-slate-400 [html[data-theme='dark']_&]:border-slate-700",
    bannerLabelText: "text-slate-700 [html[data-theme='dark']_&]:text-slate-300",
    bannerTitleText: "text-slate-950 [html[data-theme='dark']_&]:text-slate-100",
    bannerOddsText: "text-slate-800 [html[data-theme='dark']_&]:text-slate-200",
    completionBg: "bg-slate-200 [html[data-theme='dark']_&]:bg-slate-900/80",
    completionBorder: "border-slate-400 [html[data-theme='dark']_&]:border-slate-700",
    completionLabelText: "text-slate-700 [html[data-theme='dark']_&]:text-slate-300",
    completionValueText: "text-slate-950 [html[data-theme='dark']_&]:text-slate-100",
    completionMetaText: "text-slate-800",
    completionPercentText: "text-slate-950 [html[data-theme='dark']_&]:text-slate-100",
    progressValueClass: "[&::-webkit-progress-value]:bg-slate-700 [&::-moz-progress-bar]:bg-slate-700",
  },
  cherishball: {
    iconText: "text-red-700",
    bannerBg: "bg-red-100 [html[data-theme='dark']_&]:bg-red-950/35",
    bannerBorder: "border-red-300 [html[data-theme='dark']_&]:border-red-800/60",
    bannerLabelText: "text-red-800 [html[data-theme='dark']_&]:text-red-300",
    bannerTitleText: "text-red-950 [html[data-theme='dark']_&]:text-red-100",
    bannerOddsText: "text-red-800 [html[data-theme='dark']_&]:text-red-200",
    completionBg: "bg-red-100 [html[data-theme='dark']_&]:bg-red-950/35",
    completionBorder: "border-red-300 [html[data-theme='dark']_&]:border-red-800/60",
    completionLabelText: "text-red-800 [html[data-theme='dark']_&]:text-red-300",
    completionValueText: "text-red-950 [html[data-theme='dark']_&]:text-red-100",
    completionMetaText: "text-red-800",
    completionPercentText: "text-red-950 [html[data-theme='dark']_&]:text-red-100",
    progressValueClass: "[&::-webkit-progress-value]:bg-red-700 [&::-moz-progress-bar]:bg-red-700",
  },
};

export function getPrestigeUiTone(tone: string): PrestigeUiTone {
  return PRESTIGE_TONES[tone] ?? DEFAULT_TONE;
}
