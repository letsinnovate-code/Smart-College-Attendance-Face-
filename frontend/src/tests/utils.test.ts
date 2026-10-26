import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime, formatPercentage } from '@/lib/utils';

describe('Frontend Formatting & Utility Functions', () => {
  it('correctly merges conditional and conflicting tailwind classes via cn', () => {
    expect(cn('px-2 py-1', 'bg-blue-500', false && 'hidden', 'px-4')).toBe('py-1 bg-blue-500 px-4');
  });

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-10-26T12:00:00.000Z');
    expect(formatted).toContain('2026');
  });

  it('formats dates and times consistently', () => {
    const formatted = formatDateTime('2026-10-26T12:00:00.000Z');
    expect(formatted).toContain('2026');
  });

  it('formats percentages accurately to 1 decimal place', () => {
    expect(formatPercentage(85.678)).toBe('85.7%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(0)).toBe('0.0%');
  });
});
