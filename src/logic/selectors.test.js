import { describe, expect, it } from 'vitest';
import { createInitialState } from '../data/seedData.js';
import { feedQueue, weakDomains } from './selectors.js';

describe('selectors', () => {
  it('prioritizes needs-work cards before new feed material', () => {
    const state = createInitialState();
    const target = state.lessons[20];
    state.reviews[target.id] = {
      ...state.reviews[target.id],
      status: 'needs-work',
      attempts: 2,
      needsWork: 1,
    };

    expect(feedQueue(state, 5)[0].id).toBe(target.id);
  });

  it('prevents more than two same-domain cards in a row', () => {
    const state = createInitialState();
    state.lessons = state.lessons.map((lesson, index) => ({
      ...lesson,
      domain: index < 6 ? 'Judgment' : lesson.domain,
    }));

    const queue = feedQueue(state, 12);
    for (let index = 2; index < queue.length; index += 1) {
      expect(queue[index].domain === queue[index - 1].domain && queue[index].domain === queue[index - 2].domain).toBe(false);
    }
  });

  it('computes weak-domain rate as a percentage of attempts', () => {
    const state = createInitialState();
    const lessons = state.lessons.filter((lesson) => lesson.domain === 'Judgment').slice(0, 2);
    state.reviews[lessons[0].id] = { ...state.reviews[lessons[0].id], attempts: 3, needsWork: 1 };
    state.reviews[lessons[1].id] = { ...state.reviews[lessons[1].id], attempts: 1, needsWork: 1 };

    const judgment = weakDomains(state).find((item) => item.domain === 'Judgment');
    expect(judgment.needsWorkRate).toBe(50);
  });
});
