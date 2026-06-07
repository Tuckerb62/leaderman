import { describe, expect, it } from 'vitest';
import { MAX_INTERVAL_DAYS, addDays, isDue, nextReviewState } from './reviewScheduler.js';

describe('reviewScheduler', () => {
  it('pushes known cards into the future', () => {
    const result = nextReviewState({ intervalDays: 0, ease: 2, attempts: 0 }, 'know', '2026-06-06');
    expect(result.dueAt).toBe('2026-06-08');
    expect(result.status).toBe('reviewing');
    expect(result.known).toBe(1);
  });

  it('keeps needs-work cards due today', () => {
    const result = nextReviewState({ intervalDays: 4, ease: 2, attempts: 0 }, 'work', '2026-06-06');
    expect(result.dueAt).toBe('2026-06-06');
    expect(result.status).toBe('needs-work');
    expect(result.needsWork).toBe(1);
  });

  it('schedules review later for tomorrow', () => {
    const result = nextReviewState({ intervalDays: 0, ease: 2, attempts: 0 }, 'later', '2026-06-06');
    expect(result.dueAt).toBe('2026-06-07');
  });

  it('detects due reviews by date key', () => {
    expect(isDue({ dueAt: '2026-06-06' }, '2026-06-06')).toBe(true);
    expect(isDue({ dueAt: '2026-06-07' }, '2026-06-06')).toBe(false);
  });

  it('adds days across date boundaries', () => {
    expect(addDays('2026-06-30', 2)).toBe('2026-07-02');
  });

  it('caps known-card intervals at 90 days', () => {
    const result = nextReviewState({ intervalDays: 80, ease: 5, attempts: 8 }, 'know', '2026-06-06');
    expect(result.intervalDays).toBe(MAX_INTERVAL_DAYS);
    expect(result.dueAt).toBe('2026-09-04');
  });
});
