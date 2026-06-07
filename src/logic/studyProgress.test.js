import { describe, expect, it } from 'vitest';
import { markStudied, sessionMinutes } from './studyProgress.js';

describe('study progress helpers', () => {
  it('starts a streak on first study day', () => {
    expect(markStudied({}, '2026-06-07')).toMatchObject({
      streakDays: 1,
      lastStudiedDate: '2026-06-07',
    });
  });

  it('increments a streak after consecutive days', () => {
    expect(markStudied({ streakDays: 2, lastStudiedDate: '2026-06-06' }, '2026-06-07')).toMatchObject({
      streakDays: 3,
      lastStudiedDate: '2026-06-07',
    });
  });

  it('does not increment twice on the same day', () => {
    expect(markStudied({ streakDays: 3, lastStudiedDate: '2026-06-07' }, '2026-06-07')).toMatchObject({
      streakDays: 3,
      lastStudiedDate: '2026-06-07',
    });
  });

  it('computes real elapsed session minutes', () => {
    expect(sessionMinutes('2026-06-07T10:00:00.000Z', '2026-06-07T10:06:20.000Z')).toBe(6);
  });
});
