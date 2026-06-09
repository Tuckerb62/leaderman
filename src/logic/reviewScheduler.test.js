import { describe, expect, it } from 'vitest';
import { isLessonComplete, markLessonComplete, recordQuestionAnswer } from './reviewScheduler.js';

describe('completion tracking', () => {
  it('marks a lesson complete', () => {
    const result = markLessonComplete({ attempts: 0 }, new Date('2026-06-06T12:00:00.000Z'));
    expect(result.status).toBe('complete');
    expect(result.completed).toBe(true);
    expect(result.completedAt).toBe('2026-06-06T12:00:00.000Z');
    expect(result.attempts).toBe(1);
  });

  it('treats older touched lessons as complete for backup compatibility', () => {
    expect(isLessonComplete({ attempts: 1 })).toBe(true);
    expect(isLessonComplete({ attempts: 0 })).toBe(false);
  });

  it('records question attempts and correct answers', () => {
    const first = recordQuestionAnswer({}, true, new Date('2026-06-06T12:00:00.000Z'));
    const second = recordQuestionAnswer(first, false, new Date('2026-06-06T12:30:00.000Z'));
    expect(second.questionAttempts).toBe(2);
    expect(second.correctAnswers).toBe(1);
    expect(second.lastQuestionAt).toBe('2026-06-06T12:30:00.000Z');
  });
});
