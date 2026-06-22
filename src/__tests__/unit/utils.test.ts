import { describe, it, expect } from 'vitest';
import { formatCurrency, statusColors, statusLabels, eventTypeIcons, CHART_COLORS, cn } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats zero value in BRL', () => {
    expect(formatCurrency(0)).toBe('R$\xa00');
  });

  it('formats positive value in BRL', () => {
    const result = formatCurrency(5000);
    expect(result).toContain('5.000');
  });

  it('formats large values with thousand separators', () => {
    const result = formatCurrency(1500000);
    expect(result).toContain('1.500.000');
  });

  it('handles decimal values', () => {
    const result = formatCurrency(99.9);
    // maximumFractionDigits: 0, so should round
    expect(result).toContain('100');
  });
});

describe('cn (classname merge)', () => {
  it('merges class names', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('handles undefined/null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });
});

describe('statusColors', () => {
  it('has color for each deal status', () => {
    expect(statusColors['new']).toBe('bg-blue-500');
    expect(statusColors['briefing']).toBe('bg-purple-500');
    expect(statusColors['quoting']).toBe('bg-amber-500');
    expect(statusColors['production']).toBe('bg-green-500');
    expect(statusColors['completed']).toBe('bg-warm-700');
  });

  it('has color for booking statuses', () => {
    expect(statusColors['pending']).toBe('bg-amber-500');
    expect(statusColors['confirmed']).toBe('bg-green-500');
    expect(statusColors['cancelled']).toBe('bg-red-500');
  });

  it('has color for client statuses', () => {
    expect(statusColors['active']).toBe('bg-green-500');
    expect(statusColors['lead']).toBe('bg-blue-500');
    expect(statusColors['inactive']).toBe('bg-warm-500');
  });

  it('has Portuguese legacy aliases', () => {
    expect(statusColors['novo']).toBe('bg-blue-500');
    expect(statusColors['contando']).toBe('bg-amber-500');
    expect(statusColors['producao']).toBe('bg-green-500');
  });
});

describe('statusLabels', () => {
  it('has labels for all deal statuses', () => {
    expect(statusLabels['new']).toBe('New');
    expect(statusLabels['briefing']).toBe('Briefing');
    expect(statusLabels['quoting']).toBe('Quoting');
    expect(statusLabels['production']).toBe('Production');
    expect(statusLabels['completed']).toBe('Completed');
  });

  it('has labels for client statuses', () => {
    expect(statusLabels['active']).toBe('Active');
    expect(statusLabels['lead']).toBe('Lead');
    expect(statusLabels['inactive']).toBe('Inactive');
  });
});

describe('CHART_COLORS', () => {
  it('has at least 8 colors', () => {
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it('all colors are valid hex strings', () => {
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('eventTypeIcons', () => {
  it('has icon for Wedding', () => {
    expect(eventTypeIcons['Wedding']).toBe('Camera');
  });

  it('has icon for Corporate Event', () => {
    expect(eventTypeIcons['Corporate Event']).toBe('Building');
  });

  it('has icon for Music Video', () => {
    expect(eventTypeIcons['Music Video']).toBe('Video');
  });
});
