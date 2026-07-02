import { describe, expect, it } from 'vitest';
import {
  createBonusPuzzle,
  mergeTodayPuzzleBonus,
  parseAdminBonusPuzzleRequest,
} from './admin-bonus-puzzle-post';
import { createTodayPuzzleFile } from '../../lib/puzzle-fetch-core';

describe('parseAdminBonusPuzzleRequest', () => {
  it('parses a valid admin bonus puzzle payload', () => {
    expect(
      parseAdminBonusPuzzleRequest(
        JSON.stringify({
          date: '2026-07-02',
          rowConstraints: [
            { category: 'type', value: 'Fire' },
            { category: 'evolution', value: 'Final Stage' },
            { category: 'category', value: 'Mythical' },
          ],
          colConstraints: [
            { category: 'region', value: 'Kanto' },
            { category: 'category', value: 'Legendary' },
            { category: 'move', value: 'Surf' },
          ],
        })
      )
    ).toEqual({
      date: '2026-07-02',
      rowConstraints: [
        { category: 'type', value: 'Fire' },
        { category: 'evolution', value: 'Final Stage' },
        { category: 'category', value: 'Mythical' },
      ],
      colConstraints: [
        { category: 'region', value: 'Kanto' },
        { category: 'category', value: 'Legendary' },
        { category: 'move', value: 'Surf' },
      ],
    });
  });

  it('rejects invalid payloads', () => {
    expect(
      parseAdminBonusPuzzleRequest(
        JSON.stringify({
          date: 'not-a-date',
          rowConstraints: [],
          colConstraints: [],
        })
      )
    ).toBeNull();
  });
});

describe('createBonusPuzzle', () => {
  it('normalizes custom constraint categories to runtime puzzle categories', () => {
    expect(
      createBonusPuzzle({
        date: '2026-07-02',
        rowConstraints: [
          { category: 'type', value: 'Fire' },
          { category: 'region', value: 'Kanto' },
          { category: 'ability', value: 'Overgrow' },
        ],
        colConstraints: [
          { category: 'move', value: 'Surf' },
          { category: 'category', value: 'Legendary' },
          { category: 'evolution', value: 'Final Stage' },
        ],
      })
    ).toMatchObject({
      date: '2026-07-02',
      type: 'BONUS',
      bonus: true,
      size: 9,
      rowConstraints: [
        { category: 'types', value: 'Fire' },
        { category: 'regions', value: 'Kanto' },
        { category: 'ability', value: 'Overgrow' },
      ],
    });
  });
});

describe('mergeTodayPuzzleBonus', () => {
  it('replaces the single bonus puzzle when the supplied date matches the live puzzle date', () => {
    const current = createTodayPuzzleFile(
      [
        {
          date: '2026-07-02',
          type: 'AUTOMATIC',
          bonus: false,
          size: 9,
          rowConstraints: [{ category: 'category', value: 'Legendary' }],
          colConstraints: [{ category: 'regions', value: 'Kanto' }],
        },
        {
          date: '2026-07-01',
          type: 'BONUS',
          bonus: true,
          size: 9,
          rowConstraints: [{ category: 'types', value: 'Water' }],
          colConstraints: [{ category: 'regions', value: 'Johto' }],
        },
      ],
      null
    );

    const result = mergeTodayPuzzleBonus(current, {
      date: '2026-07-02',
      type: 'BONUS',
      bonus: true,
      size: 9,
      rowConstraints: [{ category: 'types', value: 'Fire' }],
      colConstraints: [{ category: 'regions', value: 'Kanto' }],
    });

    expect(result.updatedTodayPuzzle).toBe(true);
    expect(result.nextFile.puzzles).toHaveLength(2);
    expect(result.nextFile.puzzles[1]).toMatchObject({
      date: '2026-07-02',
      type: 'BONUS',
    });
  });

  it('leaves today-puzzle unchanged when the supplied date does not match the live puzzle date', () => {
    const current = createTodayPuzzleFile(
      [
        {
          date: '2026-07-02',
          type: 'AUTOMATIC',
          bonus: false,
          size: 9,
          rowConstraints: [{ category: 'category', value: 'Legendary' }],
          colConstraints: [{ category: 'regions', value: 'Kanto' }],
        },
      ],
      null
    );

    const result = mergeTodayPuzzleBonus(current, {
      date: '2026-07-03',
      type: 'BONUS',
      bonus: true,
      size: 9,
      rowConstraints: [{ category: 'types', value: 'Fire' }],
      colConstraints: [{ category: 'regions', value: 'Kanto' }],
    });

    expect(result.updatedTodayPuzzle).toBe(false);
    expect(result.nextFile).toBe(current);
  });
});
