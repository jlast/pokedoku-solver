export interface PrestigeLevel {
  id: string;
  label: string;
  oddsLabel: string;
  chance: number;
  tone: string;
  description: string;
}

export const PRESTIGE_LEVELS: PrestigeLevel[] = [
  {
    id: "pokeball",
    label: "Poké Ball",
    oddsLabel: "1 / 100",
    chance: 0.01,
    tone: "pokeball",
    description: "Base shiny chance per eligible square.",
  },
  {
    id: "greatball",
    label: "Great Ball",
    oddsLabel: "1 / 80",
    chance: 0.0125,
    tone: "greatball",
    description: "1.25x shiny odds multiplier.",
  },
  {
    id: "ultraball",
    label: "Ultra Ball",
    oddsLabel: "1 / 66.7",
    chance: 0.015,
    tone: "ultraball",
    description: "1.5x shiny odds multiplier.",
  },
  {
    id: "masterball",
    label: "Master Ball",
    oddsLabel: "1 / 50",
    chance: 0.02,
    tone: "masterball",
    description: "2x shiny odds multiplier.",
  },
  {
    id: "premierball",
    label: "Premier Ball",
    oddsLabel: "1 / 44.4",
    chance: 0.0225,
    tone: "premierball",
    description: "2.25x shiny odds multiplier.",
  },
  {
    id: "beastball",
    label: "Beast Ball",
    oddsLabel: "1 / 40",
    chance: 0.025,
    tone: "beastball",
    description: "2.5x shiny odds multiplier.",
  },
  {
    id: "cherishball",
    label: "Cherish Ball",
    oddsLabel: "1 / 33.3",
    chance: 0.03,
    tone: "cherishball",
    description: "3x shiny odds multiplier.",
  },
];
