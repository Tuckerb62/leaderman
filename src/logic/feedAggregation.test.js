import { describe, expect, it } from 'vitest';
import { createInitialState } from '../data/seedData.js';
import { createInitialNewsState } from '../data/newsStorage.js';
import { buildFeedItems } from './feedAggregation.js';

describe('feed aggregation', () => {
  it('mixes library, novels, and news into one canonical feed', () => {
    const state = createInitialState();
    const novel = state.lessons.find((lesson) => lesson.summaryKind === 'Novel');
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');

    state.followedTopics = {
      stoicism: { topicId: 'stoicism', updatedAt: '2026-06-08T12:00:00.000Z' },
    };
    state.savedItems = {
      [`novels:${novel.id}`]: { itemKey: `novels:${novel.id}`, updatedAt: '2026-06-08T12:00:00.000Z' },
    };
    state.itemActivity = {
      [`library:${lesson.id}`]: {
        itemKey: `library:${lesson.id}`,
        openCount: 3,
        lastOpenedAt: '2026-06-08T12:00:00.000Z',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };
    state.news = {
      ...createInitialNewsState(),
      items: [
        {
          id: 'story-1',
          topicKey: 'technology-ai',
          title: 'Model update',
          category: 'Technology',
          whatHappened: 'A large lab shipped a model update.',
          status: 'fresh',
          updatedAt: '2026-06-08T12:00:00.000Z',
          relatedTopics: ['ai-future'],
        },
      ],
    };

    const feed = buildFeedItems(state, { limit: 12, now: '2026-06-08T12:00:00.000Z' });
    const domains = new Set(feed.map((item) => item.domain));

    expect(domains.has('library')).toBe(true);
    expect(domains.has('novels')).toBe(true);
    expect(domains.has('news')).toBe(true);
    expect(feed.every((item) => typeof item.reason === 'string' && item.reason.length > 0)).toBe(true);
  });

  it('filters dismissed items out of the feed', () => {
    const state = createInitialState();
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');
    state.dismissedItems = {
      [`library:${lesson.id}`]: {
        itemKey: `library:${lesson.id}`,
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };

    const feed = buildFeedItems(state, { limit: 10, now: '2026-06-08T12:00:00.000Z' });

    expect(feed.some((item) => item.key === `library:${lesson.id}`)).toBe(false);
  });
});
