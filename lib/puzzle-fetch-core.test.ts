import { describe, expect, it, vi } from "vitest";
import { fetchPuzzles } from "./puzzle-fetch-core";

const RAW_PUZZLE_JSON = JSON.stringify({
  type: "AUTOMATIC",
  date: "2025-01-01",
  size: 9,
  x0: { type: "POKEMON_TYPE", obj: "water" },
  x1: { type: "MONOTYPE", obj: true },
  x2: { type: "GENERATION", obj: "generation-i" },
  y0: { type: "EVOLUTION_POSITION", obj: "final" },
  y1: { type: "LEGENDARY", obj: true },
  y2: { type: "EVOLVED_BY", obj: "trade" },
});
const ESCAPED_PUZZLE_JSON = RAW_PUZZLE_JSON.replace(/"/g, '\\"');
const PUSH_FRAGMENT = `2:[\\"$\\",\\"$L16\\",null,{\\"puzzle\\":${ESCAPED_PUZZLE_JSON},\\"isCurrentPuzzle\\":true}`;
const PUSH_HTML = `<script>__next_f.push([1,"${PUSH_FRAGMENT}])</script>`;

describe("puzzle-fetch-core", () => {
  it("maps puzzle constraints from fetched page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => PUSH_HTML,
      }),
    );

    const puzzles = await fetchPuzzles();
    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].size).toBe(9);
    expect(puzzles[0].colConstraints[0]).toEqual({ category: "types", value: "Water" });
    expect(puzzles[0].colConstraints[1]).toEqual({ category: "types", value: "Monotype" });
    expect(puzzles[0].colConstraints[2]).toEqual({ category: "regions", value: "Kanto" });
    expect(puzzles[0].rowConstraints[0]).toEqual({ category: "evolution", value: "Final Stage" });
  });

  it("throws when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Error" }),
    );

    await expect(fetchPuzzles()).rejects.toThrow("Failed to fetch puzzle: 500 Error");
  });
});
