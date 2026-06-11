import { describe, expect, it } from 'vitest';
import { createInitialState } from '../data/seedData.js';
import { feedQueue, progressStats } from './selectors.js';

describe('selectors', () => {
  it('prioritizes incomplete cards before completed feed material', () => {
    const state = createInitialState();
    const first = state.lessons[0];
    state.reviews[first.id] = { ...state.reviews[first.id], status: 'complete', completed: true, completedAt: '2026-06-07T12:00:00.000Z', attempts: 1 };

    expect(feedQueue(state, 5)[0].id).not.toBe(first.id);
  });

  it('prevents more than two same-domain cards in a row', () => {
    const state = createInitialState();
    // Give the first 12 lessons a different domain so there are enough to interleave
    state.lessons = state.lessons.map((lesson, index) => ({
      ...lesson,
      domain: index < 12 ? 'Judgment' : lesson.domain,
    }));

    const queue = feedQueue(state, 12);
    for (let index = 2; index < queue.length; index += 1) {
      expect(queue[index].domain === queue[index - 1].domain && queue[index].domain === queue[index - 2].domain).toBe(false);
    }
  });

  it('computes completion and question accuracy percentages', () => {
    const state = createInitialState();
    const lessons = state.lessons.slice(0, 2);
    state.reviews[lessons[0].id] = { ...state.reviews[lessons[0].id], completed: true, completedAt: '2026-06-07T12:00:00.000Z', attempts: 1, questionAttempts: 2, correctAnswers: 1 };
    state.reviews[lessons[1].id] = { ...state.reviews[lessons[1].id], questionAttempts: 2, correctAnswers: 2 };

    const stats = progressStats(state);
    expect(stats.completionPercent).toBe(Math.round((1 / state.lessons.length) * 100));
    expect(stats.questionAccuracy).toBe(75);
  });
});
