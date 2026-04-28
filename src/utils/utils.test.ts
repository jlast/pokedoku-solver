import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('should format date as short month and day', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('Jan 15');
  });

  it('should handle different months', () => {
    expect(formatDate('2024-06-01')).toBe('Jun 1');
    expect(formatDate('2024-12-25')).toBe('Dec 25');
  });

  it('should handle single digit days', () => {
    const result = formatDate('2024-03-05');
    expect(result).toBe('Mar 5');
  });
});
