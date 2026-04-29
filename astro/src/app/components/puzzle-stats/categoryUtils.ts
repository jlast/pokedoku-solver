import {
  CATEGORY_COLORS,
  EVOLUTION_COLORS,
  MOVE_TYPE_ICON_MAP,
  REGION_COLORS,
  TYPE_COLORS,
} from "../../../../../lib/shared/constants";

export interface ParsedCategory {
  raw: string;
  type: string;
  label: string;
}

export function parseCategoryId(categoryId: string): ParsedCategory {
  const separatorIndex = categoryId.indexOf(":");
  if (separatorIndex === -1) {
    return {
      raw: categoryId,
      type: "other",
      label: categoryId,
    };
  }

  const type = categoryId.slice(0, separatorIndex);
  const label = categoryId.slice(separatorIndex + 1);

  return {
    raw: categoryId,
    type,
    label,
  };
}

export function getCategoryBarColor(parsed: ParsedCategory): string {
  if (parsed.type === "move") {
    const mappedType = MOVE_TYPE_ICON_MAP[parsed.label];
    if (mappedType) {
      const typeName = mappedType.charAt(0).toUpperCase() + mappedType.slice(1);
      return TYPE_COLORS[typeName] ?? "#0f766e";
    }
  }
  if (parsed.type === "types") return TYPE_COLORS[parsed.label] ?? "#0f766e";
  if (parsed.type === "regions") return REGION_COLORS[parsed.label] ?? "#0f766e";
  if (parsed.type === "evolution") return EVOLUTION_COLORS[parsed.label] ?? "#0f766e";
  if (parsed.type === "category") return CATEGORY_COLORS[parsed.label] ?? "#0f766e";
  return "#0f766e";
}

export function getCategoryIconPath(parsed: ParsedCategory): string {
  if (parsed.type === "move") {
    const mappedType = MOVE_TYPE_ICON_MAP[parsed.label];
    if (mappedType) return `/images/icons/types/${mappedType}.svg`;
  }
  return `/images/icons/${parsed.type}/${parsed.label.toLowerCase()}.svg`;
}
